import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from '../utils/toast';
import CustomDropdown from '../components/CustomDropdown';
import { itemMasterService } from '../services';

const API = import.meta.env.VITE_API_URL || 'https://fims-dashboard.onrender.com/api';
const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
});

const LOCKED_STATUSES = ['approved', 'ordered', 'partially_inwarded', 'received', 'cancelled'];
const STATUS_LABEL = {
    draft: 'Draft', pending_approval: 'Pending Approval', approved: 'Final Approved',
    rejected: 'Rejected', ordered: 'Ordered', partially_inwarded: 'Partially Inwarded',
    received: 'Received', cancelled: 'Cancelled',
};
const STATUS_BADGE = {
    draft: { bg: '#f1f5f9', color: '#475569' },
    pending_approval: { bg: '#fef3c7', color: '#92400e' },
    approved: { bg: '#dcfce7', color: '#15803d' },
    rejected: { bg: '#fee2e2', color: '#b91c1c' },
    ordered: { bg: '#dbeafe', color: '#1d4ed8' },
    partially_inwarded: { bg: '#ffedd5', color: '#c2410c' },
    received: { bg: '#d1fae5', color: '#065f46' },
    cancelled: { bg: '#f3f4f6', color: '#6b7280' },
};

const emptyRow = () => ({ _id: Math.random(), item_master_id: '', item_name: '', hsn: '', quantity: '', unit: '', rate: '', tax_percent: 18 });

const fmtDate = (iso) => {
    if (!iso) return '';
    return iso.split('T')[0];
};

export default function EditPO() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [po, setPo] = useState(null);
    const [vendors, setVendors] = useState([]);
    const [purchasableItems, setPurchasableItems] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [vendorId, setVendorId] = useState('');
    const [vendorGST, setVendorGST] = useState('');
    const [vendorEmail, setVendorEmail] = useState('');
    const [vendorWhatsApp, setVendorWhatsApp] = useState('');
    const [vendorAddress, setVendorAddress] = useState('');
    const [poDate, setPoDate] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('');
    const [deliveryTerms, setDeliveryTerms] = useState('');
    const [rows, setRows] = useState([emptyRow()]);

    // Send to vendor modal
    const [sendModal, setSendModal] = useState(false);
    const [sendMethod, setSendMethod] = useState('email');
    const [sending, setSending] = useState(false);

    const isLocked = po && LOCKED_STATUSES.includes(po.status);

    useEffect(() => {
        fetchPO();
        fetchVendors();
        fetchItems();
    }, [id]);

    const fetchPO = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API}/purchase-orders/${id}`, { headers: getAuthHeaders() });
            if (!res.ok) { toast.error('PO not found'); navigate('/purchaseorders'); return; }
            const data = await res.json();
            setPo(data);

            // Populate form fields
            setVendorId(data.vendor_id || '');
            setVendorGST(data.vendor_gst || '');
            setVendorEmail(data.vendor_email || '');
            setVendorWhatsApp(data.vendor_phone || '');
            setVendorAddress(data.vendor_address || '');
            setPoDate(fmtDate(data.order_date));
            setDeliveryDate(fmtDate(data.expected_delivery_date));

            // Parse payment/delivery terms from notes field
            const notes = data.notes || '';
            const payMatch = notes.match(/Payment:\s*([^|]+)/);
            const delMatch = notes.match(/Delivery:\s*([^|]+)/);
            setPaymentTerms(payMatch ? payMatch[1].trim() : '');
            setDeliveryTerms(delMatch ? delMatch[1].trim() : '');

            // Populate items
            if (data.items && data.items.length > 0) {
                setRows(data.items.map(item => ({
                    _id: Math.random(),
                    item_master_id: item.item_master_id ? String(item.item_master_id) : '',
                    item_name: item.item_name || '',
                    hsn: item.hsn || item.item_code || '',
                    quantity: item.quantity || '',
                    unit: item.unit || '',
                    rate: item.unit_price || '',
                    tax_percent: item.tax_percent != null ? item.tax_percent : 18,
                })));
            }
        } catch (e) {
            toast.error('Failed to load PO');
            navigate('/purchaseorders');
        } finally {
            setLoading(false);
        }
    };

    const fetchVendors = async () => {
        try {
            const res = await fetch(`${API}/vendors?is_active=true`, { headers: getAuthHeaders() });
            const d = await res.json();
            setVendors(Array.isArray(d) ? d : []);
        } catch { }
    };

    const fetchItems = async () => {
        try {
            const d = await itemMasterService.getPurchasable();
            setPurchasableItems(Array.isArray(d) ? d : []);
        } catch { }
    };

    const handleVendorChange = (name) => {
        const v = vendors.find(v => v.name === name);
        if (v) {
            setVendorId(v.id);
            setVendorGST(v.gstin || '');
            setVendorEmail(v.email || '');
            setVendorWhatsApp(v.phone || '');
            setVendorAddress([v.address, v.city, v.state].filter(Boolean).join(', '));
        } else {
            setVendorId(''); setVendorGST(''); setVendorEmail(''); setVendorWhatsApp(''); setVendorAddress('');
        }
    };

    const selectedVendorName = vendors.find(v => v.id === vendorId)?.name || (po?.vendor_name || 'Select Vendor');

    const addRow = () => setRows(prev => [...prev, emptyRow()]);
    const removeRow = (_id) => { if (rows.length > 1) setRows(prev => prev.filter(r => r._id !== _id)); };
    const updateRow = (_id, field, value) => {
        setRows(prev => prev.map(r => {
            if (r._id !== _id) return r;
            const u = { ...r, [field]: value };
            if (field === 'item_master_id' && value) {
                const found = purchasableItems.find(i => i.id === parseInt(value));
                if (found) { u.item_name = found.name; u.unit = found.unit || ''; u.rate = found.unit_price != null ? found.unit_price : ''; }
            }
            return u;
        }));
    };

    const subtotal = rows.reduce((s, r) => s + (parseFloat(r.quantity) || 0) * (parseFloat(r.rate) || 0), 0);
    const totalTax = rows.reduce((s, r) => {
        const base = (parseFloat(r.quantity) || 0) * (parseFloat(r.rate) || 0);
        return s + base * (parseFloat(r.tax_percent) || 0) / 100;
    }, 0);
    const grandTotal = subtotal + totalTax;

    const handleSave = async (submitForApproval = false) => {
        const validRows = rows.filter(r => (r.item_name || r.item_master_id) && r.quantity && r.rate !== '');
        if (validRows.length === 0) { toast.warning('Please fill at least one item row completely'); return; }
        setSubmitting(true);
        try {
            const payload = {
                vendor_id: vendorId || null,
                vendor_name: selectedVendorName !== 'Select Vendor' ? selectedVendorName : (po?.vendor_name || ''),
                vendor_gst: vendorGST || null,
                vendor_email: vendorEmail || null,
                vendor_phone: vendorWhatsApp || null,
                vendor_address: vendorAddress || null,
                order_date: poDate,
                expected_delivery_date: deliveryDate || null,
                notes: [paymentTerms && `Payment: ${paymentTerms}`, deliveryTerms && `Delivery: ${deliveryTerms}`].filter(Boolean).join(' | ') || null,
                items: validRows.map(r => ({
                    item_master_id: r.item_master_id ? parseInt(r.item_master_id) : null,
                    item_name: r.item_name,
                    item_code: r.hsn || null,
                    quantity: parseFloat(r.quantity),
                    unit: r.unit || null,
                    unit_price: parseFloat(r.rate) || 0,
                    tax_percent: parseFloat(r.tax_percent) || 0,
                })),
            };
            const res = await fetch(`${API}/purchase-orders/${id}`, {
                method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update PO');

            if (submitForApproval) {
                await fetch(`${API}/purchase-orders/${id}/status`, {
                    method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ status: 'pending_approval' }),
                });
                toast.success('PO submitted for approval!');
                navigate('/popending');
            } else {
                toast.success('Draft saved!');
                navigate('/purchaseorders');
            }
        } catch (e) { toast.error(e.message); }
        finally { setSubmitting(false); }
    };

    const handleSendNow = () => {
        setSending(true);
        setTimeout(() => {
            setSending(false);
            setSendModal(false);
            if (sendMethod === 'email') {
                toast.success(`PO sent to ${vendorEmail || po?.vendor_email} via Email!`);
            } else {
                toast.success(`PO sent to ${vendorWhatsApp || po?.vendor_phone} via WhatsApp!`);
            }
        }, 800);
    };

    const inputStyle = (disabled) => ({
        width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6,
        fontSize: 14, color: disabled ? '#6b7280' : '#374151',
        background: disabled ? '#f9fafb' : 'white', outline: 'none',
        fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s',
        cursor: disabled ? 'not-allowed' : 'text',
    });
    const labelStyle = { display: 'block', fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 8 };

    const vendorEmailDisplay = vendorEmail || po?.vendor_email || '';
    const vendorPhoneDisplay = vendorWhatsApp || po?.vendor_phone || '';
    const vendorNameDisplay = (selectedVendorName !== 'Select Vendor' ? selectedVendorName : null) || po?.vendor_name || po?.vendor_display_name || '';

    if (loading) {
        return (
            <>
                <header className="main-header"><div className="main-title"><h1>Edit Purchase Order</h1></div></header>
                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading PO details…</div>
            </>
        );
    }

    return (
        <>
            <style>{`
        .po-card { background: white; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: visible; margin-bottom: 20px; }
        .po-card-header { padding: 18px 24px; border-bottom: 1px solid #e5e7eb; background: #f9fafb; display: flex; justify-content: space-between; align-items: center; }
        .po-card-title { font-size: 16px; font-weight: 600; color: #111827; margin: 0; display: flex; align-items: center; gap: 8px; }
        .po-card-icon { color: #2563eb; }
        .po-card-body { padding: 24px; }
        .po-form-grid { display: grid; gap: 18px; }
        .po-form-grid.col2 { grid-template-columns: 1fr 1fr; }
        .po-form-grid.col4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
        .po-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .po-table { width: 100%; border-collapse: collapse; min-width: 840px; }
        .po-table thead { background: #f9fafb; }
        .po-table th { padding: 13px 16px; text-align: left; font-size: 13px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
        .po-table td { padding: 12px 8px; font-size: 14px; color: #111827; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
        .po-add-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; font-weight: 500; color: #374151; cursor: pointer; transition: all 0.15s; }
        .po-add-btn:hover { background: #f9fafb; border-color: #d1d5db; }
        .po-del-btn { width: 34px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #fecaca; background: #fef2f2; color: #ef4444; cursor: pointer; transition: all 0.15s; }
        .po-del-btn:hover { background: #fee2e2; }
        .po-del-btn:disabled { border-color: #e5e7eb; background: #f9fafb; color: #d1d5db; cursor: not-allowed; }
        .po-save-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; font-weight: 500; color: #374151; cursor: pointer; transition: all 0.15s; }
        .po-save-btn:hover { background: #f9fafb; }
        .po-submit-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 20px; background: #2563eb; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; color: white; cursor: pointer; transition: background 0.15s; }
        .po-submit-btn:hover { background: #1d4ed8; }
        .po-submit-btn:disabled, .po-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .po-send-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; background: #2563eb; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; color: white; cursor: pointer; transition: background 0.15s; }
        .po-send-btn:hover { background: #1d4ed8; }
        .po-table-input { padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; color: #374151; background: white; outline: none; font-family: inherit; transition: border-color 0.2s; }
        .po-table-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
        .po-table-input:disabled { background: #f9fafb; color: #6b7280; cursor: not-allowed; }
        .po-locked-banner { display: flex; align-items: center; gap: 10px; padding: 14px 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; color: #475569; font-size: 14px; margin-bottom: 20px; }
        .po-status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
        /* Send modal */
        .send-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .send-modal { background: white; border-radius: 14px; width: 440px; max-width: 95vw; box-shadow: 0 20px 40px rgba(0,0,0,0.18); overflow: hidden; }
        .send-modal-header { padding: 20px 24px 16px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center; }
        .send-modal-header h2 { margin: 0; font-size: 17px; font-weight: 700; color: #111827; }
        .send-modal-body { padding: 20px 24px; }
        .send-option { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 2px solid #e5e7eb; border-radius: 10px; cursor: pointer; margin-bottom: 12px; transition: all 0.15s; }
        .send-option.selected { border-color: #2563eb; background: #eff6ff; }
        .send-option:last-child { margin-bottom: 0; }
        .send-radio { width: 18px; height: 18px; accent-color: #2563eb; flex-shrink: 0; }
        .send-option-info { flex: 1; }
        .send-option-label { font-size: 14px; font-weight: 600; color: #111827; }
        .send-option-value { font-size: 13px; color: #6b7280; margin-top: 2px; }
        .send-modal-footer { padding: 16px 24px; border-top: 1px solid #f3f4f6; display: flex; justify-content: flex-end; gap: 10px; }
        .send-cancel-btn { padding: 9px 20px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; font-weight: 500; color: #374151; cursor: pointer; }
        .send-confirm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 20px; background: #2563eb; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; color: white; cursor: pointer; }
        .send-confirm-btn:hover { background: #1d4ed8; }
        .send-confirm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        @media (max-width: 900px) { .po-form-grid.col4 { grid-template-columns: 1fr 1fr; } .po-form-grid.col2 { grid-template-columns: 1fr; } }
      `}</style>

            {/* Header */}
            <header className="main-header">
                <div className="main-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => navigate('/purchaseorders')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h1 style={{ margin: 0 }}>Edit Purchase Order</h1>
                            {po && (
                                <span className="po-status-badge" style={{ background: STATUS_BADGE[po.status]?.bg || '#f1f5f9', color: STATUS_BADGE[po.status]?.color || '#374151' }}>
                                    {isLocked && <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
                                    {STATUS_LABEL[po.status] || po.status}
                                </span>
                            )}
                        </div>
                        {po && <p style={{ margin: 0, fontSize: 13, color: '#6b7280', fontFamily: 'monospace' }}>{po.po_number}</p>}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {(() => {
                        const isApproved = po?.status && !['rejected', 'pending_approval', 'cancelled'].includes(po.status);
                        return (
                            <button
                                className="po-send-btn"
                                onClick={() => isApproved && setSendModal(true)}
                                disabled={!isApproved}
                                title={isApproved ? 'Send PO to vendor' : 'PO must be approved by admin before sending'}
                                style={{
                                    opacity: isApproved ? 1 : 0.4,
                                    cursor: isApproved ? 'pointer' : 'not-allowed',
                                    filter: isApproved ? 'none' : 'grayscale(0.3)',
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    {isApproved
                                        ? <><path d="m22 2-7 20-4-9-9-4 20-7z" /><path d="M22 2 11 13" /></>
                                        : <><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>
                                    }
                                </svg>
                                Send to Vendor
                            </button>
                        );
                    })()}
                    {!isLocked && (
                        <>
                            <button className="po-save-btn" onClick={() => handleSave(false)} disabled={submitting}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                                Save Draft
                            </button>
                            <button className="po-submit-btn" onClick={() => handleSave(true)} disabled={submitting}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                                Submit for Approval
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Locked Banner */}
            {isLocked && (
                <div className="po-locked-banner">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    This PO is locked and cannot be edited. Status: {STATUS_LABEL[po.status] || po.status}
                </div>
            )}

            {/* Vendor Details */}
            <div className="po-card">
                <div className="po-card-header">
                    <h3 className="po-card-title">
                        <svg className="po-card-icon" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                        Vendor Details
                    </h3>
                </div>
                <div className="po-card-body">
                    <div style={{ marginBottom: 18 }}>
                        {isLocked ? (
                            <div>
                                <label style={labelStyle}>Vendor *</label>
                                <input style={inputStyle(true)} value={vendorNameDisplay} readOnly />
                            </div>
                        ) : (
                            <CustomDropdown
                                label="Vendor *"
                                value={selectedVendorName}
                                onChange={handleVendorChange}
                                options={['Select Vendor', ...vendors.map(v => v.name)]}
                            />
                        )}
                    </div>
                    <div className="po-form-grid col2">
                        <div>
                            <label style={labelStyle}>GST Number</label>
                            <input className="po-input" style={inputStyle(isLocked)} value={vendorGST} onChange={e => setVendorGST(e.target.value)} placeholder="e.g. 24AAAAA0000A1Z5" readOnly={isLocked} />
                        </div>
                        <div>
                            <label style={labelStyle}>Email</label>
                            <input className="po-input" style={inputStyle(isLocked)} type="email" value={vendorEmail} onChange={e => setVendorEmail(e.target.value)} placeholder="vendor@example.com" readOnly={isLocked} />
                        </div>
                        <div>
                            <label style={labelStyle}>WhatsApp</label>
                            <input className="po-input" style={inputStyle(isLocked)} value={vendorWhatsApp} onChange={e => setVendorWhatsApp(e.target.value)} placeholder="+91 98765 43210" readOnly={isLocked} />
                        </div>
                        <div>
                            <label style={labelStyle}>Address</label>
                            <input className="po-input" style={inputStyle(isLocked)} value={vendorAddress} onChange={e => setVendorAddress(e.target.value)} placeholder="City, State, PIN" readOnly={isLocked} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Details */}
            <div className="po-card">
                <div className="po-card-header">
                    <h3 className="po-card-title">
                        <svg className="po-card-icon" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        Order Details
                    </h3>
                </div>
                <div className="po-card-body">
                    <div className="po-form-grid col4">
                        <div>
                            <label style={labelStyle}>PO Date</label>
                            <input className="po-input" style={inputStyle(isLocked)} type="date" value={poDate} onChange={e => setPoDate(e.target.value)} readOnly={isLocked} />
                        </div>
                        <div>
                            <label style={labelStyle}>Expected Delivery Date</label>
                            <input className="po-input" style={inputStyle(isLocked)} type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} readOnly={isLocked} />
                        </div>
                        <div>
                            <label style={labelStyle}>Payment Terms</label>
                            {isLocked ? (
                                <input style={inputStyle(true)} value={paymentTerms} readOnly />
                            ) : (
                                <select
                                    className="po-input"
                                    style={{ ...inputStyle(false), cursor: 'pointer' }}
                                    value={paymentTerms}
                                    onChange={e => setPaymentTerms(e.target.value)}
                                >
                                    <option value="">Select Payment Terms</option>
                                    {['15 Days', '30 Days', '45 Days', '60 Days', '90 Days', 'Advance', 'On Delivery'].map(o => (
                                        <option key={o} value={o}>{o}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div>
                            <label style={labelStyle}>Delivery Terms</label>
                            <input className="po-input" style={inputStyle(isLocked)} value={deliveryTerms} onChange={e => setDeliveryTerms(e.target.value)} placeholder="Ex-Works, FOB, CIF…" readOnly={isLocked} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Materials */}
            <div className="po-card">
                <div className="po-card-header">
                    <h3 className="po-card-title">
                        <svg className="po-card-icon" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>
                        Materials
                    </h3>
                    {!isLocked && (
                        <button className="po-add-btn" onClick={addRow}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            Add Item
                        </button>
                    )}
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="po-table">
                        <thead>
                            <tr>
                                <th style={{ paddingLeft: 24 }}>Material</th>
                                <th>HSN</th>
                                <th>Qty</th>
                                <th>Unit</th>
                                <th>Rate (₹)</th>
                                <th>Tax %</th>
                                <th>Tax Amt</th>
                                <th>Total</th>
                                {!isLocked && <th></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => {
                                const base = (parseFloat(row.quantity) || 0) * (parseFloat(row.rate) || 0);
                                const taxAmt = base * (parseFloat(row.tax_percent) || 0) / 100;
                                const rowTotal = base + taxAmt;
                                const matLabel = row.item_master_id
                                    ? (purchasableItems.find(i => i.id === parseInt(row.item_master_id)) || {}).name || row.item_name || 'Choose material'
                                    : row.item_name || 'Choose material';

                                return (
                                    <tr key={row._id}>
                                        <td style={{ paddingLeft: 16, minWidth: 200 }}>
                                            {isLocked ? (
                                                <input className="po-table-input" style={{ width: '100%' }} value={row.item_name} readOnly disabled />
                                            ) : (
                                                <CustomDropdown
                                                    value={matLabel}
                                                    onChange={val => {
                                                        const m = purchasableItems.find(m => m.name === val);
                                                        updateRow(row._id, 'item_master_id', m ? String(m.id) : '');
                                                    }}
                                                    options={['Choose material', ...purchasableItems.map(m => m.name)]}
                                                />
                                            )}
                                        </td>
                                        <td><input className="po-table-input" style={{ width: 84 }} value={row.hsn} onChange={e => updateRow(row._id, 'hsn', e.target.value)} placeholder="HSN" disabled={isLocked} /></td>
                                        <td><input className="po-table-input" style={{ width: 72 }} type="number" value={row.quantity} onChange={e => updateRow(row._id, 'quantity', e.target.value)} placeholder="0" min="0" disabled={isLocked} /></td>
                                        <td><input className="po-table-input" style={{ width: 58 }} value={row.unit} onChange={e => updateRow(row._id, 'unit', e.target.value)} placeholder="Nos" disabled={isLocked} /></td>
                                        <td><input className="po-table-input" style={{ width: 86 }} type="number" value={row.rate} onChange={e => updateRow(row._id, 'rate', e.target.value)} placeholder="0.00" min="0" disabled={isLocked} /></td>
                                        <td><input className="po-table-input" style={{ width: 52 }} type="number" value={row.tax_percent} onChange={e => updateRow(row._id, 'tax_percent', e.target.value)} placeholder="18" min="0" max="100" disabled={isLocked} /></td>
                                        <td style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>₹{taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td style={{ fontWeight: 700, whiteSpace: 'nowrap', color: '#2563eb' }}>₹{rowTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        {!isLocked && (
                                            <td style={{ paddingRight: 16 }}>
                                                <button className="po-del-btn" onClick={() => removeRow(row._id)} disabled={rows.length === 1}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div style={{ padding: '16px 24px 24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f3f4f6' }}>
                    <div style={{ minWidth: 280 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 14, color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>
                            <span>Subtotal</span>
                            <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 14, color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>
                            <span>Total Tax</span>
                            <span>₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontWeight: 700, fontSize: 16, color: '#111827' }}>
                            <span>Grand Total</span>
                            <span style={{ color: '#2563eb' }}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Send to Vendor Modal */}
            {sendModal && (
                <div className="send-overlay" onClick={e => e.target === e.currentTarget && setSendModal(false)}>
                    <div className="send-modal">
                        <div className="send-modal-header">
                            <h2>Send PO to Vendor</h2>
                            <button onClick={() => setSendModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, borderRadius: 6 }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <div className="send-modal-body">
                            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                                Choose how to send the PO to <strong>{vendorNameDisplay}</strong>:
                            </p>

                            {/* Email option */}
                            <div className={`send-option ${sendMethod === 'email' ? 'selected' : ''}`} onClick={() => setSendMethod('email')}>
                                <input type="radio" className="send-radio" checked={sendMethod === 'email'} onChange={() => setSendMethod('email')} />
                                <div className="send-option-info">
                                    <div className="send-option-label">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 6 }}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                        Email
                                    </div>
                                    <div className="send-option-value">{vendorEmailDisplay || <span style={{ color: '#d1d5db' }}>No email on file</span>}</div>
                                </div>
                            </div>

                            {/* WhatsApp option */}
                            <div className={`send-option ${sendMethod === 'whatsapp' ? 'selected' : ''}`} onClick={() => setSendMethod('whatsapp')}>
                                <input type="radio" className="send-radio" checked={sendMethod === 'whatsapp'} onChange={() => setSendMethod('whatsapp')} />
                                <div className="send-option-info">
                                    <div className="send-option-label">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 6 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                        WhatsApp
                                    </div>
                                    <div className="send-option-value">{vendorPhoneDisplay || <span style={{ color: '#d1d5db' }}>No phone on file</span>}</div>
                                </div>
                            </div>
                        </div>
                        <div className="send-modal-footer">
                            <button className="send-cancel-btn" onClick={() => setSendModal(false)}>Cancel</button>
                            <button className="send-confirm-btn" onClick={handleSendNow} disabled={sending}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z" /><path d="M22 2 11 13" /></svg>
                                {sending ? 'Sending…' : 'Send Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

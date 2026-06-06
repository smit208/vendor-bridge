import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from '../utils/toast';
import CustomDropdown from '../components/CustomDropdown';
import { itemMasterService } from '../services';

const API = import.meta.env.VITE_API_URL || 'https://fims-dashboard.onrender.com/api';
const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
});

const PAYMENT_TERMS_OPTIONS = ['Select Payment Terms', '15 Days', '30 Days', '45 Days', '60 Days', '90 Days', 'Advance', 'On Delivery'];

function generatePONumber() {
    const yyyy = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 9000) + 1000);
    return `PO-${yyyy}-${seq}`;
}

const emptyRow = () => ({ _id: Math.random(), item_master_id: '', item_name: '', hsn: '', quantity: '', unit: '', rate: '', tax_percent: 18 });

export default function CreatePO() {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState([]);
    const [purchasableItems, setPurchasableItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(null);

    const [poNumber] = useState(generatePONumber);
    const today = new Date().toISOString().split('T')[0];

    const [vendorId, setVendorId] = useState('');
    const [vendorGST, setVendorGST] = useState('');
    const [vendorEmail, setVendorEmail] = useState('');
    const [vendorWhatsApp, setVendorWhatsApp] = useState('');
    const [vendorAddress, setVendorAddress] = useState('');
    const [poDate, setPoDate] = useState(today);
    const [deliveryDate, setDeliveryDate] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('');
    const [deliveryTerms, setDeliveryTerms] = useState('');
    const [rows, setRows] = useState([emptyRow()]);

    useEffect(() => { fetchVendors(); fetchItems(); }, []);

    const fetchVendors = async () => {
        try {
            const res = await fetch(`${API}/vendors?is_active=true`, { headers: getAuthHeaders() });
            const d = await res.json();
            setVendors(Array.isArray(d) ? d : []);
        } catch { }
    };

    const fetchItems = async () => {
        try {
            setLoadingItems(true);
            const d = await itemMasterService.getPurchasable();
            setPurchasableItems(Array.isArray(d) ? d : []);
        } catch { } finally { setLoadingItems(false); }
    };

    const handleVendorChange = (name) => {
        const v = vendors.find(v => v.name === name);
        if (v) {
            setVendorId(v.id);
            setVendorGST(v.gstin || '');
            setVendorEmail(v.email || '');
            setVendorWhatsApp(v.phone || '');
            setVendorAddress([v.address, v.city, v.state, v.country].filter(Boolean).join(', '));
        } else {
            setVendorId(''); setVendorGST(''); setVendorEmail(''); setVendorWhatsApp(''); setVendorAddress('');
        }
    };

    const selectedVendorName = vendors.find(v => v.id === vendorId)?.name || 'Select Vendor';

    const addRow = () => setRows(prev => [...prev, emptyRow()]);
    const removeRow = (id) => { if (rows.length > 1) setRows(prev => prev.filter(r => r._id !== id)); };
    const updateRow = (id, field, value) => {
        setRows(prev => prev.map(r => {
            if (r._id !== id) return r;
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

    const handleSubmit = async (submitForApproval = false) => {
        const validRows = rows.filter(r => (r.item_name || r.item_master_id) && r.quantity && r.rate !== '');
        if (validRows.length === 0) { toast.warning('Please fill at least one item row completely'); return; }
        setSubmitting(true);
        try {
            const payload = {
                vendor_id: vendorId || null,
                vendor_name: vendors.find(v => v.id === vendorId)?.name || '',
                vendor_gst: vendorGST || null,
                vendor_email: vendorEmail || null,
                vendor_phone: vendorWhatsApp || null,
                vendor_address: vendorAddress || null,
                order_date: poDate,
                expected_delivery_date: deliveryDate || null,
                payment_terms: paymentTerms || null,
                notes: deliveryTerms ? `Delivery: ${deliveryTerms}` : null,
                items: validRows.map(r => ({ item_master_id: r.item_master_id ? parseInt(r.item_master_id) : null, item_name: r.item_name, item_code: r.hsn || null, quantity: parseFloat(r.quantity), unit: r.unit || null, unit_price: parseFloat(r.rate) || 0, tax_percent: parseFloat(r.tax_percent) || 0 })),
            };
            const res = await fetch(`${API}/purchase-orders`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create PO');
            if (submitForApproval) {
                await fetch(`${API}/purchase-orders/${data.id}/status`, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ status: 'pending_approval' }) });
            }
            setSubmitted({ ...data, submitForApproval, grandTotal });
            if (submitForApproval) {
                toast.success('PO submitted for approval!');
                // Navigate to pending approvals after short delay
                setTimeout(() => navigate('/popending'), 1500);
            } else {
                toast.success('Draft saved!');
            }
        } catch (e) { toast.error(e.message); } finally { setSubmitting(false); }
    };

    const resetForm = () => {
        setSubmitted(null);
        setVendorId(''); setVendorGST(''); setVendorEmail(''); setVendorWhatsApp(''); setVendorAddress('');
        setPoDate(today); setDeliveryDate(''); setPaymentTerms(''); setDeliveryTerms('');
        setRows([emptyRow()]);
    };

    if (submitted) {
        return (
            <>
                <style>{`
          .po-card { background: white; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden; }
          .po-card-header { padding: 18px 24px; border-bottom: 1px solid #e5e7eb; background: #f9fafb; display: flex; justify-content: space-between; align-items: center; }
          .po-card-title { font-size: 16px; font-weight: 600; color: #111827; margin: 0; display: flex; align-items: center; gap: 8px; }
        `}</style>
                <header className="main-header">
                    <div className="main-title"><h1>Create Purchase Order</h1></div>
                </header>
                <div style={{ maxWidth: 520, margin: '40px auto' }}>
                    <div className="po-card" style={{ padding: '40px 32px', textAlign: 'center' }}>
                        <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
                        <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 8, color: '#111827' }}>
                            {submitted.submitForApproval ? 'Submitted for Approval!' : 'Draft Saved!'}
                        </h2>
                        <p style={{ color: '#6b7280', marginBottom: 6 }}>PO Number: <strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>{submitted.po_number}</strong></p>
                        <p style={{ color: '#6b7280', marginBottom: 28 }}>Grand Total: <strong>₹{submitted.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></p>
                        <button onClick={resetForm} style={{ padding: '10px 28px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
                            Create Another PO
                        </button>
                    </div>
                </div>
            </>
        );
    }

    const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, color: '#374151', background: 'white', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s' };
    const labelStyle = { display: 'block', fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 8 };

    return (
        <>
            <style>{`
        .po-card { background: white; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: visible; margin-bottom: 20px; }
        .po-card-header { padding: 18px 24px; border-bottom: 1px solid #e5e7eb; background: #f9fafb; display: flex; justify-content: space-between; align-items: center; }
        .po-card-title { font-size: 16px; font-weight: 600; color: #111827; margin: 0; display: flex; align-items: center; gap: 8px; }
        .po-card-icon { color: #2563eb; }
        .po-card-body { padding: 24px; }
        .po-form-field { margin-bottom: 18px; }
        .po-form-grid { display: grid; gap: 18px; }
        .po-form-grid.col2 { grid-template-columns: 1fr 1fr; }
        .po-form-grid.col4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
        .po-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .po-table { width: 100%; border-collapse: collapse; min-width: 840px; }
        .po-table thead { background: #f9fafb; }
        .po-table th { padding: 13px 16px; text-align: left; font-size: 13px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
        .po-table td { padding: 12px 8px; font-size: 14px; color: #111827; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
        .po-table tbody tr:hover { background: #f9fafb; }
        .po-table tbody tr:last-child td { border-bottom: none; }
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
        .po-table-input { padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; color: #374151; background: white; outline: none; font-family: inherit; transition: border-color 0.2s; }
        .po-table-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
        @media (max-width: 900px) { .po-form-grid.col4 { grid-template-columns: 1fr 1fr; } .po-form-grid.col2 { grid-template-columns: 1fr; } }
      `}</style>

            <header className="main-header">
                <div className="main-title">
                    <h1>Create Purchase Order</h1>
                    <p>Raise a new purchase order and send it for approval</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="po-save-btn" onClick={() => handleSubmit(false)} disabled={submitting}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                        Save Draft
                    </button>
                    <button className="po-submit-btn" onClick={() => handleSubmit(true)} disabled={submitting}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                        Submit for Approval
                    </button>
                </div>
            </header>

            {/* ── Vendor Details ── */}
            <div className="po-card">
                <div className="po-card-header">
                    <h3 className="po-card-title">
                        <svg className="po-card-icon" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                        Vendor Details
                    </h3>
                </div>
                <div className="po-card-body">
                    <div className="po-form-field">
                        <CustomDropdown
                            label="Vendor *"
                            value={selectedVendorName}
                            onChange={handleVendorChange}
                            options={['Select Vendor', ...vendors.map(v => v.name)]}
                        />
                    </div>
                    <div className="po-form-grid col2">
                        <div>
                            <label style={labelStyle}>GST Number</label>
                            <input className="po-input" style={inputStyle} value={vendorGST} onChange={e => setVendorGST(e.target.value)} placeholder="e.g. 24AAAAA0000A1Z5" />
                        </div>
                        <div>
                            <label style={labelStyle}>Email</label>
                            <input className="po-input" style={inputStyle} type="email" value={vendorEmail} onChange={e => setVendorEmail(e.target.value)} placeholder="vendor@example.com" />
                        </div>
                        <div>
                            <label style={labelStyle}>WhatsApp</label>
                            <input className="po-input" style={inputStyle} value={vendorWhatsApp} onChange={e => setVendorWhatsApp(e.target.value)} placeholder="+91 98765 43210" />
                        </div>
                        <div>
                            <label style={labelStyle}>Address</label>
                            <input className="po-input" style={inputStyle} value={vendorAddress} onChange={e => setVendorAddress(e.target.value)} placeholder="City, State, PIN" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Order Details ── */}
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
                            <div className="po-input" style={{ ...inputStyle, background: '#f9fafb', color: '#374151', cursor: 'default', userSelect: 'none' }}>
                                {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Expected Delivery Date</label>
                            <input className="po-input" style={inputStyle} type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Payment Terms</label>
                            <select
                                className="po-input"
                                style={{ ...inputStyle, cursor: 'pointer' }}
                                value={paymentTerms}
                                onChange={e => setPaymentTerms(e.target.value)}
                            >
                                <option value="">Select Payment Terms</option>
                                {['15 Days', '30 Days', '45 Days', '60 Days', '90 Days', 'Advance', 'On Delivery'].map(o => (
                                    <option key={o} value={o}>{o}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Delivery Terms</label>
                            <input className="po-input" style={inputStyle} value={deliveryTerms} onChange={e => setDeliveryTerms(e.target.value)} placeholder="Ex-Works, FOB, CIF…" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Materials ── */}
            <div className="po-card">
                <div className="po-card-header">
                    <h3 className="po-card-title">
                        <svg className="po-card-icon" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>
                        Materials
                    </h3>
                    <button className="po-add-btn" onClick={addRow}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Add Item
                    </button>
                </div>

                <div style={{ overflowX: 'visible' }}>
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
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => {
                                const base = (parseFloat(row.quantity) || 0) * (parseFloat(row.rate) || 0);
                                const taxAmt = base * (parseFloat(row.tax_percent) || 0) / 100;
                                const rowTotal = base + taxAmt;
                                const matLabel = row.item_master_id
                                    ? (purchasableItems.find(i => i.id === parseInt(row.item_master_id)) || {}).name || 'Choose material'
                                    : (loadingItems ? 'Loading…' : 'Choose material');

                                return (
                                    <tr key={row._id}>
                                        <td style={{ paddingLeft: 16, minWidth: 200 }}>
                                            <CustomDropdown
                                                value={matLabel}
                                                onChange={val => {
                                                    const m = purchasableItems.find(m => m.name === val);
                                                    updateRow(row._id, 'item_master_id', m ? String(m.id) : '');
                                                }}
                                                options={[loadingItems ? 'Loading…' : 'Choose material', ...purchasableItems.map(m => m.name)]}
                                                disabled={loadingItems}
                                            />
                                        </td>
                                        <td><input className="po-table-input" style={{ width: 84 }} value={row.hsn} onChange={e => updateRow(row._id, 'hsn', e.target.value)} placeholder="HSN" /></td>
                                        <td><input className="po-table-input" style={{ width: 72 }} type="number" value={row.quantity} onChange={e => updateRow(row._id, 'quantity', e.target.value)} placeholder="0" min="0" /></td>
                                        <td><input className="po-table-input" style={{ width: 58 }} value={row.unit} onChange={e => updateRow(row._id, 'unit', e.target.value)} placeholder="Nos" /></td>
                                        <td><input className="po-table-input" style={{ width: 86 }} type="number" value={row.rate} onChange={e => updateRow(row._id, 'rate', e.target.value)} placeholder="0.00" min="0" /></td>
                                        <td><input className="po-table-input" style={{ width: 52 }} type="number" value={row.tax_percent} onChange={e => updateRow(row._id, 'tax_percent', e.target.value)} placeholder="18" min="0" max="100" /></td>
                                        <td style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>₹{taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td style={{ fontWeight: 700, whiteSpace: 'nowrap', color: '#2563eb' }}>₹{rowTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td style={{ paddingRight: 16 }}>
                                            <button className="po-del-btn" onClick={() => removeRow(row._id)} disabled={rows.length === 1}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                                            </button>
                                        </td>
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
        </>
    );
}

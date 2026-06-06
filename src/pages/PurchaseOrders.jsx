import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from '../utils/toast';
import * as XLSX from 'xlsx';

const API = import.meta.env.VITE_API_URL || 'https://fims-dashboard.onrender.com/api';
const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
});

const STATUS_OPTIONS = ['All Status', 'draft', 'pending_approval', 'approved', 'rejected', 'partially_inwarded', 'received', 'cancelled', 'cancellation_requested'];

const STATUS_STYLES = {
    draft: { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
    pending_approval: { bg: '#fef3c7', color: '#92400e', label: 'Pending Approval' },
    approved: { bg: '#dcfce7', color: '#15803d', label: 'Approved' },
    rejected: { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected' },
    ordered: { bg: '#dbeafe', color: '#1d4ed8', label: 'Ordered' },
    partially_inwarded: { bg: '#ffedd5', color: '#c2410c', label: 'Partially Inwarded' },
    received: { bg: '#d1fae5', color: '#065f46', label: 'Received' },
    cancelled: { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled' },
    cancellation_requested: { bg: '#fce7f3', color: '#9d174d', label: 'Cancellation Requested' },
};

const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export default function PurchaseOrders() {
    const navigate = useNavigate();
    const [pos, setPos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [vendorFilter, setVendorFilter] = useState('All Vendors');
    const [menuOpen, setMenuOpen] = useState(null);
    const [viewModal, setViewModal] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [cancelReqModal, setCancelReqModal] = useState(null); // { po } — cancel request modal
    const [cancelReason, setCancelReason] = useState('');
    const [cancelSubmitting, setCancelSubmitting] = useState(false);
    const [deletePOModal, setDeletePOModal] = useState(null); // po object to confirm delete
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => { fetchPOs(); }, []);

    useEffect(() => {
        const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(null); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const fetchPOs = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API}/purchase-orders`, { headers: getAuthHeaders() });
            const data = await res.json();
            setPos(Array.isArray(data) ? data : (data.data || []));
        } catch { toast.error('Failed to load purchase orders'); }
        finally { setLoading(false); }
    };

    const handleDeletePO = async () => {
        if (!deletePOModal) return;
        setDeleteSubmitting(true);
        try {
            const res = await fetch(`${API}/purchase-orders/${deletePOModal.id}/status`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ status: 'cancelled' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to cancel PO');
            toast.success('PO cancelled successfully');
            setDeletePOModal(null);
            fetchPOs();
        } catch (e) { toast.error(e.message); }
        finally { setDeleteSubmitting(false); }
    };

    const handleRequestCancel = async () => {
        if (!cancelReqModal) return;
        setCancelSubmitting(true);
        try {
            const res = await fetch(`${API}/purchase-orders/${cancelReqModal.id}/request-cancel`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ cancellation_reason: cancelReason }),
            });
            if (!res.ok) throw new Error('Failed');
            toast.success('Cancellation request submitted — awaiting admin approval');
            setCancelReqModal(null);
            setCancelReason('');
            fetchPOs();
        } catch {
            toast.error('Failed to submit cancellation request');
        } finally {
            setCancelSubmitting(false);
        }
    };

    // Derive unique vendors for filter
    const vendorNames = ['All Vendors', ...Array.from(new Set(pos.map(p => p.vendor_name).filter(Boolean)))];

    const fetchAndOpenModal = async (po) => {
        setViewModal(po); // show modal immediately with partial data
        setModalLoading(true);
        try {
            const res = await fetch(`${API}/purchase-orders/${po.id}`, { headers: getAuthHeaders() });
            if (res.ok) {
                const full = await res.json();
                setViewModal(full);
            }
        } catch { /* keep partial data */ }
        finally { setModalLoading(false); }
    };

    const filtered = pos.filter(p => {
        const q = search.toLowerCase();
        const matchSearch = !q || (p.po_number || '').toLowerCase().includes(q) || (p.vendor_name || '').toLowerCase().includes(q);
        const matchStatus = statusFilter === 'All Status' || p.status === statusFilter;
        const matchVendor = vendorFilter === 'All Vendors' || p.vendor_name === vendorFilter;
        return matchSearch && matchStatus && matchVendor;
    });

    const handleExport = () => {
        if (filtered.length === 0) { toast.error('No data to export'); return; }

        const headers = ['PO Number', 'Vendor', 'Status', 'Order Date', 'Delivery Date', 'Amount Before Tax (INR)', 'Tax Rate (%)', 'Tax Amount (INR)', 'Grand Total (INR)'];
        const rows = filtered.map(po => {
            const taxRateStr = po.tax_rates || '0%';
            // Convert "18%" → 18 (number) so Excel right-aligns it; keep as string only for mixed rates like "5%, 18%"
            const taxRateVal = /^(\d+(?:\.\d+)?)%$/.test(taxRateStr)
                ? parseFloat(taxRateStr)
                : taxRateStr;
            return [
                po.po_number || `PO-${po.id}`,
                po.vendor_name || '',
                STATUS_STYLES[po.status]?.label || po.status || '',
                fmtDate(po.order_date || po.created_at),
                fmtDate(po.expected_delivery_date),
                parseFloat(po.total_amount || 0),
                taxRateVal,
                parseFloat(po.tax_amount || 0),
                parseFloat(po.grand_total || po.total_amount || 0),
            ];
        });

        const wsData = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Auto-size columns based on max content length
        const colWidths = headers.map((h, colIdx) => {
            const maxLen = Math.max(
                h.length,
                ...rows.map(row => String(row[colIdx] ?? '').length)
            );
            return { wch: maxLen + 4 };
        });
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Purchase Orders');
        XLSX.writeFile(wb, `purchase-orders-${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success(`Exported ${filtered.length} order${filtered.length !== 1 ? 's' : ''}`);
    };

    return (
        <>
            <style>{`
        .po-list-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
        }
        .po-search-bar {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
        }
        .po-search-input-wrap {
          position: relative;
        }
        .po-search-input-wrap svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }
        .po-search-input {
          width: 100%;
          padding: 9px 12px 9px 38px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #1e293b;
          background: white;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .po-search-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .po-search-input::placeholder { color: #94a3b8; }
        .po-filter-select {
          width: 100%;
          padding: 9px 32px 9px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #1e293b;
          background: white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 10px center;
          background-size: 16px;
          appearance: none;
          -webkit-appearance: none;
          outline: none;
          cursor: pointer;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .po-filter-select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .po-table { width: 100%; border-collapse: collapse; }
        .po-table thead { background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
        .po-table th { padding: 12px 20px; text-align: left; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; }
        .po-table tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
        .po-table tbody tr:hover { background: #f8fafc; }
        .po-table tbody tr:last-child { border-bottom: none; }
        .po-table td { padding: 14px 20px; font-size: 14px; color: #1e293b; vertical-align: middle; }
        .po-number-link { font-family: 'Courier New', monospace; font-weight: 600; color: #2563eb; cursor: pointer; text-decoration: none; }
        .po-number-link:hover { text-decoration: underline; }
        .po-vendor-cell { display: flex; align-items: center; gap: 8px; color: #374151; }
        .po-status-badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 500; white-space: nowrap; }
        .po-amount { font-weight: 600; color: #111827; }
        .po-menu-wrap { position: relative; }
        .po-menu-btn { background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 6px; color: #6b7280; font-size: 20px; line-height: 1; transition: background 0.15s; }
        .po-menu-btn:hover { background: #f1f5f9; }
        .po-dropdown-menu { position: absolute; right: 0; top: 100%; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.10); min-width: 148px; z-index: 9999; }
        .po-dropdown-item { display: flex; align-items: center; gap: 8px; padding: 9px 14px; font-size: 13px; color: #374151; cursor: pointer; transition: background 0.12s; }
        .po-dropdown-item:hover { background: #f8fafc; }
        .po-dropdown-item.danger { color: #dc2626; }
        .po-dropdown-item.danger:hover { background: #fef2f2; }
        .po-empty { padding: 60px 20px; text-align: center; color: #94a3b8; }
        .po-empty svg { margin: 0 auto 12px; display: block; color: #d1d5db; }
        .po-footer { padding: 12px 20px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #64748b; }
        .po-export-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-weight: 500; color: #374151; cursor: pointer; transition: all 0.15s; }
        .po-export-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
        .po-create-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #2563eb; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; color: white; cursor: pointer; transition: background 0.15s; }
        .po-create-btn:hover { background: #1d4ed8; }
      `}</style>

            <header className="main-header">
                <div className="main-title">
                    <h1>Purchase Orders</h1>
                    <p>{loading ? 'Loading…' : `${filtered.length} order${filtered.length !== 1 ? 's' : ''} found`}</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="po-export-btn" onClick={handleExport}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        Export
                    </button>
                    <button className="po-create-btn" onClick={() => navigate('/createpo')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Create PO
                    </button>
                </div>
            </header>

            <div className="po-list-card">
                {/* Search + Filters */}
                <div className="po-search-bar">
                    <div className="po-search-input-wrap">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input
                            className="po-search-input"
                            placeholder="Search by PO number or vendor…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <select className="po-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'All Status' ? 'All Status' : STATUS_STYLES[s]?.label || s}</option>)}
                    </select>
                    <select className="po-filter-select" value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}>
                        {vendorNames.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="po-empty">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                        <p>Loading purchase orders…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="po-empty">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                        {pos.length === 0 ? (
                            <>
                                <p style={{ marginTop: 8 }}>No purchase orders found</p>
                                <button className="po-create-btn" style={{ margin: '16px auto 0', display: 'inline-flex' }} onClick={() => navigate('/createpo')}>
                                    + Create your first PO
                                </button>
                            </>
                        ) : (
                            <p style={{ marginTop: 8 }}>No orders match your search or filters</p>
                        )}
                    </div>
                ) : (
                    <div ref={menuRef}>
                        <table className="po-table">
                            <thead>
                                <tr>
                                    <th>PO Number</th>
                                    <th>Vendor</th>
                                    <th>Date</th>
                                    <th>Delivery</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(po => {
                                    const st = STATUS_STYLES[po.status] || STATUS_STYLES.draft;
                                    const total = parseFloat(po.total_amount || po.grand_total || 0);
                                    return (
                                        <tr key={po.id}>
                                            <td>
                                                <span className="po-number-link" onClick={() => { }}>
                                                    {po.po_number || `PO-${po.id}`}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="po-vendor-cell">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                                                    {po.vendor_name || '—'}
                                                </div>
                                            </td>
                                            <td style={{ color: '#64748b' }}>{fmtDate(po.order_date || po.created_at)}</td>
                                            <td style={{ color: '#64748b' }}>{fmtDate(po.expected_delivery_date)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span className="po-amount">
                                                    ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="po-status-badge" style={{ background: st.bg, color: st.color }}>
                                                    {st.label}
                                                </span>
                                            </td>
                                            <td style={{ width: 40 }}>
                                                <div className="po-menu-wrap">
                                                    <button className="po-menu-btn" onClick={() => setMenuOpen(menuOpen === po.id ? null : po.id)}>⋮</button>
                                                    {menuOpen === po.id && (
                                                        <div className="po-dropdown-menu">
                                                            <div className="po-dropdown-item" onClick={() => { navigate(`/editpo/${po.id}`); setMenuOpen(null); }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                                Edit
                                                            </div>
                                                            <div className="po-dropdown-item" onClick={() => { fetchAndOpenModal(po); setMenuOpen(null); }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                                View Details
                                                            </div>
                                                            {/* Cancel PO — only for approved (not received) */}
                                                            {po.status === 'approved' && (
                                                                <div className="po-dropdown-item danger" onClick={() => { setCancelReqModal(po); setCancelReason(''); setMenuOpen(null); }}>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                                                    Request Cancellation
                                                                </div>
                                                            )}
                                                            {/* Cancel PO (no approval needed) — only for pending_approval */}
                                                            {po.status === 'pending_approval' && (
                                                                <div className="po-dropdown-item danger" onClick={() => { setMenuOpen(null); setDeletePOModal(po); }}>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
                                                                    Cancel PO
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && filtered.length > 0 && (
                    <div className="po-footer">
                        Showing {filtered.length} of {pos.length} orders
                    </div>
                )}
            </div>

            {/* View Details Modal */}
            {viewModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={e => e.target === e.currentTarget && setViewModal(null)}>
                    <div style={{ background: 'white', borderRadius: 14, maxWidth: 660, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        {/* Header */}
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                                <span style={{ fontSize: 16, fontWeight: 700, color: '#111827', fontFamily: 'Courier New, monospace' }}>{viewModal.po_number || `PO-${viewModal.id}`}</span>
                                <span className="po-status-badge" style={{ background: STATUS_STYLES[viewModal.status]?.bg || '#f1f5f9', color: STATUS_STYLES[viewModal.status]?.color || '#374151' }}>
                                    {STATUS_STYLES[viewModal.status]?.label || viewModal.status}
                                </span>
                                {modalLoading && <span style={{ fontSize: 12, color: '#9ca3af' }}>Loading…</span>}
                            </div>
                            <button onClick={() => setViewModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, borderRadius: 6, lineHeight: 1 }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: 24, overflowY: 'auto' }}>

                            {/* Vendor & Order Info */}
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Order Information</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Vendor</p>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{viewModal.vendor_name || viewModal.vendor_display_name || '—'}</p>
                                    {viewModal.vendor_phone && <p style={{ fontSize: 12, color: '#6b7280', margin: '3px 0 0' }}>📞 {viewModal.vendor_phone}</p>}
                                    {viewModal.vendor_email && <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>✉ {viewModal.vendor_email}</p>}
                                </div>
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Amount</p>
                                    <p style={{ fontSize: 20, fontWeight: 700, color: '#2563eb', margin: 0 }}>₹{parseFloat(viewModal.total_amount || viewModal.grand_total || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Order Date</p>
                                    <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0 }}>{fmtDate(viewModal.order_date || viewModal.created_at)}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Expected Delivery</p>
                                    <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0 }}>{fmtDate(viewModal.expected_delivery_date)}</p>
                                </div>
                                {viewModal.approved_at && (
                                    <div>
                                        <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Approved On</p>
                                        <p style={{ fontSize: 14, fontWeight: 500, color: '#15803d', margin: 0 }}>{fmtDate(viewModal.approved_at)}</p>
                                    </div>
                                )}
                                {viewModal.notes && (
                                    <div style={{ gridColumn: '1/-1' }}>
                                        <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Notes / Payment Terms</p>
                                        <p style={{ fontSize: 14, color: '#374151', margin: 0, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>{viewModal.notes}</p>
                                    </div>
                                )}
                                {viewModal.rejection_reason && (
                                    <div style={{ gridColumn: '1/-1' }}>
                                        <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Rejection Reason</p>
                                        <p style={{ fontSize: 14, color: '#b91c1c', margin: 0, background: '#fef2f2', padding: '8px 12px', borderRadius: 8, border: '1px solid #fca5a5' }}>{viewModal.rejection_reason}</p>
                                    </div>
                                )}
                            </div>

                            {/* Items Table */}
                            {Array.isArray(viewModal.items) && viewModal.items.length > 0 ? (
                                <>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Items ({viewModal.items.length})</p>
                                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                            <thead>
                                                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                                    <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Item</th>
                                                    <th style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Qty</th>
                                                    <th style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Rate</th>
                                                    <th style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Taxable Amt</th>
                                                    <th style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Tax %</th>
                                                    <th style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {viewModal.items.map((it, i) => {
                                                    const qty = parseFloat(it.quantity || 0);
                                                    const rate = parseFloat(it.unit_price || 0);
                                                    const taxPct = parseFloat(it.tax_percent || 0);
                                                    const taxableAmt = qty * rate;
                                                    const taxAmt = taxableAmt * taxPct / 100;
                                                    const lineTotal = taxableAmt + taxAmt;
                                                    return (
                                                        <tr key={i} style={{ borderBottom: i < viewModal.items.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                                                            <td style={{ padding: '10px 14px', color: '#111827', fontWeight: 500 }}>
                                                                <div>{it.item_name || it.name || '—'}</div>
                                                                {it.item_code && <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', marginTop: 2 }}>{it.item_code}</div>}
                                                            </td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center', color: '#374151', fontWeight: 600 }}>{qty} {it.unit || ''}</td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'right', color: '#374151' }}>₹{rate.toLocaleString('en-IN')}</td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'right', color: '#374151' }}>₹{taxableAmt.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                                {taxPct > 0
                                                                    ? <span style={{ color: '#92400e', fontSize: 13, fontWeight: 600 }}>{taxPct}%</span>
                                                                    : <span style={{ color: '#9ca3af', fontSize: 13 }}>—</span>
                                                                }
                                                            </td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                {(() => {
                                                    const subtotal = viewModal.items.reduce((s, it) => s + parseFloat(it.unit_price || 0) * parseFloat(it.quantity || 0), 0);
                                                    const totalTax = viewModal.items.reduce((s, it) => {
                                                        const taxable = parseFloat(it.unit_price || 0) * parseFloat(it.quantity || 0);
                                                        return s + taxable * parseFloat(it.tax_percent || 0) / 100;
                                                    }, 0);
                                                    const grandTotal = subtotal + totalTax;
                                                    return (
                                                        <>
                                                            <tr style={{ borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
                                                                <td colSpan={5} style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 500, color: '#6b7280', fontSize: 13 }}>Subtotal</td>
                                                                <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, color: '#374151', fontSize: 13 }}>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                                                            </tr>
                                                            <tr style={{ background: '#f9fafb' }}>
                                                                <td colSpan={5} style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 500, color: '#6b7280', fontSize: 13 }}>Tax Amount</td>
                                                                <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, color: '#d97706', fontSize: 13 }}>₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                                                            </tr>
                                                            <tr style={{ borderTop: '2px solid #e5e7eb', background: '#eff6ff' }}>
                                                                <td colSpan={5} style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#1e40af', fontSize: 13 }}>Grand Total</td>
                                                                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#2563eb', fontSize: 15 }}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                                                            </tr>
                                                        </>
                                                    );
                                                })()}
                                            </tfoot>
                                        </table>
                                    </div>
                                </>
                            ) : !modalLoading ? (
                                <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>No items found for this PO.</p>
                            ) : null}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setViewModal(null)} style={{ padding: '8px 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Request Modal */}
            {cancelReqModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}
                    onClick={e => e.target === e.currentTarget && !cancelSubmitting && setCancelReqModal(null)}>
                    <div style={{ background: 'white', borderRadius: 14, maxWidth: 460, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', background: '#fff5f5', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                            <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Request PO Cancellation</span>
                        </div>
                        {/* Body */}
                        <div style={{ padding: '20px 24px' }}>
                            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 6 }}>
                                You are requesting cancellation of <strong style={{ color: '#111827' }}>{cancelReqModal.po_number}</strong>.
                            </p>
                            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>
                                This will be sent to admin for approval. The PO will remain active until the admin approves the cancellation.
                            </p>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                                Reason for Cancellation <span style={{ color: '#9ca3af', fontWeight: 400 }}>(required)</span>
                            </label>
                            <textarea
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                placeholder="e.g. Wrong items, better quote received, vendor unresponsive…"
                                rows={3}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>
                        {/* Footer */}
                        <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button onClick={() => setCancelReqModal(null)} disabled={cancelSubmitting}
                                style={{ padding: '8px 18px', background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleRequestCancel} disabled={cancelSubmitting || !cancelReason.trim()}
                                style={{ padding: '8px 18px', background: cancelReason.trim() ? '#dc2626' : '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: cancelReason.trim() ? 'white' : '#9ca3af', cursor: cancelReason.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}>
                                {cancelSubmitting ? 'Submitting…' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel PO Confirmation Modal (for pending_approval POs) */}
            {deletePOModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}
                    onClick={e => e.target === e.currentTarget && !deleteSubmitting && setDeletePOModal(null)}>
                    <div style={{ background: 'white', borderRadius: 14, maxWidth: 420, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', background: '#fff5f5', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
                            <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Cancel Purchase Order</span>
                        </div>
                        {/* Body */}
                        <div style={{ padding: '20px 24px' }}>
                            <p style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>
                                Cancel <strong>{deletePOModal.po_number}</strong>?
                            </p>
                            <p style={{ fontSize: 13, color: '#9ca3af' }}>
                                The PO will be marked as <strong style={{ color: '#6b7280' }}>Cancelled</strong> and will no longer be sent for admin approval.
                            </p>
                        </div>
                        {/* Footer */}
                        <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button onClick={() => setDeletePOModal(null)} disabled={deleteSubmitting}
                                style={{ padding: '8px 18px', background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>Go Back</button>
                            <button onClick={handleDeletePO} disabled={deleteSubmitting}
                                style={{ padding: '8px 18px', background: '#dc2626', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'white', cursor: deleteSubmitting ? 'not-allowed' : 'pointer', opacity: deleteSubmitting ? 0.7 : 1, transition: 'all 0.15s' }}>
                                {deleteSubmitting ? 'Cancelling…' : 'Cancel PO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

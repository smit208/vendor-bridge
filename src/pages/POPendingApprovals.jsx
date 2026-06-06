import React, { useState, useEffect } from 'react';
import toast from '../utils/toast';

const API = import.meta.env.VITE_API_URL || 'https://fims-dashboard.onrender.com/api';
const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
});

const timeAgo = (iso) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
    return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) !== 1 ? 's' : ''} ago`;
};

const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtCurrency = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtAmount = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function POPendingApprovals() {
    const [pos, setPos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState(null);
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [detailPanel, setDetailPanel] = useState(null);   // full PO object (with items)
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => { fetchPending(); }, []);

    const fetchPending = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API}/purchase-orders/pending`, { headers: getAuthHeaders() });
            if (res.ok) {
                const json = await res.json();
                setPos(Array.isArray(json) ? json : (json.data || []));
            } else {
                const res2 = await fetch(`${API}/purchase-orders`, { headers: getAuthHeaders() });
                const json2 = await res2.json();
                const all = Array.isArray(json2) ? json2 : (json2.data || []);
                setPos(all.filter(p => p.status === 'pending_approval'));
            }
        } catch {
            toast.error('Failed to load pending approvals');
        } finally { setLoading(false); }
    };

    const openDetail = async (po) => {
        setDetailPanel({ ...po, items: [] });   // show panel immediately with skeleton
        setDetailLoading(true);
        try {
            const res = await fetch(`${API}/purchase-orders/${po.id}`, { headers: getAuthHeaders() });
            if (res.ok) {
                const full = await res.json();
                setDetailPanel(full);
            }
        } catch {
            toast.error('Failed to load PO details');
        } finally { setDetailLoading(false); }
    };

    const handleApprove = async (id) => {
        setActing(id);
        try {
            const res = await fetch(`${API}/purchase-orders/${id}/status`, {
                method: 'PATCH', headers: getAuthHeaders(),
                body: JSON.stringify({ status: 'approved' }),
            });
            if (!res.ok) throw new Error('Failed');
            toast.success('PO approved!');
            setDetailPanel(null);
            fetchPending();
        } catch { toast.error('Failed to approve'); } finally { setActing(null); }
    };

    const handleRejectSubmit = async () => {
        if (!rejectModal) return;
        setActing(rejectModal.id);
        try {
            const res = await fetch(`${API}/purchase-orders/${rejectModal.id}/status`, {
                method: 'PATCH', headers: getAuthHeaders(),
                body: JSON.stringify({ status: 'rejected', rejection_reason: rejectReason }),
            });
            if (!res.ok) throw new Error('Failed');
            toast.success('PO rejected');
            setRejectModal(null); setRejectReason('');
            setDetailPanel(null);
            fetchPending();
        } catch { toast.error('Failed to reject'); } finally { setActing(null); }
    };

    // Parse payment/delivery terms out of notes field
    const parseTerms = (notes) => {
        if (!notes) return { payment: '', delivery: '', other: notes };
        const payMatch = notes.match(/Payment:\s*([^|]+)/);
        const delMatch = notes.match(/Delivery:\s*([^|]+)/);
        let other = notes.replace(/Payment:\s*[^|]+\|?/g, '').replace(/Delivery:\s*[^|]+\|?/g, '').trim().replace(/^\||\|$/g, '').trim();
        return {
            payment: payMatch ? payMatch[1].trim() : '',
            delivery: delMatch ? delMatch[1].trim() : '',
            other,
        };
    };

    const computeTotals = (items) => {
        if (!Array.isArray(items)) return { subtotal: 0, totalTax: 0, grandTotal: 0 };
        const subtotal = items.reduce((s, r) => s + (parseFloat(r.quantity) || 0) * (parseFloat(r.unit_price) || 0), 0);
        const totalTax = items.reduce((s, r) => {
            const base = (parseFloat(r.quantity) || 0) * (parseFloat(r.unit_price) || 0);
            return s + base * (parseFloat(r.tax_percent) || 0) / 100;
        }, 0);
        return { subtotal, totalTax, grandTotal: subtotal + totalTax };
    };

    return (
        <>
            <style>{`
        /* ── List cards ── */
        .pa-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px 22px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: box-shadow 0.15s, border-color 0.15s; cursor: pointer; }
        .pa-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.09); border-color: #d1d5db; }
        .pa-card.selected { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.1); }
        .pa-left { display: flex; flex-direction: column; gap: 5px; }
        .pa-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .pa-po-num { font-family: 'Courier New', monospace; font-size: 15px; font-weight: 700; color: #2563eb; }
        .pa-badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #fef3c7; color: #92400e; }
        .pa-vendor { font-size: 14px; color: #374151; font-weight: 500; }
        .pa-meta { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #9ca3af; margin-top: 2px; }
        .pa-meta-dot { font-size: 16px; line-height: 1; }
        .pa-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        /* Buttons */
        .pa-view-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; font-weight: 500; color: #374151; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .pa-view-btn:hover { background: #f9fafb; border-color: #d1d5db; }
        .pa-reject-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; background: white; border: 1px solid #fca5a5; border-radius: 8px; font-size: 13px; font-weight: 500; color: #dc2626; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .pa-reject-btn:hover { background: #fef2f2; }
        .pa-approve-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; background: #16a34a; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; color: white; cursor: pointer; transition: background 0.15s; white-space: nowrap; }
        .pa-approve-btn:hover { background: #15803d; }
        .pa-approve-btn:disabled, .pa-reject-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .pa-empty { text-align: center; padding: 60px 20px; color: #9ca3af; background: white; border-radius: 12px; border: 1px solid #e5e7eb; }
        /* ── Layout: list + detail side by side ── */
        .pa-layout { display: flex; gap: 20px; align-items: flex-start; }
        .pa-list-col { flex: 0 0 420px; min-width: 0; }
        .pa-detail-col { flex: 1; min-width: 0; }
        /* ── Detail panel ── */
        .pa-detail { background: white; border: 1px solid #e5e7eb; border-radius: 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; position: sticky; top: 20px; }
        .pa-detail-header { padding: 18px 22px; border-bottom: 1px solid #e5e7eb; background: #f9fafb; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .pa-detail-title { display: flex; flex-direction: column; gap: 4px; }
        .pa-detail-ponum { font-family: 'Courier New', monospace; font-size: 17px; font-weight: 700; color: #2563eb; }
        .pa-detail-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .pa-detail-body { padding: 22px; max-height: calc(100vh - 180px); overflow-y: auto; }
        /* Section headers in detail */
        .pa-section-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px solid #f3f4f6; }
        .pa-section { margin-bottom: 22px; }
        /* Info grid */
        .pa-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .pa-info-grid.col3 { grid-template-columns: 1fr 1fr 1fr; }
        .pa-field label { display: block; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .pa-field p { font-size: 14px; font-weight: 500; color: #111827; margin: 0; }
        .pa-field p.muted { color: #6b7280; font-weight: 400; }
        /* Items table */
        .pa-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
        .pa-tbl th { background: #f9fafb; padding: 9px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
        .pa-tbl th.r { text-align: right; }
        .pa-tbl td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; vertical-align: middle; }
        .pa-tbl td.r { text-align: right; color: #111827; }
        .pa-tbl tbody tr:last-child td { border-bottom: none; }
        /* Totals box */
        .pa-totals { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 18px; }
        .pa-totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; color: #6b7280; }
        .pa-totals-row.grand { font-size: 16px; font-weight: 700; color: #111827; border-top: 1px solid #e5e7eb; margin-top: 6px; padding-top: 10px; }
        .pa-totals-row.grand span:last-child { color: #2563eb; }
        /* Skeleton */
        .pa-skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.2s infinite; border-radius: 6px; height: 16px; margin-bottom: 8px; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        /* Reject modal */
        .pa-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
        .pa-modal { background: white; border-radius: 12px; max-width: 480px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.15); overflow: hidden; }
        .pa-modal-header { padding: 18px 24px; border-bottom: 1px solid #f3f4f6; background: #f9fafb; display: flex; align-items: center; justify-content: space-between; }
        .pa-modal-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #111827; display: flex; align-items: center; gap: 8px; }
        .pa-modal-body { padding: 24px; }
        .pa-modal-footer { padding: 16px 24px; border-top: 1px solid #f3f4f6; display: flex; justify-content: flex-end; gap: 10px; }
        .pa-close-btn { background: none; border: none; cursor: pointer; color: #6b7280; padding: 4px; border-radius: 6px; line-height: 1; }
        .pa-close-btn:hover { background: #f3f4f6; color: #111827; }
        /* Responsive */
        @media (max-width: 900px) {
          .pa-layout { flex-direction: column; }
          .pa-list-col { flex: none; width: 100%; }
          .pa-detail { position: static; }
          .pa-detail-body { max-height: 70vh; }
          .pa-info-grid.col3 { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 600px) {
          .pa-card { flex-direction: column; align-items: flex-start; }
          .pa-info-grid, .pa-info-grid.col3 { grid-template-columns: 1fr; }
        }
      `}</style>

            <header className="main-header">
                <div className="main-title">
                    <h1>Pending Approvals</h1>
                    <p>{loading ? 'Loading…' : `${pos.length} order${pos.length !== 1 ? 's' : ''} awaiting approval`}</p>
                </div>
            </header>

            <div className="pa-layout">
                {/* ── Left: list ── */}
                <div className="pa-list-col">
                    {loading ? (
                        <div className="pa-empty">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                            <p>Loading…</p>
                        </div>
                    ) : pos.length === 0 ? (
                        <div className="pa-empty">
                            <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><polyline points="20 6 9 17 4 12" /></svg>
                            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>All caught up!</p>
                            <p style={{ fontSize: 13 }}>No purchase orders are waiting for approval.</p>
                        </div>
                    ) : (
                        pos.map(po => {
                            const total = parseFloat(po.total_amount || po.grand_total || 0);
                            const itemCount = po.item_count || po.items?.length || 0;
                            const isSelected = detailPanel?.id === po.id;
                            return (
                                <div
                                    key={po.id}
                                    className={`pa-card${isSelected ? ' selected' : ''}`}
                                    onClick={() => openDetail(po)}
                                >
                                    <div className="pa-left">
                                        <div className="pa-top">
                                            <span className="pa-po-num">{po.po_number || `PO-${po.id}`}</span>
                                            <span className="pa-badge">Pending Approval</span>
                                        </div>
                                        <div className="pa-vendor">{po.vendor_name || po.vendor_display_name || 'Unknown Vendor'}</div>
                                        <div className="pa-meta">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                            {timeAgo(po.created_at)}
                                            {total > 0 && <><span className="pa-meta-dot">·</span>{fmtAmount(total)}</>}
                                            {itemCount > 0 && <><span className="pa-meta-dot">·</span>{itemCount} item{itemCount !== 1 ? 's' : ''}</>}
                                        </div>
                                    </div>
                                    <div className="pa-actions" onClick={e => e.stopPropagation()}>
                                        <button className="pa-reject-btn" onClick={() => { setRejectModal(po); setRejectReason(''); }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                            Reject
                                        </button>
                                        <button className="pa-approve-btn" onClick={() => handleApprove(po.id)} disabled={acting === po.id}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            {acting === po.id ? 'Approving…' : 'Approve'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ── Right: detail panel ── */}
                {detailPanel && (
                    <div className="pa-detail-col">
                        <div className="pa-detail">
                            {/* Header */}
                            <div className="pa-detail-header">
                                <div className="pa-detail-title">
                                    <span className="pa-detail-ponum">{detailPanel.po_number || `PO-${detailPanel.id}`}</span>
                                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                                        {detailPanel.vendor_name || detailPanel.vendor_display_name || 'Unknown Vendor'}
                                        {detailPanel.created_at && <> · Submitted {timeAgo(detailPanel.created_at)}</>}
                                    </span>
                                </div>
                                <div className="pa-detail-actions">
                                    <button className="pa-close-btn" onClick={() => setDetailPanel(null)} title="Close">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                    </button>
                                </div>
                            </div>

                            {detailLoading ? (
                                <div className="pa-detail-body">
                                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="pa-skeleton" style={{ width: `${60 + i * 8}%` }} />)}
                                </div>
                            ) : (
                                <div className="pa-detail-body">

                                    {/* ── Vendor Details ── */}
                                    <div className="pa-section">
                                        <p className="pa-section-label">Vendor Details</p>
                                        <div className="pa-info-grid">
                                            <div className="pa-field">
                                                <label>Vendor Name</label>
                                                <p>{detailPanel.vendor_name || detailPanel.vendor_display_name || '—'}</p>
                                            </div>
                                            {detailPanel.vendor_gst && (
                                                <div className="pa-field">
                                                    <label>GST Number</label>
                                                    <p style={{ fontFamily: 'monospace' }}>{detailPanel.vendor_gst}</p>
                                                </div>
                                            )}
                                            {(detailPanel.vendor_email || detailPanel.vendor_display_email) && (
                                                <div className="pa-field">
                                                    <label>Email</label>
                                                    <p className="muted">{detailPanel.vendor_email || detailPanel.vendor_display_email}</p>
                                                </div>
                                            )}
                                            {(detailPanel.vendor_phone || detailPanel.vendor_display_phone) && (
                                                <div className="pa-field">
                                                    <label>Phone / WhatsApp</label>
                                                    <p className="muted">{detailPanel.vendor_phone || detailPanel.vendor_display_phone}</p>
                                                </div>
                                            )}
                                            {detailPanel.vendor_address && (
                                                <div className="pa-field" style={{ gridColumn: '1/-1' }}>
                                                    <label>Address</label>
                                                    <p className="muted">{detailPanel.vendor_address}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ── Order Details ── */}
                                    <div className="pa-section">
                                        <p className="pa-section-label">Order Details</p>
                                        {(() => {
                                            const terms = parseTerms(detailPanel.notes);
                                            return (
                                                <div className="pa-info-grid col3">
                                                    <div className="pa-field">
                                                        <label>PO Date</label>
                                                        <p>{fmtDate(detailPanel.order_date)}</p>
                                                    </div>
                                                    <div className="pa-field">
                                                        <label>Expected Delivery</label>
                                                        <p>{fmtDate(detailPanel.expected_delivery_date)}</p>
                                                    </div>
                                                    <div className="pa-field">
                                                        <label>Submitted</label>
                                                        <p>{fmtDate(detailPanel.created_at)}</p>
                                                    </div>
                                                    {terms.payment && (
                                                        <div className="pa-field">
                                                            <label>Payment Terms</label>
                                                            <p>{terms.payment}</p>
                                                        </div>
                                                    )}
                                                    {terms.delivery && (
                                                        <div className="pa-field">
                                                            <label>Delivery Terms</label>
                                                            <p>{terms.delivery}</p>
                                                        </div>
                                                    )}
                                                    {terms.other && (
                                                        <div className="pa-field" style={{ gridColumn: '1/-1' }}>
                                                            <label>Notes</label>
                                                            <p className="muted">{terms.other}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* ── Line Items ── */}
                                    <div className="pa-section">
                                        <p className="pa-section-label">Materials / Items</p>
                                        {Array.isArray(detailPanel.items) && detailPanel.items.length > 0 ? (
                                            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                                                <table className="pa-tbl">
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Material</th>
                                                            <th>HSN</th>
                                                            <th className="r">Qty</th>
                                                            <th>Unit</th>
                                                            <th className="r">Rate (₹)</th>
                                                            <th className="r">Tax %</th>
                                                            <th className="r">Tax Amt</th>
                                                            <th className="r">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {detailPanel.items.map((it, i) => {
                                                            const base = (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0);
                                                            const taxAmt = base * (parseFloat(it.tax_percent) || 0) / 100;
                                                            const rowTotal = base + taxAmt;
                                                            return (
                                                                <tr key={it.id || i}>
                                                                    <td style={{ color: '#9ca3af', width: 28 }}>{i + 1}</td>
                                                                    <td style={{ fontWeight: 500, color: '#111827' }}>{it.item_name || it.name || '—'}</td>
                                                                    <td style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: 12 }}>{it.item_code || it.hsn || '—'}</td>
                                                                    <td className="r">{parseFloat(it.quantity || 0).toLocaleString('en-IN')}</td>
                                                                    <td style={{ color: '#6b7280' }}>{it.unit || '—'}</td>
                                                                    <td className="r">{fmtCurrency(it.unit_price)}</td>
                                                                    <td className="r" style={{ color: '#6b7280' }}>{it.tax_percent != null ? `${it.tax_percent}%` : '—'}</td>
                                                                    <td className="r" style={{ color: '#6b7280' }}>{fmtCurrency(taxAmt)}</td>
                                                                    <td className="r" style={{ fontWeight: 600, color: '#2563eb' }}>{fmtCurrency(rowTotal)}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>No item details available.</p>
                                        )}

                                        {/* Totals */}
                                        {Array.isArray(detailPanel.items) && detailPanel.items.length > 0 && (() => {
                                            const { subtotal, totalTax, grandTotal } = computeTotals(detailPanel.items);
                                            return (
                                                <div className="pa-totals">
                                                    <div className="pa-totals-row">
                                                        <span>Subtotal</span>
                                                        <span>{fmtCurrency(subtotal)}</span>
                                                    </div>
                                                    <div className="pa-totals-row">
                                                        <span>Total Tax (GST)</span>
                                                        <span>{fmtCurrency(totalTax)}</span>
                                                    </div>
                                                    <div className="pa-totals-row grand">
                                                        <span>Grand Total</span>
                                                        <span>{fmtCurrency(grandTotal)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* ── Approve / Reject actions ── */}
                                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #f3f4f6', marginTop: 4 }}>
                                        <button
                                            className="pa-reject-btn"
                                            style={{ padding: '9px 20px', fontSize: 14 }}
                                            onClick={() => { setRejectModal(detailPanel); setRejectReason(''); }}
                                            disabled={acting === detailPanel.id}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                            Reject PO
                                        </button>
                                        <button
                                            className="pa-approve-btn"
                                            style={{ padding: '9px 22px', fontSize: 14 }}
                                            onClick={() => handleApprove(detailPanel.id)}
                                            disabled={acting === detailPanel.id}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            {acting === detailPanel.id ? 'Approving…' : 'Final Approve'}
                                        </button>
                                    </div>

                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Reject Modal ── */}
            {rejectModal && (
                <div className="pa-overlay" onClick={e => e.target === e.currentTarget && setRejectModal(null)}>
                    <div className="pa-modal">
                        <div className="pa-modal-header">
                            <h3>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                Reject Purchase Order
                            </h3>
                            <button className="pa-close-btn" onClick={() => setRejectModal(null)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <div className="pa-modal-body">
                            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                                You are rejecting <strong style={{ color: '#111827' }}>{rejectModal.po_number}</strong> from <strong style={{ color: '#111827' }}>{rejectModal.vendor_name || rejectModal.vendor_display_name}</strong>.
                            </p>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                                Rejection Reason <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="e.g. Price too high, wrong vendor, needs revision…"
                                rows={3}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div className="pa-modal-footer">
                            <button className="pa-view-btn" onClick={() => setRejectModal(null)}>Cancel</button>
                            <button className="pa-reject-btn" style={{ padding: '8px 20px' }} onClick={handleRejectSubmit} disabled={acting === rejectModal?.id}>
                                {acting === rejectModal?.id ? 'Rejecting…' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

import React, { useState, useEffect } from 'react';
import toast from '../utils/toast';

const API = import.meta.env.VITE_API_URL || 'https://fims-dashboard.onrender.com/api';
const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
});

const PAYMENT_TERMS = ['15 Days', '30 Days', '45 Days', '60 Days', '90 Days', 'Advance', 'On Delivery'];

const empty = () => ({
    name: '', gstin: '', email: '', phone: '',
    contact_person: '', address: '', city: '', state: '',
    payment_terms: '30 Days', is_active: true, notes: '',
});

const initials = (name) => (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
const avatarColor = (name) => AVATAR_COLORS[(name || ' ').charCodeAt(0) % AVATAR_COLORS.length];

const fmt = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_LABELS = {
    draft: { label: 'Draft', color: '#6b7280', bg: '#f3f4f6' },
    pending_approval: { label: 'Pending', color: '#d97706', bg: '#fffbeb' },
    approved: { label: 'Approved', color: '#2563eb', bg: '#eff6ff' },
    final_approved: { label: 'Final Approved', color: '#2563eb', bg: '#eff6ff' },
    partially_inwarded: { label: 'Partially Inwarded', color: '#7c3aed', bg: '#f5f3ff' },
    received: { label: 'Received', color: '#15803d', bg: '#dcfce7' },
    cancelled: { label: 'Cancelled', color: '#dc2626', bg: '#fee2e2' },
    completed: { label: 'Completed', color: '#15803d', bg: '#dcfce7' },
};

// ─── Vendor Ledger Modal ───────────────────────────────────────────────────────
function VendorLedger({ vendor, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('pos');
    const [filters, setFilters] = useState({ year: 'All Years', month: 'All Months', from: '', to: '' });

    const fetchLedger = async () => {
        setLoading(true);
        try {
            const q = new URLSearchParams();
            if (filters.year !== 'All Years') q.set('year', filters.year);
            if (filters.month !== 'All Months') {
                const mNum = new Date(`${filters.month} 1`).getMonth() + 1;
                q.set('month', mNum);
            }
            if (filters.from) q.set('from', filters.from);
            if (filters.to) q.set('to', filters.to);
            const res = await fetch(`${API}/vendors/${vendor.id}/ledger?${q}`, { headers: getAuthHeaders() });
            const d = await res.json();
            setData(d);
        } catch { toast.error('Failed to load ledger'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchLedger(); }, [filters]);

    const years = ['All Years', ...Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i))];
    const months = ['All Months', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    // Measure the sidebar width from the DOM so the overlay never covers it
    const [sidebarW, setSidebarW] = useState(280);
    useEffect(() => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) setSidebarW(sidebar.getBoundingClientRect().width);
    }, []);

    const pos = data?.pos || [];
    const allGrns = data?.grns || [];
    const nprs = data?.nprs || [];
    const s = data?.summary || {};

    // Filter GRNs client-side by received_date (backend only filters POs by date)
    const grns = allGrns.filter(g => {
        if (!g.received_date) return true;
        const d = new Date(g.received_date);
        if (filters.year !== 'All Years' && d.getFullYear() !== parseInt(filters.year)) return false;
        if (filters.month !== 'All Months') {
            const mNum = new Date(`${filters.month} 1`).getMonth();
            if (d.getMonth() !== mNum) return false;
        }
        if (filters.from && d < new Date(filters.from)) return false;
        if (filters.to && d > new Date(filters.to + 'T23:59:59')) return false;
        return true;
    });

    const tabs = [
        { key: 'pos', label: `POs (${pos.length})` },
        { key: 'grns', label: `GRNs (${grns.length})` },
        { key: 'nprs', label: `NPRs (${nprs.length})` },
    ];

    return (
        <div style={{
            position: 'fixed', top: 0, bottom: 0, left: sidebarW, right: 0,
            background: '#f8fafc', zIndex: 200,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>

            {/* Header */}
            <div style={{
                background: 'white', borderBottom: '1px solid #e5e7eb',
                padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14,
            }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 8, background: avatarColor(vendor.name),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
                }}>{initials(vendor.name)}</div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{vendor.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{vendor.code} · Vendor Ledger</div>
                </div>
                <button onClick={onClose} style={{
                    marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                    color: '#6b7280', fontSize: 20, lineHeight: 1, padding: 4, borderRadius: 6,
                }}>✕</button>
            </div>

            {/* Filters */}
            <div style={{
                background: 'white', borderBottom: '1px solid #e5e7eb',
                padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            }}>
                <span style={{ fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                    Filters:
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' }}>
                    Year
                    <select value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}
                        style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 24px 4px 8px', fontSize: 13, color: '#374151', background: 'white', cursor: 'pointer', outline: 'none' }}>
                        {years.map(y => <option key={y}>{y}</option>)}
                    </select>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' }}>
                    Month
                    <select value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}
                        style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 24px 4px 8px', fontSize: 13, color: '#374151', background: 'white', cursor: 'pointer', outline: 'none' }}>
                        {months.map(m => <option key={m}>{m}</option>)}
                    </select>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' }}>
                    From
                    <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
                        style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px', fontSize: 13, color: '#374151', background: 'white', outline: 'none', cursor: 'pointer' }} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' }}>
                    To
                    <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
                        style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px', fontSize: 13, color: '#374151', background: 'white', outline: 'none', cursor: 'pointer' }} />
                </label>
            </div>



            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                    {(() => {
                        const EXCLUDED_STATUSES = ['rejected', 'cancelled'];
                        const activePOs = pos.filter(p => !EXCLUDED_STATUSES.includes(p.status));
                        const totalPOValue = activePOs.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);
                        const totalGRNValue = grns.reduce((sum, g) => sum + parseFloat(g.invoice_amount || 0), 0);
                        // Fallback: if invoice_amount missing, derive paid from po-outstanding ratio
                        const totalPaid = totalGRNValue || (s.total_paid || (s.total_po_value - s.outstanding) || 0);
                        const outstanding = totalPOValue - totalGRNValue;
                        return (<>
                            <SummaryCard title="Total PO Value" value={`₹${fmt(totalPOValue)}`}
                                sub={`${pos.length} orders`} color="#3b82f6" bg="#eff6ff" />
                            <SummaryCard title="Materials Received" value={`₹${fmt(totalPaid)}`}
                                sub={`${grns.length} GRN${grns.length !== 1 ? 's' : ''}`} color="#16a34a" bg="#f0fdf4" />
                            <SummaryCard title="Pending Delivery" value={`₹${fmt(outstanding > 0 ? outstanding : 0)}`}
                                sub="Materials not yet received" color="#ea580c" bg="#fff7ed" />
                            <SummaryCard title="GRNs" value={grns.length}
                                sub="Total inwards" color="#7c3aed" bg="#f5f3ff" />
                        </>);
                    })()}
                </div>

                {/* Tabs */}
                <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 20px', gap: 0 }}>
                        {tabs.map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)} style={{
                                padding: '12px 16px', background: 'none', border: 'none',
                                borderBottom: tab === t.key ? '2px solid #3b82f6' : '2px solid transparent',
                                color: tab === t.key ? '#3b82f6' : '#6b7280',
                                fontWeight: tab === t.key ? 600 : 500, fontSize: 13,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                marginBottom: -1,
                            }}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading…</div>
                    ) : tab === 'pos' ? (
                        <POsTable rows={pos} />
                    ) : tab === 'grns' ? (
                        <GRNsTable rows={grns} />
                    ) : (
                        <EmptyTab label="No NPRs found" />
                    )}
                </div>
            </div>
        </div>
    );
}

const selStyle = {
    padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: 6,
    fontSize: 13, color: '#374151', background: 'white', outline: 'none',
};

function SummaryCard({ title, value, sub, color, bg }) {
    return (
        <div style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color, fontWeight: 600, marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 5 }}>{sub}</div>
        </div>
    );
}

function POsTable({ rows }) {
    if (!rows.length) return <EmptyTab label="No Purchase Orders found" />;
    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['PO Number', 'Date', 'Payment Terms', 'Amount', 'Status'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map(r => {
                    const st = STATUS_LABELS[r.status] || { label: r.status, color: '#6b7280', bg: '#f3f4f6' };
                    return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}
                        >
                            <td style={{ padding: '11px 16px', color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }}>{r.po_number}</td>
                            <td style={{ padding: '11px 16px', color: '#374151' }}>{fmtDate(r.order_date)}</td>
                            <td style={{ padding: '11px 16px', color: '#374151' }}>{r.payment_terms || '—'}</td>
                            <td style={{ padding: '11px 16px', color: '#374151' }}>₹{fmt(r.total_amount)}</td>
                            <td style={{ padding: '11px 16px' }}>
                                <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    {st.label}
                                </span>
                            </td>
                        </tr>
                    );
                })}
                <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb' }}>
                    <td colSpan={3} style={{ padding: '11px 16px', fontWeight: 700, color: '#111827' }}>Total</td>
                    <td style={{ padding: '11px 16px', fontWeight: 700, color: '#3b82f6' }}>
                        ₹{fmt(rows.filter(r => !['rejected', 'cancelled'].includes(r.status)).reduce((s, r) => s + parseFloat(r.total_amount || 0), 0))}
                    </td>
                    <td />
                </tr>
            </tbody>
        </table>
    );
}

function GRNsTable({ rows }) {
    if (!rows.length) return <EmptyTab label="No GRNs found" />;
    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    {['GRN Number', 'Date', 'Invoice #', 'Invoice Amount', 'Status'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map(r => {
                    const st = STATUS_LABELS[r.status] || { label: r.status || 'Completed', color: '#15803d', bg: '#dcfce7' };
                    return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                            <td style={{ padding: '10px 16px', color: '#3b82f6', fontWeight: 600 }}>{r.grn_number || '—'}</td>
                            <td style={{ padding: '10px 16px', color: '#374151' }}>{fmtDate(r.received_date)}</td>
                            <td style={{ padding: '10px 16px', color: '#374151' }}>{r.invoice_number || '—'}</td>
                            <td style={{ padding: '10px 16px', color: '#374151' }}>₹{fmt(r.invoice_amount)}</td>
                            <td style={{ padding: '10px 16px' }}>
                                <span style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                    {st.label}
                                </span>
                            </td>
                        </tr>
                    );
                })}
                <tr>
                    <td colSpan={3} style={{ padding: '10px 16px', fontWeight: 700, color: '#111827' }}>Total Invoice Value</td>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#3b82f6' }}>
                        ₹{fmt(rows.reduce((s, r) => s + parseFloat(r.invoice_amount || 0), 0))}
                    </td>
                    <td />
                </tr>
            </tbody>
        </table>
    );
}

function EmptyTab({ label }) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>{label}</div>;
}

// ─── Main VendorMaster page ────────────────────────────────────────────────────
export default function VendorMaster() {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(null); // null | 'add' | {id, ...}
    const [form, setForm] = useState(empty());
    const [saving, setSaving] = useState(false);
    const [nextCode, setNextCode] = useState('VND0001');
    const [ledgerVendor, setLedgerVendor] = useState(null);

    useEffect(() => { fetchVendors(); }, []);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API}/vendors`, { headers: getAuthHeaders() });
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.vendors || data.data || []);
            setVendors(list);
            const maxNum = list.reduce((m, v) => {
                const n = parseInt((v.code || '').replace(/\D/g, '')) || 0;
                return Math.max(m, n);
            }, 0);
            setNextCode(`VND${String(maxNum + 1).padStart(4, '0')}`);
        } catch { toast.error('Failed to load vendors'); }
        finally { setLoading(false); }
    };

    const openAdd = async () => {
        try {
            const res = await fetch(`${API}/vendors`, { headers: getAuthHeaders() });
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.vendors || data.data || []);
            setVendors(list);
            const maxNum = list.reduce((m, v) => {
                const n = parseInt((v.code || '').replace(/\D/g, '')) || 0;
                return Math.max(m, n);
            }, 0);
            setNextCode(`VND${String(maxNum + 1).padStart(4, '0')}`);
        } catch { /* use existing nextCode if fetch fails */ }
        setForm(empty());
        setModal('add');
    };
    const openEdit = (v) => {
        setForm({
            name: v.name || '', gstin: v.gstin || '', email: v.email || '',
            phone: v.phone || '', contact_person: v.contact_person || '',
            address: v.address || '', city: v.city || '', state: v.state || '',
            payment_terms: v.payment_terms || '30 Days',
            is_active: v.is_active !== false, notes: v.notes || '',
        });
        setModal(v);
    };
    const closeModal = () => { setModal(null); setForm(empty()); setEmailError(''); };

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const [emailError, setEmailError] = useState('');

    const handleSave = async () => {
        if (!form.name.trim()) { toast.warning('Vendor Name is required'); return; }
        if (form.email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(form.email.trim())) {
                setEmailError('Please enter a valid email address (e.g. vendor@gmail.com)');
                toast.warning('Invalid email format');
                return;
            }
        }
        setEmailError('');
        setSaving(true);
        try {
            const isEdit = modal && modal !== 'add';
            const url = isEdit ? `${API}/vendors/${modal.id}` : `${API}/vendors`;
            const method = isEdit ? 'PUT' : 'POST';
            const body = { ...form, code: isEdit ? modal.code : nextCode };
            const res = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(body) });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
            toast.success(isEdit ? 'Vendor updated!' : 'Vendor added!');
            closeModal();
            fetchVendors();
        } catch (e) { toast.error(e.message); }
        finally { setSaving(false); }
    };

    const filtered = vendors.filter(v =>
        !search || (v.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.code || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.email || '').toLowerCase().includes(search.toLowerCase())
    );

    const inputStyle = {
        width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 7,
        fontSize: 14, color: '#374151', outline: 'none', fontFamily: 'inherit',
        boxSizing: 'border-box', background: 'white', transition: 'border-color 0.2s',
    };
    const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 };

    return (
        <>
            <style>{`
        .vm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .vm-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: box-shadow 0.15s; }
        .vm-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.10); }
        .vm-card-top { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; }
        .vm-avatar { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: white; flex-shrink: 0; }
        .vm-card-name { font-size: 15px; font-weight: 700; color: #111827; margin: 0; line-height: 1.2; }
        .vm-card-code { font-size: 12px; color: #9ca3af; font-family: monospace; margin-top: 2px; }
        .vm-badge-active { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #dcfce7; color: #15803d; }
        .vm-badge-inactive { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #f3f4f6; color: #6b7280; }
        .vm-card-info { font-size: 13px; color: #6b7280; margin-bottom: 5px; display: flex; align-items: flex-start; gap: 6px; }
        .vm-card-info strong { color: #374151; font-weight: 500; }
        .vm-card-footer { margin-top: 16px; padding-top: 14px; border-top: 1px solid #f3f4f6; display: flex; gap: 8px; }
        .vm-edit-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: white; border: 1px solid #e5e7eb; border-radius: 7px; font-size: 13px; font-weight: 500; color: #374151; cursor: pointer; transition: all 0.15s; }
        .vm-edit-btn:hover { background: #f9fafb; border-color: #d1d5db; }
        .vm-ledger-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: white; border: 1px solid #e5e7eb; border-radius: 7px; font-size: 13px; font-weight: 500; color: #374151; cursor: pointer; transition: all 0.15s; }
        .vm-ledger-btn:hover { background: #eff6ff; border-color: #3b82f6; color: #3b82f6; }
        .vm-add-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; background: #2563eb; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; color: white; cursor: pointer; transition: background 0.15s; }
        .vm-add-btn:hover { background: #1d4ed8; }
        .vm-search { width: 100%; padding: 9px 12px 9px 38px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; color: #374151; outline: none; background: white; box-sizing: border-box; }
        .vm-search:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .vm-search::placeholder { color: #94a3b8; }
        .vm-search-wrap { position: relative; margin-bottom: 20px; background: white; border-radius: 8px; }
        .vm-search-wrap svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
        .vm-empty { text-align: center; padding: 60px 20px; color: #9ca3af; background: white; border-radius: 12px; border: 1px solid #e5e7eb; }
        /* Modal */
        .vm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
        .vm-modal { background: white; border-radius: 14px; width: 100%; max-width: 680px; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 48px rgba(0,0,0,0.18); scrollbar-width: none; }
        .vm-modal::-webkit-scrollbar { display: none; }
        .vm-modal-header { position: sticky; top: 0; background: white; z-index: 1; padding: 20px 24px 16px; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: space-between; }
        .vm-modal-header h2 { margin: 0; font-size: 17px; font-weight: 700; color: #111827; }
        .vm-modal-body { padding: 24px; }
        .vm-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .vm-form-row.full { grid-template-columns: 1fr; }
        .vm-form-field { display: flex; flex-direction: column; }
        .vm-modal-footer { padding: 16px 24px 20px; border-top: 1px solid #f3f4f6; display: flex; justify-content: flex-end; gap: 10px; }
        .vm-cancel-btn { padding: 9px 20px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; font-weight: 500; color: #374151; cursor: pointer; transition: all 0.15s; }
        .vm-cancel-btn:hover { background: #f9fafb; }
        .vm-save-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 22px; background: #2563eb; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; color: white; cursor: pointer; transition: background 0.15s; }
        .vm-save-btn:hover { background: #1d4ed8; }
        .vm-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .vm-close-btn { background: none; border: none; cursor: pointer; color: #6b7280; padding: 4px; border-radius: 6px; display: flex; align-items: center; }
        .vm-close-btn:hover { background: #f3f4f6; color: #111827; }
        .vm-section-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.07em; margin: 8px 0 16px; padding-bottom: 8px; border-bottom: 1px solid #f3f4f6; }
        .vm-auto-input { background: #f9fafb !important; color: #6b7280 !important; }
      `}</style>

            <header className="main-header">
                <div className="main-title">
                    <h1>Vendor Master</h1>
                    <p>{loading ? 'Loading…' : `${vendors.length} vendor${vendors.length !== 1 ? 's' : ''}`}</p>
                </div>
                <button className="vm-add-btn" onClick={openAdd}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Add Vendor
                </button>
            </header>

            {/* Search */}
            <div className="vm-search-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input className="vm-search" placeholder="Search vendors…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Cards */}
            {loading ? (
                <div className="vm-empty"><p>Loading vendors…</p></div>
            ) : filtered.length === 0 ? (
                <div className="vm-empty">
                    <p>{search ? 'No vendors match your search.' : 'No vendors yet.'}</p>
                    {!search && <button className="vm-add-btn" style={{ marginTop: 14, display: 'inline-flex' }} onClick={openAdd}>+ Add First Vendor</button>}
                </div>
            ) : (
                <div className="vm-grid">
                    {filtered.map(v => {
                        const color = avatarColor(v.name);
                        const location = [v.city, v.state].filter(Boolean).join(', ');
                        return (
                            <div key={v.id} className="vm-card">
                                <div className="vm-card-top">
                                    <div className="vm-avatar" style={{ background: color }}>{initials(v.name)}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                            <div>
                                                <p className="vm-card-name">{v.name}</p>
                                                <p className="vm-card-code">{v.code}</p>
                                            </div>
                                            <span className={v.is_active !== false ? 'vm-badge-active' : 'vm-badge-inactive'}>
                                                {v.is_active !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {v.email && <div className="vm-card-info"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>{v.email}</div>}
                                {v.phone && <div className="vm-card-info"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>{v.phone}</div>}
                                {location && <div className="vm-card-info"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg><span style={{ color: '#3b82f6' }}>{location}</span></div>}
                                {v.gstin && <div className="vm-card-info"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>GST: {v.gstin}</div>}
                                <div className="vm-card-footer">
                                    <button className="vm-edit-btn" onClick={() => openEdit(v)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                        Edit
                                    </button>
                                    <button className="vm-ledger-btn" onClick={() => setLedgerVendor(v)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                                        Ledger
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Vendor Ledger */}
            {ledgerVendor && <VendorLedger vendor={ledgerVendor} onClose={() => setLedgerVendor(null)} />}

            {/* Add / Edit Modal */}
            {modal !== null && (
                <div className="vm-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
                    <div className="vm-modal">
                        <div className="vm-modal-header">
                            <h2>{modal === 'add' ? 'Add New Vendor' : `Edit: ${modal.name}`}</h2>
                            <button className="vm-close-btn" onClick={closeModal}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        <div className="vm-modal-body">
                            {/* Basic Info */}
                            <div className="vm-form-row">
                                <div className="vm-form-field">
                                    <label style={labelStyle}>Vendor Code</label>
                                    <input style={{ ...inputStyle, background: '#f9fafb', color: '#6b7280' }} value={modal === 'add' ? nextCode : (modal.code || '')} readOnly />
                                </div>
                                <div className="vm-form-field">
                                    <label style={labelStyle}>Vendor Name *</label>
                                    <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Enter vendor name" />
                                </div>
                            </div>
                            <div className="vm-form-row full">
                                <div className="vm-form-field">
                                    <label style={labelStyle}>GST Number</label>
                                    <input style={inputStyle} value={form.gstin} onChange={e => set('gstin', e.target.value)} placeholder="e.g. 24AAAAA0000A1Z5" />
                                </div>
                            </div>
                            <div className="vm-form-row">
                                <div className="vm-form-field">
                                    <label style={labelStyle}>Email</label>
                                    <input
                                        style={{ ...inputStyle, borderColor: emailError ? '#ef4444' : '#e5e7eb' }}
                                        type="text"
                                        value={form.email}
                                        onChange={e => { set('email', e.target.value); if (emailError) setEmailError(''); }}
                                        placeholder="vendor@email.com"
                                    />
                                    {emailError && <span style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{emailError}</span>}
                                </div>
                                <div className="vm-form-field">
                                    <label style={labelStyle}>Phone</label>
                                    <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
                                </div>
                            </div>
                            <div className="vm-form-row full">
                                <div className="vm-form-field">
                                    <label style={labelStyle}>Contact Person</label>
                                    <input style={inputStyle} value={form.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="Name" />
                                </div>
                            </div>

                            <div className="vm-form-row full">
                                <div className="vm-form-field">
                                    <label style={labelStyle}>Address</label>
                                    <input style={inputStyle} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street, Building, Area" />
                                </div>
                            </div>
                            <div className="vm-form-row">
                                <div className="vm-form-field">
                                    <label style={labelStyle}>City</label>
                                    <input style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" />
                                </div>
                                <div className="vm-form-field">
                                    <label style={labelStyle}>State</label>
                                    <input style={inputStyle} value={form.state} onChange={e => set('state', e.target.value)} placeholder="State" />
                                </div>
                            </div>
                            <div className="vm-form-row">
                                <div className="vm-form-field">
                                    <label style={labelStyle}>Payment Terms</label>
                                    <select style={{ ...inputStyle, background: `white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 10px center`, backgroundSize: '16px', appearance: 'none', cursor: 'pointer' }}
                                        value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)}>
                                        {PAYMENT_TERMS.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="vm-form-field">
                                    <label style={labelStyle}>Status</label>
                                    <select style={{ ...inputStyle, background: `white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 10px center`, backgroundSize: '16px', appearance: 'none', cursor: 'pointer' }}
                                        value={form.is_active ? 'Active' : 'Inactive'} onChange={e => set('is_active', e.target.value === 'Active')}>
                                        <option>Active</option>
                                        <option>Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="vm-form-row full">
                                <div className="vm-form-field">
                                    <label style={labelStyle}>Notes</label>
                                    <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes…" />
                                </div>
                            </div>
                        </div>

                        <div className="vm-modal-footer">
                            <button className="vm-cancel-btn" onClick={closeModal}>Cancel</button>
                            <button className="vm-save-btn" onClick={handleSave} disabled={saving}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

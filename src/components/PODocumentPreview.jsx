import React from 'react';

const inr = (n) =>
    '₹' + parseFloat(n || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const fmtD = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const Label = ({ children }) => (
    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: 4 }}>
        {children}
    </div>
);

const Value = ({ children, mono, style }) => (
    <div style={{ fontSize: 13, color: '#111827', fontFamily: mono ? 'monospace' : 'inherit', ...style }}>
        {children}
    </div>
);

export default function PODocumentPreview({ po }) {
    if (!po) return null;

    const notes = po.notes || '';
    const payMatch = notes.match(/Payment:\s*([^|]+)/);
    const delMatch = notes.match(/Delivery:\s*([^|]+)/);
    const payTerms = payMatch ? payMatch[1].trim() : '—';
    const delTerms = delMatch ? delMatch[1].trim() : '—';
    const otherNotes = notes.replace(/Payment:\s*[^|]+\|?/, '').replace(/Delivery:\s*[^|]+/, '').trim().replace(/^\|\s*/, '');

    const items = Array.isArray(po.items) ? po.items : [];
    const subtotal = items.reduce((s, it) => s + parseFloat(it.quantity || 0) * parseFloat(it.unit_price || 0), 0);
    const tax = items.reduce((s, it) => {
        const base = parseFloat(it.quantity || 0) * parseFloat(it.unit_price || 0);
        return s + base * (parseFloat(it.tax_percent || 0) / 100);
    }, 0);
    const grand = subtotal + tax;

    const th = { padding: '9px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6b7280', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' };
    const td = (extra = {}) => ({ padding: '10px 12px', fontSize: 12, borderBottom: '1px solid #f3f4f6', color: '#374151', ...extra });

    return (
        <div style={{ background: '#fff', fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: 13, color: '#111827' }}>

            {/* ── TOP: Company left, PO info right ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '28px 32px 22px', borderBottom: '1px solid #e5e7eb' }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px', color: '#111827', marginBottom: 2 }}>FIMS</div>
                    <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.8 }}>
                        Factory Information Management System<br />
                        123, Industrial Estate, Phase 2, Pune — 411 019<br />
                        GSTIN: 27AAAAA0000A1Z5
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '0.5px', color: '#111827', marginBottom: 8 }}>PURCHASE ORDER</div>
                    <table style={{ marginLeft: 'auto', fontSize: 12, borderCollapse: 'collapse' }}>
                        <tbody>
                            {[['PO No.', po.po_number], ['Date', fmtD(po.order_date)]].map(([k, v]) => (
                                <tr key={k}>
                                    <td style={{ paddingRight: 16, paddingBottom: 4, color: '#6b7280', textAlign: 'right' }}>{k}</td>
                                    <td style={{ paddingBottom: 4, fontWeight: 700, color: '#111827', fontFamily: k === 'PO No.' ? 'monospace' : 'inherit' }}>{v}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── VENDOR + SHIP TO ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ padding: '18px 32px', borderRight: '1px solid #e5e7eb' }}>
                    <Label>Vendor (Bill To)</Label>
                    <Value style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{po.vendor_name || '—'}</Value>
                    {po.vendor_gst && <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 2 }}>GSTIN: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{po.vendor_gst}</span></div>}
                    {po.vendor_address && <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.7, marginBottom: 2 }}>{po.vendor_address}</div>}
                    {po.vendor_email && <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 2 }}>{po.vendor_email}</div>}
                    {po.vendor_phone && <div style={{ fontSize: 11, color: '#4b5563' }}>{po.vendor_phone}</div>}
                </div>
                <div style={{ padding: '18px 32px' }}>
                    <Label>Ship To</Label>
                    <Value style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>FIMS Factory</Value>
                    <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.7 }}>
                        123, Industrial Estate, Phase 2<br />
                        Pune, Maharashtra — 411 019
                    </div>
                </div>
            </div>

            {/* ── TERMS ROW ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {[
                    ['Payment Terms', payTerms],
                    ['Delivery Terms', delTerms],
                    ['Expected Delivery', fmtD(po.expected_delivery_date)],
                ].map(([label, val], i) => (
                    <div key={label} style={{ padding: '12px 20px', borderRight: i < 2 ? '1px solid #e5e7eb' : 'none' }}>
                        <Label>{label}</Label>
                        <Value>{val}</Value>
                    </div>
                ))}
            </div>

            {/* ── LINE ITEMS ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{ ...th, textAlign: 'left', width: 32 }}>#</th>
                        <th style={{ ...th, textAlign: 'left' }}>Description</th>
                        <th style={{ ...th, textAlign: 'left' }}>HSN</th>
                        <th style={{ ...th, textAlign: 'right' }}>Qty</th>
                        <th style={{ ...th, textAlign: 'left' }}>Unit</th>
                        <th style={{ ...th, textAlign: 'right' }}>Rate (₹)</th>
                        <th style={{ ...th, textAlign: 'right' }}>GST %</th>
                        <th style={{ ...th, textAlign: 'right' }}>GST Amt</th>
                        <th style={{ ...th, textAlign: 'right' }}>Total (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan={9} style={{ ...td(), textAlign: 'center', color: '#9ca3af', fontStyle: 'italic', padding: '24px' }}>
                                No items
                            </td>
                        </tr>
                    ) : items.map((it, i) => {
                        const qty = parseFloat(it.quantity || 0);
                        const rate = parseFloat(it.unit_price || 0);
                        const taxPct = parseFloat(it.tax_percent || 0);
                        const base = qty * rate;
                        const taxAmt = base * taxPct / 100;
                        const total = base + taxAmt;
                        return (
                            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                <td style={td({ color: '#9ca3af', fontSize: 11 })}>{i + 1}</td>
                                <td style={td({ fontWeight: 600 })}>{it.item_name || it.name || '—'}</td>
                                <td style={td({ fontFamily: 'monospace', fontSize: 11, color: '#6b7280' })}>{it.item_code || '—'}</td>
                                <td style={td({ textAlign: 'right' })}>{qty}</td>
                                <td style={td({ color: '#6b7280' })}>{it.unit || '—'}</td>
                                <td style={td({ textAlign: 'right' })}>{inr(rate)}</td>
                                <td style={td({ textAlign: 'right', color: '#6b7280' })}>{taxPct}%</td>
                                <td style={td({ textAlign: 'right', color: '#6b7280' })}>{inr(taxAmt)}</td>
                                <td style={td({ textAlign: 'right', fontWeight: 700 })}>{inr(total)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* ── TOTALS + NOTES ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '20px 32px 24px', borderTop: '2px solid #e5e7eb', background: '#f9fafb' }}>
                {/* Notes / T&C left */}
                <div style={{ maxWidth: 340 }}>
                    <Label>Terms &amp; Remarks</Label>
                    <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.8 }}>
                        {otherNotes || (
                            <>
                                1. Quote PO number on all correspondence &amp; invoices.<br />
                                2. Goods must conform exactly to specifications.<br />
                                3. All taxes as stated are included in the above amounts.
                            </>
                        )}
                    </div>
                    <div style={{ marginTop: 24 }}>
                        <Label>Authorised Signatory</Label>
                        <div style={{ width: 140, borderBottom: '1px solid #d1d5db', paddingBottom: 4, marginBottom: 4 }} />
                        <div style={{ fontSize: 11, color: '#6b7280' }}>FIMS — Authorised by Admin</div>
                    </div>
                </div>

                {/* Totals right */}
                <div style={{ minWidth: 240 }}>
                    {[['Subtotal', inr(subtotal)], ['GST', inr(tax)]].map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                            <span>{label}</span><span style={{ fontFamily: 'monospace' }}>{val}</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: 15, fontWeight: 800, color: '#111827' }}>
                        <span>Grand Total</span>
                        <span style={{ fontFamily: 'monospace' }}>{inr(grand)}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, textAlign: 'right', fontStyle: 'italic' }}>
                        Amount in Indian Rupees
                    </div>
                </div>
            </div>

        </div>
    );
}

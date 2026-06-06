import React, { useState, useEffect } from "react";
import { materialInwardService, itemMasterService } from "../services";
import CustomDropdown from '../components/CustomDropdown';
import toast from '../utils/toast';

const API = import.meta.env.VITE_API_URL || 'https://fims-dashboard.onrender.com/api';
const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

function generateGRN() {
  const now = new Date();
  const yymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const seq = String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0');
  return `GRN-${yymm}-${seq}`;
}

const today = new Date().toISOString().split('T')[0];

export default function MaterialInward() {
  const [step, setStep] = useState(1);
  const [grnNumber] = useState(generateGRN);

  // ── Step 1 ──
  const [inwardMode, setInwardMode] = useState('po');
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [loadingPODetails, setLoadingPODetails] = useState(false);

  // ── Step 2 fields ──
  const [grnDate, setGrnDate] = useState(today);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [qcRequired, setQcRequired] = useState('No');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [notes, setNotes] = useState('');
  // Each row: { _id, itemCode, itemName, unit, ordered, alreadyIn, received, rejected, batchNo, heatNo }
  const [materialRows, setMaterialRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // ── NPIR fields ──
  const [npirVendor, setNpirVendor] = useState('');
  const [npirVendorManual, setNpirVendorManual] = useState('');
  const [npirMaterial, setNpirMaterial] = useState('');
  const [npirMaterialManual, setNpirMaterialManual] = useState('');
  const [npirQuantity, setNpirQuantity] = useState('0');
  const [npirUnit, setNpirUnit] = useState('');
  const [npirRate, setNpirRate] = useState('0');
  const [npirReason, setNpirReason] = useState('');
  const [npirRequestDate, setNpirRequestDate] = useState(today);
  const [npirAuthority, setNpirAuthority] = useState('');
  const [npirWarehouse, setNpirWarehouse] = useState('');
  const [npirNotes, setNpirNotes] = useState('');
  const [npirFileName, setNpirFileName] = useState('No file chosen');
  const [purchasableItems, setPurchasableItems] = useState([]);
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    fetchPOs();
    fetchPurchasableItems();
    fetchVendors();
  }, []);

  const fetchPOs = async () => {
    try {
      setLoadingPOs(true);
      const res = await fetch(`${API}/purchase-orders`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const all = Array.isArray(data) ? data : (data.orders || data.data || []);
        // Show approved POs (or all if none approved)
        const approved = all.filter(p => p.status === 'approved' || p.status === 'partially_inwarded');
        setPurchaseOrders(approved.length ? approved : all);
      }
    } catch (e) { console.error('Error fetching POs', e); }
    finally { setLoadingPOs(false); }
  };

  const fetchPurchasableItems = async () => {
    try {
      const res = await fetch(`${API}/item-master?purchasable=true`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.items || data.data || []);
        setPurchasableItems(items.filter(i => i.is_purchasable || i.purchasable || true));
      }
    } catch (e) { console.error('Error fetching purchasable items', e); }
  };

  const fetchVendors = async () => {
    try {
      const res = await fetch(`${API}/vendors`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setVendors(Array.isArray(data) ? data : (data.vendors || data.data || []));
      }
    } catch (e) { console.error('Error fetching vendors', e); }
  };

  const handlePOSelect = async (label) => {
    if (!label || label === 'Select PO') { setSelectedPO(null); setMaterialRows([]); return; }
    const po = purchaseOrders.find(p => `${p.po_number} — ${p.vendor_name || 'Unknown Vendor'}` === label);
    if (!po) return;
    // Fetch full PO with items
    try {
      setLoadingPODetails(true);
      const res = await fetch(`${API}/purchase-orders/${po.id}`, { headers: getAuthHeaders() });
      if (!res.ok) { toast.warning('Could not load PO details'); return; }
      const fullPO = await res.json();
      setSelectedPO(fullPO);
      const rows = (fullPO.items || []).map((item, i) => ({
        _id: i,
        item_master_id: item.item_master_id || null,
        itemCode: item.item_code || `ITM${String(item.item_master_id || i).padStart(5, '0')}`,
        itemName: item.item_name || item.name || 'Unknown',
        unit: item.unit || 'Nos',
        ordered: parseFloat(item.quantity) || 0,
        alreadyIn: parseFloat(item.received_quantity || 0),
        costPerUnit: parseFloat(item.unit_price || item.rate || 0),
        received: '', rejected: '', batchNo: '', heatNo: '',
      }));
      setMaterialRows(rows);
    } catch (e) { console.error('Error fetching PO details', e); }
    finally { setLoadingPODetails(false); }
  };

  const poOptions = ['Select PO', ...purchaseOrders.map(p => `${p.po_number} — ${p.vendor_name || 'Unknown Vendor'}`)];
  const selectedPOLabel = selectedPO ? `${selectedPO.po_number} — ${selectedPO.vendor_name || 'Unknown Vendor'}` : 'Select PO';

  const updateRow = (id, field, value) =>
    setMaterialRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r));

  const getAccepted = (row) => {
    const rec = parseFloat(row.received) || 0;
    const rej = parseFloat(row.rejected) || 0;
    return Math.max(0, rec - rej);
  };
  const getPending = (row) => Math.max(0, row.ordered - row.alreadyIn - (parseFloat(row.received) || 0));

  const totalReceived = materialRows.reduce((s, r) => s + (parseFloat(r.received) || 0), 0);
  const totalRejected = materialRows.reduce((s, r) => s + (parseFloat(r.rejected) || 0), 0);
  const totalAccepted = materialRows.reduce((s, r) => s + getAccepted(r), 0);

  const handleNext = () => {
    if (inwardMode === 'po' && !selectedPO) { toast.warning('Please select a PO number'); return; }
    if (loadingPODetails) { toast.warning('Please wait, loading PO details…'); return; }
    setStep(2);
  };

  const handleSubmit = async (isDraft = false) => {
    const validRows = materialRows.filter(r => parseFloat(r.received) > 0);
    if (!isDraft && validRows.length === 0) { toast.warning('Please enter received quantity for at least one item'); return; }

    // ── Over-quantity check ──
    if (!isDraft) {
      for (const row of validRows) {
        const received = parseFloat(row.received) || 0;
        const remaining = row.ordered - row.alreadyIn;   // what's still pending
        if (received > remaining) {
          toast.error(
            `"${row.itemName}": Received (${received}) exceeds remaining quantity (${remaining}). ` +
            `Ordered: ${row.ordered}, Already received: ${row.alreadyIn}.`
          );
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      for (const row of (isDraft ? materialRows : validRows)) {
        await materialInwardService.create({
          item_master_id: row.item_master_id || null,
          quantity: parseFloat(row.received) || 0,
          unit: row.unit,
          supplier: selectedPO?.vendor_name || 'Unknown',
          vehicle_number: vehicleNumber || null,
          invoice_number: invoiceNumber || null,
          grn_number: grnDate || null,
          cost_per_unit: row.costPerUnit || 0,
          notes: notes || null,
          po_id: selectedPO?.id || null,
          inward_mode: inwardMode,
          batch_no: row.batchNo || null,
          status: isDraft ? 'draft' : 'completed',
        });
      }
      // Update PO status after successful inward
      if (!isDraft && selectedPO?.id && inwardMode === 'po') {
        const allFulfilled = materialRows.every(r => {
          const totalReceived = r.alreadyIn + (parseFloat(r.received) || 0);
          return totalReceived >= r.ordered && r.ordered > 0;
        });
        const newStatus = allFulfilled ? 'received' : 'partially_inwarded';
        console.log(`Updating PO ${selectedPO.id} status → ${newStatus}`);
        const poRes = await fetch(`${API}/purchase-orders/${selectedPO.id}/status`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: newStatus }),
        });
        if (!poRes.ok) {
          const errData = await poRes.json().catch(() => ({}));
          console.error('PO status update failed:', errData);
          toast.warning('Inward recorded but PO status could not be updated.');
        }
      }
      toast.success(isDraft ? 'Saved as draft!' : `Inward completed! ${validRows.length} item(s) received.`);
      // Reset
      setStep(1); setSelectedPO(null); setMaterialRows([]);
      setGrnDate(today); setVehicleNumber(''); setWarehouse('');
      setInvoiceNumber(''); setInvoiceDate(today); setNotes('');
    } catch (err) {
      console.error('Error recording inward:', err);
      toast.error('Failed to record inward. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <style>{`
        .mi-grn-ref { font-size: 13px; color: #6b7280; margin: 0 0 16px 0; }
        .mi-stepper { display: flex; align-items: center; gap: 0; margin-bottom: 24px; }
        .mi-step { display: flex; align-items: center; gap: 8px; padding: 8px 20px; border-radius: 6px; font-size: 14px; font-weight: 500; }
        .mi-step.active { background: #dbeafe; color: #1d4ed8; }
        .mi-step.inactive { color: #9ca3af; }
        .mi-step-num { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .mi-step.active .mi-step-num { background: #1d4ed8; color: white; }
        .mi-step.inactive .mi-step-num { background: #d1d5db; color: #6b7280; }
        .mi-step-arrow { color: #d1d5db; margin: 0 4px; }

        .mi-card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06); padding: 24px; margin-bottom: 20px; }
        .mi-card-title { font-size: 15px; font-weight: 600; color: #111827; margin: 0 0 20px 0; }

        .mi-label { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; display: block; }
        .mi-req { color: #ef4444; }
        .mi-input { width: 100%; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; color: #1e293b; background: white; outline: none; font-family: inherit; box-sizing: border-box; transition: border-color 0.2s; }
        .mi-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .mi-select { width: 100%; padding: 9px 32px 9px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; color: #1e293b; background: white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 10px center; background-size: 16px; appearance: none; -webkit-appearance: none; outline: none; cursor: pointer; box-sizing: border-box; }
        .mi-select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .mi-file-wrap { display: flex; align-items: center; gap: 12px; padding: 9px 14px; border: 1px solid #e2e8f0; border-radius: 6px; background: white; cursor: pointer; }
        .mi-file-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 5px; font-size: 12px; font-weight: 500; color: #374151; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: background 0.15s; }
        .mi-file-btn:hover { background: #e2e8f0; }
        .mi-file-name { font-size: 13px; color: #9ca3af; }
        .mi-file-hidden { display: none; }

        .mi-form-grid4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .mi-form-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .mi-form-grid1 { margin-bottom: 16px; }

        /* Materials table */
        .mi-mat-table-wrap { overflow-x: auto; }
        .mi-mat-table { width: 100%; border-collapse: collapse; min-width: 860px; }
        .mi-mat-table thead { background: #f8fafc; }
        .mi-mat-table th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .mi-mat-table td { padding: 10px 12px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .mi-mat-table tbody tr:last-child td { border-bottom: none; }
        .mi-item-code { font-size: 13px; font-weight: 600; color: #374151; }
        .mi-item-name { font-size: 11px; color: #9ca3af; margin-top: 2px; }
        .mi-col-orange { color: #f97316; font-weight: 600; }
        .mi-col-red { color: #ef4444; font-weight: 600; }
        .mi-col-green { color: #16a34a; font-weight: 600; }
        .mi-tbl-input { width: 72px; padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 5px; font-size: 13px; color: #374151; background: white; outline: none; font-family: inherit; text-align: center; }
        .mi-tbl-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
        .mi-tbl-input.wide { width: 90px; }
        .mi-totals-col { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #f1f5f9; }
        .mi-total-item { display: flex; align-items: center; justify-content: flex-end; gap: 12px; font-size: 13px; }
        .mi-total-label { color: #6b7280; min-width: 110px; text-align: right; }
        .mi-total-val { font-weight: 700; font-size: 13px; min-width: 24px; text-align: right; }

        /* Footer */
        .mi-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
        .mi-back-btn2 { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-weight: 500; color: #374151; cursor: pointer; transition: all 0.15s; }
        .mi-back-btn2:hover { background: #f8fafc; }
        .mi-draft-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-weight: 500; color: #374151; cursor: pointer; transition: all 0.15s; }
        .mi-draft-btn:hover { background: #f8fafc; }
        .mi-complete-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 20px; background: #2563eb; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; color: white; cursor: pointer; transition: background 0.15s; }
        .mi-complete-btn:hover { background: #1d4ed8; }
        .mi-complete-btn:disabled, .mi-draft-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Step 1 */
        .mi-mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; }
        .mi-mode-card { border: 2px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; cursor: pointer; transition: all 0.15s; background: white; }
        .mi-mode-card:hover { border-color: #93c5fd; background: #f8faff; }
        .mi-mode-card.selected { border-color: #3b82f6; background: #eff6ff; }
        .mi-mode-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
        .mi-mode-card-title { font-size: 14px; font-weight: 600; color: #111827; }
        .mi-mode-card-desc { font-size: 12px; color: #6b7280; }
        .mi-dot-orange { width: 12px; height: 12px; border-radius: 50%; background: #f97316; flex-shrink: 0; }
        .mi-dot-red { width: 12px; height: 12px; border-radius: 50%; background: #ef4444; flex-shrink: 0; }
        .mi-next-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 22px; background: #2563eb; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; color: white; cursor: pointer; transition: background 0.15s; float: right; }
        .mi-next-btn:hover { background: #1d4ed8; }

        @media (max-width: 800px) {
          .mi-form-grid4 { grid-template-columns: 1fr 1fr; }
          .mi-form-grid3 { grid-template-columns: 1fr 1fr; }
          .mi-mode-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <header className="main-header">
        <div className="main-title">
          <h1>Material Inward</h1>
          <p>Record materials received into the store</p>
        </div>
      </header>

      {/* GRN ref + Stepper */}
      <p className="mi-grn-ref">{grnNumber}</p>
      <div className="mi-stepper">
        <div className={`mi-step ${step === 1 ? 'active' : 'inactive'}`}>
          <span className="mi-step-num">1</span>
          Select PO
        </div>
        <svg className="mi-step-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
        <div className={`mi-step ${step === 2 ? 'active' : 'inactive'}`}>
          <span className="mi-step-num">2</span>
          Enter Details
        </div>
      </div>

      {/* ─── STEP 1 ─── */}
      {step === 1 && (
        <div className="mi-card">
          <p className="mi-card-title">Step 1: Select Source</p>

          <label className="mi-label">Inward Mode <span className="mi-req">*</span></label>
          <div className="mi-mode-grid">
            <div className={`mi-mode-card ${inwardMode === 'po' ? 'selected' : ''}`} onClick={() => setInwardMode('po')}>
              <div className="mi-mode-card-header">
                <span className="mi-dot-orange" />
                <span className="mi-mode-card-title">Purchase (PO Based)</span>
              </div>
              <p className="mi-mode-card-desc">Inward against an approved Purchase Order</p>
            </div>
            <div className={`mi-mode-card ${inwardMode === 'npir' ? 'selected' : ''}`} onClick={() => { setInwardMode('npir'); setSelectedPO(null); setMaterialRows([]); }}>
              <div className="mi-mode-card-header">
                <span className="mi-dot-red" />
                <span className="mi-mode-card-title">Non-PO Inward (NPIR Based)</span>
              </div>
              <p className="mi-mode-card-desc">Inward against an approved NPIR request</p>
            </div>
          </div>

          {inwardMode === 'po' && (
            <div style={{ marginBottom: 24 }}>
              <label className="mi-label">Select PO Number <span className="mi-req">*</span></label>
              <CustomDropdown
                value={selectedPOLabel}
                onChange={handlePOSelect}
                options={loadingPOs ? ['Loading POs…'] : poOptions}
                disabled={loadingPOs}
                forceDown={true}
              />
            </div>
          )}

          <button className="mi-next-btn" onClick={handleNext} disabled={loadingPODetails}>
            {loadingPODetails ? 'Loading PO…' : 'Continue'}
            {!loadingPODetails && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>}
          </button>
          <div style={{ clear: 'both' }} />
        </div>
      )}

      {/* ─── STEP 2 ─── */}
      {step === 2 && inwardMode === 'npir' && (
        <>
          {/* NPIR Request Details Form */}
          <div className="mi-card">
            <p className="mi-card-title">Request Details</p>

            {/* Row 1: Vendor + Material */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
              <div>
                <label className="mi-label">Vendor <span className="mi-req">*</span></label>
                <CustomDropdown
                  value={npirVendor ? (vendors.find(v => String(v.id) === String(npirVendor))?.name || 'Select vendor') : 'Select vendor'}
                  onChange={val => {
                    const v = vendors.find(v => (v.name + (v.code ? ` (${v.code})` : '')) === val);
                    setNpirVendor(v ? String(v.id) : '');
                  }}
                  options={['Select vendor', ...vendors.map(v => v.name + (v.code ? ` (${v.code})` : ''))]}
                  forceDown={true}
                />
                <input type="text" className="mi-input" style={{ marginTop: 8 }} placeholder="Or type vendor name manually" value={npirVendorManual} onChange={e => setNpirVendorManual(e.target.value)} />
              </div>
              <div>
                <label className="mi-label">Material <span className="mi-req">*</span></label>
                <CustomDropdown
                  value={npirMaterial ? (purchasableItems.find(i => String(i.id) === String(npirMaterial))?.name || 'Select material') : 'Select material'}
                  onChange={val => {
                    const item = purchasableItems.find(i => (i.name + (i.item_code || i.code ? ` (${i.item_code || i.code})` : '')) === val);
                    setNpirMaterial(item ? String(item.id) : '');
                  }}
                  options={['Select material', ...purchasableItems.map(i => i.name + (i.item_code || i.code ? ` (${i.item_code || i.code})` : ''))]}
                  forceDown={true}
                />
                <input type="text" className="mi-input" style={{ marginTop: 8 }} placeholder="Or type material name manually" value={npirMaterialManual} onChange={e => setNpirMaterialManual(e.target.value)} />
              </div>
            </div>

            {/* Row 2: Quantity + Unit + Estimated Rate */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 16 }}>
              <div>
                <label className="mi-label">Quantity <span className="mi-req">*</span></label>
                <input type="number" className="mi-input" value={npirQuantity} onChange={e => setNpirQuantity(e.target.value)} min="0" placeholder="0" />
              </div>
              <div>
                <label className="mi-label">Unit</label>
                <input type="text" className="mi-input" placeholder="Kg / Nos / etc." value={npirUnit} onChange={e => setNpirUnit(e.target.value)} />
              </div>
              <div>
                <label className="mi-label">Estimated Rate (₹)</label>
                <input type="number" className="mi-input" value={npirRate} onChange={e => setNpirRate(e.target.value)} min="0" step="0.01" placeholder="0" />
              </div>
            </div>

            {/* Row 3: Reason + Request Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
              <div>
                <label className="mi-label">Reason <span className="mi-req">*</span></label>
                <select className="mi-select" value={npirReason} onChange={e => setNpirReason(e.target.value)}>
                  <option value="">Select reason</option>
                  <option>Production Requirement</option>
                  <option>Stock Replenishment</option>
                  <option>Emergency Purchase</option>
                  <option>Sample / Testing</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="mi-label">Request Date</label>
                <input type="date" className="mi-input" value={npirRequestDate} onChange={e => setNpirRequestDate(e.target.value)} />
              </div>
            </div>

            {/* Row 4: Expected Approval Authority (full width) */}
            <div style={{ marginBottom: 16 }}>
              <label className="mi-label">Expected Approval Authority <span className="mi-req">*</span></label>
              <input type="text" className="mi-input" placeholder="Manager name / email" value={npirAuthority} onChange={e => setNpirAuthority(e.target.value)} />
            </div>

            {/* Attachment */}
            <div style={{ marginBottom: 16 }}>
              <label className="mi-label">Attachment (Invoice / Bill)</label>
              <div>
                <button
                  type="button"
                  className="mi-file-btn"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                  onClick={() => document.getElementById('npir-attach-file').click()}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  Upload File
                </button>
                <input id="npir-attach-file" type="file" className="mi-file-hidden" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => { const f = e.target.files[0]; if (f) setNpirFileName(f.name); }} />
                {npirFileName !== 'No file chosen' && <span style={{ marginLeft: 10, fontSize: 13, color: '#374151' }}>{npirFileName}</span>}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mi-label">Notes</label>
              <textarea
                className="mi-input"
                style={{ minHeight: 90, resize: 'vertical' }}
                placeholder="Additional notes..."
                value={npirNotes}
                onChange={e => setNpirNotes(e.target.value)}
              />
            </div>
          </div>

          {/* NPIR Footer */}
          <div className="mi-footer">
            <button className="mi-back-btn2" onClick={() => setStep(1)} disabled={submitting}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
              Back
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="mi-draft-btn" disabled={submitting}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                Save as Draft
              </button>
              <button className="mi-complete-btn" disabled={submitting}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                {submitting ? 'Submitting…' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </>
      )}

      {step === 2 && inwardMode === 'po' && (
        <>
          {/* Inward Details */}
          <div className="mi-card">
            <p className="mi-card-title">Step 2: Inward Details</p>

            <div className="mi-form-grid3" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="mi-label">GRN Date</label>
                <input type="date" className="mi-input" value={grnDate} onChange={e => setGrnDate(e.target.value)} />
              </div>
              <div>
                <label className="mi-label">Vehicle Number</label>
                <input type="text" className="mi-input" placeholder="MH12AB1234" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} />
              </div>
            </div>

            <div className="mi-form-grid3" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="mi-label">Invoice Number <span className="mi-req">*</span></label>
                <input type="text" className="mi-input" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
              </div>
              <div>
                <label className="mi-label">Invoice Date</label>
                <input type="date" className="mi-input" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>
            </div>

            <div className="mi-form-grid1">
              <label className="mi-label">Upload Invoice <span className="mi-req">*</span></label>
              <div className="mi-file-wrap" onClick={() => document.getElementById('mi-invoice-file').click()}>
                <span className="mi-file-btn">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  Choose file
                </span>
                <span className="mi-file-name" id="mi-file-label">No file chosen</span>
                <input id="mi-invoice-file" type="file" className="mi-file-hidden" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => { const f = e.target.files[0]; if (f) document.getElementById('mi-file-label').textContent = f.name; }} />
              </div>
            </div>
          </div>

          {/* Materials */}
          <div className="mi-card">
            <p className="mi-card-title">Materials</p>
            <div className="mi-mat-table-wrap">
              <table className="mi-mat-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 160 }}>Material</th>
                    <th>Ordered</th>
                    <th>Already In</th>
                    <th>Pending</th>
                    <th>Received <span style={{ color: '#ef4444' }}>*</span></th>
                    <th>Rejected</th>
                    <th>Accepted</th>
                  </tr>
                </thead>
                <tbody>
                  {materialRows.map(row => {
                    const accepted = getAccepted(row);
                    const pending = getPending(row);
                    return (
                      <tr key={row._id}>
                        <td>
                          <div className="mi-item-name">{row.itemName}</div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{row.ordered} {row.unit}</td>
                        <td><span className="mi-col-orange">{row.alreadyIn}</span></td>
                        <td><span className={pending > 0 ? 'mi-col-red' : ''}>{pending}</span></td>
                        <td>
                          <input
                            type="number"
                            className="mi-tbl-input"
                            value={row.received}
                            onChange={e => updateRow(row._id, 'received', e.target.value)}
                            min="0"
                            step="1"
                            placeholder="0"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="mi-tbl-input"
                            value={row.rejected}
                            onChange={e => updateRow(row._id, 'rejected', e.target.value)}
                            min="0"
                            step="1"
                            placeholder="0"
                          />
                        </td>
                        <td><span className="mi-col-green">{accepted}</span></td>
                      </tr>
                    );
                  })}
                  {materialRows.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '28px 0', color: '#9ca3af' }}>
                        No items — select a PO from Step 1
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals — vertical, right-aligned like the screenshot */}
            <div className="mi-totals-col">
              <div className="mi-total-item">
                <span className="mi-total-label">Total Received:</span>
                <span className="mi-total-val">{totalReceived}</span>
              </div>
              <div className="mi-total-item">
                <span className="mi-total-label">Total Rejected:</span>
                <span className="mi-total-val mi-col-red">{totalRejected}</span>
              </div>
              <div className="mi-total-item">
                <span className="mi-total-label">Total Accepted:</span>
                <span className="mi-total-val mi-col-green">{totalAccepted}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mi-card">
            <p className="mi-card-title" style={{ marginBottom: 10 }}>Notes</p>
            <textarea
              className="mi-input"
              style={{ minHeight: 80, resize: 'vertical' }}
              placeholder="Additional notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Footer */}
          <div className="mi-footer">
            <button className="mi-back-btn2" onClick={() => setStep(1)} disabled={submitting}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
              Back
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="mi-draft-btn" onClick={() => handleSubmit(true)} disabled={submitting}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                Save as Draft
              </button>
              <button className="mi-complete-btn" onClick={() => handleSubmit(false)} disabled={submitting}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                {submitting ? 'Saving…' : 'Complete Inward'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

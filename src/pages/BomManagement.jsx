import React, { useState, useEffect } from "react";
import { bomService, itemMasterService, finalProductsService, rawMaterialsService } from '../services';
import toast from '../utils/toast';

export default function BomManagement() {
  // Form state
  const [selectedProduct, setSelectedProduct] = useState("");
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [materials, setMaterials] = useState([{ id: Date.now(), material_id: "", quantity: 1 }]);

  // Data state
  const [finalProducts, setFinalProducts] = useState([]);
  const [bomProducts, setBomProducts] = useState([]); // Items with can_have_bom for dropdown
  const [rawMaterials, setRawMaterials] = useState([]);
  const [allItems, setAllItems] = useState([]); // All items from item_master for component dropdown
  const [boms, setBoms] = useState([]);

  // UI state
  const [filterMode, setFilterMode] = useState('active'); // 'active', 'all', 'obsolete'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedBom, setSelectedBom] = useState(null);
  const [bomDetails, setBomDetails] = useState(null);
  const [showObsoleteModal, setShowObsoleteModal] = useState(false);
  const [selectedBomToObsolete, setSelectedBomToObsolete] = useState(null);
  const [obsoleteReason, setObsoleteReason] = useState('');
  const [obsoleting, setObsoleting] = useState(false);

  // BOM Details modal — expandable sub-BOM state
  const [expandedComponents, setExpandedComponents] = useState({}); // key: item_master_id -> { items, loading }


  // Searchable dropdown state (Parent Item)
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const dropdownRef = React.useRef(null);
  const searchInputRef = React.useRef(null);

  // Component item dropdown state (per-row)
  const [componentDropdownOpen, setComponentDropdownOpen] = useState(null); // stores material row id or null
  const [componentSearch, setComponentSearch] = useState('');
  const [componentHighlightedIdx, setComponentHighlightedIdx] = useState(-1);
  const componentDropdownRef = React.useRef(null);
  const componentSearchRef = React.useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProductDropdownOpen(false);
      }
      if (componentDropdownRef.current && !componentDropdownRef.current.contains(e.target)) {
        setComponentDropdownOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered products for dropdown
  const filteredDropdownProducts = bomProducts.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleDropdownKeyDown = (e) => {
    if (!productDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setProductDropdownOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx(prev => Math.min(prev + 1, filteredDropdownProducts.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIdx >= 0 && filteredDropdownProducts[highlightedIdx]) {
        setSelectedProduct(String(filteredDropdownProducts[highlightedIdx].id));
        setProductSearch('');
        setProductDropdownOpen(false);
      }
    } else if (e.key === 'Escape') {
      setProductDropdownOpen(false);
      setProductSearch('');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Match BOM list height to form height
  useEffect(() => {
    const matchHeights = () => {
      setTimeout(() => {
        const formBox = document.querySelector('.bom-card:first-child');
        const listBox = document.querySelector('.bom-card:last-child');
        if (formBox && listBox) {
          const formHeight = formBox.offsetHeight;
          listBox.style.maxHeight = `${formHeight}px`;
        }
      }, 100);
    };

    // Match heights on load and when data changes
    matchHeights();

    // Also match on window resize
    window.addEventListener('resize', matchHeights);
    return () => window.removeEventListener('resize', matchHeights);
  }, [boms, materials, selectedProduct, version]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [products, mats, bomsData] = await Promise.all([
        finalProductsService.getAll(),
        rawMaterialsService.getAll(),
        bomService.getAll()
      ]);
      const fetchedProducts = Array.isArray(products) ? products : [];
      setFinalProducts(fetchedProducts);
      setRawMaterials(mats);
      setBoms(bomsData);

      // Fetch all items for component dropdown
      let fetchedAllItems = [];
      try {
        const items = await itemMasterService.getAll();
        fetchedAllItems = Array.isArray(items) ? items : [];
        setAllItems(fetchedAllItems);
      } catch (err) {
        console.error('Error fetching all items:', err);
        setAllItems([]);
      }

      // Build BOM products list - ONLY items with can_have_bom = true (from backend)
      let bomProds = [];
      try {
        const apiProds = await itemMasterService.getBomProducts();
        if (Array.isArray(apiProds)) bomProds = apiProds;
      } catch (err) {
        console.error('Error fetching BOM products:', err);
      }

      // Do NOT merge in all items — only items explicitly marked can_have_bom should appear
      const bomProdsWithBomFlag = bomProds.map(item => ({
        ...item,
        has_existing_bom: bomsData.some(bom => bom.product_id === item.id && bom.is_active)
      }));
      setBomProducts(bomProdsWithBomFlag);


    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedProduct || !version || materials.some(m => !m.material_id || m.quantity <= 0)) {
      toast.warning('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const bomData = {
        product_id: selectedProduct,
        bom_name: `BOM for ${bomProducts.find(p => p.id == selectedProduct)?.name || 'Unknown'}`,
        version: version,
        items: materials.map(m => {
          // Look up in allItems (item_master) — covers all item types
          const itemMasterEntry = allItems.find(im => im.id == m.material_id);
          // Check if this item also exists in raw_materials table
          const rawMat = rawMaterials.find(rm => rm.id == m.material_id);
          return {
            // Only send material_id if item is a raw material (avoids FK violation on old server)
            ...(rawMat ? { material_id: m.material_id } : {}),
            item_master_id: m.material_id,  // new server uses this after deploy
            quantity: m.quantity,
            unit: itemMasterEntry?.unit || rawMat?.unit || 'units'
          };
        })
      };

      await bomService.create(bomData);
      toast.success('BOM created successfully!');

      // Reset form
      setSelectedProduct("");
      setVersion("");
      setNotes("");
      setMaterials([{ id: Date.now(), material_id: "", quantity: 1 }]);

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error creating BOM:', error);
      toast.error('Failed to create BOM. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const addMaterial = () => {
    setMaterials((prev) => [...prev, { id: Date.now(), material_id: "", quantity: 1 }]);
  };

  const updateMaterial = (id, field, value) => {
    setMaterials(materials.map(m =>
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const removeMaterial = (id) => {
    if (materials.length > 1) {
      setMaterials(materials.filter(m => m.id !== id));
    }
  };

  const handleViewBom = async (bomId) => {
    try {
      const details = await bomService.getById(bomId);
      setBomDetails(details);
      setSelectedBom(boms.find(b => b.id === bomId));
      setViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching BOM details:', error);
      toast.error('Failed to load BOM details');
    }
  };

  const handleCloseViewModal = () => {
    setViewModalOpen(false);
    setSelectedBom(null);
    setBomDetails(null);
    setExpandedComponents({});
  };

  const handleToggleStatus = async (bomId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    // Show warning if deactivating
    if (currentStatus) {
      toast.warning(`This will deactivate the BOM. Proceed?`, { duration: 3000 });
    }

    try {
      const bom = boms.find(b => b.id === bomId);
      if (!bom) return;

      await bomService.update(bomId, {
        bom_name: bom.bom_name,
        version: bom.version,
        is_active: !currentStatus
      });
      toast.success(`BOM ${action}d successfully!`);
      fetchData();
    } catch (error) {
      console.error(`Error ${action}ing BOM:`, error);
      toast.error(`Failed to ${action} BOM`);
    }
  };

  const handleObsoleteClick = (bom) => {
    setSelectedBomToObsolete(bom);
    setShowObsoleteModal(true);
  };

  const handleObsoleteConfirm = async () => {
    if (!selectedBomToObsolete || obsoleting) return;

    try {
      setObsoleting(true);
      await bomService.obsolete(selectedBomToObsolete.id, obsoleteReason);
      toast.success('BOM marked as obsolete successfully!');
      setShowObsoleteModal(false);
      setSelectedBomToObsolete(null);
      setObsoleteReason('');
      await fetchData();
    } catch (error) {
      console.error('Error obsoleting BOM:', error);
      toast.error(error.response?.data?.error || 'Failed to obsolete BOM');
    } finally {
      setObsoleting(false);
    }
  };

  const handleCancelObsolete = () => {
    setShowObsoleteModal(false);
    setSelectedBomToObsolete(null);
    setObsoleteReason('');
  };

  // Calculate total manufacturing cost based on selected materials
  const calculateTotalCost = () => {
    let total = 0;
    materials.forEach(m => {
      if (m.material_id && m.quantity > 0) {
        const material = rawMaterials.find(rm => rm.id == m.material_id);
        if (material && material.unit_price) {
          total += material.unit_price * m.quantity;
        }
      }
    });
    return total;
  };

  // Helper function to check if BOM is obsolete
  const isObsolete = (bom) => {
    return !bom.is_active && bom.obsolete_reason;
  };

  // Filter BOMs based on filterMode and search query
  const filteredBoms = (() => {
    let filtered = boms;

    // Apply status filter
    if (filterMode === 'active') {
      filtered = filtered.filter(b => b.is_active);
    } else if (filterMode === 'obsolete') {
      filtered = filtered.filter(b => isObsolete(b));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.product_name?.toLowerCase().includes(query) ||
        b.bom_name?.toLowerCase().includes(query) ||
        b.version?.toLowerCase().includes(query)
      );
    }

    return filtered;
  })();

  return (
    <>
      <style>{`
        .bom-management-page {
          max-width: 100%;
        }

        .bom-info-banner {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          display: flex;
          gap: 12px;
        }

        .bom-info-icon {
          width: 20px;
          height: 20px;
          color: #2563eb;
          flex-shrink: 0;
        }

        .bom-info-text {
          font-size: 13px;
          color: #1e40af;
          line-height: 1.6;
        }

        .bom-info-text strong {
          font-weight: 600;
        }

        .bom-management-layout {
          display: grid;
          grid-template-columns: 500px 1fr;
          gap: 24px;
          align-items: start;
        }

        .bom-management-layout > .bom-card:last-child {
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .bom-management-layout > .bom-card:last-child::-webkit-scrollbar {
          display: none;
        }

        .bom-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .bom-card-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .bom-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 600;
          color: #000;
          margin: 0;
        }

        .bom-card-icon {
          width: 20px;
          height: 20px;
          color: #2563eb;
        }

        .bom-card-body {
          padding: 24px;
        }

        .bom-form-field {
          margin-bottom: 20px;
        }

        .bom-form-field label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #000;
          margin-bottom: 8px;
        }

        .bom-form-input,
        .bom-form-select,
        .bom-form-textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          color: #6b7280;
          background: white;
          transition: all 0.2s;
          outline: none;
          font-family: inherit;
        }

        .bom-form-select {
          cursor: pointer;
        }

        .bom-form-input:focus,
        .bom-form-select:focus,
        .bom-form-textarea:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .bom-form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .bom-materials-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .bom-materials-header label {
          font-size: 14px;
          font-weight: 600;
          color: #000;
          margin: 0;
        }

        .bom-add-material-btn {
          padding: 6px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .bom-add-material-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .bom-material-row {
          display: grid;
          grid-template-columns: 1fr 120px;
          gap: 12px;
          margin-bottom: 12px;
        }

        .bom-material-row-label {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 8px;
          white-space: nowrap;
        }

        .bom-cost-section {
          background: #eff6ff;
          border: 2px solid #bfdbfe;
          border-radius: 8px;
          padding: 20px;
          margin: 24px 0;
        }

        .bom-cost-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .bom-cost-icon {
          width: 18px;
          height: 18px;
          color: #2563eb;
        }

        .bom-cost-title {
          font-size: 16px;
          font-weight: 700;
          color: #000;
          margin: 0;
        }

        .bom-cost-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .bom-cost-subtitle {
          font-size: 12px;
          color: #6b7280;
        }

        .bom-cost-amount {
          font-size: 28px;
          font-weight: 700;
          color: #2563eb;
        }

        .bom-submit-btn {
          width: 100%;
          padding: 12px 24px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .bom-submit-btn:hover {
          background: #1d4ed8;
        }

        .bom-table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .bom-table-title {
          font-size: 18px;
          font-weight: 600;
          color: #000;
          margin: 0;
        }

        .bom-filter-buttons {
          display: flex;
          gap: 8px;
        }

        .bom-filter-btn {
          padding: 8px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .bom-filter-btn.active {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .bom-filter-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .bom-filter-btn.active:hover {
          background: #1d4ed8;
          border-color: #1d4ed8;
        }

        .bom-table-wrapper {
          flex: 1;
          max-height: 100%;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .bom-table-wrapper::-webkit-scrollbar {
          display: none;
        }

        .bom-table {
          width: 100%;
          border-collapse: collapse;
        }

        .bom-table thead {
          background: #f9fafb;
        }

        .bom-table th {
          padding: 14px 16px;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          border-bottom: 1px solid #e5e7eb;
        }

        .bom-table td {
          padding: 16px;
          font-size: 14px;
          color: #000;
          border-bottom: 1px solid #f3f4f6;
        }

        .bom-table tbody tr:hover {
          background: #f9fafb;
        }

        .bom-table tbody tr:last-child td {
          border-bottom: none;
        }

        .bom-status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          background: #dcfce7;
          color: #166534;
        }

        .bom-cost-value {
          font-weight: 700;
          color: #2563eb;
        }

        .bom-table-actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: stretch;
        }

        .bom-action-btn {
          padding: 8px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          color: #2563eb;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .bom-action-btn:hover {
          background: #eff6ff;
          border-color: #3b82f6;
        }

        .bom-action-btn.deactivate {
          color: #dc2626;
          border-color: #fecaca;
          background: #dc2626;
          color: white;
        }

        .bom-action-btn.deactivate:hover {
          background: #b91c1c;
          border-color: #b91c1c;
        }

        .bom-action-icon {
          width: 14px;
          height: 14px;
        }

        @media (max-width: 1200px) {
          .bom-management-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="main-header">
        <div className="main-title">
          <h1>BOM Management</h1>
          <p>Create and manage Bills of Materials with cost tracking</p>
        </div>
      </header>

      <div className="bom-management-page">


        <div className="bom-management-layout">
          {/* Create New BOM Form */}
          <div className="bom-card">
            <div className="bom-card-header">
              <h3 className="bom-card-title">
                <svg className="bom-card-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Create New BOM
              </h3>
            </div>
            <div className="bom-card-body">
              <form onSubmit={handleSubmit}>
                <div className="bom-form-field">
                  <label>Parent Item *</label>
                  <div ref={dropdownRef} style={{ position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        ref={searchInputRef}
                        type="text"
                        className="bom-form-select"
                        placeholder={productDropdownOpen ? "Type to filter..." : "Select product"}
                        value={productDropdownOpen ? productSearch : (bomProducts.find(p => p.id == selectedProduct)?.name || '')}
                        onChange={(e) => { setProductSearch(e.target.value); setHighlightedIdx(0); if (!productDropdownOpen) setProductDropdownOpen(true); }}
                        onFocus={() => { setProductDropdownOpen(true); setProductSearch(''); }}
                        onKeyDown={handleDropdownKeyDown}
                        style={{ width: '100%', paddingRight: '36px', cursor: 'text', minHeight: '38px', boxSizing: 'border-box' }}
                        autoComplete="off"
                      />
                      <svg
                        onClick={() => { setProductDropdownOpen(!productDropdownOpen); if (!productDropdownOpen) { searchInputRef.current?.focus(); setProductSearch(''); } }}
                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2"
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: `translateY(-50%) rotate(${productDropdownOpen ? 180 : 0}deg)`, width: '14px', height: '14px', cursor: 'pointer', transition: 'transform 0.2s' }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                    {productDropdownOpen && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                        background: 'white', border: '1px solid #d1d5db', borderRadius: '0 0 8px 8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginTop: '-1px', overflow: 'hidden'
                      }}>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {filteredDropdownProducts.length === 0 ? (
                            <div style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '13px', textAlign: 'center' }}>
                              No items found
                            </div>
                          ) : (
                            filteredDropdownProducts.map((product, idx) => (
                              <div
                                key={product.id}
                                onClick={() => {
                                  setSelectedProduct(String(product.id));
                                  setProductSearch('');
                                  setProductDropdownOpen(false);
                                  searchInputRef.current?.blur();
                                }}
                                style={{
                                  padding: '10px 16px', cursor: 'pointer', fontSize: '13px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  background: idx === highlightedIdx ? '#eff6ff' : 'white',
                                  color: '#111827', transition: 'background 0.1s',
                                  borderBottom: idx < filteredDropdownProducts.length - 1 ? '1px solid #f3f4f6' : 'none',
                                }}
                                onMouseEnter={() => setHighlightedIdx(idx)}
                              >
                                <span>{product.name}{product.code ? ` (${product.code})` : ''}</span>
                                {product.id == selectedProduct && (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth="2.5" style={{ width: '16px', height: '16px' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    <input type="hidden" required value={selectedProduct} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#000', marginBottom: '8px' }}>Item Type</label>
                    <input
                      type="text"
                      className="bom-form-input"
                      value={selectedProduct ? (bomProducts.find(p => p.id == selectedProduct)?.make_type === 'semi_assembly' ? 'SUB ASSEMBLY' : bomProducts.find(p => p.id == selectedProduct)?.make_type === 'final' ? 'FINISHED PRODUCT' : bomProducts.find(p => p.id == selectedProduct)?.item_type === 'buy' ? 'RAW MATERIAL' : 'ITEM') : ''}
                      disabled
                      style={{ background: '#f9fafb', color: '#9ca3af' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#000', marginBottom: '8px' }}>Base Qty</label>
                    <input
                      type="text"
                      className="bom-form-input"
                      value="1"
                      disabled
                      style={{ background: '#f9fafb', color: '#9ca3af' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#000', marginBottom: '8px' }}>UOM</label>
                    <input
                      type="text"
                      className="bom-form-input"
                      value="Nos"
                      disabled
                      style={{ background: '#f9fafb', color: '#9ca3af' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#000', marginBottom: '8px' }}>Version</label>
                    <input
                      type="text"
                      className="bom-form-input"
                      placeholder="v2"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '20px',
                  background: '#fafafa'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#000', margin: 0 }}>Components (Direct only)</label>
                    <button type="button" className="bom-add-material-btn" onClick={addMaterial}>
                      + Add Component
                    </button>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '42% 14% 18% 26%',
                    gap: '8px',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #e5e7eb',
                    marginBottom: '12px'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Component Item</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Qty / 1</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>UOM</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Has BOM</div>
                  </div>

                  {materials.map((material, index) => {
                    const selectedMaterial = allItems.find(m => m.id == material.material_id);
                    // Check if a BOM actually exists for this material
                    const hasBom = boms.some(bom => bom.product_id == material.material_id && bom.is_active) ? 'YES' : 'NO';
                    return (
                      <div key={material.id} style={{ display: 'grid', gridTemplateColumns: '42% 14% 18% 26%', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                        {(() => {
                          const isOpen = componentDropdownOpen === material.id;
                          const filteredMats = allItems.filter(m => m.name?.toLowerCase().includes(componentSearch.toLowerCase()));
                          const selectedMat = allItems.find(m => m.id == material.material_id);

                          const handleCompKeyDown = (e) => {
                            if (!isOpen) {
                              if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); setComponentDropdownOpen(material.id); setComponentSearch(''); }
                              return;
                            }
                            if (e.key === 'ArrowDown') { e.preventDefault(); setComponentHighlightedIdx(prev => Math.min(prev + 1, filteredMats.length - 1)); }
                            else if (e.key === 'ArrowUp') { e.preventDefault(); setComponentHighlightedIdx(prev => Math.max(prev - 1, 0)); }
                            else if (e.key === 'Enter') { e.preventDefault(); if (componentHighlightedIdx >= 0 && filteredMats[componentHighlightedIdx]) { updateMaterial(material.id, 'material_id', String(filteredMats[componentHighlightedIdx].id)); setComponentSearch(''); setComponentDropdownOpen(null); } }
                            else if (e.key === 'Escape') { setComponentDropdownOpen(null); setComponentSearch(''); }
                          };

                          return (
                            <div ref={isOpen ? componentDropdownRef : null} style={{ position: 'relative' }}>
                              <div style={{ position: 'relative' }}>
                                <input
                                  ref={isOpen ? componentSearchRef : null}
                                  type="text"
                                  className="bom-form-select"
                                  placeholder={isOpen ? "Type to filter..." : "Select material"}
                                  value={isOpen ? componentSearch : (selectedMat?.name || '')}
                                  onChange={(e) => { setComponentSearch(e.target.value); setComponentHighlightedIdx(0); if (!isOpen) setComponentDropdownOpen(material.id); }}
                                  onFocus={() => { setComponentDropdownOpen(material.id); setComponentSearch(''); }}
                                  onKeyDown={handleCompKeyDown}
                                  style={{ width: '100%', paddingRight: '30px', cursor: 'text', minHeight: '36px', boxSizing: 'border-box', fontSize: '13px' }}
                                  autoComplete="off"
                                />
                                <svg
                                  onClick={() => { if (isOpen) { setComponentDropdownOpen(null); } else { setComponentDropdownOpen(material.id); setComponentSearch(''); } }}
                                  xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2"
                                  style={{ position: 'absolute', right: '8px', top: '50%', transform: `translateY(-50%) rotate(${isOpen ? 180 : 0}deg)`, width: '12px', height: '12px', cursor: 'pointer', transition: 'transform 0.2s' }}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                              </div>
                              {isOpen && (
                                <div style={{
                                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                                  background: 'white', border: '1px solid #d1d5db', borderRadius: '0 0 8px 8px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginTop: '-1px', overflow: 'hidden'
                                }}>
                                  <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                    {filteredMats.length === 0 ? (
                                      <div style={{ padding: '10px 14px', color: '#9ca3af', fontSize: '12px', textAlign: 'center' }}>No items found</div>
                                    ) : (
                                      filteredMats.map((mat, idx) => (
                                        <div
                                          key={mat.id}
                                          onClick={() => {
                                            updateMaterial(material.id, 'material_id', String(mat.id));
                                            setComponentSearch('');
                                            setComponentDropdownOpen(null);
                                          }}
                                          style={{
                                            padding: '8px 14px', cursor: 'pointer', fontSize: '13px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            background: idx === componentHighlightedIdx ? '#eff6ff' : 'white',
                                            color: '#111827', transition: 'background 0.1s',
                                            borderBottom: idx < filteredMats.length - 1 ? '1px solid #f3f4f6' : 'none',
                                          }}
                                          onMouseEnter={() => setComponentHighlightedIdx(idx)}
                                        >
                                          <span>{mat.name}</span>
                                          {mat.id == material.material_id && (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth="2.5" style={{ width: '14px', height: '14px' }}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <input
                          type="number"
                          className="bom-form-input"
                          min="1"
                          step="0.01"
                          value={material.quantity}
                          onChange={(e) => updateMaterial(material.id, 'quantity', parseFloat(e.target.value) || 0)}
                          required
                        />
                        <select className="bom-form-select" value={selectedMaterial?.unit || 'Nos'} disabled style={{ background: '#f9fafb', color: '#9ca3af' }}>
                          <option>{selectedMaterial?.unit || 'Nos'}</option>
                        </select>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            background: hasBom === 'YES' ? '#dcfce7' : '#fee2e2',
                            color: hasBom === 'YES' ? '#166534' : '#991b1b'
                          }}>{hasBom}</span>
                          {materials.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMaterial(material.id)}
                              style={{
                                width: '28px',
                                height: '28px',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#dc2626',
                                padding: 0
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bom-form-field">
                  <label>Notes (Optional)</label>
                  <textarea
                    className="bom-form-textarea"
                    placeholder="Additional notes about this BOM"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="bom-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Creating BOM...' : 'Create BOM'}
                </button>
              </form>
            </div>
          </div>

          {/* Existing BOMs Table */}
          <div className="bom-card">
            <div className="bom-card-header">
              <div className="bom-table-header">
                <h3 className="bom-table-title">Existing BOMs</h3>
                <div className="bom-filter-buttons">
                  <button
                    className={`bom-filter-btn ${filterMode === 'active' ? 'active' : ''}`}
                    onClick={() => setFilterMode('active')}
                  >
                    Active Only
                  </button>
                  <button
                    className={`bom-filter-btn ${filterMode === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterMode('all')}
                  >
                    All
                  </button>
                  <button
                    className={`bom-filter-btn ${filterMode === 'obsolete' ? 'active' : ''}`}
                    onClick={() => setFilterMode('obsolete')}
                  >
                    Obsolete
                  </button>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px 0 24px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2" style={{ position: 'absolute', left: '12px', width: '16px', height: '16px', pointerEvents: 'none' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by product name or version..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 36px 9px 36px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#374151',
                    background: '#f9fafb',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f9fafb'; }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute', right: '10px', background: 'none', border: 'none',
                      cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: '#9ca3af'
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="bom-table-wrapper">
              <table className="bom-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                        Loading BOMs...
                      </td>
                    </tr>
                  ) : filteredBoms.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                        No BOMs found. Create your first BOM using the form.
                      </td>
                    </tr>
                  ) : (
                    filteredBoms.map((bom) => (
                      <tr key={bom.id}>
                        <td><strong>{bom.product_name || finalProducts.find(p => p.id === bom.product_id)?.name || 'Unknown Product'}</strong></td>
                        <td>{bom.version}</td>
                        <td>
                          <span className="bom-status-badge">
                            {bom.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td>
                          <div className="bom-table-actions">
                            <button className="bom-action-btn" onClick={() => handleViewBom(bom.id)}>
                              <svg className="bom-action-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              View
                            </button>
                            {!isObsolete(bom) && (
                              <>
                                <button
                                  className={`bom-action-btn ${bom.is_active ? 'deactivate' : ''}`}
                                  onClick={() => handleToggleStatus(bom.id, bom.is_active)}
                                  style={!bom.is_active ? { background: '#1e3a8a', color: 'white', borderColor: '#1e3a8a' } : {}}
                                >
                                  {bom.is_active ? (
                                    'Deactivate'
                                  ) : (
                                    <>
                                      <svg className="bom-action-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Activate
                                    </>
                                  )}
                                </button>
                                {bom.is_active && (
                                  <button
                                    className="bom-action-btn"
                                    onClick={() => handleObsoleteClick(bom)}
                                    style={{ background: '#6b7280', color: 'white', borderColor: '#6b7280' }}
                                  >
                                    <svg className="bom-action-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                    Obsolete
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* View BOM Modal */}
      {viewModalOpen && bomDetails && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleCloseViewModal}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '700px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#000' }}>
                  BOM Details
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                  {bomDetails.product_name}
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* BOM Info */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Product</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#000' }}>{bomDetails.product_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Version</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#000' }}>{bomDetails.version}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Status</div>
                  <div>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: bomDetails.is_active ? '#dcfce7' : '#fee2e2',
                      color: bomDetails.is_active ? '#166534' : '#991b1b',
                    }}>
                      {bomDetails.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

              </div>

              {/* Materials Table */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#000', marginBottom: '12px' }}>
                  Raw Materials Required
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>Material Name</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>Quantity</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bomDetails.items && bomDetails.items.length > 0 ? (
                      bomDetails.items.map((item, index) => {
                        const lookupId = item.item_master_id || item.material_id;
                        const resolvedName = item.material_name ||
                          (lookupId ? allItems.find(i => i.id == lookupId)?.name : null) ||
                          (lookupId ? `Item #${lookupId}` : '—');
                        // Check if this component has its own active BOM
                        const componentBom = boms.find(b => b.product_id == lookupId && b.is_active);
                        const expanded = expandedComponents[lookupId];
                        const isExpanded = expanded?.open;
                        const subItems = expanded?.items;
                        const subLoading = expanded?.loading;

                        const handleToggleExpand = async () => {
                          if (!componentBom) return;
                          if (isExpanded) {
                            // Collapse
                            setExpandedComponents(prev => ({ ...prev, [lookupId]: { ...prev[lookupId], open: false } }));
                            return;
                          }
                          // Expand — fetch if not already loaded
                          if (subItems) {
                            setExpandedComponents(prev => ({ ...prev, [lookupId]: { ...prev[lookupId], open: true } }));
                            return;
                          }
                          setExpandedComponents(prev => ({ ...prev, [lookupId]: { open: true, loading: true, items: null } }));
                          try {
                            const details = await bomService.getById(componentBom.id);
                            setExpandedComponents(prev => ({ ...prev, [lookupId]: { open: true, loading: false, items: details.items || [] } }));
                          } catch {
                            setExpandedComponents(prev => ({ ...prev, [lookupId]: { open: true, loading: false, items: [] } }));
                          }
                        };

                        return (
                          <React.Fragment key={index}>
                            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '12px', fontSize: '14px', color: '#000' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {componentBom ? (
                                    <button
                                      onClick={handleToggleExpand}
                                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2"
                                        style={{ width: '13px', height: '13px', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                      </svg>
                                    </button>
                                  ) : (
                                    <span style={{ width: '13px', flexShrink: 0 }} />
                                  )}
                                  <span>{resolvedName}</span>
                                </div>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#000', fontWeight: '500' }}>
                                {parseFloat(item.quantity).toFixed(2)}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#6b7280' }}>{item.unit}</td>
                            </tr>
                            {isExpanded && (
                              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td colSpan="3" style={{ padding: '0 12px 8px 30px' }}>
                                  {subLoading ? (
                                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>Loading...</div>
                                  ) : subItems && subItems.length > 0 ? (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                      <tbody>
                                        {subItems.map((sub, si) => {
                                          const subLookupId = sub.item_master_id || sub.material_id;
                                          const subName = sub.material_name ||
                                            (subLookupId ? allItems.find(i => i.id == subLookupId)?.name : null) ||
                                            (subLookupId ? `Item #${subLookupId}` : '—');
                                          return (
                                            <tr key={si}>
                                              <td style={{ padding: '4px 0', fontSize: '13px', color: '#6b7280' }}>{subName}</td>
                                              <td style={{ padding: '4px 0', textAlign: 'right', fontSize: '13px', color: '#6b7280' }}>{parseFloat(sub.quantity).toFixed(2)}</td>
                                              <td style={{ padding: '4px 0', textAlign: 'right', fontSize: '13px', color: '#9ca3af' }}>{sub.unit}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  ) : (
                                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>No sub-components</div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                          No materials found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={handleCloseViewModal}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Obsolete Confirmation Modal */}
      {showObsoleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCancelObsolete}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Confirm Obsolete BOM</h2>
              <button
                onClick={handleCancelObsolete}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Are you sure you want to mark this BOM as obsolete? This BOM will no longer be available for use, but will remain viewable for reference.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Obsolete (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                rows="4"
                placeholder="Provide a reason for marking as obsolete..."
                value={obsoleteReason}
                onChange={(e) => setObsoleteReason(e.target.value)}
              ></textarea>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelObsolete}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleObsoleteConfirm}
                disabled={obsoleting}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {obsoleting ? 'Processing...' : 'Confirm Obsolete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>

  );
}



import React, { useState, useEffect, useRef } from 'react';
import toast from '../utils/toast';
import { rawMaterialsService, finalProductsService, transactionsService, itemMasterService } from '../services';
import { animateModalOpen, animateModalClose } from '../utils/modalAnimations';
import api from '../services/api';

export default function Inventory() {
  const modalRef = useRef(null);
  const overlayRef = useRef(null);
  const [activeTab, setActiveTab] = useState('raw_materials');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [finalProducts, setFinalProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [priceStats, setPriceStats] = useState(null);
  const [costLayers, setCostLayers] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [fifoExpanded, setFifoExpanded] = useState(false);
  const [consumableItems, setConsumableItems] = useState([]);

  useEffect(() => {
    fetchInventoryData();
  }, []);

  useEffect(() => {
    if (showHistoryModal && selectedMaterial) {
      fetchTransactionHistory();
    }
  }, [showHistoryModal, selectedMaterial]);

  // Animate modal when it opens
  useEffect(() => {
    if (showHistoryModal && modalRef.current && overlayRef.current) {
      animateModalOpen(modalRef.current, overlayRef.current);
    }
  }, [showHistoryModal]);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);

      // Fetch ALL items from Item Master (single source of truth)
      const items = await itemMasterService.getAll();
      const allItems = Array.isArray(items) ? items : [];

      // DEBUG: Log all items to see their structure
      console.log('📦 All Items from Item Master:', allItems);
      console.log('📊 Total items count:', allItems.length);

      // Categorize items based on item_type and make_type
      // Raw Materials: item_type = "buy" AND make_type is null AND category != "Consumable"
      const rawMats = allItems.filter(item =>
        item.is_active !== false &&
        item.item_type === 'buy' &&
        !item.make_type &&
        item.category?.toLowerCase() !== 'consumable'
      );
      console.log('🔨 Raw Materials:', rawMats.length, rawMats);
      setRawMaterials(rawMats);

      // Final Products AND Semi-Assembly: make_type = "final" OR "semi_assembly"
      // Both are stored in finalProducts state, UI filters them separately
      const finalProds = allItems.filter(item =>
        item.is_active !== false &&
        (item.make_type === 'final' || item.make_type === 'semi_assembly')
      );
      console.log('✅ Final Products + Semi-Assembly:', finalProds.length, finalProds);
      console.log('  - Final:', finalProds.filter(i => i.make_type === 'final').length);
      console.log('  - Semi-Assembly:', finalProds.filter(i => i.make_type === 'semi_assembly').length);
      setFinalProducts(finalProds);

      // Consumables: category = "Consumable" OR (item_type="buy" AND category contains "consumable")
      const consumables = allItems.filter(item =>
        item.is_active !== false && (
          item.category === 'Consumable' ||
          (item.item_type === 'buy' && item.category && item.category.toLowerCase() === 'consumable')
        )
      );
      console.log('🏷️ Consumables:', consumables.length, consumables);
      setConsumableItems(consumables);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.warning('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionHistory = async () => {
    try {
      setHistoryLoading(true);

      // Determine item type based on active tab
      let itemType = 'raw_material'; // default
      if (activeTab === 'final_products') {
        itemType = 'final_product';
      } else if (activeTab === 'semi_assembly') {
        itemType = 'semi_assembly';
      } else if (activeTab === 'consumable') {
        itemType = 'raw_material'; // Consumables are treated like raw materials in transactions
      } else if (activeTab === 'raw_materials' || activeTab === 'reserved_materials') {
        itemType = 'raw_material';
      }

      // Only show reservation history if explicitly viewing "Reserved Materials" tab
      const isReservedView = activeTab === 'reserved_materials';

      if (isReservedView) {
        // Fetch reservation history instead of regular transactions
        try {
          const reservationsResponse = await api.get(`/reservations/material/${selectedMaterial.id}`);
          const reservations = reservationsResponse.reservations || [];

          // Transform reservations to transaction format
          const reservationTransactions = reservations.map(res => {
            // Build multi-line breakdown for quantity and price
            const quantityBreakdown = res.cost_breakdown.map(layer =>
              `${parseFloat(layer.quantity).toFixed(2)} ${res.unit}`
            ).join('\n');
            const priceBreakdown = res.cost_breakdown.map(layer =>
              `₹${parseFloat(layer.cost_per_unit).toFixed(2)}`
            ).join('\n');

            return {
              date: formatDate(res.reservation_date),
              time: formatTime(res.reservation_date),
              type: 'Material Reservation',
              quantity: quantityBreakdown,
              price: priceBreakdown,
              reference: res.completion_number,
              details: `Reserved for ${res.product_name} production`,
              recordedBy: 'System',
              status: res.status === 'pending' ? 'Pending' : 'In Progress',
              statusVariant: 'warning',
              rawData: {
                created_at: res.reservation_date
              }
            };
          });

          setTransactionHistory(reservationTransactions);
        } catch (error) {
          console.error('Error fetching reservations:', error);
          setTransactionHistory([]);
        }
      } else {
        // Regular transaction history (existing logic)
        const response = await transactionsService.getAll({
          item_id: selectedMaterial.id,
          item_type: itemType
        });

        // Map transactions to include rawData property
        let allTransactions = (response.transactions || []).map(txn => ({
          ...txn,
          rawData: txn.rawData || txn  // Ensure rawData exists
        }));

        // Fetch price statistics for all tabs (except reserved materials)
        if (activeTab !== 'reserved_materials') {
          try {
            // Fetch price statistics
            const stats = await api.get(`/cost-layers/material/${selectedMaterial.id}/stats`);
            setPriceStats(stats);

            // Fetch available cost layers (batches)
            const layersResponse = await api.get(`/cost-layers/material/${selectedMaterial.id}`);
            setCostLayers(layersResponse.layers || []);

            // Fetch consumption history from material_consumption_details
            const consumptionResponse = await api.get(`/cost-layers/material/${selectedMaterial.id}/consumption-history`);
            const consumptionEntries = consumptionResponse.history || [];

            // Group consumption entries by production/issue ID
            const groupedConsumption = {};
            consumptionEntries.forEach(entry => {
              const key = entry.production_completion_id || entry.material_issue_id;
              if (!groupedConsumption[key]) {
                groupedConsumption[key] = {
                  type: entry.consumption_type,
                  reference: entry.reference_number,
                  date: entry.consumption_date,
                  layers: []
                };
              }
              groupedConsumption[key].layers.push({
                quantity: entry.quantity_consumed,
                cost: entry.cost_per_unit,
                unit: entry.unit
              });
            });

            // Convert grouped entries to transaction format with multi-line breakdown
            const consumptionTransactions = Object.values(groupedConsumption).map(group => {
              const totalQty = group.layers.reduce((sum, l) => sum + parseFloat(l.quantity), 0);
              const quantityBreakdown = group.layers.map(l =>
                `-${parseFloat(l.quantity).toFixed(2)} ${l.unit}`
              ).join('\n');
              const priceBreakdown = group.layers.map(l =>
                `₹${parseFloat(l.cost).toFixed(2)}`
              ).join('\n');

              return {
                date: formatDate(group.date),
                time: formatTime(group.date),
                type: group.type,
                quantity: quantityBreakdown, // Multi-line: "-10 units\n-3 units"
                price: priceBreakdown, // Multi-line: "₹120.00\n₹180.00"
                reference: group.reference,
                details: `Used for ${group.type.toLowerCase()}`,
                recordedBy: 'System',
                status: 'completed',
                statusVariant: 'danger',  // Red for consumption
                rawData: {
                  transaction_type: group.type.toLowerCase().replace(' ', '_'),
                  quantity: -totalQty,
                  created_at: group.date
                }
              };
            });

            // Merge inward and consumption transactions
            allTransactions = [...allTransactions, ...consumptionTransactions];

            // ALSO fetch and include reservation transactions
            try {
              const reservationsResponse = await api.get(`/reservations/material/${selectedMaterial.id}`);
              const reservations = reservationsResponse.reservations || [];

              // Transform reservations to transaction format
              const reservationTransactions = reservations.map(res => {
                console.log('Reservation data:', res); // Debug log

                // Calculate total reserved quantity
                const totalQty = res.cost_breakdown.reduce((sum, layer) => sum + parseFloat(layer.quantity), 0);

                // Build multi-line breakdown for quantity and price
                const quantityBreakdown = res.cost_breakdown.map(layer =>
                  `-${parseFloat(layer.quantity).toFixed(2)} ${res.unit}`
                ).join('\n');
                const priceBreakdown = res.cost_breakdown.map(layer =>
                  `₹${parseFloat(layer.cost_per_unit || 0).toFixed(2)}`
                ).join('\n');

                // Get status label and variant based on production status
                // The reservation status reflects the production status
                let statusLabel = 'pending';
                let statusVariant = 'danger';

                if (res.status === 'completed') {
                  statusLabel = 'completed';
                  statusVariant = 'success';
                } else {
                  // pending or in_progress - both should show as "pending"
                  statusLabel = 'pending';
                  statusVariant = 'danger';
                }

                return {
                  date: formatDate(res.reservation_date),
                  time: formatTime(res.reservation_date),
                  type: 'Material Reservation',
                  quantity: quantityBreakdown,
                  price: priceBreakdown,
                  reference: res.completion_number || res.production_id || '-',
                  details: `Reserved for ${res.product_name}`,
                  recordedBy: 'System',
                  status: statusLabel,
                  statusVariant: statusVariant,
                  rawData: {
                    transaction_date: res.reservation_date,
                    created_at: res.reservation_date,
                    transaction_type: 'material_reservation',
                    quantity: -totalQty,
                    unit: res.unit,
                    notes: `Reserved for ${res.product_name} production`
                  }
                };
              });

              // Merge reservation transactions
              allTransactions = [...allTransactions, ...reservationTransactions];
            } catch (error) {
              console.error('Error fetching reservations for history:', error);
              // Continue without reservations if fetch fails
            }

            // Sort by date descending
            allTransactions.sort((a, b) => {
              const dateA = new Date(a.rawData?.created_at || a.rawData?.transaction_date || 0);
              const dateB = new Date(b.rawData?.created_at || b.rawData?.transaction_date || 0);
              return dateB - dateA;
            });

          } catch (error) {
            console.error('Error fetching price stats or consumption:', error);
            setPriceStats(null);
            setCostLayers([]);
          }
        }

        setTransactionHistory(allTransactions);
      }
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      setTransactionHistory([]);
      setPriceStats(null);
      setCostLayers([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Transform API data to match UI format
  const inventoryRows = activeTab === 'raw_materials'
    ? rawMaterials.map(item => ({
      id: item.id,
      name: item.name,
      code: item.code || '-',
      stock: item.current_stock,
      unit: item.unit,
      minLevel: item.minimum_stock,
      status: Number(item.current_stock) < Number(item.minimum_stock) ? 'low' : 'ok'
    }))
    : activeTab === 'reserved_materials'
      ? rawMaterials
        .filter(item => (item.reserved_stock || 0) > 0)
        .map(item => ({
          id: item.id,
          name: item.name,
          code: item.code || '-',
          stock: item.current_stock,
          reservedStock: item.reserved_stock || 0,
          unit: item.unit,
          minLevel: item.minimum_stock,
          status: Number(item.current_stock) < Number(item.minimum_stock) ? 'low' : 'ok'
        }))
      : activeTab === 'semi_assembly'
        ? finalProducts
          // Semi-assembly items: make_type = 'semi_assembly'
          .filter(item => item.make_type === 'semi_assembly')
          .map(item => ({
            id: item.id,
            name: item.name,
            code: item.code || '-',
            stock: item.current_stock,
            unit: item.unit,
            minLevel: item.minimum_stock,
            status: Number(item.current_stock) < Number(item.minimum_stock) ? 'low' : 'ok'
          }))
        : activeTab === 'consumable'
          ? consumableItems.map(item => ({
            id: item.id,
            name: item.name,
            code: item.code || '-',
            stock: item.current_stock,
            unit: item.unit,
            minLevel: item.minimum_stock,
            status: Number(item.current_stock) < Number(item.minimum_stock) ? 'low' : 'ok'
          }))
          : finalProducts
            // Final products: make_type = 'final'
            .filter(item => item.make_type === 'final')
            .map(item => ({
              id: item.id,
              name: item.name,
              code: item.code || '-',
              stock: item.current_stock,
              unit: item.unit,
              minLevel: item.minimum_stock,
              status: Number(item.current_stock) < Number(item.minimum_stock) ? 'low' : 'ok'
            }));


  const filteredInventoryRows = inventoryRows.filter(row =>
    row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleHistoryClick = (material) => {
    setSelectedMaterial(material);
    setShowHistoryModal(true);
    setExpandedRows(new Set()); // Reset expanded rows when opening modal
  };


  // Mock history data for now (can be replaced with API call later)
  const mockHistoryData = {
    "PVC FILLS": {
      lastPurchasePrice: "₹169.98",
      lastPurchaseDate: "Nov 19, 2025",
      minPrice: "₹160.00",
      maxPrice: "₹180.00",
      transactions: []
    }
  };

  // Format transaction data for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const getTransactionTypeLabel = (type) => {
    const labels = {
      'material_inward': 'Inward Purchase',
      'material_issue': 'Issue to Production',
      'production_completion': 'Production Completed',
      'dispatch': 'Dispatch to Customer',
      'inventory_correction': 'Inventory Adjustment',
      'inventory_reconciliation': 'Reconciliation'
    };
    return labels[type] || type;
  };

  // Format price from stats or transaction data
  const formatPrice = (value) => {
    if (!value || value === 0) return 'N/A';
    return `₹${parseFloat(value).toFixed(2)}`;
  };

  // Provide history data with real transactions and price stats
  const historyData = selectedMaterial ? {
    lastPurchasePrice: priceStats ? formatPrice(priceStats.last_purchased_price) : "No purchase data",
    lastPurchaseDate: priceStats && priceStats.last_purchase_date
      ? new Date(priceStats.last_purchase_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : "No purchase data",
    minPrice: priceStats ? formatPrice(priceStats.min_cost) : "No data",
    maxPrice: priceStats ? formatPrice(priceStats.max_cost) : "No data",
    transactions: Array.isArray(transactionHistory) ? transactionHistory.map(txn => {
      // If transaction already has ALL formatted fields, return as-is
      // This includes consumption entries AND reservation transactions
      if (txn.date && txn.time && txn.type && txn.quantity && txn.price && txn.reference && txn.status) {
        // This is a pre-formatted entry (consumption, reservation, etc) - return as-is
        return txn;
      }

      // Otherwise, format from raw transaction data
      const raw = txn.rawData || txn;

      // Parse notes to check for FIFO breakdown
      let parsedNotes = null;
      let fifoBreakdown = null;
      try {
        if (raw.notes && typeof raw.notes === 'string' && raw.notes.startsWith('{')) {
          parsedNotes = JSON.parse(raw.notes);
          fifoBreakdown = parsedNotes.fifo_breakdown;
        }
      } catch (e) {
        // Not JSON, treat as plain text
      }

      // Determine price and quantity display
      let price = "₹0.00";
      let formattedQuantity;
      const quantity = parseFloat(raw.quantity);
      const isIncrease = quantity > 0;
      const isDecrease = quantity < 0;

      if (fifoBreakdown && Array.isArray(fifoBreakdown) && fifoBreakdown.length > 0) {
        // Has FIFO breakdown - show multi-line breakdown
        const quantityBreakdown = fifoBreakdown.map(layer =>
          `${isDecrease ? '-' : '+'}${parseFloat(layer.quantity).toFixed(2)} ${raw.unit || 'units'}`
        ).join('\n');
        const priceBreakdown = fifoBreakdown.map(layer =>
          `₹${parseFloat(layer.cost).toFixed(2)}`
        ).join('\n');

        formattedQuantity = quantityBreakdown;
        price = priceBreakdown;
      } else {
        // No FIFO breakdown - show single line
        if (raw.transaction_type === 'material_inward' && raw.inward_cost_per_unit) {
          price = `₹${parseFloat(raw.inward_cost_per_unit).toFixed(2)}`;
        } else if (raw.unit_price) {
          price = `₹${parseFloat(raw.unit_price).toFixed(2)}`;
        }

        if (isIncrease) {
          formattedQuantity = `+${quantity.toFixed(2)} ${raw.unit || 'units'}`;
        } else {
          formattedQuantity = `${quantity.toFixed(2)} ${raw.unit || 'units'}`;
        }
      }

      const variant = isIncrease ? "success" : (isDecrease ? "danger" : "muted");

      // Only show actual user-entered remarks (stored as JSON {remarks: "..."}).
      // Plain-text notes like "FAN BLADES - 11.00 Nos" or "Material inward" are auto-generated — suppress them.
      const displayNotes = parsedNotes?.remarks || '—';

      return {
        date: txn.date || formatDate(raw.created_at || raw.transaction_date),
        time: txn.time || formatTime(raw.created_at || raw.transaction_date),
        type: txn.type || getTransactionTypeLabel(raw.transaction_type),
        quantity: formattedQuantity,
        price: price,
        reference: raw.transaction_id,
        details: displayNotes,
        recordedBy: raw.created_by_name || txn.createdBy || "System",
        status: txn.status?.label || "completed",
        statusVariant: variant
      };
    }) : []
  } : null;

  return (
    <>
      <style>{`
        .history-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
        }

        .history-modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 1100px;
          max-height: 85vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .history-modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .history-modal-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 600;
          color: #000;
          margin: 0;
        }

        .history-modal-icon {
          width: 20px;
          height: 20px;
          color: #000;
        }

        .history-modal-close {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .history-modal-close:hover {
          background: #f3f4f6;
        }

        .history-modal-close svg {
          width: 18px;
          height: 18px;
          color: #6b7280;
        }

        .history-modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .history-price-section {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .history-price-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .history-price-icon {
          width: 18px;
          height: 18px;
          color: #2563eb;
        }

        .history-price-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e40af;
          margin: 0;
        }

        .history-price-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
        }

        .history-price-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .history-price-label {
          font-size: 13px;
          color: #6b7280;
        }

        .history-price-value {
          font-size: 20px;
          font-weight: 700;
          color: #2563eb;
        }

        .history-price-date {
          font-size: 11px;
          color: #9ca3af;
        }

        .history-price-note {
          font-size: 11px;
          color: #6b7280;
          margin-top: 12px;
        }

        .history-table-wrapper {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .history-table {
          width: 100%;
          border-collapse: collapse;
        }

        .history-table thead {
          background: #f9fafb;
        }

        .history-table th {
          padding: 12px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          border-bottom: 1px solid #e5e7eb;
        }

        .history-table td {
          padding: 14px 16px;
          font-size: 13px;
          color: #000;
          border-bottom: 1px solid #f3f4f6;
        }

        .history-table tbody tr:hover {
          background: #f9fafb;
        }

        .history-table tbody tr:last-child td {
          border-bottom: none;
        }

        .history-date-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .history-time {
          font-size: 11px;
          color: #9ca3af;
        }

        .history-quantity-negative {
          color: #dc2626;
          font-weight: 600;
        }

        .history-quantity-positive {
          color: #16a34a;
          font-weight: 600;
        }

        .history-status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          text-transform: lowercase;
        }

        .history-status-badge.success {
          background: #dcfce7;
          color: #166534;
        }

        .history-status-badge.danger {
          background: #fee2e2;
          color: #991b1b;
        }

        .history-status-badge.muted {
          background: #f3f4f6;
          color: #6b7280;
        }

        .history-table td {
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          word-wrap: break-word;
        }
      `}</style>

      <header className="main-header has-actions flex items-center justify-between">
        <div className="main-title">
          <h1>Inventory Overview</h1>
          <p>Current stock levels for all materials and products</p>
        </div>
      </header>

      <section className="section inventory-section">
        <div>
          <div className="font-semibold leading-none tracking-tight flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-warehouse w-6 h-6" style={{ color: 'var(--primary)' }}>
                <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"></path>
                <path d="M6 18h12"></path>
                <path d="M6 14h12"></path>
                <rect width="12" height="12" x="6" y="10"></rect>
              </svg>
              Current Stock
            </div>
            <div className="relative ml-auto mt-[-7px]">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
              <input type="text" className="flex rounded-md border border-input bg-transparent px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm w-full pl-10 h-10 shadow-sm focus-visible:ring-black" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '400px', height: '46px', marginTop: '-5px' }} />
            </div>
          </div>
          <hr className="inventory-divider" />
        </div>

        <div className="inventory-tabs" style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('raw_materials')}
            style={{
              flex: 1,
              padding: '8px 16px',
              height: '40px',
              border: activeTab === 'raw_materials' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
              borderRadius: '8px',
              background: activeTab === 'raw_materials' ? '#eff6ff' : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: activeTab === 'raw_materials' ? '#2563eb' : '#6b7280'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'raw_materials') {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.background = '#eff6ff';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'raw_materials') {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.background = 'white';
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
            Raw Materials
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reserved_materials')}
            style={{
              flex: 1,
              padding: '8px 16px',
              height: '40px',
              border: activeTab === 'reserved_materials' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
              borderRadius: '8px',
              background: activeTab === 'reserved_materials' ? '#eff6ff' : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: activeTab === 'reserved_materials' ? '#2563eb' : '#6b7280'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'reserved_materials') {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.background = '#eff6ff';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'reserved_materials') {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.background = 'white';
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            Reserved Materials
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('semi_assembly')}
            style={{
              flex: 1,
              padding: '8px 16px',
              height: '40px',
              border: activeTab === 'semi_assembly' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
              borderRadius: '8px',
              background: activeTab === 'semi_assembly' ? '#eff6ff' : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: activeTab === 'semi_assembly' ? '#2563eb' : '#6b7280'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'semi_assembly') {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.background = '#eff6ff';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'semi_assembly') {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.background = 'white';
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            Sub Assembly
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('final_products')}
            style={{
              flex: 1,
              padding: '8px 16px',
              height: '40px',
              border: activeTab === 'final_products' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
              borderRadius: '8px',
              background: activeTab === 'final_products' ? '#eff6ff' : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: activeTab === 'final_products' ? '#2563eb' : '#6b7280'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'final_products') {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.background = '#eff6ff';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'final_products') {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.background = 'white';
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Finished Product
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('consumable')}
            style={{
              flex: 1,
              padding: '8px 16px',
              height: '40px',
              border: activeTab === 'consumable' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
              borderRadius: '8px',
              background: activeTab === 'consumable' ? '#eff6ff' : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: activeTab === 'consumable' ? '#2563eb' : '#6b7280'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'consumable') {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.background = '#eff6ff';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'consumable') {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.background = 'white';
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path d="M6 6h.008v.008H6V6z" />
            </svg>
            Consumable
          </button>
        </div>

        <div className="inventory-table-card">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                {activeTab === 'reserved_materials' ? (
                  <>
                    <th>Current Stock</th>
                    <th>Reserved Stock</th>
                  </>
                ) : (
                  <th>Stock</th>
                )}
                <th>Unit</th>
                <th>Min Level</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventoryRows.length === 0 ? (
                <tr>
                  <td className="p-2 align-middle text-gray-500 py-10" colSpan="7" style={{ textAlign: 'center' }}>
                    {activeTab === 'raw_materials'
                      ? 'No raw materials found.'
                      : activeTab === 'reserved_materials'
                        ? 'No reserved materials found.'
                        : activeTab === 'semi_assembly'
                          ? 'No semi-assembly items found.'
                          : activeTab === 'consumable'
                            ? 'No consumable items found.'
                            : 'No final products found.'}
                  </td>
                </tr>
              ) : (
                filteredInventoryRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.code}</td>
                    {activeTab === 'reserved_materials' ? (
                      <>
                        <td className={row.status === "low" ? "stock-low" : "stock-ok"}>{row.stock}</td>
                        <td style={{ fontWeight: '600', color: '#f59e0b' }}>{row.reservedStock}</td>
                      </>
                    ) : (
                      <td className={row.status === "low" ? "stock-low" : "stock-ok"}>{row.stock}</td>
                    )}
                    <td>{row.unit}</td>
                    <td>{row.minLevel}</td>
                    <td>
                      {row.status === "low" ? (
                        <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-destructive text-destructive-foreground hover:brightness-90 shadow-sm" style={{ backgroundColor: 'hsl(0deg 84.31% 60%)', color: 'white' }}>Low Stock</div>
                      ) : (
                        <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-green-100 text-green-800 hover:brightness-90 shadow-sm">OK</div>
                      )}
                    </td>
                    <td>
                      <button
                        className="flex items-center gap-2 h-8 rounded-md border border-input bg-background px-3 text-xs shadow-sm transition-colors hover:bg-gray-200 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                        onClick={() => handleHistoryClick(row)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-history w-4 h-4">
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                          <path d="M3 3v5h5"></path>
                          <path d="M12 7v5l4 2"></path>
                        </svg>
                        <span>{activeTab === 'reserved_materials' ? 'Details' : 'History'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* History Modal */}
      {showHistoryModal && selectedMaterial && historyData && (
        <div className="history-modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="history-modal-header">
              <h3 className="history-modal-title">
                <svg className="history-modal-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2" />
                </svg>
                Stock Movement History: {selectedMaterial.name}
              </h3>
              <button className="history-modal-close" onClick={() => setShowHistoryModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="history-modal-body">
              {/* Price Information - Only for Raw Materials and Final Products */}
              {activeTab !== 'reserved_materials' && (
                <div className="history-price-section">
                  <div className="history-price-header">
                    <svg className="history-price-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="history-price-title">Price Information</h4>
                  </div>
                  <div className="history-price-grid">
                    <div className="history-price-item">
                      <span className="history-price-label">Last Purchase Price:</span>
                      <span className="history-price-value">{historyData.lastPurchasePrice}</span>
                      <span className="history-price-date">on {historyData.lastPurchaseDate}</span>
                    </div>
                    <div className="history-price-item">
                      <span className="history-price-label">Minimum Price:</span>
                      <span className="history-price-value">{historyData.minPrice}</span>
                    </div>
                    <div className="history-price-item">
                      <span className="history-price-label">Maximum Price:</span>
                      <span className="history-price-value" style={{ color: '#dc2626' }}>{historyData.maxPrice}</span>
                    </div>
                  </div>
                  <p className="history-price-note">* Based on all inward transaction records</p>
                </div>
              )}

              {/* Stock Batches (Cost Layers) - Show for all item types except reserved */}
              {activeTab !== 'reserved_materials' && costLayers.length > 0 && (
                <div className="history-price-section" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', padding: 0, overflow: 'hidden' }}>
                  {/* Collapsible Header */}
                  <button
                    onClick={() => setFifoExpanded(prev => !prev)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 20px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px', color: '#16a34a', flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: '#166534' }}>Available Stock Batches (FIFO Order)</span>
                      <span style={{ fontSize: '12px', background: '#bbf7d0', color: '#166534', borderRadius: '9999px', padding: '1px 8px', fontWeight: '600' }}>{costLayers.length}</span>
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                      style={{ width: '18px', height: '18px', color: '#16a34a', transition: 'transform 0.2s', transform: fifoExpanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Collapsible Content */}
                  {fifoExpanded && (
                    <div style={{ padding: '0 20px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                        {costLayers.map((layer, index) => (
                          <div
                            key={layer.layer_id}
                            style={{
                              background: 'white',
                              border: '1px solid #bbf7d0',
                              borderRadius: '6px',
                              padding: '12px 16px',
                              display: 'grid',
                              gridTemplateColumns: '50px 1fr auto auto auto',
                              gap: '16px',
                              alignItems: 'center'
                            }}
                          >
                            {/* FIFO Order Badge */}
                            <div style={{
                              background: index === 0 ? '#16a34a' : '#e5e7eb',
                              color: index === 0 ? 'white' : '#6b7280',
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '700',
                              fontSize: '14px'
                            }}>
                              #{index + 1}
                            </div>

                            {/* Purchase Info */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                Inward: {layer.inward_number ? layer.inward_number : (layer.inward_id ? `#${layer.inward_id}` : 'N/A')}
                              </div>
                              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                {new Date(layer.purchased_date).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </div>
                            </div>

                            {/* Quantity */}
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Quantity</div>
                              <div style={{ fontSize: '16px', fontWeight: '700', color: '#16a34a' }}>
                                {parseFloat(layer.quantity_remaining).toFixed(2)} {selectedMaterial.unit}
                              </div>
                            </div>

                            {/* Price Per Unit */}
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Price/Unit</div>
                              <div style={{ fontSize: '16px', fontWeight: '700', color: '#2563eb' }}>
                                ₹{parseFloat(layer.cost_per_unit).toFixed(2)}
                              </div>
                            </div>

                            {/* Total Value */}
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Total Value</div>
                              <div style={{ fontSize: '16px', fontWeight: '700', color: '#000' }}>
                                ₹{parseFloat(layer.total_value).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="history-price-note" style={{ color: '#166534', marginTop: '16px' }}>
                        💡 When stock is reduced, the oldest batch (#1) is used first (FIFO method)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Transaction History Table */}
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Transaction Type</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Reference</th>
                      <th>Details</th>
                      <th>Recorded By</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLoading ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                          Loading transaction history...
                        </td>
                      </tr>
                    ) : historyData.transactions.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                          No transactions found for this item.
                        </td>
                      </tr>
                    ) : (
                      historyData.transactions.map((transaction, index) => (
                        <tr key={index}>
                          <td>
                            <div className="history-date-cell">
                              <span>{transaction.date}</span>
                              <span className="history-time">{transaction.time}</span>
                            </div>
                          </td>
                          <td>{transaction.type}</td>
                          <td
                            style={{
                              whiteSpace: 'pre-line',
                              color: transaction.statusVariant === 'success' ? '#10b981' :
                                transaction.statusVariant === 'danger' ? '#ef4444' : '#6b7280',
                              fontWeight: '500'
                            }}
                          >
                            {transaction.quantity}
                          </td>
                          <td style={{ whiteSpace: 'pre-line' }}><strong>{transaction.price}</strong></td>
                          <td>{transaction.reference}</td>
                          <td
                            style={{
                              maxWidth: '200px',
                              overflow: expandedRows.has(index) ? 'visible' : 'hidden',
                              textOverflow: expandedRows.has(index) ? 'clip' : 'ellipsis',
                              whiteSpace: expandedRows.has(index) ? 'normal' : 'nowrap',
                              cursor: 'pointer',
                              color: '#2563eb'
                            }}
                            onClick={() => {
                              const newExpanded = new Set(expandedRows);
                              if (newExpanded.has(index)) {
                                newExpanded.delete(index);
                              } else {
                                newExpanded.add(index);
                              }
                              setExpandedRows(newExpanded);
                            }}
                            title={expandedRows.has(index) ? 'Click to collapse' : transaction.details}
                          >
                            {transaction.details}
                          </td>
                          <td>{transaction.recordedBy}</td>
                          <td>
                            <span className={`history-status-badge ${transaction.statusVariant}`}>
                              {transaction.status}
                            </span>
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
      )}
    </>
  );
}



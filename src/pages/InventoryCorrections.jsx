import React, { useState, useRef, useEffect } from "react";
import MyRequests from "./MyRequests";
import { rawMaterialsService, finalProductsService, inventoryService } from "../services";
import api from '../services/api';
import toast from '../utils/toast';

export default function InventoryCorrections() {
  const correctionRequestRef = useRef(null);
  const [correctionRequestHeight, setCorrectionRequestHeight] = useState(0);

  useEffect(() => {
    if (!correctionRequestRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setCorrectionRequestHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(correctionRequestRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <>
      <header className="main-header">
        <div className="main-title">
          <h1>Inventory Corrections</h1>
          <p className="text-gray-500">Request stock adjustments or transaction voids - all require admin approval</p>
        </div>
      </header>
      <div className="flex gap-8">
        <NewCorrectionRequest ref={correctionRequestRef} />
        <MyRequests correctionRequestHeight={correctionRequestHeight} />
      </div>
    </>
  );
}

const NewCorrectionRequest = React.forwardRef((props, ref) => {
  const [activeMode, setActiveMode] = useState("Stock Adjustment");
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    itemType: "raw_material",
    itemId: "",
    adjustmentType: "decrease",
    quantity: "",
    costPerUnit: "",
    reason: ""
  });

  // Transaction Void state
  const [voidFormData, setVoidFormData] = useState({
    transactionType: "material_inward",
    transactionId: ""
  });
  const [searchResults, setSearchResults] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [searching, setSearching] = useState(false);
  const [voidSubmitting, setVoidSubmitting] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, [formData.itemType]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const data = formData.itemType === 'final_product'
        ? await finalProductsService.getAll()
        : await rawMaterialsService.getAll();
      setMaterials(data);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Reset itemId when item type changes
    if (name === 'itemType') {
      setFormData(prev => ({ ...prev, itemId: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.itemId || !formData.quantity || !formData.reason) {
      toast.warning('Please fill all required fields');
      return;
    }

    // Cost is only required for increase operations
    if (formData.adjustmentType === 'increase' && !formData.costPerUnit) {
      toast.warning('Cost per unit is required for stock increases');
      return;
    }

    try {
      setSubmitting(true);

      // Get selected material details
      const selectedMaterial = materials.find(m => m.id === parseInt(formData.itemId));
      if (!selectedMaterial) {
        toast.error('Selected item not found');
        return;
      }

      // Create approval request data
      const approvalData = {
        request_type: 'inventory_correction',
        item_type: formData.itemType,
        item_id: parseInt(formData.itemId),
        item_name: selectedMaterial.name,
        quantity: parseFloat(formData.quantity),
        unit: selectedMaterial.unit,
        request_data: {
          adjustment_type: formData.adjustmentType,
          current_stock: selectedMaterial.current_stock,
          cost_per_unit: formData.adjustmentType === 'increase' ? parseFloat(formData.costPerUnit) : undefined,
          reason: formData.reason
        },
        notes: formData.reason
      };

      // Submit as approval request
      await api.post('/approvals', approvalData);

      toast.success('Correction request submitted successfully! Awaiting admin approval.');

      // Reset form
      setFormData({
        itemType: "raw_material",
        itemId: "",
        adjustmentType: "decrease",
        quantity: "",
        costPerUnit: "",
        reason: ""
      });
    } catch (error) {
      console.error('Error submitting correction:', error);
      toast.error('Failed to submit correction request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Transaction Void handlers
  const handleVoidFormChange = (e) => {
    const { name, value } = e.target;
    setVoidFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSearchTransaction = async (e) => {
    e.preventDefault();

    if (!voidFormData.transactionId.trim()) {
      toast.warning('Please enter a transaction ID');
      return;
    }

    try {
      setSearching(true);
      setSearchResults(null);
      setSelectedTransaction(null);
      setVoidReason("");

      // Fetch transaction by ID using api client with auth
      const transaction = await api.get(`/transactions/${voidFormData.transactionId}`);

      // Verify transaction type matches
      const typeMapping = {
        'material_inward': 'material_inward',
        'material_dispatch': 'dispatch',
        'material_issue': 'material_issue'
      };

      if (transaction.transaction_type !== typeMapping[voidFormData.transactionType]) {
        toast.error(`Transaction type mismatch. This is a ${transaction.transaction_type} transaction.`);
        return;
      }

      setSearchResults(transaction);
    } catch (error) {
      console.error('Error searching transaction:', error);
      toast.error('Failed to search transaction. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectTransaction = () => {
    setSelectedTransaction(searchResults);
  };

  const handleVoidSubmit = async (e) => {
    e.preventDefault();

    if (!voidReason.trim() || voidReason.trim().length < 20) {
      toast.warning('Please provide a detailed reason (minimum 20 characters)');
      return;
    }

    try {
      setVoidSubmitting(true);

      // Create approval request for void
      const approvalData = {
        request_type: 'transaction_void',
        transaction_id: selectedTransaction.transaction_id,
        transaction_type: selectedTransaction.transaction_type,
        request_data: {
          transaction_details: selectedTransaction,
          void_reason: voidReason
        },
        notes: voidReason
      };

      await api.post('/approvals', approvalData);

      toast.success('Void request submitted successfully! Awaiting admin approval.');

      // Reset form
      setVoidFormData({
        transactionType: "material_inward",
        transactionId: ""
      });
      setSearchResults(null);
      setSelectedTransaction(null);
      setVoidReason("");
    } catch (error) {
      console.error('Error submitting void request:', error);
      toast.error('Failed to submit void request. Please try again.');
    } finally {
      setVoidSubmitting(false);
    }
  };

  return (
    <section ref={ref} className="mt-8 bg-white p-6 rounded-lg shadow-lg w-2/3">
      <div className="font-semibold leading-none tracking-tight flex items-center gap-2 mb-4 text-lg">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-pen w-5 h-5" style={{ color: 'var(--primary)' }}><rect width="8" height="4" x="8" y="2" rx="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5.5"></path><path d="M4 13.5V6a2 2 0 0 1 2-2h2"></path><path d="M13.378 15.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"></path></svg>
        New Correction Request
      </div>
      <hr class="mb-4" />


      <div role="alert" className="relative w-full rounded-lg border-2 shadow-lg px-4 py-3 text-sm mb-8 mt-6" style={{ backgroundColor: 'rgb(255, 224, 178)', borderColor: 'var(--secondary)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucude-circle-alert h-5 w-5 absolute left-4 top-4" style={{ color: 'var(--secondary)' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg>
        <div className="ml-8 text-sm [&_p]:leading-relaxed" style={{ color: 'var(--secondary-dark)' }}>
          <strong>Admin Approval Required:</strong> All corrections require administrator approval.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <button
          type="button"
          onClick={() => setActiveMode("Stock Adjustment")}
          style={{
            flex: 1,
            padding: '8px 16px',
            height: '40px',
            border: activeMode === 'Stock Adjustment' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
            borderRadius: '8px',
            background: activeMode === 'Stock Adjustment' ? '#eff6ff' : 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: '500',
            color: activeMode === 'Stock Adjustment' ? '#2563eb' : '#6b7280'
          }}
          onMouseEnter={(e) => {
            if (activeMode !== 'Stock Adjustment') {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.background = '#eff6ff';
            }
          }}
          onMouseLeave={(e) => {
            if (activeMode !== 'Stock Adjustment') {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.background = 'white';
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="8" height="4" x="8" y="2" rx="1"></rect>
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5.5"></path>
            <path d="M4 13.5V6a2 2 0 0 1 2-2h2"></path>
            <path d="M13.378 15.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"></path>
          </svg>
          Stock Adjustment
        </button>
        <button
          type="button"
          onClick={() => setActiveMode("Transaction Void")}
          style={{
            flex: 1,
            padding: '8px 16px',
            height: '40px',
            border: activeMode === 'Transaction Void' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
            borderRadius: '8px',
            background: activeMode === 'Transaction Void' ? '#eff6ff' : 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: '500',
            color: activeMode === 'Transaction Void' ? '#2563eb' : '#6b7280'
          }}
          onMouseEnter={(e) => {
            if (activeMode !== 'Transaction Void') {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.background = '#eff6ff';
            }
          }}
          onMouseLeave={(e) => {
            if (activeMode !== 'Transaction Void') {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.background = 'white';
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            <line x1="10" x2="10" y1="11" y2="17"></line>
            <line x1="14" x2="14" y1="11" y2="17"></line>
          </svg>
          Transaction Void
        </button>
      </div>

      {activeMode === "Stock Adjustment" && (
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="mb-2">
            <label htmlFor="itemType" className="block text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2.5">Item Type *</label>
            <select name="itemType" value={formData.itemType} onChange={handleInputChange} className="dropdown-select" required>
              <option value="raw_material">Raw Material</option>
              <option value="final_product">Final Product</option>
            </select>
          </div>
          <div className="mb-2">
            <label htmlFor="selectItem" className="block text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2.5">Select Item *</label>
            <select name="itemId" value={formData.itemId} onChange={handleInputChange} className="dropdown-select" required disabled={loading}>
              <option value="">{loading ? 'Loading...' : 'Choose item...'}</option>
              {materials.map(material => (
                <option key={material.id} value={material.id}>
                  {material.name} (Current: {material.current_stock} {material.unit})
                </option>
              ))}
            </select>
          </div>
          <div className="mb-2">
            <label htmlFor="adjustmentType" className="block text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2.5">Adjustment Type *</label>
            <select name="adjustmentType" value={formData.adjustmentType} onChange={handleInputChange} className="dropdown-select" required>
              <option value="increase">Increase Stock</option>
              <option value="decrease">Decrease Stock</option>
            </select>
          </div>
          <div className="mb-2">
            <label htmlFor="quantity" className="block text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2.5">Quantity *</label>
            <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} placeholder="Enter quantity" className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm" min="0.01" step="0.01" required />
          </div>
          {/* Cost input - only for increase operations */}
          {formData.adjustmentType === 'increase' && (
            <div className="mb-2">
              <label htmlFor="costPerUnit" className="block text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2.5">Cost per Unit (₹) *</label>
              <input type="number" name="costPerUnit" value={formData.costPerUnit} onChange={handleInputChange} placeholder="Enter cost per unit" className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm" min="0.01" step="0.01" required />
              <p className="text-xs text-gray-500 mt-1">Specify the cost for new stock being added</p>
            </div>
          )}
          {/* Info for decrease operations */}
          {formData.adjustmentType === 'decrease' && formData.itemType === 'raw_material' && (
            <div className="mb-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <strong>ℹ️ FIFO Costing:</strong> Cost will be automatically calculated from oldest stock batches
              </div>
            </div>
          )}
          <div className="mb-2">
            <label htmlFor="reason" className="block text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2.5">Reason for Adjustment *</label>
            <textarea name="reason" value={formData.reason} onChange={handleInputChange} placeholder="e.g., Physical count discrepancy, damaged goods, expired materials, etc." className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-32 shadow-sm" rows="4" required></textarea>
          </div>
          <button type="submit" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-500 transition" disabled={submitting || loading}>{submitting ? 'Submitting...' : 'Submit for Approval'}</button>
        </form>
      )}

      {activeMode === "Transaction Void" && (
        <div className="transaction-void-section">
          <div role="alert" className="relative w-full rounded-lg px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7 bg-background text-foreground border-2" style={{ backgroundColor: 'rgb(255, 235, 238)', borderColor: 'var(--error)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-alert h-5 w-5" style={{ color: 'var(--error)' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg>
            <div className="text-sm [&_p]:leading-relaxed" style={{ color: 'var(--error)' }}>
              <strong>Important:</strong> Only transactions within the last 48 hours can be voided. Stock will be automatically reversed upon admin approval.
            </div>
          </div>

          <h3 className="text-lg font-bold mt-6 mb-4">Step 1: Find Transaction</h3>
          <form className="grid gap-4 mt-4" onSubmit={handleSearchTransaction}>
            <div className="mb-2">
              <label htmlFor="transactionType" className="block text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2.5">Transaction Type *</label>
              <select
                name="transactionType"
                value={voidFormData.transactionType}
                onChange={handleVoidFormChange}
                className="dropdown-select"
              >
                <option value="material_inward">Material Inward</option>
                <option value="material_dispatch">Material Dispatch</option>
                <option value="material_issue">Material Issue</option>
              </select>
            </div>
            <div className="mb-2">
              <label htmlFor="transactionId" className="block text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2.5">Transaction ID *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="transactionId"
                  value={voidFormData.transactionId}
                  onChange={handleVoidFormChange}
                  placeholder="e.g., IN-1234567890"
                  className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="flex items-center justify-center h-12 w-12 rounded-md border border-input bg-gray-50 hover:bg-gray-100 transition disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </form>

          {/* Search Results */}
          {searchResults && !selectedTransaction && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-3">Search Results:</h4>
              <div
                onClick={handleSelectTransaction}
                className="border-2 border-blue-500 bg-blue-50 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition"
              >
                <div className="font-semibold text-base mb-1">
                  {searchResults.item_name || searchResults.product_name || 'Unknown Item'}
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  Quantity: {Math.abs(parseFloat(searchResults.quantity) || 0)} {searchResults.unit || 'units'}
                  {searchResults.unit_price && (
                    <span className="ml-2">• Price: ₹{parseFloat(searchResults.unit_price).toFixed(2)}/{searchResults.unit || 'unit'}</span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  Date: {new Date(searchResults.created_at || searchResults.transaction_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date(searchResults.created_at || searchResults.transaction_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="text-sm text-gray-600">
                  By: {searchResults.created_by_name || 'System'}
                </div>
              </div>
            </div>
          )}


          {/* Step 2: Provide Void Reason */}
          {selectedTransaction && (
            <div className="mt-6">
              <h3 className="text-lg font-bold mb-4">Step 2: Provide Void Reason</h3>
              <form onSubmit={handleVoidSubmit}>
                <div className="mb-4">
                  <label htmlFor="voidReason" className="block text-sm font-semibold leading-none mb-2.5">Reason for Voiding This Transaction *</label>
                  <textarea
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="Provide detailed explanation: Why was this transaction entered incorrectly? What should have been entered instead? Be specific."
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-32 shadow-sm"
                    rows="4"
                    required
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 20 characters. Be specific about the error.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={voidSubmitting || voidReason.length < 20}
                  className="bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {voidSubmitting ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </section>
  );
});



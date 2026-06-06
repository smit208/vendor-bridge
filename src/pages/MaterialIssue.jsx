import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { rawMaterialsService, materialIssueService, finalProductsService, bomService, productionService } from '../services';
import api from '../services/api';
import CustomDropdown from '../components/CustomDropdown';
import toast from '../utils/toast';

export default function MaterialIssue() {
  const navigate = useNavigate();
  const [issueType, setIssueType] = useState("production");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productionQuantity, setProductionQuantity] = useState(1);
  const [materials, setMaterials] = useState([{ id: 1, material: "", quantity: 1 }]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [finalProducts, setFinalProducts] = useState([]);
  const [allBoms, setAllBoms] = useState([]);
  const [selectedBom, setSelectedBom] = useState(null);
  const [bomMaterials, setBomMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingProductions, setPendingProductions] = useState([]);
  const [selectedProductionOrder, setSelectedProductionOrder] = useState("");
  const [additionalMaterialRemarks, setAdditionalMaterialRemarks] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rawMats, finalProds, pendingProds, boms] = await Promise.all([
        rawMaterialsService.getAll(),
        finalProductsService.getAll(),
        productionService.getAll(),
        api.get('/bom?activeOnly=true')  // Only fetch active BOMs for Material Issue
      ]);
      setRawMaterials(rawMats);
      const activeBoms = boms.data || boms; // Handle API response format
      setAllBoms(activeBoms);

      // Filter final products to only show those with active BOMs  
      // No need to check is_active here since API already returns only active BOMs
      const productsWithActiveBoms = finalProds.filter(product =>
        activeBoms.some(bom => bom.product_id == product.id)
      );
      setFinalProducts(productsWithActiveBoms);

      // Filter for pending production orders only
      const pending = pendingProds.filter(p => p.status === 'pending');
      setPendingProductions(pending);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch BOM when product is selected
  const handleProductChange = async (productId) => {
    setSelectedProduct(productId);
    if (!productId) {
      setSelectedBom(null);
      setBomMaterials([]);
      return;
    }

    try {
      // Find active BOM for this product from already-loaded BOMs
      const productBom = allBoms.find(b => b.product_id == productId && b.is_active);

      if (productBom) {
        // Fetch BOM details with items
        const bomDetails = await bomService.getById(productBom.id);
        setSelectedBom(bomDetails);

        // Calculate material requirements
        const materialsWithStatus = bomDetails.items.map(item => {
          const rawMat = rawMaterials.find(rm => rm.id === item.material_id);
          const requiredQty = item.quantity * productionQuantity;
          const availableQty = rawMat?.current_stock || 0;

          return {
            name: item.material_name || rawMat?.name || 'Unknown',
            available: availableQty,
            required: requiredQty,
            unit: item.unit || rawMat?.unit || 'units',
            sufficient: availableQty >= requiredQty
          };
        });

        setBomMaterials(materialsWithStatus);
      } else {
        setSelectedBom(null);
        setBomMaterials([]);
        toast.warning('No active BOM found for this product');
      }
    } catch (error) {
      console.error('Error fetching BOM:', error);
      toast.error('Failed to load BOM for selected product');
    }
  };

  // Update material requirements when quantity changes
  useEffect(() => {
    if (selectedBom && selectedBom.items) {
      const materialsWithStatus = selectedBom.items.map(item => {
        const rawMat = rawMaterials.find(rm => rm.id === item.material_id);
        const requiredQty = item.quantity * productionQuantity;
        const availableQty = rawMat?.current_stock || 0;

        return {
          name: item.material_name || rawMat?.name || 'Unknown',
          available: availableQty,
          required: requiredQty,
          unit: item.unit || rawMat?.unit || 'units',
          sufficient: availableQty >= requiredQty
        };
      });

      setBomMaterials(materialsWithStatus);
    }
  }, [productionQuantity, selectedBom, rawMaterials]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!selectedProductionOrder) {
      toast.warning('Please select a production order');
      return;
    }

    if (materials.some(m => !m.material || m.quantity <= 0)) {
      toast.warning('Please fill all material fields with valid quantities');
      return;
    }

    if (!additionalMaterialRemarks.trim()) {
      toast.warning('Please provide a reason for additional materials');
      return;
    }

    try {
      setSubmitting(true);

      // Get production order details
      const selectedProduction = pendingProductions.find(p => p.id == selectedProductionOrder);
      if (!selectedProduction) {
        toast.error('Selected production order not found');
        return;
      }

      // Prepare materials data with names, units, and costs
      const materialsData = materials.map(mat => {
        const rawMat = rawMaterials.find(rm => rm.id == mat.material);
        return {
          material_id: parseInt(mat.material),
          material_name: rawMat?.name || 'Unknown',
          quantity: parseFloat(mat.quantity),
          unit: rawMat?.unit || 'units',
          cost_per_unit: rawMat?.unit_price || 0
        };
      });

      // Create approval request
      const approvalData = {
        request_type: 'additional_material_issue',
        production_order_id: parseInt(selectedProductionOrder),
        production_order_number: selectedProduction.completion_number,
        product_name: selectedProduction.product_name,
        request_data: {
          materials: materialsData,
          reason: additionalMaterialRemarks
        },
        notes: `Additional materials for production order ${selectedProduction.completion_number}: ${additionalMaterialRemarks}`
      };

      await api.post('/approvals', approvalData);

      toast.success('Additional material request submitted successfully! The request is pending admin approval. Check the Approval Requests page for status.');

      // Reset form
      setMaterials([{ id: 1, material: "", quantity: 1 }]);
      setSelectedProductionOrder("");
      setAdditionalMaterialRemarks("");
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const addMaterial = () => {
    setMaterials([...materials, { id: Date.now(), material: "", quantity: 1 }]);
  };

  const deleteMaterial = (id) => {
    if (materials.length > 1) {
      setMaterials(materials.filter(m => m.id !== id));
    }
  };

  const updateMaterial = (id, field, value) => {
    setMaterials(materials.map(m =>
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleReserveForProduction = async () => {
    if (!selectedProduct) {
      toast.warning('Please select a final product');
      return;
    }

    if (!selectedBom || bomMaterials.length === 0) {
      toast.warning('No BOM found for selected product');
      return;
    }

    // Check if all materials are sufficient
    const hasInsufficient = bomMaterials.some(m => !m.sufficient);
    if (hasInsufficient) {
      const confirmProceed = await new Promise((resolve) => {
        toast.warning('Some materials are insufficient. Review required materials before proceeding.', {
          duration: 6000
        });
        setTimeout(() => resolve(true), 500); // Allow proceeding after showing warning
      });
      if (!confirmProceed) return;
    }

    try {
      setSubmitting(true);

      // Create production order (pending status)
      const productionData = {
        product_id: selectedProduct,
        bom_id: selectedBom.id,
        planned_quantity: productionQuantity,
        status: 'pending',
        notes: `Materials reserved for ${finalProducts.find(p => p.id == selectedProduct)?.name}`
      };

      await productionService.create(productionData);

      toast.success('Materials reserved for production successfully! Go to Production Completion page to complete the production.');

      // Reset form
      setSelectedProduct('');
      setProductionQuantity(1);
      setSelectedBom(null);
      setBomMaterials([]);
    } catch (error) {
      console.error('Error reserving materials:', error);
      toast.error('Failed to reserve materials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        .material-issue-page {
          max-width: 100%;
        }

        .issue-type-section {
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 24px;
          margin-bottom: 24px;
        }

        .issue-type-title {
          font-size: 16px;
          font-weight: 600;
          color: #000;
          margin-bottom: 20px;
        }

        .issue-type-buttons {
          display: flex;
          gap: 16px;
        }

        .issue-type-btn {
          flex: 1;
          padding: 8px 16px;
          height: 40px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          fontSize: 14px;
          font-weight: 500;
          color: #6b7280;
        }

        .issue-type-btn:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .issue-type-btn.active {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #2563eb;
        }

        .issue-type-icon {
          width: 20px;
          height: 20px;
        }

        .issue-info-banner {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          display: flex;
          gap: 12px;
        }

        .issue-info-icon {
          width: 20px;
          height: 20px;
          color: #f59e0b;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .issue-info-text {
          font-size: 13px;
          color: #92400e;
          line-height: 1.6;
        }

        .issue-form-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 24px;
        }

        .issue-form-field {
          margin-bottom: 20px;
        }

        .issue-form-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #000;
          margin-bottom: 8px;
        }

        .issue-form-select,
        .issue-form-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          color: #6b7280;
          background: white;
          transition: all 0.2s;
          outline: none;
        }

        .issue-form-select:focus,
        .issue-form-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .bom-materials-section {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-top: 24px;
        }

        .bom-materials-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .bom-materials-icon {
          width: 18px;
          height: 18px;
          color: #000;
        }

        .bom-materials-title {
          font-size: 16px;
          font-weight: 600;
          color: #000;
          margin: 0;
        }

        .bom-materials-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .bom-material-item {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .bom-material-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .bom-material-name {
          font-size: 15px;
          font-weight: 600;
          color: #000;
        }

        .bom-material-available {
          font-size: 12px;
          color: #6b7280;
        }

        .bom-material-required {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .bom-material-quantity {
          font-size: 18px;
          font-weight: 700;
          color: #000;
        }

        .bom-material-status {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #16a34a;
          font-weight: 500;
        }

        .bom-material-status svg {
          width: 14px;
          height: 14px;
        }

        .issue-submit-btn {
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
          margin-top: 24px;
        }

        .issue-submit-btn:hover {
          background: #1d4ed8;
        }

        .issue-submit-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
      `}</style>

      <header className="main-header">
        <div className="main-title">
          <h1>Material Issue</h1>
          <p>Issue materials for production</p>
        </div>
      </header>

      <div className="material-issue-page">
        {/* Select Issue Type */}
        <div className="issue-type-section">
          <h3 className="issue-type-title">Select Issue Type</h3>
          <div className="issue-type-buttons">
            <button
              className={`issue-type-btn ${issueType === 'production' ? 'active' : ''}`}
              onClick={() => setIssueType('production')}
            >
              <svg className="issue-type-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Production Issue (BOM-Based)
            </button>
            <button
              className={`issue-type-btn ${issueType === 'raw' ? 'active' : ''}`}
              onClick={() => setIssueType('raw')}
            >
              <svg className="issue-type-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
              Issue Raw Material
            </button>
          </div>
        </div>

        {/* BOM-Based Production */}
        {issueType === 'production' && (
          <>
            {/* Info Banner */}
            <div className="issue-info-banner">
              <svg className="issue-info-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <div className="issue-info-text">
                <strong>BOM-Based Production:</strong> Materials will be reserved for production. Stock deduction happens only on "Production Completion" page when you record the actual quantity produced. This prevents double-deduction errors.
              </div>
            </div>

            {/* Form Card */}
            <div className="issue-form-card">
              <div className="issue-form-field">
                <CustomDropdown
                  label="Select Final Product"
                  value={selectedProduct ? finalProducts.find(p => p.id == selectedProduct)?.name + ' (' + (finalProducts.find(p => p.id == selectedProduct)?.code || 'N/A') + ')' : "Choose a product to manufacture"}
                  onChange={(val) => {
                    if (val === "Choose a product to manufacture") {
                      handleProductChange("");
                    } else {
                      const product = finalProducts.find(p => p.name + ' (' + (p.code || 'N/A') + ')' === val);
                      if (product) handleProductChange(product.id);
                    }
                  }}
                  options={["Choose a product to manufacture", ...finalProducts.map(product => product.name + ' (' + (product.code || 'N/A') + ')')]}
                />
              </div>

              {selectedProduct && (
                <>
                  <div className="issue-form-field">
                    <label className="issue-form-label">Production Quantity (Planned)</label>
                    <input
                      type="number"
                      className="issue-form-input"
                      min="1"
                      value={productionQuantity}
                      onChange={(e) => setProductionQuantity(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  {/* Required Materials (BOM) */}
                  <div className="bom-materials-section">
                    <div className="bom-materials-header">
                      <svg className="bom-materials-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                      <h4 className="bom-materials-title">Required Materials (BOM {selectedBom?.version || 'v1.0'})</h4>
                    </div>
                    <div className="bom-materials-list">
                      {bomMaterials.map((material, index) => (
                        <div key={index} className="bom-material-item">
                          <div className="bom-material-info">
                            <div className="bom-material-name">{material.name}</div>
                            <div className="bom-material-available">
                              Available: {material.available} {material.unit}
                            </div>
                          </div>
                          <div className="bom-material-required">
                            <div className="bom-material-quantity" style={{ color: material.sufficient ? '#000' : '#dc2626' }}>
                              {material.required} {material.unit}
                            </div>
                            {material.sufficient ? (
                              <div className="bom-material-status" style={{ color: '#16a34a' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Sufficient
                              </div>
                            ) : (
                              <div className="bom-material-status" style={{ color: '#dc2626' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Insufficient
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className="issue-submit-btn" onClick={handleReserveForProduction} type="button">
                    Reserve Materials for Production
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Issue Raw Material */}
        {issueType === 'raw' && (
          <>
            {/* Info Banner */}
            <div className="issue-info-banner" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
              <svg className="issue-info-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ color: '#2563eb' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <div className="issue-info-text" style={{ color: '#1e40af' }}>
                <strong>Issue Additional Materials:</strong> Link materials to an ongoing production order. Select which production needs these additional materials.
              </div>
            </div>

            {/* Form Card */}
            <div className="issue-form-card">
              <div className="issue-form-field">
                <label className="issue-form-label">Select Production Order *</label>
                {pendingProductions.length === 0 ? (
                  <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px', color: '#f59e0b', flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <div style={{ fontSize: '13px', color: '#92400e', lineHeight: '1.6' }}>
                      <strong>No Active Productions:</strong> There are currently no production orders in progress. Additional materials can only be issued to ongoing production orders.
                    </div>
                  </div>
                ) : (
                  <CustomDropdown
                    label=""
                    value={selectedProductionOrder ? pendingProductions.find(p => p.id == selectedProductionOrder)?.completion_number + ' - ' + pendingProductions.find(p => p.id == selectedProductionOrder)?.product_name + ' (' + pendingProductions.find(p => p.id == selectedProductionOrder)?.planned_quantity + ' units)' : "Select which production order needs these materials"}
                    onChange={(val) => {
                      if (val === "Select which production order needs these materials") {
                        setSelectedProductionOrder("");
                      } else {
                        const prod = pendingProductions.find(p => p.completion_number + ' - ' + p.product_name + ' (' + p.planned_quantity + ' units)' === val);
                        if (prod) setSelectedProductionOrder(prod.id);
                      }
                    }}
                    options={["Select which production order needs these materials", ...pendingProductions.map(prod => prod.completion_number + ' - ' + prod.product_name + ' (' + prod.planned_quantity + ' units)')]}
                  />
                )}
              </div>

              {/* Materials to Issue */}
              <div style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#000', margin: 0 }}>Materials to Issue</h4>
                  <button
                    onClick={addMaterial}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>+</span> Add Material
                  </button>
                </div>

                {/* Material Grid Header */}
                <div style={{ display: 'grid', gridTemplateColumns: materials.length > 1 ? '1fr 150px 40px' : '1fr 150px', gap: '16px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>Material</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>Quantity</div>
                  {materials.length > 1 && <div></div>}
                </div>

                {/* Material Rows */}
                {materials.map((material, index) => (
                  <div key={material.id} style={{ display: 'grid', gridTemplateColumns: materials.length > 1 ? '1fr 150px 40px' : '1fr 150px', gap: '16px', marginBottom: '12px', alignItems: 'start' }}>
                    <div>
                      <CustomDropdown
                        label=""
                        value={material.material ? rawMaterials.find(m => m.id == material.material)?.name + ' (Stock: ' + rawMaterials.find(m => m.id == material.material)?.current_stock + ' ' + rawMaterials.find(m => m.id == material.material)?.unit + ')' : "Select material"}
                        onChange={(val) => {
                          if (val === "Select material") {
                            updateMaterial(material.id, 'material', "");
                          } else {
                            const mat = rawMaterials.find(m => m.name + ' (Stock: ' + m.current_stock + ' ' + m.unit + ')' === val);
                            if (mat) updateMaterial(material.id, 'material', mat.id);
                          }
                        }}
                        options={["Select material", ...rawMaterials.map(mat => mat.name + ' (Stock: ' + mat.current_stock + ' ' + mat.unit + ')')]}
                      />
                    </div>
                    <input
                      type="number"
                      className="issue-form-input"
                      value={material.quantity}
                      onChange={(e) => updateMaterial(material.id, 'quantity', parseInt(e.target.value) || 0)}
                      min="1"
                      style={{ width: '100%' }}
                    />
                    {materials.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteMaterial(material.id)}
                        style={{
                          width: '40px',
                          height: '40px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          background: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#dc2626'
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Remarks */}
              <div className="issue-form-field" style={{ marginTop: '24px' }}>
                <label className="issue-form-label">Remarks / Reason for Additional Materials *</label>
                <textarea
                  className="issue-form-select"
                  rows="4"
                  value={additionalMaterialRemarks}
                  onChange={(e) => setAdditionalMaterialRemarks(e.target.value)}
                  placeholder="Explain why additional materials are needed, e.g., 'Extra material for rework', 'Material wastage', 'Production adjustments'"
                  style={{ resize: 'vertical', minHeight: '100px', fontFamily: 'inherit' }}
                />
              </div>

              <button
                type="button"
                className="issue-submit-btn"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Issuing Materials...' : 'Issue Materials'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

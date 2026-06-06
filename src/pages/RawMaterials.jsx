import React, { useState, useEffect } from "react";
import { rawMaterialsService } from "../services";
import toast from '../utils/toast';

export default function RawMaterials() {
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [formData, setFormData] = useState({
    materialName: "",
    materialCode: "",
    unitOfMeasure: "",
    minimumStockLevel: "",
    category: "",
    approvalThreshold: "0",
  });

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    code: "",
    unit: "",
    minimum_stock: "",
    category: "",
    approval_threshold: "0",
  });
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const data = await rawMaterialsService.getAll();
      setMaterials(data);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const materialData = {
        name: formData.materialName,
        code: formData.materialCode || null,
        unit: formData.unitOfMeasure,
        unit_price: 0, // Default to 0 - will be set by actual purchases
        current_stock: 0, // New materials start with 0 stock
        minimum_stock: parseInt(formData.minimumStockLevel) || 0,
        category: formData.category || null,
        approval_threshold: parseInt(formData.approvalThreshold) || 0,
      };

      await rawMaterialsService.create(materialData);

      // Reset form
      setFormData({
        materialName: "",
        materialCode: "",
        unitOfMeasure: "",
        minimumStockLevel: "",
        category: "",
        approvalThreshold: "0",
      });

      // Refresh the list
      await fetchMaterials();
      toast.success('Material added successfully!');
    } catch (error) {
      console.error('Error adding material:', error);
      const errorMessage = error.message || 'Failed to add material. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleToggleActive = async (id, name, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    try {
      await rawMaterialsService.update(id, { is_active: !currentStatus });
      await fetchMaterials();
      toast.success(`Material ${action}d successfully!`);
    } catch (error) {
      console.error(`Error ${action}ing material:`, error);
      toast.error(`Failed to ${action} material. Please try again.`);
    }
  };

  const handleEditClick = (material) => {
    setEditingMaterial(material);
    setEditFormData({
      name: material.name || "",
      code: material.code || "",
      unit: material.unit || "",
      minimum_stock: material.minimum_stock || "",
      category: material.category || "",
    });
    setEditModalOpen(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      setUpdating(true);

      await rawMaterialsService.update(editingMaterial.id, {
        name: editFormData.name,
        code: editFormData.code || null,
        unit: editFormData.unit,
        minimum_stock: parseInt(editFormData.minimum_stock) || 0,
        category: editFormData.category || null,
      });

      toast.success('Material updated successfully!');
      setEditModalOpen(false);
      setEditingMaterial(null);
      await fetchMaterials();
    } catch (error) {
      console.error('Error updating material:', error);
      const errorMessage = error.message || 'Failed to update material. Please try again.';
      toast.error(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingMaterial(null);
  };

  return (
    <>
      <style>{`
        .raw-materials-page {
          max-width: 100%;
        }

        .raw-materials-layout {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 24px;
          align-items: start;
        }

        .materials-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .materials-card-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .materials-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #000;
          margin: 0;
        }

        .materials-card-icon {
          width: 18px;
          height: 18px;
          color: #000;
        }

        .materials-card-body {
          padding: 24px;
        }

        .materials-form-field {
          margin-bottom: 20px;
        }

        .materials-form-field label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #000;
          margin-bottom: 8px;
        }

        .materials-form-input {
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

        .materials-form-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .materials-form-input::placeholder {
          color: #9ca3af;
        }

        .materials-field-hint {
          margin-top: 8px;
          font-size: 12px;
          color: #6b7280;
          line-height: 1.5;
        }

        .materials-approval-section {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #f3f4f6;
        }

        .materials-approval-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .materials-approval-icon {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid #000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .materials-approval-title {
          font-size: 14px;
          font-weight: 600;
          color: #000;
          margin: 0;
        }

        .materials-approval-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          color: #6b7280;
          background: white;
          margin-bottom: 8px;
        }

        .materials-submit-btn {
          width: 100%;
          padding: 12px 24px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 24px;
        }

        .materials-submit-btn:hover {
          background: #1d4ed8;
        }

        .materials-table-wrapper {
          overflow-x: auto;
        }

        .materials-inventory-table {
          width: 100%;
          border-collapse: collapse;
        }

        .materials-inventory-table thead {
          background: #f9fafb;
        }

        .materials-inventory-table th {
          padding: 14px 16px;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          border-bottom: 1px solid #e5e7eb;
        }

        .materials-inventory-table td {
          padding: 16px;
          font-size: 14px;
          color: #000;
          border-bottom: 1px solid #f3f4f6;
        }

        .materials-inventory-table tbody tr:hover {
          background: #f9fafb;
        }

        .materials-inventory-table tbody tr:last-child td {
          border-bottom: none;
        }

        .materials-approval-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #f97316;
          font-size: 14px;
        }

        .materials-approval-badge::before {
          content: "○";
          font-size: 12px;
        }

        .materials-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .materials-action-btn {
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
          width: 100%;
        }

        .materials-action-btn:hover {
          background: #eff6ff;
          border-color: #3b82f6;
        }

        .materials-action-btn.deactivate {
          color: #dc2626;
          border-color: #fecaca;
        }

        .materials-action-btn.deactivate:hover {
          background: #fef2f2;
          border-color: #fca5a5;
        }

        .materials-action-icon {
          width: 16px;
          height: 16px;
        }

        @media (max-width: 1200px) {
          .raw-materials-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="main-header">
        <div className="main-title">
          <h1>Raw Materials</h1>
          <p>Manage inventory materials</p>
        </div>
      </header>

      <div className="raw-materials-page">
        <div className="raw-materials-layout">
          {/* Add New Material Form */}
          <div className="materials-card">
            <div className="materials-card-header">
              <h3 className="materials-card-title">
                <svg className="materials-card-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add New Material
              </h3>
            </div>
            <div className="materials-card-body">
              <form onSubmit={handleSubmit}>
                <div className="materials-form-field">
                  <label>Material Name *</label>
                  <input
                    type="text"
                    name="materialName"
                    className="materials-form-input"
                    placeholder="e.g., Steel Rod"
                    value={formData.materialName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="materials-form-field">
                  <label>Material Code</label>
                  <input
                    type="text"
                    name="materialCode"
                    className="materials-form-input"
                    placeholder="e.g., SR-001"
                    value={formData.materialCode}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="materials-form-field">
                  <label>Unit of Measure *</label>
                  <input
                    type="text"
                    name="unitOfMeasure"
                    className="materials-form-input"
                    placeholder="e.g., kg, liters, pieces"
                    value={formData.unitOfMeasure}
                    onChange={handleInputChange}
                    required
                  />
                </div>



                <div className="materials-form-field">
                  <label>Minimum Stock Level</label>
                  <input
                    type="text"
                    name="minimumStockLevel"
                    className="materials-form-input"
                    placeholder="Alert threshold"
                    value={formData.minimumStockLevel}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="materials-form-field">
                  <label>Category</label>
                  <input
                    type="text"
                    name="category"
                    className="materials-form-input"
                    placeholder="e.g., Metals, Chemicals"
                    value={formData.category}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="materials-approval-section">
                  <div className="materials-approval-header">
                    <div className="materials-approval-icon"></div>
                    <h4 className="materials-approval-title">Additional Issue Approval Threshold</h4>
                  </div>
                  <input
                    type="text"
                    name="approvalThreshold"
                    className="materials-approval-input"
                    placeholder="0 = all additional issues need approval"
                    value={formData.approvalThreshold}
                    onChange={handleInputChange}
                  />
                  <p className="materials-field-hint">
                    Max quantity that can be issued as "additional material" without admin approval. Set to 0 to require approval for all additional issues.
                  </p>
                </div>

                <button type="submit" className="materials-submit-btn">
                  Add Material
                </button>
              </form>
            </div>
          </div>

          {/* Material Inventory Table */}
          <div className="materials-card">
            <div className="materials-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h3 className="materials-card-title">
                <svg className="materials-card-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                Material Inventory
              </h3>
              <div style={{ position: 'relative', minWidth: '250px' }}>
                <svg
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }}
                  xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
            <div className="materials-table-wrapper">
              <table className="materials-inventory-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Stock</th>
                    <th>Unit</th>
                    <th>Approval Limit</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                        Loading materials...
                      </td>
                    </tr>
                  ) : materials.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                        No materials found. Add your first material using the form.
                      </td>
                    </tr>
                  ) : (() => {
                    const filteredMaterials = materials.filter(material => {
                      if (!searchQuery.trim()) return true;
                      const query = searchQuery.toLowerCase();
                      return (
                        material.name?.toLowerCase().includes(query) ||
                        material.code?.toLowerCase().includes(query) ||
                        material.category?.toLowerCase().includes(query) ||
                        material.unit?.toLowerCase().includes(query)
                      );
                    });

                    if (filteredMaterials.length === 0) {
                      return (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                            No materials found matching "{searchQuery}"
                          </td>
                        </tr>
                      );
                    }

                    return filteredMaterials.map((material) => {
                      const isActive = material.is_active !== false; // Default to true if undefined

                      return (
                        <tr key={material.id} style={{ opacity: isActive ? 1 : 0.6 }}>
                          <td><strong>{material.name}</strong></td>
                          <td>{material.code || '-'}</td>
                          <td><strong>{material.current_stock}</strong></td>
                          <td>{material.unit}</td>
                          <td>
                            <span className="materials-approval-badge">
                              {material.approval_threshold} {material.unit}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              color: isActive ? '#16a34a' : '#6b7280',
                              fontWeight: '500'
                            }}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <div className="materials-actions">
                              <button
                                className="materials-action-btn view"
                                onClick={() => handleEditClick(material)}
                                style={{
                                  background: 'white',
                                  color: '#2563eb',
                                  border: '1px solid #2563eb',
                                  marginBottom: '8px'
                                }}
                              >
                                <svg className="materials-action-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                                View
                              </button>
                              <button className={`materials-action-btn ${isActive ? 'deactivate' : 'activate'}`} onClick={() => handleToggleActive(material.id, material.name, isActive)} style={!isActive ? { background: '#16a34a', color: 'white', borderColor: '#16a34a' } : {}}>
                                <svg className="materials-action-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                                {isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </div >
                          </td >
                        </tr >
                      );
                    });
                  })()}
                </tbody >
              </table >
            </div >
          </div >
        </div >
      </div >

      {/* Edit Material Modal */}
      {editModalOpen && (
        <>
          <div className="modal-overlay" onClick={closeEditModal} style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 50,
          }} />
          <div role="dialog" className="modal-dialog" style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            zIndex: 50,
            transform: 'translate(-50%, -50%)',
            width: '100%',
            maxWidth: '42rem',
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
                </svg>
                Edit Raw Material
              </h2>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                    Material Name *
                  </label>
                  <input
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditFormChange}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                    Material Code
                  </label>
                  <input
                    name="code"
                    value={editFormData.code}
                    onChange={handleEditFormChange}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                    Unit of Measure *
                  </label>
                  <input
                    name="unit"
                    value={editFormData.unit}
                    onChange={handleEditFormChange}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                    Category
                  </label>
                  <input
                    name="category"
                    value={editFormData.category}
                    onChange={handleEditFormChange}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Minimum Stock Level
                </label>
                <input
                  type="number"
                  name="minimum_stock"
                  value={editFormData.minimum_stock}
                  onChange={handleEditFormChange}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                  min="0"
                />
              </div>

              {/* Item Properties - Read Only */}
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Item Properties
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: editingMaterial?.can_have_bom ? '#10b981' : '#d1d5db',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {editingMaterial?.can_have_bom && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: '0.875rem', color: '#374151' }}>Can Have BOM</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: editingMaterial?.is_purchasable ? '#10b981' : '#d1d5db',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {editingMaterial?.is_purchasable && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: '0.875rem', color: '#374151' }}>Is Purchasable</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: editingMaterial?.is_manufacturable ? '#10b981' : '#d1d5db',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {editingMaterial?.is_manufacturable && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: '0.875rem', color: '#374151' }}>Is Manufacturable</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: editingMaterial?.is_sellable ? '#10b981' : '#d1d5db',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {editingMaterial?.is_sellable && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: '0.875rem', color: '#374151' }}>Is Sellable</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={closeEditModal}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    color: '#374151',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }}>
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                  </svg>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: updating ? 'not-allowed' : 'pointer',
                    opacity: updating ? 0.5 : 1,
                    border: 'none',
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="m9 12 2 2 4-4"></path>
                  </svg>
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

            <button
              onClick={closeEditModal}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '1rem',
                padding: '0.25rem',
                borderRadius: '0.25rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                opacity: 0.7,
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </button>
          </div>
        </>
      )}
    </>
  );
}

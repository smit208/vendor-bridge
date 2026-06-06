import React, { useState, useEffect } from "react";
import { finalProductsService } from "../services";
import toast from '../utils/toast';

export default function FinalProducts() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    productName: "",
    productCode: "",
    unitOfMeasure: "unit",
    sellingPrice: "",
    minimumStockLevel: "",
    description: "",
  });

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    code: "",
    unit: "",
    unit_price: "",
    minimum_stock: "",
    category: "",
    approval_threshold: "0",
  });
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await finalProductsService.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
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
      const productData = {
        name: formData.productName,
        code: formData.productCode || null,
        unit: formData.unitOfMeasure,
        unit_price: parseFloat(formData.sellingPrice) || 0,
        current_stock: 0,
        minimum_stock: parseInt(formData.minimumStockLevel) || 0,
        description: formData.description || null,
      };

      await finalProductsService.create(productData);

      setFormData({
        productName: "",
        productCode: "",
        unitOfMeasure: "unit",
        sellingPrice: "",
        minimumStockLevel: "",
        description: "",
      });

      await fetchProducts();
      toast.success('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      const errorMessage = error.message || 'Failed to add product';
      toast.error(errorMessage);
    }
  };

  const handleToggleActive = async (id, name, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    try {
      await finalProductsService.update(id, { is_active: !currentStatus });
      await fetchProducts();
      toast.success(`Product ${action}d successfully!`);
    } catch (error) {
      console.error(`Error ${action}ing product:`, error);
      toast.error(`Failed to ${action} product. Please try again.`);
    }
  };

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name || "",
      code: product.code || "",
      unit: product.unit || "",
      unit_price: product.unit_price || "",
      minimum_stock: product.minimum_stock || "",
      category: product.category || "",
      approval_threshold: product.approval_threshold || "0",
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

      await finalProductsService.update(editingProduct.id, {
        name: editFormData.name,
        code: editFormData.code || null,
        unit: editFormData.unit,
        unit_price: parseFloat(editFormData.unit_price) || 0,
        minimum_stock: parseInt(editFormData.minimum_stock) || 0,
        category: editFormData.category || null,
        approval_threshold: parseInt(editFormData.approval_threshold) || 0,
      });

      toast.success('Product updated successfully!');
      setEditModalOpen(false);
      setEditingProduct(null);
      await fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      const errorMessage = error.message || 'Failed to update product. Please try again.';
      toast.error(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <>
      <style>{`
        .final-products-page {
          max-width: 100%;
        }

        .final-products-layout {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 24px;
          align-items: start;
        }

        .products-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .products-card-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .products-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #000;
          margin: 0;
        }

        .products-card-icon {
          width: 18px;
          height: 18px;
          color: #000;
        }

        .products-card-body {
          padding: 24px;
        }

        .products-form-field {
          margin-bottom: 20px;
        }

        .products-form-field label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #000;
          margin-bottom: 8px;
        }

        .products-form-input,
        .products-form-textarea {
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

        .products-form-input:focus,
        .products-form-textarea:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .products-form-input::placeholder,
        .products-form-textarea::placeholder {
          color: #9ca3af;
        }

        .products-form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .products-submit-btn {
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

        .products-submit-btn:hover {
          background: #1d4ed8;
        }

        .products-table-wrapper {
          overflow-x: auto;
        }

        .products-catalog-table {
          width: 100%;
          border-collapse: collapse;
        }

        .products-catalog-table thead {
          background: #f9fafb;
        }

        .products-catalog-table th {
          padding: 14px 16px;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          border-bottom: 1px solid #e5e7eb;
        }

        .products-catalog-table td {
          padding: 16px;
          font-size: 14px;
          color: #000;
          border-bottom: 1px solid #f3f4f6;
        }

        .products-catalog-table tbody tr:hover {
          background: #f9fafb;
        }

        .products-catalog-table tbody tr:last-child td {
          border-bottom: none;
        }

        .products-status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .products-status-badge.inactive {
          background: #f3f4f6;
          color: #6b7280;
        }

        .products-status-badge.active {
          background: #dcfce7;
          color: #166534;
        }

        .products-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .products-action-btn {
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

        .products-action-btn:hover {
          background: #eff6ff;
          border-color: #3b82f6;
        }

        .products-action-btn.activate {
          color: #16a34a;
          border-color: #bbf7d0;
        }

        .products-action-btn.activate:hover {
          background: #f0fdf4;
          border-color: #86efac;
        }

        .products-action-btn.deactivate {
          color: #dc2626;
          border-color: #fecaca;
        }

        .products-action-btn.deactivate:hover {
          background: #fef2f2;
          border-color: #fca5a5;
        }

        .products-action-icon {
          width: 16px;
          height: 16px;
        }

        @media (max-width: 1200px) {
          .final-products-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="main-header">
        <div className="main-title">
          <h1>Final Products</h1>
          <p>Manage finished products</p>
        </div>
      </header>

      <div className="final-products-page">
        <div className="final-products-layout">
          {/* Add New Product Form */}
          <div className="products-card">
            <div className="products-card-header">
              <h3 className="products-card-title">
                <svg className="products-card-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add New Product
              </h3>
            </div>
            <div className="products-card-body">
              <form onSubmit={handleSubmit}>
                <div className="products-form-field">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    name="productName"
                    className="products-form-input"
                    placeholder="e.g., Cooling Tower 10TR"
                    value={formData.productName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="products-form-field">
                  <label>Product Code</label>
                  <input
                    type="text"
                    name="productCode"
                    className="products-form-input"
                    placeholder="e.g., CT-10TR"
                    value={formData.productCode}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="products-form-field">
                  <label>Unit of Measure *</label>
                  <input
                    type="text"
                    name="unitOfMeasure"
                    className="products-form-input"
                    placeholder="unit"
                    value={formData.unitOfMeasure}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="products-form-field">
                  <label>Selling Price Per Unit * (₹)</label>
                  <input
                    type="text"
                    name="sellingPrice"
                    className="products-form-input"
                    placeholder="e.g., 1500.00"
                    value={formData.sellingPrice}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="products-form-field">
                  <label>Minimum Stock Level</label>
                  <input
                    type="text"
                    name="minimumStockLevel"
                    className="products-form-input"
                    placeholder="Alert threshold"
                    value={formData.minimumStockLevel}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="products-form-field">
                  <label>Description</label>
                  <textarea
                    name="description"
                    className="products-form-textarea"
                    placeholder="Product description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>

                <button type="submit" className="products-submit-btn">
                  Add Product
                </button>
              </form>
            </div>
          </div>

          {/* Product Catalog Table */}
          <div className="products-card">
            <div className="products-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h3 className="products-card-title">
                <svg className="products-card-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                Product Catalog
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
                  placeholder="Search products..."
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
            <div className="products-table-wrapper">
              <table className="products-catalog-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Stock</th>
                    <th>Unit</th>
                    <th>Price/Unit</th>
                    <th>Total Value</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                        Loading products...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                        No products found. Add your first product using the form.
                      </td>
                    </tr>
                  ) : (() => {
                    const filteredProducts = products.filter(product => {
                      if (!searchQuery.trim()) return true;
                      const query = searchQuery.toLowerCase();
                      return (
                        product.name?.toLowerCase().includes(query) ||
                        product.code?.toLowerCase().includes(query) ||
                        product.description?.toLowerCase().includes(query) ||
                        product.unit?.toLowerCase().includes(query)
                      );
                    });

                    if (filteredProducts.length === 0) {
                      return (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                            No products found matching "{searchQuery}"
                          </td>
                        </tr>
                      );
                    }

                    return filteredProducts.map((product) => {
                      const totalValue = (product.current_stock || 0) * (product.unit_price || 0);
                      const isLowStock = product.current_stock <= product.minimum_stock;
                      const status = product.current_stock === 0 ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Active';

                      return (
                        <tr key={product.id}>
                          <td><strong>{product.name}</strong></td>
                          <td>{product.code || '-'}</td>
                          <td><strong>{product.current_stock}</strong></td>
                          <td>{product.unit}</td>
                          <td><strong>₹{Number(product.unit_price || 0).toFixed(2)}</strong></td>
                          <td><strong>₹{totalValue.toFixed(2)}</strong></td>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background: status === 'Out of Stock' ? '#fee2e2' : isLowStock ? '#fed7aa' : '#dcfce7',
                              color: status === 'Out of Stock' ? '#dc2626' : isLowStock ? '#ea580c' : '#166534'
                            }}>
                              {status}
                            </span>
                          </td>
                          <td>
                            <div className="products-actions">
                              <button
                                className="products-action-btn"
                                onClick={() => handleEditClick(product)}
                                style={{
                                  background: 'white',
                                  color: '#2563eb',
                                  border: '1px solid #2563eb',
                                  marginBottom: '8px'
                                }}
                              >
                                <svg className="products-action-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                                View
                              </button>
                              <button
                                className={`products-action-btn ${product.is_active !== false ? 'deactivate' : 'activate'}`}
                                onClick={() => handleToggleActive(product.id, product.name, product.is_active !== false)}
                                style={product.is_active === false ? { background: '#16a34a', color: 'white', borderColor: '#16a34a' } : {}}
                              >
                                <svg className="products-action-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                                {product.is_active !== false ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Product Modal */}
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
                Edit Final Product
              </h2>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Product Name *
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
                  Product Code
                </label>
                <input
                  name="code"
                  value={editFormData.code}
                  onChange={handleEditFormChange}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                />
              </div>

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
                  Selling Price Per Unit * (₹)
                </label>
                <input
                  type="number"
                  name="unit_price"
                  value={editFormData.unit_price}
                  onChange={handleEditFormChange}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                  min="0"
                  step="0.01"
                  required
                />
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

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Description
                </label>
                <textarea
                  name="description"
                  value={editFormData.description || ''}
                  onChange={handleEditFormChange}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                  rows={3}
                />
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

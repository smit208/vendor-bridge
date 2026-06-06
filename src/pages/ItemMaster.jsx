import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { itemMasterService } from "../services";

export default function ItemMaster() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        item_code: "",
        item_name: "",
        item_type: "Raw Material",
        uom: "Nos",
        category: "",
        minimum_stock: "",
        can_have_bom: false,
        is_purchasable: true,
        is_manufacturable: false,
        is_sellable: false,
    });

    // Edit modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [updating, setUpdating] = useState(false);

    const unitOptions = ["kg", "liters", "meters", "sets", "boxes", "rolls", "sheets", "Nos"];
    const categoryOptions = ["Motors", "Plastics", "Metals", "Chemicals", "Electronics", "Packaging", "Finished Goods", "Consumable"];
    const itemTypeOptions = ["Raw Material", "Sub Assembly", "Finished Product", "Consumable"];

    useEffect(() => {
        fetchItems();
    }, []);

    // Match inventory box height to form box height
    useEffect(() => {
        const matchHeights = () => {
            setTimeout(() => {
                const formBox = document.querySelector('.add-item-card');
                const inventoryBox = document.querySelector('.items-card');
                if (formBox && inventoryBox) {
                    const formHeight = formBox.offsetHeight;
                    inventoryBox.style.maxHeight = `${formHeight}px`;
                }
            }, 100);
        };

        // Match heights on load and when items change
        matchHeights();

        // Also match on window resize
        window.addEventListener('resize', matchHeights);
        return () => window.removeEventListener('resize', matchHeights);
    }, [items, formData]);

    // Auto-set boolean properties based on Item Type
    useEffect(() => {
        const itemType = formData.item_type;
        let newProperties = {};

        switch (itemType) {
            case "Raw Material":
                newProperties = {
                    can_have_bom: false,
                    is_purchasable: true,
                    is_manufacturable: false,
                    is_sellable: false,
                };
                break;
            case "Sub Assembly":
                newProperties = {
                    can_have_bom: true,
                    is_purchasable: true,
                    is_manufacturable: true,
                    is_sellable: false,
                };
                break;
            case "Finished Product":
                newProperties = {
                    can_have_bom: true,
                    is_purchasable: false,
                    is_manufacturable: true,
                    is_sellable: true,
                };
                break;
            case "Consumable":
                newProperties = {
                    can_have_bom: false,
                    is_purchasable: true,
                    is_manufacturable: false,
                    is_sellable: false,
                    category: "Consumable", // Auto-set category for consumables
                };
                break;
            default:
                newProperties = {};
        }

        setFormData(prev => ({ ...prev, ...newProperties }));
    }, [formData.item_type]);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const data = await itemMasterService.getAll();
            setItems(data);
        } catch (error) {
            console.error("Error fetching items:", error);
            toast.error("Failed to load items");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);

            // Map to backend format
            const payload = {
                code: formData.item_code || null,
                name: formData.item_name,
                unit: formData.uom,
                category: formData.category || null,
                minimum_stock: formData.minimum_stock ? parseFloat(formData.minimum_stock) : 0,
                // Map item type to backend item_type/make_type
                item_type: formData.item_type === "Raw Material" || formData.item_type === "Consumable" ? "buy" : "make",
                make_type: formData.item_type === "Finished Product" ? "final" :
                    formData.item_type === "Sub Assembly" ? "semi_assembly" : null,
                // Include boolean properties
                can_have_bom: formData.can_have_bom,
                is_purchasable: formData.is_purchasable,
                is_manufacturable: formData.is_manufacturable,
                is_sellable: formData.is_sellable,
            };

            await itemMasterService.create(payload);
            toast.success("Item added successfully!");
            setFormData({
                item_code: "",
                item_name: "",
                item_type: "Raw Material",
                uom: "Nos",
                category: "",
                minimum_stock: "",
                can_have_bom: false,
                is_purchasable: true,
                is_manufacturable: false,
                is_sellable: false,
            });
            await fetchItems();
        } catch (error) {
            console.error("Error adding item:", error);
            toast.error(error.message || "Failed to add item");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditClick = (item) => {
        setEditingItem(item);

        // Derive defaults based on item type when DB property columns are null
        const isBuy = item.item_type === 'buy';
        const isMake = item.item_type === 'make';
        const isSemiAssembly = item.make_type === 'semi_assembly';
        const isFinal = item.make_type === 'final';

        const defaultPurchasable = isBuy || isSemiAssembly; // raw materials + sub-assemblies are purchasable
        const defaultManufacturable = isMake;
        const defaultCanHaveBom = isMake;
        const defaultSellable = isFinal;

        setEditFormData({
            name: item.name || "",
            code: item.code || "",
            unit: item.unit || "",
            minimum_stock: item.minimum_stock || "",
            category: item.category || "",
            unit_price: item.unit_price || "",
            description: item.description || "",
            can_have_bom: item.can_have_bom != null ? item.can_have_bom : defaultCanHaveBom,
            is_purchasable: item.is_purchasable != null ? item.is_purchasable : defaultPurchasable,
            is_manufacturable: item.is_manufacturable != null ? item.is_manufacturable : defaultManufacturable,
            is_sellable: item.is_sellable != null ? item.is_sellable : defaultSellable,
        });
        setEditModalOpen(true);
    };

    const handleEditFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            setUpdating(true);
            await itemMasterService.update(editingItem.id, {
                name: editFormData.name,
                code: editFormData.code || null,
                unit: editFormData.unit,
                minimum_stock: parseFloat(editFormData.minimum_stock) || 0,
                category: editFormData.category || null,
                unit_price: parseFloat(editFormData.unit_price) || null,
                description: editFormData.description || null,
                can_have_bom: editFormData.can_have_bom,
                is_purchasable: editFormData.is_purchasable,
                is_manufacturable: editFormData.is_manufacturable,
                is_sellable: editFormData.is_sellable,
            });
            toast.success("Item updated successfully!");
            setEditModalOpen(false);
            setEditingItem(null);
            await fetchItems();
        } catch (error) {
            console.error("Error updating item:", error);
            toast.error(error.message || "Failed to update item");
        } finally {
            setUpdating(false);
        }
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
        setEditingItem(null);
    };

    const handleToggleActive = async (item) => {
        const action = item.is_active ? "deactivate" : "activate";
        try {
            await itemMasterService.update(item.id, { is_active: !item.is_active });
            await fetchItems();
            toast.success(`Item ${action}d successfully!`);
        } catch (error) {
            console.error(`Error ${action}ing item:`, error);
            toast.error(`Failed to ${action} item`);
        }
    };

    const getTypeBadge = (item) => {
        if (item.item_type === "buy") {
            if (item.category === "Consumable") {
                return <span style={{ color: '#d97706', fontWeight: 500 }}>Consumable</span>;
            }
            return <span style={{ color: '#2563eb', fontWeight: 500 }}>Raw Material</span>;
        } else if (item.make_type === "semi_assembly") {
            return <span style={{ color: '#7c3aed', fontWeight: 500 }}>Sub Assembly</span>;
        } else {
            return <span style={{ color: '#16a34a', fontWeight: 500 }}>Finished Product</span>;
        }
    };

    const filteredItems = items.filter(item => {
        // Search helper - applied across all filter types
        const matchesSearch = () => {
            if (!searchQuery.trim()) return true;
            const query = searchQuery.toLowerCase();
            return (
                item.name?.toLowerCase().includes(query) ||
                item.code?.toLowerCase().includes(query) ||
                item.category?.toLowerCase().includes(query)
            );
        };

        // Type filter based on backend format
        if (filterType === "raw_material") {
            return item.item_type === "buy" && !item.make_type && item.category !== "Consumable" && matchesSearch();
        }
        if (filterType === "sub_assembly") {
            return item.make_type === "semi_assembly" && matchesSearch();
        }
        if (filterType === "finished_product") {
            return item.make_type === "final" && matchesSearch();
        }
        if (filterType === "consumable") {
            return item.item_type === "buy" && item.category === "Consumable" && matchesSearch();
        }

        // "All" tab - just apply search
        return matchesSearch();
    });

    return (
        <>
            <style>{`
                /* Modal Styles for Edit */
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    z-index: 50;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .modal-content {
                    background: white;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 550px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    position: relative;
                }
                
                .modal-header {
                    padding: 20px 50px 20px 24px;
                    border-bottom: 1px solid #e5e7eb;
                    position: sticky;
                    top: 0;
                    background: white;
                    z-index: 1;
                }
                
                .modal-close {
                    position: absolute;
                    right: 20px;
                    top: 20px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    color: #6b7280;
                    transition: color 0.2s;
                    z-index: 2;
                }
                
                .modal-close:hover {
                    color: #111827;
                }
                
                .modal-body {
                    padding: 24px;
                }
                
                .modal-footer {
                    padding: 16px 24px;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    position: sticky;
                    bottom: 0;
                    background: white;
                }
                
                .form-field {
                    margin-bottom: 16px;
                }
                
                .form-label {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 6px;
                }
                
                .form-input, .form-select {
                    width: 100%;
                    padding: 9px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                    color: #111827;
                    background: white;
                    transition: all 0.2s;
                    outline: none;
                    box-sizing: border-box;
                }
                
                .form-input:focus, .form-select:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                
                .form-input::placeholder {
                    color: #9ca3af;
                }
                
                .toggle-group {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    padding: 14px;
                    background: #f9fafb;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                }
                
                .toggle-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }
                
                .toggle-label {
                    font-size: 13px;
                    font-weight: 500;
                    color: #374151;
                    flex: 1;
                }
                
                .toggle-switch {
                    position: relative;
                    width: 44px;
                    height: 24px;
                }
                
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #d1d5db;
                    transition: 0.3s;
                    border-radius: 24px;
                }
                
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.3s;
                    border-radius: 50%;
                }
                
                input:checked + .toggle-slider {
                    background-color: #2563eb;
                }
                
                input:checked + .toggle-slider:before {
                    transform: translateX(20px);
                }
                
                .btn {
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                }
                
                .btn-primary {
                    background: #2563eb;
                    color: white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                
                .btn-primary:hover:not(:disabled) {
                    background: #1d4ed8;
                }
                
                .btn-primary:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .btn-secondary {
                    background: white;
                    color: #374151;
                    border: 1px solid #d1d5db;
                }
                
                .btn-secondary:hover {
                    background: #f9fafb;
                }

                /* Split Layout Styles */
                .item-master-grid {
                    display: grid;
                    grid-template-columns: 360px 1fr;
                    gap: 12px;
                    align-items: start;
                    padding-bottom: 24px;
                }

                @media (max-width: 1200px) {
                    .item-master-grid {
                        grid-template-columns: 1fr;
                        height: auto;
                    }
                }

                .add-item-card {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                    overflow: visible;
                    height: fit-content;
                }

                .add-item-header {
                    padding: 18px 20px;
                    border-bottom: 1px solid #e5e7eb;
                    background: white;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }

                .add-item-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    color: #000;
                    margin: 0;
                }

                .add-item-form {
                    padding: 20px;
                }

                .items-card {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    height: fit-content;
                }
                .items-card-header {
                    padding: 18px 20px;
                    border-bottom: 1px solid #e5e7eb;
                }
                .items-card-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    color: #000;
                    margin: 0;
                }
                .items-card-icon {
                    width: 18px;
                    height: 18px;
                    color: #000;
                }
                .items-table-wrapper {
                    overflow-y: auto;
                    flex: 1;
                }
                .items-table-wrapper::-webkit-scrollbar {
                    width: 6px;
                }
                .items-table-wrapper::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .items-table-wrapper::-webkit-scrollbar-thumb {
                    background: #d1d5db;
                    border-radius: 10px;
                }
                .items-table-wrapper::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af;
                }
                .items-inventory-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .items-inventory-table thead {
                    background: #f9fafb;
                    position: sticky;
                    top: 0;
                    z-index: 1;
                }
                .items-inventory-table th {
                    padding: 14px 16px;
                    text-align: left;
                    font-size: 13px;
                    font-weight: 600;
                    color: #6b7280;
                    border-bottom: 1px solid #e5e7eb;
                }
                .items-inventory-table td {
                    padding: 14px 16px;
                    font-size: 14px;
                    color: #000;
                    border-bottom: 1px solid #f3f4f6;
                }
                .items-inventory-table tbody tr:hover {
                    background: #f9fafb;
                }
                .items-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .items-action-btn {
                    padding: 6px 14px;
                    border: 1px solid #e5e7eb;
                    border-radius: 6px;
                    background: white;
                    color: #2563eb;
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.15s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    width: 100%;
                }
                .items-action-btn:hover {
                    background: #eff6ff;
                    border-color: #3b82f6;
                }
                .items-action-btn.deactivate {
                    color: #dc2626;
                    border-color: #fecaca;
                }
                .items-action-btn.deactivate:hover {
                    background: #fef2f2;
                    border-color: #fca5a5;
                }
                .filter-tabs {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    align-items: center;
                }
                .filter-tab {
                    padding: 6px 12px;
                    border: 1px solid #e5e7eb;
                    background: white;
                    border-radius: 6px;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.15s;
                    height: 32px;
                    box-sizing: border-box;
                    display: inline-flex;
                    align-items: center;
                }
                .filter-tab:hover {
                    background: #f9fafb;
                }
                .filter-tab.active {
                    background: #2563eb;
                    color: white;
                    border-color: #2563eb;
                }
            `}</style>

            <header className="main-header">
                <div className="main-title">
                    <h1>Item Master</h1>
                    <p>Manage all inventory items (Buy & Make)</p>
                </div>
            </header>

            <div className="item-master-page">
                <div className="item-master-grid">
                    {/* Add New Item Form - Left Panel */}
                    <div className="add-item-card">
                        <div className="add-item-header">
                            <h3 className="add-item-title">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                Add New Item
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="add-item-form">
                            <div className="form-field">
                                <label className="form-label">Item Code *</label>
                                <input
                                    type="text"
                                    name="item_code"
                                    className="form-input"
                                    placeholder="e.g., RM-001"
                                    value={formData.item_code}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Item Name *</label>
                                <input
                                    type="text"
                                    name="item_name"
                                    className="form-input"
                                    placeholder="e.g., Steel Sheet 2mm"
                                    value={formData.item_name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Item Type *</label>
                                <select
                                    name="item_type"
                                    className="form-select"
                                    value={formData.item_type}
                                    onChange={handleInputChange}
                                    required
                                >
                                    {itemTypeOptions.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-field">
                                    <label className="form-label">UOM *</label>
                                    <select
                                        name="uom"
                                        className="form-select"
                                        value={formData.uom}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        {unitOptions.map(unit => (
                                            <option key={unit} value={unit}>{unit}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Category</label>
                                    <input
                                        type="text"
                                        name="category"
                                        className="form-input"
                                        placeholder="e.g., Metals"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        list="category-list"
                                    />
                                    <datalist id="category-list">
                                        {categoryOptions.map(cat => (
                                            <option key={cat} value={cat} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>

                            <div className="form-field">
                                <label className="form-label">Minimum Stock</label>
                                <input
                                    type="number"
                                    name="minimum_stock"
                                    className="form-input"
                                    placeholder="Alert threshold quantity"
                                    value={formData.minimum_stock}
                                    onChange={handleInputChange}
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label" style={{ marginBottom: '10px' }}>Item Properties</label>
                                <div className="toggle-group">
                                    <div className="toggle-item">
                                        <span className="toggle-label">Can Have BOM</span>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                name="can_have_bom"
                                                checked={formData.can_have_bom}
                                                onChange={handleInputChange}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    <div className="toggle-item">
                                        <span className="toggle-label">Is Purchasable</span>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                name="is_purchasable"
                                                checked={formData.is_purchasable}
                                                onChange={handleInputChange}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    <div className="toggle-item">
                                        <span className="toggle-label">Is Manufacturable</span>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                name="is_manufacturable"
                                                checked={formData.is_manufacturable}
                                                onChange={handleInputChange}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    <div className="toggle-item">
                                        <span className="toggle-label">Is Sellable</span>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                name="is_sellable"
                                                checked={formData.is_sellable}
                                                onChange={handleInputChange}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting}
                                style={{ width: '100%', marginTop: '8px' }}
                            >
                                {submitting ? 'Creating...' : 'Create Item'}
                            </button>
                        </form>
                    </div>

                    {/* Item Inventory Table - Right Panel */}
                    <div className="items-card">
                        <div className="items-card-header">
                            <h3 className="items-card-title">
                                <svg className="items-card-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                </svg>
                                Item Inventory
                            </h3>
                            <div style={{ marginTop: '12px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div className="filter-tabs">
                                        <button className={`filter-tab ${filterType === "all" ? "active" : ""}`} onClick={() => setFilterType("all")}>All</button>
                                        <button className={`filter-tab ${filterType === "raw_material" ? "active" : ""}`} onClick={() => setFilterType("raw_material")}>Raw Material</button>
                                        <button className={`filter-tab ${filterType === "sub_assembly" ? "active" : ""}`} onClick={() => setFilterType("sub_assembly")}>Sub Assembly</button>
                                        <button className={`filter-tab ${filterType === "finished_product" ? "active" : ""}`} onClick={() => setFilterType("finished_product")}>Finished Product</button>
                                        <button className={`filter-tab ${filterType === "consumable" ? "active" : ""}`} onClick={() => setFilterType("consumable")}>Consumable</button>
                                    </div>
                                    <div style={{ position: 'relative', width: '180px', height: '32px' }}>
                                        <svg
                                            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9ca3af' }}
                                            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                                        >
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <path d="m21 21-4.35-4.35"></path>
                                        </svg>
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            style={{
                                                width: '100%',
                                                height: '32px',
                                                padding: '6px 12px 6px 30px',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="items-table-wrapper">
                            <table className="items-inventory-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Code</th>
                                        <th>Type</th>
                                        <th>Unit</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                                Loading items...
                                            </td>
                                        </tr>
                                    ) : filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                                No items found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredItems.map(item => {
                                            const isActive = item.is_active !== false;
                                            return (
                                                <tr key={item.id} style={{ opacity: isActive ? 1 : 0.6 }}>
                                                    <td><strong>{item.name}</strong></td>
                                                    <td>{item.code || '-'}</td>
                                                    <td>{getTypeBadge(item)}</td>
                                                    <td>{item.unit}</td>
                                                    <td>
                                                        <span style={{ color: isActive ? '#16a34a' : '#6b7280', fontWeight: '500' }}>
                                                            {isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="items-actions">
                                                            <button
                                                                className="items-action-btn"
                                                                onClick={() => handleEditClick(item)}
                                                                style={{ background: 'white', color: '#2563eb', border: '1px solid #2563eb' }}
                                                            >
                                                                Edit
                                                            </button>
                                                            {item.item_type === "make" && (
                                                                <button
                                                                    className="items-action-btn"
                                                                    onClick={() => navigate(`/bommanagement?productId=${item.id}`)}
                                                                    style={{ background: '#16a34a', color: 'white', border: '1px solid #16a34a' }}
                                                                >
                                                                    BOM
                                                                </button>
                                                            )}
                                                            <button
                                                                className={`items-action-btn ${isActive ? 'deactivate' : ''}`}
                                                                onClick={() => handleToggleActive(item)}
                                                                style={!isActive ? { background: '#16a34a', color: 'white', borderColor: '#16a34a' } : {}}
                                                            >
                                                                {isActive ? 'Deactivate' : 'Activate'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Item Modal */}
            {editModalOpen && (
                <>
                    <div className="modal-overlay" onClick={closeEditModal} />
                    <div role="dialog" className="modal-content" style={{
                        position: 'fixed',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 51,
                        maxWidth: '42rem',
                    }}>
                        <div className="modal-header">
                            <h2 style={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
                                </svg>
                                {editingItem?.category?.toLowerCase() === 'consumable'
                                    ? "Edit Consumable"
                                    : editingItem?.item_type === "buy"
                                        ? "Edit Raw Material"
                                        : editingItem?.make_type === "final"
                                            ? "Edit Final Product"
                                            : "Edit Sub Assembly"}
                            </h2>
                        </div>

                        <form onSubmit={handleEditSubmit}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                {editingItem?.item_type === "buy" ? (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label className="form-label">Material Name *</label>
                                                <input name="name" value={editFormData.name} onChange={handleEditFormChange} className="form-input" required />
                                            </div>
                                            <div>
                                                <label className="form-label">Material Code</label>
                                                <input name="code" value={editFormData.code} onChange={handleEditFormChange} className="form-input" />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label className="form-label">Unit of Measure *</label>
                                                <input type="text" name="unit" value={editFormData.unit} onChange={handleEditFormChange} className="form-input" list="unit-suggestions-edit-buy" required />
                                                <datalist id="unit-suggestions-edit-buy">
                                                    {unitOptions.map(opt => <option key={opt} value={opt} />)}
                                                </datalist>
                                            </div>
                                            <div>
                                                <label className="form-label">Category</label>
                                                <input type="text" name="category" value={editFormData.category} onChange={handleEditFormChange} className="form-input" list="category-suggestions-edit" />
                                                <datalist id="category-suggestions-edit">
                                                    {categoryOptions.map(opt => <option key={opt} value={opt} />)}
                                                </datalist>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="form-label">Minimum Stock Level</label>
                                            <input type="number" name="minimum_stock" value={editFormData.minimum_stock} onChange={handleEditFormChange} className="form-input" min="0" />
                                        </div>

                                        {/* Item Properties - Read Only Toggle Switches */}
                                        <div style={{ marginTop: '1rem' }}>
                                            <label className="form-label" style={{ marginBottom: '10px' }}>Item Properties</label>
                                            <div className="toggle-group">
                                                <div className="toggle-item">
                                                    <span className="toggle-label">Can Have BOM</span>
                                                    <label className="toggle-switch">
                                                        <input
                                                            type="checkbox"
                                                            name="can_have_bom"
                                                            checked={editFormData.can_have_bom}
                                                            disabled
                                                            readOnly
                                                        />
                                                        <span className="toggle-slider" style={{ cursor: 'not-allowed', opacity: 0.7 }}></span>
                                                    </label>
                                                </div>

                                                <div className="toggle-item">
                                                    <span className="toggle-label">Is Purchasable</span>
                                                    <label className="toggle-switch">
                                                        <input
                                                            type="checkbox"
                                                            name="is_purchasable"
                                                            checked={editFormData.is_purchasable}
                                                            disabled
                                                            readOnly
                                                        />
                                                        <span className="toggle-slider" style={{ cursor: 'not-allowed', opacity: 0.7 }}></span>
                                                    </label>
                                                </div>

                                                <div className="toggle-item">
                                                    <span className="toggle-label">Is Manufacturable</span>
                                                    <label className="toggle-switch">
                                                        <input
                                                            type="checkbox"
                                                            name="is_manufacturable"
                                                            checked={editFormData.is_manufacturable}
                                                            disabled
                                                            readOnly
                                                        />
                                                        <span className="toggle-slider" style={{ cursor: 'not-allowed', opacity: 0.7 }}></span>
                                                    </label>
                                                </div>

                                                <div className="toggle-item">
                                                    <span className="toggle-label">Is Sellable</span>
                                                    <label className="toggle-switch">
                                                        <input
                                                            type="checkbox"
                                                            name="is_sellable"
                                                            checked={editFormData.is_sellable}
                                                            disabled
                                                            readOnly
                                                        />
                                                        <span className="toggle-slider" style={{ cursor: 'not-allowed', opacity: 0.7 }}></span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="form-label">Product Name *</label>
                                            <input name="name" value={editFormData.name} onChange={handleEditFormChange} className="form-input" required />
                                        </div>
                                        <div>
                                            <label className="form-label">Product Code</label>
                                            <input name="code" value={editFormData.code} onChange={handleEditFormChange} className="form-input" />
                                        </div>
                                        <div>
                                            <label className="form-label">Unit of Measure *</label>
                                            <input type="text" name="unit" value={editFormData.unit} onChange={handleEditFormChange} className="form-input" list="unit-suggestions-edit-make" required />
                                            <datalist id="unit-suggestions-edit-make">
                                                {unitOptions.map(opt => <option key={opt} value={opt} />)}
                                            </datalist>
                                        </div>
                                        <div>
                                            <label className="form-label">Minimum Stock Level</label>
                                            <input type="number" name="minimum_stock" value={editFormData.minimum_stock} onChange={handleEditFormChange} className="form-input" min="0" />
                                        </div>

                                        {/* Item Properties - Read Only Toggle Switches */}
                                        <div style={{ marginTop: '1rem' }}>
                                            <label className="form-label" style={{ marginBottom: '10px' }}>Item Properties</label>
                                            <div className="toggle-group">
                                                <div className="toggle-item">
                                                    <span className="toggle-label">Can Have BOM</span>
                                                    <label className="toggle-switch">
                                                        <input
                                                            type="checkbox"
                                                            name="can_have_bom"
                                                            checked={editFormData.can_have_bom}
                                                            disabled
                                                            readOnly
                                                        />
                                                        <span className="toggle-slider" style={{ cursor: 'not-allowed', opacity: 0.7 }}></span>
                                                    </label>
                                                </div>

                                                <div className="toggle-item">
                                                    <span className="toggle-label">Is Purchasable</span>
                                                    <label className="toggle-switch">
                                                        <input
                                                            type="checkbox"
                                                            name="is_purchasable"
                                                            checked={editFormData.is_purchasable}
                                                            disabled
                                                            readOnly
                                                        />
                                                        <span className="toggle-slider" style={{ cursor: 'not-allowed', opacity: 0.7 }}></span>
                                                    </label>
                                                </div>

                                                <div className="toggle-item">
                                                    <span className="toggle-label">Is Manufacturable</span>
                                                    <label className="toggle-switch">
                                                        <input
                                                            type="checkbox"
                                                            name="is_manufacturable"
                                                            checked={editFormData.is_manufacturable}
                                                            disabled
                                                            readOnly
                                                        />
                                                        <span className="toggle-slider" style={{ cursor: 'not-allowed', opacity: 0.7 }}></span>
                                                    </label>
                                                </div>

                                                <div className="toggle-item">
                                                    <span className="toggle-label">Is Sellable</span>
                                                    <label className="toggle-switch">
                                                        <input
                                                            type="checkbox"
                                                            name="is_sellable"
                                                            checked={editFormData.is_sellable}
                                                            disabled
                                                            readOnly
                                                        />
                                                        <span className="toggle-slider" style={{ cursor: 'not-allowed', opacity: 0.7 }}></span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button type="button" onClick={closeEditModal} className="btn btn-secondary">Cancel</button>
                                <button type="submit" disabled={updating} className="btn btn-primary">{updating ? 'Saving...' : 'Save Changes'}</button>
                            </div>
                        </form>

                        <button onClick={closeEditModal} className="modal-close">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

import React, { useState, useEffect } from "react";
import { productionService } from '../services';
import toast from '../utils/toast';

export default function ProductionCompletion() {
    const [productionOrders, setProductionOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        fetchProductionOrders();
    }, []);

    const fetchProductionOrders = async () => {
        try {
            setLoading(true);
            // Fetch all production completions
            const productions = await productionService.getAll();
            // Filter for pending production orders
            const pendingProduction = productions.filter(prod =>
                prod.status === 'pending'
            );
            setProductionOrders(pendingProduction);
        } catch (error) {
            console.error('Error fetching production orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async (order) => {
        const actualQty = order.planned_quantity || 1;

        try {
            // Update existing pending order to completed
            await productionService.update(order.id, {
                actual_quantity: actualQty
            });

            toast.success(`Production completed successfully! ${actualQty} units added to inventory.`);

            // Refresh the list - completed order will disappear
            fetchProductionOrders();
        } catch (error) {
            console.error('Error completing production:', error);
            toast.error('Failed to complete production. Please try again.');
        }
    };

    const handleViewDetails = async (order) => {
        try {
            // Fetch BOM items if bom_id exists
            let materials = [];
            let totalCost = 0;

            if (order.bom_id) {
                const bomResponse = await fetch(`http://localhost:5001/api/bom/${order.bom_id}`);
                if (bomResponse.ok) {
                    const bomData = await bomResponse.json();
                    materials = bomData.items || [];

                    // Calculate total cost
                    totalCost = materials.reduce((sum, item) => {
                        const quantity = item.quantity * (order.planned_quantity || 1);
                        const cost = quantity * (item.cost || 0);
                        return sum + cost;
                    }, 0);
                }
            }

            setSelectedOrder({
                ...order,
                materials,
                totalCost
            });
            setIsModalOpen(true);
        } catch (error) {
            console.error('Error fetching order details:', error);
            // Still show modal with basic info
            setSelectedOrder(order);
            setIsModalOpen(true);
        }
    };

    return (
        <>
            <header className="main-header">
                <div className="main-title">
                    <h1 className="text-3xl font-bold text-gray-900">Production Completion</h1>
                    <p className="text-lg font-medium text-gray-600">Mark production orders as complete to update inventory</p>
                </div>
            </header>

            <div className="rounded-xl border bg-card text-card-foreground shadow-xl" style={{ backgroundColor: 'var(--surface)' }}>
                <div className="flex flex-col space-y-1.5 p-6 border-b" style={{ borderColor: 'rgb(224, 224, 224)' }}>
                    <div className="flex items-center gap-2 active-production-orders-heading">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-hammer w-6 h-6" style={{ color: 'var(--primary)' }}>
                            <path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"></path>
                            <path d="m18 15 4-4"></path>
                            <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"></path>
                        </svg>
                        Active Production Orders
                    </div>
                </div>
                <div className="p-0">
                    <div className="overflow-x-auto">
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted" style={{ backgroundColor: 'var(--background)' }}>
                                        <th className="h-10 px-2 text-left align-middle font-bold text-gray-700">Issue ID</th>
                                        <th className="h-10 px-2 text-left align-middle font-bold text-gray-700">Final Product</th>
                                        <th className="h-10 px-2 text-left align-middle font-bold text-gray-700">Planned</th>
                                        <th className="h-10 px-2 text-left align-middle font-bold text-gray-700">Date</th>
                                        <th className="h-10 px-2 align-middle font-bold text-gray-700 text-center">Details</th>
                                        <th className="h-10 px-2 align-middle font-bold text-gray-700 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="p-4 text-center text-gray-600">
                                                Loading production orders...
                                            </td>
                                        </tr>
                                    ) : productionOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-4 text-center text-gray-600">
                                                No active production orders. Create one from Material Issue page.
                                            </td>
                                        </tr>
                                    ) : (
                                        productionOrders.map((order) => {
                                            const plannedQty = order.planned_quantity || 1;
                                            return (
                                                <tr key={order.id} className="border-b transition-colors hover:bg-muted/50">
                                                    <td className="p-2 align-middle font-medium text-gray-800">
                                                        PROD-{order.id}
                                                    </td>
                                                    <td className="p-2 align-middle text-gray-800">
                                                        {order.product_name || 'Unknown Product'}
                                                    </td>
                                                    <td className="p-2 align-middle text-gray-800">
                                                        {plannedQty} units
                                                    </td>
                                                    <td className="p-2 align-middle text-gray-800">
                                                        {new Date(order.created_at || order.completion_date).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-2 align-middle text-center">
                                                        <button
                                                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none h-8 rounded-md px-3 text-xs border border-gray-300 hover:bg-gray-50"
                                                            onClick={() => handleViewDetails(order)}
                                                        >
                                                            Details
                                                        </button>
                                                    </td>
                                                    <td className="p-2 align-middle text-center">
                                                        <button
                                                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none h-8 rounded-md px-3 text-xs border border-black hover:opacity-80"
                                                            style={{ backgroundColor: 'var(--success)', color: '#000' }}
                                                            onClick={() => handleComplete(order)}
                                                        >
                                                            Complete
                                                        </button>
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

            {/* Details Modal */}
            {isModalOpen && selectedOrder && (
                <>
                    <style>{`
                        .modal-overlay {
                            position: fixed;
                            inset: 0;
                            background: rgba(0, 0, 0, 0.5);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            z-index: 50;
                            padding: 1rem;
                            backdrop-filter: blur(4px);
                        }

                        .modal-content {
                            background: white;
                            border-radius: 16px;
                            max-width: 42rem;
                            width: 100%;
                            max-height: 90vh;
                            overflow-y: auto;
                            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                            animation: modalSlideIn 0.2s ease-out;
                        }

                        @keyframes modalSlideIn {
                            from {
                                opacity: 0;
                                transform: translateY(-20px) scale(0.95);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0) scale(1);
                            }
                        }

                        .modal-header {
                            padding: 1.5rem;
                            border-bottom: 1px solid #e5e7eb;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                        }

                        .modal-header h2 {
                            font-size: 1.5rem;
                            font-weight: 600;
                            color: #1e293b;
                            display: flex;
                            align-items: center;
                            gap: 0.75rem;
                        }

                        .modal-close-btn {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            width: 2rem;
                            height: 2rem;
                            border-radius: 0.5rem;
                            border: none;
                            background: transparent;
                            cursor: pointer;
                            transition: all 0.2s;
                            color: #6b7280;
                        }

                        .modal-close-btn:hover {
                            background: #f3f4f6;
                            color: #1e293b;
                        }

                        .modal-body {
                            padding: 1.5rem;
                        }

                        .info-card {
                            background: #f9fafb;
                            border: 1px solid #e5e7eb;
                            border-radius: 12px;
                            padding: 1.5rem;
                            margin-bottom: 1.5rem;
                        }

                        .info-card h3 {
                            font-size: 1rem;
                            font-weight: 600;
                            color: #374151;
                            margin-bottom: 1rem;
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                        }

                        .info-grid {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 1rem;
                        }

                        .info-item {
                            display: flex;
                            flex-direction: column;
                            gap: 0.25rem;
                        }

                        .info-label {
                            font-size: 0.75rem;
                            font-weight: 600;
                            color: #6b7280;
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                        }

                        .info-value {
                            font-size: 0.9375rem;
                            font-weight: 500;
                            color: #1e293b;
                        }

                        .status-badge {
                            display: inline-flex;
                            align-items: center;
                            padding: 0.25rem 0.75rem;
                            border-radius: 9999px;
                            font-size: 0.75rem;
                            font-weight: 600;
                            text-transform: capitalize;
                        }

                        .status-badge.pending {
                            background: #fef3c7;
                            color: #92400e;
                        }

                        .materials-table-wrapper {
                            margin-top: 1rem;
                            overflow-x: auto;
                        }

                        .materials-table {
                            width: 100%;
                            border-collapse: collapse;
                            background: white;
                            border-radius: 8px;
                            overflow: hidden;
                        }

                        .materials-table thead {
                            background: #f3f4f6;
                        }

                        .materials-table th {
                            padding: 0.75rem 1rem;
                            text-align: left;
                            font-size: 0.75rem;
                            font-weight: 600;
                            color: #6b7280;
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                            border-bottom: 2px solid #e5e7eb;
                        }

                        .materials-table td {
                            padding: 0.875rem 1rem;
                            font-size: 0.875rem;
                            color: #374151;
                            border-bottom: 1px solid #f3f4f6;
                        }

                        .materials-table tbody tr:last-child td {
                            border-bottom: none;
                        }

                        .materials-table tbody tr:hover {
                            background: #f9fafb;
                        }

                        .material-name {
                            font-weight: 600;
                            color: #1e293b;
                        }

                        .cost-value {
                            font-weight: 600;
                            color: #059669;
                        }

                        .cost-summary-card {
                            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                            border-color: #059669;
                        }

                        .cost-breakdown {
                            margin-top: 1rem;
                        }

                        .cost-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 0.75rem 0;
                            border-bottom: 1px solid rgba(5, 150, 105, 0.1);
                        }

                        .cost-row:last-child {
                            border-bottom: none;
                        }

                        .cost-label {
                            font-size: 0.875rem;
                            font-weight: 500;
                            color: #374151;
                        }

                        .cost-total {
                            font-size: 1.25rem;
                            font-weight: 700;
                            color: #059669;
                        }

                       .cost-per-unit {
                            font-size: 1rem;
                            font-weight: 600;
                            color: #059669;
                        }

                        .notes-content {
                            margin-top: 0.75rem;
                            padding: 1rem;
                            background: white;
                            border-radius: 8px;
                            font-size: 0.875rem;
                            color: #374151;
                            line-height: 1.6;
                        }
                    `}</style>

                    <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"></path>
                                        <path d="m18 15 4-4"></path>
                                        <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"></path>
                                    </svg>
                                    Production Order Details
                                </h2>
                                <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>

                            <div className="modal-body">
                                <div className="info-card">
                                    <h3>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="16" x2="12" y2="12"></line>
                                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                        </svg>
                                        General Information
                                    </h3>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <span className="info-label">Production ID</span>
                                            <span className="info-value">PROD-{selectedOrder.id}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Status</span>
                                            <span className="status-badge pending">{selectedOrder.status}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Final Product</span>
                                            <span className="info-value">{selectedOrder.product_name || 'Unknown Product'}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Planned Quantity</span>
                                            <span className="info-value">{selectedOrder.planned_quantity || 1} units</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Created Date</span>
                                            <span className="info-value">
                                                {new Date(selectedOrder.created_at || selectedOrder.completion_date).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Created Time</span>
                                            <span className="info-value">
                                                {new Date(selectedOrder.created_at || selectedOrder.completion_date).toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Materials Used */}
                                {selectedOrder.materials && selectedOrder.materials.length > 0 && (
                                    <div className="info-card">
                                        <h3>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"></path>
                                                <path d="m7 16.5-4.74-2.85"></path>
                                                <path d="m7 16.5 5-3"></path>
                                                <path d="M7 16.5v5.17"></path>
                                                <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"></path>
                                                <path d="m17 16.5-5-3"></path>
                                                <path d="m17 16.5 4.74-2.85"></path>
                                                <path d="M17 16.5v5.17"></path>
                                                <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"></path>
                                                <path d="M12 8 7.26 5.15"></path>
                                                <path d="m12 8 4.74-2.85"></path>
                                                <path d="M12 13.5V8"></path>
                                            </svg>
                                            Materials Used
                                        </h3>
                                        <div className="materials-table-wrapper">
                                            <table className="materials-table">
                                                <thead>
                                                    <tr>
                                                        <th>Material Name</th>
                                                        <th style={{ textAlign: 'right' }}>Qty per Unit</th>
                                                        <th style={{ textAlign: 'right' }}>Total Qty</th>
                                                        <th style={{ textAlign: 'right' }}>Unit Cost</th>
                                                        <th style={{ textAlign: 'right' }}>Total Cost</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedOrder.materials.map((material, index) => {
                                                        const totalQty = material.quantity * (selectedOrder.planned_quantity || 1);
                                                        const totalCost = totalQty * (material.cost || 0);
                                                        return (
                                                            <tr key={index}>
                                                                <td className="material-name">{material.material_name}</td>
                                                                <td style={{ textAlign: 'right' }}>{material.quantity} {material.unit}</td>
                                                                <td style={{ textAlign: 'right' }}>{totalQty.toFixed(2)} {material.unit}</td>
                                                                <td style={{ textAlign: 'right' }}>₹{material.cost?.toFixed(2) || '0.00'}</td>
                                                                <td style={{ textAlign: 'right' }} className="cost-value">₹{totalCost.toFixed(2)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Cost Summary */}
                                {selectedOrder.totalCost !== undefined && selectedOrder.totalCost > 0 && (
                                    <div className="info-card cost-summary-card">
                                        <h3>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                            </svg>
                                            Cost Summary
                                        </h3>
                                        <div className="cost-breakdown">
                                            <div className="cost-row">
                                                <span className="cost-label">Total Material Cost:</span>
                                                <span className="cost-total">₹{selectedOrder.totalCost.toFixed(2)}</span>
                                            </div>
                                            <div className="cost-row">
                                                <span className="cost-label">Cost per Unit:</span>
                                                <span className="cost-per-unit">
                                                    ₹{(selectedOrder.totalCost / (selectedOrder.planned_quantity || 1)).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Notes/Additional Materials */}
                                {selectedOrder.notes && (
                                    <div className="info-card">
                                        <h3>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                                <line x1="10" y1="9" x2="8" y2="9"></line>
                                            </svg>
                                            Additional Notes
                                        </h3>
                                        <div className="notes-content">
                                            {selectedOrder.notes}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}



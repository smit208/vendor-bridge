import React, { useState, useEffect, useRef } from "react";
import { dispatchService, rawMaterialsService, finalProductsService, approvalsService } from '../services';
import { animateButtonClick } from '../utils/modalAnimations';
import CustomDropdown from '../components/CustomDropdown';
import toast from '../utils/toast';

export default function Dispatch() {
    const [showHistory, setShowHistory] = useState(false);
    const [dispatchHistory, setDispatchHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const historyButtonRef = useRef(null);

    const fetchDispatchHistory = async () => {
        try {
            setLoading(true);
            // Fetch both approved dispatches and all dispatch approval requests (including rejected)
            const [dispatches, approvals] = await Promise.all([
                dispatchService.getAll(),
                approvalsService.getAll({ request_type: 'dispatch' })
            ]);

            // Convert approval requests to dispatch format
            const approvalDispatches = approvals.map(approval => ({
                id: approval.id,
                dispatch_number: `DISP-${approval.id}`,
                dispatch_type: approval.request_data?.dispatch_type || 'dispatch to customer',
                item_name: approval.item_name,
                quantity: approval.quantity,
                unit: approval.unit,
                status: approval.status, // 'pending', 'approved', or 'rejected'
                dispatch_date: approval.created_at,
                created_at: approval.created_at
            }));

            // Merge and sort by date (most recent first)
            const allDispatches = [...dispatches, ...approvalDispatches]
                .sort((a, b) => new Date(b.dispatch_date || b.created_at) - new Date(a.dispatch_date || a.created_at));

            setDispatchHistory(allDispatches);
        } catch (error) {
            console.error('Error fetching dispatch history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleHistoryClick = () => {
        if (historyButtonRef.current) {
            animateButtonClick(historyButtonRef.current);
        }
        if (!showHistory) {
            fetchDispatchHistory();
        }
        setShowHistory(!showHistory);
    };
    return (
        <>
            <header className="main-header">
                <div className="main-title">
                    <h1>Dispatch</h1>
                    <p>Record materials and products leaving the store</p>
                </div>
                <button
                    ref={historyButtonRef}
                    onClick={handleHistoryClick}
                    className="ghost-btn history-link"
                    style={{
                        width: "146.3px",
                        height: "36px",
                        boxSizing: "border-box",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 30 30"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-history w-4 h-4 mr-2"
                        ariaHidden="true"
                    >
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                        <path d="M12 7v5l4 2"></path>
                    </svg>
                    {showHistory ? 'Hide History' : 'View History'}
                </button>
            </header>
            {showHistory ? <DispatchHistory dispatches={dispatchHistory} loading={loading} /> : <DispatchForm />}
        </>
    );
}

const DispatchHistory = ({ dispatches, loading }) => {
    const getStatusStyles = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return { backgroundColor: '#dcfce7', color: '#15803d' };
            case 'rejected':
                return { backgroundColor: '#fee2e2', color: '#991b1b' };
            case 'pending':
                return { backgroundColor: '#fef9c3', color: '#854d0e' };
            default:
                return { backgroundColor: '#f3f4f6', color: '#374151' };
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <div className="flex items-center gap-2 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" style={{ color: 'var(--primary)' }}>
                    <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"></path>
                    <path d="m21.854 2.147-10.94 10.939"></path>
                </svg>
                <h2 className="text-xl font-semibold">Recent Dispatch Entries</h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Dispatch ID</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Item</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Quantity</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="text-center py-8 text-gray-600">
                                    Loading dispatch history...
                                </td>
                            </tr>
                        ) : dispatches.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center py-8 text-gray-600">
                                    No dispatch entries found
                                </td>
                            </tr>
                        ) : (
                            dispatches.map((dispatch) => (
                                <tr key={dispatch.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4 font-medium text-gray-900">
                                        OUT-{dispatch.dispatch_number || dispatch.id}
                                    </td>
                                    <td className="py-3 px-4 text-gray-700">
                                        {dispatch.dispatch_type || 'dispatch to customer'}
                                    </td>
                                    <td className="py-3 px-4 text-gray-700">
                                        {dispatch.item_name || 'N/A'}
                                    </td>
                                    <td className="py-3 px-4 text-gray-700">
                                        {dispatch.quantity} {dispatch.unit}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span
                                            className="inline-block px-3 py-1 rounded-md text-sm font-medium"
                                            style={getStatusStyles(dispatch.status)}
                                        >
                                            {dispatch.status || 'completed'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-gray-700">
                                        {new Date(dispatch.dispatch_date || dispatch.created_at).toLocaleDateString('en-GB')}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const DispatchForm = () => {
    const [dispatchType, setDispatchType] = useState('');
    const [referenceDoc, setReferenceDoc] = useState('');
    const [receiverName, setReceiverName] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [itemType, setItemType] = useState('raw_material');
    const [selectedItem, setSelectedItem] = useState('');
    const [quantity, setQuantity] = useState('');
    const [costPerUnit, setCostPerUnit] = useState('');
    const [vehicleInfo, setVehicleInfo] = useState('');
    const [remarks, setRemarks] = useState('');

    const [rawMaterials, setRawMaterials] = useState([]);
    const [finalProducts, setFinalProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const [rawMats, finalProds] = await Promise.all([
                rawMaterialsService.getAll(),
                finalProductsService.getAll()
            ]);
            setRawMaterials(rawMats);
            setFinalProducts(finalProds);
        } catch (error) {
            console.error('Error fetching items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!dispatchType || !itemType || !selectedItem || !quantity) {
            toast.warning('Please fill all required fields');
            return;
        }

        try {
            setSubmitting(true);

            const items = itemType === 'raw_material' ? rawMaterials : finalProducts;
            const item = items.find(i => i.id == selectedItem);

            const dispatchData = {
                dispatch_type: dispatchType,
                reference_document: referenceDoc,
                receiver_name: receiverName,
                delivery_address: deliveryAddress,
                item_type: itemType,
                item_id: selectedItem,
                item_name: item?.name,
                quantity: parseInt(quantity),
                unit: item?.unit,
                cost_per_unit: costPerUnit ? parseFloat(costPerUnit) : null,
                vehicle_info: vehicleInfo,
                remarks: remarks
            };

            console.log('🚀 Sending dispatch data:', dispatchData);

            await dispatchService.create(dispatchData);

            toast.success('Dispatch recorded successfully!');

            // Reset form
            setDispatchType('');
            setReferenceDoc('');
            setReceiverName('');
            setDeliveryAddress('');
            setSelectedItem('');
            setQuantity('');
            setCostPerUnit('');
            setVehicleInfo('');
            setRemarks('');
        } catch (error) {
            console.error('Error recording dispatch:', error);
            toast.error('Failed to record dispatch. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const currentItems = itemType === 'raw_material' ? rawMaterials : finalProducts;

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex flex-col space-y-1.5 p-6" style={{ borderColor: "rgb(224, 224, 224)" }}>
                <div className="font-semibold leading-none tracking-tight flex items-center gap-2" style={{ position: "relative", right: "24px", bottom: "24px" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send w-6 h-6" style={{ color: "var(--secondary)" }}>
                        <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"></path>
                        <path d="m21.854 2.147-10.94 10.939"></path>
                    </svg>
                    New Dispatch Entry
                </div>
            </div>
            <hr className="mb-4" style={{ marginTop: "-1.5rem", marginBottom: "1.5rem" }} />
            <form onSubmit={handleSubmit}>
                <div className="mb-7">
                    <CustomDropdown
                        label="Dispatch Type *"
                        value={dispatchType ? 'Customer Order' : "Select dispatch type"}
                        onChange={(val) => {
                            const typeMap = { "Select dispatch type": "", "Customer Order": "customer_order" };
                            setDispatchType(typeMap[val]);
                        }}
                        options={["Select dispatch type", "Customer Order"]}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-7">
                    <div>
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2.5 block">Reference Document</label>
                        <input
                            type="text"
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-12 shadow-sm"
                            placeholder="Invoice, dispatch note, or approval ID"
                            value={referenceDoc}
                            onChange={(e) => setReferenceDoc(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2.5 block">Customer / Receiver Name</label>
                        <input
                            type="text"
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-12 shadow-sm"
                            placeholder="Enter receiver name"
                            value={receiverName}
                            onChange={(e) => setReceiverName(e.target.value)}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-7">
                    <div>
                        <CustomDropdown
                            label="Item Type *"
                            value={itemType === 'raw_material' ? 'Raw Material' : 'Final Product'}
                            onChange={(val) => {
                                setItemType(val === 'Raw Material' ? 'raw_material' : 'final_product');
                                setSelectedItem('');
                            }}
                            options={["Raw Material", "Final Product"]}
                        />
                    </div>
                    <div>
                        <CustomDropdown
                            label="Item *"
                            value={selectedItem ? currentItems.find(i => i.id == selectedItem)?.name + ' (' + currentItems.find(i => i.id == selectedItem)?.current_stock + ' ' + currentItems.find(i => i.id == selectedItem)?.unit + ' available)' : "Select item"}
                            onChange={(val) => {
                                if (val === "Select item") {
                                    setSelectedItem('');
                                } else {
                                    const item = currentItems.find(i => i.name + ' (' + i.current_stock + ' ' + i.unit + ' available)' === val);
                                    if (item) setSelectedItem(item.id);
                                }
                            }}
                            options={["Select item", ...currentItems.map(item => item.name + ' (' + item.current_stock + ' ' + item.unit + ' available)')]}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-7">
                    <div>
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2.5 block">Quantity *</label>
                        <input
                            type="number"
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-12 shadow-sm"
                            placeholder="Enter quantity"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            min="1"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2.5 block">Selling Price Per Unit (₹)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-12 shadow-sm"
                            placeholder="Selling price per unit"
                            value={costPerUnit}
                            onChange={(e) => setCostPerUnit(e.target.value)}
                            min="0"
                        />
                    </div>
                </div>
                <div className="mb-7">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2.5 block">Vehicle / Transport Info</label>
                    <input
                        type="text"
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-12 shadow-sm"
                        placeholder="Vehicle number or transport details"
                        value={vehicleInfo}
                        onChange={(e) => setVehicleInfo(e.target.value)}
                    />
                </div>
                <div className="mb-7">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2.5 block">Drop Point</label>
                    <textarea
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-20 shadow-sm"
                        placeholder="Enter drop point"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                    ></textarea>
                </div>
                <div className="mb-7">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2.5 block">Remarks / Reason</label>
                    <textarea
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-24 shadow-sm"
                        placeholder="Additional notes or reason for dispatch"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                    ></textarea>
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-500 text-white rounded-lg p-2 hover:bg-blue-600 transition"
                    disabled={submitting}
                >
                    {submitting ? 'Recording...' : 'Record Dispatch'}
                </button>
            </form>
        </div>
    );
};

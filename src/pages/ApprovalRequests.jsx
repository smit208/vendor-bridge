import React, { useState, useEffect } from "react";
import { approvalsService } from '../services';
import toast from '../utils/toast';
import PODocumentPreview from '../components/PODocumentPreview';

const API = import.meta.env.VITE_API_URL || 'https://fims-dashboard.onrender.com/api';
const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});
const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) !== 1 ? 's' : ''} ago`;
};
const fmtAmount = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function ApprovalRequests() {
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // PO Pending Approvals state
  const [pos, setPos] = useState([]);
  const [poLoading, setPoLoading] = useState(true);
  const [poActing, setPoActing] = useState(null);
  const [poRejectModal, setPoRejectModal] = useState(null);
  const [poRejectReason, setPoRejectReason] = useState('');
  const [poViewModal, setPoViewModal] = useState(null);
  const [poViewLoading, setPoViewLoading] = useState(false);

  // Cancellation Requests state
  const [cancelPos, setCancelPos] = useState([]);
  const [cancelLoading, setCancelLoading] = useState(true);
  const [cancelActing, setCancelActing] = useState(null);
  const [cancelViewMode, setCancelViewMode] = useState(false); // true when view modal opened from cancellation section

  useEffect(() => {
    fetchApprovals();
    fetchPendingPOs();
    fetchCancellationRequests();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const approvals = await approvalsService.getAll({ status: 'pending' });
      setApprovalRequests(approvals);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCancellationRequests = async () => {
    try {
      setCancelLoading(true);
      const res = await fetch(`${API}/purchase-orders?status=cancellation_requested`, { headers: getAuthHeaders() });
      if (res.ok) {
        const json = await res.json();
        setCancelPos(Array.isArray(json) ? json : (json.data || []));
      }
    } catch { /* silent */ } finally { setCancelLoading(false); }
  };

  const fetchPendingPOs = async () => {
    try {
      setPoLoading(true);
      const res = await fetch(`${API}/purchase-orders/pending`, { headers: getAuthHeaders() });
      if (res.ok) {
        const json = await res.json();
        setPos(Array.isArray(json) ? json : (json.data || []));
      } else {
        const res2 = await fetch(`${API}/purchase-orders`, { headers: getAuthHeaders() });
        const json2 = await res2.json();
        const all = Array.isArray(json2) ? json2 : (json2.data || []);
        setPos(all.filter(p => p.status === 'pending_approval'));
      }
    } catch {
      toast.error('Failed to load pending PO approvals');
    } finally { setPoLoading(false); }
  };

  const openPoView = async (po, fromCancellation = false) => {
    setCancelViewMode(fromCancellation);
    setPoViewModal({ ...po, items: [] });
    setPoViewLoading(true);
    try {
      const res = await fetch(`${API}/purchase-orders/${po.id}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const full = await res.json();
        setPoViewModal(full);
      }
    } catch { /* keep summary data */ } finally { setPoViewLoading(false); }
  };

  const handlePoApprove = async (id) => {
    setPoActing(id);
    try {
      await fetch(`${API}/purchase-orders/${id}/status`, {
        method: 'PATCH', headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'approved' }),
      });
      toast.success('PO approved!');
      fetchPendingPOs();
    } catch { toast.error('Failed to approve'); } finally { setPoActing(null); }
  };

  const handlePoRejectSubmit = async () => {
    if (!poRejectModal) return;
    setPoActing(poRejectModal.id);
    try {
      await fetch(`${API}/purchase-orders/${poRejectModal.id}/status`, {
        method: 'PATCH', headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'rejected', rejection_reason: poRejectReason }),
      });
      toast.success('PO rejected');
      setPoRejectModal(null); setPoRejectReason('');
      fetchPendingPOs();
    } catch { toast.error('Failed to reject'); } finally { setPoActing(null); }
  };

  const handleCancelApprove = async (id) => {
    setCancelActing(id);
    try {
      await fetch(`${API}/purchase-orders/${id}/status`, {
        method: 'PATCH', headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'cancelled' }),
      });
      toast.success('PO cancelled successfully');
      fetchCancellationRequests();
    } catch { toast.error('Failed to approve cancellation'); } finally { setCancelActing(null); }
  };

  const handleCancelDeny = async (id) => {
    setCancelActing(id);
    try {
      await fetch(`${API}/purchase-orders/${id}/status`, {
        method: 'PATCH', headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'approved' }),
      });
      toast.success('Cancellation request denied — PO restored to Approved');
      fetchCancellationRequests();
    } catch { toast.error('Failed to deny cancellation'); } finally { setCancelActing(null); }
  };

  const handleApprove = async (requestId) => {
    try {
      await approvalsService.approve(requestId);
      toast.success('Approval successful! Stock has been adjusted.');
      fetchApprovals(); // Refresh the list
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request. Please try again.');
    }
  };

  const handleRejectClick = (request) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest) return;

    try {
      await approvalsService.reject(selectedRequest.id, rejectionReason);
      toast.success('Request rejected successfully.');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchApprovals(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request. Please try again.');
    }
  };

  const handleCancelReject = () => {
    setShowRejectModal(false);
    setSelectedRequest(null);
    setRejectionReason('');
  };

  // Separate void requests from other requests
  const voidRequests = approvalRequests.filter(req => req.request_type === 'transaction_void');
  const stockAdjustmentRequests = approvalRequests.filter(req => req.request_type !== 'transaction_void');
  const pendingCount = approvalRequests.length;
  const voidCount = voidRequests.length;
  const adjustmentCount = stockAdjustmentRequests.length;

  return (
    <>
      <header className="main-header approval-header">
        <div className="main-title">
          <h1>Approval Requests</h1>
          <p>Review and approve or reject pending requests - stock will be automatically adjusted upon approval</p>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock h-8 w-8 text-orange-500"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <div>
            <p className="text-sm text-gray-600">Pending Requests</p>
            <p className="text-2xl font-bold text-orange-500">{pendingCount}</p>
          </div>
        </div>
      </header>

      {/* Transaction Void Requests Section */}
      {voidCount > 0 && (
        <section className="approval-section mb-8">
          <div className="approval-card rounded-lg border border-gray-200 shadow-lg">
            <div className="approval-card-header">
              <div className="font-semibold leading-none tracking-tight flex items-center gap-2 mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2 h-6 w-6 text-red-600">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  <line x1="10" x2="10" y1="11" y2="17"></line>
                  <line x1="14" x2="14" y1="11" y2="17"></line>
                </svg>
                Transaction Void Requests ({voidCount})
              </div>
            </div>
            <hr className="approval-divider mt-[6px]" />

            <div className="approval-list">
              {voidRequests.map((request) => {
                let details = {};
                try {
                  details = typeof request.details === 'string' ? JSON.parse(request.details) : (request.details || {});
                } catch (e) {
                  console.error('Error parsing details:', e);
                }

                const requestData = details.request_data || {};
                const transactionDetails = requestData.transaction_details || {};
                const voidReason = requestData.void_reason || request.notes || 'No reason provided';

                return (
                  <div key={request.id} className="rounded-lg border-2 border-red-200 bg-red-50 p-6 shadow-md transition-all duration-200 hover:shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold">
                            ADD-PROD-{request.transaction_id || request.id}
                          </h3>
                          <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold shadow bg-red-500 text-white">
                            VOID REQUEST
                          </div>
                        </div>
                        <p className="text-sm mb-1 text-gray-600"><span className="font-medium">Requested by:</span> {request.requested_by_name || `User #${request.requested_by}`}</p>
                        <p className="text-sm mb-1 text-gray-600"><span className="font-medium">Request Date:</span> {new Date(request.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                        <p className="text-sm mb-1 text-gray-600"><span className="font-medium">Transaction Type:</span> {request.transaction_type?.toUpperCase().replace('_', ' ') || 'N/A'}</p>
                        <p className="text-sm mb-1 text-gray-600"><span className="font-medium">Original Transaction Date:</span> {transactionDetails.created_at ? new Date(transactionDetails.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}</p>
                      </div>
                    </div>

                    <div className="mb-4 rounded bg-white p-4">
                      <div className="mb-3 rounded bg-red-100 p-3">
                        <p className="mb-1 text-sm font-medium text-red-800">Reason for Void Request:</p>
                        <p className="text-sm text-red-800">{voidReason}</p>
                      </div>
                    </div>

                    <div role="alert" className="relative w-full rounded-lg px-4 py-3 text-sm mb-4 border-2 border-green-500 bg-green-50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-check h-5 w-5 text-green-600" style={{ position: 'absolute', left: '16px', top: '12px' }}>
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="m9 12 2 2 4-4"></path>
                      </svg>
                      <div className="text-sm text-green-900" style={{ paddingLeft: '28px' }}>
                        <strong>Automatic Stock Reversal:</strong> Upon approval, the system will automatically reverse the stock changes from the original transaction (material issue).
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-4 py-2 flex-1 bg-green-600 text-white shadow-md hover:bg-green-700"
                        onClick={() => handleApprove(request.id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-check mr-2 h-4 w-4">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="m9 12 2 2 4-4"></path>
                        </svg>
                        Approve & Reverse Stock
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-4 py-2 flex-1 border-2 border-red-600 text-red-600 shadow-md hover:bg-red-50"
                        onClick={() => handleRejectClick(request)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-x mr-2 h-4 w-4">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="m15 9-6 6"></path>
                          <path d="m9 9 6 6"></path>
                        </svg>
                        Reject Request
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Stock Adjustment Requests Section */}
      <section className="approval-section">
        <div className="approval-card rounded-lg border border-gray-200 shadow-lg">
          <div className="approval-card-header">
            <div className="font-semibold leading-none tracking-tight flex items-center gap-2 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard-pen h-6 w-6 text-blue-600">
                <rect width="8" height="4" x="8" y="2" rx="1"></rect>
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5.5"></path>
                <path d="M4 13.5V6a2 2 0 0 1 2-2h2"></path>
                <path d="M13.378 15.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"></path>
              </svg>
              Stock Adjustment Requests ({adjustmentCount})
            </div>
          </div>
          <hr className="approval-divider mt-[6px]" />

          <div className="approval-list">
            {loading ? (
              <div className="p-8 text-center text-gray-600">
                Loading approval requests...
              </div>
            ) : stockAdjustmentRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                No pending adjustment requests
              </div>
            ) : (
              stockAdjustmentRequests.map((request) => {
                // Parse details if it exists
                let details = {};
                try {
                  details = typeof request.details === 'string' ? JSON.parse(request.details) : (request.details || {});
                } catch (e) {
                  console.error('Error parsing details:', e);
                }

                const requestData = details.request_data || request.request_data || {};
                const isDispatch = request.request_type === 'dispatch';
                const isCorrection = request.request_type === 'inventory_correction';
                const isReconciliation = request.request_type === 'inventory_reconciliation';
                const isAdditionalMaterial = request.request_type === 'additional_material_issue';

                // Handle additional material issue requests differently
                if (isAdditionalMaterial) {
                  const materials = requestData.materials || [];
                  const totalQuantity = materials.reduce((sum, m) => sum + (m.quantity || 0), 0);

                  return (
                    <div key={request.id} className="rounded-lg border-2 border-orange-300 bg-orange-50 p-6 shadow-md transition-all duration-200 hover:shadow-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold">
                              ADD-PROD-{request.production_order_number || request.id}
                            </h3>
                            <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold shadow bg-orange-500 text-white">
                              ADDITIONAL TO PRODUCTION
                            </div>
                          </div>
                          <p className="text-sm mb-1 text-gray-600"><span className="font-medium">Storekeeper:</span> {request.requested_by_name || `User #${request.requested_by}`}</p>
                          <p className="text-sm mb-1 text-gray-600"><span className="font-medium">Date:</span> {new Date(request.created_at).toLocaleString()}</p>
                          <p className="text-sm mb-1 text-gray-600"><span className="font-medium">Production Order:</span> {details.production_order_number || requestData.production_order_number || 'N/A'}</p>
                          <p className="text-sm mb-1 text-gray-600"><span className="font-medium">Product:</span> {request.product_name || details.product_name || requestData.product_name || details.item_name || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="mb-4 rounded bg-white p-4">
                        <p className="text-sm font-medium mb-3 text-gray-700">Materials to Issue:</p>
                        {materials.map((material, index) => (
                          <div key={index} className="mb-2 pb-2 border-b border-gray-200 last:border-0 flex justify-between">
                            <p className="font-medium">{material.material_name}</p>
                            <p className="text-lg font-bold text-purple-600">{material.quantity} {material.unit}</p>
                          </div>
                        ))}

                        <div className="mt-3 rounded bg-orange-100 p-3">
                          <p className="mb-1 text-sm font-medium text-orange-800">Reason:</p>
                          <p className="text-sm text-orange-800">{requestData.reason || 'No reason provided'}</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button className="flex-1 bg-green-600 text-white shadow-md hover:bg-green-700 px-4 py-2 rounded-md font-medium" onClick={() => handleApprove(request.id)}>
                          Approve & Reserve Stock
                        </button>
                        <button className="flex-1 border-2 border-red-600 text-red-600 shadow-md hover:bg-red-50 px-4 py-2 rounded-md font-medium" onClick={() => handleRejectClick(request)}>
                          Reject Request
                        </button>
                      </div>
                    </div>
                  );
                }

                // Get item name and quantity from correct location
                const itemName = details.item_name || request.item_name || 'N/A';
                const quantity = details.quantity || request.quantity || 0;
                const unit = details.unit || request.unit || 'units';
                const itemType = details.item_type || request.item_type || 'raw_material';

                // Determine adjustment type and sign for inventory corrections/reconciliations
                const adjustmentType = requestData.adjustment_type || 'decrease';
                const isIncrease = adjustmentType === 'increase';
                const quantitySign = isIncrease ? '+' : '-';
                const badgeColor = isIncrease ? 'bg-green-500' : 'bg-red-500';
                const badgeText = isIncrease ? 'INCREASE' : 'DECREASE';
                const textColor = isIncrease ? 'text-green-600' : 'text-red-600';

                return (
                  <div key={request.id} className="rounded-lg border-2 border-gray-200 bg-gray-50 p-6 shadow-md transition-all duration-200 hover:shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold">
                            {isReconciliation ? `REC-${request.id}` : isCorrection ? `ADJ-${request.id}` : isDispatch ? `DISPATCH-${request.id}` : `REQ-${request.id}`}
                          </h3>
                          <div className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent shadow hover:bg-primary/80 ${badgeColor} text-white`}>
                            <div className="flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-down w-3 h-3"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline><polyline points="16 17 22 17 22 11"></polyline></svg>
                              {badgeText}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm mb-1 text-gray-600"><span className="font-medium">Storekeeper:</span> {request.requested_by_name || `User #${request.requested_by}`}</p>
                        <p className="text-sm mb-1 text-gray-600"><span className="font-medium">Date:</span> {new Date(request.created_at).toLocaleString()}</p>
                        <p className="text-sm mb-1 text-gray-600"><span className="font-medium">Item Type:</span> {itemType === 'raw_material' ? 'Raw Material' : 'Final Product'}</p>
                      </div>
                    </div>
                    <div className="mb-4 rounded bg-white p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-lg font-medium">{itemName}</p>
                        </div>
                        <p className={`text-2xl font-bold ${textColor}`}>
                          {quantitySign}{quantity} {unit}
                        </p>
                      </div>
                      <div className="mt-3 rounded bg-orange-50 p-3">
                        <p className="mb-1 text-sm font-medium text-orange-700">Reason for Adjustment:</p>
                        <p className="text-sm text-orange-700">
                          {requestData.reason || requestData.remarks || details.notes || 'No reason provided'}
                        </p>
                      </div>
                    </div>
                    <div role="alert" className="relative w-full rounded-lg px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7 text-foreground mb-4 border-2 border-green-500 bg-green-50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-check h-5 w-5 text-green-600"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>
                      <div className="text-sm [&_p]:leading-relaxed text-green-900">
                        <strong>Automatic Stock Adjustment:</strong> Upon approval, stock will be automatically {isIncrease ? 'increased' : 'decreased'} by {quantity} {unit}.
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-9 px-4 py-2 flex-1 bg-green-600 text-white shadow-md hover:bg-green-700"
                        onClick={() => handleApprove(request.id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-check mr-2 h-4 w-4"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>
                        Approve &amp; Adjust Stock
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-background hover:text-accent-foreground h-9 px-4 py-2 flex-1 border-2 border-red-600 text-red-600 shadow-md hover:bg-red-50"
                        onClick={() => handleRejectClick(request)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-x mr-2 h-4 w-4"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>
                        Reject Request
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* PO Pending Approvals Section */}
      <section className="approval-section mt-8">
        <div className="approval-card rounded-lg border border-gray-200 shadow-lg">
          <div className="approval-card-header">
            <div className="font-semibold leading-none tracking-tight flex items-center gap-2 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-blue-600">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              PO Pending Approvals ({pos.length})
            </div>
          </div>
          <hr className="approval-divider mt-[6px]" />

          <style>{`
            .pa-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 20px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: box-shadow 0.15s; }
            .pa-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .pa-left { display: flex; flex-direction: column; gap: 4px; }
            .pa-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
            .pa-po-num { font-family: 'Courier New', monospace; font-size: 15px; font-weight: 700; color: #2563eb; }
            .pa-badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #fef3c7; color: #92400e; }
            .pa-vendor { font-size: 14px; color: #374151; font-weight: 500; }
            .pa-meta { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #9ca3af; margin-top: 2px; }
            .pa-meta-dot { font-size: 16px; line-height: 1; }
            .pa-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
            .pa-view-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; font-weight: 500; color: #374151; cursor: pointer; transition: all 0.15s; }
            .pa-view-btn:hover { background: #f9fafb; border-color: #d1d5db; }
            .pa-reject-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; background: white; border: 1px solid #fca5a5; border-radius: 8px; font-size: 13px; font-weight: 500; color: #dc2626; cursor: pointer; transition: all 0.15s; }
            .pa-reject-btn:hover { background: #fef2f2; }
            .pa-approve-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; background: #16a34a; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; color: white; cursor: pointer; transition: background 0.15s; }
            .pa-approve-btn:hover { background: #15803d; }
            .pa-approve-btn:disabled { opacity: 0.6; cursor: not-allowed; }
            .pa-empty-po { text-align: center; padding: 40px 20px; color: #9ca3af; }
            .pa-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
            .pa-modal { background: white; border-radius: 12px; max-width: 480px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.15); overflow: hidden; }
            .pa-modal-header { padding: 18px 24px; border-bottom: 1px solid #f3f4f6; background: #f9fafb; display: flex; align-items: center; justify-content: space-between; }
            .pa-modal-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #111827; display: flex; align-items: center; gap: 8px; }
            .pa-modal-body { padding: 24px; }
            .pa-modal-footer { padding: 16px 24px; border-top: 1px solid #f3f4f6; display: flex; justify-content: flex-end; gap: 10px; }
            .pa-close-btn { background: none; border: none; cursor: pointer; color: #6b7280; padding: 4px; border-radius: 6px; line-height: 1; }
            .pa-close-btn:hover { background: #f3f4f6; color: #111827; }
            .pa-view-modal { max-width: 600px; }
            .pa-view-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
            .pa-view-field label { display: block; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
            .pa-view-field p { font-size: 14px; font-weight: 500; color: #111827; margin: 0; }
            .pa-items-table { width: 100%; border-collapse: collapse; font-size: 13px; }
            .pa-items-table th { background: #f9fafb; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
            .pa-items-table td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
            .pa-items-table tr:last-child td { border-bottom: none; }
          `}</style>

          <div className="approval-list">
            {poLoading ? (
              <div className="pa-empty-po">Loading PO approvals…</div>
            ) : pos.length === 0 ? (
              <div className="pa-empty-po">
                <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" style={{ margin: '0 auto 10px', display: 'block', color: '#d1d5db' }}><polyline points="20 6 9 17 4 12" /></svg>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: '#6b7280' }}>All caught up!</p>
                <p style={{ fontSize: 13 }}>No purchase orders are waiting for approval.</p>
              </div>
            ) : (
              pos.map(po => {
                const total = parseFloat(po.total_amount || po.grand_total || 0);
                const itemCount = po.item_count || po.items?.length || 0;
                return (
                  <div key={po.id} className="pa-card">
                    <div className="pa-left">
                      <div className="pa-top">
                        <span className="pa-po-num">{po.po_number || `PO-${po.id}`}</span>
                        <span className="pa-badge">Pending Approval</span>
                      </div>
                      <div className="pa-vendor">{po.vendor_name || 'Unknown Vendor'}</div>
                      <div className="pa-meta">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        {timeAgo(po.created_at)}
                        {total > 0 && <><span className="pa-meta-dot">·</span>{fmtAmount(total)}</>}
                        {itemCount > 0 && <><span className="pa-meta-dot">·</span>{itemCount} item{itemCount !== 1 ? 's' : ''}</>}
                      </div>
                    </div>
                    <div className="pa-actions">
                      <button className="pa-view-btn" onClick={() => openPoView(po)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        View
                      </button>
                      <button className="pa-reject-btn" onClick={() => { setPoRejectModal(po); setPoRejectReason(''); }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                        Reject
                      </button>
                      <button className="pa-approve-btn" onClick={() => handlePoApprove(po.id)} disabled={poActing === po.id}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        {poActing === po.id ? 'Approving…' : 'Final Approve'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* PO Cancellation Requests Section */}
      <section className="approval-section mt-8">
        <div className="approval-card rounded-lg border border-gray-200 shadow-lg">
          <div className="approval-card-header">
            <div className="font-semibold leading-none tracking-tight flex items-center gap-2 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              PO Cancellation Requests ({cancelPos.length})
            </div>
          </div>
          <hr className="approval-divider mt-[6px]" />

          <div className="approval-list">
            {cancelLoading ? (
              <div className="pa-empty-po">Loading…</div>
            ) : cancelPos.length === 0 ? (
              <div className="pa-empty-po">
                <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" style={{ margin: '0 auto 10px', display: 'block', color: '#d1d5db' }}><polyline points="20 6 9 17 4 12" /></svg>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: '#6b7280' }}>No cancellation requests</p>
                <p style={{ fontSize: 13 }}>No POs are pending cancellation approval.</p>
              </div>
            ) : (
              cancelPos.map(po => {
                const total = parseFloat(po.total_amount || po.grand_total || 0);
                return (
                  <div key={po.id} className="pa-card" style={{ borderLeft: '4px solid #dc2626', cursor: 'default' }}>
                    <div className="pa-left" style={{ flex: 1 }}>
                      <div className="pa-top">
                        <span className="pa-po-num">{po.po_number || `PO-${po.id}`}</span>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: '#fce7f3', color: '#9d174d' }}>Cancellation Requested</span>
                      </div>
                      <div className="pa-vendor">{po.vendor_name || 'Unknown Vendor'}</div>
                      {/* Cancellation reason */}
                      {po.rejection_reason && (
                        <div style={{ marginTop: 8, padding: '8px 12px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reason for Cancellation: </span>
                          <span style={{ fontSize: 13, color: '#7f1d1d' }}>{po.rejection_reason}</span>
                        </div>
                      )}
                      <div className="pa-meta" style={{ marginTop: 6 }}>
                        {total > 0 && <><span style={{ fontWeight: 600, color: '#374151' }}>₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></>}
                      </div>
                    </div>
                    <div className="pa-actions">
                      <button className="pa-view-btn" onClick={() => openPoView(po, true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        View
                      </button>
                      <button
                        className="pa-reject-btn"
                        onClick={() => handleCancelDeny(po.id)}
                        disabled={cancelActing === po.id}
                        title="Deny cancellation — PO stays approved"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        Deny
                      </button>
                      <button
                        className="pa-approve-btn"
                        style={{ background: '#dc2626' }}
                        onClick={() => handleCancelApprove(po.id)}
                        disabled={cancelActing === po.id}
                        title="Approve cancellation — PO will be cancelled"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                        {cancelActing === po.id ? 'Processing…' : 'Approve Cancellation'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Reject Request</h2>
              <button
                onClick={handleCancelReject}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Are you sure you want to reject this request? No stock changes will be made.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows="4"
                placeholder="Provide a reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              ></textarea>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelReject}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PO Reject Modal */}
      {poRejectModal && (
        <div className="pa-overlay" onClick={e => e.target === e.currentTarget && setPoRejectModal(null)}>
          <div className="pa-modal">
            <div className="pa-modal-header">
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                Reject Purchase Order
              </h3>
              <button className="pa-close-btn" onClick={() => setPoRejectModal(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="pa-modal-body">
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                You are rejecting <strong style={{ color: '#111827' }}>{poRejectModal.po_number}</strong> from <strong style={{ color: '#111827' }}>{poRejectModal.vendor_name}</strong>.
              </p>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                Rejection Reason <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                value={poRejectReason}
                onChange={e => setPoRejectReason(e.target.value)}
                placeholder="e.g. Price too high, wrong vendor, etc."
                rows={3}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div className="pa-modal-footer">
              <button className="pa-view-btn" onClick={() => setPoRejectModal(null)}>Cancel</button>
              <button className="pa-reject-btn" style={{ padding: '8px 20px' }} onClick={handlePoRejectSubmit} disabled={poActing === poRejectModal?.id}>
                {poActing === poRejectModal?.id ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO Document Preview Modal */}
      {poViewModal && (() => {
        const notes = poViewModal.notes || '';
        const payMatch = notes.match(/Payment:\s*([^|]+)/);
        const delMatch = notes.match(/Delivery:\s*([^|]+)/);
        const paymentTerms = payMatch ? payMatch[1].trim() : '—';
        const deliveryTerms = delMatch ? delMatch[1].trim() : '—';
        const otherNotes = notes.replace(/Payment:\s*[^|]+\|?/, '').replace(/Delivery:\s*[^|]+/, '').trim().replace(/^\|\s*/, '');
        const items = Array.isArray(poViewModal.items) ? poViewModal.items : [];
        const subtotal = items.reduce((s, it) => s + (parseFloat(it.quantity || 0) * parseFloat(it.unit_price || 0)), 0);
        const totalTax = items.reduce((s, it) => {
          const base = parseFloat(it.quantity || 0) * parseFloat(it.unit_price || 0);
          return s + base * (parseFloat(it.tax_percent || 0) / 100);
        }, 0);
        const grand = subtotal + totalTax;
        const fmt = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
            onClick={e => e.target === e.currentTarget && setPoViewModal(null)}>
            <div style={{ background: '#f1f5f9', borderRadius: 16, maxWidth: 800, width: '100%', maxHeight: '95vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>

              {/* Modal chrome header */}
              <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>Purchase Order Preview</span>
                  {cancelViewMode ? (
                    <span style={{ fontSize: 12, background: '#fce7f3', color: '#9d174d', padding: '2px 10px', borderRadius: 9999, fontWeight: 600 }}>Cancellation Requested</span>
                  ) : (
                    <span style={{ fontSize: 12, background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: 9999, fontWeight: 600 }}>Pending Approval</span>
                  )}
                </div>
                <button onClick={() => setPoViewModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4, borderRadius: 6, lineHeight: 1 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>

              {/* Document area */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
                {poViewLoading ? (
                  <div style={{ background: 'white', borderRadius: 8, padding: '60px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Loading document…</div>
                ) : (
                  <PODocumentPreview po={poViewModal} />
                )}
              </div>

              {/* Action footer */}
              <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
                <button className="pa-view-btn" onClick={() => setPoViewModal(null)}>Close</button>
                {cancelViewMode ? (
                  <>
                    <button className="pa-reject-btn" style={{ padding: '8px 18px' }}
                      onClick={() => { handleCancelDeny(poViewModal.id); setPoViewModal(null); }}
                      disabled={cancelActing === poViewModal?.id}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                      Deny Cancellation
                    </button>
                    <button className="pa-approve-btn" style={{ background: '#dc2626', padding: '8px 18px' }}
                      onClick={() => { handleCancelApprove(poViewModal.id); setPoViewModal(null); }}
                      disabled={cancelActing === poViewModal?.id}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                      Approve Cancellation
                    </button>
                  </>
                ) : (
                  <>
                    <button className="pa-reject-btn" style={{ padding: '8px 18px' }}
                      onClick={() => { setPoRejectModal(poViewModal); setPoRejectReason(''); setPoViewModal(null); }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                      Reject PO
                    </button>
                    <button className="pa-approve-btn"
                      onClick={() => { handlePoApprove(poViewModal.id); setPoViewModal(null); }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      Approve PO
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}


import React, { useState, useEffect } from 'react';
import { approvalsService } from '../services';

export default function MyRequests({ correctionRequestHeight }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      // Fetch all approval requests
      const allRequests = await approvalsService.getAll();

      // Filter only inventory_correction, inventory_reconciliation, and transaction_void requests
      const myRequests = allRequests.filter(req =>
        req.request_type === 'inventory_correction' ||
        req.request_type === 'inventory_reconciliation' ||
        req.request_type === 'transaction_void'
      );

      // Transform data for display
      const formattedRequests = myRequests.map(req => {
        let details = {};
        try {
          details = typeof req.details === 'string' ? JSON.parse(req.details) : (req.details || {});
        } catch (e) {
          console.error('Error parsing details:', e);
        }

        const requestData = details.request_data || {};
        const isReconciliation = req.request_type === 'inventory_reconciliation';
        const isVoid = req.request_type === 'transaction_void';

        let displayText = '';
        let requestId = '';

        if (isVoid) {
          requestId = `VOID-${req.id}`;
          displayText = `Void ${req.transaction_id || 'Transaction'}`;
        } else if (isReconciliation) {
          requestId = `REC-${req.id}`;
          const adjustmentType = requestData.adjustment_type === 'increase' ? 'Increase' : 'Decrease';
          const itemName = details.item_name || req.item_name || 'Unknown Item';
          displayText = `${adjustmentType} ${itemName}`;
        } else {
          requestId = `ADJ-${req.id}`;
          const adjustmentType = requestData.adjustment_type === 'increase' ? 'Increase' : 'Decrease';
          const itemName = details.item_name || req.item_name || 'Unknown Item';
          displayText = `${adjustmentType} ${itemName}`;
        }

        return {
          id: requestId,
          type: displayText,
          date: new Date(req.created_at).toLocaleDateString('en-GB'),
          status: req.status === 'pending' ? 'pending approval' : req.status,
          icon: isVoid ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2 w-4 h-4"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard-list w-4 h-4"><rect width="8" height="4" x="8" y="2" rx="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path></svg>
          ),
        };
      });

      setRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'rejected':
        return {
          backgroundColor: 'hsl(0deg 84.31% 93.73%)',
          color: 'hsl(0deg 84.31% 60.39%)',
          border: '1px solid hsl(0deg 84.31% 60.39%)'
        };
      case 'approved':
        return {
          backgroundColor: '#dcfce7',
          color: '#166534',
          border: '1px solid #16a34a'
        };
      case 'pending approval':
        return {
          backgroundColor: '#fef3c7',
          color: '#92400e',
          border: '1px solid #f59e0b'
        };
      default:
        return {
          backgroundColor: '#f3f4f6',
          color: '#6b7280',
          border: '1px solid #9ca3af'
        };
    }
  };

  return (
    <section className="mt-8 bg-white p-6 rounded-lg shadow-lg" style={{ flex: '1', maxHeight: `${correctionRequestHeight}px`, display: 'flex', flexDirection: 'column' }}>
      <div className="font-semibold leading-none tracking-tight flex items-center gap-2 mb-4 text-lg">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock-3 w-5 h-5" style={{ color: 'var(--primary)' }}>
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16.5 12"></polyline>
        </svg>
        My Requests
      </div>
      <hr className="mb-4" />

      <div className="my-requests-list" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            No correction requests found
          </div>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="request-item" style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              borderBottom: '1px solid #e5e7eb',
              transition: 'background-color 0.15s'
            }}>
              <div className="request-icon" style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {request.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#000',
                  marginBottom: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {request.id}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginBottom: '8px'
                }}>
                  {request.type}
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                  {request.date}
                </div>
              </div>
              <div>
                <span style={{
                  ...getStatusStyles(request.status),
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'lowercase',
                  whiteSpace: 'nowrap'
                }}>
                  {request.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
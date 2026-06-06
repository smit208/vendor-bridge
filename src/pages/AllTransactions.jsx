import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import CustomDropdown from "../components/CustomDropdown";

const typeIcons = {
  "Material Issue": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M4 7 12 3l8 4-8 4-8-4Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m4 7 8 4v10" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m20 7-8 4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "Production Issue": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M4 20v-6l5-3v3l5-3v3l5-3v9H4Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 6h2M8 6h2M12 6h2" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  "Material Inward": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 18v-6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 15h6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "Material Dispatch": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M16 3h5v5M21 3l-7 7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "Inventory Correction": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "Inventory Reconciliation": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M9 11l3 3L22 4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// Format an ISO timestamp into local date + time strings
const formatLocalDate = (iso) => {
  if (!iso) return { date: 'N/A', time: '' };
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const date = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const time = `${h}:${m}`;
  return { date, time };
};

export default function AllTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [flowTransaction, setFlowTransaction] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');
  const [highlightedId, setHighlightedId] = useState(null);

  // Fetch transactions from API
  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/transactions');
      // api.get returns the JSON response directly, not wrapped in .data
      setTransactions(response.transactions || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions. Please try again later.');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Check URL for transaction ID and auto-open modal
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const transactionId = params.get('id');

    if (transactionId && transactions.length > 0) {
      // Find transaction by string ID (e.g., "TXN-123")
      const transaction = transactions.find(t => t.id === transactionId);

      if (transaction) {
        // Highlight the row
        setHighlightedId(transaction.id);

        // Scroll to the transaction row after a short delay
        setTimeout(() => {
          const rowElement = document.querySelector(`tr[data-transaction-id="${transaction.id}"]`);
          if (rowElement) {
            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);

        // Remove highlight after 3 seconds
        setTimeout(() => {
          setHighlightedId(null);
        }, 3000);

        // Clear the URL parameter
        navigate('/transactions', { replace: true });
      }
    }
  }, [location.search, transactions]);

  // Filter transactions on the frontend
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearchQuery =
      transaction.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.createdBy.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      selectedType === 'All Types' || transaction.type === selectedType;

    const matchesStatus =
      selectedStatus === 'All Status' || transaction.status.label.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearchQuery && matchesType && matchesStatus;
  });

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopySuccess(id);
      setTimeout(() => {
        setCopySuccess('');
      }, 3000); // Show for 3 seconds
    });
  };

  const handleDetailsClick = async (transaction) => {
    try {
      // Fetch complete transaction details from backend
      const details = await api.get(`/transactions/${transaction.id}`);
      setSelectedTransaction({
        ...transaction,
        detailsData: details.detailsData,
        rawData: details  // Include full backend response for dispatch fields
      });
      setIsModalOpen(true);
    } catch (err) {
      console.error('Error fetching transaction details:', err);
      // Fallback to showing basic transaction info
      setSelectedTransaction(transaction);
      setIsModalOpen(true);
    }
  };

  const handleFlowClick = async (transaction) => {
    try {
      // Fetch complete transaction details from backend
      const details = await api.get(`/transactions/${transaction.id}`);
      setFlowTransaction({
        ...transaction,
        detailsData: details.detailsData,
        rawData: {
          ...details,
          additionalMaterials: details.additionalMaterials
        }
      });
      setShowFlowModal(true);
    } catch (err) {
      console.error('Error fetching transaction details:', err);
      // Fallback to showing basic transaction info
      setFlowTransaction(transaction);
      setShowFlowModal(true);
    }
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .main-header {
          margin-bottom: 2rem;
        }

        .main-title h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .main-title p {
          font-size: 0.95rem;
          color: #64748b;
        }

        .transactions-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
        }

        .search-filter-heading {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
        }

        .search-filter-hr {
          border: none;
          border-top: 1px solid #e0e0e0;
          margin: 0;
        }

        .search-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 1.5rem;
          padding: 1.5rem;
        }

        .search-field label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #475569;
          margin-bottom: 0.5rem;
        }

        .input-shell {
          position: relative;
          width: 100%;
          border: none;
          box-shadow: none;
        }

        .input-shell.with-icon {
          position: relative;
        }

        .input-shell .icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          color: #94a3b8;
          pointer-events: none;
          z-index: 1;
        }

        .input-shell.with-icon input {
          padding-left: 42px;
        }

        .input-shell input,
        .input-shell select {
          width: 100%;
          padding: 0.625rem 2.5rem 0.625rem 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #1e293b;
          background: white;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 16px;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          transition: all 0.2s;
          outline: none;
          cursor: pointer;
        }

        .input-shell input:focus,
        .input-shell select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .input-shell input::placeholder {
          color: #94a3b8;
        }

        .transactions-table {
          width: 100%;
          border-collapse: collapse;
        }

        .transactions-table thead {
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }

        .transactions-table th {
          padding: 0.875rem 1.5rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .transactions-table tbody tr {
          border-bottom: 1px solid #f1f5f9;
          transition: background-color 0.15s;
        }

        .transactions-table tbody tr:hover {
          background: #f8fafc;
        }

        .transactions-table td {
          padding: 1rem 1.5rem;
          font-size: 0.875rem;
          color: #1e293b;
        }

        .transaction-id {
          font-family: 'Courier New', monospace;
          font-weight: 600;
          color: #000000ff;
        }

        .type-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .type-icon {
          width: 18px;
          height: 18px;
          color: #64748b;
        }

        .details-text {
          color: #64748b;
        }

        .status-chip {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .status-chip.info {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-chip.success {
          background: #dcfce7;
          color: #15803d;
        }

        .status-chip.warning {
          background: #fef3c7;
          color: #92400e;
        }

        .transaction-row-highlight {
          background: #dbeafe !important;
          animation: highlightFade 3s ease-out;
        }

        @keyframes highlightFade {
          0% { background: #dbeafe; }
          100% { background: transparent; }
        }

        .transactions-footer {
        }

        .transactions-footer p {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          max-width: 48rem;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        @media (min-width: 640px) {
          .modal-header {
            text-align: left;
            flex-direction: row;
          }
        }

        .modal-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          letter-spacing: -0.025em;
        }

        .modal-header-icon {
          width: 1rem;
          height: 1rem;
          flex-shrink: 0;
        }

        .close-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          white-space: nowrap;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.15s;
          border: none;
          background: transparent;
          cursor: pointer;
          height: 2.25rem;
          width: 2.25rem;
          opacity: 0.7;
          padding: 0;
        }

        .close-button:hover {
          opacity: 1;
          background: hsl(0, 0%, 96.1%);
        }

        .close-button:focus {
          outline: none;
          box-shadow: 0 0 0 2px hsl(0, 0%, 3.9%);
        }

        .close-button svg {
          width: 1.25rem;
          height: 1.25rem;
          color: currentColor;
        }

        .modal-body {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 1.5rem;
          background: white;
        }

        .general-information-card,
        .material-inward-details-card,
        .production-issue-details-card,
        .material-issue-details-card {
          background: white;
          border-radius: 0;
          border: none;
          box-shadow: none;
          overflow: visible;
        }

        .general-information-card h3,
        .material-inward-details-card h3,
        .production-issue-details-card h3,
        .material-issue-details-card h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          letter-spacing: 0;
          padding: 0 0 1rem 0;
          margin: 0;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
          padding: 0;
        }

        .info-grid h4 {
          font-size: 0.75rem;
          font-weight: 500;
          color: #64748b;
          text-transform: capitalize;
          margin-bottom: 0.375rem;
        }

        .info-grid p {
          font-size: 0.9375rem;
          color: #1e293b;
          font-weight: 600;
        }

        .quantity-positive {
          color: #16a34a !important;
          font-weight: 600 !important;
        }

        .cost-per-unit {
          color: #64748b !important;
        }

        .total-value {
          color: #1e293b !important;
          font-weight: 600 !important;
        }

        .flow-modal-content {
          max-width: 1000px;
        }

        .flow-timeline {
          position: relative;
          padding: 2rem 0;
        }

        .flow-step {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 2rem;
          position: relative;
        }

        .flow-step:last-child {
          margin-bottom: 0;
        }

        .flow-step::before {
          content: '';
          position: absolute;
          left: 19px;
          top: 40px;
          bottom: -32px;
          width: 2px;
          background: #e2e8f0;
        }

        .flow-step:last-child::before {
          display: none;
        }

        .flow-icon-wrapper {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #3b82f6;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          z-index: 1;
        }

        .flow-icon-wrapper.completed {
          background: #22c55e;
        }

        .flow-icon-wrapper.pending {
          background: #f59e0b;
        }

        .flow-content {
          flex: 1;
          background: #f8fafc;
          padding: 1.25rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .flow-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 0.75rem;
        }

        .flow-title {
          font-weight: 600;
          color: #1e293b;
          font-size: 1rem;
        }

        .flow-time {
          font-size: 0.75rem;
          color: #64748b;
        }

        .flow-description {
          color: #64748b;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .flow-details {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid #e2e8f0;
          font-size: 0.8125rem;
          color: #475569;
        }

        .flow-modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .flow-modal-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .flow-modal-header svg {
          width: 1.5rem;
          height: 1.5rem;
        }

        .flow-modal-header .close-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          border: 1px solid #e2e8f0;
          background: white;
          color: #475569;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          height: auto;
          width: auto;
        }

        .flow-modal-header .close-button:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .flow-modal-body {
          padding: 1.5rem;
        }

        .flow-section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 1rem;
        }

        .flow-check-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #22c55e;
        }

        .flow-info-banner {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
          color: #1e40af;
        }

        .flow-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .flow-card-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .flow-card-icon {
          width: 2.5rem;
          height: 2.5rem;
          background: #eff6ff;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
        }

        .flow-card-icon svg {
          width: 1.5rem;
          height: 1.5rem;
        }

        .flow-card-title-group h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }

        .flow-card-date {
          font-size: 0.875rem;
          color: #64748b;
        }

        .flow-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .flow-field label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }

        .flow-field div {
          font-size: 0.875rem;
          color: #1e293b;
          font-weight: 500;
        }

        .text-green {
          color: #16a34a !important;
        }

        .flow-summary-footer {
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          padding: 1.5rem;
        }

        .flow-summary-title {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 1rem;
        }

        .flow-stats-container {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1rem;
        }

        .flow-stat-item {
          text-align: center;
        }

        .flow-stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }

        .flow-stat-value.green {
          color: #16a34a;
        }

        .flow-stat-value.orange {
          color: #ea580c;
        }

        .flow-stat-label {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .material-table-heading {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.75rem;
          padding: 0;
        }

        .material-table-wrapper {
          padding: 0;
        }

        .material-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          overflow: hidden;
          background: white;
        }

        .material-table thead {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .material-table th {
          padding: 0.875rem 1rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: capitalize;
          letter-spacing: 0;
          border: none;
        }

        .material-table tbody tr {
          transition: background-color 0.15s;
        }

        .material-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        .material-table tbody tr:hover {
          background: #f1f5f9;
        }

        .material-table td {
          padding: 0.875rem 1rem;
          font-size: 0.875rem;
          color: #1e293b;
          border: none;
          font-weight: 400;
        }

        .material-table .font-medium {
          font-weight: 600;
          color: #1e293b;
        }

        .material-table .font-bold {
          font-weight: 700;
          color: #1e293b;
        }

        .material-table .text-right {
          text-align: right;
          font-weight: 700;
          color: #1e293b;
        }

        .material-table tbody tr:last-child {
          background: #dbeafe !important;
        }

        .material-table tbody tr:last-child td {
          font-weight: 600;
          color: #1e293b;
        }

        .space-y-4 > * + * {
          margin-top: 1rem;
        }

        .capitalize {
          text-transform: capitalize;
        }

        /* Custom Dropdown Styles */
        .custom-dropdown-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .custom-dropdown-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #475569;
        }

        .custom-dropdown-wrapper {
          position: relative;
        }

        .custom-dropdown-trigger {
          width: 100%;
          padding: 0.625rem 2.5rem 0.625rem 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #1e293b;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.2s;
          outline: none;
          text-align: left;
        }

        .custom-dropdown-trigger:hover {
          border-color: #cbd5e1;
        }

        .custom-dropdown-trigger:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .custom-dropdown-chevron {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #6b7280;
          transition: transform 0.2s;
          pointer-events: none;
        }

        .custom-dropdown-chevron.open {
          transform: translateY(-50%) rotate(180deg);
        }

        .custom-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          z-index: 50;
          max-height: 300px;
          overflow-y: auto;
          animation: slideDown 0.15s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .custom-dropdown-item {
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: #1e293b;
          cursor: pointer;
          transition: background-color 0.15s;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .custom-dropdown-item:hover {
          background: #f8fafc;
        }

        .custom-dropdown-item.selected {
          background: #f8fafc;
        }

        .custom-dropdown-check {
          color: #1e293b;
          flex-shrink: 0;
        }
      `}</style>

      <header className="main-header">
        <div className="main-title">
          <h1>All Transactions</h1>
          <p>Complete history of all material movements and transactions</p>
        </div>
      </header>

      <div className="transactions-card">
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e0e0e0' }}>
          <div className="search-filter-heading">Search & Filter</div>
        </div>

        <div className="search-grid">
          <div className="search-field">
            <label>Search</label>
            <div className="input-shell with-icon">
              <span className="icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </span>
              <input
                placeholder="ID, material, storekeeper…"
                aria-label="Search transactions"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <CustomDropdown
            label="Transaction Type"
            value={selectedType}
            onChange={setSelectedType}
            options={[
              'All Types',
              'Material Issue',
              'Material Inward',
              'Material Dispatch'
            ]}
          />
          <CustomDropdown
            label="Status"
            value={selectedStatus}
            onChange={setSelectedStatus}
            options={[
              'All Status',
              'Completed',
              'Pending Approval',
              'In Production',
              'Production Completed',
              'Rejected'
            ]}
          />
        </div>

        <table className="transactions-table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Type</th>
              <th>Details</th>
              <th>Status</th>
              <th>Reference</th>
              <th>Created By</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <svg style={{ animation: 'spin 1s linear infinite', width: '40px', height: '40px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading transactions...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: '#ef4444' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span style={{ color: '#1e293b', fontWeight: 500 }}>{error}</span>
                    <button
                      onClick={fetchTransactions}
                      style={{
                        padding: '0.5rem 1.5rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Try Again
                    </button>
                  </div>
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3h18v18H3z"></path>
                      <path d="M9 9h.01M15 9h.01M9 15h6"></path>
                    </svg>
                    <span style={{ fontWeight: 500 }}>No transactions found</span>
                    {(searchQuery || selectedType !== 'All Types' || selectedStatus !== 'All Status') && (
                      <span style={{ fontSize: '0.875rem' }}>Try adjusting your search or filters</span>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredTransactions.map((row) => (
                <tr key={row.id} data-transaction-id={row.id} className={highlightedId === row.id ? 'transaction-row-highlight' : ''}>
                  <td>
                    <div className="transaction-id">{row.id}</div>
                  </td>
                  <td>
                    <div className="type-cell">
                      <span className="type-icon">{typeIcons[row.type]}</span>
                      <span>{row.type}</span>
                    </div>
                  </td>
                  <td>
                    <span className="details-text">{row.details}</span>
                  </td>
                  <td>
                    <span className={`status-chip ${row.status.variant}`}>{row.status.label}</span>
                  </td>
                  <td>{row.reference}</td>
                  <td>{row.createdBy}</td>
                  <td>
                    <div className="date-cell">
                      <span>{formatLocalDate(row.date).date}</span>
                      <small>{formatLocalDate(row.date).time}</small>
                    </div>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button className="ghost-btn" onClick={() => handleDetailsClick(row)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        Details
                      </button>
                      <button className="ghost-btn-flow" onClick={() => handleFlowClick(row)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                          <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                          <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                          <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                          <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                        Flow
                      </button>
                      <button
                        className={`ghost-btn ${copySuccess === row.id ? 'copied' : ''}`}
                        onClick={() => handleCopyId(row.id)}
                      >
                        {copySuccess === row.id ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                              <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                            </svg>
                            Copy ID
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="transactions-footer">
          <p>Showing {filteredTransactions.length} of {transactions.length} transactions</p>
        </div>
      </div>

      {isModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col space-y-1.5 text-center sm:text-left p-6 pb-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" style={{ color: 'var(--primary)' }}>
                    <path d="M16 16h6"></path>
                    <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"></path>
                    <path d="m7.5 4.27 9 5.15"></path>
                    <polyline points="3.29 7 12 12 20.71 7"></polyline>
                    <line x1="12" x2="12" y1="22" y2="12"></line>
                  </svg>
                  Transaction Details
                </h2>
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-gray-100 h-9 w-9" onClick={() => setIsModalOpen(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div className="space-y-6 p-6">
              <div className="rounded-xl border shadow bg-gray-50">
                <div className="flex flex-col space-y-1.5 p-6 pb-3">
                  <div className="font-semibold tracking-tight text-lg">General Information</div>
                </div>
                <div className="p-6 pt-0 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Transaction ID</p>
                    <p className="font-mono font-bold">{selectedTransaction.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="font-medium">{selectedTransaction.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className="mt-1">
                      <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors ${selectedTransaction.status.variant === 'success' ? 'bg-green-100 text-green-800' : selectedTransaction.status.variant === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                        {selectedTransaction.status.label}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Created By</p>
                    <p className="font-medium">
                      {selectedTransaction.type === "Inventory Correction" && selectedTransaction.detailsData?.correctedBy
                        ? selectedTransaction.detailsData.correctedBy
                        : selectedTransaction.type === "Inventory Reconciliation" && selectedTransaction.detailsData?.reconciledBy
                          ? selectedTransaction.detailsData.reconciledBy
                          : selectedTransaction.createdBy}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date &amp; Time</p>
                    <p className="font-medium">{formatLocalDate(selectedTransaction.date).date} {formatLocalDate(selectedTransaction.date).time}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reference</p>
                    <p className="font-medium">{selectedTransaction.reference}</p>
                  </div>
                </div>
              </div>

              {selectedTransaction.type === "Material Inward" && selectedTransaction.detailsData && (
                <div className="rounded-xl border text-card-foreground shadow bg-green-50">
                  <div className="flex flex-col space-y-1.5 p-6 pb-3">
                    <div className="font-semibold tracking-tight text-lg">Material Inward Details</div>
                  </div>
                  <div className="p-6 pt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Inward Type</p>
                        <p className="font-medium capitalize">{selectedTransaction.detailsData.inwardType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Material Name</p>
                        <p className="font-medium">{selectedTransaction.detailsData.materialName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Quantity</p>
                        <p className="font-bold text-green-600">+{selectedTransaction.detailsData.quantity} {selectedTransaction.detailsData.unit}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Cost Per Unit</p>
                        <p className="font-bold">{selectedTransaction.detailsData.costPerUnit}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Value</p>
                        <p className="font-bold text-lg text-green-700">{selectedTransaction.detailsData.totalValue}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Supplier/Source</p>
                        <p className="font-medium">{selectedTransaction.detailsData.supplierSource}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Invoice Number</p>
                        <p className="font-medium">{selectedTransaction.detailsData.invoiceNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Vehicle Number</p>
                        <p className="font-medium">{selectedTransaction.detailsData.vehicleNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">PO Number</p>
                        <p className="font-medium" style={{ color: selectedTransaction.detailsData.poNumber ? '#2563eb' : '#6b7280' }}>
                          {selectedTransaction.detailsData.poNumber || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Remarks</p>
                      <p className="font-medium text-gray-400">{selectedTransaction.rawData?.notes && selectedTransaction.rawData.notes.trim().toLowerCase() !== selectedTransaction.type.trim().toLowerCase() ? selectedTransaction.rawData.notes : '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedTransaction.type === "Production Issue" && selectedTransaction.detailsData && (
                <div className="production-issue-details-card">
                  <h3>Production Issue Details</h3>
                  <div className="info-grid">
                    <div>
                      <h4>Product</h4>
                      <p>{selectedTransaction.detailsData.product}</p>
                    </div>
                    <div>
                      <h4>Quantity</h4>
                      <p>{selectedTransaction.detailsData.quantity}</p>
                    </div>
                    <div>
                      <h4>BOM Version</h4>
                      <p>{selectedTransaction.detailsData.bomVersion}</p>
                    </div>
                    <div>
                      <h4>Start Date</h4>
                      <p>{selectedTransaction.detailsData.startDate}</p>
                    </div>
                    <div>
                      <h4>End Date</h4>
                      <p>{selectedTransaction.detailsData.endDate}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedTransaction.type === "Material Issue" && selectedTransaction.detailsData && (
                <div className="rounded-xl border shadow bg-blue-50">
                  <div className="flex flex-col space-y-1.5 p-6 pb-3">
                    <div className="font-semibold tracking-tight text-lg">Material Issue Details</div>
                  </div>
                  <div className="p-6 pt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Issue Type</p>
                        <p className="font-medium capitalize">{selectedTransaction.detailsData.issueType}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Final Product</p>
                        <p className="font-medium">{selectedTransaction.detailsData.productName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">BOM Version</p>
                        <p className="font-medium">{selectedTransaction.detailsData.bomVersion || '1.0'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Planned Quantity</p>
                        <p className="font-medium">{selectedTransaction.detailsData.plannedQuantity || selectedTransaction.detailsData.quantity || '1'} units</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 text-base">Materials Issued/Reserved:</h4>
                      <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                          <thead className="border-b">
                            <tr className="border-b transition-colors hover:bg-blue-200 bg-blue-100">
                              <th className="h-10 px-2 text-left align-middle font-medium text-gray-600">Material Name</th>
                              <th className="h-10 px-2 text-left align-middle font-medium text-gray-600">Quantity</th>
                              <th className="h-10 px-2 text-left align-middle font-medium text-gray-600">Unit</th>
                              <th className="h-10 px-2 text-left align-middle font-medium text-gray-600">Cost Per Unit</th>
                              <th className="h-10 px-2 text-left align-middle font-medium text-gray-600">Total Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTransaction.detailsData.items && selectedTransaction.detailsData.items.map((item, index) => (
                              <tr key={index} className="border-b transition-colors hover:bg-blue-100">
                                <td className="p-2 align-middle font-medium">{item.material}</td>
                                <td className="p-2 align-middle">{item.quantity}</td>
                                <td className="p-2 align-middle">{item.unit}</td>
                                <td className="p-2 align-middle">{item.costPerUnit}</td>
                                <td className="p-2 align-middle font-bold">{item.totalCost}</td>
                              </tr>
                            ))}
                            <tr className="border-b transition-colors hover:bg-blue-300 bg-blue-200 font-bold">
                              <td className="p-2 align-middle text-right" colSpan="4">Total Material Cost:</td>
                              <td className="p-2 align-middle">
                                {selectedTransaction.detailsData.items &&
                                  selectedTransaction.detailsData.items.reduce((sum, item) => {
                                    const cost = parseFloat(item.totalCost.replace('₹', '').replace(',', ''));
                                    return sum + cost;
                                  }, 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedTransaction.type === "Material Dispatch" && selectedTransaction.detailsData && (
                <div className="rounded-xl border text-card-foreground shadow bg-orange-50">
                  <div className="flex flex-col space-y-1.5 p-6 pb-3">
                    <div className="font-semibold tracking-tight text-lg">Dispatch Details</div>
                  </div>
                  <div className="p-6 pt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Dispatch Type</p>
                        <p className="font-medium capitalize">{selectedTransaction.detailsData.dispatchType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Item Type</p>
                        <p className="font-medium capitalize">{selectedTransaction.rawData?.item_type?.replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Item Name</p>
                        <p className="font-medium">{selectedTransaction.detailsData.productName || selectedTransaction.rawData?.item_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Quantity</p>
                        <p className="font-bold text-red-600">-{selectedTransaction.detailsData.quantity} {selectedTransaction.detailsData.unit}</p>
                      </div>
                    </div>

                    {/* FIFO Cost Breakdown Section */}
                    {selectedTransaction.detailsData.fifoBreakdown && selectedTransaction.detailsData.fifoBreakdown.length > 0 ? (
                      <div>
                        <p className="text-sm text-gray-500 mb-3 font-semibold">Cost Per Unit (Purchased Value)</p>
                        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden shadow-sm">
                          <table className="w-full text-sm">
                            <thead className="bg-gradient-to-r from-blue-100 to-blue-200 border-b border-blue-300">
                              <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Quantity</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">Purchase Cost</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {selectedTransaction.detailsData.fifoBreakdown.map((layer, index) => (
                                <tr key={index} className="border-b border-gray-200 hover:bg-blue-50 transition-colors">
                                  <td className="px-4 py-3 font-medium text-gray-900">{layer.quantity.toFixed(2)} {selectedTransaction.detailsData.unit}</td>
                                  <td className="px-4 py-3 text-right text-gray-700">₹{layer.cost.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{(layer.quantity * layer.cost).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-blue-50 border-t-2 border-blue-300">
                              <tr>
                                <td className="px-4 py-3 font-bold text-gray-900">Weighted Average</td>
                                <td className="px-4 py-3 text-right font-bold text-blue-600">{selectedTransaction.detailsData.costPerUnit}</td>
                                <td className="px-4 py-3 text-right font-bold text-blue-700">
                                  ₹{selectedTransaction.detailsData.fifoBreakdown.reduce((sum, layer) => sum + (layer.quantity * layer.cost), 0).toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Cost Per Unit</p>
                          <p className="font-bold">{selectedTransaction.detailsData.costPerUnit || '₹0.00'}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Selling Price Per Unit</p>
                        <p className="font-bold">{selectedTransaction.detailsData.sellingPrice || '₹0.00'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Sales Value</p>
                        <p className="font-bold text-lg text-orange-700">{selectedTransaction.detailsData.totalValue || '₹0.00'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Reference Document</p>
                        <p className="font-medium">{selectedTransaction.rawData?.reference_document || selectedTransaction.detailsData.referenceDocument || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Receiver/Customer</p>
                        <p className="font-medium">{selectedTransaction.detailsData.customerName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Drop Point</p>
                        <p className="font-medium">{selectedTransaction.detailsData?.deliveryAddress || selectedTransaction.rawData?.delivery_address || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Vehicle/Transport Info</p>
                        <p className="font-medium">{selectedTransaction.detailsData.vehicleNumber || selectedTransaction.detailsData.vehicleInfo || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Remarks</p>
                      <p className="font-medium text-gray-400">{(() => {
                        // Try to get remarks from detailsData first
                        if (selectedTransaction.detailsData.remarks) {
                          return selectedTransaction.detailsData.remarks;
                        }
                        // Parse notes JSON if it exists
                        if (selectedTransaction.rawData?.notes) {
                          try {
                            const notes = typeof selectedTransaction.rawData.notes === 'string'
                              ? JSON.parse(selectedTransaction.rawData.notes)
                              : selectedTransaction.rawData.notes;
                            return notes.remarks || '—';
                          } catch (e) {
                            // If parsing fails, treat as plain string but skip if it's a type name
                            const raw = selectedTransaction.rawData.notes;
                            return (raw && raw !== selectedTransaction.type) ? raw : '—';
                          }
                        }
                        return '—';
                      })()}</p>
                    </div>
                    {selectedTransaction.detailsData.photoUrl && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Dispatch Bill/Invoice Photo</p>
                        <img
                          src={selectedTransaction.detailsData.photoUrl}
                          alt="Dispatch Bill"
                          className="max-w-md rounded-lg shadow-md border-2 border-gray-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedTransaction.detailsData?.voidType === "Transaction Void" && (
                <div className="rounded-xl border text-card-foreground shadow bg-red-50">
                  <div className="flex flex-col space-y-1.5 p-6 pb-3">
                    <div className="font-semibold tracking-tight text-lg text-red-600">Transaction Void Details</div>
                  </div>
                  <div className="p-6 pt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Original Transaction ID</p>
                        <p className="font-mono text-sm font-medium">{selectedTransaction.detailsData.originalTransactionId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Transaction Type</p>
                        <p className="font-medium capitalize">{selectedTransaction.detailsData.originalTransactionType?.replace(/_/g, ' ') || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Voided By</p>
                        <p className="font-medium">{selectedTransaction.detailsData.voidedBy || selectedTransaction.createdBy}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Void Date</p>
                        <p className="font-medium">{selectedTransaction.detailsData.voidDate ? new Date(selectedTransaction.detailsData.voidDate).toLocaleString() : 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Void Reason</p>
                      <p className="font-medium">{selectedTransaction.detailsData.voidReason || 'No reason provided'}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedTransaction.type === "Inventory Correction" && selectedTransaction.detailsData && !selectedTransaction.detailsData.voidType && (
                <div className="rounded-xl border text-card-foreground shadow bg-purple-50">
                  <div className="flex flex-col space-y-1.5 p-6 pb-3">
                    <div className="font-semibold tracking-tight text-lg">Inventory Correction Details</div>
                  </div>
                  <div className="p-6 pt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Item Type</p>
                        <p className="font-medium capitalize">{selectedTransaction.detailsData.itemType?.replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Item Name</p>
                        <p className="font-medium">{selectedTransaction.detailsData.itemName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Old Quantity</p>
                        <p className="font-medium">{selectedTransaction.detailsData.oldQuantity} {selectedTransaction.detailsData.unit}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">New Quantity</p>
                        <p className="font-medium">{selectedTransaction.detailsData.newQuantity} {selectedTransaction.detailsData.unit}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Difference</p>
                        <p className={`font-bold text-lg ${parseFloat(selectedTransaction.detailsData.difference) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {parseFloat(selectedTransaction.detailsData.difference) >= 0 ? '+' : ''}{selectedTransaction.detailsData.difference} {selectedTransaction.detailsData.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Cost per Unit</p>
                        <p className="font-medium">{selectedTransaction.detailsData.costPerUnit || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Corrected By</p>
                        <p className="font-medium">{selectedTransaction.detailsData.correctedBy || selectedTransaction.createdBy}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Reason</p>
                      <p className="font-medium">{selectedTransaction.detailsData.reason || 'No reason provided'}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedTransaction.type === "Inventory Reconciliation" && selectedTransaction.detailsData && (
                <div className="rounded-xl border text-card-foreground shadow bg-purple-50">
                  <div className="flex flex-col space-y-1.5 p-6 pb-3">
                    <div className="font-semibold tracking-tight text-lg">Inventory Reconciliation Details</div>
                  </div>
                  <div className="p-6 pt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Item Type</p>
                        <p className="font-medium capitalize">{selectedTransaction.detailsData.itemType?.replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Item Name</p>
                        <p className="font-medium">{selectedTransaction.detailsData.itemName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">System Quantity</p>
                        <p className="font-medium">{selectedTransaction.detailsData.systemQuantity} {selectedTransaction.detailsData.unit}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Physical Quantity</p>
                        <p className="font-medium">{selectedTransaction.detailsData.physicalQuantity} {selectedTransaction.detailsData.unit}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Difference</p>
                        <p className={`font-bold text-lg ${parseFloat(selectedTransaction.detailsData.difference) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {parseFloat(selectedTransaction.detailsData.difference) >= 0 ? '+' : ''}{selectedTransaction.detailsData.difference} {selectedTransaction.detailsData.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Reconciled By</p>
                        <p className="font-medium">{selectedTransaction.detailsData.reconciledBy || selectedTransaction.createdBy}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Notes</p>
                      <p className="font-medium">{selectedTransaction.detailsData.notes || 'No notes provided'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div >
        </div >
      )
      }

      {
        showFlowModal && flowTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowFlowModal(false)}>
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-lg p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" style={{ color: 'var(--primary)' }}>
                    <line x1="6" x2="6" y1="3" y2="15"></line>
                    <circle cx="18" cy="6" r="3"></circle>
                    <circle cx="6" cy="18" r="3"></circle>
                    <path d="M18 9a9 9 0 0 1-9 9"></path>
                  </svg>
                  Transaction Flow
                </h2>
              </div>

              <div className="space-y-6 mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-green-600">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="m9 12 2 2 4-4"></path>
                    </svg>
                    Transaction Flow Tracker
                  </h3>
                  <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-gray-300 bg-white shadow-sm hover:bg-gray-100 h-9 px-4 py-2" onClick={() => setShowFlowModal(false)}>
                    Close
                  </button>
                </div>

                <div className="relative w-full rounded-lg border px-4 py-3 text-sm bg-blue-50 border-blue-200">
                  <div className="text-sm text-blue-900">
                    <strong>Transaction Flow:</strong> Track the complete lifecycle of this transaction, including all related movements, additional materials, and returns.
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-green-600">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="m9 12 2 2 4-4"></path>
                    </svg>
                    Original Transaction
                  </h4>

                  <div className="relative">
                    <div className="rounded-xl shadow-lg border-2 hover:shadow-xl transition-shadow">
                      <div className="flex flex-col space-y-1.5 p-6 pb-3 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg shadow-sm bg-white">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-blue-600">
                                <path d="M16 16h6"></path>
                                <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"></path>
                                <path d="m7.5 4.27 9 5.15"></path>
                                <polyline points="3.29 7 12 12 20.71 7"></polyline>
                                <line x1="12" x2="12" y1="22" y2="12"></line>
                              </svg>
                            </div>
                            <div>
                              <div className="font-semibold tracking-tight text-lg flex items-center gap-2">
                                {flowTransaction.type} - {flowTransaction.id}
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                {flowTransaction.date} {flowTransaction.time}
                              </p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors shadow ${flowTransaction.status.variant === 'success' ? 'bg-green-100 text-green-800' : flowTransaction.status.variant === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                            {flowTransaction.status.label}
                          </span>
                        </div>
                      </div>
                      <div className="p-6 pt-4">
                        <div className="space-y-2 text-sm">
                          {flowTransaction.detailsData?.voidType === "Transaction Void" ? (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Void Type:</span>
                                <span className="font-medium text-red-600">Transaction Void</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Original Transaction:</span>
                                <span className="font-mono text-sm">{flowTransaction.detailsData?.originalTransactionId || "N/A"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Transaction Type:</span>
                                <span className="font-medium capitalize">{flowTransaction.detailsData?.originalTransactionType?.replace('_', ' ') || "N/A"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Void Reason:</span>
                                <span className="font-medium text-sm">{flowTransaction.detailsData?.voidReason || "No reason provided"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Voided By:</span>
                                <span className="font-medium">{flowTransaction.detailsData?.voidedBy || flowTransaction.createdBy}</span>
                              </div>
                            </>
                          ) : flowTransaction.type === "Material Dispatch" ? (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Type:</span>
                                <span className="font-medium">{flowTransaction.detailsData?.dispatchType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Dispatch To Customer"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Items:</span>
                                <span className="font-medium">{flowTransaction.detailsData?.productName || flowTransaction.rawData?.item_name || "N/A"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Quantity:</span>
                                <span className="font-medium">-{flowTransaction.detailsData?.quantity || 0} {flowTransaction.detailsData?.unit || "Piece"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Reference Document:</span>
                                <span className="font-medium">{flowTransaction.rawData?.reference_document || flowTransaction.detailsData?.referenceDocument || "N/A"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Receiver:</span>
                                <span className="font-medium">{flowTransaction.rawData?.receiver_name || flowTransaction.detailsData?.customerName || "N/A"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Drop Point:</span>
                                <span className="font-medium">{flowTransaction.detailsData?.deliveryAddress || flowTransaction.rawData?.delivery_address || "N/A"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Vehicle/Transport Info:</span>
                                <span className="font-medium">{flowTransaction.rawData?.vehicle_info || flowTransaction.detailsData?.vehicleInfo || "N/A"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Recorded By:</span>
                                <span className="font-medium">{flowTransaction.createdBy}</span>
                              </div>
                            </>
                          ) : flowTransaction.type === "Inventory Correction" ? (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Item Type:</span>
                                <span className="font-medium capitalize">{flowTransaction.detailsData?.itemType?.replace('_', ' ') || "N/A"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Item Name:</span>
                                <span className="font-medium">{flowTransaction.detailsData?.itemName || "N/A"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Old Quantity:</span>
                                <span className="font-medium">{flowTransaction.detailsData?.oldQuantity ?? 0} {flowTransaction.detailsData?.unit ?? "units"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">New Quantity:</span>
                                <span className="font-medium">{flowTransaction.detailsData?.newQuantity ?? 0} {flowTransaction.detailsData?.unit ?? "units"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Difference:</span>
                                <span className={`font-bold ${(flowTransaction.detailsData?.difference ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {(flowTransaction.detailsData?.difference ?? 0) >= 0 ? '+' : ''}{flowTransaction.detailsData?.difference ?? 0} {flowTransaction.detailsData?.unit ?? "units"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Reason:</span>
                                <span className="font-medium text-sm">{flowTransaction.detailsData?.reason || "No reason provided"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Corrected By:</span>
                                <span className="font-medium">{flowTransaction.detailsData?.correctedBy || flowTransaction.createdBy}</span>
                              </div>
                            </>
                          ) : flowTransaction.type === "Inventory Reconciliation" ? (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Item:</span>
                                <span className="font-medium">{flowTransaction.detailsData?.itemName || "N/A"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">System Quantity:</span>
                                <span className="font-medium">{flowTransaction.detailsData?.systemQuantity ?? 0} {flowTransaction.detailsData?.unit ?? "units"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Physical Quantity:</span>
                                <span className="font-medium">{flowTransaction.detailsData?.physicalQuantity ?? 0} {flowTransaction.detailsData?.unit ?? "units"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Difference:</span>
                                <span className="font-medium">{(flowTransaction.detailsData?.difference ?? 0) >= 0 ? '+' : ''}{flowTransaction.detailsData?.difference ?? 0} {flowTransaction.detailsData?.unit ?? "units"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Reconciled By:</span>
                                <span className="font-medium">{flowTransaction.detailsData?.reconciledBy || flowTransaction.createdBy}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Type:</span>
                                <span className="font-medium capitalize">{(flowTransaction.detailsData?.issueType || flowTransaction.detailsData?.inwardType || flowTransaction.detailsData?.dispatchType || "Standard")?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Product:</span>
                                <span className="font-medium">{flowTransaction.detailsData?.productName || flowTransaction.detailsData?.product || flowTransaction.detailsData?.materialName || "N/A"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Materials:</span>
                                <span className="font-medium">{flowTransaction.detailsData?.items?.length || 0} items</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Issued By:</span>
                                <span className="font-medium">{flowTransaction.createdBy}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Materials Section - show if there are linked additional materials */}
                {flowTransaction.rawData?.additionalMaterials?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-purple-600">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                      </svg>
                      Additional Materials Issued ({flowTransaction.rawData.additionalMaterials.length})
                    </h4>

                    <div className="relative w-full rounded-lg border px-4 py-3 text-sm bg-purple-50 border-purple-200">
                      <div className="text-sm text-purple-900">
                        These materials were issued as additional/supplementary items for this production order.
                      </div>
                    </div>

                    <div className="relative">
                      {flowTransaction.rawData.additionalMaterials.map((addMaterial, index) => (
                        <div key={index} className="rounded-xl shadow-lg border-2 hover:shadow-xl transition-shadow ml-8 border-purple-300 mb-3">
                          <div className="flex flex-col space-y-1.5 p-6 pb-3 bg-gradient-to-r from-purple-50 to-white">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg shadow-sm bg-purple-50">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-purple-600">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                  </svg>
                                </div>
                                <div>
                                  <div className="font-semibold tracking-tight text-lg flex items-center gap-2">
                                    Additional Materials - {addMaterial.transaction_id}
                                    <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors shadow bg-purple-100 text-purple-800">
                                      Linked
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-500 mt-1">{addMaterial.date}</p>
                                </div>
                              </div>
                              <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors shadow ${addMaterial.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {addMaterial.status}
                              </span>
                            </div>
                          </div>
                          <div className="p-6 pt-4">
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Type:</span>
                                <span className="font-medium text-purple-700">Additional Materials</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Transaction ID:</span>
                                <span className="font-mono text-sm font-semibold text-purple-800">{addMaterial.transaction_id || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Linked To:</span>
                                <span className="font-mono text-xs">{addMaterial.linkedTo}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">For Product:</span>
                                <span className="font-medium">{addMaterial.productName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Materials:</span>
                                <span className="font-medium">{addMaterial.materialsCount} items</span>
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <span className="text-gray-600 text-xs">Reason:</span>
                                <p className="text-sm font-medium mt-1">{addMaterial.reason}</p>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Issued By:</span>
                                <span className="font-medium">{addMaterial.created_by}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Production Completed Section - only show if status is completed AND it's a production issue (not additional material) */}
                {flowTransaction.status.variant === 'success' &&
                  flowTransaction.type === 'Material Issue' &&
                  flowTransaction.detailsData?.issueType === 'Production' && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-purple-600">
                          <path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"></path>
                          <path d="m18 15 4-4"></path>
                          <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"></path>
                        </svg>
                        Production Completed
                      </h4>

                      <div className="relative">
                        <div className="rounded-xl shadow-lg border-2 hover:shadow-xl transition-shadow">
                          <div className="flex flex-col space-y-1.5 p-6 pb-3 bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg shadow-sm bg-white">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-purple-600">
                                    <path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"></path>
                                    <path d="m18 15 4-4"></path>
                                    <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"></path>
                                  </svg>
                                </div>
                                <div>
                                  <div className="font-semibold tracking-tight text-lg flex items-center gap-2">
                                    Production Completed
                                  </div>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {flowTransaction.date} {flowTransaction.time}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="p-6 pt-4">
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Product:</span>
                                <span className="font-medium">{flowTransaction.detailsData?.productName || "N/A"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Completed:</span>
                                <span className="font-bold text-purple-600">{flowTransaction.detailsData?.quantity || flowTransaction.detailsData?.plannedQuantity || 0} units</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Planned:</span>
                                <span className="font-medium">{flowTransaction.detailsData?.plannedQuantity || 0} units</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Yield:</span>
                                <span className="font-bold text-green-600">
                                  {flowTransaction.detailsData?.plannedQuantity && flowTransaction.detailsData?.quantity
                                    ? `${((flowTransaction.detailsData.quantity / flowTransaction.detailsData.plannedQuantity) * 100).toFixed(1)}%`
                                    : '100.0%'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                <div className="rounded-xl shadow bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
                  <div className="flex flex-col space-y-1.5 p-6 pb-3">
                    <div className="font-semibold tracking-tight text-lg">Flow Summary</div>
                  </div>
                  <div className="p-6 pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                      <div>
                        <p className="text-3xl font-bold text-blue-600">1</p>
                        <p className="text-sm text-gray-600">Total Transactions</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-purple-600">{flowTransaction.rawData?.additionalMaterials?.length || 0}</p>
                        <p className="text-sm text-gray-600">Additional Materials</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-green-600">0</p>
                        <p className="text-sm text-gray-600">Returns</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-purple-600">{flowTransaction.status.variant === 'success' ? '1' : '0'}</p>
                        <p className="text-sm text-gray-600">Completions</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-orange-600">{flowTransaction.status.variant === 'success' ? 'Closed' : 'Active'}</p>
                        <p className="text-sm text-gray-600">Status</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400" onClick={() => setShowFlowModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        )
      }
    </>
  );
}
import React, { useState, useEffect } from "react";
import toast from '../utils/toast';
import { reportsService } from "../services";
import * as XLSX from 'xlsx';

const tabs = [
  { id: "inward", label: "Inward" },
  { id: "issue", label: "Issue" },
  { id: "dispatch", label: "Dispatch" },
  { id: "activity", label: "Activity" },
  { id: "exceptions", label: "Exceptions" },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState("inward");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({ count: 0, totalValue: '₹0.00' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only fetch data if both start and end dates are selected
    if (startDate && endDate) {
      fetchReportData();
    } else {
      // Reset data when dates are not fully selected
      setReportData([]);
      setSummary({ count: 0, totalValue: '₹0.00' });
    }
  }, [activeTab, startDate, endDate]);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Create a copy of endDate and set it to end of day to include all transactions on that day
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);

      const params = {
        startDate: startDate.toISOString(),
        endDate: endOfDay.toISOString()
      };

      const response = await reportsService.getReport(activeTab, params);
      setReportData(response.data || []);
      setSummary(response.summary || { count: 0, totalValue: '₹0.00' });
    } catch (error) {
      console.error('Error fetching report:', error);
      setReportData([]);
      setSummary({ count: 0, totalValue: '₹0.00' });
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (type, date) => {
    if (type === 'start') {
      setStartDate(date);
      if (endDate && date > endDate) setEndDate(null);
    } else {
      if (!startDate || date >= startDate) {
        setEndDate(date);
      }
    }
  };

  const formatDateRange = () => {
    if (!startDate) return "All Time";

    const formatDate = (date) => {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    if (endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    return formatDate(startDate);
  };

  const exportToExcel = () => {
    if (reportData.length === 0) {
      toast.warning('No data to export');
      return;
    }

    // Create a clean copy of data for export with proper headers
    const headerMapping = {
      date: 'Date',
      time: 'Time',
      id: 'ID',
      type: 'Type',
      material: 'Material',
      quantity: 'Quantity',
      costPerUnit: 'Cost/Unit',
      totalValue: 'Total Value',
      totalCost: 'Total Cost',
      supplier: 'Supplier',
      invoiceGrn: 'Invoice/GRN',
      storekeeper: 'Storekeeper',
      customer: 'Customer',
      product: 'Product',
      pricePerUnit: 'Price/Unit',
      invoice: 'Invoice',
      vehicle: 'Vehicle',
      status: 'Status',
      photo: 'Photo',
      details: 'Details',
      issuedBy: 'Issued By',
      item: 'Item',
      user: 'User',
      adminAction: 'Admin Action',
      remarks: 'Remarks'
    };

    // Transform data with clean headers
    const exportData = reportData.map(row => {
      const newRow = {};
      Object.keys(row).forEach(key => {
        const header = headerMapping[key] || key;
        newRow[header] = row[key];
      });
      return newRow;
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns
    const colWidths = {};
    exportData.forEach(row => {
      Object.keys(row).forEach(key => {
        const value = String(row[key] || '');
        const currentWidth = colWidths[key] || key.length;
        colWidths[key] = Math.max(currentWidth, value.length);
      });
    });

    ws['!cols'] = Object.keys(colWidths).map(key => ({
      wch: Math.min(colWidths[key] + 2, 30) // Add padding, max 30 chars
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    const sheetName = activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + ' Report';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate filename
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const fileName = `${activeTab}_report_${dateStr}.xlsx`;

    // Save file
    XLSX.writeFile(wb, fileName);

    toast.success('Report exported successfully');
  };

  const getTabIcon = (tabId) => {
    switch (tabId) {
      case 'inward':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
            <path d="m3.3 7 8.7 5 8.7-5"></path>
            <path d="M12 22V12"></path>
          </svg>
        );
      case 'issue':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
        );
      case 'dispatch':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" x2="11" y1="2" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        );
      case 'activity':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        );
      case 'exceptions':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" x2="8" y1="13" y2="13"></line>
            <line x1="16" x2="8" y1="17" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        );
      default:
        return null;
    }
  };

  const renderTableHeaders = () => {
    switch (activeTab) {
      case 'inward':
        return (
          <tr>
            <th>Date & Time</th>
            <th>Inward ID</th>
            <th>Type</th>
            <th>Material</th>
            <th>Quantity</th>
            <th>Cost/Unit</th>
            <th>Total Value</th>
            <th>Supplier</th>
            <th>Invoice/GRN</th>
            <th>Storekeeper</th>
          </tr>
        );
      case 'issue':
        return (
          <tr>
            <th>Date & Time</th>
            <th>Issue ID</th>
            <th>Type</th>
            <th>Details</th>
            <th>Total Value</th>
            <th>Status</th>
            <th>Issued By</th>
          </tr>
        );
      case 'dispatch':
        return (
          <tr>
            <th>Date & Time</th>
            <th>Dispatch ID</th>
            <th>Customer</th>
            <th>Product</th>
            <th>Quantity</th>
            <th>Price/Unit</th>
            <th>Total Value</th>
            <th>Invoice</th>
            <th>Vehicle</th>
            <th>Status</th>
            <th>Photo</th>
          </tr>
        );
      case 'activity':
        return (
          <tr>
            <th>Date & Time</th>
            <th>Transaction ID</th>
            <th>Type</th>
            <th>Item</th>
            <th>Quantity</th>
            <th>Status</th>
            <th>User</th>
          </tr>
        );
      case 'exceptions':
        return (
          <tr>
            <th>Exception ID</th>
            <th>Exception Type</th>
            <th>Item/Product</th>
            <th>Quantity</th>
            <th>Storekeeper</th>
            <th>Date</th>
            <th>Time</th>
            <th>Admin Action</th>
            <th>Remarks</th>
          </tr>
        );
      default:
        return null;
    }
  };

  const renderTableRows = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan="10" className="empty-cell">
            Loading...
          </td>
        </tr>
      );
    }

    if (reportData.length === 0) {
      const message = (!startDate || !endDate)
        ? "Please select both start and end dates to generate a report"
        : "No data found for the selected date range";

      return (
        <tr>
          <td colSpan="10" className="empty-cell">
            {message}
          </td>
        </tr>
      );
    }

    return reportData.map((row, idx) => {
      switch (activeTab) {
        case 'inward':
          return (
            <tr key={idx}>
              <td>{row.date} {row.time}</td>
              <td>{row.id}</td>
              <td>{row.type}</td>
              <td>{row.material}</td>
              <td>{row.quantity}</td>
              <td>{row.costPerUnit}</td>
              <td>{row.totalValue}</td>
              <td>{row.supplier}</td>
              <td>{row.invoiceGrn}</td>
              <td>{row.storekeeper}</td>
            </tr>
          );
        case 'issue':
          const getStatusClass = (status) => {
            if (status === 'in production') return 'info';
            if (status === 'pending approval') return 'warning';
            if (status === 'approved' || status === 'completed') return 'success';
            if (status === 'rejected') return 'error';
            return 'muted';
          };

          return (
            <tr key={idx}>
              <td>{row.date} {row.time}</td>
              <td>{row.id}</td>
              <td>{row.type}</td>
              <td>{row.details}</td>
              <td>{row.totalValue}</td>
              <td><span className={`status-chip ${getStatusClass(row.status)}`}>{row.status}</span></td>
              <td>{row.issuedBy}</td>
            </tr>
          );
        case 'dispatch':
          return (
            <tr key={idx}>
              <td>{row.date} {row.time}</td>
              <td>{row.id}</td>
              <td>{row.customer}</td>
              <td>{row.product}</td>
              <td>{row.quantity}</td>
              <td>{row.pricePerUnit}</td>
              <td>{row.totalValue}</td>
              <td>{row.invoice}</td>
              <td>{row.vehicle}</td>
              <td><span className={`status-chip ${row.status === 'completed' ? 'success' : 'warning'}`}>{row.status}</span></td>
              <td>{row.photo ? '📷' : '-'}</td>
            </tr>
          );
        case 'activity':
          return (
            <tr key={idx}>
              <td>{row.date} {row.time}</td>
              <td>{row.id}</td>
              <td>{row.type}</td>
              <td>{row.item}</td>
              <td>{row.quantity}</td>
              <td><span className={`status-chip ${row.status === 'completed' ? 'success' : 'warning'}`}>{row.status}</span></td>
              <td>{row.user}</td>
            </tr>
          );
        case 'exceptions':
          return (
            <tr key={idx}>
              <td>{row.id}</td>
              <td>{row.type}</td>
              <td>{row.item}</td>
              <td>{row.quantity}</td>
              <td>{row.storekeeper}</td>
              <td>{row.date}</td>
              <td>{row.time}</td>
              <td>{row.adminAction || '-'}</td>
              <td>{row.remarks}</td>
            </tr>
          );
        default:
          return null;
      }
    });
  };

  const getReportTitle = () => {
    const tabLabel = tabs.find(t => t.id === activeTab)?.label || activeTab;
    return `${tabLabel} Report`;
  };

  return (
    <>
      <header className="main-header">
        <div className="main-title reports-title">
          <div className="title-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text w-8 h-8"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
          </div>
          <div>
            <h1>Reports Dashboard</h1>
            <p>Comprehensive reports for all store operations - filter, analyze, and export data</p>
          </div>
        </div>
      </header>

      <section className="reports-section">
        <div className="reports-card">
          <div className="form-field">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Select Date Range</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Start Date</label>
                <input
                  type="date"
                  value={startDate ? startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleDateSelect('start', e.target.value ? new Date(e.target.value) : null)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>End Date</label>
                <input
                  type="date"
                  value={endDate ? endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleDateSelect('end', e.target.value ? new Date(e.target.value) : null)}
                  disabled={!startDate}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    opacity: startDate ? 1 : 0.5
                  }}
                />
              </div>
              <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end' }}>
                <button
                  onClick={() => { setStartDate(null); setEndDate(null); }}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="reports-tabs reports-tab-list" role="tablist" style={{ marginTop: '2rem' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`reports-tab${tab.id === activeTab ? " active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                data-state={tab.id === activeTab ? "active" : ""}
              >
                {getTabIcon(tab.id)}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="reports-table-container">
            <header className="reports-table-header">
              <div>
                <h3>{getReportTitle()}</h3>
                <p>
                  {activeTab === 'dispatch'
                    ? `${summary.count} dispatches${summary.completedCount !== undefined ? ` • ${summary.completedCount} completed` : ''}${summary.totalRevenue ? ` • Revenue: ${summary.totalRevenue}` : ''}`
                    : `${summary.count} entries${summary.totalValue ? ` • Total Value: ${summary.totalValue}` : ''}`
                  }
                </p>
              </div>
              <button
                className={`ghost-btn${reportData.length === 0 ? ' disabled' : ''}`}
                disabled={reportData.length === 0}
                onClick={exportToExcel}
              >
                Export to Excel
              </button>
            </header>

            {(!startDate || !endDate) ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
                  <path d="M8 2v4"></path>
                  <path d="M16 2v4"></path>
                  <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                  <path d="M3 10h18"></path>
                </svg>
                <p style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Select a date range to view report</p>
                <p style={{ fontSize: '13px', margin: '8px 0 0', color: '#cbd5e1' }}>Choose both start and end dates above to generate the report</p>
              </div>
            ) : (
              <div className="reports-table-wrapper">
                <table className="reports-table">
                  <thead>
                    {renderTableHeaders()}
                  </thead>
                  <tbody>
                    {renderTableRows()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}



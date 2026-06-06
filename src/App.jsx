import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import LoginScreen from './pages/LoginScreen';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import VendorManagement from './pages/VendorManagement';
import RFQManagement from './pages/RFQManagement';
import QuotationComparison from './pages/QuotationComparison';
import ApprovalsScreen from './pages/ApprovalsScreen';
import PurchaseOrders from './pages/PurchaseOrders';
import InvoiceManagement from './pages/InvoiceManagement';
import ActivityLogs from './pages/ActivityLogs';
import ReportsAnalytics from './pages/ReportsAnalytics';
import UserManagement from './pages/UserManagement';
import VendorRFQList from './pages/vendor/VendorRFQList';
import MyQuotations from './pages/vendor/MyQuotations';
import VendorPOs from './pages/vendor/VendorPOs';
import VendorInvoices from './pages/vendor/VendorInvoices';

const PageRenderer = () => {
  const { currentUser, currentPage } = useApp();
  if (!currentUser) return <LoginScreen />;

  const pages = {
    dashboard:        <Dashboard />,
    vendors:          <VendorManagement />,
    rfqs:             <RFQManagement />,
    comparison:       <QuotationComparison />,
    approvals:        <ApprovalsScreen />,
    pos:              <PurchaseOrders />,
    invoices:         <InvoiceManagement />,
    logs:             <ActivityLogs />,
    reports:          <ReportsAnalytics />,
    users:            <UserManagement />,
    'vendor-rfqs':    <VendorRFQList />,
    'my-quotations':  <MyQuotations />,
    'vendor-pos':     <VendorPOs />,
    'vendor-invoices':<VendorInvoices />,
  };

  return (
    <Layout>
      {pages[currentPage] || <Dashboard />}
    </Layout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <PageRenderer />
    </AppProvider>
  );
}
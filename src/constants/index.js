export const ROLES = {
  ADMIN:   'admin',
  OFFICER: 'officer',
  VENDOR:  'vendor',
  MANAGER: 'manager',
};

export const NAV_CONFIG = {
  [ROLES.ADMIN]: [
    { key: 'dashboard',  label: 'Dashboard',          icon: 'dashboard' },
    { key: 'vendors',    label: 'Vendor Management',  icon: 'vendors' },
    { key: 'rfqs',       label: 'RFQ Management',     icon: 'rfq' },
    { key: 'quotations', label: 'Quotations',          icon: 'quotations' },
    { key: 'approvals',  label: 'Approvals',           icon: 'approvals', badge: true },
    { key: 'pos',        label: 'Purchase Orders',     icon: 'pos' },
    { key: 'invoices',   label: 'Invoices',            icon: 'invoices' },
    { key: 'logs',       label: 'Activity Logs',       icon: 'logs' },
    { key: 'reports',    label: 'Reports & Analytics', icon: 'reports' },
    { key: 'users',      label: 'User Management',     icon: 'users' },
  ],
  [ROLES.OFFICER]: [
    { key: 'dashboard',  label: 'Dashboard',           icon: 'dashboard' },
    { key: 'vendors',    label: 'Vendor Management',   icon: 'vendors' },
    { key: 'rfqs',       label: 'RFQ Management',      icon: 'rfq' },
    { key: 'quotations', label: 'Quotations',           icon: 'quotations' },
    { key: 'comparison', label: 'Quote Comparison',    icon: 'comparison' },
    { key: 'pos',        label: 'Purchase Orders',     icon: 'pos' },
    { key: 'invoices',   label: 'Invoices',            icon: 'invoices' },
    { key: 'logs',       label: 'Activity Logs',       icon: 'logs' },
    { key: 'reports',    label: 'Reports & Analytics', icon: 'reports' },
  ],
  [ROLES.VENDOR]: [
    { key: 'dashboard',       label: 'Dashboard',            icon: 'dashboard' },
    { key: 'vendor-rfqs',     label: 'My RFQs',              icon: 'rfq' },
    { key: 'my-quotations',   label: 'My Quotations',        icon: 'quotations' },
    { key: 'vendor-pos',      label: 'My Purchase Orders',   icon: 'pos' },
    { key: 'vendor-invoices', label: 'My Invoices',          icon: 'invoices' },
  ],
  [ROLES.MANAGER]: [
    { key: 'dashboard', label: 'Dashboard',           icon: 'dashboard' },
    { key: 'approvals', label: 'Approvals',           icon: 'approvals', badge: true },
    { key: 'rfqs',      label: 'RFQ Overview',        icon: 'rfq' },
    { key: 'pos',       label: 'Purchase Orders',     icon: 'pos' },
    { key: 'reports',   label: 'Reports & Analytics', icon: 'reports' },
    { key: 'logs',      label: 'Activity Logs',       icon: 'logs' },
  ],
};

export const STATUS = {
  RFQ:       { OPEN: 'Open', CLOSED: 'Closed', DRAFT: 'Draft', CANCELLED: 'Cancelled' },
  QUOTATION: { SUBMITTED: 'Submitted', SELECTED: 'Selected', REJECTED: 'Rejected' },
  APPROVAL:  { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' },
  PO:        { PENDING: 'Pending', DELIVERED: 'Delivered', CANCELLED: 'Cancelled' },
  INVOICE:   { UNPAID: 'Unpaid', PAID: 'Paid', OVERDUE: 'Overdue' },
  VENDOR:    { ACTIVE: 'Active', INACTIVE: 'Inactive', BLACKLISTED: 'Blacklisted' },
};

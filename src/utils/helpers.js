export const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

export const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const uid = (prefix = 'id') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const calcGST = (amount, rate) => ({
  subtotal: amount,
  cgst:     amount * rate / 200,
  sgst:     amount * rate / 200,
  total:    amount * (1 + rate / 100),
});

export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const statusColor = {
  Open:            '#16A34A',
  Closed:          '#6B7280',
  Pending:         '#D97706',
  Approved:        '#16A34A',
  Rejected:        '#DC2626',
  Submitted:       '#1B4FD8',
  Selected:        '#7C3AED',
  Active:          '#16A34A',
  Inactive:        '#6B7280',
  Delivered:       '#16A34A',
  Paid:            '#16A34A',
  Unpaid:          '#D97706',
  Overdue:         '#DC2626',
  Draft:           '#6B7280',
  Cancelled:       '#DC2626',
  'Approval Pending': '#D97706',
};

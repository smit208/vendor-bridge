import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { timeAgo } from '../utils/helpers';
import Icon from './Icon';
import Avatar from './Avatar';

const PAGE_LABELS = {
  dashboard: 'Dashboard', vendors: 'Vendor Management', rfqs: 'RFQ Management',
  quotations: 'Quotations', comparison: 'Quotation Comparison', approvals: 'Approvals',
  pos: 'Purchase Orders', invoices: 'Invoices', logs: 'Activity Logs',
  reports: 'Reports & Analytics', users: 'User Management',
  'vendor-rfqs': 'My RFQs', 'my-quotations': 'My Quotations',
  'vendor-pos': 'My Purchase Orders', 'vendor-invoices': 'My Invoices',
};

function NotificationBell() {
  const { userNotifications, unreadCount, markAllRead } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="btn-icon btn-secondary" onClick={() => setOpen(o => !o)} style={{ position: 'relative' }}>
        <Icon name="bell" size={16} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span>Notifications</span>
            {unreadCount > 0 && <button className="btn btn-sm btn-secondary" onClick={markAllRead}>Mark all read</button>}
          </div>
          <div className="notif-list">
            {userNotifications.slice(0, 10).map(n => (
              <div key={n.id} className={`notif-item${n.read ? '' : ' unread'}`}>
                <div className="notif-message">{n.message}</div>
                <div className="notif-time">{timeAgo(n.time)}</div>
              </div>
            ))}
            {!userNotifications.length && <div className="notif-empty">No notifications</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header({ collapsed, setCollapsed, setMobileOpen }) {
  const { currentPage, currentUser, logout } = useApp();
  const isMobile = window.innerWidth <= 768;
  return (
    <header className={`header${!isMobile && collapsed ? ' sidebar-collapsed' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {isMobile && (
          <button className="btn-icon btn-secondary" onClick={() => setMobileOpen(o => !o)}>
            <Icon name="menu" size={16} />
          </button>
        )}
        <h1 className="header-title">{PAGE_LABELS[currentPage] || 'VendorBridge'}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <NotificationBell />
        <div className="divider-v" />
        <Avatar name={currentUser?.name} size={30} />
      </div>
    </header>
  );
}

import { useApp } from '../context/AppContext';
import { NAV_CONFIG } from '../constants';
import Icon from './Icon';
import logo from '../../logo.png';

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { currentUser, currentPage, setCurrentPage, pendingApprovalsCount } = useApp();
  if (!currentUser) return null;
  const navItems = NAV_CONFIG[currentUser.role] || [];
  const isMobile = window.innerWidth <= 768;

  return (
    <>
      {isMobile && mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`sidebar${collapsed && !isMobile ? ' collapsed' : ''}${isMobile && mobileOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-logo" style={{ justifyContent: collapsed && !isMobile ? 'center' : 'space-between', padding: '0 12px' }}>
          {(!collapsed || isMobile) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={logo} alt="VendorBridge" style={{ width: 30, height: 30, borderRadius: 7 }} />
              <span className="sidebar-logo-text">VendorBridge</span>
            </div>
          )}
          {!isMobile && (
            <button
              onClick={() => setCollapsed(c => !c)}
              className="sidebar-collapse-btn"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={13} />
            </button>
          )}
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <div
              key={item.key}
              className={`nav-item${currentPage === item.key ? ' active' : ''}`}
              onClick={() => { setCurrentPage(item.key); if (isMobile) setMobileOpen(false); }}
              title={item.label}
            >
              <Icon name={item.icon} size={16} />
              {(!collapsed || isMobile) && <span className="nav-item-label">{item.label}</span>}
              {(!collapsed || isMobile) && item.badge && pendingApprovalsCount > 0 && (
                <span className="nav-badge">{pendingApprovalsCount}</span>
              )}
            </div>
          ))}
        </nav>
        {(!collapsed || isMobile) && <div className="sidebar-footer">VendorBridge v1.0.0</div>}
      </aside>
    </>
  );
}

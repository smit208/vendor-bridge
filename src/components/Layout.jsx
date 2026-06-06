import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <Header
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        setMobileOpen={setMobileOpen}
      />
      <main className={`main-content${collapsed && window.innerWidth > 768 ? ' sidebar-collapsed' : ''}`}>
        {children}
      </main>
    </div>
  );
}

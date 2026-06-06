import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardService, inventoryService } from "../services";
import authService from "../services/authService";

const icons = {
  creditCard: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-credit-card h-6 w-6">
      <rect width="20" height="14" x="2" y="5" rx="2"></rect>
      <line x1="2" x2="22" y1="10" y2="10"></line>
    </svg>
  ),
  activity: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-activity h-6 w-6">
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path>
    </svg>
  ),
  bell: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell h-6 w-6">
      <path d="M10.268 21a2 2 0 0 0 3.464 0"></path>
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path>
    </svg>
  ),
  triangleAlert: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-triangle-alert h-6 w-6">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>
      <path d="M12 9v4"></path>
      <path d="M12 17h.01"></path>
    </svg>
  ),
  boxes: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-boxes w-5 h-5">
      <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"></path>
      <path d="m7 16.5-4.74-2.85"></path>
      <path d="m7 16.5 5-3"></path>
      <path d="M7 16.5v5.17"></path>
      <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"></path>
      <path d="m17 16.5-5-3"></path>
      <path d="m17 16.5 4.74-2.85"></path>
      <path d="M17 16.5v5.17"></path>
      <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"></path>
      <path d="M12 8 7.26 5.15"></path>
      <path d="m12 8 4.74-2.85"></path>
      <path d="M12 13.5V8"></path>
    </svg>
  ),
  packageMinus: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-package-minus h-5 w-5">
      <path d="M16 16h6"></path>
      <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"></path>
      <path d="m7.5 4.27 9 5.15"></path>
      <polyline points="3.29 7 12 12 20.71 7"></polyline>
      <line x1="12" x2="12" y1="22" y2="12"></line>
    </svg>
  ),
  packagePlus: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-package-plus h-5 w-5">
      <path d="M16 16h6"></path>
      <path d="M19 13v6"></path>
      <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"></path>
      <path d="m7.5 4.27 9 5.15"></path>
      <polyline points="3.29 7 12 12 20.71 7"></polyline>
      <line x1="12" x2="12" y1="22" y2="12"></line>
    </svg>
  ),
  hammer: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-hammer h-6 w-6">
      <path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"></path>
      <path d="m18 15 4-4"></path>
      <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"></path>
    </svg>
  ),
  send: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send h-6 w-6">
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"></path>
      <path d="m21.854 2.147-10.94 10.939"></path>
    </svg>
  ),
};

const recentActivities = [
  {
    title: "Production Issue",
    date: "Added 19/11/2025",
    code: "PROD-176",
    icon: icons.packageMinus,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    title: "Material Issue",
    date: "Added 15/11/2025",
    code: "ADD-PROD",
    icon: icons.packageMinus,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    title: "Production Issue",
    date: "Added 15/11/2025",
    code: "PROD-176",
    icon: icons.packageMinus,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600"
  },
  {
    title: "customer return",
    date: "Added 15/11/2025",
    code: "IN-17631",
    icon: icons.packagePlus,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    title: "return from production",
    date: "Added 15/11/2025",
    code: "IN-17631",
    icon: icons.packagePlus,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    title: "purchase from supplier",
    date: "Added 15/11/2025",
    code: "IN-17631",
    icon: icons.packagePlus,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
];

const quickActions = [
  {
    title: "Issue Material",
    description: "Record material usage",
    icon: icons.packageMinus,
    iconBg: "bg-gradient-to-br from-purple-600 to-indigo-600",
    iconColor: "text-white",
    href: "/materialissue",
  },
  {
    title: "Complete Production",
    description: "Finish production orders",
    icon: icons.hammer,
    iconBg: "bg-yellow-500",
    iconColor: "text-white",
    href: "/productioncompletion",
  },
  {
    title: "Record Inward",
    description: "Add materials to stock",
    icon: icons.packagePlus,
    iconBg: "bg-green-500",
    iconColor: "text-white",
    href: "/materialinward",
  },
  {
    title: "Record Dispatch",
    description: "Ship products out",
    icon: icons.send,
    iconBg: "bg-orange-500",
    iconColor: "text-white",
    href: "/dispatch",
  },
];

export default function Dashboard({ onQuickActionClick }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRawMaterials: 0,
    totalFinalProducts: 0,
    lowStockItems: 0,
    pendingApprovals: 0,
    recentTransactions: 0,
    todayIssues: 0,
    pendingProduction: 0,
    totalInventoryValue: 0,
  });
  const [lowStockData, setLowStockData] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, lowStockResponse, recentActivityData] = await Promise.all([
        dashboardService.getStats(),
        inventoryService.getLowStock(),
        dashboardService.getRecentActivity(),
      ]);

      setStats(statsData);

      // Use allItems so Consumables and Sub Assemblies also appear
      const combined = (lowStockResponse.allItems || [
        ...lowStockResponse.rawMaterials,
        ...lowStockResponse.finalProducts,
      ]).slice(0, 4).map(item => ({ ...item, type: item.display_type || item.type || 'Raw Material' }));

      setLowStockData(combined);

      // Format recent activity data
      const formattedActivities = recentActivityData.slice(0, 7).map(txn => {
        const typeLabels = {
          'material_inward': 'Material Inward',
          'material_issue': 'Material Issue',
          'production_completion': 'Production Completion',
          'dispatch': 'Product Dispatch',
          'inventory_correction': 'Inventory Correction',
        };

        const isPositive = txn.transaction_type === 'material_inward' || txn.transaction_type === 'production_completion';

        return {
          title: typeLabels[txn.transaction_type] || txn.transaction_type,
          date: `Added ${new Date(txn.transaction_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
          code: txn.transaction_id,
          icon: isPositive ? icons.packagePlus : icons.packageMinus,
          iconBg: isPositive ? 'bg-green-100' : 'bg-purple-100',
          iconColor: isPositive ? 'text-green-600' : 'text-purple-600',
        };
      });

      setRecentActivities(formattedActivities);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickActionClick = (path) => {
    navigate(path);
  };

  const statusCards = [
    {
      title: "Today's Issues",
      value: loading ? "..." : stats.todayIssues.toString(),
      icon: icons.creditCard,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      title: "Pending Production",
      value: loading ? "..." : stats.pendingProduction.toString(),
      icon: icons.activity,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      title: "Low Stock Items",
      value: loading ? "..." : stats.lowStockItems.toString(),
      badge: stats.lowStockItems > 0 ? "Action required" : null,
      icon: icons.bell,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
    },
    {
      title: "Notifications",
      value: "0",
      icon: icons.triangleAlert,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <>
      <header className="main-header">
        <div className="main-title">
          <h1>My Dashboard</h1>
          <p>Welcome back, {authService.getCurrentUser()?.fullName || authService.getCurrentUser()?.username || 'User'}</p>

        </div>
        <button className="whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-primary/90 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl" onClick={() => handleQuickActionClick("/materialissue")}>
          + Quick Action
        </button>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statusCards.map((card) => (
          <div key={card.title} className="rounded-2xl bg-white p-6 shadow-lg transition-all hover:shadow-xl">
            <div className="mb-3 flex items-start justify-between">
              <div className={`rounded-2xl p-3 ${card.iconBg} ${card.iconColor}`}>
                {card.icon}
              </div>
              {card.badge && <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent shadow bg-red-500 text-xs text-white hover:bg-red-500">{card.badge}</div>}
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-gray-600">{card.title}</p>
              <h3 className="mb-2 text-3xl font-bold text-gray-900">{card.value}</h3>
              {card.delta && <div className="flex items-center gap-1"><span className="text-xs font-medium text-green-600">{card.delta}</span><span className="text-xs text-gray-500">vs. last month</span></div>}
            </div>
          </div>
        ))}
      </section>

      <section className="section">    <div className="section-header">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-triangle-alert w-5 h-5 text-orange-600"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>Low Stock Alerts</h2>
        <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 text-gray-600" onClick={() => navigate('/alerts')}>View All</button>
      </div>

        <div className="low-stock-alert">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-triangle-alert w-5 h-5 text-orange-600"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
            <strong>{stats.lowStockItems} item(s)</strong> are at or below minimum stock levels. Immediate action recommended.
          </div>
        </div>

        <div className="low-stock-items">
          {lowStockData.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No low stock items</div>
          ) : (
            lowStockData.map((item) => {
              const isOutOfStock = item.current_stock === 0;
              const level = isOutOfStock ? 'critical' : 'warning';

              return (
                <div key={item.id} className={`low-stock-card ${level}`}>
                  <div className="low-stock-card-icon">
                    {icons.boxes}
                  </div>
                  <div className="stock-info">
                    <span>{item.name}</span>
                    <span>{item.type}</span>
                  </div>
                  <div className="stock-count">
                    {item.current_stock} {item.unit}
                    <div className="min">Min: {item.minimum_stock}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <div className="section-grid">
        <section className="section activity-section">
          <div className="section-header">
            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 [&_svg]:size-4 [&_svg]:shrink-0 text-gray-600">View All</button>
          </div>

          <div className="activity-list">
            {loading ? (
              <div className="text-center text-gray-500 py-8">Loading activities...</div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No recent activities found</div>
            ) : (
              recentActivities.map((activity, index) => (
                <div key={`${activity.code}-${index}`} className="activity-item">
                  <div className="activity-info">
                    <div className={`activity-icon ${activity.iconBg} ${activity.iconColor}`}>{activity.icon}</div>
                    <div>
                      <p className="activity-title">{activity.title}</p>
                      <p className="activity-date">{activity.date}</p>
                    </div>
                  </div>
                  <div className="activity-meta">
                    <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground ml-2 font-mono text-xs">{activity.code}</div>
                    <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 w-9 shrink-0 hover:bg-gray-100 hover:text-gray-900">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ellipsis h-4 w-4 text-gray-400">

                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="19" cy="12" r="1"></circle>
                        <circle cx="5" cy="12" r="1"></circle>
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="section quick-section">

          <h2 className="mb-4 text-lg font-bold text-gray-900">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <a key={action.title} onClick={() => handleQuickActionClick(action.href)} data-discover="true" className="group flex cursor-pointer items-center gap-4 rounded-xl p-4 transition-all hover:bg-gray-50">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${action.iconBg} ${action.iconColor} transition-transform group-hover:scale-110`}>
                  {action.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{action.title}</p>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
              </a>
            ))}
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">OVERVIEW</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Inventory Value</span>
                <span className="font-bold text-green-600">₹{loading ? '...' : stats.totalInventoryValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active BOMs</span>
                <span className="font-bold text-gray-900">{loading ? '...' : stats.activeBoms || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Unique Materials</span>
                <span className="font-bold text-gray-900">{loading ? '...' : stats.uniqueMaterials || 0}</span>
              </div>
            </div>
          </div>

        </section>
      </div>
    </>
  );
}



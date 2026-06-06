import React, { useState, useEffect } from "react";
import { inventoryService } from "../services";

export default function LowStockAlerts() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lowStockData, setLowStockData] = useState({
    rawMaterials: [],
    finalProducts: [],
    totalCount: 0,
  });

  const fetchLowStockData = async () => {
    try {
      setError(null);
      const data = await inventoryService.getLowStock();
      setLowStockData(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching low stock data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStockData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLowStockData();
    setTimeout(() => { setIsRefreshing(false); }, 800);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading low stock alerts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  const { rawMaterials, finalProducts, totalCount } = lowStockData;

  // Use allItems if available (new backend), otherwise merge rawMaterials + finalProducts
  const allItems = lowStockData.allItems
    ? lowStockData.allItems
    : [
      ...rawMaterials.map(i => ({ ...i, display_type: 'Raw Material' })),
      ...finalProducts.map(i => ({ ...i, display_type: 'Finished Product' })),
    ];

  const TYPE_STYLES = {
    'Raw Material': { background: '#eff6ff', color: '#1d4ed8' },
    'Sub Assembly': { background: '#f5f3ff', color: '#7c3aed' },
    'Finished Product': { background: '#f0fdf4', color: '#15803d' },
    'Consumable': { background: '#fff7ed', color: '#c2410c' },
  };

  return (
    <>
      <header className="main-header">
        <div className="main-title">
          <h1>
            Low Stock Alerts
            {allItems.length > 0 && (
              <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 600, background: '#fee2e2', color: '#b91c1c', padding: '2px 10px', borderRadius: 9999, verticalAlign: 'middle' }}>
                {allItems.length} item{allItems.length !== 1 ? 's' : ''}
              </span>
            )}
          </h1>
          <p>Inventory items below minimum stock levels</p>
        </div>
        <button
          className="refresh-button-low-stock inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 shadow-sm"
          style={{ fontSize: '14px', width: '127px' }}
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-refresh-cw w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}>
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
            <path d="M21 3v5h-5"></path>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
            <path d="M8 16H3v5"></path>
          </svg>
          Refresh
        </button>
      </header>

      <div
        className="content-wrapper"
        style={{
          opacity: isRefreshing ? 0 : 1,
          transform: isRefreshing ? 'scale(0.98)' : 'scale(1)',
          transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out'
        }}
      >
        {/* Single Unified Table */}
        <div className="rounded-xl border bg-card text-card-foreground mb-6 shadow-xl" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="flex flex-col space-y-1.5 p-4 px-6 border-b" style={{ borderColor: 'rgb(224, 224, 224)' }}>
            <div className="font-semibold text-sm" style={{ color: '#374151' }}>Low Stock Items ({allItems.length})</div>
          </div>
          <div className="p-0">
            <div className="overflow-x-auto">
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&>tr]:border-b">
                    <tr className="border-b transition-colors" style={{ backgroundColor: 'var(--background)' }}>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Item Name</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Type</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Current Stock</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Minimum Level</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Deficit</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Unit</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="[&>tr:last-child]:border-0">
                    {allItems.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-4 text-center text-gray-500">No low stock items</td>
                      </tr>
                    ) : (
                      allItems.map((item, idx) => {
                        const isOutOfStock = item.current_stock === 0;
                        const statusColor = isOutOfStock ? 'rgb(183, 28, 28)' : 'rgb(255, 152, 0)';
                        const statusText = isOutOfStock ? 'OUT OF STOCK' : 'LOW';
                        const typeStyle = TYPE_STYLES[item.display_type] || { background: '#f1f5f9', color: '#374151' };

                        return (
                          <tr key={`${item.display_type}-${item.id ?? idx}`} className="border-b transition-colors hover:bg-muted/50">
                            <td className="p-2 align-middle font-medium">{item.name}</td>
                            <td className="p-2 align-middle">
                              <span style={{ ...typeStyle, display: 'inline-block', verticalAlign: 'middle', padding: '2px 10px 2px 0', borderRadius: 9999, fontSize: 13, fontWeight: 500 }}>
                                {item.display_type}
                              </span>
                            </td>
                            <td className="p-2 align-middle text-red-600 font-bold">{item.current_stock}</td>
                            <td className="p-2 align-middle">{item.minimum_stock}</td>
                            <td className="p-2 align-middle text-red-600">{Number(item.deficit || 0).toFixed(2)}</td>
                            <td className="p-2 align-middle whitespace-nowrap">{item.unit || ''}</td>
                            <td className="p-2 align-middle">
                              <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold border-transparent" style={{ backgroundColor: statusColor, color: 'white' }}>
                                {statusText}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

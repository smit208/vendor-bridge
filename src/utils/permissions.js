/**
 * Role-based permission utilities
 * Determines what actions and pages users can access based on their role
 */

/**
 * Permission definitions for each role
 */
const PERMISSIONS = {
    admin: [
        'view_dashboard', 'view_inventory', 'view_transactions',
        'create_material_issue', 'create_material_inward',
        'approve_requests', 'manage_users', 'manage_bom',
        'view_reports', 'production_entry', 'dispatch',
        'inventory_corrections', 'factory_settings', 'view_approvals',
        'manage_raw_materials', 'manage_final_products'
    ],
    worker: [
        'view_dashboard', 'view_inventory', 'view_transactions',
        'view_reports', 'production_entry', 'create_material_issue',
        'create_material_inward', 'dispatch', 'inventory_corrections',
        'view_alerts'
    ],
    storekeeper: [
        'view_dashboard', 'view_inventory', 'view_transactions',
        'create_material_issue', 'create_material_inward',
        'view_reports', 'production_entry', 'dispatch',
        'inventory_corrections', 'view_alerts'
    ]
};

/**
 * Page access definitions for each role
 * Admin can access all pages
 * Workers can access all pages except admin panel pages
 */
const PAGE_ACCESS = {
    admin: ['all'], // Admin panel can access everything
    worker: [
        'dashboard', 'transactions', 'inventory', 'alerts',
        'issue', 'production', 'inward', 'dispatch',
        'corrections'
        // NOT: approval, reports, users, bom, raw, final
    ],
    storekeeper: [
        'dashboard', 'transactions', 'inventory', 'alerts',
        'issue', 'production', 'inward', 'dispatch',
        'corrections'
        // NOT: approval, reports, users, bom, raw, final
    ]
};

/**
 * Admin-only pages (the 6 pages in Admin Panel)
 */
export const ADMIN_ONLY_PAGES = [
    'approval',    // Approval Requests
    'reports',     // Reports
    'users',       // User Management
    'bom',         // BOM Management
    'raw',         // Raw Materials
    'final',       // Final Products
    'pendingUsers' // Pending User Approvals
];

/**
 * Check if user has a specific permission
 * @param {string} userRole - User's role (admin, worker, storekeeper)
 * @param {string} permission - Permission to check
 * @returns {boolean} True if user has permission
 */
export function hasPermission(userRole, permission) {
    if (!userRole) return false;
    return PERMISSIONS[userRole]?.includes(permission) || false;
}

/**
 * Check if user can access a specific page
 * @param {string} userRole - User's role
 * @param {string} pageId - Page identifier (e.g., 'dashboard', 'approval', 'users')
 * @returns {boolean} True if user can access page
 */
export function canAccessPage(userRole, pageId) {
    if (!userRole) return false;

    // Admin can access all pages
    if (PAGE_ACCESS[userRole]?.includes('all')) return true;

    // Check if page is in user's accessible pages
    return PAGE_ACCESS[userRole]?.includes(pageId) || false;
}

/**
 * Check if a page requires admin access
 * @param {string} pageId - Page identifier
 * @returns {boolean} True if page is admin-only
 */
export function isAdminOnlyPage(pageId) {
    return ADMIN_ONLY_PAGES.includes(pageId);
}

/**
 * Get user's accessible pages list
 * @param {string} userRole - User's role
 * @returns {array} List of accessible page IDs
 */
export function getAccessiblePages(userRole) {
    if (PAGE_ACCESS[userRole]?.includes('all')) {
        return 'all';
    }
    return PAGE_ACCESS[userRole] || [];
}

import { createContext, useContext, useReducer, useEffect } from 'react';
import { ROLES } from '../constants';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const STORAGE_KEY = 'vendorbridge_state';

// ── Initial seed data ─────────────────────────────────────────────────────────
const SEED = {
  users: [
    { id: 'u1', name: 'Arjun Mehta',   email: 'admin@vendorbridge.com',   password: 'admin123',   role: ROLES.ADMIN,   vendorId: null },
    { id: 'u2', name: 'Priya Sharma',  email: 'officer@vendorbridge.com', password: 'officer123', role: ROLES.OFFICER, vendorId: null },
    { id: 'u3', name: 'Ravi Kumar',    email: 'vendor@vendorbridge.com',  password: 'vendor123',  role: ROLES.VENDOR,  vendorId: 'v1' },
    { id: 'u4', name: 'Neha Gupta',    email: 'manager@vendorbridge.com', password: 'manager123', role: ROLES.MANAGER, vendorId: null },
  ],
  vendors: [
    { id: 'v1', name: 'TechSolutions Pvt Ltd', contact: 'Ravi Kumar',  email: 'vendor@techsolutions.com', phone: '9876543210', gstin: '27AAPCS1234A1Z5', category: 'IT',        status: 'Active', rating: 4.2 },
    { id: 'v2', name: 'OfficeHub Supplies',     contact: 'Amit Singh',  email: 'vendor5@vendorbridge.com', phone: '9988776655', gstin: '27BBPCS5678B2Z6', category: 'Stationery', status: 'Active', rating: 3.9 },
    { id: 'v3', name: 'CloudServe India',       contact: 'Sneha Joshi', email: 'vendor3@vendorbridge.com', phone: '9123456789', gstin: '27CCPCS9012C3Z7', category: 'IT',        status: 'Active', rating: 4.5 },
  ],
  rfqs: [],
  quotations: [],
  approvals: [],
  pos: [],
  invoices: [],
  logs: [],
  notifications: [],
};

// ── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':        return { ...state, currentUser: action.payload };
    case 'LOGOUT':          return { ...state, currentUser: null, currentPage: 'dashboard' };
    case 'SET_PAGE':        return { ...state, currentPage: action.payload };
    case 'ADD_VENDOR':      return { ...state, vendors: [...state.vendors, action.payload] };
    case 'UPDATE_VENDOR':   return { ...state, vendors: state.vendors.map(v => v.id === action.payload.id ? action.payload : v) };
    case 'ADD_RFQ':         return { ...state, rfqs: [...state.rfqs, action.payload] };
    case 'UPDATE_RFQ':      return { ...state, rfqs: state.rfqs.map(r => r.id === action.payload.id ? action.payload : r) };
    case 'ADD_QUOTATION':   return { ...state, quotations: [...state.quotations, action.payload] };
    case 'UPDATE_QUOTATION':return { ...state, quotations: state.quotations.map(q => q.id === action.payload.id ? action.payload : q) };
    case 'ADD_APPROVAL':    return { ...state, approvals: [...state.approvals, action.payload] };
    case 'UPDATE_APPROVAL': return { ...state, approvals: state.approvals.map(a => a.id === action.payload.id ? action.payload : a) };
    case 'ADD_PO':          return { ...state, pos: [...state.pos, action.payload] };
    case 'UPDATE_PO':       return { ...state, pos: state.pos.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'ADD_INVOICE':     return { ...state, invoices: [...state.invoices, action.payload] };
    case 'UPDATE_INVOICE':  return { ...state, invoices: state.invoices.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'ADD_LOG':         return { ...state, logs: [action.payload, ...state.logs].slice(0, 500) };
    case 'ADD_NOTIFICATION':return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'MARK_ALL_READ':   return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };
    case 'SIGNUP': {
      const newUser = action.payload;
      return { ...state, users: [...state.users, newUser] };
    }
    default: return state;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  const [state, dispatch] = useReducer(reducer, {
    currentUser: null,
    currentPage: 'dashboard',
    users: saved?.users || SEED.users,
    vendors: saved?.vendors || SEED.vendors,
    rfqs: saved?.rfqs || SEED.rfqs,
    quotations: saved?.quotations || SEED.quotations,
    approvals: saved?.approvals || SEED.approvals,
    pos: saved?.pos || SEED.pos,
    invoices: saved?.invoices || SEED.invoices,
    logs: saved?.logs || SEED.logs,
    notifications: saved?.notifications || SEED.notifications,
  });

  useEffect(() => {
    const { currentUser, currentPage, ...persisted } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }, [state]);

  const login = (email, password) => {
    const user = state.users.find(u => u.email === email && u.password === password);
    if (!user) return { error: 'Invalid email or password' };
    dispatch({ type: 'SET_USER', payload: user });
    return { success: true };
  };

  const logout = () => dispatch({ type: 'LOGOUT' });

  const pendingApprovalsCount = state.approvals.filter(a => a.status === 'Pending').length;
  const userNotifications = state.notifications.filter(n => n.userId === state.currentUser?.id);
  const unreadCount = userNotifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider value={{
      ...state,
      dispatch,
      login,
      logout,
      setCurrentPage: (page) => dispatch({ type: 'SET_PAGE', payload: page }),
      markAllRead: () => dispatch({ type: 'MARK_ALL_READ' }),
      pendingApprovalsCount,
      userNotifications,
      unreadCount,
    }}>
      {children}
    </AppContext.Provider>
  );
}

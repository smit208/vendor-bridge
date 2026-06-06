import React, { useState, useEffect } from 'react';
import { dashboardService } from '../services';
import toast from '../utils/toast';
import './UserManagement.css';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [factoryCode, setFactoryCode] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchPendingUsers();
    fetchFactoryCode();
  }, []);

  const fetchFactoryCode = async () => {
    try {
      console.log('Fetching factory code...');
      const stats = await dashboardService.getStats();
      console.log('Stats received:', stats);
      setFactoryCode(stats.factoryCode);
    } catch (error) {
      console.error('Error fetching factory code:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://fims-dashboard.onrender.com/api'}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUsers(data.filter(u => u.approval_status === 'approved'));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://fims-dashboard.onrender.com/api'}/users/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPendingUsers(data);
    } catch (error) {
      console.error('Error fetching pending users:', error);
    }
  };

  const handleApprove = async (userId, role) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL || 'https://fims-dashboard.onrender.com/api'}/users/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
      });
      toast.success('User approved!');
      fetchUsers();
      fetchPendingUsers();
    } catch (error) {
      toast.error('Failed to approve user');
    }
  };

  const handleReject = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL || 'https://fims-dashboard.onrender.com/api'}/users/${userId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('User rejected');
      fetchPendingUsers();
    } catch (error) {
      toast.error('Failed to reject user');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <>
      <header className="main-header">
        <div className="main-title">
          <h1>User Management <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-2">ADMIN PANEL</span></h1>
          <p>Manage users and approve pending registrations</p>
          {factoryCode ? (
            <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-building-2">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
              </svg>
              Factory Code: <span className="font-mono font-bold">{factoryCode}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(factoryCode);
                  toast.success('Factory code copied!');
                }}
                className="ml-1 rounded p-1 hover:bg-blue-100"
                title="Copy Code"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="mt-2 text-sm text-gray-500 italic">
              (Factory Code: Loading or Unavailable)
            </div>
          )}
        </div>
      </header>

      {/* All Users Section */}
      <div className="rounded-xl border bg-card shadow-xl" style={{ backgroundColor: 'var(--surface)', marginBottom: '20px' }}>
        <div className="flex flex-col space-y-1.5 p-6 border-b" style={{ borderColor: 'rgb(224, 224, 224)' }}>
          <div className="font-semibold leading-none tracking-tight flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            All Users ({users.length})
          </div>
        </div>
        <div className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--background)' }}>
                  <th className="h-10 px-2 text-left">Name</th>
                  <th className="h-10 px-2 text-left">Username</th>
                  <th className="h-10 px-2 text-left">Email</th>
                  <th className="h-10 px-2 text-left">Role</th>
                  <th className="h-10 px-2 text-left">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{user.full_name}</td>
                    <td className="p-2">{user.username}</td>
                    <td className="p-2">{user.email}</td>
                    <td className="p-2">
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        background: user.role === 'admin' ? '#10b981' : '#6366f1',
                        color: 'white'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-2">{new Date(user.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pending Approvals Section */}
      {pendingUsers.length > 0 && (
        <div className="rounded-xl border bg-card shadow-xl" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="flex flex-col space-y-1.5 p-6 border-b" style={{ borderColor: 'rgb(224, 224, 224)' }}>
            <div className="font-semibold leading-none tracking-tight flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Pending Approvals ({pendingUsers.length})
            </div>
          </div>
          <div className="p-4">
            {pendingUsers.map(user => (
              <div key={user.id} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ fontWeight: '600', marginBottom: '4px' }}>{user.full_name}</h3>
                  <p style={{ fontSize: '14px', color: '#64748b' }}>Username: {user.username}</p>
                  <p style={{ fontSize: '14px', color: '#64748b' }}>Email: {user.email}</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    Registered: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    id={`role-${user.id}`}
                    defaultValue="storekeeper"
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="storekeeper">Storekeeper</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => {
                      const role = document.getElementById(`role-${user.id}`).value;
                      handleApprove(user.id, role);
                    }}
                    style={{
                      padding: '8px 16px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(user.id)}
                    style={{
                      padding: '8px 16px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}



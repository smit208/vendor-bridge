import React, { useState, useEffect } from 'react';
import toast from '../utils/toast';
import './UserManagement.css';

export default function PendingUsers() {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPendingUsers();
    }, []);

    const fetchPendingUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://fims-dashboard.onrender.com/api'}/users/pending`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setPendingUsers(data);
        } catch (error) {
            console.error('Error fetching pending users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId, role) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://fims-dashboard.onrender.com/api'}/users/${userId}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role })
            });

            if (response.ok) {
                toast.success('User approved successfully!');
                fetchPendingUsers(); // Refresh list
            }
        } catch (error) {
            console.error('Error approving user:', error);
            toast.error('Failed to approve user');
        }
    };

    const handleReject = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://fims-dashboard.onrender.com/api'}/users/${userId}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast.success('User rejected');
                fetchPendingUsers(); // Refresh list
            }
        } catch (error) {
            console.error('Error rejecting user:', error);
            toast.error('Failed to reject user');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Pending User Approvals</h1>
                <p>Review and approve new user registrations</p>
            </div>

            {pendingUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No pending user approvals
                </div>
            ) : (
                <div className="users-list">
                    {pendingUsers.map(user => (
                        <div key={user.id} className="user-card">
                            <div className="user-info">
                                <h3>{user.full_name}</h3>
                                <p>Username: {user.username}</p>
                                <p>Email: {user.email}</p>
                                <p style={{ fontSize: '12px', color: '#64748b' }}>
                                    Registered: {new Date(user.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="user-actions">
                                <select
                                    id={`role-${user.id}`}
                                    defaultValue="storekeeper"
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0',
                                        marginRight: '8px'
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
                                        marginRight: '8px'
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
                                        cursor: 'pointer'
                                    }}
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}



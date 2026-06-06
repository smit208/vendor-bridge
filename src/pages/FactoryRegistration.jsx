import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from '../utils/toast';
import './Login.css'; // Reuse login styles

export default function FactoryRegistration() {
    const [formData, setFormData] = useState({
        // Factory details
        factoryName: '',
        address: '',
        phone: '',

        // First admin details
        adminName: '',
        adminEmail: '',
        adminUsername: '',
        adminPassword: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (formData.adminPassword !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.adminPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'https://fims-dashboard.onrender.com/api';
            console.log('Registering factory at:', apiUrl);

            const response = await fetch(`${apiUrl}/auth/register-factory`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            console.log('Registration response:', data);

            if (data.success && data.factoryCode) {
                // Show success toast
                toast.success(
                    `🎉 Factory registered successfully! Factory code has been sent to ${formData.adminEmail}. ` +
                    `You can also find it in your admin dashboard after login.`
                );

                // Redirect to login after short delay
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else if (data.success) {
                // Success but no factory code - something wrong
                console.error('Success but no factoryCode in response:', data);
                toast.error('Registration succeeded but factory code not returned. Please contact support.');
            } else {
                console.error('Registration failed:', data.error);
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            console.error('Registration error:', err);
            setError('Registration failed. Please try again. Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-left">
                <div className="login-branding">
                    <div className="login-logo">F</div>
                    <h1>FIMS</h1>
                    <p>Factory Inventory Management System</p>
                    <div className="login-features">
                        <div className="feature-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <span>Complete Data Isolation</span>
                        </div>
                        <div className="feature-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <span>Role-Based Access Control</span>
                        </div>
                        <div className="feature-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <span>Instant Setup - No Waiting</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="login-right">
                <div className="login-card">
                    <div className="login-header">
                        <h2>Register Your Factory</h2>
                        <p>Get started with FIMS - instant setup, no approval needed</p>
                    </div>

                    {error && (
                        <div className="login-error">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                            Factory Information
                        </h3>

                        <div className="form-group">
                            <label htmlFor="factoryName">Factory Name *</label>
                            <div className="input-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                </svg>
                                <input
                                    id="factoryName"
                                    name="factoryName"
                                    type="text"
                                    value={formData.factoryName}
                                    onChange={handleChange}
                                    placeholder="e.g., ABC Manufacturing Company"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="address">Factory Address *</label>
                            <div className="input-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                <input
                                    id="address"
                                    name="address"
                                    type="text"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Full factory address"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="phone">Contact Phone *</label>
                            <div className="input-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                </svg>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+91-XXXXXXXXXX"
                                    required
                                />
                            </div>
                        </div>

                        <h3 style={{ marginTop: '24px', marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                            Admin Account Details
                        </h3>

                        <div className="form-group">
                            <label htmlFor="adminName">Your Full Name *</label>
                            <div className="input-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <input
                                    id="adminName"
                                    name="adminName"
                                    type="text"
                                    value={formData.adminName}
                                    onChange={handleChange}
                                    placeholder="Your full name"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="adminEmail">Your Email *</label>
                            <div className="input-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                    <path d="m2 7 10 7 10-7"></path>
                                </svg>
                                <input
                                    id="adminEmail"
                                    name="adminEmail"
                                    type="email"
                                    value={formData.adminEmail}
                                    onChange={handleChange}
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="adminUsername">Choose Username *</label>
                            <div className="input-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <input
                                    id="adminUsername"
                                    name="adminUsername"
                                    type="text"
                                    value={formData.adminUsername}
                                    onChange={handleChange}
                                    placeholder="Choose a username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="adminPassword">Password *</label>
                            <div className="input-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                                <input
                                    id="adminPassword"
                                    name="adminPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.adminPassword}
                                    onChange={handleChange}
                                    placeholder="Create a password (min 6 characters)"
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password *</label>
                            <div className="input-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm your password"
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="login-btn" disabled={loading}>
                            {loading ? (
                                <span className="loading-spinner"></span>
                            ) : (
                                'Create Factory & Admin Account'
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>Already have a factory code? <a href="/signup" style={{ color: '#667eea', fontWeight: '600', textDecoration: 'none' }}>Join existing factory</a></p>
                        <p style={{ marginTop: '8px' }}>Have an account? <a href="/login" style={{ color: '#667eea', fontWeight: '600', textDecoration: 'none' }}>Sign in here</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
}



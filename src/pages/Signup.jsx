import React, { useState } from 'react';
import toast from '../utils/toast';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import './Login.css'; // Reuse same styles

export default function Signup() {
    const [formData, setFormData] = useState({
        factoryCode: '',
        username: '',
        email: '',
        fullName: '',
        password: '',
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
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (!formData.factoryCode) {
            setError('Factory code is required');
            return;
        }

        setLoading(true);

        try {
            const response = await authService.register({
                factoryCode: formData.factoryCode.toUpperCase(),
                username: formData.username,
                email: formData.email,
                fullName: formData.fullName,
                password: formData.password
            });

            if (response.success) {
                // Registration successful - redirect to login with approval message
                toast.warning('Registration submitted successfully!\n\nYour account is pending admin approval. You will be able to login once an administrator approves your registration.\n\nPlease contact your factory administrator for approval status.');
                navigate('/login');
            } else {
                setError(response.error || 'Registration failed');
            }
        } catch (err) {
            setError(err.message || 'Registration failed. Please check your factory code.');
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
                            <span>Multi-Factory Support</span>
                        </div>
                        <div className="feature-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <span>Secure Access Control</span>
                        </div>
                        <div className="feature-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <span>Complete Data Isolation</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="login-right">
                <div className="login-card">
                    <div className="login-header">
                        <h2>Create Account</h2>
                        <p>Enter your factory code and details to sign up</p>
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
                        <div className="form-group">
                            <label htmlFor="factoryCode">Factory Code *</label>
                            <div className="input-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="3" y1="9" x2="21" y2="9"></line>
                                    <line x1="9" y1="21" x2="9" y2="9"></line>
                                </svg>
                                <input
                                    id="factoryCode"
                                    name="factoryCode"
                                    type="text"
                                    value={formData.factoryCode}
                                    onChange={handleChange}
                                    placeholder="Enter your factory code (e.g., DEMO001)"
                                    required
                                    style={{ textTransform: 'uppercase' }}
                                />
                            </div>
                            <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                Get this code from your factory administrator
                            </small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="fullName">Full Name *</label>
                            <div className="input-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="username">Username *</label>
                            <div className="input-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Choose a username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email *</label>
                            <div className="input-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                    <path d="m2 7 10 7 10-7"></path>
                                </svg>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password *</label>
                            <div className="input-wrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
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
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>Already have an account? <a href="/login" style={{ color: '#667eea', fontWeight: '600', textDecoration: 'none' }}>Sign in here</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
}



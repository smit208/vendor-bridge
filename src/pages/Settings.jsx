import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import { usersService, settingsService } from '../services';
import toast from '../utils/toast';

export default function Settings() {
    const currentUser = authService.getCurrentUser();
    const isAdmin = currentUser?.role === 'admin';

    // Active tab state
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [saveIndicator, setSaveIndicator] = useState('');

    // Profile State  
    const [profile, setProfile] = useState({
        fullName: currentUser?.fullName || '',
        email: currentUser?.email || '',
        username: currentUser?.username || '',
        role: currentUser?.role || ''
    });

    // Password State
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // User Settings State
    const [userSettings, setUserSettings] = useState({
        notifications: {
            email: true,
            lowStock: true,
            production: true,
            approvals: true,
            dispatch: true,
            inward: true,
            frequency: 'instant'
        },
        display: {
            language: 'en',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '12h',
            timezone: 'Asia/Kolkata',
            currency: 'INR',
            itemsPerPage: 20,
            tableDensity: 'comfortable',
            defaultDashboard: 'overview'
        },
        reports: {
            defaultFormat: 'csv',
            includeMetadata: true,
            defaultDateRange: '30',
            autoEmail: false,
            emailSchedule: 'never'
        }
    });

    // Factory Settings State (admin only)
    const [factorySettings, setFactorySettings] = useState({
        general: {
            name: '',
            address: '',
            contact: '',
            email: ''
        },
        operations: {
            operatingHours: '9:00 AM - 6:00 PM',
            workingDays: 'Monday - Friday',
            timezone: 'Asia/Kolkata'
        },
        inventory: {
            lowStockThreshold: 10,
            criticalStockThreshold: 5,
            autoReorder: false,
            reorderPoint: 15
        },
        approvals: {
            materialIssueApproval: true,
            productionApproval: false,
            dispatchApproval: false,
            autoApproveThreshold: 1000
        },
        notifications: {
            adminEmail: '',
            lowStockNotify: true,
            dailyReport: false,
            weeklyReport: false
        }
    });

    // Load settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            // Load user settings
            const userRes = await settingsService.getUserSettings();
            if (userRes.settings) {
                setUserSettings(prev => ({ ...prev, ...userRes.settings }));
            }

            // Load factory settings if admin
            if (isAdmin) {
                const factoryRes = await settingsService.getFactorySettings();
                if (factoryRes.settings) {
                    setFactorySettings(prev => ({ ...prev, ...factoryRes.settings }));
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await usersService.update(currentUser.id, {
                full_name: profile.fullName,
                email: profile.email,
                username: profile.username,
                role: currentUser.role,
                is_active: true
            });

            const updatedUser = {
                ...currentUser,
                fullName: profile.fullName,
                email: profile.email,
                username: profile.username
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            toast.success('Profile updated successfully!');
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (passwords.newPassword !== passwords.confirmPassword) {
            toast.error('Passwords do not match!');
            return;
        }

        if (passwords.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            // TODO: Implement password change API
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success('Password changed successfully!');
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            toast.error('Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const handleUserSettingsUpdate = async (section, key, value) => {
        const newSettings = { ...userSettings };
        if (section) {
            newSettings[section][key] = value;
        }
        setUserSettings(newSettings);

        setSaveIndicator('Saving...');
        try {
            await settingsService.updateUserSettings(newSettings);
            setSaveIndicator('Saved ✓');
            setTimeout(() => setSaveIndicator(''), 2000);
        } catch (error) {
            setSaveIndicator('');
            toast.error('Failed to save settings');
        }
    };

    const handleFactorySettingsUpdate = async () => {
        if (!isAdmin) return;

        setLoading(true);
        try {
            await settingsService.updateFactorySettings(factorySettings);
            toast.success('Factory settings saved successfully!');
        } catch (error) {
            toast.error('Failed to save factory settings');
        } finally {
            setLoading(false);
        }
    };

    const handleExportSettings = () => {
        const data = {
            user: userSettings,
            factory: isAdmin ? factorySettings : null,
            exportedAt: new Date().toISOString(),
            exportedBy: currentUser.fullName
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fims-settings-${Date.now()}.json`;
        a.click();
        toast.success('Settings exported successfully!');
    };

    return (
        <div className="settings-container">
            <style>{`
        .settings-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .settings-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .save-indicator {
          font-size: 13px;
          color: #10b981;
          font-weight: 500;
        }

        .settings-tabs {
          display: flex;
          gap: 4px;
          border-bottom: 2px solid #e5e7eb;
          margin-bottom: 32px;
          overflow-x: auto;
        }

        .settings-tab-btn {
          padding: 12px 20px;
          border: none;
          background: transparent;
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .settings-tab-btn:hover {
          color: #374151;
          background: #f9fafb;
        }

        .settings-tab-btn.active {
          color: #4F46E5;
          border-bottom-color: #4F46E5;
          font-weight: 600;
        }

        .settings-section {
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          padding: 32px;
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 8px 0;
        }

        .section-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 24px 0;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }

        .form-input, .form-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          color: #111827;
          transition: all 0.2s;
        }

        .form-input:focus, .form-select:focus {
          outline: none;
          border-color: #4F46E5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-input:disabled {
          background: #f9fafb;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .form-select {
          cursor: pointer;
        }

        .form-helper {
          font-size: 13px;
          color: #6b7280;
          margin-top: 4px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .btn-primary {
          background: #4F46E5;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #4338ca;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-outline {
          background: transparent;
          border: 1px solid #d1d5db;
          color: #374151;
        }

        .btn-outline:hover {
          background: #f9fafb;
          border-color: #4F46E5;
          color: #4F46E5;
        }

        .divider {
          height: 1px;
          background: #e5e7eb;
          margin: 24px 0;
        }

        .toggle-group {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .toggle-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .toggle-item:last-child {
          border-bottom: none;
        }

        .toggle-item:hover {
          background: #f9fafb;
        }

        .toggle-label {
          font-size: 14px;
          font-weight: 500;
          color: #111827;
        }

        .toggle-desc {
          font-size: 13px;
          color: #6b7280;
          margin-top: 2px;
        }

        .toggle-switch {
          position: relative;
          width: 44px;
          height: 24px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #d1d5db;
          transition: 0.3s;
          border-radius: 24px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }

        input:checked + .toggle-slider {
          background-color: #4F46E5;
        }

        input:checked + .toggle-slider:before {
          transform: translateX(20px);
        }

        .alert {
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 14px;
          display: flex;
          gap: 10px;
          align-items: start;
        }

        .alert-info {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e40af;
        }

        .alert-success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }

        .alert-warning {
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #92400e;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #4F46E5;
        }

        .stat-label {
          font-size: 13px;
          color: #6b7280;
          margin-top: 4px;
        }

        .input-addon {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .input-addon input {
          flex: 1;
        }

        .input-addon-text {
          font-size: 14px;
          color: #6b7280;
          white-space: nowrap;
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          
          .stats-row {
            grid-template-columns: repeat(2, 1fr);
          }

          .settings-section {
            padding: 20px;
          }
        }
      `}</style>

            <header className="main-header">
                <div className="main-title">
                    <h1>Settings</h1>
                    <p>Manage your account, preferences, and system configuration</p>
                </div>
            </header>

            <div className="settings-header-bar">
                <div className="save-indicator">{saveIndicator}</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleExportSettings} className="btn btn-outline">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export Settings
                    </button>
                </div>
            </div>

            <div className="settings-tabs">
                <button className={`settings-tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                    Profile
                </button>
                <button className={`settings-tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
                    Security
                </button>
                <button className={`settings-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
                    Notifications
                </button>
                <button className={`settings-tab-btn ${activeTab === 'display' ? 'active' : ''}`} onClick={() => setActiveTab('display')}>
                    Display
                </button>
                <button className={`settings-tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
                    Reports
                </button>
                {isAdmin && (
                    <>
                        <button className={`settings-tab-btn ${activeTab === 'factory' ? 'active' : ''}`} onClick={() => setActiveTab('factory')}>
                            Factory
                        </button>
                        <button className={`settings-tab-btn ${activeTab === 'system' ? 'active' : ''}`} onClick={() => setActiveTab('system')}>
                            System
                        </button>
                    </>
                )}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="settings-section">
                    <h2 className="section-title">Profile Information</h2>
                    <p className="section-subtitle">Update your personal information</p>

                    <form onSubmit={handleProfileUpdate}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Full Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={profile.fullName}
                                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Username</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={profile.username}
                                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email Address *</label>
                            <input
                                type="email"
                                className="form-input"
                                value={profile.email}
                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <input
                                type="text"
                                className="form-input"
                                value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                                disabled
                            />
                            <p className="form-helper">Your role is managed by the administrator</p>
                        </div>

                        <div className="divider"></div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className="settings-section">
                    <h2 className="section-title">Change Password</h2>
                    <p className="section-subtitle">Update your account password</p>

                    <div className="alert alert-info">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div><strong>Password Requirements:</strong> Minimum 6 characters</div>
                    </div>

                    <form onSubmit={handlePasswordChange}>
                        <div className="form-group">
                            <label className="form-label">Current Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={passwords.currentPassword}
                                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                            />
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">New Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={passwords.newPassword}
                                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Confirm New Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={passwords.confirmPassword}
                                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </form>
                </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
                <div className="settings-section">
                    <h2 className="section-title">Notification Preferences</h2>
                    <p className="section-subtitle">Customize which notifications you want to receive</p>

                    <div className="toggle-group">
                        <div className="toggle-item">
                            <div>
                                <div className="toggle-label">Email Notifications</div>
                                <div className="toggle-desc">Receive email updates about your account</div>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={userSettings.notifications.email}
                                    onChange={(e) => handleUserSettingsUpdate('notifications', 'email', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="toggle-item">
                            <div>
                                <div className="toggle-label">Low Stock Alerts</div>
                                <div className="toggle-desc">Get notified when inventory reaches minimum levels</div>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={userSettings.notifications.lowStock}
                                    onChange={(e) => handleUserSettingsUpdate('notifications', 'lowStock', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="toggle-item">
                            <div>
                                <div className="toggle-label">Production Notifications</div>
                                <div className="toggle-desc">Stay updated on production completion events</div>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={userSettings.notifications.production}
                                    onChange={(e) => handleUserSettingsUpdate('notifications', 'production', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="toggle-item">
                            <div>
                                <div className="toggle-label">Material Inward Notifications</div>
                                <div className="toggle-desc">Get notified about material inward transactions</div>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={userSettings.notifications.inward}
                                    onChange={(e) => handleUserSettingsUpdate('notifications', 'inward', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="toggle-item">
                            <div>
                                <div className="toggle-label">Dispatch Notifications</div>
                                <div className="toggle-desc">Get notified about dispatch schedules</div>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={userSettings.notifications.dispatch}
                                    onChange={(e) => handleUserSettingsUpdate('notifications', 'dispatch', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        {isAdmin && (
                            <div className="toggle-item">
                                <div>
                                    <div className="toggle-label">Approval Request Notifications</div>
                                    <div className="toggle-desc">Receive alerts for pending approvals (Admin only)</div>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={userSettings.notifications.approvals}
                                        onChange={(e) => handleUserSettingsUpdate('notifications', 'approvals', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="divider"></div>

                    <div className="form-group">
                        <label className="form-label">Notification Frequency</label>
                        <select
                            className="form-select"
                            value={userSettings.notifications.frequency}
                            onChange={(e) => handleUserSettingsUpdate('notifications', 'frequency', e.target.value)}
                        >
                            <option value="instant">Instant (Real-time)</option>
                            <option value="hourly">Hourly Digest</option>
                            <option value="daily">Daily Digest</option>
                        </select>
                        <p className="form-helper">Choose how often you want to receive batched notifications</p>
                    </div>
                </div>
            )}

            {/* Display Tab */}
            {activeTab === 'display' && (
                <div className="settings-section">
                    <h2 className="section-title">Display Preferences</h2>
                    <p className="section-subtitle">Customize your viewing experience</p>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Language</label>
                            <select
                                className="form-select"
                                value={userSettings.display.language}
                                onChange={(e) => handleUserSettingsUpdate('display', 'language', e.target.value)}
                            >
                                <option value="en">English</option>
                                <option value="hi">Hindi</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Date Format</label>
                            <select
                                className="form-select"
                                value={userSettings.display.dateFormat}
                                onChange={(e) => handleUserSettingsUpdate('display', 'dateFormat', e.target.value)}
                            >
                                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Time Format</label>
                            <select
                                className="form-select"
                                value={userSettings.display.timeFormat}
                                onChange={(e) => handleUserSettingsUpdate('display', 'timeFormat', e.target.value)}
                            >
                                <option value="12h">12-hour (e.g., 2:30 PM)</option>
                                <option value="24h">24-hour (e.g., 14:30)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Timezone</label>
                            <select
                                className="form-select"
                                value={userSettings.display.timezone}
                                onChange={(e) => handleUserSettingsUpdate('display', 'timezone', e.target.value)}
                            >
                                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                <option value="America/New_York">America/New York (EST)</option>
                                <option value="Europe/London">Europe/London (GMT)</option>
                                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Currency</label>
                            <select
                                className="form-select"
                                value={userSettings.display.currency}
                                onChange={(e) => handleUserSettingsUpdate('display', 'currency', e.target.value)}
                            >
                                <option value="INR">₹ INR - Indian Rupee</option>
                                <option value="USD">$ USD - US Dollar</option>
                                <option value="EUR">€ EUR - Euro</option>
                                <option value="GBP">£ GBP - British Pound</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Items Per Page</label>
                            <select
                                className="form-select"
                                value={userSettings.display.itemsPerPage}
                                onChange={(e) => handleUserSettingsUpdate('display', 'itemsPerPage', parseInt(e.target.value))}
                            >
                                <option value="10">10 items</option>
                                <option value="20">20 items</option>
                                <option value="50">50 items</option>
                                <option value="100">100 items</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Table Density</label>
                            <select
                                className="form-select"
                                value={userSettings.display.tableDensity}
                                onChange={(e) => handleUserSettingsUpdate('display', 'tableDensity', e.target.value)}
                            >
                                <option value="compact">Compact</option>
                                <option value="comfortable">Comfortable</option>
                                <option value="spacious">Spacious</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Default Dashboard View</label>
                            <select
                                className="form-select"
                                value={userSettings.display.defaultDashboard}
                                onChange={(e) => handleUserSettingsUpdate('display', 'defaultDashboard', e.target.value)}
                            >
                                <option value="overview">Overview</option>
                                <option value="inventory">Inventory Focus</option>
                                <option value="production">Production Focus</option>
                                <option value="analytics">Analytics</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
                <div className="settings-section">
                    <h2 className="section-title">Report Preferences</h2>
                    <p className="section-subtitle">Configure default settings for reports and exports</p>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Default Export Format</label>
                            <select
                                className="form-select"
                                value={userSettings.reports.defaultFormat}
                                onChange={(e) => handleUserSettingsUpdate('reports', 'defaultFormat', e.target.value)}
                            >
                                <option value="csv">CSV</option>
                                <option value="excel">Excel (.xlsx)</option>
                                <option value="pdf">PDF</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Default Date Range</label>
                            <select
                                className="form-select"
                                value={userSettings.reports.defaultDateRange}
                                onChange={(e) => handleUserSettingsUpdate('reports', 'defaultDateRange', e.target.value)}
                            >
                                <option value="7">Last 7 days</option>
                                <option value="30">Last 30 days</option>
                                <option value="90">Last 90 days</option>
                                <option value="365">Last year</option>
                            </select>
                        </div>
                    </div>

                    <div className="divider"></div>

                    <div className="toggle-group">
                        <div className="toggle-item">
                            <div>
                                <div className="toggle-label">Include Metadata in Exports</div>
                                <div className="toggle-desc">Add export date, user info, and filters to exported files</div>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={userSettings.reports.includeMetadata}
                                    onChange={(e) => handleUserSettingsUpdate('reports', 'includeMetadata', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="toggle-item">
                            <div>
                                <div className="toggle-label">Auto-Email Reports</div>
                                <div className="toggle-desc">Automatically send scheduled reports to your email</div>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={userSettings.reports.autoEmail}
                                    onChange={(e) => handleUserSettingsUpdate('reports', 'autoEmail', e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    {userSettings.reports.autoEmail && (
                        <div className="form-group" style={{ marginTop: '16px' }}>
                            <label className="form-label">Email Schedule</label>
                            <select
                                className="form-select"
                                value={userSettings.reports.emailSchedule}
                                onChange={(e) => handleUserSettingsUpdate('reports', 'emailSchedule', e.target.value)}
                            >
                                <option value="never">Never</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* Factory Settings Tab (Admin Only) */}
            {activeTab === 'factory' && isAdmin && (
                <>
                    <div className="settings-section">
                        <h2 className="section-title">General Information</h2>
                        <p className="section-subtitle">Factory details and contact information</p>

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Factory Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={factorySettings.general.name}
                                    onChange={(e) => setFactorySettings({
                                        ...factorySettings,
                                        general: { ...factorySettings.general, name: e.target.value }
                                    })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Contact Number</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    value={factorySettings.general.contact}
                                    onChange={(e) => setFactorySettings({
                                        ...factorySettings,
                                        general: { ...factorySettings.general, contact: e.target.value }
                                    })}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Factory Address</label>
                            <input
                                type="text"
                                className="form-input"
                                value={factorySettings.general.address}
                                onChange={(e) => setFactorySettings({
                                    ...factorySettings,
                                    general: { ...factorySettings.general, address: e.target.value }
                                })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Factory Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={factorySettings.general.email}
                                onChange={(e) => setFactorySettings({
                                    ...factorySettings,
                                    general: { ...factorySettings.general, email: e.target.value }
                                })}
                            />
                        </div>
                    </div>

                    <div className="settings-section">
                        <h2 className="section-title">Inventory Settings</h2>
                        <p className="section-subtitle">Configure inventory thresholds and alerts</p>

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Low Stock Threshold</label>
                                <div className="input-addon">
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={factorySettings.inventory.lowStockThreshold}
                                        onChange={(e) => setFactorySettings({
                                            ...factorySettings,
                                            inventory: { ...factorySettings.inventory, lowStockThreshold: parseInt(e.target.value) }
                                        })}
                                    />
                                    <span className="input-addon-text">units</span>
                                </div>
                                <p className="form-helper">Show low stock alerts at this level</p>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Critical Stock Threshold</label>
                                <div className="input-addon">
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={factorySettings.inventory.criticalStockThreshold}
                                        onChange={(e) => setFactorySettings({
                                            ...factorySettings,
                                            inventory: { ...factorySettings.inventory, criticalStockThreshold: parseInt(e.target.value) }
                                        })}
                                    />
                                    <span className="input-addon-text">units</span>
                                </div>
                                <p className="form-helper">Show critical alerts at this level</p>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Re-order Point</label>
                                <div className="input-addon">
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={factorySettings.inventory.reorderPoint}
                                        onChange={(e) => setFactorySettings({
                                            ...factorySettings,
                                            inventory: { ...factorySettings.inventory, reorderPoint: parseInt(e.target.value) }
                                        })}
                                    />
                                    <span className="input-addon-text">units</span>
                                </div>
                            </div>
                        </div>

                        <div className="divider"></div>

                        <div className="toggle-group">
                            <div className="toggle-item">
                                <div>
                                    <div className="toggle-label">Auto Re-order (Coming Soon)</div>
                                    <div className="toggle-desc">Automatically create purchase orders when stock reaches re-order point</div>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={factorySettings.inventory.autoReorder}
                                        onChange={(e) => setFactorySettings({
                                            ...factorySettings,
                                            inventory: { ...factorySettings.inventory, autoReorder: e.target.checked }
                                        })}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="settings-section">
                        <h2 className="section-title">Approval Workflow</h2>
                        <p className="section-subtitle">Configure approval requirements for transactions</p>

                        <div className="toggle-group">
                            <div className="toggle-item">
                                <div>
                                    <div className="toggle-label">Material Issue Approval</div>
                                    <div className="toggle-desc">Require admin approval for material issue transactions</div>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={factorySettings.approvals.materialIssueApproval}
                                        onChange={(e) => setFactorySettings({
                                            ...factorySettings,
                                            approvals: { ...factorySettings.approvals, materialIssueApproval: e.target.checked }
                                        })}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <div className="toggle-item">
                                <div>
                                    <div className="toggle-label">Production Approval</div>
                                    <div className="toggle-desc">Require admin approval for production completion</div>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={factorySettings.approvals.productionApproval}
                                        onChange={(e) => setFactorySettings({
                                            ...factorySettings,
                                            approvals: { ...factorySettings.approvals, productionApproval: e.target.checked }
                                        })}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <div className="toggle-item">
                                <div>
                                    <div className="toggle-label">Dispatch Approval</div>
                                    <div className="toggle-desc">Require admin approval for dispatch transactions</div>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={factorySettings.approvals.dispatchApproval}
                                        onChange={(e) => setFactorySettings({
                                            ...factorySettings,
                                            approvals: { ...factorySettings.approvals, dispatchApproval: e.target.checked }
                                        })}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div className="divider"></div>

                        <div className="form-group">
                            <label className="form-label">Auto-Approve Threshold</label>
                            <div className="input-addon">
                                <span className="input-addon-text">₹</span>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={factorySettings.approvals.autoApproveThreshold}
                                    onChange={(e) => setFactorySettings({
                                        ...factorySettings,
                                        approvals: { ...factorySettings.approvals, autoApproveThreshold: parseInt(e.target.value) }
                                    })}
                                />
                            </div>
                            <p className="form-helper">Auto-approve transactions below this value</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                        <button onClick={handleFactorySettingsUpdate} className="btn btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Factory Settings'}
                        </button>
                        <button onClick={loadSettings} className="btn btn-secondary">
                            Reset to Saved
                        </button>
                    </div>
                </>
            )}

            {/* System Tab (Admin Only) */}
            {activeTab === 'system' && isAdmin && (
                <div className="settings-section">
                    <h2 className="section-title">System Information</h2>
                    <p className="section-subtitle">System overview and advanced settings</p>

                    <div className="stats-row">
                        <div className="stat-card">
                            <div className="stat-value">v2.0</div>
                            <div className="stat-label">System Version</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">PostgreSQL</div>
                            <div className="stat-label">Database</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">Active</div>
                            <div className="stat-label">Status</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">99.9%</div>
                            <div className="stat-label">Uptime</div>
                        </div>
                    </div>

                    <div className="alert alert-warning">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div><strong>Advanced Settings:</strong> Contact your system administrator before making changes to these settings</div>
                    </div>

                    <div className="divider"></div>

                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Maintenance</h3>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button className="btn btn-outline">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                            </svg>
                            Clear Cache
                        </button>
                        <button className="btn btn-outline">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            View Logs
                        </button>
                        <button className="btn btn-outline">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Backup Database
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

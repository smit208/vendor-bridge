import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Unauthorized() {
    const navigate = useNavigate();

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '40px',
            textAlign: 'center'
        }}>
            <div style={{
                fontSize: '72px',
                marginBottom: '24px'
            }}>
                🚫
            </div>
            <h1 style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#1e293b',
                margin: '0 0 12px 0'
            }}>
                Access Denied
            </h1>
            <p style={{
                fontSize: '16px',
                color: '#64748b',
                marginBottom: '8px'
            }}>
                You don't have permission to access this page.
            </p>
            <p style={{
                fontSize: '14px',
                color: '#94a3b8',
                marginBottom: '32px'
            }}>
                This section is restricted to administrators only.
            </p>
            <button
                onClick={() => navigate('/')}
                style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
                onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                }}
                onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                }}
            >
                Go to Dashboard
            </button>
        </div>
    );
}

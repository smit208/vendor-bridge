import React from 'react';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Error Boundary caught an error:', error, errorInfo);
        }

        // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
        // errorTrackingService.logError(error, errorInfo);

        this.setState({
            error,
            errorInfo
        });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    maxWidth: '600px',
                    margin: '100px auto',
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                    <svg
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        style={{ margin: '0 auto 20px' }}
                    >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>

                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: '600',
                        color: '#1f2937',
                        marginBottom: '12px'
                    }}>
                        System Error v2.2
                    </h2>

                    <p style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        marginBottom: '24px'
                    }}>
                        We're sorry for the inconvenience. The application encountered an error.
                    </p>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details style={{
                            textAlign: 'left',
                            background: '#f9fafb',
                            padding: '16px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            fontSize: '12px',
                            color: '#374151'
                        }}>
                            <summary style={{ cursor: 'pointer', fontWeight: '600', marginBottom: '8px' }}>
                                Error Details (Development Only)
                            </summary>
                            <pre style={{
                                overflow: 'auto',
                                fontSize: '11px',
                                lineHeight: '1.5'
                            }}>
                                {this.state.error.toString()}
                                {'\n\n'}
                                {this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                    )}

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button
                            onClick={this.handleReset}
                            style={{
                                padding: '10px 20px',
                                background: '#3b82f6',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#2563eb'}
                            onMouseOut={(e) => e.target.style.background = '#3b82f6'}
                        >
                            Try Again
                        </button>

                        <button
                            onClick={() => window.location.href = '/'}
                            style={{
                                padding: '10px 20px',
                                background: '#f3f4f6',
                                color: '#374151',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#e5e7eb'}
                            onMouseOut={(e) => e.target.style.background = '#f3f4f6'}
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

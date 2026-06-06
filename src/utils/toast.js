import toast from 'react-hot-toast';

/**
 * Professional toast notification utilities
 * Replaces all alert() calls with beautiful, non-blocking notifications
 */

const toastConfig = {
    duration: 4000,
    position: 'top-right',
    style: {
        borderRadius: '8px',
        background: '#333',
        color: '#fff',
        padding: '12px 20px',
        fontSize: '14px',
    },
};

export const showSuccess = (message, options = {}) => {
    return toast.success(message, {
        ...toastConfig,
        ...options,
        icon: '✓',
        style: {
            ...toastConfig.style,
            background: '#10b981',
        }
    });
};

export const showError = (message, options = {}) => {
    return toast.error(message, {
        ...toastConfig,
        duration: 6000, // Errors stay longer
        ...options,
        style: {
            ...toastConfig.style,
            background: '#ef4444',
        }
    });
};

export const showWarning = (message, options = {}) => {
    return toast(message, {
        ...toastConfig,
        ...options,
        icon: '⚠️',
        style: {
            ...toastConfig.style,
            background: '#f59e0b',
        }
    });
};

export const showInfo = (message, options = {}) => {
    return toast(message, {
        ...toastConfig,
        ...options,
        icon: 'ℹ️',
        style: {
            ...toastConfig.style,
            background: '#3b82f6',
        }
    });
};

export const showLoading = (message, options = {}) => {
    return toast.loading(message, {
        ...toastConfig,
        ...options,
    });
};

export const updateToast = (toastId, message, type = 'success') => {
    const updateFn = type === 'success' ? showSuccess : showError;
    toast.dismiss(toastId);
    return updateFn(message);
};

export const dismissToast = (toastId) => {
    toast.dismiss(toastId);
};

export const dismissAll = () => {
    toast.dismiss();
};

// Promise-based toast for async operations
export const showPromise = (promise, messages) => {
    return toast.promise(
        promise,
        {
            loading: messages.loading || 'Processing...',
            success: messages.success || 'Success!',
            error: messages.error || 'Something went wrong',
        },
        toastConfig
    );
};

export default {
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
    loading: showLoading,
    update: updateToast,
    dismiss: dismissToast,
    dismissAll,
    promise: showPromise,
};

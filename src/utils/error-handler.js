/**
 * GradeUp NIL - Global Error Handler
 * Centralized error handling with user-friendly messages
 */

(function() {
    'use strict';

    // Error types for categorization
    const ErrorTypes = {
        NETWORK: 'network',
        AUTH: 'auth',
        VALIDATION: 'validation',
        SERVER: 'server',
        CLIENT: 'client',
        UNKNOWN: 'unknown'
    };

    // User-friendly error messages
    const ErrorMessages = {
        [ErrorTypes.NETWORK]: 'Unable to connect. Please check your internet connection.',
        [ErrorTypes.AUTH]: 'Your session has expired. Please log in again.',
        [ErrorTypes.VALIDATION]: 'Please check your input and try again.',
        [ErrorTypes.SERVER]: 'Something went wrong on our end. Please try again later.',
        [ErrorTypes.CLIENT]: 'An unexpected error occurred. Please refresh the page.',
        [ErrorTypes.UNKNOWN]: 'An error occurred. Please try again.'
    };

    // Error log storage (in-memory for now, could be sent to analytics)
    const errorLog = [];
    const MAX_LOG_SIZE = 100;

    /**
     * Classify an error based on its characteristics
     * @param {Error|object} error
     * @returns {string} Error type
     */
    function classifyError(error) {
        if (!error) return ErrorTypes.UNKNOWN;

        // Network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return ErrorTypes.NETWORK;
        }
        if (error.message?.includes('network') || error.message?.includes('offline')) {
            return ErrorTypes.NETWORK;
        }

        // Auth errors
        if (error.status === 401 || error.status === 403) {
            return ErrorTypes.AUTH;
        }
        if (error.message?.includes('auth') || error.message?.includes('token')) {
            return ErrorTypes.AUTH;
        }

        // Validation errors
        if (error.status === 400 || error.status === 422) {
            return ErrorTypes.VALIDATION;
        }

        // Server errors
        if (error.status >= 500) {
            return ErrorTypes.SERVER;
        }

        return ErrorTypes.CLIENT;
    }

    /**
     * Log an error for later analysis
     * @param {Error|object} error
     * @param {object} context
     */
    function logError(error, context = {}) {
        const entry = {
            timestamp: new Date().toISOString(),
            type: classifyError(error),
            message: error.message || String(error),
            stack: error.stack,
            context: {
                url: window.location.href,
                userAgent: navigator.userAgent,
                ...context
            }
        };

        errorLog.push(entry);
        if (errorLog.length > MAX_LOG_SIZE) {
            errorLog.shift();
        }

        // Log to console in development
        if (window.GRADEUP_CONFIG?.debug || import.meta?.env?.DEV) {
            console.error('[GradeUp Error]', entry);
        }
    }

    /**
     * Show an error toast to the user
     * @param {string} message
     * @param {string} type - 'error' | 'warning' | 'info'
     */
    function showErrorToast(message, type = 'error') {
        // Use existing toast system if available
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }

        // Fallback toast implementation
        const existing = document.querySelector('.error-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            padding: 1rem 2rem;
            background: ${type === 'error' ? '#DA2B57' : type === 'warning' ? '#F59E0B' : '#3B82F6'};
            color: white;
            border-radius: 12px;
            font-size: 0.9375rem;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease-out;
        `;
        toast.textContent = message;

        // Add animation keyframes if not present
        if (!document.getElementById('error-toast-styles')) {
            const style = document.createElement('style');
            style.id = 'error-toast-styles';
            style.textContent = `
                @keyframes slideUp {
                    from { transform: translateX(-50%) translateY(100%); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    /**
     * Handle an error with logging and user notification
     * @param {Error|object} error
     * @param {object} options
     */
    window.handleError = function(error, options = {}) {
        const {
            silent = false,
            context = {},
            customMessage = null
        } = options;

        // Log the error
        logError(error, context);

        // Show user notification unless silent
        if (!silent) {
            const type = classifyError(error);
            const message = customMessage || ErrorMessages[type];
            showErrorToast(message, 'error');
        }

        // Handle specific error types
        const type = classifyError(error);
        if (type === ErrorTypes.AUTH) {
            // Clear auth state and redirect to login
            localStorage.removeItem('gradeup_user');
            sessionStorage.setItem('gradeup_redirect', window.location.href);
            // Delay redirect to allow toast to be seen
            setTimeout(() => {
                window.location.href = 'index.html?login=true';
            }, 2000);
        }
    };

    /**
     * Wrap an async function with error handling
     * @param {Function} fn
     * @param {object} options
     * @returns {Function}
     */
    window.withErrorHandling = function(fn, options = {}) {
        return async function(...args) {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                handleError(error, options);
                throw error; // Re-throw for caller to handle if needed
            }
        };
    };

    /**
     * Get error log for debugging
     * @returns {Array}
     */
    window.getErrorLog = function() {
        return [...errorLog];
    };

    // Global error handlers
    window.onerror = function(message, source, lineno, colno, error) {
        handleError(error || new Error(message), {
            context: { source, lineno, colno },
            silent: false
        });
        return false; // Don't suppress default error handling
    };

    window.onunhandledrejection = function(event) {
        handleError(event.reason || new Error('Unhandled Promise rejection'), {
            context: { type: 'unhandledrejection' },
            silent: false
        });
    };

    // Expose error types for external use
    window.GradeUpErrors = {
        types: ErrorTypes,
        messages: ErrorMessages,
        classify: classifyError
    };

})();

/* ═══════════════════════════════════════════════════════════════════════════
   GRADEUP NIL - Security Utilities
   Authentication, Validation, and Rate Limiting
   ═══════════════════════════════════════════════════════════════════════════ */

(function() {
    'use strict';

    // ─── Rate Limiting ───
    const rateLimitStore = {};
    const MAX_LOGIN_ATTEMPTS = 5;
    const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

    /**
     * Check if user is rate limited for login attempts
     * @returns {boolean|number} false if not limited, or seconds remaining if limited
     */
    window.checkRateLimit = function(identifier) {
        const key = 'login_' + (identifier || 'default');
        const stored = localStorage.getItem('gradeup_ratelimit_' + key);

        if (!stored) return false;

        const data = JSON.parse(stored);
        const now = Date.now();

        // Check if lockout has expired
        if (data.lockedUntil && now < data.lockedUntil) {
            return Math.ceil((data.lockedUntil - now) / 1000);
        }

        // Reset if lockout expired
        if (data.lockedUntil && now >= data.lockedUntil) {
            localStorage.removeItem('gradeup_ratelimit_' + key);
            return false;
        }

        return false;
    };

    /**
     * Record a login attempt (success or failure)
     * @param {string} identifier - Email or IP
     * @param {boolean} success - Whether login succeeded
     * @returns {object} Rate limit status
     */
    window.recordLoginAttempt = function(identifier, success) {
        const key = 'login_' + (identifier || 'default');
        const storageKey = 'gradeup_ratelimit_' + key;
        const now = Date.now();

        let data = { attempts: [], lockedUntil: null };
        const stored = localStorage.getItem(storageKey);

        if (stored) {
            data = JSON.parse(stored);
        }

        if (success) {
            // Clear on successful login
            localStorage.removeItem(storageKey);
            return { limited: false, attempts: 0 };
        }

        // Add failed attempt
        data.attempts.push(now);

        // Remove attempts older than lockout duration
        data.attempts = data.attempts.filter(t => now - t < LOCKOUT_DURATION);

        // Check if should lock out
        if (data.attempts.length >= MAX_LOGIN_ATTEMPTS) {
            data.lockedUntil = now + LOCKOUT_DURATION;
        }

        localStorage.setItem(storageKey, JSON.stringify(data));

        return {
            limited: !!data.lockedUntil,
            attempts: data.attempts.length,
            remainingAttempts: MAX_LOGIN_ATTEMPTS - data.attempts.length,
            lockedUntil: data.lockedUntil
        };
    };

    // ─── Input Validation ───

    /**
     * Validate email format
     * @param {string} email
     * @returns {boolean}
     */
    window.isValidEmail = function(email) {
        if (!email || typeof email !== 'string') return false;
        // RFC 5322 simplified regex
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(email) && email.length <= 254;
    };

    /**
     * Validate password strength
     * @param {string} password
     * @returns {object} { valid: boolean, errors: string[] }
     */
    window.validatePassword = function(password) {
        const errors = [];

        if (!password || typeof password !== 'string') {
            return { valid: false, errors: ['Password is required'] };
        }

        if (password.length < 8) {
            errors.push('Password must be at least 8 characters');
        }

        if (password.length > 128) {
            errors.push('Password must be less than 128 characters');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            strength: getPasswordStrength(password)
        };
    };

    /**
     * Get password strength score
     * @param {string} password
     * @returns {string} 'weak' | 'medium' | 'strong'
     */
    function getPasswordStrength(password) {
        if (!password) return 'weak';

        let score = 0;

        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        if (score <= 2) return 'weak';
        if (score <= 4) return 'medium';
        return 'strong';
    }

    /**
     * Sanitize string for safe display (prevent XSS)
     * @param {string} str
     * @returns {string}
     */
    window.sanitizeString = function(str) {
        if (!str || typeof str !== 'string') return '';

        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    /**
     * Sanitize object values recursively
     * @param {object} obj
     * @returns {object}
     */
    window.sanitizeObject = function(obj) {
        if (!obj || typeof obj !== 'object') return obj;

        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                if (typeof value === 'string') {
                    sanitized[key] = sanitizeString(value);
                } else if (typeof value === 'object' && value !== null) {
                    sanitized[key] = sanitizeObject(value);
                } else {
                    sanitized[key] = value;
                }
            }
        }
        return sanitized;
    };

    // ─── Authentication Checks ───

    /**
     * Check if user is authenticated
     * @returns {object|null} User data if authenticated, null otherwise
     */
    window.checkAuth = function() {
        try {
            const userData = localStorage.getItem('gradeup_user');
            if (!userData) return null;

            const user = JSON.parse(userData);

            // Validate user object has required fields
            if (!user.email || !user.signupDate && !user.lastLogin) {
                return null;
            }

            return user;
        } catch (e) {
            return null;
        }
    };

    /**
     * Require authentication - redirect to login if not authenticated
     * @param {string} requiredType - Optional: 'athlete', 'brand', 'director'
     * @returns {object|null} User data if authenticated
     */
    window.requireAuth = function(requiredType) {
        const user = checkAuth();

        if (!user) {
            // Store intended destination
            sessionStorage.setItem('gradeup_redirect', window.location.href);

            // Redirect to login
            window.location.href = 'index.html?login=true';
            return null;
        }

        // Check user type if required
        if (requiredType && user.type !== requiredType) {
            // Wrong user type - redirect to appropriate dashboard
            redirectToDashboard(user);
            return null;
        }

        return user;
    };

    /**
     * Redirect user to their appropriate dashboard
     * @param {object} user
     */
    window.redirectToDashboard = function(user) {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        switch (user.type) {
            case 'athlete':
                window.location.href = 'athlete-dashboard.html';
                break;
            case 'brand':
                window.location.href = 'brand-dashboard.html';
                break;
            case 'director':
                window.location.href = 'director-dashboard.html';
                break;
            default:
                window.location.href = 'index.html';
        }
    };

    /**
     * Log out the current user
     */
    window.logout = function() {
        localStorage.removeItem('gradeup_user');
        sessionStorage.removeItem('gradeup_redirect');
        window.location.href = 'index.html';
    };

    // ─── CSRF Protection ───

    /**
     * Generate a CSRF token
     * @returns {string}
     */
    window.generateCSRFToken = function() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const token = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
        sessionStorage.setItem('gradeup_csrf', token);
        return token;
    };

    /**
     * Validate CSRF token
     * @param {string} token
     * @returns {boolean}
     */
    window.validateCSRFToken = function(token) {
        const stored = sessionStorage.getItem('gradeup_csrf');
        return stored && token === stored;
    };

    // ─── Demo Mode Flag ───
    // For demo purposes, allow bypassing auth checks
    window.DEMO_MODE = true;

    /**
     * Check auth with demo mode support
     * In demo mode, returns mock user data instead of redirecting
     */
    window.requireAuthOrDemo = function(requiredType) {
        if (window.DEMO_MODE) {
            // Return demo user data
            const demoUsers = {
                athlete: {
                    name: 'Marcus Johnson',
                    firstName: 'Marcus',
                    lastName: 'Johnson',
                    email: 'marcus@university.edu',
                    type: 'athlete',
                    school: 'Duke University',
                    sport: 'Basketball'
                },
                brand: {
                    name: 'John Smith',
                    firstName: 'John',
                    lastName: 'Smith',
                    email: 'john@brand.com',
                    type: 'brand',
                    company: 'Acme Sports Co'
                },
                director: {
                    name: 'Sarah Director',
                    firstName: 'Sarah',
                    lastName: 'Director',
                    email: 'sarah@university.edu',
                    type: 'director',
                    school: 'Duke University'
                }
            };

            return demoUsers[requiredType] || demoUsers.athlete;
        }

        return requireAuth(requiredType);
    };

    // ─── Initialize ───
    // Generate CSRF token on page load
    if (!sessionStorage.getItem('gradeup_csrf')) {
        generateCSRFToken();
    }

})();

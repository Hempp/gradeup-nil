/* ═══════════════════════════════════════════════════════════════════════════
   GRADEUP NIL - Formatters Utility
   Shared number, currency, and date formatting functions
   ═══════════════════════════════════════════════════════════════════════════ */

(function() {
    'use strict';

    /**
     * Formats large numbers with K/M suffixes
     * @param {number} num - Number to format
     * @returns {string} Formatted string (e.g., "1.5M", "250K", "999")
     */
    window.formatNumber = function(num) {
        if (num == null || isNaN(num)) return '0';

        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return num.toLocaleString();
    };

    /**
     * Formats currency amounts with $ prefix and K/M suffixes
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string (e.g., "$1.5M", "$250K", "$999")
     */
    window.formatCurrency = function(amount) {
        if (amount == null || isNaN(amount)) return '$0';

        if (amount >= 1000000) {
            return '$' + (amount / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (amount >= 1000) {
            return '$' + (amount / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return '$' + amount.toLocaleString();
    };

    /**
     * Formats a date as "Mon DD" (e.g., "Jan 15")
     * @param {Date|string|number} date - Date to format
     * @returns {string} Formatted date string
     */
    window.formatDate = function(date) {
        if (!date) return '';

        var d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';

        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[d.getMonth()] + ' ' + d.getDate();
    };

    /**
     * Formats a date as full date string (e.g., "January 15, 2024")
     * @param {Date|string|number} date - Date to format
     * @returns {string} Formatted date string
     */
    window.formatFullDate = function(date) {
        if (!date) return '';

        var d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';

        var months = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    };

    /**
     * Formats a percentage value
     * @param {number} value - Decimal value (0.0 - 1.0)
     * @param {number} [decimals=0] - Decimal places to show
     * @returns {string} Formatted percentage (e.g., "75%")
     */
    window.formatPercent = function(value, decimals) {
        if (value == null || isNaN(value)) return '0%';
        decimals = decimals || 0;
        return (value * 100).toFixed(decimals) + '%';
    };

    /**
     * Formats GPA value
     * @param {number} gpa - GPA value
     * @returns {string} Formatted GPA (e.g., "3.85")
     */
    window.formatGPA = function(gpa) {
        if (gpa == null || isNaN(gpa)) return '0.00';
        return gpa.toFixed(2);
    };

    /**
     * Checks if two dates are the same day
     * @param {Date} date1 - First date
     * @param {Date} date2 - Second date
     * @returns {boolean} True if same day
     */
    window.isSameDay = function(date1, date2) {
        if (!date1 || !date2) return false;
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    };

})();

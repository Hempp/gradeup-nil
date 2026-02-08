/**
 * GradeUp NIL - Application Constants
 * Centralized configuration values to avoid magic numbers/strings
 */

(function() {
  'use strict';

  window.GRADEUP_CONSTANTS = {
    // Animation durations (ms)
    ANIMATION: {
      LOADER_DELAY: 1500,
      COUNTER_DURATION: 2000,
      TOAST_DURATION: 3000,
      MODAL_TRANSITION: 300,
      CARD_HOVER: 200
    },

    // Storage keys
    STORAGE: {
      USER: 'gradeup_user',
      CSRF_TOKEN: 'gradeup_csrf',
      RATE_LIMIT_PREFIX: 'gradeup_ratelimit_'
    },

    // Rate limiting
    RATE_LIMIT: {
      MAX_ATTEMPTS: 5,
      LOCKOUT_DURATION: 15 * 60 * 1000  // 15 minutes
    },

    // Validation
    VALIDATION: {
      EMAIL_MAX_LENGTH: 254,
      PASSWORD_MIN_LENGTH: 8,
      GPA_MIN: 0,
      GPA_MAX: 4.0
    },

    // UI
    UI: {
      SCROLL_THRESHOLD: 50,
      NAV_HIDE_THRESHOLD: 100,
      TOUCH_TARGET_MIN: 44
    },

    // API
    API: {
      TIMEOUT: 30000,
      RETRY_ATTEMPTS: 3
    }
  };

  // Freeze to prevent accidental modification
  Object.freeze(window.GRADEUP_CONSTANTS);
  Object.freeze(window.GRADEUP_CONSTANTS.ANIMATION);
  Object.freeze(window.GRADEUP_CONSTANTS.STORAGE);
  Object.freeze(window.GRADEUP_CONSTANTS.RATE_LIMIT);
  Object.freeze(window.GRADEUP_CONSTANTS.VALIDATION);
  Object.freeze(window.GRADEUP_CONSTANTS.UI);
  Object.freeze(window.GRADEUP_CONSTANTS.API);

})();

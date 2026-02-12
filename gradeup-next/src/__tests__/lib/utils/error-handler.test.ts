import {
  createAppError,
  parseError,
  isAppError,
  handleError,
  logError,
  getErrorLog,
  clearErrorLog,
  type AppError,
} from '@/lib/utils/error-handler';

describe('error-handler', () => {
  beforeEach(() => {
    clearErrorLog();
    jest.clearAllMocks();
  });

  describe('createAppError', () => {
    it('creates error with known code', () => {
      const error = createAppError('AUTH_INVALID_CREDENTIALS');

      expect(error.code).toBe('AUTH_INVALID_CREDENTIALS');
      expect(error.message).toBe('Invalid email or password');
      expect(error.userMessage).toContain('incorrect');
      expect(error.severity).toBe('low');
    });

    it('creates error with unknown code', () => {
      const error = createAppError('UNKNOWN_CODE_123');

      expect(error.code).toBe('UNKNOWN_CODE_123');
      expect(error.userMessage).toContain('unexpected');
      expect(error.severity).toBe('medium');
    });

    it('includes context when provided', () => {
      const context = { userId: '123', action: 'login' };
      const error = createAppError('AUTH_INVALID_CREDENTIALS', context);

      expect(error.context).toEqual(context);
    });

    it('includes original error when provided', () => {
      const originalError = new Error('Original');
      const error = createAppError('NETWORK_ERROR', undefined, originalError);

      expect(error.originalError).toBe(originalError);
    });
  });

  describe('parseError', () => {
    it('returns AppError unchanged', () => {
      const appError: AppError = {
        code: 'TEST_ERROR',
        message: 'Test',
        userMessage: 'User test',
        severity: 'low',
      };

      const result = parseError(appError);

      expect(result).toBe(appError);
    });

    it('parses TypeError with fetch', () => {
      const error = new TypeError('fetch failed');

      const result = parseError(error);

      expect(result.code).toBe('NETWORK_ERROR');
    });

    it('parses timeout errors', () => {
      const error = new Error('Request timeout');

      const result = parseError(error);

      expect(result.code).toBe('TIMEOUT_ERROR');
    });

    it('parses unauthorized errors', () => {
      const error = new Error('unauthorized access');

      const result = parseError(error);

      expect(result.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('parses 401 errors', () => {
      const error = new Error('Error 401: Not authenticated');

      const result = parseError(error);

      expect(result.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('parses not found errors', () => {
      const error = new Error('Resource not found');

      const result = parseError(error);

      expect(result.code).toBe('DATA_NOT_FOUND');
    });

    it('parses 404 errors', () => {
      const error = new Error('HTTP 404');

      const result = parseError(error);

      expect(result.code).toBe('DATA_NOT_FOUND');
    });

    it('returns UNKNOWN_ERROR for generic Error', () => {
      const error = new Error('Something happened');

      const result = parseError(error);

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.context).toEqual({ originalMessage: 'Something happened' });
    });

    it('handles non-Error values', () => {
      const result = parseError('string error');

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.context).toEqual({ errorValue: 'string error' });
    });

    it('parses Supabase auth errors', () => {
      const supabaseError = {
        message: 'Invalid login credentials',
        code: 'invalid_credentials',
      };

      const result = parseError(supabaseError);

      expect(result.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('parses Supabase conflict errors', () => {
      const supabaseError = {
        message: 'Duplicate key',
        code: '23505',
        details: 'Key already exists',
      };

      const result = parseError(supabaseError);

      expect(result.code).toBe('DATA_CONFLICT');
    });

    it('parses Supabase 404 errors', () => {
      const supabaseError = {
        message: 'Not found',
        status: 404,
      };

      const result = parseError(supabaseError);

      expect(result.code).toBe('DATA_NOT_FOUND');
    });

    it('parses Supabase server errors', () => {
      const supabaseError = {
        message: 'Internal error',
        status: 500,
      };

      const result = parseError(supabaseError);

      expect(result.code).toBe('SERVER_ERROR');
    });
  });

  describe('isAppError', () => {
    it('returns true for valid AppError', () => {
      const appError: AppError = {
        code: 'TEST',
        message: 'Test',
        userMessage: 'Test user',
        severity: 'low',
      };

      expect(isAppError(appError)).toBe(true);
    });

    it('returns false for regular Error', () => {
      expect(isAppError(new Error('Test'))).toBe(false);
    });

    it('returns false for null', () => {
      expect(isAppError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isAppError(undefined)).toBe(false);
    });

    it('returns false for incomplete object', () => {
      expect(isAppError({ code: 'TEST' })).toBe(false);
      expect(isAppError({ code: 'TEST', message: 'Test' })).toBe(false);
    });
  });

  describe('logError', () => {
    it('adds error to log', () => {
      const error = createAppError('TEST_ERROR');

      logError(error);

      const log = getErrorLog();
      expect(log.length).toBe(1);
      expect(log[0].error).toBe(error);
    });

    it('includes timestamp', () => {
      const error = createAppError('TEST_ERROR');

      logError(error);

      const log = getErrorLog();
      expect(log[0].timestamp).toBeDefined();
      expect(new Date(log[0].timestamp)).toBeInstanceOf(Date);
    });

    it('includes userId when provided', () => {
      const error = createAppError('TEST_ERROR');

      logError(error, { userId: 'user-123' });

      const log = getErrorLog();
      expect(log[0].userId).toBe('user-123');
    });

    it('limits log size', () => {
      // Log more than MAX_LOG_SIZE (100) errors
      for (let i = 0; i < 110; i++) {
        logError(createAppError('TEST_ERROR'));
      }

      const log = getErrorLog();
      expect(log.length).toBeLessThanOrEqual(100);
    });

    it('newest entries are first', () => {
      logError(createAppError('FIRST'));
      logError(createAppError('SECOND'));

      const log = getErrorLog();
      expect(log[0].error.code).toBe('SECOND');
      expect(log[1].error.code).toBe('FIRST');
    });
  });

  describe('handleError', () => {
    it('parses and logs error', () => {
      const error = new Error('Test error');

      const result = handleError(error);

      expect(result.code).toBeDefined();
      expect(getErrorLog().length).toBe(1);
    });

    it('calls showToast when not silent', () => {
      const showToast = jest.fn();
      const error = new Error('Test error');

      handleError(error, { showToast });

      expect(showToast).toHaveBeenCalled();
    });

    it('does not call showToast when silent', () => {
      const showToast = jest.fn();
      const error = new Error('Test error');

      handleError(error, { silent: true, showToast });

      expect(showToast).not.toHaveBeenCalled();
    });

    it('returns parsed AppError', () => {
      const error = new Error('unauthorized');

      const result = handleError(error);

      expect(result.code).toBe('AUTH_UNAUTHORIZED');
    });
  });

  describe('clearErrorLog', () => {
    it('clears all logged errors', () => {
      logError(createAppError('ERROR_1'));
      logError(createAppError('ERROR_2'));

      clearErrorLog();

      expect(getErrorLog().length).toBe(0);
    });
  });
});

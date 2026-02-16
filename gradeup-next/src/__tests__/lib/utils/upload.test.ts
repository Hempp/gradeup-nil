/**
 * Tests for upload utility functions
 * @module __tests__/lib/utils/upload.test
 */

import {
  validateFileSize,
  validateFileType,
  generateFilePath,
  getFilePreviewUrl,
  revokeFilePreviewUrl,
  type UploadBucket,
  type UploadOptions,
  type UploadResult,
  type FileValidationResult,
} from '@/lib/utils/upload';

// Mock URL object methods
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();

Object.defineProperty(URL, 'createObjectURL', {
  value: mockCreateObjectURL,
});
Object.defineProperty(URL, 'revokeObjectURL', {
  value: mockRevokeObjectURL,
});

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/file.jpg' } })),
        remove: jest.fn().mockResolvedValue({ error: null }),
      })),
    },
  })),
}));

describe('upload utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFileSize', () => {
    it('returns valid for file under limit', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB

      const result = validateFileSize(file, 5);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns invalid for file over limit', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 }); // 10MB

      const result = validateFileSize(file, 5);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('5MB');
    });

    it('returns valid for file at exact limit', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }); // Exactly 5MB

      const result = validateFileSize(file, 5);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateFileType', () => {
    it('returns valid for allowed type', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const allowedTypes = ['image/jpeg', 'image/png'];

      const result = validateFileType(file, allowedTypes);

      expect(result.valid).toBe(true);
    });

    it('returns invalid for disallowed type', () => {
      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      const allowedTypes = ['image/jpeg', 'image/png'];

      const result = validateFileType(file, allowedTypes);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });

    it('includes friendly type names in error', () => {
      const file = new File(['content'], 'test.gif', { type: 'image/gif' });
      const allowedTypes = ['image/jpeg', 'image/png'];

      const result = validateFileType(file, allowedTypes);

      expect(result.error).toContain('JPEG');
      expect(result.error).toContain('PNG');
    });
  });

  describe('generateFilePath', () => {
    it('generates path with user id and timestamp', () => {
      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
      const path = generateFilePath('user-123', file);

      expect(path).toContain('user-123');
      expect(path).toContain('.jpg');
    });

    it('uses custom path if provided', () => {
      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
      const path = generateFilePath('user-123', file, 'custom/folder');

      expect(path).toContain('custom/folder');
      expect(path).toContain('.jpg');
    });

    it('handles file with no extension', () => {
      const file = new File(['content'], 'noextension', { type: 'application/octet-stream' });
      const path = generateFilePath('user-123', file);

      // File extension is extracted from filename, so 'noextension' becomes the extension
      expect(path).toContain('.noextension');
    });

    it('generates unique paths', () => {
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const path1 = generateFilePath('user-123', file);
      const path2 = generateFilePath('user-123', file);

      // Paths should be different due to random component
      // Note: There's a small chance they could be the same if called very quickly
      expect(path1).not.toEqual(path2);
    });
  });

  describe('getFilePreviewUrl', () => {
    it('creates object URL for file', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      const url = getFilePreviewUrl(file);

      expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
      expect(url).toBe('blob:mock-url');
    });
  });

  describe('revokeFilePreviewUrl', () => {
    it('revokes object URL', () => {
      revokeFilePreviewUrl('blob:test-url');

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });
  });

  describe('UploadBucket type', () => {
    it('supports all bucket types', () => {
      const buckets: UploadBucket[] = [
        'avatars',
        'documents',
        'message-attachments',
        'brand-logos',
        'campaign-assets',
      ];

      expect(buckets.length).toBe(5);
    });
  });

  describe('UploadOptions type', () => {
    it('has required bucket property', () => {
      const options: UploadOptions = {
        bucket: 'avatars',
      };

      expect(options.bucket).toBe('avatars');
    });

    it('accepts optional properties', () => {
      const progressCallback = jest.fn();
      const options: UploadOptions = {
        bucket: 'documents',
        path: 'custom/path',
        maxSizeMB: 10,
        allowedTypes: ['application/pdf'],
        onProgress: progressCallback,
      };

      expect(options.maxSizeMB).toBe(10);
      expect(options.allowedTypes).toContain('application/pdf');
    });
  });

  describe('UploadResult type', () => {
    it('has correct structure for success', () => {
      const result: UploadResult = {
        url: 'https://example.com/file.jpg',
        path: 'user-123/file.jpg',
        error: null,
      };

      expect(result.url).toBeDefined();
      expect(result.path).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('has correct structure for error', () => {
      const result: UploadResult = {
        url: null,
        path: null,
        error: new Error('Upload failed'),
      };

      expect(result.url).toBeNull();
      expect(result.path).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('FileValidationResult type', () => {
    it('has correct structure for valid', () => {
      const result: FileValidationResult = {
        valid: true,
      };

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('has correct structure for invalid', () => {
      const result: FileValidationResult = {
        valid: false,
        error: 'File too large',
      };

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File too large');
    });
  });
});

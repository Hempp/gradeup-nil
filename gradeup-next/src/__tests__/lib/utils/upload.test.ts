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

  describe('validateFile', () => {
    const { validateFile } = require('@/lib/utils/upload');

    it('validates file size and type for avatars bucket', async () => {
      // Valid avatar image
      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1 * 1024 * 1024 }); // 1MB

      const result = await validateFile(file, { bucket: 'avatars' as UploadBucket });
      expect(result.valid).toBe(true);
    });

    it('rejects oversized file for avatars bucket', async () => {
      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 }); // 10MB (exceeds 2MB limit)

      const result = await validateFile(file, { bucket: 'avatars' as UploadBucket });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('2MB');
    });

    it('rejects invalid file type for avatars bucket', async () => {
      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 100 * 1024 }); // 100KB

      const result = await validateFile(file, { bucket: 'avatars' as UploadBucket });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });

    it('uses custom maxSizeMB from options', async () => {
      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }); // 5MB

      const result = await validateFile(file, {
        bucket: 'avatars' as UploadBucket,
        maxSizeMB: 10, // Override default 2MB limit
      });
      expect(result.valid).toBe(true);
    });

    it('uses custom allowedTypes from options', async () => {
      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 100 * 1024 }); // 100KB

      const result = await validateFile(file, {
        bucket: 'avatars' as UploadBucket,
        allowedTypes: ['application/pdf'], // Override allowed types
      });
      expect(result.valid).toBe(true);
    });

    it('validates documents bucket with larger size limit', async () => {
      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 8 * 1024 * 1024 }); // 8MB

      const result = await validateFile(file, { bucket: 'documents' as UploadBucket });
      expect(result.valid).toBe(true);
    });

    it('validates message-attachments bucket', async () => {
      const file = new File(['content'], 'image.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 4 * 1024 * 1024 }); // 4MB

      const result = await validateFile(file, { bucket: 'message-attachments' as UploadBucket });
      expect(result.valid).toBe(true);
    });

    it('validates brand-logos bucket', async () => {
      const file = new File(['content'], 'logo.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 1 * 1024 * 1024 }); // 1MB

      const result = await validateFile(file, { bucket: 'brand-logos' as UploadBucket });
      expect(result.valid).toBe(true);
    });

    it('validates campaign-assets bucket', async () => {
      const file = new File(['content'], 'asset.webp', { type: 'image/webp' });
      Object.defineProperty(file, 'size', { value: 8 * 1024 * 1024 }); // 8MB

      const result = await validateFile(file, { bucket: 'campaign-assets' as UploadBucket });
      expect(result.valid).toBe(true);
    });
  });

  describe('uploadFile', () => {
    const { uploadFile } = require('@/lib/utils/upload');
    const { createClient } = require('@/lib/supabase/client');

    it('returns error when not authenticated', async () => {
      createClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      });

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 100 * 1024 });

      const result = await uploadFile(file, { bucket: 'avatars' as UploadBucket });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('returns error on auth error', async () => {
      createClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error('Auth failed') }),
        },
      });

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 100 * 1024 });

      const result = await uploadFile(file, { bucket: 'avatars' as UploadBucket });

      expect(result.error?.message).toBe('Not authenticated');
    });

    it('returns validation error for invalid file', async () => {
      createClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      });

      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      Object.defineProperty(file, 'size', { value: 100 * 1024 });

      const result = await uploadFile(file, { bucket: 'avatars' as UploadBucket });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('File type not allowed');
    });

    it('uploads file successfully', async () => {
      const mockStorage = {
        upload: jest.fn().mockResolvedValue({
          data: { path: 'user-123/file.jpg' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/file.jpg' },
        }),
      };

      createClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        storage: {
          from: jest.fn().mockReturnValue(mockStorage),
        },
      });

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 100 * 1024 });

      const onProgress = jest.fn();
      const result = await uploadFile(file, {
        bucket: 'avatars' as UploadBucket,
        onProgress,
      });

      expect(result.url).toBe('https://example.com/file.jpg');
      expect(result.path).toBe('user-123/file.jpg');
      expect(result.error).toBeNull();
      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('returns upload error', async () => {
      const mockStorage = {
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Storage error'),
        }),
      };

      createClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        storage: {
          from: jest.fn().mockReturnValue(mockStorage),
        },
      });

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 100 * 1024 });

      const result = await uploadFile(file, { bucket: 'avatars' as UploadBucket });

      expect(result.url).toBeNull();
      expect(result.error).not.toBeNull();
    });

    it('handles unexpected exceptions', async () => {
      createClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockRejectedValue(new Error('Unexpected error')),
        },
      });

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 100 * 1024 });

      const result = await uploadFile(file, { bucket: 'avatars' as UploadBucket });

      expect(result.error?.message).toBe('Unexpected error');
    });
  });

  describe('deleteFile', () => {
    const { deleteFile } = require('@/lib/utils/upload');
    const { createClient } = require('@/lib/supabase/client');

    it('deletes file successfully', async () => {
      const mockStorage = {
        remove: jest.fn().mockResolvedValue({ error: null }),
      };

      createClient.mockReturnValue({
        storage: {
          from: jest.fn().mockReturnValue(mockStorage),
        },
      });

      const result = await deleteFile('avatars' as UploadBucket, 'user-123/file.jpg');

      expect(result.error).toBeNull();
      expect(mockStorage.remove).toHaveBeenCalledWith(['user-123/file.jpg']);
    });

    it('returns delete error', async () => {
      const mockStorage = {
        remove: jest.fn().mockResolvedValue({ error: new Error('Delete failed') }),
      };

      createClient.mockReturnValue({
        storage: {
          from: jest.fn().mockReturnValue(mockStorage),
        },
      });

      const result = await deleteFile('avatars' as UploadBucket, 'user-123/file.jpg');

      expect(result.error).not.toBeNull();
    });

    it('handles unexpected exceptions', async () => {
      createClient.mockReturnValue({
        storage: {
          from: jest.fn().mockImplementation(() => {
            throw new Error('Storage unavailable');
          }),
        },
      });

      const result = await deleteFile('avatars' as UploadBucket, 'user-123/file.jpg');

      expect(result.error?.message).toBe('Storage unavailable');
    });
  });
});

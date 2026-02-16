'use client';

import { createClient } from '@/lib/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type UploadBucket = 'avatars' | 'documents' | 'message-attachments' | 'brand-logos' | 'campaign-assets';

export interface UploadOptions {
  bucket: UploadBucket;
  path?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  onProgress?: (progress: number) => void;
}

export interface UploadResult {
  url: string | null;
  path: string | null;
  error: Error | null;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_MAX_SIZE_MB = 5;

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const BUCKET_CONFIGS: Record<UploadBucket, { maxSizeMB: number; allowedTypes: string[] }> = {
  avatars: {
    maxSizeMB: 2,
    allowedTypes: ALLOWED_IMAGE_TYPES,
  },
  'brand-logos': {
    maxSizeMB: 2,
    allowedTypes: ALLOWED_IMAGE_TYPES,
  },
  documents: {
    maxSizeMB: 10,
    allowedTypes: [...ALLOWED_DOCUMENT_TYPES, ...ALLOWED_IMAGE_TYPES],
  },
  'message-attachments': {
    maxSizeMB: 5,
    allowedTypes: [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES],
  },
  'campaign-assets': {
    maxSizeMB: 10,
    allowedTypes: ALLOWED_IMAGE_TYPES,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Validation Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate that a file does not exceed the maximum size limit
 *
 * @param file - The File object to validate
 * @param maxSizeMB - Maximum allowed size in megabytes
 * @returns Validation result with valid boolean and optional error message
 * @example
 * const result = validateFileSize(file, 5);
 * if (!result.valid) {
 *   showError(result.error);
 * }
 */
export function validateFileSize(file: File, maxSizeMB: number): FileValidationResult {
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`,
    };
  }
  return { valid: true };
}

/**
 * Validate that a file's MIME type is in the allowed list
 *
 * @param file - The File object to validate
 * @param allowedTypes - Array of allowed MIME types (e.g., 'image/jpeg')
 * @returns Validation result with valid boolean and optional error message
 * @example
 * const result = validateFileType(file, ['image/jpeg', 'image/png']);
 */
export function validateFileType(file: File, allowedTypes: string[]): FileValidationResult {
  if (!allowedTypes.includes(file.type)) {
    const friendlyTypes = allowedTypes
      .map((t) => t.split('/')[1].toUpperCase())
      .join(', ');
    return {
      valid: false,
      error: `File type not allowed. Accepted types: ${friendlyTypes}`,
    };
  }
  return { valid: true };
}

/**
 * Validate image dimensions against min/max constraints
 *
 * Loads the image to check its dimensions. Skips validation for non-image files.
 *
 * @param file - The File object to validate
 * @param minWidth - Optional minimum width in pixels
 * @param minHeight - Optional minimum height in pixels
 * @param maxWidth - Optional maximum width in pixels
 * @param maxHeight - Optional maximum height in pixels
 * @returns Promise resolving to validation result
 * @example
 * const result = await validateImageDimensions(file, 200, 200, 2000, 2000);
 */
export async function validateImageDimensions(
  file: File,
  minWidth?: number,
  minHeight?: number,
  maxWidth?: number,
  maxHeight?: number
): Promise<FileValidationResult> {
  if (!file.type.startsWith('image/')) {
    return { valid: true }; // Skip for non-images
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      if (minWidth && img.width < minWidth) {
        resolve({ valid: false, error: `Image width must be at least ${minWidth}px` });
        return;
      }
      if (minHeight && img.height < minHeight) {
        resolve({ valid: false, error: `Image height must be at least ${minHeight}px` });
        return;
      }
      if (maxWidth && img.width > maxWidth) {
        resolve({ valid: false, error: `Image width must be at most ${maxWidth}px` });
        return;
      }
      if (maxHeight && img.height > maxHeight) {
        resolve({ valid: false, error: `Image height must be at most ${maxHeight}px` });
        return;
      }

      resolve({ valid: true });
    };
    img.onerror = () => {
      resolve({ valid: false, error: 'Failed to load image for validation' });
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get the dimensions of an image file
 *
 * Loads the image and returns its width and height. Returns null for
 * non-image files or if the image fails to load.
 *
 * @param file - The image File object
 * @returns Promise resolving to dimensions or null
 * @example
 * const dims = await getImageDimensions(imageFile);
 * if (dims) {
 *   console.log(`${dims.width}x${dims.height}`);
 * }
 */
export function getImageDimensions(file: File): Promise<ImageDimensions | null> {
  if (!file.type.startsWith('image/')) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Validate a file for upload against bucket configuration
 *
 * Runs size and type validation based on the bucket's configuration
 * or custom options. Each bucket has predefined constraints.
 *
 * @param file - The File object to validate
 * @param options - Upload options including bucket and optional overrides
 * @returns Promise resolving to validation result
 * @example
 * const result = await validateFile(file, { bucket: 'avatars' });
 * if (!result.valid) {
 *   showError(result.error);
 * }
 */
export async function validateFile(
  file: File,
  options: UploadOptions
): Promise<FileValidationResult> {
  const config = BUCKET_CONFIGS[options.bucket];
  const maxSizeMB = options.maxSizeMB ?? config.maxSizeMB ?? DEFAULT_MAX_SIZE_MB;
  const allowedTypes = options.allowedTypes ?? config.allowedTypes;

  // Validate size
  const sizeResult = validateFileSize(file, maxSizeMB);
  if (!sizeResult.valid) return sizeResult;

  // Validate type
  const typeResult = validateFileType(file, allowedTypes);
  if (!typeResult.valid) return typeResult;

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// Upload Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique file path for storage
 *
 * Creates a path with timestamp and random string to ensure uniqueness.
 * Format: {userId}/{timestamp}-{random}.{extension}
 *
 * @param userId - The user's ID for the path prefix
 * @param file - The File object (used for extension)
 * @param customPath - Optional custom path prefix instead of userId
 * @returns Unique file path string
 * @example
 * generateFilePath('user-123', file) // 'user-123/1708123456789-a1b2c3.jpg'
 * generateFilePath('user-123', file, 'avatars') // 'avatars/1708123456789-a1b2c3.jpg'
 */
export function generateFilePath(userId: string, file: File, customPath?: string): string {
  const ext = file.name.split('.').pop() || 'bin';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const filename = `${timestamp}-${random}.${ext}`;

  if (customPath) {
    return `${customPath}/${filename}`;
  }

  return `${userId}/${filename}`;
}

/**
 * Upload a file to Supabase Storage
 *
 * Validates the file, generates a unique path, and uploads to the
 * specified bucket. Returns the public URL on success.
 *
 * @param file - The File object to upload
 * @param options - Upload options including bucket and optional path/callbacks
 * @returns Promise resolving to UploadResult with url, path, or error
 * @example
 * const { url, error } = await uploadFile(file, {
 *   bucket: 'avatars',
 *   onProgress: (p) => setProgress(p)
 * });
 */
export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  const supabase = createClient();

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { url: null, path: null, error: new Error('Not authenticated') };
    }

    // Validate file
    const validation = await validateFile(file, options);
    if (!validation.valid) {
      return { url: null, path: null, error: new Error(validation.error) };
    }

    // Generate path
    const filePath = generateFilePath(user.id, file, options.path);

    // Upload with progress tracking
    const { data, error: uploadError } = await supabase.storage
      .from(options.bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return { url: null, path: null, error: uploadError };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(options.bucket)
      .getPublicUrl(data.path);

    // Call progress callback with 100%
    options.onProgress?.(100);

    return { url: publicUrl, path: data.path, error: null };
  } catch (error) {
    return {
      url: null,
      path: null,
      error: error instanceof Error ? error : new Error('Upload failed'),
    };
  }
}

/**
 * Upload a file with real-time progress tracking
 *
 * Uses XMLHttpRequest instead of Supabase client for accurate progress
 * reporting. Ideal for large files where progress feedback is important.
 *
 * @param file - The File object to upload
 * @param options - Upload options including bucket and onProgress callback
 * @returns Promise resolving to UploadResult with url, path, or error
 * @example
 * const { url } = await uploadFileWithProgress(file, {
 *   bucket: 'documents',
 *   onProgress: (progress) => {
 *     setUploadProgress(progress); // 0-100
 *   }
 * });
 */
export async function uploadFileWithProgress(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  const supabase = createClient();

  try {
    // Get current user and session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();

    if (userError || !user || !session) {
      return { url: null, path: null, error: new Error('Not authenticated') };
    }

    // Validate file
    const validation = await validateFile(file, options);
    if (!validation.valid) {
      return { url: null, path: null, error: new Error(validation.error) };
    }

    // Generate path
    const filePath = generateFilePath(user.id, file, options.path);

    // Get Supabase URL from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return { url: null, path: null, error: new Error('Supabase URL not configured') };
    }

    // Upload with XHR for progress
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${options.bucket}/${filePath}`;

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && options.onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          options.onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const { data: { publicUrl } } = supabase.storage
            .from(options.bucket)
            .getPublicUrl(filePath);

          resolve({ url: publicUrl, path: filePath, error: null });
        } else {
          resolve({
            url: null,
            path: null,
            error: new Error(`Upload failed with status ${xhr.status}`),
          });
        }
      });

      xhr.addEventListener('error', () => {
        resolve({ url: null, path: null, error: new Error('Upload failed') });
      });

      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.send(file);
    });
  } catch (error) {
    return {
      url: null,
      path: null,
      error: error instanceof Error ? error : new Error('Upload failed'),
    };
  }
}

/**
 * Delete a file from Supabase Storage
 *
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @returns Promise resolving to object with error or null on success
 * @example
 * const { error } = await deleteFile('avatars', 'user-123/old-avatar.jpg');
 */
export async function deleteFile(bucket: UploadBucket, path: string): Promise<{ error: Error | null }> {
  const supabase = createClient();

  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    return { error: error || null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Delete failed') };
  }
}

/**
 * Upload a user avatar image with progress tracking
 *
 * Convenience wrapper for uploadFileWithProgress with 'avatars' bucket.
 * Automatically uses avatar-specific size and type constraints.
 *
 * @param file - The image File to upload
 * @param onProgress - Optional callback for upload progress (0-100)
 * @returns Promise resolving to UploadResult
 * @example
 * const { url } = await uploadAvatar(file, setProgress);
 * if (url) updateProfile({ avatar_url: url });
 */
export async function uploadAvatar(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return uploadFileWithProgress(file, {
    bucket: 'avatars',
    onProgress,
  });
}

/**
 * Upload a brand logo image with progress tracking
 *
 * Convenience wrapper for uploadFileWithProgress with 'brand-logos' bucket.
 *
 * @param file - The image File to upload
 * @param onProgress - Optional callback for upload progress (0-100)
 * @returns Promise resolving to UploadResult
 */
export async function uploadBrandLogo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return uploadFileWithProgress(file, {
    bucket: 'brand-logos',
    onProgress,
  });
}

/**
 * Upload a document file with progress tracking
 *
 * Convenience wrapper for uploadFileWithProgress with 'documents' bucket.
 * Supports PDFs, Word docs, and images.
 *
 * @param file - The document File to upload
 * @param onProgress - Optional callback for upload progress (0-100)
 * @returns Promise resolving to UploadResult
 */
export async function uploadDocument(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return uploadFileWithProgress(file, {
    bucket: 'documents',
    onProgress,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Image Processing Utilities
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compress an image file to reduce size before upload
 *
 * Resizes the image if wider than maxWidth and compresses using
 * canvas. Only returns compressed version if smaller than original.
 *
 * @param file - The image File to compress
 * @param maxWidth - Maximum width in pixels (default: 1200)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Promise resolving to compressed File (or original if smaller)
 * @example
 * const compressed = await compressImage(file, 800, 0.7);
 * const { url } = await uploadAvatar(compressed);
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Create new file with same name
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });

          // Only use compressed if smaller
          if (compressedFile.size < file.size) {
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Create a square thumbnail from an image file
 *
 * Center-crops the image to a square and scales to the specified size.
 * Returns a JPEG Blob at 85% quality.
 *
 * @param file - The image File to create thumbnail from
 * @param size - Thumbnail size in pixels (default: 200)
 * @returns Promise resolving to Blob or null on failure
 * @example
 * const thumbnailBlob = await createThumbnail(file, 150);
 * if (thumbnailBlob) {
 *   const thumbnailFile = new File([thumbnailBlob], 'thumb.jpg');
 * }
 */
export async function createThumbnail(
  file: File,
  size: number = 200
): Promise<Blob | null> {
  if (!file.type.startsWith('image/')) {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      // Calculate crop dimensions (square center crop)
      const minDimension = Math.min(img.width, img.height);
      const sx = (img.width - minDimension) / 2;
      const sy = (img.height - minDimension) / 2;

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      // Draw cropped and scaled image
      ctx.drawImage(img, sx, sy, minDimension, minDimension, 0, 0, size, size);

      // Convert to blob
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
    };

    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get a local preview URL for a file (before upload)
 *
 * Creates an object URL for displaying file preview in the browser.
 * Remember to revoke the URL when done to free memory.
 *
 * @param file - The File to create preview URL for
 * @returns Object URL string for the file
 * @example
 * const previewUrl = getFilePreviewUrl(file);
 * setImageSrc(previewUrl);
 * // Later: revokeFilePreviewUrl(previewUrl);
 */
export function getFilePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a file preview URL to free browser memory
 *
 * Should be called when preview is no longer needed (e.g., after upload
 * completes or component unmounts).
 *
 * @param url - The object URL to revoke
 * @example
 * useEffect(() => {
 *   return () => {
 *     if (previewUrl) revokeFilePreviewUrl(previewUrl);
 *   };
 * }, [previewUrl]);
 */
export function revokeFilePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

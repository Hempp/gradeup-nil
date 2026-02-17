'use client';

import { createClient } from '@/lib/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type StorageBucket = 'avatars' | 'covers' | 'documents' | 'brand-logos' | 'campaign-assets';

export type ImageType = 'avatar' | 'cover' | 'document' | 'logo' | 'campaign';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface UploadConfig {
  bucket: StorageBucket;
  maxSizeMB: number;
  allowedTypes: string[];
  dimensions?: {
    maxWidth?: number;
    maxHeight?: number;
    minWidth?: number;
    minHeight?: number;
  };
  generateThumbnail?: boolean;
  thumbnailSize?: number;
}

export interface UploadResult {
  url: string | null;
  path: string | null;
  thumbnailUrl?: string | null;
  thumbnailPath?: string | null;
  error: Error | null;
}

export interface OptimizedImageResult {
  originalUrl: string;
  webpUrl?: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
}

export interface StorageServiceResult<T> {
  data: T | null;
  error: Error | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

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

const UPLOAD_CONFIGS: Record<ImageType, UploadConfig> = {
  avatar: {
    bucket: 'avatars',
    maxSizeMB: 2,
    allowedTypes: ALLOWED_IMAGE_TYPES,
    dimensions: {
      maxWidth: 800,
      maxHeight: 800,
      minWidth: 100,
      minHeight: 100,
    },
    generateThumbnail: true,
    thumbnailSize: 150,
  },
  cover: {
    bucket: 'covers',
    maxSizeMB: 5,
    allowedTypes: ALLOWED_IMAGE_TYPES,
    dimensions: {
      maxWidth: 1920,
      maxHeight: 1080,
      minWidth: 600,
      minHeight: 200,
    },
    generateThumbnail: true,
    thumbnailSize: 400,
  },
  document: {
    bucket: 'documents',
    maxSizeMB: 10,
    allowedTypes: [...ALLOWED_DOCUMENT_TYPES, ...ALLOWED_IMAGE_TYPES],
  },
  logo: {
    bucket: 'brand-logos',
    maxSizeMB: 2,
    allowedTypes: ALLOWED_IMAGE_TYPES,
    dimensions: {
      maxWidth: 500,
      maxHeight: 500,
      minWidth: 50,
      minHeight: 50,
    },
    generateThumbnail: true,
    thumbnailSize: 100,
  },
  campaign: {
    bucket: 'campaign-assets',
    maxSizeMB: 10,
    allowedTypes: ALLOWED_IMAGE_TYPES,
    dimensions: {
      maxWidth: 2000,
      maxHeight: 2000,
    },
    generateThumbnail: true,
    thumbnailSize: 300,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Validation Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate file size against maximum allowed
 */
export function validateFileSize(file: File, maxSizeMB: number): { valid: boolean; error?: string } {
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
 * Validate file MIME type
 */
export function validateFileType(file: File, allowedTypes: string[]): { valid: boolean; error?: string } {
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
 * Get image dimensions from a file
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
 * Validate image dimensions
 */
export async function validateImageDimensions(
  file: File,
  config: UploadConfig
): Promise<{ valid: boolean; error?: string }> {
  if (!file.type.startsWith('image/') || !config.dimensions) {
    return { valid: true };
  }

  const dimensions = await getImageDimensions(file);
  if (!dimensions) {
    return { valid: false, error: 'Could not read image dimensions' };
  }

  const { minWidth, minHeight, maxWidth, maxHeight } = config.dimensions;

  if (minWidth && dimensions.width < minWidth) {
    return { valid: false, error: `Image width must be at least ${minWidth}px` };
  }
  if (minHeight && dimensions.height < minHeight) {
    return { valid: false, error: `Image height must be at least ${minHeight}px` };
  }
  if (maxWidth && dimensions.width > maxWidth) {
    return { valid: false, error: `Image width must be at most ${maxWidth}px. Consider using server-side optimization.` };
  }
  if (maxHeight && dimensions.height > maxHeight) {
    return { valid: false, error: `Image height must be at most ${maxHeight}px. Consider using server-side optimization.` };
  }

  return { valid: true };
}

/**
 * Validate a file for upload
 */
export async function validateForUpload(
  file: File,
  imageType: ImageType
): Promise<{ valid: boolean; error?: string }> {
  const config = UPLOAD_CONFIGS[imageType];

  const sizeValidation = validateFileSize(file, config.maxSizeMB);
  if (!sizeValidation.valid) return sizeValidation;

  const typeValidation = validateFileType(file, config.allowedTypes);
  if (!typeValidation.valid) return typeValidation;

  const dimensionValidation = await validateImageDimensions(file, config);
  if (!dimensionValidation.valid) return dimensionValidation;

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// Image Processing (Client-Side)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compress and resize an image on the client side using canvas
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.85
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      let width = img.width;
      let height = img.height;

      // Only resize if larger than maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      // Use better quality settings
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          // Only return compressed if it's actually smaller
          resolve(compressedFile.size < file.size ? compressedFile : file);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Create a square thumbnail from an image
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

      // Square center crop
      const minDimension = Math.min(img.width, img.height);
      const sx = (img.width - minDimension) / 2;
      const sy = (img.height - minDimension) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, minDimension, minDimension, 0, 0, size, size);

      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
    };

    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Crop an image to specified dimensions
 */
export async function cropImage(
  file: File,
  cropArea: { x: number; y: number; width: number; height: number }
): Promise<File | null> {
  if (!file.type.startsWith('image/')) {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      const canvas = document.createElement('canvas');
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        resolve(new File([blob], file.name, {
          type: file.type,
          lastModified: Date.now(),
        }));
      }, file.type, 0.9);
    };

    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// File Path Generation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique file path for storage
 */
export function generateFilePath(
  userId: string,
  file: File,
  prefix?: string
): string {
  const ext = file.name.split('.').pop() || 'bin';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const filename = `${timestamp}-${random}.${ext}`;

  if (prefix) {
    return `${userId}/${prefix}/${filename}`;
  }

  return `${userId}/${filename}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Upload Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Upload an image to Supabase Storage with optimization
 */
export async function uploadImage(
  file: File,
  imageType: ImageType,
  options?: {
    compress?: boolean;
    generateThumbnail?: boolean;
    onProgress?: (progress: number) => void;
  }
): Promise<UploadResult> {
  const supabase = createClient();
  const config = UPLOAD_CONFIGS[imageType];

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { url: null, path: null, error: new Error('Not authenticated') };
    }

    // Validate the file
    const validation = await validateForUpload(file, imageType);
    if (!validation.valid) {
      return { url: null, path: null, error: new Error(validation.error) };
    }

    // Compress image if requested and applicable
    let processedFile = file;
    if (options?.compress !== false && file.type.startsWith('image/')) {
      const maxWidth = config.dimensions?.maxWidth || 1200;
      processedFile = await compressImage(file, maxWidth, 0.85);
    }

    // Generate file path
    const filePath = generateFilePath(user.id, processedFile, imageType);

    // Upload the main image
    const { data, error: uploadError } = await supabase.storage
      .from(config.bucket)
      .upload(filePath, processedFile, {
        cacheControl: '31536000', // 1 year cache
        upsert: true,
      });

    if (uploadError) {
      return { url: null, path: null, error: uploadError };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(config.bucket)
      .getPublicUrl(data.path);

    options?.onProgress?.(100);

    // Generate and upload thumbnail if configured
    let thumbnailUrl: string | null = null;
    let thumbnailPath: string | null = null;

    const shouldGenerateThumbnail = options?.generateThumbnail ?? config.generateThumbnail;
    if (shouldGenerateThumbnail && file.type.startsWith('image/')) {
      const thumbnailBlob = await createThumbnail(
        processedFile,
        config.thumbnailSize || 200
      );

      if (thumbnailBlob) {
        const thumbPath = filePath.replace(/\.([^.]+)$/, '-thumb.jpg');
        const { data: thumbData, error: thumbError } = await supabase.storage
          .from(config.bucket)
          .upload(thumbPath, thumbnailBlob, {
            cacheControl: '31536000',
            upsert: true,
          });

        if (!thumbError && thumbData) {
          const { data: { publicUrl: thumbUrl } } = supabase.storage
            .from(config.bucket)
            .getPublicUrl(thumbData.path);
          thumbnailUrl = thumbUrl;
          thumbnailPath = thumbData.path;
        }
      }
    }

    return {
      url: publicUrl,
      path: data.path,
      thumbnailUrl,
      thumbnailPath,
      error: null,
    };
  } catch (error) {
    return {
      url: null,
      path: null,
      error: error instanceof Error ? error : new Error('Upload failed'),
    };
  }
}

/**
 * Upload image with real-time progress tracking using XHR
 */
export async function uploadImageWithProgress(
  file: File,
  imageType: ImageType,
  onProgress: (progress: number) => void
): Promise<UploadResult> {
  const supabase = createClient();
  const config = UPLOAD_CONFIGS[imageType];

  try {
    // Get current user and session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();

    if (userError || !user || !session) {
      return { url: null, path: null, error: new Error('Not authenticated') };
    }

    // Validate the file
    const validation = await validateForUpload(file, imageType);
    if (!validation.valid) {
      return { url: null, path: null, error: new Error(validation.error) };
    }

    // Compress image
    let processedFile = file;
    if (file.type.startsWith('image/')) {
      const maxWidth = config.dimensions?.maxWidth || 1200;
      processedFile = await compressImage(file, maxWidth, 0.85);
    }

    // Generate file path
    const filePath = generateFilePath(user.id, processedFile, imageType);

    // Get Supabase URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return { url: null, path: null, error: new Error('Supabase URL not configured') };
    }

    // Upload with XHR for progress
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${config.bucket}/${filePath}`;

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const { data: { publicUrl } } = supabase.storage
            .from(config.bucket)
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
      xhr.send(processedFile);
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
 * Upload with server-side optimization (WebP conversion, resizing)
 */
export async function uploadOptimizedImage(
  file: File,
  imageType: ImageType,
  options?: {
    onProgress?: (progress: number) => void;
  }
): Promise<StorageServiceResult<OptimizedImageResult>> {
  try {
    // Create form data for server upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', imageType);

    // Upload to server-side API for processing
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      return {
        data: null,
        error: new Error(errorData.error || 'Upload failed'),
      };
    }

    const result = await response.json();
    options?.onProgress?.(100);

    return {
      data: result,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Upload failed'),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Delete Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Delete an image from Supabase Storage
 */
export async function deleteImage(
  path: string,
  bucket: StorageBucket
): Promise<{ error: Error | null }> {
  const supabase = createClient();

  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    return { error: error || null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Delete failed') };
  }
}

/**
 * Delete an image and its thumbnail
 */
export async function deleteImageWithThumbnail(
  path: string,
  bucket: StorageBucket
): Promise<{ error: Error | null }> {
  const supabase = createClient();

  try {
    // Generate thumbnail path
    const thumbnailPath = path.replace(/\.([^.]+)$/, '-thumb.jpg');

    // Delete both files
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path, thumbnailPath]);

    return { error: error || null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Delete failed') };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// URL Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the public URL for an image in storage
 */
export function getPublicUrl(path: string, bucket: StorageBucket): string {
  const supabase = createClient();
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}

/**
 * Get a signed URL for temporary access to a private file
 */
export async function getSignedUrl(
  path: string,
  bucket: StorageBucket,
  expiresIn: number = 3600
): Promise<StorageServiceResult<string>> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      return { data: null, error };
    }

    return { data: data.signedUrl, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to generate signed URL'),
    };
  }
}

/**
 * Get CDN-optimized URL with transformation parameters
 * Note: Requires Supabase Image Transformation to be enabled
 */
export function getCdnUrl(
  path: string,
  bucket: StorageBucket,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'origin';
    resize?: 'cover' | 'contain' | 'fill';
  }
): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return getPublicUrl(path, bucket);
  }

  const params = new URLSearchParams();
  if (options?.width) params.set('width', options.width.toString());
  if (options?.height) params.set('height', options.height.toString());
  if (options?.quality) params.set('quality', options.quality.toString());
  if (options?.format) params.set('format', options.format);
  if (options?.resize) params.set('resize', options.resize);

  const queryString = params.toString();
  const transformPath = queryString ? `?${queryString}` : '';

  return `${supabaseUrl}/storage/v1/render/image/public/${bucket}/${path}${transformPath}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Convenience Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Upload an avatar image
 */
export async function uploadAvatar(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return uploadImage(file, 'avatar', { onProgress, compress: true, generateThumbnail: true });
}

/**
 * Upload a cover image
 */
export async function uploadCover(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return uploadImage(file, 'cover', { onProgress, compress: true, generateThumbnail: true });
}

/**
 * Upload a brand logo
 */
export async function uploadLogo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return uploadImage(file, 'logo', { onProgress, compress: true, generateThumbnail: true });
}

/**
 * Upload a document (PDF, DOC, etc.)
 */
export async function uploadDocument(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return uploadImage(file, 'document', { onProgress, compress: false, generateThumbnail: false });
}

/**
 * Upload a campaign asset
 */
export async function uploadCampaignAsset(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return uploadImage(file, 'campaign', { onProgress, compress: true, generateThumbnail: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// Preview URL Management
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a local preview URL for a file
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a preview URL to free memory
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════
// Export Configuration
// ═══════════════════════════════════════════════════════════════════════════

export { UPLOAD_CONFIGS, ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES };

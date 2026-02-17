import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type ImageType = 'avatar' | 'cover' | 'document' | 'logo' | 'campaign';
type StorageBucket = 'avatars' | 'covers' | 'documents' | 'brand-logos' | 'campaign-assets';

interface UploadConfig {
  bucket: StorageBucket;
  maxSizeMB: number;
  allowedTypes: string[];
  maxWidth?: number;
  maxHeight?: number;
  thumbnailSize?: number;
  quality?: number;
}

interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
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
    maxWidth: 800,
    maxHeight: 800,
    thumbnailSize: 150,
    quality: 85,
  },
  cover: {
    bucket: 'covers',
    maxSizeMB: 5,
    allowedTypes: ALLOWED_IMAGE_TYPES,
    maxWidth: 1920,
    maxHeight: 1080,
    thumbnailSize: 400,
    quality: 85,
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
    maxWidth: 500,
    maxHeight: 500,
    thumbnailSize: 100,
    quality: 90,
  },
  campaign: {
    bucket: 'campaign-assets',
    maxSizeMB: 10,
    allowedTypes: ALLOWED_IMAGE_TYPES,
    maxWidth: 2000,
    maxHeight: 2000,
    thumbnailSize: 300,
    quality: 85,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Image Processing Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if sharp is available for image processing
 * Sharp provides better quality and WebP conversion
 */
async function isSharpAvailable(): Promise<boolean> {
  try {
    await import('sharp');
    return true;
  } catch {
    return false;
  }
}

/**
 * Process image with sharp (if available)
 * - Resize to max dimensions
 * - Convert to WebP for optimization
 * - Maintain aspect ratio
 */
async function processImageWithSharp(
  buffer: Buffer,
  config: UploadConfig
): Promise<ProcessedImage> {
  const sharp = (await import('sharp')).default;

  let image = sharp(buffer);
  const metadata = await image.metadata();

  // Resize if needed (maintain aspect ratio)
  if (config.maxWidth || config.maxHeight) {
    image = image.resize({
      width: config.maxWidth,
      height: config.maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Convert to WebP for better compression
  const processed = await image
    .webp({ quality: config.quality || 85 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: processed.data,
    width: processed.info.width,
    height: processed.info.height,
    format: 'webp',
  };
}

/**
 * Create thumbnail with sharp
 */
async function createThumbnailWithSharp(
  buffer: Buffer,
  size: number
): Promise<Buffer> {
  const sharp = (await import('sharp')).default;

  return sharp(buffer)
    .resize(size, size, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * Fallback: Process image without sharp
 * Just validates and passes through the original buffer
 */
function processImageFallback(
  buffer: Buffer,
  originalFormat: string
): ProcessedImage {
  // Without sharp, we can't resize or convert
  // Just return the original buffer with metadata
  return {
    buffer,
    width: 0, // Unknown without processing
    height: 0,
    format: originalFormat.split('/')[1] || 'unknown',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Validation Functions
// ═══════════════════════════════════════════════════════════════════════════

function validateFileSize(size: number, maxSizeMB: number): { valid: boolean; error?: string } {
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (size > maxBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }
  return { valid: true };
}

function validateFileType(type: string, allowedTypes: string[]): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(type)) {
    return {
      valid: false,
      error: `File type "${type}" not allowed`,
    };
  }
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// File Path Generation
// ═══════════════════════════════════════════════════════════════════════════

function generateFilePath(userId: string, extension: string, prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const filename = `${timestamp}-${random}.${extension}`;

  if (prefix) {
    return `${userId}/${prefix}/${filename}`;
  }

  return `${userId}/${filename}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// API Route Handler
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client and verify auth
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const imageType = formData.get('type') as ImageType | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!imageType || !UPLOAD_CONFIGS[imageType]) {
      return NextResponse.json(
        { error: 'Invalid image type' },
        { status: 400 }
      );
    }

    const config = UPLOAD_CONFIGS[imageType];

    // Validate file size
    const sizeValidation = validateFileSize(file.size, config.maxSizeMB);
    if (!sizeValidation.valid) {
      return NextResponse.json(
        { error: sizeValidation.error },
        { status: 400 }
      );
    }

    // Validate file type
    const typeValidation = validateFileType(file.type, config.allowedTypes);
    if (!typeValidation.valid) {
      return NextResponse.json(
        { error: typeValidation.error },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Check if we can use sharp for processing
    const useSharp = await isSharpAvailable();
    const isImage = file.type.startsWith('image/');

    let processedImage: ProcessedImage;
    let thumbnailBuffer: Buffer | null = null;

    if (isImage && useSharp) {
      // Process with sharp (resize, convert to WebP)
      processedImage = await processImageWithSharp(buffer, config);

      // Create thumbnail if configured
      if (config.thumbnailSize) {
        thumbnailBuffer = await createThumbnailWithSharp(buffer, config.thumbnailSize);
      }
    } else if (isImage) {
      // Fallback without sharp
      processedImage = processImageFallback(buffer, file.type);
      console.warn('Sharp not available. Install sharp for better image processing: npm install sharp');
    } else {
      // Non-image files (documents)
      processedImage = {
        buffer,
        width: 0,
        height: 0,
        format: file.name.split('.').pop() || 'bin',
      };
    }

    // Determine file extension
    const extension = isImage && useSharp ? 'webp' : (file.name.split('.').pop() || 'bin');

    // Generate file path
    const filePath = generateFilePath(user.id, extension, imageType);

    // Upload processed image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(config.bucket)
      .upload(filePath, processedImage.buffer, {
        contentType: isImage && useSharp ? 'image/webp' : file.type,
        cacheControl: '31536000', // 1 year
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(config.bucket)
      .getPublicUrl(uploadData.path);

    // Upload thumbnail if available
    let thumbnailUrl: string | undefined;
    if (thumbnailBuffer) {
      const thumbPath = filePath.replace(/\.[^.]+$/, '-thumb.webp');
      const { data: thumbData, error: thumbError } = await supabase.storage
        .from(config.bucket)
        .upload(thumbPath, thumbnailBuffer, {
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: true,
        });

      if (!thumbError && thumbData) {
        const { data: { publicUrl: thumbUrl } } = supabase.storage
          .from(config.bucket)
          .getPublicUrl(thumbData.path);
        thumbnailUrl = thumbUrl;
      }
    }

    // Return result
    return NextResponse.json({
      originalUrl: publicUrl,
      webpUrl: isImage && useSharp ? publicUrl : undefined,
      thumbnailUrl,
      width: processedImage.width,
      height: processedImage.height,
      format: processedImage.format,
      path: uploadData.path,
      optimized: useSharp && isImage,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE Handler - Remove uploaded files
// ═══════════════════════════════════════════════════════════════════════════

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const bucket = searchParams.get('bucket') as StorageBucket | null;

    if (!path || !bucket) {
      return NextResponse.json(
        { error: 'Path and bucket are required' },
        { status: 400 }
      );
    }

    // Verify the file belongs to the user
    if (!path.startsWith(user.id)) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this file' },
        { status: 403 }
      );
    }

    // Delete the file and potential thumbnail
    const thumbnailPath = path.replace(/\.[^.]+$/, '-thumb.webp');
    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([path, thumbnailPath]);

    if (deleteError) {
      return NextResponse.json(
        { error: `Delete failed: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET Handler - Get upload configuration
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageType = searchParams.get('type') as ImageType | null;

  if (imageType && UPLOAD_CONFIGS[imageType]) {
    const config = UPLOAD_CONFIGS[imageType];
    return NextResponse.json({
      maxSizeMB: config.maxSizeMB,
      allowedTypes: config.allowedTypes,
      maxWidth: config.maxWidth,
      maxHeight: config.maxHeight,
    });
  }

  // Return all configs
  const configs = Object.entries(UPLOAD_CONFIGS).reduce((acc, [key, config]) => {
    acc[key] = {
      maxSizeMB: config.maxSizeMB,
      allowedTypes: config.allowedTypes,
      maxWidth: config.maxWidth,
      maxHeight: config.maxHeight,
    };
    return acc;
  }, {} as Record<string, unknown>);

  return NextResponse.json(configs);
}

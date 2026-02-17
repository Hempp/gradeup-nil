'use client';

import { useState, useCallback, useRef, useEffect, forwardRef } from 'react';
import {
  Upload,
  X,
  Loader2,
  AlertCircle,
  Check,
  Image as ImageIcon,
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import {
  uploadImage,
  uploadImageWithProgress,
  validateForUpload,
  compressImage,
  cropImage,
  createPreviewUrl,
  revokePreviewUrl,
  type ImageType,
  type UploadResult,
} from '@/lib/services/storage';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageUploadProps {
  /** Type of image being uploaded (avatar, cover, logo, etc.) */
  imageType: ImageType;
  /** Current image URL if editing existing */
  currentUrl?: string | null;
  /** Callback when upload succeeds */
  onUpload?: (result: UploadResult) => void;
  /** Callback when image is removed */
  onRemove?: () => void;
  /** Callback when validation or upload fails */
  onError?: (error: string) => void;
  /** Whether the upload is disabled */
  disabled?: boolean;
  /** Custom placeholder text */
  placeholder?: string;
  /** Custom hint text */
  hint?: string;
  /** Enable cropping interface */
  enableCropping?: boolean;
  /** Aspect ratio for cropping (e.g., 1 for square, 16/9 for widescreen) */
  cropAspectRatio?: number;
  /** Maximum file size display */
  maxSizeMB?: number;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Shape variant */
  shape?: 'square' | 'rounded' | 'circle';
  /** Show file info after selection */
  showFileInfo?: boolean;
}

type UploadState = 'idle' | 'previewing' | 'cropping' | 'uploading' | 'success' | 'error';

// ═══════════════════════════════════════════════════════════════════════════
// Size Configuration
// ═══════════════════════════════════════════════════════════════════════════

const sizeConfig = {
  sm: {
    container: 'w-32 h-32',
    dropzone: 'min-h-[8rem]',
    icon: 'h-6 w-6',
    text: 'text-xs',
  },
  md: {
    container: 'w-48 h-48',
    dropzone: 'min-h-[12rem]',
    icon: 'h-8 w-8',
    text: 'text-sm',
  },
  lg: {
    container: 'w-64 h-64',
    dropzone: 'min-h-[16rem]',
    icon: 'h-10 w-10',
    text: 'text-base',
  },
};

const shapeConfig = {
  square: 'rounded-lg',
  rounded: 'rounded-2xl',
  circle: 'rounded-full',
};

// ═══════════════════════════════════════════════════════════════════════════
// Cropping Component
// ═══════════════════════════════════════════════════════════════════════════

interface CropperProps {
  imageUrl: string;
  aspectRatio?: number;
  onCrop: (cropArea: CropArea) => void;
  onCancel: () => void;
}

function ImageCropper({ imageUrl, aspectRatio, onCrop, onCancel }: CropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Load image and set dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Handle mouse/touch drag
  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle zoom
  const handleZoomIn = () => setScale((s) => Math.min(s + 0.1, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.1, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Calculate crop area based on visible region
  const handleCrop = () => {
    const container = containerRef.current;
    if (!container || imageDimensions.width === 0) return;

    const containerRect = container.getBoundingClientRect();
    const cropSize = Math.min(containerRect.width, containerRect.height) * 0.8;

    // Calculate the crop area in image coordinates
    const imageScale = scale;
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    // Image position relative to container center
    const imageX = centerX + position.x;
    const imageY = centerY + position.y;

    // Crop box position (centered in container)
    const cropX = centerX - cropSize / 2;
    const cropY = centerY - cropSize / 2;

    // Calculate crop coordinates in original image space
    const displayedWidth = imageDimensions.width * imageScale;
    const displayedHeight = imageDimensions.height * imageScale;

    const imageLeft = imageX - displayedWidth / 2;
    const imageTop = imageY - displayedHeight / 2;

    const cropArea: CropArea = {
      x: Math.max(0, (cropX - imageLeft) / imageScale),
      y: Math.max(0, (cropY - imageTop) / imageScale),
      width: Math.min(imageDimensions.width, cropSize / imageScale),
      height: aspectRatio
        ? Math.min(imageDimensions.height, (cropSize / imageScale) / aspectRatio)
        : Math.min(imageDimensions.height, cropSize / imageScale),
    };

    onCrop(cropArea);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Crop preview area */}
      <div
        ref={containerRef}
        className="relative w-full h-64 bg-black/90 rounded-lg overflow-hidden cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Image */}
        <div
          className="absolute top-1/2 left-1/2 transition-transform duration-75"
          style={{
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Crop preview"
            className="max-w-none"
            draggable={false}
          />
        </div>

        {/* Crop overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Dark overlay outside crop area */}
          <div className="absolute inset-0 bg-black/50" />
          {/* Crop box cutout */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-white bg-transparent"
            style={{
              width: '80%',
              paddingBottom: aspectRatio ? `${80 / aspectRatio}%` : '80%',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            }}
          />
        </div>

        {/* Grid lines */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ width: '80%', height: aspectRatio ? `${80 / aspectRatio}%` : '80%' }}
        >
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-[var(--text-muted)] w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={scale >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleCrop}
          >
            <Crop className="h-4 w-4 mr-1" />
            Apply Crop
          </Button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export const ImageUpload = forwardRef<HTMLDivElement, ImageUploadProps>(
  function ImageUpload(
    {
      imageType,
      currentUrl,
      onUpload,
      onRemove,
      onError,
      disabled = false,
      placeholder = 'Drag and drop or click to upload',
      hint,
      enableCropping = false,
      cropAspectRatio,
      maxSizeMB,
      className,
      size = 'md',
      shape = 'rounded',
      showFileInfo = true,
    },
    ref
  ) {
    const [state, setState] = useState<UploadState>('idle');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [fileInfo, setFileInfo] = useState<{ name: string; size: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const sizeClasses = sizeConfig[size];
    const shapeClass = shapeConfig[shape];

    // Cleanup preview URLs on unmount
    useEffect(() => {
      return () => {
        if (previewUrl) {
          revokePreviewUrl(previewUrl);
        }
      };
    }, [previewUrl]);

    // Handle file selection
    const handleFileSelect = useCallback(
      async (file: File) => {
        setError(null);

        // Validate file
        const validation = await validateForUpload(file, imageType);
        if (!validation.valid) {
          setError(validation.error || 'Invalid file');
          setState('error');
          onError?.(validation.error || 'Invalid file');
          return;
        }

        // Set file info
        setFileInfo({
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        });

        // Compress image before preview
        let processedFile = file;
        if (file.type.startsWith('image/')) {
          processedFile = await compressImage(file, 1200, 0.85);
        }

        // Create preview
        const preview = createPreviewUrl(processedFile);
        setPreviewUrl(preview);
        setPendingFile(processedFile);

        if (enableCropping) {
          setState('cropping');
        } else {
          setState('previewing');
        }
      },
      [imageType, enableCropping, onError]
    );

    // Handle input change
    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          handleFileSelect(file);
        }
        e.target.value = '';
      },
      [handleFileSelect]
    );

    // Drag and drop handlers
    const handleDragEnter = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
          setIsDragging(true);
        }
      },
      [disabled]
    );

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (disabled) return;

        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
          handleFileSelect(file);
        } else {
          setError('Please drop an image file');
          setState('error');
          onError?.('Please drop an image file');
        }
      },
      [disabled, handleFileSelect, onError]
    );

    // Handle crop completion
    const handleCropComplete = useCallback(
      async (cropArea: CropArea) => {
        if (!pendingFile) return;

        const croppedFile = await cropImage(pendingFile, cropArea);
        if (croppedFile) {
          // Update preview with cropped image
          if (previewUrl) {
            revokePreviewUrl(previewUrl);
          }
          const newPreview = createPreviewUrl(croppedFile);
          setPreviewUrl(newPreview);
          setPendingFile(croppedFile);
        }
        setState('previewing');
      },
      [pendingFile, previewUrl]
    );

    // Confirm upload
    const handleConfirmUpload = useCallback(async () => {
      if (!pendingFile) return;

      setState('uploading');
      setProgress(0);

      const result = await uploadImageWithProgress(pendingFile, imageType, (p) => {
        setProgress(p);
      });

      if (result.error) {
        setError(result.error.message);
        setState('error');
        onError?.(result.error.message);
      } else {
        setState('success');
        onUpload?.(result);

        // Reset after success
        setTimeout(() => {
          if (previewUrl) {
            revokePreviewUrl(previewUrl);
          }
          setPreviewUrl(null);
          setPendingFile(null);
          setFileInfo(null);
          setState('idle');
        }, 1500);
      }
    }, [pendingFile, imageType, onUpload, onError, previewUrl]);

    // Cancel preview
    const handleCancel = useCallback(() => {
      if (previewUrl) {
        revokePreviewUrl(previewUrl);
      }
      setPreviewUrl(null);
      setPendingFile(null);
      setError(null);
      setFileInfo(null);
      setState('idle');
    }, [previewUrl]);

    // Remove current image
    const handleRemove = useCallback(() => {
      onRemove?.();
    }, [onRemove]);

    // Trigger file input
    const triggerFileInput = useCallback(() => {
      if (!disabled && state === 'idle') {
        fileInputRef.current?.click();
      }
    }, [disabled, state]);

    // Display URL
    const displayUrl = previewUrl || currentUrl;

    return (
      <div ref={ref} className={cn('flex flex-col gap-3', className)}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
          aria-label={`Upload ${imageType}`}
        />

        {/* Cropping interface */}
        {state === 'cropping' && previewUrl && (
          <ImageCropper
            imageUrl={previewUrl}
            aspectRatio={cropAspectRatio}
            onCrop={handleCropComplete}
            onCancel={handleCancel}
          />
        )}

        {/* Main upload area */}
        {state !== 'cropping' && (
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={state === 'idle' ? triggerFileInput : undefined}
            className={cn(
              'relative border-2 border-dashed transition-all duration-200 overflow-hidden',
              sizeClasses.dropzone,
              shapeClass,
              isDragging && 'border-[var(--color-primary)] bg-[var(--color-primary)]/5',
              state === 'error' && 'border-[var(--color-error)]',
              state === 'success' && 'border-[var(--color-success)]',
              state === 'idle' && !isDragging && 'border-[var(--border-color)] hover:border-[var(--color-primary)] cursor-pointer',
              state !== 'idle' && 'cursor-default',
              disabled && 'opacity-50 cursor-not-allowed',
              displayUrl && 'border-solid'
            )}
            role="button"
            tabIndex={disabled || state !== 'idle' ? -1 : 0}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && state === 'idle') {
                e.preventDefault();
                triggerFileInput();
              }
            }}
            aria-label={placeholder}
          >
            {/* Image preview */}
            {displayUrl && state !== 'error' && (
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayUrl}
                  alt="Preview"
                  className={cn(
                    'w-full h-full object-cover',
                    state === 'uploading' && 'opacity-50'
                  )}
                />
              </div>
            )}

            {/* Idle state (no image) */}
            {state === 'idle' && !displayUrl && (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <div className={cn(
                  'p-3 rounded-full bg-[var(--bg-tertiary)] mb-3',
                  isDragging && 'bg-[var(--color-primary)]/10'
                )}>
                  {isDragging ? (
                    <Upload className={cn(sizeClasses.icon, 'text-[var(--color-primary)]')} />
                  ) : (
                    <ImageIcon className={cn(sizeClasses.icon, 'text-[var(--text-muted)]')} />
                  )}
                </div>
                <p className={cn(sizeClasses.text, 'font-medium text-[var(--text-primary)]')}>
                  {isDragging ? 'Drop image here' : placeholder}
                </p>
                {hint && (
                  <p className={cn('mt-1 text-[var(--text-muted)]', size === 'sm' ? 'text-xs' : 'text-sm')}>
                    {hint}
                  </p>
                )}
                {maxSizeMB && (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Max size: {maxSizeMB}MB
                  </p>
                )}
              </div>
            )}

            {/* Idle state with existing image - hover overlay */}
            {state === 'idle' && displayUrl && (
              <div className={cn(
                'absolute inset-0 bg-black/50 opacity-0 hover:opacity-100',
                'flex flex-col items-center justify-center transition-opacity'
              )}>
                <Upload className={cn(sizeClasses.icon, 'text-white mb-2')} />
                <span className={cn(sizeClasses.text, 'text-white')}>Change image</span>
              </div>
            )}

            {/* Uploading state */}
            {state === 'uploading' && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                <Loader2 className={cn(sizeClasses.icon, 'text-white animate-spin mb-2')} />
                <span className="text-white font-medium">{progress}%</span>
                <div className="mt-2 w-2/3 h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Success state */}
            {state === 'success' && (
              <div className="absolute inset-0 bg-[var(--color-success)]/80 flex items-center justify-center">
                <Check className={cn(sizeClasses.icon, 'text-white')} />
              </div>
            )}

            {/* Error state */}
            {state === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[var(--color-error)]/10">
                <AlertCircle className={cn(sizeClasses.icon, 'text-[var(--color-error)] mb-2')} />
                <p className={cn(sizeClasses.text, 'text-[var(--color-error)] font-medium')}>
                  Upload failed
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)] max-w-[80%]">{error}</p>
              </div>
            )}

            {/* Remove button */}
            {state === 'idle' && currentUrl && onRemove && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className={cn(
                  'absolute top-2 right-2 p-1.5 rounded-full',
                  'bg-[var(--color-error)] text-white shadow-lg',
                  'hover:bg-[var(--color-error-hover)] transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--color-error)] focus:ring-offset-2'
                )}
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Preview actions */}
        {state === 'previewing' && (
          <div className="flex items-center justify-between">
            {showFileInfo && fileInfo && (
              <div className="text-sm text-[var(--text-muted)]">
                <span className="font-medium truncate max-w-[150px] inline-block align-bottom">
                  {fileInfo.name}
                </span>
                <span className="ml-2">({fileInfo.size})</span>
              </div>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {enableCropping && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setState('cropping')}
                >
                  <Crop className="h-4 w-4 mr-1" />
                  Crop
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleConfirmUpload}
              >
                <Check className="h-4 w-4 mr-1" />
                Upload
              </Button>
            </div>
          </div>
        )}

        {/* Error retry */}
        {state === 'error' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="w-full"
          >
            Try Again
          </Button>
        )}
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Preset Components
// ═══════════════════════════════════════════════════════════════════════════

export type PresetImageUploadProps = Omit<ImageUploadProps, 'imageType'>;

/**
 * Avatar upload component with circular shape and cropping
 */
export function AvatarImageUpload(props: PresetImageUploadProps) {
  return (
    <ImageUpload
      {...props}
      imageType="avatar"
      shape="circle"
      size={props.size || 'md'}
      enableCropping={props.enableCropping ?? true}
      cropAspectRatio={1}
      placeholder="Upload avatar"
      hint="JPG, PNG, or WebP. Max 2MB."
      maxSizeMB={2}
    />
  );
}

/**
 * Cover image upload component with wide aspect ratio
 */
export function CoverImageUpload(props: PresetImageUploadProps) {
  return (
    <ImageUpload
      {...props}
      imageType="cover"
      shape="rounded"
      size={props.size || 'lg'}
      enableCropping={props.enableCropping ?? true}
      cropAspectRatio={16 / 9}
      placeholder="Upload cover image"
      hint="Recommended: 1920x1080. Max 5MB."
      maxSizeMB={5}
    />
  );
}

/**
 * Logo upload component
 */
export function LogoImageUpload(props: PresetImageUploadProps) {
  return (
    <ImageUpload
      {...props}
      imageType="logo"
      shape="rounded"
      size={props.size || 'sm'}
      enableCropping={props.enableCropping ?? true}
      cropAspectRatio={1}
      placeholder="Upload logo"
      hint="Square logo recommended. Max 2MB."
      maxSizeMB={2}
    />
  );
}

/**
 * Document upload component (supports PDF, DOC, images)
 */
export function DocumentImageUpload(props: PresetImageUploadProps) {
  return (
    <ImageUpload
      {...props}
      imageType="document"
      shape="rounded"
      size={props.size || 'md'}
      enableCropping={false}
      placeholder="Upload document"
      hint="PDF, DOC, DOCX, or images. Max 10MB."
      maxSizeMB={10}
    />
  );
}

export default ImageUpload;

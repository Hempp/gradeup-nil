'use client';

import { useState, useCallback, useRef, forwardRef } from 'react';
import { Camera, Upload, X, Loader2, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from './avatar';
import { Button } from './button';
import {
  uploadAvatar,
  uploadBrandLogo,
  validateFile,
  compressImage,
  getFilePreviewUrl,
  revokeFilePreviewUrl,
  type UploadResult,
} from '@/lib/utils/upload';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type AvatarUploadVariant = 'avatar' | 'logo';

export interface AvatarUploadProps {
  variant?: AvatarUploadVariant;
  currentUrl?: string | null;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onUpload?: (result: UploadResult) => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}

type UploadState = 'idle' | 'previewing' | 'uploading' | 'success' | 'error';

// ═══════════════════════════════════════════════════════════════════════════
// Size Mappings
// ═══════════════════════════════════════════════════════════════════════════

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-20 w-20',
  lg: 'h-24 w-24',
  xl: 'h-32 w-32',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
};

const buttonPositions = {
  sm: '-bottom-1 -right-1',
  md: '-bottom-1 -right-1',
  lg: '-bottom-2 -right-2',
  xl: '-bottom-2 -right-2',
};

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export const AvatarUpload = forwardRef<HTMLDivElement, AvatarUploadProps>(
  function AvatarUpload(
    {
      variant = 'avatar',
      currentUrl,
      fallback = 'U',
      size = 'lg',
      onUpload,
      onRemove,
      disabled = false,
      className,
    },
    ref
  ) {
    const [state, setState] = useState<UploadState>('idle');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const pendingFileRef = useRef<File | null>(null);

    // Display URL (preview takes priority over current)
    const displayUrl = previewUrl || currentUrl;

    // Handle file selection
    const handleFileSelect = useCallback(async (file: File) => {
      setError(null);

      // Validate file
      const validation = await validateFile(file, {
        bucket: variant === 'avatar' ? 'avatars' : 'brand-logos',
      });

      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        setState('error');
        return;
      }

      // Compress image
      const compressed = await compressImage(file, 800, 0.85);

      // Create preview
      const preview = getFilePreviewUrl(compressed);
      setPreviewUrl(preview);
      pendingFileRef.current = compressed;
      setState('previewing');
    }, [variant]);

    // Handle input change
    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          handleFileSelect(file);
        }
        // Reset input for re-selection
        e.target.value = '';
      },
      [handleFileSelect]
    );

    // Handle drag events
    const handleDragEnter = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    }, [disabled]);

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
        }
      },
      [disabled, handleFileSelect]
    );

    // Confirm upload
    const handleConfirmUpload = useCallback(async () => {
      const file = pendingFileRef.current;
      if (!file) return;

      setState('uploading');
      setProgress(0);

      const uploadFn = variant === 'avatar' ? uploadAvatar : uploadBrandLogo;
      const result = await uploadFn(file, (p) => setProgress(p));

      if (result.error) {
        setError(result.error.message);
        setState('error');
      } else {
        setState('success');
        onUpload?.(result);

        // Reset after success
        setTimeout(() => {
          if (previewUrl) {
            revokeFilePreviewUrl(previewUrl);
          }
          setPreviewUrl(null);
          pendingFileRef.current = null;
          setState('idle');
        }, 1500);
      }
    }, [variant, onUpload, previewUrl]);

    // Cancel preview
    const handleCancelPreview = useCallback(() => {
      if (previewUrl) {
        revokeFilePreviewUrl(previewUrl);
      }
      setPreviewUrl(null);
      pendingFileRef.current = null;
      setError(null);
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

    return (
      <div ref={ref} className={cn('relative inline-block', className)}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
          aria-label={`Upload ${variant}`}
        />

        {/* Avatar/Logo display with drag zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={cn(
            'relative cursor-pointer rounded-full transition-all duration-200',
            sizeClasses[size],
            isDragging && 'ring-4 ring-[var(--color-primary)] ring-opacity-50',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              triggerFileInput();
            }
          }}
          aria-label={`Click or drag to upload ${variant}`}
        >
          {/* Avatar */}
          <Avatar
            src={displayUrl || undefined}
            fallback={fallback}
            className={cn(
              sizeClasses[size],
              'transition-opacity',
              state === 'uploading' && 'opacity-50'
            )}
          />

          {/* Upload overlay */}
          {state === 'idle' && !disabled && (
            <div
              className={cn(
                'absolute inset-0 rounded-full bg-black/50 opacity-0 hover:opacity-100',
                'flex items-center justify-center transition-opacity'
              )}
            >
              <Camera className={cn('text-white', iconSizes[size])} />
            </div>
          )}

          {/* Uploading spinner */}
          {state === 'uploading' && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <div className="relative">
                <Loader2
                  className={cn('text-white animate-spin', iconSizes[size])}
                />
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-white font-medium">
                  {progress}%
                </span>
              </div>
            </div>
          )}

          {/* Success indicator */}
          {state === 'success' && (
            <div className="absolute inset-0 rounded-full bg-[var(--color-success)]/80 flex items-center justify-center">
              <Check className={cn('text-white', iconSizes[size])} />
            </div>
          )}

          {/* Error indicator */}
          {state === 'error' && (
            <div className="absolute inset-0 rounded-full bg-[var(--color-error)]/80 flex items-center justify-center">
              <AlertCircle className={cn('text-white', iconSizes[size])} />
            </div>
          )}

          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 rounded-full bg-[var(--color-primary)]/80 flex items-center justify-center">
              <Upload className={cn('text-white', iconSizes[size])} />
            </div>
          )}
        </div>

        {/* Camera button (alternative trigger) */}
        {state === 'idle' && !disabled && (
          <button
            type="button"
            onClick={triggerFileInput}
            className={cn(
              'absolute rounded-full p-1.5',
              'bg-[var(--color-primary)] text-white shadow-lg',
              'hover:bg-[var(--color-primary-hover)] transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2',
              buttonPositions[size]
            )}
            aria-label={`Upload new ${variant}`}
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Preview actions */}
        {state === 'previewing' && (
          <div className={cn('absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-2')}>
            <Button
              size="sm"
              variant="primary"
              onClick={handleConfirmUpload}
              className="h-8 text-xs"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelPreview}
              className="h-8 text-xs"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <p className="text-xs text-[var(--color-error)] flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
            <button
              type="button"
              onClick={handleCancelPreview}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline mt-1"
            >
              Try again
            </button>
          </div>
        )}

        {/* Remove button (when there's an existing image) */}
        {state === 'idle' && currentUrl && onRemove && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            className={cn(
              'absolute top-0 right-0 rounded-full p-1',
              'bg-[var(--color-error)] text-white shadow-lg',
              'hover:bg-[var(--color-error-hover)] transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-error)] focus:ring-offset-2'
            )}
            aria-label={`Remove ${variant}`}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Document Upload Component (for contracts, etc.)
// ═══════════════════════════════════════════════════════════════════════════

export interface DocumentUploadProps {
  accept?: string;
  maxSizeMB?: number;
  onUpload?: (result: UploadResult) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  hint?: string;
}

export function DocumentUpload({
  accept = '.pdf,.doc,.docx,.txt',
  maxSizeMB = 10,
  onUpload,
  disabled = false,
  className,
  label = 'Upload Document',
  hint = 'PDF, DOC, DOCX, or TXT up to 10MB',
}: DocumentUploadProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    setState('uploading');
    setProgress(0);

    // Validate
    const validation = await validateFile(file, {
      bucket: 'documents',
      maxSizeMB,
    });

    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      setState('error');
      return;
    }

    // Upload
    const { uploadDocument } = await import('@/lib/utils/upload');
    const result = await uploadDocument(file, (p) => setProgress(p));

    if (result.error) {
      setError(result.error.message);
      setState('error');
    } else {
      setState('success');
      onUpload?.(result);

      setTimeout(() => {
        setState('idle');
        setFileName(null);
      }, 2000);
    }
  }, [maxSizeMB, onUpload]);

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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [disabled, handleFileSelect]
  );

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
        isDragging && 'border-[var(--color-primary)] bg-[var(--color-primary)]/5',
        state === 'error' && 'border-[var(--color-error)]',
        state === 'success' && 'border-[var(--color-success)]',
        !isDragging && state === 'idle' && 'border-[var(--border-color)] hover:border-[var(--color-primary)]',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {state === 'idle' && (
        <>
          <Upload className="h-8 w-8 mx-auto text-[var(--text-muted)] mb-3" />
          <p className="font-medium text-[var(--text-primary)] mb-1">{label}</p>
          <p className="text-sm text-[var(--text-muted)] mb-3">{hint}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            Choose File
          </Button>
        </>
      )}

      {state === 'uploading' && (
        <>
          <Loader2 className="h-8 w-8 mx-auto text-[var(--color-primary)] animate-spin mb-3" />
          <p className="font-medium text-[var(--text-primary)] mb-1">Uploading...</p>
          <p className="text-sm text-[var(--text-muted)]">{fileName}</p>
          <div className="mt-3 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden max-w-xs mx-auto">
            <div
              className="h-full bg-[var(--color-primary)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}

      {state === 'success' && (
        <>
          <Check className="h-8 w-8 mx-auto text-[var(--color-success)] mb-3" />
          <p className="font-medium text-[var(--color-success)] mb-1">Upload Complete</p>
          <p className="text-sm text-[var(--text-muted)]">{fileName}</p>
        </>
      )}

      {state === 'error' && (
        <>
          <AlertCircle className="h-8 w-8 mx-auto text-[var(--color-error)] mb-3" />
          <p className="font-medium text-[var(--color-error)] mb-1">Upload Failed</p>
          <p className="text-sm text-[var(--text-muted)] mb-3">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setState('idle');
              setError(null);
              setFileName(null);
            }}
          >
            Try Again
          </Button>
        </>
      )}
    </div>
  );
}

'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  createElement,
  type DragEvent,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';
import {
  Upload,
  X,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  FileCode,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   FILE UPLOAD TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export type FileUploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadedFile {
  /** Unique ID for this file */
  id: string;
  /** Original file object */
  file: File;
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  type: string;
  /** Preview URL (for images) */
  preview?: string;
  /** Upload progress (0-100) */
  progress: number;
  /** Upload status */
  status: FileUploadStatus;
  /** Error message if failed */
  error?: string;
}

export interface FileValidation {
  /** Whether the file is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
}

export interface FileUploadDropzoneProps {
  /** Accepted file types (e.g., "image/*", ".pdf,.doc") */
  accept?: string;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum number of files */
  maxFiles?: number;
  /** Whether multiple files can be uploaded */
  multiple?: boolean;
  /** Whether the dropzone is disabled */
  disabled?: boolean;
  /** Callback when files are selected/dropped */
  onFilesSelected?: (files: File[]) => void;
  /** Callback when a file is removed */
  onFileRemove?: (file: UploadedFile) => void;
  /** Upload handler - receives file, returns upload progress callback */
  onUpload?: (file: File, onProgress: (progress: number) => void) => Promise<string | void>;
  /** Custom file validator */
  validateFile?: (file: File) => FileValidation;
  /** Current uploaded files (controlled) */
  files?: UploadedFile[];
  /** Callback when files change (controlled) */
  onFilesChange?: (files: UploadedFile[]) => void;
  /** Custom dropzone content */
  children?: ReactNode;
  /** Additional class names */
  className?: string;
  /** Show file previews */
  showPreviews?: boolean;
  /** Compact mode (smaller dropzone) */
  compact?: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILE UTILITIES
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Format file size in human-readable format.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Generate unique file ID.
 */
function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get file extension.
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

/**
 * Get appropriate icon for file type.
 */
function getFileIcon(mimeType: string, extension: string) {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (mimeType.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(extension)) {
    return FileSpreadsheet;
  }
  if (mimeType.includes('pdf') || ['pdf', 'doc', 'docx', 'txt'].includes(extension)) {
    return FileText;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'rb'].includes(extension)) {
    return FileCode;
  }
  return File;
}

/**
 * Check if file type matches accept pattern.
 */
function isFileTypeAccepted(file: File, accept: string): boolean {
  if (!accept) return true;

  const acceptedTypes = accept.split(',').map((t) => t.trim().toLowerCase());
  const mimeType = file.type.toLowerCase();
  const extension = `.${getFileExtension(file.name)}`;

  return acceptedTypes.some((accepted) => {
    // Wildcard MIME type (e.g., "image/*")
    if (accepted.endsWith('/*')) {
      const category = accepted.replace('/*', '');
      return mimeType.startsWith(`${category}/`);
    }
    // Specific MIME type
    if (accepted.includes('/')) {
      return mimeType === accepted;
    }
    // File extension
    return extension === accepted;
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILE UPLOAD DROPZONE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Drag-and-drop file upload component with preview and progress.
 *
 * @example
 * // Basic usage
 * <FileUploadDropzone
 *   accept="image/*"
 *   maxSize={5 * 1024 * 1024} // 5MB
 *   onFilesSelected={(files) => uploadFiles(files)}
 * />
 *
 * @example
 * // With upload handler
 * <FileUploadDropzone
 *   accept=".pdf,.doc,.docx"
 *   maxFiles={5}
 *   multiple
 *   onUpload={async (file, onProgress) => {
 *     const url = await uploadToStorage(file, onProgress);
 *     return url;
 *   }}
 * />
 */
export const FileUploadDropzone = forwardRef<HTMLDivElement, FileUploadDropzoneProps>(
  function FileUploadDropzone(
    {
      accept,
      maxSize = 10 * 1024 * 1024, // 10MB default
      maxFiles = 10,
      multiple = false,
      disabled = false,
      onFilesSelected,
      onFileRemove,
      onUpload,
      validateFile,
      files: controlledFiles,
      onFilesChange,
      children,
      className,
      showPreviews = true,
      compact = false,
    },
    ref
  ) {
    const [internalFiles, setInternalFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragCounter, setDragCounter] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Controlled vs uncontrolled files
    const files = controlledFiles ?? internalFiles;
    const isControlled = controlledFiles !== undefined;

    // Helper to update files (handles both controlled and uncontrolled)
    const updateFiles = useCallback(
      (updater: (prev: UploadedFile[]) => UploadedFile[]) => {
        if (isControlled) {
          onFilesChange?.(updater(controlledFiles ?? []));
        } else {
          setInternalFiles(updater);
        }
      },
      [isControlled, onFilesChange, controlledFiles]
    );

    // Cleanup previews on unmount
    useEffect(() => {
      return () => {
        files.forEach((f) => {
          if (f.preview) URL.revokeObjectURL(f.preview);
        });
      };
    }, [files]);

    // Validate a single file
    const validateSingleFile = useCallback(
      (file: File): FileValidation => {
        // Custom validator
        if (validateFile) {
          const result = validateFile(file);
          if (!result.valid) return result;
        }

        // File type check
        if (accept && !isFileTypeAccepted(file, accept)) {
          return { valid: false, error: 'File type not accepted' };
        }

        // File size check
        if (maxSize && file.size > maxSize) {
          return {
            valid: false,
            error: `File too large (max ${formatFileSize(maxSize)})`,
          };
        }

        return { valid: true };
      },
      [accept, maxSize, validateFile]
    );

    // Process new files
    const processFiles = useCallback(
      async (newFiles: File[]) => {
        // Check max files limit
        const remainingSlots = maxFiles - files.length;
        const filesToProcess = newFiles.slice(0, remainingSlots);

        if (filesToProcess.length === 0) return;

        // Create uploaded file objects
        const uploadedFiles: UploadedFile[] = await Promise.all(
          filesToProcess.map(async (file) => {
            const validation = validateSingleFile(file);
            let preview: string | undefined;

            // Generate preview for images
            if (file.type.startsWith('image/')) {
              preview = URL.createObjectURL(file);
            }

            return {
              id: generateFileId(),
              file,
              name: file.name,
              size: file.size,
              type: file.type,
              preview,
              progress: 0,
              status: validation.valid ? ('idle' as const) : ('error' as const),
              error: validation.error,
            };
          })
        );

        // Update files state
        updateFiles((prev) => [...prev, ...uploadedFiles]);

        // Notify parent
        onFilesSelected?.(filesToProcess);

        // Auto-upload if handler provided
        if (onUpload) {
          for (const uploadedFile of uploadedFiles) {
            if (uploadedFile.status === 'error') continue;

            // Update status to uploading
            updateFiles((prev) =>
              prev.map((f) =>
                f.id === uploadedFile.id ? { ...f, status: 'uploading' as const } : f
              )
            );

            try {
              await onUpload(uploadedFile.file, (progress) => {
                updateFiles((prev) =>
                  prev.map((f) => (f.id === uploadedFile.id ? { ...f, progress } : f))
                );
              });

              // Update status to success
              updateFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadedFile.id
                    ? { ...f, status: 'success' as const, progress: 100 }
                    : f
                )
              );
            } catch (error) {
              // Update status to error
              updateFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadedFile.id
                    ? {
                        ...f,
                        status: 'error' as const,
                        error: error instanceof Error ? error.message : 'Upload failed',
                      }
                    : f
                )
              );
            }
          }
        }
      },
      [files, maxFiles, onFilesSelected, onUpload, updateFiles, validateSingleFile]
    );

    // Handle file input change
    const handleInputChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length > 0) {
          processFiles(selectedFiles);
        }
        // Reset input so same file can be selected again
        e.target.value = '';
      },
      [processFiles]
    );

    // Handle drag enter
    const handleDragEnter = useCallback(
      (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragCounter((c) => c + 1);
        if (e.dataTransfer.types.includes('Files')) {
          setIsDragging(true);
        }
      },
      []
    );

    // Handle drag leave
    const handleDragLeave = useCallback(
      (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragCounter((c) => {
          const newCount = c - 1;
          if (newCount === 0) {
            setIsDragging(false);
          }
          return newCount;
        });
      },
      []
    );

    // Handle drag over
    const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    }, []);

    // Handle drop
    const handleDrop = useCallback(
      (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        setDragCounter(0);

        if (disabled) return;

        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) {
          const filesToAdd = multiple ? droppedFiles : [droppedFiles[0]];
          processFiles(filesToAdd);
        }
      },
      [disabled, multiple, processFiles]
    );

    // Handle click to open file dialog
    const handleClick = useCallback(() => {
      if (!disabled) {
        inputRef.current?.click();
      }
    }, [disabled]);

    // Handle file removal
    const handleRemove = useCallback(
      (fileToRemove: UploadedFile) => {
        // Revoke preview URL
        if (fileToRemove.preview) {
          URL.revokeObjectURL(fileToRemove.preview);
        }

        updateFiles((prev) => prev.filter((f) => f.id !== fileToRemove.id));
        onFileRemove?.(fileToRemove);
      },
      [files, updateFiles, onFileRemove]
    );

    // Handle keyboard
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      },
      [handleClick]
    );

    return (
      <div ref={ref} className={cn('space-y-4', className)}>
        {/* Dropzone */}
        <div
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={`File upload dropzone. ${accept ? `Accepts ${accept}.` : ''} ${
            maxSize ? `Maximum size ${formatFileSize(maxSize)}.` : ''
          }`}
          aria-disabled={disabled}
          className={cn(
            'relative rounded-lg border-2 border-dashed transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            compact ? 'p-4' : 'p-8',
            isDragging && 'border-primary bg-primary/5',
            !isDragging && !disabled && 'border-muted-foreground/25 hover:border-primary/50',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            onChange={handleInputChange}
            className="sr-only"
            aria-hidden="true"
          />

          {/* Content */}
          {children || (
            <div className="flex flex-col items-center justify-center text-center">
              <Upload
                className={cn(
                  'text-muted-foreground',
                  compact ? 'mb-2 h-6 w-6' : 'mb-4 h-10 w-10',
                  isDragging && 'text-primary'
                )}
              />
              <p className={cn('font-medium', compact ? 'text-sm' : 'text-base')}>
                {isDragging ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
                or click to browse
              </p>
              {(accept || maxSize) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {accept && `Accepts: ${accept}`}
                  {accept && maxSize && ' • '}
                  {maxSize && `Max: ${formatFileSize(maxSize)}`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* File previews */}
        {showPreviews && files.length > 0 && (
          <div className="space-y-2">
            {files.map((uploadedFile) => (
              <FilePreviewItem
                key={uploadedFile.id}
                file={uploadedFile}
                onRemove={() => handleRemove(uploadedFile)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

/* ═══════════════════════════════════════════════════════════════════════════
   FILE PREVIEW ITEM
   ═══════════════════════════════════════════════════════════════════════════ */

interface FilePreviewItemProps {
  file: UploadedFile;
  onRemove: () => void;
}

function FilePreviewItem({ file, onRemove }: FilePreviewItemProps) {
  const fileIcon = getFileIcon(file.type, getFileExtension(file.name));
  const isImage = file.type.startsWith('image/');

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3',
        file.status === 'error' && 'border-destructive/50 bg-destructive/5',
        file.status === 'success' && 'border-green-500/50 bg-green-500/5'
      )}
    >
      {/* Preview or icon */}
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
        {isImage && file.preview ? (
          <img
            src={file.preview}
            alt={file.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {createElement(fileIcon, { className: 'h-6 w-6 text-muted-foreground' })}
          </div>
        )}
      </div>

      {/* File info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(file.size)}</span>
          {file.status === 'uploading' && (
            <span className="text-primary">{file.progress}%</span>
          )}
          {file.status === 'error' && (
            <span className="text-destructive">{file.error}</span>
          )}
        </div>

        {/* Progress bar */}
        {file.status === 'uploading' && (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${file.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className="flex-shrink-0">
        {file.status === 'uploading' && (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        )}
        {file.status === 'success' && (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        )}
        {file.status === 'error' && (
          <AlertCircle className="h-5 w-5 text-destructive" />
        )}
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          'flex-shrink-0 rounded-md p-1.5',
          'text-muted-foreground hover:bg-muted hover:text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring'
        )}
        aria-label={`Remove ${file.name}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   IMAGE UPLOAD PREVIEW
   Specialized for image uploads with crop support
   ═══════════════════════════════════════════════════════════════════════════ */

export interface ImageUploadProps {
  /** Current image URL */
  value?: string | null;
  /** Callback when image changes */
  onChange?: (file: File | null) => void;
  /** Accepted image types */
  accept?: string;
  /** Maximum file size */
  maxSize?: number;
  /** Whether the upload is disabled */
  disabled?: boolean;
  /** Aspect ratio for preview (e.g., "1/1", "16/9") */
  aspectRatio?: string;
  /** Size of the preview */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Single image upload with preview.
 *
 * @example
 * <ImageUpload
 *   value={profileImage}
 *   onChange={setProfileImage}
 *   aspectRatio="1/1"
 *   size="lg"
 * />
 */
export function ImageUpload({
  value,
  onChange,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024,
  disabled = false,
  aspectRatio = '1/1',
  size = 'md',
  className,
  placeholder = 'Upload image',
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update preview when value changes
  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  // Handle file selection
  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      setError(null);

      if (!file) {
        onChange?.(null);
        setPreview(null);
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size
      if (maxSize && file.size > maxSize) {
        setError(`Image must be less than ${formatFileSize(maxSize)}`);
        return;
      }

      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      onChange?.(file);

      // Reset input
      e.target.value = '';
    },
    [maxSize, onChange]
  );

  // Handle remove
  const handleRemove = useCallback(() => {
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    onChange?.(null);
  }, [preview, onChange]);

  const sizeClasses = {
    sm: 'h-20 w-20',
    md: 'h-32 w-32',
    lg: 'h-48 w-48',
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <div
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        style={{ aspectRatio }}
        className={cn(
          'relative cursor-pointer overflow-hidden rounded-lg border-2 border-dashed',
          'bg-muted transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'hover:border-primary/50',
          disabled && 'cursor-not-allowed opacity-50',
          sizeClasses[size]
        )}
        aria-label={preview ? 'Change image' : placeholder}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={handleFileChange}
          className="sr-only"
          aria-hidden="true"
        />

        {preview ? (
          <img
            src={preview}
            alt="Upload preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{placeholder}</span>
          </div>
        )}
      </div>

      {/* Remove button */}
      {preview && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          className={cn(
            'absolute -right-2 -top-2 rounded-full bg-destructive p-1',
            'text-destructive-foreground shadow-sm',
            'hover:bg-destructive/90',
            'focus:outline-none focus:ring-2 focus:ring-ring'
          )}
          aria-label="Remove image"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

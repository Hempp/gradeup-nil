'use client';

import { useState, useCallback } from 'react';
import { Loader2, Youtube, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VideoEmbedPreview } from '@/components/shared/VideoEmbedPreview';
import { videoValidators, detectVideoPlatform } from '@/lib/utils/validation';
import type { VideoPlatform } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface AddHighlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (url: string, platform: VideoPlatform, title?: string) => Promise<void>;
  isLoading?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// TikTok Icon
// ═══════════════════════════════════════════════════════════════════════════

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export function AddHighlightModal({
  isOpen,
  onClose,
  onAdd,
  isLoading = false,
}: AddHighlightModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detectedPlatform, setDetectedPlatform] = useState<VideoPlatform | null>(null);

  // Validate URL and detect platform
  const handleUrlChange = useCallback((value: string) => {
    setUrl(value);
    setError(null);

    if (!value.trim()) {
      setDetectedPlatform(null);
      return;
    }

    // Validate and detect platform
    const validation = videoValidators.highlightUrl(value);
    if (validation !== null) {
      setError(validation);
      setDetectedPlatform(null);
    } else {
      const platform = detectVideoPlatform(value);
      setDetectedPlatform(platform);
    }
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Please enter a video URL');
      return;
    }

    if (!detectedPlatform) {
      setError('Please enter a valid YouTube or TikTok URL');
      return;
    }

    await onAdd(url.trim(), detectedPlatform, title.trim() || undefined);
  };

  // Reset form when modal closes
  const handleClose = () => {
    setUrl('');
    setTitle('');
    setError(null);
    setDetectedPlatform(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Highlight Video"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Platform Info */}
        <div className="flex gap-4 p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-[var(--radius-sm)] bg-red-500/10">
              <Youtube className="h-5 w-5 text-red-500" />
            </div>
            <span className="text-sm text-[var(--text-secondary)]">YouTube</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)]">
              <TikTokIcon className="h-5 w-5 text-[var(--text-primary)]" />
            </div>
            <span className="text-sm text-[var(--text-secondary)]">TikTok</span>
          </div>
        </div>

        {/* URL Input */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Video URL
          </label>
          <div className="relative">
            <Input
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://tiktok.com/@..."
              icon={<LinkIcon className="h-4 w-4" />}
              error={!!error}
            />
            {detectedPlatform && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {detectedPlatform === 'youtube' ? (
                  <Youtube className="h-5 w-5 text-red-500" />
                ) : (
                  <TikTokIcon className="h-5 w-5 text-[var(--text-primary)]" />
                )}
              </div>
            )}
          </div>
          {error && (
            <p className="mt-1 text-sm text-[var(--color-error)] flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}
        </div>

        {/* Title Input (Optional) */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Title <span className="text-[var(--text-muted)]">(optional)</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Game-winning touchdown vs. State"
            maxLength={100}
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Add a title to help brands understand what the video shows
          </p>
        </div>

        {/* Preview */}
        {detectedPlatform && url && !error && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Preview
            </label>
            <VideoEmbedPreview
              url={url}
              platform={detectedPlatform}
              title={title || undefined}
              showEmbed={false}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !detectedPlatform || !!error}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Video
          </Button>
        </div>
      </form>
    </Modal>
  );
}

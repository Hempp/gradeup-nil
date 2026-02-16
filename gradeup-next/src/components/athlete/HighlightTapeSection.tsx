'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Video, Trash2, Loader2, AlertCircle, Youtube } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { VideoEmbedPreview } from '@/components/shared/VideoEmbedPreview';
import { AddHighlightModal } from './AddHighlightModal';
import {
  getHighlightUrls,
  addHighlightUrl,
  removeHighlightUrl,
} from '@/lib/services/athlete';
import { useToastActions } from '@/components/ui/toast';
import type { HighlightUrl, VideoPlatform } from '@/types';

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
// Empty State
// ═══════════════════════════════════════════════════════════════════════════

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-full bg-[var(--bg-tertiary)] mb-4">
        <Video className="h-8 w-8 text-[var(--text-muted)]" />
      </div>
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
        No Highlight Videos
      </h3>
      <p className="text-sm text-[var(--text-muted)] max-w-sm mb-6">
        Add YouTube or TikTok videos to showcase your athletic highlights to brands.
        Great highlights can increase your deal opportunities.
      </p>
      <Button variant="primary" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" />
        Add Highlight Video
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Highlight Card
// ═══════════════════════════════════════════════════════════════════════════

interface HighlightCardProps {
  highlight: HighlightUrl;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function HighlightCard({ highlight, onDelete, isDeleting }: HighlightCardProps) {
  const PlatformIcon = highlight.platform === 'youtube' ? Youtube : TikTokIcon;
  const platformColor = highlight.platform === 'youtube' ? 'text-red-500' : 'text-[var(--text-primary)]';

  return (
    <div className="relative group">
      <VideoEmbedPreview
        url={highlight.url}
        platform={highlight.platform}
        title={highlight.title}
        showEmbed={false}
        className="h-full"
      />

      {/* Delete button - 44x44px touch target, visible on focus */}
      <button
        onClick={() => onDelete(highlight.id)}
        disabled={isDeleting}
        className="absolute top-2 right-2 h-11 w-11 flex items-center justify-center rounded-[var(--radius-sm)] bg-black/70 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity motion-reduce:transition-none hover:bg-[var(--color-error)] focus:bg-[var(--color-error)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50"
        aria-label={`Delete ${highlight.title || 'video'}`}
      >
        {isDeleting ? (
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <Trash2 className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {/* Platform badge */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] bg-black/70">
        <PlatformIcon className={`h-3 w-3 ${platformColor}`} />
        <span className="text-xs text-white capitalize">{highlight.platform}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Delete Confirmation Modal
// ═══════════════════════════════════════════════════════════════════════════

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

function DeleteConfirmation({ isOpen, onClose, onConfirm, isLoading }: DeleteConfirmationProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Highlight Video"
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20">
          <AlertCircle className="h-5 w-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Remove this video?
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              This video will no longer appear on your profile or be visible to brands.
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function HighlightTapeSection() {
  const [highlights, setHighlights] = useState<HighlightUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { success: showSuccess, error: showError } = useToastActions();

  // Fetch highlight URLs
  const fetchHighlights = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await getHighlightUrls();

    if (result.error) {
      setError(result.error.message);
      setHighlights([]);
    } else {
      setHighlights(result.data || []);
    }

    setIsLoading(false);
  }, []);

  // Fetch highlights on mount - data fetching on mount is valid pattern
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on mount
    fetchHighlights();
  }, [fetchHighlights]);

  // Add highlight
  const handleAdd = async (url: string, platform: VideoPlatform, title?: string) => {
    setIsSaving(true);

    const result = await addHighlightUrl(url, platform, title);

    if (result.error) {
      showError('Failed to add video', result.error.message);
    } else {
      showSuccess('Video added', 'Your highlight video has been added to your profile.');
      await fetchHighlights();
      setShowAddModal(false);
    }

    setIsSaving(false);
  };

  // Delete highlight
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget);

    const result = await removeHighlightUrl(deleteTarget);

    if (result.error) {
      showError('Failed to delete video', result.error.message);
    } else {
      showSuccess('Video removed', 'The highlight video has been removed from your profile.');
      await fetchHighlights();
    }

    setDeletingId(null);
    setDeleteTarget(null);
  };

  // Render loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Highlight Tape
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Highlight Tape
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-8 w-8 text-[var(--color-error)] mb-4" />
            <p className="text-sm text-[var(--text-muted)]">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchHighlights}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Highlight Tape
          </CardTitle>
          {highlights.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {highlights.length === 0 ? (
            <EmptyState onAdd={() => setShowAddModal(true)} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {highlights.map((highlight) => (
                <HighlightCard
                  key={highlight.id}
                  highlight={highlight}
                  onDelete={(id) => setDeleteTarget(id)}
                  isDeleting={deletingId === highlight.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Modal */}
      <AddHighlightModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
        isLoading={isSaving}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmation
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={!!deletingId}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Read-Only Version (for brand view)
// ═══════════════════════════════════════════════════════════════════════════

interface HighlightTapeViewProps {
  highlights: HighlightUrl[];
  title?: string;
}

export function HighlightTapeView({ highlights, title = 'Highlight Videos' }: HighlightTapeViewProps) {
  if (highlights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
        <Video className="h-5 w-5" />
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {highlights.map((highlight) => (
          <VideoEmbedPreview
            key={highlight.id}
            url={highlight.url}
            platform={highlight.platform}
            title={highlight.title}
            showEmbed={true}
          />
        ))}
      </div>
    </div>
  );
}

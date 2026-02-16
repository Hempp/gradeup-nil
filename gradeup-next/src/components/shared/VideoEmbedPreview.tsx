'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play, ExternalLink, Youtube, AlertCircle } from 'lucide-react';
import type { VideoPlatform } from '@/types';
import { extractYouTubeVideoId } from '@/lib/utils/validation';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface VideoEmbedPreviewProps {
  url: string;
  platform: VideoPlatform;
  title?: string;
  showEmbed?: boolean;
  className?: string;
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
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

function getTikTokEmbedUrl(url: string): string {
  // TikTok embed requires the full URL, we'll use oEmbed pattern
  return `https://www.tiktok.com/embed/v2/${extractTikTokVideoId(url)}`;
}

function extractTikTokVideoId(url: string): string | null {
  // TikTok URLs: https://www.tiktok.com/@username/video/1234567890
  const patterns = [
    /tiktok\.com\/@[^/]+\/video\/(\d+)/,
    /vm\.tiktok\.com\/(\w+)/,
    /tiktok\.com\/t\/(\w+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export function VideoEmbedPreview({
  url,
  platform,
  title,
  showEmbed = false,
  className = '',
}: VideoEmbedPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get platform-specific data
  const youtubeVideoId = platform === 'youtube' ? extractYouTubeVideoId(url) : null;
  const tiktokVideoId = platform === 'tiktok' ? extractTikTokVideoId(url) : null;

  // Handle thumbnail click to play
  const handlePlay = () => {
    if (showEmbed) {
      setIsPlaying(true);
    } else {
      // Open in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Platform icon and color
  const PlatformIcon = platform === 'youtube' ? Youtube : TikTokIcon;
  const platformColor = platform === 'youtube' ? 'text-red-500' : 'text-white';
  const platformBg = platform === 'youtube' ? 'bg-red-500' : 'bg-black';

  // Show embed player
  if (isPlaying && showEmbed) {
    if (platform === 'youtube' && youtubeVideoId) {
      return (
        <div className={`relative aspect-video rounded-[var(--radius-md)] overflow-hidden ${className}`}>
          <iframe
            src={`${getYouTubeEmbedUrl(youtubeVideoId)}?autoplay=1`}
            title={title || 'YouTube video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      );
    }

    if (platform === 'tiktok' && tiktokVideoId) {
      return (
        <div className={`relative aspect-[9/16] max-h-[400px] rounded-[var(--radius-md)] overflow-hidden ${className}`}>
          <iframe
            src={getTikTokEmbedUrl(url)}
            title={title || 'TikTok video'}
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      );
    }
  }

  // Handle keyboard events - support Enter and Space
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePlay();
    }
  };

  // Thumbnail preview
  return (
    <div
      className={`relative group cursor-pointer rounded-[var(--radius-md)] overflow-hidden bg-[var(--bg-tertiary)] ${className}`}
      onClick={handlePlay}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`Play ${title || 'video'} on ${platform}`}
    >
      {/* Thumbnail */}
      <div className="aspect-video relative">
        {platform === 'youtube' && youtubeVideoId && !imageError ? (
          <Image
            src={getYouTubeThumbnail(youtubeVideoId)}
            alt={title || 'Video thumbnail'}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)]">
            <PlatformIcon className={`h-12 w-12 ${platformColor}`} aria-hidden="true" />
          </div>
        )}

        {/* Overlay on hover/focus - with motion-reduce support */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity motion-reduce:transition-none flex items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform group-hover:scale-110 motion-reduce:group-hover:scale-100 transition-transform motion-reduce:transition-none">
            <Play className="h-8 w-8 text-[var(--text-primary)] ml-1" fill="currentColor" aria-hidden="true" />
          </div>
        </div>

        {/* Platform badge */}
        <div className={`absolute top-2 left-2 px-2 py-1 rounded-[var(--radius-sm)] ${platformBg} flex items-center gap-1`} aria-hidden="true">
          <PlatformIcon className="h-3 w-3 text-white" />
          <span className="text-xs font-medium text-white capitalize">{platform}</span>
        </div>

        {/* External link indicator */}
        {!showEmbed && (
          <div className="absolute top-2 right-2 p-1.5 rounded-[var(--radius-sm)] bg-black/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity motion-reduce:transition-none" aria-hidden="true">
            <ExternalLink className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Title */}
      {title && (
        <div className="p-3 bg-[var(--bg-card)]">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{title}</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Compact Version for Cards
// ═══════════════════════════════════════════════════════════════════════════

interface VideoThumbnailProps {
  url: string;
  platform: VideoPlatform;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function VideoThumbnail({
  url,
  platform,
  size = 'md',
  onClick,
}: VideoThumbnailProps) {
  const [imageError, setImageError] = useState(false);

  const youtubeVideoId = platform === 'youtube' ? extractYouTubeVideoId(url) : null;

  const sizeClasses = {
    sm: 'h-16 w-24',
    md: 'h-24 w-36',
    lg: 'h-32 w-48',
  };

  const PlatformIcon = platform === 'youtube' ? Youtube : TikTokIcon;
  const iconColor = platform === 'youtube' ? 'text-red-500' : 'text-white';

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Handle keyboard events - support Enter and Space
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={`relative group cursor-pointer rounded-[var(--radius-sm)] overflow-hidden ${sizeClasses[size]}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Play video"
    >
      {platform === 'youtube' && youtubeVideoId && !imageError ? (
        <Image
          src={getYouTubeThumbnail(youtubeVideoId)}
          alt="Video thumbnail"
          fill
          sizes={size === 'sm' ? '96px' : size === 'md' ? '144px' : '192px'}
          className="object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)]">
          <PlatformIcon className={`h-6 w-6 ${iconColor}`} />
        </div>
      )}

      {/* Play overlay - with motion-reduce and focus support */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity motion-reduce:transition-none flex items-center justify-center">
        <Play className="h-6 w-6 text-white" fill="white" aria-hidden="true" />
      </div>

      {/* Platform indicator */}
      <div className="absolute bottom-1 right-1" aria-hidden="true">
        <PlatformIcon className={`h-4 w-4 ${iconColor} drop-shadow-md`} />
      </div>
    </div>
  );
}

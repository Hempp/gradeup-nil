/**
 * Tests for video validation utilities
 * @module __tests__/lib/utils/video-validators.test
 */

import {
  videoValidators,
  detectVideoPlatform,
} from '@/lib/utils/validation';

describe('videoValidators', () => {
  describe('youtubeUrl', () => {
    it('returns null for valid youtube.com URL', () => {
      expect(videoValidators.youtubeUrl('https://youtube.com/watch?v=abc123')).toBeNull();
    });

    it('returns null for valid youtu.be URL', () => {
      expect(videoValidators.youtubeUrl('https://youtu.be/abc123')).toBeNull();
    });

    it('returns null for www.youtube.com URL', () => {
      expect(videoValidators.youtubeUrl('https://www.youtube.com/watch?v=abc123')).toBeNull();
    });

    it('returns error for non-YouTube URL', () => {
      expect(videoValidators.youtubeUrl('https://vimeo.com/123')).toBe('Please enter a valid YouTube URL');
    });

    it('returns error for invalid URL format', () => {
      expect(videoValidators.youtubeUrl('not-a-url')).toBe('Please enter a valid URL');
    });

    it('returns null for empty value (let required handle it)', () => {
      expect(videoValidators.youtubeUrl('')).toBeNull();
    });
  });

  describe('tiktokUrl', () => {
    it('returns null for valid tiktok.com URL', () => {
      expect(videoValidators.tiktokUrl('https://tiktok.com/@user/video/123')).toBeNull();
    });

    it('returns null for www.tiktok.com URL', () => {
      expect(videoValidators.tiktokUrl('https://www.tiktok.com/@user/video/123')).toBeNull();
    });

    it('returns error for non-TikTok URL', () => {
      expect(videoValidators.tiktokUrl('https://instagram.com/reel/123')).toBe('Please enter a valid TikTok URL');
    });

    it('returns error for invalid URL format', () => {
      expect(videoValidators.tiktokUrl('not-a-url')).toBe('Please enter a valid URL');
    });

    it('returns null for empty value (let required handle it)', () => {
      expect(videoValidators.tiktokUrl('')).toBeNull();
    });
  });

  describe('highlightUrl', () => {
    it('returns null for YouTube URL', () => {
      expect(videoValidators.highlightUrl('https://youtube.com/watch?v=abc123')).toBeNull();
    });

    it('returns null for youtu.be URL', () => {
      expect(videoValidators.highlightUrl('https://youtu.be/abc123')).toBeNull();
    });

    it('returns null for TikTok URL', () => {
      expect(videoValidators.highlightUrl('https://tiktok.com/@user/video/123')).toBeNull();
    });

    it('returns error for other platforms', () => {
      expect(videoValidators.highlightUrl('https://vimeo.com/123')).toBe('Please enter a YouTube or TikTok URL');
    });

    it('returns error for invalid URL format', () => {
      expect(videoValidators.highlightUrl('not-a-url')).toBe('Please enter a valid URL');
    });

    it('returns null for empty value (let required handle it)', () => {
      expect(videoValidators.highlightUrl('')).toBeNull();
    });
  });
});

describe('detectVideoPlatform', () => {
  it('detects youtube.com', () => {
    expect(detectVideoPlatform('https://youtube.com/watch?v=abc')).toBe('youtube');
  });

  it('detects youtu.be', () => {
    expect(detectVideoPlatform('https://youtu.be/abc')).toBe('youtube');
  });

  it('detects www.youtube.com', () => {
    expect(detectVideoPlatform('https://www.youtube.com/watch?v=abc')).toBe('youtube');
  });

  it('detects tiktok.com', () => {
    expect(detectVideoPlatform('https://tiktok.com/@user/video/123')).toBe('tiktok');
  });

  it('detects www.tiktok.com', () => {
    expect(detectVideoPlatform('https://www.tiktok.com/@user/video/123')).toBe('tiktok');
  });

  it('returns null for other platforms', () => {
    expect(detectVideoPlatform('https://vimeo.com/123')).toBeNull();
  });

  it('returns null for invalid URLs', () => {
    expect(detectVideoPlatform('not-a-url')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(detectVideoPlatform('')).toBeNull();
  });
});

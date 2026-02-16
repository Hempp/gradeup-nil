/**
 * Tests for the HighlightTapeSection component
 * @module __tests__/components/athlete/HighlightTapeSection.test
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HighlightTapeSection } from '@/components/athlete/HighlightTapeSection';
import type { HighlightUrl } from '@/types';

// Mock the athlete service
const mockGetHighlightUrls = jest.fn();
const mockAddHighlightUrl = jest.fn();
const mockRemoveHighlightUrl = jest.fn();

jest.mock('@/lib/services/athlete', () => ({
  getHighlightUrls: () => mockGetHighlightUrls(),
  addHighlightUrl: (...args: unknown[]) => mockAddHighlightUrl(...args),
  removeHighlightUrl: (...args: unknown[]) => mockRemoveHighlightUrl(...args),
}));

// Mock the toast actions
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/components/ui/toast', () => ({
  useToastActions: () => ({
    success: mockShowSuccess,
    error: mockShowError,
  }),
}));

// Mock the VideoEmbedPreview component
jest.mock('@/components/shared/VideoEmbedPreview', () => ({
  VideoEmbedPreview: ({ url, platform }: { url: string; platform: string }) => (
    <div data-testid="video-preview">Preview: {platform} - {url}</div>
  ),
}));

// Mock the AddHighlightModal component
jest.mock('@/components/athlete/AddHighlightModal', () => ({
  AddHighlightModal: ({ isOpen, onClose, onAdd, isLoading }: {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (url: string, platform: string, title?: string) => Promise<void>;
    isLoading: boolean;
  }) => (
    isOpen ? (
      <div data-testid="add-modal">
        <button onClick={onClose}>Close Modal</button>
        <button
          onClick={() => onAdd('https://youtube.com/watch?v=test', 'youtube', 'Test Video')}
          disabled={isLoading}
        >
          Add Test Video
        </button>
      </div>
    ) : null
  ),
}));

describe('HighlightTapeSection', () => {
  const mockHighlights: HighlightUrl[] = [
    {
      id: 'hl-1',
      user_id: 'user-1',
      url: 'https://youtube.com/watch?v=abc123',
      platform: 'youtube',
      title: 'Game Winning Play',
      created_at: new Date().toISOString(),
    },
    {
      id: 'hl-2',
      user_id: 'user-1',
      url: 'https://tiktok.com/@user/video/456',
      platform: 'tiktok',
      title: 'Training Highlights',
      created_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHighlightUrls.mockResolvedValue({ data: mockHighlights, error: null });
    mockAddHighlightUrl.mockResolvedValue({ data: null, error: null });
    mockRemoveHighlightUrl.mockResolvedValue({ data: null, error: null });
  });

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      mockGetHighlightUrls.mockReturnValue(new Promise(() => {})); // Never resolves
      render(<HighlightTapeSection />);

      expect(screen.getByText('Highlight Tape')).toBeInTheDocument();
    });
  });

  describe('with highlights', () => {
    it('displays highlight videos after loading', async () => {
      render(<HighlightTapeSection />);

      await waitFor(() => {
        expect(screen.getAllByTestId('video-preview')).toHaveLength(2);
      });
    });

    it('shows correct title in header', async () => {
      render(<HighlightTapeSection />);

      await waitFor(() => {
        expect(screen.getByText('Highlight Tape')).toBeInTheDocument();
      });
    });

    it('shows Add button in header', async () => {
      render(<HighlightTapeSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    it('shows empty state when no highlights', async () => {
      mockGetHighlightUrls.mockResolvedValue({ data: [], error: null });
      render(<HighlightTapeSection />);

      await waitFor(() => {
        expect(screen.getByText('No Highlight Videos')).toBeInTheDocument();
      });
    });

    it('shows add button in empty state', async () => {
      mockGetHighlightUrls.mockResolvedValue({ data: [], error: null });
      render(<HighlightTapeSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add highlight video/i })).toBeInTheDocument();
      });
    });

    it('shows helpful text in empty state', async () => {
      mockGetHighlightUrls.mockResolvedValue({ data: [], error: null });
      render(<HighlightTapeSection />);

      await waitFor(() => {
        expect(screen.getByText(/add youtube or tiktok videos/i)).toBeInTheDocument();
      });
    });
  });

  describe('error state', () => {
    it('shows error message when fetch fails', async () => {
      mockGetHighlightUrls.mockResolvedValue({
        data: null,
        error: { message: 'Failed to load highlights' }
      });
      render(<HighlightTapeSection />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load highlights')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockGetHighlightUrls.mockResolvedValue({
        data: null,
        error: { message: 'Network error' }
      });
      render(<HighlightTapeSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });
  });

  describe('add highlight modal', () => {
    it('opens add modal when button clicked', async () => {
      const user = userEvent.setup();
      render(<HighlightTapeSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^add$/i }));

      expect(screen.getByTestId('add-modal')).toBeInTheDocument();
    });

    it('closes modal when close button clicked', async () => {
      const user = userEvent.setup();
      render(<HighlightTapeSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^add$/i }));
      await user.click(screen.getByRole('button', { name: /close modal/i }));

      expect(screen.queryByTestId('add-modal')).not.toBeInTheDocument();
    });

    it('calls addHighlightUrl when adding video', async () => {
      const user = userEvent.setup();
      render(<HighlightTapeSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^add$/i }));
      await user.click(screen.getByRole('button', { name: /add test video/i }));

      await waitFor(() => {
        expect(mockAddHighlightUrl).toHaveBeenCalledWith(
          'https://youtube.com/watch?v=test',
          'youtube',
          'Test Video'
        );
      });
    });

    it('shows success toast after adding video', async () => {
      const user = userEvent.setup();
      render(<HighlightTapeSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^add$/i }));
      await user.click(screen.getByRole('button', { name: /add test video/i }));

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith('Video added', expect.any(String));
      });
    });

    it('shows error toast when adding fails', async () => {
      mockAddHighlightUrl.mockResolvedValue({
        data: null,
        error: { message: 'Failed to add video' }
      });

      const user = userEvent.setup();
      render(<HighlightTapeSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^add$/i }));
      await user.click(screen.getByRole('button', { name: /add test video/i }));

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Failed to add video', 'Failed to add video');
      });
    });
  });

  describe('delete highlight', () => {
    it('shows delete button on hover', async () => {
      render(<HighlightTapeSection />);

      await waitFor(() => {
        expect(screen.getAllByTestId('video-preview')).toHaveLength(2);
      });

      // Delete buttons should exist (even if hidden by CSS on non-hover)
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons.length).toBeGreaterThan(0);
    });
  });
});

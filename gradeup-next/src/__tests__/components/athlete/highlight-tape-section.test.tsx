/**
 * Tests for HighlightTapeSection component
 * @module __tests__/components/athlete/highlight-tape-section.test
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HighlightTapeSection } from '@/components/athlete/HighlightTapeSection';

// Mock the athlete service
jest.mock('@/lib/services/athlete', () => ({
  getHighlightUrls: jest.fn().mockResolvedValue([]),
  addHighlightUrl: jest.fn().mockResolvedValue({ success: true }),
  removeHighlightUrl: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock toast
jest.mock('@/components/ui/toast', () => ({
  useToastActions: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

// Mock AddHighlightModal
jest.mock('@/components/athlete/AddHighlightModal', () => ({
  AddHighlightModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="add-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
}));

// Mock VideoEmbedPreview
jest.mock('@/components/shared/VideoEmbedPreview', () => ({
  VideoEmbedPreview: () => <div data-testid="video-preview">Preview</div>,
}));

import * as athleteService from '@/lib/services/athlete';

describe('HighlightTapeSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders section title', async () => {
    render(<HighlightTapeSection />);

    await waitFor(() => {
      expect(screen.getByText('Highlight Tape')).toBeInTheDocument();
    });
  });

  it('shows empty state when no highlights', async () => {
    (athleteService.getHighlightUrls as jest.Mock).mockResolvedValue([]);

    render(<HighlightTapeSection />);

    await waitFor(() => {
      expect(screen.getByText('No Highlight Videos')).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    // Make the promise never resolve to keep loading state
    (athleteService.getHighlightUrls as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    render(<HighlightTapeSection />);

    // Component should render while loading
    expect(screen.getByText('Highlight Tape')).toBeInTheDocument();
  });

  it('renders add button in empty state', async () => {
    (athleteService.getHighlightUrls as jest.Mock).mockResolvedValue([]);

    render(<HighlightTapeSection />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add highlight video/i })).toBeInTheDocument();
    });
  });

  it('opens add modal when add button is clicked', async () => {
    (athleteService.getHighlightUrls as jest.Mock).mockResolvedValue([]);

    render(<HighlightTapeSection />);

    await waitFor(() => {
      expect(screen.getByText('No Highlight Videos')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add highlight video/i }));

    await waitFor(() => {
      expect(screen.getByTestId('add-modal')).toBeInTheDocument();
    });
  });

  it('fetches highlights on mount', async () => {
    (athleteService.getHighlightUrls as jest.Mock).mockResolvedValue([]);

    render(<HighlightTapeSection />);

    await waitFor(() => {
      expect(athleteService.getHighlightUrls).toHaveBeenCalled();
    });
  });
});

/**
 * Tests for AddHighlightModal component
 * @module __tests__/components/athlete/add-highlight-modal.test
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddHighlightModal } from '@/components/athlete/AddHighlightModal';

// Mock the video validators
jest.mock('@/lib/utils/validation', () => ({
  videoValidators: {
    highlightUrl: (url: string) => {
      if (url.includes('youtube.com') || url.includes('tiktok.com')) {
        return null; // valid
      }
      return 'Invalid video URL';
    },
  },
  detectVideoPlatform: (url: string) => {
    if (url.includes('youtube.com')) return 'youtube';
    if (url.includes('tiktok.com')) return 'tiktok';
    return null;
  },
}));

// Mock VideoEmbedPreview
jest.mock('@/components/shared/VideoEmbedPreview', () => ({
  VideoEmbedPreview: () => <div data-testid="video-preview">Preview</div>,
}));

describe('AddHighlightModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onAdd: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<AddHighlightModal {...defaultProps} />);

    expect(screen.getByText('Add Highlight Video')).toBeInTheDocument();
  });

  it('shows platform icons', () => {
    render(<AddHighlightModal {...defaultProps} />);

    expect(screen.getByText('YouTube')).toBeInTheDocument();
    expect(screen.getByText('TikTok')).toBeInTheDocument();
  });

  it('has cancel and add video buttons', () => {
    render(<AddHighlightModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add video/i })).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', () => {
    render(<AddHighlightModal {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('disables submit when loading', () => {
    render(<AddHighlightModal {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('button', { name: /add video/i })).toBeDisabled();
  });

  it('submit button is disabled when no valid platform detected', () => {
    render(<AddHighlightModal {...defaultProps} />);

    // Button should be disabled when no valid URL is entered
    expect(screen.getByRole('button', { name: /add video/i })).toBeDisabled();
  });

  it('shows Video URL label', () => {
    render(<AddHighlightModal {...defaultProps} />);

    expect(screen.getByText('Video URL')).toBeInTheDocument();
  });

  it('shows Title label with optional indicator', () => {
    render(<AddHighlightModal {...defaultProps} />);

    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });
});

/**
 * Tests for the AddHighlightModal component
 * @module __tests__/components/athlete/AddHighlightModal.test
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddHighlightModal } from '@/components/athlete/AddHighlightModal';

// Mock the VideoEmbedPreview component
jest.mock('@/components/shared/VideoEmbedPreview', () => ({
  VideoEmbedPreview: ({ url, platform }: { url: string; platform: string }) => (
    <div data-testid="video-preview">Preview: {platform} - {url}</div>
  ),
}));

describe('AddHighlightModal', () => {
  const mockOnClose = jest.fn();
  const mockOnAdd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAdd.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('renders when open', () => {
      render(
        <AddHighlightModal
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />
      );

      expect(screen.getByText('Add Highlight Video')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <AddHighlightModal
          isOpen={false}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />
      );

      expect(screen.queryByText('Add Highlight Video')).not.toBeInTheDocument();
    });

    it('shows platform indicators', () => {
      render(
        <AddHighlightModal
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />
      );

      expect(screen.getByText('YouTube')).toBeInTheDocument();
      expect(screen.getByText('TikTok')).toBeInTheDocument();
    });

    it('renders URL input field with label', () => {
      render(
        <AddHighlightModal
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />
      );

      expect(screen.getByText('Video URL')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/youtube.com\/watch/i)).toBeInTheDocument();
    });

    it('renders optional title field', () => {
      render(
        <AddHighlightModal
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('(optional)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/game-winning touchdown/i)).toBeInTheDocument();
    });

    it('shows helper text for title', () => {
      render(
        <AddHighlightModal
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />
      );

      expect(screen.getByText(/add a title to help brands understand/i)).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      render(
        <AddHighlightModal
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders add video button', () => {
      render(
        <AddHighlightModal
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />
      );

      expect(screen.getByRole('button', { name: /add video/i })).toBeInTheDocument();
    });

    it('renders close button in header', () => {
      render(
        <AddHighlightModal
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />
      );

      expect(screen.getByRole('button', { name: /close modal/i })).toBeInTheDocument();
    });
  });

  describe('input behavior', () => {
    it('URL field accepts input', async () => {
      render(
        <AddHighlightModal
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />
      );

      const urlInput = screen.getByPlaceholderText(/youtube.com\/watch/i) as HTMLInputElement;
      expect(urlInput.type).toBe('text');
      expect(urlInput).toHaveValue('');
    });

    it('title field accepts input', async () => {
      render(
        <AddHighlightModal
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />
      );

      const titleInput = screen.getByPlaceholderText(/game-winning touchdown/i) as HTMLInputElement;
      expect(titleInput.type).toBe('text');
      expect(titleInput).toHaveValue('');
    });
  });

  describe('button states', () => {
    it('submit button is disabled initially', () => {
      render(
        <AddHighlightModal
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />
      );

      const submitButton = screen.getByRole('button', { name: /add video/i });
      expect(submitButton).toBeDisabled();
    });

    it('cancel button is enabled initially', () => {
      render(
        <AddHighlightModal
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).not.toBeDisabled();
    });
  });

  describe('loading state', () => {
    it('disables cancel button when loading', () => {
      render(
        <AddHighlightModal
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
          isLoading={true}
        />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('disables add video button when loading', () => {
      render(
        <AddHighlightModal
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
          isLoading={true}
        />
      );

      expect(screen.getByRole('button', { name: /add video/i })).toBeDisabled();
    });
  });

  describe('cancel and close behavior', () => {
    it('calls onClose when cancel clicked', async () => {
      const user = userEvent.setup();
      render(
        <AddHighlightModal
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when close button clicked', async () => {
      const user = userEvent.setup();
      render(
        <AddHighlightModal
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
        />
      );

      await user.click(screen.getByRole('button', { name: /close modal/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});

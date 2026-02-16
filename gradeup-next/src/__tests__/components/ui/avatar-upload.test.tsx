/**
 * Tests for AvatarUpload and DocumentUpload components
 * @module __tests__/components/ui/avatar-upload.test
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AvatarUpload, DocumentUpload, type AvatarUploadVariant } from '@/components/ui/avatar-upload';

// Mock upload utilities
jest.mock('@/lib/utils/upload', () => ({
  uploadAvatar: jest.fn().mockResolvedValue({ url: 'https://example.com/avatar.jpg', path: 'avatar.jpg', error: null }),
  uploadBrandLogo: jest.fn().mockResolvedValue({ url: 'https://example.com/logo.jpg', path: 'logo.jpg', error: null }),
  uploadDocument: jest.fn().mockResolvedValue({ url: 'https://example.com/doc.pdf', path: 'doc.pdf', error: null }),
  validateFile: jest.fn().mockResolvedValue({ valid: true }),
  compressImage: jest.fn().mockImplementation((file) => Promise.resolve(file)),
  getFilePreviewUrl: jest.fn(() => 'blob:preview-url'),
  revokeFilePreviewUrl: jest.fn(),
}));

describe('AvatarUpload', () => {
  it('renders with default props', () => {
    render(<AvatarUpload />);

    // Should have a button for uploading
    expect(screen.getByRole('button', { name: /click or drag to upload avatar/i })).toBeInTheDocument();
  });

  it('renders with current URL', () => {
    render(<AvatarUpload currentUrl="https://example.com/current.jpg" />);

    // Avatar should be present
    expect(screen.getByRole('button', { name: /click or drag to upload avatar/i })).toBeInTheDocument();
  });

  it('renders with custom fallback', () => {
    render(<AvatarUpload fallback="JD" />);

    // Component should render
    expect(screen.getByRole('button', { name: /click or drag to upload avatar/i })).toBeInTheDocument();
  });

  it('renders different sizes', () => {
    const sizes: Array<'sm' | 'md' | 'lg' | 'xl'> = ['sm', 'md', 'lg', 'xl'];

    sizes.forEach((size) => {
      const { unmount } = render(<AvatarUpload size={size} />);
      expect(screen.getByRole('button', { name: /click or drag to upload avatar/i })).toBeInTheDocument();
      unmount();
    });
  });

  it('renders logo variant', () => {
    render(<AvatarUpload variant="logo" />);

    expect(screen.getByRole('button', { name: /click or drag to upload logo/i })).toBeInTheDocument();
  });

  it('disables upload when disabled prop is true', () => {
    render(<AvatarUpload disabled />);

    // The drop zone should have tabIndex -1 when disabled
    const dropZone = screen.getByRole('button', { name: /click or drag to upload avatar/i });
    expect(dropZone).toHaveAttribute('tabIndex', '-1');
  });

  it('shows remove button when currentUrl and onRemove are provided', () => {
    const onRemove = jest.fn();
    render(<AvatarUpload currentUrl="https://example.com/avatar.jpg" onRemove={onRemove} />);

    const removeButton = screen.getByRole('button', { name: /remove avatar/i });
    expect(removeButton).toBeInTheDocument();

    fireEvent.click(removeButton);
    expect(onRemove).toHaveBeenCalled();
  });

  it('accepts avatar and logo variants', () => {
    const variants: AvatarUploadVariant[] = ['avatar', 'logo'];

    variants.forEach((variant) => {
      const { unmount } = render(<AvatarUpload variant={variant} />);
      unmount();
    });
  });
});

describe('DocumentUpload', () => {
  it('renders with default props', () => {
    render(<DocumentUpload />);

    expect(screen.getByText('Upload Document')).toBeInTheDocument();
    expect(screen.getByText('PDF, DOC, DOCX, or TXT up to 10MB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose file/i })).toBeInTheDocument();
  });

  it('renders with custom label and hint', () => {
    render(<DocumentUpload label="Upload Contract" hint="PDF files only" />);

    expect(screen.getByText('Upload Contract')).toBeInTheDocument();
    expect(screen.getByText('PDF files only')).toBeInTheDocument();
  });

  it('disables when disabled prop is true', () => {
    render(<DocumentUpload disabled />);

    const button = screen.getByRole('button', { name: /choose file/i });
    expect(button).toBeDisabled();
  });

  it('accepts custom accept prop', () => {
    render(<DocumentUpload accept=".pdf" />);

    // Component should still render
    expect(screen.getByText('Upload Document')).toBeInTheDocument();
  });

  it('accepts custom maxSizeMB prop', () => {
    render(<DocumentUpload maxSizeMB={5} />);

    expect(screen.getByText('Upload Document')).toBeInTheDocument();
  });
});

describe('AvatarUpload keyboard accessibility', () => {
  it('triggers file input on Enter key', () => {
    render(<AvatarUpload />);

    const dropZone = screen.getByRole('button', { name: /click or drag to upload avatar/i });

    fireEvent.keyDown(dropZone, { key: 'Enter' });
    // File input click should be triggered
  });

  it('triggers file input on Space key', () => {
    render(<AvatarUpload />);

    const dropZone = screen.getByRole('button', { name: /click or drag to upload avatar/i });

    fireEvent.keyDown(dropZone, { key: ' ' });
    // File input click should be triggered
  });
});

describe('AvatarUpload drag and drop', () => {
  it('handles drag enter', () => {
    render(<AvatarUpload />);

    const dropZone = screen.getByRole('button', { name: /click or drag to upload avatar/i });

    fireEvent.dragEnter(dropZone, {
      dataTransfer: { files: [] },
    });

    // Component should show drag state
  });

  it('handles drag leave', () => {
    render(<AvatarUpload />);

    const dropZone = screen.getByRole('button', { name: /click or drag to upload avatar/i });

    fireEvent.dragEnter(dropZone, {
      dataTransfer: { files: [] },
    });
    fireEvent.dragLeave(dropZone, {
      dataTransfer: { files: [] },
    });
  });

  it('does not respond to drag when disabled', () => {
    render(<AvatarUpload disabled />);

    const dropZone = screen.getByRole('button', { name: /click or drag to upload avatar/i });

    fireEvent.dragEnter(dropZone, {
      dataTransfer: { files: [] },
    });

    // Should not show drag state when disabled
  });
});

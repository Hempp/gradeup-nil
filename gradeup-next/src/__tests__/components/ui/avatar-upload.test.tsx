/**
 * Tests for the AvatarUpload and DocumentUpload components
 * @module __tests__/components/ui/avatar-upload.test
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvatarUpload, DocumentUpload } from '@/components/ui/avatar-upload';

// Mock the upload utilities
jest.mock('@/lib/utils/upload', () => ({
  uploadAvatar: jest.fn().mockResolvedValue({ url: 'https://example.com/avatar.jpg', path: 'avatar.jpg', error: null }),
  uploadBrandLogo: jest.fn().mockResolvedValue({ url: 'https://example.com/logo.jpg', path: 'logo.jpg', error: null }),
  uploadDocument: jest.fn().mockResolvedValue({ url: 'https://example.com/doc.pdf', path: 'doc.pdf', error: null }),
  validateFile: jest.fn().mockResolvedValue({ valid: true }),
  compressImage: jest.fn().mockImplementation((file) => Promise.resolve(file)),
  getFilePreviewUrl: jest.fn().mockReturnValue('blob:preview-url'),
  revokeFilePreviewUrl: jest.fn(),
}));

const mockUploadFunctions = jest.requireMock('@/lib/utils/upload');

describe('AvatarUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders avatar with fallback', () => {
    render(<AvatarUpload fallback="JD" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders current URL when provided', () => {
    render(<AvatarUpload currentUrl="https://example.com/avatar.jpg" />);
    const avatar = screen.getByRole('img');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders camera button when not disabled', () => {
    render(<AvatarUpload />);
    const cameraButton = screen.getByLabelText(/Upload new avatar/i);
    expect(cameraButton).toBeInTheDocument();
  });

  it('hides camera button when disabled', () => {
    render(<AvatarUpload disabled />);
    expect(screen.queryByLabelText(/Upload new avatar/i)).not.toBeInTheDocument();
  });

  it('triggers file input when camera button clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<AvatarUpload />);

    const cameraButton = screen.getByLabelText(/Upload new avatar/i);
    await user.click(cameraButton);

    // File input should be in the document (hidden)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
  });

  it('triggers file input on keyboard Enter', async () => {
    render(<AvatarUpload />);

    const uploadArea = screen.getByRole('button', { name: /Click or drag to upload avatar/i });
    fireEvent.keyDown(uploadArea, { key: 'Enter' });

    // Should not throw
  });

  it('triggers file input on keyboard Space', async () => {
    render(<AvatarUpload />);

    const uploadArea = screen.getByRole('button', { name: /Click or drag to upload avatar/i });
    fireEvent.keyDown(uploadArea, { key: ' ' });

    // Should not throw
  });

  it('handles file selection and shows preview', async () => {
    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

    render(<AvatarUpload />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // Should show preview actions
    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('validates file before showing preview', async () => {
    mockUploadFunctions.validateFile.mockResolvedValueOnce({
      valid: false,
      error: 'File too large',
    });

    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
    render(<AvatarUpload />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('File too large')).toBeInTheDocument();
    });
  });

  it('uploads file when Save clicked', async () => {
    const onUpload = jest.fn();
    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

    render(<AvatarUpload onUpload={onUpload} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    await waitFor(() => {
      expect(mockUploadFunctions.uploadAvatar).toHaveBeenCalled();
    });
  });

  it('calls onUpload callback after successful upload', async () => {
    const onUpload = jest.fn();
    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

    render(<AvatarUpload onUpload={onUpload} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(expect.objectContaining({
        url: expect.any(String),
      }));
    });
  });

  it('cancels preview when Cancel clicked', async () => {
    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

    render(<AvatarUpload />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Cancel'));
    });

    expect(mockUploadFunctions.revokeFilePreviewUrl).toHaveBeenCalled();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('shows remove button when currentUrl and onRemove provided', () => {
    const onRemove = jest.fn();
    render(
      <AvatarUpload
        currentUrl="https://example.com/avatar.jpg"
        onRemove={onRemove}
      />
    );

    expect(screen.getByLabelText(/Remove avatar/i)).toBeInTheDocument();
  });

  it('calls onRemove when remove button clicked', async () => {
    const onRemove = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <AvatarUpload
        currentUrl="https://example.com/avatar.jpg"
        onRemove={onRemove}
      />
    );

    const removeButton = screen.getByLabelText(/Remove avatar/i);
    await user.click(removeButton);

    expect(onRemove).toHaveBeenCalled();
  });

  it('handles drag enter and drag leave', () => {
    render(<AvatarUpload />);

    const dropZone = screen.getByRole('button', { name: /Click or drag to upload avatar/i });

    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveClass('ring-4');

    fireEvent.dragLeave(dropZone);
    expect(dropZone).not.toHaveClass('ring-4');
  });

  it('handles drop event with image file', async () => {
    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

    render(<AvatarUpload />);

    const dropZone = screen.getByRole('button', { name: /Click or drag to upload avatar/i });

    await act(async () => {
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  it('shows error when dropping non-image file', async () => {
    const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });

    render(<AvatarUpload />);

    const dropZone = screen.getByRole('button', { name: /Click or drag to upload avatar/i });

    await act(async () => {
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Please drop an image file')).toBeInTheDocument();
    });
  });

  it('does not handle drop when disabled', async () => {
    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

    render(<AvatarUpload disabled />);

    const dropZone = screen.getByRole('button', { name: /Click or drag to upload avatar/i });

    await act(async () => {
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });
    });

    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('uses uploadBrandLogo for logo variant', async () => {
    const file = new File(['test'], 'logo.jpg', { type: 'image/jpeg' });

    render(<AvatarUpload variant="logo" />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    await waitFor(() => {
      expect(mockUploadFunctions.uploadBrandLogo).toHaveBeenCalled();
    });
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<AvatarUpload size="sm" />);
    let dropZone = screen.getByRole('button', { name: /Click or drag to upload avatar/i });
    expect(dropZone).toHaveClass('h-16', 'w-16');

    rerender(<AvatarUpload size="xl" />);
    dropZone = screen.getByRole('button', { name: /Click or drag to upload avatar/i });
    expect(dropZone).toHaveClass('h-32', 'w-32');
  });

  it('handles upload error', async () => {
    mockUploadFunctions.uploadAvatar.mockResolvedValueOnce({
      url: null,
      path: null,
      error: new Error('Upload failed'),
    });

    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

    render(<AvatarUpload />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = render(<AvatarUpload className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('DocumentUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default label', () => {
    render(<DocumentUpload />);
    expect(screen.getByText('Upload Document')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<DocumentUpload label="Upload Contract" />);
    expect(screen.getByText('Upload Contract')).toBeInTheDocument();
  });

  it('renders with hint text', () => {
    render(<DocumentUpload hint="Only PDF files allowed" />);
    expect(screen.getByText('Only PDF files allowed')).toBeInTheDocument();
  });

  it('renders Choose File button', () => {
    render(<DocumentUpload />);
    expect(screen.getByText('Choose File')).toBeInTheDocument();
  });

  it('disables Choose File button when disabled', () => {
    render(<DocumentUpload disabled />);
    expect(screen.getByText('Choose File')).toBeDisabled();
  });

  it('handles file selection and shows success', async () => {
    const onUpload = jest.fn();
    const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });

    render(<DocumentUpload onUpload={onUpload} />);

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(fileInput!, { target: { files: [file] } });
    });

    // Since the mock resolves immediately, we check for success state
    await waitFor(() => {
      expect(screen.getByText('Upload Complete')).toBeInTheDocument();
    });
  });

  it('shows file name during/after upload', async () => {
    const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });

    render(<DocumentUpload />);

    const fileInput = document.querySelector('input[type="file"]');

    await act(async () => {
      fireEvent.change(fileInput!, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
    });
  });

  it('shows error state on validation failure', async () => {
    mockUploadFunctions.validateFile.mockResolvedValueOnce({
      valid: false,
      error: 'File too large',
    });

    const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });

    render(<DocumentUpload />);

    const fileInput = document.querySelector('input[type="file"]');

    await act(async () => {
      fireEvent.change(fileInput!, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('Upload Failed')).toBeInTheDocument();
      expect(screen.getByText('File too large')).toBeInTheDocument();
    });
  });

  it('allows retry after error', async () => {
    mockUploadFunctions.validateFile.mockResolvedValueOnce({
      valid: false,
      error: 'File too large',
    });

    const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });

    render(<DocumentUpload />);

    const fileInput = document.querySelector('input[type="file"]');

    await act(async () => {
      fireEvent.change(fileInput!, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Try Again'));
    });

    expect(screen.getByText('Upload Document')).toBeInTheDocument();
  });

  it('handles drag enter and leave', () => {
    render(<DocumentUpload />);

    const dropZone = screen.getByText('Upload Document').closest('div')!;

    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveClass('border-[var(--color-primary)]');

    fireEvent.dragLeave(dropZone);
    expect(dropZone).not.toHaveClass('border-[var(--color-primary)]');
  });

  it('handles file drop', async () => {
    const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });

    render(<DocumentUpload />);

    const dropZone = screen.getByText('Upload Document').closest('div')!;

    await act(async () => {
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });
    });

    // Check for success state (since mock resolves immediately)
    await waitFor(() => {
      expect(screen.getByText('Upload Complete')).toBeInTheDocument();
    });
  });

  it('does not handle drop when disabled', async () => {
    const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });

    render(<DocumentUpload disabled />);

    const dropZone = screen.getByText('Upload Document').closest('div')!;

    await act(async () => {
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });
    });

    // Should still be in idle state
    expect(screen.getByText('Upload Document')).toBeInTheDocument();
    expect(screen.queryByText('Upload Complete')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<DocumentUpload className="custom-upload" />);
    const dropZone = screen.getByText('Upload Document').closest('div');
    expect(dropZone).toHaveClass('custom-upload');
  });
});

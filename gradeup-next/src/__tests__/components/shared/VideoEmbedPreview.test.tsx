import { render, screen, fireEvent } from '@testing-library/react';
import { VideoEmbedPreview, VideoThumbnail } from '@/components/shared/VideoEmbedPreview';

// Mock Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src: string; alt: string; onError?: () => void }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));

// Mock validation utils
jest.mock('@/lib/utils/validation', () => ({
  extractYouTubeVideoId: (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : null;
  },
}));

describe('VideoEmbedPreview', () => {
  const mockWindowOpen = jest.fn();
  const originalWindowOpen = window.open;

  beforeAll(() => {
    window.open = mockWindowOpen;
  });

  afterAll(() => {
    window.open = originalWindowOpen;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const tiktokUrl = 'https://www.tiktok.com/@username/video/1234567890';

  it('renders youtube video preview', () => {
    render(<VideoEmbedPreview url={youtubeUrl} platform="youtube" />);

    // Should show YouTube badge
    expect(screen.getByText('youtube')).toBeInTheDocument();
  });

  it('renders tiktok video preview', () => {
    render(<VideoEmbedPreview url={tiktokUrl} platform="tiktok" />);

    expect(screen.getByText('tiktok')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<VideoEmbedPreview url={youtubeUrl} platform="youtube" title="My Video" />);

    expect(screen.getByText('My Video')).toBeInTheDocument();
  });

  it('opens video in new tab when clicked and showEmbed is false', () => {
    render(<VideoEmbedPreview url={youtubeUrl} platform="youtube" showEmbed={false} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockWindowOpen).toHaveBeenCalledWith(youtubeUrl, '_blank', 'noopener,noreferrer');
  });

  it('shows embed player when clicked and showEmbed is true', () => {
    render(<VideoEmbedPreview url={youtubeUrl} platform="youtube" showEmbed={true} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Should now show an iframe
    const iframe = screen.getByTitle(/video/i);
    expect(iframe).toBeInTheDocument();
  });

  it('handles keyboard navigation with Enter', () => {
    render(<VideoEmbedPreview url={youtubeUrl} platform="youtube" showEmbed={false} />);

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });

    expect(mockWindowOpen).toHaveBeenCalled();
  });

  it('handles keyboard navigation with Space', () => {
    render(<VideoEmbedPreview url={youtubeUrl} platform="youtube" showEmbed={false} />);

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: ' ' });

    expect(mockWindowOpen).toHaveBeenCalled();
  });

  it('has proper accessibility label', () => {
    render(<VideoEmbedPreview url={youtubeUrl} platform="youtube" title="My Video" />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Play My Video on youtube');
  });

  it('is focusable', () => {
    render(<VideoEmbedPreview url={youtubeUrl} platform="youtube" />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('tabIndex', '0');
  });

  it('shows youtube thumbnail for youtube videos', () => {
    render(<VideoEmbedPreview url={youtubeUrl} platform="youtube" />);

    const img = screen.getByAltText(/thumbnail/i);
    expect(img).toHaveAttribute('src', expect.stringContaining('img.youtube.com'));
  });

  it('applies custom className', () => {
    const { container } = render(
      <VideoEmbedPreview url={youtubeUrl} platform="youtube" className="custom-preview" />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-preview');
  });

  it('shows external link indicator when showEmbed is false', () => {
    const { container } = render(
      <VideoEmbedPreview url={youtubeUrl} platform="youtube" showEmbed={false} />
    );

    // External link indicator should be present (hidden by default, visible on hover)
    const externalIndicator = container.querySelector('[class*="top-2"][class*="right-2"]');
    expect(externalIndicator).toBeInTheDocument();
  });

  it('embeds youtube with autoplay', () => {
    render(<VideoEmbedPreview url={youtubeUrl} platform="youtube" showEmbed={true} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const iframe = screen.getByTitle(/video/i);
    expect(iframe).toHaveAttribute('src', expect.stringContaining('autoplay=1'));
  });
});

describe('VideoThumbnail', () => {
  const mockWindowOpen = jest.fn();
  const originalWindowOpen = window.open;

  beforeAll(() => {
    window.open = mockWindowOpen;
  });

  afterAll(() => {
    window.open = originalWindowOpen;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

  it('renders with default size', () => {
    const { container } = render(<VideoThumbnail url={youtubeUrl} platform="youtube" />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('h-24', 'w-36');
  });

  it('renders small size', () => {
    const { container } = render(<VideoThumbnail url={youtubeUrl} platform="youtube" size="sm" />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('h-16', 'w-24');
  });

  it('renders large size', () => {
    const { container } = render(<VideoThumbnail url={youtubeUrl} platform="youtube" size="lg" />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('h-32', 'w-48');
  });

  it('opens video in new tab on click', () => {
    render(<VideoThumbnail url={youtubeUrl} platform="youtube" />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockWindowOpen).toHaveBeenCalledWith(youtubeUrl, '_blank', 'noopener,noreferrer');
  });

  it('calls custom onClick handler when provided', () => {
    const onClick = jest.fn();
    render(<VideoThumbnail url={youtubeUrl} platform="youtube" onClick={onClick} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalled();
    expect(mockWindowOpen).not.toHaveBeenCalled();
  });

  it('handles keyboard navigation', () => {
    const onClick = jest.fn();
    render(<VideoThumbnail url={youtubeUrl} platform="youtube" onClick={onClick} />);

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });

    expect(onClick).toHaveBeenCalled();
  });

  it('has proper accessibility label', () => {
    render(<VideoThumbnail url={youtubeUrl} platform="youtube" />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Play video');
  });

  it('is focusable', () => {
    render(<VideoThumbnail url={youtubeUrl} platform="youtube" />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('tabIndex', '0');
  });
});

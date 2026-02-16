import { render } from '@testing-library/react';
import {
  InstagramIcon,
  TikTokIcon,
  TwitterIcon,
  YoutubeIcon,
  SOCIAL_BRAND_COLORS,
} from '@/components/ui/social-icons';

describe('InstagramIcon', () => {
  it('renders with default className', () => {
    const { container } = render(<InstagramIcon />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-5', 'w-5');
  });

  it('renders with custom className', () => {
    const { container } = render(<InstagramIcon className="h-8 w-8" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-8', 'w-8');
  });

  it('renders svg element', () => {
    const { container } = render(<InstagramIcon />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('has viewBox attribute', () => {
    const { container } = render(<InstagramIcon />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it('has fill="currentColor"', () => {
    const { container } = render(<InstagramIcon />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('fill', 'currentColor');
  });
});

describe('TikTokIcon', () => {
  it('renders with default className', () => {
    const { container } = render(<TikTokIcon />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-5', 'w-5');
  });

  it('renders with custom className', () => {
    const { container } = render(<TikTokIcon className="h-6 w-6" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-6', 'w-6');
  });

  it('renders svg element', () => {
    const { container } = render(<TikTokIcon />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('TwitterIcon', () => {
  it('renders with default className', () => {
    const { container } = render(<TwitterIcon />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-5', 'w-5');
  });

  it('renders with custom className', () => {
    const { container } = render(<TwitterIcon className="h-4 w-4" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-4', 'w-4');
  });

  it('renders svg element', () => {
    const { container } = render(<TwitterIcon />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('YoutubeIcon', () => {
  it('renders with default className', () => {
    const { container } = render(<YoutubeIcon />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-5', 'w-5');
  });

  it('renders with custom className', () => {
    const { container } = render(<YoutubeIcon className="h-10 w-10" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-10', 'w-10');
  });

  it('renders svg element', () => {
    const { container } = render(<YoutubeIcon />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('SOCIAL_BRAND_COLORS', () => {
  it('has Instagram colors', () => {
    expect(SOCIAL_BRAND_COLORS.INSTAGRAM.from).toBe('#E4405F');
    expect(SOCIAL_BRAND_COLORS.INSTAGRAM.to).toBe('#F77737');
    expect(SOCIAL_BRAND_COLORS.INSTAGRAM.gradient).toContain('linear-gradient');
  });

  it('has TikTok colors', () => {
    expect(SOCIAL_BRAND_COLORS.TIKTOK.bg).toBe('#000000');
  });

  it('has Twitter colors', () => {
    expect(SOCIAL_BRAND_COLORS.TWITTER.bg).toBe('#000000');
  });

  it('has YouTube colors', () => {
    expect(SOCIAL_BRAND_COLORS.YOUTUBE.bg).toBe('#FF0000');
  });
});

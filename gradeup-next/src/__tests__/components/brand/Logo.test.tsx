import { render, screen } from '@testing-library/react';
import { Logo, LogoIcon, LogoFull } from '@/components/brand/Logo';

describe('Logo', () => {
  it('renders with default props', () => {
    render(<Logo />);

    expect(screen.getByText('GradeUp')).toBeInTheDocument();
  });

  it('renders without text when showText is false', () => {
    render(<Logo showText={false} />);

    expect(screen.queryByText('GradeUp')).not.toBeInTheDocument();
  });

  it('renders different size variants', () => {
    const { rerender, container } = render(<Logo size="sm" />);
    let svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');

    rerender(<Logo size="md" />);
    svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '32');

    rerender(<Logo size="lg" />);
    svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '40');

    rerender(<Logo size="xl" />);
    svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '56');
  });

  it('applies gradient variant styling', () => {
    render(<Logo variant="gradient" />);

    const text = screen.getByText('GradeUp');
    expect(text).toHaveClass('bg-gradient-to-r');
    expect(text).toHaveClass('text-transparent');
  });

  it('applies white variant styling', () => {
    render(<Logo variant="white" />);

    const text = screen.getByText('GradeUp');
    expect(text).toHaveClass('text-white');
  });

  it('applies dark variant styling', () => {
    render(<Logo variant="dark" />);

    const text = screen.getByText('GradeUp');
    expect(text).toHaveClass('text-gray-900');
  });

  it('applies custom className', () => {
    const { container } = render(<Logo className="custom-logo" />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-logo');
  });

  it('has flex layout', () => {
    const { container } = render(<Logo />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'items-center');
  });
});

describe('LogoIcon', () => {
  it('renders svg element', () => {
    const { container } = render(<LogoIcon />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders with default size', () => {
    const { container } = render(<LogoIcon />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });

  it('renders with custom size', () => {
    const { container } = render(<LogoIcon size={48} />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '48');
    expect(svg).toHaveAttribute('height', '48');
  });

  it('renders gradient variant with defs', () => {
    const { container } = render(<LogoIcon variant="gradient" />);

    const defs = container.querySelector('defs');
    expect(defs).toBeInTheDocument();
  });

  it('renders white variant without gradient defs', () => {
    const { container } = render(<LogoIcon variant="white" />);

    // White variant should not have gradient defs
    const linearGradient = container.querySelector('linearGradient');
    expect(linearGradient).not.toBeInTheDocument();
  });

  it('renders dark variant without gradient defs', () => {
    const { container } = render(<LogoIcon variant="dark" />);

    // Dark variant should not have gradient defs
    const linearGradient = container.querySelector('linearGradient');
    expect(linearGradient).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<LogoIcon className="custom-icon" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-icon');
  });

  it('has proper viewBox', () => {
    const { container } = render(<LogoIcon />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 32 32');
  });
});

describe('LogoFull', () => {
  it('renders logo with tagline', () => {
    render(<LogoFull />);

    expect(screen.getByText('GradeUp')).toBeInTheDocument();
    expect(screen.getByText('Your GPA Is Worth Money')).toBeInTheDocument();
  });

  it('applies gradient variant to tagline', () => {
    render(<LogoFull variant="gradient" />);

    const tagline = screen.getByText('Your GPA Is Worth Money');
    expect(tagline).toHaveClass('text-[#00f0ff]/70');
  });

  it('applies white variant to tagline', () => {
    render(<LogoFull variant="white" />);

    const tagline = screen.getByText('Your GPA Is Worth Money');
    expect(tagline).toHaveClass('text-white/70');
  });

  it('applies dark variant to tagline', () => {
    render(<LogoFull variant="dark" />);

    const tagline = screen.getByText('Your GPA Is Worth Money');
    expect(tagline).toHaveClass('text-gray-600');
  });

  it('has flex column layout', () => {
    const { container } = render(<LogoFull />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center');
  });

  it('applies custom className', () => {
    const { container } = render(<LogoFull className="custom-full-logo" />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-full-logo');
  });
});

import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

describe('Card', () => {
  it('renders children correctly', () => {
    render(<Card>Card Content</Card>);

    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('renders different variants', () => {
    const { rerender } = render(<Card variant="default">Default</Card>);
    expect(screen.getByText('Default')).toHaveClass('bg-[var(--bg-card)]');

    rerender(<Card variant="glass">Glass</Card>);
    expect(screen.getByText('Glass')).toHaveClass('glass-premium');

    rerender(<Card variant="glow">Glow</Card>);
    expect(screen.getByText('Glow')).toHaveClass('border-[var(--color-primary)]');
  });

  it('applies hover styles when hover prop is true', () => {
    render(<Card hover>Hoverable</Card>);

    const card = screen.getByText('Hoverable');
    expect(card).toHaveClass('hover:bg-[var(--bg-card-hover)]');
  });

  it('does not apply hover styles by default', () => {
    render(<Card>No Hover</Card>);

    const card = screen.getByText('No Hover');
    expect(card.className).not.toContain('hover:bg-[var(--bg-card-hover)]');
  });

  it('applies custom className', () => {
    render(<Card className="custom-card">Custom</Card>);

    expect(screen.getByText('Custom')).toHaveClass('custom-card');
  });

  it('forwards ref correctly', () => {
    const ref = jest.fn();
    render(<Card ref={ref}>With Ref</Card>);

    expect(ref).toHaveBeenCalled();
  });
});

describe('CardHeader', () => {
  it('renders children correctly', () => {
    render(<CardHeader>Header Content</CardHeader>);

    expect(screen.getByText('Header Content')).toBeInTheDocument();
  });

  it('has flex column layout', () => {
    render(<CardHeader>Header</CardHeader>);

    expect(screen.getByText('Header')).toHaveClass('flex', 'flex-col');
  });

  it('applies custom className', () => {
    render(<CardHeader className="custom-header">Header</CardHeader>);

    expect(screen.getByText('Header')).toHaveClass('custom-header');
  });
});

describe('CardTitle', () => {
  it('renders as h3 element', () => {
    render(<CardTitle>Title</CardTitle>);

    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toHaveTextContent('Title');
  });

  it('applies correct typography styles', () => {
    render(<CardTitle>Title</CardTitle>);

    expect(screen.getByText('Title')).toHaveClass('text-lg', 'font-semibold');
  });

  it('applies custom className', () => {
    render(<CardTitle className="custom-title">Title</CardTitle>);

    expect(screen.getByText('Title')).toHaveClass('custom-title');
  });
});

describe('CardDescription', () => {
  it('renders as paragraph element', () => {
    render(<CardDescription>Description</CardDescription>);

    const desc = screen.getByText('Description');
    expect(desc.tagName).toBe('P');
  });

  it('applies muted text styling', () => {
    render(<CardDescription>Description</CardDescription>);

    expect(screen.getByText('Description')).toHaveClass('text-sm', 'text-[var(--text-muted)]');
  });

  it('applies custom className', () => {
    render(<CardDescription className="custom-desc">Description</CardDescription>);

    expect(screen.getByText('Description')).toHaveClass('custom-desc');
  });
});

describe('CardContent', () => {
  it('renders children correctly', () => {
    render(<CardContent>Content</CardContent>);

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<CardContent className="custom-content">Content</CardContent>);

    expect(screen.getByText('Content')).toHaveClass('custom-content');
  });
});

describe('CardFooter', () => {
  it('renders children correctly', () => {
    render(<CardFooter>Footer</CardFooter>);

    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('has flex layout with border', () => {
    render(<CardFooter>Footer</CardFooter>);

    const footer = screen.getByText('Footer');
    expect(footer).toHaveClass('flex', 'items-center', 'border-t');
  });

  it('applies custom className', () => {
    render(<CardFooter className="custom-footer">Footer</CardFooter>);

    expect(screen.getByText('Footer')).toHaveClass('custom-footer');
  });
});

describe('Card Composition', () => {
  it('renders full card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
          <CardDescription>A test card description</CardDescription>
        </CardHeader>
        <CardContent>Main content goes here</CardContent>
        <CardFooter>Footer actions</CardFooter>
      </Card>
    );

    expect(screen.getByRole('heading', { name: /test card/i })).toBeInTheDocument();
    expect(screen.getByText('A test card description')).toBeInTheDocument();
    expect(screen.getByText('Main content goes here')).toBeInTheDocument();
    expect(screen.getByText('Footer actions')).toBeInTheDocument();
  });
});

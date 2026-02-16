import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '@/components/ui/pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    totalItems: 100,
    itemsPerPage: 10,
    onPageChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders pagination component', () => {
    render(<Pagination {...defaultProps} />);

    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
  });

  it('shows results info', () => {
    render(<Pagination {...defaultProps} />);

    expect(screen.getByText(/showing/i)).toBeInTheDocument();
    expect(screen.getByText(/results/i)).toBeInTheDocument();
  });

  it('renders previous button', () => {
    render(<Pagination {...defaultProps} />);

    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
  });

  it('renders next button', () => {
    render(<Pagination {...defaultProps} />);

    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />);

    const prevButton = screen.getByRole('button', { name: /previous/i });
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination {...defaultProps} currentPage={10} />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();
  });

  it('calls onPageChange when next is clicked', () => {
    const onPageChange = jest.fn();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange when previous is clicked', () => {
    const onPageChange = jest.fn();
    render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);

    const prevButton = screen.getByRole('button', { name: /previous/i });
    fireEvent.click(prevButton);

    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('calls onPageChange when page number is clicked', () => {
    const onPageChange = jest.fn();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />);

    const page2Button = screen.getByRole('button', { name: /page 2/i });
    fireEvent.click(page2Button);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('marks current page with aria-current', () => {
    render(<Pagination {...defaultProps} currentPage={3} />);

    const currentPageButton = screen.getByRole('button', { name: /page 3/i });
    expect(currentPageButton).toHaveAttribute('aria-current', 'page');
  });

  it('shows ellipsis for many pages', () => {
    render(<Pagination {...defaultProps} totalPages={20} currentPage={10} />);

    const dots = screen.getAllByText('...');
    expect(dots.length).toBeGreaterThan(0);
  });

  it('returns null when totalItems is 0', () => {
    const { container } = render(<Pagination {...defaultProps} totalItems={0} />);

    expect(container.firstChild).toBeNull();
  });

  it('calculates correct range for last page', () => {
    render(<Pagination {...defaultProps} currentPage={10} totalItems={95} />);

    // The pagination info shows "91 - 95 of 95 results"
    expect(screen.getByText(/91/)).toBeInTheDocument();
    expect(screen.getByText(/results/)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Pagination {...defaultProps} className="custom-pagination" />);

    expect(container.firstChild).toHaveClass('custom-pagination');
  });

  it('renders correct number of page buttons for small total', () => {
    render(<Pagination {...defaultProps} totalPages={3} />);

    expect(screen.getByRole('button', { name: /page 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /page 2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /page 3/i })).toBeInTheDocument();
  });
});

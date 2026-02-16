import { render, screen, fireEvent } from '@testing-library/react';
import {
  EmptyState,
  NoDeals,
  NoMessages,
  NoEarnings,
  NoAthletes,
  NoCampaigns,
  NoOpportunities,
  NoResults,
  NoNotifications,
  NoContent,
} from '@/components/ui/empty-state';
import { Inbox } from 'lucide-react';

describe('EmptyState', () => {
  it('renders with title', () => {
    render(<EmptyState title="No items found" />);

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(
      <EmptyState
        title="No items"
        description="There are no items to display."
      />
    );

    expect(screen.getByText('There are no items to display.')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(<EmptyState title="Empty" icon={Inbox} />);

    // Icon is inside a container with aria-hidden
    const iconContainer = document.querySelector('[aria-hidden="true"]');
    expect(iconContainer).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const handleClick = jest.fn();
    render(
      <EmptyState
        title="No items"
        action={{
          label: 'Add Item',
          onClick: handleClick,
        }}
      />
    );

    const button = screen.getByRole('button', { name: /add item/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when not provided', () => {
    render(<EmptyState title="No items" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<EmptyState title="Empty state" />);

    const container = screen.getByRole('status');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });

  it('applies custom className', () => {
    render(<EmptyState title="Test" className="custom-class" />);

    expect(screen.getByRole('status')).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<EmptyState title="Test" ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('NoDeals', () => {
  it('renders with default content', () => {
    render(<NoDeals />);

    expect(screen.getByText('No deals yet')).toBeInTheDocument();
    expect(screen.getByText(/explore opportunities/i)).toBeInTheDocument();
  });

  it('renders explore button when onExplore is provided', () => {
    const handleExplore = jest.fn();
    render(<NoDeals onExplore={handleExplore} />);

    const button = screen.getByRole('button', { name: /explore opportunities/i });
    fireEvent.click(button);
    expect(handleExplore).toHaveBeenCalledTimes(1);
  });

  it('does not render button when onExplore is not provided', () => {
    render(<NoDeals />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('NoMessages', () => {
  it('renders with default content', () => {
    render(<NoMessages />);

    expect(screen.getByText('No messages')).toBeInTheDocument();
    expect(screen.getByText(/inbox is empty/i)).toBeInTheDocument();
  });

  it('renders start conversation button when callback is provided', () => {
    const handleStart = jest.fn();
    render(<NoMessages onStartConversation={handleStart} />);

    const button = screen.getByRole('button', { name: /start a conversation/i });
    fireEvent.click(button);
    expect(handleStart).toHaveBeenCalledTimes(1);
  });
});

describe('NoEarnings', () => {
  it('renders with default content', () => {
    render(<NoEarnings />);

    expect(screen.getByText('No earnings yet')).toBeInTheDocument();
    expect(screen.getByText(/complete deals/i)).toBeInTheDocument();
  });

  it('does not render action button', () => {
    render(<NoEarnings />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('NoAthletes', () => {
  it('renders with default content', () => {
    render(<NoAthletes />);

    expect(screen.getByText('No athletes found')).toBeInTheDocument();
    expect(screen.getByText(/invite athletes/i)).toBeInTheDocument();
  });

  it('renders invite button when onInvite is provided', () => {
    const handleInvite = jest.fn();
    render(<NoAthletes onInvite={handleInvite} />);

    const button = screen.getByRole('button', { name: /invite athletes/i });
    fireEvent.click(button);
    expect(handleInvite).toHaveBeenCalledTimes(1);
  });
});

describe('NoCampaigns', () => {
  it('renders with default content', () => {
    render(<NoCampaigns />);

    expect(screen.getByText('No campaigns yet')).toBeInTheDocument();
    expect(screen.getByText(/create your first campaign/i)).toBeInTheDocument();
  });

  it('renders create button when onCreate is provided', () => {
    const handleCreate = jest.fn();
    render(<NoCampaigns onCreate={handleCreate} />);

    const button = screen.getByRole('button', { name: /create campaign/i });
    fireEvent.click(button);
    expect(handleCreate).toHaveBeenCalledTimes(1);
  });
});

describe('NoOpportunities', () => {
  it('renders with default content', () => {
    render(<NoOpportunities />);

    expect(screen.getByText('No opportunities available')).toBeInTheDocument();
    expect(screen.getByText(/check back later/i)).toBeInTheDocument();
  });
});

describe('NoResults', () => {
  it('renders with default content when no query', () => {
    render(<NoResults />);

    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText(/couldn't find any results/i)).toBeInTheDocument();
  });

  it('includes query in description when provided', () => {
    render(<NoResults query="basketball" />);

    expect(screen.getByText(/couldn't find anything matching "basketball"/i)).toBeInTheDocument();
  });
});

describe('NoNotifications', () => {
  it('renders with default content', () => {
    render(<NoNotifications />);

    expect(screen.getByText('No notifications')).toBeInTheDocument();
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });
});

describe('NoContent', () => {
  it('renders with default content', () => {
    render(<NoContent />);

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText(/this section is empty/i)).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<NoContent title="No data available" />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders with custom description', () => {
    render(<NoContent description="Custom empty description." />);

    expect(screen.getByText('Custom empty description.')).toBeInTheDocument();
  });
});

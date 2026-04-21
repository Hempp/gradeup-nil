'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Search,
  Home,
  User,
  FileText,
  DollarSign,
  MessageSquare,
  Settings,
  Users,
  Target,
  TrendingUp,
  Shield,
  BarChart3,
  Megaphone,
  Compass,
  Bell,
  X,
  ArrowRight,
  Command,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND PALETTE COMPONENT
// Keyboard-driven navigation and command interface (Cmd+K / Ctrl+K)
// ═══════════════════════════════════════════════════════════════════════════

export interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  href?: string;
  action?: () => void;
  keywords?: string[];
  category?: string;
}

interface CommandPaletteProps {
  /** Items to display in the palette */
  items?: CommandItem[];
  /** Current user role for filtering */
  role?: 'athlete' | 'brand' | 'director' | 'admin';
  /** Custom placeholder text */
  placeholder?: string;
  /** External control - is open */
  isOpen?: boolean;
  /** External control - close callback */
  onClose?: () => void;
}

// Default navigation items by role
const getDefaultItems = (role: string): CommandItem[] => {
  const commonItems: CommandItem[] = [
    {
      id: 'messages',
      title: 'Messages',
      description: 'View your conversations',
      icon: <MessageSquare className="h-4 w-4" />,
      href: `/${role}/messages`,
      keywords: ['chat', 'inbox', 'conversations'],
      category: 'Navigation',
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Account and preferences',
      icon: <Settings className="h-4 w-4" />,
      href: `/${role}/settings`,
      keywords: ['preferences', 'account', 'profile'],
      category: 'Navigation',
    },
  ];

  const athleteItems: CommandItem[] = [
    {
      id: 'athlete-dashboard',
      title: 'Dashboard',
      description: 'View your NIL overview',
      icon: <Home className="h-4 w-4" />,
      href: '/athlete/dashboard',
      keywords: ['home', 'overview', 'main'],
      category: 'Navigation',
    },
    {
      id: 'athlete-profile',
      title: 'Profile',
      description: 'Edit your athlete profile',
      icon: <User className="h-4 w-4" />,
      href: '/athlete/profile',
      keywords: ['bio', 'information', 'edit'],
      category: 'Navigation',
    },
    {
      id: 'athlete-deals',
      title: 'Deals',
      description: 'View and manage your deals',
      icon: <FileText className="h-4 w-4" />,
      href: '/athlete/deals',
      keywords: ['contracts', 'opportunities', 'partnerships'],
      category: 'Navigation',
    },
    {
      id: 'athlete-earnings',
      title: 'Earnings',
      description: 'Track your NIL earnings',
      icon: <DollarSign className="h-4 w-4" />,
      href: '/athlete/earnings',
      keywords: ['money', 'income', 'revenue', 'payments'],
      category: 'Navigation',
    },
  ];

  const brandItems: CommandItem[] = [
    {
      id: 'brand-dashboard',
      title: 'Dashboard',
      description: 'View your brand overview',
      icon: <Home className="h-4 w-4" />,
      href: '/brand/dashboard',
      keywords: ['home', 'overview', 'main'],
      category: 'Navigation',
    },
    {
      id: 'brand-discover',
      title: 'Discover Athletes',
      description: 'Find athletes for partnerships',
      icon: <Compass className="h-4 w-4" />,
      href: '/brand/discover',
      keywords: ['search', 'find', 'browse', 'athletes'],
      category: 'Navigation',
    },
    {
      id: 'brand-campaigns',
      title: 'Campaigns',
      description: 'Manage your campaigns',
      icon: <Megaphone className="h-4 w-4" />,
      href: '/brand/campaigns',
      keywords: ['marketing', 'promotions'],
      category: 'Navigation',
    },
    {
      id: 'brand-deals',
      title: 'Deals',
      description: 'View partnership deals',
      icon: <FileText className="h-4 w-4" />,
      href: '/brand/deals',
      keywords: ['contracts', 'partnerships'],
      category: 'Navigation',
    },
    {
      id: 'brand-analytics',
      title: 'Analytics',
      description: 'View performance metrics',
      icon: <BarChart3 className="h-4 w-4" />,
      href: '/brand/analytics',
      keywords: ['stats', 'reports', 'data'],
      category: 'Navigation',
    },
  ];

  const directorItems: CommandItem[] = [
    {
      id: 'director-dashboard',
      title: 'Dashboard',
      description: 'Program overview',
      icon: <Home className="h-4 w-4" />,
      href: '/director/dashboard',
      keywords: ['home', 'overview', 'main'],
      category: 'Navigation',
    },
    {
      id: 'director-athletes',
      title: 'Athletes',
      description: 'Manage school athletes',
      icon: <Users className="h-4 w-4" />,
      href: '/director/athletes',
      keywords: ['roster', 'team', 'students'],
      category: 'Navigation',
    },
    {
      id: 'director-compliance',
      title: 'Compliance',
      description: 'Review compliance alerts',
      icon: <Shield className="h-4 w-4" />,
      href: '/director/compliance',
      keywords: ['rules', 'ncaa', 'verification'],
      category: 'Navigation',
    },
    {
      id: 'director-analytics',
      title: 'Analytics',
      description: 'Program performance',
      icon: <TrendingUp className="h-4 w-4" />,
      href: '/director/analytics',
      keywords: ['stats', 'reports', 'data'],
      category: 'Navigation',
    },
  ];

  switch (role) {
    case 'athlete':
      return [...athleteItems, ...commonItems];
    case 'brand':
      return [...brandItems, ...commonItems];
    case 'director':
      return [...directorItems, ...commonItems];
    default:
      return commonItems;
  }
};

export function CommandPalette({
  items: customItems,
  role = 'athlete',
  placeholder = 'Search or jump to...',
  isOpen: externalIsOpen,
  onClose: externalOnClose,
}: CommandPaletteProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnClose
    ? (value: boolean) => { if (!value) externalOnClose(); else setInternalIsOpen(value); }
    : setInternalIsOpen;
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Combine custom items with default items
  const allItems = customItems || getDefaultItems(role);

  // Filter items based on search
  const filteredItems = search
    ? allItems.filter((item) => {
        const searchLower = search.toLowerCase();
        return (
          item.title.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.keywords?.some((k) => k.toLowerCase().includes(searchLower))
        );
      })
    : allItems;

  // Group items by category
  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      const category = item.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, CommandItem[]>
  );

  // Flatten for keyboard navigation
  const flatItems = Object.values(groupedItems).flat();

  // Open/close handlers
  const open = useCallback(() => {
    setIsOpen(true);
    setSearch('');
    setSelectedIndex(0);
  }, [setIsOpen, setSearch, setSelectedIndex]);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch('');
    setSelectedIndex(0);
  }, [setIsOpen, setSearch, setSelectedIndex]);

  // Execute item action
  const executeItem = useCallback(
    (item: CommandItem) => {
      close();
      if (item.href) {
        router.push(item.href);
      } else if (item.action) {
        item.action();
      }
    },
    [close, router]
  );

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, open, close]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && flatItems.length > 0) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, flatItems.length]);

  // Handle keyboard navigation in list
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          executeItem(flatItems[selectedIndex]);
        }
        break;
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in-0 duration-150"
        onClick={close}
        aria-hidden="true"
      />

      {/* Palette */}
      <div
        className="fixed inset-x-3 bottom-0 sm:bottom-auto sm:inset-x-auto sm:top-[20%] sm:left-1/2 sm:-translate-x-1/2 w-auto sm:w-full max-w-xl z-50 animate-in fade-in-0 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="bg-[var(--bg-card)] rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] shadow-2xl border border-[var(--border-color)] overflow-hidden max-h-[70vh] sm:max-h-[60vh]">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)]">
            <Search className="h-5 w-5 text-[var(--text-muted)] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none text-base"
              aria-label="Search commands"
              aria-autocomplete="list"
              aria-controls="command-list"
            />
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded text-[10px] font-medium">
                ESC
              </kbd>
              <span>to close</span>
            </div>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            id="command-list"
            role="listbox"
            className="max-h-[400px] overflow-y-auto p-2"
          >
            {flatItems.length === 0 ? (
              <div className="py-8 text-center text-[var(--text-muted)]">
                No results found for &quot;{search}&quot;
              </div>
            ) : (
              Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="mb-2 last:mb-0">
                  <div className="px-2 py-1.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    {category}
                  </div>
                  {items.map((item) => {
                    const itemIndex = flatItems.indexOf(item);
                    const isSelected = itemIndex === selectedIndex;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-index={itemIndex}
                        onClick={() => executeItem(item)}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        role="option"
                        aria-selected={isSelected}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] transition-colors',
                          isSelected
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                        )}
                      >
                        <span
                          className={cn(
                            'flex-shrink-0',
                            isSelected
                              ? 'text-white'
                              : 'text-[var(--text-muted)]'
                          )}
                        >
                          {item.icon}
                        </span>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{item.title}</p>
                          {item.description && (
                            <p
                              className={cn(
                                'text-sm',
                                isSelected
                                  ? 'text-white/70'
                                  : 'text-[var(--text-muted)]'
                              )}
                            >
                              {item.description}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <ArrowRight className="h-4 w-4 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-[var(--bg-tertiary)] rounded text-[10px]">
                    ↑↓
                  </kbd>
                  <span>Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-[var(--bg-tertiary)] rounded text-[10px]">
                    ↵
                  </kbd>
                  <span>Select</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Command className="h-3 w-3" />
                <span>+</span>
                <kbd className="px-1 py-0.5 bg-[var(--bg-tertiary)] rounded text-[10px]">
                  K
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND PALETTE TRIGGER BUTTON
// Button to open the command palette (for users who prefer clicking)
// ═══════════════════════════════════════════════════════════════════════════

interface CommandPaletteTriggerProps {
  onClick: () => void;
  className?: string;
}

export function CommandPaletteTrigger({
  onClick,
  className,
}: CommandPaletteTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)]',
        'bg-[var(--bg-tertiary)] border border-[var(--border-color)]',
        'text-sm text-[var(--text-muted)]',
        'hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-color-hover)]',
        'transition-colors',
        className
      )}
      aria-label="Open command palette"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px] font-medium ml-2">
        <Command className="h-2.5 w-2.5" />K
      </kbd>
    </button>
  );
}

export default CommandPalette;

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from './button';

// ═══════════════════════════════════════════════════════════════════════════
// DATE RANGE PICKER COMPONENT
// Comprehensive date selection for analytics dashboards
// ═══════════════════════════════════════════════════════════════════════════

export type DatePreset = '7d' | '30d' | '90d' | '12m' | 'all' | 'custom';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface DateRangePickerProps {
  /** Current date range value */
  value: DateRange;
  /** Callback when date range changes */
  onChange: (range: DateRange) => void;
  /** Currently selected preset */
  preset?: DatePreset;
  /** Callback when preset is selected */
  onPresetChange?: (preset: DatePreset) => void;
  /** Available presets (default: all) */
  presets?: DatePreset[];
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Disabled state */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Additional class names */
  className?: string;
}

// Preset labels for display
const presetLabels: Record<DatePreset, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '12m': 'Last 12 months',
  'all': 'All time',
  'custom': 'Custom range',
};

// Calculate preset dates
function getPresetDates(preset: DatePreset): DateRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  switch (preset) {
    case '7d': {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case '30d': {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case '90d': {
      const start = new Date();
      start.setDate(start.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case '12m': {
      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case 'all':
    default:
      return { start: null, end: null };
  }
}

// Format date for display
function formatDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Get days in month
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Get first day of month (0 = Sunday)
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function DateRangePicker({
  value,
  onChange,
  preset = '30d',
  onPresetChange,
  presets = ['7d', '30d', '90d', '12m', 'all'],
  minDate,
  maxDate = new Date(),
  disabled = false,
  placeholder = 'Select date range',
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectingStart, setSelectingStart] = useState(true);
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCalendar(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle preset selection
  const handlePresetSelect = useCallback((selectedPreset: DatePreset) => {
    if (selectedPreset === 'custom') {
      setShowCalendar(true);
      setSelectingStart(true);
      setTempStart(null);
    } else {
      const range = getPresetDates(selectedPreset);
      onChange(range);
      onPresetChange?.(selectedPreset);
      setIsOpen(false);
      setShowCalendar(false);
    }
  }, [onChange, onPresetChange]);

  // Handle calendar day click
  const handleDayClick = useCallback((day: number) => {
    const selectedDate = new Date(calendarYear, calendarMonth, day);
    selectedDate.setHours(selectingStart ? 0 : 23, selectingStart ? 0 : 59, selectingStart ? 0 : 59, selectingStart ? 0 : 999);

    if (selectingStart) {
      setTempStart(selectedDate);
      setSelectingStart(false);
    } else {
      // Ensure start is before end
      const start = tempStart!;
      const end = selectedDate;
      if (start > end) {
        onChange({ start: end, end: start });
      } else {
        onChange({ start, end });
      }
      onPresetChange?.('custom');
      setIsOpen(false);
      setShowCalendar(false);
      setTempStart(null);
      setSelectingStart(true);
    }
  }, [calendarYear, calendarMonth, selectingStart, tempStart, onChange, onPresetChange]);

  // Navigate calendar
  const previousMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  // Check if date is in range
  const isInRange = (day: number): boolean => {
    const date = new Date(calendarYear, calendarMonth, day);
    if (!value.start || !value.end) return false;
    return date >= value.start && date <= value.end;
  };

  // Check if date is start or end
  const isStartOrEnd = (day: number): 'start' | 'end' | null => {
    const date = new Date(calendarYear, calendarMonth, day);
    if (value.start && date.toDateString() === value.start.toDateString()) return 'start';
    if (value.end && date.toDateString() === value.end.toDateString()) return 'end';
    if (tempStart && date.toDateString() === tempStart.toDateString()) return 'start';
    return null;
  };

  // Check if date is selectable
  const isSelectable = (day: number): boolean => {
    const date = new Date(calendarYear, calendarMonth, day);
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    return true;
  };

  // Generate calendar days
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  const days = [];

  // Empty cells for days before first of month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-8" />);
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const selectable = isSelectable(day);
    const inRange = isInRange(day);
    const position = isStartOrEnd(day);

    days.push(
      <button
        key={day}
        type="button"
        disabled={!selectable}
        onClick={() => selectable && handleDayClick(day)}
        className={cn(
          'h-9 w-9 min-h-[44px] min-w-[44px] rounded-full text-sm font-medium transition-colors touch-manipulation',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1',
          !selectable && 'text-[var(--text-muted)] cursor-not-allowed opacity-50',
          selectable && !inRange && !position && 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]',
          inRange && !position && 'bg-[var(--color-primary-muted)] text-[var(--text-primary)]',
          position === 'start' && 'bg-[var(--color-primary)] text-white',
          position === 'end' && 'bg-[var(--color-primary)] text-white'
        )}
      >
        {day}
      </button>
    );
  }

  // Display value
  const displayValue = value.start && value.end
    ? `${formatDate(value.start)} - ${formatDate(value.end)}`
    : value.start
    ? `${formatDate(value.start)} - ...`
    : preset !== 'custom'
    ? presetLabels[preset]
    : placeholder;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 h-10 px-3 rounded-[var(--radius-md)]',
          'bg-[var(--bg-card)] border border-[var(--border-color)]',
          'text-sm text-[var(--text-primary)]',
          'hover:border-[var(--border-color-hover)] transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary-muted)]'
        )}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
        <span className="flex-1 text-left truncate">{displayValue}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-full left-0 mt-1 z-50',
            'bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)]',
            'shadow-lg animate-in fade-in-0 zoom-in-95 duration-150',
            showCalendar ? 'w-[min(320px,calc(100vw-2rem))]' : 'w-[200px]'
          )}
          role="dialog"
          aria-label="Select date range"
        >
          {!showCalendar ? (
            // Preset selection
            <div className="p-2">
              <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-2 py-1">
                Quick select
              </div>
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePresetSelect(p)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-[var(--radius-md)] text-sm',
                    'transition-colors',
                    preset === p
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  )}
                >
                  {presetLabels[p]}
                </button>
              ))}
              <div className="border-t border-[var(--border-color)] my-2" />
              <button
                type="button"
                onClick={() => handlePresetSelect('custom')}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-[var(--radius-md)] text-sm',
                  'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors'
                )}
              >
                Custom range...
              </button>
            </div>
          ) : (
            // Calendar view
            <div className="p-3">
              {/* Calendar header */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={previousMonth}
                  className="h-9 w-9 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] touch-manipulation"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="h-9 w-9 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] touch-manipulation"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Selection indicator */}
              <div className="text-xs text-center text-[var(--text-muted)] mb-2">
                {selectingStart ? 'Select start date' : 'Select end date'}
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                  <div
                    key={day}
                    className="h-8 flex items-center justify-center text-xs font-medium text-[var(--text-muted)]"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">{days}</div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => {
                    setShowCalendar(false);
                    setTempStart(null);
                    setSelectingStart(true);
                  }}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Back to presets
                </button>
                {tempStart && (
                  <span className="text-xs text-[var(--text-muted)]">
                    From: {formatDate(tempStart)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPACT DATE RANGE SELECTOR (for inline use)
// ═══════════════════════════════════════════════════════════════════════════

interface CompactDateSelectorProps {
  preset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  presets?: DatePreset[];
  disabled?: boolean;
  className?: string;
}

export function CompactDateSelector({
  preset,
  onPresetChange,
  presets = ['7d', '30d', '90d', '12m'],
  disabled = false,
  className,
}: CompactDateSelectorProps) {
  return (
    <div className={cn('flex items-center gap-1 p-1 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)]', className)}>
      {presets.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => !disabled && onPresetChange(p)}
          disabled={disabled}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] transition-colors',
            preset === p
              ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {p === 'all' ? 'All' : p}
        </button>
      ))}
    </div>
  );
}

export default DateRangePicker;

'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useId,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════════════════
   ONBOARDING TOUR TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export interface TourStep {
  /** Unique identifier for the step */
  id: string;
  /** CSS selector for the target element to highlight */
  target: string;
  /** Title of the tooltip */
  title: string;
  /** Description/content of the tooltip */
  content: string;
  /** Preferred placement of the tooltip */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Disable highlighting the target element */
  disableHighlight?: boolean;
  /** Custom spotlight padding around the target */
  spotlightPadding?: number;
}

export interface OnboardingTourConfig {
  /** Array of tour steps */
  steps: TourStep[];
  /** LocalStorage key for storing completion state */
  storageKey?: string;
  /** Callback when tour completes */
  onComplete?: () => void;
  /** Callback when tour is skipped */
  onSkip?: () => void;
  /** Callback when step changes */
  onStepChange?: (stepIndex: number, step: TourStep) => void;
  /** Show tour automatically on first visit */
  showOnFirstVisit?: boolean;
}

interface OnboardingTourContextValue {
  /** Start the onboarding tour */
  startTour: () => void;
  /** End/skip the tour */
  endTour: (completed?: boolean) => void;
  /** Go to next step */
  nextStep: () => void;
  /** Go to previous step */
  prevStep: () => void;
  /** Go to specific step */
  goToStep: (index: number) => void;
  /** Current step index (0-based) */
  currentStep: number;
  /** Whether tour is currently active */
  isActive: boolean;
  /** Whether user has completed or skipped the tour */
  isComplete: boolean;
  /** Total number of steps */
  totalSteps: number;
  /** Reset completion state */
  resetTour: () => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════════════════════ */

const CloseIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_OFFSET = 12;

/* ═══════════════════════════════════════════════════════════════════════════
   CONTEXT
   ═══════════════════════════════════════════════════════════════════════════ */

const OnboardingTourContext = createContext<OnboardingTourContextValue | null>(null);

/**
 * Hook to access onboarding tour state and controls
 */
export function useOnboardingTour(): OnboardingTourContextValue {
  const context = useContext(OnboardingTourContext);
  if (!context) {
    throw new Error('useOnboardingTour must be used within an OnboardingTourProvider');
  }
  return context;
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

function getStorageKey(key: string): string {
  return `onboarding-tour-${key}`;
}

function isComplete(storageKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(getStorageKey(storageKey)) === 'true';
  } catch {
    return false;
  }
}

function setComplete(storageKey: string, value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (value) {
      localStorage.setItem(getStorageKey(storageKey), 'true');
    } else {
      localStorage.removeItem(getStorageKey(storageKey));
    }
  } catch {
    // localStorage not available
  }
}

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getElementPosition(selector: string): Position | null {
  const element = document.querySelector(selector);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  };
}

function calculateTooltipPosition(
  targetPos: Position,
  tooltipSize: { width: number; height: number },
  placement: TourStep['placement'] = 'auto'
): { top: number; left: number; actualPlacement: 'top' | 'bottom' | 'left' | 'right' } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollY = window.scrollY;

  const targetCenter = {
    x: targetPos.left + targetPos.width / 2,
    y: targetPos.top + targetPos.height / 2,
  };

  // Calculate available space in each direction
  const spaceTop = targetPos.top - scrollY;
  const spaceBottom = viewportHeight - (targetPos.top - scrollY + targetPos.height);
  const spaceLeft = targetPos.left;
  const spaceRight = viewportWidth - (targetPos.left + targetPos.width);

  // Determine best placement
  let actualPlacement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

  if (placement === 'auto') {
    // Prefer bottom, then top, then right, then left
    if (spaceBottom >= tooltipSize.height + TOOLTIP_OFFSET) {
      actualPlacement = 'bottom';
    } else if (spaceTop >= tooltipSize.height + TOOLTIP_OFFSET) {
      actualPlacement = 'top';
    } else if (spaceRight >= tooltipSize.width + TOOLTIP_OFFSET) {
      actualPlacement = 'right';
    } else if (spaceLeft >= tooltipSize.width + TOOLTIP_OFFSET) {
      actualPlacement = 'left';
    }
  } else {
    actualPlacement = placement;
  }

  let top = 0;
  let left = 0;

  switch (actualPlacement) {
    case 'top':
      top = targetPos.top - tooltipSize.height - TOOLTIP_OFFSET;
      left = targetCenter.x - tooltipSize.width / 2;
      break;
    case 'bottom':
      top = targetPos.top + targetPos.height + TOOLTIP_OFFSET;
      left = targetCenter.x - tooltipSize.width / 2;
      break;
    case 'left':
      top = targetCenter.y - tooltipSize.height / 2;
      left = targetPos.left - tooltipSize.width - TOOLTIP_OFFSET;
      break;
    case 'right':
      top = targetCenter.y - tooltipSize.height / 2;
      left = targetPos.left + targetPos.width + TOOLTIP_OFFSET;
      break;
  }

  // Constrain to viewport
  left = Math.max(16, Math.min(left, viewportWidth - tooltipSize.width - 16));
  top = Math.max(scrollY + 16, Math.min(top, scrollY + viewportHeight - tooltipSize.height - 16));

  return { top, left, actualPlacement };
}

/* ═══════════════════════════════════════════════════════════════════════════
   SPOTLIGHT OVERLAY COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

interface SpotlightOverlayProps {
  targetPosition: Position | null;
  padding?: number;
  onClick?: () => void;
}

function SpotlightOverlay({ targetPosition, padding = SPOTLIGHT_PADDING, onClick }: SpotlightOverlayProps) {
  if (!targetPosition) {
    return (
      <div
        className="fixed inset-0 bg-black/60 z-[9998] transition-opacity duration-300"
        onClick={onClick}
        aria-hidden="true"
      />
    );
  }

  const spotlightRect = {
    x: targetPosition.left - padding,
    y: targetPosition.top - padding,
    width: targetPosition.width + padding * 2,
    height: targetPosition.height + padding * 2,
  };

  return (
    <svg
      className="fixed inset-0 w-full h-full z-[9998] pointer-events-none"
      style={{ height: document.documentElement.scrollHeight }}
      aria-hidden="true"
    >
      <defs>
        <mask id="spotlight-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <rect
            x={spotlightRect.x}
            y={spotlightRect.y}
            width={spotlightRect.width}
            height={spotlightRect.height}
            rx="8"
            ry="8"
            fill="black"
          />
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="rgba(0, 0, 0, 0.6)"
        mask="url(#spotlight-mask)"
        className="pointer-events-auto"
        onClick={onClick}
      />
      {/* Spotlight border glow */}
      <rect
        x={spotlightRect.x}
        y={spotlightRect.y}
        width={spotlightRect.width}
        height={spotlightRect.height}
        rx="8"
        ry="8"
        fill="none"
        stroke="var(--marketing-cyan)"
        strokeWidth="2"
        className="animate-pulse"
        style={{
          filter: 'drop-shadow(0 0 8px var(--marketing-cyan-glow))',
        }}
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOOLTIP COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

interface TourTooltipProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
  targetPosition: Position | null;
}

function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  targetPosition,
}: TourTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [actualPlacement, setActualPlacement] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');
  const [isVisible, setIsVisible] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;

  // Calculate position after tooltip renders
  useEffect(() => {
    if (!tooltipRef.current) return;

    const updatePosition = () => {
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();
      if (!tooltipRect) return;

      if (targetPosition) {
        const { top, left, actualPlacement: placement } = calculateTooltipPosition(
          targetPosition,
          { width: tooltipRect.width, height: tooltipRect.height },
          step.placement
        );
        setPosition({ top, left });
        setActualPlacement(placement);
      } else {
        // Center in viewport if no target
        setPosition({
          top: window.scrollY + window.innerHeight / 2 - tooltipRect.height / 2,
          left: window.innerWidth / 2 - tooltipRect.width / 2,
        });
      }

      setIsVisible(true);
    };

    // Small delay to ensure DOM measurements are accurate
    const timer = setTimeout(updatePosition, 50);
    return () => clearTimeout(timer);
  }, [targetPosition, step.placement]);

  // Scroll target into view
  useEffect(() => {
    if (targetPosition) {
      const targetTop = targetPosition.top;
      const targetBottom = targetTop + targetPosition.height;
      const viewportTop = window.scrollY;
      const viewportBottom = viewportTop + window.innerHeight;

      // Check if target is not fully visible
      if (targetTop < viewportTop + 100 || targetBottom > viewportBottom - 100) {
        window.scrollTo({
          top: targetTop - window.innerHeight / 3,
          behavior: 'smooth',
        });
      }
    }
  }, [targetPosition]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onSkip();
        break;
      case 'ArrowRight':
      case 'Enter':
        e.preventDefault();
        if (isLastStep) {
          onComplete();
        } else {
          onNext();
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (!isFirstStep) {
          onPrev();
        }
        break;
      case 'Tab':
        // Keep focus within tooltip
        const focusableElements = tooltipRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements && focusableElements.length > 0) {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
        break;
    }
  }, [isFirstStep, isLastStep, onNext, onPrev, onSkip, onComplete]);

  // Focus tooltip on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      tooltipRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [stepIndex]);

  // Arrow indicator based on placement
  const arrowClasses = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-transparent border-r-transparent border-b-transparent border-t-[var(--marketing-gray-900)]',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-transparent border-r-transparent border-t-transparent border-b-[var(--marketing-gray-900)]',
    left: 'right-0 top-1/2 -translate-y-1/2 translate-x-full border-t-transparent border-b-transparent border-r-transparent border-l-[var(--marketing-gray-900)]',
    right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-full border-t-transparent border-b-transparent border-l-transparent border-r-[var(--marketing-gray-900)]',
  };

  return (
    <div
      ref={tooltipRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className={cn(
        'fixed z-[9999] w-[340px] max-w-[calc(100vw-32px)]',
        'bg-[var(--marketing-gray-900)] border border-[var(--marketing-gray-700)]',
        'rounded-[var(--radius-xl)] shadow-2xl',
        'transition-all duration-300 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--marketing-gray-950)]',
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Arrow */}
      {targetPosition && (
        <div
          className={cn(
            'absolute w-0 h-0 border-8 border-solid',
            arrowClasses[actualPlacement]
          )}
          aria-hidden="true"
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-4 pb-2">
        <h3
          id={titleId}
          className="text-lg font-semibold text-white"
        >
          {step.title}
        </h3>
        <button
          type="button"
          onClick={onSkip}
          className={cn(
            'flex-shrink-0 p-1.5 rounded-[var(--radius-md)]',
            'text-[var(--marketing-gray-400)] hover:text-white',
            'hover:bg-[var(--marketing-gray-800)]',
            'transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-cyan)]'
          )}
          aria-label="Skip tour"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Content */}
      <div id={descriptionId} className="px-4 pb-4">
        <p className="text-[var(--marketing-gray-300)] text-sm leading-relaxed">
          {step.content}
        </p>

        {step.action && (
          <button
            type="button"
            onClick={step.action.onClick}
            className={cn(
              'mt-3 text-sm font-medium',
              'text-[var(--marketing-cyan)] hover:text-[var(--marketing-lime)]',
              'underline underline-offset-2 hover:no-underline',
              'transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-cyan)] focus-visible:rounded'
            )}
          >
            {step.action.label}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-[var(--marketing-gray-800)]">
        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--marketing-gray-400)]">
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors duration-200',
                  i === stepIndex
                    ? 'bg-[var(--marketing-cyan)]'
                    : i < stepIndex
                    ? 'bg-[var(--marketing-gray-500)]'
                    : 'bg-[var(--marketing-gray-700)]'
                )}
              />
            ))}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <button
              type="button"
              onClick={onPrev}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-md)]',
                'text-sm font-medium text-[var(--marketing-gray-300)]',
                'hover:bg-[var(--marketing-gray-800)] hover:text-white',
                'transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-cyan)]'
              )}
              aria-label="Previous step"
            >
              <ChevronLeftIcon />
              <span className="sr-only sm:not-sr-only">Back</span>
            </button>
          )}

          <button
            type="button"
            onClick={isLastStep ? onComplete : onNext}
            className={cn(
              'flex items-center gap-1 px-4 py-1.5 rounded-[var(--radius-md)]',
              'text-sm font-semibold',
              'bg-[var(--marketing-cyan)] text-[var(--marketing-black)]',
              'hover:bg-[var(--marketing-lime)]',
              'transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--marketing-gray-900)]'
            )}
            aria-label={isLastStep ? 'Complete tour' : 'Next step'}
          >
            <span>{isLastStep ? 'Done' : 'Next'}</span>
            {!isLastStep && <ChevronRightIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOUR OVERLAY COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

interface TourOverlayProps {
  steps: TourStep[];
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

function TourOverlay({
  steps,
  currentStep,
  onNext,
  onPrev,
  onSkip,
  onComplete,
}: TourOverlayProps) {
  const [targetPosition, setTargetPosition] = useState<Position | null>(null);

  const step = steps[currentStep];

  // Find and track target element position
  useEffect(() => {
    const updateTargetPosition = () => {
      if (step && !step.disableHighlight) {
        const pos = getElementPosition(step.target);
        setTargetPosition(pos);
      } else {
        setTargetPosition(null);
      }
    };

    updateTargetPosition();

    // Update on scroll and resize
    window.addEventListener('scroll', updateTargetPosition, { passive: true });
    window.addEventListener('resize', updateTargetPosition);

    // Also update on any DOM mutations that might affect layout
    const observer = new MutationObserver(updateTargetPosition);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener('scroll', updateTargetPosition);
      window.removeEventListener('resize', updateTargetPosition);
      observer.disconnect();
    };
  }, [step]);

  // Lock body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Guard against SSR and missing step
  if (typeof window === 'undefined' || !step) return null;

  return createPortal(
    <>
      <SpotlightOverlay
        targetPosition={targetPosition}
        padding={step.spotlightPadding ?? SPOTLIGHT_PADDING}
        onClick={onSkip}
      />
      <TourTooltip
        step={step}
        stepIndex={currentStep}
        totalSteps={steps.length}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onSkip}
        onComplete={onComplete}
        targetPosition={targetPosition}
      />
      {/* Live region for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        Step {currentStep + 1} of {steps.length}: {step.title}
      </div>
    </>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ONBOARDING TOUR PROVIDER
   ═══════════════════════════════════════════════════════════════════════════ */

export interface OnboardingTourProviderProps {
  children: ReactNode;
  config: OnboardingTourConfig;
}

export function OnboardingTourProvider({ children, config }: OnboardingTourProviderProps) {
  const {
    steps,
    storageKey = 'default',
    onComplete: onCompleteCb,
    onSkip: onSkipCb,
    onStepChange,
    showOnFirstVisit = false,
  } = config;

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourComplete, setTourComplete] = useState(() => isComplete(storageKey));

  // Show tour on first visit if configured
  useEffect(() => {
    if (showOnFirstVisit && !tourComplete && steps.length > 0) {
      // Small delay to ensure page is rendered
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showOnFirstVisit, tourComplete, steps.length]);

  const startTour = useCallback(() => {
    if (steps.length === 0) return;
    setCurrentStep(0);
    setIsActive(true);
    onStepChange?.(0, steps[0]);
  }, [steps, onStepChange]);

  const endTour = useCallback((completed = false) => {
    setIsActive(false);
    setCurrentStep(0);

    if (completed) {
      setTourComplete(true);
      setComplete(storageKey, true);
      onCompleteCb?.();
    } else {
      setTourComplete(true);
      setComplete(storageKey, true);
      onSkipCb?.();
    }
  }, [storageKey, onCompleteCb, onSkipCb]);

  const nextStep = useCallback(() => {
    const nextIndex = currentStep + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(nextIndex);
      onStepChange?.(nextIndex, steps[nextIndex]);
    }
  }, [currentStep, steps, onStepChange]);

  const prevStep = useCallback(() => {
    const prevIndex = currentStep - 1;
    if (prevIndex >= 0) {
      setCurrentStep(prevIndex);
      onStepChange?.(prevIndex, steps[prevIndex]);
    }
  }, [currentStep, steps, onStepChange]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStep(index);
      onStepChange?.(index, steps[index]);
    }
  }, [steps, onStepChange]);

  const resetTour = useCallback(() => {
    setTourComplete(false);
    setComplete(storageKey, false);
    setCurrentStep(0);
    setIsActive(false);
  }, [storageKey]);

  const handleComplete = useCallback(() => {
    endTour(true);
  }, [endTour]);

  const handleSkip = useCallback(() => {
    endTour(false);
  }, [endTour]);

  const contextValue: OnboardingTourContextValue = {
    startTour,
    endTour,
    nextStep,
    prevStep,
    goToStep,
    currentStep,
    isActive,
    isComplete: tourComplete,
    totalSteps: steps.length,
    resetTour,
  };

  return (
    <OnboardingTourContext.Provider value={contextValue}>
      {children}

      {isActive && steps.length > 0 && (
        <TourOverlay
          steps={steps}
          currentStep={currentStep}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={handleSkip}
          onComplete={handleComplete}
        />
      )}
    </OnboardingTourContext.Provider>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRESET: ATHLETE ONBOARDING TOUR
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Pre-configured tour steps for athlete onboarding
 */
export const athleteOnboardingSteps: TourStep[] = [
  {
    id: 'profile-completion',
    target: '[data-tour="profile-completion"]',
    title: 'Complete Your Profile',
    content: 'Start by completing your profile. A complete profile increases your visibility to brands and sponsors by up to 80%.',
    placement: 'bottom',
    action: {
      label: 'Go to Profile Settings',
      onClick: () => {
        // Navigation will be handled by the component using the tour
      },
    },
  },
  {
    id: 'browse-opportunities',
    target: '[data-tour="browse-opportunities"]',
    title: 'Browse NIL Opportunities',
    content: 'Discover brands looking for athletes like you. Filter by sport, compensation type, and more to find the perfect match.',
    placement: 'bottom',
  },
  {
    id: 'deal-notifications',
    target: '[data-tour="deal-notifications"]',
    title: 'Deal Notifications',
    content: 'Never miss an opportunity! You will receive notifications when brands want to connect with you or when new deals match your profile.',
    placement: 'left',
  },
  {
    id: 'earnings-dashboard',
    target: '[data-tour="earnings-dashboard"]',
    title: 'Track Your Earnings',
    content: 'Monitor your NIL earnings, view payment history, and track your growth over time. Your financial success starts here.',
    placement: 'right',
  },
];

/**
 * Default configuration for athlete onboarding
 */
export const athleteOnboardingConfig: OnboardingTourConfig = {
  steps: athleteOnboardingSteps,
  storageKey: 'athlete-onboarding',
  showOnFirstVisit: true,
};

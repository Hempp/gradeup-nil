'use client';

import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Check, Circle } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS STEPPER COMPONENT
// Multi-step progress indicator for forms, onboarding, and workflows
// ═══════════════════════════════════════════════════════════════════════════

export interface Step {
  /** Unique step identifier */
  id: string;
  /** Step title */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional icon to display */
  icon?: ReactNode;
}

interface ProgressStepperProps extends HTMLAttributes<HTMLDivElement> {
  /** Array of steps */
  steps: Step[];
  /** Current active step index (0-based) */
  currentStep: number;
  /** Orientation of the stepper */
  orientation?: 'horizontal' | 'vertical';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Callback when a step is clicked (for navigation) */
  onStepClick?: (stepIndex: number) => void;
  /** Whether completed steps are clickable */
  allowStepClick?: boolean;
}

export function ProgressStepper({
  steps,
  currentStep,
  orientation = 'horizontal',
  size = 'md',
  onStepClick,
  allowStepClick = true,
  className,
  ...props
}: ProgressStepperProps) {
  const sizeConfig = {
    sm: {
      circle: 'h-6 w-6',
      icon: 'h-3 w-3',
      title: 'text-xs',
      description: 'text-[10px]',
      connector: orientation === 'horizontal' ? 'h-0.5' : 'w-0.5',
      gap: 'gap-1',
    },
    md: {
      circle: 'h-8 w-8',
      icon: 'h-4 w-4',
      title: 'text-sm',
      description: 'text-xs',
      connector: orientation === 'horizontal' ? 'h-0.5' : 'w-0.5',
      gap: 'gap-1.5',
    },
    lg: {
      circle: 'h-10 w-10',
      icon: 'h-5 w-5',
      title: 'text-base',
      description: 'text-sm',
      connector: orientation === 'horizontal' ? 'h-1' : 'w-1',
      gap: 'gap-2',
    },
  };

  const config = sizeConfig[size];

  const getStepStatus = (index: number): 'completed' | 'current' | 'upcoming' => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'upcoming';
  };

  const handleStepClick = (index: number) => {
    if (!onStepClick || !allowStepClick) return;
    // Only allow clicking completed steps or current step
    if (index <= currentStep) {
      onStepClick(index);
    }
  };

  if (orientation === 'vertical') {
    return (
      <div
        className={cn('flex flex-col', className)}
        role="navigation"
        aria-label="Progress steps"
        {...props}
      >
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const isLast = index === steps.length - 1;
          const isClickable = allowStepClick && onStepClick && index <= currentStep;

          return (
            <div key={step.id} className="flex">
              {/* Step indicator column */}
              <div className="flex flex-col items-center">
                <StepCircle
                  status={status}
                  size={config.circle}
                  iconSize={config.icon}
                  icon={step.icon}
                  stepNumber={index + 1}
                  onClick={isClickable ? () => handleStepClick(index) : undefined}
                  isClickable={isClickable}
                />
                {!isLast && (
                  <div
                    className={cn(
                      'flex-1 min-h-[24px] my-1',
                      config.connector,
                      status === 'completed'
                        ? 'bg-[var(--color-success)]'
                        : 'bg-[var(--border-color)]'
                    )}
                  />
                )}
              </div>

              {/* Step content */}
              <div className={cn('ml-3 pb-6', config.gap)}>
                <button
                  type="button"
                  onClick={isClickable ? () => handleStepClick(index) : undefined}
                  disabled={!isClickable}
                  className={cn(
                    'text-left',
                    isClickable && 'cursor-pointer hover:text-[var(--color-primary)]',
                    !isClickable && 'cursor-default'
                  )}
                >
                  <p
                    className={cn(
                      'font-medium',
                      config.title,
                      status === 'current' && 'text-[var(--color-primary)]',
                      status === 'completed' && 'text-[var(--text-primary)]',
                      status === 'upcoming' && 'text-[var(--text-muted)]'
                    )}
                  >
                    {step.title}
                  </p>
                </button>
                {step.description && (
                  <p
                    className={cn(
                      config.description,
                      'text-[var(--text-muted)] mt-0.5'
                    )}
                  >
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal orientation
  return (
    <div
      className={cn('w-full', className)}
      role="navigation"
      aria-label="Progress steps"
      {...props}
    >
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const isLast = index === steps.length - 1;
          const isClickable = allowStepClick && onStepClick && index <= currentStep;

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center',
                !isLast && 'flex-1'
              )}
            >
              {/* Step */}
              <div className={cn('flex flex-col items-center', config.gap)}>
                <StepCircle
                  status={status}
                  size={config.circle}
                  iconSize={config.icon}
                  icon={step.icon}
                  stepNumber={index + 1}
                  onClick={isClickable ? () => handleStepClick(index) : undefined}
                  isClickable={isClickable}
                />
                <div className="text-center">
                  <button
                    type="button"
                    onClick={isClickable ? () => handleStepClick(index) : undefined}
                    disabled={!isClickable}
                    className={cn(
                      isClickable && 'cursor-pointer hover:text-[var(--color-primary)]',
                      !isClickable && 'cursor-default'
                    )}
                  >
                    <p
                      className={cn(
                        'font-medium whitespace-nowrap',
                        config.title,
                        status === 'current' && 'text-[var(--color-primary)]',
                        status === 'completed' && 'text-[var(--text-primary)]',
                        status === 'upcoming' && 'text-[var(--text-muted)]'
                      )}
                    >
                      {step.title}
                    </p>
                  </button>
                  {step.description && (
                    <p
                      className={cn(
                        config.description,
                        'text-[var(--text-muted)] hidden sm:block'
                      )}
                    >
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 mx-2 sm:mx-4',
                    config.connector,
                    status === 'completed'
                      ? 'bg-[var(--color-success)]'
                      : 'bg-[var(--border-color)]'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP CIRCLE COMPONENT
// Individual step indicator circle
// ═══════════════════════════════════════════════════════════════════════════

interface StepCircleProps {
  status: 'completed' | 'current' | 'upcoming';
  size: string;
  iconSize: string;
  icon?: ReactNode;
  stepNumber: number;
  onClick?: () => void;
  isClickable?: boolean;
}

function StepCircle({
  status,
  size,
  iconSize,
  icon,
  stepNumber,
  onClick,
  isClickable,
}: StepCircleProps) {
  const baseClasses = cn(
    'rounded-full flex items-center justify-center font-medium transition-all duration-200',
    size,
    isClickable && 'cursor-pointer'
  );

  const statusClasses = {
    completed: 'bg-[var(--color-success)] text-white',
    current: 'bg-[var(--color-primary)] text-black ring-4 ring-[var(--color-primary-muted)]',
    upcoming: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-2 border-[var(--border-color)]',
  };

  const content = status === 'completed' ? (
    <Check className={cn(iconSize, 'animate-success-check')} />
  ) : icon ? (
    <span className={iconSize}>{icon}</span>
  ) : (
    <span className="text-xs font-semibold">{stepNumber}</span>
  );

  if (onClick && isClickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          baseClasses,
          statusClasses[status],
          'hover:scale-105 active:scale-95'
        )}
        aria-label={`Step ${stepNumber}: ${status}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(baseClasses, statusClasses[status])}
      aria-label={`Step ${stepNumber}: ${status}`}
    >
      {content}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SIMPLE PROGRESS BAR
// Linear progress indicator
// ═══════════════════════════════════════════════════════════════════════════

interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  /** Progress value (0-100) */
  value: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'default' | 'success' | 'warning' | 'error';
  /** Show percentage label */
  showLabel?: boolean;
  /** Animate the progress */
  animated?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  animated = true,
  className,
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantClasses = {
    default: 'bg-[var(--color-primary)]',
    success: 'bg-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]',
    error: 'bg-[var(--color-error)]',
  };

  return (
    <div className={cn('w-full', className)} {...props}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-xs text-[var(--text-muted)]">Progress</span>
          <span className="text-xs font-medium text-[var(--text-primary)]">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div
        className={cn(
          'w-full rounded-full bg-[var(--bg-tertiary)] overflow-hidden',
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn(
            'h-full rounded-full',
            variantClasses[variant],
            animated && 'transition-all duration-500 ease-out'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP INDICATOR (COMPACT)
// Compact dot-style step indicator
// ═══════════════════════════════════════════════════════════════════════════

interface StepIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  /** Total number of steps */
  totalSteps: number;
  /** Current step (1-based) */
  currentStep: number;
  /** Size of the dots */
  size?: 'sm' | 'md';
}

export function StepIndicator({
  totalSteps,
  currentStep,
  size = 'md',
  className,
  ...props
}: StepIndicatorProps) {
  const sizeClasses = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
  };

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="navigation"
      aria-label={`Step ${currentStep} of ${totalSteps}`}
      {...props}
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <div
            key={i}
            className={cn(
              'rounded-full transition-all duration-200',
              sizeClasses[size],
              isActive && 'bg-[var(--color-primary)] scale-125',
              isCompleted && 'bg-[var(--color-success)]',
              !isActive && !isCompleted && 'bg-[var(--border-color)]'
            )}
            aria-current={isActive ? 'step' : undefined}
          />
        );
      })}
    </div>
  );
}

export default ProgressStepper;

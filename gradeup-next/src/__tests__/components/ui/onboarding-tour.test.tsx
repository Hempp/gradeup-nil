/**
 * Tests for OnboardingTour components and hooks
 * @module __tests__/components/ui/onboarding-tour.test
 */

import React from 'react';
import { render, screen, renderHook, waitFor, act } from '@testing-library/react';
import {
  OnboardingTourProvider,
  useOnboardingTour,
  athleteOnboardingSteps,
  athleteOnboardingConfig,
  type TourStep,
  type OnboardingTourConfig,
} from '@/components/ui/onboarding-tour';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock createPortal to render inline
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

// Mock window scroll
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true,
});

// Mock getBoundingClientRect
const mockGetBoundingClientRect = jest.fn(() => ({
  top: 100,
  left: 100,
  width: 200,
  height: 50,
  bottom: 150,
  right: 300,
  x: 100,
  y: 100,
  toJSON: () => {},
}));

describe('OnboardingTourProvider', () => {
  const testConfig: OnboardingTourConfig = {
    steps: [
      {
        id: 'step-1',
        target: '[data-tour="step-1"]',
        title: 'Step 1',
        content: 'First step content',
        placement: 'bottom',
      },
      {
        id: 'step-2',
        target: '[data-tour="step-2"]',
        title: 'Step 2',
        content: 'Second step content',
      },
    ],
    storageKey: 'test-tour',
  };

  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  it('renders children', () => {
    render(
      <OnboardingTourProvider config={testConfig}>
        <div data-testid="child">Child content</div>
      </OnboardingTourProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('provides context to children', () => {
    function TestComponent() {
      const context = useOnboardingTour();
      return <div data-testid="has-context">{context ? 'yes' : 'no'}</div>;
    }

    render(
      <OnboardingTourProvider config={testConfig}>
        <TestComponent />
      </OnboardingTourProvider>
    );

    expect(screen.getByTestId('has-context')).toHaveTextContent('yes');
  });

  it('does not show tour initially', () => {
    render(
      <OnboardingTourProvider config={testConfig}>
        <div>Content</div>
      </OnboardingTourProvider>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows tour on first visit when configured', async () => {
    // Mock document.querySelector to return an element
    const mockElement = document.createElement('div');
    mockElement.getBoundingClientRect = mockGetBoundingClientRect;
    jest.spyOn(document, 'querySelector').mockReturnValue(mockElement);

    const configWithAutoShow: OnboardingTourConfig = {
      ...testConfig,
      showOnFirstVisit: true,
    };

    render(
      <OnboardingTourProvider config={configWithAutoShow}>
        <div>Content</div>
      </OnboardingTourProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    }, { timeout: 1000 });

    document.querySelector = jest.fn();
  });
});

describe('useOnboardingTour', () => {
  const testConfig: OnboardingTourConfig = {
    steps: [
      {
        id: 'step-1',
        target: '[data-tour="step-1"]',
        title: 'Step 1',
        content: 'First step',
      },
      {
        id: 'step-2',
        target: '[data-tour="step-2"]',
        title: 'Step 2',
        content: 'Second step',
      },
      {
        id: 'step-3',
        target: '[data-tour="step-3"]',
        title: 'Step 3',
        content: 'Third step',
      },
    ],
    storageKey: 'test-tour',
  };

  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  it('throws error when used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useOnboardingTour());
    }).toThrow('useOnboardingTour must be used within an OnboardingTourProvider');

    consoleSpy.mockRestore();
  });

  it('provides context methods', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingTourProvider config={testConfig}>{children}</OnboardingTourProvider>
    );

    const { result } = renderHook(() => useOnboardingTour(), { wrapper });

    expect(result.current.startTour).toBeDefined();
    expect(result.current.endTour).toBeDefined();
    expect(result.current.nextStep).toBeDefined();
    expect(result.current.prevStep).toBeDefined();
    expect(result.current.goToStep).toBeDefined();
    expect(result.current.resetTour).toBeDefined();
    expect(typeof result.current.currentStep).toBe('number');
    expect(typeof result.current.isActive).toBe('boolean');
    expect(typeof result.current.isComplete).toBe('boolean');
    expect(typeof result.current.totalSteps).toBe('number');
  });

  it('starts and ends tour', async () => {
    const mockElement = document.createElement('div');
    mockElement.getBoundingClientRect = mockGetBoundingClientRect;
    jest.spyOn(document, 'querySelector').mockReturnValue(mockElement);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingTourProvider config={testConfig}>{children}</OnboardingTourProvider>
    );

    const { result } = renderHook(() => useOnboardingTour(), { wrapper });

    expect(result.current.isActive).toBe(false);

    act(() => {
      result.current.startTour();
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.currentStep).toBe(0);

    act(() => {
      result.current.endTour();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.isComplete).toBe(true);
  });

  it('navigates between steps', async () => {
    const mockElement = document.createElement('div');
    mockElement.getBoundingClientRect = mockGetBoundingClientRect;
    jest.spyOn(document, 'querySelector').mockReturnValue(mockElement);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingTourProvider config={testConfig}>{children}</OnboardingTourProvider>
    );

    const { result } = renderHook(() => useOnboardingTour(), { wrapper });

    act(() => {
      result.current.startTour();
    });

    expect(result.current.currentStep).toBe(0);

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe(1);

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe(2);

    act(() => {
      result.current.prevStep();
    });

    expect(result.current.currentStep).toBe(1);
  });

  it('goes to specific step', async () => {
    const mockElement = document.createElement('div');
    mockElement.getBoundingClientRect = mockGetBoundingClientRect;
    jest.spyOn(document, 'querySelector').mockReturnValue(mockElement);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingTourProvider config={testConfig}>{children}</OnboardingTourProvider>
    );

    const { result } = renderHook(() => useOnboardingTour(), { wrapper });

    act(() => {
      result.current.startTour();
    });

    act(() => {
      result.current.goToStep(2);
    });

    expect(result.current.currentStep).toBe(2);
  });

  it('resets tour completion state', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingTourProvider config={testConfig}>{children}</OnboardingTourProvider>
    );

    const { result } = renderHook(() => useOnboardingTour(), { wrapper });

    // Complete the tour
    act(() => {
      result.current.startTour();
    });
    act(() => {
      result.current.endTour(true);
    });

    expect(result.current.isComplete).toBe(true);

    // Reset
    act(() => {
      result.current.resetTour();
    });

    expect(result.current.isComplete).toBe(false);
    expect(mockLocalStorage.removeItem).toHaveBeenCalled();
  });

  it('persists completion to localStorage', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingTourProvider config={testConfig}>{children}</OnboardingTourProvider>
    );

    const { result } = renderHook(() => useOnboardingTour(), { wrapper });

    act(() => {
      result.current.startTour();
    });
    act(() => {
      result.current.endTour(true);
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('onboarding-tour-test-tour', 'true');
  });

  it('calls onComplete callback', async () => {
    const onComplete = jest.fn();
    const configWithCallback: OnboardingTourConfig = {
      ...testConfig,
      onComplete,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingTourProvider config={configWithCallback}>{children}</OnboardingTourProvider>
    );

    const { result } = renderHook(() => useOnboardingTour(), { wrapper });

    act(() => {
      result.current.startTour();
    });
    act(() => {
      result.current.endTour(true);
    });

    expect(onComplete).toHaveBeenCalled();
  });

  it('calls onSkip callback', async () => {
    const onSkip = jest.fn();
    const configWithCallback: OnboardingTourConfig = {
      ...testConfig,
      onSkip,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingTourProvider config={configWithCallback}>{children}</OnboardingTourProvider>
    );

    const { result } = renderHook(() => useOnboardingTour(), { wrapper });

    act(() => {
      result.current.startTour();
    });
    act(() => {
      result.current.endTour(false);
    });

    expect(onSkip).toHaveBeenCalled();
  });

  it('calls onStepChange callback', async () => {
    const onStepChange = jest.fn();
    const configWithCallback: OnboardingTourConfig = {
      ...testConfig,
      onStepChange,
    };

    const mockElement = document.createElement('div');
    mockElement.getBoundingClientRect = mockGetBoundingClientRect;
    jest.spyOn(document, 'querySelector').mockReturnValue(mockElement);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingTourProvider config={configWithCallback}>{children}</OnboardingTourProvider>
    );

    const { result } = renderHook(() => useOnboardingTour(), { wrapper });

    act(() => {
      result.current.startTour();
    });

    expect(onStepChange).toHaveBeenCalledWith(0, testConfig.steps[0]);

    act(() => {
      result.current.nextStep();
    });

    expect(onStepChange).toHaveBeenCalledWith(1, testConfig.steps[1]);
  });

  it('does not start tour with empty steps', async () => {
    const emptyConfig: OnboardingTourConfig = {
      steps: [],
      storageKey: 'empty-tour',
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingTourProvider config={emptyConfig}>{children}</OnboardingTourProvider>
    );

    const { result } = renderHook(() => useOnboardingTour(), { wrapper });

    act(() => {
      result.current.startTour();
    });

    expect(result.current.isActive).toBe(false);
  });

  it('does not navigate past last step', async () => {
    const mockElement = document.createElement('div');
    mockElement.getBoundingClientRect = mockGetBoundingClientRect;
    jest.spyOn(document, 'querySelector').mockReturnValue(mockElement);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingTourProvider config={testConfig}>{children}</OnboardingTourProvider>
    );

    const { result } = renderHook(() => useOnboardingTour(), { wrapper });

    act(() => {
      result.current.startTour();
    });

    // Go to last step
    act(() => {
      result.current.goToStep(2);
    });

    expect(result.current.currentStep).toBe(2);

    // Try to go further
    act(() => {
      result.current.nextStep();
    });

    // Should stay at last step
    expect(result.current.currentStep).toBe(2);
  });

  it('does not navigate before first step', async () => {
    const mockElement = document.createElement('div');
    mockElement.getBoundingClientRect = mockGetBoundingClientRect;
    jest.spyOn(document, 'querySelector').mockReturnValue(mockElement);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingTourProvider config={testConfig}>{children}</OnboardingTourProvider>
    );

    const { result } = renderHook(() => useOnboardingTour(), { wrapper });

    act(() => {
      result.current.startTour();
    });

    expect(result.current.currentStep).toBe(0);

    act(() => {
      result.current.prevStep();
    });

    // Should stay at first step
    expect(result.current.currentStep).toBe(0);
  });
});

describe('TourStep type', () => {
  it('has correct structure', () => {
    const step: TourStep = {
      id: 'test-step',
      target: '[data-tour="test"]',
      title: 'Test Step',
      content: 'Test content',
      placement: 'bottom',
      action: {
        label: 'Learn more',
        onClick: () => {},
      },
      disableHighlight: false,
      spotlightPadding: 16,
    };

    expect(step.id).toBe('test-step');
    expect(step.target).toBe('[data-tour="test"]');
    expect(step.title).toBe('Test Step');
    expect(step.content).toBe('Test content');
    expect(step.placement).toBe('bottom');
    expect(step.action?.label).toBe('Learn more');
    expect(step.disableHighlight).toBe(false);
    expect(step.spotlightPadding).toBe(16);
  });

  it('supports all placement values', () => {
    const placements: TourStep['placement'][] = ['top', 'bottom', 'left', 'right', 'auto'];

    expect(placements.length).toBe(5);
  });
});

describe('OnboardingTourConfig type', () => {
  it('has correct structure', () => {
    const config: OnboardingTourConfig = {
      steps: [],
      storageKey: 'test',
      onComplete: () => {},
      onSkip: () => {},
      onStepChange: () => {},
      showOnFirstVisit: true,
    };

    expect(config.steps).toEqual([]);
    expect(config.storageKey).toBe('test');
    expect(config.showOnFirstVisit).toBe(true);
  });
});

describe('athleteOnboardingSteps', () => {
  it('contains expected steps', () => {
    expect(athleteOnboardingSteps.length).toBe(4);
    expect(athleteOnboardingSteps[0].id).toBe('profile-completion');
    expect(athleteOnboardingSteps[1].id).toBe('browse-opportunities');
    expect(athleteOnboardingSteps[2].id).toBe('deal-notifications');
    expect(athleteOnboardingSteps[3].id).toBe('earnings-dashboard');
  });

  it('has correct target selectors', () => {
    athleteOnboardingSteps.forEach(step => {
      expect(step.target).toMatch(/^\[data-tour="[\w-]+"\]$/);
    });
  });

  it('has titles and content for all steps', () => {
    athleteOnboardingSteps.forEach(step => {
      expect(step.title).toBeTruthy();
      expect(step.content).toBeTruthy();
    });
  });
});

describe('athleteOnboardingConfig', () => {
  it('has correct configuration', () => {
    expect(athleteOnboardingConfig.steps).toBe(athleteOnboardingSteps);
    expect(athleteOnboardingConfig.storageKey).toBe('athlete-onboarding');
    expect(athleteOnboardingConfig.showOnFirstVisit).toBe(true);
  });
});

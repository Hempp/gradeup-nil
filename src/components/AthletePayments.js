/**
 * GradeUp NIL - Athlete Payments Component
 * Stripe Connect integration for athlete payouts
 *
 * Features:
 * - Stripe Connect onboarding status
 * - Balance display (available/pending)
 * - Payout history
 * - Earnings chart visualization
 * - Tax documents section
 *
 * Security Note: This component uses safe DOM methods (createElement, textContent)
 * instead of innerHTML to prevent XSS vulnerabilities.
 *
 * @module components/AthletePayments
 */

import {
  getConnectedAccount,
  createConnectOnboardingLink,
  getConnectDashboardLink,
  getAthleteBalance,
  getAthletePayouts,
  getAthleteEarnings,
  getEarningsChartData,
  getTaxForms,
  formatCurrency,
  PLATFORM_FEE_PERCENT,
} from '../services/payments.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const PAYOUT_STATUS_LABELS = {
  pending: 'Pending',
  in_transit: 'In Transit',
  paid: 'Paid',
  failed: 'Failed',
  canceled: 'Canceled',
};

const PAYOUT_STATUS_CLASSES = {
  pending: 'warning',
  in_transit: 'info',
  paid: 'success',
  failed: 'error',
  canceled: 'muted',
};

// ============================================================================
// SVG ICON HELPERS
// ============================================================================

/**
 * Create an SVG element with the specified attributes
 */
function createSVG(width, height, viewBox = '0 0 24 24') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  return svg;
}

/**
 * Create an SVG path element
 */
function createPath(d) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  return path;
}

/**
 * Create an SVG circle element
 */
function createCircle(cx, cy, r) {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', cx);
  circle.setAttribute('cy', cy);
  circle.setAttribute('r', r);
  return circle;
}

/**
 * Create an SVG line element
 */
function createLine(x1, y1, x2, y2) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
  return line;
}

/**
 * Create an SVG polyline element
 */
function createPolyline(points) {
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('points', points);
  return polyline;
}

/**
 * Create an SVG rect element
 */
function createRect(x, y, width, height, rx = 0, ry = 0) {
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', width);
  rect.setAttribute('height', height);
  if (rx) rect.setAttribute('rx', rx);
  if (ry) rect.setAttribute('ry', ry);
  return rect;
}

// Icon factory functions
const Icons = {
  creditCard: () => {
    const svg = createSVG(48, 48);
    svg.setAttribute('stroke', 'var(--cyan)');
    svg.setAttribute('stroke-width', '1.5');
    svg.appendChild(createRect(1, 4, 22, 16, 2, 2));
    svg.appendChild(createLine(1, 10, 23, 10));
    return svg;
  },

  checkmark: () => {
    const svg = createSVG(16, 16);
    svg.setAttribute('stroke', 'var(--success)');
    svg.appendChild(createPolyline('20 6 9 17 4 12'));
    return svg;
  },

  info: () => {
    const svg = createSVG(14, 14);
    svg.setAttribute('stroke', 'var(--gray-500)');
    svg.appendChild(createCircle(12, 12, 10));
    svg.appendChild(createPath('M12 16v-4'));
    svg.appendChild(createPath('M12 8h.01'));
    return svg;
  },

  error: () => {
    const svg = createSVG(32, 32);
    svg.setAttribute('stroke', 'var(--error)');
    svg.appendChild(createCircle(12, 12, 10));
    svg.appendChild(createLine(12, 8, 12, 12));
    svg.appendChild(createLine(12, 16, 12.01, 16));
    return svg;
  },

  externalLink: () => {
    const svg = createSVG(14, 14);
    svg.appendChild(createPath('M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6'));
    svg.appendChild(createPolyline('15 3 21 3 21 9'));
    svg.appendChild(createLine(10, 14, 21, 3));
    return svg;
  },

  arrowUp: () => {
    const svg = createSVG(18, 18);
    svg.appendChild(createCircle(12, 12, 10));
    svg.appendChild(createPolyline('16 12 12 8 8 12'));
    svg.appendChild(createLine(12, 16, 12, 8));
    return svg;
  },

  clock: () => {
    const svg = createSVG(18, 18);
    svg.appendChild(createCircle(12, 12, 10));
    svg.appendChild(createPolyline('12 6 12 12 16 14'));
    return svg;
  },

  dollar: () => {
    const svg = createSVG(18, 18);
    svg.appendChild(createLine(12, 1, 12, 23));
    svg.appendChild(createPath('M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'));
    return svg;
  },

  warning: () => {
    const svg = createSVG(18, 18);
    svg.appendChild(createPath('M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'));
    svg.appendChild(createLine(12, 9, 12, 13));
    svg.appendChild(createLine(12, 17, 12.01, 17));
    return svg;
  },

  chart: () => {
    const svg = createSVG(48, 48);
    svg.setAttribute('stroke', 'var(--gray-600)');
    svg.setAttribute('stroke-width', '1.5');
    svg.appendChild(createLine(18, 20, 18, 10));
    svg.appendChild(createLine(12, 20, 12, 4));
    svg.appendChild(createLine(6, 20, 6, 14));
    return svg;
  },

  document: () => {
    const svg = createSVG(24, 24);
    svg.setAttribute('stroke', 'var(--cyan)');
    svg.appendChild(createPath('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z'));
    svg.appendChild(createPolyline('14 2 14 8 20 8'));
    svg.appendChild(createLine(16, 13, 8, 13));
    svg.appendChild(createLine(16, 17, 8, 17));
    svg.appendChild(createPolyline('10 9 9 9 8 9'));
    return svg;
  },

  download: () => {
    const svg = createSVG(18, 18);
    svg.appendChild(createPath('M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4'));
    svg.appendChild(createPolyline('7 10 12 15 17 10'));
    svg.appendChild(createLine(12, 15, 12, 3));
    return svg;
  },

  payout: () => {
    const svg = createSVG(48, 48);
    svg.setAttribute('stroke', 'var(--gray-600)');
    svg.setAttribute('stroke-width', '1.5');
    svg.appendChild(createRect(1, 4, 22, 16, 2, 2));
    svg.appendChild(createLine(1, 10, 23, 10));
    return svg;
  },

  spinner: () => {
    const svg = createSVG(20, 20);
    const circle = createCircle(12, 12, 10);
    circle.setAttribute('stroke-width', '3');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke-dasharray', '31.4');
    circle.setAttribute('stroke-linecap', 'round');

    const animateTransform = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
    animateTransform.setAttribute('attributeName', 'transform');
    animateTransform.setAttribute('type', 'rotate');
    animateTransform.setAttribute('from', '0 12 12');
    animateTransform.setAttribute('to', '360 12 12');
    animateTransform.setAttribute('dur', '1s');
    animateTransform.setAttribute('repeatCount', 'indefinite');
    circle.appendChild(animateTransform);

    svg.appendChild(circle);
    return svg;
  }
};

// ============================================================================
// STYLE INJECTION
// ============================================================================

function injectStyles() {
  if (document.getElementById('athlete-payments-styles')) return;

  const style = document.createElement('style');
  style.id = 'athlete-payments-styles';
  style.textContent = `
    /* Payments Section */
    .payments-section {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* Onboarding Card */
    .onboarding-card {
      background: linear-gradient(135deg, rgba(0, 240, 255, 0.05) 0%, rgba(255, 0, 255, 0.03) 100%);
    }

    .onboarding-content {
      display: flex;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .onboarding-icon {
      flex-shrink: 0;
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(0, 160, 255, 0.1));
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .onboarding-text {
      flex: 1;
    }

    .onboarding-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--white);
      margin-bottom: 0.75rem;
    }

    .onboarding-description {
      color: var(--gray-400);
      font-size: 0.9375rem;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }

    .onboarding-benefits {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .onboarding-benefits li {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--gray-300);
      font-size: 0.875rem;
    }

    .btn-setup-payouts {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 1rem 2.5rem;
      font-size: 1rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--black);
      background: linear-gradient(135deg, var(--cyan), #00a0ff);
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: transform 0.25s var(--ease), box-shadow 0.25s var(--ease);
    }

    .btn-setup-payouts:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(0, 240, 255, 0.3);
    }

    .btn-setup-payouts:disabled {
      opacity: 0.7;
      cursor: wait;
    }

    .onboarding-note {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1.5rem;
      font-size: 0.8125rem;
      color: var(--gray-500);
    }

    /* Balance Card */
    .balance-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }

    .balance-item {
      padding: 1.5rem;
      background: var(--gray-900);
      border-radius: 16px;
      transition: transform 0.2s var(--ease);
    }

    .balance-item:hover {
      transform: translateY(-2px);
    }

    .balance-item.available {
      border-left: 3px solid var(--success);
    }

    .balance-item.pending {
      border-left: 3px solid var(--warning);
    }

    .balance-item.total {
      border-left: 3px solid var(--cyan);
    }

    .balance-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--gray-400);
      margin-bottom: 0.75rem;
    }

    .balance-item.available .balance-label { color: var(--success); }
    .balance-item.pending .balance-label { color: var(--warning); }
    .balance-item.total .balance-label { color: var(--cyan); }

    .balance-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--white);
      margin-bottom: 0.25rem;
    }

    .balance-hint {
      font-size: 0.75rem;
      color: var(--gray-500);
    }

    .payout-warning {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 1.5rem;
      padding: 1rem 1.25rem;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 12px;
      color: var(--warning);
      font-size: 0.875rem;
    }

    .payout-warning-text {
      flex: 1;
    }

    .btn-small {
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      background: var(--warning);
      color: var(--black);
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: transform 0.2s var(--ease);
    }

    .btn-small:hover {
      transform: translateY(-1px);
    }

    /* Earnings Chart */
    .earnings-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--gray-800);
    }

    .earnings-stat {
      text-align: center;
    }

    .earnings-stat-value {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--white);
      margin-bottom: 0.25rem;
    }

    .earnings-stat-label {
      font-size: 0.75rem;
      color: var(--gray-500);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .chart-period-selector {
      display: flex;
      gap: 0.25rem;
      background: var(--gray-900);
      padding: 0.25rem;
      border-radius: 8px;
    }

    .period-btn {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--gray-500);
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: color 0.2s var(--ease), background 0.2s var(--ease);
    }

    .period-btn:hover {
      color: var(--white);
    }

    .period-btn.active {
      color: var(--black);
      background: var(--cyan);
    }

    .chart-container {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      height: 200px;
      padding-top: 1rem;
    }

    .chart-bar-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
    }

    .chart-bar {
      position: relative;
      width: 100%;
      max-width: 40px;
      background: linear-gradient(180deg, var(--cyan), rgba(0, 240, 255, 0.3));
      border-radius: 4px 4px 0 0;
      margin-bottom: 0.75rem;
      transition: height 0.5s var(--ease-out);
      cursor: pointer;
    }

    .chart-bar:hover {
      background: linear-gradient(180deg, var(--white), var(--cyan));
    }

    .chart-bar-tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.375rem 0.625rem;
      background: var(--gray-800);
      border: 1px solid var(--gray-700);
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--white);
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
    }

    .chart-bar:hover .chart-bar-tooltip {
      opacity: 1;
      visibility: visible;
    }

    .chart-label {
      font-size: 0.75rem;
      color: var(--gray-500);
      font-weight: 500;
    }

    .chart-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      text-align: center;
    }

    .chart-empty p {
      color: var(--gray-500);
      font-size: 0.875rem;
      max-width: 300px;
      margin-top: 1rem;
    }

    /* Payout History */
    .payout-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .payout-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--gray-900);
      border-radius: 12px;
      transition: background 0.2s var(--ease);
    }

    .payout-item:hover {
      background: var(--gray-800);
    }

    .payout-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
    }

    .payout-icon.success {
      background: rgba(34, 197, 94, 0.15);
      color: var(--success);
    }

    .payout-icon.warning {
      background: rgba(245, 158, 11, 0.15);
      color: var(--warning);
    }

    .payout-icon.info {
      background: rgba(0, 240, 255, 0.15);
      color: var(--cyan);
    }

    .payout-icon.error {
      background: rgba(239, 68, 68, 0.15);
      color: var(--error);
    }

    .payout-icon.muted {
      background: var(--gray-800);
      color: var(--gray-500);
    }

    .payout-details {
      flex: 1;
    }

    .payout-description {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--white);
      margin-bottom: 0.125rem;
    }

    .payout-date {
      font-size: 0.8125rem;
      color: var(--gray-500);
    }

    .payout-right {
      text-align: right;
    }

    .payout-amount {
      font-size: 1rem;
      font-weight: 700;
      color: var(--success);
      margin-bottom: 0.125rem;
    }

    .payout-status {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 4px;
    }

    .payout-status.success {
      background: rgba(34, 197, 94, 0.15);
      color: var(--success);
    }

    .payout-status.warning {
      background: rgba(245, 158, 11, 0.15);
      color: var(--warning);
    }

    .payout-status.info {
      background: rgba(0, 240, 255, 0.15);
      color: var(--cyan);
    }

    .payout-status.error {
      background: rgba(239, 68, 68, 0.15);
      color: var(--error);
    }

    .payout-status.muted {
      background: var(--gray-800);
      color: var(--gray-500);
    }

    .payout-empty, .chart-empty, .tax-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;
    }

    .payout-empty p, .chart-empty p, .tax-empty p {
      color: var(--gray-500);
      font-size: 0.875rem;
      max-width: 300px;
      margin-top: 1rem;
    }

    /* Tax Documents */
    .card-subtitle {
      font-size: 0.8125rem;
      color: var(--gray-500);
    }

    .tax-forms-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .tax-form-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--gray-900);
      border-radius: 12px;
      transition: background 0.2s var(--ease);
    }

    .tax-form-item:hover {
      background: var(--gray-800);
    }

    .tax-form-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 240, 255, 0.1);
      border-radius: 12px;
    }

    .tax-form-info {
      flex: 1;
    }

    .tax-form-name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--white);
      margin-bottom: 0.125rem;
    }

    .tax-form-status {
      font-size: 0.8125rem;
      color: var(--gray-500);
    }

    .btn-download-tax {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--cyan);
      background: transparent;
      border: 1px solid var(--gray-700);
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s var(--ease), border-color 0.2s var(--ease);
    }

    .btn-download-tax:hover:not(:disabled) {
      background: rgba(0, 240, 255, 0.1);
      border-color: var(--cyan);
    }

    .btn-download-tax:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .tax-info {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--gray-900);
      border-radius: 10px;
      font-size: 0.8125rem;
      color: var(--gray-400);
      line-height: 1.5;
    }

    .tax-info svg {
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    /* Loading State */
    .payments-loading .skeleton {
      background: linear-gradient(90deg, var(--gray-800) 25%, var(--gray-700) 50%, var(--gray-800) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 8px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Error State */
    .error-state {
      text-align: center;
      padding: 3rem;
    }

    .error-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1.5rem;
      background: rgba(239, 68, 68, 0.15);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .onboarding-content {
        flex-direction: column;
        text-align: center;
      }

      .onboarding-icon {
        margin: 0 auto;
      }

      .onboarding-benefits {
        align-items: center;
      }

      .btn-setup-payouts {
        width: 100%;
      }

      .balance-grid {
        grid-template-columns: 1fr;
      }

      .earnings-summary {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// ATHLETE PAYMENTS COMPONENT
// ============================================================================

/**
 * AthletePayments Component
 * Renders the complete payments section for athlete dashboard
 */
export class AthletePayments {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.state = {
      loading: true,
      error: null,
      hasConnectedAccount: false,
      accountDetails: null,
      balance: null,
      payouts: [],
      earnings: null,
      chartData: [],
      taxForms: [],
    };

    if (this.container) {
      injectStyles();
      this.init();
    }
  }

  /**
   * Initialize the component
   */
  async init() {
    this.render();
    await this.loadData();
  }

  /**
   * Load all payment-related data
   */
  async loadData() {
    try {
      this.setState({ loading: true, error: null });

      // Load connected account status first
      const accountResult = await getConnectedAccount();

      if (accountResult.error && !accountResult.hasAccount) {
        // No connected account - show onboarding
        this.setState({
          loading: false,
          hasConnectedAccount: false,
          accountDetails: null,
        });
        return;
      }

      // Account exists - load all data in parallel
      const [balanceResult, payoutsResult, earningsResult, chartResult, taxResult] = await Promise.all([
        getAthleteBalance(),
        getAthletePayouts(),
        getAthleteEarnings(),
        getEarningsChartData(12),
        getTaxForms(),
      ]);

      this.setState({
        loading: false,
        hasConnectedAccount: true,
        accountDetails: accountResult.account,
        balance: balanceResult.balance,
        payouts: payoutsResult.payouts || [],
        earnings: earningsResult.earnings,
        chartData: chartResult.chartData || [],
        taxForms: taxResult.forms || [],
      });
    } catch (error) {
      console.error('[AthletePayments] Error loading data:', error);
      this.setState({
        loading: false,
        error: 'Failed to load payment information. Please try again.',
      });
    }
  }

  /**
   * Update component state and re-render
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  /**
   * Main render method
   */
  render() {
    if (!this.container) return;

    // Clear container safely
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    if (this.state.loading) {
      this.container.appendChild(this.renderLoadingState());
      return;
    }

    if (this.state.error) {
      this.container.appendChild(this.renderErrorState());
      return;
    }

    // Build the payments section
    const paymentsSection = document.createElement('div');
    paymentsSection.className = 'payments-section';

    // Add sections based on account status
    if (!this.state.hasConnectedAccount) {
      paymentsSection.appendChild(this.renderOnboardingCard());
    } else {
      paymentsSection.appendChild(this.renderBalanceCard());
      paymentsSection.appendChild(this.renderEarningsChart());
      paymentsSection.appendChild(this.renderPayoutHistory());
      paymentsSection.appendChild(this.renderTaxDocuments());
    }

    this.container.appendChild(paymentsSection);
    this.attachEventListeners();
  }

  /**
   * Render loading skeleton
   */
  renderLoadingState() {
    const loader = document.createElement('div');
    loader.className = 'payments-loading';

    const card = document.createElement('div');
    card.className = 'glass-card';

    const body = document.createElement('div');
    body.className = 'card-body';

    const skeleton1 = document.createElement('div');
    skeleton1.className = 'skeleton';
    skeleton1.style.cssText = 'height: 24px; width: 200px; margin-bottom: 1rem;';

    const skeleton2 = document.createElement('div');
    skeleton2.className = 'skeleton';
    skeleton2.style.cssText = 'height: 60px; width: 100%; margin-bottom: 1rem;';

    const skeleton3 = document.createElement('div');
    skeleton3.className = 'skeleton';
    skeleton3.style.cssText = 'height: 40px; width: 150px;';

    body.appendChild(skeleton1);
    body.appendChild(skeleton2);
    body.appendChild(skeleton3);
    card.appendChild(body);
    loader.appendChild(card);

    return loader;
  }

  /**
   * Render error state
   */
  renderErrorState() {
    const error = document.createElement('div');
    error.className = 'glass-card';

    const body = document.createElement('div');
    body.className = 'card-body error-state';

    const iconContainer = document.createElement('div');
    iconContainer.className = 'error-icon';
    iconContainer.appendChild(Icons.error());

    const title = document.createElement('h3');
    title.style.cssText = 'color: var(--white); margin-bottom: 0.5rem;';
    title.textContent = 'Unable to Load Payments';

    const message = document.createElement('p');
    message.style.cssText = 'color: var(--gray-400); margin-bottom: 1.5rem;';
    message.textContent = this.state.error;

    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn btn-primary';
    retryBtn.id = 'retryPaymentsBtn';
    retryBtn.textContent = 'Try Again';

    body.appendChild(iconContainer);
    body.appendChild(title);
    body.appendChild(message);
    body.appendChild(retryBtn);
    error.appendChild(body);

    return error;
  }

  /**
   * Render Stripe Connect onboarding card
   */
  renderOnboardingCard() {
    const card = document.createElement('div');
    card.className = 'glass-card onboarding-card';

    const body = document.createElement('div');
    body.className = 'card-body';
    body.style.padding = '2.5rem';

    // Content wrapper
    const content = document.createElement('div');
    content.className = 'onboarding-content';

    // Icon
    const iconDiv = document.createElement('div');
    iconDiv.className = 'onboarding-icon';
    iconDiv.appendChild(Icons.creditCard());

    // Text content
    const textDiv = document.createElement('div');
    textDiv.className = 'onboarding-text';

    const title = document.createElement('h2');
    title.className = 'onboarding-title';
    title.textContent = 'Set Up Payouts';

    const description = document.createElement('p');
    description.className = 'onboarding-description';
    description.textContent = 'Connect your bank account to receive payments from brand deals. We use Stripe for secure, fast payouts directly to your account.';

    // Benefits list
    const benefitsList = document.createElement('ul');
    benefitsList.className = 'onboarding-benefits';

    const benefits = [
      'Fast direct deposits (1-2 business days)',
      'Bank-level security and encryption',
      'Automatic tax document generation',
      `Only ${PLATFORM_FEE_PERCENT}% platform fee on deals`
    ];

    benefits.forEach(benefit => {
      const li = document.createElement('li');
      li.appendChild(Icons.checkmark());
      const span = document.createElement('span');
      span.textContent = benefit;
      li.appendChild(span);
      benefitsList.appendChild(li);
    });

    textDiv.appendChild(title);
    textDiv.appendChild(description);
    textDiv.appendChild(benefitsList);

    content.appendChild(iconDiv);
    content.appendChild(textDiv);

    // Setup button
    const setupBtn = document.createElement('button');
    setupBtn.className = 'btn-setup-payouts';
    setupBtn.id = 'setupPayoutsBtn';

    const btnIcon = Icons.creditCard();
    btnIcon.setAttribute('width', '20');
    btnIcon.setAttribute('height', '20');
    btnIcon.setAttribute('stroke', 'currentColor');
    setupBtn.appendChild(btnIcon);

    const btnText = document.createElement('span');
    btnText.textContent = 'Set Up Payouts';
    setupBtn.appendChild(btnText);

    // Note
    const note = document.createElement('p');
    note.className = 'onboarding-note';
    note.appendChild(Icons.info());
    const noteText = document.createElement('span');
    noteText.textContent = 'Powered by Stripe. Your banking details are never stored on GradeUp servers.';
    note.appendChild(noteText);

    body.appendChild(content);
    body.appendChild(setupBtn);
    body.appendChild(note);
    card.appendChild(body);

    return card;
  }

  /**
   * Render balance display card
   */
  renderBalanceCard() {
    const { balance } = this.state;
    const available = balance?.available || 0;
    const pending = balance?.pending || 0;
    const payoutsEnabled = balance?.payoutsEnabled ?? false;

    const card = document.createElement('div');
    card.className = 'glass-card balance-card';

    // Header
    const header = document.createElement('div');
    header.className = 'card-header';

    const cardTitle = document.createElement('h3');
    cardTitle.className = 'card-title';
    cardTitle.textContent = 'Your Balance';

    const cardAction = document.createElement('button');
    cardAction.className = 'card-action';
    cardAction.id = 'openStripeDashboardBtn';
    cardAction.textContent = 'Manage Account ';
    cardAction.appendChild(Icons.externalLink());

    header.appendChild(cardTitle);
    header.appendChild(cardAction);

    // Body
    const body = document.createElement('div');
    body.className = 'card-body';

    // Balance grid
    const grid = document.createElement('div');
    grid.className = 'balance-grid';

    // Available balance
    const availableItem = this.createBalanceItem(
      'available',
      'Available',
      formatCurrency(available * 100),
      'Ready for payout',
      Icons.arrowUp()
    );

    // Pending balance
    const pendingItem = this.createBalanceItem(
      'pending',
      'Pending',
      formatCurrency(pending * 100),
      'Processing (2-7 days)',
      Icons.clock()
    );

    // Total balance
    const totalItem = this.createBalanceItem(
      'total',
      'Total Balance',
      formatCurrency((available + pending) * 100),
      'Available + Pending',
      Icons.dollar()
    );

    grid.appendChild(availableItem);
    grid.appendChild(pendingItem);
    grid.appendChild(totalItem);
    body.appendChild(grid);

    // Payout warning if not enabled
    if (!payoutsEnabled) {
      const warning = document.createElement('div');
      warning.className = 'payout-warning';
      warning.appendChild(Icons.warning());

      const warningText = document.createElement('span');
      warningText.className = 'payout-warning-text';
      warningText.textContent = 'Complete account verification to enable payouts';

      const verifyBtn = document.createElement('button');
      verifyBtn.className = 'btn-small';
      verifyBtn.id = 'completeVerificationBtn';
      verifyBtn.textContent = 'Complete Setup';

      warning.appendChild(warningText);
      warning.appendChild(verifyBtn);
      body.appendChild(warning);
    }

    card.appendChild(header);
    card.appendChild(body);

    return card;
  }

  /**
   * Create a balance item element
   */
  createBalanceItem(type, label, value, hint, icon) {
    const item = document.createElement('div');
    item.className = `balance-item ${type}`;

    const labelDiv = document.createElement('div');
    labelDiv.className = 'balance-label';
    labelDiv.appendChild(icon);
    const labelText = document.createElement('span');
    labelText.textContent = label;
    labelDiv.appendChild(labelText);

    const valueDiv = document.createElement('div');
    valueDiv.className = 'balance-value';
    valueDiv.textContent = value;

    const hintDiv = document.createElement('div');
    hintDiv.className = 'balance-hint';
    hintDiv.textContent = hint;

    item.appendChild(labelDiv);
    item.appendChild(valueDiv);
    item.appendChild(hintDiv);

    return item;
  }

  /**
   * Render earnings chart
   */
  renderEarningsChart() {
    const { chartData, earnings } = this.state;
    const totals = earnings?.totals || { netEarnings: 0, dealsCompleted: 0 };

    const card = document.createElement('div');
    card.className = 'glass-card earnings-chart-card';

    // Header
    const header = document.createElement('div');
    header.className = 'card-header';

    const cardTitle = document.createElement('h3');
    cardTitle.className = 'card-title';
    cardTitle.textContent = 'Earnings Overview';

    const periodSelector = document.createElement('div');
    periodSelector.className = 'chart-period-selector';

    ['6m', '1y', 'all'].forEach((period, index) => {
      const btn = document.createElement('button');
      btn.className = `period-btn${index === 0 ? ' active' : ''}`;
      btn.dataset.period = period;
      btn.textContent = period.toUpperCase();
      periodSelector.appendChild(btn);
    });

    header.appendChild(cardTitle);
    header.appendChild(periodSelector);

    // Body
    const body = document.createElement('div');
    body.className = 'card-body';

    // Earnings summary
    const summary = document.createElement('div');
    summary.className = 'earnings-summary';

    const stats = [
      { value: formatCurrency(totals.netEarnings * 100), label: 'Total Earnings' },
      { value: totals.dealsCompleted.toString(), label: 'Deals Completed' },
      { value: formatCurrency((totals.netEarnings / Math.max(totals.dealsCompleted, 1)) * 100), label: 'Avg per Deal' }
    ];

    stats.forEach(stat => {
      const statDiv = document.createElement('div');
      statDiv.className = 'earnings-stat';

      const valueDiv = document.createElement('div');
      valueDiv.className = 'earnings-stat-value';
      valueDiv.textContent = stat.value;

      const labelDiv = document.createElement('div');
      labelDiv.className = 'earnings-stat-label';
      labelDiv.textContent = stat.label;

      statDiv.appendChild(valueDiv);
      statDiv.appendChild(labelDiv);
      summary.appendChild(statDiv);
    });

    body.appendChild(summary);

    // Chart
    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'earnings-chart';

    if (chartData.length > 0) {
      const chartContainer = document.createElement('div');
      chartContainer.className = 'chart-container';

      const maxEarnings = Math.max(...chartData.map(d => d.earnings), 1);
      const displayData = chartData.slice(-6);

      displayData.forEach(data => {
        const barContainer = document.createElement('div');
        barContainer.className = 'chart-bar-container';

        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        const heightPercent = (data.earnings / maxEarnings) * 100;
        bar.style.height = `${heightPercent}%`;

        const tooltip = document.createElement('div');
        tooltip.className = 'chart-bar-tooltip';
        tooltip.textContent = formatCurrency(data.earnings * 100);
        bar.appendChild(tooltip);

        const label = document.createElement('div');
        label.className = 'chart-label';
        label.textContent = data.label.split('/')[0];

        barContainer.appendChild(bar);
        barContainer.appendChild(label);
        chartContainer.appendChild(barContainer);
      });

      chartWrapper.appendChild(chartContainer);
    } else {
      const empty = document.createElement('div');
      empty.className = 'chart-empty';
      empty.appendChild(Icons.chart());
      const emptyText = document.createElement('p');
      emptyText.textContent = 'No earnings data yet. Complete deals to see your earnings chart.';
      empty.appendChild(emptyText);
      chartWrapper.appendChild(empty);
    }

    body.appendChild(chartWrapper);
    card.appendChild(header);
    card.appendChild(body);

    return card;
  }

  /**
   * Render payout history
   */
  renderPayoutHistory() {
    const { payouts } = this.state;
    const recentPayouts = payouts.slice(0, 5);

    const card = document.createElement('div');
    card.className = 'glass-card payout-history-card';

    // Header
    const header = document.createElement('div');
    header.className = 'card-header';

    const cardTitle = document.createElement('h3');
    cardTitle.className = 'card-title';
    cardTitle.textContent = 'Payout History';

    header.appendChild(cardTitle);

    if (payouts.length > 5) {
      const viewAllBtn = document.createElement('button');
      viewAllBtn.className = 'card-action';
      viewAllBtn.id = 'viewAllPayoutsBtn';
      viewAllBtn.textContent = 'View All';
      header.appendChild(viewAllBtn);
    }

    // Body
    const body = document.createElement('div');
    body.className = 'card-body';

    const list = document.createElement('div');
    list.className = 'payout-list';

    if (recentPayouts.length > 0) {
      recentPayouts.forEach(payout => {
        list.appendChild(this.renderPayoutRow(payout));
      });
    } else {
      const empty = document.createElement('div');
      empty.className = 'payout-empty';
      empty.appendChild(Icons.payout());
      const emptyText = document.createElement('p');
      emptyText.textContent = 'No payouts yet. Earnings from completed deals will appear here.';
      empty.appendChild(emptyText);
      list.appendChild(empty);
    }

    body.appendChild(list);
    card.appendChild(header);
    card.appendChild(body);

    return card;
  }

  /**
   * Render single payout row
   */
  renderPayoutRow(payout) {
    const statusClass = PAYOUT_STATUS_CLASSES[payout.status] || 'muted';
    const statusLabel = PAYOUT_STATUS_LABELS[payout.status] || payout.status;
    const date = new Date(payout.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const amount = formatCurrency(payout.amount_cents);

    const item = document.createElement('div');
    item.className = 'payout-item';

    // Icon
    const iconDiv = document.createElement('div');
    iconDiv.className = `payout-icon ${statusClass}`;
    const iconSvg = createSVG(20, 20);
    if (payout.status === 'paid') {
      iconSvg.appendChild(createPolyline('20 6 9 17 4 12'));
    } else {
      iconSvg.appendChild(createCircle(12, 12, 10));
      iconSvg.appendChild(createPolyline('12 6 12 12 16 14'));
    }
    iconDiv.appendChild(iconSvg);

    // Details
    const details = document.createElement('div');
    details.className = 'payout-details';

    const description = document.createElement('div');
    description.className = 'payout-description';
    description.textContent = payout.description || 'Payout to bank account';

    const dateDiv = document.createElement('div');
    dateDiv.className = 'payout-date';
    dateDiv.textContent = date;

    details.appendChild(description);
    details.appendChild(dateDiv);

    // Right side
    const right = document.createElement('div');
    right.className = 'payout-right';

    const amountDiv = document.createElement('div');
    amountDiv.className = 'payout-amount';
    amountDiv.textContent = amount;

    const statusDiv = document.createElement('div');
    statusDiv.className = `payout-status ${statusClass}`;
    statusDiv.textContent = statusLabel;

    right.appendChild(amountDiv);
    right.appendChild(statusDiv);

    item.appendChild(iconDiv);
    item.appendChild(details);
    item.appendChild(right);

    return item;
  }

  /**
   * Render tax documents section
   */
  renderTaxDocuments() {
    const { taxForms } = this.state;
    const currentYear = new Date().getFullYear();

    const card = document.createElement('div');
    card.className = 'glass-card tax-documents-card';

    // Header
    const header = document.createElement('div');
    header.className = 'card-header';

    const cardTitle = document.createElement('h3');
    cardTitle.className = 'card-title';
    cardTitle.textContent = 'Tax Documents';

    const subtitle = document.createElement('span');
    subtitle.className = 'card-subtitle';
    subtitle.textContent = `Tax Year ${currentYear}`;

    header.appendChild(cardTitle);
    header.appendChild(subtitle);

    // Body
    const body = document.createElement('div');
    body.className = 'card-body';

    const formsList = document.createElement('div');
    formsList.className = 'tax-forms-list';

    if (taxForms.length > 0) {
      taxForms.forEach(form => {
        formsList.appendChild(this.renderTaxFormItem(form));
      });
    } else {
      const empty = document.createElement('div');
      empty.className = 'tax-empty';

      const docIcon = Icons.document();
      docIcon.setAttribute('width', '48');
      docIcon.setAttribute('height', '48');
      docIcon.setAttribute('stroke', 'var(--gray-600)');
      docIcon.setAttribute('stroke-width', '1.5');
      empty.appendChild(docIcon);

      const emptyText = document.createElement('p');
      emptyText.textContent = 'Tax documents will be available here after you receive $600+ in earnings for the tax year.';
      empty.appendChild(emptyText);
      formsList.appendChild(empty);
    }

    body.appendChild(formsList);

    // Info note
    const info = document.createElement('div');
    info.className = 'tax-info';

    const infoIcon = Icons.info();
    infoIcon.setAttribute('width', '16');
    infoIcon.setAttribute('height', '16');
    info.appendChild(infoIcon);

    const infoText = document.createElement('span');
    infoText.textContent = '1099-K forms are generated automatically if you receive $600+ in payments during a tax year.';
    info.appendChild(infoText);

    body.appendChild(info);
    card.appendChild(header);
    card.appendChild(body);

    return card;
  }

  /**
   * Render single tax form item
   */
  renderTaxFormItem(form) {
    const item = document.createElement('div');
    item.className = 'tax-form-item';

    const iconDiv = document.createElement('div');
    iconDiv.className = 'tax-form-icon';
    iconDiv.appendChild(Icons.document());

    const infoDiv = document.createElement('div');
    infoDiv.className = 'tax-form-info';

    const name = document.createElement('div');
    name.className = 'tax-form-name';
    name.textContent = `Form 1099-K (${form.tax_year})`;

    const status = document.createElement('div');
    status.className = 'tax-form-status';
    status.textContent = form.status === 'available' ? 'Ready to download' : 'Processing';

    infoDiv.appendChild(name);
    infoDiv.appendChild(status);

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn-download-tax';
    downloadBtn.dataset.formId = form.id;
    if (form.status !== 'available') {
      downloadBtn.disabled = true;
    }
    downloadBtn.appendChild(Icons.download());
    const btnText = document.createElement('span');
    btnText.textContent = 'Download';
    downloadBtn.appendChild(btnText);

    item.appendChild(iconDiv);
    item.appendChild(infoDiv);
    item.appendChild(downloadBtn);

    return item;
  }

  /**
   * Attach event listeners after render
   */
  attachEventListeners() {
    // Retry button
    const retryBtn = document.getElementById('retryPaymentsBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.loadData());
    }

    // Setup payouts button
    const setupBtn = document.getElementById('setupPayoutsBtn');
    if (setupBtn) {
      setupBtn.addEventListener('click', () => this.handleSetupPayouts());
    }

    // Complete verification button
    const verifyBtn = document.getElementById('completeVerificationBtn');
    if (verifyBtn) {
      verifyBtn.addEventListener('click', () => this.handleSetupPayouts());
    }

    // Open Stripe dashboard button
    const dashboardBtn = document.getElementById('openStripeDashboardBtn');
    if (dashboardBtn) {
      dashboardBtn.addEventListener('click', () => this.handleOpenDashboard());
    }

    // View all payouts button
    const viewAllBtn = document.getElementById('viewAllPayoutsBtn');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', () => this.handleViewAllPayouts());
    }

    // Period selector buttons
    const periodBtns = document.querySelectorAll('.period-btn');
    periodBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handlePeriodChange(e.target.dataset.period));
    });

    // Tax form download buttons
    const downloadBtns = document.querySelectorAll('.btn-download-tax');
    downloadBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const formId = e.currentTarget.dataset.formId;
        this.handleDownloadTaxForm(formId);
      });
    });
  }

  /**
   * Handle setup payouts action
   */
  async handleSetupPayouts() {
    const btn = document.getElementById('setupPayoutsBtn') || document.getElementById('completeVerificationBtn');
    if (btn) {
      btn.disabled = true;
      // Clear button and add spinner
      while (btn.firstChild) btn.removeChild(btn.firstChild);
      btn.appendChild(Icons.spinner());
      const loadingText = document.createElement('span');
      loadingText.textContent = 'Setting up...';
      btn.appendChild(loadingText);
    }

    try {
      const returnUrl = `${window.location.origin}/athlete-dashboard.html?stripe_return=true`;
      const result = await createConnectOnboardingLink(returnUrl);

      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error(result.error?.message || 'Failed to create onboarding link');
      }
    } catch (error) {
      console.error('[AthletePayments] Setup error:', error);
      this.showToast('Failed to start payout setup. Please try again.', 'error');
      if (btn) {
        btn.disabled = false;
        while (btn.firstChild) btn.removeChild(btn.firstChild);
        const icon = Icons.creditCard();
        icon.setAttribute('width', '20');
        icon.setAttribute('height', '20');
        icon.setAttribute('stroke', 'currentColor');
        btn.appendChild(icon);
        const btnText = document.createElement('span');
        btnText.textContent = 'Set Up Payouts';
        btn.appendChild(btnText);
      }
    }
  }

  /**
   * Handle open Stripe dashboard action
   */
  async handleOpenDashboard() {
    try {
      const result = await getConnectDashboardLink();
      if (result.url) {
        window.open(result.url, '_blank');
      } else {
        throw new Error(result.error?.message || 'Failed to open dashboard');
      }
    } catch (error) {
      console.error('[AthletePayments] Dashboard error:', error);
      this.showToast('Failed to open Stripe dashboard. Please try again.', 'error');
    }
  }

  /**
   * Handle view all payouts
   */
  handleViewAllPayouts() {
    this.showToast('Full payout history coming soon!', 'info');
  }

  /**
   * Handle period change for chart
   */
  async handlePeriodChange(period) {
    const months = period === '6m' ? 6 : period === '1y' ? 12 : 60;

    // Update active button
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === period);
    });

    try {
      const result = await getEarningsChartData(months);
      if (result.chartData) {
        this.state.chartData = result.chartData;
        // Re-render just the chart section
        const chartCard = this.container.querySelector('.earnings-chart-card');
        if (chartCard) {
          chartCard.replaceWith(this.renderEarningsChart());
          this.attachEventListeners();
        }
      }
    } catch (error) {
      console.error('[AthletePayments] Chart update error:', error);
    }
  }

  /**
   * Handle tax form download
   */
  handleDownloadTaxForm(formId) {
    this.showToast('Downloading tax form...', 'info');
    console.log('[AthletePayments] Download tax form:', formId);
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else if (typeof window.showAuthToast === 'function') {
      window.showAuthToast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
}

// ============================================================================
// INITIALIZATION HELPER
// ============================================================================

/**
 * Initialize the AthletePayments component
 * @param {string} containerId - The container element ID
 * @returns {AthletePayments} The component instance
 */
export function initAthletePayments(containerId = 'paymentsContainer') {
  return new AthletePayments(containerId);
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default AthletePayments;

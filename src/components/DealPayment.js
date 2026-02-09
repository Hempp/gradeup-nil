/**
 * GradeUp NIL Platform - Deal Payment Component
 * Stripe Elements integration for paying for athlete deals
 *
 * Nike-inspired premium design with glassmorphism effects
 * Uses Stripe.js for secure card payment processing
 *
 * SECURITY NOTE: This component uses safe DOM methods for all dynamic content.
 * All user/deal data is escaped via textContent before display. The only innerHTML
 * usage is for static SVG icon paths defined internally - never for user content.
 * Stripe Elements handles sensitive card data securely - no card numbers touch our code.
 *
 * @module components/DealPayment
 * @version 1.0.0
 */

import {
  createPaymentIntent,
  getPaymentForDeal,
  formatCurrency,
  calculateFeeBreakdown,
  PAYMENT_STATUS,
  PLATFORM_FEE_PERCENT,
} from '../services/payments.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const STRIPE_ELEMENT_STYLE = {
  base: {
    color: '#ffffff',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    fontSmoothing: 'antialiased',
    fontSize: '16px',
    '::placeholder': {
      color: '#737373',
    },
  },
  invalid: {
    color: '#ef4444',
    iconColor: '#ef4444',
  },
};

// Static SVG path definitions - internal code only, not user content
const SVG_PATHS = {
  'x': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  'check': '<polyline points="20 6 9 17 4 12"/>',
  'lock': '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  'share': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
  'calendar': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  'megaphone': '<path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  'package': '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Escape HTML entities to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * Create an SVG icon element using predefined paths
 * Only uses static internal path definitions, never user content
 * @param {string} name - Icon name from SVG_PATHS
 * @returns {SVGElement} SVG element
 */
function createSvgIcon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  // Safe: SVG_PATHS contains only static strings defined in this file
  const pathContent = SVG_PATHS[name] || '';
  if (pathContent) {
    // Using innerHTML only for static internal SVG paths, not user content
    svg.innerHTML = pathContent;
  }
  return svg;
}

// ============================================================================
// DEAL PAYMENT COMPONENT
// ============================================================================

class DealPayment {
  constructor(options = {}) {
    // Required options
    this.deal = options.deal;
    this.athlete = options.athlete;

    if (!this.deal) {
      throw new Error('DealPayment requires a deal object');
    }

    // State
    this.stripe = null;
    this.elements = null;
    this.cardElement = null;
    this.clientSecret = null;
    this.paymentId = null;
    this.isLoading = false;
    this.isProcessing = false;
    this.error = null;
    this.paymentComplete = false;
    this.modalElement = null;

    // Options
    this.options = {
      stripePublishableKey: options.stripePublishableKey || 'pk_test_placeholder',
      onSuccess: options.onSuccess || null,
      onError: options.onError || null,
      onClose: options.onClose || null,
      ...options,
    };

    // Bind methods
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Open the payment modal
   */
  async open() {
    this.injectStyles();
    this.createModal();
    await this.initializeStripe();
    this.bindEvents();
  }

  /**
   * Close the payment modal
   */
  close() {
    if (this.modalElement) {
      document.body.removeChild(this.modalElement);
      this.modalElement = null;
    }

    document.removeEventListener('keydown', this.handleKeyDown);

    if (this.options.onClose) {
      this.options.onClose(this.paymentComplete);
    }
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async initializeStripe() {
    this.showLoading();

    try {
      // Load Stripe.js if not already loaded
      if (!window.Stripe) {
        await this.loadStripeJs();
      }

      // Initialize Stripe
      this.stripe = window.Stripe(this.options.stripePublishableKey);

      // Create payment intent
      const { clientSecret, paymentId, error } = await createPaymentIntent(this.deal.id);

      if (error) {
        throw error;
      }

      this.clientSecret = clientSecret;
      this.paymentId = paymentId;

      // Create Elements instance
      this.elements = this.stripe.elements({
        clientSecret: this.clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#00f0ff',
            colorBackground: '#171717',
            colorText: '#ffffff',
            colorDanger: '#ef4444',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            borderRadius: '10px',
          },
        },
      });

      // Create card element
      this.cardElement = this.elements.create('card', {
        style: STRIPE_ELEMENT_STYLE,
      });

      // Mount card element
      const cardContainer = this.modalElement.querySelector('#card-element');
      if (cardContainer) {
        this.cardElement.mount(cardContainer);

        // Listen for card errors
        this.cardElement.on('change', (event) => {
          this.updateCardError(event.error ? event.error.message : null);
        });
      }

      this.hideLoading();
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      this.showError('Failed to initialize payment. Please try again.');
    }
  }

  loadStripeJs() {
    return new Promise((resolve, reject) => {
      if (window.Stripe) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Stripe.js'));
      document.head.appendChild(script);
    });
  }

  // ============================================================
  // RENDERING
  // ============================================================

  createModal() {
    const deal = this.deal;
    const athlete = this.athlete;
    const breakdown = calculateFeeBreakdown(deal.amount || deal.total_amount || 0);

    // Create modal overlay
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'deal-payment-overlay';
    this.modalElement.setAttribute('role', 'dialog');
    this.modalElement.setAttribute('aria-modal', 'true');
    this.modalElement.setAttribute('aria-labelledby', 'payment-modal-title');

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'deal-payment-modal';

    // Header
    modal.appendChild(this.createHeader());

    // Content
    const content = document.createElement('div');
    content.className = 'payment-content';

    // Deal Summary
    content.appendChild(this.createDealSummary(deal, athlete));

    // Payment breakdown
    content.appendChild(this.createPaymentBreakdown(breakdown));

    // Card form
    content.appendChild(this.createCardForm());

    // Error display
    const errorContainer = document.createElement('div');
    errorContainer.className = 'payment-error';
    errorContainer.id = 'payment-error';
    errorContainer.setAttribute('role', 'alert');
    errorContainer.setAttribute('aria-live', 'assertive');
    content.appendChild(errorContainer);

    modal.appendChild(content);

    // Footer with buttons
    modal.appendChild(this.createFooter(breakdown.total));

    // Loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'payment-loading-overlay';
    loadingOverlay.id = 'payment-loading';

    const spinner = document.createElement('div');
    spinner.className = 'payment-spinner';
    const loadingText = document.createElement('p');
    loadingText.textContent = 'Initializing payment...';
    loadingOverlay.appendChild(spinner);
    loadingOverlay.appendChild(loadingText);
    modal.appendChild(loadingOverlay);

    // Success overlay
    modal.appendChild(this.createSuccessOverlay());

    this.modalElement.appendChild(modal);

    // Click outside to close
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement && !this.isProcessing) {
        this.handleClose();
      }
    });

    document.body.appendChild(this.modalElement);

    // Focus trap - focus the modal
    setTimeout(() => {
      const firstFocusable = modal.querySelector('button, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }, 100);
  }

  createHeader() {
    const header = document.createElement('div');
    header.className = 'payment-header';

    const title = document.createElement('h2');
    title.id = 'payment-modal-title';
    title.className = 'payment-title';
    title.textContent = 'Complete Payment';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'payment-close-btn';
    closeBtn.id = 'close-payment-btn';
    closeBtn.setAttribute('aria-label', 'Close payment modal');
    closeBtn.appendChild(createSvgIcon('x'));

    header.appendChild(title);
    header.appendChild(closeBtn);

    return header;
  }

  createDealSummary(deal, athlete) {
    const summary = document.createElement('div');
    summary.className = 'deal-summary';

    // Athlete info
    const athleteInfo = document.createElement('div');
    athleteInfo.className = 'deal-athlete';

    if (athlete?.avatar_url || athlete?.profiles?.avatar_url) {
      const avatar = document.createElement('img');
      avatar.src = athlete.avatar_url || athlete.profiles?.avatar_url;
      avatar.alt = escapeHtml(this.getAthleteName(athlete));
      avatar.className = 'deal-athlete-avatar';
      athleteInfo.appendChild(avatar);
    } else {
      const avatarPlaceholder = document.createElement('div');
      avatarPlaceholder.className = 'deal-athlete-avatar-placeholder';
      avatarPlaceholder.textContent = this.getAthleteInitials(athlete);
      athleteInfo.appendChild(avatarPlaceholder);
    }

    const athleteDetails = document.createElement('div');
    athleteDetails.className = 'deal-athlete-details';

    const athleteName = document.createElement('div');
    athleteName.className = 'deal-athlete-name';
    athleteName.textContent = this.getAthleteName(athlete);

    const athleteMeta = document.createElement('div');
    athleteMeta.className = 'deal-athlete-meta';
    athleteMeta.textContent = athlete?.sport || athlete?.school || '';

    athleteDetails.appendChild(athleteName);
    athleteDetails.appendChild(athleteMeta);
    athleteInfo.appendChild(athleteDetails);

    summary.appendChild(athleteInfo);

    // Deal info
    const dealInfo = document.createElement('div');
    dealInfo.className = 'deal-info';

    const dealTitle = document.createElement('div');
    dealTitle.className = 'deal-title';
    dealTitle.textContent = deal.title || 'NIL Deal';

    const dealType = document.createElement('div');
    dealType.className = 'deal-type';

    const typeIcon = createSvgIcon(this.getDealTypeIcon(deal.deal_type));
    const typeBadge = document.createElement('span');
    typeBadge.className = 'deal-type-badge';
    typeBadge.textContent = deal.deal_type || 'One-time';

    dealType.appendChild(typeIcon);
    dealType.appendChild(typeBadge);

    dealInfo.appendChild(dealTitle);
    dealInfo.appendChild(dealType);

    summary.appendChild(dealInfo);

    return summary;
  }

  getAthleteName(athlete) {
    if (athlete?.name) return athlete.name;
    if (athlete?.profiles) {
      return (athlete.profiles.first_name || '') + ' ' + (athlete.profiles.last_name || '');
    }
    if (athlete?.first_name) {
      return athlete.first_name + ' ' + (athlete.last_name || '');
    }
    return 'Athlete';
  }

  getAthleteInitials(athlete) {
    const name = this.getAthleteName(athlete);
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getDealTypeIcon(type) {
    const icons = {
      endorsement: 'star',
      'social-post': 'share',
      appearance: 'calendar',
      campaign: 'megaphone',
    };
    return icons[type?.toLowerCase()] || 'package';
  }

  createPaymentBreakdown(breakdown) {
    const container = document.createElement('div');
    container.className = 'payment-breakdown';

    const title = document.createElement('h3');
    title.className = 'breakdown-title';
    title.textContent = 'Payment Breakdown';
    container.appendChild(title);

    // Deal amount
    const dealRow = this.createBreakdownRow('Deal Amount', formatCurrency(breakdown.total * 100));
    container.appendChild(dealRow);

    // Platform fee
    const feeRow = this.createBreakdownRow(
      'Platform Fee (' + PLATFORM_FEE_PERCENT + '%)',
      formatCurrency(breakdown.platformFee * 100),
      'fee'
    );
    container.appendChild(feeRow);

    // Athlete receives
    const athleteRow = this.createBreakdownRow(
      'Athlete Receives',
      formatCurrency(breakdown.athleteAmount * 100),
      'highlight'
    );
    container.appendChild(athleteRow);

    // Divider
    const divider = document.createElement('div');
    divider.className = 'breakdown-divider';
    container.appendChild(divider);

    // Total
    const totalRow = this.createBreakdownRow('Total', formatCurrency(breakdown.total * 100), 'total');
    container.appendChild(totalRow);

    return container;
  }

  createBreakdownRow(label, value, type = '') {
    const row = document.createElement('div');
    row.className = 'breakdown-row' + (type ? ' ' + type : '');

    const labelEl = document.createElement('span');
    labelEl.className = 'breakdown-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'breakdown-value';
    valueEl.textContent = value;

    row.appendChild(labelEl);
    row.appendChild(valueEl);

    return row;
  }

  createCardForm() {
    const form = document.createElement('div');
    form.className = 'card-form';

    const label = document.createElement('label');
    label.className = 'card-label';
    label.setAttribute('for', 'card-element');
    label.textContent = 'Card Details';

    const cardContainer = document.createElement('div');
    cardContainer.className = 'card-element-container';
    cardContainer.id = 'card-element';

    const cardError = document.createElement('div');
    cardError.className = 'card-error';
    cardError.id = 'card-error';
    cardError.setAttribute('role', 'alert');

    // Security note
    const securityNote = document.createElement('div');
    securityNote.className = 'security-note';

    const lockIcon = createSvgIcon('lock');
    const securityText = document.createElement('span');
    securityText.textContent = 'Payments are securely processed by Stripe';

    securityNote.appendChild(lockIcon);
    securityNote.appendChild(securityText);

    form.appendChild(label);
    form.appendChild(cardContainer);
    form.appendChild(cardError);
    form.appendChild(securityNote);

    return form;
  }

  createFooter(total) {
    const footer = document.createElement('div');
    footer.className = 'payment-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.id = 'cancel-payment-btn';
    cancelBtn.textContent = 'Cancel';

    const payBtn = document.createElement('button');
    payBtn.className = 'btn btn-primary';
    payBtn.id = 'submit-payment-btn';
    payBtn.disabled = true;

    const payIcon = createSvgIcon('lock');
    const payText = document.createElement('span');
    payText.textContent = 'Pay ' + formatCurrency(total * 100);

    payBtn.appendChild(payIcon);
    payBtn.appendChild(payText);

    footer.appendChild(cancelBtn);
    footer.appendChild(payBtn);

    return footer;
  }

  createSuccessOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'payment-success-overlay';
    overlay.id = 'payment-success';

    const content = document.createElement('div');
    content.className = 'success-content';

    const iconContainer = document.createElement('div');
    iconContainer.className = 'success-icon';
    iconContainer.appendChild(createSvgIcon('check'));

    const title = document.createElement('h3');
    title.textContent = 'Payment Successful!';

    const message = document.createElement('p');
    message.textContent = 'Your payment has been processed and the athlete has been notified.';

    const doneBtn = document.createElement('button');
    doneBtn.className = 'btn btn-primary';
    doneBtn.id = 'done-payment-btn';
    doneBtn.textContent = 'Done';

    content.appendChild(iconContainer);
    content.appendChild(title);
    content.appendChild(message);
    content.appendChild(doneBtn);

    overlay.appendChild(content);

    return overlay;
  }

  // ============================================================
  // UI STATE UPDATES
  // ============================================================

  showLoading() {
    const loading = this.modalElement?.querySelector('#payment-loading');
    if (loading) {
      loading.classList.add('visible');
    }

    const submitBtn = this.modalElement?.querySelector('#submit-payment-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
    }
  }

  hideLoading() {
    const loading = this.modalElement?.querySelector('#payment-loading');
    if (loading) {
      loading.classList.remove('visible');
    }

    const submitBtn = this.modalElement?.querySelector('#submit-payment-btn');
    if (submitBtn) {
      submitBtn.disabled = false;
    }
  }

  showError(message) {
    const errorEl = this.modalElement?.querySelector('#payment-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
    this.hideLoading();
  }

  hideError() {
    const errorEl = this.modalElement?.querySelector('#payment-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('visible');
    }
  }

  updateCardError(message) {
    const cardError = this.modalElement?.querySelector('#card-error');
    if (cardError) {
      cardError.textContent = message || '';
    }
  }

  showProcessing() {
    this.isProcessing = true;

    const submitBtn = this.modalElement?.querySelector('#submit-payment-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';
    }

    const cancelBtn = this.modalElement?.querySelector('#cancel-payment-btn');
    if (cancelBtn) {
      cancelBtn.disabled = true;
    }

    const closeBtn = this.modalElement?.querySelector('#close-payment-btn');
    if (closeBtn) {
      closeBtn.disabled = true;
    }
  }

  showSuccess() {
    this.paymentComplete = true;
    this.isProcessing = false;

    const success = this.modalElement?.querySelector('#payment-success');
    if (success) {
      success.classList.add('visible');
    }
  }

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  bindEvents() {
    document.addEventListener('keydown', this.handleKeyDown);

    const closeBtn = this.modalElement?.querySelector('#close-payment-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', this.handleClose);
    }

    const cancelBtn = this.modalElement?.querySelector('#cancel-payment-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', this.handleClose);
    }

    const submitBtn = this.modalElement?.querySelector('#submit-payment-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', this.handleSubmit);
    }

    const doneBtn = this.modalElement?.querySelector('#done-payment-btn');
    if (doneBtn) {
      doneBtn.addEventListener('click', this.handleClose);
    }
  }

  handleKeyDown(e) {
    if (e.key === 'Escape' && !this.isProcessing) {
      this.handleClose();
    }
  }

  handleClose() {
    if (this.isProcessing) return;
    this.close();
  }

  async handleSubmit() {
    if (!this.stripe || !this.cardElement || !this.clientSecret) {
      this.showError('Payment not initialized. Please try again.');
      return;
    }

    this.hideError();
    this.showProcessing();

    try {
      const { error, paymentIntent } = await this.stripe.confirmCardPayment(this.clientSecret, {
        payment_method: {
          card: this.cardElement,
        },
      });

      if (error) {
        this.showError(error.message);
        this.isProcessing = false;

        const submitBtn = this.modalElement?.querySelector('#submit-payment-btn');
        if (submitBtn) {
          submitBtn.disabled = false;
          // Clear and rebuild button content
          while (submitBtn.firstChild) {
            submitBtn.removeChild(submitBtn.firstChild);
          }
          submitBtn.appendChild(createSvgIcon('lock'));
          const breakdown = calculateFeeBreakdown(this.deal.amount || this.deal.total_amount || 0);
          const payText = document.createElement('span');
          payText.textContent = 'Pay ' + formatCurrency(breakdown.total * 100);
          submitBtn.appendChild(payText);
        }

        const cancelBtn = this.modalElement?.querySelector('#cancel-payment-btn');
        if (cancelBtn) {
          cancelBtn.disabled = false;
        }

        const closeBtn = this.modalElement?.querySelector('#close-payment-btn');
        if (closeBtn) {
          closeBtn.disabled = false;
        }

        if (this.options.onError) {
          this.options.onError(error);
        }
      } else if (paymentIntent.status === 'succeeded') {
        this.showSuccess();

        if (this.options.onSuccess) {
          this.options.onSuccess({
            paymentIntent,
            paymentId: this.paymentId,
            dealId: this.deal.id,
          });
        }
      } else if (paymentIntent.status === 'requires_action') {
        // 3D Secure or other action required - Stripe handles this
        this.showError('Additional authentication required. Please complete the verification.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      this.showError('An unexpected error occurred. Please try again.');
      this.isProcessing = false;

      if (this.options.onError) {
        this.options.onError(error);
      }
    }
  }

  // ============================================================
  // STYLES
  // ============================================================

  injectStyles() {
    if (document.getElementById('deal-payment-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'deal-payment-styles';
    styles.textContent = `
      /* ═══════════════════════════════════════════════════════════════════════════
         DEAL PAYMENT COMPONENT STYLES
         Nike x Apple Inspired Design
         ═══════════════════════════════════════════════════════════════════════════ */

      .deal-payment-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        animation: fadeIn 0.2s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .deal-payment-modal {
        position: relative;
        background: var(--gray-900, #171717);
        border: 1px solid var(--gray-800, #262626);
        border-radius: 24px;
        width: 100%;
        max-width: 480px;
        max-height: 90vh;
        overflow-y: auto;
        animation: slideUp 0.3s ease;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        color: var(--white, #fff);
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Header */
      .payment-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5rem;
        border-bottom: 1px solid var(--gray-800, #262626);
      }

      .payment-title {
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0;
      }

      .payment-close-btn {
        width: 36px;
        height: 36px;
        background: var(--gray-800, #262626);
        border: none;
        border-radius: 10px;
        color: var(--gray-400, #a3a3a3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s ease, color 0.2s ease;
      }

      .payment-close-btn:hover {
        background: var(--gray-700, #404040);
        color: var(--white, #fff);
      }

      .payment-close-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .payment-close-btn svg {
        width: 20px;
        height: 20px;
      }

      /* Content */
      .payment-content {
        padding: 1.5rem;
      }

      /* Deal Summary */
      .deal-summary {
        background: var(--gray-800, #262626);
        border-radius: 16px;
        padding: 1.25rem;
        margin-bottom: 1.5rem;
      }

      .deal-athlete {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--gray-700, #404040);
      }

      .deal-athlete-avatar {
        width: 56px;
        height: 56px;
        border-radius: 14px;
        object-fit: cover;
      }

      .deal-athlete-avatar-placeholder {
        width: 56px;
        height: 56px;
        border-radius: 14px;
        background: linear-gradient(135deg, var(--cyan, #00f0ff), var(--magenta, #ff00ff));
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--white, #fff);
      }

      .deal-athlete-details {
        flex: 1;
      }

      .deal-athlete-name {
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
      }

      .deal-athlete-meta {
        font-size: 0.875rem;
        color: var(--gray-500, #737373);
      }

      .deal-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .deal-title {
        font-size: 1rem;
        font-weight: 500;
      }

      .deal-type {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .deal-type svg {
        width: 16px;
        height: 16px;
        color: var(--cyan, #00f0ff);
      }

      .deal-type-badge {
        padding: 0.25rem 0.625rem;
        background: rgba(0, 240, 255, 0.15);
        border-radius: 100px;
        font-size: 0.6875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--cyan, #00f0ff);
      }

      /* Payment Breakdown */
      .payment-breakdown {
        background: var(--gray-800, #262626);
        border-radius: 16px;
        padding: 1.25rem;
        margin-bottom: 1.5rem;
      }

      .breakdown-title {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--gray-500, #737373);
        margin: 0 0 1rem 0;
      }

      .breakdown-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 0;
        font-size: 0.9375rem;
      }

      .breakdown-label {
        color: var(--gray-400, #a3a3a3);
      }

      .breakdown-value {
        font-weight: 500;
      }

      .breakdown-row.fee .breakdown-label {
        font-size: 0.8125rem;
      }

      .breakdown-row.fee .breakdown-value {
        color: var(--gray-500, #737373);
        font-size: 0.875rem;
      }

      .breakdown-row.highlight {
        background: rgba(0, 240, 255, 0.05);
        margin: 0.5rem -1rem;
        padding: 0.75rem 1rem;
        border-radius: 8px;
      }

      .breakdown-row.highlight .breakdown-label {
        color: var(--cyan, #00f0ff);
      }

      .breakdown-row.highlight .breakdown-value {
        color: var(--cyan, #00f0ff);
      }

      .breakdown-divider {
        height: 1px;
        background: var(--gray-700, #404040);
        margin: 0.75rem 0;
      }

      .breakdown-row.total {
        padding-top: 0.75rem;
      }

      .breakdown-row.total .breakdown-label {
        font-size: 1rem;
        font-weight: 600;
        color: var(--white, #fff);
      }

      .breakdown-row.total .breakdown-value {
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--white, #fff);
      }

      /* Card Form */
      .card-form {
        margin-bottom: 1rem;
      }

      .card-label {
        display: block;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--gray-500, #737373);
        margin-bottom: 0.75rem;
      }

      .card-element-container {
        background: var(--gray-800, #262626);
        border: 1px solid var(--gray-700, #404040);
        border-radius: 12px;
        padding: 1rem;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }

      .card-element-container:focus-within {
        border-color: var(--cyan, #00f0ff);
        box-shadow: 0 0 0 3px rgba(0, 240, 255, 0.1);
      }

      .card-error {
        color: var(--error, #ef4444);
        font-size: 0.8125rem;
        margin-top: 0.5rem;
        min-height: 1.25rem;
      }

      .security-note {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 1rem;
        font-size: 0.75rem;
        color: var(--gray-500, #737373);
      }

      .security-note svg {
        width: 14px;
        height: 14px;
        color: var(--success, #22c55e);
      }

      /* Error Display */
      .payment-error {
        display: none;
        padding: 1rem;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 12px;
        color: var(--error, #ef4444);
        font-size: 0.875rem;
        margin-bottom: 1rem;
      }

      .payment-error.visible {
        display: block;
      }

      /* Footer */
      .payment-footer {
        display: flex;
        gap: 1rem;
        padding: 1.5rem;
        border-top: 1px solid var(--gray-800, #262626);
      }

      .payment-footer .btn {
        flex: 1;
      }

      /* Buttons */
      .deal-payment-modal .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.875rem 1.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border: none;
        border-radius: 100px;
        cursor: pointer;
        transition: all 0.25s ease;
      }

      .deal-payment-modal .btn svg {
        width: 18px;
        height: 18px;
      }

      .deal-payment-modal .btn-primary {
        background: var(--cyan, #00f0ff);
        color: var(--black, #000);
      }

      .deal-payment-modal .btn-primary:hover:not(:disabled) {
        background: var(--white, #fff);
        box-shadow: 0 0 40px rgba(0, 240, 255, 0.4);
        transform: translateY(-2px);
      }

      .deal-payment-modal .btn-secondary {
        background: var(--gray-800, #262626);
        color: var(--white, #fff);
      }

      .deal-payment-modal .btn-secondary:hover:not(:disabled) {
        background: var(--gray-700, #404040);
      }

      .deal-payment-modal .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Loading Overlay */
      .payment-loading-overlay {
        position: absolute;
        inset: 0;
        background: rgba(23, 23, 23, 0.95);
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        border-radius: 24px;
        z-index: 10;
      }

      .payment-loading-overlay.visible {
        display: flex;
      }

      .payment-spinner {
        width: 48px;
        height: 48px;
        border: 3px solid var(--gray-700, #404040);
        border-top-color: var(--cyan, #00f0ff);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .payment-loading-overlay p {
        color: var(--gray-400, #a3a3a3);
        font-size: 0.9375rem;
        margin: 0;
      }

      /* Success Overlay */
      .payment-success-overlay {
        position: absolute;
        inset: 0;
        background: rgba(23, 23, 23, 0.98);
        display: none;
        align-items: center;
        justify-content: center;
        border-radius: 24px;
        z-index: 20;
      }

      .payment-success-overlay.visible {
        display: flex;
      }

      .success-content {
        text-align: center;
        padding: 2rem;
      }

      .success-icon {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, var(--success, #22c55e), var(--cyan, #00f0ff));
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.5rem;
        animation: successPop 0.5s ease;
      }

      @keyframes successPop {
        0% {
          transform: scale(0);
          opacity: 0;
        }
        50% {
          transform: scale(1.2);
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }

      .success-icon svg {
        width: 40px;
        height: 40px;
        color: var(--white, #fff);
        stroke-width: 3;
      }

      .success-content h3 {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 0.5rem 0;
      }

      .success-content p {
        color: var(--gray-400, #a3a3a3);
        font-size: 0.9375rem;
        margin: 0 0 2rem 0;
        max-width: 300px;
      }

      .success-content .btn {
        min-width: 160px;
      }

      /* Responsive */
      @media (max-width: 480px) {
        .deal-payment-modal {
          max-height: 100vh;
          border-radius: 0;
        }

        .deal-payment-overlay {
          padding: 0;
        }

        .payment-footer {
          flex-direction: column-reverse;
        }
      }

      /* Scrollbar */
      .deal-payment-modal::-webkit-scrollbar {
        width: 8px;
      }

      .deal-payment-modal::-webkit-scrollbar-track {
        background: var(--gray-900, #171717);
      }

      .deal-payment-modal::-webkit-scrollbar-thumb {
        background: var(--gray-700, #404040);
        border-radius: 4px;
      }

      .deal-payment-modal::-webkit-scrollbar-thumb:hover {
        background: var(--gray-600, #525252);
      }
    `;

    document.head.appendChild(styles);
  }
}

// ============================================================================
// HELPER FUNCTION TO CREATE AND OPEN PAYMENT MODAL
// ============================================================================

/**
 * Create and open a deal payment modal
 * @param {object} options - Payment options
 * @param {object} options.deal - Deal object with id, title, amount, deal_type
 * @param {object} options.athlete - Athlete object with name, avatar_url, sport
 * @param {string} options.stripePublishableKey - Stripe publishable key
 * @param {function} options.onSuccess - Success callback
 * @param {function} options.onError - Error callback
 * @param {function} options.onClose - Close callback
 * @returns {DealPayment} DealPayment instance
 */
export function openDealPayment(options) {
  const payment = new DealPayment(options);
  payment.open();
  return payment;
}

// ============================================================================
// EXPORT
// ============================================================================

export default DealPayment;
export { DealPayment };

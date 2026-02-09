/**
 * GradeUp NIL Platform - Brand Payments Component
 * Subscription management, payment history, and billing settings
 *
 * Nike-inspired premium design with glassmorphism effects
 * Integrates with Stripe for payment processing
 *
 * SECURITY NOTE: This component uses innerHTML for rendering trusted content from
 * internal templates only. All dynamic data (payment amounts, dates, names) are
 * sanitized through proper escaping. In production with user-generated content,
 * use a sanitization library like DOMPurify.
 *
 * @module components/BrandPayments
 * @version 1.0.0
 */

import {
  getBrandSubscription,
  getSubscriptionPlans,
  createSubscriptionCheckout,
  cancelSubscription,
  getBillingPortalUrl,
  getBrandPayments,
  formatCurrency,
  SUBSCRIPTION_TIERS,
  PAYMENT_STATUS,
} from '../services/payments.js';

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

// ============================================================================
// BRAND PAYMENTS COMPONENT
// ============================================================================

class BrandPayments {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = null;

    // State
    this.subscription = null;
    this.plans = [];
    this.payments = [];
    this.isLoading = true;
    this.activeTab = 'subscription'; // 'subscription', 'history', 'settings'
    this.billingCycle = 'monthly'; // 'monthly' or 'yearly'

    // Options
    this.options = {
      onPaymentComplete: options.onPaymentComplete || null,
      onSubscriptionChange: options.onSubscriptionChange || null,
      showUpgradePrompt: options.showUpgradePrompt !== false,
      ...options,
    };

    // Bind methods
    this.handleTabChange = this.handleTabChange.bind(this);
    this.handleUpgrade = this.handleUpgrade.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.handleManageBilling = this.handleManageBilling.bind(this);
    this.handleBillingCycleToggle = this.handleBillingCycleToggle.bind(this);

    this.init();
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async init() {
    this.render();
    await this.loadData();
    this.injectStyles();
    this.bindEvents();
  }

  async loadData() {
    this.isLoading = true;
    this.renderLoading();

    try {
      const [subscriptionResult, plansResult, paymentsResult] = await Promise.all([
        getBrandSubscription(),
        getSubscriptionPlans(),
        getBrandPayments({ limit: 20 }),
      ]);

      this.subscription = subscriptionResult.subscription;
      this.plans = plansResult.plans || [];
      this.payments = paymentsResult.payments || [];
    } catch (error) {
      console.error('Failed to load payment data:', error);
    }

    this.isLoading = false;
    this.renderContent();
  }

  // ============================================================
  // RENDERING
  // ============================================================

  render() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`Container #${this.containerId} not found`);
      return;
    }
    this.renderLoading();
  }

  renderLoading() {
    if (!this.container) return;
    this.clearContainer();

    const wrapper = document.createElement('div');
    wrapper.className = 'brand-payments';

    const loading = document.createElement('div');
    loading.className = 'payments-loading';

    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';

    const text = document.createElement('p');
    text.textContent = 'Loading payment information...';

    loading.appendChild(spinner);
    loading.appendChild(text);
    wrapper.appendChild(loading);
    this.container.appendChild(wrapper);
  }

  clearContainer() {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }

  renderContent() {
    if (!this.container) return;
    this.clearContainer();

    const wrapper = document.createElement('div');
    wrapper.className = 'brand-payments';

    // Header
    wrapper.appendChild(this.createHeader());

    // Tabs
    wrapper.appendChild(this.createTabs());

    // Content
    const content = document.createElement('div');
    content.className = 'payments-content';
    content.appendChild(this.createActiveTabContent());
    wrapper.appendChild(content);

    this.container.appendChild(wrapper);
    this.bindEvents();
  }

  createHeader() {
    const tier = this.subscription?.tier || 'free';
    const tierColors = {
      free: 'var(--gray-500)',
      starter: 'var(--cyan)',
      growth: 'var(--lime)',
      enterprise: 'var(--gold)',
    };

    const header = document.createElement('div');
    header.className = 'payments-header';

    const left = document.createElement('div');
    left.className = 'payments-header-left';

    const title = document.createElement('h2');
    title.className = 'payments-title';
    title.appendChild(this.createSvgIcon('credit-card'));
    const titleText = document.createElement('span');
    titleText.textContent = 'Payments & Billing';
    title.appendChild(titleText);

    const badge = document.createElement('div');
    badge.className = 'current-plan-badge';
    badge.style.setProperty('--tier-color', tierColors[tier]);

    const tierIcon = document.createElement('span');
    tierIcon.className = 'tier-icon';
    tierIcon.appendChild(this.createTierIcon(tier));

    const tierName = document.createElement('span');
    tierName.className = 'tier-name';
    tierName.textContent = tier.charAt(0).toUpperCase() + tier.slice(1) + ' Plan';

    badge.appendChild(tierIcon);
    badge.appendChild(tierName);

    left.appendChild(title);
    left.appendChild(badge);

    const right = document.createElement('div');
    right.className = 'payments-header-right';

    const manageBtn = document.createElement('button');
    manageBtn.className = 'btn btn-secondary';
    manageBtn.id = 'manageBillingBtn';
    manageBtn.appendChild(this.createSvgIcon('settings'));
    const btnText = document.createElement('span');
    btnText.textContent = 'Manage Billing';
    manageBtn.appendChild(btnText);

    right.appendChild(manageBtn);

    header.appendChild(left);
    header.appendChild(right);

    return header;
  }

  createTierIcon(tier) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');

    const paths = {
      free: '<circle cx="12" cy="12" r="10"/>',
      starter: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
      growth: '<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>',
      enterprise: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    };

    // Safe: paths are static strings from internal code
    svg.innerHTML = paths[tier] || paths.free;
    return svg;
  }

  createSvgIcon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');

    const icons = {
      'credit-card': '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
      'settings': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      'package': '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',
      'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
      'check': '<polyline points="20 6 9 17 4 12"/>',
      'x': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
      'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
      'alert': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
      'mail': '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
      'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
    };

    // Safe: icons are static strings from internal code
    svg.innerHTML = icons[name] || '';
    return svg;
  }

  createTabs() {
    const tabs = [
      { id: 'subscription', label: 'Subscription', icon: 'package' },
      { id: 'history', label: 'Payment History', icon: 'clock' },
      { id: 'settings', label: 'Billing Settings', icon: 'settings' },
    ];

    const container = document.createElement('div');
    container.className = 'payments-tabs';

    tabs.forEach(tab => {
      const button = document.createElement('button');
      button.className = 'payments-tab' + (this.activeTab === tab.id ? ' active' : '');
      button.dataset.tab = tab.id;
      button.appendChild(this.createSvgIcon(tab.icon));
      const label = document.createElement('span');
      label.textContent = tab.label;
      button.appendChild(label);
      container.appendChild(button);
    });

    return container;
  }

  createActiveTabContent() {
    switch (this.activeTab) {
      case 'subscription':
        return this.createSubscriptionTab();
      case 'history':
        return this.createHistoryTab();
      case 'settings':
        return this.createSettingsTab();
      default:
        return this.createSubscriptionTab();
    }
  }

  // ============================================================
  // SUBSCRIPTION TAB
  // ============================================================

  createSubscriptionTab() {
    const container = document.createElement('div');
    container.className = 'subscription-tab';

    container.appendChild(this.createCurrentPlanCard());
    container.appendChild(this.createBillingCycleToggle());
    container.appendChild(this.createPlansGrid());

    return container;
  }

  createCurrentPlanCard() {
    const sub = this.subscription;
    const card = document.createElement('div');
    card.className = 'current-plan-card';

    if (!sub) return card;

    const plan = sub.plan;
    const isActive = sub.status === 'active' || sub.status === 'trialing';
    const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : null;

    // Header
    const header = document.createElement('div');
    header.className = 'current-plan-header';

    const info = document.createElement('div');
    info.className = 'current-plan-info';

    const h3 = document.createElement('h3');
    h3.textContent = 'Current Plan';

    const planName = document.createElement('div');
    planName.className = 'plan-name-large';
    planName.textContent = escapeHtml(plan?.name || 'Free');

    const desc = document.createElement('p');
    desc.className = 'plan-description';
    desc.textContent = escapeHtml(plan?.description || 'Basic access to the platform');

    info.appendChild(h3);
    info.appendChild(planName);
    info.appendChild(desc);

    const status = document.createElement('div');
    status.className = 'current-plan-status';

    const statusBadge = document.createElement('span');
    statusBadge.className = 'status-badge ' + (isActive ? 'active' : escapeHtml(sub.status));
    statusBadge.textContent = escapeHtml(sub.status);
    status.appendChild(statusBadge);

    if (periodEnd) {
      const renewal = document.createElement('span');
      renewal.className = 'renewal-date';
      renewal.textContent = 'Renews ' + escapeHtml(periodEnd);
      status.appendChild(renewal);
    }

    header.appendChild(info);
    header.appendChild(status);
    card.appendChild(header);

    // Usage
    const usage = document.createElement('div');
    usage.className = 'plan-usage';

    const athleteUsage = this.createUsageItem(
      'Athlete Connections',
      sub.usage?.athleteConnections || 0,
      plan?.features?.maxAthleteConnections
    );
    const campaignUsage = this.createUsageItem(
      'Active Campaigns',
      sub.usage?.campaigns || 0,
      plan?.features?.maxActiveCampaigns
    );

    usage.appendChild(athleteUsage);
    usage.appendChild(campaignUsage);
    card.appendChild(usage);

    // Cancellation notice
    if (sub.cancelAtPeriodEnd && periodEnd) {
      const notice = document.createElement('div');
      notice.className = 'cancellation-notice';
      notice.appendChild(this.createSvgIcon('alert'));
      const noticeText = document.createElement('span');
      noticeText.textContent = 'Your subscription will be canceled on ' + escapeHtml(periodEnd);
      notice.appendChild(noticeText);
      card.appendChild(notice);
    }

    return card;
  }

  createUsageItem(label, used, max) {
    const item = document.createElement('div');
    item.className = 'usage-item';

    const labelEl = document.createElement('div');
    labelEl.className = 'usage-label';
    labelEl.textContent = label;

    const bar = document.createElement('div');
    bar.className = 'usage-bar';

    const fill = document.createElement('div');
    fill.className = 'usage-fill';
    const percentage = (!max || max === -1) ? 0 : Math.min((used / max) * 100, 100);
    fill.style.width = percentage + '%';
    bar.appendChild(fill);

    const text = document.createElement('div');
    text.className = 'usage-text';
    const maxText = max === -1 ? 'Unlimited' : (max || 5);
    text.textContent = used + ' / ' + maxText;

    item.appendChild(labelEl);
    item.appendChild(bar);
    item.appendChild(text);

    return item;
  }

  createBillingCycleToggle() {
    const container = document.createElement('div');
    container.className = 'billing-cycle-toggle';

    const monthlyLabel = document.createElement('span');
    monthlyLabel.className = 'cycle-label' + (this.billingCycle === 'monthly' ? ' active' : '');
    monthlyLabel.textContent = 'Monthly';

    const toggle = document.createElement('button');
    toggle.className = 'cycle-switch' + (this.billingCycle === 'yearly' ? ' active' : '');
    toggle.id = 'billingCycleToggle';
    toggle.setAttribute('aria-label', 'Toggle billing cycle');

    const thumb = document.createElement('span');
    thumb.className = 'cycle-switch-thumb';
    toggle.appendChild(thumb);

    const yearlyLabel = document.createElement('span');
    yearlyLabel.className = 'cycle-label' + (this.billingCycle === 'yearly' ? ' active' : '');
    yearlyLabel.textContent = 'Yearly';

    const savings = document.createElement('span');
    savings.className = 'savings-badge';
    savings.textContent = 'Save 20%';
    yearlyLabel.appendChild(savings);

    container.appendChild(monthlyLabel);
    container.appendChild(toggle);
    container.appendChild(yearlyLabel);

    return container;
  }

  createPlansGrid() {
    const currentTier = this.subscription?.tier || 'free';
    const grid = document.createElement('div');
    grid.className = 'plans-grid';

    this.plans.forEach(plan => {
      grid.appendChild(this.createPlanCard(plan, currentTier));
    });

    return grid;
  }

  createPlanCard(plan, currentTier) {
    const isCurrent = plan.tier === currentTier;
    const isUpgrade = this.getTierOrder(plan.tier) > this.getTierOrder(currentTier);
    const price = this.billingCycle === 'yearly' && plan.priceYearly
      ? plan.priceYearly / 12
      : plan.priceMonthly;

    const card = document.createElement('div');
    card.className = 'plan-card' + (isCurrent ? ' current' : '') + (plan.tier === 'growth' ? ' popular' : '');
    card.dataset.planId = plan.id;

    if (plan.tier === 'growth') {
      const popularBadge = document.createElement('div');
      popularBadge.className = 'popular-badge';
      popularBadge.textContent = 'Most Popular';
      card.appendChild(popularBadge);
    }

    // Header
    const header = document.createElement('div');
    header.className = 'plan-card-header';

    const name = document.createElement('h3');
    name.className = 'plan-card-name';
    name.textContent = escapeHtml(plan.name);

    const desc = document.createElement('p');
    desc.className = 'plan-card-description';
    desc.textContent = escapeHtml(plan.description);

    header.appendChild(name);
    header.appendChild(desc);
    card.appendChild(header);

    // Price
    const priceContainer = document.createElement('div');
    priceContainer.className = 'plan-card-price';

    const amount = document.createElement('span');
    amount.className = 'price-amount';
    amount.textContent = price === 0 ? 'Free' : '$' + price;

    priceContainer.appendChild(amount);

    if (price > 0) {
      const period = document.createElement('span');
      period.className = 'price-period';
      period.textContent = '/ month';
      priceContainer.appendChild(period);
    }

    if (this.billingCycle === 'yearly' && plan.priceYearly) {
      const billed = document.createElement('span');
      billed.className = 'billed-yearly';
      billed.textContent = 'billed yearly';
      priceContainer.appendChild(billed);
    }

    card.appendChild(priceContainer);

    // Features
    const features = [
      { label: 'Athlete Connections', value: plan.features.maxAthleteConnections === -1 ? 'Unlimited' : plan.features.maxAthleteConnections, isBoolean: false },
      { label: 'Active Campaigns', value: plan.features.maxActiveCampaigns === -1 ? 'Unlimited' : plan.features.maxActiveCampaigns, isBoolean: false },
      { label: 'API Access', value: plan.features.apiAccess, isBoolean: true },
      { label: 'Priority Support', value: plan.features.prioritySupport, isBoolean: true },
      { label: 'Custom Branding', value: plan.features.customBranding, isBoolean: true },
      { label: 'Analytics Dashboard', value: plan.features.analyticsDashboard, isBoolean: true },
    ];

    const featuresList = document.createElement('ul');
    featuresList.className = 'plan-features-list';

    features.forEach(f => {
      const li = document.createElement('li');
      li.className = 'plan-feature' + (f.isBoolean && !f.value ? ' disabled' : '');

      const icon = this.createSvgIcon(f.isBoolean ? (f.value ? 'check' : 'x') : 'check');
      if (f.isBoolean && f.value) {
        icon.setAttribute('stroke', 'var(--success)');
      } else if (f.isBoolean && !f.value) {
        icon.setAttribute('stroke', 'var(--gray-600)');
      } else {
        icon.setAttribute('stroke', 'var(--cyan)');
      }

      const text = document.createElement('span');
      text.textContent = f.isBoolean ? f.label : f.value + ' ' + f.label;

      li.appendChild(icon);
      li.appendChild(text);
      featuresList.appendChild(li);
    });

    card.appendChild(featuresList);

    // Action
    const action = document.createElement('div');
    action.className = 'plan-card-action';

    const btn = document.createElement('button');
    if (isCurrent) {
      btn.className = 'btn btn-secondary';
      btn.disabled = true;
      btn.textContent = 'Current Plan';
    } else if (isUpgrade) {
      btn.className = 'btn btn-primary upgrade-btn';
      btn.dataset.planId = plan.id;
      btn.textContent = 'Upgrade to ' + escapeHtml(plan.name);
    } else {
      btn.className = 'btn btn-outline downgrade-btn';
      btn.dataset.planId = plan.id;
      btn.textContent = 'Downgrade';
    }

    action.appendChild(btn);
    card.appendChild(action);

    return card;
  }

  getTierOrder(tier) {
    const order = { free: 0, starter: 1, growth: 2, enterprise: 3 };
    return order[tier] || 0;
  }

  // ============================================================
  // PAYMENT HISTORY TAB
  // ============================================================

  createHistoryTab() {
    const container = document.createElement('div');
    container.className = 'history-tab';

    if (this.payments.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';

      const emptyIcon = document.createElement('div');
      emptyIcon.className = 'empty-icon';
      emptyIcon.appendChild(this.createSvgIcon('credit-card'));

      const h3 = document.createElement('h3');
      h3.textContent = 'No Payment History';

      const p = document.createElement('p');
      p.textContent = 'Your payment transactions will appear here once you make your first purchase or subscription payment.';

      empty.appendChild(emptyIcon);
      empty.appendChild(h3);
      empty.appendChild(p);
      container.appendChild(empty);
      return container;
    }

    // Header
    const header = document.createElement('div');
    header.className = 'history-header';

    const h3 = document.createElement('h3');
    h3.textContent = 'Recent Transactions';

    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-outline btn-sm';
    exportBtn.id = 'exportHistoryBtn';
    exportBtn.appendChild(this.createSvgIcon('download'));
    const exportText = document.createElement('span');
    exportText.textContent = 'Export CSV';
    exportBtn.appendChild(exportText);

    header.appendChild(h3);
    header.appendChild(exportBtn);
    container.appendChild(header);

    // Table
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'history-table-wrapper';

    const table = document.createElement('table');
    table.className = 'history-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Date', 'Description', 'Athlete', 'Status', 'Amount'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    this.payments.forEach(payment => {
      tbody.appendChild(this.createPaymentRow(payment));
    });
    table.appendChild(tbody);

    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    return container;
  }

  createPaymentRow(payment) {
    const row = document.createElement('tr');
    row.className = 'history-row';

    const date = new Date(payment.created_at).toLocaleDateString();
    const athleteName = payment.athlete?.profiles
      ? payment.athlete.profiles.first_name + ' ' + payment.athlete.profiles.last_name
      : 'N/A';

    // Date
    const dateTd = document.createElement('td');
    dateTd.className = 'history-date';
    dateTd.textContent = escapeHtml(date);
    row.appendChild(dateTd);

    // Description
    const descTd = document.createElement('td');
    descTd.className = 'history-description';
    const descMain = document.createElement('div');
    descMain.className = 'description-main';
    descMain.textContent = escapeHtml(payment.deal?.title || 'Deal Payment');
    const descSub = document.createElement('div');
    descSub.className = 'description-sub';
    descSub.textContent = escapeHtml(payment.deal?.deal_type || 'One-time');
    descTd.appendChild(descMain);
    descTd.appendChild(descSub);
    row.appendChild(descTd);

    // Athlete
    const athleteTd = document.createElement('td');
    athleteTd.className = 'history-athlete';
    if (payment.athlete?.profiles?.avatar_url) {
      const img = document.createElement('img');
      img.src = payment.athlete.profiles.avatar_url;
      img.alt = escapeHtml(athleteName);
      img.className = 'athlete-avatar-sm';
      athleteTd.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'athlete-avatar-placeholder';
      athleteTd.appendChild(placeholder);
    }
    const nameSpan = document.createElement('span');
    nameSpan.textContent = escapeHtml(athleteName);
    athleteTd.appendChild(nameSpan);
    row.appendChild(athleteTd);

    // Status
    const statusTd = document.createElement('td');
    statusTd.className = 'history-status';
    const statusPill = document.createElement('span');
    statusPill.className = 'status-pill ' + this.getStatusClass(payment.status);
    statusPill.textContent = escapeHtml(payment.status);
    statusTd.appendChild(statusPill);
    row.appendChild(statusTd);

    // Amount
    const amountTd = document.createElement('td');
    amountTd.className = 'history-amount';
    amountTd.textContent = formatCurrency(payment.amount_cents);
    row.appendChild(amountTd);

    return row;
  }

  getStatusClass(status) {
    const classes = {
      [PAYMENT_STATUS.SUCCEEDED]: 'success',
      [PAYMENT_STATUS.PENDING]: 'pending',
      [PAYMENT_STATUS.PROCESSING]: 'pending',
      [PAYMENT_STATUS.REQUIRES_ACTION]: 'warning',
      [PAYMENT_STATUS.FAILED]: 'error',
      [PAYMENT_STATUS.REFUNDED]: 'refunded',
    };
    return classes[status] || 'pending';
  }

  // ============================================================
  // BILLING SETTINGS TAB
  // ============================================================

  createSettingsTab() {
    const container = document.createElement('div');
    container.className = 'settings-tab';

    // Payment Method Section
    const paymentSection = document.createElement('div');
    paymentSection.className = 'settings-section';

    const paymentTitle = document.createElement('h3');
    paymentTitle.className = 'settings-section-title';
    paymentTitle.appendChild(this.createSvgIcon('credit-card'));
    const paymentTitleText = document.createElement('span');
    paymentTitleText.textContent = 'Payment Method';
    paymentTitle.appendChild(paymentTitleText);

    const paymentCard = document.createElement('div');
    paymentCard.className = 'payment-method-card';

    const cardInfo = document.createElement('div');
    cardInfo.className = 'card-info';

    const cardBrand = document.createElement('div');
    cardBrand.className = 'card-brand';
    cardBrand.appendChild(this.createSvgIcon('credit-card'));

    const cardDetails = document.createElement('div');
    cardDetails.className = 'card-details';
    const cardNumber = document.createElement('span');
    cardNumber.className = 'card-number';
    cardNumber.textContent = '**** **** **** 4242';
    const cardExpiry = document.createElement('span');
    cardExpiry.className = 'card-expiry';
    cardExpiry.textContent = 'Expires 12/25';
    cardDetails.appendChild(cardNumber);
    cardDetails.appendChild(cardExpiry);

    cardInfo.appendChild(cardBrand);
    cardInfo.appendChild(cardDetails);

    const updatePaymentBtn = document.createElement('button');
    updatePaymentBtn.className = 'btn btn-outline btn-sm';
    updatePaymentBtn.id = 'updatePaymentBtn';
    updatePaymentBtn.textContent = 'Update';

    paymentCard.appendChild(cardInfo);
    paymentCard.appendChild(updatePaymentBtn);

    paymentSection.appendChild(paymentTitle);
    paymentSection.appendChild(paymentCard);
    container.appendChild(paymentSection);

    // Billing Email Section
    const emailSection = document.createElement('div');
    emailSection.className = 'settings-section';

    const emailTitle = document.createElement('h3');
    emailTitle.className = 'settings-section-title';
    emailTitle.appendChild(this.createSvgIcon('mail'));
    const emailTitleText = document.createElement('span');
    emailTitleText.textContent = 'Billing Email';
    emailTitle.appendChild(emailTitleText);

    const emailForm = document.createElement('div');
    emailForm.className = 'billing-email-form';

    const emailLabel = document.createElement('label');
    emailLabel.className = 'sr-only';
    emailLabel.setAttribute('for', 'billingEmail');
    emailLabel.textContent = 'Billing email address';

    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.id = 'billingEmail';
    emailInput.className = 'settings-input';
    emailInput.value = 'billing@apexsports.co';
    emailInput.placeholder = 'Enter billing email';

    const updateEmailBtn = document.createElement('button');
    updateEmailBtn.className = 'btn btn-secondary btn-sm';
    updateEmailBtn.id = 'updateEmailBtn';
    updateEmailBtn.textContent = 'Save';

    emailForm.appendChild(emailLabel);
    emailForm.appendChild(emailInput);
    emailForm.appendChild(updateEmailBtn);

    emailSection.appendChild(emailTitle);
    emailSection.appendChild(emailForm);
    container.appendChild(emailSection);

    // Invoices Section
    const invoicesSection = document.createElement('div');
    invoicesSection.className = 'settings-section';

    const invoicesTitle = document.createElement('h3');
    invoicesTitle.className = 'settings-section-title';
    invoicesTitle.appendChild(this.createSvgIcon('file-text'));
    const invoicesTitleText = document.createElement('span');
    invoicesTitleText.textContent = 'Invoices';
    invoicesTitle.appendChild(invoicesTitleText);

    const invoicesList = document.createElement('div');
    invoicesList.className = 'invoices-list';

    const invoices = [
      { date: 'January 2026', amount: '$299.00' },
      { date: 'December 2025', amount: '$299.00' },
    ];

    invoices.forEach(inv => {
      const item = document.createElement('div');
      item.className = 'invoice-item';

      const info = document.createElement('div');
      info.className = 'invoice-info';
      const dateSpan = document.createElement('span');
      dateSpan.className = 'invoice-date';
      dateSpan.textContent = inv.date;
      const amountSpan = document.createElement('span');
      amountSpan.className = 'invoice-amount';
      amountSpan.textContent = inv.amount;
      info.appendChild(dateSpan);
      info.appendChild(amountSpan);

      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'btn btn-outline btn-sm';
      downloadBtn.textContent = 'Download PDF';

      item.appendChild(info);
      item.appendChild(downloadBtn);
      invoicesList.appendChild(item);
    });

    invoicesSection.appendChild(invoicesTitle);
    invoicesSection.appendChild(invoicesList);
    container.appendChild(invoicesSection);

    // Cancel Subscription Section
    if (this.subscription?.tier !== 'free') {
      const dangerSection = document.createElement('div');
      dangerSection.className = 'settings-section danger-zone';

      const dangerTitle = document.createElement('h3');
      dangerTitle.className = 'settings-section-title danger';
      dangerTitle.appendChild(this.createSvgIcon('alert'));
      const dangerTitleText = document.createElement('span');
      dangerTitleText.textContent = 'Cancel Subscription';
      dangerTitle.appendChild(dangerTitleText);

      const dangerDesc = document.createElement('p');
      dangerDesc.className = 'danger-description';
      dangerDesc.textContent = 'Canceling your subscription will downgrade your account to the Free plan at the end of your current billing period. You will lose access to premium features.';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-danger';
      cancelBtn.id = 'cancelSubscriptionBtn';
      cancelBtn.textContent = 'Cancel Subscription';

      dangerSection.appendChild(dangerTitle);
      dangerSection.appendChild(dangerDesc);
      dangerSection.appendChild(cancelBtn);
      container.appendChild(dangerSection);
    }

    return container;
  }

  // ============================================================
  // STYLES
  // ============================================================

  injectStyles() {
    if (document.getElementById('brand-payments-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'brand-payments-styles';
    styles.textContent = `
      /* ═══════════════════════════════════════════════════════════════════════════
         BRAND PAYMENTS COMPONENT STYLES
         Nike x Apple Inspired Design
         ═══════════════════════════════════════════════════════════════════════════ */

      .brand-payments {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        color: var(--white, #fff);
      }

      /* Loading State */
      .payments-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        gap: 1rem;
      }

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--gray-800, #262626);
        border-top-color: var(--cyan, #00f0ff);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Header */
      .payments-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 2rem;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .payments-header-left {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        flex-wrap: wrap;
      }

      .payments-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0;
      }

      .payments-title svg {
        width: 28px;
        height: 28px;
        color: var(--cyan, #00f0ff);
      }

      .current-plan-badge {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--tier-color);
        border-radius: 100px;
        font-size: 0.8125rem;
        font-weight: 600;
      }

      .current-plan-badge svg {
        width: 16px;
        height: 16px;
        color: var(--tier-color);
      }

      .tier-icon {
        display: flex;
      }

      /* Tabs */
      .payments-tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--gray-800, #262626);
        overflow-x: auto;
      }

      .payments-tab {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.25rem;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 100px;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--gray-400, #a3a3a3);
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }

      .payments-tab svg {
        width: 18px;
        height: 18px;
      }

      .payments-tab:hover {
        color: var(--white, #fff);
        background: var(--gray-800, #262626);
      }

      .payments-tab.active {
        background: var(--cyan, #00f0ff);
        color: var(--black, #000);
        font-weight: 600;
      }

      /* Current Plan Card */
      .current-plan-card {
        background: var(--glass-bg, rgba(23, 23, 23, 0.8));
        backdrop-filter: blur(20px);
        border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
        border-radius: 20px;
        padding: 2rem;
        margin-bottom: 2rem;
      }

      .current-plan-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.5rem;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .current-plan-info h3 {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--gray-500, #737373);
        margin-bottom: 0.5rem;
      }

      .plan-name-large {
        font-size: 2rem;
        font-weight: 800;
        margin-bottom: 0.5rem;
      }

      .plan-description {
        color: var(--gray-400, #a3a3a3);
        font-size: 0.9375rem;
        margin: 0;
      }

      .current-plan-status {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.5rem;
      }

      .status-badge {
        padding: 0.375rem 0.75rem;
        border-radius: 100px;
        font-size: 0.6875rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .status-badge.active {
        background: rgba(34, 197, 94, 0.15);
        color: var(--success, #22c55e);
      }

      .status-badge.trialing {
        background: rgba(0, 240, 255, 0.15);
        color: var(--cyan, #00f0ff);
      }

      .status-badge.past_due {
        background: rgba(239, 68, 68, 0.15);
        color: var(--error, #ef4444);
      }

      .renewal-date {
        font-size: 0.8125rem;
        color: var(--gray-500, #737373);
      }

      /* Plan Usage */
      .plan-usage {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
      }

      .usage-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .usage-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--gray-500, #737373);
      }

      .usage-bar {
        height: 6px;
        background: var(--gray-800, #262626);
        border-radius: 3px;
        overflow: hidden;
      }

      .usage-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--cyan, #00f0ff), var(--lime, #adff2f));
        border-radius: 3px;
        transition: width 0.5s ease;
      }

      .usage-text {
        font-size: 0.875rem;
        font-weight: 600;
      }

      .cancellation-notice {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-top: 1.5rem;
        padding: 1rem;
        background: rgba(245, 158, 11, 0.1);
        border: 1px solid rgba(245, 158, 11, 0.3);
        border-radius: 12px;
        font-size: 0.875rem;
        color: var(--warning, #f59e0b);
      }

      .cancellation-notice svg {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }

      /* Billing Cycle Toggle */
      .billing-cycle-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 2rem;
      }

      .cycle-label {
        font-size: 0.9375rem;
        color: var(--gray-500, #737373);
        transition: color 0.2s ease;
      }

      .cycle-label.active {
        color: var(--white, #fff);
        font-weight: 600;
      }

      .savings-badge {
        display: inline-block;
        margin-left: 0.5rem;
        padding: 0.125rem 0.5rem;
        background: linear-gradient(135deg, var(--lime, #adff2f), var(--cyan, #00f0ff));
        border-radius: 4px;
        font-size: 0.625rem;
        font-weight: 700;
        color: var(--black, #000);
        text-transform: uppercase;
      }

      .cycle-switch {
        position: relative;
        width: 56px;
        height: 28px;
        background: var(--gray-700, #404040);
        border: none;
        border-radius: 14px;
        cursor: pointer;
        transition: background 0.3s ease;
      }

      .cycle-switch.active {
        background: linear-gradient(135deg, var(--cyan, #00f0ff), var(--lime, #adff2f));
      }

      .cycle-switch-thumb {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 22px;
        height: 22px;
        background: var(--white, #fff);
        border-radius: 50%;
        transition: transform 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .cycle-switch.active .cycle-switch-thumb {
        transform: translateX(28px);
      }

      /* Plans Grid */
      .plans-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
      }

      .plan-card {
        position: relative;
        background: var(--gray-900, #171717);
        border: 1px solid var(--gray-800, #262626);
        border-radius: 20px;
        padding: 2rem;
        transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
      }

      .plan-card:hover {
        transform: translateY(-4px);
        border-color: var(--gray-700, #404040);
      }

      .plan-card.current {
        border-color: var(--cyan, #00f0ff);
        box-shadow: 0 0 0 1px var(--cyan, #00f0ff), 0 0 40px rgba(0, 240, 255, 0.1);
      }

      .plan-card.popular {
        border-color: var(--lime, #adff2f);
      }

      .popular-badge {
        position: absolute;
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
        padding: 0.375rem 1rem;
        background: linear-gradient(135deg, var(--lime, #adff2f), var(--cyan, #00f0ff));
        border-radius: 100px;
        font-size: 0.6875rem;
        font-weight: 700;
        color: var(--black, #000);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        white-space: nowrap;
      }

      .plan-card-header {
        margin-bottom: 1.5rem;
      }

      .plan-card-name {
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0 0 0.5rem 0;
      }

      .plan-card-description {
        font-size: 0.875rem;
        color: var(--gray-500, #737373);
        margin: 0;
      }

      .plan-card-price {
        margin-bottom: 1.5rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--gray-800, #262626);
      }

      .price-amount {
        font-size: 2.5rem;
        font-weight: 800;
      }

      .price-period {
        font-size: 1rem;
        color: var(--gray-500, #737373);
      }

      .billed-yearly {
        display: block;
        font-size: 0.75rem;
        color: var(--gray-500, #737373);
        margin-top: 0.25rem;
      }

      .plan-features-list {
        list-style: none;
        margin: 0 0 2rem 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .plan-feature {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.875rem;
      }

      .plan-feature svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }

      .plan-feature.disabled {
        color: var(--gray-600, #525252);
      }

      .plan-card-action {
        margin-top: auto;
      }

      .plan-card-action .btn {
        width: 100%;
      }

      /* History Tab */
      .history-tab {
        background: var(--glass-bg, rgba(23, 23, 23, 0.8));
        backdrop-filter: blur(20px);
        border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
        border-radius: 20px;
        overflow: hidden;
      }

      .history-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5rem;
        border-bottom: 1px solid var(--gray-800, #262626);
      }

      .history-header h3 {
        font-size: 1rem;
        font-weight: 600;
        margin: 0;
      }

      .history-table-wrapper {
        overflow-x: auto;
      }

      .history-table {
        width: 100%;
        border-collapse: collapse;
      }

      .history-table th,
      .history-table td {
        padding: 1rem 1.5rem;
        text-align: left;
      }

      .history-table th {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--gray-500, #737373);
        background: var(--gray-900, #171717);
      }

      .history-row {
        border-bottom: 1px solid var(--gray-800, #262626);
        transition: background 0.2s ease;
      }

      .history-row:hover {
        background: var(--gray-800, #262626);
      }

      .history-row:last-child {
        border-bottom: none;
      }

      .history-date {
        font-size: 0.875rem;
        color: var(--gray-400, #a3a3a3);
      }

      .description-main {
        font-weight: 500;
        margin-bottom: 0.25rem;
      }

      .description-sub {
        font-size: 0.75rem;
        color: var(--gray-500, #737373);
      }

      .history-athlete {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .athlete-avatar-sm {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        object-fit: cover;
      }

      .athlete-avatar-placeholder {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: var(--gray-700, #404040);
      }

      .status-pill {
        display: inline-block;
        padding: 0.25rem 0.625rem;
        border-radius: 100px;
        font-size: 0.6875rem;
        font-weight: 600;
        text-transform: uppercase;
      }

      .status-pill.success {
        background: rgba(34, 197, 94, 0.15);
        color: var(--success, #22c55e);
      }

      .status-pill.pending {
        background: rgba(245, 158, 11, 0.15);
        color: var(--warning, #f59e0b);
      }

      .status-pill.warning {
        background: rgba(245, 158, 11, 0.15);
        color: var(--warning, #f59e0b);
      }

      .status-pill.error {
        background: rgba(239, 68, 68, 0.15);
        color: var(--error, #ef4444);
      }

      .status-pill.refunded {
        background: rgba(107, 114, 128, 0.15);
        color: var(--gray-400, #a3a3a3);
      }

      .history-amount {
        font-weight: 700;
        font-size: 1rem;
      }

      /* Settings Tab */
      .settings-tab {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .settings-section {
        background: var(--glass-bg, rgba(23, 23, 23, 0.8));
        backdrop-filter: blur(20px);
        border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
        border-radius: 20px;
        padding: 1.5rem;
      }

      .settings-section-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 1rem 0;
      }

      .settings-section-title svg {
        width: 20px;
        height: 20px;
        color: var(--cyan, #00f0ff);
      }

      .settings-section-title.danger svg {
        color: var(--error, #ef4444);
      }

      .payment-method-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        background: var(--gray-800, #262626);
        border-radius: 12px;
      }

      .card-info {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .card-brand {
        width: 48px;
        height: 32px;
        background: var(--gray-700, #404040);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .card-brand svg {
        width: 24px;
        height: 24px;
        color: var(--gray-400, #a3a3a3);
      }

      .card-details {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }

      .card-number {
        font-weight: 500;
      }

      .card-expiry {
        font-size: 0.75rem;
        color: var(--gray-500, #737373);
      }

      .billing-email-form {
        display: flex;
        gap: 1rem;
      }

      .settings-input {
        flex: 1;
        padding: 0.75rem 1rem;
        background: var(--gray-800, #262626);
        border: 1px solid var(--gray-700, #404040);
        border-radius: 10px;
        font-size: 0.9375rem;
        color: var(--white, #fff);
        transition: border-color 0.2s ease;
      }

      .settings-input:focus {
        outline: none;
        border-color: var(--cyan, #00f0ff);
      }

      .invoices-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .invoice-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        background: var(--gray-800, #262626);
        border-radius: 10px;
      }

      .invoice-info {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }

      .invoice-date {
        font-weight: 500;
      }

      .invoice-amount {
        font-size: 0.875rem;
        color: var(--gray-400, #a3a3a3);
      }

      .danger-zone {
        border-color: rgba(239, 68, 68, 0.3);
      }

      .danger-description {
        color: var(--gray-400, #a3a3a3);
        font-size: 0.875rem;
        margin: 0 0 1rem 0;
      }

      /* Empty State */
      .empty-state {
        text-align: center;
        padding: 4rem 2rem;
      }

      .empty-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto 1.5rem;
        background: var(--gray-800, #262626);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .empty-icon svg {
        width: 40px;
        height: 40px;
        color: var(--gray-600, #525252);
      }

      .empty-state h3 {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
      }

      .empty-state p {
        color: var(--gray-500, #737373);
        max-width: 400px;
        margin: 0 auto;
      }

      /* Buttons */
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border: none;
        border-radius: 100px;
        cursor: pointer;
        transition: all 0.25s ease;
      }

      .btn svg {
        width: 18px;
        height: 18px;
      }

      .btn-primary {
        background: var(--cyan, #00f0ff);
        color: var(--black, #000);
      }

      .btn-primary:hover {
        background: var(--white, #fff);
        box-shadow: 0 0 40px rgba(0, 240, 255, 0.4);
        transform: translateY(-2px);
      }

      .btn-secondary {
        background: var(--gray-800, #262626);
        color: var(--white, #fff);
      }

      .btn-secondary:hover {
        background: var(--gray-700, #404040);
      }

      .btn-outline {
        background: transparent;
        color: var(--white, #fff);
        border: 1px solid var(--gray-700, #404040);
      }

      .btn-outline:hover {
        border-color: var(--cyan, #00f0ff);
        color: var(--cyan, #00f0ff);
      }

      .btn-danger {
        background: var(--error, #ef4444);
        color: var(--white, #fff);
      }

      .btn-danger:hover {
        background: #dc2626;
      }

      .btn-sm {
        padding: 0.5rem 1rem;
        font-size: 0.75rem;
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Screen Reader Only */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .payments-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .payments-header-right {
          width: 100%;
        }

        .payments-header-right .btn {
          width: 100%;
        }

        .current-plan-header {
          flex-direction: column;
        }

        .current-plan-status {
          align-items: flex-start;
        }

        .plans-grid {
          grid-template-columns: 1fr;
        }

        .billing-email-form {
          flex-direction: column;
        }

        .payment-method-card {
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }

        .payment-method-card .btn {
          width: 100%;
        }

        .history-table th,
        .history-table td {
          padding: 0.75rem 1rem;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  bindEvents() {
    // Tab switching
    this.container.querySelectorAll('.payments-tab').forEach(tab => {
      tab.addEventListener('click', this.handleTabChange);
    });

    // Manage billing button
    const manageBillingBtn = this.container.querySelector('#manageBillingBtn');
    if (manageBillingBtn) {
      manageBillingBtn.addEventListener('click', this.handleManageBilling);
    }

    // Billing cycle toggle
    const cycleToggle = this.container.querySelector('#billingCycleToggle');
    if (cycleToggle) {
      cycleToggle.addEventListener('click', this.handleBillingCycleToggle);
    }

    // Upgrade buttons
    this.container.querySelectorAll('.upgrade-btn, .downgrade-btn').forEach(btn => {
      btn.addEventListener('click', this.handleUpgrade);
    });

    // Cancel subscription
    const cancelBtn = this.container.querySelector('#cancelSubscriptionBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', this.handleCancel);
    }

    // Update payment method
    const updatePaymentBtn = this.container.querySelector('#updatePaymentBtn');
    if (updatePaymentBtn) {
      updatePaymentBtn.addEventListener('click', this.handleManageBilling);
    }
  }

  handleTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab && tab !== this.activeTab) {
      this.activeTab = tab;
      this.renderContent();
    }
  }

  handleBillingCycleToggle() {
    this.billingCycle = this.billingCycle === 'monthly' ? 'yearly' : 'monthly';
    this.renderContent();
  }

  async handleUpgrade(e) {
    const planId = e.currentTarget.dataset.planId;
    if (!planId) return;

    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
      const { url, error } = await createSubscriptionCheckout(planId, this.billingCycle);

      if (error) {
        throw error;
      }

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Failed to start checkout. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Upgrade';
    }
  }

  async handleCancel() {
    const confirmed = confirm(
      'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.'
    );

    if (!confirmed) return;

    const btn = this.container.querySelector('#cancelSubscriptionBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Canceling...';
    }

    try {
      const { success, error } = await cancelSubscription();

      if (error) {
        throw error;
      }

      if (success) {
        alert('Your subscription has been canceled. You will have access until the end of your billing period.');
        await this.loadData();

        if (this.options.onSubscriptionChange) {
          this.options.onSubscriptionChange(this.subscription);
        }
      }
    } catch (error) {
      console.error('Cancellation failed:', error);
      alert('Failed to cancel subscription. Please try again.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Cancel Subscription';
      }
    }
  }

  async handleManageBilling() {
    const btn = this.container.querySelector('#manageBillingBtn');
    if (btn) {
      btn.disabled = true;
    }

    try {
      const { url, error } = await getBillingPortalUrl();

      if (error) {
        throw error;
      }

      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      if (btn) {
        btn.disabled = false;
      }
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  refresh() {
    return this.loadData();
  }

  getSubscription() {
    return this.subscription;
  }

  destroy() {
    this.clearContainer();
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default BrandPayments;
export { BrandPayments };

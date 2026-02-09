/**
 * ScholarMatch AI Chat Component
 * GradeUp NIL - AI-Powered Athlete Assistant
 * Version: 1.0.0
 *
 * A modern, glassmorphism chat interface for athlete AI assistance
 * Features: Deal analysis, brand matching, scheduling, score improvement tips
 *
 * SECURITY NOTE: This component uses innerHTML for rendering trusted content from
 * mock data and internal templates. In production with user-generated content,
 * use a sanitization library like DOMPurify.
 */

class ScholarMatchChat {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = null;
    this.messages = [];
    this.isOpen = false;
    this.isTyping = false;
    this.isMinimized = false;
    this.unreadCount = 0;
    this.conversationId = this.generateId();

    // Configuration options
    this.options = {
      position: options.position || 'bottom-right',
      theme: options.theme || 'dark',
      avatarUrl: options.avatarUrl || null,
      athleteData: options.athleteData || this.getDefaultAthleteData(),
      storageKey: options.storageKey || 'scholarmatch_chat_history',
      maxHistoryLength: options.maxHistoryLength || 50,
      typingDelay: options.typingDelay || 1500,
      ...options
    };

    // Bind methods
    this.handleSendMessage = this.handleSendMessage.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.toggleChat = this.toggleChat.bind(this);
    this.minimizeChat = this.minimizeChat.bind(this);
    this.closeChat = this.closeChat.bind(this);

    this.init();
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  init() {
    this.loadHistory();
    this.render();
    this.bindEvents();

    // Add welcome message if no history
    if (this.messages.length === 0) {
      this.addWelcomeMessage();
    } else {
      this.renderMessages();
    }
  }

  generateId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getDefaultAthleteData() {
    // Default athlete data if not provided - matches dashboard mock data
    return {
      id: 1,
      name: 'Marcus Johnson',
      school: 'Duke University',
      sport: 'Basketball',
      position: 'Point Guard',
      major: 'Business Administration',
      gpa: 3.87,
      gradeupScore: 847,
      scholarTier: 'gold',
      xp: 2450,
      level: 12,
      totalEarnings: 45200,
      activeDeals: 3,
      profileViews: 1247,
      followers: 125000,
      engagement: 4.2,
      verified: true,
      avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200'
    };
  }

  // ============================================================
  // RENDERING
  // ============================================================

  render() {
    // Create container if it doesn't exist
    if (!document.getElementById(this.containerId)) {
      const chatContainer = document.createElement('div');
      chatContainer.id = this.containerId;
      document.body.appendChild(chatContainer);
    }

    this.container = document.getElementById(this.containerId);
    this.buildDOM();
    this.injectStyles();
    this.cacheElements();
  }

  /**
   * Build DOM using safe DOM methods instead of innerHTML
   * This approach avoids XSS vulnerabilities by not using innerHTML with dynamic content
   */
  buildDOM() {
    // Clear container
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    // Create FAB (Floating Action Button)
    const fab = this.createFAB();
    this.container.appendChild(fab);

    // Create Chat Window
    const chatWindow = this.createChatWindow();
    this.container.appendChild(chatWindow);
  }

  createFAB() {
    const fab = document.createElement('button');
    fab.className = 'scholarmatch-fab';
    fab.id = 'scholarmatch-fab';
    fab.setAttribute('aria-label', 'Open ScholarMatch AI Chat');

    const fabIcon = document.createElement('div');
    fabIcon.className = 'fab-icon';

    const svg = this.createSVG('M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z', 24, 24);
    fabIcon.appendChild(svg);

    const sparkle = document.createElement('span');
    sparkle.className = 'fab-sparkle';
    fabIcon.appendChild(sparkle);

    fab.appendChild(fabIcon);

    const badge = document.createElement('span');
    badge.className = 'fab-badge';
    badge.id = 'scholarmatch-badge';
    badge.style.display = 'none';
    badge.textContent = '0';
    fab.appendChild(badge);

    const pulse = document.createElement('div');
    pulse.className = 'fab-pulse';
    fab.appendChild(pulse);

    return fab;
  }

  createChatWindow() {
    const window = document.createElement('div');
    window.className = 'scholarmatch-window';
    window.id = 'scholarmatch-window';
    window.setAttribute('aria-hidden', 'true');

    // Header
    window.appendChild(this.createHeader());

    // Messages area
    const messages = document.createElement('div');
    messages.className = 'scholarmatch-messages';
    messages.id = 'scholarmatch-messages';
    messages.setAttribute('role', 'log');
    messages.setAttribute('aria-live', 'polite');
    window.appendChild(messages);

    // Quick actions
    window.appendChild(this.createQuickActions());

    // Input area
    window.appendChild(this.createInputArea());

    return window;
  }

  createHeader() {
    const header = document.createElement('div');
    header.className = 'scholarmatch-header';

    // Left side
    const headerLeft = document.createElement('div');
    headerLeft.className = 'header-left';

    // AI Avatar
    const aiAvatar = document.createElement('div');
    aiAvatar.className = 'ai-avatar';

    const avatarGlow = document.createElement('div');
    avatarGlow.className = 'avatar-glow';
    aiAvatar.appendChild(avatarGlow);

    const avatarInner = document.createElement('div');
    avatarInner.className = 'avatar-inner';
    const avatarSvg = this.createAvatarSVG();
    avatarInner.appendChild(avatarSvg);
    aiAvatar.appendChild(avatarInner);

    const statusIndicator = document.createElement('span');
    statusIndicator.className = 'status-indicator';
    aiAvatar.appendChild(statusIndicator);

    headerLeft.appendChild(aiAvatar);

    // Header info
    const headerInfo = document.createElement('div');
    headerInfo.className = 'header-info';

    const aiName = document.createElement('h3');
    aiName.className = 'ai-name';
    aiName.textContent = 'ScholarMatch AI';
    headerInfo.appendChild(aiName);

    const aiStatus = document.createElement('span');
    aiStatus.className = 'ai-status';

    const statusDot = document.createElement('span');
    statusDot.className = 'status-dot';
    aiStatus.appendChild(statusDot);

    const statusText = document.createElement('span');
    statusText.id = 'status-text';
    statusText.textContent = 'Online';
    aiStatus.appendChild(statusText);

    headerInfo.appendChild(aiStatus);
    headerLeft.appendChild(headerInfo);
    header.appendChild(headerLeft);

    // Header actions
    const headerActions = document.createElement('div');
    headerActions.className = 'header-actions';

    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'header-btn';
    minimizeBtn.id = 'minimize-btn';
    minimizeBtn.setAttribute('aria-label', 'Minimize chat');
    minimizeBtn.appendChild(this.createSVG('M5 12L19 12', 24, 24, true));
    headerActions.appendChild(minimizeBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'header-btn';
    closeBtn.id = 'close-btn';
    closeBtn.setAttribute('aria-label', 'Close chat');
    const closeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    closeSvg.setAttribute('viewBox', '0 0 24 24');
    closeSvg.setAttribute('fill', 'none');
    closeSvg.setAttribute('stroke', 'currentColor');
    closeSvg.setAttribute('stroke-width', '2');
    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('x1', '18');
    line1.setAttribute('y1', '6');
    line1.setAttribute('x2', '6');
    line1.setAttribute('y2', '18');
    closeSvg.appendChild(line1);
    const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line2.setAttribute('x1', '6');
    line2.setAttribute('y1', '6');
    line2.setAttribute('x2', '18');
    line2.setAttribute('y2', '18');
    closeSvg.appendChild(line2);
    closeBtn.appendChild(closeSvg);
    headerActions.appendChild(closeBtn);

    header.appendChild(headerActions);

    return header;
  }

  createQuickActions() {
    const container = document.createElement('div');
    container.className = 'scholarmatch-quick-actions';
    container.id = 'quick-actions';

    const label = document.createElement('div');
    label.className = 'quick-actions-label';
    label.textContent = 'Quick Actions';
    container.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'quick-actions-grid';

    const actions = [
      { action: 'analyze_deal', icon: 'deal', text: 'Analyze my latest deal' },
      { action: 'recommend_brands', icon: 'star', text: 'Recommend brands for me' },
      { action: 'schedule_deals', icon: 'calendar', text: 'When should I schedule deals?' },
      { action: 'improve_score', icon: 'chart', text: 'How can I improve my score?' },
      { action: 'explain_taxes', icon: 'briefcase', text: 'Explain NIL taxes' }
    ];

    actions.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'quick-action-btn';
      btn.dataset.action = item.action;

      const iconSpan = document.createElement('span');
      iconSpan.className = 'qa-icon';
      iconSpan.appendChild(this.createQuickActionIcon(item.icon));
      btn.appendChild(iconSpan);

      const textSpan = document.createElement('span');
      textSpan.className = 'qa-text';
      textSpan.textContent = item.text;
      btn.appendChild(textSpan);

      grid.appendChild(btn);
    });

    container.appendChild(grid);
    return container;
  }

  createInputArea() {
    const area = document.createElement('div');
    area.className = 'scholarmatch-input-area';

    const wrapper = document.createElement('div');
    wrapper.className = 'input-wrapper';

    const textarea = document.createElement('textarea');
    textarea.id = 'scholarmatch-input';
    textarea.placeholder = 'Ask ScholarMatch AI anything...';
    textarea.rows = 1;
    textarea.setAttribute('aria-label', 'Type your message');
    wrapper.appendChild(textarea);

    const sendBtn = document.createElement('button');
    sendBtn.className = 'send-btn';
    sendBtn.id = 'send-btn';
    sendBtn.setAttribute('aria-label', 'Send message');

    const sendSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sendSvg.setAttribute('viewBox', '0 0 24 24');
    sendSvg.setAttribute('fill', 'none');
    sendSvg.setAttribute('stroke', 'currentColor');
    sendSvg.setAttribute('stroke-width', '2');
    const sendLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    sendLine.setAttribute('x1', '22');
    sendLine.setAttribute('y1', '2');
    sendLine.setAttribute('x2', '11');
    sendLine.setAttribute('y2', '13');
    sendSvg.appendChild(sendLine);
    const sendPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    sendPoly.setAttribute('points', '22 2 15 22 11 13 2 9 22 2');
    sendSvg.appendChild(sendPoly);
    sendBtn.appendChild(sendSvg);
    wrapper.appendChild(sendBtn);

    area.appendChild(wrapper);

    const footer = document.createElement('div');
    footer.className = 'input-footer';

    const poweredBy = document.createElement('span');
    poweredBy.className = 'powered-by';
    poweredBy.textContent = 'Powered by GradeUp AI';
    footer.appendChild(poweredBy);

    area.appendChild(footer);
    return area;
  }

  createSVG(pathD, width, height, isLine = false) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');

    if (isLine) {
      const parts = pathD.split(' ');
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', parts[0].substring(1));
      line.setAttribute('y1', parts[1]);
      line.setAttribute('x2', parts[2].substring(1));
      line.setAttribute('y2', parts[3]);
      svg.appendChild(line);
    } else {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathD);
      svg.appendChild(path);
    }

    return svg;
  }

  createAvatarSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');

    const circle1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle1.setAttribute('cx', '12');
    circle1.setAttribute('cy', '12');
    circle1.setAttribute('r', '10');
    svg.appendChild(circle1);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 6v6l4 2');
    svg.appendChild(path);

    const circle2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle2.setAttribute('cx', '12');
    circle2.setAttribute('cy', '12');
    circle2.setAttribute('r', '3');
    circle2.setAttribute('fill', 'currentColor');
    svg.appendChild(circle2);

    return svg;
  }

  createQuickActionIcon(type) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');

    switch (type) {
      case 'deal': {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5');
        svg.appendChild(path);
        break;
      }
      case 'star': {
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
        svg.appendChild(polygon);
        break;
      }
      case 'calendar': {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '3');
        rect.setAttribute('y', '4');
        rect.setAttribute('width', '18');
        rect.setAttribute('height', '18');
        rect.setAttribute('rx', '2');
        rect.setAttribute('ry', '2');
        svg.appendChild(rect);
        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', '16');
        line1.setAttribute('y1', '2');
        line1.setAttribute('x2', '16');
        line1.setAttribute('y2', '6');
        svg.appendChild(line1);
        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', '8');
        line2.setAttribute('y1', '2');
        line2.setAttribute('x2', '8');
        line2.setAttribute('y2', '6');
        svg.appendChild(line2);
        const line3 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line3.setAttribute('x1', '3');
        line3.setAttribute('y1', '10');
        line3.setAttribute('x2', '21');
        line3.setAttribute('y2', '10');
        svg.appendChild(line3);
        break;
      }
      case 'chart': {
        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', '12');
        line1.setAttribute('y1', '20');
        line1.setAttribute('x2', '12');
        line1.setAttribute('y2', '10');
        svg.appendChild(line1);
        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', '18');
        line2.setAttribute('y1', '20');
        line2.setAttribute('x2', '18');
        line2.setAttribute('y2', '4');
        svg.appendChild(line2);
        const line3 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line3.setAttribute('x1', '6');
        line3.setAttribute('y1', '20');
        line3.setAttribute('x2', '6');
        line3.setAttribute('y2', '16');
        svg.appendChild(line3);
        break;
      }
      case 'briefcase': {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '2');
        rect.setAttribute('y', '7');
        rect.setAttribute('width', '20');
        rect.setAttribute('height', '14');
        rect.setAttribute('rx', '2');
        rect.setAttribute('ry', '2');
        svg.appendChild(rect);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16');
        svg.appendChild(path);
        break;
      }
    }

    return svg;
  }

  injectStyles() {
    if (document.getElementById('scholarmatch-chat-styles')) return;

    const styleSheet = document.createElement('style');
    styleSheet.id = 'scholarmatch-chat-styles';
    styleSheet.textContent = this.getStyles();
    document.head.appendChild(styleSheet);
  }

  getStyles() {
    return `
      /* ═══════════════════════════════════════════════════════════════════
         SCHOLARMATCH AI CHAT - PREMIUM STYLES
         Dark Glassmorphism Theme with Cyan Accents
         ═══════════════════════════════════════════════════════════════════ */

      :root {
        --sm-black: #000000;
        --sm-dark: #0a0a0a;
        --sm-gray-900: #171717;
        --sm-gray-800: #262626;
        --sm-gray-700: #404040;
        --sm-gray-600: #525252;
        --sm-gray-500: #737373;
        --sm-gray-400: #a3a3a3;
        --sm-gray-300: #d4d4d4;
        --sm-white: #ffffff;

        --sm-cyan: #00f0ff;
        --sm-cyan-light: #67f7ff;
        --sm-cyan-dark: #00b8c4;
        --sm-cyan-glow: rgba(0, 240, 255, 0.4);
        --sm-cyan-subtle: rgba(0, 240, 255, 0.1);

        --sm-magenta: #ff00ff;
        --sm-gold: #ffd700;
        --sm-success: #22c55e;
        --sm-warning: #f59e0b;
        --sm-error: #ef4444;

        --sm-font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        --sm-radius: 16px;
        --sm-radius-sm: 8px;
        --sm-radius-lg: 24px;

        --sm-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        --sm-shadow-glow: 0 0 40px var(--sm-cyan-glow);

        --sm-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        --sm-transition-fast: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        --sm-transition-spring: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      /* ─── Floating Action Button ─── */
      .scholarmatch-fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        border: none;
        background: linear-gradient(135deg, var(--sm-gray-900) 0%, var(--sm-black) 100%);
        box-shadow: var(--sm-shadow), 0 0 0 1px rgba(255, 255, 255, 0.1);
        cursor: pointer;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--sm-transition-spring);
        overflow: visible;
      }

      .scholarmatch-fab:hover {
        transform: scale(1.1);
        box-shadow: var(--sm-shadow), var(--sm-shadow-glow), 0 0 0 1px var(--sm-cyan);
      }

      .scholarmatch-fab:active {
        transform: scale(0.95);
      }

      .scholarmatch-fab.hidden {
        transform: scale(0);
        opacity: 0;
        pointer-events: none;
      }

      .fab-icon {
        position: relative;
        width: 28px;
        height: 28px;
        color: var(--sm-cyan);
      }

      .fab-icon svg {
        width: 100%;
        height: 100%;
      }

      .fab-sparkle {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 8px;
        height: 8px;
        background: var(--sm-cyan);
        border-radius: 50%;
        animation: sparkle 2s ease-in-out infinite;
      }

      @keyframes sparkle {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.8); }
      }

      .fab-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 20px;
        height: 20px;
        background: var(--sm-error);
        color: var(--sm-white);
        font-size: 11px;
        font-weight: 600;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 6px;
        animation: badgePop 0.3s var(--sm-transition-spring);
      }

      @keyframes badgePop {
        0% { transform: scale(0); }
        100% { transform: scale(1); }
      }

      .fab-pulse {
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: 2px solid var(--sm-cyan);
        opacity: 0;
        animation: fabPulse 3s ease-out infinite;
      }

      @keyframes fabPulse {
        0% { opacity: 0.6; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.5); }
      }

      /* ─── Chat Window ─── */
      .scholarmatch-window {
        position: fixed;
        bottom: 100px;
        right: 24px;
        width: 400px;
        max-width: calc(100vw - 48px);
        height: 600px;
        max-height: calc(100vh - 140px);
        background: linear-gradient(180deg,
          rgba(23, 23, 23, 0.95) 0%,
          rgba(10, 10, 10, 0.98) 100%
        );
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: var(--sm-radius-lg);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: var(--sm-shadow);
        display: flex;
        flex-direction: column;
        z-index: 9998;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        pointer-events: none;
        transition: var(--sm-transition);
        overflow: hidden;
      }

      .scholarmatch-window.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      .scholarmatch-window.minimized {
        height: 72px;
      }

      .scholarmatch-window.minimized .scholarmatch-messages,
      .scholarmatch-window.minimized .scholarmatch-quick-actions,
      .scholarmatch-window.minimized .scholarmatch-input-area {
        display: none;
      }

      /* ─── Header ─── */
      .scholarmatch-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: linear-gradient(180deg,
          rgba(255, 255, 255, 0.05) 0%,
          transparent 100%
        );
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        flex-shrink: 0;
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .ai-avatar {
        position: relative;
        width: 40px;
        height: 40px;
      }

      .avatar-glow {
        position: absolute;
        inset: -4px;
        background: radial-gradient(circle, var(--sm-cyan-glow) 0%, transparent 70%);
        border-radius: 50%;
        animation: avatarGlow 3s ease-in-out infinite;
      }

      @keyframes avatarGlow {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 0.3; transform: scale(1.1); }
      }

      .avatar-inner {
        position: relative;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, var(--sm-cyan-dark) 0%, var(--sm-cyan) 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--sm-black);
      }

      .avatar-inner svg {
        width: 24px;
        height: 24px;
      }

      .status-indicator {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 12px;
        height: 12px;
        background: var(--sm-success);
        border: 2px solid var(--sm-gray-900);
        border-radius: 50%;
      }

      .header-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .ai-name {
        font-family: var(--sm-font);
        font-size: 15px;
        font-weight: 600;
        color: var(--sm-white);
        margin: 0;
      }

      .ai-status {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--sm-gray-400);
      }

      .status-dot {
        width: 6px;
        height: 6px;
        background: var(--sm-success);
        border-radius: 50%;
        animation: statusPulse 2s ease-in-out infinite;
      }

      @keyframes statusPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .header-actions {
        display: flex;
        gap: 4px;
      }

      .header-btn {
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        color: var(--sm-gray-400);
        border-radius: var(--sm-radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: var(--sm-transition-fast);
      }

      .header-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--sm-white);
      }

      .header-btn svg {
        width: 18px;
        height: 18px;
      }

      /* ─── Messages Area ─── */
      .scholarmatch-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        scroll-behavior: smooth;
      }

      .scholarmatch-messages::-webkit-scrollbar {
        width: 6px;
      }

      .scholarmatch-messages::-webkit-scrollbar-track {
        background: transparent;
      }

      .scholarmatch-messages::-webkit-scrollbar-thumb {
        background: var(--sm-gray-700);
        border-radius: 3px;
      }

      .scholarmatch-messages::-webkit-scrollbar-thumb:hover {
        background: var(--sm-gray-600);
      }

      /* ─── Message Bubbles ─── */
      .message {
        display: flex;
        gap: 12px;
        max-width: 85%;
        animation: messageIn 0.3s var(--sm-transition-spring);
      }

      @keyframes messageIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .message.user {
        flex-direction: row-reverse;
        align-self: flex-end;
      }

      .message.ai {
        align-self: flex-start;
      }

      .message-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        flex-shrink: 0;
        overflow: hidden;
      }

      .message.ai .message-avatar {
        background: linear-gradient(135deg, var(--sm-cyan-dark) 0%, var(--sm-cyan) 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--sm-black);
      }

      .message.ai .message-avatar svg {
        width: 18px;
        height: 18px;
      }

      .message.user .message-avatar {
        background: var(--sm-gray-700);
      }

      .message.user .message-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .message-content {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .message-bubble {
        padding: 12px 16px;
        border-radius: var(--sm-radius);
        font-size: 14px;
        line-height: 1.5;
        color: var(--sm-white);
        word-wrap: break-word;
      }

      .message.ai .message-bubble {
        background: linear-gradient(135deg,
          rgba(0, 240, 255, 0.15) 0%,
          rgba(0, 240, 255, 0.05) 100%
        );
        border: 1px solid rgba(0, 240, 255, 0.2);
        border-radius: var(--sm-radius) var(--sm-radius) var(--sm-radius) 4px;
      }

      .message.user .message-bubble {
        background: var(--sm-gray-800);
        border: 1px solid var(--sm-gray-700);
        border-radius: var(--sm-radius) var(--sm-radius) 4px var(--sm-radius);
      }

      .message-time {
        font-size: 11px;
        color: var(--sm-gray-500);
        padding: 0 4px;
      }

      .message.user .message-time {
        text-align: right;
      }

      /* ─── Typing Indicator ─── */
      .typing-indicator {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 0;
      }

      .typing-dots {
        display: flex;
        gap: 4px;
        padding: 12px 16px;
        background: rgba(0, 240, 255, 0.1);
        border: 1px solid rgba(0, 240, 255, 0.2);
        border-radius: var(--sm-radius) var(--sm-radius) var(--sm-radius) 4px;
      }

      .typing-dot {
        width: 8px;
        height: 8px;
        background: var(--sm-cyan);
        border-radius: 50%;
        animation: typingBounce 1.4s ease-in-out infinite;
      }

      .typing-dot:nth-child(1) { animation-delay: 0s; }
      .typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .typing-dot:nth-child(3) { animation-delay: 0.4s; }

      @keyframes typingBounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
        30% { transform: translateY(-6px); opacity: 1; }
      }

      /* ─── Card Components in Messages ─── */
      .message-card {
        background: var(--sm-gray-800);
        border: 1px solid var(--sm-gray-700);
        border-radius: var(--sm-radius-sm);
        padding: 16px;
        margin-top: 8px;
      }

      .deal-card {
        border-left: 3px solid var(--sm-cyan);
      }

      .brand-card {
        border-left: 3px solid var(--sm-gold);
      }

      .score-card {
        border-left: 3px solid var(--sm-success);
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .card-title {
        font-weight: 600;
        font-size: 14px;
        color: var(--sm-white);
      }

      .card-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 4px;
        text-transform: uppercase;
      }

      .badge-positive {
        background: rgba(34, 197, 94, 0.2);
        color: var(--sm-success);
      }

      .badge-warning {
        background: rgba(245, 158, 11, 0.2);
        color: var(--sm-warning);
      }

      .badge-info {
        background: rgba(0, 240, 255, 0.2);
        color: var(--sm-cyan);
      }

      .card-content {
        font-size: 13px;
        color: var(--sm-gray-300);
        line-height: 1.6;
      }

      .card-metrics {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-top: 12px;
      }

      .metric-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .metric-label {
        font-size: 11px;
        color: var(--sm-gray-500);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .metric-value {
        font-size: 16px;
        font-weight: 600;
        color: var(--sm-white);
      }

      .metric-value.positive { color: var(--sm-success); }
      .metric-value.warning { color: var(--sm-warning); }
      .metric-value.accent { color: var(--sm-cyan); }

      .card-list {
        list-style: none;
        padding: 0;
        margin: 8px 0 0 0;
      }

      .card-list li {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 6px 0;
        font-size: 13px;
        color: var(--sm-gray-300);
      }

      .card-list li::before {
        content: '';
        width: 6px;
        height: 6px;
        background: var(--sm-cyan);
        border-radius: 50%;
        margin-top: 6px;
        flex-shrink: 0;
      }

      .card-action-btn {
        width: 100%;
        padding: 10px 16px;
        margin-top: 12px;
        background: linear-gradient(135deg, var(--sm-cyan-dark) 0%, var(--sm-cyan) 100%);
        border: none;
        border-radius: var(--sm-radius-sm);
        color: var(--sm-black);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: var(--sm-transition-fast);
      }

      .card-action-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px var(--sm-cyan-glow);
      }

      /* ─── Quick Actions ─── */
      .scholarmatch-quick-actions {
        padding: 12px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        background: rgba(0, 0, 0, 0.3);
        flex-shrink: 0;
      }

      .quick-actions-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--sm-gray-500);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }

      .quick-actions-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .quick-action-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        color: var(--sm-gray-300);
        font-size: 12px;
        cursor: pointer;
        transition: var(--sm-transition-fast);
        white-space: nowrap;
      }

      .quick-action-btn:hover {
        background: rgba(0, 240, 255, 0.1);
        border-color: var(--sm-cyan);
        color: var(--sm-cyan);
      }

      .qa-icon {
        width: 14px;
        height: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .qa-icon svg {
        width: 100%;
        height: 100%;
      }

      .qa-text {
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* ─── Input Area ─── */
      .scholarmatch-input-area {
        padding: 16px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        background: rgba(0, 0, 0, 0.3);
        flex-shrink: 0;
      }

      .input-wrapper {
        display: flex;
        align-items: flex-end;
        gap: 12px;
        background: var(--sm-gray-800);
        border: 1px solid var(--sm-gray-700);
        border-radius: var(--sm-radius);
        padding: 8px 12px;
        transition: var(--sm-transition-fast);
      }

      .input-wrapper:focus-within {
        border-color: var(--sm-cyan);
        box-shadow: 0 0 0 3px rgba(0, 240, 255, 0.1);
      }

      #scholarmatch-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--sm-white);
        font-family: var(--sm-font);
        font-size: 14px;
        line-height: 1.5;
        resize: none;
        max-height: 120px;
        min-height: 24px;
      }

      #scholarmatch-input::placeholder {
        color: var(--sm-gray-500);
      }

      .send-btn {
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, var(--sm-cyan-dark) 0%, var(--sm-cyan) 100%);
        border: none;
        border-radius: 50%;
        color: var(--sm-black);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: var(--sm-transition-fast);
        flex-shrink: 0;
      }

      .send-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 12px var(--sm-cyan-glow);
      }

      .send-btn:active {
        transform: scale(0.95);
      }

      .send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .send-btn svg {
        width: 18px;
        height: 18px;
      }

      .input-footer {
        display: flex;
        justify-content: center;
        margin-top: 8px;
      }

      .powered-by {
        font-size: 10px;
        color: var(--sm-gray-600);
      }

      /* ─── Error State ─── */
      .message-error {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: var(--sm-radius-sm);
        margin-top: 8px;
      }

      .message-error-icon {
        color: var(--sm-error);
      }

      .message-error-text {
        flex: 1;
        font-size: 12px;
        color: var(--sm-error);
      }

      .retry-btn {
        padding: 4px 12px;
        background: transparent;
        border: 1px solid var(--sm-error);
        border-radius: 4px;
        color: var(--sm-error);
        font-size: 11px;
        cursor: pointer;
        transition: var(--sm-transition-fast);
      }

      .retry-btn:hover {
        background: rgba(239, 68, 68, 0.2);
      }

      /* ─── Mobile Responsive ─── */
      @media (max-width: 480px) {
        .scholarmatch-fab {
          bottom: 16px;
          right: 16px;
          width: 56px;
          height: 56px;
        }

        .scholarmatch-window {
          bottom: 0;
          right: 0;
          left: 0;
          width: 100%;
          max-width: 100%;
          height: calc(100vh - 60px);
          max-height: calc(100vh - 60px);
          border-radius: var(--sm-radius-lg) var(--sm-radius-lg) 0 0;
        }

        .scholarmatch-window.open {
          transform: translateY(0);
        }

        .scholarmatch-fab.hidden {
          transform: scale(0) translateY(100px);
        }

        .quick-actions-grid {
          flex-wrap: nowrap;
          overflow-x: auto;
          padding-bottom: 8px;
          -webkit-overflow-scrolling: touch;
        }

        .quick-actions-grid::-webkit-scrollbar {
          display: none;
        }
      }

      /* ─── Reduced Motion ─── */
      @media (prefers-reduced-motion: reduce) {
        .scholarmatch-fab,
        .scholarmatch-window,
        .message,
        .fab-pulse,
        .avatar-glow,
        .typing-dot,
        .status-dot,
        .fab-sparkle {
          animation: none;
          transition: none;
        }
      }
    `;
  }

  cacheElements() {
    this.elements = {
      fab: document.getElementById('scholarmatch-fab'),
      badge: document.getElementById('scholarmatch-badge'),
      window: document.getElementById('scholarmatch-window'),
      messages: document.getElementById('scholarmatch-messages'),
      input: document.getElementById('scholarmatch-input'),
      sendBtn: document.getElementById('send-btn'),
      minimizeBtn: document.getElementById('minimize-btn'),
      closeBtn: document.getElementById('close-btn'),
      quickActions: document.getElementById('quick-actions'),
      statusText: document.getElementById('status-text')
    };
  }

  // ============================================================
  // EVENT HANDLING
  // ============================================================

  bindEvents() {
    // FAB click
    this.elements.fab.addEventListener('click', this.toggleChat);

    // Header controls
    this.elements.minimizeBtn.addEventListener('click', this.minimizeChat);
    this.elements.closeBtn.addEventListener('click', this.closeChat);

    // Input handling
    this.elements.input.addEventListener('keydown', this.handleKeyPress);
    this.elements.sendBtn.addEventListener('click', this.handleSendMessage);

    // Auto-resize textarea
    this.elements.input.addEventListener('input', () => {
      this.elements.input.style.height = 'auto';
      this.elements.input.style.height = Math.min(this.elements.input.scrollHeight, 120) + 'px';
    });

    // Quick actions
    const quickActionBtns = document.querySelectorAll('.quick-action-btn');
    quickActionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.handleQuickAction(action);
      });
    });

    // Click outside to close (optional)
    document.addEventListener('click', (e) => {
      if (this.isOpen &&
          !this.elements.window.contains(e.target) &&
          !this.elements.fab.contains(e.target)) {
        // Optionally close chat when clicking outside
        // this.closeChat();
      }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeChat();
      }
    });
  }

  handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSendMessage();
    }
  }

  handleSendMessage() {
    const text = this.elements.input.value.trim();
    if (!text || this.isTyping) return;

    // Add user message
    this.addMessage('user', text);

    // Clear input
    this.elements.input.value = '';
    this.elements.input.style.height = 'auto';

    // Generate AI response
    this.generateResponse(text);
  }

  handleQuickAction(action) {
    const actionMessages = {
      analyze_deal: "Can you analyze my latest deal?",
      recommend_brands: "What brands would be a good match for me?",
      schedule_deals: "When should I schedule my deals for maximum impact?",
      improve_score: "How can I improve my GradeUp score?",
      explain_taxes: "Can you explain NIL taxes?"
    };

    const message = actionMessages[action];
    if (message) {
      this.addMessage('user', message);
      this.generateResponse(message, action);
    }
  }

  // ============================================================
  // CHAT CONTROLS
  // ============================================================

  toggleChat() {
    if (this.isMinimized) {
      this.isMinimized = false;
      this.elements.window.classList.remove('minimized');
      return;
    }

    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.openChat();
    } else {
      this.closeChat();
    }
  }

  openChat() {
    this.isOpen = true;
    this.elements.window.classList.add('open');
    this.elements.window.setAttribute('aria-hidden', 'false');
    this.elements.fab.classList.add('hidden');
    this.unreadCount = 0;
    this.updateBadge();

    // Focus input
    setTimeout(() => {
      this.elements.input.focus();
    }, 300);

    // Scroll to bottom
    this.scrollToBottom();
  }

  closeChat() {
    this.isOpen = false;
    this.isMinimized = false;
    this.elements.window.classList.remove('open', 'minimized');
    this.elements.window.setAttribute('aria-hidden', 'true');
    this.elements.fab.classList.remove('hidden');
  }

  minimizeChat() {
    this.isMinimized = !this.isMinimized;
    this.elements.window.classList.toggle('minimized', this.isMinimized);
  }

  // ============================================================
  // MESSAGE HANDLING
  // ============================================================

  addMessage(type, content, cardData = null) {
    const message = {
      id: this.generateId(),
      type, // 'user' or 'ai'
      content,
      cardData,
      timestamp: new Date().toISOString()
    };

    this.messages.push(message);
    this.renderMessage(message);
    this.saveHistory();
    this.scrollToBottom();

    // Update unread count if chat is closed
    if (!this.isOpen && type === 'ai') {
      this.unreadCount++;
      this.updateBadge();
    }
  }

  addWelcomeMessage() {
    const athlete = this.options.athleteData;
    const firstName = athlete.name.split(' ')[0];
    const welcomeContent = `Hey ${firstName}! I'm your ScholarMatch AI assistant. I can help you with:

- Analyzing deal opportunities
- Finding brand matches for your profile
- Optimizing your posting schedule
- Improving your GradeUp score
- Understanding NIL taxes and compliance

What would you like to explore today?`;

    this.addMessage('ai', welcomeContent);
  }

  /**
   * Render a message using safe DOM methods
   * @param {Object} message - The message object to render
   */
  renderMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${message.type}`;
    messageEl.id = message.id;

    const time = this.formatTime(message.timestamp);
    const athlete = this.options.athleteData;

    // Create avatar
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';

    if (message.type === 'user') {
      const avatarImg = document.createElement('img');
      avatarImg.src = athlete.avatar;
      avatarImg.alt = athlete.name;
      avatarDiv.appendChild(avatarImg);
    } else {
      // AI avatar SVG
      avatarDiv.appendChild(this.createAvatarSVG());
    }

    // Create content wrapper
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Create message bubble
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';

    // Use textContent for user messages (plain text)
    // For AI messages, we format but escape HTML
    if (message.type === 'user') {
      bubbleDiv.textContent = message.content;
    } else {
      // Format AI message content safely
      this.renderFormattedContent(bubbleDiv, message.content);
    }

    contentDiv.appendChild(bubbleDiv);

    // Add card if present (for AI messages)
    if (message.cardData && message.type === 'ai') {
      const cardEl = this.renderCardElement(message.cardData);
      if (cardEl) {
        contentDiv.appendChild(cardEl);
      }
    }

    // Create timestamp
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = time;
    contentDiv.appendChild(timeSpan);

    // Assemble message (order depends on type)
    if (message.type === 'user') {
      messageEl.appendChild(contentDiv);
      messageEl.appendChild(avatarDiv);
    } else {
      messageEl.appendChild(avatarDiv);
      messageEl.appendChild(contentDiv);
    }

    this.elements.messages.appendChild(messageEl);
  }

  /**
   * Render formatted content safely without innerHTML
   * @param {HTMLElement} container - The container element
   * @param {string} content - The content to render
   */
  renderFormattedContent(container, content) {
    // Split by line breaks first
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Process bold text (**text**)
      const parts = line.split(/(\*\*.*?\*\*)/g);

      parts.forEach(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Bold text
          const strong = document.createElement('strong');
          strong.textContent = part.slice(2, -2);
          container.appendChild(strong);
        } else if (part) {
          // Regular text
          container.appendChild(document.createTextNode(part));
        }
      });

      // Add line break if not last line
      if (index < lines.length - 1) {
        container.appendChild(document.createElement('br'));
      }
    });
  }

  /**
   * Render a card element using safe DOM methods
   * @param {Object} cardData - The card data
   * @returns {HTMLElement|null} - The card element or null
   */
  renderCardElement(cardData) {
    switch (cardData.type) {
      case 'deal':
        return this.createDealCardElement(cardData);
      case 'brands':
        return this.createBrandsCardElement(cardData);
      case 'schedule':
        return this.createScheduleCardElement(cardData);
      case 'score':
        return this.createScoreCardElement(cardData);
      default:
        return null;
    }
  }

  createDealCardElement(data) {
    const card = document.createElement('div');
    card.className = 'message-card deal-card';

    // Header
    const header = document.createElement('div');
    header.className = 'card-header';

    const title = document.createElement('span');
    title.className = 'card-title';
    title.textContent = `${data.brandName} Deal Analysis`;
    header.appendChild(title);

    const badge = document.createElement('span');
    badge.className = `card-badge ${data.recommendation === 'accept' ? 'badge-positive' : 'badge-warning'}`;
    badge.textContent = data.recommendation === 'accept' ? 'Recommended' : 'Review Needed';
    header.appendChild(badge);

    card.appendChild(header);

    // Metrics grid
    const metrics = document.createElement('div');
    metrics.className = 'card-metrics';

    const metricsData = [
      { label: 'Offer Value', value: `$${data.amount.toLocaleString()}`, class: '' },
      { label: 'Fair Market', value: `$${data.fairMarket.toLocaleString()}`, class: 'accent' },
      { label: 'Brand Fit', value: `${data.brandFit}%`, class: 'positive' },
      { label: 'Counter Offer', value: `$${data.counterOffer.toLocaleString()}`, class: 'accent' }
    ];

    metricsData.forEach(m => {
      const item = document.createElement('div');
      item.className = 'metric-item';

      const label = document.createElement('span');
      label.className = 'metric-label';
      label.textContent = m.label;
      item.appendChild(label);

      const value = document.createElement('span');
      value.className = `metric-value ${m.class}`;
      value.textContent = m.value;
      item.appendChild(value);

      metrics.appendChild(item);
    });

    card.appendChild(metrics);
    return card;
  }

  createBrandsCardElement(data) {
    const card = document.createElement('div');
    card.className = 'message-card brand-card';

    // Header
    const header = document.createElement('div');
    header.className = 'card-header';

    const title = document.createElement('span');
    title.className = 'card-title';
    title.textContent = 'Top Brand Matches';
    header.appendChild(title);

    const badge = document.createElement('span');
    badge.className = 'card-badge badge-info';
    badge.textContent = `${data.brands.length} Matches`;
    header.appendChild(badge);

    card.appendChild(header);

    // Brands list
    const list = document.createElement('ul');
    list.className = 'card-list';

    data.brands.forEach(b => {
      const li = document.createElement('li');
      const strong = document.createElement('strong');
      strong.textContent = b.name;
      li.appendChild(strong);
      li.appendChild(document.createTextNode(` - ${b.category} (${b.matchScore}% match)`));
      list.appendChild(li);
    });

    card.appendChild(list);

    // Action button
    const btn = document.createElement('button');
    btn.className = 'card-action-btn';
    btn.textContent = 'View All Matches';
    btn.addEventListener('click', () => {
      window.location.hash = 'brand-matches';
    });
    card.appendChild(btn);

    return card;
  }

  createScheduleCardElement(data) {
    const card = document.createElement('div');
    card.className = 'message-card';

    // Header
    const header = document.createElement('div');
    header.className = 'card-header';

    const title = document.createElement('span');
    title.className = 'card-title';
    title.textContent = 'Optimal Posting Schedule';
    header.appendChild(title);

    const badge = document.createElement('span');
    badge.className = 'card-badge badge-positive';
    badge.textContent = 'Optimized';
    header.appendChild(badge);

    card.appendChild(header);

    // Content
    const content = document.createElement('div');
    content.className = 'card-content';

    const list = document.createElement('ul');
    list.className = 'card-list';

    data.recommendations.forEach(r => {
      const li = document.createElement('li');
      li.textContent = r;
      list.appendChild(li);
    });

    content.appendChild(list);
    card.appendChild(content);

    return card;
  }

  createScoreCardElement(data) {
    const card = document.createElement('div');
    card.className = 'message-card score-card';

    // Header
    const header = document.createElement('div');
    header.className = 'card-header';

    const title = document.createElement('span');
    title.className = 'card-title';
    title.textContent = 'Score Improvement Tips';
    header.appendChild(title);

    const badge = document.createElement('span');
    badge.className = 'card-badge badge-positive';
    badge.textContent = `+${data.potentialGain} Points`;
    header.appendChild(badge);

    card.appendChild(header);

    // Metrics
    const metrics = document.createElement('div');
    metrics.className = 'card-metrics';

    const currentMetric = document.createElement('div');
    currentMetric.className = 'metric-item';
    const currentLabel = document.createElement('span');
    currentLabel.className = 'metric-label';
    currentLabel.textContent = 'Current Score';
    currentMetric.appendChild(currentLabel);
    const currentValue = document.createElement('span');
    currentValue.className = 'metric-value';
    currentValue.textContent = data.currentScore;
    currentMetric.appendChild(currentValue);
    metrics.appendChild(currentMetric);

    const potentialMetric = document.createElement('div');
    potentialMetric.className = 'metric-item';
    const potentialLabel = document.createElement('span');
    potentialLabel.className = 'metric-label';
    potentialLabel.textContent = 'Potential Score';
    potentialMetric.appendChild(potentialLabel);
    const potentialValue = document.createElement('span');
    potentialValue.className = 'metric-value positive';
    potentialValue.textContent = data.potentialScore;
    potentialMetric.appendChild(potentialValue);
    metrics.appendChild(potentialMetric);

    card.appendChild(metrics);

    // Tips list
    const list = document.createElement('ul');
    list.className = 'card-list';

    data.tips.forEach(t => {
      const li = document.createElement('li');
      li.textContent = t;
      list.appendChild(li);
    });

    card.appendChild(list);

    return card;
  }

  renderMessages() {
    // Clear existing messages
    while (this.elements.messages.firstChild) {
      this.elements.messages.removeChild(this.elements.messages.firstChild);
    }
    this.messages.forEach(msg => this.renderMessage(msg));
  }

  showTyping() {
    this.isTyping = true;
    this.elements.statusText.textContent = 'Typing...';

    const typingEl = document.createElement('div');
    typingEl.className = 'typing-indicator';
    typingEl.id = 'typing-indicator';

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.style.cssText = 'background: linear-gradient(135deg, var(--sm-cyan-dark), var(--sm-cyan)); display: flex; align-items: center; justify-content: center; color: black;';
    avatar.appendChild(this.createAvatarSVG());
    typingEl.appendChild(avatar);

    // Dots container
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'typing-dots';

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'typing-dot';
      dotsContainer.appendChild(dot);
    }

    typingEl.appendChild(dotsContainer);
    this.elements.messages.appendChild(typingEl);
    this.scrollToBottom();
  }

  hideTyping() {
    this.isTyping = false;
    this.elements.statusText.textContent = 'Online';

    const typingEl = document.getElementById('typing-indicator');
    if (typingEl) {
      typingEl.remove();
    }
  }

  // ============================================================
  // AI RESPONSE GENERATION (Mock)
  // ============================================================

  generateResponse(userMessage, quickAction = null) {
    this.showTyping();

    // Simulate API delay
    const delay = this.options.typingDelay + Math.random() * 1000;

    setTimeout(() => {
      this.hideTyping();

      const response = this.getMockResponse(userMessage, quickAction);
      this.addMessage('ai', response.content, response.cardData);
    }, delay);
  }

  getMockResponse(userMessage, quickAction = null) {
    const athlete = this.options.athleteData;
    const messageLower = userMessage.toLowerCase();

    // Quick action responses
    if (quickAction) {
      return this.getQuickActionResponse(quickAction);
    }

    // Pattern matching for common queries
    if (messageLower.includes('deal') || messageLower.includes('offer') || messageLower.includes('contract')) {
      return this.getDealAnalysisResponse();
    }

    if (messageLower.includes('brand') || messageLower.includes('match') || messageLower.includes('sponsor')) {
      return this.getBrandRecommendationResponse();
    }

    if (messageLower.includes('schedule') || messageLower.includes('when') || messageLower.includes('time') || messageLower.includes('post')) {
      return this.getScheduleResponse();
    }

    if (messageLower.includes('score') || messageLower.includes('improve') || messageLower.includes('boost')) {
      return this.getScoreImprovementResponse();
    }

    if (messageLower.includes('tax') || messageLower.includes('taxes') || messageLower.includes('1099')) {
      return this.getTaxExplanationResponse();
    }

    if (messageLower.includes('hello') || messageLower.includes('hi') || messageLower.includes('hey')) {
      const firstName = athlete.name.split(' ')[0];
      return {
        content: `Hey there, ${firstName}! Great to see you. How can I help you maximize your NIL potential today?`,
        cardData: null
      };
    }

    if (messageLower.includes('thank')) {
      return {
        content: `You're welcome! I'm here whenever you need guidance on deals, brand partnerships, or improving your profile. Keep up the great work - your ${athlete.gpa} GPA is really setting you apart!`,
        cardData: null
      };
    }

    // Default response
    return {
      content: `That's a great question! Based on your profile as a ${athlete.position} at ${athlete.school} with a ${athlete.gradeupScore} GradeUp score, I'd recommend focusing on opportunities that align with your ${athlete.sport} background and academic achievements.

Would you like me to:
- Analyze a specific deal opportunity?
- Find brand matches for your profile?
- Suggest optimal posting times?
- Show ways to improve your score?

Just let me know what interests you most!`,
      cardData: null
    };
  }

  getQuickActionResponse(action) {
    switch (action) {
      case 'analyze_deal':
        return this.getDealAnalysisResponse();
      case 'recommend_brands':
        return this.getBrandRecommendationResponse();
      case 'schedule_deals':
        return this.getScheduleResponse();
      case 'improve_score':
        return this.getScoreImprovementResponse();
      case 'explain_taxes':
        return this.getTaxExplanationResponse();
      default:
        return { content: 'How can I help you today?', cardData: null };
    }
  }

  getDealAnalysisResponse() {
    const athlete = this.options.athleteData;
    const baseAmount = 12000;
    const fairMarket = Math.round(baseAmount * 1.1);
    const counterOffer = Math.round(baseAmount * 1.15);

    return {
      content: `I've analyzed your most recent deal opportunity from Beats by Dre. Here's my assessment:

**Overall Verdict:** This deal looks promising but there's room for negotiation.

**Key Findings:**
- The offer is slightly below market rate for athletes in your tier
- Brand alignment is strong given your ${athlete.sport} focus
- The timeline overlaps with your semester - consider the workload

**My Recommendation:** Counter at $${counterOffer.toLocaleString()} based on your ${athlete.followers.toLocaleString()} followers and ${athlete.engagement}% engagement rate.`,
      cardData: {
        type: 'deal',
        brandName: 'Beats by Dre',
        amount: baseAmount,
        fairMarket: fairMarket,
        counterOffer: counterOffer,
        brandFit: 87,
        recommendation: 'review'
      }
    };
  }

  getBrandRecommendationResponse() {
    const athlete = this.options.athleteData;

    const brands = [
      { name: 'Under Armour', category: 'Athletic Apparel', matchScore: 94 },
      { name: 'Gatorade', category: 'Sports Beverage', matchScore: 91 },
      { name: 'Foot Locker', category: 'Retail', matchScore: 87 },
      { name: 'Muscle Milk', category: 'Nutrition', matchScore: 82 }
    ];

    return {
      content: `Based on your profile as a ${athlete.position} at ${athlete.school}, I found ${brands.length} brands that would be an excellent fit for you.

**Why these brands match:**
- Your ${athlete.sport} background aligns with athletic-focused sponsors
- Your ${athlete.gpa} GPA qualifies you for academic excellence programs
- Your ${athlete.followers.toLocaleString()} followers give you strong reach
- Your ${athlete.engagement}% engagement rate is above average

I recommend reaching out to Under Armour first - they have an active college athlete program and value academic achievement.`,
      cardData: {
        type: 'brands',
        brands: brands
      }
    };
  }

  getScheduleResponse() {
    const athlete = this.options.athleteData;

    return {
      content: `Great question! Based on your audience analytics and ${athlete.sport} schedule, here's when you should post for maximum engagement:

**Best Times to Post:**
- **Instagram:** Weekdays 7-9 PM EST (after practice)
- **TikTok:** Tuesday & Thursday 8-10 PM EST
- **Twitter:** Game days, 1-2 hours pre-game

**Pro Tips:**
- Avoid posting during midterms/finals weeks
- Schedule brand content 2-3 days before game days
- Your audience is most active on weekends during away games`,
      cardData: {
        type: 'schedule',
        recommendations: [
          'Post Instagram content between 7-9 PM EST on weekdays',
          'TikTok performs best on Tuesday and Thursday evenings',
          'Avoid posting 24 hours before big games - save content for post-game',
          'Your highest engagement day is Saturday (12% above average)',
          'Consider batching content creation on Sunday afternoons'
        ]
      }
    };
  }

  getScoreImprovementResponse() {
    const athlete = this.options.athleteData;
    const currentScore = athlete.gradeupScore;
    const potentialScore = Math.round(currentScore * 1.15);
    const potentialGain = potentialScore - currentScore;

    return {
      content: `Let's boost your GradeUp score! Currently at ${currentScore}, I see potential to reach ${potentialScore}. Here's your personalized improvement plan:

**Quick Wins (Next 30 Days):**
1. **Complete your profile** - Add 3 more highlights (+15 points)
2. **Verify social accounts** - Connect TikTok (+20 points)
3. **Update media kit** - Add recent press mentions (+10 points)

**Medium-term Goals:**
4. **Improve engagement** - Respond to 50% more comments
5. **Academic milestone** - Dean's List recognition adds prestige
6. **Community involvement** - Document volunteer work`,
      cardData: {
        type: 'score',
        currentScore: currentScore,
        potentialScore: potentialScore,
        potentialGain: potentialGain,
        tips: [
          'Complete all profile sections (+15 points)',
          'Connect TikTok account (+20 points)',
          'Upload professional headshot (+10 points)',
          'Add 3 highlight videos (+25 points)',
          'Get verified by your athletic department (+30 points)'
        ]
      }
    };
  }

  getTaxExplanationResponse() {
    const athlete = this.options.athleteData;
    const estimatedTax = Math.round(athlete.totalEarnings * 0.22);

    return {
      content: `NIL income is taxable - here's what you need to know:

**The Basics:**
- NIL earnings are considered self-employment income
- You'll receive 1099 forms from brands paying $600+
- Estimated tax rate: 22-32% depending on total income

**Your Situation:**
Based on your $${athlete.totalEarnings.toLocaleString()} in earnings, set aside approximately **$${estimatedTax.toLocaleString()}** for taxes.

**Important Deadlines:**
- **Q1 Estimated Tax:** April 15
- **Q2 Estimated Tax:** June 15
- **Q3 Estimated Tax:** September 15
- **Q4 Estimated Tax:** January 15

**Deductions You Can Claim:**
- Professional photos and media kit costs
- Travel for brand appearances
- Agent/manager fees (if applicable)
- Equipment used for content creation

**My Recommendation:** Consider setting up a separate savings account and automatically transferring 25% of each payment for taxes. Would you like me to help calculate estimated quarterly payments?`,
      cardData: null
    };
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.textContent;
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // If less than 1 minute ago
    if (diff < 60000) {
      return 'Just now';
    }

    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }

    // If yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday ' + date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }

    // Otherwise show date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  scrollToBottom() {
    setTimeout(() => {
      this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }, 100);
  }

  updateBadge() {
    if (this.unreadCount > 0) {
      this.elements.badge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
      this.elements.badge.style.display = 'flex';
    } else {
      this.elements.badge.style.display = 'none';
    }
  }

  // ============================================================
  // PERSISTENCE
  // ============================================================

  saveHistory() {
    try {
      const historyToSave = this.messages.slice(-this.options.maxHistoryLength);
      localStorage.setItem(this.options.storageKey, JSON.stringify(historyToSave));
    } catch (e) {
      console.warn('ScholarMatch Chat: Unable to save history to localStorage', e);
    }
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem(this.options.storageKey);
      if (saved) {
        this.messages = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('ScholarMatch Chat: Unable to load history from localStorage', e);
      this.messages = [];
    }
  }

  clearHistory() {
    this.messages = [];
    localStorage.removeItem(this.options.storageKey);
    // Clear messages container
    while (this.elements.messages.firstChild) {
      this.elements.messages.removeChild(this.elements.messages.firstChild);
    }
    this.addWelcomeMessage();
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Send a message programmatically
   * @param {string} message - The message to send
   */
  sendMessage(message) {
    if (message && message.trim()) {
      this.addMessage('user', message.trim());
      this.generateResponse(message.trim());
    }
  }

  /**
   * Open the chat window
   */
  open() {
    this.openChat();
  }

  /**
   * Close the chat window
   */
  close() {
    this.closeChat();
  }

  /**
   * Update athlete data
   * @param {Object} athleteData - New athlete data
   */
  updateAthleteData(athleteData) {
    this.options.athleteData = { ...this.options.athleteData, ...athleteData };
  }

  /**
   * Destroy the chat component
   */
  destroy() {
    // Remove event listeners
    this.elements.fab.removeEventListener('click', this.toggleChat);
    this.elements.minimizeBtn.removeEventListener('click', this.minimizeChat);
    this.elements.closeBtn.removeEventListener('click', this.closeChat);
    this.elements.input.removeEventListener('keydown', this.handleKeyPress);
    this.elements.sendBtn.removeEventListener('click', this.handleSendMessage);

    // Remove DOM elements
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    // Remove styles
    const styleSheet = document.getElementById('scholarmatch-chat-styles');
    if (styleSheet) {
      styleSheet.remove();
    }
  }
}

// ============================================================
// AUTO-INITIALIZATION
// ============================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Auto-create if container exists or user wants auto-init
    if (document.getElementById('scholarmatch-chat') ||
        document.querySelector('[data-scholarmatch-chat]')) {
      window.scholarMatchChat = new ScholarMatchChat('scholarmatch-chat');
    }
  });
} else {
  // DOM already loaded
  if (document.getElementById('scholarmatch-chat') ||
      document.querySelector('[data-scholarmatch-chat]')) {
    window.scholarMatchChat = new ScholarMatchChat('scholarmatch-chat');
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScholarMatchChat;
}

// Make available globally
window.ScholarMatchChat = ScholarMatchChat;

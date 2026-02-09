/**
 * GradeUp NIL Platform - Page Initializer
 * Connects general pages to the backend services.
 * Lighter weight than dashboard-init.js for non-dashboard pages.
 *
 * @module page-init
 */

document.addEventListener('DOMContentLoaded', async function() {
  try {
    const { initApp, isDemo, getCurrentUser } = await import('./app.js');

    // Initialize app (will detect user type from stored session)
    const result = await initApp();

    console.log('Page initialized:', result);

    // Show demo mode indicator if in demo mode
    if (isDemo()) {
      showDemoIndicator();
    }

    // Make key functions available globally for inline scripts
    window.GradeUp = {
      isDemo,
      getCurrentUser,
      services: await import('./services/index.js'),
    };

    // Dispatch custom event for page-specific initialization
    document.dispatchEvent(new CustomEvent('gradeup:ready', {
      detail: { user: getCurrentUser(), demoMode: isDemo() }
    }));

  } catch (err) {
    console.error('Page initialization failed:', err);
  }
});

/**
 * Show demo mode indicator
 */
function showDemoIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'demo-indicator';

  const badge = document.createElement('span');
  badge.className = 'demo-badge';
  badge.textContent = 'DEMO MODE';

  const text = document.createElement('span');
  text.className = 'demo-text';
  text.textContent = 'Using mock data';

  indicator.appendChild(badge);
  indicator.appendChild(text);

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .demo-indicator {
      position: fixed;
      bottom: 20px;
      left: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid rgba(0, 240, 255, 0.3);
      border-radius: 100px;
      font-size: 12px;
      z-index: 9999;
      backdrop-filter: blur(8px);
    }
    .demo-badge {
      padding: 2px 8px;
      background: linear-gradient(135deg, #00f0ff, #00a0ff);
      color: #000;
      font-weight: 700;
      font-size: 10px;
      letter-spacing: 0.05em;
      border-radius: 4px;
    }
    .demo-text {
      color: rgba(255, 255, 255, 0.7);
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(indicator);
}

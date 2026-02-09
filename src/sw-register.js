// Service Worker Registration for GradeUp NIL
(function() {
  'use strict';

  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.log('[SW Register] Service workers not supported');
    return;
  }

  // Wait for the page to load
  window.addEventListener('load', registerServiceWorker);

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[SW Register] Service worker registered:', registration.scope);

      // Check for updates on page load
      registration.update();

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[SW Register] New service worker installing');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, notify user
            onUpdateAvailable(registration);
          }
        });
      });

    } catch (error) {
      console.error('[SW Register] Registration failed:', error);
    }
  }

  // Handle update availability
  function onUpdateAvailable(registration) {
    console.log('[SW Register] New version available');

    // Dispatch custom event for the app to handle
    const event = new CustomEvent('swUpdate', {
      detail: { registration }
    });
    window.dispatchEvent(event);

    // Optional: Auto-update if no user interaction needed
    // Uncomment the following to enable auto-update:
    // if (registration.waiting) {
    //   registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    // }
  }

  // Listen for controller change and reload
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  // Export function to manually trigger update
  window.updateServiceWorker = async function() {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };
})();

// Dropdown.js - Fixed dropdown implementation
function initDropdowns() {
  const dropdowns = document.querySelectorAll('.dropdown, .nav-dropdown');

  dropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.dropdown-toggle, .dropdown-trigger');
    const menu = dropdown.querySelector('.dropdown-menu');

    if (!toggle || !menu) return;

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Close other dropdowns
      document.querySelectorAll('.dropdown-menu.active').forEach(m => {
        if (m !== menu) m.classList.remove('active');
      });

      // Toggle this dropdown
      menu.classList.toggle('active');
      toggle.setAttribute('aria-expanded', menu.classList.contains('active'));
    });

    // Hover support for desktop
    dropdown.addEventListener('mouseenter', () => {
      if (window.innerWidth > 768) {
        menu.classList.add('active');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });

    dropdown.addEventListener('mouseleave', () => {
      if (window.innerWidth > 768) {
        menu.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown') && !e.target.closest('.nav-dropdown')) {
      document.querySelectorAll('.dropdown-menu.active').forEach(m => {
        m.classList.remove('active');
      });
      document.querySelectorAll('.dropdown-toggle, .dropdown-trigger').forEach(t => {
        t.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.dropdown-menu.active').forEach(m => {
        m.classList.remove('active');
      });
    }
  });

  // Handle dropdown menu item clicks
  document.querySelectorAll('.dropdown-menu a').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      const onclick = link.getAttribute('onclick');

      // If there's an onclick handler, let it handle navigation
      if (onclick) {
        return;
      }

      // Otherwise navigate to href if it's a valid URL
      if (href && href !== '#' && !href.startsWith('javascript:')) {
        window.location.href = href;
      }
    });
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', initDropdowns);

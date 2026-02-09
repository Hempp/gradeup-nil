/**
 * GradeUp NIL Platform - Dashboard Initializer
 * Connects dashboard UI components to the backend services.
 *
 * @module dashboard-init
 */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
  // Determine dashboard type from page
  const isAthleteDashboard = document.body.classList.contains('athlete-dashboard') ||
    window.location.pathname.includes('athlete-dashboard');
  const isBrandDashboard = document.body.classList.contains('brand-dashboard') ||
    window.location.pathname.includes('brand-dashboard');
  const isDirectorDashboard = document.body.classList.contains('director-dashboard') ||
    window.location.pathname.includes('director-dashboard');

  const userType = isDirectorDashboard ? 'director' : (isBrandDashboard ? 'brand' : 'athlete');

  // Initialize the app
  try {
    const { initApp, isDemo, getCurrentUser, getDemoData } = await import('./app.js');
    const result = await initApp({ userType });

    console.log('Dashboard initialized:', result);

    // Show demo mode indicator
    if (isDemo()) {
      showDemoIndicator();
    }

    // Load dashboard data based on type
    if (isAthleteDashboard) {
      await loadAthleteDashboardData();
    } else if (isBrandDashboard) {
      await loadBrandDashboardData();
    } else if (isDirectorDashboard) {
      await loadDirectorDashboardData();
    }

    // Set up real-time subscriptions (if not demo mode)
    if (!isDemo()) {
      setupRealtimeSubscriptions(userType);
    }

  } catch (err) {
    console.error('Dashboard initialization failed:', err);
    showErrorState(err.message);
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
  style.textContent = [
    '.demo-indicator {',
    '  position: fixed;',
    '  bottom: 20px;',
    '  left: 20px;',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 8px;',
    '  padding: 8px 16px;',
    '  background: rgba(0, 240, 255, 0.1);',
    '  border: 1px solid rgba(0, 240, 255, 0.3);',
    '  border-radius: 100px;',
    '  font-size: 12px;',
    '  z-index: 9999;',
    '  backdrop-filter: blur(8px);',
    '}',
    '.demo-badge {',
    '  padding: 2px 8px;',
    '  background: linear-gradient(135deg, #00f0ff, #00a0ff);',
    '  color: #000;',
    '  font-weight: 700;',
    '  font-size: 10px;',
    '  letter-spacing: 0.05em;',
    '  border-radius: 4px;',
    '}',
    '.demo-text {',
    '  color: rgba(255, 255, 255, 0.7);',
    '}',
  ].join('\n');
  document.head.appendChild(style);
  document.body.appendChild(indicator);
}

/**
 * Load athlete dashboard data
 */
async function loadAthleteDashboardData() {
  const {
    getMyProfile,
    getDeals,
    getNotifications,
    getAchievements,
    calculateScore,
  } = await import('./app.js');

  try {
    // Load profile
    const { profile } = await getMyProfile();
    if (profile) {
      updateAthleteProfile(profile);
    }

    // Load GradeUp Score
    const { score } = await calculateScore();
    if (score) {
      updateGradeUpScore(score);
    }

    // Load deals
    const { deals } = await getDeals();
    if (deals) {
      updateDealsDisplay(deals);
    }

    // Load notifications
    const { notifications } = await getNotifications();
    if (notifications) {
      updateNotificationsDisplay(notifications);
    }

    // Load achievements
    const { achievements } = await getAchievements();
    if (achievements) {
      updateAchievementsDisplay(achievements);
    }

  } catch (err) {
    console.error('Error loading athlete data:', err);
  }
}

/**
 * Load brand dashboard data
 */
async function loadBrandDashboardData() {
  const { getDemoData, isDemo } = await import('./app.js');

  try {
    if (isDemo()) {
      const athletes = getDemoData('athletes');
      updateAthletesGrid(athletes);
    } else {
      // Load from real services
      const { searchAthletes } = await import('./services/search.js');
      const { athletes } = await searchAthletes({});
      if (athletes) {
        updateAthletesGrid(athletes);
      }
    }
  } catch (err) {
    console.error('Error loading brand data:', err);
  }
}

/**
 * Load director dashboard data
 */
async function loadDirectorDashboardData() {
  const { getDemoData, isDemo } = await import('./app.js');

  try {
    if (isDemo()) {
      const athletes = getDemoData('athletes');
      updateDirectorAthletesTable(athletes);
    }
  } catch (err) {
    console.error('Error loading director data:', err);
  }
}

/**
 * Update athlete profile display
 */
function updateAthleteProfile(profile) {
  // Update name
  const nameEl = document.querySelector('.athlete-name, #athleteName');
  if (nameEl && profile.profile) {
    nameEl.textContent = profile.profile.first_name + ' ' + profile.profile.last_name;
  }

  // Update school
  const schoolEl = document.querySelector('.athlete-school, #athleteSchool');
  if (schoolEl && profile.school) {
    schoolEl.textContent = profile.school.name;
  }

  // Update avatar
  const avatarEl = document.querySelector('.athlete-avatar img, #athleteAvatar');
  if (avatarEl && profile.profile && profile.profile.avatar_url) {
    avatarEl.src = profile.profile.avatar_url;
  }

  // Update GPA
  const gpaEl = document.querySelector('.gpa-value, #gpaValue');
  if (gpaEl && profile.gpa) {
    gpaEl.textContent = profile.gpa.toFixed(2);
  }
}

/**
 * Update GradeUp Score display
 */
function updateGradeUpScore(score) {
  // Update total score
  const scoreEl = document.querySelector('.score-value, #gradeupScore');
  if (scoreEl) {
    animateNumber(scoreEl, 0, score.total, 2000);
  }

  // Update score ring
  const ringEl = document.querySelector('.score-ring-progress, #scoreRing');
  if (ringEl) {
    const percentage = (score.total / 1000) * 100;
    ringEl.style.setProperty('--progress', percentage + '%');
  }

  // Update component scores
  const athleticEl = document.getElementById('athleticScore');
  if (athleticEl) athleticEl.textContent = score.athletic;

  const socialEl = document.getElementById('socialScore');
  if (socialEl) socialEl.textContent = score.social;

  const academicEl = document.getElementById('academicScore');
  if (academicEl) academicEl.textContent = score.academic;
}

/**
 * Update deals display
 */
function updateDealsDisplay(deals) {
  const container = document.querySelector('.deals-list, #dealsList');
  if (!container) return;

  // Clear existing content
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  if (deals.length === 0) {
    const emptyState = document.createElement('p');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No active deals yet.';
    container.appendChild(emptyState);
    return;
  }

  deals.forEach(function(deal) {
    const dealEl = createDealCard(deal);
    container.appendChild(dealEl);
  });

  // Update stats
  const activeCount = deals.filter(function(d) { return d.status === 'active'; }).length;
  const pendingCount = deals.filter(function(d) { return d.status === 'pending'; }).length;
  const totalEarnings = deals
    .filter(function(d) { return d.status === 'completed'; })
    .reduce(function(sum, d) { return sum + (d.amount || 0); }, 0);

  const activeEl = document.getElementById('activeDealsCount');
  if (activeEl) activeEl.textContent = activeCount;

  const pendingEl = document.getElementById('pendingDealsCount');
  if (pendingEl) pendingEl.textContent = pendingCount;

  const earningsEl = document.getElementById('totalEarnings');
  if (earningsEl) earningsEl.textContent = formatCurrency(totalEarnings);
}

/**
 * Create a deal card element
 */
function createDealCard(deal) {
  const card = document.createElement('div');
  card.className = 'deal-card deal-' + deal.status;
  card.dataset.dealId = deal.id;

  const logo = document.createElement('div');
  logo.className = 'deal-logo';
  logo.textContent = deal.brandLogo || (deal.brandName ? deal.brandName.charAt(0) : 'B');

  const info = document.createElement('div');
  info.className = 'deal-info';

  const title = document.createElement('div');
  title.className = 'deal-title';
  title.textContent = deal.title;

  const brand = document.createElement('div');
  brand.className = 'deal-brand';
  brand.textContent = deal.brandName;

  info.appendChild(title);
  info.appendChild(brand);

  const amount = document.createElement('div');
  amount.className = 'deal-amount';
  amount.textContent = formatCurrency(deal.amount);

  const status = document.createElement('span');
  status.className = 'deal-status status-' + deal.status;
  status.textContent = deal.status;

  card.appendChild(logo);
  card.appendChild(info);
  card.appendChild(amount);
  card.appendChild(status);

  return card;
}

/**
 * Update notifications display
 */
function updateNotificationsDisplay(notifications) {
  const badge = document.querySelector('.notification-badge, #notificationBadge');
  const unreadCount = notifications.filter(function(n) { return !n.read; }).length;

  if (badge) {
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
  }

  const list = document.querySelector('.notifications-list, #notificationsList');
  if (!list) return;

  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }

  notifications.slice(0, 5).forEach(function(notif) {
    const item = document.createElement('div');
    item.className = 'notification-item' + (notif.read ? '' : ' unread');

    const icon = document.createElement('div');
    icon.className = 'notification-icon';
    icon.textContent = getNotificationIcon(notif.type);

    const content = document.createElement('div');
    content.className = 'notification-content';

    const titleEl = document.createElement('div');
    titleEl.className = 'notification-title';
    titleEl.textContent = notif.title;

    const messageEl = document.createElement('div');
    messageEl.className = 'notification-message';
    messageEl.textContent = notif.message;

    content.appendChild(titleEl);
    content.appendChild(messageEl);

    item.appendChild(icon);
    item.appendChild(content);
    list.appendChild(item);
  });
}

/**
 * Update achievements display
 */
function updateAchievementsDisplay(achievements) {
  const container = document.querySelector('.achievements-grid, #achievementsGrid');
  if (!container) return;

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  achievements.forEach(function(ach) {
    const card = document.createElement('div');
    card.className = 'achievement-card ' + (ach.earned ? 'earned' : 'locked');

    const icon = document.createElement('div');
    icon.className = 'achievement-icon';
    icon.textContent = ach.icon;

    const name = document.createElement('div');
    name.className = 'achievement-name';
    name.textContent = ach.name;

    const desc = document.createElement('div');
    desc.className = 'achievement-desc';
    desc.textContent = ach.description;

    card.appendChild(icon);
    card.appendChild(name);
    card.appendChild(desc);

    if (!ach.earned && ach.progress !== undefined) {
      const progress = document.createElement('div');
      progress.className = 'achievement-progress';

      const progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';

      const progressFill = document.createElement('div');
      progressFill.className = 'progress-fill';
      progressFill.style.width = ((ach.progress / ach.target) * 100) + '%';

      progressBar.appendChild(progressFill);
      progress.appendChild(progressBar);
      card.appendChild(progress);
    }

    container.appendChild(card);
  });
}

/**
 * Update athletes grid (brand dashboard)
 */
function updateAthletesGrid(athletes) {
  const grid = document.querySelector('.athletes-grid, #athletesGrid');
  if (!grid) return;

  // Grid may already have content from inline JS, so we check
  if (grid.children.length > 0 && grid.dataset.loaded) return;

  while (grid.firstChild) {
    grid.removeChild(grid.firstChild);
  }
  grid.dataset.loaded = 'true';

  athletes.forEach(function(athlete) {
    const card = createAthleteCard(athlete);
    grid.appendChild(card);
  });
}

/**
 * Create athlete card element
 */
function createAthleteCard(athlete) {
  const card = document.createElement('div');
  card.className = 'athlete-card';
  card.dataset.athleteId = athlete.id;

  const image = document.createElement('div');
  image.className = 'athlete-card-image';

  const img = document.createElement('img');
  img.src = athlete.image || 'https://via.placeholder.com/300x300';
  img.alt = athlete.name;
  img.loading = 'lazy';
  image.appendChild(img);

  if (athlete.verified) {
    const badge = document.createElement('span');
    badge.className = 'verified-badge';
    badge.textContent = '\u2713';
    image.appendChild(badge);
  }

  const content = document.createElement('div');
  content.className = 'athlete-card-content';

  const name = document.createElement('h3');
  name.className = 'athlete-card-name';
  name.textContent = athlete.name;

  const school = document.createElement('p');
  school.className = 'athlete-card-school';
  school.textContent = athlete.sport + ' \u2022 ' + athlete.school;

  const stats = document.createElement('div');
  stats.className = 'athlete-card-stats';

  const gpaStat = document.createElement('span');
  gpaStat.className = 'stat';
  const gpaStrong = document.createElement('strong');
  gpaStrong.textContent = athlete.gpa.toFixed(2);
  gpaStat.appendChild(gpaStrong);
  gpaStat.appendChild(document.createTextNode(' GPA'));

  const followersStat = document.createElement('span');
  followersStat.className = 'stat';
  const followersStrong = document.createElement('strong');
  followersStrong.textContent = formatNumber(athlete.followers);
  followersStat.appendChild(followersStrong);
  followersStat.appendChild(document.createTextNode(' Followers'));

  const scoreStat = document.createElement('span');
  scoreStat.className = 'stat';
  const scoreStrong = document.createElement('strong');
  scoreStrong.textContent = athlete.gradeupScore;
  scoreStat.appendChild(scoreStrong);
  scoreStat.appendChild(document.createTextNode(' Score'));

  stats.appendChild(gpaStat);
  stats.appendChild(followersStat);
  stats.appendChild(scoreStat);

  content.appendChild(name);
  content.appendChild(school);
  content.appendChild(stats);

  card.appendChild(image);
  card.appendChild(content);

  card.addEventListener('click', function() {
    window.location.href = 'athlete-profile.html?id=' + athlete.id;
  });

  return card;
}

/**
 * Update director athletes table
 */
function updateDirectorAthletesTable(athletes) {
  const tbody = document.querySelector('.athletes-table tbody, #athletesTableBody');
  if (!tbody) return;

  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }

  athletes.forEach(function(athlete) {
    const row = document.createElement('tr');

    // Name cell
    const nameCell = document.createElement('td');
    const athleteCell = document.createElement('div');
    athleteCell.className = 'athlete-cell';

    const thumb = document.createElement('img');
    thumb.src = athlete.image;
    thumb.alt = athlete.name;
    thumb.className = 'athlete-thumb';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = athlete.name;

    athleteCell.appendChild(thumb);
    athleteCell.appendChild(nameSpan);
    nameCell.appendChild(athleteCell);

    // Sport cell
    const sportCell = document.createElement('td');
    sportCell.textContent = athlete.sport;

    // GPA cell
    const gpaCell = document.createElement('td');
    gpaCell.textContent = athlete.gpa.toFixed(2);

    // Score cell
    const scoreCell = document.createElement('td');
    scoreCell.textContent = athlete.gradeupScore;

    // Status cell
    const statusCell = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.className = 'status-badge verified';
    statusBadge.textContent = 'Verified';
    statusCell.appendChild(statusBadge);

    // Actions cell
    const actionsCell = document.createElement('td');
    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn-icon';
    viewBtn.title = 'View Profile';
    viewBtn.textContent = '\uD83D\uDC41';

    const msgBtn = document.createElement('button');
    msgBtn.className = 'btn-icon';
    msgBtn.title = 'Message';
    msgBtn.textContent = '\uD83D\uDCAC';

    actionsCell.appendChild(viewBtn);
    actionsCell.appendChild(msgBtn);

    row.appendChild(nameCell);
    row.appendChild(sportCell);
    row.appendChild(gpaCell);
    row.appendChild(scoreCell);
    row.appendChild(statusCell);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  });
}

/**
 * Set up real-time subscriptions
 */
async function setupRealtimeSubscriptions(userType) {
  try {
    const { subscribeToTable } = await import('./services/supabase.js');

    // Subscribe to notifications
    subscribeToTable('notifications', function(payload) {
      console.log('New notification:', payload);
    }, { event: 'INSERT' });

    // Subscribe to deals updates
    subscribeToTable('deals', function(payload) {
      console.log('Deal update:', payload);
    }, { event: '*' });

    // Subscribe to messages
    subscribeToTable('messages', function(payload) {
      console.log('New message:', payload);
    }, { event: 'INSERT' });

  } catch (err) {
    console.warn('Could not set up real-time subscriptions:', err);
  }
}

/**
 * Show error state
 */
function showErrorState(message) {
  const main = document.querySelector('main, .dashboard-main');
  if (main) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-state';

    const icon = document.createElement('div');
    icon.className = 'error-icon';
    icon.textContent = '\u26A0\uFE0F';

    const title = document.createElement('h2');
    title.textContent = 'Something went wrong';

    const desc = document.createElement('p');
    desc.textContent = message;

    const button = document.createElement('button');
    button.textContent = 'Try Again';
    button.addEventListener('click', function() {
      location.reload();
    });

    errorDiv.appendChild(icon);
    errorDiv.appendChild(title);
    errorDiv.appendChild(desc);
    errorDiv.appendChild(button);

    main.insertBefore(errorDiv, main.firstChild);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// Note: formatCurrency and formatNumber are now in /src/utils/formatters.js
// ============================================================================

function animateNumber(el, start, end, duration) {
  var startTime = performance.now();

  function update(currentTime) {
    var elapsed = currentTime - startTime;
    var progress = Math.min(elapsed / duration, 1);
    var eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    var value = Math.round(start + (end - start) * eased);

    el.textContent = value;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function getNotificationIcon(type) {
  var icons = {
    deal: '\uD83D\uDCBC',
    achievement: '\uD83C\uDFC6',
    score: '\uD83D\uDCC8',
    message: '\uD83D\uDCAC',
    verification: '\u2713',
  };
  return icons[type] || '\uD83D\uDD14';
}

// Export for module usage
export {
  loadAthleteDashboardData,
  loadBrandDashboardData,
  loadDirectorDashboardData,
  updateAthleteProfile,
  updateGradeUpScore,
  updateDealsDisplay,
  updateNotificationsDisplay,
  updateAchievementsDisplay,
};

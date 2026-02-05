/**
 * GradeUp Dashboard JavaScript
 * Shared logic for Athlete and Brand dashboards
 * Version: 1.0.0
 *
 * NOTE: This file uses innerHTML for rendering dynamic content from mock data.
 * In production, use a sanitization library like DOMPurify for user-generated content.
 */

// ============================================================
// SECTION 1: MOCK DATA
// ============================================================

// Current athlete data
const currentAthlete = {
  id: 1,
  name: 'Marcus Johnson',
  school: 'Duke University',
  sport: 'Basketball',
  position: 'Point Guard',
  gpa: 3.87,
  gradeupScore: 847,
  scholarTier: 'gold',
  xp: 2450,
  level: 12,
  totalEarnings: 45200,
  activeDeals: 3,
  profileViews: 1247,
  followers: 125000,
  verified: true,
  avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200'
};

// Score breakdown
const scoreBreakdown = {
  athletic: 340,
  social: 245,
  academic: 262,
  gpaMultiplier: 1.35,
  majorMultiplier: 1.20,
  consistencyBonus: 1.10
};

// Achievements data
const achievements = [
  {
    id: 1,
    name: 'First Deal Signed',
    description: 'Complete your first brand partnership',
    icon: 'handshake',
    rarity: 'common',
    xpReward: 100,
    unlocked: true,
    unlockedDate: '2024-09-15'
  },
  {
    id: 2,
    name: 'Dean\'s List Hero',
    description: 'Maintain a 3.5+ GPA for two consecutive semesters',
    icon: 'graduation-cap',
    rarity: 'rare',
    xpReward: 250,
    unlocked: true,
    unlockedDate: '2024-12-20'
  },
  {
    id: 3,
    name: 'Social Butterfly',
    description: 'Reach 100,000 followers across platforms',
    icon: 'users',
    rarity: 'epic',
    xpReward: 500,
    unlocked: true,
    unlockedDate: '2025-01-10'
  },
  {
    id: 4,
    name: 'Gold Scholar',
    description: 'Achieve Gold tier in GradeUp Scholar program',
    icon: 'award',
    rarity: 'legendary',
    xpReward: 1000,
    unlocked: true,
    unlockedDate: '2025-01-28'
  },
  {
    id: 5,
    name: 'Brand Ambassador',
    description: 'Complete 10 successful brand partnerships',
    icon: 'star',
    rarity: 'epic',
    xpReward: 750,
    unlocked: false,
    progress: 3,
    maxProgress: 10
  },
  {
    id: 6,
    name: 'Perfect Attendance',
    description: 'Complete all scheduled appearances for a month',
    icon: 'calendar-check',
    rarity: 'rare',
    xpReward: 300,
    unlocked: false,
    progress: 8,
    maxProgress: 12
  }
];

// Deals data
const deals = [
  {
    id: 1,
    brandName: 'Nike',
    brandLogo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100',
    type: 'Social Media Campaign',
    value: 15000,
    status: 'active',
    startDate: '2025-01-01',
    endDate: '2025-06-30',
    deliverables: [
      { name: '3 Instagram Posts', completed: 2, total: 3 },
      { name: '2 TikTok Videos', completed: 1, total: 2 },
      { name: '1 YouTube Feature', completed: 0, total: 1 }
    ],
    nextMilestone: 'Instagram Post due Feb 15'
  },
  {
    id: 2,
    brandName: 'Gatorade',
    brandLogo: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=100',
    type: 'Event Appearance',
    value: 8500,
    status: 'active',
    startDate: '2025-01-15',
    endDate: '2025-03-15',
    deliverables: [
      { name: 'Campus Event', completed: 1, total: 2 },
      { name: 'Social Mentions', completed: 3, total: 5 }
    ],
    nextMilestone: 'Campus Event Feb 20'
  },
  {
    id: 3,
    brandName: 'State Farm',
    brandLogo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100',
    type: 'Brand Ambassador',
    value: 21700,
    status: 'active',
    startDate: '2024-08-01',
    endDate: '2025-08-01',
    deliverables: [
      { name: 'Quarterly Posts', completed: 2, total: 4 },
      { name: 'Community Events', completed: 1, total: 2 },
      { name: 'Podcast Appearance', completed: 1, total: 1 }
    ],
    nextMilestone: 'Q1 Post due Mar 31'
  },
  {
    id: 4,
    brandName: 'Beats by Dre',
    brandLogo: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100',
    type: 'Product Endorsement',
    value: 12000,
    status: 'pending',
    startDate: '2025-02-15',
    endDate: '2025-08-15',
    deliverables: [
      { name: 'Product Photos', completed: 0, total: 4 },
      { name: 'Unboxing Video', completed: 0, total: 1 }
    ],
    nextMilestone: 'Contract signing Feb 10'
  },
  {
    id: 5,
    brandName: 'Chipotle',
    brandLogo: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=100',
    type: 'Social Campaign',
    value: 5000,
    status: 'completed',
    startDate: '2024-10-01',
    endDate: '2024-12-31',
    deliverables: [
      { name: 'Instagram Posts', completed: 3, total: 3 },
      { name: 'Story Takeover', completed: 1, total: 1 }
    ],
    nextMilestone: 'Completed'
  }
];

// Brand matches data
const brandMatches = [
  {
    id: 1,
    brandName: 'Under Armour',
    brandLogo: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=100',
    matchScore: 94,
    category: 'Athletic Apparel',
    estimatedValue: '$8,000 - $15,000',
    matchReasons: ['Basketball focus', 'College athlete program', 'Academic excellence valued'],
    status: 'new'
  },
  {
    id: 2,
    brandName: 'Powerade',
    brandLogo: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=100',
    matchScore: 89,
    category: 'Sports Beverage',
    estimatedValue: '$5,000 - $10,000',
    matchReasons: ['Athletic performance', 'High engagement rate', 'Regional presence'],
    status: 'new'
  },
  {
    id: 3,
    brandName: 'Foot Locker',
    brandLogo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100',
    matchScore: 87,
    category: 'Retail',
    estimatedValue: '$3,000 - $7,000',
    matchReasons: ['Sneaker culture fit', 'Youth demographic', 'Social media reach'],
    status: 'contacted'
  },
  {
    id: 4,
    brandName: 'Muscle Milk',
    brandLogo: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=100',
    matchScore: 82,
    category: 'Nutrition',
    estimatedValue: '$4,000 - $8,000',
    matchReasons: ['Fitness content', 'Health-conscious audience', 'Training routine posts'],
    status: 'new'
  }
];

// Athletes data (for brand dashboard)
const athletes = [
  {
    id: 1,
    name: 'Marcus Johnson',
    school: 'Duke University',
    sport: 'Basketball',
    position: 'Point Guard',
    gradeupScore: 847,
    gpa: 3.87,
    scholarTier: 'gold',
    followers: 125000,
    engagement: 4.2,
    avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200',
    verified: true,
    tags: ['High GPA', 'Rising Star', 'Brand Ready']
  },
  {
    id: 2,
    name: 'Sarah Williams',
    school: 'Stanford University',
    sport: 'Soccer',
    position: 'Forward',
    gradeupScore: 892,
    gpa: 3.95,
    scholarTier: 'platinum',
    followers: 89000,
    engagement: 5.1,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    verified: true,
    tags: ['Academic Excellence', 'National Team', 'Leadership']
  },
  {
    id: 3,
    name: 'Tyler Chen',
    school: 'UCLA',
    sport: 'Swimming',
    position: 'Freestyle',
    gradeupScore: 756,
    gpa: 3.72,
    scholarTier: 'silver',
    followers: 45000,
    engagement: 6.8,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    verified: true,
    tags: ['Olympic Hopeful', 'STEM Major', 'Community Leader']
  },
  {
    id: 4,
    name: 'Jasmine Roberts',
    school: 'USC',
    sport: 'Track & Field',
    position: 'Sprinter',
    gradeupScore: 823,
    gpa: 3.65,
    scholarTier: 'gold',
    followers: 156000,
    engagement: 4.8,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
    verified: true,
    tags: ['Influencer', 'Fashion Forward', 'NCAA Champion']
  },
  {
    id: 5,
    name: 'David Martinez',
    school: 'Texas A&M',
    sport: 'Football',
    position: 'Wide Receiver',
    gradeupScore: 698,
    gpa: 3.42,
    scholarTier: 'silver',
    followers: 210000,
    engagement: 3.9,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
    verified: true,
    tags: ['High Reach', 'Team Captain', 'Community Volunteer']
  },
  {
    id: 6,
    name: 'Emily Thompson',
    school: 'Michigan',
    sport: 'Volleyball',
    position: 'Outside Hitter',
    gradeupScore: 781,
    gpa: 3.78,
    scholarTier: 'gold',
    followers: 67000,
    engagement: 5.5,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
    verified: true,
    tags: ['Rising Star', 'Business Major', 'Team Player']
  }
];

// Calendar events data
const calendarEvents = [
  {
    id: 1,
    title: 'Nike Photo Shoot',
    date: '2025-02-10',
    time: '10:00 AM',
    type: 'content',
    brand: 'Nike'
  },
  {
    id: 2,
    title: 'Gatorade Campus Event',
    date: '2025-02-20',
    time: '2:00 PM',
    type: 'appearance',
    brand: 'Gatorade'
  },
  {
    id: 3,
    title: 'Contract Review Call',
    date: '2025-02-08',
    time: '4:00 PM',
    type: 'meeting',
    brand: 'Beats by Dre'
  },
  {
    id: 4,
    title: 'Instagram Post Due',
    date: '2025-02-15',
    time: '11:59 PM',
    type: 'deadline',
    brand: 'Nike'
  }
];

// Campaigns data (for brand dashboard)
const campaigns = [
  {
    id: 1,
    name: 'Spring Athletic Collection',
    status: 'active',
    budget: 50000,
    spent: 23500,
    athletes: 4,
    reach: 450000,
    engagement: 4.2,
    startDate: '2025-01-15',
    endDate: '2025-04-15'
  },
  {
    id: 2,
    name: 'Back to School 2025',
    status: 'planning',
    budget: 75000,
    spent: 0,
    athletes: 0,
    reach: 0,
    engagement: 0,
    startDate: '2025-08-01',
    endDate: '2025-09-30'
  },
  {
    id: 3,
    name: 'Holiday Gift Guide',
    status: 'completed',
    budget: 35000,
    spent: 34200,
    athletes: 6,
    reach: 890000,
    engagement: 5.1,
    startDate: '2024-11-15',
    endDate: '2024-12-31'
  }
];

// Messages/Conversations data
const conversations = [
  {
    id: 1,
    athleteName: 'Marcus Johnson',
    athleteAvatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200',
    lastMessage: 'Looking forward to the photo shoot next week!',
    timestamp: '2025-02-05T14:30:00',
    unread: true
  },
  {
    id: 2,
    athleteName: 'Sarah Williams',
    athleteAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    lastMessage: 'Contract signed and returned. Ready to start!',
    timestamp: '2025-02-04T09:15:00',
    unread: false
  },
  {
    id: 3,
    athleteName: 'Tyler Chen',
    athleteAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    lastMessage: 'Can we discuss the timeline for deliverables?',
    timestamp: '2025-02-03T16:45:00',
    unread: true
  }
];

// ============================================================
// SECTION 2: SCORE DISPLAY FUNCTIONS
// ============================================================

/**
 * Returns letter grade based on GradeUp score
 * @param {number} score - GradeUp score (0-1000)
 * @returns {string} Letter grade
 */
function getScoreGrade(score) {
  if (score >= 900) return 'S';
  if (score >= 800) return 'A+';
  if (score >= 750) return 'A';
  if (score >= 700) return 'A-';
  if (score >= 650) return 'B+';
  if (score >= 600) return 'B';
  if (score >= 550) return 'B-';
  if (score >= 500) return 'C+';
  if (score >= 450) return 'C';
  if (score >= 400) return 'C-';
  return 'D';
}

/**
 * Returns color class/value based on GradeUp score
 * @param {number} score - GradeUp score (0-1000)
 * @returns {string} Color value
 */
function getScoreColor(score) {
  if (score >= 900) return '#FFD700'; // Gold - S tier
  if (score >= 800) return '#10B981'; // Emerald - A+
  if (score >= 700) return '#3B82F6'; // Blue - A range
  if (score >= 600) return '#8B5CF6'; // Purple - B range
  if (score >= 500) return '#F59E0B'; // Amber - C range
  return '#EF4444'; // Red - D
}

/**
 * Animates a score counting up from 0
 * @param {HTMLElement} element - Element to animate
 * @param {number} targetScore - Final score to display
 * @param {number} duration - Animation duration in ms (default 1500)
 */
function animateScore(element, targetScore, duration = 1500) {
  const startTime = performance.now();
  const startValue = 0;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function (ease-out cubic)
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(startValue + (targetScore - startValue) * easeProgress);

    element.textContent = currentValue;
    element.style.color = getScoreColor(currentValue);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * Renders a circular progress ring for score display
 * @param {number} score - GradeUp score (0-1000)
 * @param {number} size - SVG size in pixels (default 120)
 * @returns {string} SVG HTML string
 */
function renderScoreRing(score, size = 120) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score / 1000;
  const dashOffset = circumference * (1 - progress);
  const color = getScoreColor(score);
  const grade = getScoreGrade(score);
  const halfSize = size / 2;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="score-ring">
      <circle
        cx="${halfSize}"
        cy="${halfSize}"
        r="${radius}"
        fill="none"
        stroke="#e5e7eb"
        stroke-width="${strokeWidth}"
      />
      <circle
        cx="${halfSize}"
        cy="${halfSize}"
        r="${radius}"
        fill="none"
        stroke="${color}"
        stroke-width="${strokeWidth}"
        stroke-linecap="round"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${dashOffset}"
        transform="rotate(-90 ${halfSize} ${halfSize})"
        class="score-ring-progress"
        style="transition: stroke-dashoffset 1.5s ease-out;"
      />
      <text
        x="${halfSize}"
        y="${halfSize - 8}"
        text-anchor="middle"
        font-size="24"
        font-weight="bold"
        fill="${color}"
        class="score-number"
      >${score}</text>
      <text
        x="${halfSize}"
        y="${halfSize + 16}"
        text-anchor="middle"
        font-size="14"
        fill="#6b7280"
      >${grade}</text>
    </svg>
  `;
}

// ============================================================
// SECTION 3: ACHIEVEMENT FUNCTIONS
// ============================================================

/**
 * Returns color based on achievement rarity
 * @param {string} rarity - Achievement rarity level
 * @returns {object} Color object with bg, text, and border
 */
function getRarityColor(rarity) {
  const colors = {
    common: { bg: '#f3f4f6', text: '#4b5563', border: '#9ca3af', glow: 'none' },
    rare: { bg: '#dbeafe', text: '#1d4ed8', border: '#3b82f6', glow: '0 0 10px rgba(59, 130, 246, 0.3)' },
    epic: { bg: '#f3e8ff', text: '#7c3aed', border: '#8b5cf6', glow: '0 0 15px rgba(139, 92, 246, 0.4)' },
    legendary: { bg: '#fef3c7', text: '#b45309', border: '#f59e0b', glow: '0 0 20px rgba(245, 158, 11, 0.5)' }
  };
  return colors[rarity] || colors.common;
}

/**
 * Calculates XP progress to next level
 * @param {number} currentXp - Current XP amount
 * @param {number} level - Current level
 * @returns {object} Progress info with current, needed, and percentage
 */
function calculateXpProgress(currentXp, level) {
  // XP formula: each level requires level * 200 XP
  const xpForNextLevel = level * 200;
  const xpInCurrentLevel = currentXp - getTotalXpForLevel(level - 1);
  const xpNeeded = xpForNextLevel;
  const percentage = Math.min((xpInCurrentLevel / xpNeeded) * 100, 100);

  return {
    current: xpInCurrentLevel,
    needed: xpNeeded,
    percentage: percentage,
    totalXp: currentXp
  };
}

/**
 * Gets total XP required to reach a level
 * @param {number} level - Target level
 * @returns {number} Total XP needed
 */
function getTotalXpForLevel(level) {
  // Sum of 200 * (1 + 2 + ... + level) = 200 * level * (level + 1) / 2
  return 100 * level * (level + 1);
}

/**
 * Renders achievements grid using DOM methods
 * @param {Array} achievementList - Array of achievement objects
 * @param {HTMLElement} container - Container element
 */
function renderAchievements(achievementList, container) {
  if (!container) return;

  // Clear existing content
  container.textContent = '';

  achievementList.forEach(achievement => {
    const colors = getRarityColor(achievement.rarity);

    const card = document.createElement('div');
    card.className = 'achievement-card' + (achievement.unlocked ? '' : ' locked');
    card.style.background = colors.bg;
    card.style.borderColor = colors.border;
    card.style.boxShadow = colors.glow;

    const iconDiv = document.createElement('div');
    iconDiv.className = 'achievement-icon';
    iconDiv.style.color = achievement.unlocked ? colors.text : '#9ca3af';
    const icon = document.createElement('i');
    icon.className = 'fas fa-' + achievement.icon;
    iconDiv.appendChild(icon);

    const infoDiv = document.createElement('div');
    infoDiv.className = 'achievement-info';

    const nameEl = document.createElement('h4');
    nameEl.className = 'achievement-name';
    nameEl.style.color = achievement.unlocked ? colors.text : '#9ca3af';
    nameEl.textContent = achievement.name;

    const descEl = document.createElement('p');
    descEl.className = 'achievement-description';
    descEl.textContent = achievement.description;

    infoDiv.appendChild(nameEl);
    infoDiv.appendChild(descEl);

    // Progress bar for locked achievements
    if (!achievement.unlocked && achievement.progress !== undefined) {
      const progressDiv = document.createElement('div');
      progressDiv.className = 'achievement-progress';

      const progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';

      const progressFill = document.createElement('div');
      progressFill.className = 'progress-fill';
      progressFill.style.width = (achievement.progress / achievement.maxProgress * 100) + '%';
      progressBar.appendChild(progressFill);

      const progressText = document.createElement('span');
      progressText.className = 'progress-text';
      progressText.textContent = achievement.progress + '/' + achievement.maxProgress;

      progressDiv.appendChild(progressBar);
      progressDiv.appendChild(progressText);
      infoDiv.appendChild(progressDiv);
    }

    const metaDiv = document.createElement('div');
    metaDiv.className = 'achievement-meta';

    const rarityBadge = document.createElement('span');
    rarityBadge.className = 'rarity-badge';
    rarityBadge.style.background = colors.border;
    rarityBadge.style.color = 'white';
    rarityBadge.textContent = achievement.rarity.toUpperCase();

    const xpReward = document.createElement('span');
    xpReward.className = 'xp-reward';
    xpReward.textContent = '+' + achievement.xpReward + ' XP';

    metaDiv.appendChild(rarityBadge);
    metaDiv.appendChild(xpReward);
    infoDiv.appendChild(metaDiv);

    card.appendChild(iconDiv);
    card.appendChild(infoDiv);

    if (achievement.unlocked) {
      const checkDiv = document.createElement('div');
      checkDiv.className = 'achievement-check';
      const checkIcon = document.createElement('i');
      checkIcon.className = 'fas fa-check-circle';
      checkDiv.appendChild(checkIcon);
      card.appendChild(checkDiv);
    }

    container.appendChild(card);
  });
}

// ============================================================
// SECTION 4: DASHBOARD RENDERING
// ============================================================

/**
 * Renders athlete statistics cards using DOM methods
 * @param {object} athlete - Athlete data object
 */
function renderAthleteStats(athlete) {
  const statsContainer = document.getElementById('athlete-stats');
  if (!statsContainer) return;

  const stats = [
    { label: 'GradeUp Score', value: athlete.gradeupScore, icon: 'chart-line', color: getScoreColor(athlete.gradeupScore) },
    { label: 'GPA', value: athlete.gpa.toFixed(2), icon: 'graduation-cap', color: '#10B981' },
    { label: 'Total Earnings', value: '$' + athlete.totalEarnings.toLocaleString(), icon: 'dollar-sign', color: '#3B82F6' },
    { label: 'Active Deals', value: athlete.activeDeals, icon: 'handshake', color: '#8B5CF6' },
    { label: 'Profile Views', value: athlete.profileViews.toLocaleString(), icon: 'eye', color: '#F59E0B' },
    { label: 'Followers', value: formatNumber(athlete.followers), icon: 'users', color: '#EC4899' }
  ];

  statsContainer.textContent = '';

  stats.forEach(stat => {
    const card = document.createElement('div');
    card.className = 'stat-card';

    const iconDiv = document.createElement('div');
    iconDiv.className = 'stat-icon';
    iconDiv.style.background = stat.color + '20';
    iconDiv.style.color = stat.color;
    const icon = document.createElement('i');
    icon.className = 'fas fa-' + stat.icon;
    iconDiv.appendChild(icon);

    const infoDiv = document.createElement('div');
    infoDiv.className = 'stat-info';

    const valueSpan = document.createElement('span');
    valueSpan.className = 'stat-value';
    valueSpan.style.color = stat.color;
    valueSpan.textContent = stat.value;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'stat-label';
    labelSpan.textContent = stat.label;

    infoDiv.appendChild(valueSpan);
    infoDiv.appendChild(labelSpan);

    card.appendChild(iconDiv);
    card.appendChild(infoDiv);
    statsContainer.appendChild(card);
  });
}

/**
 * Renders deals table using DOM methods
 * @param {Array} dealsList - Array of deal objects
 */
function renderDealsTable(dealsList) {
  const container = document.getElementById('deals-table');
  if (!container) return;

  const statusColors = {
    active: { bg: '#dcfce7', text: '#166534' },
    pending: { bg: '#fef3c7', text: '#92400e' },
    completed: { bg: '#e5e7eb', text: '#374151' }
  };

  container.textContent = '';

  const table = document.createElement('table');
  table.className = 'deals-table';

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Brand', 'Type', 'Value', 'Status', 'Progress', 'Next Milestone', 'Actions'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');

  dealsList.forEach(deal => {
    const totalDeliverables = deal.deliverables.reduce((sum, d) => sum + d.total, 0);
    const completedDeliverables = deal.deliverables.reduce((sum, d) => sum + d.completed, 0);
    const progressPercent = (completedDeliverables / totalDeliverables) * 100;
    const statusStyle = statusColors[deal.status];

    const row = document.createElement('tr');
    row.className = 'deal-row';
    row.dataset.dealId = deal.id;

    // Brand cell
    const brandCell = document.createElement('td');
    const brandDiv = document.createElement('div');
    brandDiv.className = 'brand-cell';
    const brandImg = document.createElement('img');
    brandImg.src = deal.brandLogo;
    brandImg.alt = deal.brandName;
    brandImg.className = 'brand-logo-small';
    const brandName = document.createElement('span');
    brandName.className = 'brand-name';
    brandName.textContent = deal.brandName;
    brandDiv.appendChild(brandImg);
    brandDiv.appendChild(brandName);
    brandCell.appendChild(brandDiv);

    // Type cell
    const typeCell = document.createElement('td');
    typeCell.textContent = deal.type;

    // Value cell
    const valueCell = document.createElement('td');
    valueCell.className = 'deal-value';
    valueCell.textContent = '$' + deal.value.toLocaleString();

    // Status cell
    const statusCell = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.className = 'status-badge';
    statusBadge.style.background = statusStyle.bg;
    statusBadge.style.color = statusStyle.text;
    statusBadge.textContent = deal.status.charAt(0).toUpperCase() + deal.status.slice(1);
    statusCell.appendChild(statusBadge);

    // Progress cell
    const progressCell = document.createElement('td');
    const progressDiv = document.createElement('div');
    progressDiv.className = 'progress-cell';
    const miniBar = document.createElement('div');
    miniBar.className = 'mini-progress-bar';
    const miniFill = document.createElement('div');
    miniFill.className = 'mini-progress-fill';
    miniFill.style.width = progressPercent + '%';
    miniBar.appendChild(miniFill);
    const progressText = document.createElement('span');
    progressText.className = 'progress-text';
    progressText.textContent = completedDeliverables + '/' + totalDeliverables;
    progressDiv.appendChild(miniBar);
    progressDiv.appendChild(progressText);
    progressCell.appendChild(progressDiv);

    // Milestone cell
    const milestoneCell = document.createElement('td');
    milestoneCell.className = 'milestone-cell';
    milestoneCell.textContent = deal.nextMilestone;

    // Actions cell
    const actionsCell = document.createElement('td');
    const actionBtn = document.createElement('button');
    actionBtn.className = 'btn-icon';
    actionBtn.title = 'View Details';
    actionBtn.onclick = function() { viewDealDetails(deal.id); };
    const actionIcon = document.createElement('i');
    actionIcon.className = 'fas fa-eye';
    actionBtn.appendChild(actionIcon);
    actionsCell.appendChild(actionBtn);

    row.appendChild(brandCell);
    row.appendChild(typeCell);
    row.appendChild(valueCell);
    row.appendChild(statusCell);
    row.appendChild(progressCell);
    row.appendChild(milestoneCell);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

/**
 * Renders brand match cards using DOM methods
 * @param {Array} matches - Array of brand match objects
 */
function renderBrandMatches(matches) {
  const container = document.getElementById('brand-matches');
  if (!container) return;

  const statusLabels = {
    new: { text: 'New Match', color: '#10B981' },
    contacted: { text: 'In Discussion', color: '#3B82F6' },
    negotiating: { text: 'Negotiating', color: '#F59E0B' }
  };

  container.textContent = '';

  matches.forEach(match => {
    const statusInfo = statusLabels[match.status] || statusLabels.new;

    const card = document.createElement('div');
    card.className = 'match-card';

    // Header
    const header = document.createElement('div');
    header.className = 'match-header';

    const logo = document.createElement('img');
    logo.src = match.brandLogo;
    logo.alt = match.brandName;
    logo.className = 'match-brand-logo';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'match-info';
    const brandNameEl = document.createElement('h4');
    brandNameEl.className = 'match-brand-name';
    brandNameEl.textContent = match.brandName;
    const categoryEl = document.createElement('span');
    categoryEl.className = 'match-category';
    categoryEl.textContent = match.category;
    infoDiv.appendChild(brandNameEl);
    infoDiv.appendChild(categoryEl);

    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'match-score';
    scoreDiv.style.background = getScoreColor(match.matchScore * 10) + '20';
    scoreDiv.style.color = getScoreColor(match.matchScore * 10);
    scoreDiv.textContent = match.matchScore + '% Match';

    header.appendChild(logo);
    header.appendChild(infoDiv);
    header.appendChild(scoreDiv);

    // Body
    const body = document.createElement('div');
    body.className = 'match-body';

    const valueDiv = document.createElement('div');
    valueDiv.className = 'match-value';
    const dollarIcon = document.createElement('i');
    dollarIcon.className = 'fas fa-dollar-sign';
    const valueText = document.createElement('span');
    valueText.textContent = 'Estimated: ' + match.estimatedValue;
    valueDiv.appendChild(dollarIcon);
    valueDiv.appendChild(valueText);

    const reasonsDiv = document.createElement('div');
    reasonsDiv.className = 'match-reasons';
    match.matchReasons.forEach(reason => {
      const tag = document.createElement('span');
      tag.className = 'reason-tag';
      tag.textContent = reason;
      reasonsDiv.appendChild(tag);
    });

    body.appendChild(valueDiv);
    body.appendChild(reasonsDiv);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'match-footer';

    const statusSpan = document.createElement('span');
    statusSpan.className = 'match-status';
    statusSpan.style.color = statusInfo.color;
    const statusIcon = document.createElement('i');
    statusIcon.className = 'fas fa-circle';
    statusSpan.appendChild(statusIcon);
    statusSpan.appendChild(document.createTextNode(' ' + statusInfo.text));

    const contactBtn = document.createElement('button');
    contactBtn.className = 'btn-primary btn-sm';
    contactBtn.textContent = match.status === 'new' ? 'Express Interest' : 'View Conversation';
    contactBtn.onclick = function() { contactBrand(match.id); };

    footer.appendChild(statusSpan);
    footer.appendChild(contactBtn);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);

    container.appendChild(card);
  });
}

/**
 * Renders scholar tier status using DOM methods
 * @param {string} tier - Scholar tier (bronze, silver, gold, platinum)
 */
function renderScholarStatus(tier) {
  const container = document.getElementById('scholar-status');
  if (!container) return;

  const tiers = {
    bronze: { color: '#CD7F32', icon: 'medal', benefits: ['Basic brand matching', 'Monthly newsletter'] },
    silver: { color: '#C0C0C0', icon: 'medal', benefits: ['Priority brand matching', 'Quarterly workshops', 'Resume review'] },
    gold: { color: '#FFD700', icon: 'crown', benefits: ['Premium brand matching', 'Monthly mentorship', 'Financial planning', 'Priority support'] },
    platinum: { color: '#E5E4E2', icon: 'gem', benefits: ['VIP brand access', 'Personal advisor', 'Investment guidance', 'Career placement', 'Exclusive events'] }
  };

  const tierInfo = tiers[tier] || tiers.bronze;
  const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
  const currentIndex = tierOrder.indexOf(tier);

  container.textContent = '';

  const card = document.createElement('div');
  card.className = 'scholar-card';
  card.style.borderColor = tierInfo.color;

  // Header
  const header = document.createElement('div');
  header.className = 'scholar-header';
  header.style.background = 'linear-gradient(135deg, ' + tierInfo.color + '40, ' + tierInfo.color + '20)';

  const iconDiv = document.createElement('div');
  iconDiv.className = 'scholar-icon';
  iconDiv.style.color = tierInfo.color;
  const icon = document.createElement('i');
  icon.className = 'fas fa-' + tierInfo.icon;
  iconDiv.appendChild(icon);

  const tierInfoDiv = document.createElement('div');
  tierInfoDiv.className = 'scholar-tier-info';
  const tierName = document.createElement('h3');
  tierName.className = 'scholar-tier-name';
  tierName.style.color = tierInfo.color;
  tierName.textContent = tier.charAt(0).toUpperCase() + tier.slice(1) + ' Scholar';
  const subtitle = document.createElement('span');
  subtitle.className = 'scholar-subtitle';
  subtitle.textContent = 'GradeUp Scholar Program';
  tierInfoDiv.appendChild(tierName);
  tierInfoDiv.appendChild(subtitle);

  header.appendChild(iconDiv);
  header.appendChild(tierInfoDiv);

  // Body
  const body = document.createElement('div');
  body.className = 'scholar-body';

  const benefitsTitle = document.createElement('h4');
  benefitsTitle.textContent = 'Your Benefits';

  const benefitsList = document.createElement('ul');
  benefitsList.className = 'benefits-list';
  tierInfo.benefits.forEach(benefit => {
    const li = document.createElement('li');
    const checkIcon = document.createElement('i');
    checkIcon.className = 'fas fa-check';
    checkIcon.style.color = tierInfo.color;
    li.appendChild(checkIcon);
    li.appendChild(document.createTextNode(' ' + benefit));
    benefitsList.appendChild(li);
  });

  body.appendChild(benefitsTitle);
  body.appendChild(benefitsList);

  if (currentIndex < tierOrder.length - 1) {
    const nextTierDiv = document.createElement('div');
    nextTierDiv.className = 'next-tier';
    const nextTierText = document.createElement('span');
    const nextTierName = tierOrder[currentIndex + 1];
    nextTierText.textContent = 'Next tier: ' + nextTierName.charAt(0).toUpperCase() + nextTierName.slice(1);
    const viewReqBtn = document.createElement('button');
    viewReqBtn.className = 'btn-link';
    viewReqBtn.textContent = 'View requirements';
    nextTierDiv.appendChild(nextTierText);
    nextTierDiv.appendChild(viewReqBtn);
    body.appendChild(nextTierDiv);
  } else {
    const maxTierDiv = document.createElement('div');
    maxTierDiv.className = 'max-tier';
    const starIcon = document.createElement('i');
    starIcon.className = 'fas fa-star';
    maxTierDiv.appendChild(starIcon);
    maxTierDiv.appendChild(document.createTextNode(" You've reached the highest tier!"));
    body.appendChild(maxTierDiv);
  }

  card.appendChild(header);
  card.appendChild(body);
  container.appendChild(card);
}

/**
 * Renders calendar widget with upcoming events using DOM methods
 * @param {Array} events - Array of calendar event objects
 */
function renderCalendarWidget(events) {
  const container = document.getElementById('calendar-widget');
  if (!container) return;

  const eventTypes = {
    content: { icon: 'camera', color: '#8B5CF6' },
    appearance: { icon: 'users', color: '#10B981' },
    meeting: { icon: 'video', color: '#3B82F6' },
    deadline: { icon: 'clock', color: '#EF4444' }
  };

  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));

  container.textContent = '';

  const widget = document.createElement('div');
  widget.className = 'calendar-widget';

  // Header
  const header = document.createElement('div');
  header.className = 'calendar-header';
  const title = document.createElement('h3');
  const calIcon = document.createElement('i');
  calIcon.className = 'fas fa-calendar-alt';
  title.appendChild(calIcon);
  title.appendChild(document.createTextNode(' Upcoming'));
  const viewAllBtn = document.createElement('button');
  viewAllBtn.className = 'btn-link';
  viewAllBtn.textContent = 'View All';
  viewAllBtn.onclick = viewFullCalendar;
  header.appendChild(title);
  header.appendChild(viewAllBtn);

  // Events
  const eventsDiv = document.createElement('div');
  eventsDiv.className = 'calendar-events';

  sortedEvents.slice(0, 5).forEach(event => {
    const typeInfo = eventTypes[event.type] || eventTypes.meeting;
    const eventDate = new Date(event.date);
    const isToday = isSameDay(eventDate, new Date());
    const isTomorrow = isSameDay(eventDate, addDays(new Date(), 1));
    const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formatDate(eventDate);

    const eventDiv = document.createElement('div');
    eventDiv.className = 'calendar-event' + (isToday ? ' event-today' : '');

    const iconDiv = document.createElement('div');
    iconDiv.className = 'event-icon';
    iconDiv.style.background = typeInfo.color + '20';
    iconDiv.style.color = typeInfo.color;
    const eventIcon = document.createElement('i');
    eventIcon.className = 'fas fa-' + typeInfo.icon;
    iconDiv.appendChild(eventIcon);

    const infoDiv = document.createElement('div');
    infoDiv.className = 'event-info';
    const titleSpan = document.createElement('span');
    titleSpan.className = 'event-title';
    titleSpan.textContent = event.title;
    const metaSpan = document.createElement('span');
    metaSpan.className = 'event-meta';
    const dateSpan = document.createElement('span');
    dateSpan.className = 'event-date';
    dateSpan.textContent = dateLabel;
    const timeSpan = document.createElement('span');
    timeSpan.className = 'event-time';
    timeSpan.textContent = event.time;
    const brandSpan = document.createElement('span');
    brandSpan.className = 'event-brand';
    brandSpan.textContent = event.brand;
    metaSpan.appendChild(dateSpan);
    metaSpan.appendChild(timeSpan);
    metaSpan.appendChild(brandSpan);
    infoDiv.appendChild(titleSpan);
    infoDiv.appendChild(metaSpan);

    eventDiv.appendChild(iconDiv);
    eventDiv.appendChild(infoDiv);
    eventsDiv.appendChild(eventDiv);
  });

  widget.appendChild(header);
  widget.appendChild(eventsDiv);
  container.appendChild(widget);
}

// ============================================================
// SECTION 5: BRAND DASHBOARD FUNCTIONS
// ============================================================

/**
 * Renders grid of athlete cards
 * @param {Array} athleteList - Array of athlete objects
 * @param {HTMLElement} container - Container element
 */
function renderAthleteGrid(athleteList, container) {
  if (!container) return;
  container.textContent = '';
  athleteList.forEach(athlete => {
    container.appendChild(renderAthleteCard(athlete));
  });
}

/**
 * Renders a single athlete card and returns DOM element
 * @param {object} athlete - Athlete data object
 * @returns {HTMLElement} Card element
 */
function renderAthleteCard(athlete) {
  const tierColors = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2'
  };

  const card = document.createElement('div');
  card.className = 'athlete-card';
  card.dataset.athleteId = athlete.id;

  // Header
  const header = document.createElement('div');
  header.className = 'athlete-card-header';

  const avatarWrapper = document.createElement('div');
  avatarWrapper.className = 'athlete-avatar-wrapper';
  const avatar = document.createElement('img');
  avatar.src = athlete.avatar;
  avatar.alt = athlete.name;
  avatar.className = 'athlete-avatar';
  avatarWrapper.appendChild(avatar);

  if (athlete.verified) {
    const verifiedBadge = document.createElement('span');
    verifiedBadge.className = 'verified-badge';
    const verifiedIcon = document.createElement('i');
    verifiedIcon.className = 'fas fa-check-circle';
    verifiedBadge.appendChild(verifiedIcon);
    avatarWrapper.appendChild(verifiedBadge);
  }

  const tierBadge = document.createElement('div');
  tierBadge.className = 'athlete-tier-badge';
  tierBadge.style.background = tierColors[athlete.scholarTier];
  tierBadge.textContent = athlete.scholarTier.charAt(0).toUpperCase();

  header.appendChild(avatarWrapper);
  header.appendChild(tierBadge);

  // Body
  const body = document.createElement('div');
  body.className = 'athlete-card-body';

  const nameEl = document.createElement('h4');
  nameEl.className = 'athlete-name';
  nameEl.textContent = athlete.name;

  const schoolEl = document.createElement('p');
  schoolEl.className = 'athlete-school';
  schoolEl.textContent = athlete.school;

  const sportEl = document.createElement('p');
  sportEl.className = 'athlete-sport';
  sportEl.textContent = athlete.sport + ' - ' + athlete.position;

  const statsDiv = document.createElement('div');
  statsDiv.className = 'athlete-stats';

  const statItems = [
    { value: athlete.gradeupScore, label: 'Score', color: getScoreColor(athlete.gradeupScore) },
    { value: athlete.gpa, label: 'GPA', color: null },
    { value: formatNumber(athlete.followers), label: 'Followers', color: null },
    { value: athlete.engagement + '%', label: 'Engagement', color: null }
  ];

  statItems.forEach(item => {
    const statDiv = document.createElement('div');
    statDiv.className = 'athlete-stat';
    const valueSpan = document.createElement('span');
    valueSpan.className = 'stat-value';
    if (item.color) valueSpan.style.color = item.color;
    valueSpan.textContent = item.value;
    const labelSpan = document.createElement('span');
    labelSpan.className = 'stat-label';
    labelSpan.textContent = item.label;
    statDiv.appendChild(valueSpan);
    statDiv.appendChild(labelSpan);
    statsDiv.appendChild(statDiv);
  });

  const tagsDiv = document.createElement('div');
  tagsDiv.className = 'athlete-tags';
  athlete.tags.forEach(tag => {
    const tagSpan = document.createElement('span');
    tagSpan.className = 'athlete-tag';
    tagSpan.textContent = tag;
    tagsDiv.appendChild(tagSpan);
  });

  body.appendChild(nameEl);
  body.appendChild(schoolEl);
  body.appendChild(sportEl);
  body.appendChild(statsDiv);
  body.appendChild(tagsDiv);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'athlete-card-footer';

  const viewBtn = document.createElement('button');
  viewBtn.className = 'btn-secondary btn-sm';
  viewBtn.textContent = 'View Profile';
  viewBtn.onclick = function() { viewAthleteProfile(athlete.id); };

  const contactBtn = document.createElement('button');
  contactBtn.className = 'btn-primary btn-sm';
  contactBtn.textContent = 'Contact';
  contactBtn.onclick = function() { contactAthlete(athlete.id); };

  footer.appendChild(viewBtn);
  footer.appendChild(contactBtn);

  card.appendChild(header);
  card.appendChild(body);
  card.appendChild(footer);

  return card;
}

/**
 * Filters athletes based on criteria
 * @param {Array} athleteList - Array of athlete objects
 * @param {object} filters - Filter criteria
 * @returns {Array} Filtered athletes
 */
function filterAthletes(athleteList, filters) {
  return athleteList.filter(athlete => {
    // Sport filter
    if (filters.sport && filters.sport !== 'all' && athlete.sport.toLowerCase() !== filters.sport.toLowerCase()) {
      return false;
    }

    // Tier filter
    if (filters.tier && filters.tier !== 'all' && athlete.scholarTier !== filters.tier) {
      return false;
    }

    // Min score filter
    if (filters.minScore && athlete.gradeupScore < filters.minScore) {
      return false;
    }

    // Max score filter
    if (filters.maxScore && athlete.gradeupScore > filters.maxScore) {
      return false;
    }

    // Min GPA filter
    if (filters.minGpa && athlete.gpa < filters.minGpa) {
      return false;
    }

    // Min followers filter
    if (filters.minFollowers && athlete.followers < filters.minFollowers) {
      return false;
    }

    // Search query
    if (filters.query) {
      const query = filters.query.toLowerCase();
      const searchableText = (athlete.name + ' ' + athlete.school + ' ' + athlete.sport + ' ' + athlete.position).toLowerCase();
      if (!searchableText.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sorts athletes by specified criteria
 * @param {Array} athleteList - Array of athlete objects
 * @param {string} sortBy - Sort criteria
 * @returns {Array} Sorted athletes
 */
function sortAthletes(athleteList, sortBy) {
  const sorted = [...athleteList];

  switch (sortBy) {
    case 'score-desc':
      sorted.sort((a, b) => b.gradeupScore - a.gradeupScore);
      break;
    case 'score-asc':
      sorted.sort((a, b) => a.gradeupScore - b.gradeupScore);
      break;
    case 'gpa-desc':
      sorted.sort((a, b) => b.gpa - a.gpa);
      break;
    case 'followers-desc':
      sorted.sort((a, b) => b.followers - a.followers);
      break;
    case 'engagement-desc':
      sorted.sort((a, b) => b.engagement - a.engagement);
      break;
    case 'name-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      // Default: sort by score descending
      sorted.sort((a, b) => b.gradeupScore - a.gradeupScore);
  }

  return sorted;
}

/**
 * Renders campaigns list using DOM methods
 * @param {Array} campaignList - Array of campaign objects
 */
function renderCampaigns(campaignList) {
  const container = document.getElementById('campaigns-list');
  if (!container) return;

  const statusColors = {
    active: { bg: '#dcfce7', text: '#166534' },
    planning: { bg: '#dbeafe', text: '#1e40af' },
    completed: { bg: '#e5e7eb', text: '#374151' }
  };

  container.textContent = '';

  campaignList.forEach(campaign => {
    const statusStyle = statusColors[campaign.status];
    const budgetPercent = (campaign.spent / campaign.budget) * 100;

    const card = document.createElement('div');
    card.className = 'campaign-card';
    card.dataset.campaignId = campaign.id;

    // Header
    const header = document.createElement('div');
    header.className = 'campaign-header';
    const nameEl = document.createElement('h4');
    nameEl.className = 'campaign-name';
    nameEl.textContent = campaign.name;
    const statusBadge = document.createElement('span');
    statusBadge.className = 'campaign-status';
    statusBadge.style.background = statusStyle.bg;
    statusBadge.style.color = statusStyle.text;
    statusBadge.textContent = campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1);
    header.appendChild(nameEl);
    header.appendChild(statusBadge);

    // Body
    const body = document.createElement('div');
    body.className = 'campaign-body';

    // Budget section
    const budgetDiv = document.createElement('div');
    budgetDiv.className = 'campaign-budget';
    const budgetInfo = document.createElement('div');
    budgetInfo.className = 'budget-info';
    const spentSpan = document.createElement('span');
    spentSpan.className = 'budget-spent';
    spentSpan.textContent = '$' + campaign.spent.toLocaleString();
    const totalSpan = document.createElement('span');
    totalSpan.className = 'budget-total';
    totalSpan.textContent = 'of $' + campaign.budget.toLocaleString();
    budgetInfo.appendChild(spentSpan);
    budgetInfo.appendChild(totalSpan);
    const budgetBar = document.createElement('div');
    budgetBar.className = 'budget-bar';
    const budgetFill = document.createElement('div');
    budgetFill.className = 'budget-fill';
    budgetFill.style.width = budgetPercent + '%';
    budgetBar.appendChild(budgetFill);
    budgetDiv.appendChild(budgetInfo);
    budgetDiv.appendChild(budgetBar);

    // Stats section
    const statsDiv = document.createElement('div');
    statsDiv.className = 'campaign-stats';
    const statItems = [
      { icon: 'users', text: campaign.athletes + ' Athletes' },
      { icon: 'eye', text: formatNumber(campaign.reach) + ' Reach' },
      { icon: 'heart', text: campaign.engagement + '% Eng.' }
    ];
    statItems.forEach(item => {
      const stat = document.createElement('div');
      stat.className = 'campaign-stat';
      const icon = document.createElement('i');
      icon.className = 'fas fa-' + item.icon;
      const text = document.createElement('span');
      text.textContent = item.text;
      stat.appendChild(icon);
      stat.appendChild(text);
      statsDiv.appendChild(stat);
    });

    // Dates section
    const datesDiv = document.createElement('div');
    datesDiv.className = 'campaign-dates';
    const calIcon = document.createElement('i');
    calIcon.className = 'fas fa-calendar';
    const dateText = document.createElement('span');
    dateText.textContent = formatDate(new Date(campaign.startDate)) + ' - ' + formatDate(new Date(campaign.endDate));
    datesDiv.appendChild(calIcon);
    datesDiv.appendChild(dateText);

    body.appendChild(budgetDiv);
    body.appendChild(statsDiv);
    body.appendChild(datesDiv);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'campaign-footer';
    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn-link';
    viewBtn.textContent = 'View Details';
    viewBtn.onclick = function() { viewCampaignDetails(campaign.id); };
    footer.appendChild(viewBtn);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);

    container.appendChild(card);
  });
}

/**
 * Renders messages/conversations list using DOM methods
 * @param {Array} conversationList - Array of conversation objects
 */
function renderMessages(conversationList) {
  const container = document.getElementById('messages-list');
  if (!container) return;

  container.textContent = '';

  conversationList.forEach(convo => {
    const timestamp = new Date(convo.timestamp);
    const timeAgo = getTimeAgo(timestamp);

    const item = document.createElement('div');
    item.className = 'message-item' + (convo.unread ? ' unread' : '');
    item.onclick = function() { openConversation(convo.id); };

    const avatar = document.createElement('img');
    avatar.src = convo.athleteAvatar;
    avatar.alt = convo.athleteName;
    avatar.className = 'message-avatar';

    const content = document.createElement('div');
    content.className = 'message-content';

    const header = document.createElement('div');
    header.className = 'message-header';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'message-name';
    nameSpan.textContent = convo.athleteName;
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = timeAgo;
    header.appendChild(nameSpan);
    header.appendChild(timeSpan);

    const preview = document.createElement('p');
    preview.className = 'message-preview';
    preview.textContent = convo.lastMessage;

    content.appendChild(header);
    content.appendChild(preview);

    item.appendChild(avatar);
    item.appendChild(content);

    if (convo.unread) {
      const unreadDot = document.createElement('span');
      unreadDot.className = 'unread-dot';
      item.appendChild(unreadDot);
    }

    container.appendChild(item);
  });
}

// ============================================================
// SECTION 6: UI INTERACTIONS
// ============================================================

/**
 * Initializes tab navigation
 */
function initTabs() {
  const tabButtons = document.querySelectorAll('[data-tab]');
  const tabPanels = document.querySelectorAll('[data-tab-panel]');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;

      // Update button states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Update panel visibility
      tabPanels.forEach(panel => {
        if (panel.dataset.tabPanel === targetTab) {
          panel.classList.add('active');
          panel.style.display = 'block';
        } else {
          panel.classList.remove('active');
          panel.style.display = 'none';
        }
      });
    });
  });
}

/**
 * Initializes modal functionality
 */
function initModals() {
  // Close modal when clicking backdrop
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      closeModal(e.target.closest('.modal'));
    }
  });

  // Close modal when clicking close button
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.closest('.modal'));
    });
  });

  // Close modal on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal.open');
      if (openModal) {
        closeModal(openModal);
      }
    }
  });
}

/**
 * Opens a modal by ID
 * @param {string} modalId - Modal element ID
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Closes a modal
 * @param {HTMLElement} modal - Modal element
 */
function closeModal(modal) {
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

/**
 * Initializes filter controls
 */
function initFilters() {
  const filterForm = document.getElementById('athlete-filters');
  if (!filterForm) return;

  filterForm.addEventListener('change', () => {
    const sportSelect = filterForm.querySelector('[name="sport"]');
    const tierSelect = filterForm.querySelector('[name="tier"]');
    const minScoreInput = filterForm.querySelector('[name="minScore"]');
    const minGpaInput = filterForm.querySelector('[name="minGpa"]');
    const minFollowersInput = filterForm.querySelector('[name="minFollowers"]');
    const sortBySelect = filterForm.querySelector('[name="sortBy"]');

    const filters = {
      sport: sportSelect ? sportSelect.value : null,
      tier: tierSelect ? tierSelect.value : null,
      minScore: minScoreInput ? parseInt(minScoreInput.value) || null : null,
      minGpa: minGpaInput ? parseFloat(minGpaInput.value) || null : null,
      minFollowers: minFollowersInput ? parseInt(minFollowersInput.value) || null : null
    };

    const sortBy = sortBySelect ? sortBySelect.value : 'score-desc';

    const filtered = filterAthletes(athletes, filters);
    const sorted = sortAthletes(filtered, sortBy);

    const container = document.getElementById('athletes-grid');
    renderAthleteGrid(sorted, container);
  });
}

/**
 * Initializes search functionality
 */
function initSearch() {
  const searchInput = document.getElementById('athlete-search');
  if (!searchInput) return;

  let debounceTimer;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const query = e.target.value.trim();
      const filterForm = document.getElementById('athlete-filters');

      const sportSelect = filterForm ? filterForm.querySelector('[name="sport"]') : null;
      const tierSelect = filterForm ? filterForm.querySelector('[name="tier"]') : null;
      const minScoreInput = filterForm ? filterForm.querySelector('[name="minScore"]') : null;
      const sortBySelect = filterForm ? filterForm.querySelector('[name="sortBy"]') : null;

      const filters = {
        query,
        sport: sportSelect ? sportSelect.value : null,
        tier: tierSelect ? tierSelect.value : null,
        minScore: minScoreInput ? parseInt(minScoreInput.value) || null : null
      };

      const sortBy = sortBySelect ? sortBySelect.value : 'score-desc';

      const filtered = filterAthletes(athletes, filters);
      const sorted = sortAthletes(filtered, sortBy);

      const container = document.getElementById('athletes-grid');
      renderAthleteGrid(sorted, container);
    }, 300);
  });
}

/**
 * Shows a notification toast using DOM methods
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 * @param {number} duration - Duration in ms (default 3000)
 */
function showNotification(message, type, duration) {
  type = type || 'info';
  duration = duration || 3000;

  const container = document.getElementById('notification-container') || createNotificationContainer();

  const icons = {
    success: 'check-circle',
    error: 'exclamation-circle',
    warning: 'exclamation-triangle',
    info: 'info-circle'
  };

  const notification = document.createElement('div');
  notification.className = 'notification notification-' + type;

  const icon = document.createElement('i');
  icon.className = 'fas fa-' + icons[type];

  const text = document.createElement('span');
  text.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'notification-close';
  closeBtn.onclick = function() { notification.remove(); };
  const closeIcon = document.createElement('i');
  closeIcon.className = 'fas fa-times';
  closeBtn.appendChild(closeIcon);

  notification.appendChild(icon);
  notification.appendChild(text);
  notification.appendChild(closeBtn);

  container.appendChild(notification);

  // Trigger animation
  requestAnimationFrame(() => {
    notification.classList.add('show');
  });

  // Auto remove
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

/**
 * Creates notification container if it doesn't exist
 * @returns {HTMLElement} Notification container
 */
function createNotificationContainer() {
  const container = document.createElement('div');
  container.id = 'notification-container';
  container.className = 'notification-container';
  document.body.appendChild(container);
  return container;
}

/**
 * Shows loading state in a container using DOM methods
 * @param {HTMLElement} container - Container element
 */
function showLoading(container) {
  if (!container) return;

  // Store original content
  container.dataset.originalHtml = container.innerHTML;

  // Clear and add loading
  container.textContent = '';
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading-state';
  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  const text = document.createElement('span');
  text.textContent = 'Loading...';
  loadingDiv.appendChild(spinner);
  loadingDiv.appendChild(text);
  container.appendChild(loadingDiv);
}

/**
 * Hides loading state and restores content
 * @param {HTMLElement} container - Container element
 */
function hideLoading(container) {
  if (!container) return;

  if (container.dataset.originalHtml) {
    // Note: Restoring HTML here - in production, re-render with DOM methods
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = container.dataset.originalHtml;
    container.textContent = '';
    while (tempDiv.firstChild) {
      container.appendChild(tempDiv.firstChild);
    }
    delete container.dataset.originalHtml;
  }
}

// ============================================================
// SECTION 7: CHART/VISUALIZATION HELPERS
// ============================================================

/**
 * Renders a mini sparkline chart using DOM methods
 * @param {Array} data - Array of numeric values
 * @param {HTMLElement} container - Container element
 * @param {object} options - Chart options
 */
function renderMiniChart(data, container, options) {
  if (!container || !data.length) return;

  options = options || {};
  const width = options.width || 100;
  const height = options.height || 30;
  const color = options.color || '#3B82F6';
  const fillOpacity = options.fillOpacity || 0.1;

  const max = Math.max.apply(null, data);
  const min = Math.min.apply(null, data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return x + ',' + y;
  }).join(' ');

  const areaPoints = '0,' + height + ' ' + points + ' ' + width + ',' + height;

  container.textContent = '';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  svg.setAttribute('class', 'sparkline');

  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.setAttribute('points', areaPoints);
  polygon.setAttribute('fill', color);
  polygon.setAttribute('fill-opacity', fillOpacity);

  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('points', points);
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke', color);
  polyline.setAttribute('stroke-width', '2');
  polyline.setAttribute('stroke-linecap', 'round');
  polyline.setAttribute('stroke-linejoin', 'round');

  svg.appendChild(polygon);
  svg.appendChild(polyline);
  container.appendChild(svg);
}

/**
 * Renders a progress bar using DOM methods
 * @param {number} current - Current value
 * @param {number} max - Maximum value
 * @param {HTMLElement} container - Container element
 * @param {object} options - Progress bar options
 */
function renderProgressBar(current, max, container, options) {
  if (!container) return;

  options = options || {};
  const color = options.color || '#3B82F6';
  const barHeight = options.height || 8;
  const showLabel = options.showLabel !== false;
  const animated = options.animated !== false;

  const percentage = Math.min((current / max) * 100, 100);

  container.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'progress-bar-wrapper';

  if (showLabel) {
    const label = document.createElement('span');
    label.className = 'progress-label';
    label.textContent = current.toLocaleString() + ' / ' + max.toLocaleString();
    wrapper.appendChild(label);
  }

  const bar = document.createElement('div');
  bar.className = 'progress-bar';
  bar.style.height = barHeight + 'px';

  const fill = document.createElement('div');
  fill.className = 'progress-fill' + (animated ? ' animated' : '');
  fill.style.width = percentage + '%';
  fill.style.background = color;
  bar.appendChild(fill);
  wrapper.appendChild(bar);

  if (showLabel) {
    const percentLabel = document.createElement('span');
    percentLabel.className = 'progress-percentage';
    percentLabel.textContent = percentage.toFixed(1) + '%';
    wrapper.appendChild(percentLabel);
  }

  container.appendChild(wrapper);
}

/**
 * Renders a donut chart using DOM methods
 * @param {Array} segments - Array of segment objects {value, color, label}
 * @param {HTMLElement} container - Container element
 * @param {object} options - Chart options
 */
function renderDonutChart(segments, container, options) {
  if (!container || !segments.length) return;

  options = options || {};
  const size = options.size || 120;
  const strokeWidth = options.strokeWidth || 20;
  const centerText = options.centerText || '';

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const halfSize = size / 2;

  container.textContent = '';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
  svg.setAttribute('class', 'donut-chart');

  // Background circle
  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bgCircle.setAttribute('cx', halfSize);
  bgCircle.setAttribute('cy', halfSize);
  bgCircle.setAttribute('r', radius);
  bgCircle.setAttribute('fill', 'none');
  bgCircle.setAttribute('stroke', '#e5e7eb');
  bgCircle.setAttribute('stroke-width', strokeWidth);
  svg.appendChild(bgCircle);

  // Segment circles
  let currentOffset = 0;
  segments.forEach(segment => {
    const segmentLength = (segment.value / total) * circumference;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', halfSize);
    circle.setAttribute('cy', halfSize);
    circle.setAttribute('r', radius);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', segment.color);
    circle.setAttribute('stroke-width', strokeWidth);
    circle.setAttribute('stroke-dasharray', segmentLength + ' ' + (circumference - segmentLength));
    circle.setAttribute('stroke-dashoffset', -currentOffset);
    circle.setAttribute('transform', 'rotate(-90 ' + halfSize + ' ' + halfSize + ')');
    circle.setAttribute('class', 'donut-segment');
    svg.appendChild(circle);
    currentOffset += segmentLength;
  });

  // Center text
  if (centerText) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', halfSize);
    text.setAttribute('y', halfSize);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('class', 'donut-center-text');
    text.textContent = centerText;
    svg.appendChild(text);
  }

  container.appendChild(svg);

  // Legend
  const legend = document.createElement('div');
  legend.className = 'donut-legend';
  segments.forEach(s => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    const colorBox = document.createElement('span');
    colorBox.className = 'legend-color';
    colorBox.style.background = s.color;
    const labelSpan = document.createElement('span');
    labelSpan.className = 'legend-label';
    labelSpan.textContent = s.label;
    const valueSpan = document.createElement('span');
    valueSpan.className = 'legend-value';
    valueSpan.textContent = s.value;
    item.appendChild(colorBox);
    item.appendChild(labelSpan);
    item.appendChild(valueSpan);
    legend.appendChild(item);
  });
  container.appendChild(legend);
}

// ============================================================
// SECTION 8: API INTEGRATION STUBS
// ============================================================

/**
 * Fetches athlete data from API
 * @param {number} athleteId - Athlete ID
 * @returns {Promise<object>} Athlete data
 */
async function fetchAthleteData(athleteId) {
  // Stub: Return mock data
  // TODO: Replace with actual API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(athleteId ? athletes.find(a => a.id === athleteId) : currentAthlete);
    }, 500);
  });
}

/**
 * Fetches score breakdown from API
 * @param {number} athleteId - Athlete ID
 * @returns {Promise<object>} Score breakdown data
 */
async function fetchScoreBreakdown(athleteId) {
  // Stub: Return mock data
  // TODO: Replace with actual API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(scoreBreakdown);
    }, 300);
  });
}

/**
 * Fetches achievements from API
 * @param {number} athleteId - Athlete ID
 * @returns {Promise<Array>} Achievements array
 */
async function fetchAchievements(athleteId) {
  // Stub: Return mock data
  // TODO: Replace with actual API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(achievements);
    }, 400);
  });
}

/**
 * Fetches deals from API
 * @param {number} athleteId - Athlete ID
 * @returns {Promise<Array>} Deals array
 */
async function fetchDeals(athleteId) {
  // Stub: Return mock data
  // TODO: Replace with actual API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(deals);
    }, 400);
  });
}

/**
 * Searches athletes with filters
 * @param {object} filters - Search filters
 * @returns {Promise<Array>} Filtered athletes array
 */
async function searchAthletes(filters) {
  filters = filters || {};
  // Stub: Return mock data filtered
  // TODO: Replace with actual API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const filtered = filterAthletes(athletes, filters);
      const sorted = sortAthletes(filtered, filters.sortBy || 'score-desc');
      resolve(sorted);
    }, 500);
  });
}

/**
 * Fetches campaigns from API
 * @returns {Promise<Array>} Campaigns array
 */
async function fetchCampaigns() {
  // Stub: Return mock data
  // TODO: Replace with actual API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(campaigns);
    }, 400);
  });
}

// ============================================================
// SECTION 9: UTILITY FUNCTIONS
// ============================================================

/**
 * Formats a number with K/M suffixes
 * @param {number} num - Number to format
 * @returns {string} Formatted string
 */
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

/**
 * Formats a date
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[date.getMonth()] + ' ' + date.getDate();
}

/**
 * Checks if two dates are the same day
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if same day
 */
function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * Adds days to a date
 * @param {Date} date - Base date
 * @param {number} days - Days to add
 * @returns {Date} New date
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Gets time ago string from date
 * @param {Date} date - Date to compare
 * @returns {string} Time ago string
 */
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return diffMins + 'm ago';
  if (diffHours < 24) return diffHours + 'h ago';
  if (diffDays < 7) return diffDays + 'd ago';
  return formatDate(date);
}

// ============================================================
// SECTION 10: ACTION HANDLERS
// ============================================================

/**
 * Views deal details
 * @param {number} dealId - Deal ID
 */
function viewDealDetails(dealId) {
  const deal = deals.find(d => d.id === dealId);
  if (!deal) return;

  console.log('View deal details:', deal);
  showNotification('Opening ' + deal.brandName + ' deal details...', 'info');
  // TODO: Implement modal or navigation to deal details
}

/**
 * Contacts a brand
 * @param {number} matchId - Brand match ID
 */
function contactBrand(matchId) {
  const match = brandMatches.find(m => m.id === matchId);
  if (!match) return;

  console.log('Contact brand:', match);
  showNotification('Initiating contact with ' + match.brandName + '...', 'success');
  // TODO: Implement contact flow
}

/**
 * Views athlete profile
 * @param {number} athleteId - Athlete ID
 */
function viewAthleteProfile(athleteId) {
  const athlete = athletes.find(a => a.id === athleteId);
  if (!athlete) return;

  console.log('View athlete profile:', athlete);
  showNotification('Opening ' + athlete.name + "'s profile...", 'info');
  // TODO: Implement navigation to athlete profile
}

/**
 * Contacts an athlete
 * @param {number} athleteId - Athlete ID
 */
function contactAthlete(athleteId) {
  const athlete = athletes.find(a => a.id === athleteId);
  if (!athlete) return;

  console.log('Contact athlete:', athlete);
  showNotification('Starting conversation with ' + athlete.name + '...', 'success');
  // TODO: Implement contact flow
}

/**
 * Views full calendar
 */
function viewFullCalendar() {
  console.log('View full calendar');
  showNotification('Opening full calendar...', 'info');
  // TODO: Implement navigation to calendar page
}

/**
 * Views campaign details
 * @param {number} campaignId - Campaign ID
 */
function viewCampaignDetails(campaignId) {
  const campaign = campaigns.find(c => c.id === campaignId);
  if (!campaign) return;

  console.log('View campaign details:', campaign);
  showNotification('Opening ' + campaign.name + ' details...', 'info');
  // TODO: Implement modal or navigation to campaign details
}

/**
 * Opens a conversation
 * @param {number} conversationId - Conversation ID
 */
function openConversation(conversationId) {
  const conversation = conversations.find(c => c.id === conversationId);
  if (!conversation) return;

  console.log('Open conversation:', conversation);
  showNotification('Opening chat with ' + conversation.athleteName + '...', 'info');
  // TODO: Implement navigation to messages
}

// ============================================================
// SECTION 11: INITIALIZATION
// ============================================================

/**
 * Initializes athlete dashboard
 */
function initAthleteDashboard() {
  console.log('Initializing Athlete Dashboard...');

  // Initialize UI components
  initTabs();
  initModals();

  // Render main components
  renderAthleteStats(currentAthlete);
  renderDealsTable(deals);
  renderBrandMatches(brandMatches);
  renderScholarStatus(currentAthlete.scholarTier);
  renderCalendarWidget(calendarEvents);

  // Render achievements
  const achievementsContainer = document.getElementById('achievements-grid');
  if (achievementsContainer) {
    renderAchievements(achievements, achievementsContainer);
  }

  // Render score ring
  const scoreRingContainer = document.getElementById('score-ring');
  if (scoreRingContainer) {
    scoreRingContainer.textContent = '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderScoreRing(currentAthlete.gradeupScore, 150);
    while (tempDiv.firstChild) {
      scoreRingContainer.appendChild(tempDiv.firstChild);
    }
  }

  // Render score breakdown donut chart
  const breakdownContainer = document.getElementById('score-breakdown-chart');
  if (breakdownContainer) {
    renderDonutChart([
      { value: scoreBreakdown.athletic, color: '#EF4444', label: 'Athletic' },
      { value: scoreBreakdown.social, color: '#3B82F6', label: 'Social' },
      { value: scoreBreakdown.academic, color: '#10B981', label: 'Academic' }
    ], breakdownContainer, { size: 100, strokeWidth: 15 });
  }

  // Render XP progress
  const xpProgressContainer = document.getElementById('xp-progress');
  if (xpProgressContainer) {
    const xpProgress = calculateXpProgress(currentAthlete.xp, currentAthlete.level);
    renderProgressBar(xpProgress.current, xpProgress.needed, xpProgressContainer, {
      color: '#8B5CF6',
      showLabel: true
    });
  }

  console.log('Athlete Dashboard initialized successfully!');
  showNotification('Welcome back, ' + currentAthlete.name + '!', 'success');
}

/**
 * Initializes brand dashboard
 */
function initBrandDashboard() {
  console.log('Initializing Brand Dashboard...');

  // Initialize UI components
  initTabs();
  initModals();
  initFilters();
  initSearch();

  // Render athlete grid
  const athletesContainer = document.getElementById('athletes-grid');
  if (athletesContainer) {
    renderAthleteGrid(athletes, athletesContainer);
  }

  // Render campaigns
  renderCampaigns(campaigns);

  // Render messages
  renderMessages(conversations);

  console.log('Brand Dashboard initialized successfully!');
  showNotification('Welcome to GradeUp Brand Portal!', 'success');
}

// ============================================================
// AUTO-INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Detect which dashboard and initialize
  if (document.getElementById('athlete-dashboard')) {
    initAthleteDashboard();
  } else if (document.getElementById('brand-dashboard')) {
    initBrandDashboard();
  }
});

// ============================================================
// EXPORTS (for ES modules)
// ============================================================

// Export functions for external use if using ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Data
    currentAthlete: currentAthlete,
    scoreBreakdown: scoreBreakdown,
    achievements: achievements,
    deals: deals,
    brandMatches: brandMatches,
    athletes: athletes,
    calendarEvents: calendarEvents,
    campaigns: campaigns,
    conversations: conversations,

    // Score functions
    getScoreGrade: getScoreGrade,
    getScoreColor: getScoreColor,
    animateScore: animateScore,
    renderScoreRing: renderScoreRing,

    // Achievement functions
    getRarityColor: getRarityColor,
    calculateXpProgress: calculateXpProgress,
    renderAchievements: renderAchievements,

    // Dashboard rendering
    renderAthleteStats: renderAthleteStats,
    renderDealsTable: renderDealsTable,
    renderBrandMatches: renderBrandMatches,
    renderScholarStatus: renderScholarStatus,
    renderCalendarWidget: renderCalendarWidget,

    // Brand dashboard
    renderAthleteGrid: renderAthleteGrid,
    renderAthleteCard: renderAthleteCard,
    filterAthletes: filterAthletes,
    sortAthletes: sortAthletes,
    renderCampaigns: renderCampaigns,
    renderMessages: renderMessages,

    // UI interactions
    initTabs: initTabs,
    initModals: initModals,
    initFilters: initFilters,
    initSearch: initSearch,
    showNotification: showNotification,
    showLoading: showLoading,
    hideLoading: hideLoading,
    openModal: openModal,
    closeModal: closeModal,

    // Visualizations
    renderMiniChart: renderMiniChart,
    renderProgressBar: renderProgressBar,
    renderDonutChart: renderDonutChart,

    // API stubs
    fetchAthleteData: fetchAthleteData,
    fetchScoreBreakdown: fetchScoreBreakdown,
    fetchAchievements: fetchAchievements,
    fetchDeals: fetchDeals,
    searchAthletes: searchAthletes,
    fetchCampaigns: fetchCampaigns,

    // Utilities
    formatNumber: formatNumber,
    formatDate: formatDate,
    getTimeAgo: getTimeAgo,

    // Initialization
    initAthleteDashboard: initAthleteDashboard,
    initBrandDashboard: initBrandDashboard
  };
}

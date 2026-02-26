/* ═══════════════════════════════════════════════════════════════════════════
   GRADEUP NIL - Opportunities Marketplace Logic
   Nike x Apple Inspired
   Built from scratch - 2025
   ═══════════════════════════════════════════════════════════════════════════ */

(function() {
    'use strict';

    // ─── Focus Trap Utility (WCAG 2.2 Keyboard Accessibility) ───
    let lastFocusedElement = null;
    let activeFocusTrapHandler = null;

    /**
     * Sets up a focus trap within a modal element for WCAG 2.2 keyboard accessibility.
     * Traps Tab/Shift+Tab navigation within the modal and handles Escape key to close.
     * @param {HTMLElement} modalElement - The modal container element to trap focus within
     * @param {Function} closeCallback - Callback function to execute when Escape is pressed
     * @returns {void}
     * @example
     * setupFocusTrap(document.getElementById('myModal'), closeModal);
     */
    function setupFocusTrap(modalElement, closeCallback) {
        const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const focusableElements = modalElement.querySelectorAll(focusableSelectors);
        if (focusableElements.length === 0) return;

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        // Focus first element
        setTimeout(function() { firstFocusable.focus(); }, 50);

        function handleKeydown(e) {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
            if (e.key === 'Escape') {
                closeCallback();
            }
        }

        modalElement.addEventListener('keydown', handleKeydown);
        activeFocusTrapHandler = { modal: modalElement, handler: handleKeydown };
    }

    /**
     * Removes the active focus trap and restores focus to the previously focused element.
     * Should be called when closing a modal to clean up event listeners and restore user context.
     * @returns {void}
     */
    function removeFocusTrap() {
        if (activeFocusTrapHandler) {
            activeFocusTrapHandler.modal.removeEventListener('keydown', activeFocusTrapHandler.handler);
            activeFocusTrapHandler = null;
        }
        if (lastFocusedElement) {
            lastFocusedElement.focus();
            lastFocusedElement = null;
        }
    }

    // ─── Safe DOM Helpers (XSS Prevention) ───
    // Creates SVG icon elements safely without innerHTML

    /**
     * Creates a clock SVG icon element using safe DOM methods (XSS prevention).
     * Used to display time-related information like deadlines.
     * @returns {SVGElement} SVG element representing a clock icon
     */
    function createClockIcon() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '12');
        circle.setAttribute('cy', '12');
        circle.setAttribute('r', '10');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M12 6v6l4 2');
        svg.appendChild(circle);
        svg.appendChild(path);
        return svg;
    }

    /**
     * Creates a check/success SVG icon element using safe DOM methods (XSS prevention).
     * Used to display completion status or match scores.
     * @returns {SVGElement} SVG element representing a checkmark in a circle
     */
    function createCheckIcon() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path1.setAttribute('d', 'M22 11.08V12a10 10 0 11-5.93-9.14');
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        poly.setAttribute('points', '22 4 12 14.01 9 11.01');
        svg.appendChild(path1);
        svg.appendChild(poly);
        return svg;
    }

    /**
     * Creates a simple circle SVG icon element using safe DOM methods (XSS prevention).
     * Used as a generic bullet or placeholder icon.
     * @returns {SVGElement} SVG element representing an empty circle
     */
    function createCircleIcon() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '12');
        circle.setAttribute('cy', '12');
        circle.setAttribute('r', '10');
        svg.appendChild(circle);
        return svg;
    }

    /**
     * Creates a simple checkmark SVG icon element using safe DOM methods (XSS prevention).
     * Used for deliverable lists and completed items.
     * @returns {SVGElement} SVG element representing a checkmark (polyline)
     */
    function createCheckmarkIcon() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        poly.setAttribute('points', '20 6 9 17 4 12');
        svg.appendChild(poly);
        return svg;
    }

    /**
     * Creates a users/people SVG icon element using safe DOM methods (XSS prevention).
     * Used to display follower count requirements.
     * @returns {SVGElement} SVG element representing multiple users
     */
    function createUsersIcon() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path1.setAttribute('d', 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2');
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '9');
        circle.setAttribute('cy', '7');
        circle.setAttribute('r', '4');
        const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path2.setAttribute('d', 'M23 21v-2a4 4 0 00-3-3.87');
        const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path3.setAttribute('d', 'M16 3.13a4 4 0 010 7.75');
        svg.appendChild(path1);
        svg.appendChild(circle);
        svg.appendChild(path2);
        svg.appendChild(path3);
        return svg;
    }

    /**
     * Creates an education/graduation cap SVG icon element using safe DOM methods (XSS prevention).
     * Used to display GPA requirements.
     * @returns {SVGElement} SVG element representing a graduation cap
     */
    function createEducationIcon() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path1.setAttribute('d', 'M22 10v6M2 10l10-5 10 5-10 5z');
        const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path2.setAttribute('d', 'M6 12v5c3 3 9 3 12 0v-5');
        svg.appendChild(path1);
        svg.appendChild(path2);
        return svg;
    }

    // ─── Opportunities Data ───
    // Note: This is demo data. In production, data would come from Supabase backend.
    const opportunitiesData = [
        {
            id: 1,
            brand: 'Nike',
            brandLogo: 'N',
            title: 'Campus Ambassador Program',
            type: 'endorsement',
            typeLabel: 'Endorsement',
            compensation: '$5,000 - $15,000',
            compensationValue: 10000,
            description: 'Represent Nike on your campus through social media content, events, and community engagement. Looking for student-athletes who embody excellence both academically and athletically.',
            requirements: {
                sport: 'Any',
                gpa: '3.5+',
                followers: '10K+',
                location: 'Remote'
            },
            deliverables: [
                '4 Instagram posts per month',
                '2 TikTok videos per month',
                'Campus event appearances (2 per semester)',
                'Product reviews and feedback'
            ],
            deadline: '2025-03-15',
            duration: 'Season-long',
            featured: true,
            matchScore: 94
        },
        {
            id: 2,
            brand: 'Gatorade',
            brandLogo: 'G',
            title: 'Hydration Partner',
            type: 'social',
            typeLabel: 'Social Post',
            compensation: '$2,500',
            compensationValue: 2500,
            description: 'Share your training routine and how Gatorade fuels your performance. Perfect for athletes focused on peak physical conditioning.',
            requirements: {
                sport: 'Any',
                gpa: '3.0+',
                followers: '5K+',
                location: 'Remote'
            },
            deliverables: [
                '3 Instagram stories featuring Gatorade',
                '1 Reel showcasing workout routine',
                'Authentic product integration'
            ],
            deadline: '2025-02-28',
            duration: 'One-time',
            featured: true,
            matchScore: 89
        },
        {
            id: 3,
            brand: 'Red Bull',
            brandLogo: 'RB',
            title: 'Student Athlete Spotlight',
            type: 'appearance',
            typeLabel: 'Appearance',
            compensation: '$3,000 - $5,000',
            compensationValue: 4000,
            description: 'Be featured in Red Bull\'s student athlete documentary series. Share your journey balancing academics and athletics at the highest level.',
            requirements: {
                sport: 'Any',
                gpa: '3.7+',
                followers: 'Any',
                location: 'On-site'
            },
            deliverables: [
                '1-day video shoot',
                'Interview session',
                'Behind-the-scenes content rights'
            ],
            deadline: '2025-03-01',
            duration: 'One-time',
            featured: false,
            matchScore: 82
        },
        {
            id: 4,
            brand: 'Beats by Dre',
            brandLogo: 'B',
            title: 'Game Day Audio Partner',
            type: 'social',
            typeLabel: 'Social Post',
            compensation: '$1,500',
            compensationValue: 1500,
            description: 'Show how Beats powers your pre-game ritual. Looking for athletes with strong visual content creation skills.',
            requirements: {
                sport: 'Basketball, Football',
                gpa: '3.0+',
                followers: '15K+',
                location: 'Remote'
            },
            deliverables: [
                '2 Instagram Reels',
                'Game day stories featuring product',
                'Playlist share collaboration'
            ],
            deadline: '2025-02-20',
            duration: 'Monthly',
            featured: false,
            matchScore: 76,
            urgent: true
        },
        {
            id: 5,
            brand: 'Chipotle',
            brandLogo: 'C',
            title: 'Fuel Your Goals Campaign',
            type: 'social',
            typeLabel: 'Social Post',
            compensation: '$800 + Free Food',
            compensationValue: 800,
            description: 'Partner with Chipotle to showcase how you fuel your athletic and academic performance. Bonus: unlimited burritos for a semester!',
            requirements: {
                sport: 'Any',
                gpa: '3.0+',
                followers: '3K+',
                location: 'Remote'
            },
            deliverables: [
                '2 Instagram posts',
                '1 TikTok video',
                'Story mentions'
            ],
            deadline: '2025-03-10',
            duration: 'One-time',
            featured: false,
            matchScore: 91
        },
        {
            id: 6,
            brand: 'State Farm',
            brandLogo: 'SF',
            title: 'Student Success Stories',
            type: 'endorsement',
            typeLabel: 'Endorsement',
            compensation: '$7,500',
            compensationValue: 7500,
            description: 'Be part of State Farm\'s campaign highlighting student-athletes who plan for success. Focus on financial literacy and future planning.',
            requirements: {
                sport: 'Any',
                gpa: '3.5+',
                followers: 'Any',
                location: 'Hybrid'
            },
            deliverables: [
                'Video testimonial',
                'Social media promotion',
                'Campus speaking engagement'
            ],
            deadline: '2025-04-01',
            duration: 'Season-long',
            featured: true,
            matchScore: 87
        },
        {
            id: 7,
            brand: 'Adidas',
            brandLogo: 'A',
            title: 'Creator Network Member',
            type: 'endorsement',
            typeLabel: 'Endorsement',
            compensation: '$4,000 + Gear',
            compensationValue: 4000,
            description: 'Join the Adidas Creator Network and receive exclusive gear while creating content that inspires the next generation of athletes.',
            requirements: {
                sport: 'Soccer, Basketball, Track',
                gpa: '3.2+',
                followers: '8K+',
                location: 'Remote'
            },
            deliverables: [
                'Monthly content creation',
                'Product reviews',
                'Event appearances (optional)'
            ],
            deadline: '2025-03-20',
            duration: 'Season-long',
            featured: false,
            matchScore: 85
        },
        {
            id: 8,
            brand: 'Under Armour',
            brandLogo: 'UA',
            title: 'Training Day Series',
            type: 'camp',
            typeLabel: 'Camp',
            compensation: '$2,000/day',
            compensationValue: 2000,
            description: 'Lead training sessions for youth athletes at Under Armour sponsored camps. Share your expertise and inspire the next generation.',
            requirements: {
                sport: 'Football, Basketball',
                gpa: '3.0+',
                followers: 'Any',
                location: 'On-site'
            },
            deliverables: [
                'Lead 2 training sessions',
                'Autograph session',
                'Meet and greet with campers'
            ],
            deadline: '2025-05-01',
            duration: 'Weekly',
            featured: false,
            matchScore: 78
        },
        {
            id: 9,
            brand: 'BODYARMOR',
            brandLogo: 'BA',
            title: 'Hydration Ambassador',
            type: 'social',
            typeLabel: 'Social Post',
            compensation: '$1,200',
            compensationValue: 1200,
            description: 'Showcase your commitment to peak hydration and performance with BODYARMOR sports drinks.',
            requirements: {
                sport: 'Any',
                gpa: '2.8+',
                followers: '5K+',
                location: 'Remote'
            },
            deliverables: [
                '2 Instagram posts',
                'Story takeover',
                'Product unboxing'
            ],
            deadline: '2025-02-25',
            duration: 'One-time',
            featured: false,
            matchScore: 88
        },
        {
            id: 10,
            brand: 'Fanatics',
            brandLogo: 'F',
            title: 'Autograph Signing Event',
            type: 'autograph',
            typeLabel: 'Autograph',
            compensation: '$500 - $2,000',
            compensationValue: 1250,
            description: 'Sign memorabilia for Fanatics authenticated products. Perfect for athletes with strong local or national following.',
            requirements: {
                sport: 'Football, Basketball, Baseball',
                gpa: '2.5+',
                followers: '20K+',
                location: 'On-site'
            },
            deliverables: [
                '2-hour signing session',
                '100+ autographs',
                'Photo opportunities'
            ],
            deadline: '2025-03-05',
            duration: 'One-time',
            featured: false,
            matchScore: 72
        },
        {
            id: 11,
            brand: 'Subway',
            brandLogo: 'S',
            title: 'Athlete Fuel Partner',
            type: 'social',
            typeLabel: 'Social Post',
            compensation: '$600 + Meals',
            compensationValue: 600,
            description: 'Partner with Subway to showcase healthy eating habits for student-athletes. Enjoy free Subway for a semester!',
            requirements: {
                sport: 'Any',
                gpa: '3.0+',
                followers: '2K+',
                location: 'Remote'
            },
            deliverables: [
                '1 Instagram post',
                '2 Stories',
                'Review content'
            ],
            deadline: '2025-02-18',
            duration: 'One-time',
            featured: false,
            matchScore: 93,
            urgent: true
        },
        {
            id: 12,
            brand: 'Sleep Number',
            brandLogo: 'SN',
            title: 'Recovery Champion',
            type: 'endorsement',
            typeLabel: 'Endorsement',
            compensation: '$3,500 + Mattress',
            compensationValue: 3500,
            description: 'Share how quality sleep powers your athletic and academic performance. Free Sleep Number bed included!',
            requirements: {
                sport: 'Any',
                gpa: '3.5+',
                followers: '8K+',
                location: 'Remote'
            },
            deliverables: [
                'Sleep tracking content',
                'Recovery routine videos',
                'Product testimonial'
            ],
            deadline: '2025-03-25',
            duration: 'Monthly',
            featured: false,
            matchScore: 86
        },
        {
            id: 13,
            brand: 'Whoop',
            brandLogo: 'W',
            title: 'Performance Data Partner',
            type: 'social',
            typeLabel: 'Social Post',
            compensation: '$1,000 + Device',
            compensationValue: 1000,
            description: 'Track and share your performance metrics with Whoop. Perfect for data-driven athletes optimizing their training.',
            requirements: {
                sport: 'Any',
                gpa: '3.2+',
                followers: '5K+',
                location: 'Remote'
            },
            deliverables: [
                'Weekly data shares',
                'Performance insights content',
                'Training optimization posts'
            ],
            deadline: '2025-03-30',
            duration: 'Monthly',
            featured: false,
            matchScore: 81
        },
        {
            id: 14,
            brand: 'Lululemon',
            brandLogo: 'LL',
            title: 'Sweat Life Ambassador',
            type: 'endorsement',
            typeLabel: 'Endorsement',
            compensation: '$2,500 + Apparel',
            compensationValue: 2500,
            description: 'Join the Lululemon ambassador program. Represent athletic excellence with style on and off the field.',
            requirements: {
                sport: 'Any',
                gpa: '3.3+',
                followers: '10K+',
                location: 'Hybrid'
            },
            deliverables: [
                'Monthly outfit features',
                'Store appearances',
                'Community events'
            ],
            deadline: '2025-04-15',
            duration: 'Season-long',
            featured: false,
            matchScore: 79
        },
        {
            id: 15,
            brand: 'Topps',
            brandLogo: 'T',
            title: 'Trading Card Feature',
            type: 'merchandise',
            typeLabel: 'Merchandise',
            compensation: '$1,500 + Royalties',
            compensationValue: 1500,
            description: 'Get your own Topps trading card! Earn royalties on every pack sold featuring your card.',
            requirements: {
                sport: 'Baseball, Basketball, Football',
                gpa: '2.8+',
                followers: '15K+',
                location: 'Hybrid'
            },
            deliverables: [
                'Photo shoot session',
                'Card design approval',
                'Promotional content'
            ],
            deadline: '2025-04-01',
            duration: 'One-time',
            featured: false,
            matchScore: 74
        }
    ];

    // ─── DOM Elements ───
    const nav = document.getElementById('nav');
    const navToggle = document.getElementById('navToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    const featuredGrid = document.getElementById('featuredGrid');
    const opportunitiesGrid = document.getElementById('opportunitiesGrid');
    const searchInput = document.getElementById('searchInput');
    const activeFiltersContainer = document.getElementById('activeFilters');
    const filterChips = document.getElementById('filterChips');
    const resultsCount = document.getElementById('resultsCount');

    // ─── Navigation ───

    /**
     * Initializes navigation behavior including scroll effects and mobile menu toggle.
     * Adds 'scrolled' class to nav when page scrolls past 50px for visual styling.
     * Handles mobile hamburger menu toggle with body overflow control.
     * @returns {void}
     */
    function initNav() {
        let lastScroll = 0;

        window.addEventListener('scroll', function() {
            const currentScroll = window.pageYOffset;

            if (currentScroll > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }

            lastScroll = currentScroll;
        });

        navToggle.addEventListener('click', function() {
            navToggle.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
        });
    }

    /**
     * Closes the mobile navigation menu and restores body scroll.
     * Removes 'active' class from toggle button and menu, re-enables body overflow.
     * @returns {void}
     * @global
     */
    window.closeMobileMenu = function() {
        navToggle.classList.remove('active');
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
    };

    // ─── Render Opportunities ───

    /**
     * Renders all opportunity cards to the page, separating featured and regular opportunities.
     * Clears existing grids and populates with new cards, updates results count.
     * @returns {void}
     */
    function renderOpportunities() {
        const featured = opportunitiesData.filter(function(opp) { return opp.featured; });
        const regular = opportunitiesData.filter(function(opp) { return !opp.featured; });

        // Render featured
        featuredGrid.innerHTML = '';
        featured.forEach(function(opp) {
            featuredGrid.appendChild(createOpportunityCard(opp, true));
        });

        // Render regular
        opportunitiesGrid.innerHTML = '';
        regular.forEach(function(opp) {
            opportunitiesGrid.appendChild(createOpportunityCard(opp, false));
        });

        // Update count
        resultsCount.textContent = opportunitiesData.length;
    }

    /**
     * Creates an opportunity card DOM element with all required sections.
     * Builds header with brand info, body with compensation and requirements,
     * footer with deadline and match score. Includes keyboard accessibility.
     * @param {Object} opp - Opportunity data object
     * @param {number} opp.id - Unique opportunity identifier
     * @param {string} opp.brand - Brand name
     * @param {string} opp.brandLogo - Brand logo text (initials)
     * @param {string} opp.title - Opportunity title
     * @param {string} opp.typeLabel - Display label for deal type
     * @param {string} opp.compensation - Compensation display string
     * @param {string} opp.description - Opportunity description
     * @param {Object} opp.requirements - Requirements object with sport, gpa, followers, location
     * @param {string} opp.deadline - Deadline date string (YYYY-MM-DD)
     * @param {string} opp.duration - Duration label (e.g., 'Season-long', 'One-time')
     * @param {number} opp.matchScore - Match percentage score (0-100)
     * @param {boolean} [opp.urgent] - Whether opportunity is marked as urgent
     * @param {boolean} isFeatured - Whether to apply featured styling
     * @returns {HTMLDivElement} The constructed opportunity card element
     */
    function createOpportunityCard(opp, isFeatured) {
        const daysLeft = getDaysLeft(opp.deadline);
        const isUrgent = daysLeft <= 7 || opp.urgent;

        const card = document.createElement('div');
        card.className = 'opportunity-card' + (isFeatured ? ' featured' : '');
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', 'View ' + opp.title + ' opportunity from ' + opp.brand);

        // Build card header
        const header = document.createElement('div');
        header.className = 'card-header';

        const logo = document.createElement('div');
        logo.className = 'brand-logo';
        logo.textContent = opp.brandLogo;

        const headerInfo = document.createElement('div');
        headerInfo.className = 'card-header-info';

        const brandName = document.createElement('div');
        brandName.className = 'brand-name';
        brandName.textContent = opp.brand;

        const title = document.createElement('div');
        title.className = 'opportunity-title';
        title.textContent = opp.title;

        const badges = document.createElement('div');
        badges.className = 'card-badges';

        const typeBadge = document.createElement('span');
        typeBadge.className = 'badge badge-type';
        typeBadge.textContent = opp.typeLabel;
        badges.appendChild(typeBadge);

        if (isFeatured) {
            const featuredBadge = document.createElement('span');
            featuredBadge.className = 'badge badge-featured';
            featuredBadge.textContent = 'Featured';
            badges.appendChild(featuredBadge);
        }

        if (isUrgent) {
            const urgentBadge = document.createElement('span');
            urgentBadge.className = 'badge badge-urgent';
            urgentBadge.textContent = 'Closing Soon';
            badges.appendChild(urgentBadge);
        }

        headerInfo.appendChild(brandName);
        headerInfo.appendChild(title);
        headerInfo.appendChild(badges);
        header.appendChild(logo);
        header.appendChild(headerInfo);

        // Build card body
        const body = document.createElement('div');
        body.className = 'card-body';

        const compensation = document.createElement('div');
        compensation.className = 'compensation';

        const compValue = document.createElement('span');
        compValue.className = 'compensation-value';
        compValue.textContent = opp.compensation;

        const compType = document.createElement('span');
        compType.className = 'compensation-type';
        compType.textContent = opp.duration;

        compensation.appendChild(compValue);
        compensation.appendChild(compType);

        const desc = document.createElement('p');
        desc.className = 'opportunity-desc';
        desc.textContent = opp.description;

        const requirements = document.createElement('div');
        requirements.className = 'requirements';

        // Sport requirement
        const sportReq = createRequirement('sport', opp.requirements.sport);
        requirements.appendChild(sportReq);

        // GPA requirement
        const gpaReq = createRequirement('gpa', opp.requirements.gpa + ' GPA');
        requirements.appendChild(gpaReq);

        // Followers requirement
        const followersReq = createRequirement('followers', opp.requirements.followers);
        requirements.appendChild(followersReq);

        body.appendChild(compensation);
        body.appendChild(desc);
        body.appendChild(requirements);

        // Build card footer
        const footer = document.createElement('div');
        footer.className = 'card-footer';

        const deadline = document.createElement('span');
        deadline.className = 'deadline' + (isUrgent ? ' urgent' : '');
        deadline.appendChild(createClockIcon());
        deadline.appendChild(document.createTextNode(' ' + daysLeft + ' days left'));

        const matchScore = document.createElement('span');
        matchScore.className = 'match-score';
        matchScore.appendChild(createCheckIcon());
        matchScore.appendChild(document.createTextNode(' ' + opp.matchScore + '% Match'));

        footer.appendChild(deadline);
        footer.appendChild(matchScore);

        // Assemble card
        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(footer);

        // Add click handler
        card.addEventListener('click', function() {
            openOpportunityModal(opp.id);
        });

        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openOpportunityModal(opp.id);
            }
        });

        return card;
    }

    /**
     * Creates a requirement badge element with appropriate icon based on type.
     * Uses safe DOM methods instead of innerHTML for XSS prevention.
     * @param {string} type - Requirement type: 'sport', 'gpa', 'followers', or other
     * @param {string} text - Text to display alongside the icon
     * @returns {HTMLSpanElement} Span element containing icon and text
     */
    function createRequirement(type, text) {
        const req = document.createElement('span');
        req.className = 'requirement';

        // Use safe DOM methods instead of innerHTML (XSS prevention)
        let icon;
        if (type === 'sport') {
            icon = createClockIcon();
        } else if (type === 'gpa') {
            icon = createEducationIcon();
        } else if (type === 'followers') {
            icon = createUsersIcon();
        } else {
            icon = createCircleIcon();
        }

        req.appendChild(icon);
        req.appendChild(document.createTextNode(' ' + text));
        return req;
    }

    /**
     * Calculates the number of days remaining until a deadline.
     * Returns 0 if deadline has passed.
     * @param {string} deadline - Deadline date string (YYYY-MM-DD format)
     * @returns {number} Number of days until deadline (minimum 0)
     * @example
     * getDaysLeft('2025-03-15'); // Returns days between now and March 15, 2025
     */
    function getDaysLeft(deadline) {
        const now = new Date();
        const end = new Date(deadline);
        const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    }

    // ─── Modal Functions ───

    /**
     * Opens a detailed modal view for a specific opportunity.
     * Displays full opportunity details including brand info, compensation,
     * requirements, deliverables, timeline, pitch textarea, and similar opportunities.
     * Sets up focus trap for keyboard accessibility.
     * @param {number} id - The opportunity ID to display
     * @returns {void}
     * @global
     */
    window.openOpportunityModal = function(id) {
        const opp = opportunitiesData.find(function(o) { return o.id === id; });
        if (!opp) return;

        const daysLeft = getDaysLeft(opp.deadline);
        const deadlineDate = new Date(opp.deadline);
        const formattedDate = deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // Build modal content using DOM methods
        const content = document.createElement('div');

        // Brand header
        const brandHeader = document.createElement('div');
        brandHeader.className = 'modal-brand-header';

        const brandLogo = document.createElement('div');
        brandLogo.className = 'modal-brand-logo';
        brandLogo.textContent = opp.brandLogo;

        const brandInfo = document.createElement('div');
        brandInfo.className = 'modal-brand-info';

        const brandTitle = document.createElement('h3');
        brandTitle.id = 'modalTitle';
        brandTitle.textContent = opp.title;

        const brandSubtitle = document.createElement('p');
        brandSubtitle.textContent = opp.brand + ' - ' + opp.typeLabel;

        brandInfo.appendChild(brandTitle);
        brandInfo.appendChild(brandSubtitle);
        brandHeader.appendChild(brandLogo);
        brandHeader.appendChild(brandInfo);

        // Compensation
        const compSection = document.createElement('div');
        compSection.className = 'modal-compensation';

        const compValue = document.createElement('div');
        compValue.className = 'modal-compensation-value';
        compValue.textContent = opp.compensation;

        const compLabel = document.createElement('div');
        compLabel.className = 'modal-compensation-label';
        compLabel.textContent = opp.duration + ' commitment';

        compSection.appendChild(compValue);
        compSection.appendChild(compLabel);

        // About section
        const aboutSection = document.createElement('div');
        aboutSection.className = 'modal-section';

        const aboutTitle = document.createElement('h4');
        aboutTitle.className = 'modal-section-title';
        aboutTitle.textContent = 'About This Opportunity';

        const aboutText = document.createElement('p');
        aboutText.textContent = opp.description;

        aboutSection.appendChild(aboutTitle);
        aboutSection.appendChild(aboutText);

        // Requirements section
        const reqSection = document.createElement('div');
        reqSection.className = 'modal-section';

        const reqTitle = document.createElement('h4');
        reqTitle.className = 'modal-section-title';
        reqTitle.textContent = 'Requirements';

        const reqGrid = document.createElement('div');
        reqGrid.className = 'modal-requirements-grid';

        const reqs = [
            { icon: 'circle', label: 'Sport: ' + opp.requirements.sport },
            { icon: 'gpa', label: 'GPA: ' + opp.requirements.gpa },
            { icon: 'followers', label: 'Followers: ' + opp.requirements.followers },
            { icon: 'location', label: 'Location: ' + opp.requirements.location }
        ];

        reqs.forEach(function(r) {
            const reqItem = document.createElement('div');
            reqItem.className = 'modal-requirement';
            // Safe DOM methods instead of innerHTML (XSS prevention)
            reqItem.appendChild(createCircleIcon());
            reqItem.appendChild(document.createTextNode(' ' + r.label));
            reqGrid.appendChild(reqItem);
        });

        reqSection.appendChild(reqTitle);
        reqSection.appendChild(reqGrid);

        // Deliverables section
        const delSection = document.createElement('div');
        delSection.className = 'modal-section';

        const delTitle = document.createElement('h4');
        delTitle.className = 'modal-section-title';
        delTitle.textContent = 'Deliverables';

        const delList = document.createElement('ul');
        opp.deliverables.forEach(function(d) {
            const li = document.createElement('li');
            // Safe DOM methods instead of innerHTML (XSS prevention)
            li.appendChild(createCheckmarkIcon());
            li.appendChild(document.createTextNode(' ' + d));
            delList.appendChild(li);
        });

        delSection.appendChild(delTitle);
        delSection.appendChild(delList);

        // Timeline section
        const timeSection = document.createElement('div');
        timeSection.className = 'modal-section';

        const timeTitle = document.createElement('h4');
        timeTitle.className = 'modal-section-title';
        timeTitle.textContent = 'Timeline';

        const timeline = document.createElement('div');
        timeline.className = 'modal-timeline';

        const timeItems = [
            { label: 'Deadline', value: formattedDate },
            { label: 'Days Left', value: daysLeft.toString() },
            { label: 'Duration', value: opp.duration },
            { label: 'Match Score', value: opp.matchScore + '%' }
        ];

        timeItems.forEach(function(item) {
            const timeItem = document.createElement('div');
            timeItem.className = 'timeline-item';

            const span1 = document.createElement('span');
            span1.textContent = item.label;

            const span2 = document.createElement('span');
            span2.textContent = item.value;

            timeItem.appendChild(span1);
            timeItem.appendChild(span2);
            timeline.appendChild(timeItem);
        });

        timeSection.appendChild(timeTitle);
        timeSection.appendChild(timeline);

        // Apply section
        const applySection = document.createElement('div');
        applySection.className = 'modal-apply';

        const applyTitle = document.createElement('h4');
        applyTitle.className = 'modal-section-title';
        applyTitle.textContent = 'Your Pitch';

        const textarea = document.createElement('textarea');
        textarea.className = 'pitch-textarea';
        textarea.placeholder = 'Tell ' + opp.brand + ' why you\'re the perfect fit for this opportunity. Highlight your academic achievements, athletic performance, and content creation experience...';

        const actions = document.createElement('div');
        actions.className = 'modal-actions';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-outline';
        saveBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg> Save';
        saveBtn.onclick = function() { saveOpportunity(opp.id); };

        const applyBtn = document.createElement('button');
        applyBtn.className = 'btn btn-primary';
        applyBtn.textContent = 'Apply Now';
        applyBtn.onclick = function() { applyToOpportunity(opp.id, this); };

        actions.appendChild(saveBtn);
        actions.appendChild(applyBtn);

        applySection.appendChild(applyTitle);
        applySection.appendChild(textarea);
        applySection.appendChild(actions);

        // Similar opportunities
        const similarSection = document.createElement('div');
        similarSection.className = 'similar-opportunities';

        const similarTitle = document.createElement('h4');
        similarTitle.className = 'similar-title';
        similarTitle.textContent = 'Similar Opportunities';

        const similarGrid = document.createElement('div');
        similarGrid.className = 'similar-grid';

        const similar = getSimilarOpportunities(opp);
        similar.forEach(function(s) {
            const card = document.createElement('div');
            card.className = 'similar-card';
            card.onclick = function() { openOpportunityModal(s.id); };

            const cardTitle = document.createElement('div');
            cardTitle.className = 'similar-card-title';
            cardTitle.textContent = s.title;

            const cardBrand = document.createElement('div');
            cardBrand.className = 'similar-card-brand';
            cardBrand.textContent = s.brand + ' - ' + s.compensation;

            card.appendChild(cardTitle);
            card.appendChild(cardBrand);
            similarGrid.appendChild(card);
        });

        similarSection.appendChild(similarTitle);
        similarSection.appendChild(similarGrid);

        // Assemble content
        content.appendChild(brandHeader);
        content.appendChild(compSection);
        content.appendChild(aboutSection);
        content.appendChild(reqSection);
        content.appendChild(delSection);
        content.appendChild(timeSection);
        content.appendChild(applySection);
        content.appendChild(similarSection);

        // Clear modal content safely
        while (modalContent.firstChild) {
            modalContent.removeChild(modalContent.firstChild);
        }
        modalContent.appendChild(content);

        // Store trigger element for focus restoration
        lastFocusedElement = document.activeElement;

        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Set up focus trap
        setupFocusTrap(modalOverlay, closeModal);
    };

    /**
     * Finds similar opportunities based on deal type.
     * Returns up to 2 opportunities that match the same type but exclude the current one.
     * @param {Object} opp - The current opportunity to find similar ones for
     * @param {number} opp.id - Opportunity ID to exclude from results
     * @param {string} opp.type - Deal type to match against
     * @returns {Array<Object>} Array of up to 2 similar opportunity objects
     */
    function getSimilarOpportunities(opp) {
        return opportunitiesData
            .filter(function(o) { return o.id !== opp.id && o.type === opp.type; })
            .slice(0, 2);
    }

    /**
     * Closes the currently open modal overlay.
     * Removes focus trap, hides overlay, and restores body scroll.
     * @returns {void}
     * @global
     */
    window.closeModal = function() {
        removeFocusTrap();
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    /**
     * Opens a login or signup modal form.
     * Dynamically creates form content based on type, sets up focus trap for accessibility.
     * @param {string} type - Modal type: 'login' or 'signup'
     * @returns {void}
     * @global
     * @example
     * openModal('login'); // Opens login form
     * openModal('signup'); // Opens signup form
     */
    window.openModal = function(type) {
        const content = document.createElement('div');

        const header = document.createElement('div');
        header.className = 'modal-header';

        const h2 = document.createElement('h2');
        h2.textContent = type === 'login' ? 'Welcome Back' : 'Get Started';

        const p = document.createElement('p');
        p.textContent = type === 'login' ? 'Log in to your account' : 'Create your GradeUp account';

        header.appendChild(h2);
        header.appendChild(p);

        const form = document.createElement('form');
        form.className = 'modal-form';
        form.onsubmit = function(e) { e.preventDefault(); };

        const emailGroup = document.createElement('div');
        emailGroup.className = 'form-group';

        const emailLabel = document.createElement('label');
        emailLabel.textContent = 'Email';

        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.placeholder = 'Enter your email';
        emailInput.required = true;

        emailGroup.appendChild(emailLabel);
        emailGroup.appendChild(emailInput);

        const passGroup = document.createElement('div');
        passGroup.className = 'form-group';

        const passLabel = document.createElement('label');
        passLabel.textContent = 'Password';

        const passInput = document.createElement('input');
        passInput.type = 'password';
        passInput.placeholder = 'Enter your password';
        passInput.required = true;

        passGroup.appendChild(passLabel);
        passGroup.appendChild(passInput);

        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'btn btn-primary btn-block';
        submitBtn.textContent = type === 'login' ? 'Log In' : 'Sign Up';

        form.appendChild(emailGroup);
        form.appendChild(passGroup);
        form.appendChild(submitBtn);

        const footer = document.createElement('div');
        footer.className = 'modal-footer';

        // Build footer content safely (XSS prevention - no innerHTML with onclick)
        if (type === 'login') {
            const footerText = document.createTextNode("Don't have an account? ");
            const signupLink = document.createElement('a');
            signupLink.href = '#';
            signupLink.textContent = 'Sign up';
            signupLink.addEventListener('click', function(e) {
                e.preventDefault();
                openModal('signup');
            });
            footer.appendChild(footerText);
            footer.appendChild(signupLink);
        } else {
            const footerText = document.createTextNode('Already have an account? ');
            const loginLink = document.createElement('a');
            loginLink.href = '#';
            loginLink.textContent = 'Log in';
            loginLink.addEventListener('click', function(e) {
                e.preventDefault();
                openModal('login');
            });
            footer.appendChild(footerText);
            footer.appendChild(loginLink);
        }

        content.appendChild(header);
        content.appendChild(form);
        content.appendChild(footer);

        // Clear modal content safely
        while (modalContent.firstChild) {
            modalContent.removeChild(modalContent.firstChild);
        }
        modalContent.appendChild(content);

        // Store trigger element for focus restoration
        lastFocusedElement = document.activeElement;

        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Set up focus trap
        setupFocusTrap(modalOverlay, closeModal);
    };

    // Close modal on overlay click
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // Note: Escape key handling is now managed by the focus trap

    // ─── Filter Functions ───

    /**
     * Clears all active filters and search input, then re-renders opportunities.
     * Resets all select elements to empty value and hides active filters container.
     * @returns {void}
     * @global
     */
    window.clearAllFilters = function() {
        document.querySelectorAll('.filter-select select').forEach(function(select) {
            select.value = '';
        });
        searchInput.value = '';
        activeFiltersContainer.style.display = 'none';
        renderOpportunities();
    };

    /**
     * Filters opportunities based on a profile type preset.
     * Placeholder for profile-based filtering logic.
     * @param {string} type - Profile filter type identifier
     * @returns {void}
     * @global
     */
    window.filterByProfile = function(type) {
        // Filter logic would go here
    };

    /**
     * Displays saved opportunities for the current user.
     * Placeholder for saved opportunities view logic.
     * @returns {void}
     * @global
     */
    window.viewSaved = function() {
        // View saved opportunities logic would go here
    };

    /**
     * Creates a job alert subscription for the current user's profile.
     * Shows confirmation alert on success.
     * @returns {void}
     * @global
     */
    window.createAlert = function() {
        showAlert('Job alert created! You\'ll be notified when new opportunities match your profile.', null, { title: 'Alert Created' });
    };

    /**
     * Saves an opportunity to the user's profile for later viewing.
     * Shows confirmation alert on success.
     * @param {number} id - The opportunity ID to save
     * @returns {void}
     * @global
     */
    window.saveOpportunity = function(id) {
        showAlert('Opportunity saved to your profile!', null, { title: 'Saved' });
    };

    /**
     * Submits an application to an opportunity.
     * Shows loading state on button, simulates async submission with timeout,
     * then displays success state and confirmation alert.
     * @param {number} id - The opportunity ID to apply to
     * @param {HTMLButtonElement} btn - The apply button element for UI state updates
     * @returns {void}
     * @global
     */
    window.applyToOpportunity = function(id, btn) {
        const opp = opportunitiesData.find(function(o) { return o.id === id; });

        // Add loading state
        btn.classList.add('btn-loading');
        btn.disabled = true;

        // Simulate async application submission
        setTimeout(function() {
            btn.classList.remove('btn-loading');
            btn.disabled = false;
            btn.textContent = 'Applied!';
            btn.style.background = 'var(--success, #22c55e)';

            setTimeout(function() {
                showAlert('Application submitted to ' + opp.brand + '! You\'ll hear back within 5-7 business days.', function() {
                    closeModal();
                }, { title: 'Application Submitted' });
            }, 500);
        }, 1000);
    };

    // ─── Search ───
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase();
        const filtered = opportunitiesData.filter(function(opp) {
            return opp.title.toLowerCase().indexOf(query) !== -1 ||
                   opp.brand.toLowerCase().indexOf(query) !== -1 ||
                   opp.description.toLowerCase().indexOf(query) !== -1;
        });
        resultsCount.textContent = filtered.length;
    });

    // ─── View Toggle ───
    document.querySelectorAll('.view-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.view-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
        });
    });

    // ─── Pagination ───
    document.querySelectorAll('.page-btn:not(:disabled)').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (btn.querySelector('svg')) return;
            document.querySelectorAll('.page-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
        });
    });

    // ─── Event Listener Bindings ───

    /**
     * Initializes all event listeners for the page.
     * Sets up handlers for navigation buttons, modal controls, filter buttons,
     * widget interactions, and delegated event handling.
     * @returns {void}
     */
    function initEventListeners() {
        // Navigation buttons
        const navLoginBtn = document.getElementById('navLoginBtn');
        const navSignupBtn = document.getElementById('navSignupBtn');
        const mobileLoginBtn = document.getElementById('mobileLoginBtn');
        const mobileSignupBtn = document.getElementById('mobileSignupBtn');

        if (navLoginBtn) {
            navLoginBtn.addEventListener('click', function() {
                openModal('login');
            });
        }

        if (navSignupBtn) {
            navSignupBtn.addEventListener('click', function() {
                openModal('signup');
            });
        }

        if (mobileLoginBtn) {
            mobileLoginBtn.addEventListener('click', function() {
                openModal('login');
                closeMobileMenu();
            });
        }

        if (mobileSignupBtn) {
            mobileSignupBtn.addEventListener('click', function() {
                openModal('signup');
                closeMobileMenu();
            });
        }

        // Mobile navigation links - use event delegation
        const mobileMenuLocal = document.getElementById('mobileMenu');
        if (mobileMenu) {
            mobileMenu.addEventListener('click', function(e) {
                if (e.target.classList.contains('mobile-nav-link')) {
                    closeMobileMenu();
                }
            });
        }

        // Modal close button
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', function() {
                closeModal();
            });
        }

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', function() {
                clearAllFilters();
            });
        }

        // For You widget - event delegation for quick filters
        const forYouWidget = document.getElementById('forYouWidget');
        if (forYouWidget) {
            forYouWidget.addEventListener('click', function(e) {
                if (e.target.classList.contains('quick-filter')) {
                    const filterType = e.target.dataset.filter;
                    if (filterType) {
                        filterByProfile(filterType);
                    }
                }
            });
        }

        // Recently Viewed widget - event delegation
        const recentlyViewedWidget = document.getElementById('recentlyViewedWidget');
        if (recentlyViewedWidget) {
            recentlyViewedWidget.addEventListener('click', function(e) {
                const recentItem = e.target.closest('.recent-item');
                if (recentItem) {
                    const opportunityId = parseInt(recentItem.dataset.opportunityId, 10);
                    if (opportunityId) {
                        openOpportunityModal(opportunityId);
                    }
                }
            });
        }

        // View Saved button
        const viewSavedBtn = document.getElementById('viewSavedBtn');
        if (viewSavedBtn) {
            viewSavedBtn.addEventListener('click', function() {
                viewSaved();
            });
        }

        // Create Alert button
        const createAlertBtn = document.getElementById('createAlertBtn');
        if (createAlertBtn) {
            createAlertBtn.addEventListener('click', function() {
                createAlert();
            });
        }
    }

    // ─── Initialize ───

    /**
     * Main initialization function for the opportunities page.
     * Initializes navigation, event listeners, and renders opportunities.
     * Called on DOMContentLoaded or immediately if DOM is ready.
     * @returns {void}
     */
    function init() {
        initNav();
        initEventListeners();
        renderOpportunities();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

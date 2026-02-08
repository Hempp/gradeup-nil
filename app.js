/* ═══════════════════════════════════════════════════════════════════════════
   GRADEUP NIL - Application Logic
   Nike × Apple × Google × ESPN Inspired
   Built from scratch - 2025
   ═══════════════════════════════════════════════════════════════════════════ */

(function() {
    'use strict';

    // ─── Athletes Data ───
    // Note: This is demo data. In production, data would come from Supabase backend.
    const athletesData = [
        {
            id: 1,
            name: 'Marcus Johnson',
            school: 'Duke University',
            sport: 'Basketball',
            position: 'Point Guard',
            year: 'Junior',
            major: 'Economics',
            minor: 'Data Science',
            expectedGraduation: '2026',
            gpa: 3.87,
            image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&h=500&fit=crop&crop=face',
            followers: '125K',
            verified: true,
            tags: ["Dean's List", 'All-Conference']
        },
        {
            id: 2,
            name: 'Sarah Chen',
            school: 'Stanford University',
            sport: 'Soccer',
            position: 'Midfielder',
            year: 'Senior',
            major: 'Computer Science',
            minor: 'Business',
            expectedGraduation: '2025',
            gpa: 3.92,
            image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face',
            followers: '89K',
            verified: true,
            tags: ['Honors Program', 'Team Captain']
        },
        {
            id: 3,
            name: 'James Wilson',
            school: 'University of Alabama',
            sport: 'Football',
            position: 'Wide Receiver',
            year: 'Junior',
            major: 'Business Administration',
            minor: 'Communications',
            expectedGraduation: '2026',
            gpa: 3.54,
            image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face',
            followers: '340K',
            verified: true,
            tags: ['SEC Scholar', 'All-American']
        },
        {
            id: 4,
            name: 'Maya Rodriguez',
            school: 'UCLA',
            sport: 'Volleyball',
            position: 'Outside Hitter',
            year: 'Sophomore',
            major: 'Biology',
            minor: 'Chemistry',
            expectedGraduation: '2027',
            gpa: 3.78,
            image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop&crop=face',
            followers: '67K',
            verified: true,
            tags: ['Pre-Med', 'Pac-12 Honors']
        },
        {
            id: 5,
            name: 'Darius Thompson',
            school: 'Ohio State University',
            sport: 'Football',
            position: 'Quarterback',
            year: 'Senior',
            major: 'Marketing',
            minor: 'Sports Management',
            expectedGraduation: '2025',
            gpa: 3.65,
            image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop&crop=face',
            followers: '520K',
            verified: true,
            tags: ['Heisman Candidate', 'Big Ten Academic']
        },
        {
            id: 6,
            name: 'Emily Park',
            school: 'University of Michigan',
            sport: 'Tennis',
            position: 'Singles',
            year: 'Junior',
            major: 'Psychology',
            minor: 'Sociology',
            expectedGraduation: '2026',
            gpa: 3.95,
            image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop&crop=face',
            followers: '45K',
            verified: true,
            tags: ['Summa Cum Laude', 'NCAA Champion']
        }
    ];

    // ─── DOM Elements ───
    const loader = document.getElementById('loader');
    const nav = document.getElementById('nav');
    const navToggle = document.getElementById('navToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const athletesGrid = document.getElementById('athletesGrid');
    const modalOverlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modalContent');

    // ─── Loader ───
    function hideLoader() {
        setTimeout(() => {
            loader.classList.add('hidden');
            document.body.style.overflow = '';
            initAnimations();
        }, 1500);
    }

    // ─── Navigation ───
    function initNav() {
        let lastScroll = 0;
        let scrollThrottled = false;

        // PERFORMANCE: Use RAF throttling to prevent scroll jank
        // Limits updates to ~60fps instead of firing on every scroll event
        window.addEventListener('scroll', () => {
            if (!scrollThrottled) {
                scrollThrottled = true;
                requestAnimationFrame(() => {
                    const currentScroll = window.pageYOffset;

                    // Add scrolled class for background
                    if (currentScroll > 50) {
                        nav.classList.add('scrolled');
                    } else {
                        nav.classList.remove('scrolled');
                    }

                    // Hide/show on scroll direction
                    if (currentScroll > lastScroll && currentScroll > 100) {
                        nav.classList.add('hidden');
                    } else {
                        nav.classList.remove('hidden');
                    }

                    lastScroll = currentScroll;
                    scrollThrottled = false;
                });
            }
        });

        // Mobile menu toggle
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
        });

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href !== '#') {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            });
        });
    }

    // ─── Close Mobile Menu ───
    window.closeMobileMenu = function() {
        navToggle.classList.remove('active');
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
    };

    // ─── Athletes Grid ───
    // Uses hardcoded demo data - safe for innerHTML since data is controlled
    function renderAthletes() {
        if (!athletesGrid) return;

        const fragment = document.createDocumentFragment();

        athletesData.forEach(athlete => {
            const card = document.createElement('div');
            card.className = 'athlete-card';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `View ${athlete.name}'s profile`);

            // Build card content safely
            const imageDiv = document.createElement('div');
            imageDiv.className = 'athlete-card-image';

            const img = document.createElement('img');
            img.src = athlete.image;
            img.alt = athlete.name;
            img.loading = 'lazy';
            imageDiv.appendChild(img);

            if (athlete.verified) {
                const badge = document.createElement('div');
                badge.className = 'athlete-badge';
                badge.textContent = '✓';
                imageDiv.appendChild(badge);
            }

            const contentDiv = document.createElement('div');
            contentDiv.className = 'athlete-card-content';

            const schoolDiv = document.createElement('div');
            schoolDiv.className = 'athlete-card-school';
            schoolDiv.textContent = athlete.school.toUpperCase();

            const nameH3 = document.createElement('h3');
            nameH3.className = 'athlete-card-name';
            nameH3.textContent = athlete.name;

            const sportDiv = document.createElement('div');
            sportDiv.className = 'athlete-card-sport';
            sportDiv.textContent = `${athlete.sport} • ${athlete.position}`;

            const statsDiv = document.createElement('div');
            statsDiv.className = 'athlete-card-stats';

            const gpaDiv = document.createElement('div');
            gpaDiv.className = 'athlete-card-gpa';
            const gpaValue = document.createElement('span');
            gpaValue.className = 'value';
            gpaValue.textContent = athlete.gpa.toFixed(2);
            const gpaLabel = document.createElement('span');
            gpaLabel.className = 'label';
            gpaLabel.textContent = 'GPA';
            gpaDiv.appendChild(gpaValue);
            gpaDiv.appendChild(gpaLabel);

            const followersDiv = document.createElement('div');
            followersDiv.className = 'athlete-card-followers';
            const followersValue = document.createElement('span');
            followersValue.className = 'value';
            followersValue.textContent = athlete.followers;
            const followersLabel = document.createElement('span');
            followersLabel.className = 'label';
            followersLabel.textContent = 'Followers';
            followersDiv.appendChild(followersValue);
            followersDiv.appendChild(followersLabel);

            statsDiv.appendChild(gpaDiv);
            statsDiv.appendChild(followersDiv);

            const tagsDiv = document.createElement('div');
            tagsDiv.className = 'athlete-card-tags';
            athlete.tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'tag';
                tagSpan.textContent = tag;
                tagsDiv.appendChild(tagSpan);
            });

            contentDiv.appendChild(schoolDiv);
            contentDiv.appendChild(nameH3);
            contentDiv.appendChild(sportDiv);
            contentDiv.appendChild(statsDiv);
            contentDiv.appendChild(tagsDiv);

            card.appendChild(imageDiv);
            card.appendChild(contentDiv);

            // Event listeners
            card.addEventListener('click', () => openAthleteModal(athlete.id));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openAthleteModal(athlete.id);
                }
            });

            fragment.appendChild(card);
        });

        athletesGrid.appendChild(fragment);
    }

    // ─── Stat Counter Animation ───
    function animateStats() {
        const stats = document.querySelectorAll('.hero-stat-value[data-value]');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const endValue = parseFloat(el.dataset.value);
                    const duration = 2000;
                    const startTime = performance.now();
                    const isDecimal = endValue % 1 !== 0;
                    const prefix = el.textContent.startsWith('$') ? '$' : '';

                    function updateCounter(currentTime) {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);

                        // Easing function (ease-out cubic)
                        const easeOut = 1 - Math.pow(1 - progress, 3);
                        const currentValue = endValue * easeOut;

                        if (isDecimal) {
                            el.textContent = prefix + currentValue.toFixed(1);
                        } else {
                            el.textContent = prefix + Math.floor(currentValue).toLocaleString();
                        }

                        if (progress < 1) {
                            requestAnimationFrame(updateCounter);
                        }
                    }

                    requestAnimationFrame(updateCounter);
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.5 });

        stats.forEach(stat => observer.observe(stat));
    }

    // ─── Init Animations ───
    function initAnimations() {
        animateStats();

        // Fade in elements on scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const fadeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    fadeObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.step, .testimonial, .athlete-card').forEach(el => {
            el.classList.add('fade-in');
            fadeObserver.observe(el);
        });
    }

    // ─── Modal System ───
    // Modal content builders using safe DOM methods
    function buildLoginModal() {
        const container = document.createElement('div');

        const header = document.createElement('div');
        header.className = 'modal-header';
        const h2 = document.createElement('h2');
        h2.textContent = 'Welcome Back';
        const p = document.createElement('p');
        p.textContent = 'Sign in to your GradeUp account';
        header.appendChild(h2);
        header.appendChild(p);

        const form = document.createElement('form');
        form.className = 'modal-form';
        form.addEventListener('submit', handleLogin);

        // Email field
        const emailGroup = createFormGroup('email', 'Email', 'email', 'you@university.edu', true);
        form.appendChild(emailGroup);

        // Password field
        const passGroup = createFormGroup('password', 'Password', 'password', '••••••••', true);
        form.appendChild(passGroup);

        // Options row
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'form-options';

        const checkLabel = document.createElement('label');
        checkLabel.className = 'checkbox';
        const checkInput = document.createElement('input');
        checkInput.type = 'checkbox';
        const checkSpan = document.createElement('span');
        checkSpan.textContent = 'Remember me';
        checkLabel.appendChild(checkInput);
        checkLabel.appendChild(checkSpan);

        const forgotLink = document.createElement('a');
        forgotLink.href = '#';
        forgotLink.textContent = 'Forgot password?';
        forgotLink.addEventListener('click', function(e) {
            e.preventDefault();
            showPasswordResetForm(container, form);
        });

        optionsDiv.appendChild(checkLabel);
        optionsDiv.appendChild(forgotLink);
        form.appendChild(optionsDiv);

        // Submit button
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'btn btn-primary btn-block';
        submitBtn.textContent = 'Sign In';
        form.appendChild(submitBtn);

        // Demo access section
        const demoSection = document.createElement('div');
        demoSection.className = 'demo-access';
        demoSection.style.cssText = 'margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--gray-800); text-align: center;';

        const demoLabel = document.createElement('p');
        demoLabel.style.cssText = 'font-size: 0.75rem; color: var(--gray-500); margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em;';
        demoLabel.textContent = 'Quick Demo Access';

        const demoButtons = document.createElement('div');
        demoButtons.style.cssText = 'display: flex; gap: 0.75rem;';

        const athleteDemo = document.createElement('a');
        athleteDemo.href = 'athlete-dashboard.html';
        athleteDemo.className = 'btn btn-outline';
        athleteDemo.style.cssText = 'flex: 1; font-size: 0.875rem;';
        athleteDemo.textContent = 'Athlete Demo';

        const brandDemo = document.createElement('a');
        brandDemo.href = 'brand-dashboard.html';
        brandDemo.className = 'btn btn-outline';
        brandDemo.style.cssText = 'flex: 1; font-size: 0.875rem;';
        brandDemo.textContent = 'Brand Demo';

        demoButtons.appendChild(athleteDemo);
        demoButtons.appendChild(brandDemo);
        demoSection.appendChild(demoLabel);
        demoSection.appendChild(demoButtons);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        const footerP = document.createElement('p');
        footerP.textContent = "Don't have an account? ";
        const signupLink = document.createElement('a');
        signupLink.href = '#';
        signupLink.textContent = 'Sign up';
        signupLink.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('signup');
        });
        footerP.appendChild(signupLink);
        footer.appendChild(footerP);

        container.appendChild(header);
        container.appendChild(form);
        container.appendChild(demoSection);
        container.appendChild(footer);

        return container;
    }

    // ─── Password Reset Form ───
    function showPasswordResetForm(container, loginForm) {
        // Hide the login form
        loginForm.style.display = 'none';

        // Find and hide demo section and footer if they exist
        const demoSection = container.querySelector('.demo-access');
        const footer = container.querySelector('.modal-footer');
        if (demoSection) demoSection.style.display = 'none';
        if (footer) footer.style.display = 'none';

        // Update header
        const header = container.querySelector('.modal-header');
        if (header) {
            const h2 = header.querySelector('h2');
            const p = header.querySelector('p');
            if (h2) h2.textContent = 'Reset Password';
            if (p) p.textContent = 'Enter your email to receive a password reset link';
        }

        // Create reset form
        const resetForm = document.createElement('form');
        resetForm.className = 'modal-form';
        resetForm.id = 'password-reset-form';

        // Email field
        const emailGroup = createFormGroup('resetEmail', 'Email Address', 'email', 'you@university.edu', true);
        resetForm.appendChild(emailGroup);

        // Submit button
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'btn btn-primary btn-block';
        submitBtn.textContent = 'Send Reset Link';
        resetForm.appendChild(submitBtn);

        // Back to login link
        const backLink = document.createElement('a');
        backLink.href = '#';
        backLink.className = 'back-to-login';
        backLink.style.cssText = 'display: block; text-align: center; margin-top: 1.5rem; color: var(--accent, #00f0ff); text-decoration: none; font-size: 0.875rem;';
        backLink.textContent = 'Back to Sign In';
        backLink.addEventListener('click', function(e) {
            e.preventDefault();
            // Restore login form
            resetForm.remove();
            backLink.remove();
            loginForm.style.display = '';
            if (demoSection) demoSection.style.display = '';
            if (footer) footer.style.display = '';
            // Restore header
            if (header) {
                const h2 = header.querySelector('h2');
                const p = header.querySelector('p');
                if (h2) h2.textContent = 'Welcome Back';
                if (p) p.textContent = 'Sign in to your GradeUp account';
            }
        });

        // Handle form submission
        resetForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const emailInput = document.getElementById('resetEmail');
            const email = emailInput ? emailInput.value.trim() : '';

            if (!email) {
                showAuthToast('Please enter your email address.');
                return;
            }

            if (typeof isValidEmail === 'function' && !isValidEmail(email)) {
                showAuthToast('Please enter a valid email address.');
                return;
            }

            // Show success message
            showAuthToast('Password reset link sent to ' + email + '! Check your inbox.');

            // Return to login form after short delay
            setTimeout(function() {
                backLink.click();
            }, 2000);
        });

        container.appendChild(resetForm);
        container.appendChild(backLink);

        // Focus the email input
        setTimeout(function() {
            var resetEmailInput = document.getElementById('resetEmail');
            if (resetEmailInput) resetEmailInput.focus();
        }, 100);
    }

    function buildSignupModal() {
        const container = document.createElement('div');

        const header = document.createElement('div');
        header.className = 'modal-header';
        const h2 = document.createElement('h2');
        h2.textContent = 'Join GradeUp';
        const p = document.createElement('p');
        p.textContent = 'Choose how you want to use GradeUp';
        header.appendChild(h2);
        header.appendChild(p);

        const options = document.createElement('div');
        options.className = 'signup-options';

        // Athlete option
        const athleteBtn = createSignupOption(
            'athlete',
            "I'm an Athlete",
            'Create your profile, get verified, and connect with brands',
            'athlete-signup'
        );
        options.appendChild(athleteBtn);

        // Brand option
        const brandBtn = createSignupOption(
            'brand',
            "I'm a Brand",
            'Find and partner with verified scholar-athletes',
            'brand-signup'
        );
        options.appendChild(brandBtn);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        const footerP = document.createElement('p');
        footerP.textContent = 'Already have an account? ';
        const loginLink = document.createElement('a');
        loginLink.href = '#';
        loginLink.textContent = 'Sign in';
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('login');
        });
        footerP.appendChild(loginLink);
        footer.appendChild(footerP);

        container.appendChild(header);
        container.appendChild(options);
        container.appendChild(footer);

        return container;
    }

    function buildAthleteSignupModal() {
        const container = document.createElement('div');

        const header = document.createElement('div');
        header.className = 'modal-header';
        const h2 = document.createElement('h2');
        h2.textContent = 'Athlete Sign Up';
        const p = document.createElement('p');
        p.textContent = 'Start your NIL journey today';
        header.appendChild(h2);
        header.appendChild(p);

        const form = document.createElement('form');
        form.className = 'modal-form';
        form.addEventListener('submit', handleAthleteSignup);

        // Name row
        const nameRow = document.createElement('div');
        nameRow.className = 'form-row';
        nameRow.appendChild(createFormGroup('firstName', 'First Name', 'text', 'Marcus', true));
        nameRow.appendChild(createFormGroup('lastName', 'Last Name', 'text', 'Johnson', true));
        form.appendChild(nameRow);

        // Email
        form.appendChild(createFormGroup('athleteEmail', 'School Email', 'email', 'you@university.edu', true));

        // School/Sport row
        const schoolRow = document.createElement('div');
        schoolRow.className = 'form-row';
        schoolRow.appendChild(createSelectGroup('school', 'School', [
            { value: '', label: 'Select school' },
            { value: 'duke', label: 'Duke University' },
            { value: 'stanford', label: 'Stanford University' },
            { value: 'alabama', label: 'University of Alabama' },
            { value: 'ohio-state', label: 'Ohio State University' },
            { value: 'ucla', label: 'UCLA' },
            { value: 'michigan', label: 'University of Michigan' },
            { value: 'other', label: 'Other' }
        ]));
        schoolRow.appendChild(createSelectGroup('sport', 'Sport', [
            { value: '', label: 'Select sport' },
            { value: 'football', label: 'Football' },
            { value: 'basketball', label: 'Basketball' },
            { value: 'soccer', label: 'Soccer' },
            { value: 'volleyball', label: 'Volleyball' },
            { value: 'tennis', label: 'Tennis' },
            { value: 'track', label: 'Track & Field' },
            { value: 'other', label: 'Other' }
        ]));
        form.appendChild(schoolRow);

        // Password
        const passGroup = createFormGroup('athletePassword', 'Password', 'password', '••••••••', true);
        passGroup.querySelector('input').minLength = 8;
        form.appendChild(passGroup);

        // Terms
        form.appendChild(createTermsCheckbox());

        // Submit
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'btn btn-primary btn-block';
        submitBtn.textContent = 'Create Account';
        form.appendChild(submitBtn);

        // SECURITY: Add CSRF token to form
        if (typeof addCSRFToForm === 'function') {
            addCSRFToForm(form);
        }

        // Footer
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        const footerP = document.createElement('p');
        footerP.textContent = 'Already have an account? ';
        const loginLink = document.createElement('a');
        loginLink.href = '#';
        loginLink.textContent = 'Sign in';
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('login');
        });
        footerP.appendChild(loginLink);
        footer.appendChild(footerP);

        container.appendChild(header);
        container.appendChild(form);
        container.appendChild(footer);

        return container;
    }

    function buildBrandSignupModal() {
        const container = document.createElement('div');

        const header = document.createElement('div');
        header.className = 'modal-header';
        const h2 = document.createElement('h2');
        h2.textContent = 'Brand Sign Up';
        const p = document.createElement('p');
        p.textContent = 'Partner with scholar-athletes';
        header.appendChild(h2);
        header.appendChild(p);

        const form = document.createElement('form');
        form.className = 'modal-form';
        form.addEventListener('submit', handleBrandSignup);

        // Company name
        form.appendChild(createFormGroup('companyName', 'Company Name', 'text', 'Your Company', true));

        // Name row
        const nameRow = document.createElement('div');
        nameRow.className = 'form-row';
        nameRow.appendChild(createFormGroup('brandFirstName', 'First Name', 'text', 'John', true));
        nameRow.appendChild(createFormGroup('brandLastName', 'Last Name', 'text', 'Doe', true));
        form.appendChild(nameRow);

        // Email
        form.appendChild(createFormGroup('brandEmail', 'Work Email', 'email', 'you@company.com', true));

        // Industry
        form.appendChild(createSelectGroup('industry', 'Industry', [
            { value: '', label: 'Select industry' },
            { value: 'sportswear', label: 'Sportswear & Apparel' },
            { value: 'food', label: 'Food & Beverage' },
            { value: 'tech', label: 'Technology' },
            { value: 'fitness', label: 'Fitness & Wellness' },
            { value: 'finance', label: 'Financial Services' },
            { value: 'retail', label: 'Retail' },
            { value: 'other', label: 'Other' }
        ]));

        // Password
        const passGroup = createFormGroup('brandPassword', 'Password', 'password', '••••••••', true);
        passGroup.querySelector('input').minLength = 8;
        form.appendChild(passGroup);

        // Terms
        form.appendChild(createTermsCheckbox());

        // Submit
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'btn btn-primary btn-block';
        submitBtn.textContent = 'Create Brand Account';
        form.appendChild(submitBtn);

        // SECURITY: Add CSRF token to form
        if (typeof addCSRFToForm === 'function') {
            addCSRFToForm(form);
        }

        // Footer
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        const footerP = document.createElement('p');
        footerP.textContent = 'Already have an account? ';
        const loginLink = document.createElement('a');
        loginLink.href = '#';
        loginLink.textContent = 'Sign in';
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('login');
        });
        footerP.appendChild(loginLink);
        footer.appendChild(footerP);

        container.appendChild(header);
        container.appendChild(form);
        container.appendChild(footer);

        return container;
    }

    // Helper functions for building forms
    function createFormGroup(id, labelText, type, placeholder, required) {
        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.htmlFor = id;
        label.textContent = labelText;

        const input = document.createElement('input');
        input.type = type;
        input.id = id;
        input.name = id; // Add name for FormData
        input.placeholder = placeholder;
        if (required) input.required = true;

        group.appendChild(label);
        group.appendChild(input);

        return group;
    }

    function createSelectGroup(id, labelText, options) {
        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.htmlFor = id;
        label.textContent = labelText;

        const select = document.createElement('select');
        select.id = id;
        select.name = id; // Add name for FormData
        select.required = true;

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            select.appendChild(option);
        });

        group.appendChild(label);
        group.appendChild(select);

        return group;
    }

    function createTermsCheckbox() {
        const terms = document.createElement('div');
        terms.className = 'form-terms';

        const label = document.createElement('label');
        label.className = 'checkbox';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.required = true;

        const span = document.createElement('span');
        span.textContent = 'I agree to the ';

        const termsLink = document.createElement('a');
        termsLink.href = '#';
        termsLink.textContent = 'Terms of Service';

        const andText = document.createTextNode(' and ');

        const privacyLink = document.createElement('a');
        privacyLink.href = '#';
        privacyLink.textContent = 'Privacy Policy';

        span.appendChild(termsLink);
        span.appendChild(andText);
        span.appendChild(privacyLink);

        label.appendChild(input);
        label.appendChild(span);
        terms.appendChild(label);

        return terms;
    }

    function createSignupOption(type, title, description, modalType) {
        const btn = document.createElement('button');
        btn.className = 'signup-option';
        btn.type = 'button';

        const iconDiv = document.createElement('div');
        iconDiv.className = 'option-icon';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '1.5');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        if (type === 'athlete') {
            path.setAttribute('d', 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z');
        } else {
            path.setAttribute('d', 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4');
        }
        svg.appendChild(path);
        iconDiv.appendChild(svg);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'option-content';
        const h3 = document.createElement('h3');
        h3.textContent = title;
        const p = document.createElement('p');
        p.textContent = description;
        contentDiv.appendChild(h3);
        contentDiv.appendChild(p);

        const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        arrowSvg.classList.add('option-arrow');
        arrowSvg.setAttribute('viewBox', '0 0 24 24');
        arrowSvg.setAttribute('fill', 'none');
        arrowSvg.setAttribute('stroke', 'currentColor');
        arrowSvg.setAttribute('stroke-width', '2');
        const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowPath.setAttribute('d', 'M9 5l7 7-7 7');
        arrowSvg.appendChild(arrowPath);

        btn.appendChild(iconDiv);
        btn.appendChild(contentDiv);
        btn.appendChild(arrowSvg);

        btn.addEventListener('click', () => openModal(modalType));

        return btn;
    }

    const modalBuilders = {
        'login': buildLoginModal,
        'signup': buildSignupModal,
        'athlete-signup': buildAthleteSignupModal,
        'brand-signup': buildBrandSignupModal
    };

    window.openModal = function(type) {
        const builder = modalBuilders[type];
        if (builder) {
            // Clear existing content
            while (modalContent.firstChild) {
                modalContent.removeChild(modalContent.firstChild);
            }

            // Build and append new content
            const content = builder();
            modalContent.appendChild(content);

            modalOverlay.classList.add('active');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Focus first input
            const firstInput = modal.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    };

    window.closeModal = function() {
        modalOverlay.classList.remove('active');
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    // Close modal on overlay click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            closeModal();
        }
    });

    // ─── Contact Athlete Modal ───
    window.showContactModal = function(athlete) {
        const backdrop = document.createElement('div');
        backdrop.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(8px); z-index: 1001; display: flex; align-items: center; justify-content: center; padding: 2rem;';

        const modalEl = document.createElement('div');
        modalEl.style.cssText = 'background: #171717; border: 1px solid #262626; border-radius: 20px; width: 100%; max-width: 500px;';

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 1.5rem; border-bottom: 1px solid #262626;';

        const title = document.createElement('h2');
        title.style.cssText = 'font-size: 1.25rem; font-weight: 800; color: white; margin: 0;';
        title.textContent = 'Contact ' + athlete.name;
        header.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'width: 36px; height: 36px; background: #262626; border: none; border-radius: 8px; color: #a3a3a3; cursor: pointer; font-size: 1rem;';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', function() { document.body.removeChild(backdrop); });
        header.appendChild(closeBtn);
        modalEl.appendChild(header);

        const body = document.createElement('div');
        body.style.cssText = 'padding: 1.5rem;';

        const subjectGroup = document.createElement('div');
        subjectGroup.style.cssText = 'margin-bottom: 1.25rem;';
        const subjectLabel = document.createElement('label');
        subjectLabel.style.cssText = 'display: block; font-size: 0.8125rem; font-weight: 600; color: white; margin-bottom: 0.5rem;';
        subjectLabel.textContent = 'Subject';
        subjectGroup.appendChild(subjectLabel);
        const subjectInput = document.createElement('input');
        subjectInput.type = 'text';
        subjectInput.placeholder = 'Partnership Inquiry';
        subjectInput.style.cssText = 'width: 100%; padding: 0.875rem 1rem; background: #262626; border: 1px solid #404040; border-radius: 10px; color: white; font-size: 0.9375rem;';
        subjectGroup.appendChild(subjectInput);
        body.appendChild(subjectGroup);

        const msgGroup = document.createElement('div');
        msgGroup.style.cssText = 'margin-bottom: 1.25rem;';
        const msgLabel = document.createElement('label');
        msgLabel.style.cssText = 'display: block; font-size: 0.8125rem; font-weight: 600; color: white; margin-bottom: 0.5rem;';
        msgLabel.textContent = 'Message';
        msgGroup.appendChild(msgLabel);
        const msgTextarea = document.createElement('textarea');
        msgTextarea.rows = 5;
        msgTextarea.placeholder = 'Hi ' + athlete.name.split(' ')[0] + ', I would love to discuss a partnership opportunity...';
        msgTextarea.style.cssText = 'width: 100%; padding: 0.875rem 1rem; background: #262626; border: 1px solid #404040; border-radius: 10px; color: white; font-size: 0.9375rem; resize: vertical; min-height: 120px;';
        msgGroup.appendChild(msgTextarea);
        body.appendChild(msgGroup);

        const sendBtn = document.createElement('button');
        sendBtn.style.cssText = 'width: 100%; padding: 0.875rem 1.5rem; background: #00f0ff; color: black; border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 600; text-transform: uppercase; cursor: pointer;';
        sendBtn.textContent = 'Send Message';
        sendBtn.addEventListener('click', function() {
            if (subjectInput.value && msgTextarea.value) {
                document.body.removeChild(backdrop);
                showAuthToast('Message sent to ' + athlete.name + '!', 'success');
            } else {
                showAuthToast('Please fill in all fields', 'error');
            }
        });
        body.appendChild(sendBtn);

        modalEl.appendChild(body);
        backdrop.appendChild(modalEl);
        backdrop.addEventListener('click', function(e) { if (e.target === backdrop) document.body.removeChild(backdrop); });
        document.body.appendChild(backdrop);
    };

    // ─── Athlete Modal ───
    window.openAthleteModal = function(id) {
        const athlete = athletesData.find(a => a.id === id);
        if (!athlete) return;

        // Clear existing content
        while (modalContent.firstChild) {
            modalContent.removeChild(modalContent.firstChild);
        }

        const container = document.createElement('div');
        container.className = 'athlete-modal';

        // Header
        const header = document.createElement('div');
        header.className = 'athlete-modal-header';

        const img = document.createElement('img');
        img.src = athlete.image;
        img.alt = athlete.name;
        img.className = 'athlete-modal-image';

        const info = document.createElement('div');
        info.className = 'athlete-modal-info';

        const school = document.createElement('div');
        school.className = 'athlete-modal-school';
        school.textContent = athlete.school.toUpperCase();

        const nameH2 = document.createElement('h2');
        nameH2.className = 'athlete-modal-name';
        nameH2.textContent = athlete.name + ' ';
        if (athlete.verified) {
            const badge = document.createElement('span');
            badge.className = 'verified-badge';
            badge.textContent = '✓';
            nameH2.appendChild(badge);
        }

        const sportP = document.createElement('p');
        sportP.className = 'athlete-modal-sport';
        sportP.textContent = `${athlete.sport} • ${athlete.position}`;

        // Education info - Major, Minor, Year
        const educationDiv = document.createElement('div');
        educationDiv.className = 'athlete-modal-education';

        const majorP = document.createElement('p');
        majorP.className = 'athlete-modal-major';
        let majorText = athlete.major;
        if (athlete.minor) {
            majorText += ` • Minor: ${athlete.minor}`;
        }
        majorP.textContent = majorText;

        const yearP = document.createElement('p');
        yearP.className = 'athlete-modal-year';
        let yearText = athlete.year;
        if (athlete.expectedGraduation) {
            yearText += ` • Class of ${athlete.expectedGraduation}`;
        }
        yearP.textContent = yearText;

        educationDiv.appendChild(majorP);
        educationDiv.appendChild(yearP);

        info.appendChild(school);
        info.appendChild(nameH2);
        info.appendChild(sportP);
        info.appendChild(educationDiv);

        header.appendChild(img);
        header.appendChild(info);

        // Stats
        const stats = document.createElement('div');
        stats.className = 'athlete-modal-stats';

        const statItems = [
            { value: athlete.gpa.toFixed(2), label: 'GPA' },
            { value: athlete.followers, label: 'Followers' },
            { value: athlete.verified ? 'Yes' : 'No', label: 'Verified' }
        ];

        statItems.forEach(item => {
            const statDiv = document.createElement('div');
            statDiv.className = 'stat-item';
            const valueSpan = document.createElement('span');
            valueSpan.className = 'stat-value';
            valueSpan.textContent = item.value;
            const labelSpan = document.createElement('span');
            labelSpan.className = 'stat-label';
            labelSpan.textContent = item.label;
            statDiv.appendChild(valueSpan);
            statDiv.appendChild(labelSpan);
            stats.appendChild(statDiv);
        });

        // Tags
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'athlete-modal-tags';
        athlete.tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag';
            tagSpan.textContent = tag;
            tagsDiv.appendChild(tagSpan);
        });

        // Actions
        const actions = document.createElement('div');
        actions.className = 'athlete-modal-actions';

        const contactBtn = document.createElement('button');
        contactBtn.className = 'btn btn-primary';
        contactBtn.textContent = 'Contact Athlete';
        contactBtn.addEventListener('click', () => {
            closeModal();
            showContactModal(athlete);
        });

        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn-outline';
        closeBtn.textContent = 'Close';
        closeBtn.addEventListener('click', closeModal);

        actions.appendChild(contactBtn);
        actions.appendChild(closeBtn);

        container.appendChild(header);
        container.appendChild(stats);
        container.appendChild(tagsDiv);
        container.appendChild(actions);

        modalContent.appendChild(container);

        modalOverlay.classList.add('active');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    // ─── Form Handlers ───
    function handleLogin(e) {
        e.preventDefault();
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const email = emailInput?.value?.trim() || '';
        const password = passwordInput?.value || '';
        const rememberMe = document.querySelector('.form-options input[type="checkbox"]');

        // Check rate limiting
        if (typeof checkRateLimit === 'function') {
            const rateLimited = checkRateLimit(email);
            if (rateLimited) {
                showAuthToast('Too many login attempts. Please wait ' + rateLimited + ' seconds.');
                return;
            }
        }

        // Validate email format
        if (typeof isValidEmail === 'function' && !isValidEmail(email)) {
            // Record failed attempt for rate limiting
            if (typeof recordLoginAttempt === 'function' && email) {
                recordLoginAttempt(email, false);
            }
            showAuthToast('Please enter a valid email address.');
            emailInput?.focus();
            return;
        }

        // Validate password (basic check for demo)
        if (!password || password.length < 1) {
            // Record failed attempt for rate limiting
            if (typeof recordLoginAttempt === 'function') {
                recordLoginAttempt(email, false);
            }
            showAuthToast('Please enter your password.');
            passwordInput?.focus();
            return;
        }

        // SECURITY: In production, password verification would happen server-side
        // For demo mode, we simulate success. In production, failed password
        // attempts should also be recorded: recordLoginAttempt(email, false);

        // Record successful login attempt (clears rate limit counter)
        if (typeof recordLoginAttempt === 'function') {
            recordLoginAttempt(email, true);
        }

        // Save login data to localStorage (no password stored!)
        const loginData = {
            email: email,
            lastLogin: new Date().toISOString(),
            rememberMe: rememberMe ? rememberMe.checked : false
        };
        localStorage.setItem('gradeup_user', JSON.stringify(loginData));

        // Add to email list for demo purposes
        saveEmailToList(email, 'login');

        showAuthToast('Welcome back! Redirecting...');
        closeModal();

        // Demo: redirect based on email domain hint
        setTimeout(function() {
            if (email.includes('brand') || email.includes('company') || email.includes('corp')) {
                window.location.href = 'brand-dashboard.html';
            } else {
                window.location.href = 'athlete-dashboard.html';
            }
        }, 1000);
    }

    function handleAthleteSignup(e) {
        e.preventDefault();

        // SECURITY: Validate CSRF token
        if (typeof validateFormCSRF === 'function') {
            if (!validateFormCSRF(e.target)) {
                showAuthToast('Security validation failed. Please refresh and try again.');
                return;
            }
        }

        // Capture form data using correct field IDs
        var firstName = document.getElementById('firstName')?.value?.trim() || '';
        var lastName = document.getElementById('lastName')?.value?.trim() || '';
        var email = document.getElementById('athleteEmail')?.value?.trim() || '';
        var school = document.getElementById('school')?.value || '';
        var sport = document.getElementById('sport')?.value || '';
        var password = document.getElementById('athletePassword')?.value || '';

        // Validate required fields
        if (!firstName || !lastName) {
            showAuthToast('Please enter your full name.');
            return;
        }

        // Validate email format
        if (typeof isValidEmail === 'function' && !isValidEmail(email)) {
            showAuthToast('Please enter a valid school email address.');
            document.getElementById('athleteEmail')?.focus();
            return;
        }

        // Validate password strength
        if (typeof validatePassword === 'function') {
            var passResult = validatePassword(password);
            if (!passResult.valid) {
                showAuthToast(passResult.errors[0]);
                document.getElementById('athletePassword')?.focus();
                return;
            }
        }

        // Validate selections
        if (!school) {
            showAuthToast('Please select your school.');
            return;
        }

        if (!sport) {
            showAuthToast('Please select your sport.');
            return;
        }

        const athleteData = {
            name: (firstName + ' ' + lastName).trim(),
            firstName: firstName,
            lastName: lastName,
            email: email,
            school: school,
            sport: sport,
            type: 'athlete',
            signupDate: new Date().toISOString()
        };

        // Save to localStorage (no password stored!)
        localStorage.setItem('gradeup_user', JSON.stringify(athleteData));
        saveEmailToList(athleteData.email, 'athlete-signup');

        showAuthToast('Account created! Setting up your dashboard...');
        closeModal();

        // Redirect to athlete dashboard
        setTimeout(function() {
            window.location.href = 'athlete-dashboard.html';
        }, 1500);
    }

    function handleBrandSignup(e) {
        e.preventDefault();

        // SECURITY: Validate CSRF token
        if (typeof validateFormCSRF === 'function') {
            if (!validateFormCSRF(e.target)) {
                showAuthToast('Security validation failed. Please refresh and try again.');
                return;
            }
        }

        // Capture form data using correct field IDs
        var companyName = document.getElementById('companyName')?.value?.trim() || '';
        var firstName = document.getElementById('brandFirstName')?.value?.trim() || '';
        var lastName = document.getElementById('brandLastName')?.value?.trim() || '';
        var email = document.getElementById('brandEmail')?.value?.trim() || '';
        var industry = document.getElementById('industry')?.value || '';
        var password = document.getElementById('brandPassword')?.value || '';

        // Validate required fields
        if (!companyName) {
            showAuthToast('Please enter your company name.');
            document.getElementById('companyName')?.focus();
            return;
        }

        if (!firstName || !lastName) {
            showAuthToast('Please enter your full name.');
            return;
        }

        // Validate email format
        if (typeof isValidEmail === 'function' && !isValidEmail(email)) {
            showAuthToast('Please enter a valid work email address.');
            document.getElementById('brandEmail')?.focus();
            return;
        }

        // Validate password strength
        if (typeof validatePassword === 'function') {
            var passResult = validatePassword(password);
            if (!passResult.valid) {
                showAuthToast(passResult.errors[0]);
                document.getElementById('brandPassword')?.focus();
                return;
            }
        }

        // Validate industry selection
        if (!industry) {
            showAuthToast('Please select your industry.');
            return;
        }

        const brandData = {
            name: (firstName + ' ' + lastName).trim(),
            firstName: firstName,
            lastName: lastName,
            email: email,
            company: companyName,
            industry: industry,
            type: 'brand',
            signupDate: new Date().toISOString()
        };

        // Save to localStorage (no password stored!)
        localStorage.setItem('gradeup_user', JSON.stringify(brandData));
        saveEmailToList(brandData.email, 'brand-signup');

        showAuthToast('Account created! Setting up your dashboard...');
        closeModal();

        // Redirect to brand dashboard
        setTimeout(function() {
            window.location.href = 'brand-dashboard.html';
        }, 1500);
    }

    // ─── Email Collection (Disabled for Security) ───
    // SECURITY: Email collection removed to prevent PII exposure
    // Storing emails in localStorage is insecure (XSS vulnerable, no consent)
    // Proper implementation requires:
    // 1. Backend API with database storage
    // 2. GDPR-compliant consent mechanism
    // 3. Encryption at rest
    // 4. Audit logging
    function saveEmailToList(email, source) {
        // Clear any previously stored email data (security cleanup)
        if (localStorage.getItem('gradeup_emails')) {
            localStorage.removeItem('gradeup_emails');
            console.warn('[Security] Cleared insecure email storage from localStorage');
        }
        // No-op: email collection disabled until backend implementation
        // To implement: send to secure backend API with user consent
        return;
    }

    // ─── Auth Toast Notification ───
    function showAuthToast(message) {
        var existingToast = document.querySelector('.auth-toast');
        if (existingToast) {
            existingToast.remove();
        }

        var toast = document.createElement('div');
        toast.className = 'auth-toast';
        toast.textContent = message;
        toast.style.cssText = 'position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%) translateY(20px); padding: 1rem 2rem; background: linear-gradient(135deg, #00f0ff, #00c0cc); color: #000; font-weight: 600; border-radius: 8px; opacity: 0; transition: all 0.3s ease; z-index: 10000;';
        document.body.appendChild(toast);

        setTimeout(function() {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);

        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(function() {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // ─── Footer Support Links ───
    function setupFooterLinks() {
        var helpCenterLink = document.getElementById('helpCenterLink');
        var privacyPolicyLink = document.getElementById('privacyPolicyLink');
        var termsOfServiceLink = document.getElementById('termsOfServiceLink');

        if (helpCenterLink) {
            helpCenterLink.addEventListener('click', function(e) {
                e.preventDefault();
                showInfoModal('Help Center', getHelpCenterContent());
            });
        }

        if (privacyPolicyLink) {
            privacyPolicyLink.addEventListener('click', function(e) {
                e.preventDefault();
                showInfoModal('Privacy Policy', getPrivacyPolicyContent());
            });
        }

        if (termsOfServiceLink) {
            termsOfServiceLink.addEventListener('click', function(e) {
                e.preventDefault();
                showInfoModal('Terms of Service', getTermsOfServiceContent());
            });
        }
    }

    function showInfoModal(title, content) {
        // Create backdrop
        var backdrop = document.createElement('div');
        backdrop.className = 'info-modal-backdrop';
        backdrop.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(8px); z-index: 1001; display: flex; align-items: center; justify-content: center; padding: 2rem; overflow-y: auto;';

        // Create modal
        var modalEl = document.createElement('div');
        modalEl.className = 'info-modal';
        modalEl.style.cssText = 'background: #171717; border: 1px solid #262626; border-radius: 20px; width: 100%; max-width: 700px; max-height: 80vh; display: flex; flex-direction: column;';

        // Header
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 1.5rem 2rem; border-bottom: 1px solid #262626; flex-shrink: 0;';

        var titleEl = document.createElement('h2');
        titleEl.style.cssText = 'font-size: 1.5rem; font-weight: 800; color: white; margin: 0;';
        titleEl.textContent = title;
        header.appendChild(titleEl);

        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'width: 40px; height: 40px; background: #262626; border: none; border-radius: 10px; color: #a3a3a3; cursor: pointer; font-size: 1.25rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s;';
        closeBtn.textContent = '\u00D7';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.addEventListener('click', function() {
            document.body.removeChild(backdrop);
            document.body.style.overflow = '';
        });
        closeBtn.addEventListener('mouseenter', function() {
            closeBtn.style.background = '#363636';
            closeBtn.style.color = 'white';
        });
        closeBtn.addEventListener('mouseleave', function() {
            closeBtn.style.background = '#262626';
            closeBtn.style.color = '#a3a3a3';
        });
        header.appendChild(closeBtn);
        modalEl.appendChild(header);

        // Body
        var body = document.createElement('div');
        body.style.cssText = 'padding: 2rem; overflow-y: auto; flex: 1; color: #d4d4d4; line-height: 1.7;';
        body.appendChild(content);
        modalEl.appendChild(body);

        backdrop.appendChild(modalEl);
        document.body.appendChild(backdrop);
        document.body.style.overflow = 'hidden';

        // Close on backdrop click
        backdrop.addEventListener('click', function(e) {
            if (e.target === backdrop) {
                document.body.removeChild(backdrop);
                document.body.style.overflow = '';
            }
        });

        // Close on escape
        var escHandler = function(e) {
            if (e.key === 'Escape') {
                document.body.removeChild(backdrop);
                document.body.style.overflow = '';
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    function getHelpCenterContent() {
        var container = document.createElement('div');

        var sections = [
            {
                title: 'Getting Started',
                items: [
                    'Create your account by clicking "Get Started" and selecting your role (Athlete or Brand)',
                    'Complete your profile with accurate information',
                    'For athletes: Submit your academic transcripts for GPA verification',
                    'Wait for verification approval (typically 24-48 hours)'
                ]
            },
            {
                title: 'For Athletes',
                items: [
                    'Keep your GPA updated each semester to maintain eligibility for deals',
                    'Respond promptly to brand inquiries to improve your ranking',
                    'Use professional photos and complete all profile sections',
                    'Track your earnings and deal history in your dashboard'
                ]
            },
            {
                title: 'For Brands',
                items: [
                    'Browse verified athletes using filters for sport, GPA, and school',
                    'Send deal proposals directly through the platform',
                    'Track campaign performance and ROI in real-time',
                    'All deals are NCAA-compliant when processed through GradeUp'
                ]
            },
            {
                title: 'Contact Support',
                items: [
                    'Email: support@gradeupnil.com',
                    'Response time: Within 24 hours',
                    'Phone support available for verified brand partners'
                ]
            }
        ];

        sections.forEach(function(section) {
            var sectionTitle = document.createElement('h3');
            sectionTitle.style.cssText = 'color: #00f0ff; font-size: 1.125rem; font-weight: 700; margin: 1.5rem 0 0.75rem 0;';
            sectionTitle.textContent = section.title;
            container.appendChild(sectionTitle);

            var list = document.createElement('ul');
            list.style.cssText = 'margin: 0; padding-left: 1.5rem;';
            section.items.forEach(function(item) {
                var li = document.createElement('li');
                li.style.cssText = 'margin-bottom: 0.5rem;';
                li.textContent = item;
                list.appendChild(li);
            });
            container.appendChild(list);
        });

        return container;
    }

    function getPrivacyPolicyContent() {
        var container = document.createElement('div');

        var intro = document.createElement('p');
        intro.style.cssText = 'margin-bottom: 1.5rem;';
        intro.textContent = 'Last updated: January 2025. Your privacy is important to us. This Privacy Policy explains how GradeUp NIL collects, uses, and protects your information.';
        container.appendChild(intro);

        var sections = [
            {
                title: 'Information We Collect',
                content: 'We collect information you provide directly, including name, email, school affiliation, sport, GPA, and profile photos. For brands, we collect company information and payment details.'
            },
            {
                title: 'How We Use Your Information',
                content: 'We use your information to: verify your identity and academic status, connect athletes with brand partners, process payments, improve our services, and communicate important updates.'
            },
            {
                title: 'Information Sharing',
                content: 'We share athlete profiles with registered brands on our platform. We do not sell your personal information to third parties. Academic records are only shared with your explicit consent.'
            },
            {
                title: 'Data Security',
                content: 'We implement industry-standard security measures including encryption, secure servers, and regular security audits to protect your personal information.'
            },
            {
                title: 'Your Rights',
                content: 'You have the right to access, update, or delete your personal information. You can control visibility settings for your profile and opt out of marketing communications at any time.'
            },
            {
                title: 'Contact Us',
                content: 'For privacy concerns or data requests, email: privacy@gradeupnil.com'
            }
        ];

        sections.forEach(function(section) {
            var sectionTitle = document.createElement('h3');
            sectionTitle.style.cssText = 'color: #00f0ff; font-size: 1.125rem; font-weight: 700; margin: 1.5rem 0 0.5rem 0;';
            sectionTitle.textContent = section.title;
            container.appendChild(sectionTitle);

            var para = document.createElement('p');
            para.style.cssText = 'margin: 0;';
            para.textContent = section.content;
            container.appendChild(para);
        });

        return container;
    }

    function getTermsOfServiceContent() {
        var container = document.createElement('div');

        var intro = document.createElement('p');
        intro.style.cssText = 'margin-bottom: 1.5rem;';
        intro.textContent = 'Last updated: January 2025. By using GradeUp NIL, you agree to these Terms of Service. Please read them carefully.';
        container.appendChild(intro);

        var sections = [
            {
                title: 'Eligibility',
                content: 'Athletes must be currently enrolled student-athletes at an NCAA-member institution. Brands must be legitimate businesses with valid contact information. All users must be 18 years or older.'
            },
            {
                title: 'Account Responsibilities',
                content: 'You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate, current, and complete information. Misrepresentation of GPA or athletic status will result in immediate account termination.'
            },
            {
                title: 'NCAA Compliance',
                content: 'All deals facilitated through GradeUp must comply with NCAA NIL regulations. Athletes are responsible for reporting earnings to their institutions as required. GradeUp provides tools to help maintain compliance but does not guarantee it.'
            },
            {
                title: 'Platform Fees',
                content: 'GradeUp charges a platform fee on completed deals. Fee structure is disclosed before any transaction. Athletes receive payments after deals are fulfilled and verified.'
            },
            {
                title: 'Content Guidelines',
                content: 'Users may not post inappropriate, offensive, or misleading content. Profile photos must be appropriate for professional use. All content must comply with applicable laws and regulations.'
            },
            {
                title: 'Termination',
                content: 'We reserve the right to suspend or terminate accounts that violate these terms. Users may delete their accounts at any time through account settings.'
            },
            {
                title: 'Contact',
                content: 'For questions about these terms, email: legal@gradeupnil.com'
            }
        ];

        sections.forEach(function(section) {
            var sectionTitle = document.createElement('h3');
            sectionTitle.style.cssText = 'color: #00f0ff; font-size: 1.125rem; font-weight: 700; margin: 1.5rem 0 0.5rem 0;';
            sectionTitle.textContent = section.title;
            container.appendChild(sectionTitle);

            var para = document.createElement('p');
            para.style.cssText = 'margin: 0;';
            para.textContent = section.content;
            container.appendChild(para);
        });

        return container;
    }

    // ─── Event Delegation for data-action Buttons ───
    // Handles all buttons with data-action attributes instead of inline onclick handlers
    function setupEventDelegation() {
        document.addEventListener('click', function(e) {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const param = target.dataset.param;
            const id = target.dataset.id;
            const actionType = target.dataset.actionType;
            const docType = target.dataset.docType;

            // Handle special compound actions
            if (action === 'openModalAndClose') {
                if (typeof window.openModal === 'function') {
                    window.openModal(param);
                }
                if (typeof window.closeMobileMenu === 'function') {
                    window.closeMobileMenu();
                }
                return;
            }

            // Handle actions with multiple parameters
            if (action === 'handleVerification' && id && actionType && docType) {
                if (typeof window.handleVerification === 'function') {
                    window.handleVerification(parseInt(id, 10), actionType, docType);
                }
                return;
            }

            if (action === 'previewDocument' && id && docType) {
                if (typeof window.previewDocument === 'function') {
                    window.previewDocument(parseInt(id, 10), docType);
                }
                return;
            }

            // Handle actions with single id parameter
            if (id && typeof window[action] === 'function') {
                window[action](parseInt(id, 10));
                return;
            }

            // Handle simple actions with optional param
            if (typeof window[action] === 'function') {
                window[action](param);
            }
        });
    }

    // ─── Initialize ───
    function init() {
        document.body.style.overflow = 'hidden';
        hideLoader();
        initNav();
        renderAthletes();
        setupFooterLinks();
        setupEventDelegation();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

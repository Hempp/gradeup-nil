// GradeUp NIL - Enhanced JavaScript Application

// ==================== DATA ====================
const athletesData = [
    { id: 1, name: "Jordan Williams", school: "Ohio State", sport: "football", position: "WR", gpa: 3.92, followers: "45K", raised: "$12K", sponsors: 8, photo: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&h=400&fit=crop&crop=face", highlights: 3, verified: false, enrollmentVerified: false, sportVerified: false, gradesVerified: false,
        dataValue: { valuation: 185000, change: 8.2, kineticScore: 82, socialScore: 75, scarcityScore: 71, performanceScore: 78, benchmarks: { position: 32, conference: 45, division: 28, nationalRank: 234 }, biometrics: { fortyYard: "4.48s", vertical: "38\"", benchReps: "18", height: "6'1\"" }, avgDeal: 2400, completedDeals: 5, rating: 4.7, responseTime: "3 hrs" }},
    { id: 2, name: "Sofia Martinez", school: "Stanford", sport: "soccer", position: "MF", gpa: 3.95, followers: "32K", raised: "$8.5K", sponsors: 5, photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face", highlights: 5, verified: true, enrollmentVerified: true, sportVerified: true, gradesVerified: true, verifiedDate: "Jan 10, 2026", verifiedBy: "Stanford Athletics",
        dataValue: { valuation: 142000, change: 15.3, kineticScore: 89, socialScore: 88, scarcityScore: 82, performanceScore: 85, benchmarks: { position: 56, conference: 72, division: 48, nationalRank: 156 }, biometrics: { fortyYard: "5.12s", vertical: "24\"", benchReps: "12", height: "5'7\"" }, avgDeal: 1800, completedDeals: 4, rating: 4.9, responseTime: "< 1 hr" }},
    { id: 3, name: "Darnell Thompson", school: "USC", sport: "track", position: "Sprinter", gpa: 3.78, followers: "28K", raised: "$15K", sponsors: 12, photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face", highlights: 2, verified: false, enrollmentVerified: false, sportVerified: false, gradesVerified: false,
        dataValue: { valuation: 198000, change: -2.4, kineticScore: 96, socialScore: 68, scarcityScore: 91, performanceScore: 94, benchmarks: { position: 78, conference: 85, division: 71, nationalRank: 89 }, biometrics: { fortyYard: "4.28s", vertical: "42\"", benchReps: "15", height: "6'0\"" }, avgDeal: 3100, completedDeals: 9, rating: 4.6, responseTime: "4 hrs" }},
    { id: 4, name: "Maya Chen", school: "Duke", sport: "basketball", position: "PG", gpa: 3.89, followers: "52K", raised: "$18K", sponsors: 9, photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face", highlights: 7, verified: true, enrollmentVerified: true, sportVerified: true, gradesVerified: true, verifiedDate: "Jan 8, 2026", verifiedBy: "Duke Athletics",
        dataValue: { valuation: 247500, change: 12.3, kineticScore: 87, socialScore: 92, scarcityScore: 78, performanceScore: 84, benchmarks: { position: 43, conference: 67, division: 38, nationalRank: 142 }, biometrics: { fortyYard: "4.42s", vertical: "36\"", benchReps: "22", height: "6'2\"" }, avgDeal: 3200, completedDeals: 8, rating: 4.9, responseTime: "< 2 hrs" }},
    { id: 5, name: "Marcus Johnson", school: "Alabama", sport: "football", position: "QB", gpa: 3.65, followers: "120K", raised: "$45K", sponsors: 15, photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face", highlights: 12, verified: true, enrollmentVerified: true, sportVerified: true, gradesVerified: true, verifiedDate: "Jan 5, 2026", verifiedBy: "Alabama Athletics",
        dataValue: { valuation: 485000, change: 18.7, kineticScore: 91, socialScore: 95, scarcityScore: 88, performanceScore: 93, benchmarks: { position: 82, conference: 89, division: 76, nationalRank: 45 }, biometrics: { fortyYard: "4.52s", vertical: "34\"", benchReps: "24", height: "6'4\"" }, avgDeal: 5800, completedDeals: 14, rating: 5.0, responseTime: "< 1 hr" }},
    { id: 6, name: "Emma Rodriguez", school: "UCLA", sport: "volleyball", position: "OH", gpa: 3.91, followers: "18K", raised: "$6K", sponsors: 4, photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face", highlights: 4, verified: true, enrollmentVerified: true, sportVerified: true, gradesVerified: false, verifiedDate: "Jan 12, 2026", verifiedBy: "UCLA Athletics",
        dataValue: { valuation: 98000, change: 5.6, kineticScore: 85, socialScore: 72, scarcityScore: 65, performanceScore: 81, benchmarks: { position: 28, conference: 42, division: 22, nationalRank: 312 }, biometrics: { fortyYard: "4.95s", vertical: "32\"", benchReps: "10", height: "6'1\"" }, avgDeal: 1500, completedDeals: 3, rating: 4.8, responseTime: "5 hrs" }},
    { id: 7, name: "Tyler Brooks", school: "Michigan", sport: "basketball", position: "SG", gpa: 3.72, followers: "38K", raised: "$11K", sponsors: 7, photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face", highlights: 6, verified: false, enrollmentVerified: false, sportVerified: false, gradesVerified: false,
        dataValue: { valuation: 175000, change: 9.1, kineticScore: 83, socialScore: 79, scarcityScore: 74, performanceScore: 80, benchmarks: { position: 38, conference: 51, division: 35, nationalRank: 198 }, biometrics: { fortyYard: "4.55s", vertical: "40\"", benchReps: "16", height: "6'5\"" }, avgDeal: 2200, completedDeals: 6, rating: 4.5, responseTime: "3 hrs" }},
    { id: 8, name: "Jasmine Williams", school: "Stanford", sport: "track", position: "Jumper", gpa: 3.97, followers: "22K", raised: "$9K", sponsors: 6, photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face", highlights: 3, verified: true, enrollmentVerified: true, sportVerified: true, gradesVerified: true, verifiedDate: "Jan 11, 2026", verifiedBy: "Stanford Athletics",
        dataValue: { valuation: 156000, change: 11.4, kineticScore: 94, socialScore: 76, scarcityScore: 86, performanceScore: 91, benchmarks: { position: 68, conference: 78, division: 62, nationalRank: 112 }, biometrics: { fortyYard: "4.85s", vertical: "28\"", benchReps: "8", height: "5'9\"" }, avgDeal: 2000, completedDeals: 5, rating: 4.9, responseTime: "< 2 hrs" }},
    { id: 9, name: "Chris Anderson", school: "Ohio State", sport: "football", position: "RB", gpa: 3.54, followers: "85K", raised: "$32K", sponsors: 11, photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face", highlights: 8, verified: false, enrollmentVerified: false, sportVerified: false, gradesVerified: false,
        dataValue: { valuation: 325000, change: 14.2, kineticScore: 88, socialScore: 86, scarcityScore: 79, performanceScore: 87, benchmarks: { position: 52, conference: 64, division: 48, nationalRank: 98 }, biometrics: { fortyYard: "4.38s", vertical: "39\"", benchReps: "28", height: "5'11\"" }, avgDeal: 4200, completedDeals: 10, rating: 4.7, responseTime: "< 3 hrs" }},
];

const testimonialsData = [
    { name: "Sarah Mitchell", school: "UCLA Volleyball", avatar: "🏐", content: "GradeUp completely changed my college experience. I've been able to fund my training equipment and connect with brands that value my academic achievements.", raised: "$12,500", sponsors: 6 },
    { name: "James Carter", school: "Duke Basketball", avatar: "🏀", content: "As a student-athlete with a 3.9 GPA, I finally found a platform that rewards my work in the classroom. The blockchain payments are instant and hassle-free.", raised: "$28,000", sponsors: 12 },
    { name: "Maria Santos", school: "Stanford Soccer", avatar: "⚽", content: "The brand partnerships I've secured through GradeUp have been incredible. They actually care about my academic performance, not just my sports stats.", raised: "$15,200", sponsors: 8 },
    { name: "Derek Williams", school: "Alabama Football", avatar: "🏈", content: "I was able to upload my game highlights and academic achievements in one place. Sponsors love seeing the complete picture of who I am.", raised: "$42,000", sponsors: 15 },
    { name: "Ashley Park", school: "USC Track", avatar: "🏃", content: "The crypto donation feature is amazing. My international supporters can now easily contribute to my training fund without huge fees.", raised: "$8,900", sponsors: 5 },
];

let displayedAthletes = 6;
let currentTestimonial = 0;
let selectedDonationAmount = 100;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initLoader();
    initNavbar();
    initParticles();
    initCounters();
    initAthletes();
    initTestimonials();
    initPaymentOptions();
    initScrollAnimations();
    initGPARing();
});

// ==================== LOADER ====================
function initLoader() {
    const loader = document.getElementById('loader');
    setTimeout(() => {
        loader.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }, 1800);
}

// ==================== NAVBAR ====================
function initNavbar() {
    const navbar = document.getElementById('navbar');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    mobileMenuBtn?.addEventListener('click', () => {
        mobileMenuBtn.classList.toggle('active');
        mobileMenu.classList.toggle('active');
    });
}

function closeMobileMenu() {
    document.getElementById('mobileMenuBtn')?.classList.remove('active');
    document.getElementById('mobileMenu')?.classList.remove('active');
}

// ==================== PARTICLES ====================
function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.animationDuration = (8 + Math.random() * 4) + 's';
        container.appendChild(particle);
    }
}

// ==================== COUNTERS ====================
function initCounters() {
    const counters = document.querySelectorAll('.stat-value[data-count]');
    const options = { threshold: 0.5 };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, options);

    counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element) {
    const target = parseFloat(element.dataset.count);
    const isDecimal = element.dataset.decimal === 'true';
    const isCurrency = target >= 1000000;
    const duration = 2000;
    const start = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = target * easeOut;

        if (isCurrency) {
            element.textContent = '$' + (current / 1000000).toFixed(1) + 'M+';
        } else if (isDecimal) {
            element.textContent = current.toFixed(1);
        } else if (target >= 1000) {
            element.textContent = Math.floor(current).toLocaleString() + '+';
        } else {
            element.textContent = Math.floor(current);
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ==================== GPA RING ====================
function initGPARing() {
    const ring = document.getElementById('gpaRing');
    if (!ring) return;

    const gpa = 3.87;
    const maxGpa = 4.0;
    const percentage = (gpa / maxGpa) * 100;
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percentage / 100) * circumference;

    setTimeout(() => {
        ring.style.strokeDashoffset = offset;
    }, 500);
}

// ==================== ATHLETES ====================
function initAthletes() {
    renderAthletes();
}

function renderAthletes() {
    const grid = document.getElementById('athletesGrid');
    if (!grid) return;

    const filteredAthletes = filterAthletesData();
    const athletesToShow = filteredAthletes.slice(0, displayedAthletes);

    grid.innerHTML = athletesToShow.map(athlete => createAthleteCard(athlete)).join('');

    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = displayedAthletes >= filteredAthletes.length ? 'none' : 'inline-block';
    }
}

function createAthleteCard(athlete) {
    const verificationBadges = `
        <div class="verification-badges">
            ${athlete.verified ? '<span class="verified-badge-card" title="Verified by Athletic Director">✓ Verified</span>' : '<span class="unverified-badge-card">Pending Verification</span>'}
            ${athlete.enrollmentVerified ? '<span class="enrollment-badge-card" title="Enrollment confirmed">📋 Enrolled</span>' : ''}
            ${athlete.sportVerified ? '<span class="sport-badge-card" title="Sport/team verified">🏆 Roster Confirmed</span>' : ''}
            ${athlete.gradesVerified ? '<span class="grades-badge-card" title="Grades verified by school">📚 Grades Verified</span>' : ''}
        </div>
    `;

    return `
        <div class="athlete-showcase-card ${athlete.verified ? 'verified' : ''}" data-sport="${athlete.sport}" data-gpa="${athlete.gpa}" data-school="${athlete.school.toLowerCase().replace(' ', '-')}">
            <div class="athlete-image">
                <img src="${athlete.photo}" alt="${athlete.name}" class="athlete-photo">
                <span class="sport-tag">${capitalizeFirst(athlete.sport)}</span>
                ${athlete.highlights > 0 ? `<span class="highlights-badge">🎬 ${athlete.highlights} Highlights</span>` : ''}
                ${athlete.verified ? '<span class="verified-overlay">✓</span>' : ''}
            </div>
            <div class="athlete-showcase-content">
                <div class="athlete-showcase-header">
                    <div>
                        <h3>${athlete.name} ${athlete.verified ? '<span class="verified-check-inline">✓</span>' : ''}</h3>
                        <p>${athlete.school} • ${athlete.position}</p>
                    </div>
                    <span class="gpa-badge ${athlete.gradesVerified ? 'verified' : ''}">${athlete.gpa.toFixed(2)} GPA ${athlete.gradesVerified ? '✓' : ''}</span>
                </div>
                ${verificationBadges}
                <div class="athlete-stats-row">
                    <div class="athlete-stat">
                        <div class="athlete-stat-value">${athlete.followers}</div>
                        <div class="athlete-stat-label">Followers</div>
                    </div>
                    <div class="athlete-stat">
                        <div class="athlete-stat-value">${athlete.raised}</div>
                        <div class="athlete-stat-label">Raised</div>
                    </div>
                    <div class="athlete-stat">
                        <div class="athlete-stat-value">${athlete.sponsors}</div>
                        <div class="athlete-stat-label">Sponsors</div>
                    </div>
                </div>
                <div class="athlete-actions">
                    <button class="btn btn-profile" onclick="openAthleteProfile(${athlete.id})">View Profile</button>
                    <button class="btn btn-donate" onclick="openDonateModal('${athlete.name}')">Donate</button>
                    <button class="btn btn-sponsor" onclick="openSponsorModal('${athlete.name}')">Sponsor</button>
                </div>
            </div>
        </div>
    `;
}

function filterAthletesData() {
    const searchTerm = document.getElementById('athleteSearch')?.value.toLowerCase() || '';
    const sportFilter = document.getElementById('sportFilter')?.value || '';
    const gpaFilter = parseFloat(document.getElementById('gpaFilter')?.value) || 0;
    const schoolFilter = document.getElementById('schoolFilter')?.value || '';

    return athletesData.filter(athlete => {
        const matchesSearch = athlete.name.toLowerCase().includes(searchTerm) ||
                             athlete.school.toLowerCase().includes(searchTerm);
        const matchesSport = !sportFilter || athlete.sport === sportFilter;
        const matchesGpa = athlete.gpa >= gpaFilter;
        const matchesSchool = !schoolFilter || athlete.school.toLowerCase().replace(' ', '-') === schoolFilter;

        return matchesSearch && matchesSport && matchesGpa && matchesSchool;
    });
}

function filterAthletes() {
    displayedAthletes = 6;
    renderAthletes();
}

function loadMoreAthletes() {
    displayedAthletes += 3;
    renderAthletes();
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==================== TESTIMONIALS ====================
function initTestimonials() {
    const track = document.getElementById('testimonialTrack');
    const dotsContainer = document.getElementById('carouselDots');
    if (!track || !dotsContainer) return;

    track.innerHTML = testimonialsData.map(t => createTestimonialCard(t)).join('');

    dotsContainer.innerHTML = testimonialsData.map((_, i) =>
        `<div class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="goToTestimonial(${i})"></div>`
    ).join('');

    updateCarousel();
}

function createTestimonialCard(testimonial) {
    return `
        <div class="testimonial-card">
            <div class="testimonial-header">
                <div class="testimonial-avatar">${testimonial.avatar}</div>
                <div class="testimonial-info">
                    <h4>${testimonial.name}</h4>
                    <p>${testimonial.school}</p>
                </div>
            </div>
            <p class="testimonial-content">"${testimonial.content}"</p>
            <div class="testimonial-stats">
                <div class="testimonial-stat">
                    <span>${testimonial.raised}</span>
                    <span>Total Raised</span>
                </div>
                <div class="testimonial-stat">
                    <span>${testimonial.sponsors}</span>
                    <span>Sponsors</span>
                </div>
            </div>
        </div>
    `;
}

function moveCarousel(direction) {
    currentTestimonial += direction;
    if (currentTestimonial < 0) currentTestimonial = testimonialsData.length - 1;
    if (currentTestimonial >= testimonialsData.length) currentTestimonial = 0;
    updateCarousel();
}

function goToTestimonial(index) {
    currentTestimonial = index;
    updateCarousel();
}

function updateCarousel() {
    const track = document.getElementById('testimonialTrack');
    const dots = document.querySelectorAll('.carousel-dot');
    if (!track) return;

    const cardWidth = window.innerWidth <= 768 ? 100 : 33.333;
    track.style.transform = `translateX(-${currentTestimonial * cardWidth}%)`;

    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentTestimonial);
    });
}

// ==================== MODALS ====================
function openModal(modalId) {
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function switchModal(fromModal, toModal) {
    closeModal(fromModal);
    setTimeout(() => openModal(toModal), 300);
}

function openDonateModal(athleteName) {
    openModal('donateModal');
    showToast(`Supporting ${athleteName}`, 'success');
}

function openSponsorModal(athleteName) {
    showToast(`Sponsorship inquiry for ${athleteName} - Coming soon!`, 'success');
}

// ==================== DONATIONS ====================
function selectAmount(amount) {
    selectedDonationAmount = amount;
    document.querySelectorAll('.amount-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('customAmount').value = '';
    updateDonationTotal();
}

function updateDonationTotal() {
    const customAmount = document.getElementById('customAmount')?.value;
    const total = customAmount ? parseFloat(customAmount) : selectedDonationAmount;
    const displayTotal = total || selectedDonationAmount;

    // Update all donation total displays
    const donationTotal = document.getElementById('donationTotal');
    const summaryAmount = document.getElementById('summaryAmount');
    const taxSavings = document.getElementById('taxSavings');

    if (donationTotal) donationTotal.textContent = displayTotal;
    if (summaryAmount) summaryAmount.textContent = displayTotal;

    // Calculate estimated tax savings (25% bracket estimate)
    if (taxSavings) {
        const estimatedSavings = Math.round(displayTotal * 0.25);
        taxSavings.textContent = estimatedSavings;
    }
}

function initPaymentOptions() {
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            option.querySelector('input').checked = true;
        });
    });

    document.querySelectorAll('.donor-type-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.donor-type-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            option.querySelector('input').checked = true;

            // Show/hide business tax info
            const isBusiness = option.querySelector('input').value === 'business';
            const businessInfo = document.getElementById('businessTaxInfo');
            if (businessInfo) {
                businessInfo.style.display = isBusiness ? 'block' : 'none';
            }
        });
    });

    document.getElementById('customAmount')?.addEventListener('input', () => {
        document.querySelectorAll('.amount-btn').forEach(btn => btn.classList.remove('active'));
        updateDonationTotal();
    });
}

function processDonation() {
    const amount = document.getElementById('donationTotal').textContent;
    showToast(`Processing $${amount} donation...`, 'success');
    setTimeout(() => {
        closeModal('donateModal');
        showToast('Donation successful! Thank you for your support.', 'success');

        // Unlock grades for the current athlete if viewing profile
        unlockGradesAfterDonation();
    }, 1500);
}

// ==================== FORMS ====================
function handleLogin(e) {
    e.preventDefault();
    showToast('Logging in...', 'success');
    setTimeout(() => {
        closeModal('loginModal');
        showToast('Welcome back!', 'success');
    }, 1000);
}

function handleSignup(e) {
    e.preventDefault();
    showToast('Creating your account...', 'success');
    setTimeout(() => {
        closeModal('signupModal');
        showToast('Account created! Check your email to verify.', 'success');
    }, 1500);
}

function selectSignupType(type) {
    document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

// ==================== PRICING ====================
function togglePricing() {
    const isAnnual = document.getElementById('pricingToggle').checked;
    document.querySelectorAll('.pricing-price .amount').forEach(el => {
        const monthly = el.dataset.monthly;
        const annual = el.dataset.annual;
        el.textContent = isAnnual ? annual : monthly;
    });
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✓' : '!'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== SCROLL ANIMATIONS ====================
function initScrollAnimations() {
    const elements = document.querySelectorAll('[data-aos]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.aosDelay || 0;
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, delay);
            }
        });
    }, { threshold: 0.1 });

    elements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// ==================== SMOOTH SCROLL ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ==================== KEYBOARD NAVIGATION ====================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAllModals();
        closeMobileMenu();
    }
});

// ==================== RESIZE HANDLER ====================
window.addEventListener('resize', () => {
    updateCarousel();
});

// ==================== HIGHLIGHTS UPLOAD ====================
let uploadedFiles = [];

function initHighlightsUpload() {
    const uploadZone = document.getElementById('uploadZone');
    if (!uploadZone) return;

    // Drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => uploadZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => uploadZone.classList.remove('dragover'), false);
    });

    uploadZone.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleHighlightUpload(event) {
    const files = event.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/mov'];
    const maxSize = 500 * 1024 * 1024; // 500MB

    [...files].forEach(file => {
        if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|webm)$/i)) {
            showToast(`Invalid file type: ${file.name}. Please upload MP4, MOV, or WebM files.`, 'error');
            return;
        }

        if (file.size > maxSize) {
            showToast(`File too large: ${file.name}. Maximum size is 500MB.`, 'error');
            return;
        }

        uploadedFiles.push(file);
        addPreviewItem(file);
    });

    if (uploadedFiles.length > 0) {
        document.getElementById('highlightForm').style.display = 'block';
        simulateUploadProgress();
    }
}

function addPreviewItem(file) {
    const preview = document.getElementById('uploadPreview');
    const fileSize = (file.size / (1024 * 1024)).toFixed(1);
    const id = 'preview-' + Date.now();

    const html = `
        <div class="preview-item" id="${id}">
            <div class="preview-thumbnail">🎬</div>
            <div class="preview-info">
                <h5>${file.name}</h5>
                <p>${fileSize} MB</p>
                <div class="preview-progress">
                    <div class="preview-progress-bar" id="progress-${id}"></div>
                </div>
            </div>
            <button class="preview-remove" onclick="removePreviewItem('${id}')">&times;</button>
        </div>
    `;

    preview.insertAdjacentHTML('beforeend', html);
}

function removePreviewItem(id) {
    const item = document.getElementById(id);
    if (item) {
        item.remove();
        uploadedFiles = uploadedFiles.filter((_, i) => `preview-${i}` !== id);
    }

    if (uploadedFiles.length === 0) {
        document.getElementById('highlightForm').style.display = 'none';
    }
}

function simulateUploadProgress() {
    const progressBars = document.querySelectorAll('.preview-progress-bar');
    progressBars.forEach(bar => {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            bar.style.width = progress + '%';
        }, 200);
    });
}

function cancelUpload() {
    uploadedFiles = [];
    document.getElementById('uploadPreview').innerHTML = '';
    document.getElementById('highlightForm').style.display = 'none';
    document.getElementById('highlightInput').value = '';
}

function submitHighlight() {
    const title = document.getElementById('highlightTitle').value;
    const category = document.getElementById('highlightCategory').value;

    if (!title) {
        showToast('Please enter a title for your highlight', 'error');
        return;
    }

    if (uploadedFiles.length === 0) {
        showToast('Please select a video to upload', 'error');
        return;
    }

    showToast('Uploading highlight...', 'success');

    // Simulate upload
    setTimeout(() => {
        showToast('Highlight uploaded successfully!', 'success');
        cancelUpload();

        // Add new highlight to grid
        const grid = document.getElementById('highlightsGrid');
        const addNew = grid.querySelector('.add-new');

        const newHighlight = document.createElement('div');
        newHighlight.className = 'highlight-card';
        newHighlight.innerHTML = `
            <div class="highlight-thumbnail">
                <span>🎬</span>
                <div class="play-overlay">▶</div>
                <span class="highlight-duration">0:00</span>
            </div>
            <div class="highlight-info">
                <h5>${title}</h5>
                <p>${capitalizeFirst(category)} • Just now</p>
            </div>
        `;

        grid.insertBefore(newHighlight, addNew);
    }, 2000);
}

// ==================== DASHBOARD TABS ====================
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(tabName)) {
            btn.classList.add('active');
        }
    });

    // Hide all tab content sections
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });

    // Show the selected tab content
    const selectedContent = document.getElementById(tabName + 'Content');
    if (selectedContent) {
        selectedContent.style.display = 'block';
    }

    // Update content based on tab
    switch(tabName) {
        case 'highlights':
            openModal('highlightsModal');
            closeModal('athleteDashboardModal');
            break;
        case 'earnings':
            showToast('Earnings dashboard coming soon!', 'success');
            break;
        case 'campaigns':
            showToast('Campaigns view coming soon!', 'success');
            break;
        case 'grades':
            // Show grades tab - this is the athlete's own grades view
            showOwnGrades();
            break;
        default:
            // Profile tab - already showing
            break;
    }
}

function showOwnGrades() {
    // For the athlete's own dashboard, they can always see their grades
    const gradesContent = document.getElementById('myGradesContent');
    if (gradesContent) {
        gradesContent.style.display = 'block';
    }
}

// Initialize highlights upload on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initHighlightsUpload();
    initProfilePicture();
    initInvestorStatus();
});

// ==================== PROFILE PICTURE ====================
let selectedAvatar = { type: 'emoji', value: '🏀' };

function initProfilePicture() {
    const avatarUploadZone = document.getElementById('avatarUploadZone');
    if (!avatarUploadZone) return;

    // Drag and drop for avatar
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        avatarUploadZone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        avatarUploadZone.addEventListener(eventName, () => avatarUploadZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        avatarUploadZone.addEventListener(eventName, () => avatarUploadZone.classList.remove('dragover'), false);
    });

    avatarUploadZone.addEventListener('drop', handleAvatarDrop, false);

    // Load saved avatar
    const savedAvatar = localStorage.getItem('athleteAvatar');
    if (savedAvatar) {
        selectedAvatar = JSON.parse(savedAvatar);
        updateAvatarDisplay();
    }
}

function handleAvatarDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        processAvatarFile(files[0]);
    }
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (file) {
        processAvatarFile(file);
    }
}

function processAvatarFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
        showToast('Invalid file type. Please upload JPG, PNG, GIF, or WebP.', 'error');
        return;
    }

    if (file.size > maxSize) {
        showToast('File too large. Maximum size is 5MB.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        selectedAvatar = { type: 'image', value: e.target.result };
        updateAvatarPreview();
        showToast('Image uploaded! Click Save to apply.', 'success');
    };
    reader.readAsDataURL(file);
}

function selectEmojiAvatar(emoji) {
    selectedAvatar = { type: 'emoji', value: emoji };
    updateAvatarPreview();

    // Update button states
    document.querySelectorAll('.emoji-avatar-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === emoji) {
            btn.classList.add('active');
        }
    });
}

function updateAvatarPreview() {
    const previewImg = document.getElementById('avatarPreviewImg');
    const previewEmoji = document.getElementById('avatarPreviewEmoji');

    if (selectedAvatar.type === 'image') {
        previewImg.src = selectedAvatar.value;
        previewImg.style.display = 'block';
        previewEmoji.style.display = 'none';
    } else {
        previewImg.style.display = 'none';
        previewEmoji.style.display = 'flex';
        previewEmoji.textContent = selectedAvatar.value;
    }
}

function updateAvatarDisplay() {
    // Update dashboard avatar
    const dashboardAvatar = document.querySelector('.dashboard-avatar');
    if (dashboardAvatar) {
        if (selectedAvatar.type === 'image') {
            dashboardAvatar.innerHTML = `<img src="${selectedAvatar.value}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            dashboardAvatar.innerHTML = selectedAvatar.value;
        }
    }

    // Update preview
    updateAvatarPreview();
}

function saveProfilePicture() {
    localStorage.setItem('athleteAvatar', JSON.stringify(selectedAvatar));
    updateAvatarDisplay();
    closeModal('profilePictureModal');
    showToast('Profile picture updated!', 'success');
}

function openProfilePictureModal() {
    openModal('profilePictureModal');
    updateAvatarPreview();
}

// ==================== ATHLETE PROFILE VIEW ====================
let currentViewingAthlete = null;

function openAthleteProfile(athleteId) {
    console.log('Opening profile for athlete ID:', athleteId);

    try {
        const athlete = athletesData.find(a => a.id === athleteId);
        if (!athlete) {
            console.error('Athlete not found with ID:', athleteId);
            showToast('Athlete not found', 'error');
            return;
        }

        console.log('Found athlete:', athlete.name);
        currentViewingAthlete = athlete;

    // Populate profile data
    const profileAvatar = document.getElementById('profileViewAvatar');
    const profileName = document.getElementById('profileAthleteName');
    const profileSchool = document.getElementById('profileAthleteSchool');
    const profileFollowers = document.getElementById('profileFollowers');
    const profileRaised = document.getElementById('profileRaised');
    const profileSponsors = document.getElementById('profileSponsors');
    const profileGPA = document.getElementById('profileGPA');
    const profileHighlights = document.getElementById('profileHighlightsGrid');

    if (profileAvatar) {
        profileAvatar.src = athlete.photo;
        profileAvatar.alt = athlete.name;
    }
    if (profileName) profileName.textContent = athlete.name;
    if (profileSchool) profileSchool.textContent = `${athlete.school} • ${athlete.sport.charAt(0).toUpperCase() + athlete.sport.slice(1)} • ${athlete.position}`;
    if (profileFollowers) profileFollowers.textContent = athlete.followers;
    if (profileRaised) profileRaised.textContent = athlete.raised;
    if (profileSponsors) profileSponsors.textContent = athlete.sponsors;

    // Update highlights count
    const profileHighlightsCount = document.getElementById('profileHighlightsCount');
    if (profileHighlightsCount) profileHighlightsCount.textContent = athlete.highlights;

    // Update GPA in grades section
    if (profileGPA) profileGPA.textContent = athlete.gpa.toFixed(2);

    // Update GPA ring
    const gpaRing = document.getElementById('profileGpaRing');
    if (gpaRing) {
        const percentage = (athlete.gpa / 4.0) * 100;
        const circumference = 2 * Math.PI * 45;
        const offset = circumference - (percentage / 100) * circumference;
        gpaRing.style.strokeDashoffset = offset;
    }

    // Generate highlights grid with dynamic content
    if (profileHighlights) {
        const sportEmojis = {
            basketball: '🏀',
            football: '🏈',
            soccer: '⚽',
            baseball: '⚾',
            volleyball: '🏐',
            tennis: '🎾',
            swimming: '🏊',
            track: '🏃',
            golf: '⛳',
            softball: '🥎'
        };
        const sportIcon = sportEmojis[athlete.sport] || '🏆';

        const highlightTitles = {
            basketball: ['Game-Winning Three', 'Slam Dunk Highlights', 'Defensive Clinic', 'Buzzer Beater vs Rivals', 'Training Day', 'Season Best Plays'],
            football: ['Touchdown Run', 'Game-Changing INT', 'Highlight Reel', '4th Quarter Drive', 'Spring Training', 'Season Highlights'],
            soccer: ['Goal of the Week', 'Assist Master', 'Penalty Save', 'Hat Trick Game', 'Skills Showcase', 'Championship Game'],
            default: ['Best Plays', 'Training Session', 'Competition Highlights', 'Personal Best', 'Team Win', 'Season Recap']
        };

        const titles = highlightTitles[athlete.sport] || highlightTitles.default;
        const views = ['25K', '18K', '12K', '8.5K', '5.2K', '3.1K'];
        const times = ['3 days ago', '1 week ago', '2 weeks ago', '3 weeks ago', '1 month ago', '2 months ago'];
        const durations = ['2:34', '1:45', '3:12', '0:58', '2:15', '1:30'];

        let highlightsHTML = '';
        const highlightCount = Math.min(athlete.highlights, 6);

        for (let i = 0; i < highlightCount; i++) {
            highlightsHTML += `
                <div class="profile-highlight-card">
                    <div class="highlight-video">
                        <span class="video-icon">${i === 1 ? '🏆' : (i === 2 ? '💪' : sportIcon)}</span>
                        <div class="play-btn">▶</div>
                        <span class="video-duration">${durations[i]}</span>
                    </div>
                    <div class="highlight-details">
                        <h5>${titles[i]}</h5>
                        <p>${views[i]} views • ${times[i]}</p>
                    </div>
                </div>
            `;
        }

        if (athlete.highlights === 0) {
            highlightsHTML = `
                <div class="no-highlights-message" style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🎬</div>
                    <p style="color: var(--text-muted);">No highlights uploaded yet</p>
                    <button class="btn btn-outline-sm" style="margin-top: 1rem;">Upload First Highlight</button>
                </div>
            `;
        }

        profileHighlights.innerHTML = highlightsHTML;
    }

    // Populate Data Value section
    populateDataValue(athlete);

    // Update social feed with athlete info
    updateSocialFeed(athlete);

    // Check investor status for grades visibility
    updateGradesVisibility(athleteId);

    openModal('athleteProfileModal');
    console.log('Profile modal opened successfully');

    } catch (error) {
        console.error('Error opening athlete profile:', error);
        showToast('Error loading profile. Please try again.', 'error');
    }
}

// ==================== PROFILE ACTION BUTTONS ====================
function donateToCurrentAthlete() {
    if (currentViewingAthlete) {
        openDonateModal(currentViewingAthlete.name);
    }
}

function openMessageModal() {
    if (!currentViewingAthlete) {
        showToast('No athlete selected', 'error');
        return;
    }
    openModal('messageModal');
    const recipientName = document.getElementById('messageRecipientName');
    if (recipientName) {
        recipientName.textContent = currentViewingAthlete.name;
    }
}

function sendMessage(e) {
    e.preventDefault();
    const messageText = document.getElementById('messageText').value;
    if (!messageText.trim()) {
        showToast('Please enter a message', 'error');
        return;
    }
    showToast(`Message sent to ${currentViewingAthlete.name}!`, 'success');
    closeModal('messageModal');
    document.getElementById('messageForm').reset();
}

function followAthlete() {
    if (!currentViewingAthlete) return;
    showToast(`You are now following ${currentViewingAthlete.name}!`, 'success');
}

// ==================== SOCIAL FEED UPDATE ====================
function updateSocialFeed(athlete) {
    const feedAvatar1 = document.getElementById('feedAvatar1');
    const feedAvatar2 = document.getElementById('feedAvatar2');
    const feedUsername = document.querySelectorAll('.post-author');
    const feedContent = document.querySelectorAll('.post-content');

    // Update avatars
    if (feedAvatar1) {
        feedAvatar1.src = athlete.photo;
        feedAvatar1.alt = athlete.name;
    }
    if (feedAvatar2) {
        feedAvatar2.src = athlete.photo;
        feedAvatar2.alt = athlete.name;
    }

    // Create username from name
    const username = '@' + athlete.name.toLowerCase().replace(/\s+/g, '');

    // Update usernames
    feedUsername.forEach(el => {
        el.textContent = username;
    });

    // Generate sport-specific content
    const sportPosts = {
        basketball: [
            `Great practice today! Ready for the big game Saturday 🏀🔥 #${athlete.school.replace(/\s+/g, '')} #NIL`,
            `Blessed to announce my partnership with @NikeBasketball! Dreams do come true 🙏✨ #JustDoIt #NIL`
        ],
        football: [
            `Spring practice going hard! Ready to compete 🏈💪 #${athlete.school.replace(/\s+/g, '')} #NIL`,
            `New deal announcement coming soon... stay tuned! 👀🔥 #NIL #CollegeFootball`
        ],
        soccer: [
            `2 goals today! The team is clicking ⚽🔥 #${athlete.school.replace(/\s+/g, '')} #NIL`,
            `Thank you to all my supporters! New content dropping this week 🙏 #NIL`
        ],
        default: [
            `Another great day of training! Grateful for this journey 🏆 #${athlete.school.replace(/\s+/g, '')} #NIL`,
            `Big announcement coming soon... 👀 Thank you to everyone who believes in me! #NIL`
        ]
    };

    const posts = sportPosts[athlete.sport] || sportPosts.default;

    // Update feed content
    if (feedContent.length >= 2) {
        if (feedContent[0]) feedContent[0].textContent = posts[0];
        if (feedContent[1]) feedContent[1].textContent = posts[1];
    }
}

// ==================== DATA VALUE FUNCTIONS ====================
function populateDataValue(athlete) {
    if (!athlete.dataValue) return;

    const dv = athlete.dataValue;

    // Update main valuation
    const valueAmount = document.getElementById('athleteDataValue');
    if (valueAmount) {
        valueAmount.textContent = formatCurrency(dv.valuation);
    }

    // Update change percentage
    const valueChange = document.querySelector('.value-change');
    if (valueChange) {
        const isPositive = dv.change >= 0;
        valueChange.textContent = `${isPositive ? '+' : ''}${dv.change}% ${isPositive ? '↑' : '↓'}`;
        valueChange.className = `value-change ${isPositive ? 'positive' : 'negative'}`;
    }

    // Update timestamp
    const timestamp = document.getElementById('valueTimestamp');
    if (timestamp) {
        const times = ['Just now', '2 minutes ago', '5 minutes ago', '12 minutes ago'];
        timestamp.textContent = times[Math.floor(Math.random() * times.length)];
    }

    // Update metric cards
    updateMetricCard('kinetic', dv.kineticScore);
    updateMetricCard('social', dv.socialScore);
    updateMetricCard('scarcity', dv.scarcityScore);
    updateMetricCard('performance', dv.performanceScore);

    // Update benchmarks
    const benchmarkItems = document.querySelectorAll('.benchmark-item');
    if (benchmarkItems.length >= 4 && dv.benchmarks) {
        const benchmarkValues = benchmarkItems[0].querySelectorAll('.benchmark-value');
        if (benchmarkValues.length) {
            updateBenchmarkValue(benchmarkItems[0], dv.benchmarks.position, true);
            updateBenchmarkValue(benchmarkItems[1], dv.benchmarks.conference, true);
            updateBenchmarkValue(benchmarkItems[2], dv.benchmarks.division, true);
            updateBenchmarkRank(benchmarkItems[3], dv.benchmarks.nationalRank);
        }
    }

    // Update biometrics
    const biometricStats = document.querySelectorAll('.biometric-stat');
    if (biometricStats.length >= 4 && dv.biometrics) {
        const bv0 = biometricStats[0].querySelector('.biometric-value');
        const bv1 = biometricStats[1].querySelector('.biometric-value');
        const bv2 = biometricStats[2].querySelector('.biometric-value');
        const bv3 = biometricStats[3].querySelector('.biometric-value');
        if (bv0) bv0.textContent = dv.biometrics.fortyYard;
        if (bv1) bv1.textContent = dv.biometrics.vertical;
        if (bv2) bv2.textContent = dv.biometrics.benchReps;
        if (bv3) bv3.textContent = dv.biometrics.height;
    }

    // Update quick stats for brands
    const quickStats = document.querySelectorAll('.quick-stat');
    if (quickStats.length >= 4) {
        const qv0 = quickStats[0].querySelector('.quick-value');
        const qv1 = quickStats[1].querySelector('.quick-value');
        const qv2 = quickStats[2].querySelector('.quick-value');
        const qv3 = quickStats[3].querySelector('.quick-value');
        if (qv0) qv0.textContent = '$' + dv.avgDeal.toLocaleString();
        if (qv1) qv1.textContent = dv.completedDeals;
        if (qv2) qv2.textContent = '⭐ ' + dv.rating + '/5';
        if (qv3) qv3.textContent = dv.responseTime;
    }

    // Update monetization earning preview
    const earningAmounts = document.querySelectorAll('.earning-preview .amount');
    if (earningAmounts.length >= 3) {
        const monthlyLicense = Math.round(dv.valuation * 0.004);
        if (earningAmounts[0]) earningAmounts[0].textContent = `$${monthlyLicense.toLocaleString()} - $${(monthlyLicense * 2.5).toLocaleString()}`;
        if (earningAmounts[1]) earningAmounts[1].textContent = `${Math.floor(Math.random() * 8 + 8)} Brands`;
        if (earningAmounts[2]) earningAmounts[2].textContent = `$${Math.round(dv.valuation * 0.15).toLocaleString()}`;
    }

    // Update social feed avatars
    const feedAvatars = document.querySelectorAll('.post-avatar');
    feedAvatars.forEach(avatar => {
        avatar.src = athlete.photo;
    });

    // Update social handle
    const postAuthors = document.querySelectorAll('.post-author');
    const handle = '@' + athlete.name.toLowerCase().replace(' ', '');
    postAuthors.forEach(author => {
        author.textContent = handle;
    });
}

function updateMetricCard(type, score) {
    const card = document.querySelector(`.metric-card.${type}`);
    if (!card) return;

    const fill = card.querySelector('.metric-fill');
    const scoreEl = card.querySelector('.metric-score');
    const rankEl = card.querySelector('.metric-rank');

    if (fill) fill.style.width = score + '%';
    if (scoreEl) scoreEl.textContent = score + '/100';
    if (rankEl) rankEl.textContent = 'Top ' + (100 - score + Math.floor(Math.random() * 5)) + '%';
}

function updateBenchmarkValue(item, value, isPercent) {
    const valueEl = item.querySelector('.benchmark-value');
    if (valueEl) {
        valueEl.textContent = isPercent ? `+${value}%` : value;
        valueEl.classList.add('positive');
    }
}

function updateBenchmarkRank(item, rank) {
    const valueEl = item.querySelector('.benchmark-value');
    if (valueEl) {
        valueEl.textContent = '#' + rank;
        valueEl.classList.remove('positive');
    }
}

function formatCurrency(value) {
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
        return value.toLocaleString();
    }
    return value.toString();
}

// Placeholder functions for monetization modals
function openLicenseModal() {
    showToast('Data Licensing - Coming Soon!', 'info');
}

function openBrandMatchModal() {
    showToast('Opening Brand Matches...', 'success');
    // Could open a modal with brand matches
}

function openTokenizeModal() {
    showToast('Tokenization - Coming Soon!', 'info');
}

// ==================== INVESTOR & GRADES PRIVACY ====================
function initInvestorStatus() {
    // Check if user has invested in any athletes
    const investments = JSON.parse(localStorage.getItem('athleteInvestments') || '{}');
    return investments;
}

function isInvestorOf(athleteId) {
    const investments = JSON.parse(localStorage.getItem('athleteInvestments') || '{}');
    return investments[athleteId] === true;
}

function markAsInvestor(athleteId) {
    const investments = JSON.parse(localStorage.getItem('athleteInvestments') || '{}');
    investments[athleteId] = true;
    localStorage.setItem('athleteInvestments', JSON.stringify(investments));
}

function updateGradesVisibility(athleteId) {
    const gradesLocked = document.getElementById('gradesLocked');
    const gradesContent = document.getElementById('gradesContent');
    const privacyBadge = document.getElementById('gradePrivacyBadge');

    // For demo purposes, always show grades when viewing profiles
    // In production, this would check investor status
    const showGrades = true; // Change to isInvestorOf(athleteId) for production

    if (showGrades) {
        // Show grades
        if (gradesLocked) gradesLocked.style.display = 'none';
        if (gradesContent) gradesContent.style.display = 'block';
        if (privacyBadge) {
            privacyBadge.textContent = '📊 Academic Record Verified';
            privacyBadge.classList.add('unlocked');
        }
    } else {
        // Hide grades
        if (gradesLocked) gradesLocked.style.display = 'block';
        if (gradesContent) gradesContent.style.display = 'none';
        if (privacyBadge) {
            privacyBadge.textContent = '🔒 Private - Investors Only';
            privacyBadge.classList.remove('unlocked');
        }
    }
}

function unlockGradesAfterDonation() {
    if (currentViewingAthlete) {
        markAsInvestor(currentViewingAthlete.id);
        updateGradesVisibility(currentViewingAthlete.id);
        showToast('Grades unlocked! Thank you for your support.', 'success');
    }
}

// ==================== ATHLETIC DIRECTOR SYSTEM ====================
let currentDirector = null;
let currentVerifyingAthlete = null;

// Athletic Directors Data (simulated)
const athleticDirectorsData = [
    { id: 'AD-001', name: 'Dr. Gene Smith', institution: 'Ohio State', email: 'smith@osu.edu', division: 'D1' },
    { id: 'AD-002', name: 'Martin Jarmond', institution: 'UCLA', email: 'jarmond@ucla.edu', division: 'D1' },
    { id: 'AD-003', name: 'Carla Williams', institution: 'Virginia', email: 'williams@virginia.edu', division: 'D1' },
];

// Verification Requests Data (simulated)
let verificationRequests = [
    { athleteId: 1, status: 'pending', requestDate: '2026-01-15', school: 'Ohio State' },
    { athleteId: 5, status: 'pending', requestDate: '2026-01-14', school: 'Alabama' },
    { athleteId: 9, status: 'pending', requestDate: '2026-01-13', school: 'Ohio State' },
    { athleteId: 3, status: 'pending', requestDate: '2026-01-12', school: 'USC' },
];

// Login Type Selection
function selectLoginType(type) {
    const loginBtns = document.querySelectorAll('.login-type-btn');
    const userForm = document.getElementById('loginForm');
    const directorForm = document.getElementById('directorLoginForm');
    const socialSection = document.getElementById('socialLoginSection');

    loginBtns.forEach(btn => btn.classList.remove('active'));
    event.target.closest('.login-type-btn').classList.add('active');

    if (type === 'director') {
        userForm.style.display = 'none';
        directorForm.style.display = 'block';
        socialSection.style.display = 'none';
    } else {
        userForm.style.display = 'block';
        directorForm.style.display = 'none';
        socialSection.style.display = 'block';
    }
}

// Director Login - Updated for role-based login modal
function handleDirectorLogin(e) {
    e.preventDefault();
    const email = document.getElementById('directorEmail')?.value;
    const directorId = document.getElementById('directorId')?.value;
    const password = document.getElementById('directorPassword')?.value;

    if (!email) {
        showToast('Please enter your email', 'error');
        return;
    }

    // Simulate login validation
    const director = athleticDirectorsData?.find(d =>
        d.email?.toLowerCase() === email.toLowerCase() || d.id === directorId
    );

    if (director || email.includes('@')) {
        currentDirector = director || {
            id: directorId || 'DIR-' + Date.now(),
            name: 'Athletic Director',
            institution: email.split('@')[1]?.split('.')[0]?.toUpperCase() || 'University',
            email: email
        };

        // Close login modal
        closeModal('loginModal');

        // Reset the login form
        showRoleSelector();
        document.getElementById('directorLoginForm')?.reset();

        // Open director dashboard (fullscreen version)
        const fullDashboard = document.getElementById('directorFullDashboard');
        if (fullDashboard) {
            fullDashboard.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        showToast(`Welcome, ${currentDirector.name}!`, 'success');
    } else {
        showToast('Invalid credentials. Please try again.', 'error');
    }
}

// Director Signup
function handleDirectorSignup(e) {
    e.preventDefault();

    const password = document.getElementById('directorNewPassword').value;
    const confirmPassword = document.getElementById('directorConfirmPassword').value;

    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    showToast('Registration submitted! You will receive verification within 2-3 business days.', 'success');
    closeModal('directorSignupModal');
}

// Update Dashboard Stats
function updateDashboardStats() {
    const schoolAthletes = athletesData.filter(a =>
        currentDirector && a.school.toLowerCase().includes(currentDirector.institution.toLowerCase())
    );

    const verifiedAthletes = schoolAthletes.filter(a => a.verified);
    const pendingRequests = verificationRequests.filter(r =>
        r.status === 'pending' &&
        currentDirector &&
        r.school.toLowerCase().includes(currentDirector.institution.toLowerCase())
    );
    const gradesVerified = schoolAthletes.filter(a => a.gradesVerified);

    document.getElementById('totalAthletesCount').textContent = schoolAthletes.length || athletesData.length;
    document.getElementById('verifiedCount').textContent = verifiedAthletes.length;
    document.getElementById('pendingCount').textContent = pendingRequests.length || verificationRequests.filter(r => r.status === 'pending').length;
    document.getElementById('pendingBadge').textContent = pendingRequests.length || verificationRequests.filter(r => r.status === 'pending').length;
    document.getElementById('gradesVerifiedCount').textContent = gradesVerified.length || Math.floor(athletesData.length * 0.8);
}

// Render Pending Verifications
function renderPendingVerifications() {
    const container = document.getElementById('pendingVerificationList');
    if (!container) return;

    const pending = verificationRequests.filter(r => r.status === 'pending');

    if (pending.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">✅</span>
                <h4>All caught up!</h4>
                <p>No pending verification requests</p>
            </div>
        `;
        return;
    }

    container.innerHTML = pending.map(request => {
        const athlete = athletesData.find(a => a.id === request.athleteId);
        if (!athlete) return '';

        return `
            <div class="verification-card">
                <div class="verification-card-avatar">
                    <img src="${athlete.photo}" alt="${athlete.name}">
                </div>
                <div class="verification-card-info">
                    <h4>${athlete.name}</h4>
                    <p>${athlete.school} • ${capitalizeFirst(athlete.sport)} • ${athlete.position}</p>
                    <span class="request-date">Requested: ${formatDate(request.requestDate)}</span>
                </div>
                <div class="verification-card-actions">
                    <button class="btn btn-sm btn-primary" onclick="openVerificationDetail(${athlete.id})">Review</button>
                    <button class="btn btn-sm btn-success" onclick="quickApprove(${athlete.id})">Quick Approve</button>
                </div>
            </div>
        `;
    }).join('');
}

// Render Verified Athletes
function renderVerifiedAthletes() {
    const container = document.getElementById('verifiedAthletesList');
    if (!container) return;

    const verified = athletesData.filter(a => a.verified);

    if (verified.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <h4>No verified athletes yet</h4>
                <p>Approve pending requests to see them here</p>
            </div>
        `;
        return;
    }

    container.innerHTML = verified.map(athlete => `
        <div class="verified-athlete-card">
            <div class="verified-athlete-avatar">
                <img src="${athlete.photo}" alt="${athlete.name}">
                <span class="verified-check">✓</span>
            </div>
            <div class="verified-athlete-info">
                <h4>${athlete.name}</h4>
                <p>${athlete.school} • ${capitalizeFirst(athlete.sport)}</p>
            </div>
            <div class="verified-athlete-grades">
                <span class="gpa-badge-sm ${athlete.gradesVerified ? 'verified' : ''}">${athlete.gpa.toFixed(2)} GPA</span>
                ${athlete.gradesVerified ? '<span class="grades-verified-badge">✓ Grades Verified</span>' : '<button class="btn btn-xs btn-outline" onclick="verifyGrades(' + athlete.id + ')">Verify Grades</button>'}
            </div>
            <div class="verified-athlete-date">
                <span>Verified: ${athlete.verifiedDate || 'Jan 15, 2026'}</span>
            </div>
        </div>
    `).join('');
}

// Render Grade Verifications
function renderGradeVerifications() {
    const container = document.getElementById('gradeVerificationList');
    if (!container) return;

    const athletesNeedingGradeVerification = athletesData.filter(a => !a.gradesVerified);

    container.innerHTML = `
        <h5>Athletes Pending Grade Verification</h5>
        ${athletesNeedingGradeVerification.map(athlete => `
            <div class="grade-verification-row">
                <div class="grade-athlete-info">
                    <img src="${athlete.photo}" alt="${athlete.name}" class="grade-athlete-avatar">
                    <div>
                        <h5>${athlete.name}</h5>
                        <p>${athlete.school} • ${capitalizeFirst(athlete.sport)}</p>
                    </div>
                </div>
                <div class="grade-current">
                    <span class="label">Reported GPA</span>
                    <span class="value">${athlete.gpa.toFixed(2)}</span>
                </div>
                <div class="grade-actions">
                    <button class="btn btn-sm btn-success" onclick="confirmGrade(${athlete.id}, ${athlete.gpa})">✓ Confirm</button>
                    <button class="btn btn-sm btn-outline" onclick="editGrade(${athlete.id})">Edit</button>
                </div>
            </div>
        `).join('')}
    `;
}

// Open Verification Detail
function openVerificationDetail(athleteId) {
    const athlete = athletesData.find(a => a.id === athleteId);
    if (!athlete) return;

    currentVerifyingAthlete = athlete;

    // Populate athlete info
    const avatarEl = document.getElementById('verifyAthleteAvatar');
    const nameEl = document.getElementById('verifyAthleteName');
    const infoEl = document.getElementById('verifyAthleteInfo');

    if (avatarEl) avatarEl.innerHTML = `<img src="${athlete.photo}" alt="${athlete.name}">`;
    if (nameEl) nameEl.textContent = athlete.name;
    if (infoEl) infoEl.textContent = `${athlete.school} • ${capitalizeFirst(athlete.sport)} • ${athlete.position}`;

    // Pre-fill sport verification
    const sportEl = document.getElementById('verifySport');
    const positionEl = document.getElementById('verifyPosition');
    if (sportEl) sportEl.value = athlete.sport;
    if (positionEl) positionEl.value = athlete.position;

    // Pre-fill grade verification
    const gpaEl = document.getElementById('verifyGPA');
    if (gpaEl) gpaEl.value = athlete.gpa;

    // Reset all checkboxes
    document.querySelectorAll('.verification-check input').forEach(cb => cb.checked = false);

    // Reset all dropdowns to default
    document.getElementById('verifyEnrollmentStatus').value = '';
    document.getElementById('verifyGradYear').value = '';
    document.getElementById('verifyStanding').value = '';
    document.getElementById('verifySemester').value = '';
    document.getElementById('verifyJersey').value = '';

    openModal('verificationDetailModal');
}

// Quick Approve
function quickApprove(athleteId) {
    const athlete = athletesData.find(a => a.id === athleteId);
    if (!athlete) return;

    // Set all verification flags
    athlete.verified = true;
    athlete.enrollmentVerified = true;
    athlete.sportVerified = true;
    athlete.gradesVerified = true;

    // Verification meta
    athlete.verifiedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    athlete.verifiedBy = currentDirector?.name || 'Athletic Director';
    athlete.verifiedByInstitution = currentDirector?.institution || 'Institution';

    // Remove from pending
    verificationRequests = verificationRequests.filter(r => r.athleteId !== athleteId);

    updateDashboardStats();
    renderPendingVerifications();
    renderVerifiedAthletes();
    renderGradeVerifications();

    showToast(`${athlete.name} verified: Enrollment ✓ Sport ✓ Grades ✓`, 'success');
}

// Approve Verification
function approveVerification() {
    if (!currentVerifyingAthlete) return;

    // Get verification checkboxes
    const enrollmentChecked = document.getElementById('checkEnrollment').checked;
    const sportChecked = document.getElementById('checkSport').checked;
    const gradesChecked = document.getElementById('checkGrades').checked;

    // Validate required verifications
    if (!enrollmentChecked) {
        showToast('Please confirm enrollment status', 'error');
        return;
    }
    if (!sportChecked) {
        showToast('Please confirm sport/team roster', 'error');
        return;
    }
    if (!gradesChecked) {
        showToast('Please confirm grades/GPA', 'error');
        return;
    }

    // Get form values
    const enrollmentStatus = document.getElementById('verifyEnrollmentStatus').value;
    const gradYear = document.getElementById('verifyGradYear').value;
    const sport = document.getElementById('verifySport').value;
    const position = document.getElementById('verifyPosition').value;
    const jersey = document.getElementById('verifyJersey').value;
    const gpa = parseFloat(document.getElementById('verifyGPA').value);
    const standing = document.getElementById('verifyStanding').value;
    const semester = document.getElementById('verifySemester').value;

    // Validate required fields
    if (!enrollmentStatus) {
        showToast('Please select enrollment status', 'error');
        return;
    }
    if (!sport) {
        showToast('Please select the sport', 'error');
        return;
    }
    if (!gpa) {
        showToast('Please enter the verified GPA', 'error');
        return;
    }

    // Update athlete data
    currentVerifyingAthlete.verified = true;
    currentVerifyingAthlete.enrollmentVerified = true;
    currentVerifyingAthlete.sportVerified = true;
    currentVerifyingAthlete.gradesVerified = true;

    // Enrollment details
    currentVerifyingAthlete.enrollmentStatus = enrollmentStatus;
    currentVerifyingAthlete.expectedGraduation = gradYear;

    // Sport details
    currentVerifyingAthlete.verifiedSport = sport;
    currentVerifyingAthlete.verifiedPosition = position || currentVerifyingAthlete.position;
    currentVerifyingAthlete.jerseyNumber = jersey;

    // Grade details
    currentVerifyingAthlete.gpa = gpa;
    currentVerifyingAthlete.academicStanding = standing;
    currentVerifyingAthlete.verifiedSemester = semester;

    // Verification meta
    currentVerifyingAthlete.verifiedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    currentVerifyingAthlete.verifiedBy = currentDirector?.name || 'Athletic Director';
    currentVerifyingAthlete.verifiedByInstitution = currentDirector?.institution || 'Institution';

    // Remove from pending
    verificationRequests = verificationRequests.filter(r => r.athleteId !== currentVerifyingAthlete.id);

    closeModal('verificationDetailModal');
    updateDashboardStats();
    renderPendingVerifications();
    renderVerifiedAthletes();
    renderGradeVerifications();

    showToast(`${currentVerifyingAthlete.name} verified: Enrollment ✓ Sport ✓ Grades ✓`, 'success');
}

// Request More Info
function requestMoreInfo() {
    if (!currentVerifyingAthlete) return;

    showToast(`Information request sent to ${currentVerifyingAthlete.name}`, 'info');
    closeModal('verificationDetailModal');
}

// Deny Verification
function denyVerification() {
    if (!currentVerifyingAthlete) return;

    verificationRequests = verificationRequests.filter(r => r.athleteId !== currentVerifyingAthlete.id);

    closeModal('verificationDetailModal');
    updateDashboardStats();
    renderPendingVerifications();

    showToast(`Verification denied for ${currentVerifyingAthlete.name}`, 'info');
}

// Confirm Grade
function confirmGrade(athleteId, gpa) {
    const athlete = athletesData.find(a => a.id === athleteId);
    if (!athlete) return;

    athlete.gradesVerified = true;
    athlete.gpa = gpa;
    athlete.gradeVerifiedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    renderGradeVerifications();
    renderVerifiedAthletes();
    updateDashboardStats();

    showToast(`Grades verified for ${athlete.name}`, 'success');
}

// Edit Grade
function editGrade(athleteId) {
    const athlete = athletesData.find(a => a.id === athleteId);
    if (!athlete) return;

    const newGpa = prompt(`Enter verified GPA for ${athlete.name}:`, athlete.gpa);
    if (newGpa && !isNaN(parseFloat(newGpa))) {
        athlete.gpa = parseFloat(newGpa);
        athlete.gradesVerified = true;
        renderGradeVerifications();
        showToast(`GPA updated for ${athlete.name}`, 'success');
    }
}

// Verify Grades Button
function verifyGrades(athleteId) {
    const athlete = athletesData.find(a => a.id === athleteId);
    if (!athlete) return;

    const gpa = prompt(`Enter verified GPA for ${athlete.name}:`, athlete.gpa);
    if (gpa && !isNaN(parseFloat(gpa))) {
        confirmGrade(athleteId, parseFloat(gpa));
    }
}

// Handle Grade Upload
function handleGradeUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    showToast(`Processing ${file.name}...`, 'info');

    // Simulate processing
    setTimeout(() => {
        showToast('Grade file processed! 8 athletes updated.', 'success');

        // Simulate bulk grade verification
        athletesData.forEach((athlete, index) => {
            if (index < 8) {
                athlete.gradesVerified = true;
            }
        });

        renderGradeVerifications();
        updateDashboardStats();
    }, 2000);
}

// Logout Director
function logoutDirector() {
    currentDirector = null;
    closeModal('directorDashboardModal');
    showToast('Logged out successfully', 'info');
}

// Helper: Format Date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Request Verification (for athletes)
function requestVerification(athleteId) {
    const athlete = athletesData.find(a => a.id === athleteId);
    if (!athlete) return;

    const existingRequest = verificationRequests.find(r => r.athleteId === athleteId);
    if (existingRequest) {
        showToast('Verification request already submitted', 'info');
        return;
    }

    verificationRequests.push({
        athleteId: athleteId,
        status: 'pending',
        requestDate: new Date().toISOString().split('T')[0],
        school: athlete.school
    });

    showToast('Verification request submitted to your Athletic Director', 'success');
}

// ==================== ATHLETE SIGNUP ====================
function handleAthleteSignup(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    // Simulate account creation
    showToast('Welcome to GradeUp! Your athlete account has been created.', 'success');
    closeModal('athleteSignupModal');

    // Show athlete dashboard after signup
    setTimeout(() => {
        openModal('athleteDashboardModal');
    }, 500);
}

// ==================== BRAND SIGNUP ====================
function handleBrandSignup(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    // Simulate account creation
    showToast('Brand account created successfully! Start connecting with athletes.', 'success');
    closeModal('brandSignupModal');
}

// ==================== APPLICATION SUBMISSION ====================
function submitApplication(e) {
    e.preventDefault();
    const form = e.target;

    // Simulate application submission
    showToast('Application submitted! The brand will review your profile.', 'success');
    closeModal('applyModal');
    form.reset();
}

// ==================== WITHDRAWAL FUNCTIONS ====================
let currentBalance = 12450.00;

function setWithdrawAmount(amount) {
    const input = document.getElementById('withdrawAmount');
    if (amount === 'all') {
        input.value = currentBalance.toFixed(2);
    } else {
        input.value = amount;
    }
    updateWithdrawalSummary();
}

function updateWithdrawalSummary() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value) || 0;
    document.getElementById('summaryWithdrawAmount').textContent = '$' + amount.toFixed(2);
    document.getElementById('summaryReceiveAmount').textContent = '$' + amount.toFixed(2);
}

function processWithdrawal(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('withdrawAmount').value);

    if (amount > currentBalance) {
        showToast('Insufficient balance', 'error');
        return;
    }

    if (amount < 10) {
        showToast('Minimum withdrawal is $10', 'error');
        return;
    }

    // Simulate withdrawal processing
    currentBalance -= amount;
    document.getElementById('withdrawableBalance').textContent = '$' + currentBalance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    showToast(`Withdrawal of $${amount.toFixed(2)} initiated! Funds will arrive in 1-3 business days.`, 'success');
    closeModal('withdrawModal');
    document.getElementById('withdrawForm').reset();
    updateWithdrawalSummary();
}

// Add event listener for withdrawal amount input
document.addEventListener('DOMContentLoaded', function() {
    const withdrawInput = document.getElementById('withdrawAmount');
    if (withdrawInput) {
        withdrawInput.addEventListener('input', updateWithdrawalSummary);
    }
});

// ==================== DASHBOARD FUNCTIONS ====================

// Open fullscreen dashboards
function openDirectorDashboard() {
    const modal = document.getElementById('directorFullDashboard');
    if (modal) {
        // Set institution name if available
        const institutionEl = document.getElementById('directorInstitution');
        if (institutionEl && currentDirector) {
            institutionEl.textContent = currentDirector.institution;
        }

        // Initialize dashboard data
        updateDashboardStats();
        renderPendingVerifications();
        renderVerifiedAthletes();
        renderGradeVerifications();

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function openAthleteDashboard() {
    const modal = document.getElementById('athleteFullDashboard');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function openBrandDashboard() {
    const modal = document.getElementById('brandFullDashboard');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Close fullscreen dashboard
function closeFullDashboard(dashboardId) {
    const modal = document.getElementById(dashboardId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Switch dashboard tabs with smooth transitions
function switchDashboardTab(role, tabName) {
    // Prevent default anchor behavior
    if (event) event.preventDefault();

    // Get the dashboard container
    const dashboardId = role + 'FullDashboard';
    const dashboard = document.getElementById(dashboardId);
    if (!dashboard) return;

    // Deactivate all nav items
    const navItems = dashboard.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    // Deactivate all content sections (they use .dashboard-tab class with id like role-tabname)
    const contentSections = dashboard.querySelectorAll('.dashboard-main .dashboard-tab');
    contentSections.forEach(section => {
        section.classList.remove('active');
        section.style.opacity = '0';
    });

    // Activate the clicked nav item
    const activeNavItem = dashboard.querySelector(`.nav-item[onclick*="${tabName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }

    // Activate the corresponding content with fade-in animation
    const activeContent = document.getElementById(`${role}-${tabName}`);
    if (activeContent) {
        setTimeout(() => {
            activeContent.classList.add('active');
            activeContent.style.opacity = '1';
        }, 50);
    }
}

// ==================== DIRECTOR DASHBOARD FUNCTIONS ====================

function verifyAthlete(athleteId) {
    showToast('Opening verification details...', 'info');
    // In production, this would open a detailed verification modal
}

function approveVerification(athleteId) {
    showToast('Athlete verification approved!', 'success');
    // Update the verification status in the UI
    const card = event.target.closest('.verification-card');
    if (card) {
        card.style.opacity = '0.5';
        setTimeout(() => card.remove(), 300);
    }
}

function rejectVerification(athleteId) {
    showToast('Verification rejected. Athlete notified.', 'error');
    const card = event.target.closest('.verification-card');
    if (card) {
        card.style.opacity = '0.5';
        setTimeout(() => card.remove(), 300);
    }
}

function syncStatsTaq() {
    showToast('Syncing with StatsTaq...', 'info');
    // Simulate sync process
    setTimeout(() => {
        showToast('StatsTaq sync complete! 12 athletes updated.', 'success');
    }, 2000);
}

function certifyAll() {
    showToast('Processing certifications...', 'info');
    setTimeout(() => {
        showToast('All eligible athletes have been certified!', 'success');
    }, 1500);
}

function certifyAthlete(athleteId) {
    showToast(`Athlete ${athleteId} certified with StatsTaq data!`, 'success');
}

function exportReport() {
    showToast('Generating report...', 'info');
    setTimeout(() => {
        showToast('Report downloaded successfully!', 'success');
    }, 1000);
}

function addTeam() {
    showToast('Add Team feature coming soon!', 'info');
}

function importRoster() {
    showToast('Import Roster feature coming soon!', 'info');
}

// ==================== ATHLETE DASHBOARD FUNCTIONS ====================

function saveProfile() {
    showToast('Profile saved successfully!', 'success');
}

function acceptOffer(offerId) {
    showToast('Offer accepted! Brand has been notified.', 'success');
    const card = event.target.closest('.offer-card');
    if (card) {
        const status = card.querySelector('.status-badge');
        if (status) {
            status.textContent = 'Accepted';
            status.className = 'status-badge verified';
        }
    }
}

function declineOffer(offerId) {
    showToast('Offer declined.', 'info');
    const card = event.target.closest('.offer-card');
    if (card) {
        card.style.opacity = '0.5';
        setTimeout(() => card.remove(), 300);
    }
}

function viewOfferDetails(offerId) {
    showToast('Loading offer details...', 'info');
}

function negotiateOffer(offerId) {
    showToast('Opening negotiation...', 'info');
}

function uploadContent() {
    showToast('Upload Content feature coming soon!', 'info');
}

function viewAllContent() {
    showToast('View All Content feature coming soon!', 'info');
}

function updateAcademics() {
    showToast('Academic Update feature coming soon!', 'info');
}

// ==================== BRAND DASHBOARD FUNCTIONS ====================

function sendOffer(athleteId) {
    showToast('Opening offer form...', 'info');
    // In production, open a modal to create an offer
}

function contactAthlete(athleteId) {
    showToast('Opening messaging...', 'info');
}

function viewAthleteProfile(athleteId) {
    const athlete = athletesData.find(a => a.id === athleteId);
    if (athlete) {
        openProfile(athleteId);
        closeFullDashboard('brandFullDashboard');
    }
}

function createCampaign() {
    showToast('Create Campaign feature coming soon!', 'info');
}

function viewCampaign(campaignId) {
    showToast('Loading campaign details...', 'info');
}

function makeDonation() {
    showToast('Opening donation portal...', 'info');
    // Could redirect to the donation section of the main site
}

function searchAthletes() {
    const sport = document.getElementById('sportFilter')?.value || 'all';
    const minGPA = document.getElementById('gpaFilter')?.value || '';
    const followers = document.getElementById('followersFilter')?.value || 'all';

    showToast(`Searching athletes: Sport=${sport}, GPA=${minGPA}, Followers=${followers}`, 'info');
    // In production, filter the athlete grid based on criteria
}

function viewPartnershipDetails(partnershipId) {
    showToast('Loading partnership details...', 'info');
}

function managePartnership(partnershipId) {
    showToast('Opening partnership management...', 'info');
}

function downloadAnalytics() {
    showToast('Preparing analytics export...', 'info');
    setTimeout(() => {
        showToast('Analytics report downloaded!', 'success');
    }, 1000);
}

// ==================== DASHBOARD DATA POPULATION ====================

function populateDirectorDashboard() {
    // Populate with sample data - in production this would come from an API
    const pendingVerifications = athletesData.filter(a => !a.verified).slice(0, 3);
    const verifiedAthletes = athletesData.filter(a => a.verified);

    // Update stats
    const statsElements = {
        totalAthletes: athletesData.length,
        pendingVerifications: pendingVerifications.length,
        verifiedAthletes: verifiedAthletes.length,
        complianceScore: '94%'
    };

    // Could update DOM elements here
}

function populateAthleteDashboard(athleteId) {
    const athlete = athletesData.find(a => a.id === athleteId);
    if (!athlete) return;

    // Populate profile form
    const nameInput = document.querySelector('#athlete-profile input[placeholder="Enter your full name"]');
    if (nameInput) nameInput.value = athlete.name;

    // Update stats based on athlete data
    // In production, this would pull from the authenticated user's data
}

function populateBrandDashboard() {
    // Populate athlete discovery grid with all athletes
    const grid = document.querySelector('.athlete-discover-grid');
    if (!grid) return;

    // Clear existing cards
    grid.innerHTML = '';

    // Add athlete cards
    athletesData.forEach(athlete => {
        const card = createAthleteDiscoverCard(athlete);
        grid.appendChild(card);
    });
}

function createAthleteDiscoverCard(athlete) {
    const card = document.createElement('div');
    card.className = 'athlete-discover-card';

    const nilValue = athlete.dataValue ? `$${(athlete.dataValue.valuation / 1000).toFixed(0)}K` : 'N/A';

    card.innerHTML = `
        <div class="card-header">
            <img src="${athlete.photo}" alt="${athlete.name}">
            <h5>${athlete.name}</h5>
            <p>${athlete.position} • ${athlete.school}</p>
        </div>
        <div class="card-stats">
            <div class="card-stat">
                <span class="value">${athlete.gpa}</span>
                <span class="label">GPA</span>
            </div>
            <div class="card-stat">
                <span class="value">${athlete.followers}</span>
                <span class="label">Followers</span>
            </div>
            <div class="card-stat">
                <span class="value">${nilValue}</span>
                <span class="label">NIL Value</span>
            </div>
        </div>
        <div class="card-actions">
            <button class="btn-gold" onclick="sendOffer(${athlete.id})">Send Offer</button>
            <button class="btn-outline" onclick="viewAthleteProfile(${athlete.id})">View Profile</button>
        </div>
    `;

    return card;
}

// ==================== QUICK ACCESS BUTTONS ====================

// Add event listeners for quick access from navbar or other locations
document.addEventListener('DOMContentLoaded', function() {
    // Check for dashboard access buttons
    const directorBtn = document.querySelector('[data-dashboard="director"]');
    const athleteBtn = document.querySelector('[data-dashboard="athlete"]');
    const brandBtn = document.querySelector('[data-dashboard="brand"]');

    if (directorBtn) directorBtn.addEventListener('click', openDirectorDashboard);
    if (athleteBtn) athleteBtn.addEventListener('click', openAthleteDashboard);
    if (brandBtn) brandBtn.addEventListener('click', openBrandDashboard);

    // Initialize dashboard data when opened
    const directorDashboard = document.getElementById('directorFullDashboard');
    const athleteDashboard = document.getElementById('athleteFullDashboard');
    const brandDashboard = document.getElementById('brandFullDashboard');

    // Use MutationObserver to detect when dashboards are opened
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.classList.contains('active')) {
                if (mutation.target.id === 'directorFullDashboard') {
                    populateDirectorDashboard();
                } else if (mutation.target.id === 'athleteFullDashboard') {
                    populateAthleteDashboard(1); // Default to first athlete for demo
                } else if (mutation.target.id === 'brandFullDashboard') {
                    populateBrandDashboard();
                }
            }
        });
    });

    if (directorDashboard) observer.observe(directorDashboard, { attributes: true, attributeFilter: ['class'] });
    if (athleteDashboard) observer.observe(athleteDashboard, { attributes: true, attributeFilter: ['class'] });
    if (brandDashboard) observer.observe(brandDashboard, { attributes: true, attributeFilter: ['class'] });
});

// ==================== FILTER FUNCTIONS ====================

function filterAthletesBySport(sport) {
    const cards = document.querySelectorAll('.athlete-discover-card');
    cards.forEach(card => {
        if (sport === 'all') {
            card.style.display = 'block';
        } else {
            const sportText = card.querySelector('.card-header p')?.textContent.toLowerCase() || '';
            card.style.display = sportText.includes(sport.toLowerCase()) ? 'block' : 'none';
        }
    });
}

function filterAthletesByGPA(minGPA) {
    const cards = document.querySelectorAll('.athlete-discover-card');
    cards.forEach(card => {
        const gpaText = card.querySelector('.card-stat .value')?.textContent || '0';
        const gpa = parseFloat(gpaText);
        card.style.display = gpa >= parseFloat(minGPA) ? 'block' : 'none';
    });
}

// Add filter event listeners
document.addEventListener('DOMContentLoaded', function() {
    const sportFilter = document.getElementById('sportFilter');
    const gpaFilter = document.getElementById('gpaFilter');

    if (sportFilter) {
        sportFilter.addEventListener('change', (e) => filterAthletesBySport(e.target.value));
    }

    if (gpaFilter) {
        gpaFilter.addEventListener('change', (e) => {
            if (e.target.value) filterAthletesByGPA(e.target.value);
        });
    }
});

// ==================== ROLE-BASED LOGIN ====================

// Select login role and show appropriate form
function selectLoginRole(role) {
    // Hide role selector
    const roleSelector = document.querySelector('.role-selector');
    if (roleSelector) roleSelector.style.display = 'none';

    // Hide all login forms first
    const forms = document.querySelectorAll('.login-form');
    forms.forEach(form => form.style.display = 'none');

    // Show the selected role's form
    const formId = role + 'LoginForm';
    const selectedForm = document.getElementById(formId);
    if (selectedForm) {
        selectedForm.style.display = 'block';
    }

    // Update role button states
    const roleButtons = document.querySelectorAll('.role-btn');
    roleButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.role === role) {
            btn.classList.add('active');
        }
    });
}

// Go back to role selector
function showRoleSelector() {
    // Hide all login forms
    const forms = document.querySelectorAll('.login-form');
    forms.forEach(form => form.style.display = 'none');

    // Show role selector
    const roleSelector = document.querySelector('.role-selector');
    if (roleSelector) roleSelector.style.display = 'block';

    // Remove active state from role buttons
    const roleButtons = document.querySelectorAll('.role-btn');
    roleButtons.forEach(btn => btn.classList.remove('active'));
}

// Handle Athlete Login
function handleAthleteLogin(event) {
    event.preventDefault();

    const email = document.getElementById('athleteEmail')?.value;
    const password = document.getElementById('athletePassword')?.value;

    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }

    // Simulate login validation
    if (email.includes('@')) {
        // Close login modal
        closeModal('loginModal');

        // Reset the login form
        showRoleSelector();
        document.getElementById('athleteLoginForm')?.reset();

        // Open athlete dashboard
        openAthleteDashboard();

        // Welcome message
        const athleteName = email.split('@')[0].split('.').map(s =>
            s.charAt(0).toUpperCase() + s.slice(1)
        ).join(' ');
        showToast(`Welcome back, ${athleteName}!`, 'success');
    } else {
        showToast('Invalid email format', 'error');
    }
}

// Handle Brand/Donor Login
function handleBrandLogin(event) {
    event.preventDefault();

    const email = document.getElementById('brandEmail')?.value;
    const password = document.getElementById('brandPassword')?.value;

    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }

    // Simulate login validation
    if (email.includes('@')) {
        // Close login modal
        closeModal('loginModal');

        // Reset the login form
        showRoleSelector();
        document.getElementById('brandLoginForm')?.reset();

        // Open brand dashboard
        openBrandDashboard();

        // Welcome message
        const companyName = email.split('@')[1]?.split('.')[0] || 'Partner';
        showToast(`Welcome back, ${companyName.charAt(0).toUpperCase() + companyName.slice(1)}!`, 'success');
    } else {
        showToast('Invalid email format', 'error');
    }
}

// Handle Social Login
function handleSocialLogin(provider) {
    showToast(`${provider} login coming soon!`, 'info');
}

// Reset login modal when closed
document.addEventListener('DOMContentLoaded', function() {
    // When login modal is closed, reset to role selector
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        const closeBtn = loginModal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                showRoleSelector();
                // Reset all forms
                document.getElementById('athleteLoginForm')?.reset();
                document.getElementById('brandLoginForm')?.reset();
                document.getElementById('directorLoginForm')?.reset();
            });
        }
    }
});

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GradeUp NIL** is a Name, Image, and Likeness (NIL) platform that connects student-athletes with brands and sponsors based on both academic excellence and athletic performance. The platform rewards scholar-athletes by showcasing their GPAs alongside their athletic achievements.

- **GitHub**: https://github.com/Hempp/gradeup-nil.git
- **Deployment**: Vercel
- **Tech Stack**: Vanilla JavaScript, HTML5, CSS3 (no framework)
- **Primary Users**: NCAA student-athletes, athletic directors, brands, donors

## Architecture

### Tech Stack Philosophy

This project intentionally uses **vanilla JavaScript** without frameworks to:
- Maximize performance and loading speed
- Minimize dependencies and complexity
- Ensure broad compatibility
- Simplify deployment and hosting

### Project Structure

```
gradeup-nil/
├── index.html              # Main single-page application (4,672 lines)
├── app.js                  # Application logic and data (3,819 lines)
├── styles.css              # Main stylesheet (5,159 lines)
├── src/
│   ├── components/
│   │   ├── Carousel.js     # Carousel component
│   │   └── Dropdown.js     # Dropdown navigation component
│   ├── styles/
│   │   ├── design-system.css       # Core design tokens and variables
│   │   ├── premium-10x.css         # Premium UI components
│   │   ├── premium-overrides.css   # Final polish layer
│   │   ├── dark-social-theme.css   # Dark mode social theme
│   │   ├── components.css          # Reusable component styles
│   │   └── homepage.css            # Homepage-specific styles
│   └── utils/
│       └── icons.js        # SVG icon system (39KB)
└── .vercel/                # Vercel deployment config
```

### CSS Architecture

The project uses a **layered CSS architecture** loaded in specific order:

1. **design-system.css** - Design tokens (colors, spacing, typography)
2. **premium-10x.css** - Premium component library
3. **styles.css** - Main application styles
4. **premium-overrides.css** - Final polish and overrides
5. **dark-social-theme.css** - Dark theme implementation

**Important**: The order matters. Don't reorganize CSS imports without understanding the cascade.

### Data Model

`athletesData` array in `app.js` contains athlete profiles with:
- Basic info (name, school, sport, position, year, major, GPA)
- Social metrics (followers, raised, sponsors)
- Verification status (enrollment, sport, grades)
- Data value object (valuation, scores, benchmarks, biometrics)

## Key Features

### Multi-Dashboard System

The platform has three distinct dashboard experiences:

1. **Athletic Director Dashboard** - Manage team rosters, verify athletes, track program-wide NIL activity
2. **Athlete Portal** - Personal profile, deal management, analytics, earnings tracking
3. **Brand/Donor Dashboard** - Browse athletes, manage campaigns, track ROI

**Navigation**: Dashboards are accessed via `openDirectorDashboard()`, `openAthleteDashboard()`, `openBrandDashboard()` functions.

### Verification System

Athletes have a multi-stage verification:
- `enrollmentVerified` - School enrollment confirmed
- `sportVerified` - Sport participation confirmed
- `gradesVerified` - GPA/transcript verified
- `verified` - All verifications complete

**Visual indicator**: Verified athletes show a blue checkmark badge.

### Design System

**Typography**:
- Headings: Bebas Neue (display font)
- Body: DM Sans (readable sans-serif)
- UI: Inter (clean interface font)

**Theme**: Nike-inspired premium design with:
- Dark social media aesthetic
- Bold typography and spacing
- High-contrast accents
- Smooth animations and transitions

## Development

### Local Development

```bash
# No build step needed - it's vanilla JavaScript!

# Option 1: Use any local server
python3 -m http.server 8000

# Option 2: Use Live Server VSCode extension

# Option 3: Use npx (if Node installed)
npx serve
```

Then open: http://localhost:8000

### Deployment

```bash
# Deploy to Vercel
vercel --prod

# Or use Vercel CLI for preview
vercel
```

The project is configured for Vercel automatic deployment on git push.

### Testing Changes

**Before committing**:
1. Test all three dashboards (Athletic Director, Athlete, Brand/Donor)
2. Verify mobile responsive design
3. Test modal interactions (login, signup, athlete profile)
4. Check hero stats counter animation
5. Verify navigation dropdown behavior

**Common testing scenarios**:
```javascript
// Test athlete card click
const athleteCard = document.querySelector('.athlete-card');
athleteCard.click();

// Test verification badge display
athletesData.filter(a => a.verified);

// Test modal system
openModal('loginModal');
closeModal();
```

## Code Patterns

### Modal System

```javascript
// Opening modals
openModal('modalId');

// Closing modals
closeModal();

// Available modals:
// - loginModal
// - signupModal
// - athleteSignupModal
// - brandSignupModal
// - athleteProfileModal
```

### Navigation Handling

```javascript
// Route mapping
const handleNavigation = (route) => {
  const routes = {
    'athletes': '/app/athletes',
    'brands': '/app/brands',
    // ...
  };
};

// Dashboard openers
openDirectorDashboard();
openAthleteDashboard();
openBrandDashboard();
```

### Dynamic Data Rendering

Athletes are rendered via template literals in JavaScript:
```javascript
function renderAthletes() {
  // Uses athletesData array
  // Generates cards with verification badges
  // Handles click events for profile modals
}
```

### SVG Icon System

Icons are defined in `src/utils/icons.js` as SVG strings:
```javascript
const icons = {
  verified: '<svg>...</svg>',
  // ...
};
```

Access via: `icons.iconName`

## Important Constraints

### NCAA Compliance

This platform must remain **NCAA compliant** for NIL activities:
- No pay-for-play (athletes compensated for NIL, not performance)
- Academic achievement emphasis is key differentiator
- Verification systems ensure authenticity

### Performance

Keep file sizes manageable:
- `app.js` is already 3,819 lines - consider splitting if adding major features
- Lazy load images using intersection observer
- Minimize CSS redundancy across theme files

### Design Consistency

When adding new components:
1. Use design tokens from `design-system.css`
2. Follow Nike-inspired aesthetic (bold, clean, athletic)
3. Maintain dark theme compatibility
4. Use Bebas Neue for display text, DM Sans for body

## Common Tasks

### Adding a New Athlete

1. Add to `athletesData` array in `app.js`
2. Include all required fields (see existing entries)
3. Set verification statuses appropriately
4. Provide realistic data values

### Creating New Dashboard Widget

1. Add HTML structure in `index.html` dashboard section
2. Style in appropriate CSS file (`premium-10x.css` for widgets)
3. Add initialization in dashboard open function
4. Wire up data bindings and event handlers

### Modifying Verification Flow

Verification logic is in `app.js`:
- Look for `verified`, `enrollmentVerified`, `sportVerified`, `gradesVerified` properties
- Badge rendering happens in athlete card template
- Update all three dashboard views if changing verification

### Updating Design Theme

1. Modify design tokens in `design-system.css` first
2. Override specific components in `premium-overrides.css`
3. Test in light and dark modes
4. Verify across all dashboards

## Git Workflow

Recent commits show focus on:
- UI/UX polish and premium design
- Dashboard functionality
- Icon system implementation
- Nike-inspired design language

**Commit pattern**:
```bash
git add .
git commit -m "Feature: description of change"
git push origin main
# Vercel auto-deploys
```

## Known Issues / Tech Debt

- `app.js` is large (3.8K lines) - consider splitting into modules
- Some CSS duplication across theme files
- Mobile menu could use UX improvements
- Dashboard state management is global - could benefit from structure
- No automated testing yet

## Future Enhancements

Consider adding:
- Backend API for data persistence
- Real authentication system
- Blockchain integration for crypto payments (mentioned in testimonials)
- Advanced analytics dashboards
- Automated GPA verification integration
- Mobile app version

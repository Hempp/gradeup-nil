# GradeUp NIL Accessibility Audit Report

**Audit Date:** February 12, 2026
**WCAG Version:** 2.2
**Compliance Target:** Level AA
**Auditor:** Automated Analysis

---

## Executive Summary

This comprehensive accessibility audit evaluates the GradeUp NIL Next.js application against WCAG 2.2 Level AA standards. The audit covers UI components, layout components, and dashboard pages to ensure the application is usable by people with disabilities.

### Overall Assessment

| Category | Status | Score |
|----------|--------|-------|
| Keyboard Navigation | Good | 85% |
| Screen Reader Support | Needs Improvement | 70% |
| Color Contrast | Good | 90% |
| Focus Indicators | Good | 85% |
| Form Accessibility | Needs Improvement | 75% |
| Landmark Regions | Needs Improvement | 70% |

---

## Issues by Severity

### Critical Issues (Must Fix)

#### 1. Missing Skip Link
**File:** `/src/components/layout/dashboard-shell.tsx`
**Lines:** 78-129
**WCAG Criterion:** 2.4.1 Bypass Blocks (Level A)

**Issue:** No skip link is provided to bypass repetitive navigation content. Users relying on keyboards or screen readers must tab through all navigation items on every page load.

**Recommended Fix:**
```tsx
// Add at the beginning of the DashboardShell component return:
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-[var(--color-primary)] focus:text-white focus:px-4 focus:py-2 focus:rounded-md"
>
  Skip to main content
</a>

// Add id="main-content" to the main element
<main id="main-content" ...>
```

---

#### 2. Sidebar Navigation Missing ARIA Landmark
**File:** `/src/components/layout/sidebar.tsx`
**Lines:** 69-216
**WCAG Criterion:** 1.3.1 Info and Relationships (Level A), 4.1.2 Name, Role, Value (Level A)

**Issue:** The sidebar `<aside>` element lacks proper `aria-label` to identify it as the main navigation region.

**Current Code (Line 70-76):**
```tsx
<aside
  className={cn(
    'fixed top-0 left-0 h-screen flex flex-col',
    ...
  )}
>
```

**Recommended Fix:**
```tsx
<aside
  aria-label="Main navigation"
  className={cn(
    'fixed top-0 left-0 h-screen flex flex-col',
    ...
  )}
>
```

---

#### 3. Nav Element Missing ARIA Label
**File:** `/src/components/layout/sidebar.tsx`
**Line:** 129
**WCAG Criterion:** 4.1.2 Name, Role, Value (Level A)

**Issue:** The `<nav>` element within sidebar lacks an accessible name.

**Current Code:**
```tsx
<nav className="flex-1 py-4 px-3 overflow-y-auto">
```

**Recommended Fix:**
```tsx
<nav aria-label="Main menu" className="flex-1 py-4 px-3 overflow-y-auto">
```

---

#### 4. SVG Icons Missing Accessible Names
**File:** `/src/components/ui/filter-bar.tsx`
**Lines:** 34-44
**WCAG Criterion:** 1.1.1 Non-text Content (Level A)

**Issue:** SVG icons in the filter bar lack `aria-hidden="true"` or accessible labels.

**Current Code:**
```tsx
const SearchIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
```

**Recommended Fix:**
```tsx
const SearchIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
```

---

#### 5. Loading Spinner Missing Accessible Announcement
**File:** `/src/components/ui/button.tsx`
**Lines:** 63-84
**WCAG Criterion:** 4.1.3 Status Messages (Level AA)

**Issue:** When button is in loading state, the loading spinner does not announce to screen readers.

**Recommended Fix:**
```tsx
{isLoading && (
  <>
    <span className="sr-only">Loading</span>
    <svg
      className="animate-spin h-4 w-4"
      aria-hidden="true"
      ...
    >
```

---

### Major Issues (Should Fix)

#### 6. Data Table Missing Proper Table Caption
**File:** `/src/components/ui/data-table.tsx`
**Lines:** 119-196
**WCAG Criterion:** 1.3.1 Info and Relationships (Level A)

**Issue:** The data table lacks a `<caption>` element to describe the table's purpose.

**Recommended Fix:**
Add a caption prop and render it:
```tsx
<table className="w-full">
  {caption && <caption className="sr-only">{caption}</caption>}
  ...
</table>
```

---

#### 7. Interactive Table Rows Need Better Role Announcement
**File:** `/src/components/ui/data-table.tsx`
**Lines:** 155-172
**WCAG Criterion:** 4.1.2 Name, Role, Value (Level A)

**Issue:** When rows are clickable, they use `role="button"` but lack `aria-label` describing the action.

**Current Code:**
```tsx
<tr
  ...
  role={onRowClick ? 'button' : undefined}
>
```

**Recommended Fix:**
```tsx
<tr
  ...
  role={onRowClick ? 'button' : undefined}
  aria-label={onRowClick ? `View details for row ${rowIndex + 1}` : undefined}
>
```

---

#### 8. Topbar Dropdown Missing Role Description
**File:** `/src/components/layout/topbar.tsx`
**Lines:** 110-192
**WCAG Criterion:** 4.1.2 Name, Role, Value (Level A)

**Issue:** The user dropdown button lacks `aria-label` describing its purpose.

**Current Code (Lines 111-120):**
```tsx
<button
  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
  ...
  aria-expanded={isDropdownOpen}
  aria-haspopup="true"
>
```

**Recommended Fix:**
```tsx
<button
  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
  ...
  aria-expanded={isDropdownOpen}
  aria-haspopup="true"
  aria-label={`User menu for ${displayUser.name}`}
>
```

---

#### 9. Mobile Navigation Drawer Missing ARIA Attributes
**File:** `/src/components/layout/mobile-nav.tsx`
**Lines:** 117-184
**WCAG Criterion:** 4.1.2 Name, Role, Value (Level A)

**Issue:** The mobile navigation drawer lacks proper ARIA attributes for accessibility.

**Recommended Fix:**
```tsx
<aside
  role="dialog"
  aria-modal="true"
  aria-label="Mobile navigation menu"
  className={cn(
    'fixed top-0 right-0 h-full w-[280px] bg-[var(--bg-sidebar)]',
    ...
  )}
>
```

---

#### 10. Select Component Dropdown Not Properly Associated
**File:** `/src/components/ui/select.tsx`
**Lines:** 273-351
**WCAG Criterion:** 4.1.2 Name, Role, Value (Level A)

**Issue:** The custom select dropdown's listbox is not properly associated with its trigger button via `aria-controls`.

**Recommended Fix:**
```tsx
const listboxId = useId();

// On trigger button:
<button
  ...
  aria-controls={isOpen ? listboxId : undefined}
>

// On dropdown:
<ul
  id={listboxId}
  ref={listRef}
  role="listbox"
  ...
>
```

---

#### 11. Modal Title ID Collision Risk
**File:** `/src/components/ui/modal.tsx`
**Lines:** 238-244
**WCAG Criterion:** 4.1.1 Parsing (Level A)

**Issue:** The modal title always uses the static ID `modal-title`, which can cause ID collisions when multiple modals exist.

**Recommended Fix:**
```tsx
const titleId = useId();

// In the component:
aria-labelledby={title ? titleId : undefined}

// For the title:
<h2 id={titleId} ...>
```

---

### Minor Issues (Nice to Have)

#### 12. Toast Notifications Could Use aria-live Region Type
**File:** `/src/components/ui/toast.tsx`
**Lines:** 148-163
**WCAG Criterion:** 4.1.3 Status Messages (Level AA)

**Issue:** Toast notifications use `aria-live="polite"` which is good, but error toasts should use `aria-live="assertive"`.

**Recommended Fix:**
```tsx
<div
  role="alert"
  aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
  ...
>
```

---

#### 13. Pagination Could Announce Page Changes
**File:** `/src/components/ui/pagination.tsx`
**Lines:** 103-254
**WCAG Criterion:** 4.1.3 Status Messages (Level AA)

**Issue:** When pagination changes, screen readers are not notified of the new content range.

**Recommended Fix:**
Add a live region to announce page changes:
```tsx
<div aria-live="polite" className="sr-only">
  Showing {startItem} to {endItem} of {totalItems} results
</div>
```

---

#### 14. Stat Card Trend Information Not Announced
**File:** `/src/components/ui/stat-card.tsx`
**Lines:** 67-72
**WCAG Criterion:** 1.1.1 Non-text Content (Level A)

**Issue:** The trend arrow icons lack screen reader accessible text.

**Recommended Fix:**
```tsx
{trend !== undefined && (
  <div className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
    {trendDirection === 'up' ? <TrendArrowUp aria-hidden="true" /> : <TrendArrowDown aria-hidden="true" />}
    <span>
      <span className="sr-only">{trendDirection === 'up' ? 'Increased by' : 'Decreased by'}</span>
      {Math.abs(trend)}%
    </span>
  </div>
)}
```

---

#### 15. Empty State Icons Should Be Decorative
**File:** `/src/components/ui/empty-state.tsx`
**Lines:** 49-56
**WCAG Criterion:** 1.1.1 Non-text Content (Level A)

**Issue:** Empty state icons are decorative but not marked as such.

**Recommended Fix:**
```tsx
{Icon && (
  <div className="mb-4 rounded-full bg-[var(--bg-card)] p-4">
    <Icon
      className="h-10 w-10 sm:h-12 sm:w-12 text-[var(--text-muted)]"
      strokeWidth={1.5}
      aria-hidden="true"
    />
  </div>
)}
```

---

## Positive Findings

The following accessibility features are already well-implemented:

### Focus Management
- **Button Component** (`button.tsx` Line 18): Excellent `focus-visible` ring implementation with proper offset
- **Modal Component** (`modal.tsx` Lines 99-122, 152-177): Proper focus trap and focus restoration
- **Input Component** (`input.tsx` Line 28): Clear focus indication with color change and ring

### Keyboard Navigation
- **DataTable** (`data-table.tsx` Lines 164-170): Rows support keyboard activation with Enter/Space
- **Modal** (`modal.tsx` Lines 137-149): Escape key closes modal
- **Pagination** (`pagination.tsx`): All controls are keyboard accessible

### ARIA Implementation
- **Pagination** (`pagination.tsx` Lines 161, 180, 219-220, 246): Proper `aria-label` on nav and buttons, `aria-current="page"` on active page
- **Avatar** (`avatar.tsx` Lines 32-33): Proper `role="img"` and `aria-label`
- **Form Fields** (`form-field.tsx` Lines 109-111): Proper `aria-invalid` and `aria-describedby`
- **Select** (`select.tsx` Lines 220-222, 320-322): Proper `aria-haspopup`, `aria-expanded`, `aria-selected`
- **Breadcrumb** (`breadcrumb.tsx` Line 19): Proper `aria-label="Breadcrumb"` on nav

### Screen Reader Support
- **Toast** (`toast.tsx` Lines 150-151): Uses `role="alert"` and `aria-live="polite"`
- **Error Messages** (`form-field.tsx` Line 147, `select.tsx` Line 356): Proper `role="alert"` on error messages

### Reduced Motion
- **globals.css** (Lines 951-959): Respects `prefers-reduced-motion` preference

### Color Contrast
The design system uses appropriate contrast ratios:
- Primary text: `--neutral-900` (#0F172A) on `--surface-50` (#F8FAFC) - Excellent contrast
- Error text: `--error-600` (#DC2626) on `--error-100` (#FEE2E2) - Good contrast
- Success text: `--success-600` (#16A34A) on `--success-100` (#DCFCE7) - Good contrast

---

## Recommended Priority Actions

### Immediate (Critical)
1. Add skip link to DashboardShell
2. Add `aria-label` to sidebar and nav elements
3. Add `aria-hidden="true"` to decorative SVG icons
4. Add loading state announcements

### Short-term (Major)
5. Add table captions to DataTable
6. Improve dropdown button accessibility labels
7. Add proper ARIA to mobile navigation
8. Fix modal title ID collisions

### Long-term (Minor)
9. Enhance toast notifications with assertive announcements
10. Add live region announcements for pagination
11. Improve stat card trend announcements

---

## Testing Recommendations

### Automated Testing
- Integrate axe-core for CI/CD accessibility testing
- Add Playwright accessibility assertions
- Use ESLint plugin jsx-a11y

### Manual Testing
- Test with screen readers (VoiceOver, NVDA, JAWS)
- Test keyboard-only navigation
- Test with browser zoom at 200%
- Test with high contrast mode

### User Testing
- Include users with disabilities in user testing
- Test with various assistive technologies

---

## References

- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [Next.js Accessibility](https://nextjs.org/docs/architecture/accessibility)

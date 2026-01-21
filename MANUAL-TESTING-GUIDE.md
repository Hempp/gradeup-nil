# Manual Accessibility Testing Guide

## Quick Start

Your local server is running at: **http://localhost:8000**

## 🎹 Keyboard Navigation Tests

### Test 1: Skip Link
1. Open http://localhost:8000 in a browser
2. Press **Tab** (first thing on page load)
3. **Expected**: Black "Skip to main content" link appears at top
4. Press **Enter**
5. **Expected**: Focus jumps to main content area

### Test 2: Modal Keyboard Access
1. Click "Get Started" button or press **Enter** on it
2. **Expected**: Login modal opens
3. Press **Tab** repeatedly
4. **Expected**: Focus cycles only within modal (trapped)
5. Press **Escape**
6. **Expected**: Modal closes, focus returns to "Get Started" button

### Test 3: Form Tab Order
1. Open login modal
2. Press **Tab** through all form fields
3. **Expected Order**:
   - Role selector (Athlete/Brand/Director)
   - Email field
   - Password field
   - Remember me checkbox
   - Forgot password link
   - Submit button
   - Back button

## ✏️ Form Validation Tests

### Test 4: Empty Form Submission
1. Open login modal → Select "Athlete Login"
2. Leave all fields empty
3. Click "Access Athlete Portal"
4. **Expected**: 
   - Red error messages appear below fields
   - "Email is required" message
   - "Password is required" message
   - Fields have red border
   - Screen reader announces errors (if using NVDA/JAWS)

### Test 5: Invalid Email
1. Enter: `notanemail` in email field
2. Click outside the field (blur)
3. **Expected**: "Please enter a valid email address" error
4. Fix email to: `athlete@university.edu`
5. **Expected**: Error clears, field turns green

### Test 6: Password Validation
1. Enter: `123` in password field
2. Tab away
3. **Expected**: "Password must be at least 8 characters" error
4. Enter valid password: `Password123`
5. **Expected**: Error clears

### Test 7: University Email Check
1. Enter: `athlete@gmail.com` in Director/Athlete login
2. Submit form
3. **Expected**: "Please use your university email address (.edu)" error

## 🖱️ Mouse-Free Navigation Test

### Test 8: Complete Flow Without Mouse
1. Unplug your mouse or don't touch it
2. Press **Tab** until "Get Started" is focused
3. Press **Enter** to open modal
4. Use **Tab** and **Shift+Tab** to navigate
5. Fill out form using keyboard only
6. Submit with **Enter**
7. Close modal with **Escape**
8. **Expected**: Everything works perfectly without mouse

## 📱 Screen Reader Tests

### Test 9: NVDA (Windows) / VoiceOver (Mac)

**macOS VoiceOver**:
1. Press **Cmd + F5** to enable VoiceOver
2. Navigate to http://localhost:8000
3. Press **Tab** through the page
4. **Expected Announcements**:
   - Form labels read before field names
   - "Email, edit text, required"
   - Error messages announced in "alert" region
   - Modal announced as "dialog"

**Windows NVDA**:
1. Start NVDA (download from nvaccess.org)
2. Navigate with **Tab** and **Arrow keys**
3. **Expected**: Similar announcements as VoiceOver

### Test 10: Image Alt Text
1. Enable screen reader
2. Navigate through athlete cards
3. **Expected**: Each image announced as:
   - "[Athlete Name] profile photo" or
   - "Athlete profile photo"

## 🎨 Visual Tests

### Test 11: Focus Indicators
1. Press **Tab** repeatedly through the page
2. **Expected**: Every focused element shows blue 2px outline
3. Check buttons, links, inputs all have visible focus

### Test 12: Error States
1. Submit empty form
2. **Expected Visual Indicators**:
   - Red border on invalid fields
   - Light red background tint
   - Red error text below fields
   - Error icon (if present)

## ♿ Reduced Motion Test

### Test 13: Prefers Reduced Motion
1. **macOS**: System Settings → Accessibility → Display → Reduce motion (ON)
2. **Windows**: Settings → Ease of Access → Display → Show animations (OFF)
3. Refresh page
4. **Expected**: All animations disabled or extremely fast

## 📋 Checklist

Use this checklist to verify all tests:

- [ ] Skip link appears and works (Test 1)
- [ ] Modal keyboard accessible (Test 2)
- [ ] Tab order logical (Test 3)
- [ ] Empty form shows errors (Test 4)
- [ ] Invalid email validation (Test 5)
- [ ] Password validation (Test 6)
- [ ] University email check (Test 7)
- [ ] Complete navigation without mouse (Test 8)
- [ ] Screen reader announces correctly (Test 9)
- [ ] Image alt text works (Test 10)
- [ ] Focus indicators visible (Test 11)
- [ ] Error states display (Test 12)
- [ ] Reduced motion works (Test 13)

## 🐛 Common Issues to Watch For

❌ **Focus disappears** - Focus trap might be broken
❌ **Can't close modal with Escape** - Event listener missing
❌ **Errors don't clear on focus** - Validation not working
❌ **Screen reader silent** - ARIA attributes missing
❌ **No focus indicator** - CSS not loaded

## ✅ All Tests Should Pass

If any test fails, check:
1. `accessibility.css` is loaded (check Network tab)
2. No JavaScript errors (check Console)
3. Browser cache cleared (Cmd+Shift+R or Ctrl+Shift+R)

---

**Need Help?**
- Check browser console for errors (F12 → Console)
- Verify server is running: `curl http://localhost:8000`
- Review ACCESSIBILITY-IMPROVEMENTS.md for implementation details

/**
 * DOM Helpers Utility Tests
 * Tests for src/utils/dom-helpers.js
 *
 * The dom-helpers module uses an IIFE pattern that attaches to window.
 * We test DOM element creation, modal behavior, and UI component helpers.
 */

import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import vm from 'vm';

// Load and execute the dom-helpers script before tests
beforeAll(() => {
  const scriptContent = readFileSync('./src/utils/dom-helpers.js', 'utf-8');
  vm.runInThisContext(scriptContent);
});

// Clean up DOM and event listeners after each test
afterEach(() => {
  document.body.textContent = '';
  vi.restoreAllMocks();
});

// ============================================================================
// createFormGroup Tests
// ============================================================================
describe('createFormGroup', () => {
  describe('basic functionality', () => {
    it('creates a form group element', () => {
      const group = window.createFormGroup({
        id: 'test-input',
        label: 'Test Label',
        type: 'text'
      });

      expect(group).toBeInstanceOf(HTMLElement);
      expect(group.className).toBe('form-group');
    });

    it('creates label with correct attributes', () => {
      const group = window.createFormGroup({
        id: 'test-input',
        label: 'Test Label'
      });

      const label = group.querySelector('label');
      expect(label).not.toBe(null);
      expect(label.className).toBe('form-label');
      expect(label.htmlFor).toBe('test-input');
      expect(label.textContent).toBe('Test Label');
    });

    it('creates input with correct attributes', () => {
      const group = window.createFormGroup({
        id: 'email-input',
        label: 'Email',
        type: 'email',
        placeholder: 'Enter email'
      });

      const input = group.querySelector('input');
      expect(input).not.toBe(null);
      expect(input.type).toBe('email');
      expect(input.id).toBe('email-input');
      expect(input.name).toBe('email-input');
      expect(input.className).toBe('form-input');
      expect(input.placeholder).toBe('Enter email');
    });

    it('sets aria-label for accessibility', () => {
      const group = window.createFormGroup({
        id: 'test',
        label: 'Accessible Label'
      });

      const input = group.querySelector('input');
      expect(input.getAttribute('aria-label')).toBe('Accessible Label');
    });

    it('sets required attribute when specified', () => {
      const group = window.createFormGroup({
        id: 'required-input',
        label: 'Required Field',
        required: true
      });

      const input = group.querySelector('input');
      expect(input.required).toBe(true);
    });

    it('does not set required attribute when false', () => {
      const group = window.createFormGroup({
        id: 'optional-input',
        label: 'Optional Field',
        required: false
      });

      const input = group.querySelector('input');
      expect(input.required).toBe(false);
    });

    it('sets initial value when provided', () => {
      const group = window.createFormGroup({
        id: 'prefilled',
        label: 'Name',
        value: 'John Doe'
      });

      const input = group.querySelector('input');
      expect(input.value).toBe('John Doe');
    });
  });

  describe('input type variants', () => {
    it('creates text input by default', () => {
      const group = window.createFormGroup({ id: 'default' });
      const input = group.querySelector('input');
      expect(input.type).toBe('text');
    });

    it('creates password input', () => {
      const group = window.createFormGroup({
        id: 'password',
        type: 'password'
      });
      const input = group.querySelector('input');
      expect(input.type).toBe('password');
    });

    it('creates email input', () => {
      const group = window.createFormGroup({
        id: 'email',
        type: 'email'
      });
      const input = group.querySelector('input');
      expect(input.type).toBe('email');
    });

    it('creates number input', () => {
      const group = window.createFormGroup({
        id: 'number',
        type: 'number'
      });
      const input = group.querySelector('input');
      expect(input.type).toBe('number');
    });

    it('creates date input', () => {
      const group = window.createFormGroup({
        id: 'date',
        type: 'date'
      });
      const input = group.querySelector('input');
      expect(input.type).toBe('date');
    });
  });

  describe('edge cases', () => {
    it('handles empty options object', () => {
      const group = window.createFormGroup({});

      expect(group).toBeInstanceOf(HTMLElement);
      const input = group.querySelector('input');
      expect(input).not.toBe(null);
      // ID should be auto-generated
      expect(input.id).toMatch(/^input-\d+$/);
    });

    it('handles null options', () => {
      const group = window.createFormGroup(null);

      expect(group).toBeInstanceOf(HTMLElement);
    });

    it('handles undefined options', () => {
      const group = window.createFormGroup(undefined);

      expect(group).toBeInstanceOf(HTMLElement);
    });

    it('handles empty strings', () => {
      const group = window.createFormGroup({
        id: '',
        label: '',
        placeholder: ''
      });

      expect(group).toBeInstanceOf(HTMLElement);
    });
  });
});

// ============================================================================
// createSelectGroup Tests
// ============================================================================
describe('createSelectGroup', () => {
  describe('basic functionality', () => {
    it('creates a form group with select element', () => {
      const group = window.createSelectGroup({
        id: 'sport-select',
        label: 'Sport',
        options: [
          { value: 'basketball', label: 'Basketball' },
          { value: 'football', label: 'Football' }
        ]
      });

      expect(group.className).toBe('form-group');
      const select = group.querySelector('select');
      expect(select).not.toBe(null);
    });

    it('creates options correctly', () => {
      const group = window.createSelectGroup({
        id: 'sport-select',
        label: 'Sport',
        options: [
          { value: 'basketball', label: 'Basketball' },
          { value: 'football', label: 'Football' },
          { value: 'baseball', label: 'Baseball' }
        ]
      });

      const select = group.querySelector('select');
      const options = select.querySelectorAll('option');
      expect(options.length).toBe(3);
      expect(options[0].value).toBe('basketball');
      expect(options[0].textContent).toBe('Basketball');
    });

    it('sets select attributes correctly', () => {
      const group = window.createSelectGroup({
        id: 'test-select',
        label: 'Test Select',
        required: true
      });

      const select = group.querySelector('select');
      expect(select.id).toBe('test-select');
      expect(select.name).toBe('test-select');
      expect(select.className).toBe('form-select');
      expect(select.required).toBe(true);
      expect(select.getAttribute('aria-label')).toBe('Test Select');
    });

    it('sets initial selected value', () => {
      const group = window.createSelectGroup({
        id: 'sport-select',
        label: 'Sport',
        options: [
          { value: 'basketball', label: 'Basketball' },
          { value: 'football', label: 'Football' }
        ],
        value: 'football'
      });

      const select = group.querySelector('select');
      const footballOption = select.querySelector('option[value="football"]');
      expect(footballOption.selected).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty options array', () => {
      const group = window.createSelectGroup({
        id: 'empty-select',
        label: 'Empty',
        options: []
      });

      const select = group.querySelector('select');
      expect(select.querySelectorAll('option').length).toBe(0);
    });

    it('handles missing options', () => {
      const group = window.createSelectGroup({
        id: 'no-options',
        label: 'No Options'
      });

      const select = group.querySelector('select');
      expect(select).not.toBe(null);
    });

    it('handles null options object', () => {
      const group = window.createSelectGroup(null);
      expect(group).toBeInstanceOf(HTMLElement);
    });
  });
});

// ============================================================================
// createTextareaGroup Tests
// ============================================================================
describe('createTextareaGroup', () => {
  describe('basic functionality', () => {
    it('creates a form group with textarea', () => {
      const group = window.createTextareaGroup({
        id: 'bio-input',
        label: 'Biography',
        placeholder: 'Enter your bio'
      });

      expect(group.className).toBe('form-group');
      const textarea = group.querySelector('textarea');
      expect(textarea).not.toBe(null);
    });

    it('sets textarea attributes correctly', () => {
      const group = window.createTextareaGroup({
        id: 'bio',
        label: 'Bio',
        placeholder: 'Tell us about yourself',
        required: true,
        rows: 6
      });

      const textarea = group.querySelector('textarea');
      expect(textarea.id).toBe('bio');
      expect(textarea.name).toBe('bio');
      expect(textarea.className).toBe('form-textarea');
      expect(textarea.placeholder).toBe('Tell us about yourself');
      expect(textarea.required).toBe(true);
      // rows returns a string in happy-dom, so use getAttribute
      expect(textarea.getAttribute('rows')).toBe('6');
      expect(textarea.getAttribute('aria-label')).toBe('Bio');
    });

    it('uses default rows of 4', () => {
      const group = window.createTextareaGroup({
        id: 'default-rows',
        label: 'Default'
      });

      const textarea = group.querySelector('textarea');
      // rows returns a string in happy-dom
      expect(textarea.getAttribute('rows')).toBe('4');
    });
  });

  describe('edge cases', () => {
    it('handles empty options', () => {
      const group = window.createTextareaGroup({});
      const textarea = group.querySelector('textarea');
      expect(textarea).not.toBe(null);
    });

    it('handles null options', () => {
      const group = window.createTextareaGroup(null);
      expect(group).toBeInstanceOf(HTMLElement);
    });
  });
});

// ============================================================================
// createButton Tests
// ============================================================================
describe('createButton', () => {
  describe('basic functionality', () => {
    it('creates a button element', () => {
      const btn = window.createButton({
        text: 'Click Me'
      });

      expect(btn.tagName).toBe('BUTTON');
      expect(btn.textContent).toBe('Click Me');
    });

    it('sets button type correctly', () => {
      const submitBtn = window.createButton({
        text: 'Submit',
        type: 'submit'
      });
      expect(submitBtn.type).toBe('submit');

      const regularBtn = window.createButton({
        text: 'Button',
        type: 'button'
      });
      expect(regularBtn.type).toBe('button');
    });

    it('defaults to button type', () => {
      const btn = window.createButton({ text: 'Default' });
      expect(btn.type).toBe('button');
    });

    it('defaults to primary variant', () => {
      const btn = window.createButton({ text: 'Primary' });
      expect(btn.className).toBe('btn btn-primary');
    });
  });

  describe('variant styles', () => {
    const variants = ['primary', 'secondary', 'outline', 'ghost', 'danger', 'success'];

    variants.forEach(variant => {
      it(`applies ${variant} variant class`, () => {
        const btn = window.createButton({
          text: 'Button',
          variant: variant
        });
        expect(btn.className).toContain(`btn-${variant}`);
      });
    });
  });

  describe('size variants', () => {
    it('applies sm size class', () => {
      const btn = window.createButton({
        text: 'Small',
        size: 'sm'
      });
      expect(btn.className).toContain('btn-sm');
    });

    it('applies lg size class', () => {
      const btn = window.createButton({
        text: 'Large',
        size: 'lg'
      });
      expect(btn.className).toContain('btn-lg');
    });

    it('applies no size class by default', () => {
      const btn = window.createButton({ text: 'Default Size' });
      expect(btn.className).not.toContain('btn-sm');
      expect(btn.className).not.toContain('btn-lg');
    });
  });

  describe('block button', () => {
    it('applies block class when block is true', () => {
      const btn = window.createButton({
        text: 'Block',
        block: true
      });
      expect(btn.className).toContain('btn-block');
    });

    it('does not apply block class when false', () => {
      const btn = window.createButton({
        text: 'Normal',
        block: false
      });
      expect(btn.className).not.toContain('btn-block');
    });
  });

  describe('click handler', () => {
    it('attaches click handler', () => {
      const mockHandler = vi.fn();
      const btn = window.createButton({
        text: 'Click',
        onClick: mockHandler
      });

      btn.click();
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('does not throw when no onClick provided', () => {
      const btn = window.createButton({ text: 'No Handler' });
      expect(() => btn.click()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('handles empty options', () => {
      const btn = window.createButton({});
      expect(btn.textContent).toBe('Button');
    });

    it('handles null options', () => {
      const btn = window.createButton(null);
      expect(btn).toBeInstanceOf(HTMLElement);
    });

    it('handles undefined options', () => {
      const btn = window.createButton(undefined);
      expect(btn).toBeInstanceOf(HTMLElement);
    });
  });
});

// ============================================================================
// createModal Tests
// ============================================================================
describe('createModal', () => {
  describe('basic functionality', () => {
    it('returns modal object with required properties', () => {
      const modal = window.createModal({
        title: 'Test Modal',
        content: 'Modal content'
      });

      expect(modal).toHaveProperty('backdrop');
      expect(modal).toHaveProperty('modal');
      expect(modal).toHaveProperty('body');
      expect(modal).toHaveProperty('close');
      expect(modal).toHaveProperty('show');
    });

    it('creates backdrop with correct class', () => {
      const modal = window.createModal({
        title: 'Test'
      });

      expect(modal.backdrop.className).toBe('modal-backdrop');
    });

    it('creates modal container with correct class', () => {
      const modal = window.createModal({
        title: 'Test'
      });

      expect(modal.modal.className).toBe('modal-container');
    });

    it('sets modal title', () => {
      const modal = window.createModal({
        title: 'Custom Title'
      });

      const titleEl = modal.modal.querySelector('.modal-title');
      expect(titleEl.textContent).toBe('Custom Title');
    });

    it('sets string content in body', () => {
      const modal = window.createModal({
        title: 'Test',
        content: 'This is the body content'
      });

      expect(modal.body.textContent).toBe('This is the body content');
    });

    it('appends HTMLElement content to body', () => {
      const contentEl = document.createElement('div');
      contentEl.textContent = 'Custom Element';
      contentEl.className = 'custom-content';

      const modal = window.createModal({
        title: 'Test',
        content: contentEl
      });

      const customContent = modal.body.querySelector('.custom-content');
      expect(customContent).not.toBe(null);
      expect(customContent.textContent).toBe('Custom Element');
    });
  });

  describe('footer behavior', () => {
    it('shows footer by default', () => {
      const modal = window.createModal({
        title: 'Test'
      });

      const footer = modal.modal.querySelector('.modal-footer');
      expect(footer).not.toBe(null);
    });

    it('hides footer when showFooter is false', () => {
      const modal = window.createModal({
        title: 'Test',
        showFooter: false
      });

      const footer = modal.modal.querySelector('.modal-footer');
      expect(footer).toBe(null);
    });

    it('footer has close button', () => {
      const modal = window.createModal({
        title: 'Test',
        showFooter: true
      });

      const footer = modal.modal.querySelector('.modal-footer');
      const closeBtn = footer.querySelector('button');
      expect(closeBtn).not.toBe(null);
      expect(closeBtn.textContent).toBe('Close');
    });
  });

  describe('close functionality', () => {
    it('close button in header has correct label', () => {
      const modal = window.createModal({
        title: 'Test'
      });

      const closeBtn = modal.modal.querySelector('.modal-close');
      expect(closeBtn).not.toBe(null);
      expect(closeBtn.getAttribute('aria-label')).toBe('Close modal');
    });

    it('calling close() removes modal from DOM', () => {
      const modal = window.createModal({ title: 'Test' });
      document.body.appendChild(modal.backdrop);

      expect(document.body.contains(modal.backdrop)).toBe(true);
      modal.close();
      expect(document.body.contains(modal.backdrop)).toBe(false);
    });

    it('onClose callback is called when closing', () => {
      const onClose = vi.fn();
      const modal = window.createModal({
        title: 'Test',
        onClose: onClose
      });

      document.body.appendChild(modal.backdrop);
      modal.close();

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('clicking backdrop closes modal', () => {
      const onClose = vi.fn();
      const modal = window.createModal({
        title: 'Test',
        onClose: onClose
      });

      document.body.appendChild(modal.backdrop);

      // Simulate click on backdrop (not on modal content)
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: modal.backdrop });
      modal.backdrop.dispatchEvent(event);

      expect(onClose).toHaveBeenCalled();
    });

    it('clicking modal content does not close modal', () => {
      const onClose = vi.fn();
      const modal = window.createModal({
        title: 'Test',
        onClose: onClose
      });

      document.body.appendChild(modal.backdrop);

      // Simulate click on modal content
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: modal.modal });
      modal.backdrop.dispatchEvent(event);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('ESC key closes modal', () => {
      const onClose = vi.fn();
      const modal = window.createModal({
        title: 'Test',
        onClose: onClose
      });

      document.body.appendChild(modal.backdrop);

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('show functionality', () => {
    it('show() appends modal to body', () => {
      const modal = window.createModal({ title: 'Test' });

      expect(document.body.contains(modal.backdrop)).toBe(false);
      modal.show();
      expect(document.body.contains(modal.backdrop)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty options', () => {
      const modal = window.createModal({});
      expect(modal.backdrop).toBeInstanceOf(HTMLElement);
    });

    it('handles null options', () => {
      const modal = window.createModal(null);
      expect(modal.backdrop).toBeInstanceOf(HTMLElement);
    });

    it('uses default title of "Modal"', () => {
      const modal = window.createModal({});
      const titleEl = modal.modal.querySelector('.modal-title');
      expect(titleEl.textContent).toBe('Modal');
    });
  });
});

// ============================================================================
// createCard Tests
// ============================================================================
describe('createCard', () => {
  describe('basic functionality', () => {
    it('creates a card element with glass-card class', () => {
      const card = window.createCard({
        title: 'Test Card',
        content: 'Card content'
      });

      expect(card.className).toBe('glass-card');
    });

    it('creates card header with title', () => {
      const card = window.createCard({
        title: 'My Card',
        content: 'Content'
      });

      const header = card.querySelector('.card-header');
      expect(header).not.toBe(null);
      const title = header.querySelector('.card-title');
      expect(title.textContent).toBe('My Card');
    });

    it('creates card body with string content', () => {
      const card = window.createCard({
        title: 'Title',
        content: 'This is the content'
      });

      const body = card.querySelector('.card-body');
      expect(body.textContent).toBe('This is the content');
    });

    it('creates card body with HTMLElement content', () => {
      const contentEl = document.createElement('p');
      contentEl.textContent = 'Paragraph content';
      contentEl.className = 'test-paragraph';

      const card = window.createCard({
        title: 'Title',
        content: contentEl
      });

      const body = card.querySelector('.card-body');
      const paragraph = body.querySelector('.test-paragraph');
      expect(paragraph).not.toBe(null);
    });
  });

  describe('action button', () => {
    it('creates action button when actionText provided', () => {
      const card = window.createCard({
        title: 'Card',
        actionText: 'View All'
      });

      const actionBtn = card.querySelector('.card-action');
      expect(actionBtn).not.toBe(null);
      expect(actionBtn.textContent).toBe('View All');
    });

    it('action button calls onAction handler', () => {
      const onAction = vi.fn();
      const card = window.createCard({
        title: 'Card',
        actionText: 'Click',
        onAction: onAction
      });

      const actionBtn = card.querySelector('.card-action');
      actionBtn.click();
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('does not create action button when no actionText', () => {
      const card = window.createCard({
        title: 'Card',
        content: 'Content'
      });

      const actionBtn = card.querySelector('.card-action');
      expect(actionBtn).toBe(null);
    });
  });

  describe('header visibility', () => {
    it('creates header when title is provided', () => {
      const card = window.createCard({ title: 'Title' });
      expect(card.querySelector('.card-header')).not.toBe(null);
    });

    it('creates header when actionText is provided', () => {
      const card = window.createCard({ actionText: 'Action' });
      expect(card.querySelector('.card-header')).not.toBe(null);
    });

    it('does not create header when no title or actionText', () => {
      const card = window.createCard({ content: 'Content only' });
      expect(card.querySelector('.card-header')).toBe(null);
    });
  });

  describe('edge cases', () => {
    it('handles empty options', () => {
      const card = window.createCard({});
      expect(card.className).toBe('glass-card');
    });

    it('handles null options', () => {
      const card = window.createCard(null);
      expect(card).toBeInstanceOf(HTMLElement);
    });
  });
});

// ============================================================================
// createStatusBadge Tests
// ============================================================================
describe('createStatusBadge', () => {
  describe('basic functionality', () => {
    it('creates a span element', () => {
      const badge = window.createStatusBadge('active', 'Active');
      expect(badge.tagName).toBe('SPAN');
    });

    it('has status-badge class', () => {
      const badge = window.createStatusBadge('active', 'Active');
      expect(badge.className).toContain('status-badge');
    });

    it('has status class', () => {
      const badge = window.createStatusBadge('active', 'Active');
      expect(badge.className).toContain('active');
    });

    it('sets text content', () => {
      const badge = window.createStatusBadge('active', 'Currently Active');
      expect(badge.textContent).toBe('Currently Active');
    });
  });

  describe('status variants', () => {
    const statuses = ['pending', 'active', 'verified', 'completed', 'declined', 'flagged'];

    statuses.forEach(status => {
      it(`creates badge with ${status} status`, () => {
        const badge = window.createStatusBadge(status, status);
        expect(badge.className).toContain(status);
      });
    });
  });

  describe('default values', () => {
    it('uses status as text when text not provided', () => {
      const badge = window.createStatusBadge('pending');
      expect(badge.textContent).toBe('pending');
    });

    it('defaults to pending status when not provided', () => {
      const badge = window.createStatusBadge();
      expect(badge.className).toContain('pending');
      expect(badge.textContent).toBe('pending');
    });

    it('handles null status', () => {
      const badge = window.createStatusBadge(null, 'Text');
      expect(badge.className).toContain('pending');
      expect(badge.textContent).toBe('Text');
    });

    it('handles null text with valid status', () => {
      const badge = window.createStatusBadge('active', null);
      expect(badge.textContent).toBe('active');
    });
  });
});

// ============================================================================
// createSkeleton Tests
// ============================================================================
describe('createSkeleton', () => {
  describe('basic functionality', () => {
    it('creates a div element', () => {
      const skeleton = window.createSkeleton({});
      expect(skeleton.tagName).toBe('DIV');
    });

    it('has skeleton class', () => {
      const skeleton = window.createSkeleton({});
      expect(skeleton.className).toBe('skeleton');
    });

    it('sets width style', () => {
      const skeleton = window.createSkeleton({ width: '200px' });
      expect(skeleton.style.width).toBe('200px');
    });

    it('sets height style', () => {
      const skeleton = window.createSkeleton({ height: '40px' });
      expect(skeleton.style.height).toBe('40px');
    });

    it('sets border radius style', () => {
      const skeleton = window.createSkeleton({ borderRadius: '8px' });
      expect(skeleton.style.borderRadius).toBe('8px');
    });
  });

  describe('default values', () => {
    it('defaults width to 100%', () => {
      const skeleton = window.createSkeleton({});
      expect(skeleton.style.width).toBe('100%');
    });

    it('defaults height to 20px', () => {
      const skeleton = window.createSkeleton({});
      expect(skeleton.style.height).toBe('20px');
    });

    it('defaults border radius to 4px', () => {
      const skeleton = window.createSkeleton({});
      expect(skeleton.style.borderRadius).toBe('4px');
    });
  });

  describe('animation styles', () => {
    it('has shimmer animation', () => {
      const skeleton = window.createSkeleton({});
      expect(skeleton.style.animation).toContain('shimmer');
    });

    it('has background style applied', () => {
      const skeleton = window.createSkeleton({});
      // happy-dom may not preserve complex CSS like linear-gradient
      // Instead, verify that some background-related style is set
      // by checking cssText which should contain the raw CSS
      expect(skeleton.style.cssText.length).toBeGreaterThan(0);
      // The createSkeleton sets backgroundSize which should be preserved
      expect(skeleton.style.backgroundSize).toBe('200% 100%');
    });
  });

  describe('edge cases', () => {
    it('handles empty options', () => {
      const skeleton = window.createSkeleton({});
      expect(skeleton).toBeInstanceOf(HTMLElement);
    });

    it('handles null options', () => {
      const skeleton = window.createSkeleton(null);
      expect(skeleton).toBeInstanceOf(HTMLElement);
    });

    it('handles percentage widths', () => {
      const skeleton = window.createSkeleton({ width: '50%' });
      expect(skeleton.style.width).toBe('50%');
    });

    it('handles circular skeleton (50% border radius)', () => {
      const skeleton = window.createSkeleton({ borderRadius: '50%' });
      expect(skeleton.style.borderRadius).toBe('50%');
    });
  });
});

// ============================================================================
// showAlert Tests
// ============================================================================
describe('showAlert', () => {
  describe('basic functionality', () => {
    it('appends overlay to body', () => {
      window.showAlert('Test message');

      const overlay = document.querySelector('.custom-alert-overlay');
      expect(overlay).not.toBe(null);
    });

    it('sets message text', () => {
      window.showAlert('This is the alert message');

      const message = document.querySelector('#alertMessage');
      expect(message.textContent).toBe('This is the alert message');
    });

    it('uses default title "Notice"', () => {
      window.showAlert('Message');

      const title = document.querySelector('#alertTitle');
      expect(title.textContent).toBe('Notice');
    });

    it('uses custom title when provided', () => {
      window.showAlert('Message', null, { title: 'Custom Title' });

      const title = document.querySelector('#alertTitle');
      expect(title.textContent).toBe('Custom Title');
    });

    it('uses custom button text when provided', () => {
      window.showAlert('Message', null, { buttonText: 'Got it' });

      const btn = document.querySelector('.btn-primary');
      expect(btn.textContent).toBe('Got it');
    });
  });

  describe('accessibility', () => {
    it('has alertdialog role', () => {
      window.showAlert('Message');

      const overlay = document.querySelector('.custom-alert-overlay');
      expect(overlay.getAttribute('role')).toBe('alertdialog');
    });

    it('has aria-modal attribute', () => {
      window.showAlert('Message');

      const overlay = document.querySelector('.custom-alert-overlay');
      expect(overlay.getAttribute('aria-modal')).toBe('true');
    });

    it('has aria-labelledby pointing to title', () => {
      window.showAlert('Message');

      const overlay = document.querySelector('.custom-alert-overlay');
      expect(overlay.getAttribute('aria-labelledby')).toBe('alertTitle');
    });

    it('has aria-describedby pointing to message', () => {
      window.showAlert('Message');

      const overlay = document.querySelector('.custom-alert-overlay');
      expect(overlay.getAttribute('aria-describedby')).toBe('alertMessage');
    });
  });

  describe('close behavior', () => {
    it('clicking OK removes overlay (after animation)', async () => {
      vi.useFakeTimers();
      window.showAlert('Message');

      const btn = document.querySelector('.btn-primary');
      btn.click();

      vi.advanceTimersByTime(400); // Wait for animation

      expect(document.querySelector('.custom-alert-overlay')).toBe(null);
      vi.useRealTimers();
    });

    it('calls callback after OK is clicked', async () => {
      vi.useFakeTimers();
      const callback = vi.fn();
      window.showAlert('Message', callback);

      const btn = document.querySelector('.btn-primary');
      btn.click();

      vi.advanceTimersByTime(400);

      expect(callback).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('ESC key triggers OK button click', () => {
      vi.useFakeTimers();
      window.showAlert('Message');

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      vi.advanceTimersByTime(400);

      expect(document.querySelector('.custom-alert-overlay')).toBe(null);
      vi.useRealTimers();
    });
  });
});

// ============================================================================
// showConfirm Tests
// ============================================================================
describe('showConfirm', () => {
  describe('basic functionality', () => {
    it('appends overlay to body', () => {
      window.showConfirm('Are you sure?', () => {}, () => {});

      const overlay = document.querySelector('.custom-alert-overlay');
      expect(overlay).not.toBe(null);
    });

    it('sets message text', () => {
      window.showConfirm('Delete this item?', () => {}, () => {});

      const message = document.querySelector('#confirmMessage');
      expect(message.textContent).toBe('Delete this item?');
    });

    it('uses default title "Confirm"', () => {
      window.showConfirm('Message', () => {}, () => {});

      const title = document.querySelector('#confirmTitle');
      expect(title.textContent).toBe('Confirm');
    });

    it('has cancel and confirm buttons', () => {
      window.showConfirm('Message', () => {}, () => {});

      const buttons = document.querySelectorAll('.modal-actions button');
      expect(buttons.length).toBe(2);
    });

    it('uses default button texts', () => {
      window.showConfirm('Message', () => {}, () => {});

      const buttons = document.querySelectorAll('.modal-actions button');
      expect(buttons[0].textContent).toBe('No'); // Cancel
      expect(buttons[1].textContent).toBe('Yes'); // Confirm
    });
  });

  describe('custom options', () => {
    it('uses custom title', () => {
      window.showConfirm('Message', () => {}, () => {}, { title: 'Delete Item' });

      const title = document.querySelector('#confirmTitle');
      expect(title.textContent).toBe('Delete Item');
    });

    it('uses custom button texts', () => {
      window.showConfirm('Message', () => {}, () => {}, {
        confirmText: 'Delete',
        cancelText: 'Keep'
      });

      const buttons = document.querySelectorAll('.modal-actions button');
      expect(buttons[0].textContent).toBe('Keep');
      expect(buttons[1].textContent).toBe('Delete');
    });

    it('applies danger styling when danger option is true', () => {
      window.showConfirm('Delete?', () => {}, () => {}, { danger: true });

      const confirmBtn = document.querySelector('.btn-danger');
      expect(confirmBtn).not.toBe(null);
    });

    it('uses primary styling by default', () => {
      window.showConfirm('Confirm?', () => {}, () => {}, { danger: false });

      const confirmBtn = document.querySelector('.btn-primary');
      expect(confirmBtn).not.toBe(null);
    });
  });

  describe('confirm callback', () => {
    it('calls onConfirm when confirm button clicked', () => {
      vi.useFakeTimers();
      const onConfirm = vi.fn();
      window.showConfirm('Confirm?', onConfirm);

      const confirmBtn = document.querySelector('.btn-primary');
      confirmBtn.click();

      vi.advanceTimersByTime(400);

      expect(onConfirm).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('does not call onCancel when confirm button clicked', () => {
      vi.useFakeTimers();
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      window.showConfirm('Confirm?', onConfirm, onCancel);

      const confirmBtn = document.querySelector('.btn-primary');
      confirmBtn.click();

      vi.advanceTimersByTime(400);

      expect(onCancel).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('cancel callback', () => {
    it('calls onCancel when cancel button clicked', () => {
      vi.useFakeTimers();
      const onCancel = vi.fn();
      window.showConfirm('Confirm?', () => {}, onCancel);

      const cancelBtn = document.querySelector('.btn-secondary');
      cancelBtn.click();

      vi.advanceTimersByTime(400);

      expect(onCancel).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('ESC key triggers cancel', () => {
      vi.useFakeTimers();
      const onCancel = vi.fn();
      window.showConfirm('Confirm?', () => {}, onCancel);

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      vi.advanceTimersByTime(400);

      expect(onCancel).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('clicking overlay background triggers cancel', () => {
      vi.useFakeTimers();
      const onCancel = vi.fn();
      window.showConfirm('Confirm?', () => {}, onCancel);

      const overlay = document.querySelector('.custom-alert-overlay');
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: overlay });
      overlay.dispatchEvent(event);

      vi.advanceTimersByTime(400);

      expect(onCancel).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});

// ============================================================================
// showToast Tests
// ============================================================================
describe('showToast', () => {
  describe('basic functionality', () => {
    it('appends toast to body', () => {
      window.showToast('Toast message');

      const toast = document.querySelector('.toast-notification');
      expect(toast).not.toBe(null);
    });

    it('sets toast message', () => {
      window.showToast('This is a toast');

      const toast = document.querySelector('.toast-notification');
      expect(toast.textContent).toBe('This is a toast');
    });

    it('defaults to info type', () => {
      window.showToast('Info message');

      const toast = document.querySelector('.toast-notification');
      expect(toast.className).toContain('toast-info');
    });
  });

  describe('toast types', () => {
    const types = ['success', 'error', 'warning', 'info'];

    types.forEach(type => {
      it(`applies ${type} class`, () => {
        window.showToast('Message', type);

        const toast = document.querySelector('.toast-notification');
        expect(toast.className).toContain(`toast-${type}`);
      });
    });
  });

  describe('auto-removal', () => {
    it('removes toast after default duration (3000ms)', () => {
      vi.useFakeTimers();
      window.showToast('Message');

      expect(document.querySelector('.toast-notification')).not.toBe(null);

      vi.advanceTimersByTime(3500); // 3000 + animation

      expect(document.querySelector('.toast-notification')).toBe(null);
      vi.useRealTimers();
    });

    it('removes toast after custom duration', () => {
      vi.useFakeTimers();
      window.showToast('Message', 'info', 1000);

      vi.advanceTimersByTime(1400);

      expect(document.querySelector('.toast-notification')).toBe(null);
      vi.useRealTimers();
    });
  });

  describe('multiple toasts', () => {
    it('removes existing toast when showing new one', () => {
      window.showToast('First toast');
      window.showToast('Second toast');

      const toasts = document.querySelectorAll('.toast-notification');
      expect(toasts.length).toBe(1);
      expect(toasts[0].textContent).toBe('Second toast');
    });
  });

  describe('styling', () => {
    it('has fixed positioning', () => {
      window.showToast('Message');

      const toast = document.querySelector('.toast-notification');
      expect(toast.style.position).toBe('fixed');
    });

    it('is positioned at bottom center', () => {
      window.showToast('Message');

      const toast = document.querySelector('.toast-notification');
      expect(toast.style.bottom).toBe('2rem');
      expect(toast.style.left).toBe('50%');
    });

    it('has high z-index', () => {
      window.showToast('Message');

      const toast = document.querySelector('.toast-notification');
      expect(parseInt(toast.style.zIndex)).toBeGreaterThanOrEqual(10000);
    });
  });
});

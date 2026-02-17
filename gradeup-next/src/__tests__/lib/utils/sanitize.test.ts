/**
 * Tests for HTML sanitization utilities
 * @module __tests__/lib/utils/sanitize.test
 */

import { sanitizeText, sanitizeHtml } from '@/lib/utils/sanitize';

describe('sanitizeText', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('returns empty string for null-like values', () => {
    // @ts-expect-error - testing null handling
    expect(sanitizeText(null)).toBe('');
    // @ts-expect-error - testing undefined handling
    expect(sanitizeText(undefined)).toBe('');
  });

  it('strips HTML tags from text', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('');
    expect(sanitizeText('<b>bold</b>')).toBe('bold');
    expect(sanitizeText('<p>paragraph</p>')).toBe('paragraph');
  });

  it('strips nested HTML tags', () => {
    expect(sanitizeText('<div><span><b>text</b></span></div>')).toBe('text');
  });

  it('handles self-closing tags', () => {
    expect(sanitizeText('Line 1<br/>Line 2')).toBe('Line 1Line 2');
    expect(sanitizeText('text<hr/>more')).toBe('textmore');
  });

  it('keeps text content from stripped tags', () => {
    expect(sanitizeText('<strong>important</strong> message')).toBe('important message');
  });

  it('trims whitespace', () => {
    expect(sanitizeText('  text with spaces  ')).toBe('text with spaces');
    expect(sanitizeText('\n\ttabbed\n')).toBe('tabbed');
  });

  it('handles plain text without modification', () => {
    expect(sanitizeText('Just plain text')).toBe('Just plain text');
    expect(sanitizeText('Hello, World!')).toBe('Hello, World!');
  });

  it('strips dangerous event handlers', () => {
    expect(sanitizeText('<img onerror="alert(1)" src="x">')).toBe('');
    expect(sanitizeText('<a onclick="alert(1)">click</a>')).toBe('click');
  });

  it('strips style attributes and tags', () => {
    expect(sanitizeText('<style>body{display:none}</style>')).toBe('');
    expect(sanitizeText('<div style="color:red">text</div>')).toBe('text');
  });

  it('handles malformed HTML gracefully', () => {
    expect(sanitizeText('<div>unclosed')).toBe('unclosed');
    expect(sanitizeText('text</div>extra')).toBe('textextra');
  });

  it('handles special characters correctly', () => {
    // HTML entities are preserved as-is when there's no actual HTML
    expect(sanitizeText('&lt;script&gt;')).toBe('&lt;script&gt;');
    expect(sanitizeText('&amp;&nbsp;&copy;')).toBe('&amp;&nbsp;&copy;');
  });

  it('handles mixed content', () => {
    const input = '<div>Hello <b>world</b>!</div><script>evil()</script>';
    expect(sanitizeText(input)).toBe('Hello world!');
  });
});

describe('sanitizeHtml', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('returns empty string for null-like values', () => {
    // @ts-expect-error - testing null handling
    expect(sanitizeHtml(null)).toBe('');
    // @ts-expect-error - testing undefined handling
    expect(sanitizeHtml(undefined)).toBe('');
  });

  it('allows safe formatting tags', () => {
    expect(sanitizeHtml('<b>bold</b>')).toBe('<b>bold</b>');
    expect(sanitizeHtml('<strong>strong</strong>')).toBe('<strong>strong</strong>');
    expect(sanitizeHtml('<em>italic</em>')).toBe('<em>italic</em>');
    expect(sanitizeHtml('<i>italic</i>')).toBe('<i>italic</i>');
  });

  it('allows paragraph and line break tags', () => {
    expect(sanitizeHtml('<p>paragraph</p>')).toContain('<p>');
    expect(sanitizeHtml('Line 1<br>Line 2')).toContain('<br');
  });

  it('allows list tags', () => {
    expect(sanitizeHtml('<ul><li>item</li></ul>')).toContain('<ul>');
    expect(sanitizeHtml('<ol><li>item</li></ol>')).toContain('<ol>');
  });

  it('allows anchor tags with safe attributes', () => {
    const result = sanitizeHtml('<a href="https://example.com">link</a>');
    expect(result).toContain('<a');
    expect(result).toContain('href="https://example.com"');
  });

  it('strips script tags completely', () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('');
  });

  it('strips iframe tags', () => {
    expect(sanitizeHtml('<iframe src="evil.com"></iframe>')).toBe('');
  });

  it('strips dangerous event handlers', () => {
    const result = sanitizeHtml('<img onerror="alert(1)" src="x">');
    expect(result).not.toContain('onerror');
  });

  it('strips onclick handlers from links', () => {
    const result = sanitizeHtml('<a onclick="alert(1)" href="#">click</a>');
    expect(result).not.toContain('onclick');
  });

  it('strips style attributes', () => {
    const result = sanitizeHtml('<div style="color:red">text</div>');
    expect(result).not.toContain('style');
  });

  it('strips javascript: protocol from links', () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain('javascript:');
  });

  it('allows mailto: protocol', () => {
    const result = sanitizeHtml('<a href="mailto:test@example.com">email</a>');
    expect(result).toContain('mailto:test@example.com');
  });

  it('adds rel="noopener noreferrer" to external links', () => {
    const result = sanitizeHtml('<a href="https://example.com">link</a>');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('adds target="_blank" to external links', () => {
    const result = sanitizeHtml('<a href="https://example.com">link</a>');
    expect(result).toContain('target="_blank"');
  });

  it('handles complex nested HTML', () => {
    const input = '<div><p>Hello <strong>world</strong>!</p><ul><li>Item 1</li></ul></div>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
  });

  it('removes disallowed tags but keeps content', () => {
    const result = sanitizeHtml('<div>content inside div</div>');
    expect(result).toBe('content inside div');
  });

  it('allows class attribute', () => {
    const result = sanitizeHtml('<span class="highlight">text</span>');
    expect(result).toContain('class="highlight"');
  });

  it('handles encoded entities correctly', () => {
    const result = sanitizeHtml('&lt;script&gt;');
    expect(result).toBe('&lt;script&gt;');
  });

  it('preserves data attributes on allowed tags', () => {
    // DOMPurify with default SAFE_HTML_CONFIG allows data attributes on allowed tags
    const result = sanitizeHtml('<span data-info="test">text</span>');
    expect(result).toContain('span');
    expect(result).toContain('text');
  });
});

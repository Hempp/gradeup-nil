'use client';

/**
 * HTML Sanitization Utilities
 *
 * This module provides XSS protection through DOMPurify.
 * Import this module only where sanitization is needed to avoid
 * adding DOMPurify (~13KB minified) to bundles that don't need it.
 *
 * For text-only input validation, use the validators in validation.ts instead.
 */

import DOMPurify from 'dompurify';
import type { Config } from 'dompurify';

/**
 * Check if code is running in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/**
 * Sanitize text input - strips ALL HTML tags and returns plain text only
 * Uses DOMPurify for robust XSS protection on the client side.
 * On the server (SSR), returns input unchanged (sanitization should happen client-side).
 *
 * @param value - The string to sanitize
 * @returns Plain text with all HTML stripped and whitespace trimmed
 */
export function sanitizeText(value: string): string {
  if (!value) return '';

  // On server-side (SSR), return trimmed input unchanged
  // Sanitization will happen on client hydration
  if (!isBrowser()) {
    return value.trim();
  }

  // Use DOMPurify with ALLOWED_TAGS=[] to strip ALL HTML
  // RETURN_DOM_FRAGMENT=false and RETURN_DOM=false ensure we get a string
  const sanitized = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [], // Strip all attributes
    KEEP_CONTENT: true, // Keep text content from stripped tags
  });

  return sanitized.trim();
}

/**
 * Configuration for allowed HTML tags in sanitizeHtml
 */
const SAFE_HTML_CONFIG: Config = {
  // Allow only safe formatting tags
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'a', 'span'],
  // Allow only safe attributes
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  // Require rel="noopener noreferrer" for security on external links
  ADD_ATTR: ['target'],
  // Allow only safe URI schemes for href
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  // Forbid dangerous protocols
  FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur', 'style'],
};

/**
 * Sanitize HTML content - allows safe formatting tags while stripping dangerous content
 * Uses DOMPurify for robust XSS protection on the client side.
 * On the server (SSR), returns input unchanged (sanitization should happen client-side).
 *
 * Allowed tags: p, br, strong, em, b, i, ul, ol, li, a, span
 * Allowed attributes: href (sanitized), target, rel, class
 * Blocked: All event handlers (onclick, onerror, etc.), javascript: URIs, style attributes
 *
 * @param value - The HTML string to sanitize
 * @returns Sanitized HTML with only safe tags and attributes
 */
export function sanitizeHtml(value: string): string {
  if (!value) return '';

  // On server-side (SSR), return input unchanged
  // Sanitization will happen on client hydration
  if (!isBrowser()) {
    return value;
  }

  // Configure DOMPurify hooks to add security attributes to links
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Add rel="noopener noreferrer" to all links for security
    if (node.tagName === 'A') {
      node.setAttribute('rel', 'noopener noreferrer');
      // Default external links to open in new tab
      if (node.getAttribute('href')?.startsWith('http')) {
        node.setAttribute('target', '_blank');
      }
    }
  });

  const sanitized = DOMPurify.sanitize(value, SAFE_HTML_CONFIG);

  // Remove the hook to avoid affecting other sanitization calls
  DOMPurify.removeHook('afterSanitizeAttributes');

  return sanitized;
}

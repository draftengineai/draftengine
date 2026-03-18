import DOMPurify from 'dompurify';

/**
 * Sanitize HTML string to prevent XSS. Allows basic formatting tags
 * (b, i, strong, em, br, p, ul, ol, li, a) but strips scripts and event handlers.
 */
export function sanitizeHTML(dirty: string): string {
  if (typeof window === 'undefined') return dirty;
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'strong', 'em', 'br', 'p', 'ul', 'ol', 'li', 'a', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
  });
}

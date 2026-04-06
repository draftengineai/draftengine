import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML string to prevent XSS. Works on both server and client.
 *
 * Allows basic formatting tags (b, i, strong, em, br, p, ul, ol, li, a)
 * but strips scripts, event handlers, and dangerous attributes.
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'strong', 'em', 'br', 'p', 'ul', 'ol', 'li', 'a', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}

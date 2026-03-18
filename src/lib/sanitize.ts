let DOMPurify: typeof import('dompurify').default | null = null;

function getPurifier() {
  if (typeof window === 'undefined') return null;
  if (!DOMPurify) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    DOMPurify = require('dompurify') as typeof import('dompurify').default;
  }
  return DOMPurify;
}

/**
 * Sanitize HTML string to prevent XSS. Allows basic formatting tags
 * (b, i, strong, em, br, p, ul, ol, li, a) but strips scripts and event handlers.
 */
export function sanitizeHTML(dirty: string): string {
  const purifier = getPurifier();
  if (!purifier) return dirty;
  return purifier.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'strong', 'em', 'br', 'p', 'ul', 'ol', 'li', 'a', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
  });
}

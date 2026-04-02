/**
 * Architecture (small helpers):
 * - What this file does:
 *   Contains reusable utility functions used by the content modules.
 *
 * Beginner mental model:
 * - This file = "math + safe text helpers".
 */

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Escape text before injecting into `innerHTML`.
 * Shadow DOM doesn't change the XSS risk.
 */
export const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });


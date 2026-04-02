/**
 * Architecture (IndexedDB formatter):
 * - What this file does:
 *   Converts the IndexedDB "indexed" definition text into HTML chunks that
 *   match the popup's expected CSS classes.
 * - Used by:
 *   `src/content/renderer.ts` when the lookup source is `indexeddb`.
 *
 * Beginner mental model:
 * - This file = "string parser + HTML generator" for IndexedDB-style text.
 */

import { escapeHtml } from './utils';

const normalizeIndexedText = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,;:.!?])/g, '$1')
    .replace(/\s*—\s*/g, ' — ')
    .replace(/\s*--\s*/g, ' — ')
    .trim();

const splitIndexedPoints = (text: string) => {
  const matches = [...text.matchAll(/(?:^|\s)(\d+)\.\s*/g)];

  if (matches.length === 0) {
    return [{ number: null as string | null, text: normalizeIndexedText(text) }];
  }

  return matches
    .map((match, index) => {
      const start = (match.index ?? 0) + match[0].length;
      const end = matches[index + 1]?.index ?? text.length;
      return {
        number: match[1],
        text: normalizeIndexedText(text.slice(start, end)),
      };
    })
    .filter((point) => point.text.length > 0);
};

const splitIndexedClauses = (text: string) =>
  normalizeIndexedText(text)
    .split(/\s*;\s*--\s*|\s+--\s+|;\s+/)
    .map((item) => normalizeIndexedText(item))
    .filter(Boolean);

const extractIndexedSubpoints = (text: string) => {
  const matches = [...text.matchAll(/\(([a-z])\)\s*/gi)];

  if (!matches.length) return null;

  const intro = normalizeIndexedText(
    text.slice(0, matches[0].index ?? 0).replace(/[:;,-]+$/, ''),
  );

  const items = matches
    .map((match, index) => {
      const start = (match.index ?? 0) + match[0].length;
      const end = matches[index + 1]?.index ?? text.length;
      return {
        label: match[1],
        text: normalizeIndexedText(
          text.slice(start, end).replace(/^[;:,-\s]+/, ''),
        ),
      };
    })
    .filter((item) => item.text.length > 0);

  return { intro, items };
};

const formatIndexedClause = (text: string) => {
  const cleaned = normalizeIndexedText(text);
  const subpoints = extractIndexedSubpoints(cleaned);

  if (subpoints) {
    return {
      html: `
          ${subpoints.intro ? `<div class="indexed-meta">${escapeHtml(subpoints.intro)}</div>` : ''}
          <ul class="indexed-subpoints">
            ${subpoints.items
              .map(
                (item) => `
                  <li>
                    <span class="indexed-label">${escapeHtml(item.label)}</span>
                    <span class="indexed-divider">—</span>
                    <span>${escapeHtml(item.text)}</span>
                  </li>
                `,
              )
              .join('')}
          </ul>
        `,
    };
  }

  const labelMatch = cleaned.match(/^(.{1,40}?),\s*(.+)$/);
  if (labelMatch && /^[A-Z]/.test(labelMatch[1])) {
    return {
      html: `
          <div>
            <span class="indexed-label">${escapeHtml(labelMatch[1])}</span>
            <span class="indexed-divider">—</span>
            <span>${escapeHtml(labelMatch[2])}</span>
          </div>
        `,
    };
  }

  return { html: `<div>${escapeHtml(cleaned)}</div>` };
};

export const renderIndexedDbMeaning = (text: string) => {
  const points = splitIndexedPoints(text);

  return `
      <div class="indexed-block">
        ${points
          .map((point) => {
            const clauses = splitIndexedClauses(point.text);
            const lead = clauses.shift() ?? point.text;

            const clauseHtml = clauses
              .map((clause) => {
                const formatted = formatIndexedClause(clause);
                return `<li>${formatted.html}</li>`;
              })
              .join('');

            return `
              <div class="indexed-point">
                <div class="indexed-content">
                  <div class="indexed-lead">${escapeHtml(lead)}</div>
                  ${clauseHtml ? `<ul class="indexed-clauses">${clauseHtml}</ul>` : ''}
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
};


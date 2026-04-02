/**
 * Architecture (popup renderer):
 * - What this file does:
 *   Builds the popup HTML (loading, no-result, definitions) and wires
 *   the "Dictionary" / "Wikipedia" footer buttons.
 * - Key idea:
 *   `createRenderer()` returns an API for `content.tsx` to call.
 * - Where IndexedDB formatting lives:
 *   `src/content/indexedDb.ts`
 *
 * Beginner mental model:
 * - This file = "View builder".
 * - It only manipulates `popup.innerHTML` and button click handlers.
 */

import type { Definition, LookupSource } from './types';
import { escapeHtml } from './utils';
import { renderIndexedDbMeaning } from './indexedDb';

export const createRenderer = (params: {
  popup: HTMLDivElement;
  onClose: () => void;
  openSource: (baseUrl: string, word: string) => void;
}) => {
  const { popup, onClose, openSource } = params;

  const renderShell = (word: string, body: string, source?: LookupSource) => {
    popup.innerHTML = `
      <div class="popup-panel">
        <div class="popup-scroll">
          <div class="popup-shell">
            <div class="popup-header">
              <div class="title-wrap">
                <h2 class="popup-title"></h2>
                <span class="source-badge hidden"></span>
              </div>
              <button class="close-btn" type="button" aria-label="Close popup">×</button>
            </div>
            ${body}
          </div>
        </div>
      </div>
    `;

    const title = popup.querySelector('.popup-title') as HTMLElement;
    title.textContent = word;

    const badge = popup.querySelector('.source-badge') as HTMLElement;
    badge.className = 'source-badge hidden';
    if (source) {
      badge.textContent = source === 'indexeddb' ? 'IndexedDB' : 'API';
      // badge.classList.remove('hidden');
      badge.classList.add(`source-badge--${source}`);
    }

    const closeBtn = popup.querySelector('.close-btn') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => {
      onClose();
      window.getSelection()?.removeAllRanges();
    });
  };

  const renderLoading = (word: string) => {
    renderShell(word, `<div class="loading">Looking up meaning...</div>`);
  };

  const renderNoResult = (word: string) => {
    renderShell(word, `<div class="empty">No definition found for this text.</div>`);
  };

  const renderDefinition = (
    word: string,
    data: Definition[],
    source?: LookupSource,
  ) => {
    const isIndexedDb = source === 'indexeddb';

    const parts = data
      .map((entry, entryIndex) => {
        const meaningBlocks = entry.meanings
          .map((meaning) => {
            const defs = isIndexedDb
              ? renderIndexedDbMeaning(meaning.definitions[0]?.definition ?? '')
              : meaning.definitions
                  .slice(0, 3)
                  .map((def) => {
                    const example = def.example
                      ? `<div class="definition-note">${escapeHtml(def.example)}</div>`
                      : '';
                    return `<li><div class="definition-text">${escapeHtml(def.definition)}${example}</div></li>`;
                  })
                  .join('');

            return `
              <div class="definition-group">
                <div class="section-header"><span>${meaning.partOfSpeech}</span></div>
                ${isIndexedDb ? defs : `<ol class="definition-list">${defs}</ol>`}
              </div>
            `;
          })
          .join('');

        return `
          <div class="entry">
            ${entry.phonetic ? `<div class="phonetic">${entry.phonetic}</div>` : ''}
            ${meaningBlocks}
            ${entryIndex < data.length - 1 ? '<hr />' : ''}
          </div>
        `;
      })
      .join('');

    renderShell(
      word,
      `
        ${parts}
        <div class="popup-footer">
          <button class="source-btn" type="button" data-source="dictionary">Dictionary</button>
          <button class="source-btn" type="button" data-source="wikipedia">Wikipedia</button>
        </div>
      `,
      source,
    );

    popup.querySelectorAll('[data-source]').forEach((el) => {
      const btn = el as HTMLButtonElement;
      btn.addEventListener('click', () => {
        const selectedSource = btn.dataset.source;
        if (selectedSource === 'dictionary') {
          openSource('https://www.dictionary.com/browse/', word);
        }
        if (selectedSource === 'wikipedia') {
          openSource(
            'https://en.wikipedia.org/wiki/Special:Search?search=',
            word,
          );
        }
      });
    });
  };

  return {
    renderShell,
    renderLoading,
    renderNoResult,
    renderDefinition,
  };
};


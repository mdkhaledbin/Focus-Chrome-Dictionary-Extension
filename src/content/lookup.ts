/**
 * Architecture (lookup bridge):
 * - What this file does:
 *   Provides `lookupWordViaBackground(word)` used by the content script.
 * - Why:
 *   The content script can't (reliably) load the dictionary itself, so we
 *   delegate to `src/background.ts` using `chrome.runtime.sendMessage`.
 *
 * Beginner mental model:
 * - This file = "network/message adapter" between UI and background.
 * - It returns a typed `LookupResponse` for the UI to render.
 */

import type { LookupResponse } from './types';

type LookupRequest = {
  action: string;
  word?: string;
};

// Sends the selected text to the background script for lookup.
export const lookupWordViaBackground = async (word: string): Promise<LookupResponse> => {
  return new Promise<LookupResponse>((resolve) => {
    const request: LookupRequest = { action: 'LOOKUP_WORD', word };

    chrome.runtime.sendMessage(request, (res: LookupResponse) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message,
        });
        return;
      }

      resolve(res);
    });
  });
};


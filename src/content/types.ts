/**
 * Architecture (shared types):
 * - What this file does:
 *   Defines the TypeScript types used by the content script + renderer
 *   + background messaging.
 * - Why they exist (beginner-friendly):
 *   This project has a "data contract" between:
 *   - `content.tsx` (UI controller)
 *   - `src/content/renderer.ts` (HTML building)
 *   - `src/content/lookup.ts` (chrome message)
 *   - `src/background.ts` (dictionary engine)
 *
 *   If these files disagree on the shape of a response (for example: `data`
 *   or `source`), you can get subtle runtime UI bugs. Centralizing types
 *   makes the compiler help you catch mismatches early.
 *
 * Beginner mental model:
 * - This file = "data contracts" (the shapes moving between modules).
 *
 * Demo (shape of the message response):
 * ```ts
 * const res: LookupResponse = {
 *   success: true,
 *   source: 'indexeddb',
 *   data: [
 *     {
 *       word: 'focus',
 *       phonetic: '...',
 *       meanings: [
 *         {
 *           partOfSpeech: 'definition',
 *           definitions: [{ definition: '...' }]
 *         }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */

/**
 * Local normalized definition shape (matches the Free Dictionary API format)
 * so the UI renderer can treat both "IndexedDB" and "API" results uniformly.
 */
export interface Definition {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
    }[];
  }[];
}

/**
 * Where lookup data came from.
 * Used so the UI can display the correct badge and decide how to render data.
 */
export type LookupSource = 'indexeddb' | 'api';

/**
 * Sub-structure for API definitions and cached API payloads.
 * (Kept optional because the API may omit fields.)
 */
export type ApiDefinition = {
  definition?: string;
  example?: string;
};

/**
 * Another API sub-structure for grouping definitions by part-of-speech.
 * Used for consistent rendering in the content renderer.
 */
export type ApiMeaning = {
  partOfSpeech?: string;
  definitions?: ApiDefinition[];
};

/**
 * Whole entry returned by the Free Dictionary API.
 * Also used when we cache API results in IndexedDB as JSON strings.
 */
export type ApiEntry = {
  word?: string;
  phonetic?: string;
  meanings?: ApiMeaning[];
};

/**
 * Generic "message response" contract between `src/content/lookup.ts` and
 * `src/background.ts`.
 *
 * UI uses it to decide:
 * - success vs no-result
 * - how to interpret `data` (Definition[] vs ApiEntry[])
 */
export type LookupResponse = {
  success: boolean;
  source?: LookupSource;
  data?: Definition[] | ApiEntry[] | null;
  error?: string;
};

/**
 * Internal cache record used by `background.ts` to implement an in-memory LRU.
 * Stored separately from the UI response so we can cache the raw payload + source.
 */
export type CachedDefinition = {
  payload: string;
  source: LookupSource;
};

/**
 * Internal normalized lookup result produced by `handleWordLookup()`.
 * This is later converted into the exported `LookupResponse` message.
 */
export type LookupResult = {
  source: LookupSource;
  data: Definition[] | ApiEntry[];
} | null;

/**
 * Request message contract from the content script to the background script.
 * `action` tells the background what to do, `word` is the selected text.
 */
export type LookupRequest = {
  action: string;
  word?: string;
};

/**
 * What `chrome.runtime.onMessage` can send back.
 * It is either the typed lookup response or a generic object for other actions.
 */
export type MessageResponse = LookupResponse | Record<string, unknown>;


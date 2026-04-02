// background.ts — Focus Extension
// Loads dictionary_compact.json into IndexedDB on first install,
// uses in-memory cache for fast lookups, falls back to Free Dictionary API.

const DB_NAME = 'FocusDictDB';
const DB_VERSION = 1;
const STORE_NAME = 'words';
const CACHE_MAX_SIZE = 500;

// In-memory LRU cache for recently looked-up words
const memoryCache = new Map<string, string>();

// ─── IndexedDB Helpers ───────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME); // key-value store, key = word
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getFromDB(db: IDBDatabase, word: string): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(word);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
}

function putInDB(db: IDBDatabase, word: string, definition: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(definition, word);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Batch-insert dictionary entries into IndexedDB.
 * We chunk the entries to avoid overwhelming a single transaction.
 */
async function batchInsert(db: IDBDatabase, entries: [string, string][]): Promise<void> {
  const CHUNK_SIZE = 5000;
  const totalChunks = Math.ceil(entries.length / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const chunk = entries.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      for (const [word, definition] of chunk) {
        store.put(definition, word);
      }

      tx.oncomplete = () => {
        // Report progress
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        chrome.storage.local.set({ dictionaryLoadProgress: progress });
        console.log(`[Focus] Import progress: ${progress}% (chunk ${i + 1}/${totalChunks})`);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }
}

// ─── Dictionary Loading ──────────────────────────────────────────────

async function loadDictionary(): Promise<void> {
  const { dictionaryLoaded } = await chrome.storage.local.get('dictionaryLoaded');

  if (dictionaryLoaded) {
    console.log('[Focus] Dictionary already loaded in IndexedDB.');
    return;
  }

  console.log('[Focus] Loading dictionary_compact.json into IndexedDB...');
  chrome.storage.local.set({ dictionaryLoadProgress: 0 });

  try {
    const url = chrome.runtime.getURL('dictionary_compact.json');
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch dictionary: ${response.status} ${response.statusText}`);
    }

    const dictData: Record<string, string> = await response.json();
    const entries = Object.entries(dictData);
    const wordCount = entries.length;

    console.log(`[Focus] Parsed ${wordCount} words. Starting batch insert...`);

    const db = await openDB();
    await batchInsert(db, entries);
    db.close();

    // Mark as loaded and store word count
    await chrome.storage.local.set({
      dictionaryLoaded: true,
      dictionaryWordCount: wordCount,
      dictionaryLoadProgress: 100,
    });

    console.log(`[Focus] Successfully loaded ${wordCount} words into IndexedDB.`);
  } catch (error) {
    console.error('[Focus] Error loading dictionary:', error);
    chrome.storage.local.set({ dictionaryLoadProgress: -1 }); // -1 = error
  }
}

// ─── Cache Helper ────────────────────────────────────────────────────

function addToCache(word: string, definition: string): void {
  // Simple LRU: if cache is full, delete the oldest entry
  if (memoryCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey !== undefined) {
      memoryCache.delete(oldestKey);
    }
  }
  memoryCache.set(word, definition);
}

// ─── Word Lookup ─────────────────────────────────────────────────────

async function handleWordLookup(word: string) {
  const normalizedWord = word.trim().toLowerCase();

  // 1. Check in-memory cache
  if (memoryCache.has(normalizedWord)) {
    console.log(`[Focus] Cache hit for "${normalizedWord}"`);
    const def = memoryCache.get(normalizedWord)!;
    return formatLocalDefinition(word, def);
  }

  // 2. Check IndexedDB
  try {
    const db = await openDB();
    const definition = await getFromDB(db, normalizedWord);
    db.close();

    if (definition) {
      console.log(`[Focus] IndexedDB hit for "${normalizedWord}"`);
      addToCache(normalizedWord, definition);
      return formatLocalDefinition(word, definition);
    }
  } catch (dbError) {
    console.error('[Focus] IndexedDB lookup error:', dbError);
  }

  // 3. Fallback to Free Dictionary API
  console.log(`[Focus] "${normalizedWord}" not in local DB. Falling back to API...`);

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Word not found
      }
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    // Store the first definition in IndexedDB for future offline use
    try {
      if (data && data.length > 0) {
        const firstDef = extractFirstDefinition(data);
        if (firstDef) {
          const db = await openDB();
          await putInDB(db, normalizedWord, firstDef);
          db.close();
          addToCache(normalizedWord, firstDef);
          console.log(`[Focus] Cached API result for "${normalizedWord}" in IndexedDB.`);
        }
      }
    } catch (cacheError) {
      console.error('[Focus] Error caching API result:', cacheError);
    }

    return data;
  } catch (apiError) {
    console.error('[Focus] API fetch error:', apiError);
    throw apiError;
  }
}

/**
 * Format a local dictionary definition to match the Free Dictionary API structure
 * so the UI can render it consistently.
 */
function formatLocalDefinition(word: string, definition: string) {
  return [
    {
      word,
      meanings: [
        {
          partOfSpeech: 'definition',
          definitions: [
            {
              definition,
            },
          ],
        },
      ],
    },
  ];
}

/**
 * Extract a simple string definition from the API response for caching.
 */
function extractFirstDefinition(apiData: any[]): string | null {
  try {
    for (const entry of apiData) {
      for (const meaning of entry.meanings || []) {
        for (const def of meaning.definitions || []) {
          if (def.definition) {
            return def.definition;
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

// ─── Event Listeners ─────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Focus] Extension installed.');
  await loadDictionary();
});

// Also try loading on startup in case install didn't complete
chrome.runtime.onStartup?.addListener(async () => {
  console.log('[Focus] Extension started.');
  const { dictionaryLoaded } = await chrome.storage.local.get('dictionaryLoaded');
  if (!dictionaryLoaded) {
    await loadDictionary();
  }
});

chrome.runtime.onMessage.addListener(
  (request: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (request.action === 'LOOKUP_WORD') {
      handleWordLookup(request.word)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => sendResponse({ success: false, error: error.message }));

      return true; // Keep the message channel open for async response
    }

    if (request.action === 'GET_DICT_STATUS') {
      chrome.storage.local
        .get(['dictionaryLoaded', 'dictionaryWordCount', 'dictionaryLoadProgress'])
        .then((result) => sendResponse(result))
        .catch(() => sendResponse({}));

      return true;
    }
  }
);

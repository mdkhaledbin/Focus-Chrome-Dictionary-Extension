# Focus — Architecture & System Design

> **Design Principle:** *Minimum Distraction. Maximum Context.*
> Every architectural decision in Focus is made to serve one goal: give the user an instant answer without interrupting their reading flow.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Component Breakdown](#2-component-breakdown)
3. [System Communication Flow](#3-system-communication-flow)
4. [Data Strategy: Local-First with API Fallback](#4-data-strategy-local-first-with-api-fallback)
5. [Directory Map](#5-directory-map)
6. [Build Pipeline](#6-build-pipeline)
7. [Key Design Decisions](#7-key-design-decisions)

---

## 1. High-Level Overview

Focus is structured around the three pillars of a Chrome Manifest V3 extension:

```
┌─────────────────────────────────────────────────────┐
│                   Chrome Browser                    │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐  │
│  │  Popup UI    │    │      Active Web Page      │  │
│  │  (App.tsx)   │    │                          │  │
│  │              │    │  ┌────────────────────┐  │  │
│  │  Settings &  │    │  │  Content Script    │  │  │
│  │  Status      │    │  │  (content.tsx)     │  │  │
│  └──────┬───────┘    │  │                    │  │  │
│         │            │  │  • Text selection  │  │  │
│         │            │  │  • Floating card   │  │  │
│         │            │  └────────┬───────────┘  │  │
│         │            └───────────┼───────────────┘  │
│         │                        │                   │
│         └──────────┐  ┌──────────┘                  │
│                    ▼  ▼                              │
│           ┌─────────────────┐                        │
│           │  Background     │                        │
│           │  Service Worker │                        │
│           │  (background.ts)│                        │
│           │                 │                        │
│           │  • IndexedDB    │                        │
│           │  • In-mem cache │                        │
│           │  • API fallback │                        │
│           └────────┬────────┘                        │
└────────────────────┼────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  dictionaryapi.dev   │  (Fallback only)
          └──────────────────────┘
```

---

## 2. Component Breakdown

### 2.1 Content Script — `src/content.tsx`

**Runtime:** Injected into every web page (`<all_urls>`).

**Responsibilities:**
- Listens for the browser's `mouseup` / `selectionchange` events to detect when the user highlights text.
- Validates the selection (non-empty, single word or short phrase).
- Renders a **floating action button** near the user's cursor.
- On click, sends a `LOOKUP_WORD` message to the Background Service Worker via `chrome.runtime.sendMessage`.
- Receives the definition payload and renders a **glassmorphic definition card** anchored to the viewport.
- Manages teardown: dismisses the card on outside clicks or `Escape` key press.

> The content script is entirely self-contained for DOM interaction. It never touches storage or external APIs directly.

---

### 2.2 Background Service Worker — `src/background.ts`

**Runtime:** Persistent background context (MV3 Service Worker).

**Responsibilities:**

| Phase | Action |
|---|---|
| **Install** | Opens IndexedDB (`FocusDB`), fetches `dictionary_compact.json` from `public/`, and bulk-inserts all entries. |
| **Lookup Request** | Receives `LOOKUP_WORD` from content script. Checks in-memory cache → IndexedDB → external API (in that order). |
| **Cache Write-Back** | Stores any API result into the in-memory cache for the session lifetime. |
| **Response** | Sends the definition payload back to the originating content script via the message channel. |

---

### 2.3 Popup UI — `src/App.tsx` + `src/main.tsx`

**Runtime:** Rendered inside `index.html`, shown when the user clicks the toolbar icon.

**Responsibilities:**
- Displays the current status of the dictionary (loaded / loading / error).
- Provides user-facing controls and settings.
- Communicates with the Background Worker via `chrome.runtime.sendMessage` for status queries.

---

## 3. System Communication Flow

All inter-component communication uses the Chrome Extensions messaging API (`chrome.runtime.sendMessage` / `chrome.runtime.onMessage`). No shared globals or direct DOM access across components.

```
User highlights text
        │
        ▼
[ content.tsx ] ──── LOOKUP_WORD ──────────────────────► [ background.ts ]
                     { word: "serendipity" }                      │
                                                                   │
                                                    1. Check in-memory cache
                                                                   │ HIT → return immediately
                                                                   │ MISS ▼
                                                    2. Query IndexedDB (FocusDB)
                                                                   │ HIT → cache + return
                                                                   │ MISS ▼
                                                    3. GET dictionaryapi.dev/api/v2/entries/en/{word}
                                                                   │
                                                    4. Write result to in-memory cache
                                                                   │
[ content.tsx ] ◄─── DEFINITION_RESULT ────────────────── [ background.ts ]
                     { word, definition, source }
        │
        ▼
Render floating definition card on page
```

---

## 4. Data Strategy: Local-First with API Fallback

### 4.1 The Local Dictionary

Focus ships with `dictionary_compact.json` — a compacted version of Webster's English Dictionary — stored in the `public/` folder so Vite copies it verbatim into `dist/` at build time.

**Size:** ~22 MB (raw JSON, uncompressed on disk)

On first install (`chrome.runtime.onInstalled`), the background worker:
1. Fetches the JSON file via `fetch(chrome.runtime.getURL('dictionary_compact.json'))`.
2. Parses the entries.
3. Opens an **IndexedDB** database named `FocusDB`, object store `words`.
4. Performs a bulk `put` transaction for all entries.

This is a **one-time operation** — subsequent launches skip the import if the database is already populated.

### 4.2 Lookup Priority Chain

```
Request
  │
  ▼
┌────────────────────────────────┐
│  Layer 1: In-Memory Cache      │  ← Map<string, DefinitionEntry>
│  Session-scoped, O(1) lookup   │     (cleared on SW restart)
└──────────┬─────────────────────┘
           │ MISS
           ▼
┌────────────────────────────────┐
│  Layer 2: IndexedDB (FocusDB)  │  ← Persistent, survives restarts
│  ~200k+ Webster's entries      │     O(log n) indexed lookup
└──────────┬─────────────────────┘
           │ MISS
           ▼
┌────────────────────────────────┐
│  Layer 3: dictionaryapi.dev    │  ← REST API, requires internet
│  Free Dictionary API (en)      │     Result cached in Layer 1
└────────────────────────────────┘
           │ MISS
           ▼
        "Word not found" response → content script shows graceful error state
```

### 4.3 Why This Approach?

| Concern | Solution |
|---|---|
| **Speed** | In-memory cache serves repeat lookups in microseconds |
| **Offline capability** | IndexedDB holds the full dictionary locally |
| **Coverage** | API fallback covers slang, neologisms, proper nouns |
| **Privacy** | API is only contacted on a cache miss — no passive tracking |
| **Storage quota** | `unlimitedStorage` permission is declared to handle the ~22MB dictionary |

---

## 5. Directory Map

```
focus/                              # Project root
│
├── public/                         # Static assets (copied verbatim into dist/)
│   ├── manifest.json               #  → Chrome MV3 manifest
│   ├── dictionary_compact.json     #  → Webster's dictionary (22MB, local data source)
│   ├── favicon.svg                 #  → Browser tab icon
│   └── icons.svg                   #  → Extension toolbar icons
│
├── src/                            # TypeScript source files (compiled by Vite)
│   ├── background.ts               #  → Service Worker (DB init, lookup logic, API fallback)
│   ├── content.tsx                 #  → Content Script (selection detection, definition card)
│   ├── App.tsx                     #  → Popup root component (settings UI)
│   ├── main.tsx                    #  → Popup entry point (ReactDOM.createRoot)
│   ├── index.css                   #  → Global CSS / Tailwind imports
│   ├── assets/                     #  → Static assets imported in JSX (SVGs, etc.)
│   ├── components/                 #  → Shared React components for Popup UI
│   └── content/                    #  → Sub-modules for content script logic
│
├── images/                         # Step-by-step guide screenshots (for README)
│   ├── step-1-build-dist.png
│   ├── step-2-click-load-unpacked.png
│   ├── step-3-start-extension.png
│   ├── step-4-select-word.png
│   └── step-5-see-result.png
│
├── dist/                           # Build output (generated, not committed)
│   ├── popup.js                    #  → Compiled popup bundle
│   ├── background.js               #  → Compiled service worker
│   ├── content.js                  #  → Compiled content script
│   ├── index.html                  #  → Popup HTML
│   ├── manifest.json               #  → Copied from public/
│   └── dictionary_compact.json     #  → Copied from public/
│
├── index.html                      # Popup HTML entry (Vite entry for popup)
├── vite.config.ts                  # Multi-entry Vite build configuration
├── tsconfig.json                   # TypeScript project references config
├── tsconfig.app.json               # App TypeScript configuration
├── tsconfig.node.json              # Node/Vite TypeScript configuration
├── eslint.config.js                # ESLint flat config
├── package.json                    # NPM scripts and dependencies
├── README.md                       # User-facing documentation
├── ARCHITECTURE.md                 # This file
└── LICENSE.md                      # MIT License
```

---

## 6. Build Pipeline

Vite is configured with **three separate entry points** to produce the three distinct JavaScript bundles required by Chrome's extension model:

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    input: {
      popup:      resolve(__dirname, 'index.html'),       // → dist/index.html + popup.js
      background: resolve(__dirname, 'src/background.ts'), // → dist/background.js
      content:    resolve(__dirname, 'src/content.tsx'),  // → dist/content.js
    },
    output: {
      entryFileNames: '[name].js',       // Deterministic filenames (required by manifest.json)
      chunkFileNames: '[name].[hash].js',
      assetFileNames: '[name].[ext]',
    }
  }
}
```

**Why deterministic filenames?** Chrome's `manifest.json` must reference exact file paths like `"service_worker": "background.js"`. Vite's default content-hashed filenames would break this contract, so `[name].js` is used for entry points.

**Build command:** `npm run build` → runs `tsc -b && vite build`

---

## 7. Key Design Decisions

### MV3 Service Worker over Background Page
Chrome Manifest V3 mandates Service Workers instead of persistent background pages. This means the worker may be suspended by Chrome when idle. The **in-memory cache** is session-scoped and will be rebuilt on worker restart. IndexedDB serves as the persistent fallback in this scenario.

### React in Content Script
The content script uses React (via `content.tsx`) to render the definition card as a Shadow DOM component or directly into the page — enabling maintainable, stateful UI with the full React ecosystem, while keeping the bundle isolated from the host page's styles.

### Tailwind CSS v4
Used for the Popup UI, leveraging Tailwind's Vite plugin (`@tailwindcss/vite`) for zero-config, zero-runtime CSS generation. Custom glassmorphic styles are applied to the definition card via Tailwind utilities.

### `unlimitedStorage` Permission
The ~22MB dictionary exceeds Chrome's default 5MB `localStorage` quota. The `unlimitedStorage` manifest permission allows the extension to bypass this limit for its IndexedDB usage.

---

*This document reflects the architecture as of Focus v1.0.0.*

/**
 * Architecture (React entry point):
 * - What this file does:
 *   Bootstraps the popup React app by mounting `<App />` into `#root`.
 * - Flow:
 *   `main.tsx` -> renders `App.tsx` -> `App.tsx` handles chrome.storage UI.
 *
 * Beginner mental model:
 * - This is the "starting point" for the popup UI only (not the content script).
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

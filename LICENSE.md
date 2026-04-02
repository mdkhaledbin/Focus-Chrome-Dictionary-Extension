# GNU General Public License v3.0 (GPL-3.0-or-later)

---

> **Why GPL-3.0-or-later?**
> This project bundles dictionary data derived from Matthew Reagan's
> [WebstersEnglishDictionary](https://github.com/matthewreagan/WebstersEnglishDictionary),
> which is published under the **GNU General Public License**. Under the GPL's
> copyleft terms, any project that incorporates GPL-licensed data or code must
> itself be distributed under a compatible GPL license. Accordingly, the Focus
> extension is licensed under **GPL-3.0-or-later**.

---

```
Focus — A Chrome Extension for Inline Word Definitions
Copyright (C) 2026  Md. Khaled Bin

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
```

---

The full text of the GNU General Public License v3.0 is available at:
**<https://www.gnu.org/licenses/gpl-3.0.txt>**

---

## Third-Party Notices & Attributions

This project incorporates or depends on the following third-party resources.
Their respective licenses govern those portions of the work.

---

### 1. Webster's English Dictionary (Dictionary Data)

The bundled `dictionary_compact.json` is derived from data curated by
**Matthew Reagan** in the
[WebstersEnglishDictionary](https://github.com/matthewreagan/WebstersEnglishDictionary)
repository, which is itself sourced from:

- **Project Gutenberg** — [gutenberg.org](https://www.gutenberg.org/)
  *(Webster's Unabridged Dictionary — Public Domain in the USA)*
- **Adam Isaacs** — [adambom/dictionary](https://github.com/adambom/dictionary)
  *(JSON-formatted dictionary dataset)*

> **License:** GNU General Public License (GPL) — as declared in the upstream repository.
> This is the primary driver for this project's GPL-3.0 license choice.

---

### 2. Free Dictionary API

Fallback definitions are sourced at runtime from the
**[Free Dictionary API](https://dictionaryapi.dev/)**, an independent,
open-source project.

> **API Endpoint:** `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`
>
> The API is used solely as a fallback when a word is not found in the local
> dictionary store. No user data is transmitted beyond the queried word itself.
> Usage is subject to the terms and conditions of the Free Dictionary API project.

---

### 3. Open Source Software Dependencies

This project is built on the following open-source libraries. Each is used
unmodified and governed by its own license:

| Package | Version | License |
|---|---|---|
| [React](https://github.com/facebook/react) | 19.x | MIT |
| [Vite](https://github.com/vitejs/vite) | 8.x | MIT |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | 4.x | MIT |
| [TypeScript](https://github.com/microsoft/TypeScript) | 5.9 | Apache-2.0 |
| [@types/chrome](https://github.com/DefinitelyTyped/DefinitelyTyped) | — | MIT |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | — | MIT |

All MIT-licensed dependencies are compatible with distribution under GPL-3.0.

---

*For questions about licensing, please open an issue in the project repository.*

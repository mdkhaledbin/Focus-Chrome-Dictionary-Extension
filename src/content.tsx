interface Definition {
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

(function bootstrapFocusContentScript() {
  if (document.getElementById("focus-extension-root")) {
    return;
  }

  const host = document.createElement("div");
  host.id = "focus-extension-root";
  host.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483647",
    "pointer-events:none",
  ].join(";");

  const shadowRoot = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);

  const style = document.createElement("style");
  style.textContent = `
    :host, * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .hidden { display: none !important; }

    .popup {
      position: fixed;
      width: 340px;
      max-height: 400px;
      pointer-events: auto;
      overflow: visible;
      color: #111827;
    }

    .popup-panel {
      position: relative;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 0.5px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05);
      overflow: hidden;
      transform-origin: top left;
    }

    .popup-panel::after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: -9px;
      transform: translateX(-50%);
      border-left: 10px solid transparent;
      border-right: 10px solid transparent;
      border-top: 10px solid rgba(255, 255, 255, 0.7);
      filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1));
      pointer-events: none;
    }

    .popup-scroll {
      max-height: 400px;
      overflow-y: auto;
      padding: 15px;
      color: #111827;
    }

    .lookup-btn {
      position: fixed;
      pointer-events: auto;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border: 0;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.92);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 10px 20px rgba(0,0,0,0.22);
      backdrop-filter: blur(8px);
      border: 0.5px solid rgba(255, 255, 255, 0.08);
      opacity: 0;
      transform: translateY(6px) scale(0.96);
      transition:
        transform 180ms ease,
        background 180ms ease,
        box-shadow 180ms ease,
        color 180ms ease,
        border-color 180ms ease,
        opacity 180ms ease;
      will-change: transform, opacity;
    }

    .lookup-btn:hover {
      background: #000;
    }

    .lookup-btn:not(.hidden) {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .lookup-btn.lookup-btn--active {
      background: rgba(255, 255, 255, 0.92);
      color: #111827;
      border-color: rgba(0, 0, 0, 0.08);
      box-shadow: 0 12px 24px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.25);
    }

    .lookup-btn.lookup-btn--active:hover {
      background: rgba(255, 255, 255, 0.98);
    }

    .lookup-btn.lookup-btn--active::after {
      content: "";
      position: absolute;
      inset: -4px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.22);
      opacity: 0.8;
      pointer-events: none;
      animation: lookupPulse 1.6s ease-out infinite;
    }

    .popup-shell {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .popup.is-opening .popup-panel {
      animation: popupOpen 190ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .popup.is-closing .popup-panel {
      animation: popupClose 160ms cubic-bezier(0.4, 0, 0.2, 1) both;
    }

    .popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .popup-title {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      max-width: 260px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .close-btn {
      border: 0;
      background: transparent;
      width: 28px;
      height: 28px;
      border-radius: 999px;
      cursor: pointer;
      color: #6b7280;
      font-size: 18px;
      line-height: 1;
    }

    .close-btn:hover {
      background: rgba(0, 0, 0, 0.06);
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 12px 0 8px;
      color: #666;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .section-header::after {
      content: "";
      flex: 1;
      height: 0.5px;
      background: rgba(0, 0, 0, 0.12);
      opacity: 0.85;
    }

    .loading,
    .empty {
      text-align: center;
      color: #6b7280;
      padding: 16px 0 8px;
      font-size: 13px;
    }

    .entry + .entry {
      margin-top: 10px;
    }

    .phonetic {
      font-size: 13px;
      color: #2563eb;
      margin-bottom: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .part {
      display: inline-block;
      margin-bottom: 8px;
      font-size: 12px;
      font-style: italic;
      color: #6b7280;
    }

    ul { margin: 0; padding: 0 0 0 18px; }
    li { margin-bottom: 8px; color: #374151; font-size: 13px; line-height: 1.5; }

    li::marker { color: rgba(0, 0, 0, 0.35); }

    .example {
      display: block;
      margin-top: 4px;
      color: #6b7280;
      font-style: italic;
      padding-left: 8px;
      border-left: 2px solid rgba(0, 0, 0, 0.12);
    }

    .popup-footer {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      padding-top: 2px;
    }

    .source-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: 4px;
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.06);
      color: #333;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s ease, transform 0.15s ease;
    }

    .source-btn:hover {
      background: rgba(0, 0, 0, 0.09);
      transform: translateY(-1px);
    }

    .meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 4px;
    }

    .definition-group {
      padding-left: 2px;
    }

    hr {
      border: 0;
      height: 0.5px;
      background: rgba(0, 0, 0, 0.08);
      opacity: 0.8;
      margin: 12px 0;
    }

    @media (prefers-color-scheme: dark) {
      .popup-panel {
        background: rgba(45, 45, 45, 0.6);
        border-color: rgba(255, 255, 255, 0.1);
        box-shadow: 0 10px 30px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05);
      }

      .popup-panel::after {
        border-top-color: rgba(45, 45, 45, 0.6);
        filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.24));
      }

      .popup-scroll { color: #f3f4f6; }
      .popup-title { color: #f9fafb; }
      .section-header { color: #a3a3a3; }
      .section-header::after, hr { background: rgba(255, 255, 255, 0.12); }
      .loading, .empty { color: #9ca3af; }
      .phonetic { color: #93c5fd; }
      .part { color: #c4c4c4; }
      li { color: #e5e7eb; }
      li::marker { color: rgba(255, 255, 255, 0.5); }
      .example {
        color: #cbd5e1;
        border-left-color: rgba(255, 255, 255, 0.18);
      }
      .source-btn {
        background: rgba(255, 255, 255, 0.08);
        color: #e5e7eb;
      }
      .source-btn:hover { background: rgba(255, 255, 255, 0.12); }
      .close-btn { color: #cbd5e1; }
      .close-btn:hover { background: rgba(255, 255, 255, 0.08); }
    }

    @keyframes popupOpen {
      from {
        opacity: 0;
        transform: translate(var(--popup-from-x, 0px), var(--popup-from-y, 0px)) scale(0.18);
      }
      to {
        opacity: 1;
        transform: translate(0, 0) scale(1);
      }
    }

    @keyframes popupClose {
      from {
        opacity: 1;
        transform: translate(0, 0) scale(1);
      }
      to {
        opacity: 0;
        transform: translate(var(--popup-from-x, 0px), var(--popup-from-y, 0px)) scale(0.18);
      }
    }

    @keyframes lookupPulse {
      0% { transform: scale(1); opacity: 0.8; }
      70% { transform: scale(1.08); opacity: 0; }
      100% { transform: scale(1.08); opacity: 0; }
    }
  `;

  const button = document.createElement("button");
  button.className = "lookup-btn hidden";
  button.type = "button";
  button.innerHTML = "<span>🔎</span><span>Look-up</span>";

  const popup = document.createElement("div");
  popup.className = "popup hidden";

  shadowRoot.appendChild(style);
  shadowRoot.appendChild(button);
  shadowRoot.appendChild(popup);

  let selectedText = "";
  let buttonTop = 0;
  let buttonLeft = 0;
  let popupAnchorX = 0;
  let popupAnchorY = 0;
  let popupCloseTimer: number | undefined;

  const hideButton = () => button.classList.add("hidden");
  const showButton = () => button.classList.remove("hidden");
  const hidePopup = () => popup.classList.add("hidden");

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const closeAll = () => {
    hideButton();
    selectedText = "";
    button.classList.remove("lookup-btn--active");
    closePopupAnimated();
  };

  const openSource = (baseUrl: string, word: string) => {
    window.open(
      `${baseUrl}${encodeURIComponent(word)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const renderShell = (word: string, body: string) => {
    popup.innerHTML = `
      <div class="popup-panel">
        <div class="popup-scroll">
          <div class="popup-shell">
            <div class="popup-header">
              <h2 class="popup-title"></h2>
              <button class="close-btn" type="button" aria-label="Close popup">×</button>
            </div>
            ${body}
          </div>
        </div>
      </div>
    `;

    const title = popup.querySelector(".popup-title") as HTMLElement;
    title.textContent = word;

    const closeBtn = popup.querySelector(".close-btn") as HTMLButtonElement;
    closeBtn.addEventListener("click", () => {
      closeAll();
      window.getSelection()?.removeAllRanges();
    });
  };

  const setPopupOrigin = () => {
    const popupWidth = 340;
    const popupHeight = 400;

    const left = clamp(
      buttonLeft - 100,
      10,
      window.innerWidth - popupWidth - 10,
    );
    let top = buttonTop + 42;

    if (top + popupHeight > window.innerHeight - 10) {
      top = Math.max(10, buttonTop - popupHeight - 12);
    }

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.style.setProperty("--popup-from-x", `${popupAnchorX - left}px`);
    popup.style.setProperty("--popup-from-y", `${popupAnchorY - top}px`);
  };

  const openPopupAnimated = () => {
    if (popupCloseTimer !== undefined) {
      window.clearTimeout(popupCloseTimer);
      popupCloseTimer = undefined;
    }

    popup.classList.remove("hidden", "is-closing", "is-open");
    popup.classList.add("is-opening");

    requestAnimationFrame(() => {
      popup.classList.remove("is-opening");
      popup.classList.add("is-open");
    });
  };

  const closePopupAnimated = () => {
    if (popup.classList.contains("hidden")) {
      return;
    }

    popup.classList.remove("is-opening", "is-open");
    popup.classList.add("is-closing");

    const finishClose = () => {
      popup.classList.remove("is-closing");
      hidePopup();
    };

    const onEnd = (event: AnimationEvent) => {
      if (event.target !== event.currentTarget) {
        return;
      }
      popup.removeEventListener("animationend", onEnd as EventListener);
      finishClose();
    };

    popup.addEventListener("animationend", onEnd as EventListener);

    if (popupCloseTimer !== undefined) {
      window.clearTimeout(popupCloseTimer);
    }

    popupCloseTimer = window.setTimeout(() => {
      popup.removeEventListener("animationend", onEnd as EventListener);
      finishClose();
    }, 220);
  };

  const renderLoading = (word: string) => {
    renderShell(word, `<div class="loading">Looking up meaning...</div>`);
  };

  const renderNoResult = (word: string) => {
    renderShell(
      word,
      `<div class="empty">No definition found for this text.</div>`,
    );
  };

  const renderDefinition = (word: string, data: Definition[]) => {
    const parts = data
      .map((entry, entryIndex) => {
        const meaningBlocks = entry.meanings
          .map((meaning) => {
            const defs = meaning.definitions
              .slice(0, 3)
              .map((def) => {
                const example = def.example
                  ? `<span class="example">"${def.example}"</span>`
                  : "";
                return `<li>${def.definition}${example}</li>`;
              })
              .join("");

            return `
              <div class="definition-group">
                <div class="section-header"><span>${meaning.partOfSpeech}</span></div>
                <ul>${defs}</ul>
              </div>
            `;
          })
          .join("");

        return `
          <div class="entry">
            ${entry.phonetic ? `<div class="phonetic">${entry.phonetic}</div>` : ""}
            ${meaningBlocks}
            ${entryIndex < data.length - 1 ? "<hr />" : ""}
          </div>
        `;
      })
      .join("");

    renderShell(
      word,
      `
        ${parts}
        <div class="popup-footer">
          <button class="source-btn" type="button" data-source="dictionary">Dictionary</button>
          <button class="source-btn" type="button" data-source="wikipedia">Wikipedia</button>
        </div>
      `,
    );

    popup.querySelectorAll("[data-source]").forEach((el) => {
      const btn = el as HTMLButtonElement;
      btn.addEventListener("click", () => {
        const source = btn.dataset.source;
        if (source === "dictionary") {
          openSource("https://www.dictionary.com/browse/", word);
        }
        if (source === "wikipedia") {
          openSource(
            "https://en.wikipedia.org/wiki/Special:Search?search=",
            word,
          );
        }
      });
    });
  };

  const lookupWord = async (word: string) => {
    renderLoading(word);
    setPopupOrigin();
    openPopupAnimated();

    try {
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ action: "LOOKUP_WORD", word }, (res) => {
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

      if (
        response?.success &&
        Array.isArray(response.data) &&
        response.data.length > 0
      ) {
        renderDefinition(word, response.data as Definition[]);
      } else {
        renderNoResult(word);
      }
    } catch {
      renderNoResult(word);
    }
  };

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!selectedText) {
      return;
    }

    hideButton();
    lookupWord(selectedText);
  });

  document.addEventListener("mouseup", () => {
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";

      if (
        !text ||
        text.split(/\s+/).length > 5 ||
        !selection ||
        selection.rangeCount === 0
      ) {
        button.classList.remove("lookup-btn--active");
        if (popup.classList.contains("hidden")) {
          hideButton();
        }
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (!rect || (rect.width === 0 && rect.height === 0)) {
        return;
      }

      selectedText = text;
      popupAnchorX = rect.left + rect.width / 2;
      popupAnchorY = rect.bottom + 10;
      buttonTop = clamp(rect.bottom + 10, 10, window.innerHeight - 44);
      buttonLeft = clamp(
        rect.left + rect.width / 2 - 40,
        10,
        window.innerWidth - 120,
      );

      button.style.top = `${buttonTop}px`;
      button.style.left = `${buttonLeft}px`;
      button.classList.add("lookup-btn--active");
      showButton();
    }, 10);
  });

  document.addEventListener("mousedown", (event) => {
    const path = event.composedPath();
    const inShadow = path.includes(host);

    if (!inShadow && !popup.classList.contains("hidden")) {
      closeAll();
      window.getSelection()?.removeAllRanges();
      return;
    }

    if (!inShadow && !button.classList.contains("hidden")) {
      hideButton();
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      if (!button.classList.contains("hidden")) {
        hideButton();
      }
    },
    { passive: true },
  );

  window.addEventListener("resize", () => {
    if (!button.classList.contains("hidden")) {
      hideButton();
    }
    if (!popup.classList.contains("hidden")) {
      setPopupOrigin();
    }
  });
})();

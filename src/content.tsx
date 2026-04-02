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
    :host, * { box-sizing: border-box; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    .hidden { display: none !important; }

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
    }

    .lookup-btn:hover {
      background: #000;
    }

    .popup {
      position: fixed;
      width: 340px;
      max-height: 420px;
      overflow-y: auto;
      pointer-events: auto;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 16px;
      box-shadow: 0 24px 48px rgba(0,0,0,0.2);
      padding: 16px;
      color: #111827;
    }

    .popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      padding-bottom: 10px;
      margin-bottom: 10px;
    }

    .popup-title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #2563eb;
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

    .loading,
    .empty {
      text-align: center;
      color: #6b7280;
      padding: 16px 0;
      font-size: 14px;
    }

    .entry + .entry {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
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
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: #4b5563;
      background: rgba(0, 0, 0, 0.06);
      padding: 4px 8px;
      border-radius: 6px;
    }

    ul { margin: 0; padding: 0 0 0 16px; }
    li { margin-bottom: 8px; color: #374151; font-size: 14px; line-height: 1.45; }

    .example {
      display: block;
      margin-top: 4px;
      color: #6b7280;
      font-style: italic;
      padding-left: 8px;
      border-left: 2px solid rgba(0, 0, 0, 0.12);
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

  const hideButton = () => button.classList.add("hidden");
  const showButton = () => button.classList.remove("hidden");
  const hidePopup = () => popup.classList.add("hidden");
  const showPopup = () => popup.classList.remove("hidden");

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const closeAll = () => {
    hideButton();
    hidePopup();
    selectedText = "";
  };

  const renderLoading = (word: string) => {
    popup.innerHTML = `
      <div class="popup-header">
        <h2 class="popup-title"></h2>
        <button class="close-btn" type="button">×</button>
      </div>
      <div class="loading">Looking up meaning...</div>
    `;

    const title = popup.querySelector(".popup-title") as HTMLElement;
    title.textContent = word;

    const closeBtn = popup.querySelector(".close-btn") as HTMLButtonElement;
    closeBtn.addEventListener("click", () => {
      closeAll();
      window.getSelection()?.removeAllRanges();
    });
  };

  const renderNoResult = (word: string) => {
    popup.innerHTML = `
      <div class="popup-header">
        <h2 class="popup-title"></h2>
        <button class="close-btn" type="button">×</button>
      </div>
      <div class="empty">No definition found for this text.</div>
    `;

    const title = popup.querySelector(".popup-title") as HTMLElement;
    title.textContent = word;

    const closeBtn = popup.querySelector(".close-btn") as HTMLButtonElement;
    closeBtn.addEventListener("click", () => {
      closeAll();
      window.getSelection()?.removeAllRanges();
    });
  };

  const renderDefinition = (word: string, data: Definition[]) => {
    popup.innerHTML = "";

    const header = document.createElement("div");
    header.className = "popup-header";

    const title = document.createElement("h2");
    title.className = "popup-title";
    title.textContent = word;

    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.type = "button";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => {
      closeAll();
      window.getSelection()?.removeAllRanges();
    });

    header.appendChild(title);
    header.appendChild(closeBtn);
    popup.appendChild(header);

    data.forEach((entry) => {
      const entryNode = document.createElement("div");
      entryNode.className = "entry";

      if (entry.phonetic) {
        const phonetic = document.createElement("div");
        phonetic.className = "phonetic";
        phonetic.textContent = entry.phonetic;
        entryNode.appendChild(phonetic);
      }

      entry.meanings.forEach((meaning) => {
        const part = document.createElement("span");
        part.className = "part";
        part.textContent = meaning.partOfSpeech;
        entryNode.appendChild(part);

        const list = document.createElement("ul");

        meaning.definitions.slice(0, 3).forEach((def) => {
          const item = document.createElement("li");
          item.textContent = def.definition;

          if (def.example) {
            const example = document.createElement("span");
            example.className = "example";
            example.textContent = `"${def.example}"`;
            item.appendChild(example);
          }

          list.appendChild(item);
        });

        entryNode.appendChild(list);
      });

      popup.appendChild(entryNode);
    });
  };

  const placePopupNearButton = () => {
    const popupWidth = 340;
    const popupHeight = 420;
    const gap = 12;

    const left = clamp(
      buttonLeft - 100,
      10,
      window.innerWidth - popupWidth - 10,
    );
    let top = buttonTop + 42;

    if (top + popupHeight > window.innerHeight - 10) {
      top = Math.max(10, buttonTop - popupHeight - gap);
    }

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  };

  const lookupWord = async (word: string) => {
    renderLoading(word);
    showPopup();

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
    placePopupNearButton();
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
      buttonTop = clamp(rect.bottom + 10, 10, window.innerHeight - 44);
      buttonLeft = clamp(
        rect.left + rect.width / 2 - 40,
        10,
        window.innerWidth - 120,
      );

      button.style.top = `${buttonTop}px`;
      button.style.left = `${buttonLeft}px`;
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
      placePopupNearButton();
    }
  });
})();

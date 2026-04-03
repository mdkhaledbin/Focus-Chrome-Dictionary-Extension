var e=e=>e.replace(/[&<>"']/g,e=>{switch(e){case`&`:return`&amp;`;case`<`:return`&lt;`;case`>`:return`&gt;`;case`"`:return`&quot;`;case`'`:return`&#39;`;default:return e}}),t=e=>e.replace(/\s+/g,` `).replace(/\s+([,;:.!?])/g,`$1`).replace(/\s*—\s*/g,` — `).replace(/\s*--\s*/g,` — `).trim(),n=e=>{let n=[...e.matchAll(/(?:^|\s)(\d+)\.\s*/g)];return n.length===0?[{number:null,text:t(e)}]:n.map((r,i)=>{let a=(r.index??0)+r[0].length,o=n[i+1]?.index??e.length;return{number:r[1],text:t(e.slice(a,o))}}).filter(e=>e.text.length>0)},r=e=>t(e).split(/\s*;\s*--\s*|\s+--\s+|;\s+/).map(e=>t(e)).filter(Boolean),i=e=>{let n=[...e.matchAll(/\(([a-z])\)\s*/gi)];return n.length?{intro:t(e.slice(0,n[0].index??0).replace(/[:;,-]+$/,``)),items:n.map((r,i)=>{let a=(r.index??0)+r[0].length,o=n[i+1]?.index??e.length;return{label:r[1],text:t(e.slice(a,o).replace(/^[;:,-\s]+/,``))}}).filter(e=>e.text.length>0)}:null},a=n=>{let r=t(n),a=i(r);if(a)return{html:`
          ${a.intro?`<div class="indexed-meta">${e(a.intro)}</div>`:``}
          <ul class="indexed-subpoints">
            ${a.items.map(t=>`
                  <li>
                    <span class="indexed-label">${e(t.label)}</span>
                    <span class="indexed-divider">—</span>
                    <span>${e(t.text)}</span>
                  </li>
                `).join(``)}
          </ul>
        `};let o=r.match(/^(.{1,40}?),\s*(.+)$/);return o&&/^[A-Z]/.test(o[1])?{html:`
          <div>
            <span class="indexed-label">${e(o[1])}</span>
            <span class="indexed-divider">—</span>
            <span>${e(o[2])}</span>
          </div>
        `}:{html:`<div>${e(r)}</div>`}},o=t=>`
      <div class="indexed-block">
        ${n(t).map(t=>{let n=r(t.text),i=n.shift()??t.text,o=n.map(e=>`<li>${a(e).html}</li>`).join(``);return`
              <div class="indexed-point">
                <div class="indexed-content">
                  <div class="indexed-lead">${e(i)}</div>
                  ${o?`<ul class="indexed-clauses">${o}</ul>`:``}
                </div>
              </div>
            `}).join(``)}
      </div>
    `,s=t=>{let{popup:n,onClose:r,openSource:i}=t,a=(e,t,i)=>{n.innerHTML=`
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
            ${t}
          </div>
        </div>
      </div>
    `;let a=n.querySelector(`.popup-title`);a.textContent=e;let o=n.querySelector(`.source-badge`);o.className=`source-badge hidden`,i&&(o.textContent=i===`indexeddb`?`IndexedDB`:`API`,o.classList.add(`source-badge--${i}`)),n.querySelector(`.close-btn`).addEventListener(`click`,()=>{r(),window.getSelection()?.removeAllRanges()})};return{renderShell:a,renderLoading:e=>{a(e,`<div class="loading">Looking up meaning...</div>`)},renderNoResult:e=>{a(e,`<div class="empty">No definition found for this text.</div>`)},renderDefinition:(t,r,s)=>{let c=s===`indexeddb`;a(t,`
        ${r.map((t,n)=>{let i=t.meanings.map(t=>{let n=c?o(t.definitions[0]?.definition??``):t.definitions.slice(0,3).map(t=>{let n=t.example?`<div class="definition-note">${e(t.example)}</div>`:``;return`<li><div class="definition-text">${e(t.definition)}${n}</div></li>`}).join(``);return`
              <div class="definition-group">
                <div class="section-header"><span>${t.partOfSpeech}</span></div>
                ${c?n:`<ol class="definition-list">${n}</ol>`}
              </div>
            `}).join(``);return`
          <div class="entry">
            ${t.phonetic?`<div class="phonetic">${t.phonetic}</div>`:``}
            ${i}
            ${n<r.length-1?`<hr />`:``}
          </div>
        `}).join(``)}
        <div class="popup-footer">
          <button class="source-btn" type="button" data-source="dictionary">Dictionary</button>
          <button class="source-btn" type="button" data-source="wikipedia">Wikipedia</button>
        </div>
      `,s),n.querySelectorAll(`[data-source]`).forEach(e=>{let n=e;n.addEventListener(`click`,()=>{let e=n.dataset.source;e===`dictionary`&&i(`https://www.dictionary.com/browse/`,t),e===`wikipedia`&&i(`https://en.wikipedia.org/wiki/Special:Search?search=`,t)})})}}},c=async e=>new Promise(t=>{let n={action:`LOOKUP_WORD`,word:e};chrome.runtime.sendMessage(n,e=>{if(chrome.runtime.lastError){t({success:!1,error:chrome.runtime.lastError.message});return}t(e)})});(function(){if(document.getElementById(`focus-extension-root`))return;let e=document.createElement(`div`);e.id=`focus-extension-root`,e.style.cssText=[`position:fixed`,`inset:0`,`z-index:2147483647`,`pointer-events:none`].join(`;`);let t=e.attachShadow({mode:`open`});document.documentElement.appendChild(e);let n=document.createElement(`style`);n.textContent=`
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
      gap: 10px;
    }

    .title-wrap {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
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

    .source-badge {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      border-radius: 999px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: rgba(0, 0, 0, 0.06);
      color: #555;
    }

    .source-badge--indexeddb {
      background: rgba(59, 130, 246, 0.12);
      color: #1d4ed8;
    }

    .source-badge--api {
      background: rgba(16, 185, 129, 0.12);
      color: #047857;
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

    .indexed-block {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 2px 0 0;
    }

    .indexed-point {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 10px 10px 10px 0;
      border-radius: 10px;
    }

    .indexed-number {
      flex: none;
      min-width: 24px;
      height: 24px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: #1d4ed8;
      background: rgba(59, 130, 246, 0.12);
      margin-top: 1px;
    }

    .indexed-content {
      flex: 1;
      min-width: 0;
    }

    .indexed-lead {
      font-size: 13px;
      line-height: 1.55;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
    }

    .indexed-clauses {
      margin: 0;
      padding: 0 0 0 18px;
      list-style: disc;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .indexed-clauses li {
      margin: 0;
      color: #374151;
      font-size: 13px;
      line-height: 1.5;
    }

    .indexed-clauses li::marker {
      color: rgba(29, 78, 216, 0.55);
    }

    .indexed-label {
      font-weight: 700;
      color: #111827;
    }

    .indexed-divider {
      color: #6b7280;
      margin: 0 4px;
    }

    .indexed-subpoints {
      margin: 8px 0 0;
      padding: 0 0 0 18px;
      list-style: lower-alpha;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .indexed-subpoints li {
      margin: 0;
      color: #4b5563;
      font-size: 12.5px;
      line-height: 1.45;
    }

    .indexed-subpoints li::marker {
      color: rgba(107, 114, 128, 0.9);
      font-weight: 600;
    }

    .indexed-meta {
      margin-top: 6px;
      color: #6b7280;
      font-size: 12px;
      font-style: italic;
      line-height: 1.45;
    }

    .definition-list,
    .indexed-list {
      margin: 0;
      padding: 0 0 0 18px;
      list-style: decimal;
    }

    .definition-list li,
    .indexed-list li {
      margin-bottom: 10px;
    }

    .definition-text {
      font-size: 13px;
      line-height: 1.5;
      color: inherit;
    }

    .definition-note {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-top: 4px;
      padding-left: 8px;
      color: #6b7280;
      font-size: 12px;
      line-height: 1.45;
    }

    .definition-note::before {
      content: "•";
      flex: none;
      color: rgba(0, 0, 0, 0.35);
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
      .indexed-number {
        background: rgba(96, 165, 250, 0.18);
        color: #bfdbfe;
      }
      .indexed-lead { color: #f3f4f6; }
      .indexed-clauses li { color: #e5e7eb; }
      .indexed-clauses li::marker { color: rgba(147, 197, 253, 0.6); }
      .indexed-label { color: #f9fafb; }
      .indexed-divider { color: #9ca3af; }
      .indexed-subpoints li { color: #d1d5db; }
      .indexed-subpoints li::marker { color: rgba(209, 213, 219, 0.8); }
      .indexed-meta { color: #cbd5e1; }
      .definition-note {
        color: #cbd5e1;
      }
      .definition-note::before { color: rgba(255, 255, 255, 0.5); }
      .source-badge { background: rgba(255, 255, 255, 0.08); color: #d1d5db; }
      .source-badge--indexeddb { background: rgba(59, 130, 246, 0.16); color: #bfdbfe; }
      .source-badge--api { background: rgba(16, 185, 129, 0.16); color: #a7f3d0; }
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
  `;let r=document.createElement(`button`);r.className=`lookup-btn hidden`,r.type=`button`,r.innerHTML=`<span>🔎</span><span>Look-up</span>`;let i=document.createElement(`div`);i.className=`popup hidden`,t.appendChild(n),t.appendChild(r),t.appendChild(i);let a=``,o=0,l=0,u=0,d=0,f,p=()=>r.classList.add(`hidden`),m=()=>r.classList.remove(`hidden`),h=()=>i.classList.add(`hidden`),g=(e,t,n)=>Math.min(Math.max(e,t),n),_=()=>{p(),a=``,r.classList.remove(`lookup-btn--active`),x()},v=s({popup:i,onClose:_,openSource:(e,t)=>{window.open(`${e}${encodeURIComponent(t)}`,`_blank`,`noopener,noreferrer`)}}),y=()=>{let e=g(l-100,10,window.innerWidth-340-10),t=o+42;t+400>window.innerHeight-10&&(t=Math.max(10,o-400-12)),i.style.left=`${e}px`,i.style.top=`${t}px`,i.style.setProperty(`--popup-from-x`,`${u-e}px`),i.style.setProperty(`--popup-from-y`,`${d-t}px`)},b=()=>{f!==void 0&&(window.clearTimeout(f),f=void 0),i.classList.remove(`hidden`,`is-closing`,`is-open`),i.classList.add(`is-opening`),requestAnimationFrame(()=>{i.classList.remove(`is-opening`),i.classList.add(`is-open`)})},x=()=>{if(i.classList.contains(`hidden`))return;i.classList.remove(`is-opening`,`is-open`),i.classList.add(`is-closing`);let e=()=>{i.classList.remove(`is-closing`),h()},t=n=>{n.target===n.currentTarget&&(i.removeEventListener(`animationend`,t),e())};i.addEventListener(`animationend`,t),f!==void 0&&window.clearTimeout(f),f=window.setTimeout(()=>{i.removeEventListener(`animationend`,t),e()},450)},S=e=>{v.renderLoading(e)},C=e=>{v.renderNoResult(e)},w=(e,t,n)=>{v.renderDefinition(e,t,n)},T=async e=>{S(e),y(),b();try{let t=await c(e);t?.success&&Array.isArray(t.data)&&t.data.length>0?w(e,t.data,t.source):C(e)}catch{C(e)}};r.addEventListener(`click`,e=>{e.preventDefault(),e.stopPropagation(),a&&(p(),T(a))}),document.addEventListener(`mouseup`,()=>{setTimeout(()=>{let e=window.getSelection(),t=e?.toString().trim()??``;if(!t||t.split(/\s+/).length>5||!e||e.rangeCount===0){r.classList.remove(`lookup-btn--active`),i.classList.contains(`hidden`)&&p();return}let n=e.getRangeAt(0).getBoundingClientRect();!n||n.width===0&&n.height===0||(a=t,u=n.left+n.width/2,d=n.bottom+10,o=g(n.bottom+10,10,window.innerHeight-44),l=g(n.left+n.width/2-40,10,window.innerWidth-120),r.style.top=`${o}px`,r.style.left=`${l}px`,r.classList.add(`lookup-btn--active`),m())},10)}),document.addEventListener(`mousedown`,t=>{let n=t.composedPath().includes(e);if(!n&&!i.classList.contains(`hidden`)){_(),window.getSelection()?.removeAllRanges();return}!n&&!r.classList.contains(`hidden`)&&p()}),window.addEventListener(`scroll`,()=>{r.classList.contains(`hidden`)||p()},{passive:!0}),window.addEventListener(`resize`,()=>{r.classList.contains(`hidden`)||p(),i.classList.contains(`hidden`)||y()})})();
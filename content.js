// promptfly content script
// listens for // inside inputs/textareas

(function () {
  "use strict";

  let savedCmds = {};
  let boxUI = null;
  let activeField = null;
  let hits = [];
  let currIdx = 0;
  let stylesAdded = false;

  // get stuff from storage on load
  function loadCmds() {
    chrome.storage.sync.get('promptfly_commands', (data) => {
      savedCmds = data.promptfly_commands || {};
    });
  }

  // stay synced with the popup when it saves
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.promptfly_commands) {
      savedCmds = changes.promptfly_commands.newValue || {};
    }
  });

  loadCmds();

  // only add css when we actually need it to save ram
  function ensureStyles() {
    if (stylesAdded) return;
    stylesAdded = true;

    // console.log("adding promptfly styles...");

    const style = document.createElement('style');
    style.textContent = `
      @keyframes promptfly-appear {
        from { opacity: 0; transform: translateY(-6px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0)  scale(1);    }
      }
      #promptfly-suggestions {
        position: fixed;
        z-index: 2147483647;
        background: #0d0d0d;
        border: 1px solid rgba(99, 255, 180, 0.3);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,255,180,0.1);
        width: 320px;
        overflow: hidden;
        font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
        backdrop-filter: blur(12px);
        display: none;
      }
      .promptfly-header {
        padding: 6px 14px 4px;
        font-size: 9px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: rgba(99,255,180,0.4);
        border-bottom: 1px solid rgba(255,255,255,0.06);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .promptfly-header-left {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .promptfly-header-left::before {
        content: '';
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #63ffb4;
        box-shadow: 0 0 6px #63ffb4;
        flex-shrink: 0;
      }
      .promptfly-hint {
        font-size: 8px;
        color: rgba(255,255,255,0.22);
        letter-spacing: 0.05em;
        text-transform: none;
        white-space: nowrap;
      }
      .promptfly-list {
        max-height: 176px;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: thin;
        scrollbar-color: rgba(99,255,180,0.2) transparent;
      }
      .promptfly-list::-webkit-scrollbar { width: 4px; }
      .promptfly-list::-webkit-scrollbar-thumb {
        background: rgba(99,255,180,0.2);
        border-radius: 2px;
      }
      .promptfly-item {
        padding: 9px 14px;
        cursor: pointer;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        transition: background 0.1s;
      }
      .promptfly-item:last-child { border-bottom: none; }
      .promptfly-item:hover,
      .promptfly-item.selected {
        background: rgba(99, 255, 180, 0.08);
      }
      .promptfly-cmd {
        color: #63ffb4;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
        min-width: 90px;
        padding-top: 1px;
        flex-shrink: 0;
      }
      .promptfly-preview {
        color: rgba(255,255,255,0.45);
        font-size: 11px;
        line-height: 1.4;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        font-family: -apple-system, sans-serif;
        word-break: break-word;
      }
    `;
    document.head.appendChild(style);
  }

  // create dom for suggestions once
  function buildBoxDOM() {
    if (boxUI) return;
    ensureStyles();

    boxUI = document.createElement("div");
    boxUI.id = "promptfly-suggestions";

    // inner scroll
    const list = document.createElement("div");
    list.className = "promptfly-list";
    boxUI.appendChild(list);

    document.body.appendChild(boxUI);
  }

  // put the ui under the text box
  function positionBox(node) {
    const rect = node.getBoundingClientRect();
    let top = rect.bottom + 6;
    let left = rect.left;

    const width = 320;
    if (left + width > window.innerWidth - 10) {
      left = window.innerWidth - width - 10;
    }
    if (top + 220 > window.innerHeight) {
      top = rect.top - (boxUI.offsetHeight || 220) - 6;
    }

    boxUI.style.top = top + 'px';
    boxUI.style.left = left + 'px';
  }

  function showHints(inputElement, q) {
    buildBoxDOM();

    const allKeys = Object.keys(savedCmds);
    hits = allKeys.filter(k =>
      k.toLowerCase().startsWith(q.toLowerCase())
    );

    if (hits.length === 0) {
      hideHints();
      return;
    }

    currIdx = 0;
    renderList(q);
    positionBox(inputElement);

    // reset animation
    boxUI.style.animation = 'none';
    void boxUI.offsetWidth;
    boxUI.style.animation = 'promptfly-appear 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)';
    boxUI.style.display = 'block';
  }

  function renderList(query) {
    const oldHead = boxUI.querySelector('.promptfly-header');
    if (oldHead) oldHead.remove();

    const header = document.createElement("div");
    header.className = "promptfly-header";
    header.innerHTML = `
      <span class="promptfly-header-left">
        PromptFly - ${hits.length} match${hits.length !== 1 ? 'es' : ''}
      </span>
      <span class="promptfly-hint">&#x23CE; enter or click</span>
    `;
    boxUI.insertBefore(header, boxUI.firstChild);

    const L = boxUI.querySelector('.promptfly-list');
    L.innerHTML = '';

    hits.forEach((key, index) => {
      const itm = document.createElement("div");
      if (index === currIdx) {
        itm.className = "promptfly-item selected";
      } else {
        itm.className = "promptfly-item";
      }

      itm.innerHTML = `
        <span class="promptfly-cmd">//${stripHTML(key)}</span>
        <span class="promptfly-preview">${stripHTML(savedCmds[key] || '')}</span>
      `;

      // treat click as an enter press
      itm.addEventListener('mousedown', (e) => {
        e.preventDefault(); // stop blur
        insertCommand(activeField, key);
      });

      itm.addEventListener('mouseover', () => {
        currIdx = index;
        updateSelection();
      });

      L.appendChild(itm);
    });

    scrollSelection();
  }

  function updateSelection() {
    const elements = boxUI.querySelectorAll('.promptfly-item');
    elements.forEach((el, i) => {
      if (i === currIdx) {
        el.classList.add("selected");
      } else {
        el.classList.remove("selected");
      }
    });
    scrollSelection();
  }

  function scrollSelection() {
    const L = boxUI.querySelector('.promptfly-list');
    const items = L.querySelectorAll('.promptfly-item');
    if (items[currIdx]) {
      items[currIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  function hideHints() {
    if (boxUI) { boxUI.style.display = 'none'; }
    hits = [];
    currIdx = 0;
  }

  // does the actual text replacing
  function insertCommand(obj, key) {
    const theText = savedCmds[key];
    if (!theText || !obj) return;

    // console.log("inserting " + key);

    if (obj.isContentEditable) {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const r = sel.getRangeAt(0);
      const txtNode = r.startContainer.textContent;
      const cursor = r.startOffset;
      const past = txtNode.substring(0, cursor);
      const startSl = past.lastIndexOf('//');

      if (startSl === -1) return;

      r.startContainer.textContent = txtNode.substring(0, startSl) + theText + txtNode.substring(cursor);

      const nr = document.createRange();
      nr.setStart(r.startContainer, startSl + theText.length);
      nr.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nr);

    } else {
      const val = obj.value;
      const cursor = obj.selectionStart;
      const pastStr = val.substring(0, cursor);
      const startSl = pastStr.lastIndexOf('//');

      if (startSl === -1) return;

      const nxtStr = val.substring(0, startSl) + theText + val.substring(cursor);
      const nxtCursor = startSl + theText.length;

      // React / Vue fix otherwise they dont see updates:
      const p = obj instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const d = Object.getOwnPropertyDescriptor(p, 'value');

      if (d && d.set) {
        d.set.call(obj, nxtStr);
      } else {
        obj.value = nxtStr;
      }

      obj.setSelectionRange(nxtCursor, nxtCursor);
      // triggr input so frameworks update
      obj.dispatchEvent(new Event('input', { bubbles: true }));
      obj.dispatchEvent(new Event('change', { bubbles: true }));
    }

    hideHints();

    // just flash green a bit purely to look cool
    const trns = obj.style.transition;
    obj.style.transition = 'background 0.4s';
    obj.style.background = 'rgba(99, 255, 180, 0.12)';
    setTimeout(() => {
      obj.style.background = '';
      setTimeout(() => { obj.style.transition = trns; }, 400);
    }, 400);
  }

  function findDblSlash(el) {
    let t, c;
    if (el.isContentEditable) {
      const s = window.getSelection();
      if (!s.rangeCount) return null;
      const ra = s.getRangeAt(0);
      t = ra.startContainer.textContent;
      c = ra.startOffset;
    } else {
      t = el.value;
      c = el.selectionStart;
    }

    const bef = t.substring(0, c);
    // minimum 2 chars after
    const m = bef.match(/(?:^|[\s\n])(\/\/[a-zA-Z0-9_\-\.]{2,})$/);
    return m ? m[1] : null;
  }

  function onTypeKey(e) {
    const el = e.target;
    const cmdStr = findDblSlash(el);

    if (!cmdStr) {
      if (boxUI && boxUI.style.display !== 'none') {
        hideHints();
      }
      return;
    }

    activeField = el;
    showHints(el, cmdStr.slice(2));
  }

  function handleArrows(e) {
    if (!boxUI || boxUI.style.display === 'none') {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      currIdx = Math.min(currIdx + 1, hits.length - 1);
      updateSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      currIdx = Math.max(currIdx - 1, 0);
      updateSelection();
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      if (hits.length > 0) {
        e.preventDefault();
        insertCommand(activeField, hits[currIdx]);
      }
    } else if (e.key === 'Escape') {
      hideHints();
    }
  }

  function stripHTML(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // add listeners normally
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) {
      onTypeKey(e);
    }
  }, true);

  document.addEventListener('keydown', handleArrows, true);

  document.addEventListener('click', (e) => {
    if (boxUI && !boxUI.contains(e.target)) {
      hideHints();
    }
  }, true);

  window.addEventListener('scroll', hideHints, { passive: true, capture: true });
  window.addEventListener('resize', hideHints, { passive: true });

})();

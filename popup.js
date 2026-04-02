// promptfly popup logic
// added commands and saves to chrome sync
const store_key = 'promptfly_commands';
const minChars = 2; // needs to be same as content script rule

let cmds = {};
let currEdit = null;

const cmdInput = document.getElementById('cmd-input');
const textInput = document.getElementById('text-input');
const addBtn = document.getElementById('add-btn');
const listArea = document.getElementById('list-area');
const emptyState = document.getElementById('empty-state');
const countBadge = document.getElementById('count-badge');
const searchInput = document.getElementById('search-input');
const clearBtn = document.getElementById('clear-btn');

const editOverlay = document.getElementById('edit-overlay');
const editKey = document.getElementById('edit-key');
const editText = document.getElementById('edit-text');
const cancelEdit = document.getElementById('cancel-edit');
const saveEdit = document.getElementById('save-edit');

// load things on start
function initLoad() {
  chrome.storage.sync.get(store_key, (res) => {
    cmds = res[store_key] || {};
    drawList();
  });
}

function saveCmds(cb) {
  chrome.storage.sync.set({ [store_key]: cmds }, cb);
}

// redraw the whole list
function drawList(filterTerm = '') {
  let keys = Object.keys(cmds).filter(k => 
    k.toLowerCase().includes(filterTerm.toLowerCase()) || 
    (cmds[k] || '').toLowerCase().includes(filterTerm.toLowerCase())
  );

  let numCmds = Object.keys(cmds).length;
  countBadge.textContent = numCmds + " cmds";

  listArea.querySelectorAll('.cmd-card').forEach(n => n.remove());
  
  if (keys.length === 0) {
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
  }

  keys.forEach((k, idx) => {
    const card = document.createElement("div");
    card.className = "cmd-card";
    card.style.animationDelay = (idx * 0.03) + 's';

    const shortText = (cmds[k] || '').substring(0, 80);
    card.innerHTML = `
      <span class="cmd-key">//${cleanHTML(k)}</span>
      <div class="cmd-body">
        <div class="cmd-preview">${cleanHTML(shortText)}${cmds[k].length > 80 ? '…' : ''}</div>
      </div>
      <div class="cmd-actions">
        <button class="icon-btn copy" title="Copy text" data-id="${cleanHTML(k)}">⎘</button>
        <button class="icon-btn edit" title="Edit" data-id="${cleanHTML(k)}">✎</button>
        <button class="icon-btn del" title="Delete" data-id="${cleanHTML(k)}">✕</button>
      </div>
    `;

    card.querySelector('.copy').addEventListener('click', (ev) => {
      let id = ev.currentTarget.dataset.id;
      navigator.clipboard.writeText(cmds[id]).then(() => {
        const btn = ev.currentTarget;
        btn.textContent = '✓';
        btn.classList.add("copied");
        setTimeout(() => { btn.textContent = '⎘'; btn.classList.remove("copied"); }, 1200);
      });
    });

    card.querySelector('.edit').addEventListener("click", (ev) => {
      triggerEdit(ev.currentTarget.dataset.id);
    });

    card.querySelector(".del").addEventListener('click', (ev) => {
      let id = ev.currentTarget.dataset.id;
      const c = ev.currentTarget.closest('.cmd-card');
      c.style.transition = 'opacity 0.2s, transform 0.2s';
      c.style.opacity = '0';
      c.style.transform = 'translateX(10px)';
      
      setTimeout(() => {
        delete cmds[id];
        saveCmds(() => drawList(searchInput.value));
      }, 200);
    });

    listArea.appendChild(card);
  });
}

function fixKeyName(keyStr) {
  return keyStr.replace(/[^a-zA-Z0-9_\-\.]/g, '').toLowerCase();
}

addBtn.addEventListener('click', () => {
  const finalKey = fixKeyName(cmdInput.value.trim());
  const finalTxt = textInput.value.trim();

  if (finalKey.length < minChars) {
    flashError(cmdInput, "Min 2 chars");
    return;
  }
  if (!finalTxt) {
    doShake(textInput);
    return;
  }

  cmds[finalKey] = finalTxt;
  saveCmds(() => {
    drawList(searchInput.value);
    cmdInput.value = '';
    textInput.value = '';
    cmdInput.focus();

    addBtn.textContent = '✓ Saved!';
    addBtn.classList.add('saving');
    setTimeout(() => {
      addBtn.textContent = '＋ Save Command';
      addBtn.classList.remove("saving");
    }, 1000);
  });
});

cmdInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    textInput.focus();
  }
});

textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    addBtn.click();
  }
});

cmdInput.addEventListener("input", () => {
  const k = fixKeyName(cmdInput.value.trim());
  if (k.length > 0 && k.length < minChars) {
    cmdInput.style.borderColor = 'rgba(255,200,80,0.5)';
  } else {
    cmdInput.style.borderColor = '';
  }
});

// filter list when typing
searchInput.addEventListener("input", () => drawList(searchInput.value));

clearBtn.addEventListener("click", () => {
  if (Object.keys(cmds).length === 0) return;
  if (confirm("Delete all shortcuts?")) {
    cmds = {};
    saveCmds(() => drawList());
  }
});

// edits
function triggerEdit(k) {
  currEdit = k;
  editKey.value = k;
  editText.value = cmds[k] || '';
  editOverlay.style.display = 'flex';
  editOverlay.style.animation = 'overlay-in 0.18s ease';
  setTimeout(() => editText.focus(), 50);
}

function hideEdit() {
  editOverlay.style.display = 'none';
  currEdit = null;
}

cancelEdit.addEventListener('click', hideEdit);

saveEdit.addEventListener('click', () => {
  if (!currEdit) return;
  const newT = editText.value.trim();
  if (!newT) {
    doShake(editText);
    return;
  }
  cmds[currEdit] = newT;
  saveCmds(() => {
    drawList(searchInput.value);
    hideEdit();
  });
});

function cleanHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function doShake(element) {
  element.style.animation = 'none';
  void element.offsetWidth;
  element.style.animation = 'shake 0.3s ease';
  element.style.borderColor = 'rgba(255,107,107,0.6)';
  setTimeout(() => { 
    element.style.borderColor = ''; 
    element.style.animation = '';
  }, 400);
}

function flashError(el, m) {
  doShake(el);
  const old = el.placeholder;
  el.placeholder = m;
  setTimeout(() => { el.placeholder = old; }, 1500);
}

const xStyles = document.createElement("style");
xStyles.textContent = `
  @keyframes shake {
    0%,100%{transform:translateX(0)}
    20%{transform:translateX(-5px)}
    40%{transform:translateX(5px)}
    60%{transform:translateX(-4px)}
    80%{transform:translateX(4px)}
  }
  @keyframes overlay-in {
    from{opacity:0;transform:translateY(8px)}
    to{opacity:1;transform:translateY(0)}
  }
`;
document.head.appendChild(xStyles);

// setup demo
function setupDemos() {
  chrome.storage.sync.get(store_key, (res) => {
    if (res[store_key]) return; // already got em

    const initial = {
      'debug': 'Look at this code and find the bugs. Tell me what is wrong and how to fix it with an example.\n\n[PASTE CODE]',
      'explain': 'Explain this to me like I am 5 years old. Use an analogy.\n\n[PASTE CONCEPT]',
      'email': 'Rewrite this email to sound professional and not angry.\n\n[PASTE EMAIL]'
    };
    chrome.storage.sync.set({ [store_key]: initial }, initLoad);
  });
}

// kick everything off
setupDemos();
initLoad();
cmdInput.focus();

// function testUI() { console.log('test hit') }

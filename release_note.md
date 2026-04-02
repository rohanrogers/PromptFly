# Release Note

We are excited to release **PromptFly v1.1.0** — a lightweight Chrome extension designed to instantly expand saved text snippets in any text box or input field using custom `//` slash commands.

### New Features & Core Functionality

- **Instant Text Expansion** — Type `//` followed by your custom command (e.g., `//debug`) in any text input, and an interactive autocomplete menu will appear right beneath your cursor.
- **Popup Control Center** — A sleek, self-contained popup UI to easily add, edit, delete, and copy your saved commands.
- **Live Search & Filtering** — Quickly filter through your saved commands directly in the popup -- or use your keyboard's arrow keys to navigate the autocomplete overlay.
- **Demo Commands Included** — Comes pre-loaded with a few handy starter prompts (like `//explain` and `//email`) to get you started immediately.

---

### Technical Improvements & Bug Fixes

- **React & Vue Compatibility** — Implemented an `Object.getOwnPropertyDescriptor` workaround and synthetic event dispatching to ensure modern frontend frameworks properly detect the injected text.
- **Advanced `contenteditable` Support** — Built precise cursor calculation and repositioning to support rich text editors and modern chat interfaces.
- **Zero-Bloat Architecture** — Uses "lazy DOM injection" --- the autocomplete HTML and CSS are only injected into the webpage when a command is actively triggered, keeping browser memory usage extremely low.
- **No Background Script** — Fully utilizes `chrome.storage.sync` and the active tab's memory, eliminating the need for a constantly running background service worker.
- **False Positive Prevention** — Required a double slash (`//`) and a minimum of 2 characters to trigger the menu, preventing annoying popups when typing standard URLs or directory paths.

---

### Installation

1. Download the source code.
2. Go to `chrome://extensions/` in your browser.
3. Enable "Developer mode" in the top right.
4. Click "Load unpacked" and select the `PromptFly` folder.

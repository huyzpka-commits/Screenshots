# 📸 Screenshot Pro

A clean, modern, minimalist screenshot tool for Chrome. Built with **Manifest V3**.

Capture the visible screen, an entire scrollable page, or a user-selected area — then download as PNG or open in a preview tab.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Visible Area** | Capture the current viewport in one click. |
| **Full Page** | Scroll-stitch the entire page into a single PNG (handles Retina/HiDPI). |
| **Selected Area** | Drag-to-select any region on the page. Press `Esc` to cancel. |
| **Download / Preview** | Toggle between auto-downloading the PNG or opening it in a preview tab. |

---

## 📁 Project Structure

```
Screenshots/
├── manifest.json    # MV3 config (permissions, service worker, popup)
├── popup.html       # Popup UI layout
├── popup.css        # Modern minimalist styling
├── popup.js         # Popup logic + mode toggle
├── background.js    # Service worker: capture, stitch, crop, download/preview
├── content.js       # Area selection overlay + full-page scroll/dimension helpers
├── preview.html     # Preview tab layout (dark theme)
├── preview.js       # Loads captured image + download button
└── .gitignore
```

---

## 🚀 Installation

1. Download or clone this repository:
   ```bash
   git clone https://github.com/huyzpka-commits/Screenshots.git
   ```
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the cloned folder.
5. The 📸 **Screenshot Pro** icon appears in your toolbar.

---

## 📖 Usage

1. Click the extension icon to open the popup.
2. Choose an output mode:
   - **⬇ Download** — saves the PNG directly to your Downloads folder.
   - **👁 Preview** — opens the screenshot in a new tab for review; download from there if needed.
3. Click one of the three capture buttons:
   - **🖥️ Visible Area** — captures what you see right now.
   - **📄 Full Page** — captures the entire scrollable page (auto-scrolls & stitches).
   - **✂️ Selected Area** — drag a rectangle on the page to capture just that region.
4. For **Selected Area**, click and drag on the overlay, then release. Press `Esc` to cancel.

---

## 🔧 Permissions

| Permission | Why it's needed |
|-----------|-----------------|
| `activeTab` | Access the current tab to capture and inject scripts. |
| `scripting` | Inject `content.js` for area selection & full-page scrolling. |
| `tabs` | Query active tab info and capture the visible tab. |
| `downloads` | Save screenshots as PNG files. |
| `storage` | Remember your Download/Preview preference. |

---

## 🛠️ How It Works

- **Visible Area** — Uses `chrome.tabs.captureVisibleTab()` for a single-frame grab.
- **Full Page** — Measures the full document, scrolls through it in viewport-sized steps, captures each frame, then stitches all frames into one image using `OffscreenCanvas` + `createImageBitmap`. Fixed/sticky elements are temporarily hidden to avoid duplication.
- **Selected Area** — Injects a full-screen overlay with drag-to-select. The selected rectangle (in CSS pixels) is sent back; the visible tab is captured and cropped to the selection using `OffscreenCanvas`, accounting for `devicePixelRatio`.

---

## 📌 Requirements

- Google Chrome (or any Chromium browser with MV3 support)
- Developer mode enabled for unpacked extension loading

---

## 📜 License

This project is provided as-is for personal use.

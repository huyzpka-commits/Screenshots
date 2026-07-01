// ============================================
// Screenshot Pro - Background Service Worker
// ============================================

let lastPreviewImage = null;

// --- Message Router ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureVisible') {
    handleCaptureVisible(message.mode).then(sendResponse);
    return true;
  }
  if (message.action === 'captureFull') {
    handleCaptureFull(message.mode).then(sendResponse);
    return true;
  }
  if (message.action === 'captureArea') {
    handleCaptureArea(message.mode).then(sendResponse);
    return true;
  }
  if (message.action === 'areaSelected') {
    handleAreaSelected(sender, message).then(sendResponse);
    return true;
  }
  if (message.action === 'areaSelectionCancelled') {
    sendResponse({ success: true });
    return false;
  }
  if (message.action === 'getPreviewImage') {
    sendResponse({ dataUrl: lastPreviewImage });
    return false;
  }
});

// --- Utilities ---

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });
    return true;
  } catch (e) {
    return false;
  }
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(response);
      }
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function blobToDataUrl(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return 'data:image/png;base64,' + btoa(binary);
}

// --- Output ---

async function downloadImage(dataUrl) {
  await chrome.downloads.download({
    url: dataUrl,
    filename: `screenshot_${timestamp()}.png`,
    saveAs: false,
  });
}

async function openPreview(dataUrl) {
  lastPreviewImage = dataUrl;
  await chrome.tabs.create({ url: chrome.runtime.getURL('preview.html') });
}

async function outputImage(dataUrl, mode) {
  if (mode === 'preview') {
    await openPreview(dataUrl);
    return { success: 'Opened in preview tab' };
  } else {
    await downloadImage(dataUrl);
    return { success: 'Screenshot downloaded' };
  }
}

// --- Capture Visible ---

async function handleCaptureVisible(mode) {
  try {
    const tab = await getActiveTab();
    if (!tab) return { error: 'No active tab found' };

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    return await outputImage(dataUrl, mode);
  } catch (e) {
    return { error: e.message || 'Failed to capture visible area' };
  }
}

// --- Capture Full Page ---

async function handleCaptureFull(mode) {
  try {
    const tab = await getActiveTab();
    if (!tab) return { error: 'No active tab found' };

    const injected = await injectContentScript(tab.id);
    if (!injected) return { error: 'Cannot access this page (try a normal website)' };

    const dims = await sendTabMessage(tab.id, { action: 'getFullPageDims' });
    if (!dims) return { error: 'Failed to get page dimensions' };

    const { width, height, viewportWidth, viewportHeight, dpr, scrollX, scrollY } = dims;

    const xPositions = getScrollPositions(width, viewportWidth);
    const yPositions = getScrollPositions(height, viewportHeight);

    const positions = [];
    for (const y of yPositions) {
      for (const x of xPositions) {
        positions.push({ x, y });
      }
    }

    if (positions.length > 50) {
      return { error: 'Page is too large to capture (max 50 frames)' };
    }

    const images = [];
    for (const pos of positions) {
      await sendTabMessage(tab.id, { action: 'scrollTo', x: pos.x, y: pos.y });
      await sleep(600);
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      images.push({ dataUrl, x: pos.x, y: pos.y });
    }

    await sendTabMessage(tab.id, { action: 'restoreScroll', x: scrollX, y: scrollY });

    if (images.length === 1) {
      return await outputImage(images[0].dataUrl, mode);
    }

    const finalDataUrl = await stitchImages(images, width, height, dpr);
    return await outputImage(finalDataUrl, mode);
  } catch (e) {
    return { error: e.message || 'Failed to capture full page' };
  }
}

function getScrollPositions(total, viewport) {
  const positions = [];
  if (total <= viewport) {
    positions.push(0);
    return positions;
  }
  for (let i = 0; i < total - viewport; i += viewport) {
    positions.push(i);
  }
  positions.push(total - viewport);
  return [...new Set(positions)];
}

async function stitchImages(images, totalWidth, totalHeight, dpr) {
  const canvas = new OffscreenCanvas(totalWidth * dpr, totalHeight * dpr);
  const ctx = canvas.getContext('2d');

  for (const img of images) {
    const blob = await (await fetch(img.dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    ctx.drawImage(bitmap, img.x * dpr, img.y * dpr);
    bitmap.close();
  }

  const finalBlob = await canvas.convertToBlob({ type: 'image/png' });
  return await blobToDataUrl(finalBlob);
}

// --- Capture Area ---

async function handleCaptureArea(mode) {
  try {
    const tab = await getActiveTab();
    if (!tab) return { error: 'No active tab found' };

    const injected = await injectContentScript(tab.id);
    if (!injected) return { error: 'Cannot access this page (try a normal website)' };

    await chrome.storage.local.set({ areaCaptureMode: mode });

    await sendTabMessage(tab.id, { action: 'startAreaSelection' });
    return { success: 'Select an area on the page' };
  } catch (e) {
    return { error: e.message || 'Failed to start area selection' };
  }
}

async function handleAreaSelected(sender, message) {
  try {
    const windowId = sender.tab.windowId;
    const { rect, dpr } = message;

    await sleep(300);

    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
    const croppedDataUrl = await cropImage(dataUrl, rect, dpr);

    const data = await chrome.storage.local.get('areaCaptureMode');
    const mode = data.areaCaptureMode || 'download';

    return await outputImage(croppedDataUrl, mode);
  } catch (e) {
    return { error: e.message || 'Failed to capture selected area' };
  }
}

async function cropImage(dataUrl, rect, dpr) {
  const blob = await (await fetch(dataUrl)).blob();
  const bitmap = await createImageBitmap(blob);

  const sx = Math.round(rect.x * dpr);
  const sy = Math.round(rect.y * dpr);
  const sw = Math.round(rect.width * dpr);
  const sh = Math.round(rect.height * dpr);

  const canvas = new OffscreenCanvas(sw, sh);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);

  bitmap.close();
  const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
  return await blobToDataUrl(croppedBlob);
}

let captureMode = 'download';

document.addEventListener('DOMContentLoaded', () => {
  loadMode();

  document.getElementById('modeDownload').addEventListener('click', () => setMode('download'));
  document.getElementById('modePreview').addEventListener('click', () => setMode('preview'));
  document.getElementById('captureVisible').addEventListener('click', () => capture('captureVisible'));
  document.getElementById('captureFull').addEventListener('click', () => capture('captureFull'));
  document.getElementById('captureArea').addEventListener('click', () => capture('captureArea'));
});

function loadMode() {
  chrome.storage.local.get('captureMode', (data) => {
    if (data.captureMode) {
      captureMode = data.captureMode;
      updateModeUI();
    }
  });
}

function setMode(mode) {
  captureMode = mode;
  chrome.storage.local.set({ captureMode: mode });
  updateModeUI();
}

function updateModeUI() {
  document.getElementById('modeDownload').classList.toggle('active', captureMode === 'download');
  document.getElementById('modePreview').classList.toggle('active', captureMode === 'preview');
}

function capture(action) {
  if (action === 'captureArea') {
    chrome.runtime.sendMessage({ action: action, mode: captureMode });
    window.close();
    return;
  }

  showStatus('Capturing…', 'loading');

  chrome.runtime.sendMessage({ action: action, mode: captureMode }, (response) => {
    if (chrome.runtime.lastError) {
      showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
    } else if (response && response.error) {
      showStatus(response.error, 'error');
    } else if (response && response.success) {
      showStatus(response.success, 'success');
    }
    setTimeout(() => window.close(), 1500);
  });
}

function showStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = 'status show ' + type;
}

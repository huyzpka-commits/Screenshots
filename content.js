// ============================================
// Screenshot Pro - Content Script
// ============================================

(function () {
  if (window.__screenshotProCS) return;
  window.__screenshotProCS = true;

  var overlay = null;
  var selectionBox = null;
  var instructionLabel = null;
  var startXB = 0;
  var startYBox = 0;
  var isSelecting = false;
  var hiddenElements = [];

  // --- Message Listener ---

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'startAreaSelection') {
      startAreaSelection();
      sendResponse({ started: true });
    } else if (message.action === 'getFullPageDims') {
      hideFixedElements();
      sendResponse(getFullPageDims());
    } else if (message.action === 'scrollTo') {
      window.scrollTo(message.x, message.y);
      sendResponse({ done: true });
    } else if (message.action === 'restoreScroll') {
      window.scrollTo(message.x, message.y);
      showFixedElements();
      sendResponse({ done: true });
    }
    return true;
  });

  // --- Full Page Helpers ---

  function getFullPageDims() {
    var width = Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.offsetWidth,
      document.body.clientWidth,
      document.documentElement.clientWidth
    );
    var height = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight
    );
    return {
      width: width,
      height: height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      dpr: window.devicePixelRatio,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };
  }

  function hideFixedElements() {
    hiddenElements = [];
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var style = getComputedStyle(all[i]);
      if (style.position === 'fixed' || style.position === 'sticky') {
        hiddenElements.push({ el: all[i], display: all[i].style.display });
        all[i].style.display = 'none';
      }
    }
  }

  function showFixedElements() {
    for (var i = 0; i < hiddenElements.length; i++) {
      hiddenElements[i].el.style.display = hiddenElements[i].display;
    }
    hiddenElements = [];
  }

  // --- Area Selection ---

  function startAreaSelection() {
    removeOverlay();
    createOverlay();
  }

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;' +
      'cursor:crosshair;background:rgba(0,0,0,0.25);';

    instructionLabel = document.createElement('div');
    instructionLabel.style.cssText =
      'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
      'background:rgba(0,0,0,0.85);color:#fff;padding:10px 22px;border-radius:10px;' +
      'font-family:-apple-system,sans-serif;font-size:14px;font-weight:500;' +
      'z-index:2147483647;pointer-events:none;white-space:nowrap;';
    instructionLabel.textContent = 'Click and drag to select · Press Esc to cancel';

    selectionBox = document.createElement('div');
    selectionBox.style.cssText =
      'position:absolute;border:2px solid #4285f4;background:rgba(66,133,244,0.08);' +
      'box-shadow:0 0 0 9999px rgba(0,0,0,0.35);display:none;pointer-events:none;';

    overlay.appendChild(selectionBox);
    document.body.appendChild(overlay);
    document.body.appendChild(instructionLabel);

    overlay.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown, true);
  }

  function onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    isSelecting = true;
    startXB = e.clientX;
    startYBox = e.clientY;
    selectionBox.style.left = startXB + 'px';
    selectionBox.style.top = startYBox + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
    overlay.addEventListener('mousemove', onMouseMove);
    overlay.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e) {
    e.preventDefault();
    if (!isSelecting) return;
    var cx = e.clientX;
    var cy = e.clientY;
    var left = Math.min(startXB, cx);
    var top = Math.min(startYBox, cy);
    var w = Math.abs(cx - startXB);
    var h = Math.abs(cy - startYBox);
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = w + 'px';
    selectionBox.style.height = h + 'px';
  }

  function onMouseUp(e) {
    e.preventDefault();
    if (!isSelecting) return;
    isSelecting = false;
    overlay.removeEventListener('mousemove', onMouseMove);
    overlay.removeEventListener('mouseup', onMouseUp);

    var rect = {
      x: parseFloat(selectionBox.style.left),
      y: parseFloat(selectionBox.style.top),
      width: parseFloat(selectionBox.style.width),
      height: parseFloat(selectionBox.style.height),
    };

    if (rect.width < 5 || rect.height < 5) {
      removeOverlay();
      return;
    }

    removeOverlay();
    chrome.runtime.sendMessage({
      action: 'areaSelected',
      rect: rect,
      dpr: window.devicePixelRatio,
    });
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      removeOverlay();
      chrome.runtime.sendMessage({ action: 'areaSelectionCancelled' });
    }
  }

  function removeOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    if (instructionLabel) {
      instructionLabel.remove();
      instructionLabel = null;
    }
    selectionBox = null;
    isSelecting = false;
    document.removeEventListener('keydown', onKeyDown, true);
  }
})();

document.addEventListener('DOMContentLoaded', function () {
  chrome.runtime.sendMessage({ action: 'getPreviewImage' }, function (response) {
    var loading = document.getElementById('loading');
    var img = document.getElementById('preview');

    if (response && response.dataUrl) {
      loading.style.display = 'none';
      img.src = response.dataUrl;
      img.style.display = 'block';

      img.onload = function () {
        document.getElementById('info').textContent =
          img.naturalWidth + ' × ' + img.naturalHeight + 'px';
      };

      document.getElementById('download').addEventListener('click', function () {
        chrome.downloads.download({
          url: response.dataUrl,
          filename: 'screenshot_' + Date.now() + '.png',
          saveAs: false,
        });
      });
    } else {
      loading.textContent = 'No screenshot found.';
    }
  });
});

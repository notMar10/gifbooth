export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function triggerFlash(flashEl) {
  flashEl.classList.remove('go');
  void flashEl.offsetWidth;
  flashEl.classList.add('go');
}

export function downloadBlob(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

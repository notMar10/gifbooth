import { CONFIG } from './config.js';
import { wait, triggerFlash, downloadBlob } from './utils.js';
import { captureFrames, encodeGif, buildBorderedFrames, buildStackedFrames } from './gif-capture.js';

const els = {
  video: document.getElementById('video'),
  canvas: document.getElementById('canvas'),
  viewfinder: document.getElementById('viewfinder'),
  borderColorInput: document.getElementById('borderColorInput'),
  textColorInput: document.getElementById('textColorInput'),
  textColorAutoCheckbox: document.getElementById('textColorAutoCheckbox'),
  labelTextInput: document.getElementById('labelTextInput'),
  startPanel: document.getElementById('startPanel'),
  startBtn: document.getElementById('startBtn'),
  liveControls: document.getElementById('liveControls'),
  shutterBtn: document.getElementById('shutterBtn'),
  statusMain: document.getElementById('statusMain'),
  resetBtn: document.getElementById('resetBtn'),
  countdownEl: document.getElementById('countdown'),
  flashEl: document.getElementById('flash'),
  recBadge: document.getElementById('recBadge'),
  recLabel: document.getElementById('recLabel'),
  shotCounter: document.getElementById('shotCounter'),
  tray: document.getElementById('tray'),
  trayCount: document.getElementById('trayCount'),
  trayActions: document.getElementById('trayActions'),
  downloadFramedBtn: document.getElementById('downloadFramedBtn'),
  downloadStackedBtn: document.getElementById('downloadStackedBtn'),
  clock: document.getElementById('clock'),
  recordTimer: document.getElementById('recordTimer'),
};

const ctx = els.canvas.getContext('2d', { willReadFrequently: true });

let trayEmpty = document.getElementById('trayEmpty');
let shotsTaken = 0;
let busy = false;
let sessionAborted = false;
let stream = null;
const gifUrls = [];
const framedGifUrls = [];
const allBorderedFrames = [];
let stackedDims = null;
let stackedGifUrl = null;
let captureDims = { width: CONFIG.VIDEO_WIDTH, height: CONFIG.VIDEO_HEIGHT };

function contrastingCaptionColor(hex) {
  const c = (hex || '').replace('#', '');
  if (c.length !== 6) return CONFIG.BORDER.CAPTION_COLOR;
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? 'rgba(26,23,16,0.6)' : 'rgba(255,255,255,0.7)';
}

function getBorderOptions() {
  const paperColor = els.borderColorInput?.value || CONFIG.BORDER.PAPER_COLOR;
  const useAuto = els.textColorAutoCheckbox ? els.textColorAutoCheckbox.checked : true;
  const captionColor = useAuto
    ? contrastingCaptionColor(paperColor)
    : (els.textColorInput?.value || CONFIG.BORDER.CAPTION_COLOR);
  const rawLabel = els.labelTextInput?.value ?? CONFIG.BORDER.LABEL_TEXT;
  const labelText = rawLabel.trim().slice(0, 24) || CONFIG.BORDER.LABEL_TEXT;
  return {
    paperColor,
    captionColor,
    labelText,
  };
}

function setCustomizeDisabled(disabled) {
  if (els.borderColorInput) els.borderColorInput.disabled = disabled;
  if (els.textColorAutoCheckbox) els.textColorAutoCheckbox.disabled = disabled;
  if (els.textColorInput) els.textColorInput.disabled = disabled || (els.textColorAutoCheckbox ? els.textColorAutoCheckbox.checked : false);
  if (els.labelTextInput) els.labelTextInput.disabled = disabled;
}

function updateViewfinderAspect() {
  if (els.viewfinder) {
    els.viewfinder.style.aspectRatio = `${captureDims.width} / ${captureDims.height}`;
  }
}

function setStatus(kind, text) {
  els.statusMain.textContent = text;
  els.statusMain.className = 'status-main ' + kind;
}

function setShotCounterUI() {
  els.shotCounter.textContent = `SHOT ${shotsTaken}/${CONFIG.MAX_SHOTS}`;
  els.trayCount.textContent = `${shotsTaken}/${CONFIG.MAX_SHOTS}`;
}

function setRecordingUI(active, secondsLeft) {
  els.recBadge.classList.toggle('live', active);
  els.recLabel.textContent = active ? 'rec' : 'idle';
  if (els.recordTimer) {
    els.recordTimer.textContent = active && secondsLeft != null ? `${secondsLeft}s` : '';
    els.recordTimer.classList.toggle('show', active && secondsLeft != null);
  }
}

async function runCountdown() {
  for (const n of [3, 2, 1]) {
    if (sessionAborted) return;
    els.countdownEl.textContent = n;
    els.countdownEl.classList.remove('show');
    void els.countdownEl.offsetWidth;
    els.countdownEl.classList.add('show');
    await wait(CONFIG.COUNTDOWN_STEP_MS);
  }
  els.countdownEl.textContent = '';
  els.countdownEl.classList.remove('show');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function addPrintToTray(url, index, borderOptions) {
  trayEmpty = document.getElementById('trayEmpty');
  if (trayEmpty) trayEmpty.remove();

  const { labelText, paperColor, captionColor } = borderOptions || {};

  const rot = (index % 2 === 0 ? -1 : 1) * (2 + Math.random() * 3);
  const div = document.createElement('div');
  div.className = 'print';
  div.style.setProperty('--rot', rot.toFixed(2) + 'deg');
  div.style.zIndex = String(index + 1);
  div.style.background = paperColor || CONFIG.BORDER.PAPER_COLOR;
  div.innerHTML = `
    <img src="${url}" alt="Take ${index + 1} gif">
    <div class="cap" style="color:${captionColor || CONFIG.BORDER.CAPTION_COLOR}">
      <span>TAKE ${String(index + 1).padStart(2, '0')}</span>
      <span>${escapeHtml(labelText || 'GIFBOOTH.GIF')}</span>
    </div>
  `;
  els.tray.appendChild(div);
}

async function recordOneShot(borderOptions) {
  const takeNumber = shotsTaken + 1;

  setStatus('busy', `Get ready for take ${takeNumber}…`);
  await runCountdown();
  if (sessionAborted) return;

  triggerFlash(els.flashEl);
  setRecordingUI(true, Math.ceil(CONFIG.CAPTURE_MS / 1000));
  setStatus('busy', `Recording take ${takeNumber} of ${CONFIG.MAX_SHOTS}…`);

  const frames = await captureFrames(els.video, els.canvas, ctx, (_frame, total) => {
    const elapsed = (_frame / total) * CONFIG.CAPTURE_MS;
    const remaining = Math.max(1, Math.ceil((CONFIG.CAPTURE_MS - elapsed) / 1000));
    setRecordingUI(true, remaining);
  }, () => sessionAborted, captureDims);

  if (sessionAborted) return;

  setRecordingUI(false);
  setStatus('busy', `Encoding take ${takeNumber}…`);

  const url = await encodeGif(frames, captureDims);
  if (sessionAborted) {
    URL.revokeObjectURL(url);
    return;
  }

  setStatus('busy', `Framing take ${takeNumber}…`);

  const { frames: borderedFrames, width, height } = buildBorderedFrames(
    frames,
    captureDims.width,
    captureDims.height,
    takeNumber,
    borderOptions
  );
  const framedUrl = await encodeGif(borderedFrames, { width, height });
  if (sessionAborted) {
    URL.revokeObjectURL(url);
    URL.revokeObjectURL(framedUrl);
    return;
  }

  gifUrls.push(url);
  framedGifUrls.push(framedUrl);
  allBorderedFrames.push(borderedFrames);
  stackedDims = { width, height };
  addPrintToTray(url, shotsTaken, borderOptions);
  shotsTaken++;
  setShotCounterUI();
}

async function runStripSession() {
  if (busy || shotsTaken >= CONFIG.MAX_SHOTS) return;

  busy = true;
  sessionAborted = false;
  els.shutterBtn.disabled = true;
  els.resetBtn.disabled = true;
  setCustomizeDisabled(true);
  const borderOptions = getBorderOptions();

  try {
    while (shotsTaken < CONFIG.MAX_SHOTS && !sessionAborted) {
      await recordOneShot(borderOptions);

      if (sessionAborted) break;

      if (shotsTaken < CONFIG.MAX_SHOTS) {
        setStatus('busy', `Take ${shotsTaken} done — next in a moment…`);
        await wait(CONFIG.GAP_BETWEEN_TAKES_MS);
      }
    }

    if (!sessionAborted && shotsTaken >= CONFIG.MAX_SHOTS) {
      setStatus('ready', 'Session complete — all 3 takes printed');
      els.trayActions.style.display = 'flex';
      els.downloadFramedBtn.disabled = false;
      els.downloadStackedBtn.disabled = false;
    }
  } catch (err) {
    if (sessionAborted) return;
    console.error(err);
    setStatus('busy', 'Something went wrong — tap Start over');
    alert(`Recording failed: ${err.message}\n\nMake sure you open this page through a local server (not file://) so the GIF encoder can load.`);
  } finally {
    busy = false;
    setRecordingUI(false);
    els.resetBtn.disabled = false;
    setCustomizeDisabled(false);
    if (shotsTaken < CONFIG.MAX_SHOTS && !sessionAborted) {
      els.shutterBtn.disabled = false;
    }
  }
}

async function initCamera() {
  els.startBtn.disabled = true;
  els.startBtn.textContent = 'Asking permission…';

  try {
    const isPortrait = window.innerHeight > window.innerWidth;
    const idealWidth = isPortrait ? CONFIG.VIDEO_HEIGHT : CONFIG.VIDEO_WIDTH;
    const idealHeight = isPortrait ? CONFIG.VIDEO_WIDTH : CONFIG.VIDEO_HEIGHT;

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: idealWidth },
        height: { ideal: idealHeight },
        facingMode: 'user',
      },
      audio: false,
    });

    els.video.srcObject = stream;
    await els.video.play();

    // Size everything from what the camera actually gave us, not a fixed
    // landscape guess — this is what avoids the squeeze/stretch on phones
    // held vertically.
    captureDims = {
      width: els.video.videoWidth || idealWidth,
      height: els.video.videoHeight || idealHeight,
    };
    els.canvas.width = captureDims.width;
    els.canvas.height = captureDims.height;
    updateViewfinderAspect();

    els.startPanel.style.display = 'none';
    els.liveControls.style.display = 'flex';
    setStatus('ready', 'Ready — press the shutter to start');
  } catch (err) {
    els.startBtn.disabled = false;
    els.startBtn.textContent = 'Wake up the camera';
    alert(`Couldn't reach your camera: ${err.message}\n\nCheck that this site has camera permission, then try again.`);
  }
}

function resetAll() {
  sessionAborted = true;
  shotsTaken = 0;
  busy = false;

  gifUrls.forEach((url) => URL.revokeObjectURL(url));
  gifUrls.length = 0;
  framedGifUrls.forEach((url) => URL.revokeObjectURL(url));
  framedGifUrls.length = 0;
  allBorderedFrames.length = 0;
  stackedDims = null;
  if (stackedGifUrl) {
    URL.revokeObjectURL(stackedGifUrl);
    stackedGifUrl = null;
  }

  els.tray.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'tray-empty';
  empty.id = 'trayEmpty';
  empty.innerHTML = 'Nothing printed<br>yet — take a shot<br>to fill the strip';
  els.tray.appendChild(empty);
  trayEmpty = empty;

  els.trayActions.style.display = 'none';
  els.downloadFramedBtn.disabled = true;
  els.downloadStackedBtn.disabled = true;
  els.downloadStackedBtn.textContent = 'Download stacked strip';
  els.shutterBtn.disabled = false;
  els.resetBtn.disabled = false;
  setRecordingUI(false);
  setShotCounterUI();
  setStatus('ready', 'Ready — allow camera to begin');
}

function downloadAll() {
  framedGifUrls.forEach((url, i) => {
    downloadBlob(url, `gifbooth-take-${i + 1}.gif`);
  });
}

async function downloadStacked() {
  if (stackedGifUrl) {
    downloadBlob(stackedGifUrl, 'gifbooth-strip.gif');
    return;
  }

  if (allBorderedFrames.length < CONFIG.MAX_SHOTS || !stackedDims) return;

  const prevText = els.downloadStackedBtn.textContent;
  els.downloadStackedBtn.disabled = true;
  els.downloadStackedBtn.textContent = 'Building…';

  try {
    const stacked = buildStackedFrames(allBorderedFrames, stackedDims.width, stackedDims.height);
    stackedGifUrl = await encodeGif(stacked.frames, { width: stacked.width, height: stacked.height });
    downloadBlob(stackedGifUrl, 'gifbooth-strip.gif');
  } catch (err) {
    console.error(err);
    alert(`Couldn't build the stacked gif: ${err.message}`);
  } finally {
    els.downloadStackedBtn.disabled = false;
    els.downloadStackedBtn.textContent = prevText;
  }
}

function tickClock() {
  els.clock.textContent = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

els.startBtn.addEventListener('click', initCamera);
els.shutterBtn.addEventListener('click', runStripSession);
els.resetBtn.addEventListener('click', resetAll);
els.downloadFramedBtn.addEventListener('click', downloadAll);
els.downloadStackedBtn.addEventListener('click', downloadStacked);
if (els.textColorAutoCheckbox) {
  els.textColorAutoCheckbox.addEventListener('change', () => {
    if (els.textColorInput) {
      els.textColorInput.disabled = els.textColorAutoCheckbox.checked;
    }
  });
}

if (els.textColorInput && els.textColorAutoCheckbox) {
  els.textColorInput.disabled = els.textColorAutoCheckbox.checked;
}

tickClock();
setInterval(tickClock, 1000);

window.addEventListener('resize', () => {
  if (busy || !stream) return;
  const vw = els.video.videoWidth;
  const vh = els.video.videoHeight;
  if (vw && vh && (vw !== captureDims.width || vh !== captureDims.height)) {
    captureDims = { width: vw, height: vh };
    els.canvas.width = vw;
    els.canvas.height = vh;
    updateViewfinderAspect();
  }
});

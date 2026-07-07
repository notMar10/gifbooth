import { CONFIG } from './config.js';
import { wait } from './utils.js';

/**
 * Grab frames from the live video for a fixed duration.
 * Returns quickly after CAPTURE_MS — encoding happens separately.
 */
export async function captureFrames(video, canvas, ctx, onProgress, shouldAbort, dimensions = {}) {
  const { CAPTURE_MS, FPS, VIDEO_WIDTH, VIDEO_HEIGHT } = CONFIG;
  const width = dimensions.width || VIDEO_WIDTH;
  const height = dimensions.height || VIDEO_HEIGHT;
  const frameDelay = 1000 / FPS;
  const totalFrames = Math.ceil(CAPTURE_MS / frameDelay);
  const frames = [];

  canvas.width = width;
  canvas.height = height;

  for (let i = 0; i < totalFrames; i++) {
    if (shouldAbort?.()) {
      throw new Error('Session cancelled');
    }

    if (video.readyState < 2) {
      await wait(50);
      i--;
      continue;
    }

    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    onProgress?.(i + 1, totalFrames);

    if (i < totalFrames - 1) {
      await wait(frameDelay);
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return frames;
}

/**
 * Encode captured frames into a GIF blob URL.
 * Pass { width, height } to override the output canvas size (e.g. for the
 * bordered/framed export, which is larger than the raw video frame).
 */
export function encodeGif(frames, dimensions = {}) {
  const { GIF_QUALITY, GIF_WORKERS, WORKER_SCRIPT, FPS, VIDEO_WIDTH, VIDEO_HEIGHT, ENCODE_TIMEOUT_MS } = CONFIG;
  const width = dimensions.width || VIDEO_WIDTH;
  const height = dimensions.height || VIDEO_HEIGHT;

  return new Promise((resolve, reject) => {
    if (typeof GIF === 'undefined') {
      reject(new Error('GIF library failed to load. Check your internet connection and reload.'));
      return;
    }

    const gif = new GIF({
      workers: GIF_WORKERS,
      quality: GIF_QUALITY,
      width,
      height,
      workerScript: WORKER_SCRIPT,
    });

    const frameDelay = 1000 / FPS;
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };

    const timer = setTimeout(() => {
      try { gif.abort(); } catch (_) { /* ignore */ }
      finish(reject, new Error('GIF encoding timed out'));
    }, ENCODE_TIMEOUT_MS);

    gif.on('finished', (blob) => {
      finish(resolve, URL.createObjectURL(blob));
    });

    gif.on('abort', () => {
      finish(reject, new Error('GIF encoding was aborted'));
    });

    for (const frame of frames) {
      gif.addFrame(frame, { copy: true, delay: frameDelay });
    }

    gif.render();
  });
}

/**
 * Re-draw each captured frame onto a paper-strip "print" card — background,
 * inset photo, and a "TAKE 0X / GIFBOOTH.GIF" caption — the same look as the
 * on-screen tray print, but baked into the pixels so it survives export.
 * Returns { frames, width, height } ready to hand to encodeGif().
 */
export function buildBorderedFrames(frames, videoWidth, videoHeight, takeNumber, options = {}) {
  const { PAD_SIDE, PAD_TOP, PAD_BOTTOM, CAPTION_FONT } = CONFIG.BORDER;
  const paperColor = options.paperColor || CONFIG.BORDER.PAPER_COLOR;
  const captionColor = options.captionColor || CONFIG.BORDER.CAPTION_COLOR;
  const labelText = (options.labelText || CONFIG.BORDER.LABEL_TEXT || '').toUpperCase();
  const width = videoWidth + PAD_SIDE * 2;
  const height = videoHeight + PAD_TOP + PAD_BOTTOM;

  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  const octx = off.getContext('2d');

  const takeLabel = `TAKE ${String(takeNumber).padStart(2, '0')}`;
  const capY = videoHeight + PAD_TOP + PAD_BOTTOM / 2;

  const bordered = frames.map((frame) => {
    octx.fillStyle = paperColor;
    octx.fillRect(0, 0, width, height);

    octx.putImageData(frame, PAD_SIDE, PAD_TOP);

    octx.fillStyle = captionColor;
    octx.font = CAPTION_FONT;
    octx.textBaseline = 'middle';
    octx.textAlign = 'left';
    octx.fillText(takeLabel, PAD_SIDE, capY);
    if (labelText) {
      octx.textAlign = 'right';
      octx.fillText(labelText, width - PAD_SIDE, capY);
    }

    return octx.getImageData(0, 0, width, height);
  });

  return { frames: bordered, width, height };
}

/**
 * Combine the bordered "print" frames from every take into one tall strip —
 * take 1 on top, take 2 in the middle, take 3 on the bottom — animating all
 * three in sync as a single GIF.
 * `takesFrames` is an array (one entry per take) of bordered ImageData arrays,
 * all assumed to share the same width/height (they come from buildBorderedFrames).
 */
export function buildStackedFrames(takesFrames, width, height) {
  const frameCount = Math.min(...takesFrames.map((f) => f.length));
  const stackedHeight = height * takesFrames.length;

  const off = document.createElement('canvas');
  off.width = width;
  off.height = stackedHeight;
  const octx = off.getContext('2d');

  const stacked = [];
  for (let i = 0; i < frameCount; i++) {
    takesFrames.forEach((frames, takeIdx) => {
      octx.putImageData(frames[i], 0, takeIdx * height);
    });
    stacked.push(octx.getImageData(0, 0, width, stackedHeight));
  }

  return { frames: stacked, width, height: stackedHeight };
}

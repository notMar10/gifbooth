export const CONFIG = {
  MAX_SHOTS: 3,
  CAPTURE_MS: 3000,
  FPS: 10,
  GAP_BETWEEN_TAKES_MS: 800,
  COUNTDOWN_STEP_MS: 720,
  GIF_QUALITY: 8,
  GIF_WORKERS: 2,
  ENCODE_TIMEOUT_MS: 90000,
  VIDEO_WIDTH: 640,
  VIDEO_HEIGHT: 480,
  get WORKER_SCRIPT() {
    return new URL('gif.worker.js', window.location.href).href;
  },
  BORDER: {
    PAD_SIDE: 28,
    PAD_TOP: 28,
    PAD_BOTTOM: 72,
    PAPER_COLOR: '#f2e9d8',
    CAPTION_COLOR: 'rgba(26,23,16,0.55)',
    CAPTION_FONT: '600 22px "Courier New", monospace',
    LABEL_TEXT: 'GIFBOOTH.GIF',
  },
};

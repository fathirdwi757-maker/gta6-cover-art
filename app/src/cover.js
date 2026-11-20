// Neon Horizon Cover Studio — the cover renderer.
// Draws a GTA-style multi-panel cover onto a 2D canvas: photo panels with a per-pixel colour
// grade (gradient map), bold Anton title lettering with a Pacifico script subtitle, heat stars,
// film grain, a vignette and a poster frame. Pure canvas, no network, no library.

/** Colour grades as gradient-map stops: [luminance 0..1, [r, g, b]]. */
export const GRADES = {
  sunset: [[0, [26, 8, 48]], [0.28, [94, 22, 92]], [0.52, [198, 44, 110]], [0.76, [255, 122, 61]], [1, [255, 226, 159]]],
  neon: [[0, [4, 18, 38]], [0.3, [10, 74, 110]], [0.55, [24, 178, 196]], [0.8, [232, 84, 178]], [1, [255, 240, 250]]],
  vice: [[0, [32, 24, 74]], [0.35, [116, 84, 178]], [0.6, [244, 144, 194]], [0.82, [126, 224, 238]], [1, [255, 252, 240]]],
  golden: [[0, [30, 16, 8]], [0.32, [112, 62, 22]], [0.58, [206, 128, 52]], [0.82, [248, 196, 110]], [1, [255, 244, 214]]],
  ink: [[0, [8, 8, 12]], [0.3, [62, 60, 70]], [0.55, [138, 134, 140]], [0.8, [208, 204, 200]], [1, [252, 250, 246]]],
  // Chrome Noir: a desaturated steel grade — blacks crushed toward blue-black, midtones mapped
  // to cool grey-blue, highlights kept icy rather than warm, so a photo reads as monochrome
  // metal instead of the warm film look of the other grades.
  chrome: [[0, [2, 3, 7]], [0.3, [36, 43, 56]], [0.55, [102, 115, 134]], [0.8, [186, 199, 214]], [1, [238, 245, 252]]],
};

const lutCache = new Map();

/** Builds (and caches) a 256-entry RGB lookup table for a grade. */
export function gradientMapLUT(gradeName) {
  if (lutCache.has(gradeName)) return lutCache.get(gradeName);
  const stops = GRADES[gradeName] ?? GRADES.sunset;
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const span = (b[0] - a[0]) || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = Math.round(a[1][c] + (b[1][c] - a[1][c]) * f);
  }
  lutCache.set(gradeName, lut);
  return lut;
}

/** Panel rectangles for a layout at a given canvas size. */
export function panelRects(layout, w, h) {
  const gap = Math.max(6, Math.round(w * 0.009));
  const cell = (x, y, cw, ch) => ({ x: x + gap / 2, y: y + gap / 2, w: cw - gap, h: ch - gap });
  if (layout === 'quad') {
    const rects = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) rects.push(cell((w / 2) * c, (h / 2) * r, w / 2, h / 2));
    return rects;
  }
  if (layout === 'nine') {
    const rects = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) rects.push(cell((w / 3) * c, (h / 3) * r, w / 3, h / 3));
    return rects;
  }
  if (layout === 'poster') {
    if (w > h * 1.05) {
      const heroW = w * 0.62;
      return [
        cell(0, 0, heroW, h),
        cell(heroW, 0, w - heroW, h / 3),
        cell(heroW, h / 3, w - heroW, h / 3),
        cell(heroW, (2 * h) / 3, w - heroW, h / 3),
      ];
    }
    const heroH = h * 0.58;
    return [
      cell(0, 0, w, heroH),
      cell(0, heroH, w / 3, h - heroH),
      cell(w / 3, heroH, w / 3, h - heroH),
      cell((2 * w) / 3, heroH, w / 3, h - heroH),
    ];
  }
  return [{ x: 0, y: 0, w, h }]; // solo
}

/** Number of photo panels a layout has. */
export function panelCount(layout) {
  return { quad: 4, nine: 9, poster: 4, solo: 1 }[layout] ?? 4;
}

const scratch = document.createElement('canvas');

/** Draws one graded photo into a panel rect, honouring zoom and pan offsets in [-1, 1] and the panel's flip flag. */
function drawPanel(ctx, rect, img, panel, lut) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!img) {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, '#3b1154');
    g.addColorStop(1, '#160a24');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `700 ${Math.round(rect.h * 0.07)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.restore();
    return;
  }
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(rect.w / iw, rect.h / ih) * (panel.zoom || 1);
  const dw = Math.round(iw * scale);
  const dh = Math.round(ih * scale);
  const dx = Math.round(rect.x + (rect.w - dw) / 2 + ((panel.ox || 0) * (dw - rect.w)) / 2);
  const dy = Math.round(rect.y + (rect.h - dh) / 2 + ((panel.oy || 0) * (dh - rect.h)) / 2);
  // Grade on a scratch canvas at panel size, then blit — keeps big exports fast enough.
  scratch.width = Math.max(2, Math.round(rect.w));
  scratch.height = Math.max(2, Math.round(rect.h));
  const sctx = scratch.getContext('2d', { willReadFrequently: true });
  if (panel.flip) {
    // Mirror the photo horizontally inside the panel: reflect the scratch canvas around its
    // vertical centre line, then draw at the same position — the drawn span lands mirrored.
    sctx.save();
    sctx.translate(scratch.width, 0);
    sctx.scale(-1, 1);
    sctx.drawImage(img, dx - rect.x, dy - rect.y, dw, dh);
    sctx.restore();
  } else {
    sctx.drawImage(img, dx - rect.x, dy - rect.y, dw, dh);
  }
  const data = sctx.getImageData(0, 0, scratch.width, scratch.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const lum = (px[i] * 77 + px[i + 1] * 150 + px[i + 2] * 29) >> 8;
    const o = lum * 3;
    px[i] = lut[o];
    px[i + 1] = lut[o + 1];
    px[i + 2] = lut[o + 2];
  }
  sctx.putImageData(data, 0, 0);
  ctx.drawImage(scratch, rect.x, rect.y);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
}

let noisePattern = null;
/** A tileable film-grain pattern, generated once. */
function grainPattern(ctx) {
  if (noisePattern) return noisePattern;
  const n = document.createElement('canvas');
  n.width = 256;
  n.height = 256;
  const nctx = n.getContext('2d');
  const img = nctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 96 + Math.floor(Math.random() * 96);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  noisePattern = ctx.createPattern(n, 'repeat');
  return noisePattern;
}

const TITLE_FILLS = {
  white: ['#ffffff', '#ffffff'],
  sunsetfill: ['#ffe259', '#ff7518', '#ff2975'],
  neonfill: ['#2ee6c8', '#4dc9ff', '#ff4d8d'],
  goldfill: ['#fff3b0', '#ffb340', '#c47b12'],
};

function titleGradient(ctx, fillName, x, y, height) {
  const stops = TITLE_FILLS[fillName] ?? TITLE_FILLS.white;
  const g = ctx.createLinearGradient(0, y, 0, y + height);
  stops.forEach((colour, i) => g.addColorStop(i / (stops.length - 1 || 1), colour));
  return g;
}

/** Fits and draws the Anton title, centred at cx, with its baseline at baseY. Returns its size. */
function drawTitle(ctx, text, cx, baseY, maxWidth, baseSize, fillName) {
  if (!text) return 0;
  let size = baseSize;
  ctx.font = `${size}px Anton, 'Arial Narrow Bold', sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 14) {
    size -= 3;
    ctx.font = `${size}px Anton, 'Arial Narrow Bold', sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(18,3,28,0.92)';
  ctx.lineWidth = size * 0.16;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.05;
  ctx.strokeText(text, cx, baseY);
  ctx.fillStyle = titleGradient(ctx, fillName, 0, baseY - size, size);
  ctx.fillText(text, cx, baseY);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  return size;
}

/** Draws the Pacifico script subtitle, centred at cx with baseline at baseY. */
function drawSubtitle(ctx, text, cx, baseY, size) {
  if (!text) return;
  ctx.font = `${size}px Pacifico, cursive`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(18,3,28,0.85)';
  ctx.lineWidth = size * 0.18;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = size * 0.16;
  ctx.strokeText(text, cx, baseY);
  ctx.fillStyle = '#ffd166';
  ctx.fillText(text, cx, baseY);
  ctx.shadowBlur = 0;
}

/** Five gold heat stars with a HEAT caption, top-right. */
function drawBadge(ctx, w, h) {
  const s = Math.min(w, h) * 0.035;
  const cx0 = w - s * 6.4;
  const cy = s * 1.5;
  ctx.save();
  for (let i = 0; i < 5; i++) drawStar(ctx, cx0 + i * s * 1.25, cy, s * 0.52);
  ctx.font = `700 ${Math.round(s * 0.52)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.fillText('H E A T', cx0 + s * 2.5, cy + s * 1.25);
  ctx.restore();
}

function drawStar(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffb340';
  ctx.strokeStyle = 'rgba(18,3,28,0.9)';
  ctx.lineWidth = r * 0.16;
  ctx.fill();
  ctx.stroke();
}

/**
 * Renders the whole cover. `state` carries layout/grade/caption/effects and per-panel
 * {photo, zoom, ox, oy, flip}; `photos` is the array of loaded images those indexes point into.
 */
export function drawCover(ctx, w, h, state, photos) {
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);
  const lut = gradientMapLUT(state.grade);
  const rects = panelRects(state.layout, w, h);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] ?? { photo: i % Math.max(1, photos.length), zoom: 1, ox: 0, oy: 0 };
    const img = photos[panel.photo] ?? null;
    drawPanel(ctx, rect, img, panel, lut);
  });

  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  if (state.layout === 'nine') {
    const cellRect = rects[4];
    ctx.fillStyle = 'rgba(12,2,22,0.66)';
    ctx.fillRect(cellRect.x, cellRect.y, cellRect.w, cellRect.h);
    const size = drawTitle(ctx, title, cellRect.x + cellRect.w / 2, cellRect.y + cellRect.h * 0.62, cellRect.w * 0.92, cellRect.h * 0.34 * state.titleSize, state.titleFill);
    drawSubtitle(ctx, subtitle, cellRect.x + cellRect.w / 2, cellRect.y + cellRect.h * 0.62 - size * 1.15, cellRect.h * 0.13);
  } else {
    const scrim = ctx.createLinearGradient(0, h * 0.55, 0, h);
    scrim.addColorStop(0, 'rgba(10,2,18,0)');
    scrim.addColorStop(1, 'rgba(10,2,18,0.8)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);
    const size = drawTitle(ctx, title, w / 2, h * 0.945, w * 0.92, h * 0.115 * state.titleSize, state.titleFill);
    drawSubtitle(ctx, subtitle, w / 2, h * 0.945 - size * 1.28, h * 0.045);
  }

  if (state.badge) drawBadge(ctx, w, h);
  if (state.vignette) {
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
    v.addColorStop(0, 'rgba(8,0,16,0)');
    v.addColorStop(1, 'rgba(8,0,16,0.45)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grainPattern(ctx);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (state.frame) {
    const inset = Math.max(8, w * 0.018);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(3, w * 0.006);
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(inset + ctx.lineWidth + 3, inset + ctx.lineWidth + 3, w - (inset + ctx.lineWidth + 3) * 2, h - (inset + ctx.lineWidth + 3) * 2);
  }
}

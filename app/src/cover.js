// The cover renderer of Neon Horizon Cover Studio.
//
// A cover is a set of rectangular panels over a warm off-white frame, in the
// multi-panel poster arrangement the genre is known for. Each panel holds
// one photo, colour-graded as a whole before it is cropped, so the grade is
// identical wherever the photo is positioned. Over the panels sit a soft
// vignette, shade bands behind the words, and the lettering: a condensed
// title, a neon script subtitle and a small edition line.
import { bakeGradedImage } from './grades.js';

/**
 * The four layouts, as fractions of the cover's width and height.
 * strip: one wide hero panel over three smaller ones. poster: a single
 * full-bleed panel. duo: two tall halves. quad: a two-by-two grid.
 */
export const LAYOUTS = {
  strip: {
    label: 'Classic Strip',
    rects: [
      { x: 0, y: 0, w: 1, h: 0.54 },
      { x: 0, y: 0.54, w: 1 / 3, h: 0.46 },
      { x: 1 / 3, y: 0.54, w: 1 / 3, h: 0.46 },
      { x: 2 / 3, y: 0.54, w: 1 / 3, h: 0.46 },
    ],
  },
  poster: {
    label: 'Poster',
    rects: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
  duo: {
    label: 'Duo',
    rects: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
  },
  quad: {
    label: 'Quad',
    rects: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
};

/** How many panels a layout gives the user to fill. */
export function panelCount(layoutName) {
  return (LAYOUTS[layoutName] ?? LAYOUTS.strip).rects.length;
}

/** The width of the frame showing between panels, for a cover of this pixel width. */
function gutterFor(width) {
  return Math.max(6, Math.round(width * 0.009));
}

/** A layout's panel rectangles in pixels, each inset by half a gutter on every side. */
export function panelRects(layoutName, width, height) {
  const half = gutterFor(width) / 2;
  return (LAYOUTS[layoutName] ?? LAYOUTS.strip).rects.map((rect) => ({
    x: rect.x * width + half,
    y: rect.y * height + half,
    w: rect.w * width - half * 2,
    h: rect.h * height - half * 2,
  }));
}

/** Which panel of a layout sits under a point of the cover, or -1 for the frame. */
export function panelAtPoint(layoutName, width, height, px, py) {
  const rects = panelRects(layoutName, width, height);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

// Graded copies of photos, one per (photo, grade), kept so dragging a panel
// or moving a slider never re-grades a pixel the user is not changing.
const gradedCopies = new WeakMap();

/** The graded canvas for a photo under a grade, baked once and then reused. */
function gradedCopyOf(image, gradeName) {
  let byGrade = gradedCopies.get(image);
  if (!byGrade) {
    byGrade = new Map();
    gradedCopies.set(image, byGrade);
  }
  if (!byGrade.has(gradeName)) byGrade.set(gradeName, bakeGradedImage(image, gradeName));
  return byGrade.get(gradeName);
}

/** Paints one panel: its photo cover-fitted, zoomed, panned and maybe flipped, or a placeholder. */
function paintPanel(ctx, rect, panel, gradeName) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!panel || !panel.image) {
    const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    wash.addColorStop(0, '#33203f');
    wash.addColorStop(1, '#191021');
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255, 214, 170, 0.5)';
    ctx.font = `${Math.round(rect.h * 0.075)}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('YOUR PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.restore();
    return;
  }
  const graded = gradedCopyOf(panel.image, gradeName);
  const iw = graded.width;
  const ih = graded.height;
  const baseScale = Math.max(rect.w / iw, rect.h / ih);
  const scale = baseScale * (panel.zoom || 1);
  const drawnW = iw * scale;
  const drawnH = ih * scale;
  const slackX = drawnW - rect.w;
  const slackY = drawnH - rect.h;
  const originX = rect.x - slackX / 2 + (panel.panX || 0) * slackX;
  const originY = rect.y - slackY / 2 + (panel.panY || 0) * slackY;
  if (panel.flipped) {
    ctx.translate(originX + drawnW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(graded, 0, originY, drawnW, drawnH);
  } else {
    ctx.drawImage(graded, originX, originY, drawnW, drawnH);
  }
  ctx.restore();
}

/** The soft darkening at the cover's edges that makes the middle glow. */
function paintVignette(ctx, width, height) {
  const radius = Math.hypot(width, height) / 2;
  const glow = ctx.createRadialGradient(width / 2, height / 2, radius * 0.45, width / 2, height / 2, radius);
  glow.addColorStop(0, 'rgba(10, 2, 16, 0)');
  glow.addColorStop(1, 'rgba(10, 2, 16, 0.3)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

/** Shade bands behind the title and the edition line, so words sit on any photo. */
function paintShadeBands(ctx, width, height) {
  const top = ctx.createLinearGradient(0, 0, 0, height * 0.36);
  top.addColorStop(0, 'rgba(12, 4, 18, 0.52)');
  top.addColorStop(1, 'rgba(12, 4, 18, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, width, height * 0.36);
  const bottom = ctx.createLinearGradient(0, height * 0.7, 0, height);
  bottom.addColorStop(0, 'rgba(12, 4, 18, 0)');
  bottom.addColorStop(1, 'rgba(12, 4, 18, 0.5)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, height * 0.7, width, height * 0.3);
}

/** The lettering: condensed title, neon script subtitle, edition line. */
function paintLettering(ctx, width, height, title, subtitle, author) {
  const headline = (title || '').trim().toUpperCase();
  if (headline) {
    let size = height * 0.165;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const setTitleFont = () => { ctx.font = `${size}px Anton, sans-serif`; };
    setTitleFont();
    while (ctx.measureText(headline).width > width * 0.92 && size > 18) {
      size *= 0.95;
      setTitleFont();
    }
    const baseline = height * 0.19;
    const fill = ctx.createLinearGradient(0, baseline - size, 0, baseline);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(0.75, '#ffe9c4');
    fill.addColorStop(1, '#ffc98a');
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.14;
    ctx.shadowOffsetY = size * 0.035;
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.06;
    ctx.strokeStyle = '#170a13';
    ctx.strokeText(headline, width / 2, baseline);
    ctx.fillStyle = fill;
    ctx.fillText(headline, width / 2, baseline);
    ctx.restore();
  }
  const script = (subtitle || '').trim();
  if (script) {
    let size = height * 0.054;
    ctx.font = `${size}px Pacifico, cursive`;
    while (ctx.measureText(script).width > width * 0.58 && size > 10) {
      size *= 0.94;
      ctx.font = `${size}px Pacifico, cursive`;
    }
    const halfText = ctx.measureText(script).width / 2;
    const centreX = Math.min(width * 0.64, width - halfText - width * 0.03);
    ctx.save();
    ctx.translate(centreX, height * 0.262);
    ctx.rotate(-0.055);
    ctx.font = `${size}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = size * 0.5;
    ctx.fillStyle = '#ff77b3';
    ctx.fillText(script, 0, 0);
    ctx.fillText(script, 0, 0);
    ctx.restore();
  }
  const edition = (author || '').trim().toUpperCase();
  if (edition) {
    const size = height * 0.0215;
    ctx.save();
    ctx.font = `600 ${size}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.42)}px`; } catch { /* older engines */ }
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = size * 0.4;
    ctx.fillStyle = 'rgba(255, 246, 235, 0.96)';
    ctx.fillText(edition, width / 2, height * 0.963);
    ctx.restore();
  }
}

/** Outlines the panel the editor has selected; never drawn on an export. */
function paintSelection(ctx, rect) {
  ctx.save();
  ctx.strokeStyle = '#ffb02e';
  ctx.lineWidth = 5;
  ctx.strokeRect(rect.x + 2.5, rect.y + 2.5, rect.w - 5, rect.h - 5);
  ctx.fillStyle = '#ffb02e';
  const tabW = Math.min(150, rect.w * 0.4);
  ctx.fillRect(rect.x, rect.y, tabW, 30);
  ctx.fillStyle = '#1d1024';
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('EDITING', rect.x + 10, rect.y + 21);
  ctx.restore();
}

/**
 * Draws the whole cover described by `view` onto `canvas`:
 * view = { layout, grade, panels, title, subtitle, author, selected }.
 * `selected` is the panel index the editor outlines, or -1 on an export.
 */
export function drawCover(canvas, view) {
  const { width, height } = canvas;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4efe6';
  ctx.fillRect(0, 0, width, height);
  const rects = panelRects(view.layout, width, height);
  const count = panelCount(view.layout);
  for (let i = 0; i < count; i++) paintPanel(ctx, rects[i], view.panels[i], view.grade);
  paintVignette(ctx, width, height);
  paintShadeBands(ctx, width, height);
  paintLettering(ctx, width, height, view.title, view.subtitle, view.author);
  ctx.strokeStyle = 'rgba(12, 6, 14, 0.9)';
  ctx.lineWidth = Math.max(2, width * 0.0022);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth);
  if (view.selected >= 0 && view.selected < count) paintSelection(ctx, rects[view.selected]);
}

/** The download name for an exported cover of a given pixel size. */
export function coverFileName(width, height) {
  return `neon-horizon-cover-${width}x${height}.png`;
}

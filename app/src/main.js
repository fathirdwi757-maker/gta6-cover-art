// Neon Horizon Cover Studio — page wiring: photos, panels, caption, export, undo/redo.
// A `?shot=` query instead sets up a fixed scene for screenshots (./shots.js).
import { drawCover, panelRects, panelCount } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const $ = (id) => document.getElementById(id);

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// Vendored OFL fonts, loaded from the app's own files — no network.
for (const [family, file] of [['Anton', 'Anton-Regular.ttf'], ['Pacifico', 'Pacifico-Regular.ttf']]) {
  try {
    const face = new FontFace(family, `url("./fonts/${file}")`);
    document.fonts.add(await face.load());
  } catch { /* fall back to system fonts */ }
}

const SAMPLES = [
  ['woman', 'Woman & convertible'],
  ['man', 'Man on a rooftop'],
  ['friends', 'Friends in neon'],
  ['car', 'Car on the beach road'],
];

const photos = [];       // loaded images, samples first
const photoNames = [];   // parallel labels for the panel-photo select
const state = {
  layout: 'poster',
  grade: 'sunset',
  title: 'LEONIDA',
  subtitle: 'neon horizon',
  titleSize: 1,
  titleFill: 'sunsetfill',
  grain: true,
  vignette: true,
  frame: true,
  badge: true,
  panels: [],
};
let selectedPanel = 0;
const panelsByLayout = {};

function defaultPanels(layout) {
  const seeds = {
    poster: [0, 1, 2, 3],
    quad: [0, 1, 3, 2],
    nine: [0, 2, 1, 3, 3, 0, 2, 1, 0],
    solo: [0],
  }[layout] ?? [0];
  return seeds.map((photo) => ({ photo, zoom: 1, ox: 0, oy: 0, flip: false }));
}

function useLayout(layout) {
  state.layout = layout;
  if (!panelsByLayout[layout]) panelsByLayout[layout] = defaultPanels(layout);
  state.panels = panelsByLayout[layout];
  selectedPanel = 0;
  syncPanelControls();
}

function render() {
  drawCover(ctx, canvas.width, canvas.height, state, photos);
}

let rafPending = false;
function renderSoon() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => { rafPending = false; render(); });
}

// ---- undo / redo -----------------------------------------------------------
const undoStack = [];
const redoStack = [];
function snapshot() {
  return JSON.stringify({ ...state, panels: state.panels.map((p) => ({ ...p })), panelsByLayout });
}
function commit() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
}
function restore(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  for (const k of Object.keys(panelsByLayout)) delete panelsByLayout[k];
  Object.assign(panelsByLayout, s.panelsByLayout);
  state.panels = panelsByLayout[state.layout];
  syncAllControls();
  render();
}
$('undo').addEventListener('click', () => { if (undoStack.length) { redoStack.push(snapshot()); restore(undoStack.pop()); } });
$('redo').addEventListener('click', () => { if (redoStack.length) { undoStack.push(snapshot()); restore(redoStack.pop()); } });

// ---- controls ---------------------------------------------------------------
function syncPanelControls() {
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  photoNames.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = name;
    sel.appendChild(opt);
  });
  const panel = state.panels[selectedPanel];
  if (panel) {
    sel.value = panel.photo;
    $('panelZoom').value = panel.zoom;
    $('panelFlip').checked = Boolean(panel.flip);
  }
  document.querySelectorAll('#thumbs img').forEach((img, i) => img.classList.toggle('active', panel && i === panel.photo));
}

function syncAllControls() {
  $('layout').value = state.layout;
  $('grade').value = state.grade;
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('titleSize').value = state.titleSize;
  $('titleFill').value = state.titleFill;
  $('grain').checked = state.grain;
  $('vignette').checked = state.vignette;
  $('frame').checked = state.frame;
  $('badge').checked = state.badge;
  syncPanelControls();
}

function addThumb(img, name) {
  const el = document.createElement('img');
  el.src = img.src;
  el.alt = name;
  el.title = name;
  el.addEventListener('click', () => {
    commit();
    state.panels[selectedPanel].photo = photoNames.indexOf(name);
    syncPanelControls();
    render();
  });
  $('thumbs').appendChild(el);
}

async function addPhoto(url, name) {
  const img = await loadImage(url);
  photos.push(img);
  photoNames.push(name);
  addThumb(img, name);
  syncPanelControls();
  return img;
}

$('photos').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    await addPhoto(URL.createObjectURL(file), `Your photo ${photoNames.length - SAMPLES.length + 1}`);
  }
  commit();
  status.textContent = `${photos.length} photos loaded — click a panel, then a thumbnail, to place them.`;
  render();
});
$('panelPhoto').addEventListener('change', (e) => { commit(); state.panels[selectedPanel].photo = Number(e.target.value); syncPanelControls(); render(); });
$('panelZoom').addEventListener('input', (e) => { state.panels[selectedPanel].zoom = Number(e.target.value); renderSoon(); });
$('panelZoom').addEventListener('change', commit);
$('panelFlip').addEventListener('change', (e) => { commit(); state.panels[selectedPanel].flip = e.target.checked; render(); });
$('layout').addEventListener('change', (e) => { commit(); useLayout(e.target.value); render(); });
$('grade').addEventListener('change', (e) => { commit(); state.grade = e.target.value; render(); });
$('title').addEventListener('input', (e) => { state.title = e.target.value; renderSoon(); });
$('title').addEventListener('change', commit);
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; renderSoon(); });
$('subtitle').addEventListener('change', commit);
$('titleSize').addEventListener('input', (e) => { state.titleSize = Number(e.target.value); renderSoon(); });
$('titleSize').addEventListener('change', commit);
$('titleFill').addEventListener('change', (e) => { commit(); state.titleFill = e.target.value; render(); });
for (const id of ['grain', 'vignette', 'frame', 'badge']) {
  $(id).addEventListener('change', (e) => { commit(); state[id] = e.target.checked; render(); });
}
$('size').addEventListener('change', (e) => {
  const [w, h] = e.target.value.split('x').map(Number);
  canvas.width = w;
  canvas.height = h;
  render();
});

// ---- drag to position the selected panel's photo -----------------------------
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * canvas.width, y: ((e.clientY - r.top) / r.height) * canvas.height };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const idx = rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
  if (idx === -1) return;
  if (idx !== selectedPanel) { selectedPanel = idx; syncPanelControls(); render(); }
  drag = { x: p.x, y: p.y, rect: rects[idx] };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[selectedPanel];
  panel.ox = Math.min(1, Math.max(-1, panel.ox + ((p.x - drag.x) / drag.rect.w) * 2));
  panel.oy = Math.min(1, Math.max(-1, panel.oy + ((p.y - drag.y) / drag.rect.h) * 2));
  drag.x = p.x;
  drag.y = p.y;
  renderSoon();
});
canvas.addEventListener('pointerup', () => { if (drag) { drag = null; commit(); } });

// ---- export -------------------------------------------------------------------
function download(name) {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    status.textContent = `Saved ${name}`;
  }, 'image/png');
}
$('export').addEventListener('click', () => download(`neon-horizon-cover-${canvas.width}x${canvas.height}.png`));
$('exportAll').addEventListener('click', async () => {
  const keep = [canvas.width, canvas.height];
  for (const [w, h] of [[1080, 1080], [1080, 1350], [1920, 1080], [1080, 1920]]) {
    canvas.width = w;
    canvas.height = h;
    render();
    download(`neon-horizon-cover-${w}x${h}.png`);
    await new Promise((r) => setTimeout(r, 350));
  }
  canvas.width = keep[0];
  canvas.height = keep[1];
  render();
});

// ---- boot -----------------------------------------------------------------------
useLayout('poster');
for (const [file, name] of SAMPLES) await addPhoto(`samples/${file}.jpg`, name);
commit();
render();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) runShot(shot, new URLSearchParams(location.search), { state, useLayout, render, canvas, photos });

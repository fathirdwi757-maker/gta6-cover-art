// The studio floor of Neon Horizon Cover Studio.
//
// This module owns the editor's state — the layout, the grade, the export
// size, the words and the four panels — and wires every control on the page
// to it. The canvas is the cover itself at full export resolution, scaled
// down by CSS, so what the user drags is exactly what the PNG will hold.
// Photos are read from the user's own machine or from the bundled samples;
// nothing is uploaded anywhere.
import { LAYOUTS, panelCount, panelRects, panelAtPoint, drawCover, coverFileName } from './cover.js';
import { GRADES } from './grades.js';
import { runShot } from './shots.js';

/** The bundled photos a panel can start from, all files under app/samples/. */
const SAMPLES = [
  { id: 'hotrod', file: 'samples/hotrod.jpg', label: 'Hot Rod' },
  { id: 'garages', file: 'samples/garages.jpg', label: 'Garage Doors' },
  { id: 'neonstreet', file: 'samples/neonstreet.jpg', label: 'Neon Street' },
  { id: 'surfvan', file: 'samples/surfvan.jpg', label: 'Surf Van' },
];

/** The export sizes: the three post sizes, then the classic 4:3 ladder. */
const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide · 1920 × 1080' },
  classic: { w: 1200, h: 900, label: 'Classic · 1200 × 900' },
  classicHd: { w: 1600, h: 1200, label: 'Classic HD · 1600 × 1200' },
  classicPrint: { w: 2400, h: 1800, label: 'Classic Print · 2400 × 1800' },
};

const MAX_PANELS = 4;

/** One panel's placement of one photo: its zoom, pan and mirror choices. */
function freshPanel() {
  return { image: null, sourceLabel: 'Empty', zoom: 1, panX: 0, panY: 0, flipped: false };
}

const state = {
  layout: 'strip',
  grade: 'sunset',
  size: 'square',
  title: 'NEON HORIZON',
  subtitle: 'Vice Nights',
  author: 'STARRING YOU · PALMERA COUNTY',
  selected: 0,
  panels: [freshPanel(), freshPanel(), freshPanel(), freshPanel()],
};

let coverOnlyMode = false;

const canvas = document.getElementById('cover');
const statusLine = document.getElementById('status');
const sampleRow = document.getElementById('sample-row');
const layoutRow = document.getElementById('layout-row');
const gradeRow = document.getElementById('grade-row');
const panelTabs = document.getElementById('panel-tabs');
const zoomRange = document.getElementById('zoom');
const zoomValue = document.getElementById('zoom-value');
const sizeSelect = document.getElementById('size');
const uploadInput = document.getElementById('photo-file');

/** Tells the user, briefly, what just happened. */
function setStatus(message) {
  statusLine.textContent = message;
}

/** Loads an image from a same-app path or an object URL, resolving once it can be drawn. */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

const sampleImages = new Map();

/** A bundled sample's image element, loaded on first use and kept after. */
async function sampleImage(sampleId) {
  if (!sampleImages.has(sampleId)) {
    const sample = SAMPLES.find((entry) => entry.id === sampleId) ?? SAMPLES[0];
    sampleImages.set(sampleId, await loadImage(sample.file));
  }
  return sampleImages.get(sampleId);
}

/** Puts a photo into a panel and resets that panel's framing for the new picture. */
function placePhoto(panelIndex, image, sourceLabel) {
  const panel = state.panels[panelIndex];
  panel.image = image;
  panel.sourceLabel = sourceLabel;
  panel.zoom = 1;
  panel.panX = 0;
  panel.panY = 0;
  panel.flipped = false;
}

/** Paints the cover exactly as the state describes it. */
function render() {
  const size = SIZES[state.size];
  if (canvas.width !== size.w) canvas.width = size.w;
  if (canvas.height !== size.h) canvas.height = size.h;
  drawCover(canvas, {
    layout: state.layout,
    grade: state.grade,
    panels: state.panels,
    title: state.title,
    subtitle: state.subtitle,
    author: state.author,
    selected: coverOnlyMode ? -1 : state.selected,
  });
}

/** Marks the layout button of the current layout, and no other. */
function syncLayoutButtons() {
  for (const button of layoutRow.querySelectorAll('button')) {
    button.classList.toggle('active', button.dataset.layout === state.layout);
  }
}

/** Marks the grade button of the current grade, and no other. */
function syncGradeButtons() {
  for (const button of gradeRow.querySelectorAll('button')) {
    button.classList.toggle('active', button.dataset.grade === state.grade);
  }
}

/** Rebuilds the panel tabs for the current layout, each naming the photo it holds. */
function syncPanelTabs() {
  panelTabs.replaceChildren();
  const count = panelCount(state.layout);
  for (let i = 0; i < count; i++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'panel-tab' + (i === state.selected ? ' active' : '');
    button.textContent = `Panel ${i + 1} — ${state.panels[i].sourceLabel}`;
    button.addEventListener('click', () => selectPanel(i));
    panelTabs.appendChild(button);
  }
  syncPanelControls();
}

/** Points the zoom slider and flip button at the selected panel. */
function syncPanelControls() {
  const panel = state.panels[state.selected];
  zoomRange.value = String(panel.zoom);
  zoomValue.textContent = `${Math.round(panel.zoom * 100)}%`;
  document.getElementById('flip').classList.toggle('active', panel.flipped);
  document.getElementById('panel-heading').textContent = `Panel ${state.selected + 1} of ${panelCount(state.layout)}`;
}

/** Selects a panel for editing and shows the selection on the cover. */
function selectPanel(index) {
  state.selected = Math.max(0, Math.min(index, panelCount(state.layout) - 1));
  syncPanelTabs();
  render();
}

/** Gives the selected panel one of the bundled samples. */
async function assignSampleToSelected(sampleId) {
  const sample = SAMPLES.find((entry) => entry.id === sampleId);
  const image = await sampleImage(sampleId);
  placePhoto(state.selected, image, sample ? sample.label : 'Sample');
  syncPanelTabs();
  render();
  setStatus(`${sample ? sample.label : 'Sample'} is in panel ${state.selected + 1}. Drag it on the cover to reposition.`);
}

/** Gives panels, in order, the bundled samples named; used by the opening scene and by shots. */
async function fillPanelsFromSamples(sampleIds) {
  const count = Math.min(sampleIds.length, panelCount(state.layout));
  for (let i = 0; i < count; i++) {
    const sample = SAMPLES.find((entry) => entry.id === sampleIds[i]);
    if (!sample) continue;
    placePhoto(i, await sampleImage(sample.id), sample.label);
  }
  syncPanelTabs();
  render();
}

/** Reads user files into the selected panel first, then into the panels after it. */
async function takeUserFiles(files, firstPanel) {
  const images = [...files].filter((file) => file.type.startsWith('image/'));
  if (images.length === 0) return;
  const count = panelCount(state.layout);
  for (let n = 0; n < images.length; n++) {
    const target = Math.min(firstPanel + n, count - 1);
    const url = URL.createObjectURL(images[n]);
    try {
      placePhoto(target, await loadImage(url), `Upload · ${images[n].name}`);
    } catch {
      setStatus(`That file would not load as a photo: ${images[n].name}`);
    }
  }
  selectPanel(Math.min(firstPanel, count - 1));
  setStatus('Your photo stays on this machine — it was never uploaded.');
}

/** Builds the sample thumbnails row. */
function buildSampleRow() {
  for (const sample of SAMPLES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sample';
    const img = document.createElement('img');
    img.src = sample.file;
    img.alt = sample.label;
    const caption = document.createElement('span');
    caption.textContent = sample.label;
    button.append(img, caption);
    button.addEventListener('click', () => assignSampleToSelected(sample.id));
    sampleRow.appendChild(button);
  }
}

/** Builds the layout and grade pickers from the renderer's own lists. */
function buildPickers() {
  for (const [name, layout] of Object.entries(LAYOUTS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.layout = name;
    button.textContent = layout.label;
    button.addEventListener('click', () => {
      state.layout = name;
      state.selected = Math.min(state.selected, panelCount(name) - 1);
      syncLayoutButtons();
      syncPanelTabs();
      render();
    });
    layoutRow.appendChild(button);
  }
  for (const [name, grade] of Object.entries(GRADES)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.grade = name;
    button.textContent = grade.label;
    button.addEventListener('click', () => {
      state.grade = name;
      syncGradeButtons();
      render();
    });
    gradeRow.appendChild(button);
  }
  for (const [name, size] of Object.entries(SIZES)) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = size.label;
    sizeSelect.appendChild(option);
  }
  sizeSelect.value = state.size;
}

/** Wires the words, the panel controls and the export button. */
function wireControls() {
  const bindWord = (id, key) => {
    const input = document.getElementById(id);
    input.value = state[key];
    input.addEventListener('input', () => {
      state[key] = input.value;
      render();
    });
  };
  bindWord('title', 'title');
  bindWord('subtitle', 'subtitle');
  bindWord('author', 'author');

  uploadInput.addEventListener('change', async () => {
    await takeUserFiles(uploadInput.files, state.selected);
    uploadInput.value = '';
  });

  zoomRange.addEventListener('input', () => {
    const panel = state.panels[state.selected];
    panel.zoom = Number(zoomRange.value);
    zoomValue.textContent = `${Math.round(panel.zoom * 100)}%`;
    render();
  });

  document.getElementById('flip').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    panel.flipped = !panel.flipped;
    syncPanelControls();
    render();
  });

  document.getElementById('spread').addEventListener('click', () => {
    const source = state.panels[state.selected];
    if (!source.image) {
      setStatus('The selected panel is empty — give it a photo first, then spread it.');
      return;
    }
    for (let i = 0; i < panelCount(state.layout); i++) {
      if (i === state.selected) continue;
      state.panels[i].image = source.image;
      state.panels[i].sourceLabel = source.sourceLabel;
    }
    syncPanelTabs();
    render();
    setStatus('One photo now fills every panel. Select a panel to frame it differently.');
  });

  document.getElementById('clear-photo').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    panel.image = null;
    panel.sourceLabel = 'Empty';
    syncPanelTabs();
    render();
  });

  sizeSelect.addEventListener('change', () => {
    state.size = sizeSelect.value;
    render();
  });

  document.getElementById('export').addEventListener('click', exportCover);

  document.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
    if (event.key === 'ArrowRight') selectPanel(state.selected + 1);
    if (event.key === 'ArrowLeft') selectPanel(state.selected - 1);
    if (event.key === 'Delete' || event.key === 'Backspace') document.getElementById('clear-photo').click();
  });
}

/** Renders the cover at full size on a scratch canvas and downloads it as a PNG. */
function exportCover() {
  const size = SIZES[state.size];
  const scratch = document.createElement('canvas');
  scratch.width = size.w;
  scratch.height = size.h;
  drawCover(scratch, {
    layout: state.layout,
    grade: state.grade,
    panels: state.panels,
    title: state.title,
    subtitle: state.subtitle,
    author: state.author,
    selected: -1,
  });
  scratch.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = coverFileName(size.w, size.h);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    setStatus(`Saved ${link.download} — post it anywhere.`);
  }, 'image/png');
}

/** Pointer work on the cover: click selects a panel, drag reframes its photo, the wheel zooms. */
function wireCanvasGestures() {
  let drag = null;
  const toCoverPoint = (event) => {
    const box = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - box.left) * (canvas.width / box.width),
      y: (event.clientY - box.top) * (canvas.height / box.height),
    };
  };
  canvas.addEventListener('pointerdown', (event) => {
    const point = toCoverPoint(event);
    const index = panelAtPoint(state.layout, canvas.width, canvas.height, point.x, point.y);
    if (index === -1) return;
    if (index !== state.selected) selectPanel(index);
    const panel = state.panels[index];
    if (!panel.image) return;
    drag = { panel, startX: point.x, startY: point.y, panX: panel.panX, panY: panel.panY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const point = toCoverPoint(event);
    const rect = panelRects(state.layout, canvas.width, canvas.height)[state.selected];
    drag.panel.panX = Math.max(-1, Math.min(1, drag.panX + (point.x - drag.startX) / rect.w));
    drag.panel.panY = Math.max(-1, Math.min(1, drag.panY + (point.y - drag.startY) / rect.h));
    render();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = state.panels[state.selected];
    if (!panel.image) return;
    const factor = event.deltaY < 0 ? 1.07 : 0.93;
    panel.zoom = Math.max(1, Math.min(3, panel.zoom * factor));
    syncPanelControls();
    render();
  }, { passive: false });

  const stage = document.getElementById('stage');
  stage.addEventListener('dragover', (event) => {
    event.preventDefault();
    stage.classList.add('drag-over');
  });
  stage.addEventListener('dragleave', () => stage.classList.remove('drag-over'));
  stage.addEventListener('drop', (event) => {
    event.preventDefault();
    stage.classList.remove('drag-over');
    takeUserFiles(event.dataTransfer.files, state.selected);
  });
}

/** The handle the screenshot scenes drive the studio through. */
const studio = {
  showCoverOnly() {
    document.body.classList.add('shot-cover');
    coverOnlyMode = true;
  },
  chooseLayout(name) {
    if (!LAYOUTS[name]) return;
    state.layout = name;
    state.selected = Math.min(state.selected, panelCount(name) - 1);
    syncLayoutButtons();
    syncPanelTabs();
  },
  chooseGrade(name) {
    if (!GRADES[name]) return;
    state.grade = name;
    syncGradeButtons();
  },
  chooseSize(name) {
    if (!SIZES[name]) return;
    state.size = name;
    sizeSelect.value = name;
  },
  setWords(words) {
    state.title = words.title;
    state.subtitle = words.subtitle;
    state.author = words.author;
    document.getElementById('title').value = words.title;
    document.getElementById('subtitle').value = words.subtitle;
    document.getElementById('author').value = words.author;
  },
  fillPanelsFromSamples,
  selectPanel,
  async settle() {
    await fontsReady;
    render();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  },
};

const fontsReady = Promise.all([
  document.fonts.load('80px Anton'),
  document.fonts.load('40px Pacifico'),
]).catch(() => undefined);

buildSampleRow();
buildPickers();
wireControls();
wireCanvasGestures();
syncLayoutButtons();
syncGradeButtons();
syncPanelTabs();

await fillPanelsFromSamples(['hotrod', 'garages', 'neonstreet', 'surfvan']);
await fontsReady;
render();

const shotParams = new URLSearchParams(location.search);
if (shotParams.get('shot')) runShot(shotParams.get('shot'), shotParams, studio);

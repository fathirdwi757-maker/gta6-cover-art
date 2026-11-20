// Fixed scenes for screenshots: ?shot=cover shows one exported cover alone at ?w x ?h;
// ?shot=editor shows the studio with a cover loaded. Scene params: layout, grade, title,
// subtitle, fill, photos (comma-separated sample indexes in panel order) and flip
// (comma-separated panel indexes whose photo is mirrored horizontally).
// window.__shotReady is set once the scene has painted.
import { GRADES } from './cover.js';

/** Every grade the built-in demo shots may name — the renderer's own table, so a grade added
 *  to cover.js (such as Chrome Noir) is available to demo scenes as soon as it ships. */
export const DEMO_GRADES = Object.keys(GRADES);

export function runShot(shot, query, api) {
  const { state, useLayout, render, canvas } = api;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');

  if (query.get('layout')) useLayout(query.get('layout'));
  const grade = query.get('grade');
  if (grade && DEMO_GRADES.includes(grade)) state.grade = grade;
  if (query.get('title')) state.title = query.get('title');
  if (query.get('subtitle')) state.subtitle = query.get('subtitle');
  if (query.get('fill')) state.titleFill = query.get('fill');
  if (query.get('photos')) {
    query.get('photos').split(',').forEach((idx, i) => {
      if (state.panels[i]) state.panels[i].photo = Number(idx);
    });
  }
  if (query.get('flip')) {
    query.get('flip').split(',').forEach((idx) => {
      const panel = state.panels[Number(idx)];
      if (panel) panel.flip = true;
    });
  }
  if (query.get('w') && query.get('h')) {
    canvas.width = Number(query.get('w'));
    canvas.height = Number(query.get('h'));
  }
  render();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

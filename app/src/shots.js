// Fixed scenes for the entry's screenshots.
//
// A `?shot=` address turns the studio into one named scene: `cover` shows a
// finished cover on its own, `editor` shows the studio at work with a panel
// selected. Query parameters pick the scene's layout, grade, size, words and
// photos, so the maker's capture tool needs no clicks: it opens the address,
// waits for window.__shotReady, and takes the picture. Nothing here runs in
// a normal visit.

/** Reads one scene parameter, falling back when the address does not set it. */
function param(params, name, fallback) {
  const value = params.get(name);
  return value === null || value === '' ? fallback : value;
}

/**
 * Builds the scene the address describes through the studio's own controls,
 * then flags the page ready once the cover has been painted twice (once for
 * the images, once for the lettering's fonts).
 */
export async function runShot(shotName, params, studio) {
  if (shotName === 'cover') studio.showCoverOnly();
  studio.chooseLayout(param(params, 'layout', 'strip'));
  studio.chooseGrade(param(params, 'grade', 'sunset'));
  studio.chooseSize(param(params, 'size', 'wide'));
  studio.setWords({
    title: param(params, 'title', 'NEON HORIZON'),
    subtitle: param(params, 'subtitle', 'Vice Nights'),
    author: param(params, 'author', 'STARRING YOU · PALMERA COUNTY'),
  });
  const sampleList = param(params, 'samples', 'hotrod,garages,neonstreet,surfvan')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  await studio.fillPanelsFromSamples(sampleList);
  const selected = Number.parseInt(param(params, 'select', '-1'), 10);
  if (Number.isInteger(selected) && selected >= 0) studio.selectPanel(selected);
  await studio.settle();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

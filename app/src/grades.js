// The six colour grades of Neon Horizon Cover Studio.
//
// Every grade is a per-pixel transform over an ImageData buffer: the cover
// renderer paints a photo into a scratch canvas, hands the pixels to the
// grade the user picked, and only then composites the panel. Grades never
// touch geometry, so one graded copy of a photo can be reused for every
// panel, zoom and crop until the grade changes.

/** Keeps a channel value inside the byte range. */
function clampChannel(value) {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

/** Rec. 709 luma of one pixel, the brightness every grade reasons about. */
function lumaOf(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Moves each channel toward (amount < 1) or away from (amount > 1) the pixel's own luma. */
function scaleSaturation(r, g, b, amount) {
  const l = lumaOf(r, g, b);
  return [l + (r - l) * amount, l + (g - l) * amount, l + (b - l) * amount];
}

/** Stretches or softens the distance of each channel from middle grey. */
function scaleContrast(r, g, b, amount) {
  return [
    (r - 128) * amount + 128,
    (g - 128) * amount + 128,
    (b - 128) * amount + 128,
  ];
}

/** Tints the dark end of the range toward one colour and the bright end toward another. */
function splitTone(r, g, b, shadowTint, highlightTint, strength) {
  const t = lumaOf(r, g, b) / 255;
  const shadowWeight = (1 - t) * (1 - t) * strength;
  const highlightWeight = t * t * strength;
  return [
    r + shadowTint[0] * shadowWeight + highlightTint[0] * highlightWeight,
    g + shadowTint[1] * shadowWeight + highlightTint[1] * highlightWeight,
    b + shadowTint[2] * shadowWeight + highlightTint[2] * highlightWeight,
  ];
}

/** Sunset Strip: teal shadows, orange highlights, rich saturation — the Vice City evening. */
function gradeSunsetStrip(r, g, b) {
  [r, g, b] = scaleSaturation(r, g, b, 1.28);
  [r, g, b] = scaleContrast(r, g, b, 1.06);
  [r, g, b] = splitTone(r, g, b, [-10, 12, 20], [26, 9, -16], 0.9);
  return [r * 1.04, g, b * 0.94];
}

/** Neon Nights: a magenta-and-cyan night grade with hard contrast for lit streets. */
function gradeNeonNights(r, g, b) {
  [r, g, b] = scaleContrast(r * 0.94, g * 0.94, b * 0.94, 1.18);
  [r, g, b] = scaleSaturation(r, g, b, 1.4);
  [r, g, b] = splitTone(r, g, b, [20, -8, 30], [-16, 18, 24], 1.0);
  return [r, g, b];
}

/** Golden Hour: a warm, soft wash, as if every photo was taken twenty minutes before dusk. */
function gradeGoldenHour(r, g, b) {
  r = r * 0.94 + 10;
  g = g * 0.94 + 8;
  b = b * 0.94 + 4;
  [r, g, b] = scaleSaturation(r * 1.1, g, b * 0.8, 1.14);
  [r, g, b] = scaleContrast(r, g, b, 0.96);
  return [r, g, b];
}

/** Vice Pastel: lifted, faded blacks with pink highlights and aqua shadows. */
function gradeVicePastel(r, g, b) {
  r = r * 0.78 + 46;
  g = g * 0.78 + 44;
  b = b * 0.78 + 48;
  [r, g, b] = scaleSaturation(r, g, b, 0.94);
  [r, g, b] = splitTone(r, g, b, [-3, 11, 13], [13, 2, 11], 0.7);
  return [r, g, b];
}

/** Midnight: cold blue noir — desaturated, crushed blacks, steel highlights. */
function gradeMidnight(r, g, b) {
  [r, g, b] = scaleSaturation(r * 0.8, g * 0.9, b * 1.14, 0.55);
  return [
    Math.max(0, (r - 10) * 1.06),
    Math.max(0, (g - 10) * 1.06),
    Math.max(0, (b - 8) * 1.05),
  ];
}

/** Converts one pixel to HSL so Chrome Noir can decide whether its colour earns survival. */
function hslOf(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness];
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue;
  if (max === rn) hue = ((gn - bn) / delta + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) hue = ((bn - rn) / delta + 2) * 60;
  else hue = ((rn - gn) / delta + 4) * 60;
  return [hue, saturation, lightness];
}

/** Chrome Noir: hard black-and-white, except warm and magenta colours, which stay lit. */
function gradeChromeNoir(r, g, b) {
  const [hue, saturation] = hslOf(r, g, b);
  const warmAccent = hue <= 48 || hue >= 330;
  const magentaAccent = hue >= 272 && hue < 330;
  const colourfulness = Math.max(0, Math.min(1, (saturation - 0.34) / 0.25));
  const keep = (warmAccent || magentaAccent) ? colourfulness : 0;
  let grey = lumaOf(r, g, b);
  grey = (grey - 128) * 1.32 + 128;
  grey = grey * grey * (3 - 2 * (grey / 255)) / 255 * 0.35 + grey * 0.65;
  if (keep === 0) return [grey, grey, grey];
  const [cr, cg, cb] = scaleSaturation(r, g, b, 1.15);
  return [
    grey + (cr - grey) * keep,
    grey + (cg - grey) * keep,
    grey + (cb - grey) * keep,
  ];
}

/** The grades on offer, in the order the editor lists them. */
export const GRADES = {
  sunset: { label: 'Sunset Strip', apply: gradeSunsetStrip },
  neon: { label: 'Neon Nights', apply: gradeNeonNights },
  golden: { label: 'Golden Hour', apply: gradeGoldenHour },
  pastel: { label: 'Vice Pastel', apply: gradeVicePastel },
  midnight: { label: 'Midnight', apply: gradeMidnight },
  chrome: { label: 'Chrome Noir', apply: gradeChromeNoir },
};

/** Applies a grade to an ImageData buffer in place and returns it. */
export function applyGradeToPixels(imageData, gradeName) {
  const grade = GRADES[gradeName] ?? GRADES.sunset;
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = grade.apply(data[i], data[i + 1], data[i + 2]);
    data[i] = clampChannel(r);
    data[i + 1] = clampChannel(g);
    data[i + 2] = clampChannel(b);
  }
  return imageData;
}

/**
 * Returns a canvas holding `image` with `gradeName` baked in, at the image's
 * own size but never wider or taller than `maxDimension`, so a phone photo
 * cannot make the editor grade tens of millions of pixels.
 */
export function bakeGradedImage(image, gradeName, maxDimension = 1600) {
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyGradeToPixels(pixels, gradeName);
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

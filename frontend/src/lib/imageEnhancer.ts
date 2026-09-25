// AI Image Enhancer — deterministic, explainable product-photo pipeline.
//
// Pure pixel functions (Uint8ClampedArray in/out) are separated from the
// browser canvas orchestrator so the maths is unit-testable in Node.
// Pipeline: lighting auto-levels -> edge flood-fill background removal ->
// e-commerce framing (1:1 studio canvas, clean background, soft shadow).

export type BackgroundStyle = 'white' | 'gradient' | 'transparent';
export type OutputFormat = 'square' | 'original';
export type EnhanceStep = 'lighting' | 'background' | 'formatting';

export interface EnhanceOptions {
  removeBackground: boolean;
  correctLighting: boolean;
  format: OutputFormat;
  background: BackgroundStyle;
  /** 0-100 colour-distance tolerance for background flood fill. */
  tolerance: number;
  /** Output edge length for square e-commerce format. */
  targetSize: number;
}

export const DEFAULT_ENHANCE_OPTIONS: EnhanceOptions = {
  removeBackground: true,
  correctLighting: true,
  format: 'square',
  background: 'white',
  tolerance: 42,
  targetSize: 1024,
};

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EnhanceStats {
  removedFraction: number;
  lightingRange: { low: number; high: number } | null;
  bounds: Bounds | null;
}

export interface EnhanceResult {
  dataUrl: string;
  stats: EnhanceStats;
}

// ---------------------------------------------------------------------------
// Pure pixel operations
// ---------------------------------------------------------------------------

export function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Perceptually weighted RGB distance (green matters most to the eye). */
export function colorDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(2 * dr * dr + 3 * dg * dg + db * db);
}

/**
 * Average colour of the four corner patches. Corner patches are the most
 * reliable background samples in product photography (subject is centred).
 */
export function sampleBackgroundColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { r: number; g: number; b: number } {
  const patch = Math.max(3, Math.floor(Math.min(width, height) * 0.08));
  let r = 0, g = 0, b = 0, n = 0;

  const corners: Array<[number, number]> = [
    [0, 0],
    [width - patch, 0],
    [0, height - patch],
    [width - patch, height - patch],
  ];

  for (const [x0, y0] of corners) {
    for (let y = y0; y < y0 + patch; y++) {
      for (let x = x0; x < x0 + patch; x++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] < 8) continue; // skip already-transparent pixels
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n++;
      }
    }
  }

  if (n === 0) return { r: 255, g: 255, b: 255 };
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

/**
 * Auto-levels: stretch the 1st-99th luminance percentiles to the full 0-255
 * range so under/over-exposed photos gain contrast without clipping outliers.
 * Mutates `data` in place; returns the detected input range for reporting.
 */
export function correctLighting(
  data: Uint8ClampedArray,
): { low: number; high: number } {
  const histogram = new Uint32Array(256);
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const lum = Math.round(luminance(data[i], data[i + 1], data[i + 2]));
    histogram[lum]++;
    count++;
  }

  if (count === 0) return { low: 0, high: 255 };

  // 1st percentile from the dark end.
  const lowTarget = count * 0.01;
  let acc = 0;
  let low = 0;
  for (let v = 0; v < 256; v++) {
    acc += histogram[v];
    if (acc >= lowTarget) { low = v; break; }
  }

  // 99th percentile from the bright end (top 1% of pixels).
  const highTarget = count * 0.01;
  acc = 0;
  let high = 255;
  for (let v = 255; v >= 0; v--) {
    acc += histogram[v];
    if (acc >= highTarget) { high = v; break; }
  }

  if (high <= low) {
    // Flat/low-contrast image: gentle gamma lift instead of a degenerate stretch.
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 8) continue;
      data[i] = Math.min(255, Math.round(data[i] * 1.08 + 8));
      data[i + 1] = Math.min(255, Math.round(data[i + 1] * 1.08 + 8));
      data[i + 2] = Math.min(255, Math.round(data[i + 2] * 1.08 + 8));
    }
    return { low, high };
  }

  const scale = 255 / (high - low);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    data[i] = Math.min(255, Math.max(0, Math.round((data[i] - low) * scale)));
    data[i + 1] = Math.min(255, Math.max(0, Math.round((data[i + 1] - low) * scale)));
    data[i + 2] = Math.min(255, Math.max(0, Math.round((data[i + 2] - low) * scale)));
  }

  return { low, high };
}

/**
 * Flood-fill background removal seeded from all four edges.
 *
 * A pixel joins the background when its colour is within `tolerance` of the
 * sampled corner colour AND it is connected to an edge (so similarly coloured
 * parts of the product are kept). Soft alpha ramps over ~12 distance units
 * near the threshold for anti-aliased edges.
 *
 * Mutates `data` in place; returns the fraction of pixels made transparent.
 */
export function removeBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance: number = 42,
): number {
  if (width <= 0 || height <= 0) return 0;

  const bg = sampleBackgroundColor(data, width, height);
  const tol = Math.max(5, Math.min(120, tolerance));
  const soft = 12;

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  let removed = 0;

  const trySeed = (x: number, y: number) => {
    const p = y * width + x;
    if (visited[p]) return;
    visited[p] = 1;
    const i = p * 4;
    if (data[i + 3] < 8) {
      queue[tail++] = p; // already transparent — treat as background
      return;
    }
    const d = colorDistance(data[i], data[i + 1], data[i + 2], bg.r, bg.g, bg.b);
    if (d <= tol) queue[tail++] = p;
  };

  for (let x = 0; x < width; x++) { trySeed(x, 0); trySeed(x, height - 1); }
  for (let y = 0; y < height; y++) { trySeed(0, y); trySeed(width - 1, y); }

  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const y = (p / width) | 0;
    const i = p * 4;

    if (data[i + 3] !== 0) {
      data[i + 3] = 0;
      removed++;
    }

    // 4-neighbours
    if (x > 0) trySeed(x - 1, y);
    if (x < width - 1) trySeed(x + 1, y);
    if (y > 0) trySeed(x, y - 1);
    if (y < height - 1) trySeed(x, y + 1);
  }

  // Soft edge pass: partially fade product pixels that sit just outside the
  // hard threshold so the cut-out does not look jagged.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (visited[p]) continue;
      const i = p * 4;
      if (data[i + 3] < 8) continue;
      const d = colorDistance(data[i], data[i + 1], data[i + 2], bg.r, bg.g, bg.b);
      if (d > tol && d <= tol + soft) {
        const t = (d - tol) / soft; // 0 at threshold -> 1 at tol+soft
        data[i + 3] = Math.max(0, Math.round(data[i + 3] * t));
        if (data[i + 3] === 0) removed++;
      }
    }
  }

  return removed / (width * height);
}

/** Bounding box of pixels with alpha >= alphaMin; null when nothing remains. */
export function detectProductBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaMin: number = 40,
): Bounds | null {
  let minX = width, minY = height, maxX = -1, maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a >= alphaMin) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0 || maxY < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

// ---------------------------------------------------------------------------
// Browser orchestrator (canvas)
// ---------------------------------------------------------------------------

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function fillBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  style: BackgroundStyle,
): void {
  if (style === 'transparent') return;
  if (style === 'gradient') {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#f4f7ff');
    gradient.addColorStop(0.5, '#eef1fa');
    gradient.addColorStop(1, '#e3e9f8');
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = '#ffffff';
  }
  ctx.fillRect(0, 0, w, h);
}

/**
 * Full pipeline: load -> downscale -> lighting -> background removal ->
 * e-commerce framing. Returns a PNG data URL plus stats for the UI.
 */
export async function enhanceProductImage(
  imageSrc: string,
  options: Partial<EnhanceOptions> = {},
  onStep?: (step: EnhanceStep) => void,
): Promise<EnhanceResult> {
  const opts: EnhanceOptions = { ...DEFAULT_ENHANCE_OPTIONS, ...options };
  const img = await loadImage(imageSrc);

  // Process at a bounded resolution so flood fill stays interactive.
  const maxProcess = 1600;
  const scale = Math.min(1, maxProcess / Math.max(img.naturalWidth, img.naturalHeight));
  const pw = Math.max(1, Math.round(img.naturalWidth * scale));
  const ph = Math.max(1, Math.round(img.naturalHeight * scale));

  const work = document.createElement('canvas');
  work.width = pw;
  work.height = ph;
  const wctx = work.getContext('2d', { willReadFrequently: true });
  if (!wctx) throw new Error('Canvas not supported');
  wctx.drawImage(img, 0, 0, pw, ph);

  const imageData = wctx.getImageData(0, 0, pw, ph);
  const data = imageData.data;

  const stats: EnhanceStats = {
    removedFraction: 0,
    lightingRange: null,
    bounds: null,
  };

  if (opts.correctLighting) {
    onStep?.('lighting');
    stats.lightingRange = correctLighting(data);
    wctx.putImageData(imageData, 0, 0);
  }

  if (opts.removeBackground) {
    onStep?.('background');
    stats.removedFraction = removeBackground(data, pw, ph, opts.tolerance);
    wctx.putImageData(imageData, 0, 0);
  }

  stats.bounds = detectProductBounds(data, pw, ph);

  onStep?.('formatting');

  // ---- Frame the final output ----
  const out = document.createElement('canvas');
  const octx = out.getContext('2d');
  if (!octx) throw new Error('Canvas not supported');

  const sourceBounds = stats.bounds ?? { x: 0, y: 0, width: pw, height: ph };

  if (opts.format === 'square') {
    const size = opts.targetSize;
    out.width = size;
    out.height = size;
    fillBackground(octx, size, size, opts.background);

    // Product occupies ~76% of the frame with equal margins — the standard
    // e-commerce "hero shot" composition (marketplaces centre-crop to this).
    const maxProduct = Math.round(size * 0.76);
    const fit = Math.min(maxProduct / sourceBounds.width, maxProduct / sourceBounds.height);
    const dw = Math.max(1, Math.round(sourceBounds.width * fit));
    const dh = Math.max(1, Math.round(sourceBounds.height * fit));
    const dx = Math.round((size - dw) / 2);
    const dy = Math.round((size - dh) / 2);

    if (opts.background !== 'transparent') {
      octx.save();
      octx.shadowColor = 'rgba(15, 23, 42, 0.18)';
      octx.shadowBlur = Math.round(size * 0.025);
      octx.shadowOffsetY = Math.round(size * 0.012);
      octx.drawImage(
        work,
        sourceBounds.x, sourceBounds.y, sourceBounds.width, sourceBounds.height,
        dx, dy, dw, dh,
      );
      octx.restore();
    } else {
      octx.drawImage(
        work,
        sourceBounds.x, sourceBounds.y, sourceBounds.width, sourceBounds.height,
        dx, dy, dw, dh,
      );
    }
  } else {
    // Original aspect ratio, background replaced in place.
    out.width = pw;
    out.height = ph;
    if (opts.removeBackground || opts.background !== 'transparent') {
      fillBackground(octx, pw, ph, opts.background);
    }
    octx.drawImage(work, 0, 0);
  }

  return {
    dataUrl: out.toDataURL('image/png'),
    stats,
  };
}

export interface AngleVariant {
  id: string;
  label: string;
  dataUrl: string;
  transform: string;
}

/**
 * Generate multiple "angle variants" from a single product image using 2D transforms.
 * These are simulated angles (crop/rotate/perspective) — not true 3D reconstruction.
 * Perfect for marketplace carousels where artisans only have one photo.
 */
export async function generateAngleVariants(
  imageSrc: string,
  options: Partial<EnhanceOptions> = {},
): Promise<AngleVariant[]> {
  const opts: EnhanceOptions = { ...DEFAULT_ENHANCE_OPTIONS, ...options };

  // First, get the enhanced base image (background removed, lighting corrected, square)
  const baseResult = await enhanceProductImage(imageSrc, opts);
  const baseImg = await loadImage(baseResult.dataUrl);
  const size = baseImg.naturalWidth; // square output

  const variants: AngleVariant[] = [];

  // 1. Front view (enhanced original)
  variants.push({
    id: 'front',
    label: 'Front View',
    dataUrl: baseResult.dataUrl,
    transform: 'none',
  });

  // 2. Slight left rotation (simulate 3/4 left view)
  variants.push(await createTransformedVariant(baseImg, size, {
    id: 'left',
    label: 'Left Angle',
    rotate: -8,
    scale: 1.05,
    translateX: -size * 0.03,
  }));

  // 3. Slight right rotation (simulate 3/4 right view)
  variants.push(await createTransformedVariant(baseImg, size, {
    id: 'right',
    label: 'Right Angle',
    rotate: 8,
    scale: 1.05,
    translateX: size * 0.03,
  }));

  // 4. Top-down crop (detail shot - upper portion)
  variants.push(await createCroppedVariant(baseImg, size, {
    id: 'top',
    label: 'Top Detail',
    cropY: 0,
    cropHeight: size * 0.6,
  }));

  // 5. Bottom crop (detail shot - lower portion)
  variants.push(await createCroppedVariant(baseImg, size, {
    id: 'bottom',
    label: 'Bottom Detail',
    cropY: size * 0.4,
    cropHeight: size * 0.6,
  }));

  // 6. Close-up zoom (center detail)
  variants.push(await createCroppedVariant(baseImg, size, {
    id: 'zoom',
    label: 'Close-up',
    cropX: size * 0.2,
    cropY: size * 0.2,
    cropWidth: size * 0.6,
    cropHeight: size * 0.6,
  }));

  // 7. Elevated angle (slight perspective tilt back)
  variants.push(await createPerspectiveVariant(baseImg, size, {
    id: 'elevated',
    label: 'Elevated View',
    tilt: -12,
  }));

  // 8. Low angle (slight perspective tilt forward)
  variants.push(await createPerspectiveVariant(baseImg, size, {
    id: 'low',
    label: 'Low Angle',
    tilt: 10,
  }));

  return variants;
}

interface TransformParams {
  id: string;
  label: string;
  rotate?: number;
  scale?: number;
  translateX?: number;
  translateY?: number;
}

interface CropParams {
  id: string;
  label: string;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
}

interface PerspectiveParams {
  id: string;
  label: string;
  tilt: number;
}

async function createTransformedVariant(
  baseImg: HTMLImageElement,
  size: number,
  params: TransformParams,
): Promise<AngleVariant> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  // White background for marketplace consistency
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(size / 2 + (params.translateX ?? 0), size / 2 + (params.translateY ?? 0));
  ctx.rotate((params.rotate ?? 0) * Math.PI / 180);
  ctx.scale(params.scale ?? 1, params.scale ?? 1);
  ctx.drawImage(baseImg, -size / 2, -size / 2, size, size);
  ctx.restore();

  // Soft shadow for depth
  ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
  ctx.shadowBlur = Math.round(size * 0.02);
  ctx.shadowOffsetY = Math.round(size * 0.008);

  return {
    id: params.id,
    label: params.label,
    dataUrl: canvas.toDataURL('image/png'),
    transform: `rotate(${params.rotate ?? 0}deg) scale(${params.scale ?? 1})`,
  };
}

async function createCroppedVariant(
  baseImg: HTMLImageElement,
  size: number,
  params: CropParams,
): Promise<AngleVariant> {
  const cropX = params.cropX ?? 0;
  const cropY = params.cropY ?? 0;
  const cropWidth = params.cropWidth ?? size;
  const cropHeight = params.cropHeight ?? size;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Draw cropped region scaled to fill
  ctx.drawImage(
    baseImg,
    cropX, cropY, cropWidth, cropHeight,
    0, 0, size, size
  );

  // Soft shadow
  ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
  ctx.shadowBlur = Math.round(size * 0.02);
  ctx.shadowOffsetY = Math.round(size * 0.008);

  return {
    id: params.id,
    label: params.label,
    dataUrl: canvas.toDataURL('image/png'),
    transform: `crop(${cropX},${cropY},${cropWidth},${cropHeight})`,
  };
}

async function createPerspectiveVariant(
  baseImg: HTMLImageElement,
  size: number,
  params: PerspectiveParams,
): Promise<AngleVariant> {
  // Simulate perspective by scaling top/bottom differently
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const tilt = params.tilt;
  const absTilt = Math.abs(tilt);
  const scaleTop = 1 - absTilt * 0.008;
  const scaleBottom = 1 + absTilt * 0.008;

  // Draw in vertical strips with varying scale to fake perspective
  const strips = 20;
  const stripWidth = size / strips;
  
  for (let i = 0; i < strips; i++) {
    const progress = i / (strips - 1);
    const scaleY = scaleTop + (scaleBottom - scaleTop) * progress;
    const stripHeight = size * scaleY;
    const yOffset = (size - stripHeight) / 2;
    
    ctx.drawImage(
      baseImg,
      i * stripWidth, 0, stripWidth, size,
      i * stripWidth, yOffset, stripWidth, stripHeight
    );
  }

  // Soft shadow
  ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
  ctx.shadowBlur = Math.round(size * 0.02);
  ctx.shadowOffsetY = Math.round(size * 0.008);

  return {
    id: params.id,
    label: params.label,
    dataUrl: canvas.toDataURL('image/png'),
    transform: `perspective(tilt=${tilt}deg)`,
  };
}

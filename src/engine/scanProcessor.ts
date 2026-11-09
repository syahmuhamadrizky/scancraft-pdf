import { ScanSettings } from '../types/scan';
import { PAPER_TONE_COLORS } from './presets';

// Mulberry32 deterministic PRNG
function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Precompute a tileable 256x256 organic paper fiber noise texture in [-1, 1]
const TEX_SIZE = 256;
const PAPER_FIBER_TEXTURE: Float32Array = (() => {
  const rng = createRng(91827364);
  const out = new Float32Array(TEX_SIZE * TEX_SIZE);

  const makeOctave = (gridSize: number): Float32Array => {
    const grid = new Float32Array(gridSize * gridSize);
    for (let i = 0; i < grid.length; i++) {
      grid[i] = rng() * 2 - 1;
    }
    const res = new Float32Array(TEX_SIZE * TEX_SIZE);
    const scale = gridSize / TEX_SIZE;
    for (let y = 0; y < TEX_SIZE; y++) {
      const gy = y * scale;
      const y0 = Math.floor(gy) % gridSize;
      const y1 = (y0 + 1) % gridSize;
      const fy = gy - Math.floor(gy);
      const sy = fy * fy * (3 - 2 * fy);
      for (let x = 0; x < TEX_SIZE; x++) {
        const gx = x * scale;
        const x0 = Math.floor(gx) % gridSize;
        const x1 = (x0 + 1) % gridSize;
        const fx = gx - Math.floor(gx);
        const sx = fx * fx * (3 - 2 * fx);

        const n00 = grid[y0 * gridSize + x0];
        const n10 = grid[y0 * gridSize + x1];
        const n01 = grid[y1 * gridSize + x0];
        const n11 = grid[y1 * gridSize + x1];

        const nx0 = n00 + sx * (n10 - n00);
        const nx1 = n01 + sx * (n11 - n01);
        res[y * TEX_SIZE + x] = nx0 + sy * (nx1 - nx0);
      }
    }
    return res;
  };

  const oct1 = makeOctave(16);
  const oct2 = makeOctave(48);
  for (let i = 0; i < out.length; i++) {
    const fine = rng() * 2 - 1;
    out[i] = oct1[i] * 0.35 + oct2[i] * 0.35 + fine * 0.3;
  }
  return out;
})();

function buildToneLut(settings: ScanSettings): Uint8Array {
  const lut = new Uint8Array(256);
  const c = settings.contrast;
  const b = settings.brightness;
  const ib = settings.inkBleed / 100;

  for (let i = 0; i < 256; i++) {
    let v = i;
    if (ib > 0 && v < 245) {
      const norm = v / 255;
      const darkened = Math.pow(norm, 1 + ib * 0.55) * 255;
      v = v * (1 - ib * 0.48) + darkened * (ib * 0.48);
    }
    v = (v - 128) * c + 128 + b;
    lut[i] = v < 0 ? 0 : v > 255 ? 255 : v | 0;
  }
  return lut;
}

function getPaperTintRgb(settings: ScanSettings): [number, number, number] {
  const base = PAPER_TONE_COLORS[settings.paperTone].rgb;
  const strength = settings.paperToneStrength / 100;
  return [
    Math.round(255 - (255 - base[0]) * strength),
    Math.round(255 - (255 - base[1]) * strength),
    Math.round(255 - (255 - base[2]) * strength),
  ];
}

function applyPaperAndLighting(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  settings: ScanSettings,
  rng: () => number
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';

  // 1. Paper tint
  const [pr, pg, pb] = getPaperTintRgb(settings);
  if (pr < 255 || pg < 255 || pb < 255) {
    ctx.fillStyle = `rgb(${pr}, ${pg}, ${pb})`;
    ctx.fillRect(x, y, w, h);
  }

  // 2. Uneven scanner lamp vignette / edge shadow
  if (settings.vignette > 0) {
    const vig = settings.vignette / 100;
    const cx = x + w * (0.48 + rng() * 0.04);
    const cy = y + h * (0.48 + rng() * 0.04);
    const outerR = Math.hypot(w, h) * 0.54;
    const innerR = Math.min(w, h) * 0.25;
    const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    const edgeShade = Math.round(255 - vig * 58);
    const midShade = Math.round(255 - vig * 14);
    grad.addColorStop(0, 'rgb(255, 255, 255)');
    grad.addColorStop(0.62, `rgb(${midShade}, ${midShade}, ${midShade})`);
    grad.addColorStop(1, `rgb(${edgeShade}, ${edgeShade - 2}, ${edgeShade - 4})`);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  }

  // 3. Spine / stapled-edge shadow (left edge or slight top edge)
  if (settings.spineShadow > 0) {
    const sp = settings.spineShadow / 100;
    const shadowWidth = w * (0.06 + sp * 0.09);
    const edgeShade = Math.round(255 - sp * 108);
    const spineGrad = ctx.createLinearGradient(x, y, x + shadowWidth, y);
    spineGrad.addColorStop(0, `rgb(${edgeShade}, ${edgeShade - 1}, ${edgeShade - 3})`);
    spineGrad.addColorStop(0.45, `rgb(${Math.round(255 - sp * 35)}, ${Math.round(255 - sp * 35)}, ${Math.round(255 - sp * 36)})`);
    spineGrad.addColorStop(1, 'rgb(255, 255, 255)');
    ctx.fillStyle = spineGrad;
    ctx.fillRect(x, y, shadowWidth, h);
  }

  ctx.restore();
}

export function applyScanEffects(
  sourceCanvas: HTMLCanvasElement,
  pageNumber: number,
  settings: ScanSettings,
  targetCanvas?: HTMLCanvasElement
): HTMLCanvasElement {
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;
  const widthScale = W / 1240; // normalized relative to 150 DPI A4

  const outCanvas = targetCanvas ?? document.createElement('canvas');
  if (outCanvas.width !== W) outCanvas.width = W;
  if (outCanvas.height !== H) outCanvas.height = H;

  const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Tidak dapat membuat Canvas 2D context.');

  const pageSeed = ((settings.seed * 7919) ^ (pageNumber * 104729) ^ 0x517cc1b7) >>> 0;
  const rng = createRng(pageSeed);

  // Per-page tilt angle
  let angleDeg = 0;
  if (settings.skew > 0) {
    if (settings.randomizeSkew) {
      const sign = rng() < 0.5 ? -1 : 1;
      const mag = settings.skew * (0.35 + 0.65 * rng());
      angleDeg = sign * mag;
    } else {
      angleDeg = settings.skew;
    }
  }
  const angleRad = (angleDeg * Math.PI) / 180;

  // Per-page feed offset
  const maxShift = (settings.offset / 100) * W * 0.015;
  const shiftX = (rng() * 2 - 1) * maxShift;
  const shiftY = (rng() * 2 - 1) * maxShift;

  const hasBorder = settings.scannerBorder > 0;
  const blurPx = settings.blur * widthScale;

  // Step 1: Background & Geometric paper placement
  if (hasBorder) {
    const borderStrength = settings.scannerBorder / 100;
    const bgLevel = Math.round(74 - borderStrength * 34); // dark scanner lid gray
    ctx.fillStyle = `rgb(${bgLevel}, ${bgLevel + 2}, ${bgLevel + 6})`;
    ctx.fillRect(0, 0, W, H);

    const paperScale = 1 - (0.012 + borderStrength * 0.028);
    ctx.save();
    ctx.translate(W / 2 + shiftX, H / 2 + shiftY);
    ctx.rotate(angleRad);
    ctx.scale(paperScale, paperScale);

    // Subtle paper edge shadow against dark scanner lid
    ctx.save();
    ctx.shadowColor = `rgba(0, 0, 0, ${0.28 + borderStrength * 0.3})`;
    ctx.shadowBlur = Math.max(4, 12 * widthScale);
    ctx.shadowOffsetX = 2 * widthScale;
    ctx.shadowOffsetY = 3 * widthScale;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-W / 2, -H / 2, W, H);
    ctx.restore();

    // Clip to sheet rectangle
    ctx.beginPath();
    ctx.rect(-W / 2, -H / 2, W, H);
    ctx.clip();

    if (blurPx > 0.05 && typeof ctx.filter === 'string') {
      ctx.filter = `blur(${blurPx.toFixed(2)}px)`;
    }
    ctx.drawImage(sourceCanvas, -W / 2, -H / 2, W, H);
    ctx.filter = 'none';

    applyPaperAndLighting(ctx, -W / 2, -H / 2, W, H, settings, rng);
    ctx.restore();
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    const safeScale = settings.skew > 0 || settings.offset > 0 ? 0.986 : 1;
    ctx.save();
    ctx.translate(W / 2 + shiftX, H / 2 + shiftY);
    ctx.rotate(angleRad);
    ctx.scale(safeScale, safeScale);

    if (blurPx > 0.05 && typeof ctx.filter === 'string') {
      ctx.filter = `blur(${blurPx.toFixed(2)}px)`;
    }
    ctx.drawImage(sourceCanvas, -W / 2, -H / 2, W, H);
    ctx.filter = 'none';
    ctx.restore();

    applyPaperAndLighting(ctx, 0, 0, W, H, settings, rng);
  }

  // Step 2: Subtle dust specks & ADF roller streak
  if (settings.dust > 0) {
    const dustNorm = settings.dust / 100;
    const speckCount = Math.round(dustNorm * 75);
    for (let i = 0; i < speckCount; i++) {
      const dx = rng() * W;
      const dy = rng() * H;
      const r = (0.45 + rng() * 1.45) * widthScale;
      const isDark = rng() < 0.82;
      const alpha = isDark ? 0.12 + rng() * 0.38 : 0.25 + rng() * 0.4;
      ctx.fillStyle = isDark
        ? `rgba(38, 40, 46, ${alpha.toFixed(2)})`
        : `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Occasional faint vertical scanner glass streak when dust >= 30
    if (settings.dust >= 30) {
      const streakCount = settings.dust >= 70 ? 2 : 1;
      for (let s = 0; s < streakCount; s++) {
        if (rng() < 0.7) {
          const sx = W * (0.08 + rng() * 0.84);
          const streakAlpha = 0.018 + dustNorm * 0.04;
          ctx.fillStyle = `rgba(60, 65, 72, ${streakAlpha.toFixed(3)})`;
          ctx.fillRect(sx, 0, Math.max(1, widthScale * 0.9), H);
        }
      }
    }
  }

  // Step 3: Fast single-pass pixel manipulation (LUT + organic paper grain + color mode)
  const imgData = ctx.getImageData(0, 0, W, H);
  const data = imgData.data;
  const lut = buildToneLut(settings);
  const noiseAmp = (settings.noise / 100) * 32;
  const isGrayscale = settings.colorMode === 'grayscale';
  const isBw = settings.colorMode === 'bw';
  const bwThresh = settings.bwThreshold;
  const texOffX = (rng() * TEX_SIZE) | 0;
  const texOffY = (rng() * TEX_SIZE) | 0;

  let xs = (pageSeed ^ 0x9e3779b9) >>> 0;
  if (xs === 0) xs = 123456789;

  for (let y = 0; y < H; y++) {
    const ty = ((y + texOffY) & 255) * TEX_SIZE;
    let idx = y * W * 4;
    for (let x = 0; x < W; x++) {
      // Fast xorshift32
      xs ^= xs << 13;
      xs ^= xs >>> 17;
      xs ^= xs << 5;
      const fastRand = ((xs & 0xffff) / 32768) - 1; // [-1, 1)

      const fiber = PAPER_FIBER_TEXTURE[ty + ((x + texOffX) & 255)];
      const grain = (fiber * 0.55 + fastRand * 0.45) * noiseAmp;

      let r = lut[data[idx]] + grain;
      let g = lut[data[idx + 1]] + grain;
      let b = lut[data[idx + 2]] + grain;

      r = r < 0 ? 0 : r > 255 ? 255 : r;
      g = g < 0 ? 0 : g > 255 ? 255 : g;
      b = b < 0 ? 0 : b > 255 ? 255 : b;

      if (isGrayscale) {
        const lum = (r * 77 + g * 150 + b * 29) >> 8;
        data[idx] = lum;
        data[idx + 1] = lum;
        data[idx + 2] = lum;
      } else if (isBw) {
        const lum = (r * 77 + g * 150 + b * 29) >> 8;
        // Steep organic threshold transition for authentic copier edge softness
        const diff = lum - bwThresh;
        let outVal: number;
        if (diff <= -10) {
          outVal = 16;
        } else if (diff >= 10) {
          outVal = 252;
        } else {
          const t = (diff + 10) / 20;
          const smooth = t * t * (3 - 2 * t);
          outVal = Math.round(16 + smooth * 236);
        }
        data[idx] = outVal;
        data[idx + 1] = outVal;
        data[idx + 2] = Math.max(0, outVal - 2);
      } else {
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
      }

      idx += 4;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return outCanvas;
}


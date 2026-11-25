/**
 * dfm-time.js (v0.3.1) — Zero-Opinion Deterministic Time, Easing & Color Math for OpenFilm
 * Completely style-agnostic: works equally well with 2D SVG, Canvas, WebGL, CSS, or collage.
 * Zero rAF, zero Math.random(), zero visual defaults.
 * Exact endpoint guards (t<=0 => 0, t>=1 => 1) prevent IEEE-754 negative-epsilon bugs in Canvas arc().
 */

export function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

export function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function invLerp(a, b, v) {
  if (a === b) return 0;
  return clamp((v - a) / (b - a), 0, 1);
}

export function remap(v, inMin, inMax, outMin, outMax, easeFn = (x) => x) {
  return lerp(outMin, outMax, easeFn(invLerp(inMin, inMax, v)));
}

export function seg(t, start, end, easeFn = ease.expoOut) {
  return easeFn(invLerp(start, end, t));
}

/** Deterministic pseudo-random in [0, 1) from any numeric seed (replaces Math.random) */
export function hash(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

const linear = (t) => clamp01(t);
const quadIn = (t) => { const x = clamp01(t); return x * x; };
const quadOut = (t) => { const x = clamp01(t); return 1 - (1 - x) * (1 - x); };
const quadInOut = (t) => { const x = clamp01(t); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
const cubicIn = (t) => { const x = clamp01(t); return x * x * x; };
const cubicOut = (t) => { const x = clamp01(t); return 1 - Math.pow(1 - x, 3); };
const cubicInOut = (t) => { const x = clamp01(t); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const quartOut = (t) => { const x = clamp01(t); return 1 - Math.pow(1 - x, 4); };
const quintOut = (t) => { const x = clamp01(t); return 1 - Math.pow(1 - x, 5); };
const expoOut = (t) => {
  const x = clamp01(t);
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return 1 - Math.pow(2, -10 * x);
};
const expoIn = (t) => {
  const x = clamp01(t);
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return Math.pow(2, 10 * x - 10);
};
const expoInOut = (t) => {
  const x = clamp01(t);
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
};
const whipIn = (t) => { const x = clamp01(t); return 1 - Math.pow(1 - x, 6); };
const whipOut = (t) => { const x = clamp01(t); return Math.pow(x, 5); };
const backOut = (t) => {
  const x = clamp01(t);
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const c1 = 1.45;
  const c3 = c1 + 1;
  return Math.max(0, 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2));
};

export const ease = {
  linear,
  quadIn,
  quadOut,
  quadInOut,
  cubicIn,
  cubicOut,
  cubicInOut,
  quartOut,
  quintOut,
  expoOut,
  expoIn,
  expoInOut,
  whipIn,
  whipOut,
  backOut,
  // Common aliases so either naming order works seamlessly
  inQuad: quadIn,
  outQuad: quadOut,
  inOutQuad: quadInOut,
  inCubic: cubicIn,
  outCubic: cubicOut,
  inOutCubic: cubicInOut,
  outQuart: quartOut,
  outQuint: quintOut,
  outExpo: expoOut,
  inExpo: expoIn,
  inOutExpo: expoInOut,
  outBack: backOut
};

export function lerpColor(hexA, hexB, t) {
  const p = clamp(t, 0, 1);
  const parse = (h) => {
    const clean = h.replace("#", "");
    const n = parseInt(clean, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parse(hexA);
  const [r2, g2, b2] = parse(hexB);
  return `rgb(${Math.round(lerp(r1, r2, p))}, ${Math.round(lerp(g1, g2, p))}, ${Math.round(lerp(b1, b2, p))})`;
}

/**
 * Registers an OpenFilm-compatible deterministic frame(t) hook cleanly.
 * Supports direct browser preview via ?t=<seconds> (defaults to heroAt).
 */
export function defineShot({ id, duration, heroAt, render }) {
  const resolvedHeroAt = typeof heroAt === "number" ? heroAt : Number((duration * 0.5).toFixed(2));

  function frame(t) {
    const clampedT = clamp(Number(t) || 0, 0, duration);
    render(clampedT, { duration, progress: duration > 0 ? clampedT / duration : 0 });
  }

  window.film = {
    duration,
    ready: document.fonts ? document.fonts.ready : Promise.resolve(),
    meta: { id, heroAt: resolvedHeroAt },
    frame
  };

  const params = new URLSearchParams(window.location.search);
  const previewT = params.has("t") ? Number(params.get("t")) : resolvedHeroAt;
  const boot = () => frame(previewT);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}

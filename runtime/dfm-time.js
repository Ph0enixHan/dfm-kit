/**
 * dfm-time.js (v0.4.0) — Zero-Opinion Deterministic Time, Easing, Motion Primitives & Color Math
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

/* ============================================================================
 * Pure-Physics Motion Primitives (v0.4 — Style-Agnostic)
 * ============================================================================ */

/**
 * anticipationPop(t, at, dur, { overshoot })
 * Crisp non-negative pop-in curve: fast launch -> subtle overshoot -> dampened settle.
 * Strictly 0 at t<=at, strictly 1 at t>=at+dur, and always >= 0 (safe for Canvas arc() radii).
 */
export function anticipationPop(t, at, dur = 0.52, { overshoot = 0.08 } = {}) {
  const p = invLerp(at, at + dur, t);
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  if (p < 0.58) {
    return (1 + overshoot) * expoOut(p / 0.58);
  }
  if (p < 0.82) {
    const q = (p - 0.58) / 0.24;
    return lerp(1 + overshoot, 1 - overshoot * 0.26, cubicInOut(q));
  }
  const q = (p - 0.82) / 0.18;
  return lerp(1 - overshoot * 0.26, 1, cubicOut(q));
}

/**
 * whipPan(t, cutAt, dur, { distance, axis, maxBlur, maxRgb, anticipation })
 * Physical whip-pan transition centered at cutAt:
 * subtle anticipation pull-back -> peak-velocity whip -> crisp settle,
 * returning synced offsets plus directional motionBlur & rgbSplit intensities.
 */
export function whipPan(
  t,
  cutAt,
  dur = 0.36,
  { distance = 1080, axis = "x", maxBlur = 28, maxRgb = 4, anticipation = 0.045 } = {}
) {
  const start = cutAt - dur * 0.5;
  const end = cutAt + dur * 0.5;
  if (t <= start) {
    return { progress: 0, offset: 0, outOffset: 0, inOffset: distance, blurX: 0, blurY: 0, rgbPx: 0, velocity: 0, active: false };
  }
  if (t >= end) {
    return { progress: 1, offset: distance, outOffset: -distance, inOffset: 0, blurX: 0, blurY: 0, rgbPx: 0, velocity: 0, active: false };
  }
  const p = (t - start) / dur;
  let u;
  if (p < 0.15) {
    u = -anticipation * Math.sin((p / 0.15) * Math.PI * 0.5);
  } else {
    const q = (p - 0.15) / 0.85;
    u = lerp(-anticipation, 1, expoInOut(q));
  }
  // Bell velocity curve peaking right across cutAt
  const velocity = Math.pow(Math.sin(p * Math.PI), 2.2);
  const offset = u * distance;
  const blur = Number((velocity * maxBlur).toFixed(2));
  return {
    progress: p,
    offset,
    outOffset: -offset,
    inOffset: distance - offset,
    blurX: axis === "y" ? 0 : blur,
    blurY: axis === "y" ? blur : 0,
    rgbPx: Number((velocity * maxRgb).toFixed(2)),
    velocity,
    active: true
  };
}

/**
 * portalZoom(t, cutAt, dur, { maxScale, inStartScale })
 * Exponential push-through portal transition centered at cutAt.
 * Scales an outgoing anchor through the lens while revealing the incoming world out of the portal.
 */
export function portalZoom(t, cutAt, dur = 0.5, { maxScale = 12, inStartScale = 0.24 } = {}) {
  const start = cutAt - dur * 0.5;
  const end = cutAt + dur * 0.5;
  if (t <= start) {
    return { progress: 0, outScale: 1, outOpacity: 1, inScale: inStartScale, inOpacity: 0, active: false };
  }
  if (t >= end) {
    return { progress: 1, outScale: maxScale, outOpacity: 0, inScale: 1, inOpacity: 1, active: false };
  }
  const p = (t - start) / dur;
  const outScale = Math.pow(maxScale, expoIn(p));
  const outOpacity = 1 - smoothStep(0.45, 0.78, p);
  const inOpacity = smoothStep(0.35, 0.72, p);
  const inScale = lerp(inStartScale, 1, expoOut(clamp01((p - 0.25) / 0.75)));
  return { progress: p, outScale, outOpacity, inScale, inOpacity, active: true };
}

function smoothStep(edge0, edge1, x) {
  const u = clamp01((x - edge0) / (edge1 - edge0));
  return u * u * (3 - 2 * u);
}

/**
 * ambientDrift(t, seed, { ampX, ampY, ampScale, ampRot, speed })
 * Subtle deterministic living micro-motion for held shots (eliminates lifeless static holds).
 */
export function ambientDrift(
  t,
  seed = 1,
  { ampX = 8, ampY = 6, ampScale = 0.014, ampRot = 0.35, speed = 0.45 } = {}
) {
  const ph1 = hash(seed * 13.7) * Math.PI * 2;
  const ph2 = hash(seed * 29.3) * Math.PI * 2;
  const ph3 = hash(seed * 47.9) * Math.PI * 2;
  const w = t * speed * Math.PI * 2;
  return {
    x: Math.sin(w * 0.41 + ph1) * ampX + Math.sin(w * 0.19 + ph2) * (ampX * 0.35),
    y: Math.cos(w * 0.33 + ph2) * ampY + Math.sin(w * 0.23 + ph3) * (ampY * 0.3),
    scale: 1 + Math.sin(w * 0.27 + ph3) * ampScale,
    rotDeg: Math.sin(w * 0.21 + ph1) * ampRot
  };
}

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

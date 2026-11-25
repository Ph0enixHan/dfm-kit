/**
 * dfm-motion.js — Deterministic Cinematic Camera & Choreography Runtime for OpenFilm
 * Zero dependencies. Pure f(t) deterministic functions — zero rAF, zero Math.random().
 */

export function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
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

/**
 * Segment helper: maps global time t into eased [0, 1] over [start, end].
 */
export function seg(t, start, end, easeFn = ease.expoOut) {
  return easeFn(invLerp(start, end, t));
}

/**
 * Filmic easing library — expressive non-PPT curves.
 */
export const ease = {
  linear: (t) => t,
  cubicOut: (t) => 1 - Math.pow(1 - t, 3),
  cubicIn: (t) => t * t * t,
  cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  quartOut: (t) => 1 - Math.pow(1 - t, 4),
  quintOut: (t) => 1 - Math.pow(1 - t, 5),
  expoOut: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  expoIn: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  expoInOut: (t) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  /** Fast decisive snap into calm Hero settle */
  whipIn: (t) => 1 - Math.pow(1 - t, 6),
  /** Fast decisive exit out of a Hero hold */
  whipOut: (t) => Math.pow(t, 5),
  /** Subtle tactile overshoot */
  backOut: (t) => {
    const c1 = 1.35;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
};

/**
 * Camera Rig Primitives (GPU transform only: translate3d + scale + rotateX/Y/Z)
 */
export const camera = {
  /**
   * Slow, atmospheric push-in for Establishing Shots.
   */
  establishingPush(t, duration, { fromScale = 1.08, toScale = 1.0, driftX = 18, driftY = -8 } = {}) {
    const p = clamp(t / duration, 0, 1);
    const e = ease.cubicOut(p);
    return {
      x: lerp(-driftX, driftX * 0.4, e),
      y: lerp(driftY, -driftY * 0.4, e),
      z: 0,
      scale: lerp(fromScale, toScale, e),
      rx: lerp(1.2, 0, e),
      ry: lerp(-1.4, 0.5, e),
      rz: 0
    };
  },

  /**
   * Calm, readable micro-motion during a Hero Frame hold (Q11 slow-read principle).
   */
  heroDrift(t, duration, { entryDur = 0.55, fromScale = 1.05, holdScale = 1.01, driftX = 10, tiltY = 1.1 } = {}) {
    const entry = seg(t, 0, entryDur, ease.expoOut);
    const drift = clamp(t / duration, 0, 1);
    return {
      x: lerp(driftX, -driftX * 0.5, drift),
      y: lerp(6, -4, drift),
      z: 0,
      scale: lerp(fromScale, holdScale, entry) + lerp(0, 0.015, drift),
      rx: lerp(0.8, -0.4, drift),
      ry: lerp(-tiltY, tiltY * 0.6, drift),
      rz: 0
    };
  },

  /**
   * High-energy diagonal sweep for Transitions (Q11 fast transition contrast).
   */
  dutchSweep(t, duration, { angle = -7, startX = 140, endX = -140, fromScale = 1.18, toScale = 1.02 } = {}) {
    const p = clamp(t / duration, 0, 1);
    const e = ease.expoInOut(p);
    return {
      x: lerp(startX, endX, e),
      y: lerp(42, -42, e),
      z: 0,
      scale: lerp(fromScale, toScale, e),
      rx: lerp(3, -2, e),
      ry: lerp(-6, 5, e),
      rz: lerp(angle, angle * 0.35, e)
    };
  },

  /**
   * Compose a camera transform state onto a .dfm-camera element.
   */
  apply(el, state) {
    if (!el) return;
    const { x = 0, y = 0, z = 0, scale = 1, rx = 0, ry = 0, rz = 0 } = state;
    el.style.transform =
      `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) ` +
      `scale(${scale.toFixed(4)}) ` +
      `rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg)`;
  }
};

/**
 * Choreography & Editorial Reveal Primitives
 */
export const choreo = {
  /**
   * Crisp directional clip-path reveal + subtle slide (replaces flat PPT fades).
   * dir: 'up' | 'down' | 'left' | 'right'
   */
  clipReveal(el, progress, { dir = "up", distance = 36, fade = true } = {}) {
    if (!el) return;
    const p = clamp(progress, 0, 1);
    const inv = 1 - p;
    let clip = "inset(0% 0% 0% 0%)";
    let tx = 0;
    let ty = 0;
    if (dir === "up") {
      clip = `inset(0% 0% ${(inv * 100).toFixed(2)}% 0%)`;
      ty = inv * distance;
    } else if (dir === "down") {
      clip = `inset(${(inv * 100).toFixed(2)}% 0% 0% 0%)`;
      ty = -inv * distance;
    } else if (dir === "left") {
      clip = `inset(0% ${(inv * 100).toFixed(2)}% 0% 0%)`;
      tx = inv * distance;
    } else if (dir === "right") {
      clip = `inset(0% 0% 0% ${(inv * 100).toFixed(2)}%)`;
      tx = -inv * distance;
    }
    el.style.clipPath = clip;
    el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
    if (fade) {
      el.style.opacity = clamp(p * 1.4, 0, 1).toFixed(3);
    }
  },

  /**
   * Line reveal inside a .dfm-mask container.
   */
  maskSlide(el, progress, { dir = "up", percent = 108 } = {}) {
    if (!el) return;
    const p = clamp(progress, 0, 1);
    const inv = 1 - p;
    if (dir === "up") {
      el.style.transform = `translate3d(0, ${(inv * percent).toFixed(2)}%, 0)`;
    } else if (dir === "down") {
      el.style.transform = `translate3d(0, ${(-inv * percent).toFixed(2)}%, 0)`;
    } else if (dir === "left") {
      el.style.transform = `translate3d(${(inv * percent).toFixed(2)}%, 0, 0)`;
    } else {
      el.style.transform = `translate3d(${(-inv * percent).toFixed(2)}%, 0, 0)`;
    }
    el.style.opacity = clamp(p * 1.5, 0, 1).toFixed(3);
  },

  /**
   * Staggered progress for item index i out of total.
   */
  stagger(index, t, { start = 0, itemDur = 0.55, step = 0.08, easeFn = ease.expoOut } = {}) {
    const s = start + index * step;
    return seg(t, s, s + itemDur, easeFn);
  },

  /**
   * Cinema Rack Focus: dynamically adjusts blur across spatial planes based on focus Z.
   */
  focusRack(rootEl, focusZ = 0, { maxBlur = 6, focalRange = 280 } = {}) {
    if (!rootEl) return;
    const planeZMap = { ebg: -420, bg: -210, mg: 0, fg: 110, efg: 240 };
    const planes = rootEl.querySelectorAll(".dfm-plane[data-plane]");
    for (const plane of planes) {
      const name = plane.getAttribute("data-plane");
      const z = planeZMap[name] ?? 0;
      const dist = Math.abs(z - focusZ);
      const blur = clamp(dist / focalRange, 0, 1) * maxBlur;
      plane.style.filter = blur > 0.15 ? `blur(${blur.toFixed(2)}px)` : "none";
    }
  }
};

/**
 * Register an OpenFilm-compatible deterministic shot cleanly.
 * Also supports direct browser preview via ?t=<seconds> (defaults to heroAt).
 */
export function defineShot({ id, duration, heroAt, role = "hero", shotType = "medium", render }) {
  const resolvedHeroAt = typeof heroAt === "number" ? heroAt : Number((duration * 0.52).toFixed(2));

  function frame(t) {
    const clampedT = clamp(Number(t) || 0, 0, duration);
    render(clampedT, { duration, progress: duration > 0 ? clampedT / duration : 0 });
  }

  window.film = {
    duration,
    ready: document.fonts ? document.fonts.ready : Promise.resolve(),
    meta: { id, role, shotType, heroAt: resolvedHeroAt },
    frame
  };

  // Auto-render Hero frame (or ?t=...) when opened directly in a browser
  const params = new URLSearchParams(window.location.search);
  const previewT = params.has("t") ? Number(params.get("t")) : resolvedHeroAt;
  const boot = () => frame(previewT);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}

/**
 * Color interpolation helper for smooth emotional lighting / polarity shifts.
 */
export function lerpColor(hexA, hexB, t) {
  const p = clamp(t, 0, 1);
  const parse = (h) => {
    const clean = h.replace("#", "");
    const n = parseInt(clean, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parse(hexA);
  const [r2, g2, b2] = parse(hexB);
  const r = Math.round(lerp(r1, r2, p));
  const g = Math.round(lerp(g1, g2, p));
  const b = Math.round(lerp(b1, b2, p));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Multi-Keyframe 3D World Camera (Infinite Canvas Continuity Engine).
 * Eliminates slide-deck cuts by flying through one unified 3D coordinate world
 * and computing instantaneous camera speed for velocity-coupled motion blur.
 */
export function createWorldCamera(keyframes) {
  const sorted = [...keyframes].sort((a, b) => a.t - b.t);

  function sampleRaw(t) {
    if (t <= sorted[0].t) return { ...sorted[0] };
    const last = sorted[sorted.length - 1];
    if (t >= last.t) return { ...last };

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (t >= a.t && t <= b.t) {
        const easeFn = b.ease || ease.expoInOut;
        const p = easeFn(invLerp(a.t, b.t, t));
        return {
          x: lerp(a.x ?? 0, b.x ?? 0, p),
          y: lerp(a.y ?? 0, b.y ?? 0, p),
          z: lerp(a.z ?? 0, b.z ?? 0, p),
          scale: lerp(a.scale ?? 1, b.scale ?? 1, p),
          rx: lerp(a.rx ?? 0, b.rx ?? 0, p),
          ry: lerp(a.ry ?? 0, b.ry ?? 0, p),
          rz: lerp(a.rz ?? 0, b.rz ?? 0, p)
        };
      }
    }
    return { ...last };
  }

  function sample(t) {
    const dt = 0.016;
    const curr = sampleRaw(t);
    const prev = sampleRaw(Math.max(sorted[0].t, t - dt));
    const vx = (curr.x - prev.x) / dt;
    const vy = (curr.y - prev.y) / dt;
    const vz = (curr.z - prev.z) / dt;
    const speed = Math.hypot(vx, vy, vz * 0.65);
    return { ...curr, vx, vy, vz, speed };
  }

  function apply(worldEl, pose, { velocityBlur = 0.0022, maxBlur = 5.5 } = {}) {
    if (!worldEl) return;
    const { x = 0, y = 0, z = 0, scale = 1, rx = 0, ry = 0, rz = 0, speed = 0 } = pose;
    worldEl.style.transform =
      `scale(${scale.toFixed(4)}) ` +
      `rotateZ(${(-rz).toFixed(3)}deg) rotateY(${(-ry).toFixed(3)}deg) rotateX(${(-rx).toFixed(3)}deg) ` +
      `translate3d(${(-x).toFixed(2)}px, ${(-y).toFixed(2)}px, ${(-z).toFixed(2)}px)`;

    const blurPx = clamp((speed - 380) * velocityBlur, 0, maxBlur);
    worldEl.style.filter = blurPx > 0.25 ? `blur(${blurPx.toFixed(2)}px)` : "none";
  }

  return { sample, apply };
}

/**
 * Shared Kinetic Radial Mechanical Rig (inspired by radial wheel motion design).
 * Places items along an arc; items near 0 deg gain peak focus weight & scale.
 */
export function radialWheelItem(index, total, rotationDeg, { radius = 520, stepDeg = 28 } = {}) {
  const angleDeg = index * stepDeg + rotationDeg;
  const rad = (angleDeg * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;
  const distFromFocus = Math.abs(angleDeg);
  const focusWeight = clamp(1 - distFromFocus / (stepDeg * 1.45), 0, 1);
  return { x, y, angleDeg, focusWeight };
}

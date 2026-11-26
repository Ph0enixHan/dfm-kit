/**
 * dfm-remotion.js (v0.9.1) — Declarative React / Remotion Style, Camera & Optical Lens Bridge for dfm-kit
 * Zero dependencies (no React import needed). Pure deterministic f(t) style & SVG filter helpers.
 * Copy alongside dfm-time.js & dfm-motion.js into src/dfm/ in any Remotion project.
 */

export {
  clamp,
  clamp01,
  lerp,
  invLerp,
  remap,
  seg,
  ease,
  hash,
  lerpColor,
  anticipationPop,
  whipPan,
  portalZoom,
  ambientDrift
} from "./dfm-time.js";

export { createWorldCamera, radialWheelItem, choreo } from "./dfm-motion.js";

import { clamp, clamp01, hash, seg, ease } from "./dfm-time.js";

/** Convert Remotion frame index + fps to deterministic seconds. */
export function frameToTime(frame, fps = 30) {
  return (Number(frame) || 0) / (Number(fps) || 30);
}

/** Posterize time to stepped stop-motion / Spider-Verse cadence (e.g. 8fps or 12fps). */
export function stepTime(t, fps = 12) {
  if (!fps || fps <= 0) return t;
  return Math.floor(t * fps) / fps;
}

/** Centered 3D camera rig container style for <div style={cameraRigStyle(...)}>. */
export function cameraRigStyle({ width = 1080, height = 1920, perspective = 1600 } = {}) {
  return {
    position: "absolute",
    left: Math.round(width / 2),
    top: Math.round(height / 2),
    width: 0,
    height: 0,
    perspective: `${perspective}px`,
    perspectiveOrigin: "0 0"
  };
}

/**
 * Declarative React style object matching createWorldCamera().apply().
 * Pass pose = worldCam.sample(t) directly into <div id="world" style={worldCameraStyle(pose)}>.
 */
export function worldCameraStyle(pose, { velocityBlur = 0.0022, maxBlur = 5.5 } = {}) {
  const { x = 0, y = 0, z = 0, scale = 1, rx = 0, ry = 0, rz = 0, speed = 0 } = pose || {};
  const transform =
    `scale(${scale.toFixed(4)}) ` +
    `rotateZ(${(-rz).toFixed(3)}deg) rotateY(${(-ry).toFixed(3)}deg) rotateX(${(-rx).toFixed(3)}deg) ` +
    `translate3d(${(-x).toFixed(2)}px, ${(-y).toFixed(2)}px, ${(-z).toFixed(2)}px)`;
  const blurPx = clamp((speed - 380) * velocityBlur, 0, maxBlur);
  return {
    position: "absolute",
    left: 0,
    top: 0,
    transformStyle: "preserve-3d",
    willChange: "transform, filter",
    transform,
    filter: blurPx > 0.25 ? `blur(${blurPx.toFixed(2)}px)` : "none"
  };
}

/** Declarative directional clip-path reveal + slide (replaces flat PPT fades). */
export function clipRevealStyle(progress, { dir = "up", distance = 36, fade = true } = {}) {
  const p = clamp01(progress);
  const inv = 1 - p;
  let clipPath = "inset(0% 0% 0% 0%)";
  let tx = 0;
  let ty = 0;
  if (dir === "up") {
    clipPath = `inset(0% 0% ${(inv * 100).toFixed(2)}% 0%)`;
    ty = inv * distance;
  } else if (dir === "down") {
    clipPath = `inset(${(inv * 100).toFixed(2)}% 0% 0% 0%)`;
    ty = -inv * distance;
  } else if (dir === "left") {
    clipPath = `inset(0% ${(inv * 100).toFixed(2)}% 0% 0%)`;
    tx = inv * distance;
  } else if (dir === "right") {
    clipPath = `inset(0% 0% 0% ${(inv * 100).toFixed(2)}%)`;
    tx = -inv * distance;
  }
  const style = {
    clipPath,
    transform: `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`
  };
  if (fade) {
    style.opacity = Number(clamp01(p * 1.4).toFixed(3));
  }
  return style;
}

/** Declarative mask slide reveal inside an overflow:hidden container. */
export function maskSlideStyle(progress, { dir = "up", percent = 108 } = {}) {
  const p = clamp01(progress);
  const inv = 1 - p;
  let transform = "translate3d(0, 0, 0)";
  if (dir === "up") {
    transform = `translate3d(0, ${(inv * percent).toFixed(2)}%, 0)`;
  } else if (dir === "down") {
    transform = `translate3d(0, ${(-inv * percent).toFixed(2)}%, 0)`;
  } else if (dir === "left") {
    transform = `translate3d(${(inv * percent).toFixed(2)}%, 0, 0)`;
  } else {
    transform = `translate3d(${(-inv * percent).toFixed(2)}%, 0, 0)`;
  }
  return {
    transform,
    opacity: Number(clamp01(p * 1.5).toFixed(3))
  };
}

/** Staggered eased progress [0, 1] for item index i. */
export function staggerProgress(index, t, { start = 0, itemDur = 0.55, step = 0.08, easeFn = ease.expoOut } = {}) {
  const s = start + index * step;
  return seg(t, s, s + itemDur, easeFn);
}

/** Deterministic handheld camera breathing style. */
export function handheldStyle(t, { ampX = 5, ampY = 4, ampRot = 0.35, speed = 1 } = {}) {
  const s = t * speed;
  const x = Math.sin(s * 1.73) * ampX * 0.6 + Math.cos(s * 3.11) * ampX * 0.4;
  const y = Math.cos(s * 1.41) * ampY * 0.65 + Math.sin(s * 2.87) * ampY * 0.35;
  const rot = Math.sin(s * 1.19 + 0.7) * ampRot;
  return {
    transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg)`
  };
}

/** Deterministic damped impact camera shock style at hitAt seconds. */
export function impactShakeStyle(t, hitAt, { power = 14, decay = 8.5, freq = 42, rotPower = 0.9 } = {}) {
  const dt = t - hitAt;
  if (dt < 0 || dt > 1.2) return { transform: "translate3d(0px, 0px, 0)" };
  const env = Math.exp(-dt * decay);
  const x = Math.sin(dt * freq * 1.07) * power * env;
  const y = Math.cos(dt * freq * 0.91 + 0.6) * power * 0.8 * env;
  const rot = Math.sin(dt * freq * 1.31) * rotPower * env;
  return {
    transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg)`
  };
}

/** Deterministic 16mm/35mm film gate weave micro-jitter & exposure breath style. */
export function gateWeaveStyle(t, { fps = 24, ampPx = 1.4, ampRot = 0.12, flicker = 0.025 } = {}) {
  const step = Math.floor(t * fps);
  const x = (hash(step * 13.7 + 1.1) - 0.5) * 2 * ampPx;
  const y = (hash(step * 29.3 + 4.7) - 0.5) * 2 * ampPx;
  const rot = (hash(step * 41.9 + 9.2) - 0.5) * 2 * ampRot;
  const opacity = 1 - hash(step * 53.1 + 2.3) * flicker;
  return {
    transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg)`,
    opacity: Number(opacity.toFixed(4))
  };
}

const SAFE_PRESET_RATIOS = {
  "social-strict": { top: 0.125, right: 0.14, bottom: 0.22, left: 0.06 },
  shorts: { top: 0.1, right: 0.11, bottom: 0.18, left: 0.055 },
  clean: { top: 0.08, right: 0.06, bottom: 0.08, left: 0.06 }
};

/** Compute platform safe-zone geometry and a ready-to-use absolute container style. */
export function safeAreaBox(width = 1080, height = 1920, preset = null) {
  const resolved =
    preset && SAFE_PRESET_RATIOS[preset] ? preset : height > width ? "social-strict" : "clean";
  const r = SAFE_PRESET_RATIOS[resolved];
  const top = Math.round(height * r.top);
  const right = Math.round(width * r.right);
  const bottom = Math.round(height * r.bottom);
  const left = Math.round(width * r.left);
  const safeWidth = width - left - right;
  const safeHeight = height - top - bottom;
  return {
    preset: resolved,
    top,
    right,
    bottom,
    left,
    safeWidth,
    safeHeight,
    style: {
      position: "absolute",
      left,
      top,
      width: safeWidth,
      height: safeHeight
    }
  };
}

/* ==========================================================================
 * Declarative Cinema Optical Lens & Tactile Texture Helpers (React / SVG)
 * ========================================================================== */

/** Directional split-axis motion blur SVG filter params (<feGaussianBlur stdDeviation={...} />). */
export function motionBlurFilterDef(id = "dfm-mb", dx = 0, dy = 0) {
  const bx = Math.max(0, Math.abs(Number(dx) || 0));
  const by = Math.max(0, Math.abs(Number(dy) || 0));
  const active = bx > 0.15 || by > 0.15;
  return {
    id,
    active,
    stdDeviation: `${bx.toFixed(2)} ${by.toFixed(2)}`,
    filterUrl: active ? `url(#${id})` : "none"
  };
}

/** Optical RGB chromatic aberration SVG filter offsets for <feOffset> R/B channel split. */
export function rgbSplitFilterDef(id = "dfm-rgb", px = 0, angleDeg = 0) {
  const amt = Math.max(0, Number(px) || 0);
  const rad = ((Number(angleDeg) || 0) * Math.PI) / 180;
  const dx = Math.cos(rad) * amt;
  const dy = Math.sin(rad) * amt;
  const active = amt > 0.15;
  return {
    id,
    active,
    dx: Number(dx.toFixed(2)),
    dy: Number(dy.toFixed(2)),
    filterUrl: active ? `url(#${id})` : "none"
  };
}

/** Macro shallow depth-of-field tilt-shift overlay style (place over stage with pointerEvents: none). */
export function tiltShiftOverlayStyle({ focusY = 50, bandPct = 28, blurPx = 4.5 } = {}) {
  const half = bandPct / 2;
  const f1 = clamp(focusY - half - 14, 0, 100);
  const f2 = clamp(focusY - half, 0, 100);
  const f3 = clamp(focusY + half, 0, 100);
  const f4 = clamp(focusY + half + 14, 0, 100);
  const mask = `linear-gradient(to bottom, #000 ${f1}%, transparent ${f2}%, transparent ${f3}%, #000 ${f4}%)`;
  return {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    backdropFilter: `blur(${blurPx}px)`,
    WebkitBackdropFilter: `blur(${blurPx}px)`,
    maskImage: mask,
    WebkitMaskImage: mask
  };
}

/** Cinema horizontal anamorphic optical streak flare style. */
export function anamorphicFlareStyle({ yPct = 50, color = "#ff7832", intensity = 0.65, heightPx = 56 } = {}) {
  const op = clamp01(intensity);
  return {
    position: "absolute",
    left: 0,
    right: 0,
    top: `${yPct}%`,
    height: heightPx,
    transform: "translateY(-50%)",
    pointerEvents: "none",
    mixBlendMode: "screen",
    opacity: Number(op.toFixed(3)),
    background: `radial-gradient(ellipse 68% 44% at 50% 50%, #ffffff 0%, ${color} 26%, transparent 72%)`
  };
}

/** Warm overexposure film-burn transition overlay style (p in [0, 1], peak at 0.5). */
export function filmBurnOverlayStyle(p, { color = "#ff5a1f", warmColor = "#ffd27d" } = {}) {
  const bell = Math.sin(clamp01(p) * Math.PI);
  return {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    mixBlendMode: "screen",
    opacity: Number(clamp01(bell * 1.05).toFixed(3)),
    background:
      `radial-gradient(circle at ${(30 + p * 40).toFixed(1)}% ${(45 - bell * 12).toFixed(1)}%, ` +
      `${warmColor} 0%, ${color} 42%, transparent 80%)`
  };
}

/** Hitchcock Vertigo dolly-zoom styles (counter-animates perspective vs scale). */
export function dollyZoomStyles(
  p,
  { fromPerspective = 2200, toPerspective = 680, fromScale = 0.88, toScale = 1.18 } = {}
) {
  const e = clamp01(p);
  const persp = fromPerspective + (toPerspective - fromPerspective) * e;
  const sc = fromScale + (toScale - fromScale) * e;
  return {
    stageStyle: { perspective: `${persp.toFixed(1)}px` },
    contentStyle: { transform: `scale(${sc.toFixed(4)})` }
  };
}

/** High-velocity snap crash-zoom style with coupled directional blur. */
export function crashZoomStyle(t, start, dur = 0.36, { fromScale = 1, toScale = 2.6, blurMax = 10 } = {}) {
  const p = seg(t, start, start + dur, ease.expoInOut);
  const sc = fromScale + (toScale - fromScale) * p;
  const vel = Math.sin(p * Math.PI);
  const blur = vel * blurMax;
  return {
    transform: `scale(${sc.toFixed(4)})`,
    filter: blur > 0.25 ? `blur(${blur.toFixed(2)}px)` : "none"
  };
}

/**
 * Ground-matched tactile texture overlay style with visible minimum tactility.
 * Prevents dead/invisible (<0.10) texture overlays: dark grounds default to screen @ 0.24,
 * light grounds default to multiply @ 0.34.
 */
export function textureOverlayStyle({ ground = "dark", blendMode = null, opacity = null } = {}) {
  const isLight = ground === "light";
  const resolvedBlend = blendMode || (isLight ? "multiply" : "screen");
  const rawOp = typeof opacity === "number" ? opacity : isLight ? 0.34 : 0.24;
  const safeOp = clamp(rawOp, 0.14, 0.85);
  return {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    pointerEvents: "none",
    mixBlendMode: resolvedBlend,
    opacity: Number(safeOp.toFixed(3))
  };
}

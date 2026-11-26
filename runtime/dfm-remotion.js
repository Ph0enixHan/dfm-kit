/**
 * dfm-remotion.js (v0.9.0) — Declarative React / Remotion Style & Camera Bridge for dfm-kit
 * Zero dependencies (no React import needed). Pure deterministic f(t) style objects.
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

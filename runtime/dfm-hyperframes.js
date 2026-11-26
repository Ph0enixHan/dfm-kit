/**
 * dfm-hyperframes.js (v1.0.0) — Deterministic Camera, Timeline & Safe-Zone Bridge for HyperFrames
 * Zero dependencies. Works natively alongside GSAP (paused timelines) OR as a pure seekable
 * timeline registered on window.__timelines["<composition-id>"].
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

import { clamp } from "./dfm-time.js";

/**
 * Creates a pure deterministic HyperFrames-compatible seekable timeline without requiring GSAP.
 * Automatically registers on window.__timelines[id] and renders at t=0 immediately.
 * Compatible with HyperFrames CLI/Studio seeking AND dfm-kit CDP checks.
 */
export function createDfmTimeline({ id = "main", duration = 6, render }) {
  if (typeof render !== "function") {
    throw new Error("createDfmTimeline requires a render(t, info) function");
  }
  const totalDur = Math.max(0.01, Number(duration) || 6);
  let currentTime = 0;

  function applyAt(t) {
    currentTime = clamp(Number(t) || 0, 0, totalDur);
    render(currentTime, { duration: totalDur, progress: currentTime / totalDur });
    return tl;
  }

  const tl = {
    _isDfmTimeline: true,
    duration: () => totalDur,
    totalDuration: () => totalDur,
    time(t) {
      if (typeof t === "number") return applyAt(t);
      return currentTime;
    },
    seek(t) {
      return applyAt(t);
    },
    pause(t) {
      if (typeof t === "number") return applyAt(t);
      return tl;
    },
    progress(p) {
      if (typeof p === "number") return applyAt(clamp(p, 0, 1) * totalDur);
      return currentTime / totalDur;
    }
  };

  if (typeof window !== "undefined") {
    window.__timelines = window.__timelines || {};
    window.__timelines[id] = tl;
    if (typeof window.__hfForceTimelineRebind === "function") {
      try {
        window.__hfForceTimelineRebind();
      } catch {
        /* ignore */
      }
    }
  }

  applyAt(0);
  return tl;
}

/**
 * Binds a dfm-kit createWorldCamera() rig into a paused GSAP timeline cleanly.
 * Uses a deterministic proxy tween so seeking tl.time(t) always computes exact camera pose + velocity blur.
 */
export function bindWorldCameraToGsap(tl, worldEl, worldCam, duration, applyOpts = {}) {
  const proxy = { t: 0 };
  const update = () => {
    const pose = worldCam.sample(proxy.t);
    worldCam.apply(worldEl, pose, applyOpts);
  };
  tl.to(
    proxy,
    {
      t: duration,
      duration,
      ease: "none",
      onUpdate: update
    },
    0
  );
  update();
  return tl;
}

const SAFE_PRESET_RATIOS = {
  "social-strict": { top: 0.125, right: 0.14, bottom: 0.22, left: 0.06 },
  shorts: { top: 0.1, right: 0.11, bottom: 0.18, left: 0.055 },
  clean: { top: 0.08, right: 0.06, bottom: 0.08, left: 0.06 }
};

/** Compute platform safe-zone insets in pixels for positioning primary copy cleanly. */
export function safeAreaInsets(width = 1080, height = 1920, preset = null) {
  const resolved =
    preset && SAFE_PRESET_RATIOS[preset] ? preset : height > width ? "social-strict" : "clean";
  const r = SAFE_PRESET_RATIOS[resolved];
  const top = Math.round(height * r.top);
  const right = Math.round(width * r.right);
  const bottom = Math.round(height * r.bottom);
  const left = Math.round(width * r.left);
  return {
    preset: resolved,
    top,
    right,
    bottom,
    left,
    safeWidth: width - left - right,
    safeHeight: height - top - bottom
  };
}

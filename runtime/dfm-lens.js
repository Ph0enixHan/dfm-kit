/**
 * dfm-lens.js — Complete Optional Deterministic Cinema Lens & Optical Kit for OpenFilm
 * Zero dependencies. Zero style lock-in. Applies real optical effects directly to live HTML/SVG DOM:
 *
 * Optical Lenses (DOM / SVG Filters):
 *   1. lens.motionBlur(el, dx, dy)             — Split-axis X/Y directional shutter blur
 *   2. lens.rgbSplit(el, px, deg)              — Optical RGB chromatic aberration
 *   3. lens.fisheye(el, strength)              — Barrel (+strength) / Pincushion (-strength) warp
 *   4. lens.flutedGlass(el, strength, opts)    — Vertical ribbed/fluted architectural glass refraction
 *   5. lens.tiltShift(container, opts)         — Macro shallow depth-of-field focal band
 *   6. lens.anamorphicFlare(container, opts)   — Cinema horizontal optical streak flare
 *   7. lens.filmBurn(container, p, opts)       — Warm overexposure film-burn transition wipe
 *
 * Camera Physics & Timing:
 *   8. lens.stepTime(t, fps)                   — Posterize Time (8/12fps stop-motion / Spider-Verse cadence)
 *   9. lens.handheld(t, opts)                  — Deterministic multi-frequency handheld breathing
 *  10. lens.impactShake(t, hitAt, opts)        — Deterministic damped impact camera shock
 *  11. lens.gateWeave(t, opts)                 — 16mm/35mm projector micro-jitter & exposure breath
 *  12. lens.dollyZoom(stage, el, p, opts)      — Hitchcock Vertigo perspective-vs-scale zoom
 *  13. lens.crashZoom(el, t, start, dur, opts) — High-velocity snap zoom with optional optical burst
 */

const SVG_NS = "http://www.w3.org/2000/svg";
let svgHost = null;
let uidCounter = 1;
const elementFilters = new WeakMap();
const fisheyeMapCache = new Map();
const flutedMapCache = new Map();

function ensureSvgHost() {
  if (svgHost && document.body.contains(svgHost)) return svgHost;
  svgHost = document.createElementNS(SVG_NS, "svg");
  svgHost.setAttribute("width", "0");
  svgHost.setAttribute("height", "0");
  svgHost.setAttribute("aria-hidden", "true");
  svgHost.style.position = "fixed";
  svgHost.style.left = "-9999px";
  svgHost.style.top = "-9999px";
  svgHost.style.pointerEvents = "none";
  const defs = document.createElementNS(SVG_NS, "defs");
  svgHost.appendChild(defs);
  document.body.appendChild(svgHost);
  return svgHost;
}

function getDefs() {
  return ensureSvgHost().querySelector("defs");
}

function getOrCreateFilterState(el, kind, factory) {
  let map = elementFilters.get(el);
  if (!map) {
    map = new Map();
    elementFilters.set(el, map);
  }
  if (!map.has(kind)) {
    const id = `dfm-lens-${kind}-${uidCounter++}`;
    const state = factory(id);
    map.set(kind, { id, ...state });
  }
  return map.get(kind);
}

function detHash(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function buildFisheyeMapDataUrl(size = 256) {
  if (fisheyeMapCache.has(size)) return fisheyeMapCache.get(size);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    const ny = (y / (size - 1)) * 2 - 1;
    for (let x = 0; x < size; x++) {
      const nx = (x / (size - 1)) * 2 - 1;
      const r = Math.hypot(nx, ny);
      let dx = 0;
      let dy = 0;
      if (r > 0.0001) {
        const clampedR = Math.min(r, 1.35);
        const factor = clampedR * clampedR * 0.48;
        dx = nx * factor;
        dy = ny * factor;
      }
      const idx = (y * size + x) * 4;
      d[idx] = Math.max(0, Math.min(255, Math.round(128 + dx * 127)));
      d[idx + 1] = Math.max(0, Math.min(255, Math.round(128 + dy * 127)));
      d[idx + 2] = 128;
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL("image/png");
  fisheyeMapCache.set(size, url);
  return url;
}

/**
 * Generates a vertical cylindrical fluted/ribbed glass refraction map (sawtooth/sine prism ribs).
 */
function buildFlutedGlassMapDataUrl(ribs = 28, width = 512) {
  const key = `${ribs}-${width}`;
  if (flutedMapCache.has(key)) return flutedMapCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 4;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(width, 4);
  const d = img.data;

  for (let x = 0; x < width; x++) {
    const u = (x / width) * ribs;
    const frac = u - Math.floor(u); // [0, 1) within one glass flute
    // Cylindrical lens normal across each flute
    const dx = Math.sin((frac - 0.5) * Math.PI);
    const rVal = Math.max(0, Math.min(255, Math.round(128 + dx * 124)));
    for (let y = 0; y < 4; y++) {
      const idx = (y * width + x) * 4;
      d[idx] = rVal;
      d[idx + 1] = 128;
      d[idx + 2] = 128;
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL("image/png");
  flutedMapCache.set(key, url);
  return url;
}

export const lens = {
  /**
   * 1. True Directional Shutter Motion Blur (X and Y blur radii independent!)
   */
  motionBlur(el, dx = 0, dy = 0) {
    if (!el) return;
    const bx = Math.max(0, Number(dx) || 0);
    const by = Math.max(0, Number(dy) || 0);
    if (bx < 0.2 && by < 0.2) {
      el.style.filter = "none";
      return;
    }
    const st = getOrCreateFilterState(el, "mblur", (id) => {
      const filter = document.createElementNS(SVG_NS, "filter");
      filter.setAttribute("id", id);
      filter.setAttribute("x", "-20%");
      filter.setAttribute("y", "-20%");
      filter.setAttribute("width", "140%");
      filter.setAttribute("height", "140%");
      const blur = document.createElementNS(SVG_NS, "feGaussianBlur");
      blur.setAttribute("in", "SourceGraphic");
      blur.setAttribute("stdDeviation", "0 0");
      filter.appendChild(blur);
      getDefs().appendChild(filter);
      return { filter, blur };
    });
    st.blur.setAttribute("stdDeviation", `${bx.toFixed(2)} ${by.toFixed(2)}`);
    el.style.filter = `url(#${st.id})`;
  },

  /**
   * 2. Optical Chromatic Aberration / RGB Split directly on live HTML DOM.
   */
  rgbSplit(el, amountPx = 0, angleDeg = 0) {
    if (!el) return;
    const amt = Math.max(0, Number(amountPx) || 0);
    if (amt < 0.2) {
      el.style.filter = "none";
      return;
    }
    const rad = (angleDeg * Math.PI) / 180;
    const dx = Math.cos(rad) * amt;
    const dy = Math.sin(rad) * amt;

    const st = getOrCreateFilterState(el, "rgb", (id) => {
      const filter = document.createElementNS(SVG_NS, "filter");
      filter.setAttribute("id", id);
      filter.setAttribute("x", "-10%");
      filter.setAttribute("y", "-10%");
      filter.setAttribute("width", "120%");
      filter.setAttribute("height", "120%");
      filter.setAttribute("color-interpolation-filters", "sRGB");

      const mR = document.createElementNS(SVG_NS, "feColorMatrix");
      mR.setAttribute("in", "SourceGraphic");
      mR.setAttribute("type", "matrix");
      mR.setAttribute("values", "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0");
      mR.setAttribute("result", "rCh");

      const offR = document.createElementNS(SVG_NS, "feOffset");
      offR.setAttribute("in", "rCh");
      offR.setAttribute("result", "rShift");

      const mG = document.createElementNS(SVG_NS, "feColorMatrix");
      mG.setAttribute("in", "SourceGraphic");
      mG.setAttribute("type", "matrix");
      mG.setAttribute("values", "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0");
      mG.setAttribute("result", "gCh");

      const mB = document.createElementNS(SVG_NS, "feColorMatrix");
      mB.setAttribute("in", "SourceGraphic");
      mB.setAttribute("type", "matrix");
      mB.setAttribute("values", "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0");
      mB.setAttribute("result", "bCh");

      const offB = document.createElementNS(SVG_NS, "feOffset");
      offB.setAttribute("in", "bCh");
      offB.setAttribute("result", "bShift");

      const blendRG = document.createElementNS(SVG_NS, "feBlend");
      blendRG.setAttribute("in", "rShift");
      blendRG.setAttribute("in2", "gCh");
      blendRG.setAttribute("mode", "screen");
      blendRG.setAttribute("result", "rg");

      const blendAll = document.createElementNS(SVG_NS, "feBlend");
      blendAll.setAttribute("in", "rg");
      blendAll.setAttribute("in2", "bShift");
      blendAll.setAttribute("mode", "screen");

      filter.append(mR, offR, mG, mB, offB, blendRG, blendAll);
      getDefs().appendChild(filter);
      return { filter, offR, offB };
    });

    st.offR.setAttribute("dx", dx.toFixed(2));
    st.offR.setAttribute("dy", dy.toFixed(2));
    st.offB.setAttribute("dx", (-dx).toFixed(2));
    st.offB.setAttribute("dy", (-dy).toFixed(2));
    el.style.filter = `url(#${st.id})`;
  },

  /**
   * 3. DOM-Native Fisheye (+strength = convex barrel) or Pincushion (-strength = concave).
   */
  fisheye(el, strength = 95) {
    if (!el) return;
    const scale = Number(strength) || 0;
    if (Math.abs(scale) < 0.5) {
      el.style.filter = "none";
      return;
    }
    const st = getOrCreateFilterState(el, "fisheye", (id) => {
      const filter = document.createElementNS(SVG_NS, "filter");
      filter.setAttribute("id", id);
      filter.setAttribute("x", "0%");
      filter.setAttribute("y", "0%");
      filter.setAttribute("width", "100%");
      filter.setAttribute("height", "100%");
      filter.setAttribute("color-interpolation-filters", "sRGB");

      const feImg = document.createElementNS(SVG_NS, "feImage");
      feImg.setAttribute("href", buildFisheyeMapDataUrl(256));
      feImg.setAttribute("preserveAspectRatio", "none");
      feImg.setAttribute("result", "uvMap");

      const disp = document.createElementNS(SVG_NS, "feDisplacementMap");
      disp.setAttribute("in", "SourceGraphic");
      disp.setAttribute("in2", "uvMap");
      disp.setAttribute("xChannelSelector", "R");
      disp.setAttribute("yChannelSelector", "G");
      disp.setAttribute("scale", String(scale));

      filter.append(feImg, disp);
      getDefs().appendChild(filter);
      return { filter, disp };
    });
    st.disp.setAttribute("scale", scale.toFixed(1));
    el.style.filter = `url(#${st.id})`;
  },

  /**
   * 4. Fluted / Ribbed Architectural Glass Refraction directly on live HTML DOM!
   * strength: displacement px (e.g. 18-55), ribs: number of vertical glass flutes (e.g. 20-40).
   */
  flutedGlass(el, strength = 32, { ribs = 26 } = {}) {
    if (!el) return;
    const scale = Math.max(0, Number(strength) || 0);
    if (scale < 0.5) {
      el.style.filter = "none";
      return;
    }
    const st = getOrCreateFilterState(el, `fluted-${ribs}`, (id) => {
      const filter = document.createElementNS(SVG_NS, "filter");
      filter.setAttribute("id", id);
      filter.setAttribute("x", "-5%");
      filter.setAttribute("y", "0%");
      filter.setAttribute("width", "110%");
      filter.setAttribute("height", "100%");
      filter.setAttribute("color-interpolation-filters", "sRGB");

      const feImg = document.createElementNS(SVG_NS, "feImage");
      feImg.setAttribute("href", buildFlutedGlassMapDataUrl(ribs, 512));
      feImg.setAttribute("preserveAspectRatio", "none");
      feImg.setAttribute("result", "fluteMap");

      const disp = document.createElementNS(SVG_NS, "feDisplacementMap");
      disp.setAttribute("in", "SourceGraphic");
      disp.setAttribute("in2", "fluteMap");
      disp.setAttribute("xChannelSelector", "R");
      disp.setAttribute("yChannelSelector", "G");
      disp.setAttribute("scale", String(scale));

      filter.append(feImg, disp);
      getDefs().appendChild(filter);
      return { filter, disp };
    });
    st.disp.setAttribute("scale", scale.toFixed(1));
    el.style.filter = `url(#${st.id})`;
  },

  /**
   * 5. Tilt-Shift / Macro Shallow Depth-of-Field Overlay.
   */
  tiltShift(containerEl, { focusY = 50, band = 22, blurPx = 10 } = {}) {
    if (!containerEl) return;
    let overlay = containerEl.querySelector(".dfm-tiltshift-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "dfm-tiltshift-overlay";
      overlay.style.position = "absolute";
      overlay.style.inset = "0";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "780";
      containerEl.appendChild(overlay);
    }
    const topEdge = Math.max(0, focusY - band);
    const botEdge = Math.min(100, focusY + band);
    const mask = `linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${Math.max(0, topEdge - 14)}%, rgba(0,0,0,0) ${topEdge}%, rgba(0,0,0,0) ${botEdge}%, rgba(0,0,0,1) ${Math.min(100, botEdge + 14)}%, rgba(0,0,0,1) 100%)`;
    overlay.style.backdropFilter = `blur(${blurPx.toFixed(1)}px)`;
    overlay.style.webkitBackdropFilter = `blur(${blurPx.toFixed(1)}px)`;
    overlay.style.maskImage = mask;
    overlay.style.webkitMaskImage = mask;
  },

  /**
   * 6. Cinema Anamorphic Horizontal Streak Flare (blue or amber optical flare bar).
   */
  anamorphicFlare(containerEl, { yPct = 50, xPct = 50, color = "#5eb5ff", intensity = 0.75, widthPct = 92 } = {}) {
    if (!containerEl) return;
    let flare = containerEl.querySelector(".dfm-anamorphic-flare");
    if (!flare) {
      flare = document.createElement("div");
      flare.className = "dfm-anamorphic-flare";
      flare.setAttribute("data-bleed", "true");
      flare.style.position = "absolute";
      flare.style.inset = "0";
      flare.style.pointerEvents = "none";
      flare.style.mixBlendMode = "screen";
      flare.style.zIndex = "790";
      containerEl.appendChild(flare);
    }
    const op = Math.max(0, Math.min(1, intensity));
    flare.style.opacity = op.toFixed(3);
    flare.style.background =
      `radial-gradient(${(widthPct * 0.52).toFixed(1)}% 3.2px at ${xPct}% ${yPct}%, #ffffff 0%, ${color} 28%, transparent 100%),` +
      `radial-gradient(${(widthPct * 0.45).toFixed(1)}% 28px at ${xPct}% ${yPct}%, ${color}66 0%, transparent 100%),` +
      `radial-gradient(160px 160px at ${xPct}% ${yPct}%, ${color}44 0%, transparent 72%)`;
  },

  /**
   * 7. Organic Film Burn / Light-Leak Overexposure Wipe (p in [0, 1], peaks at 0.5).
   */
  filmBurn(containerEl, p = 0, { color = "#eb5e28", hotCore = "#fff3d6" } = {}) {
    if (!containerEl) return;
    let burn = containerEl.querySelector(".dfm-film-burn");
    if (!burn) {
      burn = document.createElement("div");
      burn.className = "dfm-film-burn";
      burn.setAttribute("data-bleed", "true");
      burn.style.position = "absolute";
      burn.style.inset = "0";
      burn.style.pointerEvents = "none";
      burn.style.mixBlendMode = "screen";
      burn.style.zIndex = "860";
      containerEl.appendChild(burn);
    }
    const clamped = Math.max(0, Math.min(1, p));
    const envelope = Math.sin(clamped * Math.PI);
    burn.style.opacity = envelope.toFixed(3);
    const xPos = 15 + clamped * 70;
    burn.style.background =
      `radial-gradient(circle at ${xPos.toFixed(1)}% 48%, ${hotCore} 0%, ${color} 42%, rgba(140,18,8,0.65) 75%, transparent 100%)`;
  },

  /**
   * 8. Posterize Time — quantizes smooth time t into 8fps / 12fps stop-motion cadence.
   */
  stepTime(t, fps = 12) {
    if (fps <= 0) return t;
    return Math.floor(t * fps) / fps;
  },

  /**
   * 9. Deterministic Multi-Frequency Handheld Camera Breathing.
   */
  handheld(t, { ampX = 8, ampY = 6, ampRot = 0.45, speed = 1.0, seed = 1.0 } = {}) {
    const s = t * speed + seed * 7.3;
    const x = (Math.sin(s * 1.3) * 0.6 + Math.sin(s * 2.9 + 1.1) * 0.4) * ampX;
    const y = (Math.cos(s * 1.1 + 0.5) * 0.65 + Math.sin(s * 2.4 + 2.2) * 0.35) * ampY;
    const rot = (Math.sin(s * 0.9 + 1.8) * 0.7 + Math.cos(s * 2.1) * 0.3) * ampRot;
    return { x, y, rot };
  },

  /**
   * 10. Deterministic Damped Impact Camera Shake.
   */
  impactShake(t, hitAt, { power = 22, decay = 12, freq = 58 } = {}) {
    const dt = t - hitAt;
    if (dt < 0 || dt > 0.75) return { x: 0, y: 0, rot: 0 };
    const env = Math.exp(-dt * decay);
    return {
      x: Math.sin(dt * freq) * power * env,
      y: Math.cos(dt * freq * 1.27) * power * 0.75 * env,
      rot: Math.sin(dt * freq * 0.85) * (power * 0.08) * env
    };
  },

  /**
   * 11. Authentic 16mm/35mm Film Projector Gate Weave + Micro Exposure Flicker.
   */
  gateWeave(t, { amp = 2.4, flicker = 0.04, fps = 24 } = {}) {
    const f = Math.floor(t * fps);
    return {
      x: (detHash(f * 1.73) - 0.5) * 2 * amp,
      y: (detHash(f * 3.91) - 0.5) * 2 * amp,
      brightness: 1 + (detHash(f * 7.13) - 0.5) * 2 * flicker
    };
  },

  /**
   * 12. Hitchcock Dolly-Zoom helper.
   */
  dollyZoom(stageEl, contentEl, p, { fromPersp = 1800, toPersp = 460, fromScale = 1.0, toScale = 1.24 } = {}) {
    const k = Math.max(0, Math.min(1, p));
    const persp = fromPersp + (toPersp - fromPersp) * k;
    const sc = fromScale + (toScale - fromScale) * k;
    if (stageEl) stageEl.style.perspective = `${persp.toFixed(0)}px`;
    if (contentEl) contentEl.style.transform = `scale(${sc.toFixed(4)})`;
  },

  /**
   * 13. High-velocity Crash Zoom (snap zoom over 0.16-0.25s with synchronized shutter burst).
   */
  crashZoom(el, t, start, dur = 0.22, { fromScale = 1.0, toScale = 1.48, blurMax = 14 } = {}) {
    if (!el) return;
    const raw = Math.max(0, Math.min(1, (t - start) / Math.max(0.001, dur)));
    const eased = raw === 1 ? 1 : 1 - Math.pow(2, -10 * raw);
    const sc = fromScale + (toScale - fromScale) * eased;
    const burst = Math.sin(raw * Math.PI);
    el.style.transform = `scale(${sc.toFixed(4)})`;
    if (burst > 0.05 && raw > 0 && raw < 1) {
      lens.motionBlur(el, burst * blurMax, burst * blurMax * 0.45);
    } else {
      lens.motionBlur(el, 0, 0);
    }
  }
};

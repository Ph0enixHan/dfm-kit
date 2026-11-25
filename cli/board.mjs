/**
 * board.mjs (v0.3 — Fast All-in-One Review Board + Optional Full 5-Board Visual Microscope)
 *
 * Default Fast Mode (dfm check <dir>):
 *   - Captures downscaled JPEG frames (0.5x scale, 3 key frames per beat, reuses Hero frame)
 *   - Full native-resolution DOM safe-zone / clipping check (100% accurate geometry)
 *   - Produces ONE compact high-density `review-board.png` combining:
 *       Hero Frame + Safe-zone overlay + Grayscale Value thumbnail + 3-Frame Motion Strip +
 *       Whole-film & Per-shot Movie Color Barcode + OKLCH Swatches + Motion Δ / Value Δ badges
 *   - 3x-6x faster execution AND 5x fewer multimodal image tokens for AI agents!
 *
 * Full Mode (dfm check <dir> --full):
 *   - Also outputs all 5 classic standalone HD boards (design-board, value-board, color-board,
 *     motion-strip, layout-debug) and individual hero-*.png stills.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchHeadlessBrowser, startStaticServer } from "./cdp-browser.mjs";
import { rgbToHex, rgbToOklch } from "./color-math.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function discoverProject(projectDir) {
  const absProject = path.resolve(projectDir);
  if (!fs.existsSync(absProject)) {
    throw new Error(`Project directory not found: ${absProject}`);
  }

  const briefPath = path.join(absProject, "brief.json");
  const brief = fs.existsSync(briefPath) ? JSON.parse(fs.readFileSync(briefPath, "utf8")) : null;

  let shots = [];
  if (brief?.shots?.length) {
    shots = brief.shots.map((s, idx) => ({
      index: idx + 1,
      id: s.id || `shot-${idx + 1}`,
      file: s.file,
      role: s.role || "hero",
      shotType: s.shotType || "custom",
      symmetry: s.symmetry || "mixed",
      focalPoint: s.focalPoint || "",
      energy: typeof s.energy === "number" ? s.energy : 50,
      start: typeof s.start === "number" ? s.start : 0,
      duration: s.duration || 3,
      heroAt: typeof s.heroAt === "number" ? s.heroAt : null
    }));
  } else {
    const htmlFiles = fs
      .readdirSync(absProject)
      .filter((f) => /^(shot|scene).*\.(html|htm)$/i.test(f))
      .sort();
    shots = htmlFiles.map((file, idx) => ({
      index: idx + 1,
      id: file.replace(/\.(html|htm)$/i, ""),
      file,
      role: idx === 0 ? "establishing" : "hero",
      shotType: "custom",
      symmetry: "mixed",
      focalPoint: "",
      energy: 50,
      start: 0,
      duration: 3,
      heroAt: null
    }));
  }

  if (!shots.length) {
    throw new Error(`No shot*.html / scene*.html or brief.json shots found in ${absProject}`);
  }

  const width = brief?.format?.width || 1920;
  const height = brief?.format?.height || 1080;

  return { absProject, brief, shots, width, height };
}

function toDataUrl(buf, mime = "image/jpeg") {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/**
 * Pixel-level luminance (Q7), color palette quantization (Q8), chroma buckets,
 * and negative space estimation inside headless Chromium canvas.
 */
async function analyzeImagePixels(browser, imgBuffer, mime = "image/jpeg") {
  const dataUrl = toDataUrl(imgBuffer, mime);
  const raw = await browser.evalJS(`(async () => {
    const img = new Image();
    img.src = ${JSON.stringify(dataUrl)};
    await img.decode();
    const scale = Math.min(1, 320 / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const total = w * h;

    const cornerIndices = [0, (w - 1) * 4, ((h - 1) * w) * 4, ((h - 1) * w + (w - 1)) * 4];
    const cornerColors = cornerIndices.map((c) => [data[c], data[c + 1], data[c + 2]]);

    const hist = new Uint32Array(256);
    const buckets = new Map();
    let lumaSum = 0;
    let activePixels = 0;
    let lowSat = 0, midSat = 0, highSat = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const luma = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
      hist[luma]++;
      lumaSum += luma;

      let minDistBg = 999;
      for (const [cr, cg, cb] of cornerColors) {
        const d = Math.abs(r - cr) + Math.abs(g - cg) + Math.abs(b - cb);
        if (d < minDistBg) minDistBg = d;
      }
      if (minDistBg > 48) activePixels++;

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
      if (sat < 0.22 || maxC < 32) lowSat++;
      else if (sat < 0.62) midSat++;
      else highSat++;

      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let entry = buckets.get(key);
      if (!entry) {
        entry = { count: 0, r: 0, g: 0, b: 0 };
        buckets.set(key, entry);
      }
      entry.count++;
      entry.r += r;
      entry.g += g;
      entry.b += b;
    }

    function percentile(p) {
      const target = total * p;
      let acc = 0;
      for (let v = 0; v < 256; v++) {
        acc += hist[v];
        if (acc >= target) return v;
      }
      return 255;
    }

    const p005 = percentile(0.005);
    const p50 = percentile(0.50);
    const p995 = percentile(0.995);

    const bins32 = [];
    for (let b = 0; b < 32; b++) {
      let s = 0;
      for (let k = 0; k < 8; k++) s += hist[b * 8 + k];
      bins32.push(Number((s / total).toFixed(4)));
    }

    const sorted = [...buckets.values()]
      .map((e) => ({
        count: e.count,
        r: Math.round(e.r / e.count),
        g: Math.round(e.g / e.count),
        b: Math.round(e.b / e.count)
      }))
      .sort((a, b) => b.count - a.count);

    const merged = [];
    for (const c of sorted) {
      let hit = null;
      for (const m of merged) {
        if (Math.hypot(c.r - m.r, c.g - m.g, c.b - m.b) < 42) {
          hit = m;
          break;
        }
      }
      if (hit) {
        const nc = hit.count + c.count;
        hit.r = Math.round((hit.r * hit.count + c.r * c.count) / nc);
        hit.g = Math.round((hit.g * hit.count + c.g * c.count) / nc);
        hit.b = Math.round((hit.b * hit.count + c.b * c.count) / nc);
        hit.count = nc;
      } else {
        merged.push({ ...c });
      }
      if (merged.length >= 16) break;
    }
    merged.sort((a, b) => b.count - a.count);

    return {
      meanLuma: Number((lumaSum / total).toFixed(1)),
      p005,
      p50,
      p995,
      valueDynamicRange: p995 - p005,
      activeAreaPct: Number(((activePixels / total) * 100).toFixed(1)),
      negativeSpacePct: Number((100 - (activePixels / total) * 100).toFixed(1)),
      satBuckets: {
        lowPct: Number(((lowSat / total) * 100).toFixed(1)),
        midPct: Number(((midSat / total) * 100).toFixed(1)),
        highPct: Number(((highSat / total) * 100).toFixed(1))
      },
      bins32,
      dominantRaw: merged.slice(0, 5).map((c) => ({
        r: c.r,
        g: c.g,
        b: c.b,
        pct: Number(((c.count / total) * 100).toFixed(1))
      }))
    };
  })()`);

  const dominantColors = raw.dominantRaw.map((c) => ({
    hex: rgbToHex(c.r, c.g, c.b),
    pct: c.pct,
    oklch: rgbToOklch(c.r, c.g, c.b)
  }));

  return {
    ...raw,
    highSatPct: raw.satBuckets.highPct,
    dominantColors
  };
}

/**
 * Computes average inter-frame pixel delta across captured frames.
 */
async function computeMotionDelta(browser, imgBuffers, mime = "image/jpeg") {
  if (imgBuffers.length < 2) return 0;
  const urls = imgBuffers.map((b) => toDataUrl(b, mime));
  return browser.evalJS(`(async () => {
    const urls = ${JSON.stringify(urls)};
    const imgs = await Promise.all(urls.map(async (u) => {
      const i = new Image();
      i.src = u;
      await i.decode();
      return i;
    }));
    const w = 160, h = Math.max(1, Math.round((imgs[0].height / imgs[0].width) * 160));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const frames = imgs.map((im) => {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(im, 0, 0, w, h);
      return new Uint8ClampedArray(ctx.getImageData(0, 0, w, h).data);
    });
    let totalDiff = 0;
    const pairs = frames.length - 1;
    for (let k = 0; k < pairs; k++) {
      const a = frames[k], b = frames[k + 1];
      let sum = 0;
      for (let i = 0; i < a.length; i += 4) {
        sum += (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3;
      }
      totalDiff += sum / (w * h);
    }
    return Number((totalDiff / pairs).toFixed(2));
  })()`);
}

/**
 * Style-agnostic DOM geometry check — runs at full native resolution.
 */
export async function measureShotDom(browser, width, height) {
  return browser.evalJS(`(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const safeTop = parseFloat(rootStyle.getPropertyValue('--safe-top')) || Math.round(${height} * 0.08);
    const safeRight = parseFloat(rootStyle.getPropertyValue('--safe-right')) || Math.round(${width} * 0.06);
    const safeBottom = parseFloat(rootStyle.getPropertyValue('--safe-bottom')) || Math.round(${height} * 0.08);
    const safeLeft = parseFloat(rootStyle.getPropertyValue('--safe-left')) || Math.round(${width} * 0.06);

    const safeBox = {
      left: safeLeft,
      top: safeTop,
      right: ${width} - safeRight,
      bottom: ${height} - safeBottom
    };

    function isEffectivelyVisible(el) {
      let cur = el;
      let accOp = 1;
      while (cur && cur !== document.documentElement) {
        const st = getComputedStyle(cur);
        if (st.display === 'none' || st.visibility === 'hidden') return false;
        accOp *= parseFloat(st.opacity);
        if (accOp < 0.08) return false;
        cur = cur.parentElement;
      }
      return true;
    }

    const planes = [...document.querySelectorAll('.dfm-plane[data-plane]')].map((el) =>
      el.getAttribute('data-plane')
    );
    const hasFinishing = Boolean(document.querySelector('.dfm-finishing'));

    const allEls = [...document.querySelectorAll('h1,h2,h3,h4,p,span,div,svg,figure,img,hr')];
    const boxes = [];
    const fontSizes = [];
    const safeViolations = [];
    const viewportClips = [];

    for (const el of allEls) {
      if (el.closest('.dfm-finishing')) continue;
      if (el.classList.contains('dfm-stage') || el.classList.contains('dfm-camera') || el.classList.contains('dfm-plane') || el.classList.contains('dfm-safe') || el.classList.contains('dfm-world')) continue;
      if (!isEffectivelyVisible(el)) continue;

      const planeEl = el.closest('.dfm-plane[data-plane]');
      const planeName = planeEl ? planeEl.getAttribute('data-plane') : 'mg';
      const isBleed = el.hasAttribute('data-bleed') || Boolean(el.closest('[data-bleed="true"]')) || planeName === 'ebg' || planeName === 'bg';

      const hasDirectText = [...el.childNodes].some(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0
      );
      const isFocal = el.hasAttribute('data-focal') || el.hasAttribute('data-element');
      if (!hasDirectText && !isFocal) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      if (rect.right < -10 || rect.left > ${width} + 10 || rect.bottom < -10 || rect.top > ${height} + 10) continue;

      const label = hasDirectText ? el.textContent.trim().slice(0, 24) : (el.getAttribute('data-element') || el.tagName.toLowerCase());
      const style = getComputedStyle(el);
      if (hasDirectText && !isBleed) {
        const fsPx = parseFloat(style.fontSize);
        if (fsPx > 0) fontSizes.push(fsPx);
      }

      const box = {
        label,
        plane: planeName,
        bleed: isBleed,
        focal: isFocal,
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        violation: false
      };

      if (!isBleed) {
        const clipped =
          rect.left < -6 || rect.top < -6 || rect.right > ${width} + 6 || rect.bottom > ${height} + 6;
        if (clipped) {
          box.violation = true;
          viewportClips.push({ label, rect: { x: box.x, y: box.y, w: box.w, h: box.h } });
        }
        const outsideSafe =
          isFocal &&
          (rect.left < safeBox.left - 8 ||
            rect.top < safeBox.top - 8 ||
            rect.right > safeBox.right + 8 ||
            rect.bottom > safeBox.bottom + 8);
        if (outsideSafe) {
          box.violation = true;
          safeViolations.push({ label, rect: { x: box.x, y: box.y, w: box.w, h: box.h } });
        }
      }

      boxes.push(box);
    }

    const minFont = fontSizes.length ? Math.min(...fontSizes) : 0;
    const maxFont = fontSizes.length ? Math.max(...fontSizes) : 0;
    const typeScaleRatio = minFont > 0 ? Number((maxFont / minFont).toFixed(2)) : 0;

    return {
      safeBox,
      planes: [...new Set(planes)],
      hasFinishing,
      elementCount: boxes.filter((b) => !b.bleed).length,
      fontSizes: { min: Math.round(minFont), max: Math.round(maxFont), ratio: typeScaleRatio },
      safeViolations,
      viewportClips,
      boxes
    };
  })()`);
}

/**
 * Builds ONE compact, high-density All-in-One Review Board (`review-board.png`).
 * Combines Hero Frame + Safe-zone violation box + Grayscale Value thumbnail +
 * 3-frame Motion Strip + Whole-Film & Per-Shot Color Barcode + OKLCH Swatches.
 */
function buildUnifiedReviewBoardHtml(meta, shotResults) {
  const aspect = meta.width / meta.height;
  const isVertical = aspect < 0.85;
  const pad = 28;
  const heroW = isVertical ? 190 : 352;
  const heroH = Math.round(heroW / aspect);
  const valW = isVertical ? 110 : 186;
  const valH = Math.round(valW / aspect);
  const stripW = isVertical ? 104 : 178;
  const stripH = Math.round(stripW / aspect);

  const rowH = Math.max(heroH, stripH + 64) + 22;
  const rowGap = 14;
  const canvasW = isVertical ? 1180 : 1320;
  const headerH = 112;
  const canvasH = pad * 2 + headerH + shotResults.length * (rowH + rowGap) + 8;

  const filmBarcode = shotResults
    .map((s) => {
      const segs = s.pixels.dominantColors
        .map((c) => `<div style="flex:${Math.max(1, c.pct)};background:${c.hex};height:100%;"></div>`)
        .join("");
      return `<div class="bc-shot">${segs}</div>`;
    })
    .join("");

  const rows = shotResults
    .map((s) => {
      const heroUrl = toDataUrl(s.heroImg, s.imgMime);
      const sx = heroW / meta.width;
      const sy = heroH / meta.height;
      const sb = s.dom.safeBox;
      const vio = s.dom.safeViolations.length + s.dom.viewportClips.length;

      const vioRects = s.dom.boxes
        .filter((b) => b.violation)
        .map(
          (b) =>
            `<rect x="${(b.x * sx).toFixed(1)}" y="${(b.y * sy).toFixed(1)}" width="${(b.w * sx).toFixed(1)}" height="${(b.h * sy).toFixed(1)}" fill="rgba(255,59,48,0.18)" stroke="#ff3b30" stroke-width="1.6"/>`
        )
        .join("");

      const overlaySvg = `<svg class="overlay" viewBox="0 0 ${heroW} ${heroH}" width="${heroW}" height="${heroH}">
        <rect x="${(sb.left * sx).toFixed(1)}" y="${(sb.top * sy).toFixed(1)}" width="${((sb.right - sb.left) * sx).toFixed(1)}" height="${((sb.bottom - sb.top) * sy).toFixed(1)}" fill="none" stroke="rgba(255,159,10,${vio ? "0.85" : "0.35"})" stroke-width="1" stroke-dasharray="4 3"/>
        ${vioRects}
      </svg>`;

      const motionCells = s.motionFrames
        .slice(0, 3)
        .map((mf, i) => {
          const u = toDataUrl(mf.img, s.imgMime);
          return `<div class="mcell ${i === 1 ? "mid" : ""}" style="width:${stripW}px;height:${stripH}px"><img src="${u}"/><span>${mf.t}s</span></div>`;
        })
        .join("");

      const range = s.pixels.valueDynamicRange;
      const valCls = range >= 90 ? "ok" : range >= 55 ? "warn" : "err";
      const motCls = s.motionDelta >= 0.8 ? "ok" : "warn";
      const safeCls = vio === 0 ? "ok" : "err";

      const shotBarcode = s.pixels.dominantColors
        .map((c) => `<div style="flex:${Math.max(2, c.pct)};background:${c.hex};height:100%;"></div>`)
        .join("");

      const pills = s.pixels.dominantColors
        .slice(0, 4)
        .map(
          (c) => `<span class="sw"><i style="background:${c.hex}"></i>${c.hex.toUpperCase()} <em>${c.pct}%</em></span>`
        )
        .join("");

      return `<div class="row">
        <div class="hero-box" style="width:${heroW}px;height:${heroH}px">
          <img src="${heroUrl}"/>
          ${overlaySvg}
          <span class="tag-tl">0${s.index} · ${escapeHtml(s.id)}</span>
          <span class="tag-br">${escapeHtml(s.shotType)} · ${s.heroAt}s</span>
        </div>
        <div class="val-col" style="width:${valW}px">
          <div class="val-box" style="width:${valW}px;height:${valH}px"><img src="${heroUrl}"/></div>
          <div class="pill ${valCls}">ΔVal ${range} (L${s.pixels.p005}-${s.pixels.p995})</div>
          <div class="pill ${safeCls}">${vio ? `${vio} CLIP` : "SAFE OK"}</div>
        </div>
        <div class="right-col">
          <div class="r-head">
            <span class="r-title">${escapeHtml(s.role.toUpperCase())} · ${s.duration}s · ${escapeHtml(s.focalPoint || "—")}</span>
            <span class="pill ${motCls}">MOTION Δ${s.motionDelta}</span>
          </div>
          <div class="strip">${motionCells}</div>
          <div class="color-line">
            <div class="s-bar">${shotBarcode}</div>
            <div class="sw-row">${pills}</div>
          </div>
        </div>
      </div>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: ${canvasW}px; height: ${canvasH}px;
      background: #101114; color: #eceae4;
      font-family: "Microsoft YaHei UI", "Noto Sans SC", system-ui, sans-serif;
      padding: ${pad}px;
    }
    header { margin-bottom: 16px; }
    .hdr-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
    .kicker { font: 600 11px/1 Consolas, monospace; letter-spacing: 0.14em; color: #8c8e96; }
    h1 { font-size: 20px; font-weight: 600; margin-top: 3px; }
    .hdr-meta { font: 12px/1.5 Consolas, monospace; color: #9a9ca4; text-align: right; }
    .film-bc { display: flex; height: 22px; gap: 3px; background: #181a20; padding: 2px; border: 1px solid #26282e; }
    .bc-shot { flex: 1; display: flex; overflow: hidden; }
    .row {
      display: flex; align-items: center; gap: 14px;
      background: #15171c; border: 1px solid #252830;
      padding: 10px; margin-bottom: ${rowGap}px;
    }
    .hero-box { position: relative; flex: none; background: #000; border: 1px solid #2f333d; overflow: hidden; }
    .hero-box img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .overlay { position: absolute; inset: 0; pointer-events: none; }
    .tag-tl { position: absolute; left: 6px; top: 6px; background: rgba(0,0,0,0.74); color: #f5f3ee; padding: 2px 6px; font: 600 11px/1.2 Consolas, "Microsoft YaHei UI", sans-serif; }
    .tag-br { position: absolute; right: 6px; bottom: 6px; background: rgba(0,0,0,0.72); color: #b8bac2; padding: 2px 5px; font: 10px/1.2 Consolas, monospace; }
    .val-col { flex: none; display: flex; flex-direction: column; gap: 6px; }
    .val-box { background: #000; border: 1px solid #2b2f38; overflow: hidden; }
    .val-box img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(100%); display: block; }
    .right-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
    .r-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .r-title { font-size: 12px; color: #c7c5be; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .strip { display: flex; gap: 8px; }
    .mcell { position: relative; background: #000; border: 1px solid #2b2f38; overflow: hidden; flex: none; }
    .mcell.mid { border-color: #e54d2e; }
    .mcell img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .mcell span { position: absolute; left: 4px; bottom: 4px; background: rgba(0,0,0,0.75); color: #eceae4; padding: 1px 4px; font: 10px/1.2 Consolas, monospace; }
    .color-line { display: flex; flex-direction: column; gap: 5px; }
    .s-bar { display: flex; height: 12px; border: 1px solid #2d313b; overflow: hidden; }
    .sw-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .sw { display: inline-flex; align-items: center; gap: 4px; font: 10.5px/1 Consolas, monospace; color: #d5d3cc; background: #1c1f27; border: 1px solid #2b2f3a; padding: 2px 6px; }
    .sw i { width: 9px; height: 9px; display: inline-block; border: 1px solid rgba(255,255,255,0.2); }
    .sw em { font-style: normal; color: #8c8e96; }
    .pill { font: 600 10.5px/1.2 Consolas, "Microsoft YaHei UI", monospace; padding: 3px 6px; border-radius: 2px; text-align: center; white-space: nowrap; }
    .pill.ok { background: rgba(48,209,88,0.14); color: #5ce07f; border: 1px solid rgba(48,209,88,0.35); }
    .pill.warn { background: rgba(255,159,10,0.15); color: #ffb340; border: 1px solid rgba(255,159,10,0.4); }
    .pill.err { background: rgba(255,59,48,0.18); color: #ff6961; border: 1px solid rgba(255,59,48,0.45); }
  </style></head><body>
    <header>
      <div class="hdr-top">
        <div>
          <div class="kicker">DFM ALL-IN-ONE REVIEW BOARD (HERO · VALUE · MOTION · COLOR BARCODE · SAFE ZONE)</div>
          <h1>${escapeHtml(meta.title)}</h1>
        </div>
        <div class="hdr-meta">
          <div>${meta.width}×${meta.height} · ${shotResults.length} BEATS · ${escapeHtml(meta.harmony)}</div>
          <div>TENSION: ${escapeHtml(meta.tension)}</div>
        </div>
      </div>
      <div class="film-bc">${filmBarcode}</div>
    </header>
    ${rows}
  </body></html>`;

  return { html, width: canvasW, height: canvasH };
}

function buildDesignBoardHtml(meta, shotResults, mode) {
  const aspect = meta.width / meta.height;
  const cols = shotResults.length <= 2 ? shotResults.length : aspect < 0.8 ? Math.min(4, shotResults.length) : 2;
  const thumbW = aspect < 0.8 ? 360 : 680;
  const thumbH = Math.round(thumbW / aspect);
  const pad = 48;
  const gap = 28;
  const headerH = 112;
  const cardMetaH = mode === "value" ? 76 : 58;
  const rows = Math.ceil(shotResults.length / cols);

  const canvasW = pad * 2 + cols * thumbW + (cols - 1) * gap;
  const canvasH = pad * 2 + headerH + rows * (thumbH + cardMetaH) + (rows - 1) * gap;

  const titleLabel =
    mode === "value"
      ? "GRAYSCALE VALUE BOARD (Q7 Value Separation)"
      : mode === "debug"
        ? "LAYOUT & SAFE-ZONE DEBUG BOARD (Q15 Framing & Safe Zone)"
        : "DESIGN BOARD (Whole-Board Cohesion & Composition)";

  const cards = shotResults
    .map((s) => {
      const imgUrl = toDataUrl(s.heroImg, s.imgMime);
      let overlaySvg = "";
      if (mode === "debug") {
        const sx = thumbW / meta.width;
        const sy = thumbH / meta.height;
        const sb = s.dom.safeBox;
        const boxRects = s.dom.boxes
          .filter((b) => !b.bleed)
          .map((b) => {
            const stroke = b.violation ? "#ff3b30" : "#30d158";
            const fill = b.violation ? "rgba(255,59,48,0.16)" : "rgba(48,209,88,0.08)";
            return `<rect x="${(b.x * sx).toFixed(1)}" y="${(b.y * sy).toFixed(1)}" width="${(b.w * sx).toFixed(1)}" height="${(b.h * sy).toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
          })
          .join("");
        overlaySvg = `<svg class="overlay" viewBox="0 0 ${thumbW} ${thumbH}" width="${thumbW}" height="${thumbH}">
          <line x1="${(thumbW / 3).toFixed(1)}" y1="0" x2="${(thumbW / 3).toFixed(1)}" y2="${thumbH}" stroke="rgba(255,255,255,0.2)" stroke-dasharray="4 4"/>
          <line x1="${((thumbW * 2) / 3).toFixed(1)}" y1="0" x2="${((thumbW * 2) / 3).toFixed(1)}" y2="${thumbH}" stroke="rgba(255,255,255,0.2)" stroke-dasharray="4 4"/>
          <line x1="0" y1="${(thumbH / 3).toFixed(1)}" x2="${thumbW}" y2="${(thumbH / 3).toFixed(1)}" stroke="rgba(255,255,255,0.2)" stroke-dasharray="4 4"/>
          <line x1="0" y1="${((thumbH * 2) / 3).toFixed(1)}" x2="${thumbW}" y2="${((thumbH * 2) / 3).toFixed(1)}" stroke="rgba(255,255,255,0.2)" stroke-dasharray="4 4"/>
          <rect x="${(sb.left * sx).toFixed(1)}" y="${(sb.top * sy).toFixed(1)}" width="${((sb.right - sb.left) * sx).toFixed(1)}" height="${((sb.bottom - sb.top) * sy).toFixed(1)}" fill="none" stroke="rgba(255,159,10,0.85)" stroke-width="1.5" stroke-dasharray="6 4"/>
          ${boxRects}
        </svg>`;
      }

      let footerExtra = "";
      if (mode === "value") {
        const range = s.pixels.valueDynamicRange;
        const ok = range >= 90;
        const bars = s.pixels.bins32
          .map((v) => `<span style="height:${Math.max(2, Math.min(20, Math.round(v * 140)))}px"></span>`)
          .join("");
        footerExtra = `<div class="val-row">
          <div class="hist">${bars}</div>
          <div class="pill ${ok ? "ok" : "warn"}">ΔValue ${range}/255 (L:${s.pixels.p005}–${s.pixels.p995}) ${ok ? "PASS" : "CHECK"}</div>
        </div>`;
      } else if (mode === "debug") {
        const vio = s.dom.safeViolations.length + s.dom.viewportClips.length;
        footerExtra = `<div class="meta-sub">NegSpace ~${s.pixels.negativeSpacePct}% · Motion Δ${s.motionDelta} · <span class="${vio ? "err" : "ok-txt"}">${vio ? `${vio} clip(s)` : "SAFE PASS"}</span></div>`;
      } else {
        footerExtra = `<div class="meta-sub">${escapeHtml(s.shotType)} · Hero @ ${s.heroAt}s / ${s.duration}s</div>`;
      }

      return `<div class="card">
        <div class="frame ${mode === "value" ? "gray" : ""}" style="width:${thumbW}px;height:${thumbH}px">
          <img src="${imgUrl}" width="${thumbW}" height="${thumbH}"/>
          ${overlaySvg}
        </div>
        <div class="meta">
          <div class="meta-top">
            <span class="shot-id">0${s.index} · ${escapeHtml(s.id)}</span>
            <span class="badge">${escapeHtml(s.role.toUpperCase())}</span>
          </div>
          ${footerExtra}
        </div>
      </div>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: ${canvasW}px; height: ${canvasH}px; background: #101114; color: #e9e7e2; font-family: "Microsoft YaHei UI", "Noto Sans SC", system-ui, sans-serif; padding: ${pad}px; }
    header { height: ${headerH}px; display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #26282e; padding-bottom: 20px; margin-bottom: 28px; }
    .kicker { font-size: 13px; letter-spacing: 0.16em; color: #8c8e96; margin-bottom: 8px; font-family: Consolas, monospace; }
    h1 { font-size: 28px; font-weight: 600; color: #f5f3ee; }
    .hdr-right { text-align: right; font-size: 13px; color: #9a9ca4; line-height: 1.6; font-family: Consolas, monospace; }
    .grid { display: grid; grid-template-columns: repeat(${cols}, ${thumbW}px); gap: ${gap}px; }
    .card { display: flex; flex-direction: column; }
    .frame { position: relative; background: #000; border: 1px solid #26282e; overflow: hidden; }
    .frame img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .frame.gray img { filter: grayscale(100%); }
    .overlay { position: absolute; inset: 0; pointer-events: none; }
    .meta { padding-top: 10px; }
    .meta-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
    .shot-id { font-size: 14px; font-weight: 600; color: #eceae4; }
    .badge { font-size: 11px; letter-spacing: 0.1em; color: #b7b9c0; border: 1px solid #32353e; padding: 2px 7px; border-radius: 2px; font-family: Consolas, monospace; }
    .meta-sub { font-size: 12px; color: #8c8e96; font-family: Consolas, "Microsoft YaHei UI", monospace; }
    .val-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-top: 4px; }
    .hist { display: flex; align-items: flex-end; gap: 2px; height: 22px; flex: 1; background: #17191e; padding: 2px 4px; border: 1px solid #25272e; }
    .hist span { flex: 1; background: #a8aab2; display: block; }
    .pill { font-size: 11px; font-family: Consolas, monospace; padding: 3px 7px; border-radius: 2px; }
    .pill.ok { background: rgba(48,209,88,0.14); color: #5ce07f; border: 1px solid rgba(48,209,88,0.35); }
    .pill.warn { background: rgba(255,159,10,0.15); color: #ffb340; border: 1px solid rgba(255,159,10,0.4); }
    .ok-txt { color: #5ce07f; }
    .err { color: #ff5c52; font-weight: 600; }
  </style></head><body>
    <header>
      <div><div class="kicker">${titleLabel}</div><h1>${escapeHtml(meta.title)}</h1></div>
      <div class="hdr-right"><div>${meta.width}×${meta.height} · ${shotResults.length} BEATS · ${escapeHtml(meta.harmony)}</div><div>TENSION: ${escapeHtml(meta.tension)}</div></div>
    </header>
    <div class="grid">${cards}</div>
  </body></html>`;

  return { html, width: canvasW, height: canvasH };
}

function buildColorBoardHtml(meta, shotResults) {
  const pad = 48;
  const rowH = 148;
  const rowGap = 18;
  const canvasW = 1460;
  const canvasH = pad * 2 + 190 + shotResults.length * (rowH + rowGap);

  const filmBarcode = shotResults
    .map((s) => {
      const segs = s.pixels.dominantColors
        .map((c) => `<div style="flex:${Math.max(1, c.pct)};background:${c.hex};height:100%;"></div>`)
        .join("");
      return `<div class="bc-shot">${segs}</div>`;
    })
    .join("");

  const rows = shotResults
    .map((s) => {
      const thumbUrl = toDataUrl(s.heroImg, s.imgMime);
      const barSegs = s.pixels.dominantColors
        .map((c) => `<div style="flex:${Math.max(2, c.pct)};background:${c.hex};height:100%;"></div>`)
        .join("");
      const pills = s.pixels.dominantColors
        .map(
          (c) => `<div class="sw-pill"><span class="dot" style="background:${c.hex};"></span><span class="hex">${c.hex.toUpperCase()}</span><span class="pct">${c.pct}%</span><span class="ok">L${Math.round(c.oklch.L * 100)} C${c.oklch.C.toFixed(2)}</span></div>`
        )
        .join("");
      const sb = s.pixels.satBuckets;
      const accentHex = s.pixels.dominantColors.find((c) => c.oklch.C >= 0.08)?.hex || "#e54d2e";
      return `<div class="row">
        <div class="thumb"><img src="${thumbUrl}" /></div>
        <div class="info">
          <div class="r-top"><span class="sid">0${s.index} · ${escapeHtml(s.id)}</span><span class="sat-txt">CHROMA BUDGET: LOW ${sb.lowPct}% · MID ${sb.midPct}% · HIGH ${sb.highPct}%</span></div>
          <div class="shot-barcode">${barSegs}</div>
          <div class="chroma-bar"><div style="width:${sb.lowPct}%;background:#4b5563;"></div><div style="width:${sb.midPct}%;background:#9ca3af;"></div><div style="width:${sb.highPct}%;background:${accentHex};"></div></div>
          <div class="pills">${pills}</div>
        </div>
      </div>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: ${canvasW}px; height: ${canvasH}px; background: #101114; color: #eceae4; font-family: "Microsoft YaHei UI", "Noto Sans SC", system-ui, sans-serif; padding: ${pad}px; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #26282e; padding-bottom: 16px; margin-bottom: 22px; }
    .kicker { font-family: Consolas, monospace; font-size: 13px; letter-spacing: 0.16em; color: #8c8e96; margin-bottom: 6px; }
    h1 { font-size: 26px; font-weight: 600; }
    .hdr-right { font-family: Consolas, monospace; font-size: 13px; color: #9a9ca4; text-align: right; line-height: 1.6; }
    .barcode-lbl { font-family: Consolas, monospace; font-size: 11px; letter-spacing: 0.14em; color: #8c8e96; margin-bottom: 8px; }
    .film-barcode { display: flex; height: 34px; gap: 3px; margin-bottom: 26px; background: #181a20; padding: 3px; border: 1px solid #26282e; }
    .bc-shot { flex: 1; display: flex; overflow: hidden; }
    .row { display: grid; grid-template-columns: 118px 1fr; gap: 22px; height: ${rowH}px; margin-bottom: ${rowGap}px; background: #15171c; border: 1px solid #242730; padding: 14px; align-items: center; }
    .thumb { width: 118px; height: 118px; background: #000; border: 1px solid #2b2e36; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .info { display: flex; flex-direction: column; gap: 8px; }
    .r-top { display: flex; justify-content: space-between; align-items: baseline; }
    .sid { font-size: 14px; font-weight: 600; }
    .sat-txt { font-family: Consolas, monospace; font-size: 11.5px; color: #9a9ca4; }
    .shot-barcode { display: flex; height: 24px; border: 1px solid #2c303a; overflow: hidden; }
    .chroma-bar { display: flex; height: 6px; background: #1f222a; overflow: hidden; border-radius: 2px; }
    .pills { display: flex; gap: 10px; flex-wrap: wrap; }
    .sw-pill { display: flex; align-items: center; gap: 6px; background: #1c1f26; border: 1px solid #2b2f3a; padding: 4px 8px; font-family: Consolas, monospace; font-size: 11px; }
    .dot { width: 12px; height: 12px; border-radius: 2px; border: 1px solid rgba(255,255,255,0.2); }
    .hex { color: #f5f3ee; font-weight: 700; }
    .pct { color: #9a9ca4; }
    .ok { color: #727681; }
  </style></head><body>
    <header><div><div class="kicker">COLOR SCRIPT & MOVIE BARCODE BOARD (Q8 Chroma Audit)</div><h1>${escapeHtml(meta.title)}</h1></div><div class="hdr-right"><div>HARMONY: ${escapeHtml(meta.harmony)}</div><div>COLOR ARC: ${escapeHtml(meta.colorArc)}</div></div></header>
    <div class="barcode-lbl">WHOLE-FILM COLOR BARCODE</div>
    <div class="film-barcode">${filmBarcode}</div>
    ${rows}
  </body></html>`;

  return { html, width: canvasW, height: canvasH };
}

function buildMotionStripHtml(meta, shotResults) {
  const aspect = meta.width / meta.height;
  const thumbW = aspect < 0.8 ? 190 : 300;
  const thumbH = Math.round(thumbW / aspect);
  const pad = 44;
  const labelW = 210;
  const gap = 14;
  const curveH = 110;
  const rowGap = 20;
  const frameCount = shotResults[0]?.motionFrames?.length || 5;

  const canvasW = pad * 2 + labelW + thumbW * frameCount + gap * frameCount;
  const canvasH = pad * 2 + 82 + curveH + 30 + shotResults.length * (thumbH + rowGap);

  const plotW = canvasW - pad * 2 - 40;
  const pts = shotResults.map((s, i) => {
    const x = shotResults.length === 1 ? plotW / 2 : (i / (shotResults.length - 1)) * plotW;
    const y = curveH - 26 - (s.energy / 100) * (curveH - 48);
    return { x: Math.round(x + 20), y: Math.round(y), s };
  });
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const dots = pts
    .map(
      (p) =>
        `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#e54d2e"/><text x="${p.x}" y="${p.y - 10}" fill="#d8d6d0" font-size="11" text-anchor="middle" font-family="Consolas">0${p.s.index} (${p.s.energy})</text>`
    )
    .join("");

  const rowsHtml = shotResults
    .map((s) => {
      const midIdx = Math.floor(s.motionFrames.length / 2);
      const cells = s.motionFrames
        .map((mf, i) => {
          const url = toDataUrl(mf.img, s.imgMime);
          return `<div class="cell ${i === midIdx ? "hero" : ""}"><img src="${url}" width="${thumbW}" height="${thumbH}"/><span>${mf.t}s</span></div>`;
        })
        .join("");
      const motionStatus = s.motionDelta < 1.2 ? "STATIC?" : s.motionDelta < 4.5 ? "SUBTLE" : "DYNAMIC";
      const cls = s.motionDelta < 1.2 ? "warn" : "ok";
      return `<div class="row">
        <div class="info">
          <div class="s-title">0${s.index} · ${escapeHtml(s.id)}</div>
          <div class="s-meta">${escapeHtml(s.role.toUpperCase())} · ${s.duration}s</div>
          <div class="m-pill ${cls}">MOTION Δ${s.motionDelta} (${motionStatus})</div>
          <div class="s-focal">${escapeHtml(s.focalPoint || "—")}</div>
        </div>
        ${cells}
      </div>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: ${canvasW}px; height: ${canvasH}px; background: #101114; color: #e9e7e2; font-family: "Microsoft YaHei UI", "Noto Sans SC", system-ui, sans-serif; padding: ${pad}px; }
    .kicker { font-size: 12px; letter-spacing: 0.16em; color: #8c8e96; font-family: Consolas, monospace; margin-bottom: 6px; }
    h1 { font-size: 24px; margin-bottom: 16px; }
    .curve-box { background: #15171c; border: 1px solid #26282e; padding: 6px 0; margin-bottom: 24px; }
    .row { display: grid; grid-template-columns: ${labelW}px repeat(${frameCount}, ${thumbW}px); gap: ${gap}px; margin-bottom: ${rowGap}px; align-items: center; }
    .info { padding-right: 8px; }
    .s-title { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
    .s-meta { font-size: 12px; color: #8c8e96; font-family: Consolas, monospace; margin-bottom: 8px; }
    .m-pill { display: inline-block; font-size: 11px; font-family: Consolas, monospace; padding: 2px 7px; border-radius: 2px; margin-bottom: 8px; }
    .m-pill.ok { background: rgba(48,209,88,0.14); color: #5ce07f; border: 1px solid rgba(48,209,88,0.35); }
    .m-pill.warn { background: rgba(255,159,10,0.15); color: #ffb340; border: 1px solid rgba(255,159,10,0.4); }
    .s-focal { font-size: 12px; color: #b7b5ae; line-height: 1.4; }
    .cell { position: relative; border: 1px solid #26282e; background: #000; }
    .cell.hero { border-color: #e54d2e; }
    .cell img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .cell span { position: absolute; left: 6px; bottom: 6px; font-size: 10.5px; font-family: Consolas, monospace; background: rgba(0,0,0,0.72); color: #eceae4; padding: 2px 5px; }
  </style></head><body>
    <div class="kicker">MOTION CONTINUITY STRIP (Q3/Q11 Inter-Frame Continuity)</div>
    <h1>${escapeHtml(meta.title)}</h1>
    <div class="curve-box"><svg width="${canvasW - pad * 2}" height="${curveH}"><line x1="20" y1="${curveH - 26}" x2="${canvasW - pad * 2 - 20}" y2="${curveH - 26}" stroke="#2a2d35"/><polyline fill="none" stroke="#e54d2e" stroke-width="2.5" points="${polyline}"/>${dots}</svg></div>
    ${rowsHtml}
  </body></html>`;

  return { html, width: canvasW, height: canvasH };
}

export async function generateBoards(projectDir, { full = false } = {}) {
  const { absProject, brief, shots, width, height } = discoverProject(projectDir);
  const outDir = path.join(absProject, "dfm-out");
  fs.mkdirSync(outDir, { recursive: true });

  const serveRoot = absProject.startsWith(REPO_ROOT) ? REPO_ROOT : absProject;
  const relProjectFromRoot = path.relative(serveRoot, absProject).replaceAll("\\", "/");
  const server = await startStaticServer(serveRoot);
  const browser = await launchHeadlessBrowser();

  const imgMime = full ? "image/png" : "image/jpeg";
  const captureScale = full ? 1 : 0.5;
  const motionFracs = full ? [0.06, 0.28, 0.52, 0.74, 0.94] : [0.08, 0.52, 0.92];

  async function captureFrame() {
    return full
      ? browser.screenshotPng({ width, height, scale: 1 })
      : browser.screenshotJpeg({ width, height, scale: captureScale, quality: 86 });
  }

  try {
    const shotResults = [];
    let loadedUrl = null;
    let cachedFilmInfo = null;
    const sweptUrls = new Set();
    const runtimeErrors = [];

    for (const shot of shots) {
      const shotPath = path.join(absProject, shot.file);
      if (!fs.existsSync(shotPath)) {
        throw new Error(`Scene file not found: ${shotPath}`);
      }

      const urlPath = relProjectFromRoot ? `${relProjectFromRoot}/${shot.file}` : shot.file;
      const url = `${server.baseUrl}/${urlPath}`;

      if (url !== loadedUrl) {
        await browser.setViewport(width, height);
        await browser.navigate(url);
        cachedFilmInfo = await browser.evalJS(`(async () => {
          if (window.film && window.film.ready) await window.film.ready;
          if (document.fonts && document.fonts.ready) await document.fonts.ready;
          return {
            hasFilm: Boolean(window.film && typeof window.film.frame === 'function'),
            duration: window.film?.duration ?? null,
            meta: window.film?.meta ?? null
          };
        })()`);
        loadedUrl = url;

        // Ultra-fast full-timeline JS exception sweep (every 0.25s, no screenshots, ~20ms total)
        if (cachedFilmInfo.hasFilm && !sweptUrls.has(url)) {
          sweptUrls.add(url);
          const sweepDur = cachedFilmInfo.duration || shot.duration || 10;
          const sweepErrs = await browser.evalJS(`(() => {
            const errs = [];
            const dur = ${Number(sweepDur)};
            const step = 0.25;
            for (let t = 0; t <= dur + 0.001; t += step) {
              const tt = Math.min(dur, Number(t.toFixed(3)));
              try { window.film.frame(tt); }
              catch (e) {
                errs.push({ t: tt, message: e && e.message ? e.message : String(e) });
                if (errs.length >= 6) break;
              }
            }
            return errs;
          })()`);
          for (const e of sweepErrs) {
            runtimeErrors.push({ file: shot.file, t: e.t, message: e.message });
          }
        }
      }

      const filmInfo = cachedFilmInfo;
      const totalDuration = filmInfo.duration ?? shot.duration;
      const isContinuousBeat =
        shot.start > 0 || brief?.shots?.filter((x) => x.file === shot.file).length > 1;
      const beatStart = isContinuousBeat ? shot.start : 0;
      const duration = isContinuousBeat ? shot.duration : totalDuration;
      const heroAt =
        shot.heroAt ??
        (isContinuousBeat
          ? Number((beatStart + duration * 0.52).toFixed(2))
          : filmInfo.meta?.heroAt ?? Number((duration * 0.52).toFixed(2)));

      const motionFrames = [];
      let heroImg = null;
      let dom = null;

      for (const f of motionFracs) {
        const tVal = Number((beatStart + duration * f).toFixed(2));
        if (filmInfo.hasFilm) {
          await browser.evalJS(`window.film.frame(${tVal}); void document.body.offsetHeight;`);
        }
        const img = await captureFrame();
        motionFrames.push({ t: tVal, img });
        if (!heroImg && Math.abs(tVal - heroAt) <= 0.08) {
          heroImg = img;
          dom = await measureShotDom(browser, width, height);
        }
      }

      if (!heroImg) {
        if (filmInfo.hasFilm) {
          await browser.evalJS(`window.film.frame(${heroAt}); void document.body.offsetHeight;`);
        }
        heroImg = await captureFrame();
        dom = await measureShotDom(browser, width, height);
      }

      const pixels = await analyzeImagePixels(browser, heroImg, imgMime);
      const entryPixels = await analyzeImagePixels(browser, motionFrames[0].img, imgMime);
      const motionDelta = await computeMotionDelta(
        browser,
        motionFrames.map((m) => m.img),
        imgMime
      );

      if (full) {
        fs.writeFileSync(
          path.join(outDir, `hero-${String(shot.index).padStart(2, "0")}-${shot.id}.png`),
          heroImg
        );
      }

      shotResults.push({
        ...shot,
        duration,
        entryAt: motionFrames[0].t,
        heroAt,
        exitAt: motionFrames[motionFrames.length - 1].t,
        hasFilm: filmInfo.hasFilm,
        dom,
        pixels,
        entryPixels,
        motionDelta,
        imgMime,
        heroImg,
        motionFrames
      });
    }

    const meta = {
      title: brief?.title || path.basename(absProject),
      width,
      height,
      harmony: brief?.colorScript?.harmony || brief?.style?.archetype || "freeform",
      colorArc: brief?.colorScript?.colorArc || "custom",
      tension: brief?.concept?.tensionPair ? brief.concept.tensionPair.join(" ↔ ") : "freeform"
    };

    const outputs = {};

    // Always produce ONE compact all-in-one review-board.png
    const review = buildUnifiedReviewBoardHtml(meta, shotResults);
    await browser.setViewport(review.width, review.height);
    await browser.setHtml(review.html);
    const reviewPng = await browser.screenshotPng({ width: review.width, height: review.height });
    outputs.reviewBoard = path.join(outDir, "review-board.png");
    fs.writeFileSync(outputs.reviewBoard, reviewPng);

    if (full) {
      for (const [key, mode, fileName] of [
        ["designBoard", "design", "design-board.png"],
        ["valueBoard", "value", "value-board.png"],
        ["layoutDebug", "debug", "layout-debug.png"]
      ]) {
        const board = buildDesignBoardHtml(meta, shotResults, mode);
        await browser.setViewport(board.width, board.height);
        await browser.setHtml(board.html);
        const png = await browser.screenshotPng({ width: board.width, height: board.height });
        const outPath = path.join(outDir, fileName);
        fs.writeFileSync(outPath, png);
        outputs[key] = outPath;
      }

      const colorBoard = buildColorBoardHtml(meta, shotResults);
      await browser.setViewport(colorBoard.width, colorBoard.height);
      await browser.setHtml(colorBoard.html);
      const colorPng = await browser.screenshotPng({ width: colorBoard.width, height: colorBoard.height });
      outputs.colorBoard = path.join(outDir, "color-board.png");
      fs.writeFileSync(outputs.colorBoard, colorPng);

      const motionStrip = buildMotionStripHtml(meta, shotResults);
      await browser.setViewport(motionStrip.width, motionStrip.height);
      await browser.setHtml(motionStrip.html);
      const motionPng = await browser.screenshotPng({ width: motionStrip.width, height: motionStrip.height });
      outputs.motionStrip = path.join(outDir, "motion-strip.png");
      fs.writeFileSync(outputs.motionStrip, motionPng);
    }

    const report = {
      generatedAt: new Date().toISOString(),
      mode: full ? "full" : "fast",
      projectDir: absProject,
      meta,
      outputs,
      runtimeErrors,
      shots: shotResults.map(({ heroImg, motionFrames, imgMime: _m, ...rest }) => rest)
    };

    const reportPath = path.join(outDir, "board-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    outputs.report = reportPath;

    return { report, outputs };
  } finally {
    await browser.close();
    await server.close();
  }
}

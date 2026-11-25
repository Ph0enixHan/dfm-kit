/**
 * palette.mjs — Extracts an OKLCH Filmic Color Script from ANY reference still/poster/photo
 * Outputs: <name>-palette.png (visual swatch card), <name>-palette.json, and <name>-theme.css
 */

import fs from "node:fs";
import path from "node:path";
import { launchHeadlessBrowser } from "./cdp-browser.mjs";
import { assignColorScriptRoles, rgbToHex, rgbToOklch } from "./color-math.mjs";

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function imageToDataUrl(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : "image/jpeg";
  const buf = fs.readFileSync(filePath);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function extractPaletteFromImage(imagePath, outDirArg) {
  const absImg = path.resolve(imagePath);
  if (!fs.existsSync(absImg)) {
    throw new Error(`Image file not found: ${absImg}`);
  }

  const baseName = path.basename(absImg, path.extname(absImg));
  const outDir = outDirArg ? path.resolve(outDirArg) : path.dirname(absImg);
  fs.mkdirSync(outDir, { recursive: true });

  const dataUrl = imageToDataUrl(absImg);
  const browser = await launchHeadlessBrowser();

  try {
    await browser.setViewport(1280, 720);

    // Extract quantized color clusters inside browser canvas
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

      // Quantize RGB into 5-bit buckets (32x32x32)
      const buckets = new Map();
      let total = 0;
      let lowSat = 0, midSat = 0, highSat = 0;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        total++;

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

      // Sort buckets by area and greedily merge perceptually close colors
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
          const dist = Math.hypot(c.r - m.r, c.g - m.g, c.b - m.b);
          if (dist < 42) {
            hit = m;
            break;
          }
        }
        if (hit) {
          const newCount = hit.count + c.count;
          hit.r = Math.round((hit.r * hit.count + c.r * c.count) / newCount);
          hit.g = Math.round((hit.g * hit.count + c.g * c.count) / newCount);
          hit.b = Math.round((hit.b * hit.count + c.b * c.count) / newCount);
          hit.count = newCount;
        } else {
          merged.push({ ...c });
        }
        if (merged.length >= 24) break;
      }

      // Always keep top dominant + top distinct chromatic accents (up to 6 total)
      const byCount = [...merged].sort((a, b) => b.count - a.count);
      const top = byCount.slice(0, 6);

      // Ensure at least one vibrant accent is preserved if present in remaining clusters
      const remaining = byCount.slice(6).map((c) => {
        const mx = Math.max(c.r, c.g, c.b);
        const mn = Math.min(c.r, c.g, c.b);
        return { ...c, sat: mx === 0 ? 0 : (mx - mn) / mx };
      });
      remaining.sort((a, b) => b.sat * Math.sqrt(b.count) - a.sat * Math.sqrt(a.count));
      if (remaining[0] && remaining[0].sat > 0.45 && remaining[0].count / total > 0.004) {
        const minDist = Math.min(...top.map((t) => Math.hypot(t.r - remaining[0].r, t.g - remaining[0].g, t.b - remaining[0].b)));
        if (minDist > 50) {
          top[top.length - 1] = remaining[0];
        }
      }

      return {
        imgW: img.width,
        imgH: img.height,
        satBuckets: {
          lowPct: Number(((lowSat / Math.max(1, total)) * 100).toFixed(1)),
          midPct: Number(((midSat / Math.max(1, total)) * 100).toFixed(1)),
          highPct: Number(((highSat / Math.max(1, total)) * 100).toFixed(1))
        },
        clusters: top.map((c) => ({
          r: c.r,
          g: c.g,
          b: c.b,
          pct: Number(((c.count / Math.max(1, total)) * 100).toFixed(1))
        }))
      };
    })()`);

    const clusters = raw.clusters.map((c) => ({
      ...c,
      hex: rgbToHex(c.r, c.g, c.b),
      oklch: rgbToOklch(c.r, c.g, c.b)
    }));

    const script = assignColorScriptRoles(clusters);
    const totalShownPct = clusters.reduce((s, c) => s + c.pct, 0) || 100;

    const paletteJson = {
      sourceImage: absImg,
      extractedAt: new Date().toISOString(),
      harmony: script.harmony,
      proportionBudget: `Low-Chroma ${raw.satBuckets.lowPct}% / Mid ${raw.satBuckets.midPct}% / High-Chroma ${raw.satBuckets.highPct}%`,
      satBuckets: raw.satBuckets,
      roles: script.roles,
      oklchRoles: script.oklchRoles,
      swatches: clusters.map((c) => ({
        hex: c.hex,
        oklch: c.oklch.css,
        pct: c.pct,
        L: c.oklch.L,
        C: c.oklch.C,
        H: c.oklch.H
      }))
    };

    const jsonPath = path.join(outDir, `${baseName}-palette.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(paletteJson, null, 2), "utf8");

    const cssLines = [
      `/* Extracted Filmic Color Script from ${path.basename(absImg)} (${script.harmony}) */`,
      ":root {",
      `  --color-ground: ${script.roles.dominantGround}; /* ${script.oklchRoles.dominantGround} */`,
      `  --color-surface: ${script.roles.supportSurface}; /* ${script.oklchRoles.supportSurface} */`,
      `  --color-ink: ${script.roles.ink}; /* ${script.oklchRoles.ink} */`,
      `  --color-muted: ${script.roles.muted}; /* ${script.oklchRoles.muted} */`,
      `  --color-accent: ${script.roles.focalAccent}; /* ${script.oklchRoles.focalAccent} */`,
      ...(script.roles.secondaryAccent
        ? [`  --color-accent-2: ${script.roles.secondaryAccent}; /* ${script.oklchRoles.secondaryAccent} */`]
        : []),
      "}",
      ""
    ];
    const cssPath = path.join(outDir, `${baseName}-theme.css`);
    fs.writeFileSync(cssPath, cssLines.join("\n"), "utf8");

    // Render crisp Visual Swatch Card PNG
    const cardW = 1280;
    const cardH = 760;
    const barcodeSegs = clusters
      .map(
        (c) =>
          `<div style="flex:${Math.max(2, (c.pct / totalShownPct) * 100).toFixed(2)};background:${c.hex};height:100%;"></div>`
      )
      .join("");

    const swatchCards = clusters
      .map(
        (c) => `<div class="sw">
          <div class="sw-chip" style="background:${c.hex};"></div>
          <div class="sw-hex">${c.hex.toUpperCase()}</div>
          <div class="sw-ok">${c.oklch.css}</div>
          <div class="sw-pct">${c.pct}% area</div>
        </div>`
      )
      .join("");

    const roleRows = Object.entries(script.roles)
      .map(
        ([k, hex]) => `<div class="r-item">
          <span class="r-dot" style="background:${hex};"></span>
          <span class="r-k">${escapeHtml(k)}</span>
          <span class="r-v">${hex.toUpperCase()}</span>
        </div>`
      )
      .join("");

    const cardHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: ${cardW}px; height: ${cardH}px;
        background: #101114; color: #eceae4;
        font-family: "Noto Sans SC", "Microsoft YaHei UI", system-ui, sans-serif;
        padding: 40px 48px;
        display: flex; flex-direction: column; gap: 24px;
      }
      header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #26282e; padding-bottom: 16px; }
      .kicker { font-family: Consolas, monospace; font-size: 12px; letter-spacing: 0.16em; color: #8c8e96; margin-bottom: 6px; }
      h1 { font-size: 24px; font-weight: 600; }
      .meta { font-family: Consolas, monospace; font-size: 13px; color: #9a9ca4; text-align: right; line-height: 1.6; }
      .top-row { display: grid; grid-template-columns: 440px 1fr; gap: 32px; height: 320px; }
      .img-box { background: #07080a; border: 1px solid #26282e; display: flex; align-items: center; justify-content: center; overflow: hidden; }
      .img-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
      .right-col { display: flex; flex-direction: column; justify-content: space-between; }
      .sec-lbl { font-family: Consolas, monospace; font-size: 11px; letter-spacing: 0.14em; color: #8c8e96; margin-bottom: 8px; }
      .barcode { display: flex; height: 42px; border: 1px solid #2b2e36; overflow: hidden; margin-bottom: 18px; }
      .sat-bar { display: flex; height: 14px; border-radius: 2px; overflow: hidden; background: #1d2026; margin-bottom: 6px; }
      .sat-meta { font-family: Consolas, monospace; font-size: 12px; color: #9a9ca4; margin-bottom: 18px; }
      .roles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 18px; }
      .r-item { display: flex; align-items: center; gap: 10px; font-family: Consolas, monospace; font-size: 13px; background: #16181d; border: 1px solid #252830; padding: 8px 12px; }
      .r-dot { width: 16px; height: 16px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.2); flex-shrink: 0; }
      .r-k { color: #b7b9c0; flex: 1; }
      .r-v { color: #f5f3ee; font-weight: 700; }
      .sw-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; flex: 1; }
      .sw { background: #16181d; border: 1px solid #252830; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
      .sw-chip { flex: 1; min-height: 82px; border: 1px solid rgba(255,255,255,0.12); margin-bottom: 4px; }
      .sw-hex { font-family: Consolas, monospace; font-size: 14px; font-weight: 700; }
      .sw-ok { font-family: Consolas, monospace; font-size: 10.5px; color: #9a9ca4; }
      .sw-pct { font-size: 11px; color: #7a7d86; }
    </style></head><body>
      <header>
        <div>
          <div class="kicker">DFM COLOR SCRIPT EXTRACTOR · OKLCH</div>
          <h1>${escapeHtml(path.basename(absImg))}</h1>
        </div>
        <div class="meta">
          <div>HARMONY: ${escapeHtml(script.harmony.toUpperCase())}</div>
          <div>${raw.imgW}×${raw.imgH} · 60-30-10 CHROMA AUDIT</div>
        </div>
      </header>
      <div class="top-row">
        <div class="img-box"><img src="${dataUrl}" /></div>
        <div class="right-col">
          <div>
            <div class="sec-lbl">PROPORTIONAL COLOR BARCODE</div>
            <div class="barcode">${barcodeSegs}</div>
            <div class="sec-lbl">CHROMA DISTRIBUTION (LOW / MID / HIGH)</div>
            <div class="sat-bar">
              <div style="width:${raw.satBuckets.lowPct}%;background:#4b5563;"></div>
              <div style="width:${raw.satBuckets.midPct}%;background:#9ca3af;"></div>
              <div style="width:${raw.satBuckets.highPct}%;background:${script.roles.focalAccent};"></div>
            </div>
            <div class="sat-meta">LOW ${raw.satBuckets.lowPct}% · MID ${raw.satBuckets.midPct}% · HIGH ${raw.satBuckets.highPct}%</div>
          </div>
          <div>
            <div class="sec-lbl">SUGGESTED COLOR SCRIPT ROLES</div>
            <div class="roles">${roleRows}</div>
          </div>
        </div>
      </div>
      <div class="sw-grid">${swatchCards}</div>
    </body></html>`;

    await browser.setViewport(cardW, cardH);
    await browser.setHtml(cardHtml);
    const pngBuf = await browser.screenshotPng({ width: cardW, height: cardH });
    const pngPath = path.join(outDir, `${baseName}-palette.png`);
    fs.writeFileSync(pngPath, pngBuf);

    return { pngPath, jsonPath, cssPath, paletteJson };
  } finally {
    await browser.close();
  }
}

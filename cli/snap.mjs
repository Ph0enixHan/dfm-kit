/**
 * snap.mjs — Instant 1-to-4 Frame Inspector (`dfm snap <htmlFileOrRemotionDir> <t1,t2,...> [outPath]`)
 * Supports both OpenFilm HTML scenes and Remotion projects via the adapter layer.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchHeadlessBrowser, startStaticServer } from "./cdp-browser.mjs";
import { measureShotDom, parseEnergyValue, resolveSafeArea } from "./board.mjs";
import { detectEngine, getAdapter } from "./adapters/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

export async function snapFrames(
  targetArg,
  timesArg = "1.0",
  outArg = null,
  { engine = null, comp = null, serveUrl = null, rebuild = false } = {}
) {
  const absTarget = path.resolve(targetArg);
  if (!fs.existsSync(absTarget)) {
    throw new Error(`Target not found: ${absTarget}`);
  }

  const isDir = fs.statSync(absTarget).isDirectory();
  const projectDir = isDir ? absTarget : path.dirname(absTarget);
  const resolvedEngine = detectEngine(absTarget, engine);
  const briefPath = path.join(projectDir, "brief.json");
  const brief = fs.existsSync(briefPath) ? JSON.parse(fs.readFileSync(briefPath, "utf8")) : null;

  const times = String(timesArg)
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0);
  if (!times.length) times.push(1.0);

  const browser = await launchHeadlessBrowser();
  let server = null;
  let session = null;

  try {
    let width = brief?.format?.width || 1920;
    let height = brief?.format?.height || 1080;
    let hasFilm = false;
    let labelName = isDir ? path.basename(absTarget) : path.basename(absTarget);

    if (resolvedEngine === "remotion" || resolvedEngine === "hyperframes") {
      const adapter = getAdapter(resolvedEngine);
      session = await adapter.openSession({
        absProject: resolvedEngine === "hyperframes" ? absTarget : projectDir,
        brief,
        browser,
        parseEnergyValue,
        comp,
        serveUrl,
        rebuild
      });
      width = session.width;
      height = session.height;
      hasFilm = true;
      labelName = `${session.compositionId || path.basename(absTarget)} (${resolvedEngine === "remotion" ? "Remotion" : "HyperFrames"})`;
    } else {
      const htmlPath = isDir ? path.join(absTarget, brief?.shots?.[0]?.file || "scene.html") : absTarget;
      if (!fs.existsSync(htmlPath)) {
        throw new Error(`Scene file not found: ${htmlPath}`);
      }
      labelName = path.basename(htmlPath);
      const serveRoot = projectDir.startsWith(REPO_ROOT) ? REPO_ROOT : projectDir;
      const relPath = path.relative(serveRoot, htmlPath).replaceAll("\\", "/");
      server = await startStaticServer(serveRoot);
      await browser.setViewport(width, height);
      await browser.navigate(`${server.baseUrl}/${relPath}`);
      const info = await browser.evalJS(`(async () => {
        if (window.film && window.film.ready) await window.film.ready;
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        return {
          hasFilm: Boolean(window.film && typeof window.film.frame === 'function'),
          width: window.film?.width || null,
          height: window.film?.height || null
        };
      })()`);
      hasFilm = info.hasFilm;
      if (!brief?.format && info.width && info.height && (info.width !== width || info.height !== height)) {
        width = info.width;
        height = info.height;
        await browser.setViewport(width, height);
      }
    }

    const safeArea = resolveSafeArea(width, height, brief);
    const outDir = path.join(projectDir, "dfm-out");
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = outArg ? path.resolve(outArg) : path.join(outDir, "snap.png");

    const shots = [];
    for (const t of times) {
      if (session) {
        await session.seek(null, t);
      } else if (hasFilm) {
        await browser.evalJS(`window.film.frame(${t}); void document.body.offsetHeight;`);
      }
      const dom = await measureShotDom(browser, width, height, safeArea);
      const scale = times.length === 1 ? 0.65 : 0.45;
      const buf =
        times.length === 1
          ? await browser.screenshotPng({ width, height, scale })
          : await browser.screenshotJpeg({ width, height, scale, quality: 86 });
      shots.push({ t, buf, dom });
    }

    if (times.length === 1) {
      fs.writeFileSync(outPath, shots[0].buf);
    } else {
      const aspect = width / height;
      const cellW = aspect < 0.85 ? 260 : 420;
      const cellH = Math.round(cellW / aspect);
      const pad = 20;
      const gap = 12;
      const canvasW = pad * 2 + shots.length * cellW + (shots.length - 1) * gap;
      const canvasH = pad * 2 + 34 + cellH;
      const cells = shots
        .map((s) => {
          const url = `data:image/jpeg;base64,${s.buf.toString("base64")}`;
          const vio = s.dom.safeViolations.length + s.dom.viewportClips.length;
          return `<div class="c" style="width:${cellW}px;height:${cellH}px"><img src="${url}"/><span>t=${s.t}s${vio ? ` · ${vio} clip` : ""}</span></div>`;
        })
        .join("");
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{width:${canvasW}px;height:${canvasH}px;background:#101114;color:#eceae4;padding:${pad}px;font-family:Consolas,"Microsoft YaHei UI",monospace}
        .h{font-size:12px;color:#9a9ca4;margin-bottom:12px}
        .row{display:flex;gap:${gap}px}
        .c{position:relative;border:1px solid #2f333d;background:#000;overflow:hidden}
        .c img{width:100%;height:100%;object-fit:cover;display:block}
        .c span{position:absolute;left:6px;bottom:6px;background:rgba(0,0,0,0.78);color:#f5f3ee;padding:2px 6px;font-size:11px}
      </style></head><body><div class="h">DFM SNAP · ${labelName} (${width}×${height})</div><div class="row">${cells}</div></body></html>`;
      await browser.setViewport(canvasW, canvasH);
      await browser.setHtml(html);
      const stripPng = await browser.screenshotPng({ width: canvasW, height: canvasH });
      fs.writeFileSync(outPath, stripPng);
    }

    return {
      outPath,
      width,
      height,
      engine: resolvedEngine,
      hasFilm,
      frames: shots.map((s) => ({
        t: s.t,
        clips: s.dom.viewportClips.length,
        safeViolations: s.dom.safeViolations.length
      }))
    };
  } finally {
    await browser.close();
    if (session) await session.close();
    if (server) await server.close();
  }
}

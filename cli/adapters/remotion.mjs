/**
 * cli/adapters/remotion.mjs — Zero-dependency Remotion v4 CDP adapter for dfm-kit.
 * Bundles once (with mtime cache) or connects to --serve-url, switches the Remotion bundle into
 * headless "composition" mode via window.remotion_setBundleMode(), and seeks deterministically via
 * window.remotion_setFrame() + delayRender drain.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { startStaticServer } from "../cdp-browser.mjs";

function findRemotionEntry(absProject, brief) {
  const candidates = [
    brief?.remotion?.entry,
    "src/index.ts",
    "src/index.tsx",
    "src/index.js",
    "src/index.jsx"
  ].filter(Boolean);
  for (const rel of candidates) {
    const full = path.resolve(absProject, rel);
    if (fs.existsSync(full)) return rel.replaceAll("\\", "/");
  }
  throw new Error(
    `Remotion entry file not found in ${absProject} (tried: ${candidates.join(", ")}). Set brief.remotion.entry or create src/index.ts.`
  );
}

function getLatestSourceMtime(absProject) {
  let latest = 0;
  const ignoreDirs = new Set(["node_modules", ".git", "dfm-out", "build", "dist", "out", ".next"]);

  function walk(dir, depth = 0) {
    if (depth > 6 || !fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignoreDirs.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full, depth + 1);
      } else {
        try {
          const st = fs.statSync(full);
          if (st.mtimeMs > latest) latest = st.mtimeMs;
        } catch {
          /* ignore */
        }
      }
    }
  }

  for (const sub of ["src", "public"]) {
    walk(path.join(absProject, sub));
  }
  for (const top of ["package.json", "remotion.config.ts", "remotion.config.mjs", "remotion.config.js"]) {
    const full = path.join(absProject, top);
    if (fs.existsSync(full)) {
      try {
        const st = fs.statSync(full);
        if (st.mtimeMs > latest) latest = st.mtimeMs;
      } catch {
        /* ignore */
      }
    }
  }
  return latest;
}

function ensureRemotionBundle(absProject, entryRel, { rebuild = false } = {}) {
  const bundleDir = path.join(absProject, "dfm-out", ".remotion-bundle");
  const cacheMetaPath = path.join(bundleDir, ".dfm-cache.json");
  const latestMtime = getLatestSourceMtime(absProject);

  if (!rebuild && fs.existsSync(path.join(bundleDir, "index.html")) && fs.existsSync(cacheMetaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(cacheMetaPath, "utf8"));
      if (meta.entryRel === entryRel && typeof meta.latestMtime === "number" && meta.latestMtime >= latestMtime) {
        return { bundleDir, cached: true };
      }
    } catch {
      /* rebuild on corrupt cache */
    }
  }

  fs.mkdirSync(bundleDir, { recursive: true });
  const cliJs = path.join(absProject, "node_modules", "@remotion", "cli", "remotion-cli.js");
  if (!fs.existsSync(cliJs)) {
    throw new Error(
      `Local @remotion/cli not found at ${cliJs}. Run "npm install" inside your Remotion project first.`
    );
  }

  const res = spawnSync(process.execPath, [cliJs, "bundle", entryRel, "--out-dir", bundleDir], {
    cwd: absProject,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (res.status !== 0 || !fs.existsSync(path.join(bundleDir, "index.html"))) {
    const errText = (res.stderr || res.stdout || "").trim().slice(-1200);
    throw new Error(`Remotion bundle failed (exit ${res.status}):\n${errText}`);
  }

  fs.writeFileSync(
    cacheMetaPath,
    JSON.stringify({ entryRel, latestMtime, bundledAt: new Date().toISOString() }, null, 2),
    "utf8"
  );
  return { bundleDir, cached: false };
}

function synthesizeShots(comp, brief, parseEnergyValue) {
  const totalSec = comp.durationInFrames / comp.fps;
  if (brief?.shots?.length) {
    return brief.shots.map((s, idx) => ({
      index: idx + 1,
      id: s.id || `beat-${idx + 1}`,
      file: s.file || comp.id,
      role: s.role || "hero",
      shotType: s.shotType || "custom",
      symmetry: s.symmetry || "mixed",
      focalPoint: s.focalPoint || "",
      energy: parseEnergyValue(s.energy),
      start: typeof s.start === "number" ? s.start : 0,
      duration: s.duration || Math.max(1, Number((totalSec / brief.shots.length).toFixed(2))),
      heroAt: typeof s.heroAt === "number" ? s.heroAt : null
    }));
  }

  const count = Math.max(2, Math.min(6, Math.round(totalSec / 2.5) || 4));
  const segDur = Number((totalSec / count).toFixed(2));
  return Array.from({ length: count }, (_, idx) => {
    const start = Number((idx * segDur).toFixed(2));
    const duration = idx === count - 1 ? Number((totalSec - start).toFixed(2)) : segDur;
    return {
      index: idx + 1,
      id: `beat-${idx + 1}`,
      file: comp.id,
      role: idx === 0 ? "establishing" : idx === count - 1 ? "resolve" : "hero",
      shotType: "custom",
      symmetry: "mixed",
      focalPoint: "",
      energy: 50,
      start,
      duration: Math.max(0.5, duration),
      heroAt: Number((start + duration * 0.52).toFixed(2))
    };
  });
}

export async function openSession({
  absProject,
  brief,
  browser,
  parseEnergyValue,
  comp = null,
  serveUrl = null,
  rebuild = false
}) {
  let server = null;
  let baseUrl = serveUrl;

  if (!baseUrl) {
    const entryRel = findRemotionEntry(absProject, brief);
    const { bundleDir, cached } = ensureRemotionBundle(absProject, entryRel, { rebuild });
    if (cached) {
      console.log(`Remotion bundle cache hit: ${bundleDir}`);
    } else {
      console.log(`Remotion bundle built: ${bundleDir}`);
    }
    server = await startStaticServer(bundleDir);
    baseUrl = server.baseUrl;
  }

  const targetUrl = baseUrl.endsWith(".html") ? baseUrl : `${baseUrl.replace(/\/+$/, "")}/index.html`;
  await browser.setViewport(brief?.format?.width || 1080, brief?.format?.height || 1920);
  await browser.navigate(targetUrl);

  // Wait briefly for Remotion bundle globals to register
  const comps = await browser.evalJS(`(async () => {
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline && typeof window.getStaticCompositions !== 'function') {
      await new Promise(r => setTimeout(r, 30));
    }
    if (typeof window.getStaticCompositions !== 'function') {
      throw new Error('Remotion bundle did not expose window.getStaticCompositions()');
    }
    return await window.getStaticCompositions();
  })()`);

  if (!Array.isArray(comps) || !comps.length) {
    if (server) await server.close();
    throw new Error(`No Remotion <Composition> found in ${absProject}`);
  }

  const wantedId = comp || brief?.remotion?.compositionId || null;
  const selected = wantedId ? comps.find((c) => c.id === wantedId) : comps[0];
  if (!selected) {
    if (server) await server.close();
    throw new Error(
      `Remotion composition "${wantedId}" not found. Available: ${comps.map((c) => c.id).join(", ")}`
    );
  }

  const width = selected.width || brief?.format?.width || 1920;
  const height = selected.height || brief?.format?.height || 1080;
  const fps = selected.fps || brief?.format?.fps || 30;
  const durationInFrames = selected.durationInFrames || Math.round((brief?.audio?.duration || 6) * fps);
  const totalDuration = durationInFrames / fps;

  await browser.setViewport(width, height);

  // Switch Remotion bundle into pure composition render mode + install error capture
  await browser.evalJS(`(async () => {
    window.__dfmErrors = [];
    window.addEventListener('error', (ev) => {
      window.__dfmErrors.push(ev?.error?.message || ev?.message || 'Script error');
    });
    window.addEventListener('unhandledrejection', (ev) => {
      window.__dfmErrors.push(ev?.reason?.message || String(ev?.reason || 'Unhandled rejection'));
    });

    const comp = ${JSON.stringify(selected)};
    window.remotion_setBundleMode({
      type: "composition",
      compositionName: comp.id,
      serializedResolvedPropsWithSchema: comp.serializedResolvedPropsWithCustomSchema || "{}",
      compositionDurationInFrames: comp.durationInFrames,
      compositionFps: comp.fps,
      compositionHeight: comp.height,
      compositionWidth: comp.width,
      compositionDefaultCodec: comp.defaultCodec ?? null,
      compositionDefaultOutName: comp.defaultOutName ?? null,
      compositionDefaultVideoImageFormat: comp.defaultVideoImageFormat ?? null,
      compositionDefaultPixelFormat: comp.defaultPixelFormat ?? null,
      compositionDefaultProResProfile: comp.defaultProResProfile ?? null,
      compositionDefaultSampleRate: comp.defaultSampleRate ?? null
    });

    window.__dfmWaitReady = async () => {
      const deadline = Date.now() + 12000;
      while (Date.now() < deadline) {
        const h = window.remotion_delayRenderHandles;
        const count = Array.isArray(h) ? h.length : Object.keys(h || {}).length;
        if (count === 0) break;
        await new Promise(r => setTimeout(r, 15));
      }
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    };
    await window.__dfmWaitReady();
  })()`);

  // Fast full-timeline 0.25s exception sweep across frames
  const runtimeErrors = [];
  const sweepErrs = await browser.evalJS(`(async () => {
    const errs = [];
    const compId = ${JSON.stringify(selected.id)};
    const fps = ${Number(fps)};
    const maxFrame = ${Math.max(0, durationInFrames - 1)};
    const totalSec = ${Number(totalDuration)};
    const step = 0.25;
    let attempt = 100;
    for (let t = 0; t <= totalSec + 0.001; t += step) {
      const f = Math.max(0, Math.min(maxFrame, Math.round(t * fps)));
      const prevLen = window.__dfmErrors.length;
      try {
        window.remotion_setFrame(f, compId, attempt++);
        await new Promise(r => requestAnimationFrame(r));
      } catch (e) {
        errs.push({ t: Number(t.toFixed(2)), message: e?.message || String(e) });
      }
      if (window.__dfmErrors.length > prevLen) {
        errs.push({ t: Number(t.toFixed(2)), message: window.__dfmErrors[window.__dfmErrors.length - 1] });
      }
      if (errs.length >= 6) break;
    }
    return errs;
  })()`);
  for (const e of sweepErrs) {
    runtimeErrors.push({ file: selected.id, t: e.t, message: e.message });
  }

  let seekAttempt = 1000;
  async function seek(_shot, tSec) {
    const frame = Math.max(0, Math.min(durationInFrames - 1, Math.round(Number(tSec) * fps)));
    await browser.evalJS(`(async () => {
      window.remotion_setFrame(${frame}, ${JSON.stringify(selected.id)}, ${seekAttempt++});
      await window.__dfmWaitReady();
      void document.body.offsetHeight;
    })()`);
    return { hasFilm: true, frame };
  }

  const shots = synthesizeShots(selected, brief, parseEnergyValue);

  async function resolveShotTiming(shot) {
    const beatStart = typeof shot.start === "number" ? shot.start : 0;
    const duration = shot.duration || Math.max(0.5, totalDuration - beatStart);
    const heroAt = shot.heroAt ?? Number((beatStart + duration * 0.52).toFixed(2));
    return { hasFilm: true, beatStart, duration, heroAt };
  }

  return {
    engine: "remotion",
    compositionId: selected.id,
    width,
    height,
    fps,
    durationInFrames,
    shots,
    runtimeErrors,
    resolveShotTiming,
    seek,
    close: async () => {
      if (server) await server.close();
    }
  };
}

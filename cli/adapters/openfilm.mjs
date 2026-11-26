/**
 * cli/adapters/openfilm.mjs — OpenFilm HTML/window.film.frame(t) adapter for dfm-kit.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startStaticServer } from "../cdp-browser.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

export function discoverOpenFilmShots(absProject, brief, parseEnergyValue) {
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
      energy: parseEnergyValue(s.energy),
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
  const fps = brief?.format?.fps || 30;
  return { shots, width, height, fps };
}

export async function openSession({ absProject, brief, browser, parseEnergyValue }) {
  const { shots, width, height, fps } = discoverOpenFilmShots(absProject, brief, parseEnergyValue);
  const serveRoot = absProject.startsWith(REPO_ROOT) ? REPO_ROOT : absProject;
  const relProjectFromRoot = path.relative(serveRoot, absProject).replaceAll("\\", "/");
  const server = await startStaticServer(serveRoot);

  let loadedUrl = null;
  let cachedFilmInfo = null;
  const sweptUrls = new Set();
  const runtimeErrors = [];

  async function ensureShotLoaded(shot) {
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
    return cachedFilmInfo;
  }

  async function resolveShotTiming(shot) {
    const filmInfo = await ensureShotLoaded(shot);
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
    return { hasFilm: filmInfo.hasFilm, beatStart, duration, heroAt };
  }

  async function seek(shot, tSec) {
    const filmInfo = await ensureShotLoaded(shot);
    if (filmInfo.hasFilm) {
      await browser.evalJS(`window.film.frame(${Number(tSec)}); void document.body.offsetHeight;`);
    }
    return { hasFilm: filmInfo.hasFilm };
  }

  return {
    engine: "openfilm",
    compositionId: null,
    width,
    height,
    fps,
    shots,
    runtimeErrors,
    resolveShotTiming,
    seek,
    close: () => server.close()
  };
}

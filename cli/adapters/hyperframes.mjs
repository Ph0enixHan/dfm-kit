/**
 * cli/adapters/hyperframes.mjs — Zero-dependency HyperFrames CDP adapter for dfm-kit.
 * Supports standalone index.html compositions AND modular data-composition-src sub-compositions
 * (<template> transport, scoped #root CSS, nested window.__timelines seeking, and data-start/data-duration clips).
 * Can also connect directly to a running `npx hyperframes preview` server via --serve-url.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startStaticServer } from "../cdp-browser.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

function findHyperFramesEntry(absProject, brief) {
  if (fs.existsSync(absProject) && fs.statSync(absProject).isFile()) {
    return path.basename(absProject);
  }
  const candidates = [brief?.hyperframes?.entry, "index.html", "composition.html"].filter(Boolean);
  for (const rel of candidates) {
    if (fs.existsSync(path.resolve(absProject, rel))) return rel.replaceAll("\\", "/");
  }
  throw new Error(
    `HyperFrames entry HTML not found in ${absProject} (expected index.html or brief.hyperframes.entry)`
  );
}

const HF_INIT_SCRIPT = `
(() => {
  window.__timelines = window.__timelines || {};
  window.__dfmHfErrors = [];
  window.__hfForceTimelineRebind = window.__hfForceTimelineRebind || (() => {});
  window.addEventListener('error', (ev) => {
    window.__dfmHfErrors.push(ev?.error?.message || ev?.message || 'Script error');
  });
  window.addEventListener('unhandledrejection', (ev) => {
    window.__dfmHfErrors.push(ev?.reason?.message || String(ev?.reason || 'Unhandled rejection'));
  });
})();
`;

export async function openSession({
  absProject,
  brief,
  browser,
  parseEnergyValue,
  serveUrl = null
}) {
  const isFile = fs.existsSync(absProject) && fs.statSync(absProject).isFile();
  const projectDir = isFile ? path.dirname(absProject) : absProject;
  const entryRel = findHyperFramesEntry(absProject, brief);

  let server = null;
  let targetUrl = serveUrl;

  if (!targetUrl) {
    const serveRoot = projectDir.startsWith(REPO_ROOT) ? REPO_ROOT : projectDir;
    const relFromRoot = path.relative(serveRoot, path.resolve(projectDir, entryRel)).replaceAll("\\", "/");
    server = await startStaticServer(serveRoot);
    targetUrl = `${server.baseUrl}/${relFromRoot}`;
  }

  await browser.addInitScript(HF_INIT_SCRIPT);
  await browser.setViewport(brief?.format?.width || 1920, brief?.format?.height || 1080);
  await browser.navigate(targetUrl);

  // Mount sub-compositions (<template> transport), size root, collect metadata, and install deterministic seeker
  const meta = await browser.evalJS(`(async () => {
    // Inject runtime inactive-clip hide rule (preserves GSAP geometry while hiding inactive clips from visuals & DOM checks)
    if (!document.getElementById('__dfm-hf-runtime-css')) {
      const st = document.createElement('style');
      st.id = '__dfm-hf-runtime-css';
      st.textContent = '[data-hf-inactive="true"] { visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }';
      document.head.appendChild(st);
    }

    const rootEl = document.querySelector('[data-composition-id]') || document.getElementById('root') || document.body;
    const rootId = rootEl.getAttribute('data-composition-id') || 'main';
    const width = Number(rootEl.getAttribute('data-width')) || ${brief?.format?.width || 1920};
    const height = Number(rootEl.getAttribute('data-height')) || ${brief?.format?.height || 1080};
    const attrDur = Number(rootEl.getAttribute('data-duration')) || 0;

    // Ensure root composition fills viewport pixels (matching HyperFrames runtime stamping)
    document.documentElement.style.width = width + 'px';
    document.documentElement.style.height = height + 'px';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.width = width + 'px';
    document.body.style.height = height + 'px';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    if (rootEl && rootEl !== document.body) {
      rootEl.style.width = width + 'px';
      rootEl.style.height = height + 'px';
      if (!getComputedStyle(rootEl).position || getComputedStyle(rootEl).position === 'static') {
        rootEl.style.position = 'relative';
      }
    }

    // Mount any sub-compositions referenced via data-composition-src
    const subComps = [];
    const hosts = [...document.querySelectorAll('[data-composition-src]')];
    for (let idx = 0; idx < hosts.length; idx++) {
      const host = hosts[idx];
      const src = host.getAttribute('data-composition-src');
      const hostId = host.getAttribute('data-composition-id') || host.id || ('sub-' + idx);
      const start = Number(host.getAttribute('data-start')) || 0;
      const dur = Number(host.getAttribute('data-duration')) || 0;
      host.setAttribute('data-hf-sub-host', hostId);
      if (!host.style.position) host.style.position = 'absolute';
      if (!host.style.inset && !host.style.width) {
        host.style.inset = '0';
        host.style.width = '100%';
        host.style.height = '100%';
      }

      if (!host.children.length && src) {
        const resp = await fetch(src);
        if (!resp.ok) throw new Error('Failed to load HyperFrames sub-composition: ' + src + ' (' + resp.status + ')');
        const htmlText = await resp.text();
        const doc = new DOMParser().parseFromString(htmlText, 'text/html');
        const tpl = doc.querySelector('template');
        const frag = tpl ? tpl.content.cloneNode(true) : (() => {
          const f = document.createDocumentFragment();
          while (doc.body.firstChild) f.appendChild(doc.body.firstChild);
          return f;
        })();

        // Scope sub-composition #root styles and prevent duplicate #root id collision
        const innerRoot = frag.querySelector('[data-composition-id]') || frag.querySelector('#root');
        const innerId = innerRoot?.getAttribute('data-composition-id') || hostId;
        if (innerRoot && innerRoot.id === 'root') {
          innerRoot.removeAttribute('id');
          innerRoot.setAttribute('data-hf-inner-root', innerId);
        }
        for (const sEl of frag.querySelectorAll('style')) {
          sEl.textContent = sEl.textContent.replace(/#root(?![A-Za-z0-9_-])/g, '[data-hf-inner-root="' + innerId + '"]');
        }

        const scripts = [...frag.querySelectorAll('script')];
        for (const sc of scripts) sc.remove();

        host.appendChild(frag);
        if (innerRoot) {
          innerRoot.style.position = innerRoot.style.position || 'relative';
          innerRoot.style.width = '100%';
          innerRoot.style.height = '100%';
        }

        // Execute inline/module scripts inside the sub-composition template
        for (const sc of scripts) {
          const live = document.createElement('script');
          for (const attr of sc.attributes) live.setAttribute(attr.name, attr.value);
          if (sc.src) {
            await new Promise((res, rej) => {
              live.onload = res;
              live.onerror = () => rej(new Error('Failed to load sub-comp script: ' + sc.src));
              document.head.appendChild(live);
            });
          } else {
            live.textContent = sc.textContent;
            host.appendChild(live);
          }
        }

        subComps.push({ id: innerId, hostId, src, start, duration: dur });
      } else {
        subComps.push({ id: hostId, hostId, src, start, duration: dur });
      }
    }

    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    // Infer total duration from root attribute, timelines, or clips
    const getTlDur = (tl) => {
      if (!tl) return 0;
      if (typeof tl.totalDuration === 'function') return Number(tl.totalDuration()) || 0;
      if (typeof tl.duration === 'function') return Number(tl.duration()) || 0;
      return 0;
    };

    const allClips = [...document.querySelectorAll('[data-start][data-duration]')].filter((el) => el !== rootEl);
    let maxClipEnd = 0;
    const discoveredBeats = [];
    for (const el of allClips) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'audio' || tag === 'video') continue;
      const start = Number(el.getAttribute('data-start')) || 0;
      const duration = Number(el.getAttribute('data-duration')) || 0;
      if (start + duration > maxClipEnd) maxClipEnd = start + duration;
      // Only treat top-level clips or sub-comp hosts as beat candidates
      const parentSub = el.parentElement?.closest('[data-composition-src]');
      if (!parentSub && duration >= 0.5) {
        discoveredBeats.push({
          id: el.getAttribute('data-composition-id') || el.id || ('clip-' + (discoveredBeats.length + 1)),
          start,
          duration
        });
      }
    }

    const tlKeys = Object.keys(window.__timelines || {});
    let maxTlDur = 0;
    for (const k of tlKeys) maxTlDur = Math.max(maxTlDur, getTlDur(window.__timelines[k]));
    const totalDuration = attrDur || Math.max(maxClipEnd, maxTlDur) || 5;

    // Install deterministic seeker used for both 0.25s sweep and frame capture
    const subMap = new Map(subComps.map((s) => [s.id, s]));
    window.__dfmHfSeek = (tSec) => {
      const t = Math.max(0, Math.min(totalDuration, Number(tSec) || 0));

      // 1. Update clip visibility windows ([start, start + duration), holding last frame at exact end)
      for (const el of allClips) {
        const tag = el.tagName.toLowerCase();
        if (tag === 'audio' || tag === 'video') continue;
        const parentHost = el.parentElement?.closest('[data-composition-src]');
        const baseStart = parentHost ? (Number(parentHost.getAttribute('data-start')) || 0) : 0;
        const localStart = Number(el.getAttribute('data-start')) || 0;
        const dur = Number(el.getAttribute('data-duration')) || 0;
        const absStart = baseStart + localStart;
        const absEnd = absStart + dur;
        const active =
          (t >= absStart - 1e-4 && t < absEnd - 1e-4) ||
          (Math.abs(t - totalDuration) < 1e-3 && absEnd >= totalDuration - 1e-3);
        if (active) el.removeAttribute('data-hf-inactive');
        else el.setAttribute('data-hf-inactive', 'true');
      }

      // 2. Seek every registered timeline (root in global time; sub-compositions in local time)
      const tls = window.__timelines || {};
      const keys = Object.keys(tls);
      for (const key of keys) {
        const tl = tls[key];
        if (!tl) continue;
        const sub = subMap.get(key);
        const localT = sub
          ? Math.max(0, Math.min(sub.duration || totalDuration, t - sub.start))
          : t;
        if (typeof tl.pause === 'function' && tl.pause.length >= 1) {
          tl.pause(localT, false);
        } else if (typeof tl.time === 'function') {
          tl.time(localT, false);
        } else if (typeof tl.seek === 'function') {
          tl.seek(localT, false);
        } else if (typeof tl.frame === 'function') {
          tl.frame(localT);
        }
      }
    };

    window.__dfmHfSeek(0);
    return {
      rootId,
      width,
      height,
      totalDuration,
      timelineKeys: tlKeys,
      subComps,
      discoveredBeats
    };
  })()`);

  await browser.setViewport(meta.width, meta.height);

  // Fast 0.25s full-timeline JS exception sweep
  const runtimeErrors = [];
  const sweepErrs = await browser.evalJS(`(() => {
    const errs = [];
    const dur = ${Number(meta.totalDuration)};
    const step = 0.25;
    for (let t = 0; t <= dur + 0.001; t += step) {
      const tt = Math.min(dur, Number(t.toFixed(3)));
      const prevLen = window.__dfmHfErrors.length;
      try { window.__dfmHfSeek(tt); }
      catch (e) { errs.push({ t: tt, message: e?.message || String(e) }); }
      if (window.__dfmHfErrors.length > prevLen) {
        errs.push({ t: tt, message: window.__dfmHfErrors[window.__dfmHfErrors.length - 1] });
      }
      if (errs.length >= 6) break;
    }
    return errs;
  })()`);
  for (const e of sweepErrs) {
    runtimeErrors.push({ file: entryRel, t: e.t, message: e.message });
  }

  // Build normalized shots list (brief.json > discovered clips/sub-comps > synthesized evenly spaced beats)
  let shots = [];
  if (brief?.shots?.length) {
    shots = brief.shots.map((s, idx) => ({
      index: idx + 1,
      id: s.id || `beat-${idx + 1}`,
      file: s.file || entryRel,
      role: s.role || "hero",
      shotType: s.shotType || "custom",
      symmetry: s.symmetry || "mixed",
      focalPoint: s.focalPoint || "",
      energy: parseEnergyValue(s.energy),
      start: typeof s.start === "number" ? s.start : 0,
      duration: s.duration || Math.max(1, Number((meta.totalDuration / brief.shots.length).toFixed(2))),
      heroAt: typeof s.heroAt === "number" ? s.heroAt : null
    }));
  } else if (meta.discoveredBeats.length >= 2) {
    shots = meta.discoveredBeats.map((b, idx) => ({
      index: idx + 1,
      id: b.id,
      file: entryRel,
      role: idx === 0 ? "establishing" : idx === meta.discoveredBeats.length - 1 ? "resolve" : "hero",
      shotType: "custom",
      symmetry: "mixed",
      focalPoint: "",
      energy: 50,
      start: b.start,
      duration: b.duration,
      heroAt: Number((b.start + b.duration * 0.52).toFixed(2))
    }));
  } else {
    const count = Math.max(2, Math.min(6, Math.round(meta.totalDuration / 2.5) || 4));
    const segDur = Number((meta.totalDuration / count).toFixed(2));
    shots = Array.from({ length: count }, (_, idx) => {
      const start = Number((idx * segDur).toFixed(2));
      const duration = idx === count - 1 ? Number((meta.totalDuration - start).toFixed(2)) : segDur;
      return {
        index: idx + 1,
        id: `beat-${idx + 1}`,
        file: entryRel,
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

  const hasFilm = meta.timelineKeys.length > 0 || meta.discoveredBeats.length > 0;

  async function resolveShotTiming(shot) {
    const beatStart = typeof shot.start === "number" ? shot.start : 0;
    const duration = shot.duration || Math.max(0.5, meta.totalDuration - beatStart);
    const heroAt = shot.heroAt ?? Number((beatStart + duration * 0.52).toFixed(2));
    return { hasFilm, beatStart, duration, heroAt };
  }

  async function seek(_shot, tSec) {
    await browser.evalJS(`(() => {
      window.__dfmHfSeek(${Number(tSec)});
      void document.body.offsetHeight;
    })()`);
    return { hasFilm };
  }

  return {
    engine: "hyperframes",
    compositionId: meta.rootId,
    width: meta.width,
    height: meta.height,
    fps: brief?.format?.fps || 30,
    shots,
    runtimeErrors,
    resolveShotTiming,
    seek,
    close: async () => {
      if (server) await server.close();
    }
  };
}

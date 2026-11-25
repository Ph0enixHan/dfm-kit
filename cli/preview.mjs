/**
 * preview.mjs — Renders a deterministic playable MP4 preview of any dfm-kit project
 * Drives headless Chrome via CDP frame-by-frame and pipes PNGs directly into ffmpeg (H.264 yuv420p).
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchHeadlessBrowser, startStaticServer } from "./cdp-browser.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

export async function renderPreviewMp4(projectDir, { fps = 30, outName = "preview.mp4" } = {}) {
  const absProject = path.resolve(projectDir);
  const briefPath = path.join(absProject, "brief.json");
  if (!fs.existsSync(briefPath)) {
    throw new Error(`brief.json not found: ${briefPath}`);
  }
  const brief = JSON.parse(fs.readFileSync(briefPath, "utf8"));
  const width = brief.format?.width || 1080;
  const height = brief.format?.height || 1920;

  // Keep preview crisp & fast (max 720p width for 9:16 or 1280p width for 16:9)
  const scale = width > height ? Math.min(1, 1280 / width) : Math.min(1, 720 / width);
  const outW = Math.round((width * scale) / 2) * 2;
  const outH = Math.round((height * scale) / 2) * 2;

  const outDir = path.join(absProject, "dfm-out");
  fs.mkdirSync(outDir, { recursive: true });
  const outMp4 = path.join(outDir, outName);

  const serveRoot = absProject.startsWith(REPO_ROOT) ? REPO_ROOT : absProject;
  const relProjectFromRoot = path.relative(serveRoot, absProject).replaceAll("\\", "/");
  const server = await startStaticServer(serveRoot);
  const browser = await launchHeadlessBrowser();

  // Check if single continuous file or multi-file shots
  const uniqueFiles = [...new Set((brief.shots || []).map((s) => s.file))];
  const isSingleContinuous = uniqueFiles.length === 1;

  const ff = spawn(
    "ffmpeg",
    [
      "-y",
      "-loglevel", "error",
      "-f", "image2pipe",
      "-vcodec", "png",
      "-framerate", String(fps),
      "-i", "-",
      "-vf", `scale=${outW}:${outH}:flags=lanczos`,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      outMp4
    ],
    { stdio: ["pipe", "inherit", "pipe"] }
  );

  let ffStderr = "";
  ff.stderr.on("data", (d) => {
    ffStderr += d.toString("utf8");
  });

  function writeFrame(buf) {
    return new Promise((resolve, reject) => {
      if (!ff.stdin.write(buf)) {
        const onDrain = () => {
          ff.stdin.off("error", onError);
          resolve();
        };
        const onError = (err) => {
          ff.stdin.off("drain", onDrain);
          reject(err);
        };
        ff.stdin.once("drain", onDrain);
        ff.stdin.once("error", onError);
      } else {
        resolve();
      }
    });
  }

  let totalFrames = 0;

  try {
    await browser.setViewport(width, height);

    if (isSingleContinuous) {
      const file = uniqueFiles[0];
      const urlPath = relProjectFromRoot ? `${relProjectFromRoot}/${file}` : file;
      await browser.navigate(`${server.baseUrl}/${urlPath}`);
      const dur = await browser.evalJS(`(async () => {
        if (window.film?.ready) await window.film.ready;
        if (document.fonts?.ready) await document.fonts.ready;
        return window.film?.duration || 10;
      })()`);

      const nFrames = Math.ceil(dur * fps);
      for (let i = 0; i < nFrames; i++) {
        const t = Math.min(dur, i / fps);
        await browser.evalJS(`window.film.frame(${t.toFixed(4)}); void document.body.offsetHeight;`);
        const png = await browser.screenshotPng({ width, height });
        await writeFrame(png);
        totalFrames++;
        if (i % 30 === 0 || i === nFrames - 1) {
          process.stdout.write(`\rRendering frames: ${i + 1}/${nFrames} (${Math.round(((i + 1) / nFrames) * 100)}%)`);
        }
      }
      process.stdout.write("\n");
    } else {
      for (const shot of brief.shots) {
        const urlPath = relProjectFromRoot ? `${relProjectFromRoot}/${shot.file}` : shot.file;
        await browser.navigate(`${server.baseUrl}/${urlPath}`);
        const dur = await browser.evalJS(`(async () => {
          if (window.film?.ready) await window.film.ready;
          if (document.fonts?.ready) await document.fonts.ready;
          return window.film?.duration || ${shot.duration || 3};
        })()`);
        const nFrames = Math.ceil(dur * fps);
        for (let i = 0; i < nFrames; i++) {
          const t = Math.min(dur, i / fps);
          await browser.evalJS(`window.film.frame(${t.toFixed(4)}); void document.body.offsetHeight;`);
          const png = await browser.screenshotPng({ width, height });
          await writeFrame(png);
          totalFrames++;
        }
      }
    }

    ff.stdin.end();
    await new Promise((resolve, reject) => {
      ff.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg encoding failed (code=${code}): ${ffStderr}`));
      });
    });

    return { outMp4, totalFrames, fps, outW, outH };
  } finally {
    await browser.close();
    await server.close();
  }
}

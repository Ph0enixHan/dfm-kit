#!/usr/bin/env node
/**
 * textures-prep.mjs — Pre-generates lightweight <=1200px working proxies in textures/web/
 * so Agents can copy tactile textures into OpenFilm assets/ in <10ms without running ffmpeg on 50MB scans.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const TEX_ROOT = path.join(REPO_ROOT, "textures");
const WEB_ROOT = path.join(TEX_ROOT, "web");
const MANIFEST_PATH = path.join(TEX_ROOT, "manifest.json");

const convertAll = process.argv.includes("--all");
const MAX_PER_PACK = convertAll ? 999 : 6;
const CONCURRENCY = 4;

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${err}`));
    });
    p.on("error", reject);
  });
}

async function mapPool(items, limit, fn) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  fs.mkdirSync(WEB_ROOT, { recursive: true });

  const jobs = [];

  for (const pack of manifest.packs) {
    const srcDir = path.join(TEX_ROOT, pack.folder);
    if (!fs.existsSync(srcDir)) continue;

    const files = fs
      .readdirSync(srcDir)
      .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
      .sort()
      .slice(0, MAX_PER_PACK);

    const outDir = path.join(WEB_ROOT, pack.id);
    fs.mkdirSync(outDir, { recursive: true });
    const keepAlpha = pack.type.includes("png");
    pack.webFolder = `textures/web/${pack.id}`;
    pack.webFiles = [];

    files.forEach((file, i) => {
      const ext = keepAlpha ? ".png" : ".jpg";
      const outName = `${pack.id}-${String(i + 1).padStart(2, "0")}${ext}`;
      const srcPath = path.join(srcDir, file);
      const dstPath = path.join(outDir, outName);
      pack.webFiles.push(`textures/web/${pack.id}/${outName}`);
      if (!fs.existsSync(dstPath)) {
        jobs.push({ srcPath, dstPath, keepAlpha, packId: pack.id, outName });
      }
    });
  }

  console.log(`Generating lightweight texture proxies: ${jobs.length} file(s) (concurrency ${CONCURRENCY})...`);
  let done = 0;
  await mapPool(jobs, CONCURRENCY, async (job) => {
    const vf = "scale='if(gt(iw,ih),min(1200,iw),-2)':'if(gt(iw,ih),-2,min(1200,ih))'";
    const args = job.keepAlpha
      ? ["-i", job.srcPath, "-vf", vf, "-frames:v", "1", "-compression_level", "6", job.dstPath]
      : ["-i", job.srcPath, "-vf", vf, "-frames:v", "1", "-q:v", "4", job.dstPath];
    await runFfmpeg(args);
    done++;
    if (done % 6 === 0 || done === jobs.length) {
      console.log(`  Progress: ${done}/${jobs.length}`);
    }
  });

  manifest.version = "0.3.0";
  manifest.description =
    "Catalog of real tactile texture packs in textures/. Ready-to-use <=1200px proxies are pre-baked in textures/web/ (copy directly into project assets/ with zero ffmpeg wait).";
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Lightweight texture proxies and manifest.json ready: ${WEB_ROOT}`);
}

main().catch((err) => {
  console.error("Texture proxy generation failed:", err.message || err);
  process.exit(1);
});

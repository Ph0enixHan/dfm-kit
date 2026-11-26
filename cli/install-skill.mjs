#!/usr/bin/env node
/**
 * install-skill.mjs — Cross-platform 1-command installer for OpenFilm Studio (and coding agents).
 * Copies skill/SKILL.md into Skills/dfm-kit/ and automatically binds <DFM_ROOT> to your local repo path.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SRC_SKILL = path.join(REPO_ROOT, "skill", "SKILL.md");

export function getDefaultOpenFilmSkillsDir() {
  if (process.env.DFM_OPENFILM_SKILLS) return process.env.DFM_OPENFILM_SKILLS;
  if (process.platform === "darwin") {
    const moviesDir = path.join(os.homedir(), "Movies", "OpenFilm", "Skills");
    if (fs.existsSync(moviesDir)) return moviesDir;
  }
  return path.join(os.homedir(), "Videos", "OpenFilm", "Skills");
}

export function buildLocalTextureCatalog(repoRoot, normalizedRoot) {
  const manifestPath = path.join(repoRoot, "textures", "manifest.json");
  const webDir = path.join(repoRoot, "textures", "web");
  const imgRe = /\.(png|jpe?g|webp)$/i;
  const lines = [];
  let packs = 0;
  let files = 0;

  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      for (const pack of manifest.packs || []) {
        const existing = (pack.webFiles || []).filter((f) => fs.existsSync(path.join(repoRoot, f)));
        if (!existing.length) continue;
        packs++;
        files += existing.length;
        const first = path.basename(existing[0]);
        const last = path.basename(existing[existing.length - 1]);
        lines.push(
          `- **\`${pack.id}\`** — \`${normalizedRoot}/${pack.webFolder}/\` (\`${first}\`..\`${last}\`, ${existing.length} files) · blend: ${pack.recommendedBlend || "normal"} · ${pack.mood || ""}`
        );
      }
    } catch {
      /* fall through to folder scan */
    }
  }

  if (!lines.length && fs.existsSync(webDir)) {
    for (const sub of fs.readdirSync(webDir, { withFileTypes: true })) {
      if (!sub.isDirectory()) continue;
      const imgs = fs.readdirSync(path.join(webDir, sub.name)).filter((f) => imgRe.test(f)).sort();
      if (!imgs.length) continue;
      packs++;
      files += imgs.length;
      lines.push(`- **\`${sub.name}\`** — \`${normalizedRoot}/textures/web/${sub.name}/\` (\`${imgs[0]}\`..\`${imgs[imgs.length - 1]}\`, ${imgs.length} files)`);
    }
  }

  if (!lines.length) {
    return {
      text: "No local scan textures detected — `dfm-craft.css` procedural overlays work out of the box (optionally drop CC0 scans into `textures/` and run `node cli/textures-prep.mjs`).",
      packs: 0,
      files: 0
    };
  }
  return {
    text:
      "**Pre-baked ≤1200px real scan proxies detected on this machine** — copy 1–2 matching files directly into project `assets/` (zero ffmpeg wait) whenever paper, print halftone, or analog film tactility fits the story:\n" +
      lines.join("\n"),
    packs,
    files
  };
}

export function installOpenFilmSkill(customSkillsDir) {
  if (!fs.existsSync(SRC_SKILL)) {
    throw new Error(`Skill template not found: ${SRC_SKILL}`);
  }
  const skillsRoot = customSkillsDir ? path.resolve(customSkillsDir) : getDefaultOpenFilmSkillsDir();
  const destDir = path.join(skillsRoot, "dfm-kit");
  fs.mkdirSync(destDir, { recursive: true });

  const normalizedRoot = REPO_ROOT.replaceAll("\\", "/");
  const catalog = buildLocalTextureCatalog(REPO_ROOT, normalizedRoot);
  const content = fs
    .readFileSync(SRC_SKILL, "utf8")
    .replaceAll("<DFM_ROOT>", normalizedRoot)
    .replaceAll("<!-- DFM_LOCAL_TEXTURES -->", catalog.text);

  const destFile = path.join(destDir, "SKILL.md");
  fs.writeFileSync(destFile, content, "utf8");
  return { destFile, repoRoot: normalizedRoot, texturePacksCount: catalog.packs, textureFilesCount: catalog.files };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const res = installOpenFilmSkill(process.argv[2]);
  console.log(`Installed dfm-kit skill to: ${res.destFile}`);
  console.log(`Bound local repo root: ${res.repoRoot}`);
  console.log(`Local texture packs injected: ${res.texturePacksCount} (${res.textureFilesCount} files)`);
}

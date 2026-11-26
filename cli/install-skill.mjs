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
const SRC_SKILLS = {
  openfilm: { file: path.join(REPO_ROOT, "skill", "SKILL.md"), folder: "dfm-kit" },
  remotion: { file: path.join(REPO_ROOT, "skill", "SKILL.remotion.md"), folder: "dfm-kit-remotion" },
  hyperframes: { file: path.join(REPO_ROOT, "skill", "SKILL.hyperframes.md"), folder: "dfm-kit-hyperframes" }
};

export function getDefaultOpenFilmSkillsDir() {
  if (process.env.DFM_OPENFILM_SKILLS) return process.env.DFM_OPENFILM_SKILLS;
  if (process.platform === "darwin") {
    const moviesDir = path.join(os.homedir(), "Movies", "OpenFilm", "Skills");
    if (fs.existsSync(moviesDir)) return moviesDir;
  }
  return path.join(os.homedir(), "Videos", "OpenFilm", "Skills");
}

export function buildLocalTextureCatalog(repoRoot, normalizedRoot, engine = "openfilm") {
  const manifestPath = path.join(repoRoot, "textures", "manifest.json");
  const webDir = path.join(repoRoot, "textures", "web");
  const imgRe = /\.(png|jpe?g|webp)$/i;
  const lines = [];
  let packs = 0;
  let files = 0;
  const destHint =
    engine === "remotion"
      ? "project `public/textures/` and mount via `<Img src={staticFile('textures/...')} style={textureOverlayStyle({ ground: 'dark' | 'light' })} data-bleed=\"true\" />`"
      : engine === "hyperframes"
        ? "project `assets/textures/` and reference via relative `assets/textures/...` (no leading `/`)"
        : "project `assets/`";

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
      `**Pre-baked ≤1200px real scan proxies detected on this machine** — copy 1–2 ground-matched files directly into ${destHint} (zero ffmpeg wait). Match ground polarity and keep tactile opacity clearly visible (never < 0.14):\n` +
      `- **Dark grounds**: prefer \`analog-film-bg\` (\`screen\`, opacity \`0.22–0.38\`), \`grainy-film-overlays\` (\`screen\`, \`0.18–0.34\`), or \`film-borders\` (\`screen\`, \`0.55–0.85\`).\n` +
      `- **Light grounds**: prefer \`cardboard-paper\` (\`multiply\`, opacity \`0.26–0.45\`), \`crumpled-paper\` (\`multiply\`, \`0.38–0.65\`, great for 8–12fps Paper Boil), or \`halftone-pack\` (\`multiply\`, \`0.16–0.30\`).\n` +
      lines.join("\n"),
    packs,
    files
  };
}

export function installOpenFilmSkill(customSkillsDir, { engine = "openfilm" } = {}) {
  const normEngine = String(engine || "openfilm").trim().toLowerCase();
  const targetSpec = SRC_SKILLS[normEngine];
  if (!targetSpec) {
    throw new Error(`Unsupported skill engine "${engine}". Supported: openfilm, remotion, hyperframes`);
  }
  if (!fs.existsSync(targetSpec.file)) {
    throw new Error(`Skill template not found: ${targetSpec.file}`);
  }
  const skillsRoot = customSkillsDir ? path.resolve(customSkillsDir) : getDefaultOpenFilmSkillsDir();
  const destDir = path.join(skillsRoot, targetSpec.folder);
  fs.mkdirSync(destDir, { recursive: true });

  const normalizedRoot = REPO_ROOT.replaceAll("\\", "/");
  const catalog = buildLocalTextureCatalog(REPO_ROOT, normalizedRoot, normEngine);
  const content = fs
    .readFileSync(targetSpec.file, "utf8")
    .replaceAll("<DFM_ROOT>", normalizedRoot)
    .replaceAll("<!-- DFM_LOCAL_TEXTURES -->", catalog.text);

  const destFile = path.join(destDir, "SKILL.md");
  fs.writeFileSync(destFile, content, "utf8");
  return {
    engine: normEngine,
    destFile,
    repoRoot: normalizedRoot,
    texturePacksCount: catalog.packs,
    textureFilesCount: catalog.files
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const res = installOpenFilmSkill(process.argv[2]);
  console.log(`Installed dfm-kit skill to: ${res.destFile}`);
  console.log(`Bound local repo root: ${res.repoRoot}`);
  console.log(`Local texture packs injected: ${res.texturePacksCount} (${res.textureFilesCount} files)`);
}

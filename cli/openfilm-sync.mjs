/**
 * openfilm-sync.mjs — Packages any dfm-kit project as a standalone native OpenFilm Studio draft
 * Copies runtime assets locally, rewrites relative runtime imports, writes spec-compliant film.html,
 * and places the draft into OpenFilm's Projects directory.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const RUNTIME_DIR = path.join(REPO_ROOT, "runtime");

export function getDefaultOpenFilmProjectsDir() {
  if (process.env.DFM_OPENFILM_PROJECTS) return process.env.DFM_OPENFILM_PROJECTS;
  if (process.platform === "darwin") {
    const moviesDir = path.join(os.homedir(), "Movies", "OpenFilm", "Projects");
    if (fs.existsSync(moviesDir)) return moviesDir;
  }
  return path.join(os.homedir(), "Videos", "OpenFilm", "Projects");
}

function copyDirRecursive(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === "dfm-out" || entry.name === ".git") continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

export function syncToOpenFilm(projectDir, draftName) {
  const absProject = path.resolve(projectDir);
  if (!fs.existsSync(absProject)) {
    throw new Error(`Project directory not found: ${absProject}`);
  }

  const projectsRoot = getDefaultOpenFilmProjectsDir();
  if (!fs.existsSync(projectsRoot)) {
    throw new Error(
      `OpenFilm Studio Projects directory not found: ${projectsRoot} (override via DFM_OPENFILM_PROJECTS)`
    );
  }

  const folderName = draftName || path.basename(absProject);
  const destDir = path.join(projectsRoot, folderName);

  // 1. Copy project files (excluding dfm-out)
  copyDirRecursive(absProject, destDir);

  // 2. Bundle optional runtime files locally if referenced
  for (const rtFile of ["dfm-stage.css", "dfm-craft.css", "dfm-motion.js", "dfm-time.js", "dfm-lens.js"]) {
    const srcRt = path.join(RUNTIME_DIR, rtFile);
    if (fs.existsSync(srcRt)) {
      fs.copyFileSync(srcRt, path.join(destDir, rtFile));
    }
  }

  // 3. Rewrite relative ../../runtime/ references inside copied HTML files to ./
  for (const file of fs.readdirSync(destDir)) {
    if (!/\.(html|htm)$/i.test(file)) continue;
    const full = path.join(destDir, file);
    let content = fs.readFileSync(full, "utf8");
    const updated = content
      .replaceAll("../../runtime/", "./")
      .replaceAll("../runtime/", "./");
    if (updated !== content) {
      fs.writeFileSync(full, updated, "utf8");
    }
  }

  // 4. Ensure assets/ folder exists (standard OpenFilm project convention)
  fs.mkdirSync(path.join(destDir, "assets"), { recursive: true });

  return { destDir, folderName };
}

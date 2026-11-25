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

export function installOpenFilmSkill(customSkillsDir) {
  if (!fs.existsSync(SRC_SKILL)) {
    throw new Error(`Skill template not found: ${SRC_SKILL}`);
  }
  const skillsRoot = customSkillsDir ? path.resolve(customSkillsDir) : getDefaultOpenFilmSkillsDir();
  const destDir = path.join(skillsRoot, "dfm-kit");
  fs.mkdirSync(destDir, { recursive: true });

  const normalizedRoot = REPO_ROOT.replaceAll("\\", "/");
  const content = fs
    .readFileSync(SRC_SKILL, "utf8")
    .replaceAll("<DFM_ROOT>", normalizedRoot);

  const destFile = path.join(destDir, "SKILL.md");
  fs.writeFileSync(destFile, content, "utf8");
  return { destFile, repoRoot: normalizedRoot };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const res = installOpenFilmSkill(process.argv[2]);
  console.log(`Installed dfm-kit skill to: ${res.destFile}`);
  console.log(`Bound local repo root: ${res.repoRoot}`);
}

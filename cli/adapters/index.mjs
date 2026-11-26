/**
 * cli/adapters/index.mjs — Multi-engine detection & adapter registry for dfm-kit.
 * Supported engines: "openfilm" (built-in), "remotion" (built-in). Planned: "hyperframes".
 */

import fs from "node:fs";
import path from "node:path";
import * as openfilmAdapter from "./openfilm.mjs";
import * as remotionAdapter from "./remotion.mjs";

export function detectEngine(projectDir, forcedEngine = null) {
  if (forcedEngine) {
    const norm = String(forcedEngine).trim().toLowerCase();
    if (norm === "openfilm" || norm === "remotion") return norm;
    throw new Error(`Unsupported engine "${forcedEngine}". Supported: openfilm, remotion`);
  }

  const abs = path.resolve(projectDir);
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    return "openfilm";
  }

  const pkgPath = path.join(abs, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps.remotion || deps["@remotion/cli"] || deps["@remotion/bundler"]) {
        return "remotion";
      }
    } catch {
      /* ignore invalid package.json */
    }
  }

  for (const cfg of ["remotion.config.ts", "remotion.config.mjs", "remotion.config.js"]) {
    if (fs.existsSync(path.join(abs, cfg))) return "remotion";
  }

  return "openfilm";
}

export function getAdapter(engine) {
  if (engine === "remotion") return remotionAdapter;
  if (engine === "openfilm") return openfilmAdapter;
  throw new Error(`Unknown engine adapter: ${engine}`);
}

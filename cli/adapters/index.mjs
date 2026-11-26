/**
 * cli/adapters/index.mjs — Multi-engine detection & adapter registry for dfm-kit.
 * Supported engines (all built-in): "openfilm", "remotion", "hyperframes".
 */

import fs from "node:fs";
import path from "node:path";
import * as openfilmAdapter from "./openfilm.mjs";
import * as remotionAdapter from "./remotion.mjs";
import * as hyperframesAdapter from "./hyperframes.mjs";

function looksLikeHyperFramesHtml(filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return false;
  try {
    const head = fs.readFileSync(filePath, "utf8").slice(0, 16000);
    return (
      /\bdata-composition-id\s*=/.test(head) ||
      /\bdata-composition-src\s*=/.test(head) ||
      /\bwindow\.__timelines\b/.test(head)
    );
  } catch {
    return false;
  }
}

export function detectEngine(projectDir, forcedEngine = null) {
  if (forcedEngine) {
    const norm = String(forcedEngine).trim().toLowerCase();
    if (norm === "openfilm" || norm === "remotion" || norm === "hyperframes") return norm;
    throw new Error(`Unsupported engine "${forcedEngine}". Supported: openfilm, remotion, hyperframes`);
  }

  const abs = path.resolve(projectDir);
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    return looksLikeHyperFramesHtml(abs) ? "hyperframes" : "openfilm";
  }

  // 1. HyperFrames detection (index.html with data-composition-id / .hyperframes dir / compositions/)
  if (
    looksLikeHyperFramesHtml(path.join(abs, "index.html")) ||
    fs.existsSync(path.join(abs, ".hyperframes"))
  ) {
    return "hyperframes";
  }

  // 2. Remotion detection
  const pkgPath = path.join(abs, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps.remotion || deps["@remotion/cli"] || deps["@remotion/bundler"]) {
        return "remotion";
      }
      if (deps.hyperframes || deps["@hyperframes/core"]) {
        return "hyperframes";
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
  if (engine === "hyperframes") return hyperframesAdapter;
  if (engine === "openfilm") return openfilmAdapter;
  throw new Error(`Unknown engine adapter: ${engine}`);
}

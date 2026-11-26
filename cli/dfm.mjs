#!/usr/bin/env node
/**
 * dfm.mjs (v1.0) — Fast Style-Agnostic Design-for-Motion Visual Microscope & Color Script CLI
 * Supports OpenFilm, Remotion & HyperFrames (zero npm dependencies; Node 22+ WebSocket/http + Chrome/Edge CDP).
 */

import fs from "node:fs";
import path from "node:path";
import { generateBoards } from "./board.mjs";
import { runAudit } from "./audit.mjs";
import { renderPreviewMp4 } from "./preview.mjs";
import { syncToOpenFilm } from "./openfilm-sync.mjs";
import { extractPaletteFromImage } from "./palette.mjs";
import { snapFrames } from "./snap.mjs";
import { installOpenFilmSkill } from "./install-skill.mjs";

function parseCliArgs(argv) {
  const flags = new Set();
  const opts = {};
  const posArgs = [];
  const valueFlags = new Set(["--engine", "--comp", "--serve-url"]);

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > 0) {
        const k = a.slice(0, eq);
        opts[k.slice(2)] = a.slice(eq + 1);
      } else if (valueFlags.has(a) && i + 1 < argv.length) {
        opts[a.slice(2)] = argv[++i];
      } else {
        flags.add(a);
      }
    } else {
      posArgs.push(a);
    }
  }
  return { flags, opts, posArgs };
}

const { flags, opts, posArgs } = parseCliArgs(process.argv.slice(2));
const [cmd, targetArg, extraArg, thirdArg] = posArgs;
const isFull = flags.has("--full");
const rebuild = flags.has("--rebuild");
const engineOpt = opts.engine || null;
const compOpt = opts.comp || null;
const serveUrlOpt = opts["serve-url"] || null;

function printHelp() {
  console.log(`
dfm-kit v1.0 — Style-agnostic Design-for-Motion visual microscope & Color Script CLI (OpenFilm, Remotion & HyperFrames)

Usage:
  node cli/dfm.mjs check         <projectDir> [--full] [--engine openfilm|remotion|hyperframes] [--comp <Id>] [--serve-url <url>] [--rebuild]
                                 Render sharp review board(s) (<=6 beats/page) + 0.25s crash sweep + Q1-Q16 QA
  node cli/dfm.mjs snap          <target> <t1,t2,...> [outPath] [--engine ...] [--comp <Id>] [--serve-url <url>]
                                 Instant 1-3s frame inspector (OpenFilm scene.html, Remotion dir, or HyperFrames dir/index.html)
  node cli/dfm.mjs palette       <imagePath> [outDir]     Extract OKLCH Color Script, swatch PNG & theme CSS from any reference image
  node cli/dfm.mjs to-openfilm   <projectDir> [draftName] Package & sync directly into OpenFilm Studio Projects
  node cli/dfm.mjs install-skill [skillsDir] [--engine openfilm|remotion|hyperframes]
                                 Install dfm-kit (OpenFilm), dfm-kit-remotion, or dfm-kit-hyperframes skill with local repo path & texture catalog
  node cli/dfm.mjs preview       <projectDir>             Render 30fps MP4 preview (OpenFilm headless CLI outside Studio)
  node cli/dfm.mjs board         <projectDir> [--full]    Render diagnostic board(s) only
  node cli/dfm.mjs audit         <projectDir>             Run Q1-Q16 QA audit only
  node cli/dfm.mjs init          <targetDir> [--engine openfilm|remotion|hyperframes]
                                 Scaffold a style-free brief.json starter
`);
}

function initStarter(targetDir, engine = "openfilm") {
  const abs = path.resolve(targetDir);
  fs.mkdirSync(abs, { recursive: true });
  const briefTemplate = {
    title: "Untitled Film",
    format: { width: 1080, height: 1920, aspect: "9:16", fps: 30, safePreset: "social-strict" },
    ...(engine === "remotion"
      ? { remotion: { entry: "src/index.ts", compositionId: "Main" } }
      : engine === "hyperframes"
        ? { hyperframes: { entry: "index.html", compositionId: "main" } }
        : {}),
    concept: {
      oneLineTreatment: "Describe the core visual metaphor in one sentence (let form grow from content).",
      emotion: "Primary emotional tone",
      tensionPair: ["State A", "State B"]
    },
    visualWorld: {
      medium: "Freeform: 2D vector / Canvas illustration / 3D macro UI / archival collage / WebGL abstract...",
      reduction: "What visual clutter this film deliberately removes",
      amplification: "The 1-2 visual traits amplified into a memorable pattern",
      continuityMethod: "How beats connect naturally without PowerPoint slide fades"
    },
    colorScript: {
      harmony: "complementary",
      proportionBudget: "65% dominant ground / 25% support surface / 10% focal accent",
      roles: {
        dominantGround: "#0a1012",
        supportSurface: "#ede7dc",
        ink: "#f2efe8",
        muted: "#7c8588",
        focalAccent: "#d94e28"
      },
      colorArc: "Cool restrained opening -> warm climax / polarity flip -> calm resolution"
    },
    shots: [
      {
        id: "beat1",
        ...(engine === "remotion" ? {} : { file: engine === "hyperframes" ? "index.html" : "scene.html" }),
        role: "establishing",
        shotType: "wide",
        focalPoint: "Primary focal subject",
        energy: 45,
        start: 0,
        duration: 3.0,
        heroAt: 1.5
      }
    ]
  };
  const briefOut = path.join(abs, "brief.json");
  if (!fs.existsSync(briefOut)) {
    fs.writeFileSync(briefOut, JSON.stringify(briefTemplate, null, 2), "utf8");
  }
  console.log(`Initialized Director Brief starter (${engine}): ${briefOut}`);
}

function printAuditTable(audit) {
  console.log("\n================= Q1-Q16 Design for Motion QA Report (v1.0) =================");
  for (const r of audit.results) {
    const tag =
      r.status === "Pass"
        ? "[PASS]   "
        : r.status === "Review"
          ? "[REVIEW] "
          : r.status === "Fix"
            ? "[FIX]    "
            : "[BLOCKER]";
    console.log(`${tag} ${r.id.padEnd(3)} ${r.name}: ${r.notes.join(" | ")}`);
  }
  console.log("-----------------------------------------------------------------------------");
  console.log(
    `Summary: PASS=${audit.summary.pass}  REVIEW=${audit.summary.review}  FIX=${audit.summary.fix}  BLOCKER=${audit.summary.blocker}`
  );
  console.log(`Report saved: ${audit.mdPath}\n`);
}

async function main() {
  if (!cmd || cmd === "-h" || cmd === "--help") {
    printHelp();
    process.exit(0);
  }

  if (cmd === "install-skill") {
    const res = installOpenFilmSkill(targetArg, { engine: engineOpt || "openfilm" });
    console.log(`Installed dfm-kit (${res.engine}) skill to: ${res.destFile}`);
    console.log(`Bound local repo root: ${res.repoRoot}`);
    console.log(`Local texture packs injected: ${res.texturePacksCount} (${res.textureFilesCount} files)`);
    return;
  }

  if (!targetArg) {
    console.error("Missing target path. Example: node cli/dfm.mjs check .");
    process.exit(1);
  }

  if (cmd === "init") {
    initStarter(targetArg, engineOpt || "openfilm");
    return;
  }

  if (cmd === "snap") {
    const res = await snapFrames(targetArg, extraArg || "1.0", thirdArg || null, {
      engine: engineOpt,
      comp: compOpt,
      serveUrl: serveUrlOpt,
      rebuild
    });
    console.log(`Snapshot saved (${res.engine}, ${res.width}x${res.height}): ${res.outPath}`);
    for (const f of res.frames) {
      console.log(`  - t=${f.t}s: clips=${f.clips}, safeViolations=${f.safeViolations}`);
    }
    return;
  }

  if (cmd === "palette") {
    console.log(`Extracting OKLCH Filmic Color Script: ${path.resolve(targetArg)} ...`);
    const res = await extractPaletteFromImage(targetArg, extraArg);
    console.log("Color Script extracted:");
    console.log(`  - Swatch Card (PNG): ${res.pngPath}`);
    console.log(`  - Color Script (JSON): ${res.jsonPath}`);
    console.log(`  - Theme Variables (CSS): ${res.cssPath}`);
    console.log(`  - Harmony: ${res.paletteJson.harmony}`);
    console.log("  - Suggested Roles:", res.paletteJson.roles);
    return;
  }

  if (cmd === "to-openfilm") {
    const res = syncToOpenFilm(targetArg, extraArg);
    console.log(`Synced to OpenFilm Studio draft: ${res.folderName}`);
    console.log(`  Directory: ${res.destDir}`);
    return;
  }

  if (cmd === "preview") {
    console.log(`Rendering deterministic 30fps MP4 preview: ${path.resolve(targetArg)} ...`);
    const res = await renderPreviewMp4(targetArg, { fps: 30 });
    console.log(`MP4 preview saved (${res.outW}x${res.outH}, ${res.fps}fps, ${res.totalFrames} frames):`);
    console.log(`  - ${res.outMp4}`);
    return;
  }

  if (cmd === "board" || cmd === "check") {
    console.log(
      `Rendering ${isFull ? "5 HD diagnostic boards + review board" : "fast review board(s)"}: ${path.resolve(targetArg)} ...`
    );
    const { report, outputs } = await generateBoards(targetArg, {
      full: isFull,
      engine: engineOpt,
      comp: compOpt,
      serveUrl: serveUrlOpt,
      rebuild
    });
    console.log(`Board(s) generated (engine=${report.engine}${report.compositionId ? `, comp=${report.compositionId}` : ""}):`);
    const pages = outputs.reviewBoards || [outputs.reviewBoard];
    if (pages.length > 1) {
      pages.forEach((p, i) => console.log(`  - Review Board ${i + 1}/${pages.length}: ${p}`));
      console.log("  (Inspect ALL pages — each page holds <=6 beats so every frame stays crisp.)");
    } else {
      console.log(`  - Review Board: ${outputs.reviewBoard}`);
    }
    if (isFull) {
      console.log(`  - Design Board: ${outputs.designBoard}`);
      console.log(`  - Value Board:  ${outputs.valueBoard}`);
      console.log(`  - Color Board:  ${outputs.colorBoard}`);
      console.log(`  - Motion Strip: ${outputs.motionStrip}`);
      console.log(`  - Layout Debug: ${outputs.layoutDebug}`);
    }
  }

  if (cmd === "audit" || cmd === "check") {
    const audit = runAudit(targetArg, { engine: engineOpt });
    printAuditTable(audit);
    if (audit.summary.blocker > 0) {
      process.exitCode = 2;
    }
  }
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});

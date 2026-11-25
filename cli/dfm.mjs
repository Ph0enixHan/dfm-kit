#!/usr/bin/env node
/**
 * dfm.mjs (v0.3) — Fast Style-Agnostic Design-for-Motion Visual Microscope & Color Script CLI for OpenFilm
 * Zero npm dependencies (Node 22+ built-in WebSocket/http + local Chrome/Edge CDP).
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

const rawArgs = process.argv.slice(2);
const flags = new Set(rawArgs.filter((a) => a.startsWith("--")));
const posArgs = rawArgs.filter((a) => !a.startsWith("--"));
const [cmd, targetArg, extraArg, thirdArg] = posArgs;
const isFull = flags.has("--full");

function printHelp() {
  console.log(`
dfm-kit v0.6 — Style-agnostic Design-for-Motion visual microscope & Color Script CLI for programmatic video

Usage:
  node cli/dfm.mjs check         <projectDir> [--full]    Render fast 1-board review-board.png + Q1-Q16 audit (--full for 5 HD boards)
  node cli/dfm.mjs snap          <htmlFile> <t1,t2,...>   Instant 1-2s frame inspector (e.g. snap scene.html 1.2,3.5,6.0)
  node cli/dfm.mjs palette       <imagePath> [outDir]     Extract OKLCH Color Script, swatch PNG & theme CSS from any reference image
  node cli/dfm.mjs to-openfilm   <projectDir> [draftName] Package & sync directly into OpenFilm Studio Projects
  node cli/dfm.mjs install-skill [skillsDir]              Install the dfm-kit skill into OpenFilm Studio with your local repo path
  node cli/dfm.mjs preview       <projectDir>             Render 30fps MP4 preview (for headless CLI outside Studio)
  node cli/dfm.mjs board         <projectDir> [--full]    Render diagnostic board(s) only
  node cli/dfm.mjs audit         <projectDir>             Run Q1-Q16 QA audit only
  node cli/dfm.mjs init          <targetDir>              Scaffold a style-free brief.json starter
`);
}

function initStarter(targetDir) {
  const abs = path.resolve(targetDir);
  fs.mkdirSync(abs, { recursive: true });
  const briefTemplate = {
    title: "Untitled Film",
    format: { width: 1080, height: 1920, aspect: "9:16", fps: 30 },
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
        file: "scene.html",
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
  console.log(`Initialized Director Brief starter: ${briefOut}`);
}

function printAuditTable(audit) {
  console.log("\n================= Q1-Q16 Design for Motion QA Report (v0.3) =================");
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
    const res = installOpenFilmSkill(targetArg);
    console.log(`Installed dfm-kit skill to: ${res.destFile}`);
    console.log(`Bound local repo root: ${res.repoRoot}`);
    return;
  }

  if (!targetArg) {
    console.error("Missing target path. Example: node cli/dfm.mjs check .");
    process.exit(1);
  }

  if (cmd === "init") {
    initStarter(targetArg);
    return;
  }

  if (cmd === "snap") {
    const res = await snapFrames(targetArg, extraArg || "1.0", thirdArg || null);
    console.log(`Snapshot saved (${res.width}x${res.height}): ${res.outPath}`);
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
    console.log(`Rendering ${isFull ? "5 HD diagnostic boards + review board" : "fast all-in-one review board"}: ${path.resolve(targetArg)} ...`);
    const { outputs } = await generateBoards(targetArg, { full: isFull });
    console.log("Board(s) generated:");
    console.log(`  - Review Board: ${outputs.reviewBoard}`);
    if (isFull) {
      console.log(`  - Design Board: ${outputs.designBoard}`);
      console.log(`  - Value Board:  ${outputs.valueBoard}`);
      console.log(`  - Color Board:  ${outputs.colorBoard}`);
      console.log(`  - Motion Strip: ${outputs.motionStrip}`);
      console.log(`  - Layout Debug: ${outputs.layoutDebug}`);
    }
  }

  if (cmd === "audit" || cmd === "check") {
    const audit = runAudit(targetArg);
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

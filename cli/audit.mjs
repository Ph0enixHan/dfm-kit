/**
 * audit.mjs (v0.9 — Multi-Engine Style-Agnostic Design-for-Motion Q1-Q16 QA Auditor)
 * Supports both OpenFilm (HTML/window.film) and Remotion (React/TSX) projects.
 * Zero style lock-in: never bans glow, never forces 3D planes, never caps artistic density.
 * Strictly guards universal OpenFilm craft: determinism, GPU performance, grayscale value,
 * Color Script discipline, Pure Cinema Frame (no slide pagination/eyebrows), single-track
 * captions (no VTT double subtitles), real motion continuity, safe-zone clipping, and
 * full-timeline zero-crash execution.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnergyValue } from "./board.mjs";
import { detectEngine } from "./adapters/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUBRIC_PATH = path.resolve(__dirname, "..", "spec", "rubric.json");

const TAILWIND_CLICHE_HEXES = ["#3b82f6", "#f97316", "#ef4444", "#22c55e", "#a855f7"];

function scanShotSource(filePath) {
  const src = fs.readFileSync(filePath, "utf8");
  const issues = [];

  if (/\brequestAnimationFrame\s*\(/.test(src)) {
    issues.push({ rule: "Q11", level: "Blocker", msg: "Do not use requestAnimationFrame — drive all motion deterministically from window.film.frame(t)" });
  }
  if (/\bMath\.random\s*\(/.test(src)) {
    issues.push({ rule: "Q11", level: "Blocker", msg: "Do not use Math.random() — use deterministic hash() from dfm-time.js instead" });
  }
  if (/\bsetInterval\s*\(|\bsetTimeout\s*\(/.test(src)) {
    issues.push({ rule: "Q11", level: "Fix", msg: "Avoid setTimeout/setInterval for animation timing" });
  }
  if (/\.style\.(top|left|right|bottom|width|height)\s*=/.test(src)) {
    issues.push({ rule: "Q14", level: "Fix", msg: "Per-frame layout mutation (top/left/width/height) detected — prefer GPU transform/clip-path" });
  }

  const lower = src.toLowerCase();
  const clicheHits = TAILWIND_CLICHE_HEXES.filter((hex) => lower.includes(hex));
  if (clicheHits.length >= 2) {
    issues.push({
      rule: "Q8",
      level: "Fix",
      msg: `Multiple default software UI colors detected (${clicheHits.join(", ")}) — consider an OKLCH palette or dfm palette extraction`
    });
  }

  // Detect unwanted slide-deck chrome (corner pagination & numbered section eyebrows)
  const cleanSrc = src
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const htmlVisibleText = cleanSrc
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ");

  const paginationHit =
    cleanSrc.match(/(?:['"`>]\s*(?:0?[1-9]\s*\/\s*0?[2-9]|\/\s*0[2-9])\s*['"`<])|(?:['"`]\s*\/\s*0[2-9]\s*['"`])/) ||
    htmlVisibleText.match(/\b0[1-9]\s*\/\s*0[2-9]\b/);
  if (paginationHit) {
    issues.push({
      rule: "Q4",
      level: "Fix",
      msg: `Slide-deck corner pagination detected (${paginationHit[0].trim()}) — remove page counters for a pure cinema frame`
    });
  }

  const numberedKickerHits = [
    ...cleanSrc.matchAll(/['"`>]\s*(0[1-9]\s*(?:—|–|\/\/|·|\|)\s*[A-Za-z\u4e00-\u9fff][^'"`<]{1,36})\s*['"`<]/g)
  ].map((m) => m[1].trim());
  if (numberedKickerHits.length >= 1) {
    issues.push({
      rule: "Q4",
      level: "Fix",
      msg: `${numberedKickerHits.length} numbered section eyebrow(s) detected (e.g. "${numberedKickerHits[0]}") — remove decorative small-number headers and let hero visuals/type carry the beat`
    });
  }

  // Detect slide-deck DOM switcher architecture (multiple full-screen .beat/.slide sections toggled via display:none / visibility:hidden)
  const slideSectionCount = (src.match(/class=["'][^"']*\b(beat|slide|card-scene)\b[^"']*["']/gi) || []).length;
  const usesVisibilityToggle =
    /\.style\.(visibility|display)\s*=\s*[^;\n]*(hidden|none)/i.test(src) ||
    /\.(beat|slide)\s*\{[^}]*(display\s*:\s*none|visibility\s*:\s*hidden)/i.test(src);
  const hasWorldCam = /createWorldCamera|worldEl|id=["']world["']|camAt|camera\.apply/i.test(src);
  if (slideSectionCount >= 4 && usesVisibilityToggle && !hasWorldCam) {
    issues.push({
      rule: "Q11",
      level: "Fix",
      msg: `Slide-switcher DOM architecture detected (${slideSectionCount} isolated full-screen sections toggled via display:none/visibility:hidden with no continuous world camera) — place beats inside one shared spatial world or continuously morphing hero stage instead of swapping slide boxes`
    });
  }

  // Collect linked local project CSS (excluding dfm runtime CSS) so external scene.css is also audited
  const projectDir = path.dirname(filePath);
  let cssBundle = "";
  for (const m of src.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)) {
    const href = m[1];
    if (/^https?:|dfm-craft\.css|dfm-stage\.css/i.test(href)) continue;
    const cssPath = path.resolve(projectDir, href);
    if (fs.existsSync(cssPath)) {
      cssBundle += "\n" + fs.readFileSync(cssPath, "utf8");
    }
  }
  const styleCorpus = src + "\n" + cssBundle;

  // Detect cheap skeuomorphic faux-3D CSS hacks (metallic conic-gradients, hard-offset fake extrusions, glossy plastic glare)
  if (/(?:repeating-)?conic-gradient\s*\(/i.test(styleCorpus)) {
    issues.push({
      rule: "Q14",
      level: "Fix",
      msg: "conic-gradient detected (commonly produces cheap faux-metal/skeuomorphic CSS artifacts) — use clean matte architectural vector graphics or a real image asset via OpenFilm instead"
    });
  }
  const hardExtrusionMatch = styleCorpus.match(
    /box-shadow\s*:[^;{}]*?(?:^|[\s,])(-?\d{1,3})px\s+(-?\d{1,3})px\s+0(?:px)?(?:\s+0(?:px)?)?\s+(?:#|rgb|hsl|oklch|color-mix)/i
  );
  if (hardExtrusionMatch && (Math.abs(Number(hardExtrusionMatch[1])) >= 8 || Math.abs(Number(hardExtrusionMatch[2])) >= 8)) {
    issues.push({
      rule: "Q14",
      level: "Fix",
      msg: `Hard zero-blur offset box-shadow detected (${hardExtrusionMatch[1]}px ${hardExtrusionMatch[2]}px 0) — avoid cheap faux-3D CSS thickness extrusions; rely on real 3D camera parallax and clean matte planes`
    });
  }
  if (/linear-gradient\s*\([^)]*#ffffff(?:[5-9a-f]{2}|[5-9a-f])\b[^)]*transparent/i.test(styleCorpus)) {
    issues.push({
      rule: "Q14",
      level: "Fix",
      msg: "Glossy diagonal white linear-gradient highlight detected — avoid fake plastic/glass CSS sheen; use clean matte OKLCH surfaces or real tactile textures"
    });
  }

  // Flag missing custom typefaces: any visible text relying on bare system fallback fonts
  const hasCustomFont = /fonts\.googleapis\.com|fonts\.gstatic\.com|@font-face|\.woff2?\b|\.ttf\b|\.otf\b/i.test(styleCorpus);
  const hasVisibleText = /font-family\s*:|<h[1-6]\b|<p\b|<text\b|fillText\s*\(/i.test(styleCorpus);
  if (!hasCustomFont && hasVisibleText) {
    issues.push({
      rule: "Q13",
      level: "Fix",
      msg: "No Google Fonts or @font-face loaded (relying on bare system fallback fonts) — load an intentional curated typeface pair and await document.fonts.ready"
    });
  }

  return issues;
}

function collectRemotionSources(absProject) {
  const srcRoot = path.join(absProject, "src");
  const files = [];
  const exts = new Set([".tsx", ".jsx", ".ts", ".js", ".css"]);
  const ignoreDirs = new Set(["node_modules", ".git", "dfm-out", "build", "dist", "out", "dfm"]);

  function walk(dir, depth = 0) {
    if (depth > 6 || !fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignoreDirs.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full, depth + 1);
      } else if (exts.has(path.extname(ent.name).toLowerCase())) {
        files.push(full);
      }
    }
  }
  walk(srcRoot);
  return files;
}

function scanRemotionProject(absProject, brief) {
  const files = collectRemotionSources(absProject);
  const issues = [];
  let combinedCorpus = "";
  let hasAudioTag = false;
  let audioCount = 0;
  const audioIssues = [];

  for (const full of files) {
    const rel = path.relative(absProject, full).replaceAll("\\", "/");
    const src = fs.readFileSync(full, "utf8");
    combinedCorpus += "\n" + src;
    const isCss = full.endsWith(".css");

    if (!isCss) {
      if (/\brequestAnimationFrame\s*\(/.test(src)) {
        issues.push({ rule: "Q11", level: "Blocker", msg: `${rel}: Do not use requestAnimationFrame — drive all motion from useCurrentFrame()` });
      }
      if (/\bMath\.random\s*\(/.test(src)) {
        issues.push({ rule: "Q11", level: "Blocker", msg: `${rel}: Do not use Math.random() — use deterministic random() from remotion or hash() from dfm-remotion` });
      }
      if (/\bsetInterval\s*\(|\bsetTimeout\s*\(/.test(src)) {
        issues.push({ rule: "Q11", level: "Fix", msg: `${rel}: Avoid setTimeout/setInterval in Remotion compositions — use frame math` });
      }
      if (/\b(?:transition|animation)\s*:\s*["'`][^"'`]+["'`]/i.test(src)) {
        issues.push({ rule: "Q11", level: "Fix", msg: `${rel}: CSS transition/animation detected — CSS animations do not sync with Remotion frame rendering; drive motion from useCurrentFrame()` });
      }
      const twAnim = src.match(/className=["'`][^"'`]*\b(animate-(?:bounce|ping|pulse|spin)|transition(?:-(?:all|colors|opacity|transform))?)\b[^"'`]*["'`]/);
      if (twAnim) {
        issues.push({ rule: "Q11", level: "Fix", msg: `${rel}: Tailwind "${twAnim[1]}" class detected — Tailwind CSS transitions/animations break deterministic Remotion rendering; animate with useCurrentFrame()` });
      }
    } else {
      if (/@keyframes\b|\btransition\s*:|\banimation\s*:/i.test(src)) {
        issues.push({ rule: "Q11", level: "Fix", msg: `${rel}: CSS transition/animation/@keyframes detected — drive motion from useCurrentFrame() instead of CSS animations in Remotion` });
      }
    }

    // Truth to Medium checks across TSX/CSS
    if (/(?:repeating-)?conic-gradient\s*\(/i.test(src)) {
      issues.push({ rule: "Q14", level: "Fix", msg: `${rel}: conic-gradient detected (commonly produces cheap faux-metal artifacts) — use clean matte graphics or real imagery` });
    }
    const hardExtrusionMatch = src.match(
      /(?:box-shadow|boxShadow)\s*:\s*["'`]?[^;{}'"`]*?(?:^|[\s,])(-?\d{1,3})px\s+(-?\d{1,3})px\s+0(?:px)?(?:\s+0(?:px)?)?\s+(?:#|rgb|hsl|oklch|color-mix)/i
    );
    if (hardExtrusionMatch && (Math.abs(Number(hardExtrusionMatch[1])) >= 8 || Math.abs(Number(hardExtrusionMatch[2])) >= 8)) {
      issues.push({ rule: "Q14", level: "Fix", msg: `${rel}: Hard zero-blur offset box-shadow (${hardExtrusionMatch[1]}px ${hardExtrusionMatch[2]}px 0) — rely on real 3D camera parallax and clean matte planes` });
    }
    if (/linear-gradient\s*\([^)]*#ffffff(?:[5-9a-f]{2}|[5-9a-f])\b[^)]*transparent/i.test(src)) {
      issues.push({ rule: "Q14", level: "Fix", msg: `${rel}: Glossy diagonal white linear-gradient highlight detected — use clean matte OKLCH surfaces or real tactile textures` });
    }

    // Remotion <Audio> / <Html5Audio> inspection
    for (const m of src.matchAll(/<(?:Audio|Html5Audio)\b([\s\S]*?)\/?>/g)) {
      hasAudioTag = true;
      audioCount++;
      const attrs = m[1];
      const sfMatch = attrs.match(/staticFile\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/);
      if (sfMatch) {
        const assetRel = sfMatch[1].replace(/^\/+/, "");
        const assetPath = path.join(absProject, "public", assetRel);
        if (!fs.existsSync(assetPath)) {
          audioIssues.push(`missing public audio file "public/${assetRel}" referenced in ${rel}`);
        }
      }
      const prMatch = attrs.match(/playbackRate\s*=\s*\{\s*([0-9.]+)\s*\}/);
      if (prMatch) {
        const pr = Number(prMatch[1]);
        if (Number.isFinite(pr) && (pr < 0.9 || pr > 1.15)) {
          audioIssues.push(
            `${rel}: <Audio playbackRate={${pr}}> stretches narration/audio — lock durationInFrames to real audio length with playbackRate={1}`
          );
        }
      }
    }
  }

  // Project-level custom font check
  const hasCustomFont = /@remotion\/google-fonts|loadFont\s*\(|fonts\.googleapis\.com|fonts\.gstatic\.com|@font-face|\.woff2?\b|\.ttf\b|\.otf\b/i.test(combinedCorpus);
  const hasVisibleText = /fontFamily|font-family|<h[1-6]\b|<p\b|<text\b|fillText\s*\(/i.test(combinedCorpus);
  if (files.length && !hasCustomFont && hasVisibleText) {
    issues.push({
      rule: "Q13",
      level: "Fix",
      msg: "No @remotion/google-fonts, Google Fonts, or @font-face loaded — cast an intentional typeface instead of bare system fallback fonts"
    });
  }

  // Project-level Tailwind cliché hex check
  const lower = combinedCorpus.toLowerCase();
  const clicheHits = TAILWIND_CLICHE_HEXES.filter((hex) => lower.includes(hex));
  if (clicheHits.length >= 2) {
    issues.push({
      rule: "Q8",
      level: "Fix",
      msg: `Multiple default software UI colors detected (${clicheHits.join(", ")}) — use an OKLCH palette or dfm palette extraction`
    });
  }

  // Optional VTT double-subtitle check when brief.audio.captions points to a .vtt
  if (brief?.audio?.captions) {
    const vttPath = path.resolve(absProject, brief.audio.captions);
    if (fs.existsSync(vttPath)) {
      const vttRaw = fs.readFileSync(vttPath, "utf8");
      const norm = (s) =>
        String(s || "")
          .replace(/<[^>]+>/g, " ")
          .replace(/[’‘'"]/g, "'")
          .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, " ")
          .trim()
          .toLowerCase();
      const vttPlain = norm(
        vttRaw
          .split(/\r?\n/)
          .filter((l) => l.trim() && !/^(WEBVTT|NOTE|REGION|STYLE|::cue|c\d+$|\d{2}:\d{2})/.test(l.trim()))
          .join(" ")
      );
      const vttCompact = vttPlain.replace(/\s+/g, "");
      if (vttCompact.length > 16) {
        const jsLits = [...combinedCorpus.matchAll(/['"`]([^'"`\n]{8,120})['"`]/g)].map((m) => m[1].trim());
        const jsxText = [...combinedCorpus.matchAll(/>([^<>{}\n]{8,120})</g)].map((m) => m[1].trim());
        const dupes = [];
        for (const lit of new Set([...jsLits, ...jsxText])) {
          if (/^https?:|rgba?\(|px\s|sans-serif|monospace|staticFile/i.test(lit)) continue;
          const nl = norm(lit);
          const cjkCount = (nl.match(/[\u4e00-\u9fff]/g) || []).length;
          const words = nl.split(" ").filter(Boolean);
          const isSentenceLike = cjkCount >= 8 || words.length >= 4;
          if (isSentenceLike && (vttPlain.includes(nl) || (cjkCount >= 8 && vttCompact.includes(nl.replace(/\s+/g, ""))))) {
            dupes.push(lit);
          }
        }
        if (dupes.length >= 2) {
          issues.push({
            rule: "Q13",
            level: "Fix",
            msg: `Captions (${brief.audio.captions}) are configured, but ${dupes.length} verbatim spoken sentence(s) (e.g. "${dupes[0]}") are also hard-coded in src/ — avoid double subtitles`
          });
        }
      }
    }
  }

  return { issues, hasAudioTag, audioCount, audioIssues };
}

export function runAudit(projectDir, { engine = null } = {}) {
  const absProject = path.resolve(projectDir);
  const rubric = JSON.parse(fs.readFileSync(RUBRIC_PATH, "utf8"));
  const briefPath = path.join(absProject, "brief.json");
  const boardReportPath = path.join(absProject, "dfm-out", "board-report.json");

  const brief = fs.existsSync(briefPath) ? JSON.parse(fs.readFileSync(briefPath, "utf8")) : null;
  const board = fs.existsSync(boardReportPath) ? JSON.parse(fs.readFileSync(boardReportPath, "utf8")) : null;
  const resolvedEngine = engine || board?.engine || detectEngine(absProject);

  const codeIssuesByRule = new Map();
  let remotionScan = null;

  if (resolvedEngine === "remotion") {
    remotionScan = scanRemotionProject(absProject, brief);
    for (const iss of remotionScan.issues) {
      if (!codeIssuesByRule.has(iss.rule)) codeIssuesByRule.set(iss.rule, []);
      codeIssuesByRule.get(iss.rule).push(iss.msg);
    }
  } else {
    const uniqueShotFiles = [
      ...new Set(
        brief?.shots?.length
          ? brief.shots.map((s) => s.file)
          : fs.readdirSync(absProject).filter((f) => /^(shot|scene).*\.(html|htm)$/i.test(f)).sort()
      )
    ];

    for (const f of uniqueShotFiles) {
      const full = path.join(absProject, f);
      if (!fs.existsSync(full)) continue;
      for (const iss of scanShotSource(full)) {
        if (!codeIssuesByRule.has(iss.rule)) codeIssuesByRule.set(iss.rule, []);
        codeIssuesByRule.get(iss.rule).push(`${f}: ${iss.msg}`);
      }
    }

    // Detect double subtitles when film.html already mounts a native <track ...vtt>
    const filmHtmlPathCheck = path.join(absProject, "film.html");
    if (fs.existsSync(filmHtmlPathCheck)) {
      const filmSrc = fs.readFileSync(filmHtmlPathCheck, "utf8");
      const trackMatch = filmSrc.match(/<track\b[^>]*\bsrc=["']([^"']+\.vtt)["']/i);
      if (trackMatch) {
        const vttPath = path.resolve(absProject, trackMatch[1]);
        if (fs.existsSync(vttPath)) {
          const vttRaw = fs.readFileSync(vttPath, "utf8");
          const norm = (s) =>
            String(s || "")
              .replace(/<[^>]+>/g, " ")
              .replace(/[’‘'"]/g, "'")
              .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, " ")
              .trim()
              .toLowerCase();
          const vttPlain = norm(
            vttRaw
              .split(/\r?\n/)
              .filter(
                (l) =>
                  l.trim() &&
                  !/^(WEBVTT|NOTE|REGION|STYLE|::cue|id:|width:|lines:|regionanchor:|viewportanchor:|c\d+$|\d{2}:\d{2})/.test(
                    l.trim()
                  )
              )
              .join(" ")
          );
          const vttCompact = vttPlain.replace(/\s+/g, "");
          if (vttCompact.length > 16) {
            for (const f of uniqueShotFiles) {
              const full = path.join(absProject, f);
              if (!fs.existsSync(full)) continue;
              const shotSrc = fs.readFileSync(full, "utf8").replace(/<style[\s\S]*?<\/style>/gi, "");
              const jsLiterals = [...shotSrc.matchAll(/['"`]([^'"`\n]{8,120})['"`]/g)].map((m) => m[1].trim());
              const htmlTextNodes = [
                ...shotSrc
                  .replace(/<script[\s\S]*?<\/script>/gi, "")
                  .matchAll(/>([^<>{}\n]{8,120})</g)
              ].map((m) => m[1].trim());
              const literals = [...new Set([...jsLiterals, ...htmlTextNodes])];
              const dupes = [];
              for (const lit of literals) {
                if (/^https?:|rgba?\(|px\s|sans-serif|monospace|assets\/|captions\//i.test(lit)) continue;
                const nl = norm(lit);
                const cjkCount = (nl.match(/[\u4e00-\u9fff]/g) || []).length;
                const words = nl.split(" ").filter(Boolean);
                const isSentenceLike = cjkCount >= 8 || words.length >= 4;
                if (isSentenceLike && (vttPlain.includes(nl) || (cjkCount >= 8 && vttCompact.includes(nl.replace(/\s+/g, ""))))) {
                  dupes.push(lit);
                }
              }
              if (dupes.length >= 2) {
                if (!codeIssuesByRule.has("Q13")) codeIssuesByRule.set("Q13", []);
                codeIssuesByRule
                  .get("Q13")
                  .push(
                    `${f}: film.html already mounts native captions (${trackMatch[1]}), but ${dupes.length} verbatim spoken sentence(s) (e.g. "${dupes[0]}") are also drawn inside the scene — remove in-scene subtitle lines to avoid double subtitles`
                  );
              }
            }
          }
        }
      }
    }
  }
  const filmHtmlPath = path.join(absProject, "film.html");

  const results = [];

  for (const item of rubric.items) {
    let status = item.automation === "visual-review" ? "Review" : "Pass";
    const notes = [];

    const codeNotes = codeIssuesByRule.get(item.id) || [];
    if (codeNotes.length) {
      status = codeNotes.some((n) => n.includes("requestAnimationFrame") || n.includes("Math.random"))
        ? "Blocker"
        : "Fix";
      notes.push(...codeNotes);
    }

    switch (item.id) {
      case "Q1": {
        if (!brief) {
          status = "Blocker";
          notes.push("Missing brief.json (declare concept, format, colorScript, and beat plan)");
        } else {
          notes.push(`${brief.format?.width}x${brief.format?.height} (${brief.format?.aspect}), ${brief.shots?.length || 0} beats`);
        }
        break;
      }

      case "Q2": {
        const treatment = brief?.concept?.oneLineTreatment;
        notes.push(treatment ? `Treatment: ${treatment} (verify form fits content on review-board.png)` : "Verify concept-form unity on review-board.png");
        break;
      }

      case "Q3": {
        if (brief?.shots?.length >= 2) {
          const energies = brief.shots.map((s) => parseEnergyValue(s.energy));
          const span = Math.max(...energies) - Math.min(...energies);
          notes.push(`Energy range ${span} (check pacing across review-board*.png)`);
          status = "Pass";
        } else {
          status = "Review";
          notes.push("Inspect pacing and narrative tension on review-board.png");
        }
        break;
      }

      case "Q4":
        notes.push("Verify clear single primary focal point per beat on review-board.png");
        break;

      case "Q5":
        if (board) {
          const avgNeg = (board.shots.reduce((a, s) => a + s.pixels.negativeSpacePct, 0) / board.shots.length).toFixed(1);
          notes.push(`Average negative space ~${avgNeg}% (evaluate against chosen style on review-board.png)`);
        } else {
          notes.push("Inspect space balance on review-board.png");
        }
        break;

      case "Q6":
        notes.push("Verify symmetry/asymmetry rhythm across beats on review-board.png");
        break;

      case "Q7": {
        if (board) {
          const severeFlat = board.shots.filter((s) => s.pixels.valueDynamicRange < 55);
          const mildFlat = board.shots.filter((s) => s.pixels.valueDynamicRange >= 55 && s.pixels.valueDynamicRange < 90);
          if (severeFlat.length) {
            status = "Blocker";
            notes.push(...severeFlat.map((s) => `${s.id} grayscale dynamic range is only ${s.pixels.valueDynamicRange}/255 (severely flat)`));
          } else if (mildFlat.length) {
            status = "Fix";
            notes.push(...mildFlat.map((s) => `${s.id} grayscale range ${s.pixels.valueDynamicRange}/255 (acceptable for intentional solid accent cards; otherwise boost figure/ground contrast)`));
          } else {
            const minR = Math.min(...board.shots.map((s) => s.pixels.valueDynamicRange));
            notes.push(`Grayscale value passed (min range ${minR}/255 on review-board.png)`);
          }
        } else {
          status = "Review";
          notes.push("Run dfm check first");
        }
        break;
      }

      case "Q8": {
        if (board) {
          const avgHighSat = board.shots.reduce((a, s) => a + (s.pixels.highSatPct || 0), 0) / board.shots.length;
          const overSatCount = board.shots.filter((s) => s.pixels.highSatPct > 55).length;
          if (
            brief?.colorScript?.harmony !== "monochromatic" &&
            (avgHighSat > 45 || overSatCount > Math.ceil(board.shots.length / 2))
          ) {
            status = "Fix";
            notes.push(`Film-wide high-saturation average ${avgHighSat.toFixed(1)}% (${overSatCount}/${board.shots.length} beats >55% — watch 60-30-10 chroma restraint)`);
          } else if (!notes.length) {
            status = "Review";
            notes.push(`Average high saturation ${avgHighSat.toFixed(1)}% — review Movie Color Barcode on review-board.png`);
          }
        } else {
          status = "Review";
          notes.push("Run dfm check first");
        }
        break;
      }

      case "Q9":
        notes.push("Verify clear foreground/midground/background layering on review-board.png");
        break;

      case "Q10": {
        if (brief?.shots?.length >= 3) {
          const uniqueTypes = new Set(brief.shots.map((s) => s.shotType).filter(Boolean));
          status = uniqueTypes.size >= 2 ? "Pass" : "Review";
          notes.push(`Shot progression: ${[...uniqueTypes].join(" -> ") || "custom"}`);
        } else {
          status = "Review";
          notes.push("Inspect framing variety on review-board.png");
        }
        const lv = board?.layoutVariety;
        if (board?.shots?.length >= 6 && lv && (lv.meanPairwiseSimilarity >= 0.78 || lv.highSimPairPct >= 65)) {
          status = "Fix";
          notes.push(
            `Visual layout repetition: mean structural similarity ${(lv.meanPairwiseSimilarity * 100).toFixed(0)}%, ${lv.highSimPairPct}% of beat pairs look near-identical — vary framing geometry, shot scale, and visual metaphor per beat instead of repeating one layout template`
          );
        }
        break;
      }

      case "Q11": {
        if (status !== "Blocker" && board) {
          const staticBeats = board.shots.filter((s) => typeof s.motionDelta === "number" && s.motionDelta < 0.8);
          const sluggishLongBeats = board.shots.filter(
            (s) => typeof s.motionDelta === "number" && s.duration >= 3.5 && s.motionDelta >= 0.8 && s.motionDelta < 3.2
          );
          if (staticBeats.length) {
            status = "Fix";
            notes.push(
              ...staticBeats.map((s) => `${s.id} inter-frame pixel delta is only Δ${s.motionDelta} (possible static slide — check review-board.png)`)
            );
          } else if (sluggishLongBeats.length >= 2) {
            status = "Fix";
            notes.push(
              `${sluggishLongBeats.length} long beats (>=3.5s) have low motion delta (${sluggishLongBeats.map((s) => `${s.id}:Δ${s.motionDelta}`).join(", ")}) — tighten pacing or add continuous camera/subject motion so beats don't sit like held slides`
            );
          } else if (!notes.length) {
            const avgDelta = (board.shots.reduce((a, s) => a + (s.motionDelta || 0), 0) / board.shots.length).toFixed(1);
            notes.push(`Deterministic drive passed; mean inter-frame motion delta Δ${avgDelta} (see review-board.png)`);
          }
        }
        break;
      }

      case "Q12":
        notes.push("Verify whole-board cohesion across all beats on review-board.png");
        break;

      case "Q13":
        if (!notes.length) notes.push("Verify typeface casting, spacing, and visual integration on review-board.png");
        break;

      case "Q14":
        if (!notes.length) notes.push("No layout-thrashing per-frame mutations detected");
        break;

      case "Q15": {
        if (board) {
          const vio = [];
          for (const s of board.shots) {
            for (const c of s.dom.viewportClips) vio.push(`${s.id} "${c.label}" clipped by viewport`);
            for (const v of s.dom.safeViolations) vio.push(`${s.id} focal "${v.label}" outside safe zone`);
          }
          if (vio.length) {
            status = "Blocker";
            notes.push(...vio.slice(0, 8));
          } else {
            notes.push("0 viewport clips, 0 focal safe-zone violations (see review-board.png)");
          }
        } else {
          status = "Review";
          notes.push("Run dfm check first");
        }
        break;
      }

      case "Q16": {
        if (board) {
          const noFilm = board.shots.filter((s) => !s.hasFilm);
          const blankEntry = board.shots.filter((s) => s.entryPixels && s.entryPixels.valueDynamicRange < 12);
          const rtErrs = board.runtimeErrors || [];

          if (resolvedEngine === "remotion") {
            const missingAudio = !remotionScan?.hasAudioTag && brief?.silent !== true;
            const audioIssues = remotionScan?.audioIssues || [];
            if (noFilm.length) {
              status = "Blocker";
              notes.push(...noFilm.map((s) => `${s.id} Remotion composition failed to render`));
            }
            if (rtErrs.length) {
              status = "Blocker";
              notes.push(...rtErrs.map((e) => `${e.file} threw at t=${e.t}s: ${e.message}`));
            }
            if (blankEntry.length) {
              if (status !== "Blocker") status = "Fix";
              notes.push(
                ...blankEntry.map(
                  (s) =>
                    `${s.id} opening frame at t=${s.entryAt}s is a near-solid blank (ΔVal ${s.entryPixels.valueDynamicRange}, meanLuma ${s.entryPixels.meanLuma}) — give every beat a visible subject from its first frame`
                )
              );
            }
            if (missingAudio) {
              if (status !== "Blocker") status = "Fix";
              notes.push(
                "No <Audio> / <Html5Audio> found in src/ — mount a continuous sound bed & synced SFX (or set brief.silent=true if intentionally silent)"
              );
            }
            if (audioIssues.length) {
              if (status !== "Blocker") status = "Fix";
              notes.push(...audioIssues);
            }
            if (!noFilm.length && !rtErrs.length && !blankEntry.length && !missingAudio && !audioIssues.length) {
              notes.push(
                `Remotion composition (${board.compositionId || "default"}) verified, full-timeline 0.25s sweep 0 errors, non-blank opening frames${remotionScan?.audioCount ? `, ${remotionScan.audioCount} <Audio> track(s) verified` : ""}`
              );
            }
            break;
          }

          const hasFilmHtml = fs.existsSync(filmHtmlPath);
          const filmHtmlContent = hasFilmHtml ? fs.readFileSync(filmHtmlPath, "utf8") : "";
          const audioTags = [...filmHtmlContent.matchAll(/<audio\b([^>]*)>/gi)];
          const audioCount = audioTags.length;
          const missingAudio = hasFilmHtml && audioCount === 0 && brief?.silent !== true;
          const audioIssues = [];
          if (hasFilmHtml && audioCount > 0) {
            const totalFilmDur = board.shots.reduce((m, s) => Math.max(m, (s.start || 0) + (s.duration || 0)), 0);
            let maxSpanFromZero = 0;
            for (const m of audioTags) {
              const attrs = m[1];
              const aid = (attrs.match(/\bid=["']([^"']+)["']/i) || [])[1] || "audio";
              const rawSrc = (attrs.match(/\bsrc=["']([^"']+)["']/i) || [])[1] || "";
              const at = Number((attrs.match(/\bat=["']([^"']+)["']/i) || [])[1] ?? 0);
              const speedMatch = attrs.match(/\bspeed=["']([^"']+)["']/i);
              const filePart = rawSrc.split("#")[0];
              const fragMatch = rawSrc.match(/#t=([0-9.]+)(?:,([0-9.]+))?/i);
              if (filePart && !/^https?:/.test(filePart) && !fs.existsSync(path.resolve(absProject, filePart))) {
                audioIssues.push(`missing audio file "${filePart}" (id=${aid})`);
              }
              if (speedMatch) {
                const sp = Number(speedMatch[1]);
                if (Number.isFinite(sp) && (sp < 0.9 || sp > 1.15)) {
                  audioIssues.push(
                    `audio "${aid}" uses extreme speed="${sp}" — generate voiceover first and align brief/scene duration to its natural length instead of time-stretching`
                  );
                }
              }
              if (at <= 0.5) {
                if (fragMatch && fragMatch[2]) {
                  maxSpanFromZero = Math.max(maxSpanFromZero, Number(fragMatch[2]) - Number(fragMatch[1]));
                } else if (!fragMatch) {
                  maxSpanFromZero = Math.max(maxSpanFromZero, totalFilmDur);
                }
              }
            }
            if (totalFilmDur >= 8 && maxSpanFromZero > 0 && maxSpanFromZero < totalFilmDur * 0.72) {
              audioIssues.push(
                `no continuous audio bed spans the full ${totalFilmDur.toFixed(1)}s timeline (longest start-at-0 clip ends at ~${maxSpanFromZero.toFixed(1)}s) — keep a continuous low-gain ambient/music bed to prevent abrupt mid-film audio dropouts`
              );
            }
          }
          if (noFilm.length) {
            status = "Blocker";
            notes.push(...noFilm.map((s) => `${s.id} does not export window.film.frame(t)`));
          }
          if (rtErrs.length) {
            status = "Blocker";
            notes.push(...rtErrs.map((e) => `${e.file} threw at t=${e.t}s: ${e.message}`));
          }
          if (blankEntry.length) {
            if (status !== "Blocker") status = "Fix";
            notes.push(
              ...blankEntry.map(
                (s) =>
                  `${s.id} opening frame at t=${s.entryAt}s is a near-solid blank (ΔVal ${s.entryPixels.valueDynamicRange}, meanLuma ${s.entryPixels.meanLuma}) — give every beat a visible subject from its first frame`
              )
            );
          }
          if (missingAudio) {
            if (status !== "Blocker") status = "Fix";
            notes.push(
              "film.html has 0 <audio> tracks — unless the user explicitly asked for a silent video (set brief.silent=true), add frame-synced SFX & restrained music via OpenFilm CLI (openfilm get sfx-search / music-search --take)"
            );
          }
          if (audioIssues.length) {
            if (status !== "Blocker") status = "Fix";
            notes.push(...audioIssues);
          }
          if (!noFilm.length && !rtErrs.length && !blankEntry.length && !missingAudio && !audioIssues.length) {
            notes.push(
              `window.film.frame(t) exported, full-timeline 0.25s sweep 0 errors, non-blank opening frame${hasFilmHtml ? `, ${audioCount} audio track(s) verified` : ""}`
            );
          }
        } else {
          status = "Review";
          notes.push("Run dfm check first");
        }
        break;
      }
    }

    results.push({ id: item.id, name: item.name, status, notes });
  }

  const summary = {
    pass: results.filter((r) => r.status === "Pass").length,
    review: results.filter((r) => r.status === "Review").length,
    fix: results.filter((r) => r.status === "Fix").length,
    blocker: results.filter((r) => r.status === "Blocker").length
  };

  const outDir = path.join(absProject, "dfm-out");
  fs.mkdirSync(outDir, { recursive: true });
  const mdLines = [
    `# Design for Motion QA Report (v0.9 · ${resolvedEngine}) — ${brief?.title || path.basename(absProject)}`,
    "",
    `- **Summary**: PASS: ${summary.pass} | REVIEW: ${summary.review} | FIX: ${summary.fix} | BLOCKER: ${summary.blocker}`,
    `- **Checked At**: ${new Date().toISOString()}`,
    "",
    "| ID | Criterion | Status | Notes |",
    "| :---: | :--- | :---: | :--- |",
    ...results.map((r) => `| **${r.id}** | ${r.name} | ${r.status} | ${r.notes.join("<br>") || "—"} |`),
    ""
  ];
  const mdPath = path.join(outDir, "audit-report.md");
  fs.writeFileSync(mdPath, mdLines.join("\n"), "utf8");

  return { results, summary, mdPath };
}

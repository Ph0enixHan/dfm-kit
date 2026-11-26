---
name: dfm-kit-hyperframes
description: >-
  Fast, style-agnostic Design-for-Motion director toolkit for HyperFrames (HTML + GSAP / seekable
  timelines + modular sub-compositions): continuous-world 3D camera, OKLCH Color Script extraction,
  real tactile textures, 13-API cinema optical lens kit, paginated sharp review boards with
  HyperFrames contract & zero-crash QA, and deterministic audio discipline.
---

# dfm-kit v1.0 (HyperFrames) — Style-Agnostic Design-for-Motion Director System

Local toolkit root: `<DFM_ROOT>` (invoked directly via Node CLI; zero npm dependencies).

> **Director's Craft & Speed Contract (Fast Toolchain — Zero Quality Shortcuts)**
> 1. **Craft quality is non-negotiable**: Speed comes from the zero-wait CLI toolchain (inlined APIs, sharp paginated review boards, 1–2s `dfm snap`) — never from skipping fonts, ignoring real textures/assets, or building flat sideways carousels.
> 2. **Start immediately — do not browse CLI source code**: All CLI commands, verified runtime signatures, curated fonts, and available local textures are inlined below.
> 3. **Voiceover-First & User Asset Inventory**: If the film has spoken narration, generate/measure voiceover **first** and set the root `data-duration` to match its real duration (never stretch audio via `data-playback-rate`). Inspect existing media in `assets/` upfront.
> 4. **Honor HyperFrames's Render Contract 100%**:
>    - Root `index.html`: `<div id="root" data-composition-id="main" data-start="0" data-width="..." data-height="..." data-duration="...">` directly inside `<body>` (never wrapped in `<template>`).
>    - Sub-compositions (`compositions/*.html` via `data-composition-src`): put ALL `<style>`, markup, and `<script>` **inside `<template>`** (HyperFrames discards `<head>` on mount!). Match host and inner `data-composition-id`.
>    - Register one **paused** timeline per composition at `window.__timelines["<composition-id>"]` (via `gsap.timeline({ paused: true })` or `createDfmTimeline`). Never call `.play()`, `Date.now()`, `performance.now()`, `Math.random()`, or `requestAnimationFrame`.
>    - Never tween `display`, `visibility`, or `autoAlpha` on a `.clip` element — animate a child instead.
>    - Every `<audio>` **must** have an `id` (id-less `<audio>` renders silent); never add `crossorigin` on `<audio>`/`<video>`; always use relative `assets/...` paths (no leading `/`).
> 5. **Hard Delivery Gate + Polish Pass**: Run `dfm check .` (plus `npx hyperframes check --json` when HyperFrames CLI is present) and inspect **every** `dfm-out/review-board*.png` page (≤6 beats/page). Fix every `BLOCKER` and `FIX`, polish the weakest 1–2 beats, and re-verify until `BLOCKER=0` and `FIX=0`.

---

## 1. CLI Quick Reference (HyperFrames Auto-Detected)

Command entry: `node "<DFM_ROOT>/cli/dfm.mjs" <command>`

| Command | Purpose & Typical Speed |
|---|---|
| `palette <imagePath> [outDir]` | ~2s — Extract OKLCH Color Script, swatch PNG & `*-palette.json` from any reference still/palette |
| `check <projectDir> [--serve-url <url>] [--full]` | ~2–6s — Mounts standalone & `data-composition-src` sub-compositions, renders sharp review board(s) (≤6 beats/page), runs 0.25s full-timeline crash sweep & Q1–Q16 HyperFrames QA |
| `snap <projectDirOrHtml> <t1,t2,...>` | ~1–2s — Inspect exact timestamps in seconds (e.g. `snap . 1.2,4.5,7.8`) -> `dfm-out/snap.png` + safe-zone stats |
| `audit <projectDir>` | <0.2s — Re-run static Q1–Q16 HyperFrames contract & craft audit |

---

## 2. Inlined HyperFrames Runtime Cheat Sheet (`assets/dfm/`)

Copy `dfm-hyperframes.js`, `dfm-time.js`, `dfm-motion.js`, `dfm-lens.js`, and `dfm-craft.css` from `<DFM_ROOT>/runtime/` into `assets/dfm/` and import via `./assets/dfm/...`:

### A. `./assets/dfm/dfm-hyperframes.js` — Seekable Timelines & 3D World Camera Bridge
- `import { createDfmTimeline, bindWorldCameraToGsap, createWorldCamera, radialWheelItem, choreo, safeAreaInsets, seg, ease, anticipationPop, whipPan, portalZoom, ambientDrift, lerpColor, hash } from './assets/dfm/dfm-hyperframes.js';`
- **Pure DFM Seekable Timeline (zero GSAP needed, auto-registers `window.__timelines[id]`)**:
  - `createDfmTimeline({ id: "main", duration: 12, render(t, { progress }) { ... } });`
- **GSAP + 3D World Camera Bridge**:
  - `const tl = gsap.timeline({ paused: true });`
  - `bindWorldCameraToGsap(tl, worldEl, worldCam, duration, { velocityBlur: 0.0022, maxBlur: 5.5 });`
  - `window.__timelines["main"] = tl;`
- **`safeAreaInsets(width, height, "social-strict" | "shorts" | "clean")`** -> `{ top, right, bottom, left, safeWidth, safeHeight }`

### B. `./assets/dfm/dfm-lens.js` — 13-API Cinema Optical Lens & Camera Rig
- `import { lens } from './assets/dfm/dfm-lens.js';` (**use purposefully for narrative punctuation, never stack gratuitously**)
- **Optical Filters**: `lens.motionBlur(el, dx, dy)` | `lens.rgbSplit(el, px, deg)` | `lens.fisheye(el, strength)` | `lens.flutedGlass(el, strength, opts)` | `lens.tiltShift(container, opts)` | `lens.anamorphicFlare(container, opts)` | `lens.filmBurn(container, p, opts)`
- **Camera Physics**: `lens.stepTime(t, fps)` | `lens.handheld(t, opts)` | `lens.impactShake(t, hitAt, opts)` | `lens.gateWeave(t, opts)` | `lens.dollyZoom(stageEl, contentEl, p, opts)` | `lens.crashZoom(el, t, start, dur, opts)`

### C. `./assets/dfm/dfm-craft.css` & Real Tactile Textures
- Procedural overlays: `.craft-grain`, `.craft-grain-heavy`, `.craft-halftone-print`, `.craft-halation`, `.craft-paper-fiber`, `.craft-vignette`, `.craft-scanlines`
<!-- DFM_LOCAL_TEXTURES -->

### D. Curated Fonts Casting (Ship local `@font-face` in `assets/fonts/` or load Google Fonts)
- **Editorial / Documentary**: `Instrument Serif` + `Noto Serif SC` + `JetBrains Mono`
- **Modern Tech / SaaS**: `Space Grotesk` + `Noto Sans SC` + `Space Mono`
- **High-Impact Poster / Kinetic Intro**: `Anton` + `Noto Sans SC` + `IBM Plex Mono`
- **Warm Humanist / Paper & Ink**: `Newsreader` + `LXGW WenKai TC` + `IBM Plex Mono`
- **High-Fashion / Architectural**: `Cormorant Garamond` + `Noto Serif SC`
- **Technical Dossier / Data**: `IBM Plex Sans` + `JetBrains Mono` (`tabular-nums`)

---

## 3. Core Craft Principles (Zero Style Lock-In)

1. **Form & Ground Color Grow Strictly from Content**: Choose any medium (2D vector, Canvas, WebGL, 3D spatial camera, archival collage, kinetic typography) and any color discipline.
2. **Filmic Color Script First (60-30-10)**: Extract exact OKLCH palettes from any reference still via `dfm palette`, or define dominant ground, support surface, ink, and restrained focal accent in `brief.json`.
3. **Real Cinema Camera & Shot-Scale Variety — Zero Sideways Carousels & Zero 3-Band Poster Loops**:
   - Place beats in ONE continuous 3D spatial world (`#world` + `createWorldCamera`) or modular sub-compositions connected by real shot-scale jumps (wide -> macro detail plunge -> oversized type -> angled 3D perspective -> wide resolve).
   - **Illustrated Slides ≠ Motion Design**: Even bespoke illustrations feel like Keynote if scenes swap via instant `style.display = 'none'` cuts, crossfade 6+ stacked layers in-place behind a gently wobbling camera, or park on one poster for 7–10s ("Prezi effect"). Connect beats with real physical transitions (3D flight/scale plunge, `portalZoom`, `whipPan`, `crashZoom`, occlusion wipes, or shared-element morphs).
   - **Documentary Sub-Beat Rule for Long Voiceover (>30s)**: Never hold one graphic card for 7–12s of narration. Split every long spoken paragraph into **2.5–4.5s visual sub-beats** with real shot-scale progression (wide -> macro detail push-in -> active state change -> next subject).
   - **Never build a 1D sideways carousel** (lining up N pages at uniform `i * spacing` and pushing them horizontally like Keynote Push slides).
   - **Break the 3-band poster formula**: Never repeat "top-left title + centered graphic + bottom-left caption" across beats. Keep un-narrated beats tight (1.5–3.2s; avoid >6s near-static holds).
4. **Truth to Medium & Authentic Assets**: Keep 2D/3D planes crisp, matte, and architectural (no `conic-gradient` faux metal, no thick 0-blur offset `box-shadow`, no glossy diagonal white plastic glare). Match real tactile textures to your ground polarity at visible tactility (`0.16–0.45`, never `<0.10`), and use real raster photography/footage in `assets/` when realism serves the story.
5. **Pure Cinema Frame & Non-Blank Openings**: Omit corner page counters, numbered section eyebrows, and slide headers/footers. Every beat must show a visible subject from its opening frame.
6. **Full-Bleed Frame + Safe-Zone Text Discipline (`format.safePreset`)**:
   - **`social-strict` (default 9:16 — TikTok / Reels / Douyin / Xiaohongshu)**: `top 12.5% (240px)`, `right 14% (150px)`, `bottom 22% (420px)`, `left 6% (65px)`.
   - **`shorts` (YouTube Shorts)**: `top 10%`, `right 11%`, `bottom 18%`, `left 5.5%`.
   - **`clean` (default 16:9)**: `top 8%`, `right 6%`, `bottom 8%`, `left 6%`.
   - Keep **primary headlines and key copy** strictly inside the safe zone — **never wrap `#world` inside a safe-zone `<clipPath>` / `overflow: hidden` picture frame**. Backgrounds, textures, and camera travel must bleed 100% edge-to-edge (`data-bleed="true"`).

---

## 4. Standard 4-Step HyperFrames Production Loop

### Step 1: Lock Audio Timing + Write Director Brief (`brief.json`)
- If narrated, measure the real voiceover duration first and set root `data-duration` to match.
- Write `brief.json` at the project root declaring `title`, `format: { width, height, aspect, fps, safePreset }`, `hyperframes: { entry: "index.html", compositionId: "main" }`, `concept`, `visualWorld`, `colorScript`, and `shots: [{ id, role, shotType, focalPoint, energy, start, duration, heroAt, transitionOut }]` — choreograph a real numeric `energy` arc (10–100, span ≥ 20). Set `"silent": true` only if explicitly requested.

### Step 2: Build the Composition (`index.html` + optional `compositions/*.html`)
- Copy `dfm-hyperframes.js`, `dfm-time.js`, `dfm-motion.js`, `dfm-lens.js`, `dfm-craft.css` into `assets/dfm/`.
- Copy 1–2 ground-matched real scan textures into `assets/textures/` at clearly visible opacity (`0.16–0.45`).
- Register paused timelines on `window.__timelines["<composition-id>"]`; keep sub-composition styles & scripts inside `<template>`.

### Step 3: Mount Audio Cleanly (`<audio id="...">`)
- Mount a continuous low-gain music bed (`<audio id="bgm" src="assets/..." data-start="0" data-duration="..." data-volume="0.16"></audio>`) and synced SFX (`<audio id="sfx-1" ...>`). Every `<audio>` must carry a unique `id`, zero `crossorigin`, and relative `assets/...` paths. When mixing music under voiceover, carve the bed (`data-fx-carve` / HyperFrames audio workflow).

### Step 4: Sharp Review-Board QA Gate, Polish Pass & Delivery
1. Run `node "<DFM_ROOT>/cli/dfm.mjs" check .` (~2–6s) AND `npx hyperframes check --json` (if installed).
2. Inspect **every** `dfm-out/review-board*.png` page with your vision tool alongside the Q1–Q16 report.
3. Fix every `BLOCKER` and `FIX`, polish the weakest 1–2 beats, re-verify via `dfm snap . <t1,t2>` and `dfm check .` until `BLOCKER=0` and `FIX=0`.
4. Preview with `npx hyperframes preview` or render with `npx hyperframes render --quality delivery --output out.mp4`.

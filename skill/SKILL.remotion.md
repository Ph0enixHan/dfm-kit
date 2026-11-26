---
name: dfm-kit-remotion
description: >-
  Fast, style-agnostic Design-for-Motion director toolkit for Remotion (React/TSX):
  continuous-world 3D camera & declarative motion style helpers, OKLCH Color Script extraction,
  Google Fonts casting, real tactile textures, paginated sharp review boards with zero-crash QA,
  and deterministic audio/caption auditing.
---

# dfm-kit v1.0 (Remotion) — Style-Agnostic Design-for-Motion Director System

Local toolkit root: `<DFM_ROOT>` (invoked directly via Node CLI; zero npm dependencies added to your project).

> **Director's Craft & Speed Contract (Fast Toolchain — Zero Quality Shortcuts)**
> 1. **Craft quality is non-negotiable**: Speed comes from the cached bundle-once CLI toolchain (inlined APIs, sharp paginated review boards, 1–2s `dfm snap`) — never from skipping fonts, ignoring real textures/assets, or repeating one template across beats.
> 2. **Start immediately — do not browse CLI source code**: All CLI commands, verified Remotion runtime signatures, curated Google Fonts, and available local textures are inlined below.
> 3. **Voiceover-First & User Asset Inventory**: If the video has spoken narration, lock real audio timing first (`durationInFrames = Math.ceil(audioSeconds * fps)`), keep `<Audio playbackRate={1} />` (never stretch narration with `playbackRate={0.77}`), and inspect user media in `public/` upfront.
> 4. **Continuous spatial world — zero single-template loops**: Drive all beats inside ONE spatial `#world` via `createWorldCamera` + `worldCameraStyle` (or a persistent morphing canvas/SVG) with genuinely distinct per-beat visual metaphors, scales, and compositions — at least 4 distinct visual architectures across a multi-beat film.
> 5. **Strict Remotion Determinism**: Derive 100% of motion from `useCurrentFrame()` and `useVideoConfig()` (`const t = frame / fps`). Never use CSS `transition`, CSS `animation` / `@keyframes`, Tailwind `animate-*` / `transition-*`, `requestAnimationFrame`, or `Math.random()`.
> 6. **Hard Delivery Gate + Polish Pass**: Run `dfm check .` and inspect **every** `dfm-out/review-board*.png` page (auto-paginated at ≤6 beats per page). Resolve every `BLOCKER` and `FIX`, polish the weakest 1–2 beats, and re-verify with `dfm snap . <t1,t2>` / `dfm check .` until `BLOCKER=0` and `FIX=0`.

---

## 1. CLI Quick Reference (Remotion Auto-Detected)

Command entry: `node "<DFM_ROOT>/cli/dfm.mjs" <command>`

| Command | Purpose & Typical Speed |
|---|---|
| `palette <imagePath> [outDir]` | ~2s — Extract OKLCH Color Script, swatch PNG & `*-palette.json` from any reference still/palette |
| `check <projectDir> [--comp <Id>] [--serve-url <url>] [--rebuild]` | ~2–10s (cached bundle: ~2–4s) — Render sharp review board(s) (≤6 beats/page), run 0.25s full-timeline crash sweep & Q1–Q16 Remotion QA |
| `snap <projectDir> <t1,t2,...> [--comp <Id>]` | ~1–3s — Inspect exact timestamps in seconds (e.g. `snap . 1.2,4.5,7.8`) -> `dfm-out/snap.png` + safe-zone stats |
| `audit <projectDir>` | <0.2s — Re-run static Q1–Q16 Remotion audit without re-rendering |

---

## 2. Inlined Remotion Runtime Cheat Sheet (`src/dfm/`)

Copy `dfm-remotion.js`, `dfm-time.js`, `dfm-motion.js`, `dfm-remotion.d.ts` (and optionally `dfm-craft.css`) from `<DFM_ROOT>/runtime/` into `src/dfm/` and import cleanly in `.tsx`:

### A. Continuous 3D World Camera & Declarative React Styles (`./dfm/dfm-remotion`)
- `import { frameToTime, createWorldCamera, cameraRigStyle, worldCameraStyle, clipRevealStyle, maskSlideStyle, staggerProgress, safeAreaBox } from "./dfm/dfm-remotion";`
- `const frame = useCurrentFrame(); const { fps, width, height } = useVideoConfig(); const t = frameToTime(frame, fps);`
- **`createWorldCamera(keyframes)`**:
  - `keyframes`: `[{ t, x, y, z, scale, rx, ry, rz, ease }, ...]`
  - `const pose = worldCam.sample(t);`
  - `<div style={cameraRigStyle({ width, height })}><div id="world" style={worldCameraStyle(pose)}>{/* spatial beats */}</div></div>`
- **`clipRevealStyle(p, { dir, distance, fade })`** -> `{ clipPath, transform, opacity }`
- **`maskSlideStyle(p, { dir, percent })`** -> `{ transform, opacity }`
- **`staggerProgress(i, t, { start, itemDur, step })`** -> `[0, 1]`
- **`safeAreaBox(width, height, "social-strict" | "shorts" | "clean")`** -> `{ top, right, bottom, left, safeWidth, safeHeight, style }`

### B. Deterministic Timing, Easing & Cinema Optical Lens Kit (`./dfm/dfm-remotion`)
- **Timing & Motion**: `seg(t, start, end, easeFn)`, `ease.{expoOut, expoIn, expoInOut, cubicOut, cubicIn, cubicInOut, backOut, quartOut, quadOut, whipIn}`, `clamp`, `clamp01`, `lerp`, `hash`, `lerpColor`
- **Physical Primitives**: `anticipationPop(t, at, dur, { overshoot })` | `whipPan(t, cutAt, dur, opts)` | `portalZoom(t, cutAt, dur, opts)` | `ambientDrift(t, seed, opts)` | `radialWheelItem(i, total, rotDeg, opts)`
- **Cinema Optical Lenses & Camera Physics (React-ready style / SVG filter helpers — use purposefully for narrative punctuation)**:
  - `motionBlurFilterDef(id, dx, dy)` & `rgbSplitFilterDef(id, px, angleDeg)` -> declarative SVG `<filter>` params (`{ id, active, filterUrl, ... }`)
  - `tiltShiftOverlayStyle({ focusY, bandPct, blurPx })` | `anamorphicFlareStyle({ yPct, color, intensity, heightPx })` | `filmBurnOverlayStyle(p, opts)`
  - `dollyZoomStyles(p, opts)` -> `{ stageStyle, contentStyle }` | `crashZoomStyle(t, start, dur, opts)` -> `{ transform, filter }`
  - `stepTime(t, fps)` | `handheldStyle(t, opts)` | `impactShakeStyle(t, hitAt, opts)` | `gateWeaveStyle(t, opts)`
  - `textureOverlayStyle({ ground: "dark" | "light", blendMode, opacity })` -> calibrated visible texture overlay style (prevents invisible `<0.10` opacity)

### C. `./dfm/dfm-craft.css` & Real Tactile Textures
- Procedural overlays: `.craft-grain`, `.craft-grain-heavy`, `.craft-halftone-print`, `.craft-halation`, `.craft-paper-fiber`, `.craft-vignette`, `.craft-scanlines`
<!-- DFM_LOCAL_TEXTURES -->

### D. Curated Google Fonts Casting (use `@remotion/google-fonts/*` or `@font-face` + `delayRender`)
- **Editorial / Documentary**: `Instrument Serif` + `Noto Serif SC` + `JetBrains Mono`
- **Modern Tech / SaaS**: `Space Grotesk` + `Noto Sans SC` + `Space Mono`
- **High-Impact Poster / Kinetic Intro**: `Anton` + `Noto Sans SC` + `IBM Plex Mono`
- **Warm Humanist / Paper & Ink**: `Newsreader` + `LXGW WenKai TC` + `IBM Plex Mono`
- **High-Fashion / Architectural**: `Cormorant Garamond` + `Noto Serif SC`
- **Technical Dossier / Data**: `IBM Plex Sans` + `JetBrains Mono` (`tabular-nums`)

---

## 3. Core Craft Principles (Zero Style Lock-In)

1. **Form & Ground Color Grow Strictly from Content**: Choose any medium (2D vector, Canvas, WebGL/Three.js, 3D macro UI, archival collage, kinetic typography) and any color discipline.
2. **Filmic Color Script First (60-30-10)**: Extract exact OKLCH palettes from any reference still via `dfm palette`, or define dominant ground, support surface, ink, and restrained focal accent in `brief.json`.
3. **Real Cinema Camera & Shot-Scale Variety — Zero Slide-Switchers, Zero Sideways Carousels, Zero 3-Band Poster Loops**:
   - Place beats in ONE continuous 3D spatial world (`#world` + `createWorldCamera` + `worldCameraStyle`, combining X/Y/Z depth, scale jumps, subtle rotation, and velocity blur) or a persistent morphing canvas.
   - **Never build a 1D sideways carousel** (lining up N full-screen pages at uniform `i * spacing` and pushing them horizontally like Keynote Push slides).
   - **Break the 3-band poster formula**: Never repeat "top-left title + centered illustration + bottom-left caption" across consecutive beats. Alternate visual architectures dramatically (full-bleed oversized type -> macro detail plunge -> split 2-column comparison -> off-center crop with overlaid callout -> wide architectural resolve). Keep un-narrated beats tight (1.5–3.2s; avoid >6s near-static holds).
4. **Truth to Medium & Authentic Assets**: Keep 2D/3D planes crisp, matte, and architectural (no `conic-gradient` faux metal, no thick 0-blur offset `box-shadow`, no glossy diagonal white plastic glare). Use real tactile textures in `public/` or real photography (`<Img src={staticFile(...)} />`) when realism or tactility serves the story.
5. **Pure Cinema Frame & Non-Blank Openings**: Omit corner page counters, numbered section eyebrows, and slide headers/footers. Every beat must show a visible subject from its opening frame (no solid blank white/black openings).
6. **Full-Bleed Frame + Safe-Zone Text Discipline (`format.safePreset`)**:
   - **`social-strict` (default 9:16 — TikTok / Reels / Douyin / Xiaohongshu)**: `top 12.5% (240px)`, `right 14% (150px)`, `bottom 22% (420px)`, `left 6% (65px)`.
   - **`shorts` (YouTube Shorts)**: `top 10%`, `right 11%`, `bottom 18%`, `left 5.5%`.
   - **`clean` (default 16:9 / portfolio)**: `top 8%`, `right 6%`, `bottom 8%`, `left 6%`.
   - Use `safeAreaBox(width, height, preset)` to position **primary headlines and key copy** strictly inside the safe box — **never clip `#world` or visual art inside a safe-zone `<clipPath>` / `overflow: hidden` box**. Backgrounds, textures, illustrations, and camera travel must bleed 100% edge-to-edge across the full frame (`data-bleed="true"`).
7. **Single-Track Captions**: If mounting a caption track / `.vtt`, never duplicate verbatim spoken sentences inside the scene graphics.

---

## 4. Standard 4-Step Remotion Production Loop

### Step 1: Lock Audio Timing + Write Director Brief (`brief.json`)
- If narrated, measure the real voiceover duration first and set `durationInFrames = Math.ceil(seconds * fps)` in `src/Root.tsx`.
- Write `brief.json` at the project root declaring `title`, `format: { width, height, aspect, fps, safePreset }`, `remotion: { entry: "src/index.ts", compositionId: "Main" }`, `concept`, `visualWorld`, `colorScript`, and `shots: [{ id, role, shotType, focalPoint, energy, start, duration, heroAt, transitionOut }]` — choreograph a real numeric `energy` arc (10–100, span ≥ 20 across multi-beat films; Q3 flags flat energy curves). Set `"silent": true` only if explicitly requested.

### Step 2: Build the Continuous World (`src/*.tsx`)
- Copy `dfm-remotion.js`, `dfm-time.js`, `dfm-motion.js`, `dfm-remotion.d.ts`, and `dfm-craft.css` from `<DFM_ROOT>/runtime/` into `src/dfm/` (do not settle for bare `dfm-time.js` alone).
- Match real tactile textures to your ground polarity: copy 1–2 files from the local texture catalog above into `public/textures/` and mount via `<Img src={staticFile("textures/...")} style={textureOverlayStyle({ ground: "dark" | "light" })} data-bleed="true" />` at clearly visible tactility (never `< 0.14` opacity), or stage user media from `public/`.
- Load curated Google Fonts via `@remotion/google-fonts/*` (call `loadFont()` at module top level) or `@font-face`.
- Vary framing scale, spatial geometry, and typographic placement dramatically across beats (never lock every beat into the same fixed top-title + center-box + bottom-caption slots).
- Drive 100% of motion from `useCurrentFrame()` (`t = frameToTime(frame, fps)`); zero CSS `transition` / `animation` / Tailwind `animate-*`.

### Step 3: Mount Audio Cleanly (`<Audio>`)
- Mount a continuous low-gain music/ambient bed spanning the full timeline (`volume={0.14}` under voiceover, `0.32` for music-only intros) and frame-synced `<Sequence from={...}><Audio src={staticFile("...")} volume={0.45} /></Sequence>` SFX.
- Verify every `staticFile("...")` asset exists in `public/`, and keep voiceover `playbackRate` at `1`.

### Step 4: Sharp Review-Board QA Gate, Polish Pass & Render
1. Run `node "<DFM_ROOT>/cli/dfm.mjs" check .` (~2–10s; cached re-runs ~2–4s; or pass `--serve-url http://localhost:3000` if Studio is already running).
2. Inspect **every** `dfm-out/review-board*.png` page with your vision tool alongside the Q1–Q16 report.
3. Fix every `BLOCKER` and `FIX`, polish the weakest 1–2 beats, re-check with `node "<DFM_ROOT>/cli/dfm.mjs" snap . <t1,t2>` and `dfm check .` until `BLOCKER=0` and `FIX=0`.
4. Render the final video with Remotion (`npx remotion render <CompositionId> out/video.mp4`).

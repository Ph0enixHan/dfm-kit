---
name: dfm-kit
description: >-
  Fast, style-agnostic Design-for-Motion director toolkit for programmatic video (OpenFilm built-in;
  Hyperframes & Remotion ready): continuous-world camera & physical motion primitives, OKLCH Color
  Script extraction, Google Fonts casting, 13-API cinema optical lens kit, 1-board fast visual
  microscope with anti-slide & zero-crash QA, and native sound design.
---

# dfm-kit v0.5 — Style-Agnostic Design-for-Motion Director System

Local toolkit root: `<DFM_ROOT>` (invoked directly via Node CLI; zero npm dependencies).

> **Fast Execution Rules (Saves 70%+ Turn Time — Read First)**
> 1. **Start immediately — do not browse the toolkit repo**: All CLI commands, verified runtime signatures, and font castings are inlined below. Do **not** inspect `cli/` source files or unrelated directories.
> 2. **Prefer single-file `scene.html` continuous-world architecture**: Drive all beats of a film from one `scene.html` inside ONE shared spatial world (`#world` moved by a real camera, or a persistent morphing hero stage) so fonts load once and transitions are physical camera motion — never slide switching.
> 3. **1-Board Fast Visual Review**: Run `dfm check` to generate **one all-in-one `dfm-out/review-board.png`** (Hero frame + Grayscale Value + 3-frame Motion Strip + Movie Color Barcode + Safe Zone + 0.25s full-timeline crash sweep + audio check). Read only that 1 image; use 1–2s `dfm snap` for targeted re-checks after local edits.
> 4. **Never run `dfm preview` inside OpenFilm Studio**: Studio provides native real-time playback. If your working directory is already inside `OpenFilm/Projects/`, skip `to-openfilm` as well.

---

## 1. CLI Quick Reference

Command entry: `node "<DFM_ROOT>/cli/dfm.mjs" <command>`

| Command | Purpose & Typical Speed |
|---|---|
| `palette <imagePath> [outDir]` | ~2s — Extract OKLCH Color Script, swatch PNG & `*-palette.json` from any reference still/palette |
| `check <projectDir>` | ~2–6s — Render **1 compact `dfm-out/review-board.png`**, run 0.25s full-timeline crash sweep & Q1–Q16 QA (add `--full` only when 5 standalone HD boards are explicitly needed) |
| `snap <htmlFile> <t1,t2,...>` | ~1–2s — Inspect specific timestamps (e.g. `snap scene.html 1.5,4.2,7.8`) -> `dfm-out/snap.png` + safe-zone stats |
| `to-openfilm <projectDir> [draftName]` | Package & sync into OpenFilm Studio `Projects/` (only needed when authoring outside Studio) |

---

## 2. Inlined Toolkit Cheat Sheet (Exact Verified Signatures — Zero Repo Browsing)

Copy only what you need into the project directory & import via `./`:

### A. `./dfm-motion.js` — Continuous World Camera & Spatial Choreography
- `import { createWorldCamera, radialWheelItem, choreo } from './dfm-motion.js';`
- **`createWorldCamera(keyframes)`**:
  - `keyframes`: `[{ t, x, y, z, scale, rx, ry, rz, ease }, ...]` (place all beats at distinct coordinates in one 2D/3D `<div id="world">` stage!)
  - `const pose = worldCam.sample(t);` -> `{ x, y, z, scale, rx, ry, rz, vx, vy, vz, speed }`
  - `worldCam.apply(worldEl, pose, { velocityBlur: 0.0022, maxBlur: 5.5 });` — flies the camera smoothly through space with automatic velocity-coupled motion blur!
- **`radialWheelItem(index, total, rotationDeg, { radius, stepDeg })`** -> `{ x, y, angleDeg, focusWeight }`
- **`choreo.clipReveal(el, p, { dir, distance, fade })`**, **`choreo.maskSlide(el, p, { dir, percent })`**, **`choreo.stagger(i, t, { start, itemDur, step })`**

### B. `./dfm-time.js` — Core Timing & Pure-Physics Motion Primitives
- `import { defineShot, seg, clamp, clamp01, lerp, ease, hash, lerpColor, anticipationPop, whipPan, portalZoom, ambientDrift } from './dfm-time.js';`
- **Timing & Easing**: `defineShot({ id, duration, heroAt, render(t) })`, `seg(t, start, end, easeFn)`, `ease.{expoOut, expoIn, expoInOut, cubicOut, cubicIn, cubicInOut, backOut, quartOut, quadOut, whipIn}` (exact `[0, 1]` endpoint clamping; safe for Canvas `arc()`)
- **Motion Primitives**:
  - `anticipationPop(t, at, dur, { overshoot })` — non-negative launch -> overshoot -> dampened settle
  - `whipPan(t, cutAt, dur, { distance, axis, maxBlur, maxRgb })` -> `{ outOffset, inOffset, blurX, blurY, rgbPx, velocity, active }`
  - `portalZoom(t, cutAt, dur, { maxScale, inStartScale })` -> `{ outScale, outOpacity, inScale, inOpacity, active }`
  - `ambientDrift(t, seed, { ampX, ampY, ampScale, ampRot, speed })` -> `{ x, y, scale, rotDeg }`

### C. `./dfm-lens.js` — 13-API Cinema Optical Lens & Camera Rig
- `import { lens } from './dfm-lens.js';` (**use purposefully for narrative punctuation, never stack gratuitously**)
- **Optical Filters (pass target DOM/SVG element `el` as 1st arg)**:
  - `lens.motionBlur(el, dx, dy)` | `lens.rgbSplit(el, px, deg)` | `lens.fisheye(el, strength)` (`+` barrel, `-` pincushion) | `lens.flutedGlass(el, strength, opts)` | `lens.tiltShift(container, opts)` | `lens.anamorphicFlare(container, opts)` | `lens.filmBurn(container, p, opts)`
- **Camera Physics & Timing**:
  - `lens.stepTime(t, fps)` | `lens.handheld(t, opts)` | `lens.impactShake(t, hitAt, { power, decay, freq })` -> `{ x, y, rot }` | `lens.gateWeave(t, opts)` | `lens.dollyZoom(stageEl, contentEl, p, opts)` | `lens.crashZoom(el, t, start, dur, { fromScale, toScale, blurMax })`

### D. `./dfm-craft.css` & Optional Local Tactile Textures
- Procedural overlays: `.craft-grain`, `.craft-grain-heavy`, `.craft-halftone-print`, `.craft-halation`, `.craft-paper-fiber`, `.craft-vignette`, `.craft-scanlines`
- If `<DFM_ROOT>/textures/web/` has pre-baked `<=1200px` proxies, copy directly into `assets/` with zero `ffmpeg` wait.

### E. Curated Google Fonts Casting (always `await document.fonts.ready`)
- **Editorial / Documentary**: `Instrument Serif` + `Noto Serif SC` + `JetBrains Mono`
- **Modern Tech / SaaS**: `Space Grotesk` + `Noto Sans SC` + `Space Mono`
- **High-Impact Poster / Kinetic Intro**: `Anton` + `Noto Sans SC` + `IBM Plex Mono`
- **Warm Humanist / Paper & Ink**: `Newsreader` + `LXGW WenKai TC` + `IBM Plex Mono`
- **High-Fashion / Architectural**: `Cormorant Garamond` + `Noto Serif SC`
- **Technical Dossier / Data**: `IBM Plex Sans` + `JetBrains Mono` (`tabular-nums`)

---

## 3. Core Craft Principles & Anti-Slide Director Architecture (Zero Style Lock-In)

1. **Form & Ground Color Grow Strictly from Content**: Choose any medium (2D vector, Canvas illustration, WebGL, 3D macro UI, archival collage, darkroom optics, kinetic typography) and any color discipline — a unified single-ground palette throughout the entire film is completely valid when it serves the mood.
2. **Filmic Color Script First (60-30-10)**: When the user provides a reference image or palette, extract and lock its exact relationships via `dfm palette`. Otherwise define OKLCH dominant ground, support surface, ink, and restrained focal accent in `brief.json`.
3. **Real Spatial Stage — Never Build a Slide-Switcher DOM**:
   - **Never** stack isolated full-screen `.beat` / `.slide` boxes at `inset: 0` and toggle them via `display: none` or `visibility: hidden` (even with a fake color wipe overlaid on top). That architecture physically forces a slide-deck feel.
   - **Instead**, build ONE continuous spatial world (`<div id="world">` placed at real `(x, y, z, rx, ry, rz)` coordinates flown by `createWorldCamera`, or ONE persistent Canvas/SVG world where the hero object/camera continuously dives, pans, orbits, or morphs across space).
   - **Never reuse one master-slide CSS layout** (e.g. identical left-title + right-widget coordinates across beats). Vary visual geometry and framing dramatically from beat to beat (macro detail -> angled 3D perspective -> full-bleed oversized type -> tight portal dive -> wide architectural resolve).
4. **Product Intro / Showcase Anti-Catalog Rule**:
   - When asked for a product/project **intro**, **never** map features 1-to-1 into slow 4–5s catalog slides ("Feature 1 slide -> Feature 2 slide -> Logo").
   - Instead, direct a **high-velocity 10–18s continuous visual story or transformation** (average **1.2–2.4s per beat**): e.g., a live *Before -> Deconstruction/Transformation -> After* arc, or a single-take camera flight diving directly inside one living workspace/instrument. Keep every held beat subtly alive with `ambientDrift` and stagger secondary motion by 60–90ms.
   - **Optional Cinema Director's Menu (reach for 1–2 when fitting — never mandatory)**: directional `lens.motionBlur` / `lens.rgbSplit` on high-velocity moves, `lens.impactShake` on punch cuts, `lens.fisheye` / `lens.flutedGlass` / `lens.filmBurn` for optical signature, softly defocused foreground parallax occluders, or an optional tonal polarity shift at the narrative climax.
5. **Pure Cinema Frame**: Treat the viewport as a cinema screen rather than a slide deck. Keep only the narrative subject, visual metaphors, and expressive hero copy — omit corner page counters, numbered section eyebrows, and decorative slide headers/footers.
6. **Single-Track Captions (No Double Subtitles)**: Whenever `film.html` mounts an OpenFilm native caption track (`<track kind="captions" src="...vtt">`), leave verbatim spoken narration to the `.vtt` track. Inside `scene.html`, draw only distilled visual headlines, keywords, metrics, or diagram callouts, and preserve ~18–22% clean breathing room along the bottom caption band.
7. **OpenFilm Determinism**: Export `window.film = { width, height, duration, ready, frame(t) }`. Never use `requestAnimationFrame`, `Math.random()`, or per-frame layout mutations (`top/left/width/height`). Author `film.html` with native `<section><iframe id="..." src="scene.html" at="0"></iframe></section>` and dedicated `<section>` audio tracks.

---

## 4. Standard 4-Step Production Loop (Sound Included by Default)

### Step 1: Write a Concise Director Brief (`brief.json`)
Declare `title`, `format: { width, height, aspect, fps }`, `concept: { oneLineTreatment, emotion, tensionPair }`, `visualWorld: { medium, spatialArchitecture, continuityMethod }`, `colorScript: { harmony, roles, colorArc }`, and `shots: [{ id, file, role, shotType, focalPoint, energy, start, duration, heroAt, transitionOut }]`. (Only set `"silent": true` if the user explicitly requested a silent piece.)

### Step 2: Build the Continuous World (`scene.html` + `film.html`)
Build a single deterministic `scene.html` using `createWorldCamera` / persistent spatial stage (copy only needed `./dfm-motion.js`, `./dfm-time.js`, `./dfm-lens.js`, or `./dfm-craft.css` locally).

### Step 3: Mandatory Default Sound Design & Music Assembly (`film.html`)
**Do NOT skip sound even when the user does not mention audio.** Every video needs frame-synced SFX and restrained music unless the user explicitly requested silence (free local CC0 library first — zero credits):
1. **Call OpenFilm CLI** (`openfilm`; on Windows if not on PATH, fall back to `node "$env:LOCALAPPDATA\Programs\OpenFilm\resources\app.asar.unpacked\node_modules\openfilm\bin\openfilm.mjs"`):
   - Check user media first: `openfilm get my-media --kind audio --prompt "<keywords>"`
   - Search OpenFilm's free built-in CC0 offline library (instant, zero credits):
     - `openfilm get sfx-search --prompt "<whoosh / impact / click / film / paper>"` -> `--take <id>` into `assets/`
     - `openfilm get music-search --prompt "<mood keywords>"` -> `--take <id>` into `assets/`
   - If unavailable locally and the user has connected audio generation in Studio, use `openfilm get sfx` / `openfilm get music`.
2. **Mount Audio on Dedicated `<section>` Tracks in `film.html`**:
   - Sync transition whooshes, hits, and UI clicks to exact action timestamps (`at="1.9" volume="0.40-0.58"`), avoiding overlapping loud peaks.
   - Put background music on its own `<section>` with restrained gain (`volume="0.12-0.16"` under voiceover, `0.32-0.45` for music-only intros); trim with `#t=start,end` as needed.

### Step 4: 1-Board Fast Visual + Audio QA Gate & Delivery
1. Run `node "<DFM_ROOT>/cli/dfm.mjs" check .` (~2–6s). Q11 checks for slide-switcher DOM traps & sluggish holds; Q16 automatically verifies `window.film.frame(t)`, 0.25s full-timeline crash-free execution, and mounted `<audio>` tracks in `film.html`.
2. Inspect **`dfm-out/review-board.png`** with your vision tool alongside the Q1–Q16 report.
3. Fix any visual, spatial, framing, contrast, caption, audio, or motion defect; verify localized visual fixes in 1–2s with `node "<DFM_ROOT>/cli/dfm.mjs" snap scene.html <t1,t2>`.
4. **(External authoring only)**: Run `node "<DFM_ROOT>/cli/dfm.mjs" to-openfilm <projectDir> <draftName>`. If already inside `OpenFilm/Projects/`, deliver directly for real-time playback in Studio.

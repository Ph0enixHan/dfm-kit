---
name: dfm-kit
description: >-
  Fast, style-agnostic Design-for-Motion director toolkit for programmatic video (OpenFilm built-in;
  Hyperframes & Remotion ready): continuous-world camera & physical motion primitives, OKLCH Color
  Script extraction, Google Fonts casting, real tactile textures, 13-API cinema optical lens kit,
  paginated sharp review boards with zero-crash QA, and native sound design.
---

# dfm-kit v1.0 — Style-Agnostic Design-for-Motion Director System

Local toolkit root: `<DFM_ROOT>` (invoked directly via Node CLI; zero npm dependencies).

> **Director's Craft & Speed Contract (Fast Toolchain — Zero Quality Shortcuts)**
> 1. **Craft quality is non-negotiable**: Speed comes from the zero-wait toolchain (inlined APIs, sharp paginated review boards, 1–2s `dfm snap`, no `dfm preview` in Studio) — never from skipping fonts, ignoring real textures/assets, or repeating one template across beats.
> 2. **Start immediately — do not browse CLI source code**: All CLI commands, verified runtime signatures, curated Google Fonts, and available local textures are inlined below. Do **not** inspect `cli/` source files or unrelated directories.
> 3. **Voiceover-First & User Asset Inventory**: If the video has spoken narration, generate TTS **first** to lock real timestamps and build `brief.json` & `scene.html` to them in one pass. Also inspect the user's attachments and OpenFilm media (`openfilm get my-media --kind image|video|audio`) up front — tell color references (extract with `dfm palette`) apart from visual/audio assets that should appear in the film.
> 4. **Continuous spatial world — zero single-template loops**: Build ONE shared `#world` flown by `createWorldCamera` (or one persistent morphing stage) with genuinely distinct per-beat visual metaphors, scales, and compositions — at least 4 distinct visual architectures across a multi-beat film; never repeat one 2-line template for every beat.
> 5. **Hard Delivery Gate + Polish Pass**: Run `dfm check` and inspect **every** `dfm-out/review-board*.png` page (auto-paginated at ≤6 beats per page so every frame stays crisp). Resolve all `BLOCKER` and `FIX` items, polish the weakest 1–2 beats, and re-verify with `dfm snap` / `dfm check` until `BLOCKER=0` and `FIX=0` before delivery.
> 6. **Never run `dfm preview` inside OpenFilm Studio**: Studio provides native real-time playback. If your working directory is already inside `OpenFilm/Projects/`, skip `to-openfilm` as well.

---

## 1. CLI Quick Reference

Command entry: `node "<DFM_ROOT>/cli/dfm.mjs" <command>`

| Command | Purpose & Typical Speed |
|---|---|
| `palette <imagePath> [outDir]` | ~2s — Extract OKLCH Color Script, swatch PNG & `*-palette.json` from any reference still/palette |
| `check <projectDir>` | ~2–8s — Render sharp review board(s) (`dfm-out/review-board.png`, or `review-board-1.png`, `-2.png`… at ≤6 beats/page), run 0.25s full-timeline crash sweep & Q1–Q16 QA (add `--full` only when 5 standalone HD boards are explicitly needed) |
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

### D. `./dfm-craft.css` & Real Tactile Textures
- Procedural overlays: `.craft-grain`, `.craft-grain-heavy`, `.craft-halftone-print`, `.craft-halation`, `.craft-paper-fiber`, `.craft-vignette`, `.craft-scanlines`
<!-- DFM_LOCAL_TEXTURES -->

### E. Curated Google Fonts Casting (always load via `<link>` / `@font-face` and `await document.fonts.ready`)
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
3. **Real Spatial Stage — Zero Slide-Switchers & Zero Template Loops**:
   - **Never** stack isolated full-screen `.beat` / `.slide` boxes at `inset: 0` and toggle them via `display: none` or `visibility: hidden` (even with a fake color wipe overlaid on top). That architecture physically forces a slide-deck feel.
   - **Instead**, build ONE continuous spatial world (`<div id="world">` placed at real `(x, y, z, rx, ry, rz)` coordinates flown by `createWorldCamera`, or ONE persistent Canvas/SVG world where the hero object/camera continuously dives, pans, orbits, or morphs across space).
   - **Illustrated Slides ≠ Motion Design**: Even bespoke illustrations feel like Keynote if scenes swap via instant `display: none` / `visibility: hidden` cuts, stack 6+ full-screen layers in-place for `opacity` crossfades behind a gently wobbling `createWorldCamera`, or park on one poster for 7–10s ("Prezi effect"). Connect beats with real physical transitions (3D flight/scale plunge, `portalZoom`, `whipPan`, `crashZoom`, occlusion wipes, or shared-element morphs).
   - **Documentary Sub-Beat Rule for Long Voiceover (>30s)**: Never let one graphic card hold for 7–12s of narration. Split every long spoken paragraph into **2.5–4.5s visual sub-beats** with genuine shot-scale changes (wide establishing -> macro detail push-in -> live visual state change -> next subject).
   - **Never build a 1D sideways carousel**: Do not line up N full-screen pages at uniform `i * spacing` and push them horizontally like Keynote Push slides. Direct real shot-scale jumps (wide -> macro detail plunge -> full-bleed oversized type -> angled 3D perspective -> wide resolve) with `createWorldCamera` depth, scale shifts, and velocity blur.
   - **Every beat earns its own composition**: Break the 3-band poster formula ("top-left title + centered graphic + bottom-left caption"). Vary visual geometry, shot scale, and typographic placement dramatically across beats — `dfm check` measures both structural similarity and fixed top/bottom text slots in Q10.
4. **Truth to Medium & Authentic Assets (Zero Cheap Faux-3D or Fake Gradients)**:
   - **Use 3D for Camera & Spatial Depth — NOT Fake CSS Props**: Keep individual planes honest, crisp, matte, and architectural (pure OKLCH solid fills, razor-sharp `1px` hairline borders, bold geometric vectors, authentic cast typography) flying inside real 3D camera space (`createWorldCamera`).
   - **Never Fake Real Materials with CSS Gradients**: Do NOT use `conic-gradient` to imitate brushed metal, diagonal white `#fff...transparent` streaks to imitate glossy glass/plastic, `radial-gradient` balls to imitate 3D spheres, or thick 0-blur offset `box-shadow` hacks (`15px 20px 0`) to fake slab thickness.
   - **Reach for real assets whenever the story has material tactility**: For paper, print, or analog-film worlds, copy matching real scans from the local texture catalog above into `assets/` (blend per the catalog) and use `dfm-craft.css` for grain/halation. When the story genuinely calls for a photorealistic object, physical lens, sculpture, or real-world scene — or the user supplied photos/video — use their OpenFilm media (`openfilm get my-media --kind image`) or generate one (`openfilm get image`) and stage it inside the 3D camera world instead of hand-coding a janky faux-3D CSS/SVG model.
5. **Product Intro / Showcase Anti-Catalog Rule**:
   - When asked for a product/project **intro**, **never** map features 1-to-1 into slow 4–5s catalog slides ("Feature 1 slide -> Feature 2 slide -> Logo").
   - Instead, direct a **high-velocity 10–18s continuous visual story or transformation** (average **1.2–2.4s per beat**): e.g., a live *Before -> Deconstruction/Transformation -> After* arc, or a single-take camera flight diving directly inside one living workspace/instrument. Keep every held beat subtly alive with `ambientDrift` and stagger secondary motion by 60–90ms.
   - **Optional Cinema Director's Menu (reach for 1–2 when fitting — never mandatory)**: directional `lens.motionBlur` / `lens.rgbSplit` on high-velocity moves, `lens.impactShake` on punch cuts, `lens.fisheye` / `lens.flutedGlass` / `lens.filmBurn` for optical signature, softly defocused foreground parallax occluders, or an optional tonal polarity shift at the narrative climax.
6. **Pure Cinema Frame**: Treat the viewport as a cinema screen rather than a slide deck. Keep only the narrative subject, visual metaphors, and expressive hero copy — omit corner page counters, numbered section eyebrows, and decorative slide headers/footers. Every beat shows a visible subject from its very first frame (no solid-blank openings).
7. **Full-Bleed Frame + Safe-Zone Text Discipline (`format.safePreset`)**:
   - Backgrounds, atmospheric textures, graphics, and camera travel must bleed 100% edge-to-edge across the full canvas — **never wrap `#world` inside a safe-zone `<clipPath>` / `overflow: hidden` picture frame**. Keep **primary headlines, key metrics, and focal copy** strictly inside the active safe zone:
     - **`social-strict` (default for 9:16 vertical — TikTok / Reels / Douyin / Xiaohongshu)**: `top 12.5% (240px)`, `right 14% (150px for like/share rail)`, `bottom 22% (420px for captions/HUD)`, `left 6% (65px)` -> safe box `x: 65-930, y: 240-1500` on `1080x1920`.
     - **`shorts` (when user specifies YouTube Shorts)**: `top 10% (190px)`, `right 11% (120px)`, `bottom 18% (340px)`, `left 5.5% (60px)`.
     - **`clean` (default for 16:9 / portfolio / no social HUD)**: `top 8%`, `right 6%`, `bottom 8%`, `left 6%`.
   - `dfm check` draws translucent social-HUD ghost outlines directly onto vertical review-board frames so you can visually verify zero button/caption overlap.
8. **Single-Track Captions (No Double Subtitles)**: Whenever `film.html` mounts an OpenFilm native caption track (`<track kind="captions" src="...vtt">`), leave verbatim spoken narration to the `.vtt` track. Inside `scene.html`, draw only distilled visual headlines, keywords, metrics, or diagram callouts inside the safe zone above the bottom caption band.
9. **OpenFilm Determinism**: Export `window.film = { width, height, duration, ready, frame(t) }`. Never use `requestAnimationFrame`, `Math.random()`, or per-frame layout mutations (`top/left/width/height`). Author `film.html` with native `<section><iframe id="..." src="scene.html" at="0"></iframe></section>` and dedicated `<section>` audio tracks.

---

## 4. Standard 4-Step Production Loop (Audio-First, Asset-Aware, Zero Rework)

### Step 1: Lock Real Audio Timing + Inventory User Assets + Write Concise Director Brief (`brief.json`)
- **If the film has spoken narration / voiceover**: Generate the voiceover **first** (`openfilm get tts` or user audio), read its real duration and caption timestamps, and lock `brief.json`'s total duration and beat timestamps (`start` / `duration`) directly to the real voiceover (`speed` stays `1.0` — never stretch/compress narration with `speed="0.77"`).
- **Inventory the user's materials**: List attachments in the project (`.film/attachments`) and run `openfilm get my-media --kind image` / `--kind video` / `--kind audio`. Decide which are palette references (-> `dfm palette`) and which should be featured in the film.
- Write `brief.json` declaring `title`, `format: { width, height, aspect, fps }`, `concept: { oneLineTreatment, emotion, tensionPair }`, `visualWorld: { medium, spatialArchitecture, continuityMethod }`, `colorScript: { harmony, roles, colorArc }`, and `shots: [{ id, file, role, shotType, focalPoint, energy, start, duration, heroAt, transitionOut }]` — choreograph a real numeric `energy` arc (10–100, span ≥ 20 across multi-beat films; Q3 flags flat energy curves). (Only set `"silent": true` if the user explicitly requested a silent piece.)

### Step 2: Build the Continuous World (`scene.html` + `film.html`)
Build a single deterministic `scene.html` using `createWorldCamera` / persistent spatial stage (copy needed `./dfm-motion.js`, `./dfm-time.js`, `./dfm-lens.js`, `./dfm-craft.css` locally). Load the cast Google Fonts explicitly and `await document.fonts.ready`; copy 1–2 ground-matched real textures from the local catalog into `assets/` at clearly visible tactility (opacity `0.16–0.45`, never invisible `<0.10`) or stage user media when fitting; give every beat a distinct composition (never lock every beat to the same fixed top/bottom text slots) and a visible first frame.

### Step 3: Mandatory Default Sound Design & Continuous Bed (`film.html`)
**Do NOT skip sound even when the user does not mention audio.** Every video needs a continuous sound bed plus frame-synced SFX unless the user explicitly requested silence (free local CC0 library first — zero credits):
1. **Call OpenFilm CLI** (`openfilm`; on Windows if not on PATH, fall back to `node "$env:LOCALAPPDATA\Programs\OpenFilm\resources\app.asar.unpacked\node_modules\openfilm\bin\openfilm.mjs"`):
   - Check user media first: `openfilm get my-media --kind audio --prompt "<keywords>"`
   - Search OpenFilm's free built-in CC0 offline library (instant, zero credits):
     - `openfilm get sfx-search --prompt "<whoosh / impact / click / film / paper>"` -> `--take <id>` into `assets/`
     - `openfilm get music-search --prompt "<mood keywords>"` -> `--take <id>` into `assets/`
   - If unavailable locally and the user has connected audio generation in Studio, use `openfilm get sfx` / `openfilm get music`.
2. **Mount Audio Cleanly on Dedicated `<section>` Tracks in `film.html`**:
   - **Continuous bed (`at="0"`)**: Run one low-gain music or subtle ambient bed spanning `0` to the full film duration (`volume="0.12-0.16"` under voiceover, `0.30-0.44` for music-only intros) — verify the source clip is long enough so audio never drops out mid-film or leaves abrupt dead-silence gaps between chopped clips.
   - **Synced SFX**: Align transition whooshes, hits, and UI clicks to exact action timestamps (`at="1.9" volume="0.40-0.58"`), avoiding overlapping loud peaks. Every referenced file must exist in `assets/`.
   - **Natural voiceover speed**: Keep narration at `speed="1"` (omit `speed`); never time-stretch narration to cover mismatched picture length.

### Step 4: Sharp Review-Board QA Gate, Polish Pass & Delivery
1. Run `node "<DFM_ROOT>/cli/dfm.mjs" check .` (~2–8s). Long films are paginated into `dfm-out/review-board-1.png`, `-2.png`, … (≤6 beats per page) so every frame stays readable. Q10 also flags layout-template repetition; Q11 checks for slide-switcher DOM traps & sluggish holds; Q16 verifies `window.film.frame(t)`, 0.25s full-timeline crash-free execution, non-blank opening frames, and mounted `<audio>` tracks.
2. Inspect **every** `dfm-out/review-board*.png` page with your vision tool alongside the Q1–Q16 report.
3. Fix every `BLOCKER` and `FIX` item, then **polish the weakest 1–2 beats** (hierarchy, spacing, contrast, motion) — verify localized visual fixes in 1–2s with `node "<DFM_ROOT>/cli/dfm.mjs" snap scene.html <t1,t2>`, and re-run `check` until `BLOCKER=0` and `FIX=0`.
4. **(External authoring only)**: Run `node "<DFM_ROOT>/cli/dfm.mjs" to-openfilm <projectDir> <draftName>`. If already inside `OpenFilm/Projects/`, deliver directly for real-time playback in Studio.

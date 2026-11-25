---
name: dfm-kit
description: >-
  Fast, style-agnostic Design-for-Motion director toolkit for programmatic video (OpenFilm built-in;
  Hyperframes & Remotion ready): OKLCH Color Script extraction, Google Fonts casting, physical motion
  primitives & default director choreography, 13-API cinema optical lens kit, 1-board fast visual
  microscope with full-timeline zero-crash sweep, and native sound design.
---

# dfm-kit v0.4 — Style-Agnostic Design-for-Motion Director System

Local toolkit root: `<DFM_ROOT>` (invoked directly via Node CLI; zero npm dependencies).

> **Fast Execution Rules (Saves 70%+ Turn Time — Read First)**
> 1. **Start immediately — do not browse the toolkit repo**: All CLI commands, runtime signatures, and font castings are inlined below. Do **not** inspect `cli/` source files or unrelated directories.
> 2. **Prefer single-file `scene.html` architecture**: Drive all beats of a short film from one `scene.html` keyed by `t` so fonts and DOM load once and camera/subject continuity flows naturally.
> 3. **1-Board Fast Visual Review**: Run `dfm check` to generate **one all-in-one `dfm-out/review-board.png`** (Hero frame + Grayscale Value + 3-frame Motion Strip + Whole-Film & Per-Shot Color Barcode + Safe Zone + 0.25s full-timeline exception sweep). Read only that 1 image; use 1–2s `dfm snap` for targeted re-checks after local edits instead of writing ad-hoc debug scripts.
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

## 2. Inlined Toolkit Cheat Sheet (Zero Repo Browsing)

### Optional Runtime Modules (copy only what you need into the project directory & import via `./`)
- **`./dfm-time.js`** (core timing + v0.4 physical motion primitives):
  - Timing & Easing: `defineShot({ id, duration, heroAt, render(t) })`, `seg(t, start, end)`, `clamp(v, min, max)`, `clamp01(v)`, `lerp(a, b, p)`, `ease.{expoOut, cubicOut, cubicInOut, backOut, quartOut, cubicIn, quadOut, whipIn}` (aliases `outExpo`, `outBack`, etc. supported; exact `[0, 1]` endpoint clamping), `hash(seed)`, `lerpColor(hexA, hexB, p)`
  - Physical Motion Primitives:
    - `anticipationPop(t, at, dur, { overshoot })` — non-negative launch -> overshoot -> dampened settle (safe for Canvas `arc()`)
    - `whipPan(t, cutAt, dur, { distance, axis, maxBlur, maxRgb })` — returns `{ outOffset, inOffset, blurX, blurY, rgbPx, velocity, active }` for synced camera whip + optical blur
    - `portalZoom(t, cutAt, dur, { maxScale, inStartScale })` — returns `{ outScale, outOpacity, inScale, inOpacity, active }` for push-through portal cuts
    - `ambientDrift(t, seed, { ampX, ampY, ampScale, ampRot, speed })` — returns `{ x, y, scale, rotDeg }` for restrained living motion during held beats
- **`./dfm-craft.css`**: Zero-asset procedural craft layers `.craft-grain`, `.craft-grain-heavy`, `.craft-halftone-print`, `.craft-halation`, `.craft-paper-fiber`, `.craft-vignette`, `.craft-scanlines`
- **`./dfm-lens.js`**: 13-API DOM/SVG optical lens & camera rig (**use purposefully for narrative punctuation, never stack gratuitously**):
  - Setup: `const lens = createLensRig(stageEl);`
  - Optics: `lens.motionBlur(xPx, yPx)`, `lens.rgbSplit(px, angleDeg)`, `lens.fisheye(strength)` (`+` convex barrel, `-` pincushion), `lens.flutedGlass(freq, amp)`, `lens.tiltShift(focusY, blurPx)`, `lens.anamorphicFlare(intensity, color)`, `lens.filmBurn(progress, color)`
  - Camera & Timing: `stepTime(t, fps)` (stepped/stop-motion feel), `handheld(t, amp)`, `impactShake(t, hitAt, dur, amp)`, `gateWeave(t, amp)`, `dollyZoom(p, scaleSpan, zSpan)`, `crashZoom(p, maxScale)`

### Optional Local Tactile Texture Cache (if present in `<DFM_ROOT>/textures/web/`)
If `<DFM_ROOT>/textures/web/` has pre-baked `<=1200px` proxies, copy directly into project `assets/` with zero `ffmpeg` wait (otherwise rely on `dfm-craft.css` procedural grain/halftone/paper).

### Curated Google Fonts Casting (always `await document.fonts.ready` before rendering)
- **Editorial / Documentary / Essay**: `Instrument Serif` + `Noto Serif SC` + `JetBrains Mono`
- **Modern Tech / SaaS / Clean Explainer**: `Space Grotesk` + `Noto Sans SC` + `Space Mono`
- **High-Impact Poster / Kinetic Intro**: `Anton` + `Noto Sans SC` + `IBM Plex Mono`
- **Warm Humanist / Paper & Ink**: `Newsreader` + `LXGW WenKai TC` + `IBM Plex Mono`
- **High-Fashion / Architectural Elegance**: `Cormorant Garamond` + `Noto Serif SC`
- **Technical Dossier / Data Precision**: `IBM Plex Sans` + `JetBrains Mono` (`tabular-nums`)

---

## 3. Core Craft Principles & Default Director Choreography (Zero Style Lock-In)

1. **Form & Ground Color Grow Strictly from Content**: Choose any medium (2D vector, Canvas illustration, WebGL, 3D macro UI, archival collage, darkroom optics, kinetic typography) and any color discipline — a unified single-ground palette throughout the entire film is completely valid when it serves the mood. Never recycle fixed templates.
2. **Filmic Color Script First (60-30-10)**: When the user provides a reference image or palette, extract and lock its exact relationships via `dfm palette`. Otherwise define OKLCH dominant ground, support surface, ink, and restrained focal accent in `brief.json`.
3. **Default Director Choreography (activates automatically whenever the user does not prescribe specific camera work)**:
   - **Pick a Spatial Stage, Not Flat Slides**: Commit `brief.json`'s `visualWorld.spatialArchitecture` to a coherent spatial mechanism (`continuous-world-camera`, `hero-morph`, `portal-match-cut`, `kinetic-typography`, or `tactile-collage`).
   - **Physical Beat Bridges (`transitionOut`)**: For every beat in `brief.json`, specify *which concrete visual element* physically bridges Beat N into Beat N+1 (e.g., push through a shape/letterform via `portalZoom`, whip across via `whipPan` + `lens.motionBlur`, morph a persistent hero subject, or wipe via a foreground occluder) instead of blank opacity fades.
   - **Scale Contrast & Living Holds**: Vary shot scale sharply across adjacent beats (macro detail / oversized edge-cropped hero type <-> calm wide framing). Stagger secondary elements by 60–90ms, use `anticipationPop` for physical weight, and keep held reading beats subtly alive with `ambientDrift` (never dead-freeze for 3 seconds).
   - **Optional Cinema Director's Menu (reach for 1–2 only when the story invites it — zero mandatory checklists)**:
     - *Optical punctuation* (`dfm-lens.js`): directional `motionBlur` during whip-pans, subtle `impactShake` + `rgbSplit` on climax hits, `filmBurn` or `flutedGlass` on emotional turns, `stepTime(t, 12)` for tactile stop-motion moments.
     - *Spatial depth*: directional light/rim highlight + 1 softly defocused foreground parallax occluder moving faster than the subject.
     - *Tonal/polarity shift*: optional light <-> dark or accent-flood beat at a narrative turning point (only when fitting — unified-ground films stay unified).
4. **Pure Cinema Frame**: Treat the viewport as a cinema screen rather than a slide deck. Keep only the narrative subject, visual metaphors, and expressive hero copy — omit corner page counters, numbered section eyebrows, and decorative slide headers/footers.
5. **Single-Track Captions (No Double Subtitles)**: Whenever `film.html` mounts an OpenFilm native caption track (`<track kind="captions" src="...vtt">`), leave verbatim spoken narration to the `.vtt` track. Inside `scene.html`, draw only distilled visual headlines, keywords, metrics, or diagram callouts — never duplicate spoken sentences at the bottom, and preserve ~18–22% clean breathing room along the bottom caption band.
6. **OpenFilm Determinism**: Export `window.film = { width, height, duration, ready, frame(t) }`. Never use `requestAnimationFrame`, `Math.random()`, or per-frame layout mutations (`top/left/width/height`). Author `film.html` with native `<section><iframe id="..." src="scene.html" at="0"></iframe></section>` and dedicated `<section>` audio tracks.

---

## 4. Standard 4-Step Production Loop (Sound Included by Default)

### Step 1: Write a Concise Director Brief (`brief.json`)
Declare `title`, `format: { width, height, aspect, fps }`, `concept: { oneLineTreatment, emotion, tensionPair }`, `visualWorld: { medium, spatialArchitecture, continuityMethod }`, `colorScript: { harmony, roles, colorArc }`, and `shots: [{ id, file, role, shotType, focalPoint, energy, start, duration, heroAt, transitionOut }]`. (Only set `"silent": true` if the user explicitly requested a silent piece.)

### Step 2: Build the Film (`scene.html` + `film.html`)
Build a single deterministic `scene.html` driving all beats (copy only needed `./dfm-time.js`, `./dfm-lens.js`, or `./dfm-craft.css` locally).

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
1. Run `node "<DFM_ROOT>/cli/dfm.mjs" check .` (~2–6s). Q16 automatically verifies `window.film.frame(t)`, 0.25s full-timeline crash-free execution, **and** mounted `<audio>` tracks in `film.html`.
2. Inspect **`dfm-out/review-board.png`** with your vision tool (Hero frames, grayscale `ΔVal`, 3-frame motion strip `Δ`, Movie Color Barcode, safe-zone overlay) alongside the Q1–Q16 report.
3. Fix any visual, framing, contrast, caption, audio, or motion defect; verify localized visual fixes in 1–2s with `node "<DFM_ROOT>/cli/dfm.mjs" snap scene.html <t1,t2>`.
4. **(External authoring only)**: Run `node "<DFM_ROOT>/cli/dfm.mjs" to-openfilm <projectDir> <draftName>`. If already inside `OpenFilm/Projects/`, deliver directly for real-time playback in Studio.

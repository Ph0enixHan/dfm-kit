# dfm-kit

**English** | [简体中文](./README.zh-CN.md)

**A fast, style-agnostic Design-for-Motion director toolkit, OKLCH Color Script engine, 13-API cinema optical lens kit, and 1-board visual microscope for programmatic video.**

> **Core Philosophy**: Give 100% of visual style freedom back to your story and creative direction — 2D vector, Canvas illustration, WebGL, 3D macro UI, archival print collage, darkroom optics, or kinetic typography. Zero fixed visual templates, zero style lock-in, and zero `npm install` dependencies.

---

## Renderer Support

`dfm-kit` is designed as a **renderer-agnostic craft & QA layer** for AI-assisted programmatic motion design:

| Target Engine | Status | Notes |
| :--- | :--- | :--- |
| **[OpenFilm](https://openfilm.dev)** | **Supported (Built-in)** | Deterministic `window.film.frame(t)`, `dfm to-openfilm`, Studio skill installer & native CC0 audio workflow |
| **Hyperframes** | **Planned** | Renderer adapter & deterministic timeline bridge |
| **Remotion** | **Planned** | React composition frame inspector & Q1–Q16 visual QA adapter |

---

## Why `dfm-kit`?

AI-generated motion videos often look like PowerPoint decks: muddy flat contrast, cliché default UI colors, corner pagination (`01 / 06`), double subtitles colliding with native captions, or silent crashes on edge frames.

`dfm-kit` solves this with **5 orthogonal, zero-dependency building blocks** (runs natively on **Node 22+** + local Chrome/Edge via CDP):

1. **1-Board Fast Visual Microscope (`dfm check`)** — Renders **one compact, high-density `review-board.png`** in ~2–6 seconds combining Hero frames, grayscale Value separation (`ΔVal`), 3-frame motion continuity strips (`MOTION Δ`), whole-film & per-shot Movie Color Barcodes, and safe-zone overlays (use `--full` for 5 standalone HD boards).
2. **Full-Timeline Zero-Crash Sweep & Q1–Q16 QA (`dfm audit`)** — Automatically sweeps `frame(t)` every `0.25s` across the entire duration to catch hidden runtime exceptions, plus guards determinism, GPU performance, grayscale contrast, **anti-slide spatial architecture** (flags `display:none/visibility:hidden` slide-switcher DOMs and sluggish holds), **Truth to Medium** (flags cheap faux-3D CSS extrusions, fake metallic `conic-gradient` hacks, plastic glass glare, and bare system-font fallbacks), Pure Cinema Frame (flags unwanted slide pagination & numbered eyebrows), single-track captions (detects verbatim double subtitles), and mounted `<audio>` tracks.
3. **OKLCH Filmic Color Script Extractor (`dfm palette`)** — Extract a perceptual OKLCH Color Script (`*-palette.png`, `*-palette.json`, `*-theme.css`) with 60-30-10 chroma analysis from any film still, poster, or palette image.
4. **Optional Cinema Optics & Physical Motion Toolkit (`runtime/`)** — Copy only what you need:
   - `dfm-time.js` — Deterministic clamped easings, `defineShot()`, `seg()`, `hash()`, `lerpColor()`, plus physical motion primitives (`anticipationPop`, `whipPan` with synced directional blur/RGB split, `portalZoom`, `ambientDrift`)
   - `dfm-craft.css` — Procedural film grain, halftone print, halation, paper fiber, vignette, and scanlines
   - `dfm-lens.js` — 13 live DOM/SVG optical filters & camera rigs (`fisheye`, `motionBlur`, `rgbSplit`, `flutedGlass`, `tiltShift`, `anamorphicFlare`, `filmBurn`, `stepTime`, `handheld`, `impactShake`, `gateWeave`, `dollyZoom`, `crashZoom`)
5. **Portable Agent Director Skill (`skill/SKILL.md`)** — One command installs the portable director skill with Default Director Choreography (physical beat bridges, scale contrast, living holds — zero background/style lock-in) and binds your local repo path automatically.

---

## Quick Start

### Requirements
- **Node.js >= 22** (uses built-in `WebSocket` and `http` — **zero `npm install`**)
- **Google Chrome** or **Microsoft Edge** (headless CDP rendering; override path with `DFM_BROWSER`)
- **FFmpeg** (optional — only needed for `dfm preview` or `cli/textures-prep.mjs`)

### 1. Clone & Install the Skill (1 Command)
```bash
git clone https://github.com/Ph0enixHan/dfm-kit.git
cd dfm-kit
node cli/dfm.mjs install-skill
```
This installs `skill/SKILL.md` into your OpenFilm Studio `Skills/dfm-kit/` folder (override destination via `DFM_OPENFILM_SKILLS` or pass any agent skills directory as an argument) and binds `<DFM_ROOT>` to your local clone automatically.

### 2. Direct a Video with Your AI Agent
Invoke the `dfm-kit` skill and describe your video (optionally attach a reference still or color palette). The agent will:
1. Extract your palette (if given) and author a style-free `brief.json`
2. Build a deterministic single-file `scene.html` + timeline manifest (`film.html`)
3. Run `dfm check` (~2–6s), visually inspect `dfm-out/review-board.png`, and polish localized beats with 1–2s `dfm snap`
4. Assemble frame-synced SFX & background music

---

## CLI Reference

| Command | Description |
| :--- | :--- |
| `node cli/dfm.mjs check <dir> [--full]` | Render fast 1-board `review-board.png` + 0.25s full-timeline crash sweep + Q1–Q16 QA (`--full` outputs 5 standalone HD boards) |
| `node cli/dfm.mjs snap <htmlFile> <t1,t2,...>` | 1–2s single/multi-frame inspector (`dfm-out/snap.png` + safe-zone clipping stats) |
| `node cli/dfm.mjs palette <image> [outDir]` | Extract OKLCH Color Script, visual swatch card PNG, JSON & CSS theme variables |
| `node cli/dfm.mjs install-skill [skillsDir]` | Install `dfm-kit` skill into OpenFilm Studio (or any skills dir) with your local repo path |
| `node cli/dfm.mjs to-openfilm <dir> [name]` | Package an external project and sync into OpenFilm Studio `Projects/` |
| `node cli/dfm.mjs preview <dir>` | Render a deterministic 30fps H.264 MP4 preview (for headless CLI outside Studio) |
| `node cli/dfm.mjs audit <dir>` | Run Q1–Q16 QA audit without re-rendering boards |
| `node cli/dfm.mjs init <newDir>` | Scaffold a clean, style-agnostic `brief.json` starter |

---

## Repository Structure

```text
dfm-kit/
├── cli/
│   ├── dfm.mjs              # Main CLI entry
│   ├── board.mjs            # Fast 1-board review renderer + optional 5 HD boards + 0.25s crash sweep
│   ├── audit.mjs            # Style-agnostic Q1-Q16 QA auditor (pure frame, VTT double-subtitle & value checks)
│   ├── snap.mjs             # 1-2s targeted frame inspector
│   ├── palette.mjs          # OKLCH Color Script extractor from any reference image
│   ├── color-math.mjs       # sRGB <-> OKLCH color math & filmic role assignment
│   ├── cdp-browser.mjs      # Zero-dependency headless Chrome/Edge CDP driver with persistent HTTP cache
│   ├── openfilm-sync.mjs    # OpenFilm Studio draft packager & sync adapter
│   ├── install-skill.mjs    # 1-command skill installer
│   ├── preview.mjs          # Deterministic 30fps MP4 exporter (headless CLI)
│   └── textures-prep.mjs    # Optional <=1200px proxy baker for your local CC0 texture packs
├── runtime/                 # Optional zero-dependency browser modules (copy on demand)
│   ├── dfm-time.js          # Deterministic time, clamped easings, hash, defineShot()
│   ├── dfm-lens.js          # 13-API cinema optical lens & camera rig
│   ├── dfm-craft.css        # Procedural grain, halftone, halation, paper fiber, vignette
│   ├── dfm-motion.js        # Optional 3D world camera & radial rig helpers
│   └── dfm-stage.css        # Optional multi-plane stage helpers
├── spec/
│   ├── brief.schema.json    # Style-agnostic Director Brief schema
│   ├── rubric.json          # Universal Q1-Q16 Production QA Rubric
│   ├── fonts.json           # Curated Google Fonts casting pairings
│   └── continuity-grammar.json # Non-slide spatial & visual continuity grammar
├── skill/
│   └── SKILL.md             # Portable agent director skill
└── textures/
    └── README.md            # Guide for optional local CC0 tactile texture packs
```

---

## Optional Local Tactile Textures

Procedural textures in `runtime/dfm-craft.css` work out of the box with zero assets. If you want real scanned paper, 35mm film frames, or analog halftones, drop your own CC0 packs into `textures/` and run `node cli/textures-prep.mjs` to bake lightweight `<=1200px` proxies into `textures/web/` (see [textures/README.md](./textures/README.md)).

## License

[MIT](./LICENSE)

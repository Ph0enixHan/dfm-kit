# `textures/` — Optional Local CC0 Tactile Texture Library

Procedural craft layers in `runtime/dfm-craft.css` (film grain, halftone dots, halation, paper fiber, vignette, scanlines) work out of the box with zero external image assets.

When you want **real scanned paper fibers, 35mm film sprocket borders, analog dust/light leaks, or real halftone prints**, drop your own CC0 / commercially licensed texture packs into this folder and bake lightweight `<=1200px` working proxies once:

```bash
node cli/textures-prep.mjs
```

This generates fast `<=1200px` web proxies into `textures/web/` and updates `textures/manifest.json` so OpenFilm scenes can copy ready-to-use ~150KB tactile overlays into `assets/` instantly with zero per-project `ffmpeg` wait.

## Recommended Texture Types

| Category | Suggested Blend Mode (`mix-blend-mode`) | Best Use |
| :--- | :--- | :--- |
| Cotton / watercolor paper | `multiply` (`opacity: 0.22–0.45`) | Bright editorial layouts, humanist typography, modern print |
| Crumpled paper (multi-frame) | `multiply` / `overlay` (`opacity: 0.45–0.75`) | Stepped 8–12fps stop-motion paper boil (`stepTime(t, 8)`) |
| Dark analog dust / light leaks | `screen` (`opacity: 0.18–0.45`) | Darkroom optics, cinema title cards, warm transition burns |
| 35mm film sprocket borders (PNG) | `normal` / `screen` | Documentary framing, analog archival openings |
| Scanned print halftone | `multiply` / `soft-light` (`opacity: 0.14–0.30`) | Poster manifestos, bold duotone print graphics |

> High-quality CC0 sources: [Texturelabs.org](https://texturelabs.org), Unsplash, Pexels. Raw high-resolution packs and generated proxies are ignored by `.gitignore` to keep the git repository lightweight and license-clean.

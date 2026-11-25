/**
 * color-math.mjs — sRGB <-> OKLCH conversion & perceptual film palette role assignment
 * Zero dependencies. Based on Björn Ottosson's OKLab / OKLCH equations.
 */

export function rgbToHex(r, g, b) {
  const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToOklch(r8, g8, b8) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const r = lin(r8);
  const g = lin(g8);
  const b = lin(b8);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const bk = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;

  const C = Math.hypot(a, bk);
  let H = (Math.atan2(bk, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return {
    L: Number(L.toFixed(3)),
    C: Number(C.toFixed(3)),
    H: Number(H.toFixed(1)),
    css: `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${H.toFixed(0)})`
  };
}

/**
 * Assigns filmic Color Script roles (dominantGround, supportSurface, ink, muted, focalAccent, secondaryAccent)
 * from a list of extracted color clusters { r, g, b, hex, pct, oklch }.
 */
export function assignColorScriptRoles(clusters) {
  if (!clusters.length) return {};

  const byArea = [...clusters].sort((a, b) => b.pct - a.pct);
  const dominantGround = byArea[0];

  // Ink: strongest perceptual lightness contrast against dominantGround
  const byContrast = [...clusters].sort(
    (a, b) => Math.abs(b.oklch.L - dominantGround.oklch.L) - Math.abs(a.oklch.L - dominantGround.oklch.L)
  );
  const ink = byContrast[0] || dominantGround;

  // Focal Accent: highest chroma color not identical to dominantGround
  const nonGround = clusters.filter((c) => c.hex !== dominantGround.hex);
  const byChroma = [...nonGround].sort((a, b) => b.oklch.C - a.oklch.C);
  const focalAccent = byChroma[0] || ink;

  // Secondary Accent: second-highest chroma with distinct hue (>= 35 deg away)
  const secondaryAccent =
    byChroma.find((c) => {
      if (c.hex === focalAccent.hex) return false;
      const dh = Math.abs(c.oklch.H - focalAccent.oklch.H);
      const hueDist = Math.min(dh, 360 - dh);
      return hueDist >= 32 && c.oklch.C >= 0.06;
    }) || null;

  // Support Surface: largest remaining cluster not equal to dominantGround or focalAccent
  const supportSurface =
    byArea.find((c) => c.hex !== dominantGround.hex && c.hex !== focalAccent.hex) || ink;

  // Muted: low-chroma mid-tone cluster
  const muted =
    clusters.find(
      (c) =>
        c.hex !== dominantGround.hex &&
        c.hex !== focalAccent.hex &&
        c.oklch.C < 0.08 &&
        Math.abs(c.oklch.L - dominantGround.oklch.L) > 0.14
    ) || supportSurface;

  // Estimate harmony type from chromatic hues
  const chromatic = clusters.filter((c) => c.oklch.C >= 0.055);
  let harmony = "achromatic-accent";
  if (chromatic.length === 1) {
    harmony = "achromatic-accent";
  } else if (chromatic.length >= 2) {
    const h1 = chromatic[0].oklch.H;
    const h2 = chromatic[1].oklch.H;
    const diff = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2));
    if (diff < 28) harmony = "monochromatic";
    else if (diff < 68) harmony = "analogous";
    else if (diff > 135) harmony = "complementary";
    else harmony = "split-complementary";
  }

  return {
    harmony,
    roles: {
      dominantGround: dominantGround.hex,
      supportSurface: supportSurface.hex,
      ink: ink.hex,
      muted: muted.hex,
      focalAccent: focalAccent.hex,
      ...(secondaryAccent ? { secondaryAccent: secondaryAccent.hex } : {})
    },
    oklchRoles: {
      dominantGround: dominantGround.oklch.css,
      supportSurface: supportSurface.oklch.css,
      ink: ink.oklch.css,
      muted: muted.oklch.css,
      focalAccent: focalAccent.oklch.css,
      ...(secondaryAccent ? { secondaryAccent: secondaryAccent.oklch.css } : {})
    }
  };
}

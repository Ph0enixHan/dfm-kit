export interface CameraKeyframe {
  t: number;
  x?: number;
  y?: number;
  z?: number;
  scale?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  ease?: (t: number) => number;
}

export interface CameraPose {
  x: number;
  y: number;
  z: number;
  scale: number;
  rx: number;
  ry: number;
  rz: number;
  vx: number;
  vy: number;
  vz: number;
  speed: number;
}

export interface WorldCamera {
  sample(t: number): CameraPose;
  apply(worldEl: HTMLElement | null, pose: CameraPose, opts?: { velocityBlur?: number; maxBlur?: number }): void;
}

export type SafePreset = "social-strict" | "shorts" | "clean";

export function clamp(v: number, min?: number, max?: number): number;
export function clamp01(v: number): number;
export function lerp(a: number, b: number, t: number): number;
export function invLerp(a: number, b: number, v: number): number;
export function remap(v: number, inMin: number, inMax: number, outMin: number, outMax: number, easeFn?: (x: number) => number): number;
export function seg(t: number, start: number, end: number, easeFn?: (x: number) => number): number;
export function hash(seed: number): number;
export function lerpColor(hexA: string, hexB: string, p: number): string;
export const ease: Record<string, (t: number) => number>;

export function anticipationPop(t: number, at: number, dur?: number, opts?: { overshoot?: number }): number;
export function whipPan(
  t: number,
  cutAt: number,
  dur?: number,
  opts?: { distance?: number; axis?: "x" | "y"; maxBlur?: number; maxRgb?: number }
): { outOffset: number; inOffset: number; blurX: number; blurY: number; rgbPx: number; velocity: number; active: boolean };
export function portalZoom(
  t: number,
  cutAt: number,
  dur?: number,
  opts?: { maxScale?: number; inStartScale?: number }
): { outScale: number; outOpacity: number; inScale: number; inOpacity: number; active: boolean };
export function ambientDrift(
  t: number,
  seed?: number,
  opts?: { ampX?: number; ampY?: number; ampScale?: number; ampRot?: number; speed?: number }
): { x: number; y: number; scale: number; rotDeg: number };

export function createWorldCamera(keyframes: CameraKeyframe[]): WorldCamera;
export function radialWheelItem(
  index: number,
  total: number,
  rotationDeg: number,
  opts?: { radius?: number; stepDeg?: number }
): { x: number; y: number; angleDeg: number; focusWeight: number };

export function frameToTime(frame: number, fps?: number): number;
export function stepTime(t: number, fps?: number): number;
export function cameraRigStyle(opts?: { width?: number; height?: number; perspective?: number }): Record<string, string | number>;
export function worldCameraStyle(
  pose: CameraPose,
  opts?: { velocityBlur?: number; maxBlur?: number }
): Record<string, string | number>;
export function clipRevealStyle(
  progress: number,
  opts?: { dir?: "up" | "down" | "left" | "right"; distance?: number; fade?: boolean }
): Record<string, string | number>;
export function maskSlideStyle(
  progress: number,
  opts?: { dir?: "up" | "down" | "left" | "right"; percent?: number }
): Record<string, string | number>;
export function staggerProgress(
  index: number,
  t: number,
  opts?: { start?: number; itemDur?: number; step?: number; easeFn?: (x: number) => number }
): number;
export function handheldStyle(
  t: number,
  opts?: { ampX?: number; ampY?: number; ampRot?: number; speed?: number }
): { transform: string };
export function impactShakeStyle(
  t: number,
  hitAt: number,
  opts?: { power?: number; decay?: number; freq?: number; rotPower?: number }
): { transform: string };
export function gateWeaveStyle(
  t: number,
  opts?: { fps?: number; ampPx?: number; ampRot?: number; flicker?: number }
): { transform: string; opacity: number };
export function safeAreaBox(
  width?: number,
  height?: number,
  preset?: SafePreset | null
): {
  preset: SafePreset;
  top: number;
  right: number;
  bottom: number;
  left: number;
  safeWidth: number;
  safeHeight: number;
  style: { position: "absolute"; left: number; top: number; width: number; height: number };
};

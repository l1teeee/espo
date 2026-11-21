export type Point = { x: number; y: number };

export function damp(current: number, target: number, rate: number, deltaSeconds: number): number {
  return target + (current - target) * Math.exp(-rate * deltaSeconds);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function dampAngle(current: number, target: number, rate: number, deltaSeconds: number): number {
  const delta = ((((target - current) % 360) + 540) % 360) - 180;
  return current + delta * (1 - Math.exp(-rate * deltaSeconds));
}

import type { Point } from "./motion";

export function pointingAngle(from: Point, to: Point): number {
  return Math.atan2(to.x - from.x, from.y - to.y) * 180 / Math.PI;
}

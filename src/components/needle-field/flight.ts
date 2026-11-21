import { clamp, type Point } from "./motion";

export const CROSSING_SECONDS = 8;
export const PAUSE_SECONDS = 1.5;
export const CRUISE_ALTITUDE = 0.31;

export function autopilotPosition(elapsedSeconds: number, cardWidth: number, cardHeight: number, ringSize: number): Point & { cycle: number } {
  const cycleLength = CROSSING_SECONDS + PAUSE_SECONDS;
  const cycle = Math.floor(elapsedSeconds / cycleLength);
  const phase = elapsedSeconds - cycle * cycleLength;
  const progress = Math.min(phase / CROSSING_SECONDS, 1);
  return {
    x: -ringSize + progress * (cardWidth + 2 * ringSize),
    y: cardHeight * CRUISE_ALTITUDE,
    cycle,
  };
}

export function autopilotElapsedForX(x: number, cardWidth: number, ringSize: number): number {
  return clamp((x + ringSize) / (cardWidth + 2 * ringSize), 0, 1) * CROSSING_SECONDS;
}

export function parkedPosition(cardWidth: number, cardHeight: number): Point {
  return { x: cardWidth * 0.5, y: cardHeight * CRUISE_ALTITUDE };
}

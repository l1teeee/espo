"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { pointingAngle } from "./aim";
import { autopilotElapsedForX, autopilotPosition, parkedPosition } from "./flight";
import { clamp, damp, dampAngle, type Point } from "./motion";
import Needle from "./Needle";

gsap.registerPlugin(useGSAP);

const NEEDLE_COLUMNS = 19;
const NEEDLE_ROW_TOPS_PERCENT = [87.3, 93, 98.8];
const NEEDLE_EDGE_PERCENT = 0.4;
const RING_FOLLOW_RATE = 5;
const NEEDLE_RATE = 10;
const MAX_DELTA_SECONDS = 0.05;

function needleLeftPercent(column: number): number {
  return NEEDLE_EDGE_PERCENT + column * (100 - 2 * NEEDLE_EDGE_PERCENT) / (NEEDLE_COLUMNS - 1);
}

export default function NeedleField() {
  const cardRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const card = cardRef.current;
    const ring = ringRef.current;
    if (!card || !ring) return;

    const needles = Array.from(card.querySelectorAll<HTMLDivElement>("[data-needle]"), (element) => ({
      element,
      center: { x: 0, y: 0 },
      angle: 0,
    }));
    let cardWidth = 0;
    let cardHeight = 0;
    let ringSize = 0;

    function measure() {
      cardWidth = card!.clientWidth;
      cardHeight = card!.clientHeight;
      ringSize = ring!.offsetWidth;
      const cardRect = card!.getBoundingClientRect();
      needles.forEach((needle) => {
        const rect = needle.element.getBoundingClientRect();
        needle.center = { x: rect.left + rect.width / 2 - cardRect.left, y: rect.top + rect.height / 2 - cardRect.top };
      });
    }

    function writeRing(position: Point) {
      ring!.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%)`;
      ring!.style.visibility = "visible";
    }

    function writeNeedle(needle: (typeof needles)[number]) {
      needle.element.style.transform = `rotate(${needle.angle.toFixed(2)}deg)`;
    }

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      let mode: "autopilot" | "pilot" = "autopilot";
      let pointerX = 0;
      let pointerY = 0;
      let clockOrigin = gsap.ticker.time;
      let lastCycle = -1;
      let ringX = 0;
      let ringY = 0;
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(card);

      function followPointer(event: PointerEvent) {
        mode = "pilot";
        const rect = card!.getBoundingClientRect();
        pointerX = clamp(event.clientX - rect.left, 0, cardWidth);
        pointerY = clamp(event.clientY - rect.top, 0, cardHeight);
      }

      function resumeAutopilot() {
        mode = "autopilot";
        clockOrigin = gsap.ticker.time - autopilotElapsedForX(ringX, cardWidth, ringSize);
        lastCycle = autopilotPosition(gsap.ticker.time - clockOrigin, cardWidth, cardHeight, ringSize).cycle;
      }

      card.addEventListener("pointermove", followPointer);
      card.addEventListener("pointerdown", followPointer);
      card.addEventListener("pointerleave", resumeAutopilot);
      card.addEventListener("pointercancel", resumeAutopilot);

      function tick(time: number, deltaMs: number) {
        const dt = Math.min(deltaMs / 1000, MAX_DELTA_SECONDS);
        let target: Point;
        if (mode === "autopilot") {
          const position = autopilotPosition(time - clockOrigin, cardWidth, cardHeight, ringSize);
          if (position.cycle !== lastCycle) {
            ringX = position.x;
            ringY = position.y;
            lastCycle = position.cycle;
          }
          target = position;
        } else {
          target = { x: pointerX, y: pointerY };
        }
        ringX = damp(ringX, target.x, RING_FOLLOW_RATE, dt);
        ringY = damp(ringY, target.y, RING_FOLLOW_RATE, dt);
        writeRing({ x: ringX, y: ringY });

        const ringOnCard = ringX >= 0 && ringX <= cardWidth;
        needles.forEach((needle) => {
          const targetAngle = ringOnCard ? pointingAngle(needle.center, { x: ringX, y: ringY }) : 0;
          needle.angle = dampAngle(needle.angle, targetAngle, NEEDLE_RATE, dt);
          writeNeedle(needle);
        });
      }

      gsap.ticker.add(tick);
      return () => {
        gsap.ticker.remove(tick);
        observer.disconnect();
        card.removeEventListener("pointermove", followPointer);
        card.removeEventListener("pointerdown", followPointer);
        card.removeEventListener("pointerleave", resumeAutopilot);
        card.removeEventListener("pointercancel", resumeAutopilot);
        needles.forEach((needle) => { needle.element.style.transform = ""; });
      };
    });

    media.add("(prefers-reduced-motion: reduce)", () => {
      function render() {
        measure();
        const position = parkedPosition(cardWidth, cardHeight);
        writeRing(position);
        needles.forEach((needle) => {
          needle.angle = pointingAngle(needle.center, position);
          writeNeedle(needle);
        });
      }
      render();
      const observer = new ResizeObserver(render);
      observer.observe(card);
      return () => observer.disconnect();
    });

    return () => media.revert();
  }, { scope: cardRef });

  return (
    <div ref={cardRef} role="img" aria-label="Un círculo cruza la tarjeta y una cuadrícula de líneas gira para seguirlo" className="bg-sky relative aspect-[9/16] w-[min(92vw,420px,calc(92svh*9/16))] touch-none select-none overflow-hidden">
      <div ref={ringRef} className="absolute left-0 top-0 aspect-square w-[4.3%] rounded-full border-2 border-ink will-change-transform" style={{ visibility: "hidden" }} />
      {NEEDLE_ROW_TOPS_PERCENT.map((top, row) =>
        Array.from({ length: NEEDLE_COLUMNS }, (_, column) => (
          <div
            key={`${row}-${column}`}
            data-needle
            className="absolute aspect-[2/15] h-[2.3%] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${needleLeftPercent(column)}%`, top: `${top}%` }}
          >
            <Needle />
          </div>
        )),
      )}
    </div>
  );
}

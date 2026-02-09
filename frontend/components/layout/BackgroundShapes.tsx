"use client";

import { useMemo } from "react";

const COLORS = [
  "bg-mongene-green",
  "bg-mongene-yellow",
  "bg-mongene-blue",
  "bg-pink-400",
] as const;

interface ShapeData {
  id: number;
  color: string;
  size: number;
  left: string;
  top: string;
  blur: string;
}

/**
 * Seeded pseudo-random number generator for deterministic shapes.
 * Uses a simple mulberry32 algorithm.
 */
function seededRandom(seed: number) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export default function BackgroundShapes() {
  const shapes = useMemo<ShapeData[]>(() => {
    const cols = 3;
    const rows = 4;
    const result: ShapeData[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const rand = seededRandom(idx * 127 + 42);
        const jitterY = (rand - 0.5) * 12; // ±6% vertical jitter
        const jitterX = (seededRandom(idx * 53 + 17) - 0.5) * 8; // ±4% horizontal jitter

        const baseLeft = (col / cols) * 100 + 100 / cols / 2;
        const baseTop = (row / rows) * 100 + 100 / rows / 2;

        result.push({
          id: idx,
          color: COLORS[idx % COLORS.length],
          size: 120 + seededRandom(idx * 97 + 7) * 160, // 120–280px
          left: `${baseLeft + jitterX}%`,
          top: `${baseTop + jitterY}%`,
          blur: `blur(${60 + seededRandom(idx * 31 + 11) * 40}px)`,
        });
      }
    }

    return result;
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: -1 }}
    >
      {/* Colored shapes layer */}
      <div className="absolute inset-0 overflow-hidden">
        {shapes.map((shape) => (
          <div
            key={shape.id}
            className={`absolute rounded-full opacity-15 ${shape.color}`}
            style={{
              width: shape.size,
              height: shape.size,
              left: shape.left,
              top: shape.top,
              transform: "translate(-50%, -50%)",
              filter: shape.blur,
            }}
          />
        ))}
      </div>

      {/* Frosted glass overlay */}
      <div className="absolute inset-0 backdrop-blur-2xl bg-white/80" />
    </div>
  );
}

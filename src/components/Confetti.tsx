import { useEffect, useRef } from "react";

const COLOURS = ["#eda4e8", "#ddf073", "#fff8e6"];
const COUNT = 140;
const LIFE_MS = 4200;

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  colour: string;
  spin: number;
  angle: number;
};

/** One canvas burst on completion, then it removes itself. */
export default function Confetti() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = el.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      el.width = window.innerWidth * dpr;
      el.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const w = () => el.width / dpr;
    const pieces: Piece[] = Array.from({ length: COUNT }, () => ({
      x: w() * (0.15 + Math.random() * 0.7),
      y: -20 - Math.random() * window.innerHeight * 0.4,
      vx: (Math.random() - 0.5) * 2.4,
      vy: 2 + Math.random() * 3.5,
      size: 5 + Math.random() * 7,
      colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
      spin: (Math.random() - 0.5) * 0.25,
      angle: Math.random() * Math.PI,
    }));

    let raf = 0;
    let last = 0;
    // Life accumulates from real frame deltas, not from wall-clock since mount:
    // if the tab is hidden when this mounts, rAF is suspended and a wall-clock
    // animation would arrive already expired and never draw a thing.
    let life = 0;

    const frame = (now: number) => {
      const dt = last ? Math.min(now - last, 50) : 16.7;
      last = now;
      life += dt;
      const speed = dt / 16.7; // keep the fall rate the same on any refresh rate

      const fade = Math.max(0, 1 - Math.max(0, life - LIFE_MS * 0.6) / (LIFE_MS * 0.4));
      ctx.clearRect(0, 0, w(), el.height / dpr);

      for (const p of pieces) {
        p.x += p.vx * speed;
        p.y += p.vy * speed;
        p.vy += 0.045 * speed; // gravity
        p.vx *= 1 - 0.005 * speed;
        p.angle += p.spin * speed;

        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.colour;
        // Flat rectangles read as paper when they spin.
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }

      if (life < LIFE_MS) {
        raf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, w(), el.height / dpr);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 h-full w-full"
    />
  );
}

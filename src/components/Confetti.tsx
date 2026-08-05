import { useEffect, useRef } from "react";

const COLOURS = ["#eda4e8", "#ddf073", "#fff8e6"];
const PER_CANNON = 90;
/** The right cannon follows the left one, so it reads as two shots. */
const SECOND_CANNON_DELAY_MS = 190;
const LIFE_MS = 5200;

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  colour: string;
  spin: number;
  angle: number;
  /** Held at the muzzle until its cannon fires. */
  delay: number;
};

/** Two corner cannons fired up and inward, then gravity brings it all down. */
export default function Confetti() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = el.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth;
    let h = window.innerHeight;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const cannon = (originX: number, aim: 1 | -1, delay: number): Piece[] =>
      Array.from({ length: PER_CANNON }, () => {
        // Up and inward, with enough spread that it fans rather than streams.
        const angle = (Math.PI / 180) * (55 + Math.random() * 32);
        const speed = 15 + Math.random() * 11;
        return {
          x: originX + aim * Math.random() * 40,
          y: h + 10,
          vx: Math.cos(angle) * speed * aim,
          vy: -Math.sin(angle) * speed,
          size: 5 + Math.random() * 7,
          colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
          spin: (Math.random() - 0.5) * 0.3,
          angle: Math.random() * Math.PI,
          delay,
        };
      });

    const pieces = [
      ...cannon(-10, 1, 0),
      ...cannon(w + 10, -1, SECOND_CANNON_DELAY_MS),
    ];

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
      const speed = dt / 16.7; // keep the arc the same on any refresh rate

      const fade = Math.max(0, 1 - Math.max(0, life - LIFE_MS * 0.65) / (LIFE_MS * 0.35));
      ctx.clearRect(0, 0, w, h);

      for (const p of pieces) {
        if (life < p.delay) continue;

        p.x += p.vx * speed;
        p.y += p.vy * speed;
        p.vy += 0.38 * speed; // gravity turns the launch into an arc
        p.vx *= 1 - 0.008 * speed; // air drag, so they drift rather than fly straight
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
        ctx.clearRect(0, 0, w, h);
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

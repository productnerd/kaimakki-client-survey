import { useEffect, useRef, useState } from "react";

/** Productions restart on the first of September. */
const RESTART = new Date(new Date().getFullYear(), 8, 1, 0, 0, 0);

/** Characters a flap riffles through before it settles. */
const RIFFLE = "0123456789";
const RIFFLE_MS = 55;
const RIFFLE_TICKS = 7;

function remaining(): { days: number; hours: number; mins: number; secs: number; past: boolean } {
  const ms = RESTART.getTime() - Date.now();
  if (ms <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, past: true };
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    mins: Math.floor((total % 3600) / 60),
    secs: total % 60,
    past: false,
  };
}

/**
 * One tile of a Solari board. When its character changes it riffles through a
 * few others before landing, which is what makes the thing feel mechanical.
 */
function Flap({ char, delay }: { char: string; delay: number }) {
  const [shown, setShown] = useState(char);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (shown === char) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(char);
      return;
    }

    timers.current.forEach(clearTimeout);
    timers.current = [];
    for (let i = 0; i < RIFFLE_TICKS; i++) {
      timers.current.push(
        window.setTimeout(
          () => setShown(RIFFLE[Math.floor(Math.random() * RIFFLE.length)]),
          delay + i * RIFFLE_MS,
        ),
      );
    }
    timers.current.push(
      window.setTimeout(() => setShown(char), delay + RIFFLE_TICKS * RIFFLE_MS),
    );

    return () => timers.current.forEach(clearTimeout);
    // `shown` is deliberately out of the deps: it changes on every riffle tick
    // and would restart the animation each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char, delay]);

  return (
    <span className="relative inline-flex h-11 w-8 items-center justify-center overflow-hidden rounded bg-background font-display text-xl font-black text-cream shadow-inner sm:h-14 sm:w-10 sm:text-2xl">
      {shown}
      {/* The seam across the middle of a real flap. */}
      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/60" />
    </span>
  );
}

function Group({ value, label, offset }: { value: number; label: string; offset: number }) {
  const digits = String(value).padStart(2, "0").split("");
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex gap-1">
        {digits.map((d, i) => (
          <Flap key={i} char={d} delay={offset + i * 70} />
        ))}
      </div>
      <span className="font-display text-[10px] font-bold uppercase tracking-[0.15em] text-cream-31">
        {label}
      </span>
    </div>
  );
}

/** Departures-board countdown to the restart of productions. */
export default function Countdown() {
  const [time, setTime] = useState(remaining);

  useEffect(() => {
    const id = window.setInterval(() => setTime(remaining()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-6 rounded-2xl border border-cream-20 bg-background/30 p-5 text-center">
      <p className="label mb-3">✈️ Back in production</p>

      {time.past ? (
        <p className="font-display text-lg font-black text-lime">
          Productions are rolling again. See you out there.
        </p>
      ) : (
        <div className="flex items-start justify-center gap-3 sm:gap-5">
          <Group value={time.days} label="Days" offset={0} />
          <Group value={time.hours} label="Hours" offset={120} />
          <Group value={time.mins} label="Mins" offset={240} />
          {/* Seconds carry the motion, so they land immediately. */}
          <Group value={time.secs} label="Secs" offset={0} />
        </div>
      )}

      <p className="mt-4 text-sm text-cream-78">
        We are very excited to get back to it! 😎
      </p>
    </div>
  );
}

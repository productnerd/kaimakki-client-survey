import { VIRTUE_EXTENT } from "../lib/survey";

const POSITIONS = Array.from({ length: VIRTUE_EXTENT * 2 + 1 }, (_, i) => i - VIRTUE_EXTENT);

/**
 * Five-point scale where the centre is the good answer (Aristotle's mean).
 * Deliberately unselected until tapped: a drag slider would park a default
 * answer at the centre and quietly inflate every score.
 */
export function VirtueScale({
  low,
  mid,
  high,
  value,
  onChange,
}: {
  low: string;
  mid: string;
  high: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3 text-[11px] leading-snug text-cream-61">
        <span className="max-w-[45%]">{low}</span>
        <span className="max-w-[45%] text-right">{high}</span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-1">
        {POSITIONS.map((p) => {
          const selected = value === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-label={`${low} ${p} ${high}`}
              aria-pressed={selected}
              className={`h-11 flex-1 rounded-full border transition ${
                selected
                  ? "border-accent bg-accent"
                  : "border-cream-20 bg-background hover:border-cream-31"
              } ${p === 0 && !selected ? "border-dashed" : ""}`}
            >
              <span
                className={`mx-auto block rounded-full transition ${
                  selected ? "h-2 w-2 bg-brown" : "h-1.5 w-1.5 bg-cream-31"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* The mean is the good answer, so name the behaviour rather than
          leaving the client to infer it from the two extremes. */}
      <p className="mt-2 text-center text-[11px] leading-snug text-lime/70">{mid}</p>
    </div>
  );
}

/** Numbered scale: NPS runs 0-10, the disappointment question runs 1-7. */
export function PointScale({
  min,
  max,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  min: number;
  max: number;
  value: number | undefined;
  onChange: (v: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  const points = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  // 11 points won't fit one phone row; 7 will.
  const wraps = points.length > 7;
  return (
    <div>
      <div
        className={`grid gap-2 ${wraps ? "grid-cols-6 sm:grid-cols-11" : ""}`}
        style={
          wraps ? undefined : { gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }
        }
      >
        {points.map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-pressed={selected}
              className={`aspect-square rounded-2xl border font-display text-sm font-bold transition ${
                selected
                  ? "border-accent bg-accent text-brown"
                  : "border-cream-20 text-cream-61 hover:border-cream-31 hover:text-cream"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between gap-4 text-[11px] text-cream-31">
        <span>{lowLabel}</span>
        <span className="text-right">{highLabel}</span>
      </div>
    </div>
  );
}

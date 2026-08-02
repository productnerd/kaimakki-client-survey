const POSITIONS = [-2, -1, 0, 1, 2];

/**
 * Five-point scale where the centre is the good answer (Aristotle's mean).
 * Deliberately unselected until tapped — a drag slider would park a default
 * answer at the centre and quietly inflate every score.
 */
export function VirtueScale({
  low,
  high,
  value,
  onChange,
  showCentreHint = false,
}: {
  low: string;
  high: string;
  value: number | undefined;
  onChange: (v: number) => void;
  showCentreHint?: boolean;
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

      {showCentreHint && (
        <p className="mt-1 text-center text-[10px] uppercase tracking-wider text-cream-31">
          centre = balanced
        </p>
      )}
    </div>
  );
}

export function NpsScale({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
        {Array.from({ length: 11 }, (_, n) => {
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
      <div className="mt-2 flex justify-between text-[11px] text-cream-31">
        <span>Not at all likely</span>
        <span>Extremely likely</span>
      </div>
    </div>
  );
}

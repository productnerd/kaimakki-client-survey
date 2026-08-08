import { useState } from "react";

/**
 * A small "i" that reveals a note on hover, focus or tap.
 *
 * State-driven rather than CSS hover: phones have no hover, so a tap has to
 * open it too.
 */
export default function InfoDot({ note, label }: { note: string; label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`More about ${label}`}
        aria-expanded={open}
        className={`flex h-4 w-4 items-center justify-center rounded-full border font-display text-[10px] font-black leading-none transition ${
          open
            ? "border-accent bg-accent text-brown"
            : "border-cream-31 text-cream-31 hover:border-accent hover:text-accent"
        }`}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-60 animate-fade-up rounded-2xl border border-cream-20 bg-background/95 p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-cream-78 shadow-2xl shadow-black/60 backdrop-blur-md"
        >
          {note}
        </span>
      )}
    </span>
  );
}

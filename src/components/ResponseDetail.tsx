import { useEffect } from "react";
import type { AdminLink } from "../lib/api";
import { PMF_MAX, VIRTUE_EXTENT, VIRTUES } from "../lib/survey";

export default function ResponseDetail({
  link,
  onClose,
}: {
  link: AdminLink;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const a = link.answers ?? {};
  const am = link.account_manager;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-background/80 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        className="card mx-auto max-w-2xl animate-fade-up p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">{link.client_name}</h2>
            <p className="text-sm text-cream-31">
              {link.contact_name && `${link.contact_name} · `}
              {am} ·{" "}
              {new Date(link.completed_at!).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full border border-cream-20 px-3 py-1.5 text-xs text-cream-61 hover:text-cream"
          >
            Close
          </button>
        </div>

        <div className="mt-8 space-y-7">
          <Answer q="Disappointment if Kaimakki went away">
            <p className="font-display text-lg font-bold text-accent">
              {typeof a.pmf === "number" ? `${a.pmf} / ${PMF_MAX}` : "—"}
            </p>
            {a.pmf_why && <p className="mt-2 whitespace-pre-wrap text-cream-78">{a.pmf_why}</p>}
          </Answer>

          <Answer q="Would recommend to their niche">
            <p className="font-display text-lg font-bold text-accent">
              {typeof a.nps === "number" ? `${a.nps} / 10` : "—"}
            </p>
          </Answer>

          <Answer q="Top three selling points">
            <ol className="space-y-1.5">
              {(a.selling_points ?? []).filter(Boolean).map((p, i) => (
                <li key={i} className="flex gap-3 text-cream-78">
                  <span className="font-display font-bold text-cream-31">{i + 1}</span>
                  {p}
                </li>
              ))}
              {!(a.selling_points ?? []).filter(Boolean).length && <Empty />}
            </ol>
          </Answer>

          <Answer q="The one caveat they'd give a friend">
            <Text value={a.caveat} />
          </Answer>

          <Answer q="Main benefit">
            <Text value={a.main_benefit} />
          </Answer>

          <Answer q="How we can improve">
            <Text value={a.improve} />
          </Answer>

          <Answer q={`${am} — balance across the virtues`}>
            <div className="space-y-2">
              {VIRTUES.map((v) => {
                const pos = a.virtues?.[v.key];
                if (typeof pos !== "number") return null;
                return (
                  <div key={v.key} className="flex items-center gap-3 text-xs">
                    <span className="w-28 shrink-0 text-cream-61">{v.name}</span>
                    <Diverging value={pos} />
                    <span className="w-20 shrink-0 text-right text-cream-31">
                      {pos === 0 ? "balanced" : pos < 0 ? v.low : v.high}
                    </span>
                  </div>
                );
              })}
              {!a.virtues && <Empty />}
            </div>
          </Answer>

          <Answer q={`What would make ${am} 10x for them`}>
            <Text value={a.am_advice} />
          </Answer>

          <Answer q={`Where ${am} shines`}>
            <Text value={a.am_shines} />
          </Answer>

          <Answer q="Anything else">
            <Text value={a.anything_else} />
          </Answer>
        </div>
      </div>
    </div>
  );
}

/** A single -3..3 position drawn as a bar leaving the centre line. */
function Diverging({ value }: { value: number }) {
  const pct = (Math.abs(value) / VIRTUE_EXTENT) * 50;
  return (
    <div className="relative h-2 flex-1 rounded-full bg-cream-10">
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-cream-31" />
      <div
        className="absolute top-0 h-full bg-accent"
        style={{
          left: value < 0 ? `${50 - pct}%` : "50%",
          width: `${pct}%`,
          borderRadius: 99,
        }}
      />
      {value === 0 && (
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime" />
      )}
    </div>
  );
}

function Answer({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label">{q}</p>
      {children}
    </div>
  );
}

function Text({ value }: { value?: string }) {
  if (!value?.trim()) return <Empty />;
  return <p className="whitespace-pre-wrap leading-relaxed text-cream-78">{value}</p>;
}

function Empty() {
  return <p className="text-cream-31">Skipped</p>;
}

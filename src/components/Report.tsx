import { useEffect, useState } from "react";
import { REPORT_MINIMUM, adminReport, generateReport, type SurveyReport } from "../lib/api";

export default function Report({
  passcode,
  completedCount,
}: {
  passcode: string;
  completedCount: number;
}) {
  const [report, setReport] = useState<SurveyReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminReport(passcode)
      .then((res) => res.ok && setReport(res.report ?? null))
      .catch(() => {});
  }, [passcode]);

  const locked = completedCount < REPORT_MINIMUM;
  const stale = report && report.response_count < completedCount;

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = await generateReport(passcode);
      if (!res.ok || !res.report) setError(res.error ?? "Could not generate the report.");
      else setReport(res.report);
    } catch {
      setError("Could not reach the report service.");
    }
    setBusy(false);
  }

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold">Synthesised report</h2>
          <p className="mt-1 text-sm text-cream-61">
            {locked
              ? `Unlocks at ${REPORT_MINIMUM} completed responses. ${completedCount} so far.`
              : "Every response, read together and turned into something you can act on."}
          </p>
        </div>
        {!locked && (
          <button className="btn-primary" onClick={run} disabled={busy}>
            {busy ? "Reading everything…" : report ? "Regenerate" : "Generate report"}
          </button>
        )}
      </div>

      {locked && (
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-cream-10">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${(completedCount / REPORT_MINIMUM) * 100}%` }}
          />
        </div>
      )}

      {error && <p className="mt-4 text-sm text-accent">{error}</p>}

      {stale && !busy && (
        <p className="mt-4 text-sm text-cream-31">
          Written from {report.response_count} responses. {completedCount} are in now.
          Regenerate to include the newest.
        </p>
      )}

      {busy && (
        <p className="mt-6 animate-breathe text-cream-31">
          Reading {completedCount} responses and writing it up. This takes a moment.
        </p>
      )}

      {report && !busy && (
        <>
          <p className="mt-5 text-xs text-cream-31">
            {report.response_count} responses ·{" "}
            {new Date(report.created_at).toLocaleString("en-GB", {
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <Markdown source={report.markdown} />
        </>
      )}
    </section>
  );
}

/**
 * Just enough markdown for what the model is asked to produce: headings, bullets,
 * numbered lists, bold and inline code. Not worth a dependency.
 */
function Markdown({ source }: { source: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let ordered = false;

  const flush = () => {
    if (!list.length) return;
    const items = list.map((t, i) => (
      <li key={i} className="leading-relaxed text-cream-78">
        {inline(t)}
      </li>
    ));
    blocks.push(
      ordered ? (
        <ol key={blocks.length} className="mb-4 list-decimal space-y-2 pl-5 marker:text-accent">
          {items}
        </ol>
      ) : (
        <ul key={blocks.length} className="mb-4 list-disc space-y-2 pl-5 marker:text-accent">
          {items}
        </ul>
      ),
    );
    list = [];
  };

  for (const raw of source.split("\n")) {
    const line = raw.trimEnd();

    if (/^#{1,6}\s/.test(line)) {
      flush();
      const level = line.match(/^#+/)![0].length;
      const text = line.replace(/^#+\s*/, "");
      blocks.push(
        level <= 2 ? (
          <h3
            key={blocks.length}
            className="mb-3 mt-8 font-display text-xl font-bold text-cream first:mt-0"
          >
            {text}
          </h3>
        ) : (
          <h4 key={blocks.length} className="mb-2 mt-5 font-display font-bold text-cream">
            {text}
          </h4>
        ),
      );
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (ordered) flush();
      ordered = false;
      list.push(bullet[1]);
      continue;
    }

    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (numbered) {
      if (!ordered) flush();
      ordered = true;
      list.push(numbered[1]);
      continue;
    }

    flush();
    if (line.trim() === "" || /^-{3,}$/.test(line.trim())) continue;
    blocks.push(
      <p key={blocks.length} className="mb-4 leading-relaxed text-cream-78">
        {inline(line)}
      </p>,
    );
  }
  flush();

  return <div className="mt-5 max-w-3xl">{blocks}</div>;
}

/** **bold**, *italic* and `code` within a line. */
function inline(text: string): React.ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
    .filter(Boolean)
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-bold text-cream">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="rounded bg-cream-10 px-1.5 py-0.5 text-[0.9em] text-lime">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }
      return <span key={i}>{part}</span>;
    });
}

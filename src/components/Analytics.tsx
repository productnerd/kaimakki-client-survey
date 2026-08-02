import type { AdminLink } from "../lib/api";
import {
  PMF_MAX,
  PMF_MIN,
  PMF_VERY_FROM,
  VIRTUE_EXTENT,
  VIRTUES,
  balanceScore,
} from "../lib/survey";

const mean = (ns: number[]) => (ns.length ? ns.reduce((s, n) => s + n, 0) / ns.length : null);

export default function Analytics({ links }: { links: AdminLink[] }) {
  const all = links.filter((l) => !l.archived);
  const done = all.filter((l) => l.completed_at);

  if (done.length === 0) {
    return (
      <p className="card p-8 text-center text-cream-31">
        Analytics appear once the first survey is completed.
      </p>
    );
  }

  // NPS: promoters (9–10) minus detractors (0–6), as a percentage.
  const npsValues = done
    .map((l) => l.answers?.nps)
    .filter((n): n is number => typeof n === "number");
  const promoters = npsValues.filter((n) => n >= 9).length;
  const detractors = npsValues.filter((n) => n <= 6).length;
  const nps = npsValues.length
    ? Math.round(((promoters - detractors) / npsValues.length) * 100)
    : null;

  // PMF: the Sean Ellis benchmark is 40% "very disappointed" — here, the top two
  // points of the 1–7 scale.
  const pmf = done
    .map((l) => l.answers?.pmf)
    .filter((n): n is number => typeof n === "number");
  const veryCount = pmf.filter((p) => p >= PMF_VERY_FROM).length;
  const pmfScore = pmf.length ? Math.round((veryCount / pmf.length) * 100) : null;

  const allBalances = done.flatMap((l) =>
    Object.values(l.answers?.virtues ?? {}).map(balanceScore),
  );
  const avgBalance = mean(allBalances);

  const managers = [...new Set(done.map((l) => l.account_manager))].sort();

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BigStat
          label="PMF score"
          value={pmfScore === null ? "—" : `${pmfScore}%`}
          note={
            pmfScore === null
              ? undefined
              : `scoring ${PMF_VERY_FROM}–${PMF_MAX} · ${pmfScore >= 40 ? "above" : "below"} the 40% benchmark`
          }
          good={pmfScore !== null && pmfScore >= 40}
        />
        <BigStat
          label="NPS"
          value={nps === null ? "—" : String(nps)}
          note={`${promoters} promoter${promoters === 1 ? "" : "s"}, ${detractors} detractor${detractors === 1 ? "" : "s"}`}
          good={nps !== null && nps >= 50}
        />
        <BigStat
          label="Avg balance"
          value={avgBalance === null ? "—" : `${Math.round(avgBalance)}`}
          note="100 = dead centre on every virtue"
          good={avgBalance !== null && avgBalance >= 70}
        />
        <BigStat
          label="Completed"
          value={`${done.length}/${all.length}`}
          note={`${Math.round((done.length / all.length) * 100)}% of links sent`}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Panel title="How they'd feel without us">
          <Histogram
            values={pmf}
            min={PMF_MIN}
            max={PMF_MAX}
            barClass={(n) => (n >= PMF_VERY_FROM ? "bg-lime" : n >= 4 ? "bg-cream-31" : "bg-accent")}
            lowLabel="Not disappointed"
            highLabel="Very disappointed"
          />
        </Panel>

        <Panel title="Recommendation spread">
          <Histogram
            values={npsValues}
            min={0}
            max={10}
            barClass={(n) => (n >= 9 ? "bg-lime" : n >= 7 ? "bg-cream-31" : "bg-accent")}
            lowLabel="Detractors"
            highLabel="Promoters"
          />
        </Panel>
      </div>

      <Panel title="Virtue balance — everyone">
        <p className="mb-5 text-sm text-cream-61">
          Where the bar sits shows which way clients think the team leans. Dead centre is the
          goal.
        </p>
        <VirtueChart links={done} />
      </Panel>

      {managers.length > 1 && (
        <Panel title="By account manager">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <Th>Manager</Th>
                  <Th>Responses</Th>
                  <Th>Avg NPS</Th>
                  <Th>Balance</Th>
                </tr>
              </thead>
              <tbody>
                {managers.map((m) => {
                  const rows = done.filter((l) => l.account_manager === m);
                  const mNps = mean(
                    rows.map((l) => l.answers?.nps).filter((n): n is number => typeof n === "number"),
                  );
                  const mBal = mean(
                    rows.flatMap((l) => Object.values(l.answers?.virtues ?? {}).map(balanceScore)),
                  );
                  return (
                    <tr key={m} className="border-b border-border/50">
                      <td className="py-3 font-display font-bold">{m}</td>
                      <td className="py-3 text-cream-61">{rows.length}</td>
                      <td className="py-3 text-cream-61">
                        {mNps === null ? "—" : mNps.toFixed(1)}
                      </td>
                      <td className="py-3 text-cream-61">
                        {mBal === null ? "—" : Math.round(mBal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {managers.map((m) => (
            <div key={m} className="mt-8">
              <p className="label">{m}</p>
              <VirtueChart links={done.filter((l) => l.account_manager === m)} />
            </div>
          ))}
        </Panel>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <Panel title="Selling points, in their words">
          <Quotes
            items={done.flatMap((l) =>
              (l.answers?.selling_points ?? [])
                .filter((p) => p?.trim())
                .map((p) => ({ text: p, who: l.client_name })),
            )}
          />
        </Panel>
        <Panel title="What they want us to fix">
          <Quotes
            items={done
              .filter((l) => l.answers?.improve?.trim())
              .map((l) => ({ text: l.answers!.improve!, who: l.client_name }))}
          />
        </Panel>
      </div>

      <Panel title="Who we're not right for">
        <p className="mb-5 text-sm text-cream-61">
          The caveat each client would give a friend — the clearest signal of which leads to
          walk away from.
        </p>
        <Quotes
          items={done
            .filter((l) => l.answers?.caveat?.trim())
            .map((l) => ({ text: l.answers!.caveat!, who: l.client_name }))}
        />
      </Panel>
    </div>
  );
}

/**
 * Bar = average lean, so you can see which way clients think someone tips.
 * Number = average of each client's own balance score, NOT the balance of the
 * average: two clients at opposite extremes cancel out to a centred bar, and
 * that disagreement is the thing you most want to notice.
 */
function VirtueChart({ links }: { links: AdminLink[] }) {
  return (
    <div className="space-y-3">
      {VIRTUES.map((v) => {
        const positions = links
          .map((l) => l.answers?.virtues?.[v.key])
          .filter((n): n is number => typeof n === "number");
        const avg = mean(positions);
        const balance = mean(positions.map(balanceScore));

        return (
          <div key={v.key} className="flex items-center gap-3 text-xs">
            <span className="w-24 shrink-0 font-display font-bold text-cream-78 sm:w-28">
              {v.name}
            </span>
            <span className="hidden w-40 shrink-0 truncate text-right text-cream-31 sm:block">
              {v.low}
            </span>
            <div className="relative h-3 flex-1 rounded-full bg-cream-10">
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-cream-31" />
              {avg !== null && (
                <div
                  className="absolute top-0 h-full rounded-full bg-accent"
                  style={{
                    left: avg < 0 ? `${50 - (Math.abs(avg) / VIRTUE_EXTENT) * 50}%` : "50%",
                    width: `${Math.max((Math.abs(avg) / VIRTUE_EXTENT) * 50, 1.5)}%`,
                  }}
                />
              )}
            </div>
            <span className="hidden w-40 shrink-0 truncate text-cream-31 sm:block">{v.high}</span>
            <span
              className={`w-8 shrink-0 text-right font-display font-bold ${
                balance !== null && balance < 60 ? "text-accent" : ""
              }`}
            >
              {balance === null ? "—" : Math.round(balance)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Histogram({
  values,
  min,
  max,
  barClass,
  lowLabel,
  highLabel,
}: {
  values: number[];
  min: number;
  max: number;
  barClass: (n: number) => string;
  lowLabel: string;
  highLabel: string;
}) {
  const points = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const counts = points.map((n) => values.filter((v) => v === n).length);
  // Bars fill 85% of the track at most, leaving room for the count label above.
  const peak = Math.max(1, ...counts);

  return (
    <>
      <div className="flex h-32 items-end gap-1">
        {points.map((n, i) => {
          const pct = (counts[i] / peak) * 85;
          return (
            <div key={n} className="relative flex h-full flex-1 items-end">
              <div
                className={`w-full rounded-t ${barClass(n)}`}
                style={{ height: `${pct}%` }}
              />
              {counts[i] > 0 && (
                <span
                  className="absolute inset-x-0 text-center text-[10px] text-cream-61"
                  style={{ bottom: `calc(${pct}% + 4px)` }}
                >
                  {counts[i]}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1">
        {points.map((n) => (
          <span key={n} className="flex-1 text-center text-[10px] text-cream-31">
            {n}
          </span>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-cream-31">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </>
  );
}

function Quotes({ items }: { items: { text: string; who: string }[] }) {
  if (items.length === 0) return <p className="text-cream-31">Nothing here yet.</p>;
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="border-l-2 border-cream-20 pl-4">
          <p className="text-cream-78">{it.text}</p>
          <p className="mt-1 text-xs text-cream-31">{it.who}</p>
        </li>
      ))}
    </ul>
  );
}

function BigStat({
  label,
  value,
  note,
  good,
}: {
  label: string;
  value: string;
  note?: string;
  good?: boolean;
}) {
  return (
    <div className="card p-5">
      <p className="label mb-1">{label}</p>
      <p className={`font-display text-4xl font-bold ${good ? "text-lime" : "text-cream"}`}>
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-cream-31">{note}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="mb-5 font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="pb-3 font-display text-xs font-bold uppercase tracking-wider text-cream-31">
      {children}
    </th>
  );
}

import { useCallback, useEffect, useState } from "react";
import { adminArchive, adminCreate, adminList, type AdminLink, type RevealPoint } from "../lib/api";
import { copyText } from "../lib/clipboard";
import {
  ACCOUNT_MANAGERS,
  VALUE_GROUPS,
  VALUE_ITEMS,
  VIRTUES,
  WELCOME_INTRO,
  welcomeHeading,
} from "../lib/survey";
import Analytics from "./Analytics";
import Report from "./Report";
import ResponseDetail from "./ResponseDetail";
import { Logo, Shell, VideoBackdrop } from "./Shell";

const PASSCODE_KEY = "kaimakki_survey_passcode";
type Tab = "links" | "responses" | "analytics" | "report";

function surveyUrl(slug: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}${slug}`;
}

/** Same survey, but nothing is recorded and the reveal is visible. */
function testUrl(slug: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}test/${slug}`;
}

function linkStatus(l: AdminLink) {
  if (l.completed_at) return { label: "Completed", tone: "text-lime" };
  if (l.started_at) return { label: "In progress", tone: "text-accent" };
  if (l.opened_at) return { label: "Opened", tone: "text-cream-61" };
  return { label: "Not opened", tone: "text-cream-31" };
}

export default function Admin() {
  const [passcode, setPasscode] = useState("");
  const [authed, setAuthed] = useState(false);
  const [links, setLinks] = useState<AdminLink[]>([]);
  const [tab, setTab] = useState<Tab>("links");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  const load = useCallback(async (code: string) => {
    const res = await adminList(code);
    if (!res.ok) throw new Error(res.error ?? "unauthorized");
    setLinks(res.links ?? []);
  }, []);

  // Re-use the passcode from this browser tab so a refresh doesn't lock you out.
  useEffect(() => {
    const saved = sessionStorage.getItem(PASSCODE_KEY);
    if (!saved) return setChecking(false);
    load(saved)
      .then(() => {
        setPasscode(saved);
        setAuthed(true);
      })
      .catch(() => sessionStorage.removeItem(PASSCODE_KEY))
      .finally(() => setChecking(false));
  }, [load]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await load(passcode);
      sessionStorage.setItem(PASSCODE_KEY, passcode);
      setAuthed(true);
    } catch {
      setError("That passcode isn't right.");
    }
    setBusy(false);
  }

  const refresh = () => load(passcode).catch(() => setAuthed(false));

  if (checking) {
    return <Shell><p className="animate-breathe text-center text-cream-31">Loading…</p></Shell>;
  }

  if (!authed) {
    return (
      <Shell>
        <h1 className="q-title text-center">Client survey admin</h1>
        <form onSubmit={signIn} className="mx-auto mt-6 max-w-xs">
          <label className="label text-center" htmlFor="passcode">Passcode</label>
          <input
            id="passcode"
            type="password"
            className="field"
            value={passcode}
            autoFocus
            onChange={(e) => setPasscode(e.target.value)}
          />
          {error && <p className="mt-3 text-center text-sm text-accent">{error}</p>}
          <button className="btn-primary mt-5 w-full" disabled={busy || !passcode}>
            {busy ? "Checking…" : "Enter"}
          </button>
        </form>
      </Shell>
    );
  }

  const responded = links.filter((l) => l.completed_at);

  return (
    <div className="relative min-h-full">
      <VideoBackdrop />
      <div className="relative mx-auto max-w-6xl px-6 py-8">
      <header className="flex flex-col items-center gap-4 text-center">
        <Logo />
        {/* Sits on the raw video, so it needs the same shadow the logo carries. */}
        <h1 className="font-display text-xl font-bold [text-shadow:0_2px_10px_rgba(0,0,0,0.8)]">
          Client survey
        </h1>
        <nav className="flex gap-1 rounded-full border border-cream-20 bg-background/50 p-1 backdrop-blur-md">
          {(["links", "responses", "analytics", "report"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 font-display text-xs font-bold capitalize transition ${
                tab === t ? "bg-accent text-brown" : "text-cream-61 hover:text-cream"
              }`}
            >
              {t}
              {t === "responses" && responded.length > 0 && (
                <span className="ml-1.5 opacity-60">{responded.length}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <div className="mt-8">
        {tab === "links" && <LinksTab links={links} passcode={passcode} onChange={refresh} />}
        {tab === "responses" && <ResponsesTab links={responded} />}
        {tab === "analytics" && <Analytics links={links} />}
        {tab === "report" && <Report passcode={passcode} completedCount={responded.length} />}
      </div>
      </div>
    </div>
  );
}

function LinksTab({
  links,
  passcode,
  onChange,
}: {
  links: AdminLink[];
  passcode: string;
  onChange: () => void;
}) {
  const blank = {
    client_name: "",
    contact_name: "",
    welcome_message: "",
    account_manager: ACCOUNT_MANAGERS[0],
    reveal_appreciate: emptyPoints(),
    reveal_recommendations: emptyPoints(),
  };
  const [form, setForm] = useState(blank);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    // Blank points would show as empty bullets on the reveal.
    const res = await adminCreate(passcode, {
      ...form,
      reveal_appreciate: form.reveal_appreciate.filter((p) => p.title.trim() || p.body.trim()),
      reveal_recommendations: form.reveal_recommendations.filter((p) => p.title.trim() || p.body.trim()),
    });
    setBusy(false);
    if (!res.ok || !res.slug) return setError(res.error ?? "Could not create the link.");

    const copied = await copyText(surveyUrl(res.slug));
    setToast({
      message: copied
        ? `Link for ${form.client_name} copied to your clipboard`
        : `Link for ${form.client_name} created. Use Copy link in the list`,
      ok: copied,
    });
    setForm(blank);
    onChange();
  }

  const visible = links.filter((l) => showArchived || !l.archived);

  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
      {toast && <Toast {...toast} onDone={() => setToast(null)} />}
      <form onSubmit={create} className="card h-fit space-y-4 p-6">
        <h2 className="font-display text-lg font-bold">New link</h2>
        <div>
          <label className="label" htmlFor="client_name">Client / business *</label>
          <input
            id="client_name"
            className="field"
            required
            value={form.client_name}
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
            placeholder="Acme Coffee Roasters"
          />
        </div>
        <div>
          <label className="label" htmlFor="contact_name">Who's filling it in</label>
          <input
            id="contact_name"
            className="field"
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            placeholder="Nikos"
          />
        </div>
        <div>
          <label className="label" htmlFor="account_manager">Account manager *</label>
          <select
            id="account_manager"
            className="field"
            value={form.account_manager}
            onChange={(e) => setForm({ ...form, account_manager: e.target.value })}
          >
            {ACCOUNT_MANAGERS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label flex items-center gap-1.5" htmlFor="welcome_message">
            Welcome message
            <PrecedingCopy contact={form.contact_name || form.client_name} />
          </label>
          <textarea
            id="welcome_message"
            rows={4}
            className="field"
            value={form.welcome_message}
            onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
            placeholder="A line or two of context, in your voice. This follows the standard opening."
          />
        </div>
        <PointsFieldset
          legend="Reveal: what we love about working with you"
          hint="Three things you genuinely appreciate about their business and the collaboration."
          name="appreciate"
          points={form.reveal_appreciate}
          onChange={(reveal_appreciate) => setForm({ ...form, reveal_appreciate })}
          titlePlaceholder={["You brief like nobody else", "And…", "And…"]}
        />
        <PointsFieldset
          legend="Reveal: three things we'd do next"
          hint="Unlocked only when they finish the survey."
          name="recommendation"
          points={form.reveal_recommendations}
          onChange={(reveal_recommendations) => setForm({ ...form, reveal_recommendations })}
          titlePlaceholder={["The biggest lever", "And…", "And…"]}
        />

        {error && <p className="text-sm text-accent">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Creating…" : "Create link"}
        </button>
      </form>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">
            All links <span className="text-cream-31">{visible.length}</span>
          </h2>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-cream-61">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-accent"
            />
            Show archived
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="card p-8 text-center text-cream-31">
            No links yet. Create one on the left.
          </p>
        ) : (
          <div className="space-y-2">
            {visible.map((l) => {
              const status = linkStatus(l);
              return (
                <div
                  key={l.id}
                  className={`card flex flex-wrap items-center gap-4 p-4 ${
                    l.archived ? "opacity-50" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-bold">
                      {l.client_name}
                      {l.contact_name && (
                        <span className="ml-2 font-normal text-cream-31">{l.contact_name}</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-cream-31">
                      {l.account_manager} · /{l.slug}
                    </p>
                  </div>
                  <span className={`font-display text-xs font-bold ${status.tone}`}>
                    {status.label}
                  </span>
                  <CopyButton text={surveyUrl(l.slug)} />
                  <a
                    href={testUrl(l.slug)}
                    target="_blank"
                    rel="noreferrer"
                    title="Walk this survey without recording anything"
                    className="text-xs text-cream-31 underline-offset-2 hover:text-cream hover:underline"
                  >
                    Test
                  </a>
                  <button
                    className="text-xs text-cream-31 underline-offset-2 hover:text-cream hover:underline"
                    onClick={async () => {
                      await adminArchive(passcode, l.id, !l.archived);
                      onChange();
                    }}
                  >
                    {l.archived ? "Restore" : "Archive"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Shows the fixed copy that already sits above the welcome note, so nobody
 * writes it twice.
 *
 * Driven by state rather than a CSS hover variant: phones have no hover, so a
 * tap has to open it too.
 */
function PrecedingCopy({ contact }: { contact: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex normal-case tracking-normal">
      <button
        type="button"
        aria-label="See the copy that appears above the welcome message"
        aria-expanded={open}
        className={`flex h-5 w-5 items-center justify-center rounded-full transition ${
          open ? "text-accent" : "text-cream-31 hover:text-accent"
        }`}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      {open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-72 -translate-x-1/2 animate-fade-up rounded-2xl border border-cream-20 bg-background/95 p-4 text-left shadow-2xl shadow-black/60 backdrop-blur-md"
        >
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-cream-31">
            Already shown above your message
          </span>
          <span className="block font-display text-sm font-black text-cream">
            {welcomeHeading(contact.trim() || "their name")}
          </span>
          {WELCOME_INTRO.map((line, i) => (
            <span key={i} className="mt-1.5 block text-xs leading-relaxed text-cream-61">
              {line}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

const emptyPoints = (): RevealPoint[] => [
  { title: "", body: "" },
  { title: "", body: "" },
  { title: "", body: "" },
];

/** Three titled points with a paragraph each, used by both reveal sections. */
function PointsFieldset({
  legend,
  hint,
  name,
  points,
  onChange,
  titlePlaceholder,
}: {
  legend: string;
  hint: string;
  name: string;
  points: RevealPoint[];
  onChange: (points: RevealPoint[]) => void;
  titlePlaceholder: string[];
}) {
  const edit = (i: number, patch: Partial<RevealPoint>) => {
    const next = points.map((p, j) => (i === j ? { ...p, ...patch } : p));
    onChange(next);
  };

  return (
    <div>
      <span className="label">{legend}</span>
      <p className="mb-3 -mt-1 text-xs text-cream-31">{hint}</p>
      <div className="space-y-3">
        {points.map((p, i) => (
          <div key={i} className="rounded-2xl border border-cream-20 bg-background/30 p-3">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-black text-accent">{i + 1}</span>
              <input
                className="field"
                aria-label={`${name} ${i + 1} title`}
                value={p.title}
                onChange={(e) => edit(i, { title: e.target.value })}
                placeholder={titlePlaceholder[i]}
              />
            </div>
            <textarea
              rows={2}
              className="field mt-2 text-sm"
              aria-label={`${name} ${i + 1} description`}
              value={p.body}
              onChange={(e) => edit(i, { body: e.target.value })}
              placeholder="A sentence or two explaining it."
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ResponsesTab({ links }: { links: AdminLink[] }) {
  const [manager, setManager] = useState("all");
  const [open, setOpen] = useState<AdminLink | null>(null);

  const managers = [...new Set(links.map((l) => l.account_manager))].sort();
  const shown = manager === "all" ? links : links.filter((l) => l.account_manager === manager);

  if (links.length === 0) {
    return <p className="card p-8 text-center text-cream-31">No completed responses yet.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          className="field w-auto"
          value={manager}
          onChange={(e) => setManager(e.target.value)}
        >
          <option value="all">All account managers</option>
          {managers.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button className="btn-ghost" onClick={() => downloadCsv(shown)}>
          Export CSV
        </button>
      </div>

      <div className="space-y-2">
        {shown.map((l) => (
          <button
            key={l.id}
            onClick={() => setOpen(l)}
            className="card flex w-full flex-wrap items-center gap-4 p-4 text-left transition hover:border-cream-31"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-display font-bold">{l.client_name}</p>
              <p className="truncate text-xs text-cream-31">
                {l.account_manager} ·{" "}
                {new Date(l.completed_at!).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <Stat label="NPS" value={l.answers?.nps ?? "-"} />
            <Stat label="Disappt." value={l.answers?.pmf ?? "-"} />
            <span className="text-xs text-cream-31">View →</span>
          </button>
        ))}
      </div>

      {open && <ResponseDetail link={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="font-display text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-cream-31">{label}</p>
    </div>
  );
}

function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  return (
    <button
      className={`rounded-full border border-cream-20 px-3 py-1.5 font-display text-xs font-bold transition hover:border-cream-31 ${
        state === "done" ? "text-lime" : state === "failed" ? "text-accent" : "text-cream-61"
      } ${className}`}
      onClick={async (e) => {
        e.stopPropagation();
        setState((await copyText(text)) ? "done" : "failed");
        setTimeout(() => setState("idle"), 1800);
      }}
    >
      {state === "done" ? "Copied" : state === "failed" ? "Copy failed" : "Copy link"}
    </button>
  );
}

function Toast({ message, ok, onDone }: { message: string; ok: boolean; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-sm animate-fade-up sm:inset-x-auto sm:right-6"
    >
      <div
        className={`flex items-center gap-3 rounded-full border px-5 py-3 shadow-lg ${
          ok ? "border-lime/40 bg-lime/10 text-lime" : "border-accent/40 bg-accent/10 text-accent"
        }`}
      >
        <span className="font-display text-sm font-bold">{ok ? "✓" : "!"}</span>
        <p className="text-sm text-cream">{message}</p>
      </div>
    </div>
  );
}

function downloadCsv(links: AdminLink[]) {
  const headers = [
    "client",
    "contact",
    "account_manager",
    "completed_at",
    "pmf_1_7",
    "pmf_why",
    "nps",
    "selling_point_1",
    "selling_point_2",
    "selling_point_3",
    "catch",
    "main_benefit",
    "improve",
    ...VALUE_ITEMS.map((v) => `value_${v.key}`),
    ...VALUE_GROUPS.map((g) => `notes_${g.key}`),
    ...VIRTUES.map((v) => `virtue_${v.key}`),
    "notes_account_manager",
    "advice",
    "shines",
    "anything_else",
  ];

  const rows = links.map((l) => {
    const a = l.answers ?? {};
    const p = a.selling_points ?? [];
    return [
      l.client_name,
      l.contact_name ?? "",
      l.account_manager,
      l.completed_at ?? "",
      a.pmf ?? "",
      a.pmf_why ?? "",
      a.nps ?? "",
      p[0] ?? "",
      p[1] ?? "",
      p[2] ?? "",
      a.caveat ?? "",
      a.main_benefit ?? "",
      a.improve ?? "",
      ...VALUE_ITEMS.map((v) => a.values?.[v.key] ?? ""),
      ...VALUE_GROUPS.map((g) => a.value_notes?.[g.key] ?? ""),
      ...VIRTUES.map((v) => a.virtues?.[v.key] ?? ""),
      a.virtues_note ?? "",
      a.am_advice ?? "",
      a.am_shines ?? "",
      a.anything_else ?? "",
    ];
  });

  const escape = (cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");

  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `kaimakki-client-survey-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

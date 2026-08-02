import { useCallback, useEffect, useState } from "react";
import { adminArchive, adminCreate, adminList, type AdminLink } from "../lib/api";
import { ACCOUNT_MANAGERS, VIRTUES } from "../lib/survey";
import Analytics from "./Analytics";
import ResponseDetail from "./ResponseDetail";

const PASSCODE_KEY = "kaimakki_survey_passcode";
type Tab = "links" | "responses" | "analytics";

function surveyUrl(slug: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}${slug}`;
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
    return (
      <main className="flex min-h-full items-center justify-center">
        <p className="animate-breathe text-cream-31">Loading…</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center px-6">
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-accent">
          Kaimakki
        </p>
        <h1 className="q-title mt-3">Client survey admin</h1>
        <form onSubmit={signIn} className="mt-8">
          <label className="label" htmlFor="passcode">Passcode</label>
          <input
            id="passcode"
            type="password"
            className="field"
            value={passcode}
            autoFocus
            onChange={(e) => setPasscode(e.target.value)}
          />
          {error && <p className="mt-3 text-sm text-accent">{error}</p>}
          <button className="btn-primary mt-5 w-full" disabled={busy || !passcode}>
            {busy ? "Checking…" : "Enter"}
          </button>
        </form>
      </main>
    );
  }

  const responded = links.filter((l) => l.completed_at);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Kaimakki
          </p>
          <h1 className="font-display text-2xl font-bold">Client survey</h1>
        </div>
        <nav className="flex gap-1 rounded-full border border-border bg-surface p-1">
          {(["links", "responses", "analytics"] as Tab[]).map((t) => (
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
  };
  const [form, setForm] = useState(blank);
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await adminCreate(passcode, form);
    setBusy(false);
    if (!res.ok || !res.slug) return setError(res.error ?? "Could not create the link.");
    setCreated(res.slug);
    setForm(blank);
    onChange();
  }

  const visible = links.filter((l) => showArchived || !l.archived);

  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
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
          <label className="label" htmlFor="welcome_message">Welcome message</label>
          <textarea
            id="welcome_message"
            rows={4}
            className="field"
            value={form.welcome_message}
            onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
            placeholder="A line or two of context, in your voice."
          />
        </div>
        {error && <p className="text-sm text-accent">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Creating…" : "Create link"}
        </button>

        {created && (
          <div className="rounded-2xl border border-lime/40 bg-lime/5 p-4">
            <p className="label mb-1 text-lime">Ready to send</p>
            <p className="break-all text-xs text-cream-78">{surveyUrl(created)}</p>
            <CopyButton text={surveyUrl(created)} className="mt-3 w-full" />
          </div>
        )}
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
            <Stat label="NPS" value={l.answers?.nps ?? "—"} />
            <Stat
              label="PMF"
              value={
                l.answers?.pmf === "very"
                  ? "Very"
                  : l.answers?.pmf === "somewhat"
                    ? "Some"
                    : l.answers?.pmf === "not"
                      ? "Not"
                      : "—"
              }
            />
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
  const [done, setDone] = useState(false);
  return (
    <button
      className={`rounded-full border border-cream-20 px-3 py-1.5 font-display text-xs font-bold transition hover:border-cream-31 ${
        done ? "text-lime" : "text-cream-61"
      } ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
    >
      {done ? "Copied" : "Copy link"}
    </button>
  );
}

function downloadCsv(links: AdminLink[]) {
  const headers = [
    "client",
    "contact",
    "account_manager",
    "completed_at",
    "pmf",
    "pmf_why",
    "selling_point_1",
    "selling_point_2",
    "selling_point_3",
    "main_benefit",
    "improve",
    "nps",
    ...VIRTUES.map((v) => `virtue_${v.key}`),
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
      p[0] ?? "",
      p[1] ?? "",
      p[2] ?? "",
      a.main_benefit ?? "",
      a.improve ?? "",
      a.nps ?? "",
      ...VIRTUES.map((v) => a.virtues?.[v.key] ?? ""),
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

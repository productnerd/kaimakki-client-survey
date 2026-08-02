import { useEffect, useState, type ReactNode } from "react";
import { openSurvey, saveSurvey, type SurveyLink } from "../lib/api";
import { PMF_OPTIONS, VIRTUES, type Answers } from "../lib/survey";
import { NpsScale, VirtueScale } from "./Scales";

type Phase = "loading" | "notfound" | "error" | "welcome" | "questions" | "done";

export default function Survey({ slug }: { slug: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [link, setLink] = useState<SurveyLink | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    openSurvey(slug)
      .then((data) => {
        if (!live) return;
        if (!data) return setPhase("notfound");
        setLink(data);
        setAnswers(data.answers ?? {});
        setPhase(data.completed ? "done" : "welcome");
      })
      .catch(() => live && setPhase("error"));
    return () => {
      live = false;
    };
  }, [slug]);

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  // Nested values must merge off the latest state, not the render closure:
  // two taps batched into one render would otherwise drop the first.
  function setVirtue(key: string, position: number) {
    setAnswers((prev) => ({ ...prev, virtues: { ...(prev.virtues ?? {}), [key]: position } }));
  }

  function setSellingPoint(index: number, value: string) {
    setAnswers((prev) => {
      const next = [...(prev.selling_points ?? ["", "", ""])];
      next[index] = value;
      return { ...prev, selling_points: next };
    });
  }

  async function advance(to: number, complete = false) {
    setSaving(true);
    const payload = { ...answers, _step: to };
    setAnswers(payload);
    try {
      await saveSurvey(slug, payload, complete);
    } catch {
      // A failed autosave shouldn't trap them mid-survey; the next step retries
      // with the full answer set anyway.
    }
    setSaving(false);
    if (complete) {
      setPhase("done");
    } else {
      setStep(to);
      window.scrollTo({ top: 0 });
    }
  }

  if (phase === "loading") {
    return <Centered><p className="animate-breathe text-cream-31">Loading…</p></Centered>;
  }

  if (phase === "notfound") {
    return (
      <Centered>
        <h1 className="q-title">We can't find that link.</h1>
        <p className="mt-4 text-cream-61">
          It may have expired or been mistyped. Send your account manager a nudge and
          they'll fire over a fresh one.
        </p>
      </Centered>
    );
  }

  if (phase === "error" || !link) {
    return (
      <Centered>
        <h1 className="q-title">Something went wrong.</h1>
        <p className="mt-4 text-cream-61">Give it a refresh — if it keeps happening, let us know.</p>
      </Centered>
    );
  }

  if (phase === "done") {
    return (
      <Centered>
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-accent">
          All done
        </p>
        <h1 className="q-title mt-4">Thank you, {link.contact_name || link.client_name}.</h1>
        <p className="mt-4 text-cream-61">
          Genuinely — this is the stuff that changes how we work. Every answer gets read.
        </p>
        {link.gift_note && (
          <div className="card mt-8 p-6 text-left">
            <p className="label">Your thank-you gift</p>
            <p className="whitespace-pre-wrap text-cream">{link.gift_note}</p>
          </div>
        )}
      </Centered>
    );
  }

  if (phase === "welcome") {
    const resuming = Object.keys(answers).length > 0;
    return (
      <Centered>
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-accent">
          Kaimakki
        </p>
        <h1 className="q-title mt-4">
          Hi {link.contact_name || link.client_name} — got five minutes?
        </h1>
        {link.welcome_message && (
          <p className="mt-5 whitespace-pre-wrap text-lg text-cream-78">{link.welcome_message}</p>
        )}
        <div className="card mt-8 space-y-4 p-6 text-left">
          <Bullet>
            <strong className="text-cream">Nine questions</strong>, about five minutes. Most are
            a tap; a few have a box to type in.
          </Bullet>
          <Bullet>
            We're trying to get better — <strong className="text-cream">as a business and as
            people</strong>. Blunt answers are worth more to us than kind ones.
          </Bullet>
          <Bullet>
            Some questions are about{" "}
            <strong className="text-cream">{link.account_manager}</strong> specifically. They
            asked for this.
          </Bullet>
          <Bullet>
            Finish it and there's a <strong className="text-cream">thank-you gift</strong>{" "}
            waiting on the last screen.
          </Bullet>
        </div>
        <button
          className="btn-primary mt-8 w-full sm:w-auto"
          onClick={() => {
            setStep(answers._step ?? 0);
            setPhase("questions");
          }}
        >
          {resuming ? "Pick up where I left off" : "Let's go"}
        </button>
      </Centered>
    );
  }

  const steps = buildSteps(link, answers, set, setVirtue, setSellingPoint);
  const current = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col px-6 py-8 sm:py-12">
      <div className="mb-8">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Kaimakki
          </span>
          <span className="text-xs text-cream-31">
            {step + 1} of {steps.length}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-cream-10">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div key={step} className="flex-1 animate-fade-up">
        <h2 className="q-title">{current.title}</h2>
        {current.hint && <p className="mt-3 text-cream-61">{current.hint}</p>}
        <div className="mt-7">{current.body}</div>
      </div>

      <div className="mt-10 flex items-center justify-between gap-4 pb-4">
        <button
          className="btn-ghost"
          onClick={() => {
            setStep((s) => Math.max(0, s - 1));
            window.scrollTo({ top: 0 });
          }}
          disabled={step === 0 || saving}
        >
          Back
        </button>
        <button
          className="btn-primary"
          onClick={() => advance(step + 1, last)}
          disabled={!current.ready || saving}
        >
          {saving ? "Saving…" : last ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}

type Step = { title: string; hint?: string; body: ReactNode; ready: boolean };

function buildSteps(
  link: SurveyLink,
  a: Answers,
  set: <K extends keyof Answers>(k: K, v: Answers[K]) => void,
  setVirtue: (key: string, position: number) => void,
  setSellingPoint: (index: number, value: string) => void,
): Step[] {
  const am = link.account_manager;
  const points = a.selling_points ?? ["", "", ""];

  return [
    {
      title: "How would you feel if you could no longer work with Kaimakki?",
      body: (
        <div className="space-y-3">
          {PMF_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set("pmf", opt.value)}
              className={`w-full rounded-2xl border px-5 py-4 text-left font-display font-bold transition ${
                a.pmf === opt.value
                  ? "border-accent bg-accent text-brown"
                  : "border-cream-20 text-cream-78 hover:border-cream-31 hover:text-cream"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <div className="pt-3">
            <label className="label" htmlFor="pmf_why">
              Tell us why <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id="pmf_why"
              rows={3}
              className="field"
              value={a.pmf_why ?? ""}
              onChange={(e) => set("pmf_why", e.target.value)}
              placeholder="What would you miss most?"
            />
          </div>
        </div>
      ),
      ready: !!a.pmf,
    },
    {
      title: "Pitch us to a friend who runs a business.",
      hint: "What are your top three selling points for Kaimakki? Their words, not ours.",
      body: (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="font-display text-sm font-bold text-cream-31">{i + 1}</span>
              <input
                className="field"
                value={points[i] ?? ""}
                onChange={(e) => setSellingPoint(i, e.target.value)}
                placeholder={
                  i === 0 ? "The first thing you'd say" : i === 1 ? "And then…" : "One more"
                }
              />
            </div>
          ))}
        </div>
      ),
      ready: points.some((p) => p.trim().length > 0),
    },
    {
      title: "What's the main benefit you get from Kaimakki?",
      hint: "If you had to pick just one.",
      body: (
        <textarea
          rows={5}
          className="field"
          value={a.main_benefit ?? ""}
          onChange={(e) => set("main_benefit", e.target.value)}
          placeholder="The one thing that matters most…"
        />
      ),
      ready: true,
    },
    {
      title: "How can we improve Kaimakki for you?",
      hint: "Be specific and be blunt. This is the question we act on hardest.",
      body: (
        <textarea
          rows={5}
          className="field"
          value={a.improve ?? ""}
          onChange={(e) => set("improve", e.target.value)}
          placeholder="What's annoying, missing, or slower than it should be?"
        />
      ),
      ready: true,
    },
    {
      title: "How likely are you to recommend Kaimakki to another business in your niche?",
      body: <NpsScale value={a.nps} onChange={(v) => set("nps", v)} />,
      ready: typeof a.nps === "number",
    },
    {
      title: `Where does ${am} sit on each of these?`,
      hint: "Borrowed from Aristotle: every strength is a middle point between two extremes. The centre is the good answer — the ends are both ways of overdoing it.",
      body: (
        <div className="space-y-7">
          {VIRTUES.map((v, i) => (
            <div key={v.key}>
              <p className="mb-2 font-display text-sm font-bold text-cream">{v.name}</p>
              <VirtueScale
                low={v.low}
                high={v.high}
                value={a.virtues?.[v.key]}
                onChange={(pos) => setVirtue(v.key, pos)}
                showCentreHint={i === 0}
              />
            </div>
          ))}
        </div>
      ),
      ready: Object.keys(a.virtues ?? {}).length > 0,
    },
    {
      title: `What advice would you give ${am}?`,
      hint: `Specifically: what would make them a 10x social media manager for you — not in general, for you.`,
      body: (
        <textarea
          rows={5}
          className="field"
          value={a.am_advice ?? ""}
          onChange={(e) => set("am_advice", e.target.value)}
          placeholder="If they changed one thing about how they work with you…"
        />
      ),
      ready: true,
    },
    {
      title: `What do you especially appreciate about ${am}?`,
      hint: "Where do they shine? We'd love to be able to tell them.",
      body: (
        <textarea
          rows={5}
          className="field"
          value={a.am_shines ?? ""}
          onChange={(e) => set("am_shines", e.target.value)}
          placeholder="The thing you'd miss if someone else took over…"
        />
      ),
      ready: true,
    },
    {
      title: "Anything else?",
      hint: "The floor is yours. Anything we didn't ask about.",
      body: (
        <textarea
          rows={6}
          className="field"
          value={a.anything_else ?? ""}
          onChange={(e) => set("anything_else", e.target.value)}
          placeholder="Optional — but we read every one of these."
        />
      ),
      ready: true,
    },
  ];
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col justify-center px-6 py-16">
      <div className="animate-fade-up">{children}</div>
    </main>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 text-sm text-cream-61">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}

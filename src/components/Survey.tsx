import { useEffect, useState, type ReactNode } from "react";
import { openSurvey, saveSurvey, type SurveyLink } from "../lib/api";
import { PMF_MAX, PMF_MIN, VIRTUES, type Answers } from "../lib/survey";
import { PointScale, VirtueScale } from "./Scales";
import { Logo, Shell, useMusic } from "./Shell";

type Phase = "loading" | "notfound" | "error" | "welcome" | "questions" | "done";

export default function Survey({ slug }: { slug: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [link, setLink] = useState<SurveyLink | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const music = useMusic();
  const [musicOn, setMusicOn] = useState(false);

  const toggleMusic = () => {
    music.toggle();
    // The fade means the element's state settles a tick later.
    setTimeout(() => setMusicOn(music.isOn()), 60);
  };

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

    if (complete) {
      // Re-open to collect the reveal, which the server withholds until now.
      try {
        const fresh = await openSurvey(slug);
        if (fresh) setLink(fresh);
      } catch {
        // Non-fatal: they still get the thank-you screen.
      }
      setSaving(false);
      setPhase("done");
    } else {
      setSaving(false);
      setStep(to);
      window.scrollTo({ top: 0 });
    }
  }

  if (phase === "loading") {
    return <Shell><p className="animate-breathe text-center text-cream-31">Loading…</p></Shell>;
  }

  if (phase === "notfound") {
    return (
      <Shell>
        <Logo />
        <h1 className="q-title mt-6">We can't find that link.</h1>
        <p className="mt-4 text-cream-61">
          It may have expired or been mistyped. Send your account manager a nudge and
          they'll fire over a fresh one.
        </p>
      </Shell>
    );
  }

  if (phase === "error" || !link) {
    return (
      <Shell>
        <Logo />
        <h1 className="q-title mt-6">Something went wrong.</h1>
        <p className="mt-4 text-cream-61">Give it a refresh. If it keeps happening, let us know.</p>
      </Shell>
    );
  }

  if (phase === "done") {
    const recommendations = (link.reveal_recommendations ?? []).filter((r) => r?.trim());
    return (
      <Shell musicOn={musicOn} onToggleMusic={toggleMusic}>
        <Logo />
        <p className="mt-6 font-display text-xs font-bold uppercase tracking-[0.2em] text-accent">
          All done
        </p>
        <h1 className="q-title mt-3">Thank you, {link.contact_name || link.client_name}.</h1>
        <p className="mt-4 text-cream-61">
          Genuinely, this is the stuff that changes how we work. Every answer gets read.
        </p>

        {link.reveal_feedback && (
          <div className="mt-8 rounded-2xl border border-cream-20 bg-background/30 p-6 text-left">
            <p className="label">Our honest read on working together</p>
            <p className="whitespace-pre-wrap leading-relaxed text-cream-78">
              {link.reveal_feedback}
            </p>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="mt-4 rounded-2xl border border-cream-20 bg-background/30 p-6 text-left">
            <p className="label">Three things we'd do next</p>
            <ol className="space-y-3">
              {recommendations.map((r, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-display font-bold text-accent">{i + 1}</span>
                  <span className="leading-relaxed text-cream-78">{r}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Shell>
    );
  }

  if (phase === "welcome") {
    const resuming = Object.keys(answers).length > 0;
    const steps = buildSteps(link, answers, set, setVirtue, setSellingPoint);
    return (
      <Shell musicOn={musicOn} onToggleMusic={toggleMusic}>
        <div className="animate-fade-up">
        <Logo />
        <h1 className="q-title mt-6">
          Hi {link.contact_name || link.client_name}, got five minutes?
        </h1>
        <p className="mt-5 text-lg text-cream-78">
          It's August. You're hopefully horizontal somewhere with a cold drink within reach.
          Perfect. This is the sort of thing that goes down much easier from a sunbed than
          from your desk.
        </p>
        {link.welcome_message && (
          <p className="mt-4 whitespace-pre-wrap text-lg text-cream-78">{link.welcome_message}</p>
        )}
        <div className="mt-8 space-y-4 rounded-2xl border border-cream-20 bg-background/30 p-6 text-left">
          <Bullet>
            <strong className="text-cream">{steps.length} questions</strong>, about five minutes.
            Most are a tap; a few have a box to type in.
          </Bullet>
          <Bullet>
            We're trying to get better as a{" "}
            <strong className="text-cream">business and as people</strong>. Blunt answers are
            worth more to us than kind ones.
          </Bullet>
          <Bullet>
            Some questions are about{" "}
            <strong className="text-cream">{link.account_manager}</strong> specifically.
          </Bullet>
          {link.has_reveal && (
            <Bullet>
              Get to the end and you'll unlock{" "}
              <strong className="text-cream">the three things we'd do next to take your social,
              and this collaboration, to the next level</strong>.
            </Bullet>
          )}
        </div>
        <div className="mt-8 flex justify-end">
          <button
            className="btn-primary w-full sm:w-auto"
            onClick={() => {
              music.start();
              setTimeout(() => setMusicOn(music.isOn()), 60);
              setStep(Math.min(answers._step ?? 0, steps.length - 1));
              setPhase("questions");
            }}
          >
            {resuming ? "Pick up where I left off" : "Let's go"}
          </button>
        </div>
        </div>
      </Shell>
    );
  }

  const steps = buildSteps(link, answers, set, setVirtue, setSellingPoint);
  const current = steps[step];
  const last = step === steps.length - 1;

  return (
    <Shell musicOn={musicOn} onToggleMusic={toggleMusic}>
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-4">
          <Logo className="h-7" />
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

      <div className="mt-10 flex items-center justify-end gap-3 pb-4">
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
          className={current.answered || last ? "btn-primary" : "btn-ghost"}
          onClick={() => advance(step + 1, last)}
          disabled={saving}
        >
          {saving ? "Saving…" : last ? "Finish" : current.answered ? "Next" : "Skip"}
        </button>
      </div>
    </Shell>
  );
}

type Step = { title: string; hint?: string; body: ReactNode; answered: boolean };

function buildSteps(
  link: SurveyLink,
  a: Answers,
  set: <K extends keyof Answers>(k: K, v: Answers[K]) => void,
  setVirtue: (key: string, position: number) => void,
  setSellingPoint: (index: number, value: string) => void,
): Step[] {
  const am = link.account_manager;
  const points = a.selling_points ?? ["", "", ""];
  const filled = (s?: string) => !!s?.trim();

  return [
    {
      title: "How would you feel if you could no longer work with Kaimakki?",
      body: (
        <div className="space-y-7">
          <PointScale
            min={PMF_MIN}
            max={PMF_MAX}
            value={a.pmf}
            onChange={(v) => set("pmf", v)}
            lowLabel="Not disappointed at all"
            highLabel="Very disappointed"
          />
          <div>
            <label className="label" htmlFor="pmf_why">
              Tell us why <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id="pmf_why"
              rows={3}
              className="field"
              value={a.pmf_why ?? ""}
              onChange={(e) => set("pmf_why", e.target.value)}
              placeholder="What would you miss out on?"
            />
          </div>
        </div>
      ),
      answered: typeof a.pmf === "number",
    },
    {
      title: "How likely are you to recommend Kaimakki to another business in your niche?",
      hint: "Assuming they're not a competitor of yours, of course ;)",
      body: (
        <PointScale
          min={0}
          max={10}
          value={a.nps}
          onChange={(v) => set("nps", v)}
          lowLabel="Not at all likely"
          highLabel="Extremely likely"
        />
      ),
      answered: typeof a.nps === "number",
    },
    {
      title: "Pitch us to a friend of yours who runs a business.",
      hint: "What are your top three selling points for Kaimakki? Not what we say about ourselves, but the three things you'd actually lead with over a coffee. These end up being the words we use when we talk to people like you.",
      body: (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="font-display text-sm font-bold text-cream-31">{i + 1}</span>
              <input
                className="field"
                aria-label={`Selling point ${i + 1}`}
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
      answered: points.some((p) => filled(p)),
    },
    {
      title: "And the one caveat you'd give them?",
      hint: "\"Kaimakki are great, but…\" This tells us who we're not the right fit for, which is just as useful as knowing who we are.",
      body: (
        <textarea
          rows={5}
          className="field"
          value={a.caveat ?? ""}
          onChange={(e) => set("caveat", e.target.value)}
          placeholder="Who should think twice before hiring us?"
        />
      ),
      answered: filled(a.caveat),
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
      answered: filled(a.main_benefit),
    },
    {
      title: "How can we improve Kaimakki for you?",
      hint: "If we don't know what is not working, we cannot get better. So please be specific and be blunt. The more the better.",
      body: (
        <textarea
          rows={5}
          className="field"
          value={a.improve ?? ""}
          onChange={(e) => set("improve", e.target.value)}
          placeholder="What's annoying, missing, or slower than it should be?"
        />
      ),
      answered: filled(a.improve),
    },
    {
      title: `Where does ${am} sit on each of these?`,
      hint: "Borrowed from Aristotle: every strength is a middle point between two extremes. The centre is the good answer. The ends are both ways of overdoing it.",
      body: (
        <div className="space-y-7">
          {VIRTUES.map((v) => (
            <div key={v.key}>
              <p className="mb-2 font-display text-sm font-bold text-cream">{v.name}</p>
              <VirtueScale
                low={v.low}
                mid={v.mid}
                high={v.high}
                value={a.virtues?.[v.key]}
                onChange={(pos) => setVirtue(v.key, pos)}
              />
            </div>
          ))}
        </div>
      ),
      answered: Object.keys(a.virtues ?? {}).length > 0,
    },
    {
      title: `What would make ${am} a 10x social media manager for you?`,
      hint: "Not in general. For you specifically.",
      body: (
        <textarea
          rows={5}
          className="field"
          value={a.am_advice ?? ""}
          onChange={(e) => set("am_advice", e.target.value)}
          placeholder="If they changed one thing about how they work with you…"
        />
      ),
      answered: filled(a.am_advice),
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
      answered: filled(a.am_shines),
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
          placeholder="Optional, but we read every one of these."
        />
      ),
      answered: filled(a.anything_else),
    },
  ];
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 text-sm text-cream-61">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}

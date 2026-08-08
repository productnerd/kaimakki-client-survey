import { useEffect, useState, type ReactNode } from "react";
import { openSurvey, saveSurvey, type SurveyLink } from "../lib/api";
import {
  PMF_MAX,
  PMF_MIN,
  VALUE_GROUPS,
  VALUE_MAX,
  VALUE_MIN,
  STYLE_DIALS,
  VIRTUES,
  WELCOME_INTRO,
  welcomeHeading,
  type Answers,
} from "../lib/survey";
import { PointScale, VirtueScale } from "./Scales";
import { Shell, useMusic } from "./Shell";
import Confetti from "./Confetti";
import Countdown from "./Countdown";
import RichText from "./RichText";
import InfoDot from "./InfoDot";
import { play, playKeystroke } from "../lib/sfx";

type Phase = "loading" | "notfound" | "error" | "welcome" | "questions" | "done";

export default function Survey({ slug, preview = false }: { slug: string; preview?: boolean }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [link, setLink] = useState<SurveyLink | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const music = useMusic();

  useEffect(() => {
    let live = true;
    openSurvey(slug, !preview)
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
  }, [slug, preview]);

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  // Nested values must merge off the latest state, not the render closure:
  // two taps batched into one render would otherwise drop the first.
  function setVirtue(key: string, position: number) {
    setAnswers((prev) => ({ ...prev, virtues: { ...(prev.virtues ?? {}), [key]: position } }));
  }

  function setValueScore(key: string, score: number) {
    setAnswers((prev) => ({ ...prev, values: { ...(prev.values ?? {}), [key]: score } }));
  }

  function setStyle(key: string, position: number) {
    setAnswers((prev) => ({ ...prev, style: { ...(prev.style ?? {}), [key]: position } }));
  }

  function setValueNote(key: string, text: string) {
    setAnswers((prev) => ({ ...prev, value_notes: { ...(prev.value_notes ?? {}), [key]: text } }));
  }

  function setSellingPoint(index: number, value: string) {
    setAnswers((prev) => {
      const next = [...(prev.selling_points ?? ["", "", ""])];
      next[index] = value;
      return { ...prev, selling_points: next };
    });
  }

  // A typewriter clack per key, on any of the survey's text fields. One
  // document listener rather than a handler on each of the many inputs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return;
      // Only keys that actually put a character down, plus the two that undo one.
      const typed = e.key.length === 1 || e.key === "Backspace" || e.key === "Enter";
      if (!typed || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      playKeystroke();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function advance(to: number, complete = false) {
    setSaving(true);
    const payload = { ...answers, _step: to };
    setAnswers(payload);

    // Test mode writes nothing at all.
    if (!preview) {
      try {
        await saveSurvey(slug, payload, complete);
      } catch {
        // A failed autosave shouldn't trap them mid-survey; the next step
        // retries with the full answer set anyway.
      }
    }

    if (complete) {
      // Re-open to collect the reveal, which the server withholds until now.
      // A test run already has it.
      if (!preview) {
        try {
          const fresh = await openSurvey(slug);
          if (fresh) setLink(fresh);
        } catch {
          // Non-fatal: they still get the thank-you screen.
        }
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
    return <Shell testMode={preview}><p className="animate-breathe text-center text-cream-31">Loading…</p></Shell>;
  }

  if (phase === "notfound") {
    return (
      <Shell>
        <h1 className="q-title">We can't find that link.</h1>
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
        <h1 className="q-title">Something went wrong.</h1>
        <p className="mt-4 text-cream-61">Give it a refresh. If it keeps happening, let us know.</p>
      </Shell>
    );
  }

  if (phase === "done") {
    const filled = (points: { title: string; body: string }[] | null) =>
      (points ?? []).filter((p) => p.title?.trim() || p.body?.trim());
    const appreciate = filled(link.reveal_appreciate);
    const recommendations = filled(link.reveal_recommendations);
    return (
      <Shell musicOn={music.on} onToggleMusic={music.toggle} testMode={preview}>
        <Confetti />
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-accent">
          All done
        </p>
        <h1 className="q-title mt-2">
          Thank you, {link.contact_name || link.client_name}, you are a rockstar 🙌
        </h1>
        <p className="mt-4 text-cream-61">
          Genuinely, this is the stuff that changes how we work.
        </p>

        <RevealSection label="💚 What we love about working with you" points={appreciate} />
        <RevealSection label="🚀 Three things we'd do next" points={recommendations} />
        <Countdown />
      </Shell>
    );
  }

  if (phase === "welcome") {
    const resuming = Object.keys(answers).length > 0;
    const steps = buildSteps(link, answers, set, setVirtue, setStyle, setValueScore, setValueNote, setSellingPoint);
    return (
      <Shell musicOn={music.on} onToggleMusic={music.toggle} testMode={preview}>
        <div className="animate-fade-up">
        <h1 className="q-title">
          {welcomeHeading(link.contact_name || link.client_name)}
        </h1>
        {WELCOME_INTRO.map((line, i) => (
          <p key={i} className={`${i === 0 ? "mt-4" : "mt-3"} text-cream-78`}>
            {line}
          </p>
        ))}
        {link.welcome_message && (
          <div className="mt-3">
            <RichText value={link.welcome_message} className="text-cream-78" />
          </div>
        )}
        <div className="mt-6 space-y-3 rounded-2xl border border-cream-20 bg-background/30 p-5 text-left">
          <Bullet>
            <strong className="text-cream">{steps.length} questions</strong>, about five
            minutes.
          </Bullet>
          <Bullet>
            We're trying to get better as a{" "}
            <strong className="text-cream">business and as people</strong>. Blunt answers are
            worth more to us than kind ones.
          </Bullet>
          <Bullet>
            Some questions are about your account manager,{" "}
            <strong className="text-cream">{link.account_manager}</strong>, specifically. They
            would really like to improve themselves, so they would appreciate as honest
            feedback as possible. We won't take anything the wrong way, no worries 😉
          </Bullet>
          {link.has_reveal && (
            <Bullet>
              Get to the end and you'll unlock{" "}
              <strong className="text-cream">the three things we'd do next to take your social,
              and this collaboration, to the next level</strong>.
            </Bullet>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            className="btn-primary w-full sm:w-auto"
            onClick={() => {
              play("next");
              setStep(Math.min(answers._step ?? 0, steps.length - 1));
              setPhase("questions");
            }}
          >
            {resuming ? "Resume" : "Let's go"}
          </button>
        </div>
        </div>
      </Shell>
    );
  }

  const steps = buildSteps(link, answers, set, setVirtue, setStyle, setValueScore, setValueNote, setSellingPoint);
  const current = steps[step];
  const last = step === steps.length - 1;

  function goBack() {
    play("back");
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0 });
  }

  function goNext() {
    // Skipping is not really progress, so it gets the lower back tone.
    play(current.answered || last ? "next" : "back");
    advance(step + 1, last);
  }

  /**
   * Swipe between steps on touch devices. Ignores gestures that start on a
   * control, so scrubbing a scale or selecting text in a box still works, and
   * requires the movement to be clearly horizontal so it never fights a scroll.
   */
  function swipe() {
    let x = 0;
    let y = 0;
    let armed = false;
    return {
      onTouchStart: (e: React.TouchEvent) => {
        const el = e.target as HTMLElement;
        armed = !el.closest("input, textarea, button, select, a");
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
      },
      onTouchEnd: (e: React.TouchEvent) => {
        if (!armed || saving) return;
        const dx = e.changedTouches[0].clientX - x;
        const dy = e.changedTouches[0].clientY - y;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) return;
        if (dx < 0 && !last) goNext();
        if (dx > 0 && step > 0) goBack();
      },
    };
  }

  return (
    <Shell musicOn={music.on} onToggleMusic={music.toggle} testMode={preview}>
      <div {...swipe()}>
      <div className="mb-8">
        <p className="mb-2 text-center text-xs text-cream-31">
          {step + 1} of {steps.length}
        </p>
        <div className="h-1 w-full overflow-hidden rounded-full bg-cream-10">
          {/* Empty on the first question: progress is what you have finished. */}
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${(step / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div key={step} className="flex-1 animate-fade-up">
        <h2 className="q-title">{current.title}</h2>
        {current.hint && <p className="mt-3 text-cream-61">{current.hint}</p>}
        <div className="mt-6">{current.body}</div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          className="btn-ghost"
          onClick={goBack}
          disabled={step === 0 || saving}
        >
          Back
        </button>
        <button
          className={current.answered || last ? "btn-primary" : "btn-ghost"}
          onClick={goNext}
          disabled={saving}
        >
          {saving ? "Saving…" : last ? "Finish" : current.answered ? "Next" : "Skip"}
        </button>
      </div>
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
  setStyle: (key: string, position: number) => void,
  setValueScore: (key: string, score: number) => void,
  setValueNote: (key: string, text: string) => void,
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
            onChange={(v) => { play("select"); set("pmf", v); }}
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
      title: "How likely are you to recommend Kaimakki to another business like yours?",
      hint: "Assuming they're not a competitor of yours, of course 😉",
      body: (
        <PointScale
          min={0}
          max={10}
          value={a.nps}
          onChange={(v) => { play("select"); set("nps", v); }}
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
      title: "And the one catch you'd warn them about?",
      hint: "\"Kaimakki are great, but…\" 🤔 This tells us who we're not the right fit for, which is just as useful as knowing who we are.",
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
      hint: "If we don't know what is not working, we cannot get better 🛠️ So please be specific and be blunt. The more the better.",
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
      title: "Where would you like the videos to go next?",
      body: (
        <div className="space-y-7">
          <div className="flex justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] text-cream-78">
              👀 = usually gets more views
            </span>
          </div>
          {STYLE_DIALS.map((d) => (
            <div key={d.key}>
              <p className="mb-2 flex items-center gap-1.5 font-display text-sm font-bold text-cream">
                {d.name}
                {d.example && <InfoDot note={d.example} label={d.name} />}
              </p>
              <VirtueScale
                low={d.views === "low" ? <>{d.low} <ViewsBadge /></> : d.low}
                mid={d.mid}
                high={d.views === "high" ? <>{d.high} <ViewsBadge /></> : d.high}
                value={a.style?.[d.key]}
                onChange={(pos) => { play("select"); setStyle(d.key, pos); }}
              />
            </div>
          ))}
          <div>
            <label className="label" htmlFor="style_note">
              Anything else about the style you want?{" "}
              <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id="style_note"
              rows={3}
              className="field"
              value={a.style_note ?? ""}
              onChange={(e) => set("style_note", e.target.value)}
              placeholder="A video you loved, one you did not, anything you want more or less of."
            />
          </div>
        </div>
      ),
      answered: Object.keys(a.style ?? {}).length > 0 || filled(a.style_note),
    },
    {
      title: "How well did we live up to what we say we stand for?",
      hint: "These are the values we hold ourselves to.",
      body: (
        <div className="space-y-8">
          {VALUE_GROUPS.map((group) => (
            <div key={group.value}>
              <p className="label text-accent">{group.value}</p>
              <div className="space-y-6">
                {group.items.map((item) => (
                  <div key={item.key}>
                    <p className="font-display text-sm font-bold text-cream">{item.name}</p>
                    <p className="mb-3 text-sm text-cream-61">"{item.statement}"</p>
                    <PointScale
                      min={VALUE_MIN}
                      max={VALUE_MAX}
                      value={a.values?.[item.key]}
                      onChange={(v) => {
                        play("select");
                        setValueScore(item.key, v);
                      }}
                      lowLabel="Not at all"
                      highLabel="Completely"
                    />
                  </div>
                ))}
                <textarea
                  rows={2}
                  className="field text-sm"
                  aria-label={`Comments on ${group.value}`}
                  value={a.value_notes?.[group.key] ?? ""}
                  onChange={(e) => setValueNote(group.key, e.target.value)}
                  placeholder="Anything to add here? (optional)"
                />
              </div>
            </div>
          ))}
        </div>
      ),
      answered: Object.keys(a.values ?? {}).length > 0,
    },
    {
      title: `Where does ${am} sit on each of these?`,
      hint: "Borrowed from Aristotle 🏛️ every strength is a middle point between two extremes. The centre is the good answer. The ends are both ways of overdoing it.",
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
                onChange={(pos) => { play("select"); setVirtue(v.key, pos); }}
              />
            </div>
          ))}
          <div>
            <label className="label" htmlFor="virtues_note">
              Anything to add about {am}?{" "}
              <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id="virtues_note"
              rows={3}
              className="field"
              value={a.virtues_note ?? ""}
              onChange={(e) => set("virtues_note", e.target.value)}
              placeholder="In your own words."
            />
          </div>
        </div>
      ),
      answered: Object.keys(a.virtues ?? {}).length > 0 || filled(a.virtues_note),
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
      hint: "Where do they shine? ✨",
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
      hint: "The floor is yours 🎤 Anything we didn't ask about.",
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

function RevealSection({
  label,
  points,
}: {
  label: string;
  points: { title: string; body: string }[];
}) {
  if (!points.length) return null;
  return (
    <div className="mt-6 rounded-2xl border border-cream-20 bg-background/30 p-5 text-left">
      <p className="label">{label}</p>
      <ol className="space-y-4">
        {points.map((p, i) => (
          <li key={i} className="flex gap-3">
            <span className="font-display font-black text-accent">{i + 1}</span>
            <div>
              {p.title?.trim() && (
                <p className="font-display font-bold text-cream">{p.title}</p>
              )}
              {p.body?.trim() && (
                <div className="mt-0.5">
                  <RichText value={p.body} className="leading-relaxed text-cream-78" />
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Marks the end of a dial that tends to earn more views. */
function ViewsBadge() {
  return (
    <span className="ml-0.5 inline-flex items-center rounded-full border border-accent/40 bg-accent/20 px-1.5 py-0.5 align-middle leading-none">
      👀
    </span>
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

import { useEffect, useRef, type ReactNode } from "react";

const asset = (file: string) => `${import.meta.env.BASE_URL}${file}`;

export function Logo({ className = "h-9" }: { className?: string }) {
  return <img src={asset("kaimakki-logo.png")} alt="Kaimakki Studio" className={`${className} w-auto`} />;
}

/**
 * The survey chrome: the kaimakki.com loop behind everything, a scrim heavy
 * enough to keep text readable across the loop's brightest frames, and the
 * content floating on frosted glass.
 */
export function Shell({
  children,
  musicOn,
  onToggleMusic,
}: {
  children: ReactNode;
  musicOn?: boolean;
  onToggleMusic?: () => void;
}) {
  return (
    <div className="relative min-h-full">
      <video
        className="pointer-events-none fixed inset-0 h-full w-full object-cover"
        src={asset("welcome-bg.mp4")}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-background/85 via-background/70 to-background/90"
        aria-hidden="true"
      />

      {onToggleMusic && <MusicButton on={!!musicOn} onClick={onToggleMusic} />}

      <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="glass my-auto w-full max-w-2xl p-6 sm:p-10">{children}</div>
      </div>
    </div>
  );
}

function MusicButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={on ? "Mute the music" : "Play the music"}
      aria-pressed={on}
      className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-cream-20 bg-background/50 text-cream-78 backdrop-blur-md transition hover:border-cream-31 hover:text-cream sm:right-6 sm:top-6"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H3v6h3l5 4V5z" />
        {on ? (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        ) : (
          <path d="m17 9 4 6m0-6-4 6" />
        )}
      </svg>
    </button>
  );
}

/**
 * Background music. Browsers refuse audio until the user has interacted, so it
 * is started by the click on the welcome screen rather than on page load, and
 * the choice is remembered so it does not restart on every step.
 */
export function useMusic() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const wanted = useRef(localStorage.getItem("kaimakki_survey_music") !== "off");

  useEffect(() => {
    const el = new Audio(asset("survey-music.mp3"));
    el.loop = true;
    el.volume = 0;
    audio.current = el;
    return () => {
      el.pause();
      audio.current = null;
    };
  }, []);

  const fadeTo = (target: number) => {
    const el = audio.current;
    if (!el) return;
    const step = () => {
      if (!audio.current) return;
      const diff = target - el.volume;
      if (Math.abs(diff) < 0.02) {
        el.volume = target;
        if (target === 0) el.pause();
        return;
      }
      el.volume = Math.max(0, Math.min(1, el.volume + Math.sign(diff) * 0.02));
      requestAnimationFrame(step);
    };
    step();
  };

  /** Called from a real click, which is what unlocks playback. */
  const start = () => {
    if (!wanted.current || !audio.current) return;
    audio.current.play().then(() => fadeTo(0.28)).catch(() => {});
  };

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      wanted.current = true;
      localStorage.setItem("kaimakki_survey_music", "on");
      el.play().then(() => fadeTo(0.28)).catch(() => {});
    } else {
      wanted.current = false;
      localStorage.setItem("kaimakki_survey_music", "off");
      fadeTo(0);
    }
  };

  const isOn = () => !!audio.current && !audio.current.paused;

  return { start, toggle, isOn };
}

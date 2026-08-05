import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const asset = (file: string) => `${import.meta.env.BASE_URL}${file}`;

/**
 * The survey chrome: the kaimakki.com loop plays at full colour with no scrim
 * over it. Contrast comes from the frosted panel the content sits in, so the
 * video stays vibrant everywhere around it.
 */
/** The looping backdrop, shared by the survey and the admin screens. */
export function VideoBackdrop() {
  const video = useRef<HTMLVideoElement>(null);

  // Some browsers park a muted autoplay video when the tab starts hidden or
  // the device is in low-power mode. Nudge it whenever the page becomes visible.
  useEffect(() => {
    const nudge = () => {
      const el = video.current;
      if (el?.paused) void el.play().catch(() => {});
    };
    nudge();
    document.addEventListener("visibilitychange", nudge);
    return () => document.removeEventListener("visibilitychange", nudge);
  }, []);

  return (
    <video
      ref={video}
      className="pointer-events-none fixed inset-0 h-full w-full object-cover"
      src={asset("welcome-bg.mp4")}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
}

export function Logo({ className = "h-9 sm:h-11" }: { className?: string }) {
  return (
    <img
      src={asset("kaimakki-logo.png")}
      alt="Kaimakki Studio"
      className={`${className} w-auto [filter:drop-shadow(0_2px_3px_rgba(0,0,0,0.55))_drop-shadow(0_6px_18px_rgba(0,0,0,0.65))]`}
    />
  );
}

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
      <VideoBackdrop />

      {onToggleMusic && <MusicButton on={!!musicOn} onClick={onToggleMusic} />}

      {/* The logo sits out of flow so the panel centres on the viewport rather
          than on the pair of them. Padding reserves its space. */}
      {/* Viewport units, not min-h-full: a percentage min-height resolves
          against this box's auto-height parent and collapses to the content,
          which left the panel sitting high. dvh keeps it right on mobile,
          where the browser chrome comes and goes. */}
      <div className="relative flex min-h-screen min-h-dvh items-center justify-center px-4 py-24 sm:px-6 sm:py-28">
        <div className="absolute left-1/2 top-6 -translate-x-1/2 sm:top-7">
          <Logo />
        </div>
        <div className="glass w-full max-w-xl p-5 sm:p-8">{children}</div>
      </div>
    </div>
  );
}

function MusicButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={on ? "Mute the music" : "Unmute the music"}
      aria-pressed={on}
      className={`fixed right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition sm:right-6 sm:top-6 ${
        on
          ? "border-cream-20 bg-background/50 text-cream"
          : "border-cream-20 bg-background/50 text-cream-31"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 5 6 9H3v6h3l5 4V5z" />
        {on ? (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        ) : (
          /* Muted: the waves replaced by a slash straight through the speaker. */
          <>
            <path d="M16 9.5 21 15" />
            <path d="M21 9.5 16 15" />
          </>
        )}
      </svg>
    </button>
  );
}

const FADE_IN_MS = 5000;
const VOLUME = 0.21;
const STORAGE_KEY = "kaimakki_survey_music";

/**
 * Background music that fades up over five seconds.
 *
 * Autoplay with sound is blocked until a page has been interacted with, so the
 * load-time attempt is expected to fail on a first visit. When it does, the
 * first click or key press starts it instead.
 *
 * `on` tracks intent rather than the element's paused flag: the fade means the
 * element is still playing for a moment after you mute, and the button has to
 * respond instantly. It governs the music only; the interaction sounds are
 * always on.
 */
export function useMusic() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const fade = useRef(0);
  const [on, setOn] = useState(() => localStorage.getItem(STORAGE_KEY) !== "off");

  const rampTo = useCallback((target: number, ms: number) => {
    const el = audio.current;
    if (!el) return;
    cancelAnimationFrame(fade.current);
    const from = el.volume;
    const started = performance.now();
    const step = (now: number) => {
      if (!audio.current) return;
      const t = ms === 0 ? 1 : Math.min(1, (now - started) / ms);
      el.volume = Math.max(0, Math.min(1, from + (target - from) * t));
      if (t < 1) {
        fade.current = requestAnimationFrame(step);
      } else if (target === 0) {
        el.pause();
      }
    };
    fade.current = requestAnimationFrame(step);
  }, []);

  const startPlayback = useCallback(
    (ms: number) => {
      const el = audio.current;
      if (!el) return Promise.reject();
      el.volume = 0;
      return el.play().then(() => rampTo(VOLUME, ms));
    },
    [rampTo],
  );

  useEffect(() => {
    const el = new Audio(asset("survey-music.mp3"));
    el.loop = true;
    el.volume = 0;
    el.preload = "auto";
    audio.current = el;

    let cleanup = () => {};
    if (localStorage.getItem(STORAGE_KEY) !== "off") {
      startPlayback(FADE_IN_MS).catch(() => {
        // Autoplay refused: wait for any interaction, then start.
        const kick = () => {
          startPlayback(FADE_IN_MS).catch(() => {});
          cleanup();
        };
        const opts = { once: true } as const;
        document.addEventListener("pointerdown", kick, opts);
        document.addEventListener("keydown", kick, opts);
        cleanup = () => {
          document.removeEventListener("pointerdown", kick);
          document.removeEventListener("keydown", kick);
        };
      });
    }

    return () => {
      cleanup();
      cancelAnimationFrame(fade.current);
      el.pause();
      audio.current = null;
    };
  }, [startPlayback]);

  const toggle = useCallback(() => {
    setOn((was) => {
      const next = !was;
      localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
      if (next) startPlayback(600).catch(() => {});
      else rampTo(0, 400);
      return next;
    });
  }, [rampTo, startPlayback]);

  return { on, toggle };
}

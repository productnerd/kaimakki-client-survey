/**
 * Tiny interaction sounds, synthesised rather than shipped as files: three
 * short tones cost nothing to download and stay perfectly in the brand's
 * quiet register.
 *
 * Independent of the music toggle: muting the music leaves these audible.
 */
type Sound = "select" | "next" | "back";

const SHAPES: Record<Sound, { from: number; to: number; ms: number; gain: number }> = {
  // A soft blip when picking an option.
  select: { from: 760, to: 980, ms: 90, gain: 0.05 },
  // Rising for forward, falling for back.
  next: { from: 540, to: 810, ms: 130, gain: 0.045 },
  back: { from: 700, to: 460, ms: 130, gain: 0.04 },
};

let ctx: AudioContext | null = null;

export function play(sound: Sound) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();

    const { from, to, ms, gain } = SHAPES[sound];
    const now = ctx.currentTime;
    const dur = ms / 1000;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(to, now + dur);

    // Quick attack, smooth tail: a raw start/stop would click.
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(env).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  } catch {
    // Audio is decoration; never let it break a step.
  }
}

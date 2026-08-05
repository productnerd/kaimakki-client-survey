/**
 * Tiny interaction sounds, synthesised rather than shipped as files: a few
 * short tones cost nothing to download and stay in the brand's quiet register.
 *
 * Independent of the music toggle: muting the music leaves these audible.
 */
type Sound = "select" | "next" | "back";

const SHAPES: Record<Sound, { from: number; to: number; ms: number; gain: number }> = {
  // A soft blip when picking an option.
  select: { from: 760, to: 980, ms: 90, gain: 0.05 },
  // Pitch carries the direction: forward rises in the upper register, back
  // falls in the lower one. Skip reuses back.
  next: { from: 700, to: 1050, ms: 130, gain: 0.045 },
  back: { from: 520, to: 360, ms: 130, gain: 0.04 },
};

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function play(sound: Sound) {
  try {
    const c = audio();
    const { from, to, ms, gain } = SHAPES[sound];
    const now = c.currentTime;
    const dur = ms / 1000;

    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(to, now + dur);

    // Quick attack, smooth tail: a raw start/stop would click.
    const env = c.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(env).connect(c.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  } catch {
    // Audio is decoration; never let it break a step.
  }
}

/**
 * A typewriter keystroke: a band-passed noise burst for the clack, over a very
 * short low thump for the body of the key. The filter frequency wanders a
 * little so a sentence doesn't sound like one sample on repeat.
 */
export function playKeystroke() {
  try {
    const c = audio();
    const now = c.currentTime;

    noise ??= (() => {
      const buf = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      return buf;
    })();

    const clackDur = 0.03 + Math.random() * 0.015;
    const src = c.createBufferSource();
    src.buffer = noise;

    const band = c.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1500 + Math.random() * 1100;
    band.Q.value = 1.1;

    const clack = c.createGain();
    clack.gain.setValueAtTime(0.05, now);
    clack.gain.exponentialRampToValueAtTime(0.0001, now + clackDur);

    src.connect(band).connect(clack).connect(c.destination);
    src.start(now);
    src.stop(now + clackDur);

    const thumpDur = 0.045;
    const thump = c.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(150 + Math.random() * 40, now);
    thump.frequency.exponentialRampToValueAtTime(70, now + thumpDur);

    const thumpEnv = c.createGain();
    thumpEnv.gain.setValueAtTime(0.035, now);
    thumpEnv.gain.exponentialRampToValueAtTime(0.0001, now + thumpDur);

    thump.connect(thumpEnv).connect(c.destination);
    thump.start(now);
    thump.stop(now + thumpDur + 0.01);
  } catch {
    // Same: decoration only.
  }
}

/* Pequeno sintetizador WebAudio — blips arcade sem ficheiros externos. */

const MUTE_KEY = "snake.mute.v1";

let ctx: AudioContext | null = null;
let mutedFlag = false;

try {
  mutedFlag = typeof window !== "undefined" && window.localStorage.getItem(MUTE_KEY) === "1";
} catch {
  mutedFlag = false;
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  dur = 0.08,
  type: OscillatorType = "square",
  vol = 0.04,
  slideTo = 0,
  delay = 0,
) {
  if (mutedFlag) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

export const sfx = {
  eat() {
    tone(540, 0.06, "square", 0.045, 780);
    tone(1080, 0.05, "square", 0.028, 1300, 0.035);
  },
  bonus() {
    [660, 880, 1175, 1568].forEach((f, i) => tone(f, 0.09, "square", 0.04, 0, i * 0.06));
  },
  die() {
    tone(300, 0.4, "sawtooth", 0.05, 55);
    tone(170, 0.45, "square", 0.03, 40, 0.06);
  },
  start() {
    [392, 523, 659, 784].forEach((f, i) => tone(f, 0.08, "square", 0.04, 0, i * 0.055));
  },
  pause() {
    tone(440, 0.07, "triangle", 0.045, 320);
  },
  resume() {
    tone(330, 0.07, "triangle", 0.045, 540);
  },
  click() {
    tone(310, 0.04, "triangle", 0.03);
  },
  over() {
    [392, 311, 262, 196].forEach((f, i) => tone(f, 0.15, "square", 0.04, 0, i * 0.12));
  },
  record() {
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.1, "square", 0.045, 0, i * 0.075));
  },
};

export function isMuted(): boolean {
  return mutedFlag;
}

export function setMuted(m: boolean) {
  mutedFlag = m;
  try {
    window.localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    /* ignora */
  }
}

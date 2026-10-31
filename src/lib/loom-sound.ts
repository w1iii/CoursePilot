/**
 * Procedural "loom" sound design — pure Web Audio API, no library.
 * Every sound is synthesized at click time so the landing page ships no audio assets.
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

export function initAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  if (enabled) initAudioContext();
}

/** Tactile knot tie: wooden click + thread friction + peg body resonance. */
export function playLoomKnotSound() {
  if (!soundEnabled) return;
  const ctx = initAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
  oscGain.gain.setValueAtTime(0.35, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.09);

  const bufferSize = Math.floor(ctx.sampleRate * 0.05);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

  const whiteNoise = ctx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(2400, now);
  noiseFilter.Q.setValueAtTime(3.2, now);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.18, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  whiteNoise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  whiteNoise.start(now);
  whiteNoise.stop(now + 0.06);

  const bodyOsc = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  bodyOsc.type = "sine";
  bodyOsc.frequency.setValueAtTime(140, now);
  bodyOsc.frequency.exponentialRampToValueAtTime(70, now + 0.12);
  bodyGain.gain.setValueAtTime(0.25, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  bodyOsc.connect(bodyGain);
  bodyGain.connect(ctx.destination);
  bodyOsc.start(now);
  bodyOsc.stop(now + 0.13);
}

/** Wooden reed shuttle gliding through the warp threads. */
export function playLoomShuttleGlide(volume = 0.2) {
  if (!soundEnabled) return;
  const ctx = initAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const duration = 0.45;

  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(750, now);
  filter.frequency.linearRampToValueAtTime(1250, now + duration * 0.4);
  filter.frequency.linearRampToValueAtTime(600, now + duration);
  filter.Q.setValueAtTime(2.0, now);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.001, now);
  noiseGain.gain.linearRampToValueAtTime(volume * 0.7, now + 0.12);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + duration + 0.01);

  const undertone = ctx.createOscillator();
  const undertoneGain = ctx.createGain();
  undertone.type = "sine";
  undertone.frequency.setValueAtTime(180, now);
  undertone.frequency.linearRampToValueAtTime(220, now + 0.2);
  undertone.frequency.linearRampToValueAtTime(150, now + duration);
  undertoneGain.gain.setValueAtTime(0.001, now);
  undertoneGain.gain.linearRampToValueAtTime(volume * 0.45, now + 0.15);
  undertoneGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  undertone.connect(undertoneGain);
  undertoneGain.connect(ctx.destination);
  undertone.start(now);
  undertone.stop(now + duration + 0.02);
}

/** Delicate pentatonic loom chimes layered over a reed stroke. */
export function playWeaveHarmonizeChime() {
  if (!soundEnabled) return;
  const ctx = initAudioContext();
  if (!ctx) return;
  const frequencies = [329.63, 415.3, 493.88, 659.25];
  const now = ctx.currentTime;

  frequencies.forEach((freq, idx) => {
    const startTime = now + idx * 0.09;
    const duration = 1.1;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.16, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  });

  playLoomShuttleGlide(0.18);
}

/** Small visual acoustic ripple on the element that was activated. */
export function createAcousticRipple(
  event: { currentTarget: HTMLElement; clientX: number; clientY: number } | null,
) {
  if (!soundEnabled || !event) return;
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return;
  const rect = target.getBoundingClientRect();
  const ripple = document.createElement("span");
  ripple.className = "absolute pointer-events-none rounded-full bg-surface-tint/20 animate-ping z-30";
  ripple.style.width = "24px";
  ripple.style.height = "24px";
  ripple.style.left = `${event.clientX - rect.left - 12}px`;
  ripple.style.top = `${event.clientY - rect.top - 12}px`;
  if (getComputedStyle(target).position === "static") target.style.position = "relative";
  target.appendChild(ripple);
  window.setTimeout(() => ripple.remove(), 600);
}

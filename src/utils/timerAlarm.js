/**
 * Play a short beep-bomp for the last 5 seconds of the auction timer.
 * Uses Web Audio API so no external sound file is needed.
 */
let audioContext = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

export function playTimerAlarm() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Beep: short high tone
  const beep = ctx.createOscillator();
  const beepGain = ctx.createGain();
  beep.connect(beepGain);
  beepGain.connect(ctx.destination);
  beep.frequency.setValueAtTime(660, now);
  beep.type = 'sine';
  beepGain.gain.setValueAtTime(0.12, now);
  beepGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
  beep.start(now);
  beep.stop(now + 0.08);

  // Bomp: low thud right after
  const bomp = ctx.createOscillator();
  const bompGain = ctx.createGain();
  bomp.connect(bompGain);
  bompGain.connect(ctx.destination);
  bomp.frequency.setValueAtTime(180, now + 0.1);
  bomp.frequency.exponentialRampToValueAtTime(80, now + 0.25);
  bomp.type = 'sine';
  bompGain.gain.setValueAtTime(0, now + 0.08);
  bompGain.gain.linearRampToValueAtTime(0.2, now + 0.12);
  bompGain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
  bomp.start(now + 0.1);
  bomp.stop(now + 0.28);
}

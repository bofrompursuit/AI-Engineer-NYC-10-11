type ArcadeSound = "select" | "ready" | "start" | "error";
type Note = [frequency: number, delay: number, duration: number];

const notes: Record<ArcadeSound, Note[]> = {
  select: [[520, 0, 0.06]],
  ready: [[520, 0, 0.08], [780, 0.09, 0.12]],
  start: [[440, 0, 0.08], [660, 0.09, 0.08], [880, 0.18, 0.18]],
  error: [[260, 0, 0.12]],
};

let arcadeContext: AudioContext | undefined;

// Called only from a button or form gesture. Sound is optional if audio is blocked.
export function playArcadeSound(sound: ArcadeSound) {
  try {
    arcadeContext ??= new AudioContext();
    const engine = arcadeContext;
    if (engine.state === "suspended") void engine.resume().catch(() => {});

    for (const [frequency, delay, duration] of notes[sound]) {
      const oscillator = engine.createOscillator();
      const volume = engine.createGain();
      const start = engine.currentTime + delay;
      oscillator.type = sound === "error" ? "triangle" : "square";
      oscillator.frequency.setValueAtTime(frequency, start);
      volume.gain.setValueAtTime(0.0001, start);
      volume.gain.exponentialRampToValueAtTime(0.035, start + 0.008);
      volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(volume);
      volume.connect(engine.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.01);
      oscillator.onended = () => { oscillator.disconnect(); volume.disconnect(); };
    }
  } catch {
    // Visual controls still work when Web Audio is unavailable.
  }
}

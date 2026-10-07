// Web Audio API for subtle, premium sound effects without loading external files

const getAudioContext = () => {
  if (!window.audioCtx) {
    window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // AudioContext might be suspended if created before user interaction
  if (window.audioCtx.state === 'suspended') {
    window.audioCtx.resume();
  }
  return window.audioCtx;
};

// Subtle "Pop" sound for incoming messages (like macOS/iOS bubbles)
export const playPopSound = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    
    // Quick pitch drop for that "pop/bloop" feel
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);

    // Quick volume fade out
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.error('Audio playback failed:', e);
  }
};

// Soothing "Ding" sound for connection success / file transfer complete
export const playSuccessSound = () => {
  try {
    const ctx = getAudioContext();
    
    const playNote = (freq, startTime, duration, volume = 0.2) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Smooth attack and long decay envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Play a pleasant major third interval (C5 then E5 quickly after)
    playNote(523.25, now, 0.6, 0.15); // C5
    playNote(659.25, now + 0.1, 0.8, 0.2); // E5
  } catch (e) {
    console.error('Audio playback failed:', e);
  }
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playMoveSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.warn('[Audio] Move sound failed:', e);
  }
}

export function playCaptureSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // First click
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(280, now);
    osc1.frequency.exponentialRampToValueAtTime(140, now + 0.05);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.05);

    // Second click slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(200, now + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gain2.gain.setValueAtTime(0.2, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.1);
  } catch (e) {
    console.warn('[Audio] Capture sound failed:', e);
  }
}

export function playCheckSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(400, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(480, now + 0.08);
    gain2.gain.setValueAtTime(0.18, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.25);
  } catch (e) {
    console.warn('[Audio] Check sound failed:', e);
  }
}

export function playStartSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25];
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  } catch (e) {
    console.warn('[Audio] Start sound failed:', e);
  }
}

export function playGameOverSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [392.00, 329.63, 293.66, 261.63];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.12, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.1 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.45);
    });
  } catch (e) {
    console.warn('[Audio] Game Over sound failed:', e);
  }
}

export function playBrilliantSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const startTime = now + idx * 0.05;

      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.005, startTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });

    const oscChime = ctx.createOscillator();
    const gainChime = ctx.createGain();
    oscChime.type = 'sine';
    oscChime.frequency.setValueAtTime(2093.00, now + 0.2);

    gainChime.gain.setValueAtTime(0.08, now + 0.2);
    gainChime.gain.exponentialRampToValueAtTime(0.001, now + 0.2 + 0.6);

    oscChime.connect(gainChime);
    gainChime.connect(ctx.destination);

    oscChime.start(now + 0.2);
    oscChime.stop(now + 0.2 + 0.6);
  } catch (e) {
    console.warn('[Audio] Brilliant sound failed:', e);
  }
}

export function playBlunderSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const pitches = [233.08, 220.00, 207.65, 196.00];

    pitches.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';

      const startTime = now + idx * 0.25;
      const duration = idx === 3 ? 0.6 : 0.22;

      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.linearRampToValueAtTime(freq - 15, startTime + duration);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, startTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (e) {
    console.warn('[Audio] Blunder sound failed:', e);
  }
}

export function playPromotionSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [330, 440, 554, 660, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      
      const startTime = now + idx * 0.06;
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.06, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  } catch (e) {
    console.warn('[Audio] Promotion sound failed:', e);
  }
}

export function playCastleSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.3);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    console.warn('[Audio] Castle sound failed:', e);
  }
}

export function playDrawSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(330, now + 0.08);
    osc.frequency.linearRampToValueAtTime(180, now + 0.16);
    osc.frequency.linearRampToValueAtTime(260, now + 0.24);
    osc.frequency.linearRampToValueAtTime(120, now + 0.35);
    
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {
    console.warn('[Audio] Draw sound failed:', e);
  }
}

export function playMemeLaughSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const pulses = [300, 340, 380, 340, 300];
    pulses.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      
      const startTime = now + idx * 0.12;
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.linearRampToValueAtTime(freq - 40, startTime + 0.1);
      
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.1);
    });
  } catch (e) {
    console.warn('[Audio] Meme laugh sound failed:', e);
  }
}

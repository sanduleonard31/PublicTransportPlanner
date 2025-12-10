// Minimal warm sound layer using the Web Audio API.
// Provides gentle musical clicks and pads for UI interactions without being harsh at high volume.
(function() {
  if (window.soundFX) return; // Avoid double-initialization.

  let ctx;
  let master;

  function ensureContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      ctx = AudioCtx ? new AudioCtx() : null;
      if (ctx) {
        master = ctx.createGain();
        master.gain.value = 0.7; // Keep levels comfortable even at max system volume.
        master.connect(ctx.destination);
      }
    }
    return ctx;
  }

  async function unlock() {
    const audio = ensureContext();
    if (!audio) return;
    if (audio.state === 'suspended') {
      try { await audio.resume(); } catch (_) { /* ignore */ }
    }
  }

  function createPluck({ freq = 520, duration = 0.35 }) {
    const audio = ensureContext();
    if (!audio) return;
    const now = audio.currentTime;

    const osc = audio.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.8, now + duration);

    const gain = audio.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);

    const pan = audio.createStereoPanner();
    pan.pan.setValueAtTime((Math.random() - 0.5) * 0.4, now);

    osc.connect(gain);
    gain.connect(filter);
    filter.connect(pan);
    pan.connect(master);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  function createAir({ duration = 0.6, tilt = 1400 }) {
    const audio = ensureContext();
    if (!audio) return;
    const now = audio.currentTime;

    const buffer = audio.createBuffer(1, audio.sampleRate * duration, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.35;

    const noise = audio.createBufferSource();
    noise.buffer = buffer;

    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(tilt, now);

    const gain = audio.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    noise.start(now);
    noise.stop(now + duration + 0.1);
  }

  const soundFX = {
    async unlock() { await unlock(); },
    tap() {
      unlock();
      const base = 480 + Math.random() * 60;
      createPluck({ freq: base, duration: 0.32 });
    },
    select() {
      unlock();
      createPluck({ freq: 660, duration: 0.4 });
      createAir({ duration: 0.55, tilt: 1200 });
    },
    tab() {
      unlock();
      createAir({ duration: 0.7, tilt: 900 });
    }
  };

  // Light-touch auto-wiring for common UI interactions.
  document.addEventListener('click', event => {
    const target = event.target;
    if (!target) return;
    if (target.closest('button')) {
      soundFX.tap();
      return;
    }
    if (target.closest('.card')) {
      soundFX.select();
    }
  });

  ['pointerdown', 'touchstart', 'keydown'].forEach(evt => {
    document.addEventListener(evt, () => soundFX.unlock(), { once: true, passive: true });
  });

  window.soundFX = soundFX;
})();

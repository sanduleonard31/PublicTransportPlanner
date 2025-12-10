// Simple lofi radio powered by the Radio Browser API.
// Streams are user-triggered to respect autoplay rules.
(function() {
  const API_URL = 'https://de1.api.radio-browser.info/json/stations/bytag/lofi?hidebroken=true&limit=10&order=clickcount&reverse=true';
  const FALLBACK_STREAM = {
    name: 'NightRide Lofi',
    url: 'https://stream.nightride.fm/lofi.ogg',
    source: 'Fallback stream'
  };

  let audio;
  let stream = { ...FALLBACK_STREAM };
  let toggleBtn, statusEl, titleEl, sourceEl, stateEl;
  let isLoading = false;

  function cacheDom() {
    toggleBtn = document.getElementById('music-toggle');
    statusEl = document.getElementById('music-status');
    titleEl = document.getElementById('music-title');
    sourceEl = document.getElementById('music-source');
    stateEl = document.getElementById('music-state');
  }

  function ensureAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = 'none';
    audio.crossOrigin = 'anonymous';
    audio.volume = 0.5;

    audio.addEventListener('playing', () => updateUi('Playing lofi stream'));
    audio.addEventListener('pause', () => updateUi('Lofi stream is paused'));
    audio.addEventListener('error', () => updateUi('Stream unavailable, using fallback'));
    return audio;
  }

  function updateUi(message) {
    if (statusEl) statusEl.textContent = message;
    if (!toggleBtn) return;

    const isPlaying = audio && !audio.paused && !audio.ended;
    toggleBtn.classList.toggle('is-playing', isPlaying);
    toggleBtn.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
    toggleBtn.querySelector('.label').textContent = isPlaying ? 'Pause' : 'Play';
    if (stateEl) stateEl.textContent = isPlaying ? 'Now playing' : 'Ready';
  }

  function setMetadata(meta) {
    stream = meta;
    if (titleEl) titleEl.textContent = meta.name || 'Lofi Stream';
    if (sourceEl) sourceEl.textContent = meta.source || 'Powered by Radio Browser API';
  }

  async function pickStation() {
    isLoading = true;
    updateUi('Finding a lofi station...');
    try {
      const res = await fetch(API_URL, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('Bad response');
      const list = await res.json();
      const station = Array.isArray(list) ? list.find(item => item.url_resolved || item.url) : null;
      if (!station) throw new Error('No station found');

      setMetadata({
        name: station.name || 'Lofi Station',
        url: station.url_resolved || station.url,
        source: 'Radio Browser API'
      });
      updateUi('Station ready');
    } catch (_) {
      setMetadata(FALLBACK_STREAM);
      updateUi('Using fallback stream');
    } finally {
      isLoading = false;
    }
  }

  async function play() {
    const a = ensureAudio();
    if (isLoading) return;

    if (a.src !== stream.url) {
      a.src = stream.url;
    }

    try {
      await a.play();
      updateUi('Playing lofi stream');
    } catch (err) {
      console.warn('Playback blocked:', err);
      updateUi('Tap again to play (blocked)');
    }
  }

  function pause() {
    if (!audio) return;
    audio.pause();
    updateUi('Lofi stream is paused');
  }

  function toggle() {
    if (audio && !audio.paused && !audio.ended) {
      pause();
    } else {
      play();
    }
  }

  function wireUi() {
    if (!toggleBtn) return;
    toggleBtn.addEventListener('click', () => {
      // Light haptic sound if available.
      if (window.soundFX && window.soundFX.tap) window.soundFX.tap();
      toggle();
    });
  }

  function init() {
    cacheDom();
    if (!toggleBtn) return;
    wireUi();
    pickStation();
    updateUi('Ready');
  }

  document.addEventListener('DOMContentLoaded', init);

  window.lofiRadio = {
    play,
    pause,
    toggle,
    get stream() { return stream; }
  };
})();

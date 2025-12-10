(() => {
  const App = window.App || (window.App = {});
  const PAGE_SIZE = 6;
  const FAVORITES_KEY = 'ptp:favorites';
  const DEFAULT_RADIUS = 25000;

  const state = {
    coords: null,
    tab: 'transport',
    transport: { items: [], page: 0, mode: 'all' },
    places: { groups: {}, page: {} },
    favorites: [],
    lastSelection: null,
    lastUpdated: ''
  };

  const toRad = v => v * Math.PI / 180;
  const distance = (a, b) => {
    if (!a || !b) return Infinity;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const la1 = toRad(a.latitude);
    const la2 = toRad(b.latitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(h));
  };

  const formatDistance = m => !Number.isFinite(m) ? '--' : (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
  const walkEta = m => !Number.isFinite(m) ? '--' : `~${Math.max(1, Math.round(m / 80))} min walk`;
  const buildKey = item => `${item.mode}-${item.lat}-${item.lon}`;
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const slicePage = (items, page) => {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const safePage = clamp(page, 0, totalPages - 1);
    return {
      page: safePage,
      totalPages,
      items: items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
    };
  };

  function loadFavorites() {
    try {
      state.favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    } catch (_) {
      state.favorites = [];
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites));
    } catch (_) {}
  }

  App.state = state;
  App.helpers = {
    PAGE_SIZE,
    DEFAULT_RADIUS,
    FAVORITES_KEY,
    distance,
    formatDistance,
    walkEta,
    buildKey,
    slicePage,
    loadFavorites,
    saveFavorites,
    clamp
  };
})();

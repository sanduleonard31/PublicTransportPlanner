(() => {
  const App = window.App || {};
  const { state, helpers, render } = App;
  if (!state || !helpers || !render) return;

  const transportQuery = ({ latitude, longitude }) => `(
    node["highway"="bus_stop"](around:${helpers.DEFAULT_RADIUS},${latitude},${longitude});
    node["railway"~"tram_stop|subway_entrance|station"](around:${helpers.DEFAULT_RADIUS},${latitude},${longitude});
  );`;

  const placesQuery = ({ latitude, longitude }) => `(
    node["amenity"~"cafe|restaurant|bar"](around:${helpers.DEFAULT_RADIUS},${latitude},${longitude});
    node["leisure"~"park|garden"](around:${helpers.DEFAULT_RADIUS},${latitude},${longitude});
    node["tourism"="museum"](around:${helpers.DEFAULT_RADIUS},${latitude},${longitude});
  );`;

  const fetchOverpass = query => fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `[out:json][timeout:20];${query}out center 40;`
  }).then(res => res.json()).then(data => data.elements || []);

  const normalizeTransport = (elements, coords) => elements.map(el => {
    const tags = el.tags || {};
    const lat = el.lat || el.center?.lat;
    const lon = el.lon || el.center?.lon;
    if (!lat || !lon) return null;
    if (!tags.name && !tags.ref) return null;
    const dist = helpers.distance(coords, { latitude: lat, longitude: lon });
    const mode = tags.highway === 'bus_stop' ? 'Bus' :
      tags.railway === 'tram_stop' ? 'Tram' :
      tags.railway === 'subway_entrance' ? 'Metro' :
      tags.railway === 'station' ? 'Train' : 'Transit';
    return { lat, lon, mode, title: tags.name || `Line ${tags.ref}` || `${mode} Stop`, detail: tags.route_ref ? `Routes: ${tags.route_ref}` : helpers.formatDistance(dist), provider: tags.operator || 'Public', _dist: dist };
  }).filter(Boolean).sort((a, b) => a._dist - b._dist).slice(0, 60);

  const normalizePlaces = (elements, coords) => {
    const groups = {
      food: { key: 'food', category: 'Food & Drink', description: 'Quick bites nearby.', items: [] },
      fun: { key: 'fun', category: 'Parks & Recreation', description: 'Spots to unwind.', items: [] },
      service: { key: 'service', category: 'Mobility & Services', description: 'Helpful services close by.', items: [] }
    };
    elements.forEach(el => {
      const tags = el.tags || {};
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      if (!lat || !lon || !tags.name) return;
      const dist = helpers.distance(coords, { latitude: lat, longitude: lon });
      const base = { lat, lon, name: tags.name, address: helpers.formatDistance(dist), rating: helpers.walkEta(dist), _dist: dist };
      if (tags.amenity && ['cafe', 'restaurant', 'bar'].includes(tags.amenity)) groups.food.items.push(base);
      else if (tags.leisure && ['park', 'garden'].includes(tags.leisure) || tags.tourism === 'museum') groups.fun.items.push(base);
      else groups.service.items.push(base);
    });
    Object.values(groups).forEach(g => g.items.sort((a, b) => a._dist - b._dist));
    return groups;
  };

  const setMode = mode => {
    state.transport.mode = mode;
    state.transport.page = 0;
    document.querySelectorAll('[data-mode-filter]').forEach(btn => btn.classList.toggle('active', btn.dataset.modeFilter === mode));
    render.renderTransport();
    render.renderMapTargets();
  };

  const toggleFavorite = data => {
    const key = data.key || helpers.buildKey(data);
    const idx = state.favorites.findIndex(f => f.key === key);
    if (idx >= 0) state.favorites.splice(idx, 1);
    else state.favorites.push({ key, title: data.title, mode: data.mode, lat: data.lat, lon: data.lon, distance: data.distance, eta: data.eta });
    helpers.saveFavorites();
    render.renderFavorites();
    render.renderTransport();
    render.renderPlaces();
  };

  const selectLocation = data => {
    state.lastSelection = { category: data.mode, title: data.title, lat: data.lat, lon: data.lon, dist: data.distance, eta: data.eta };
    render.renderTrip(state.lastSelection);
    render.renderMapTargets();
    if (window.highlightRoute) window.highlightRoute(data.lat, data.lon);
  };

  const changePage = (target, step) => {
    if (target === 'transport') {
      const filtered = state.transport.items.filter(item => state.transport.mode === 'all' || item.mode.toLowerCase() === state.transport.mode);
      const total = Math.max(1, Math.ceil(filtered.length / helpers.PAGE_SIZE));
      state.transport.page = helpers.clamp(state.transport.page + step, 0, total - 1);
      render.renderTransport();
    } else {
      const group = state.places.groups[target];
      if (!group) return;
      const total = Math.max(1, Math.ceil((group.items || []).length / helpers.PAGE_SIZE));
      const next = helpers.clamp((state.places.page[target] || 0) + step, 0, total - 1);
      state.places.page[target] = next;
      render.renderPlaces();
    }
    render.renderMapTargets();
  };

  const handleAction = node => {
    const action = node.dataset.action;
    if (action === 'select') {
      selectLocation({
        title: decodeURIComponent(node.dataset.title || ''),
        mode: node.dataset.mode,
        lat: Number(node.dataset.lat),
        lon: Number(node.dataset.lon),
        distance: node.dataset.distance,
        eta: node.dataset.eta
      });
    } else if (action === 'favorite') {
      toggleFavorite({
        key: node.dataset.key,
        title: decodeURIComponent(node.dataset.title || ''),
        mode: node.dataset.mode,
        lat: Number(node.dataset.lat),
        lon: Number(node.dataset.lon),
        distance: node.dataset.distance,
        eta: node.dataset.eta
      });
    } else if (action === 'jump-favorite') {
      selectLocation({
        title: decodeURIComponent(node.dataset.title || ''),
        mode: node.dataset.mode,
        lat: Number(node.dataset.lat),
        lon: Number(node.dataset.lon),
        distance: node.dataset.distance,
        eta: node.dataset.eta
      });
    } else if (action === 'page') {
      changePage(node.dataset.target, Number(node.dataset.step) || 0);
    } else if (action === 'clear-favorites') {
      state.favorites = [];
      helpers.saveFavorites();
      render.renderFavorites();
      render.renderTransport();
      render.renderPlaces();
    }
  };

  const wireEvents = () => {
    document.addEventListener('click', evt => {
      const modeBtn = evt.target.closest('[data-mode-filter]');
      if (modeBtn) return setMode(modeBtn.dataset.modeFilter);
      const tabBtn = evt.target.closest('[data-tab]');
      if (tabBtn) {
        render.setTab(tabBtn.dataset.tab);
        render.renderMapTargets();
        return;
      }
      const node = evt.target.closest('[data-action]');
      if (node) handleAction(node);
    });
    const refresh = document.getElementById('refresh-location');
    if (refresh) refresh.addEventListener('click', requestLocation);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      applyLocation(pos.coords);
      if (window.onLocationFound) window.onLocationFound({ coords: pos.coords });
    }, err => console.warn('GPS unavailable', err), { enableHighAccuracy: true, timeout: 12000 });
  };

  const applyLocation = coords => {
    state.coords = coords;
    state.transport.page = 0;
    state.places.page = {};
    fetchData(coords);
  };

  const fetchData = async coords => {
    try {
      const [transportRaw, placesRaw] = await Promise.all([
        fetchOverpass(transportQuery(coords)),
        fetchOverpass(placesQuery(coords))
      ]);
      state.transport.items = normalizeTransport(transportRaw, coords);
      state.places.groups = normalizePlaces(placesRaw, coords);
      state.lastUpdated = new Date().toLocaleString();
      render.renderAll();
    } catch (err) {
      console.warn('Data load failed', err);
    }
  };

  const init = () => {
    helpers.loadFavorites();
    render.renderFavorites();
    render.setTab(state.tab);
    wireEvents();
    requestLocation();
  };

  document.addEventListener('DOMContentLoaded', init);
})();
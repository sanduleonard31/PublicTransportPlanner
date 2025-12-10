(() => {
  const App = window.App || {};
  const { state, helpers } = App;
  if (!state || !helpers) return;

  const byId = id => document.getElementById(id);

  const renderPager = (target, page, total) => {
    if (total <= 1) return '';
    return `<div class="pagination-bar" data-pager="${target}">
      <button class="ghost-btn" data-action="page" data-target="${target}" data-step="-1">Prev</button>
      <span class="muted">Page ${page + 1}/${total}</span>
      <button class="ghost-btn" data-action="page" data-target="${target}" data-step="1">Next</button>
    </div>`;
  };

  const filterTransport = () => {
    const filtered = state.transport.items
      .filter(item => state.transport.mode === 'all' || item.mode.toLowerCase() === state.transport.mode)
      .sort((a, b) => a._dist - b._dist);
    const slice = helpers.slicePage(filtered, state.transport.page);
    state.transport.page = slice.page;
    return slice;
  };

  const renderTransport = () => {
    const wrap = byId('transport-cards');
    if (!wrap) return;
    const { items, page, totalPages } = filterTransport();
    const cards = items.map(item => {
      const key = helpers.buildKey(item);
      const safeTitle = encodeURIComponent(item.title);
      const distance = helpers.formatDistance(item._dist);
      const eta = helpers.walkEta(item._dist);
      const isFav = state.favorites.some(f => f.key === key);
      return `<article class="card" data-action="select" data-title="${safeTitle}" data-mode="${item.mode}" data-lat="${item.lat}" data-lon="${item.lon}" data-distance="${distance}" data-eta="${eta}">
        <div class="card-header"><span class="card-badge">${item.mode}</span><span class="card-status">${eta}</span></div>
        <h4 class="card-title">${item.title}</h4>
        <p class="card-text">${item.detail}</p>
        <div class="card-tags"><span class="card-tag">${distance}</span><span class="card-tag">${item.provider}</span></div>
        <button class="ghost-btn fav-btn ${isFav ? 'is-active' : ''}" data-action="favorite" data-key="${key}" data-mode="${item.mode}" data-title="${safeTitle}" data-lat="${item.lat}" data-lon="${item.lon}" data-distance="${distance}" data-eta="${eta}">${isFav ? 'Saved' : 'Save stop'}</button>
      </article>`;
    }).join('') || '<p class="muted">Nothing nearby. Refresh location.</p>';
    wrap.innerHTML = cards + renderPager('transport', page, totalPages);
  };

  const renderPlaces = () => {
    const wrap = byId('places-cards');
    if (!wrap) return;
    const cards = Object.entries(state.places.groups || {}).map(([key, group]) => {
      const slice = helpers.slicePage(group.items || [], state.places.page[key] || 0);
      state.places.page[key] = slice.page;
      if (!slice.items.length) return '';
      const list = slice.items.map(item => {
        const safeTitle = encodeURIComponent(item.name);
        const dist = helpers.formatDistance(item._dist);
        const favKey = helpers.buildKey({ mode: group.category, lat: item.lat, lon: item.lon });
        const isFav = state.favorites.some(f => f.key === favKey);
        return `<li data-action="select" data-mode="${group.category}" data-title="${safeTitle}" data-lat="${item.lat}" data-lon="${item.lon}" data-distance="${dist}" data-eta="${item.rating}">
          <div class="card-header"><strong>${item.name}</strong><span class="card-tag">${item.rating}</span></div>
          <p class="card-text">${item.address}</p>
          <button class="ghost-btn fav-btn ${isFav ? 'is-active' : ''}" data-action="favorite" data-key="${favKey}" data-mode="${group.category}" data-title="${safeTitle}" data-lat="${item.lat}" data-lon="${item.lon}" data-distance="${dist}" data-eta="${item.rating}">${isFav ? 'Saved' : 'Save visit'}</button>
        </li>`;
      }).join('');
      return `<article class="card">
        <h4 class="card-title">${group.category}</h4>
        <p class="card-text">${group.description}</p>
        <ul class="card-list">${list}</ul>
        ${renderPager(key, slice.page, slice.totalPages)}
      </article>`;
    }).filter(Boolean).join('') || '<p class="muted">No suggested places yet.</p>';
    wrap.innerHTML = cards;
  };

  const renderFavorites = () => {
    const section = byId('favorites-section');
    const list = byId('favorites-list');
    if (!section || !list) return;
    if (!state.favorites.length) {
      section.style.display = 'none';
      list.innerHTML = '';
      return;
    }
    section.style.display = 'block';
    list.innerHTML = state.favorites.map(f => `<button class="pill" data-action="jump-favorite" data-key="${f.key}" data-lat="${f.lat}" data-lon="${f.lon}" data-mode="${f.mode}" data-title="${encodeURIComponent(f.title)}" data-distance="${f.distance}" data-eta="${f.eta}">${f.mode} - ${f.title} - ${f.distance}</button>`).join('');
  };

  const renderTrip = selection => {
    const box = byId('trip-details');
    if (!box) return;
    if (!selection) {
      box.style.display = 'none';
      return;
    }
    box.style.display = 'block';
    byId('trip-name').textContent = selection.title;
    byId('trip-distance').textContent = selection.dist;
    byId('trip-eta').textContent = selection.eta;
  };

  const setTab = tab => {
    state.tab = tab;
    const transport = byId('transport-section');
    const places = byId('places-section');
    transport.style.display = tab === 'transport' ? 'block' : 'none';
    places.style.display = tab === 'places' ? 'block' : 'none';
    document.querySelectorAll('[data-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  };

  const renderMapTargets = () => {
    if (!state.coords || !window.drawConnections) return;
    let targets = [];
    if (state.tab === 'transport') {
      targets = filterTransport().items;
    } else {
      Object.entries(state.places.groups || {}).forEach(([key, group]) => {
        const slice = helpers.slicePage(group.items || [], state.places.page[key] || 0);
        targets = targets.concat(slice.items);
      });
    }
    window.drawConnections(state.coords, targets.map(t => ({ lat: t.lat, lon: t.lon })));
  };

  const renderLastUpdated = () => {
    const label = byId('last-updated');
    if (label && state.lastUpdated) label.textContent = state.lastUpdated;
  };

  const renderAll = () => {
    renderTransport();
    renderPlaces();
    renderFavorites();
    renderTrip(state.lastSelection);
    renderLastUpdated();
    renderMapTargets();
  };

  App.render = {
    renderAll,
    renderTransport,
    renderPlaces,
    renderFavorites,
    renderTrip,
    renderMapTargets,
    setTab,
    renderLastUpdated
  };
})();

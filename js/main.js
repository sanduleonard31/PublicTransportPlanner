/**
 * --- GLOBAL STATE ---
 */
const STATE = {
    userCoords: null,
    currentTab: 'transport',
    transport: { 
        allItems: [], 
        currentIndex: 0,
        filters: { modes: new Set(['all']), sortBy: 'distance' }
    },
    places: { groups: {}, indexes: {} },
    favorites: [],
    lastSelection: null
};

const playSound = (name) => {
    const fx = window.soundFX;
    if (fx && typeof fx[name] === 'function') fx[name]();
};

const PAGE_SIZE = 5;
const FAVORITES_KEY = 'ptp:favorites';
const DEFAULT_SEARCH_RADIUS = 20000;

/**
 * --- INTERACTION HANDLERS ---
 */
window.selectLocation = function(category, lat, lon, title, dist, eta) {
    playSound('select');
    STATE.lastSelection = { category, lat, lon, title, dist, eta };
    
    // 1. Highlight Map Route
    if (window.highlightRoute) window.highlightRoute(lat, lon);

    // 2. Update Trip Info Box
    const detailsBox = document.getElementById('trip-details');
    if (detailsBox) {
        detailsBox.style.display = 'block';
        document.getElementById('trip-name').textContent = title;
        document.getElementById('trip-distance').textContent = dist;
        document.getElementById('trip-eta').textContent = eta;
    }
};

window.switchTab = function(tabName) {
    playSound('tab');
    STATE.currentTab = tabName;

    // Toggle HTML Visibility
    const transportSec = document.getElementById('transport-section');
    const placesSec = document.getElementById('places-section');
    const buttons = document.querySelectorAll('.tab-btn');

    if (buttons.length >= 2) {
        if (tabName === 'transport') {
            transportSec.style.display = 'block';
            placesSec.style.display = 'none';
            buttons[0].classList.add('active');
            buttons[1].classList.remove('active');
        } else {
            transportSec.style.display = 'none';
            placesSec.style.display = 'block';
            buttons[0].classList.remove('active');
            buttons[1].classList.add('active');
        }
    }

    // Sync Map
    updateMapWithVisibleItems();
};

window.nextTransport = function() {
    playSound('tap');
    const visible = getVisibleTransportItems();
    STATE.transport.currentIndex = (STATE.transport.currentIndex + PAGE_SIZE) % Math.max(visible.length, 1);
    renderTransportList();
    updateMapWithVisibleItems();
};

window.nextPlaceGroup = function(categoryKey) {
    playSound('tap');
    STATE.places.indexes[categoryKey] += PAGE_SIZE;
    const groupItems = STATE.places.groups[categoryKey].items;
    
    if (STATE.places.indexes[categoryKey] >= groupItems.length) {
        STATE.places.indexes[categoryKey] = 0;
    }
    renderPlacesList();
    updateMapWithVisibleItems();
};

/**
 * --- MAP SYNCHRONIZER ---
 */
function updateMapWithVisibleItems() {
    if (!STATE.userCoords) return;

    let targetsToDraw = [];

    if (STATE.currentTab === 'transport') {
        const start = STATE.transport.currentIndex;
        const visible = getVisibleTransportItems();
        targetsToDraw = visible.slice(start, start + PAGE_SIZE);
    } 
    else if (STATE.currentTab === 'places') {
        Object.keys(STATE.places.groups).forEach(key => {
            const group = STATE.places.groups[key];
            const start = STATE.places.indexes[key];
            targetsToDraw = targetsToDraw.concat(group.items.slice(start, start + PAGE_SIZE));
        });
    }

    if (window.drawConnections) {
        window.drawConnections(STATE.userCoords, targetsToDraw);
    }
}


/**
 * --- RENDERERS ---
 */
function renderTransportList() {
    const container = document.getElementById('transport-cards');
    if (!container) return;

    const visibleItems = getVisibleTransportItems();
    const start = STATE.transport.currentIndex;
    const batch = visibleItems.slice(start, start + PAGE_SIZE);

    if (batch.length === 0) {
        container.innerHTML = '<p style="opacity:0.6;">No transport found. Try broadening filters or refreshing your location.</p>';
        return;
    }

    const cardsHtml = batch.map(item => {
        const key = buildItemKey(item);
        const isFav = isFavorite(key);
        return `
        <article class="card" style="cursor: pointer;" 
            onclick="selectLocation('${item.mode}', ${item.lat}, ${item.lon}, '${item.title.replace(/'/g, "\\'")}', '${formatDistance(item._dist)}', '${item.eta}')">
            <div class="card-header">
                <span class="card-badge">${item.mode}</span>
                <span class="card-status">${item.status}</span>
            </div>
            <h4 class="card-title">${item.title}</h4>
            <p class="card-text">${item.detail}</p>
            <div class="card-tags">
                <span class="card-tag">${item.provider}</span>
                <span class="card-tag">${item.eta}</span>
            </div>
            <button class="ghost-btn fav-btn ${isFav ? 'is-active' : ''}" type="button" onclick="event.stopPropagation(); toggleFavoriteFromCard('${key}')">${isFav ? 'Saved' : 'Save stop'}</button>
        </article>`;
    }).join('');

    let buttonHtml = '';
    if (visibleItems.length > PAGE_SIZE) {
        buttonHtml = `<div style="grid-column: 1 / -1; text-align: center;">
            <button class="next-btn" onclick="nextTransport()">Show Next ${PAGE_SIZE} ⟳</button>
        </div>`;
    }

    container.innerHTML = cardsHtml + buttonHtml;
}

function renderPlacesList() {
    const container = document.getElementById('places-cards');
    if (!container) return;

    const groupsHtml = Object.keys(STATE.places.groups).map(key => {
        const group = STATE.places.groups[key];
        const currentIndex = STATE.places.indexes[key];
        const batch = group.items.slice(currentIndex, currentIndex + PAGE_SIZE);

        if (batch.length === 0) return '';

        const listItems = batch.map(item => {
            const safeName = item.name.replace(/'/g, "\\'");
            const key = buildItemKey({ mode: group.category, lat: item.lat, lon: item.lon });
            const isFav = isFavorite(key);
            return `
            <li style="cursor: pointer;" onclick="event.stopPropagation(); selectLocation('${group.category}', ${item.lat}, ${item.lon}, '${safeName}', '${item.distance}', '${item.rating}')">
                <div class="card-header">
                    <strong>${item.name}</strong>
                    <span class="card-tag">${item.rating}</span>
                </div>
                <p class="card-text">${item.address} - ${item.distance}</p>
                <button class="ghost-btn fav-btn ${isFav ? 'is-active' : ''}" type="button" onclick="event.stopPropagation(); toggleFavoriteFromPlace('${safeName}', '${group.category}', ${item.lat}, ${item.lon}, '${item.distance}', '${item.rating}')">${isFav ? 'Saved' : 'Save visit'}</button>
            </li>`;
        }).join('');

        let nextBtn = '';
        if (group.items.length > PAGE_SIZE) {
            nextBtn = `<button class="next-link" onclick="nextPlaceGroup('${key}')">Show Next ${PAGE_SIZE} ⟳</button>`;
        }

        return `
        <article class="card">
            <h4 class="card-title">${group.category} 🎵</h4>
            <p class="card-text">${group.description}</p>
            <ul class="card-list">${listItems}</ul>
            ${nextBtn}
        </article>`;
    }).join('');

    container.innerHTML = groupsHtml;
}

/**
 * --- HELPERS ---
 */
function buildItemKey(item) {
    return `${item.mode}-${item.lat}-${item.lon}`;
}

function isFavorite(key) {
    return STATE.favorites.some(f => f.key === key);
}

function getVisibleTransportItems() {
    const modes = STATE.transport.filters.modes;
    let list = [...STATE.transport.allItems];

    if (!modes.has('all')) {
        list = list.filter(item => modes.has(item.mode.toLowerCase()));
    }

    if (STATE.transport.filters.sortBy === 'eta') {
        list.sort((a, b) => estimateMinutesFromDistance(a._dist) - estimateMinutesFromDistance(b._dist));
    } else {
        list.sort((a, b) => a._dist - b._dist);
    }

    return list;
}

function getDistance(origin, target) {
    if (!origin || !target) return Infinity;
    const R = 6371000; 
    const toRad = n => n * Math.PI / 180;
    const dLat = toRad(target.latitude - origin.latitude);
    const dLon = toRad(target.longitude - origin.longitude);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(origin.latitude))*Math.cos(toRad(target.latitude))*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function formatDistance(m) { return m === Infinity ? '—' : (m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1) + ' km'); }
function estimateWalk(m) { return m === Infinity ? '—' : '~' + Math.max(1, Math.round(m / 80)) + ' min walk'; }
function estimateMinutesFromDistance(m) { return m === Infinity ? Infinity : Math.max(1, Math.round(m / 80)); }

function fetchOverpass(query) {
    return fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST', body: '[out:json][timeout:25];' + query + 'out center 60;'
    }).then(res => res.json()).then(data => data.elements);
}

function processTransport(elements, userCoords) {
    return elements.map(el => {
        const tags = el.tags || {};
        if (!tags.name && !tags.ref) return null;
        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;
        const dist = getDistance(userCoords, { latitude: lat, longitude: lon });
        
        let mode = 'Transit';
        if (tags.highway === 'bus_stop') mode = 'Bus';
        else if (tags.railway === 'tram_stop') mode = 'Tram';
        else if (tags.railway === 'subway_entrance') mode = 'Metro';
        else if (tags.railway === 'station') mode = 'Train';

        return {
            lat, lon, mode,
            title: tags.name || `Line ${tags.ref}` || `${mode} Stop`,
            detail: tags.route_ref ? `Routes: ${tags.route_ref}` : formatDistance(dist),
            provider: tags.operator || 'Public',
            eta: estimateWalk(dist),
            status: 'Nearby',
            _dist: dist
        };
    }).filter(Boolean).sort((a, b) => a._dist - b._dist);
}

function processPlaces(elements, userCoords) {
    const groups = {
        'food': { 
            category: 'Food & Drink', 
            description: 'Quick bites and local flavors.', 
            match: 'cafe|restaurant|bar', 
            items: [] 
        },
        'fun': { 
            category: 'Parks & Recreation', 
            description: 'Places to unwind and explore.', 
            match: 'park|garden|museum', 
            items: [] 
        },
        'service': { 
            category: 'Mobility & Services', 
            description: 'Travel helpers and essentials.', 
            match: 'taxi|bicycle|bank', 
            items: [] 
        }
    };

    elements.forEach(el => {
        const tags = el.tags || {};
        if (!tags.name) return;
        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;
        const dist = getDistance(userCoords, { latitude: lat, longitude: lon });
        
        let targetGroup = groups.service;
        if (tags.amenity && groups.food.match.includes(tags.amenity)) targetGroup = groups.food;
        else if (tags.leisure && groups.fun.match.includes(tags.leisure)) targetGroup = groups.fun;

        targetGroup.items.push({
            lat, lon, name: tags.name,
            rating: estimateWalk(dist),
            address: formatDistance(dist),
            distance: formatDistance(dist),
            _dist: dist
        });
    });

    Object.keys(groups).forEach(key => groups[key].items.sort((a, b) => a._dist - b._dist));
    return groups;
}

/**
 * --- CONTROLLER ---
 */
async function loadDashboard(coords) {
    STATE.userCoords = coords;
    const { latitude, longitude } = coords;
    const radius = DEFAULT_SEARCH_RADIUS;

    const transportQuery = `(
        node["highway"="bus_stop"](around:${radius},${latitude},${longitude});
        node["railway"~"tram_stop|subway_entrance|station"](around:${radius},${latitude},${longitude});
    );`;

    const placesQuery = `(
        node["amenity"~"cafe|restaurant|bar|taxi|bicycle_rental"](around:${radius},${latitude},${longitude});
        node["leisure"~"park|garden"](around:${radius},${latitude},${longitude});
        node["tourism"="museum"](around:${radius},${latitude},${longitude});
    );`;

    try {
        const transportTask = fetchOverpass(transportQuery).then(raw => {
            STATE.transport.allItems = processTransport(raw, coords);
            STATE.transport.currentIndex = 0;
            renderTransportList();
            return STATE.transport.allItems;
        });

        const placesTask = fetchOverpass(placesQuery).then(raw => {
            STATE.places.groups = processPlaces(raw, coords);
            Object.keys(STATE.places.groups).forEach(key => STATE.places.indexes[key] = 0);
            renderPlacesList();
            return STATE.places.groups;
        });

        await Promise.all([transportTask, placesTask]);
        updateMapWithVisibleItems();

    } catch (error) {
        console.error('Dashboard load failed:', error);
    }
}

function toggleModeFilter(mode) {
    playSound('tap');
    if (mode === 'all') {
        STATE.transport.filters.modes = new Set(['all']);
    } else {
        STATE.transport.filters.modes = new Set([mode]);
    }
    STATE.transport.currentIndex = 0;
    syncFilterButtons();
    renderTransportList();
    updateMapWithVisibleItems();
}

function syncFilterButtons() {
    const modes = STATE.transport.filters.modes;
    document.querySelectorAll('[data-mode-filter]').forEach(btn => {
        const key = btn.getAttribute('data-mode-filter');
        const active = modes.has('all') ? key === 'all' : modes.has(key);
        btn.classList.toggle('active', active);
    });
}

function changeTransportSort(value) {
    STATE.transport.filters.sortBy = value;
    STATE.transport.currentIndex = 0;
    renderTransportList();
    updateMapWithVisibleItems();
}

function toggleFavoriteFromCard(key) {
    const item = STATE.transport.allItems.find(entry => buildItemKey(entry) === key);
    if (!item) return;
    toggleFavorite(item);
}

function toggleFavoriteFromPlace(title, category, lat, lon, distance, eta) {
    const item = { title, mode: category, lat, lon, distance, eta };
    toggleFavorite(item);
}

function toggleFavorite(item) {
    const key = buildItemKey(item);
    const existingIndex = STATE.favorites.findIndex(f => f.key === key);
    const distanceText = item.distance || (Number.isFinite(item._dist) ? formatDistance(item._dist) : '—');
    const etaText = item.eta || (Number.isFinite(item._dist) ? estimateWalk(item._dist) : '—');
    if (existingIndex >= 0) {
        STATE.favorites.splice(existingIndex, 1);
    } else {
        STATE.favorites.push({ key, title: item.title, mode: item.mode, lat: item.lat, lon: item.lon, distance: distanceText, eta: etaText });
    }
    persistFavorites();
    renderTransportList();
    renderFavorites();
}

function renderFavorites() {
    const section = document.getElementById('favorites-section');
    const list = document.getElementById('favorites-list');
    if (!section || !list) return;

    if (STATE.favorites.length === 0) {
        section.style.display = 'none';
        list.innerHTML = '';
        return;
    }

    section.style.display = 'block';
    list.innerHTML = STATE.favorites.map(f => `
        <button class="pill" onclick="selectLocation('${f.mode}', ${f.lat}, ${f.lon}, '${f.title.replace(/'/g, "\\'")}', '${f.distance}', '${f.eta}')">${f.mode} · ${f.title} · ${f.distance}</button>
    `).join('');
}

function persistFavorites() {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(STATE.favorites)); } catch (_) { /* ignore */ }
}

function loadFavorites() {
    try {
        const saved = localStorage.getItem(FAVORITES_KEY);
        if (saved) STATE.favorites = JSON.parse(saved);
    } catch (_) {
        STATE.favorites = [];
    }
    renderFavorites();
}

function clearFavorites() {
    STATE.favorites = [];
    persistFavorites();
    renderFavorites();
}

function requestLocationUpdate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
        async pos => {
            STATE.transport.currentIndex = 0;
            await loadDashboard(pos.coords);
            if (window.onLocationFound) {
                window.onLocationFound({ coords: pos.coords });
            }

            // Re-apply last selection after fresh data
            if (STATE.lastSelection) {
                const sel = STATE.lastSelection;
                selectLocation(sel.category, sel.lat, sel.lon, sel.title, sel.dist, sel.eta);
            }
        },
        err => console.warn('Refresh location failed:', err),
        { enableHighAccuracy: true, timeout: 15000 }
    );
}

document.addEventListener('DOMContentLoaded', function() {
    const refreshBtn = document.getElementById('refresh-location');
    if (refreshBtn) refreshBtn.addEventListener('click', requestLocationUpdate);

    loadFavorites();
    syncFilterButtons();

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => loadDashboard(pos.coords),
            err => console.warn('No GPS:', err),
            { enableHighAccuracy: true, timeout: 15000 }
        );
    }
});
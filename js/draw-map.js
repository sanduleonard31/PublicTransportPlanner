// GLOBAL STATE
let globalUserCoords = null;
let activeRouteLine = null;

function loadLeaflet() {
    if (window.L) return Promise.resolve();
    return new Promise(function(resolve) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = resolve;
        document.head.appendChild(script);
    });
}

function initMap(container, coords) {
    if (container._leafletInstance) container._leafletInstance.remove();
    
    const map = L.map(container).setView([coords.latitude, coords.longitude], 15);
    
    // Dark Matter Tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    L.marker([coords.latitude, coords.longitude]).addTo(map).bindPopup('You are here').openPopup();
    
    container._leafletInstance = map;
    globalUserCoords = coords;
}

async function fetchRoute(start, end) {
    const endpoints = [
        // OSM community routing (foot profile)
        `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${start.longitude},${start.latitude};${end.lon},${end.lat}?overview=full&geometries=geojson`,
        // Public OSRM fallback
        `https://router.project-osrm.org/route/v1/foot/${start.longitude},${start.latitude};${end.lon},${end.lat}?overview=full&geometries=geojson`
    ];

    let lastErr;
    for (const url of endpoints) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Route request failed: ${res.status}`);
            const data = await res.json();
            const geometry = data.routes?.[0]?.geometry;
            if (!geometry?.coordinates) throw new Error('No route geometry');
            // OSRM returns [lon, lat]; Leaflet expects [lat, lon]
            return geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        } catch (err) {
            lastErr = err;
        }
    }
    throw lastErr || new Error('Routing unavailable');
}

function drawRouteLine(map, latLngs) {
    if (activeRouteLine) {
        activeRouteLine.remove();
        activeRouteLine = null;
    }
    activeRouteLine = L.polyline(latLngs, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round'
    }).addTo(map);
}

window.highlightRoute = function(targetLat, targetLon) {
    const mapContainer = document.getElementById('map');
    const map = mapContainer ? mapContainer._leafletInstance : null;
    if (!map || !globalUserCoords) return;

    const bounds = L.latLngBounds([[globalUserCoords.latitude, globalUserCoords.longitude], [targetLat, targetLon]]);
    map.flyToBounds(bounds, { padding: [80, 80], duration: 1.5 });

    // Draw straight connection instantly for feedback
    if (window.drawConnections) {
        window.drawConnections(globalUserCoords, [{ lat: targetLat, lon: targetLon }]);
    }

    // Fetch shortest walking path and draw polyline
    fetchRoute(globalUserCoords, { lat: targetLat, lon: targetLon })
        .then(coords => {
            drawRouteLine(map, coords);
        })
        .catch(err => {
            console.warn('Route unavailable:', err);
        });
};

window.drawConnections = function(userCoords, destinations) {
    const mapContainer = document.getElementById('map');
    const map = mapContainer ? mapContainer._leafletInstance : null;
    if (!map) return;

    globalUserCoords = userCoords;

    let canvas = document.getElementById('connection-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'connection-canvas';
        canvas.style.pointerEvents = 'none';
        canvas.style.position = 'absolute';
        canvas.style.zIndex = 400; 
        map.getPanes().overlayPane.appendChild(canvas);
    }
    const ctx = canvas.getContext('2d');

    function render() {
        const bounds = map.getBounds();
        const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
        L.DomUtil.setPosition(canvas, topLeft);
        
        const size = map.getSize();
        canvas.width = size.x;
        canvas.height = size.y;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const userPoint = map.latLngToLayerPoint([userCoords.latitude, userCoords.longitude]);
        const userX = userPoint.x - topLeft.x;
        const userY = userPoint.y - topLeft.y;

        // User Pulse
        ctx.beginPath();
        ctx.arc(userX, userY, 15, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.fill();

        destinations.forEach(function(dest) {
            if (!dest.lat || !dest.lon) return;
            const destPoint = map.latLngToLayerPoint([dest.lat, dest.lon]);
            const destX = destPoint.x - topLeft.x;
            const destY = destPoint.y - topLeft.y;

            const isSingleFocus = (destinations.length === 1);
            if (!isSingleFocus) {
                ctx.beginPath();
                ctx.moveTo(userX, userY);
                ctx.lineTo(destX, destY);
                const grad = ctx.createLinearGradient(userX, userY, destX, destY);
                grad.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
                grad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
                ctx.strokeStyle = grad;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Dot only
            ctx.beginPath();
            ctx.arc(destX, destY, isSingleFocus ? 8 : 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#ff4757';
            ctx.fill();
        });
    }

    map.off('move', render);
    map.on('move', render);
    map.on('zoomstart', function() { canvas.style.opacity = '0'; });
    map.on('zoomend', function() { render(); canvas.style.opacity = '1'; });
    render();
};

if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
        const mapDiv = document.getElementById('map');
        if (mapDiv) {
            loadLeaflet().then(function() {
                initMap(mapDiv, position.coords);
            });
        }
    });
}
// GLOBAL STATE
let globalUserCoords = null;

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

window.highlightRoute = function(targetLat, targetLon) {
    const mapContainer = document.getElementById('map');
    const map = mapContainer ? mapContainer._leafletInstance : null;
    if (!map || !globalUserCoords) return;

    const bounds = L.latLngBounds([[globalUserCoords.latitude, globalUserCoords.longitude], [targetLat, targetLon]]);
    map.flyToBounds(bounds, { padding: [80, 80], duration: 1.5 });

    if (window.drawConnections) {
        window.drawConnections(globalUserCoords, [{ lat: targetLat, lon: targetLon }]);
    }
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

            // Draw Line
            ctx.beginPath();
            ctx.moveTo(userX, userY);
            ctx.lineTo(destX, destY);

            const isSingleFocus = (destinations.length === 1);
            if (isSingleFocus) {
                ctx.strokeStyle = '#3b82f6'; 
                ctx.lineWidth = 4;
            } else {
                const grad = ctx.createLinearGradient(userX, userY, destX, destY);
                grad.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
                grad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
                ctx.strokeStyle = grad;
                ctx.lineWidth = 2;
            }
            ctx.stroke();

            // Dot
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
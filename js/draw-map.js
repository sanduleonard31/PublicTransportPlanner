// Load Leaflet library dynamically if not already loaded
function loadLeafletLibrary() {
    if (window.L) return Promise.resolve();
    
    document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">');
    
    return new Promise(resolve => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = resolve;
        document.head.appendChild(script);
    });
}

// Display map centered on given coordinates
function displayMapWithMarker(mapContainer, coordinates) {
    if (mapContainer._leafletInstance) mapContainer._leafletInstance.remove();
    
    const map = L.map(mapContainer).setView([coordinates.latitude, coordinates.longitude], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.marker([coordinates.latitude, coordinates.longitude]).addTo(map).bindPopup('You are here').openPopup();
    
    mapContainer._leafletInstance = map;
}

// Get user's location and display map
navigator.geolocation.getCurrentPosition(position => {
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        loadLeafletLibrary().then(() => displayMapWithMarker(mapContainer, position.coords));
    }
});

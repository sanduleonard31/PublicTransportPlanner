// --- CONFIGURATION & CONSTANTS ---

const WEATHER_CODES = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle',
  55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Snow', 80: 'Showers', 95: 'Thunder'
};

// --- HELPER FUNCTIONS ---

// Update HTML text safely
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// Format coordinates to 5 decimal places
function formatCoord(num) {
  return Number.isFinite(num) ? num.toFixed(5) : '—';
}

// Generic Fetcher (Replaces 'request')
async function fetchJson(url, params) {
  const fullUrl = `${url}?${new URLSearchParams(params)}`;
  const res = await fetch(fullUrl);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

// Format Weather Data
function formatWeather(current) {
  if (!current) return 'Weather unavailable';
  const label = WEATHER_CODES[current.weather_code] || 'Unknown';
  return `${label}, ${Math.round(current.temperature_2m)}°C, wind ${Math.round(current.wind_speed_10m)} km/h`;
}

// Find the best available city name
function getCityName(addr) {
  return addr?.city || addr?.town || addr?.village || addr?.suburb || addr?.display_name || 'Unknown location';
}

// --- CORE LOGIC ---

let clockTimer;

function startClock(timezone) {
  if (clockTimer) clearInterval(clockTimer);
  
  function tick() {
    setText('local-time', new Date().toLocaleTimeString('en-US', { timeZone: timezone }));
  }
  
  tick(); // Run immediately
  clockTimer = setInterval(tick, 1000);
}

async function onLocationFound({ coords }) {
  // 1. Show raw coordinates immediately
  setText('latitude', formatCoord(coords.latitude));
  setText('longitude', formatCoord(coords.longitude));

  try {
    // 2. Fetch Data (Parallel Request)
    const [geoData, weatherData] = await Promise.all([
      fetchJson('https://nominatim.openstreetmap.org/reverse', {
        lat: coords.latitude,
        lon: coords.longitude,
        format: 'jsonv2'
      }),
      fetchJson('https://api.open-meteo.com/v1/forecast', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        current: 'temperature_2m,weather_code,wind_speed_10m'
      })
    ]);

    // 3. Process & Display
    const timezone = geoData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    setText('location-name', getCityName(geoData.address));
    setText('timezone', timezone);
    setText('weather-summary', formatWeather(weatherData.current));
    startClock(timezone);

  } catch (error) {
    console.warn('Data fetch failed:', error);
    setText('location-name', 'Location unavailable');
    setText('weather-summary', 'Weather unavailable');
  }

  setText('last-updated', new Date().toLocaleString());
}

function onLocationError() {
  alert('Please enable location services to use this app.');
}

// --- INITIALIZATION ---

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(onLocationFound, onLocationError, {
    enableHighAccuracy: true,
    timeout: 10000
  });
} else {
  alert('Geolocation not supported.');
}
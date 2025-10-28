const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
};

const formatCoord = (value) => (Number.isFinite(value) ? value.toFixed(5) : '—');

const request = (url, params) => fetch(`${url}?${new URLSearchParams(params)}`).then((res) => {
  if (!res.ok) throw new Error('Request failed');
  return res.json();
});

const describeWeather = (current) => {
  if (!current) return 'Weather unavailable';
  const legend = {
    0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Rime fog',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    71: 'Snow', 80: 'Showers', 95: 'Thunder'
  };
  const label = legend[current.weather_code] || 'Weather';
  return `${label}, ${Math.round(current.temperature_2m)}°C, wind ${Math.round(current.wind_speed_10m)} km/h`;
};

let timer;

const startClock = (timezone) => {
  const update = () => setText('local-time', new Date().toLocaleTimeString('en-US', { timeZone: timezone }));
  update();
  if (timer) clearInterval(timer);
  timer = setInterval(update, 1000);
};

const handleSuccess = async ({ coords }) => {
  setText('latitude', formatCoord(coords.latitude));
  setText('longitude', formatCoord(coords.longitude));

  try {
    const [place, weather] = await Promise.all([
      request('https://nominatim.openstreetmap.org/reverse', {
        lat: coords.latitude,
        lon: coords.longitude,
        format: 'jsonv2'
      }),
      request('https://api.open-meteo.com/v1/forecast', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        current: 'temperature_2m,weather_code,wind_speed_10m'
      })
    ]);

    const timezone = place?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    startClock(timezone);

    const name = place?.address?.city || place?.address?.town || place?.address?.village || place?.address?.suburb || place?.display_name || 'Unknown location';
    setText('location-name', name);
    setText('timezone', timezone);
    setText('weather-summary', describeWeather(weather?.current));
  } catch (error) {
    console.error(error);
    setText('location-name', 'Location unavailable');
    setText('timezone', '—');
    setText('weather-summary', 'Weather unavailable');
  }

  setText('last-updated', new Date().toLocaleString());
};

const handleError = () => alert('Sorry, no position available. Please enable location services.');

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  });
} else {
  alert('Geolocation is not supported by this browser.');
}

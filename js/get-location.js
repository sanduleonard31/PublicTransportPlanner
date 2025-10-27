// Get DOM elements
const latitudeDisplay = document.getElementById("latitude");
const longitudeDisplay = document.getElementById("longitude");

// Request user's location
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      latitudeDisplay.innerHTML = position.coords.latitude;
      longitudeDisplay.innerHTML = position.coords.longitude;
    },
    () => alert("Sorry, no position available.")
  );
} else {
  alert("Geolocation is not supported by this browser.");
}

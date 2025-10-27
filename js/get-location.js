
const latitude = document.getElementById("latitude");
const longitude = document.getElementById("longitude");

function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(success, error);
  } else { 
    x.innerHTML = "Geolocation is not supported by this browser.";
  }
}

function success(position) {
  latitude.innerHTML = position.coords.latitude;
  longitude.innerHTML = position.coords.longitude;
  
}

function error() {
  alert("Sorry, no position available.");
}

getLocation();

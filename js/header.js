document.addEventListener('DOMContentLoaded', function() {
    var headerElement = document.getElementById('header');
    fetch('./header.html')
        .then(function(response) { return response.text(); })
        .then(function(html) { headerElement.innerHTML = html; });
});
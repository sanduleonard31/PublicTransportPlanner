document.addEventListener('DOMContentLoaded', function() {
    var footerElement = document.getElementById('footer');
    fetch('f./ooter.html')
        .then(function(response) { return response.text(); })
        .then(function(html) { footerElement.innerHTML = html; });
});
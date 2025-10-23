document.addEventListener('DOMContentLoaded', function() {
    var footerElement = document.getElementById('footer');
    fetch('footer.html')
        .then(function(response) { return response.text(); })
        .then(function(html) { footerElement.innerHTML = html; });
});
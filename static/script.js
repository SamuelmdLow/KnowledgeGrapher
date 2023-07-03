window.onload = function() {
    initializeDashboardToggle();
}

function initializeDashboardToggle() {
    document.getElementById("toggle-dashboard").addEventListener("click", function(event) {
       event.preventDefault();
       document.getElementById("dashboard-sidebar").classList.toggle("invisible");
    });
}
window.onload = function() {
    initializeDashboardToggle();
}

function initializeDashboardToggle() {
    document.getElementById("toggle-dashboard").addEventListener("click", function(event) {
       event.preventDefault();
       document.getElementById("dashboard-sidebar").classList.toggle("mobile-hidden");
    });
}

function initializeModal() {
    var mo = document.getElementsByClassName("modal-overlay");
    for (let i=0; i<mo.length; i++) {
        mo[i].addEventListener("click", function(event) {
           this.parentElement.classList.add("hidden");
           document.getElementById("modal").classList.add("hidden");
        });
    }
}
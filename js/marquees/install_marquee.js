// js/marquees/install_marquee.js — package channels marquee controller
(function initInstallMarquee() {
  function setupInstallMarquee() {
    const viewport = document.getElementById("install-viewport");
    const grid = document.getElementById("install-grid");
    const btnMarquee = document.getElementById("install-view-marquee");
    const btnGrid = document.getElementById("install-view-grid");

    if (!viewport || !grid) return;

    const originalCards = Array.from(grid.querySelectorAll(".install-card:not([data-clone='true'])"));

    function enableMarquee() {
      viewport.classList.add("marquee-mode");
      if (btnMarquee) {
        btnMarquee.classList.add("active");
        btnMarquee.setAttribute("aria-pressed", "true");
      }
      if (btnGrid) {
        btnGrid.classList.remove("active");
        btnGrid.setAttribute("aria-pressed", "false");
      }
      if (!grid.querySelector("[data-clone='true']")) {
        originalCards.forEach((card) => {
          const clone = card.cloneNode(true);
          clone.setAttribute("data-clone", "true");
          grid.appendChild(clone);
        });
      }
    }

    function enableGrid() {
      viewport.classList.remove("marquee-mode");
      if (btnMarquee) {
        btnMarquee.classList.remove("active");
        btnMarquee.setAttribute("aria-pressed", "false");
      }
      if (btnGrid) {
        btnGrid.classList.add("active");
        btnGrid.setAttribute("aria-pressed", "true");
      }
      grid.querySelectorAll("[data-clone='true']").forEach((el) => el.remove());
    }

    if (btnMarquee) {
      btnMarquee.addEventListener("click", enableMarquee);
    }
    if (btnGrid) {
      btnGrid.addEventListener("click", enableGrid);
    }

    enableMarquee();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupInstallMarquee);
  } else {
    setupInstallMarquee();
  }
})();

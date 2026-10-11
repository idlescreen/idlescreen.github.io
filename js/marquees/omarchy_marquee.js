// js/marquees/omarchy_marquee.js — Omarchy comparison marquee controller
(function initOmarchyMarquee() {
  function setupOmarchyMarquee() {
    const viewport = document.getElementById("omarchy-viewport");
    const track = document.getElementById("omarchy-track");
    const btnMarquee = document.getElementById("omarchy-view-marquee");
    const btnGrid = document.getElementById("omarchy-view-grid");

    if (!viewport || !track) return;

    const originalCards = Array.from(track.children).filter((el) => !el.hasAttribute("data-clone"));

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
      if (!track.querySelector("[data-clone='true']")) {
        originalCards.forEach((card) => {
          const clone = card.cloneNode(true);
          clone.setAttribute("data-clone", "true");
          track.appendChild(clone);
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
      track.querySelectorAll("[data-clone='true']").forEach((el) => el.remove());
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
    document.addEventListener("DOMContentLoaded", setupOmarchyMarquee);
  } else {
    setupOmarchyMarquee();
  }
})();

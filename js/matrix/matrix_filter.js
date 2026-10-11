// js/matrix/matrix_filter.js — search input, category chips, and badge counts
(function initMatrixFilter() {
  function updateFilterCounts() {
    const filterChips = document.querySelectorAll(".filter-chip");
    if (!filterChips.length || typeof SAVERS === "undefined") return;

    filterChips.forEach((chip) => {
      const filterKey = chip.getAttribute("data-filter");
      let baseLabel = chip.getAttribute("data-label");
      if (!baseLabel) {
        baseLabel = chip.textContent.replace(/\s*\(\d+\)/, "").trim();
        chip.setAttribute("data-label", baseLabel);
      }
      if (filterKey === "all") {
        chip.textContent = `${baseLabel} (${SAVERS.length})`;
      } else {
        const count = SAVERS.filter((s) => (s.tags || []).includes(filterKey)).length;
        chip.textContent = `${baseLabel} (${count})`;
      }
    });
  }

  function setupFilters() {
    const filterChips = document.querySelectorAll(".filter-chip");
    const searchInput = document.getElementById("matrix-search");
    const searchClear = document.getElementById("matrix-search-clear");

    filterChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        filterChips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        const activeFilter = chip.getAttribute("data-filter") || "all";
        if (window.setMatrixFilterState) {
          window.setMatrixFilterState(activeFilter, undefined);
        }
        if (window.renderMatrix) {
          window.renderMatrix();
        }
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const val = searchInput.value.trim();
        if (val) {
          filterChips.forEach((c) => c.classList.toggle("active", c.getAttribute("data-filter") === "all"));
          if (window.setMatrixFilterState) {
            window.setMatrixFilterState("all", val);
          }
        } else if (window.setMatrixFilterState) {
          window.setMatrixFilterState(undefined, "");
        }
        if (window.renderMatrix) {
          window.renderMatrix();
        }
      });
    }

    if (searchClear && searchInput) {
      searchClear.addEventListener("click", () => {
        searchInput.value = "";
        if (window.setMatrixFilterState) {
          window.setMatrixFilterState(undefined, "");
        }
        if (window.renderMatrix) {
          window.renderMatrix();
        }
        searchInput.focus();
      });
    }

    updateFilterCounts();
  }

  window.updateFilterCounts = updateFilterCounts;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupFilters);
  } else {
    setupFilters();
  }
})();

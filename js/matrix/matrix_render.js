// js/matrix/matrix_render.js — dual-stream marquee and grid renderer for 38 scenes
(function initMatrixRender() {
  let userViewMode = "marquee";
  let activeFilter = "all";
  let currentSearchQuery = "";

  function setMatrixFilterState(filter, query) {
    if (filter !== undefined) activeFilter = filter;
    if (query !== undefined) currentSearchQuery = query;
  }

  function getMatrixFilterState() {
    return { userViewMode, activeFilter, currentSearchQuery };
  }

  function renderMatrix() {
    const matrixGrid = document.getElementById("matrix-grid");
    const matrixViewport = document.getElementById("matrix-viewport");
    const viewModeMarquee = document.getElementById("view-mode-marquee");
    const viewModeGrid = document.getElementById("view-mode-grid");
    const countBadge = document.getElementById("matrix-count");
    const searchClear = document.getElementById("matrix-search-clear");
    const searchInput = document.getElementById("matrix-search");

    if (!matrixGrid || typeof SAVERS === "undefined" || !window.buildMatrixCard) return;

    const query = (currentSearchQuery || (searchInput ? searchInput.value : "")).trim().toLowerCase();
    const isFiltered = query.length > 0 || activeFilter !== "all";

    if (userViewMode === "marquee" && !isFiltered) {
      if (matrixViewport) matrixViewport.classList.add("marquee-mode");
      if (viewModeMarquee) {
        viewModeMarquee.classList.add("active");
        viewModeMarquee.setAttribute("aria-pressed", "true");
      }
      if (viewModeGrid) {
        viewModeGrid.classList.remove("active");
        viewModeGrid.setAttribute("aria-pressed", "false");
      }
      matrixGrid.innerHTML = "";

      const stream1 = document.createElement("div");
      stream1.className = "marquee-stream stream-left";
      const stream2 = document.createElement("div");
      stream2.className = "marquee-stream stream-right";

      const half = Math.ceil(SAVERS.length / 2);
      const group1 = SAVERS.slice(0, half);
      const group2 = SAVERS.slice(half);

      // Stream 1 original + clones for seamless infinite scroll
      group1.forEach((s, i) => stream1.appendChild(window.buildMatrixCard(s, i)));
      group1.forEach((s, i) => stream1.appendChild(window.buildMatrixCard(s, i, true)));

      // Stream 2 original + clones for seamless infinite scroll
      group2.forEach((s, i) => stream2.appendChild(window.buildMatrixCard(s, half + i)));
      group2.forEach((s, i) => stream2.appendChild(window.buildMatrixCard(s, half + i, true)));

      matrixGrid.appendChild(stream1);
      matrixGrid.appendChild(stream2);

      if (countBadge) countBadge.textContent = `[ ${SAVERS.length} / ${SAVERS.length} SCENES ]`;
      if (searchClear) searchClear.hidden = true;
    } else {
      if (matrixViewport) matrixViewport.classList.remove("marquee-mode");
      if (viewModeMarquee) {
        viewModeMarquee.classList.toggle("active", userViewMode === "marquee" && !isFiltered);
        viewModeMarquee.setAttribute("aria-pressed", userViewMode === "marquee" && !isFiltered ? "true" : "false");
      }
      if (viewModeGrid) {
        viewModeGrid.classList.toggle("active", userViewMode === "grid" || isFiltered);
        viewModeGrid.setAttribute("aria-pressed", userViewMode === "grid" || isFiltered ? "true" : "false");
      }
      matrixGrid.innerHTML = "";

      let visibleCount = 0;
      SAVERS.forEach((s, idx) => {
        const name = s.name.toLowerCase();
        const id = s.id.toLowerCase();
        const sub = (s.sub || "").toLowerCase();
        const desc = (s.desc || "").toLowerCase();
        const tags = (s.tags || []).join(" ").toLowerCase();
        const math = (s.math || "").toLowerCase();
        const num = s.num.toLowerCase();

        const matchesQuery = !query ||
          name.includes(query) ||
          id.includes(query) ||
          sub.includes(query) ||
          desc.includes(query) ||
          tags.includes(query) ||
          math.includes(query) ||
          num.includes(query);

        let matchesFilter = true;
        if (activeFilter !== "all") {
          matchesFilter = tags.includes(activeFilter);
        }

        const card = window.buildMatrixCard(s, idx);
        if (matchesQuery && matchesFilter) {
          card.style.display = "";
          visibleCount++;
        } else {
          card.style.display = "none";
        }
        matrixGrid.appendChild(card);
      });

      if (countBadge) countBadge.textContent = `[ ${visibleCount} / ${SAVERS.length} SCENES ]`;
      if (searchClear) searchClear.hidden = !query;
    }

    if (window.updateFilterCounts) {
      window.updateFilterCounts();
    }
  }

  function setupViewModeListeners() {
    const viewModeMarquee = document.getElementById("view-mode-marquee");
    const viewModeGrid = document.getElementById("view-mode-grid");
    const searchInput = document.getElementById("matrix-search");

    if (viewModeMarquee) {
      viewModeMarquee.addEventListener("click", () => {
        userViewMode = "marquee";
        if (searchInput) searchInput.value = "";
        activeFilter = "all";
        currentSearchQuery = "";
        const filterChips = document.querySelectorAll(".filter-chip");
        filterChips.forEach((c) => c.classList.toggle("active", c.getAttribute("data-filter") === "all"));
        renderMatrix();
      });
    }
    if (viewModeGrid) {
      viewModeGrid.addEventListener("click", () => {
        userViewMode = "grid";
        renderMatrix();
      });
    }
  }

  window.renderMatrix = renderMatrix;
  window.setMatrixFilterState = setMatrixFilterState;
  window.getMatrixFilterState = getMatrixFilterState;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setupViewModeListeners();
      renderMatrix();
    });
  } else {
    setupViewModeListeners();
    renderMatrix();
  }
})();

// js/matrix/matrix_render.js — dual-stream marquee and grid renderer for 48 scenes
(function initMatrixRender() {
  let userViewMode = "marquee";
  let activeFilter = "all";
  let currentSearchQuery = "";
  let delegationAttached = false;

  function setMatrixFilterState(filter, query) {
    if (filter !== undefined) activeFilter = filter;
    if (query !== undefined) currentSearchQuery = query;
  }

  function getMatrixFilterState() {
    return { userViewMode, activeFilter, currentSearchQuery };
  }

  function setupEventDelegation(matrixGrid) {
    if (delegationAttached || !matrixGrid) return;
    matrixGrid.addEventListener("click", (e) => {
      const prevBtn = e.target.closest(".matrix-btn-preview");
      if (prevBtn) {
        const sid = prevBtn.getAttribute("data-id");
        let idx = -1;
        if (sid && typeof SAVERS !== "undefined") {
          idx = SAVERS.findIndex((s) => s.id === sid);
        }
        if (idx === -1) {
          idx = parseInt(prevBtn.getAttribute("data-idx"), 10);
        }
        if (idx >= 0 && window.selectShowcaseScene) {
          window.selectShowcaseScene(idx);
        }
        const showcaseEl = document.getElementById("showcase");
        if (showcaseEl) showcaseEl.scrollIntoView({ behavior: "smooth" });
        return;
      }

      const copyBtn = e.target.closest(".matrix-btn-copy");
      if (copyBtn) {
        const cmd = copyBtn.getAttribute("data-cmd");
        const showDone = () => {
          const orig = copyBtn.textContent;
          copyBtn.textContent = "[ COPIED! ]";
          copyBtn.classList.add("copied");
          setTimeout(() => {
            copyBtn.textContent = orig;
            copyBtn.classList.remove("copied");
          }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(cmd).then(showDone).catch(() => {
            if (typeof fallbackCopy === "function") fallbackCopy(cmd, showDone);
            else showDone();
          });
        } else if (typeof fallbackCopy === "function") {
          fallbackCopy(cmd, showDone);
        } else {
          showDone();
        }
      }
    });
    delegationAttached = true;
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
    setupEventDelegation(matrixGrid);

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

      const hasStreams = matrixGrid.querySelector(".marquee-stream");
      if (!hasStreams) {
        matrixGrid.innerHTML = "";
        const stream1 = document.createElement("div");
        stream1.className = "marquee-stream stream-left";
        const stream2 = document.createElement("div");
        stream2.className = "marquee-stream stream-right";

        const half = Math.ceil(SAVERS.length / 2);
        const group1 = SAVERS.slice(0, half);
        const group2 = SAVERS.slice(half);

        group1.forEach((s, i) => stream1.appendChild(window.buildMatrixCard(s, i)));
        group1.forEach((s, i) => stream1.appendChild(window.buildMatrixCard(s, i, true)));
        group2.forEach((s, i) => stream2.appendChild(window.buildMatrixCard(s, half + i)));
        group2.forEach((s, i) => stream2.appendChild(window.buildMatrixCard(s, half + i, true)));

        matrixGrid.appendChild(stream1);
        matrixGrid.appendChild(stream2);
      } else {
        matrixGrid.querySelectorAll(".stream-left, .stream-right").forEach((el) => {
          el.style.animationPlayState = "";
        });
      }
      if (window.idleSyncMarqueeState) window.idleSyncMarqueeState();

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

      const hasStreams = matrixGrid.querySelector(".marquee-stream");
      const cardMap = new Map();
      if (!hasStreams) {
        Array.from(matrixGrid.children).forEach((c) => {
          if (c.dataset && c.dataset.id) cardMap.set(c.dataset.id, c);
        });
      }
      const needsFullRebuild = hasStreams || cardMap.size !== SAVERS.length || matrixGrid.children.length !== SAVERS.length;
      if (needsFullRebuild) {
        matrixGrid.innerHTML = "";
        cardMap.clear();
        SAVERS.forEach((s, idx) => {
          const card = window.buildMatrixCard(s, idx);
          matrixGrid.appendChild(card);
          cardMap.set(s.id, card);
        });
      }

      let visibleCount = 0;
      SAVERS.forEach((s) => {
        const card = cardMap.get(s.id);
        if (!card) return;
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

        if (matchesQuery && matchesFilter) {
          card.style.display = "";
          visibleCount++;
        } else {
          card.style.display = "none";
        }
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

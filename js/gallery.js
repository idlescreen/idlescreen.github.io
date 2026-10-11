// js/gallery.js — dynamic 3-scene random showcase, 37-scene matrix, and tri-rotation demo
(function initGallery() {
  if (typeof SAVERS === "undefined" || !SAVERS.length) return;

  // ----------------------------------------------------
  // 1. Featured 3 Random Scenes Showcase
  // ----------------------------------------------------
  let featuredIndices = [];
  let currentSlot = 0; // 0, 1, 2

  function pickRandomDistinct(count, max, exclude = []) {
    const pool = Array.from({ length: max }, (_, i) => i).filter((idx) => !exclude.includes(idx));
    const chosen = [];
    while (chosen.length < count && pool.length > 0) {
      const rIdx = Math.floor(Math.random() * pool.length);
      chosen.push(pool.splice(rIdx, 1)[0]);
    }
    // Fallback if pool was smaller than count
    if (chosen.length < count) {
      for (let i = 0; i < max && chosen.length < count; i++) {
        if (!chosen.includes(i)) chosen.push(i);
      }
    }
    return chosen;
  }

  function rerollFeatured() {
    // Pick 3 random distinct scenes, trying to avoid exact duplicates of current set
    featuredIndices = pickRandomDistinct(3, SAVERS.length, featuredIndices);
    currentSlot = 0;
    renderSlots();
    loadSlot(0);
  }

  function renderSlots() {
    const slotsContainer = document.getElementById("showcase-slots");
    if (!slotsContainer) return;
    slotsContainer.innerHTML = "";

    featuredIndices.forEach((sceneIdx, slotIdx) => {
      const scene = SAVERS[sceneIdx];
      if (!scene) return;
      const btn = document.createElement("button");
      btn.className = "showcase-slot" + (slotIdx === currentSlot ? " active" : "");
      btn.setAttribute("aria-label", `Featured scene ${slotIdx + 1}: ${scene.name}`);
      btn.innerHTML = `<span class="slot-num">${scene.num}</span><span class="slot-name">${scene.name}</span>`;
      btn.addEventListener("click", () => {
        loadSlot(slotIdx);
      });
      slotsContainer.appendChild(btn);
    });
  }

  function populateQuickPicker() {
    const picker = document.getElementById("quick-scene-select");
    if (!picker) return;
    picker.innerHTML = '<option value="" disabled selected>— Jump to any of the 37 scenes —</option>';
    SAVERS.forEach((s, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = `[${s.num}] ${s.name} // ${s.sub}`;
      picker.appendChild(opt);
    });
    picker.addEventListener("change", (e) => {
      const selectedIdx = parseInt(e.target.value, 10);
      if (!isNaN(selectedIdx) && SAVERS[selectedIdx]) {
        selectScene(selectedIdx);
      }
    });
  }

  function selectScene(idx) {
    const existingSlot = featuredIndices.indexOf(idx);
    if (existingSlot !== -1) {
      loadSlot(existingSlot);
    } else {
      featuredIndices[currentSlot] = idx;
      renderSlots();
      loadSlot(currentSlot);
    }
  }

  function loadSlot(slotIdx) {
    currentSlot = slotIdx;
    const sceneIdx = featuredIndices[slotIdx];
    const s = SAVERS[sceneIdx];
    if (!s) return;

    // Synchronize quick picker dropdown value
    const picker = document.getElementById("quick-scene-select");
    if (picker) {
      picker.value = sceneIdx;
    }

    // Update active slot styling
    const slotBtns = document.querySelectorAll(".showcase-slot");
    slotBtns.forEach((btn, idx) => {
      btn.classList.toggle("active", idx === slotIdx);
    });

    // Update showcase info
    const idxEl = document.getElementById("showcase-idx");
    const nameEl = document.getElementById("showcase-name");
    const subEl = document.getElementById("showcase-sub");
    const descEl = document.getElementById("showcase-desc");
    const frameEl = document.getElementById("metric-frame");
    const cpuEl = document.getElementById("metric-cpu");
    const mathEl = document.getElementById("metric-math");
    const cmdEl = document.getElementById("showcase-cmd");
    const tagsEl = document.getElementById("showcase-tags");
    const srcEl = document.getElementById("showcase-src");
    const videoEl = document.getElementById("showcase-video");

    if (idxEl) idxEl.textContent = `[ SCENE ${s.num} / 37 ]`;
    if (nameEl) nameEl.textContent = s.name;
    if (subEl) subEl.textContent = `// ${s.sub}`;
    if (descEl) descEl.textContent = s.desc;
    if (frameEl) frameEl.textContent = s.frame;
    if (cpuEl) cpuEl.textContent = s.cpu;
    if (mathEl) mathEl.textContent = s.math;

    if (cmdEl) {
      const cmdText = `idlescreen preview ${s.id}`;
      cmdEl.innerHTML = `&gt; ${cmdText} <span class="cmd-copy-hint">[COPY]</span>`;
      cmdEl.onclick = () => {
        if (typeof copyText === "function") {
          copyText(cmdText, cmdEl);
        } else {
          const showHint = () => {
            const hint = cmdEl.querySelector(".cmd-copy-hint");
            if (hint) {
              const orig = hint.textContent;
              hint.textContent = "[COPIED!]";
              setTimeout(() => { hint.textContent = orig; }, 1500);
            }
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(cmdText).then(showHint).catch(() => {
              if (typeof fallbackCopy === "function") fallbackCopy(cmdText, showHint);
              else showHint();
            });
          } else if (typeof fallbackCopy === "function") {
            fallbackCopy(cmdText, showHint);
          } else {
            showHint();
          }
        }
      };
    }

    if (tagsEl) {
      tagsEl.innerHTML = "";
      (s.tags || []).forEach((t) => {
        const span = document.createElement("span");
        span.className = "saver-tag";
        span.textContent = "#" + t;
        tagsEl.appendChild(span);
      });
    }

    if (srcEl) {
      srcEl.href = s.sourceUrl || `https://github.com/idlescreen/idlescreen/blob/master/crates/idlescreen/src/ascii/scenes/${s.id}.rs`;
      srcEl.textContent = s.sourceLabel || `[ SOURCE: ${s.id}.rs ↗ ]`;
    }

    window.idleCurrentSceneId = s.id;
    if (window.idleSaverRunScene) {
      window.idleSaverRunScene(s.id);
    }

    if (videoEl) {
      const targetSrc = "assets/videos/ascii.mp4";
      if (videoEl.getAttribute("data-current-src") !== targetSrc) {
        videoEl.setAttribute("data-current-src", targetSrc);
        videoEl.src = targetSrc;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduced && s.id !== "beams") {
          videoEl.play().catch(() => {});
        }
      }
    }
  }

  // Prev / Next stage navigation
  const prevBtn = document.getElementById("stage-prev");
  const nextBtn = document.getElementById("stage-next");
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      const next = (currentSlot - 1 + featuredIndices.length) % featuredIndices.length;
      loadSlot(next);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const next = (currentSlot + 1) % featuredIndices.length;
      loadSlot(next);
    });
  }

  // Keyboard navigation for featured showcase
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === "ArrowLeft") {
      const next = (currentSlot - 1 + featuredIndices.length) % featuredIndices.length;
      loadSlot(next);
    } else if (e.key === "ArrowRight") {
      const next = (currentSlot + 1) % featuredIndices.length;
      loadSlot(next);
    }
  });

  // Reroll button
  const rerollBtn = document.getElementById("reroll-btn");
  if (rerollBtn) {
    rerollBtn.addEventListener("click", () => {
      rerollBtn.classList.add("spinning");
      rerollFeatured();
      setTimeout(() => rerollBtn.classList.remove("spinning"), 300);
    });
  }

  // ----------------------------------------------------
  // 2. The 37 In-Tree ASCII Scenes Matrix & Catalog
  // ----------------------------------------------------
  const matrixGrid = document.getElementById("matrix-grid");
  const searchInput = document.getElementById("matrix-search");
  const searchClear = document.getElementById("matrix-search-clear");
  const countBadge = document.getElementById("matrix-count");
  const filterChips = document.querySelectorAll(".filter-chip");
  let activeFilter = "all";

  const matrixViewport = document.getElementById("matrix-viewport");
  const viewModeMarquee = document.getElementById("view-mode-marquee");
  const viewModeGrid = document.getElementById("view-mode-grid");
  let userViewMode = "marquee";

  function updateFilterCounts() {
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

  function buildCard(s, idx, isClone = false) {
    const card = document.createElement("div");
    card.className = "matrix-card" + (isClone ? " matrix-card-clone" : "");
    if (isClone) {
      card.setAttribute("data-clone", "true");
      card.setAttribute("aria-hidden", "true");
    }
    card.dataset.id = s.id;
    card.dataset.num = s.num;
    card.dataset.name = s.name.toLowerCase();
    card.dataset.sub = (s.sub || "").toLowerCase();
    card.dataset.desc = (s.desc || "").toLowerCase();
    card.dataset.tags = (s.tags || []).join(" ").toLowerCase();
    card.dataset.math = (s.math || "").toLowerCase();

    card.innerHTML = `
      <div class="matrix-card-top">
        <span class="matrix-card-num">[ ${s.num} ]</span>
        <span class="matrix-card-badge">${s.frame}</span>
      </div>
      <h3 class="matrix-card-title">${s.name}</h3>
      <p class="matrix-card-sub">// ${s.sub}</p>
      <p class="matrix-card-desc">${s.desc}</p>
      <div class="matrix-card-math-box">
        <span class="math-label">PHYSICS:</span> <span class="math-val">${s.math}</span>
      </div>
      <div class="matrix-card-actions">
        <button class="matrix-btn matrix-btn-preview" data-idx="${idx}" title="Preview in showcase stage above">[ PREVIEW ]</button>
        <button class="matrix-btn matrix-btn-copy" data-cmd="idlescreen preview ${s.id}" title="Copy preview command">[ COPY CMD ]</button>
        <a class="matrix-btn matrix-btn-src" href="${s.sourceUrl}" target="_blank" rel="noopener noreferrer" title="View Rust source code">[ .rs ↗ ]</a>
      </div>
    `;

    // Preview button click
    const prevBtnEl = card.querySelector(".matrix-btn-preview");
    if (prevBtnEl) {
      prevBtnEl.addEventListener("click", () => {
        selectScene(idx);
        const showcaseEl = document.getElementById("showcase");
        if (showcaseEl) {
          showcaseEl.scrollIntoView({ behavior: "smooth" });
        }
      });
    }

    // Copy button click with robust fallback
    const copyBtn = card.querySelector(".matrix-btn-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
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
            if (typeof fallbackCopy === "function") {
              fallbackCopy(cmd, showDone);
            } else {
              showDone();
            }
          });
        } else if (typeof fallbackCopy === "function") {
          fallbackCopy(cmd, showDone);
        } else {
          showDone();
        }
      });
    }

    return card;
  }

  function renderMatrix() {
    if (!matrixGrid) return;
    const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
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
      group1.forEach((s, i) => stream1.appendChild(buildCard(s, i)));
      group1.forEach((s, i) => stream1.appendChild(buildCard(s, i, true)));

      // Stream 2 original + clones for seamless infinite scroll
      group2.forEach((s, i) => stream2.appendChild(buildCard(s, half + i)));
      group2.forEach((s, i) => stream2.appendChild(buildCard(s, half + i, true)));

      matrixGrid.appendChild(stream1);
      matrixGrid.appendChild(stream2);

      if (countBadge) countBadge.textContent = `[ 37 / 37 SCENES ]`;
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

        const card = buildCard(s, idx);
        if (matchesQuery && matchesFilter) {
          card.style.display = "";
          visibleCount++;
        } else {
          card.style.display = "none";
        }
        matrixGrid.appendChild(card);
      });

      if (countBadge) countBadge.textContent = `[ ${visibleCount} / 37 SCENES ]`;
      if (searchClear) searchClear.hidden = !query;
    }

    updateFilterCounts();
  }

  // Filter chips click
  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      filterChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeFilter = chip.getAttribute("data-filter") || "all";
      renderMatrix();
    });
  });

  // Search input events
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      if (searchInput.value.trim() && activeFilter !== "all") {
        filterChips.forEach((c) => c.classList.toggle("active", c.getAttribute("data-filter") === "all"));
        activeFilter = "all";
      }
      renderMatrix();
    });
  }
  if (searchClear) {
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      renderMatrix();
      searchInput.focus();
    });
  }

  // View mode switcher events
  if (viewModeMarquee) {
    viewModeMarquee.addEventListener("click", () => {
      userViewMode = "marquee";
      if (searchInput) searchInput.value = "";
      activeFilter = "all";
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

  // Initialize
  populateQuickPicker();
  rerollFeatured();
  renderMatrix();

})();

// ----------------------------------------------------
// 3. Dynamic ASCII Tri-Rotation Engine Demo
// ----------------------------------------------------
(function initTriRotationDemo() {
  const TRI_DATA = {
    os: [
      "Fedora Linux 41 (Workstation)",
      "Arch Linux (Rolling Release)",
      "Debian GNU/Linux 13 (Trixie)",
      "Ubuntu 24.04.1 LTS (Noble)",
      "Alpine Linux v3.21 (musl)",
      "openSUSE Tumbleweed",
      "Void Linux (runit)",
      "Gentoo Linux (~amd64)"
    ],
    de: [
      "GNOME 47.2 (Mutter IdleMonitor)",
      "KDE Plasma 6.2 (KWin Wayland)",
      "COSMIC Desktop (cosmic-comp)",
      "Hyprland (ext-idle-notify-v1)",
      "Sway (wlroots layer-shell)",
      "Wayfire 0.9 (3D Wayland)",
      "River (Dynamic Tiling)",
      "Labwc (wlroots Stacked)"
    ],
    kernel: [
      "Linux 6.12.11-arch1-1",
      "Linux 6.11.0-17-generic",
      "Linux 6.12.8-200.fc41.x86_64",
      "Linux 6.6.70-lts (longterm)",
      "Linux 6.13.0-rc6 (zen-gaming)",
      "Linux 6.1.124-hardened"
    ]
  };

  const MODES = ["os", "de", "kernel"];
  let currentModeIdx = 0;
  let subIndices = { os: 0, de: 0, kernel: 0 };
  let autoTimer = null;
  let isAuto = true;

  const modeEl = document.getElementById("tri-rot-mode");
  const textEl = document.getElementById("tri-rot-text");
  const autoBtn = document.getElementById("tri-rot-auto");

  function updateDisplay(animate = true) {
    const mode = MODES[currentModeIdx];
    const modeLabels = { os: "HOST OS", de: "DESKTOP ENV", kernel: "LINUX KERNEL" };
    document.querySelectorAll(".tri-rot-state, #tri-rot-mode").forEach((el) => {
      el.textContent = modeLabels[mode];
    });

    // Update active button styling
    const modeBtns = document.querySelectorAll(".tri-rot-btn[data-mode]");
    modeBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-mode") === mode);
    });

    const targetText = TRI_DATA[mode][subIndices[mode]];
    const textEls = document.querySelectorAll(".tri-rot-text, #tri-rot-text");

    if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      textEls.forEach((el) => { el.textContent = targetText; });
      return;
    }

    textEls.forEach((el) => { el.style.opacity = "0.4"; });
    setTimeout(() => {
      textEls.forEach((el) => {
        el.textContent = targetText;
        el.style.opacity = "1";
      });
    }, 120);
  }

  function advanceCycle() {
    currentModeIdx = (currentModeIdx + 1) % MODES.length;
    const mode = MODES[currentModeIdx];
    subIndices[mode] = (subIndices[mode] + 1) % TRI_DATA[mode].length;
    updateDisplay();
  }

  function setMode(mode) {
    const idx = MODES.indexOf(mode);
    if (idx !== -1) {
      currentModeIdx = idx;
      subIndices[mode] = (subIndices[mode] + 1) % TRI_DATA[mode].length;
      updateDisplay();
    }
  }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(advanceCycle, 3200);
    document.querySelectorAll(".tri-rot-btn-auto, #tri-rot-auto").forEach((b) => {
      b.textContent = "CYCLE [AUTO: ON]";
    });
    isAuto = true;
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
    document.querySelectorAll(".tri-rot-btn-auto, #tri-rot-auto").forEach((b) => {
      b.textContent = "CYCLE [AUTO: OFF]";
    });
    isAuto = false;
  }

  window.cycleTriRotation = function(mode) {
    setMode(mode);
  };

  window.toggleTriRotationAuto = function() {
    if (isAuto) {
      stopAuto();
    } else {
      startAuto();
    }
  };

  updateDisplay(false);
  startAuto();
})();

// ========================================================
// Installation Marquee Controller
// ========================================================
(function initInstallMarquee() {
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
})();

// ========================================================
// Ecosystem Marquee Controller
// ========================================================
(function initEcosystemMarquee() {
  const viewport = document.getElementById("ecosystem-viewport");
  const grid = document.getElementById("ecosystem-grid");
  const btnMarquee = document.getElementById("ecosystem-view-marquee");
  const btnGrid = document.getElementById("ecosystem-view-grid");

  if (!viewport || !grid) return;

  const originalCards = Array.from(grid.querySelectorAll(".eco-card:not([data-clone='true'])"));

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
})();

// ========================================================
// Omarchy Philosophy Marquee Controller
// ========================================================
(function initOmarchyMarquee() {
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
})();




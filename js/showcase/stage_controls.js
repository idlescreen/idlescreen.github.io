// js/showcase/stage_controls.js — 48 in-tree scenes marquee controller
(function initStageControls() {
  let currentIdx = 0;

  function getSavers() {
    return window.SAVERS || (typeof SAVERS !== "undefined" ? SAVERS : []);
  }

  function renderMarquee() {
    const track = document.getElementById("scenes-marquee-track");
    const savers = getSavers();
    if (!track || !savers.length) return;

    track.innerHTML = "";

    // Render twice for continuous seamless wrap-around marquee scroll
    for (let pass = 0; pass < 2; pass++) {
      savers.forEach((s, idx) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "scene-chip" + (idx === currentIdx ? " active" : "");
        chip.dataset.sceneIdx = String(idx);
        chip.setAttribute("aria-label", `Scene ${s.num}: ${s.name}`);
        chip.innerHTML = `<span class="scene-chip-num">[ ${s.num} ]</span><span class="scene-chip-name">${s.name}</span>`;
        chip.addEventListener("click", () => {
          selectScene(idx);
          chip.blur();
        });
        track.appendChild(chip);
      });
    }
  }

  function updateActiveChips(idx) {
    const chips = document.querySelectorAll(".scene-chip");
    chips.forEach((chip) => {
      const cIdx = parseInt(chip.dataset.sceneIdx, 10);
      chip.classList.toggle("active", cIdx === idx);
    });
  }

  function selectScene(idx) {
    const savers = getSavers();
    if (!savers.length) return;
    if (idx < 0) idx = savers.length - 1;
    if (idx >= savers.length) idx = 0;

    currentIdx = idx;
    const s = savers[idx];
    if (!s) return;

    updateActiveChips(idx);

    const idxEl = document.getElementById("showcase-idx");
    const nameEl = document.getElementById("showcase-name");
    const subEl = document.getElementById("showcase-sub");
    const canvasEl = document.getElementById("showcase-canvas");
    const videoEl = document.getElementById("showcase-video");

    const totalPad = savers.length < 10 ? "0" + savers.length : savers.length;
    if (idxEl) idxEl.textContent = `[ SCENE ${s.num} / ${totalPad} ]`;
    if (nameEl) nameEl.textContent = s.name;
    if (subEl) subEl.textContent = `// ${s.sub}`;

    window.idleCurrentSceneId = s.id;
    if (window.idleSaverRunScene) {
      window.idleSaverRunScene(s.id);
    }

    if (canvasEl) {
      canvasEl.hidden = false;
      canvasEl.style.display = "block";
    }
    if (videoEl) {
      videoEl.pause();
      videoEl.style.display = "none";
      videoEl.style.visibility = "hidden";
    }

    if (window.idleFullscreenSyncScene) {
      window.idleFullscreenSyncScene(idx);
    }
  }

  function setupControls() {
    const prevBtn = document.getElementById("stage-prev");
    const nextBtn = document.getElementById("stage-next");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        const savers = getSavers();
        if (!savers.length) return;
        const next = (currentIdx - 1 + savers.length) % savers.length;
        selectScene(next);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        const savers = getSavers();
        if (!savers.length) return;
        const next = (currentIdx + 1) % savers.length;
        selectScene(next);
      });
    }

    document.addEventListener("keydown", (e) => {
      const tag = document.activeElement ? document.activeElement.tagName : "";
      if (e.defaultPrevented || ["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
      if (document.activeElement && (document.activeElement.isContentEditable || ["PRE", "CODE"].includes(tag))) return;
      if (document.getElementById("screensaver-fullscreen") &&
          document.getElementById("screensaver-fullscreen").style.display !== "none") {
        return; // Handled by fullscreen mode
      }
      const savers = getSavers();
      if (!savers.length) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const next = (currentIdx - 1 + savers.length) % savers.length;
        selectScene(next);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = (currentIdx + 1) % savers.length;
        selectScene(next);
      }
    });

    renderMarquee();
    selectScene(0);
  }

  window.selectShowcaseScene = selectScene;
  window.getCurrentShowcaseIndex = function () {
    return currentIdx;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupControls);
  } else {
    setupControls();
  }
})();

// js/showcase/fullscreen.js — dedicated full-monitor screensaver engine
(function initFullscreenScreensaver() {
  let isRunning = false;
  let autoCycle = true;
  let currentIdx = 0;
  let rafId = 0;
  let cycleTimer = null;
  let idleTimer = null;
  let overlay = null;
  let canvas = null;
  let ctx = null;

  function getSavers() {
    return window.SAVERS || (typeof SAVERS !== "undefined" ? SAVERS : []);
  }

  function createOverlay() {
    overlay = document.getElementById("screensaver-fullscreen");
    if (overlay) {
      canvas = document.getElementById("fullscreen-canvas");
      ctx = canvas ? canvas.getContext("2d") : null;
      return;
    }

    overlay = document.createElement("div");
    overlay.className = "screensaver-fullscreen";
    overlay.id = "screensaver-fullscreen";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.display = "none";

    overlay.innerHTML = `
      <canvas class="fullscreen-canvas" id="fullscreen-canvas"></canvas>
      <div class="fullscreen-hud" id="fullscreen-hud">
        <div class="fullscreen-hud-info">
          <span class="fullscreen-hud-idx" id="fullscreen-hud-idx">[ SCENE 01 / 48 ]</span>
          <span class="fullscreen-hud-name" id="fullscreen-hud-name">FIREWORKS</span>
          <span class="fullscreen-hud-sub" id="fullscreen-hud-sub">// Aerial Pyrotechnic Bursts</span>
        </div>
        <div class="fullscreen-hud-actions">
          <button type="button" class="fullscreen-hud-btn" id="fs-prev" aria-label="Previous scene">◀</button>
          <button type="button" class="fullscreen-hud-btn" id="fs-cycle" aria-label="Toggle auto-cycle">[ ⟳ AUTO: ON ]</button>
          <button type="button" class="fullscreen-hud-btn" id="fs-next" aria-label="Next scene">▶</button>
          <button type="button" class="fullscreen-hud-btn fullscreen-hud-exit" id="fs-exit" aria-label="Exit fullscreen">[ ✕ EXIT ]</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    canvas = document.getElementById("fullscreen-canvas");
    ctx = canvas ? canvas.getContext("2d") : null;

    document.getElementById("fs-prev").addEventListener("click", () => switchScene(-1, true));
    document.getElementById("fs-next").addEventListener("click", () => switchScene(1, true));
    document.getElementById("fs-exit").addEventListener("click", closeScreensaver);

    const cycleBtn = document.getElementById("fs-cycle");
    cycleBtn.addEventListener("click", () => {
      autoCycle = !autoCycle;
      cycleBtn.textContent = autoCycle ? "[ ⟳ AUTO: ON ]" : "[ ⟳ AUTO: OFF ]";
      resetCycleTimer();
    });

    const hud = document.getElementById("fullscreen-hud");
    if (hud) {
      hud.addEventListener("pointerenter", () => {
        if (idleTimer) clearTimeout(idleTimer);
      });
      hud.addEventListener("pointerleave", onUserActivity);
    }

    const wakeEvents = ["mousemove", "pointermove", "touchstart", "keydown"];
    wakeEvents.forEach((ev) => overlay.addEventListener(ev, onUserActivity, { passive: true }));
  }

  function resize() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  }

  function updateHud() {
    const savers = getSavers();
    const s = savers[currentIdx];
    if (!s) return;

    const idxEl = document.getElementById("fullscreen-hud-idx");
    const nameEl = document.getElementById("fullscreen-hud-name");
    const subEl = document.getElementById("fullscreen-hud-sub");

    const totalPad = savers.length < 10 ? "0" + savers.length : savers.length;
    if (idxEl) idxEl.textContent = `[ SCENE ${s.num} / ${totalPad} ]`;
    if (nameEl) nameEl.textContent = s.name;
    if (subEl) subEl.textContent = `// ${s.sub}`;
  }

  function switchScene(deltaOrIdx, isRelative = false) {
    const savers = getSavers();
    if (!savers.length) return;

    if (isRelative) {
      currentIdx = (currentIdx + deltaOrIdx + savers.length) % savers.length;
    } else {
      currentIdx = (deltaOrIdx + savers.length) % savers.length;
    }

    updateHud();
    resetCycleTimer();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) render(performance.now());
  }

  function resetCycleTimer() {
    if (cycleTimer) clearInterval(cycleTimer);
    if (!autoCycle || !isRunning) return;
    cycleTimer = setInterval(() => {
      switchScene(1, true);
    }, 15000);
  }

  function onUserActivity() {
    if (!isRunning || !overlay) return;
    overlay.classList.remove("hud-hidden");
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (isRunning) overlay.classList.add("hud-hidden");
    }, 2500);
  }

  function render(t) {
    if (!isRunning || !ctx || !canvas) return;
    const savers = getSavers();
    const s = savers[currentIdx];
    const w = canvas.width;
    const h = canvas.height;
    const acc = window.idleCurrentAccent || [255, 176, 0];

    if (s && window.IdleSceneSim) {
      window.IdleSceneSim.render(ctx, w, h, t, s.id, acc);
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && isRunning) {
      rafId = requestAnimationFrame(render);
    }
  }

  function openScreensaver() {
    createOverlay();
    if (!overlay) return;

    if (window.getCurrentShowcaseIndex) {
      currentIdx = window.getCurrentShowcaseIndex();
    }

    isRunning = true;
    overlay.style.display = "flex";
    overlay.setAttribute("aria-hidden", "false");
    resize();
    updateHud();
    if (window.idleSaverSetPaused) {
      window.idleSaverSetPaused(true);
    }

    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("keydown", onKeyDown);

    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    onUserActivity();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) resetCycleTimer();
    render(performance.now());
  }

  function closeScreensaver() {
    if (!isRunning) return;
    isRunning = false;

    if (rafId) cancelAnimationFrame(rafId);
    if (cycleTimer) clearInterval(cycleTimer);
    if (idleTimer) clearTimeout(idleTimer);

    window.removeEventListener("resize", resize);
    document.removeEventListener("keydown", onKeyDown);

    if (overlay) {
      overlay.style.display = "none";
      overlay.setAttribute("aria-hidden", "true");
      overlay.classList.remove("hud-hidden");
    }

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    if (window.idleSaverSetPaused) {
      window.idleSaverSetPaused(false);
    }

    if (window.selectShowcaseScene) {
      window.selectShowcaseScene(currentIdx);
    }
  }

  function onKeyDown(e) {
    if (!isRunning) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeScreensaver();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      switchScene(-1, true);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      switchScene(1, true);
    }
  }

  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && isRunning) {
      closeScreensaver();
    }
  });

  window.idleFullscreenSyncScene = function (idx) {
    if (isRunning) switchScene(idx, false);
  };

  function setupTriggers() {
    const btn = document.getElementById("btn-fullscreen-saver");
    if (btn) btn.addEventListener("click", openScreensaver);

    const mBtn = document.getElementById("mobile-btn-fullscreen-saver");
    if (mBtn) mBtn.addEventListener("click", openScreensaver);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupTriggers);
  } else {
    setupTriggers();
  }
})();

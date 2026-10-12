// js/showcase/fullscreen.js — dedicated full-monitor screensaver demo engine
(function initFullscreenScreensaver() {
  let isRunning = false, currentIdx = 0, launchTime = 0;
  let cycleTimer = null, hudTimer = null;
  let overlay = null, canvas = null, ctx = null;
  let initPointerX = -1, initPointerY = -1;
  const CYCLE_MS = 4000;
  const IMMUNITY_MS = 400;

  function getSavers() {
    return window.SAVERS || (typeof SAVERS !== "undefined" ? SAVERS : []);
  }

  function scheduleHudHide(delay = 2500) {
    if (hudTimer) clearTimeout(hudTimer);
    if (!isRunning || !overlay) return;
    overlay.classList.remove("hud-hidden");
    hudTimer = setTimeout(() => {
      if (isRunning && overlay) overlay.classList.add("hud-hidden");
    }, delay);
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
    overlay.innerHTML =
      '<canvas class="fullscreen-canvas" id="fullscreen-canvas"></canvas>' +
      '<div class="fullscreen-hud" id="fullscreen-hud"><div class="fullscreen-hud-info">' +
      '<span class="fullscreen-hud-idx" id="fullscreen-hud-idx">[ SCENE 01 / 48 ]</span>' +
      '<span class="fullscreen-hud-name" id="fullscreen-hud-name">FIREWORKS</span>' +
      '<span class="fullscreen-hud-sub" id="fullscreen-hud-sub">// Aerial Pyrotechnic Bursts</span></div>' +
      '<div class="fullscreen-hud-hint" id="fullscreen-hud-hint">Move mouse, click, tap, or press any key to exit</div>' +
      '<button type="button" class="fullscreen-hud-btn fullscreen-hud-exit" id="fs-exit" style="display:none;" aria-hidden="true">[ ✕ EXIT ]</button></div>';
    document.body.appendChild(overlay);
    canvas = document.getElementById("fullscreen-canvas");
    ctx = canvas ? canvas.getContext("2d") : null;
    const exitBtn = document.getElementById("fs-exit");
    if (exitBtn) exitBtn.addEventListener("click", closeScreensaver);
  }

  function resize() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    if (window.idleSaverFit) window.idleSaverFit();
  }

  function updateHud() {
    const savers = getSavers();
    const s = savers[currentIdx];
    if (!s) return;
    const idxEl = document.getElementById("fullscreen-hud-idx");
    const nameEl = document.getElementById("fullscreen-hud-name");
    const subEl = document.getElementById("fullscreen-hud-sub");
    const pad = savers.length < 10 ? "0" + savers.length : savers.length;
    if (idxEl) idxEl.textContent = `[ SCENE ${s.num} / ${pad} ]`;
    if (nameEl) nameEl.textContent = s.name;
    if (subEl) subEl.textContent = `// ${s.sub}`;
    scheduleHudHide(2000);
  }

  function switchScene(deltaOrIdx, isRelative = false) {
    const savers = getSavers();
    if (!savers.length) return;
    currentIdx = isRelative
      ? (currentIdx + deltaOrIdx + savers.length) % savers.length
      : (deltaOrIdx + savers.length) % savers.length;
    updateHud();
    const s = savers[currentIdx];
    if (s && window.idleSaverRunScene) {
      window.idleSaverRunScene(s.id);
    } else if (s && window.IdleSceneSim && ctx) {
      const acc = window.idleCurrentAccent || [255, 176, 0];
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      window.IdleSceneSim.render(ctx, w, h, performance.now(), s.id, acc);
    }
  }

  function resetCycleTimer() {
    if (cycleTimer) clearInterval(cycleTimer);
    if (!isRunning) return;
    cycleTimer = setInterval(() => { switchScene(1, true); }, CYCLE_MS);
  }

  function onPointerMove(e) {
    if (!isRunning) return;
    if (initPointerX < 0 || initPointerY < 0) {
      initPointerX = e.clientX;
      initPointerY = e.clientY;
      return;
    }
    const now = performance.now();
    if (now - launchTime < IMMUNITY_MS) {
      initPointerX = e.clientX;
      initPointerY = e.clientY;
      return;
    }
    const dx = Math.abs(e.clientX - initPointerX);
    const dy = Math.abs(e.clientY - initPointerY);
    if (dx < 16 && dy < 16) return;
    closeScreensaver();
  }

  function onUserExitEvent() {
    if (!isRunning) return;
    if (performance.now() - launchTime < IMMUNITY_MS) return;
    closeScreensaver();
  }

  const MOVE_EVS = ["pointermove", "mousemove"];
  const EXIT_EVS = ["pointerdown", "mousedown", "click", "keydown", "touchstart", "wheel"];

  function attachExitListeners() {
    if (!isRunning) return;
    MOVE_EVS.forEach((ev) => window.addEventListener(ev, onPointerMove, { passive: true }));
    EXIT_EVS.forEach((ev) => window.addEventListener(ev, onUserExitEvent, { passive: true }));
  }

  function detachExitListeners() {
    MOVE_EVS.forEach((ev) => window.removeEventListener(ev, onPointerMove));
    EXIT_EVS.forEach((ev) => window.removeEventListener(ev, onUserExitEvent));
  }

  function openScreensaver(e) {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (isRunning) return;
    createOverlay();
    if (!overlay || !canvas) return;

    const mobNav = document.getElementById("mobile-nav");
    if (mobNav) mobNav.classList.remove("open");
    const menuToggle = document.getElementById("menu-toggle");
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");

    if (window.getCurrentShowcaseIndex) {
      currentIdx = window.getCurrentShowcaseIndex();
    }

    isRunning = true;
    window.idleFullscreenActive = true; if (window.idleSyncMarqueeState) window.idleSyncMarqueeState();
    launchTime = performance.now();
    initPointerX = (e && typeof e.clientX === "number") ? e.clientX : -1;
    initPointerY = (e && typeof e.clientY === "number") ? e.clientY : -1;

    overlay.style.display = "flex";
    overlay.setAttribute("aria-hidden", "false");
    overlay.classList.remove("hud-hidden");
    resize();
    updateHud();
    scheduleHudHide(2500);

    if (window.idleSaverSetTargetCanvas) window.idleSaverSetTargetCanvas(canvas);
    window.addEventListener("resize", resize, { passive: true });
    attachExitListeners();

    const reqFs = document.documentElement.requestFullscreen ||
      document.documentElement.webkitRequestFullscreen ||
      document.documentElement.mozRequestFullScreen || document.documentElement.msRequestFullscreen;
    if (reqFs) {
      try {
        const p = reqFs.call(document.documentElement);
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (err) {}
    }

    switchScene(currentIdx, false);
    resetCycleTimer();
  }

  function closeScreensaver() {
    if (!isRunning) return;
    isRunning = false;
    window.idleFullscreenActive = false; if (window.idleSyncMarqueeState) window.idleSyncMarqueeState();

    if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; }
    if (hudTimer) { clearTimeout(hudTimer); hudTimer = null; }

    window.removeEventListener("resize", resize);
    detachExitListeners();

    if (overlay) {
      overlay.style.display = "none";
      overlay.setAttribute("aria-hidden", "true");
      overlay.classList.remove("hud-hidden");
    }

    const fsEl = document.fullscreenElement || document.webkitFullscreenElement ||
      document.mozFullScreenElement || document.msFullscreenElement;
    const exitFs = document.exitFullscreen || document.webkitExitFullscreen ||
      document.mozCancelFullScreen || document.msExitFullscreen;
    if (fsEl && exitFs) {
      try {
        const p = exitFs.call(document);
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (err) {}
    }

    const sc = document.getElementById("showcase-canvas");
    if (sc && window.idleSaverSetTargetCanvas) window.idleSaverSetTargetCanvas(sc);
    if (window.selectShowcaseScene) {
      window.selectShowcaseScene(currentIdx);
    } else if (window.idleSaverRunScene && getSavers()[currentIdx]) {
      window.idleSaverRunScene(getSavers()[currentIdx].id);
    }
    if (window.idleSaverSetPaused) window.idleSaverSetPaused(false);
    if (window.idleRenderSpotlight) window.idleRenderSpotlight();
  }

  ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"].forEach((ev) => {
    document.addEventListener(ev, () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement ||
        document.mozFullScreenElement || document.msFullscreenElement;
      if (!fsEl && isRunning) {
        closeScreensaver();
      } else if (fsEl && isRunning) {
        launchTime = performance.now();
        initPointerX = -1;
        initPointerY = -1;
        resize();
      }
    });
  });

  window.idleFullscreenSyncScene = function (idx) {
    if (isRunning) switchScene(idx, false);
  };
  window.openScreensaverDemo = openScreensaver;
  window.closeScreensaverDemo = closeScreensaver;

  function setupTriggers() {
    const sel = "#btn-fullscreen-saver, #btn-fullscreen-demo, #mobile-btn-fullscreen-saver, #mobile-btn-fullscreen-demo";
    document.querySelectorAll(sel).forEach((btn) => {
      btn.removeEventListener("click", openScreensaver);
      btn.addEventListener("click", openScreensaver);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupTriggers);
  else setupTriggers();
})();

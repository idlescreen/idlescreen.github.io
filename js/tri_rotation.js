// js/showcase/tri_rotation.js — dynamic ASCII tri-rotation engine demo with offscreen pause
(function initTriRotationDemo() {
  const TRI_DATA = {
    os: ["FEDORA", "ARCH", "DEBIAN", "UBUNTU", "ALPINE", "OPENSUSE", "VOID", "GENTOO"],
    de: ["GNOME", "KDE", "COSMIC", "HYPRLAND", "SWAY", "WAYFIRE", "RIVER", "LABWC"],
    kernel: ["LINUX", "LINUX 6.12", "LINUX 6.11"]
  };

  const MODES = ["os", "de", "kernel"];
  let currentModeIdx = 0;
  let subIndices = { os: 0, de: 0, kernel: 0 };
  let autoTimer = null;
  let isAuto = true;
  let isSectionVisible = true;

  function updateDisplay(animate = true) {
    const mode = MODES[currentModeIdx];
    const modeLabels = { os: "HOST OS", de: "DESKTOP ENV", kernel: "LINUX KERNEL" };
    document.querySelectorAll(".tri-rot-state, #tri-rot-mode").forEach((el) => {
      el.textContent = modeLabels[mode];
    });

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

  function syncTimerState() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
    if (isAuto && isSectionVisible && !document.hidden) {
      autoTimer = setInterval(advanceCycle, 3200);
    }
    document.querySelectorAll(".tri-rot-btn-auto, #tri-rot-auto").forEach((b) => {
      b.textContent = isAuto ? "CYCLE [AUTO: ON]" : "CYCLE [AUTO: OFF]";
    });
  }

  function startAuto() {
    isAuto = true;
    syncTimerState();
  }

  function stopAuto() {
    isAuto = false;
    syncTimerState();
  }

  window.cycleTriRotation = function(mode) {
    setMode(mode);
  };

  window.toggleTriRotationAuto = function() {
    if (isAuto) stopAuto(); else startAuto();
  };

  function setupObserver() {
    const demo = document.getElementById("tri-rotation-demo") || document.querySelector(".tri-rotation-demo");
    const targetSection = demo ? (demo.closest("section") || demo) : document.getElementById("ecosystem");
    if (targetSection) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          isSectionVisible = e.isIntersecting;
          syncTimerState();
        });
      }, { root: null, threshold: 0.1 });
      io.observe(targetSection);
    }

    document.addEventListener("visibilitychange", syncTimerState);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      updateDisplay(false);
      startAuto();
      setupObserver();
    });
  } else {
    updateDisplay(false);
    startAuto();
    setupObserver();
  }
})();

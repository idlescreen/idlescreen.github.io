// js/showcase/tri_rotation.js — dynamic ASCII tri-rotation engine demo
(function initTriRotationDemo() {
  const TRI_DATA = {
    os: [
      "FEDORA",
      "ARCH",
      "DEBIAN",
      "UBUNTU",
      "ALPINE",
      "OPENSUSE",
      "VOID",
      "GENTOO"
    ],
    de: [
      "GNOME",
      "KDE",
      "COSMIC",
      "HYPRLAND",
      "SWAY",
      "WAYFIRE",
      "RIVER",
      "LABWC"
    ],
    kernel: [
      "LINUX",
      "LINUX 6.12",
      "LINUX 6.11"
    ]
  };

  const MODES = ["os", "de", "kernel"];
  let currentModeIdx = 0;
  let subIndices = { os: 0, de: 0, kernel: 0 };
  let autoTimer = null;
  let isAuto = true;

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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      updateDisplay(false);
      startAuto();
    });
  } else {
    updateDisplay(false);
    startAuto();
  }
})();

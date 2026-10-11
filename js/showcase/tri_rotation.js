// js/showcase/tri_rotation.js — dynamic ASCII tri-rotation engine demo
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

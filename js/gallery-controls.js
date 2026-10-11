// js/gallery-controls.js — interactive parameter and telemetry control bar for gallery showcase
(function initGalleryControls() {
  const ACCENTS = [
    { name: "Amber", hex: "#ffb000", rgb: [255, 176, 0] },
    { name: "Cyan", hex: "#00e5ff", rgb: [0, 229, 255] },
    { name: "Violet", hex: "#bd93f9", rgb: [189, 147, 249] },
    { name: "Emerald", hex: "#50fa7b", rgb: [80, 250, 123] },
    { name: "Coral", hex: "#ff5555", rgb: [255, 85, 85] },
  ];

  function applyAccent(rgb) {
    document.documentElement.style.setProperty("--phosphor", `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`);
    document.documentElement.style.setProperty("--accent-rgb", `${rgb[0]},${rgb[1]},${rgb[2]}`);
    if (window.idleSaverSetAccent) {
      window.idleSaverSetAccent(rgb[0], rgb[1], rgb[2]);
    }
  }

  function triggerAudioPulse() {
    let bass = 1.0, mid = 0.7, treble = 0.4;
    const start = performance.now();
    const duration = 650;

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1.0);
      const decay = 1.0 - Math.pow(progress, 0.7);

      const b = bass * decay;
      const m = mid * decay;
      const t = treble * decay;

      if (window.idleSaverSetAudioBands) {
        window.idleSaverSetAudioBands(b, m, m * 0.7, t);
      }

      if (progress < 1.0) {
        requestAnimationFrame(step);
      } else if (window.idleSaverSetAudioBands) {
        window.idleSaverSetAudioBands(0, 0, 0, 0);
      }
    }
    requestAnimationFrame(step);
  }

  function buildControls(panel) {
    if (panel.querySelector(".gallery-controls")) return;

    const bar = document.createElement("div");
    bar.className = "gallery-controls";

    // 1. Accent color selector
    const accentGroup = document.createElement("div");
    accentGroup.className = "gallery-ctrl-group";
    const accentLabel = document.createElement("span");
    accentLabel.className = "gallery-ctrl-label";
    accentLabel.textContent = "ACCENT:";
    accentGroup.appendChild(accentLabel);

    const picker = document.createElement("div");
    picker.className = "gallery-accent-picker";
    ACCENTS.forEach((a, idx) => {
      const dot = document.createElement("button");
      dot.className = "gallery-accent-dot" + (idx === 0 ? " active" : "");
      dot.style.backgroundColor = a.hex;
      dot.style.color = a.hex;
      dot.title = a.name;
      dot.addEventListener("click", () => {
        picker.querySelectorAll(".gallery-accent-dot").forEach((d) => d.classList.remove("active"));
        dot.classList.add("active");
        applyAccent(a.rgb);
      });
      picker.appendChild(dot);
    });
    accentGroup.appendChild(picker);
    bar.appendChild(accentGroup);

    // 2. Audio Reactivity Pulse Trigger
    const audioGroup = document.createElement("div");
    audioGroup.className = "gallery-ctrl-group";
    const audioLabel = document.createElement("span");
    audioLabel.className = "gallery-ctrl-label";
    audioLabel.textContent = "AUDIO:";
    audioGroup.appendChild(audioLabel);

    const pulseBtn = document.createElement("button");
    pulseBtn.className = "gallery-ctrl-btn";
    pulseBtn.textContent = "[ SURGE BEAT \u266b ]";
    pulseBtn.title = "Inject audio transient peak into reactivity pipeline";
    pulseBtn.addEventListener("click", () => {
      pulseBtn.classList.add("active");
      triggerAudioPulse();
      setTimeout(() => pulseBtn.classList.remove("active"), 300);
    });
    audioGroup.appendChild(pulseBtn);
    bar.appendChild(audioGroup);

    // 3. Audio Level Continuous Slider
    const sliderGroup = document.createElement("div");
    sliderGroup.className = "gallery-ctrl-group gallery-slider-wrap";
    const sliderLabel = document.createElement("span");
    sliderLabel.className = "gallery-ctrl-label";
    sliderLabel.textContent = "LEVEL:";
    sliderGroup.appendChild(sliderLabel);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "100";
    slider.value = "0";
    slider.className = "gallery-slider";
    slider.addEventListener("input", (e) => {
      const v = parseFloat(e.target.value) / 100.0;
      if (window.idleSaverSetAudioBands) {
        window.idleSaverSetAudioBands(v, v * 0.8, v * 0.6, v * 0.4);
      }
    });
    sliderGroup.appendChild(slider);
    bar.appendChild(sliderGroup);

    const strip = panel.querySelector(".showcase-controls-strip");
    if (strip) {
      strip.appendChild(bar);
    } else {
      const stage = panel.querySelector(".saver-stage");
      if (stage) {
        stage.appendChild(bar);
      } else {
        panel.appendChild(bar);
      }
    }
  }

  function mount() {
    const panels = document.querySelectorAll(".saver-panel");
    panels.forEach(buildControls);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();

// js/gallery-controls.js — interactive parameter and telemetry control bar for gallery showcase
(function initGalleryControls() {
  const ACCENTS = [
    { name: "Amber", hex: "#ffb000", rgb: [255, 176, 0], hot: "#ffd447", hotRgb: [255, 212, 71] },
    { name: "Cyan", hex: "#00e5ff", rgb: [0, 229, 255], hot: "#80f4ff", hotRgb: [128, 244, 255] },
    { name: "Violet", hex: "#bd93f9", rgb: [189, 147, 249], hot: "#d9b8ff", hotRgb: [217, 184, 255] },
    { name: "Emerald", hex: "#50fa7b", rgb: [80, 250, 123], hot: "#a2ffbc", hotRgb: [162, 255, 188] },
    { name: "Coral", hex: "#ff5555", rgb: [255, 85, 85], hot: "#ff9999", hotRgb: [255, 153, 153] },
  ];

  function applyAccent(a) {
    if (!a) return;
    const [r, g, b] = a.rgb;
    const [hr, hg, hb] = a.hotRgb;
    window.idleCurrentAccent = a.rgb;
    window.idleCurrentAccentName = a.name;

    try {
      localStorage.setItem("idlescreen_accent", a.name.toLowerCase());
    } catch (e) {}

    const root = document.documentElement;
    root.style.setProperty("--phosphor", a.hex);
    root.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
    root.style.setProperty("--phosphor-dim", `rgba(${r}, ${g}, ${b}, 0.12)`);
    root.style.setProperty("--phosphor-glow", `rgba(${r}, ${g}, ${b}, 0.28)`);
    root.style.setProperty("--border-accent", `rgba(${r}, ${g}, ${b}, 0.35)`);
    root.style.setProperty("--hot", a.hot);
    root.style.setProperty("--hot-rgb", `${hr}, ${hg}, ${hb}`);

    root.style.setProperty("--spotlight-border", `rgba(${r}, ${g}, ${b}, 0.45)`);
    root.style.setProperty("--spotlight-glow", `rgba(${hr}, ${hg}, ${hb}, 0.9)`);
    root.style.setProperty("--spotlight-inner", `rgba(${r}, ${g}, ${b}, 0.035)`);

    if (window.idleSetCardSpotlightAccent) {
      window.idleSetCardSpotlightAccent(a.rgb, a.hotRgb);
    }
    if (window.idleSaverSetAccent) {
      window.idleSaverSetAccent(r, g, b);
    }
    if (window.idleRenderSpotlight) {
      window.idleRenderSpotlight();
    }

    document.querySelectorAll("[data-accent-name]").forEach((btn) => {
      const active = btn.dataset.accentName.toLowerCase() === a.name.toLowerCase();
      btn.classList.toggle("active", active);
      if (btn.hasAttribute("aria-checked")) btn.setAttribute("aria-checked", active ? "true" : "false");
      if (btn.hasAttribute("aria-pressed")) btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.setAttribute("tabindex", active ? "0" : "-1");
    });
  }

  window.idleApplyAccent = function (nameOrRgb) {
    let found = null;
    if (typeof nameOrRgb === "string") {
      found = ACCENTS.find((x) => x.name.toLowerCase() === nameOrRgb.toLowerCase());
    } else if (Array.isArray(nameOrRgb)) {
      found = ACCENTS.find((x) => x.rgb[0] === nameOrRgb[0] && x.rgb[1] === nameOrRgb[1] && x.rgb[2] === nameOrRgb[2]);
    }
    if (found) applyAccent(found);
  };

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
    picker.setAttribute("role", "radiogroup");
    picker.setAttribute("aria-label", "Showcase Accent Palette");
    ACCENTS.forEach((a) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "gallery-accent-dot";
      dot.dataset.accentName = a.name;
      dot.setAttribute("role", "radio");
      dot.setAttribute("aria-checked", "false");
      dot.setAttribute("tabindex", "-1");
      dot.style.setProperty("--swatch", a.hex);
      dot.style.backgroundColor = a.hex;
      dot.style.color = a.hex;
      dot.title = a.name + " Accent";
      dot.setAttribute("aria-label", a.name + " Accent");
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
    pulseBtn.type = "button";
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
    slider.setAttribute("aria-label", "Audio Reactivity Level");
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

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-accent-name]");
      if (!btn) return;
      const name = btn.dataset.accentName;
      const found = ACCENTS.find((a) => a.name.toLowerCase() === name.toLowerCase());
      if (found) applyAccent(found);
    });

    document.addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
      const btn = document.activeElement;
      if (!btn || !btn.matches("[data-accent-name]")) return;
      const group = btn.closest('[role="radiogroup"]');
      if (!group) return;
      const items = Array.from(group.querySelectorAll("[data-accent-name]"));
      const idx = items.indexOf(btn);
      if (idx === -1) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      const isNext = e.key === "ArrowRight" || e.key === "ArrowDown";
      const nextIdx = isNext ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
      items[nextIdx].focus();
      items[nextIdx].click();
    }, true);

    let current = null;
    try {
      const saved = localStorage.getItem("idlescreen_accent");
      if (saved) current = ACCENTS.find((a) => a.name.toLowerCase() === saved.toLowerCase());
    } catch (e) {}
    if (!current && window.idleCurrentAccentName) {
      current = ACCENTS.find((a) => a.name.toLowerCase() === window.idleCurrentAccentName.toLowerCase());
    }
    if (!current && window.idleCurrentAccent) {
      current = ACCENTS.find((a) => a.rgb[0] === window.idleCurrentAccent[0] && a.rgb[1] === window.idleCurrentAccent[1]);
    }
    applyAccent(current || ACCENTS[0]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();

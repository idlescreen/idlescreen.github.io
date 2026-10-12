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

  window.idleCycleRandomAccent = function () {
    const cur = (window.idleCurrentAccentName || "Amber").toLowerCase();
    const pool = ACCENTS.filter((a) => a.name.toLowerCase() !== cur);
    if (!pool.length) return null;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    applyAccent(picked);
    return picked;
  };

  function mount() {

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

// wasm-saver.js — runs Rust WASM savers & live ASCII scene simulations.
// Coordinates assets/wasm/idlescreen.wasm and procedural ASCII engine.
(function initWasmSavers() {
  const canvases = document.querySelectorAll("canvas.saver-canvas[data-wasm]");
  if (!canvases.length) return;

  const CELL_H = 18;
  const FONT_STACK = 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace';

  const WASM_MAP = {
    aurora: "aurora", colorshift: "aurora",
    beams: "beams", highlight: "beams", laseretch: "beams", spotlights: "beams",
    bursts: "bursts", expand: "bursts", fireworks: "bursts", spray: "bursts",
    chaos: "chaos", crumble: "chaos", scattered: "chaos", slide: "chaos", unstable: "chaos",
    cosmos: "cosmos", blackhole: "cosmos", orbittingvolley: "cosmos",
    glyphs: "glyphs", decrypt: "glyphs", errorcorrect: "glyphs", overflow: "glyphs", random_sequence: "glyphs",
    gnats: "gnats", swarm: "gnats", hearth: "hearth", burn: "hearth", smoke: "hearth",
    radar: "radar", sweep: "radar", ripple: "ripple", bubbles: "ripple", rings: "ripple",
    storm: "storm", pour: "storm", thunderstorm: "storm"
  };

  let activeSwitchFn = null, activeSaverSetAccent = null;
  window.idleSaverRunScene = function (id) {
    if (activeSwitchFn) activeSwitchFn(id); else window.idleCurrentSceneId = id;
  };
  window.idleSaverSetAccent = function (r, g, b) {
    window.idleCurrentAccent = [r, g, b];
    if (activeSaverSetAccent) activeSaverSetAccent(r, g, b);
  };

  let atlasCanvas = null, atlasCtx = null, atlasKey = "";
  const ATLAS_COLS = 16, L_BINS = 4;
  const BIN_LUMS = [0.3, 0.55, 0.8, 1.0];
  function getLumBin(lum) {
    if (lum < 0.42) return 0;
    if (lum < 0.67) return 1;
    if (lum < 0.90) return 2;
    return 3;
  }
  function getGlyphAtlas(cellW, cellH, ar, ag, ab) {
    const key = `${cellW}_${cellH}_${ar}_${ag}_${ab}`;
    if (atlasCanvas && atlasKey === key) return atlasCanvas;
    if (!atlasCanvas) { atlasCanvas = document.createElement("canvas"); atlasCtx = atlasCanvas.getContext("2d"); }
    const totalGlyphs = 95 * L_BINS * 2, rows = Math.ceil(totalGlyphs / ATLAS_COLS);
    atlasCanvas.width = ATLAS_COLS * cellW; atlasCanvas.height = rows * cellH;
    atlasCtx.clearRect(0, 0, atlasCanvas.width, atlasCanvas.height);
    atlasCtx.textBaseline = "top";

    for (let bold = 0; bold < 2; bold++) {
      atlasCtx.font = (bold ? "bold " : "") + (cellH - 3) + "px " + FONT_STACK;
      for (let b = 0; b < L_BINS; b++) {
        const lum = BIN_LUMS[b];
        atlasCtx.fillStyle = `rgb(${Math.min(255, Math.round(ar * lum * 1.25))},${Math.min(255, Math.round(ag * lum * 1.25))},${Math.min(255, Math.round(ab * lum * 1.25))})`;
        const variantOffset = (bold * L_BINS + b) * 95;
        for (let ch = 32; ch <= 126; ch++) {
          const idx = (ch - 32) + variantOffset;
          const gx = (idx % ATLAS_COLS) * cellW, gy = Math.floor(idx / ATLAS_COLS) * cellH;
          atlasCtx.fillText(String.fromCharCode(ch), gx, gy + 1);
        }
      }
    }
    atlasKey = key; return atlasCanvas;
  }

  function paintCells(ctx, u32, ptr, cols, rows, cellW, cellH, accent) {
    ctx.fillStyle = "#070809"; ctx.fillRect(0, 0, ctx.canvas.clientWidth, ctx.canvas.clientHeight);
    ctx.textBaseline = "top";
    const [ar, ag, ab] = accent || [255, 176, 0], cellCount = cols * rows;
    const atlas = getGlyphAtlas(cellW, cellH, ar, ag, ab);

    for (let i = 0; i < cellCount; i++) {
      const ch = u32[ptr + i * 3], fg = u32[ptr + i * 3 + 1], bg = u32[ptr + i * 3 + 2];
      const x = (i % cols) * cellW, y = ((i / cols) | 0) * cellH;
      const bgr = bg & 0xff, bgg = (bg >> 8) & 0xff, bgb = (bg >> 16) & 0xff;
      if (bgr || bgg || bgb) {
        const lumBg = (bgr * 0.299 + bgg * 0.587 + bgb * 0.114) / 255;
        ctx.fillStyle = `rgb(${Math.round(ar * lumBg)},${Math.round(ag * lumBg)},${Math.round(ab * lumBg)})`;
        ctx.fillRect(x, y, cellW, cellH);
      }
      if (ch === 0 || ch === 32) continue;
      const isBold = (fg >>> 24) > 0 ? 1 : 0;
      const fgr = fg & 0xff, fgg = (fg >> 8) & 0xff, fgb = (fg >> 16) & 0xff;
      const lum = (fgr * 0.299 + fgg * 0.587 + fgb * 0.114) / 255;
      const bin = getLumBin(lum);
      if (ch >= 32 && ch <= 126) {
        const idx = (ch - 32) + (isBold * L_BINS + bin) * 95;
        const sx = (idx % ATLAS_COLS) * cellW, sy = Math.floor(idx / ATLAS_COLS) * cellH;
        ctx.drawImage(atlas, sx, sy, cellW, cellH, x, y, cellW, cellH);
      } else {
        ctx.fillStyle = `rgb(${Math.min(255, Math.round(ar * lum * 1.25))},${Math.min(255, Math.round(ag * lum * 1.25))},${Math.min(255, Math.round(ab * lum * 1.25))})`;
        const fStr = (isBold ? "bold " : "") + (cellH - 3) + "px " + FONT_STACK;
        if (ctx.font !== fStr) ctx.font = fStr;
        ctx.fillText(String.fromCodePoint(ch), x, y + 1);
      }
    }
  }

  function createSaver(ex, saverId, cols, rows) {
    if (!ex) return 0;
    if (saverId && ex.saver_new_named && ex.saver_alloc) {
      const name = new TextEncoder().encode(saverId);
      const ptr = ex.saver_alloc(name.length);
      new Uint8Array(ex.memory.buffer, ptr, name.length).set(name);
      const host = ex.saver_new_named(ptr, name.length, cols, rows);
      if (host) return host;
    }
    return ex.saver_new ? ex.saver_new(cols, rows) : 0;
  }

  async function arm(canvas) {
    try {
      let ex = null, cachedU32 = null;
      if ("WebAssembly" in window && canvas.dataset.wasm) {
        try {
          const bytes = await (await fetch(canvas.dataset.wasm)).arrayBuffer();
          const { instance } = await WebAssembly.instantiate(bytes, {});
          ex = instance.exports;
        } catch (we) { console.warn("[wasm-saver] wasm fallback:", we); }
      }

      let currentActiveScene = canvas.dataset.saver || "fireworks", targetCanvas = canvas;
      let host = 0, cols = 0, rows = 0, cellW = 10, running = false, last = 0;
      let currentAccent = window.idleCurrentAccent || [255, 176, 0];
      let ctx = targetCanvas.getContext("2d");

      activeSaverSetAccent = (r, g, b) => {
        currentAccent = [r, g, b]; atlasKey = "";
        if (ex && ex.saver_set_accent) { try { ex.saver_set_accent(r, g, b); } catch (e) {} }
      };
      if (window.idleCurrentAccent) currentAccent = window.idleCurrentAccent;
      if (currentAccent && ex && ex.saver_set_accent) {
        try { ex.saver_set_accent(currentAccent[0], currentAccent[1], currentAccent[2]); } catch (e) {}
      }
      if (ex && ex.saver_set_audio_bands) {
        window.idleSaverSetAudioBands = (b, l, m, t) => { try { ex.saver_set_audio_bands(b, l, m, t); } catch (e) {} };
      }

      function fit() {
        const w = targetCanvas.clientWidth || 800, h = targetCanvas.clientHeight || 450;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        targetCanvas.width = Math.round(w * dpr); targetCanvas.height = Math.round(h * dpr);
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.font = (CELL_H - 3) + "px " + FONT_STACK;
        cellW = Math.max(6, Math.ceil(ctx.measureText("M").width));
        const nCols = Math.min(160, Math.floor(targetCanvas.width / (cellW * dpr)));
        const nRows = Math.min(90, Math.floor(targetCanvas.height / (CELL_H * dpr)));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const isCustom = window.IdleSceneSim && window.IdleSceneSim.has(currentActiveScene);
        const wasmName = WASM_MAP[currentActiveScene];
        if (ex && !host && !isCustom && wasmName) host = createSaver(ex, wasmName, nCols, nRows);
        else if (ex && host && (nCols !== cols || nRows !== rows)) ex.saver_resize(host, nCols, nRows);
        cols = nCols; rows = nRows; atlasKey = "";
      }

      function frame(t) {
        if (!running) return;
        const dt = Math.min(t - last || 16.7, 100);
        last = t;
        const w = targetCanvas.clientWidth || 800, h = targetCanvas.clientHeight || 450;
        const accent = currentAccent || [255, 176, 0];

        if (window.IdleSceneSim && window.IdleSceneSim.has(currentActiveScene)) {
          window.IdleSceneSim.render(ctx, w, h, t, currentActiveScene, accent);
        } else if (ex && host) {
          const ptr = ex.saver_tick(host, dt) / 4;
          if (!cachedU32 || cachedU32.buffer !== ex.memory.buffer) {
            cachedU32 = new Uint32Array(ex.memory.buffer);
          }
          paintCells(ctx, cachedU32, ptr, cols, rows, cellW, CELL_H, accent);
        } else if (window.IdleSceneSim) {
          window.IdleSceneSim.render(ctx, w, h, t, currentActiveScene, accent);
        }
        requestAnimationFrame(frame);
      }

      fit();

      function switchScene(sceneId) {
        currentActiveScene = sceneId; window.idleCurrentSceneId = sceneId;
        const stage = canvas.closest(".saver-stage"), video = stage ? stage.querySelector("video") : null;
        const panel = canvas.closest(".saver-panel") || document.getElementById("showcase");
        const liveBadge = panel ? panel.querySelector(".saver-badge-live") : null;
        const isCustom = window.IdleSceneSim && window.IdleSceneSim.has(sceneId);
        const wasmName = WASM_MAP[sceneId], reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        canvas.hidden = false; canvas.style.display = "block";
        if (video) { video.pause(); video.style.visibility = "hidden"; video.style.display = "none"; }
        if (ex && host) { try { ex.saver_destroy(host); } catch (e) {} host = 0; }
        if (!cols || !rows) fit();
        if (ex && !isCustom && wasmName) host = createSaver(ex, wasmName, cols, rows);
        if (liveBadge) liveBadge.textContent = (ex && host) ? "LIVE WASM ENGINE" : "LIVE 60 FPS SIMULATION";

        if (!reduced && !running) { running = true; last = 0; requestAnimationFrame(frame); }
      }

      activeSwitchFn = switchScene; window.idleSaverRunScene = switchScene;
      window.idleSaverSetPaused = function (paused) {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (paused) { running = false; }
        else if (!reduced && !running) { running = true; last = 0; requestAnimationFrame(frame); }
      };
      window.idleSaverSetTargetCanvas = function (newCanvas) {
        if (!newCanvas || newCanvas === targetCanvas) return;
        targetCanvas = newCanvas; ctx = targetCanvas.getContext("2d");
        atlasKey = ""; fit();
        if (running) { last = 0; requestAnimationFrame(frame); }
      };
      window.idleSaverFit = fit;
      if (window.idleCurrentSceneId) switchScene(window.idleCurrentSceneId);

      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (window.idleFullscreenActive) return;
          if (e.isIntersecting && !running) { running = true; last = 0; requestAnimationFrame(frame); }
          else if (!e.isIntersecting) { running = false; }
        });
      }, { root: null, threshold: [0, 0.05] });
      io.observe(canvas);

      let rt;
      window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(fit, 200); });
    } catch (e) {
      console.warn("[wasm-saver] init fallback:", e);
    }
  }

  canvases.forEach((c) => arm(c));
})();

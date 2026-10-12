// wasm-saver.js — runs Rust WASM savers & live ASCII scene simulations.
// Coordinates assets/wasm/idlescreen.wasm and procedural ASCII engine.
(function initWasmSavers() {
  const canvases = document.querySelectorAll("canvas.saver-canvas[data-wasm]");
  if (!canvases.length) return;

  const CELL_H = 18;
  const FONT_STACK = 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace';

  const WASM_MAP = {
    beams: "beams",
    spotlights: "beams",
    laseretch: "beams",
    highlight: "beams",
    fireworks: "bursts",
    bursts: "bursts",
    expand: "bursts",
    spray: "bursts",
    thunderstorm: "storm",
    pour: "storm",
    sweep: "radar",
    radar: "radar",
    rings: "ripple",
    bubbles: "ripple",
    overflow: "glyphs",
    decrypt: "glyphs",
    errorcorrect: "glyphs",
    random_sequence: "glyphs",
    swarm: "gnats",
    burn: "hearth",
    smoke: "hearth",
    colorshift: "aurora",
    unstable: "chaos",
    scattered: "chaos",
    crumble: "chaos",
    slide: "chaos",
    blackhole: "cosmos",
    orbittingvolley: "cosmos"
  };

  let activeSwitchFn = null;
  window.idleSaverRunScene = function (id) {
    if (activeSwitchFn) activeSwitchFn(id);
    else window.idleCurrentSceneId = id;
  };

  function paintCells(ctx, u32, ptr, cols, rows, cellW, cellH, tiles, accent) {
    ctx.fillStyle = "#070809";
    ctx.fillRect(0, 0, ctx.canvas.clientWidth, ctx.canvas.clientHeight);
    const [ar, ag, ab] = accent || [255, 176, 0];
    const cellCount = cols * rows;

    if (tiles.size > 1200) tiles.clear();

    for (let i = 0; i < cellCount; i++) {
      const ch = u32[ptr + i * 3], fg = u32[ptr + i * 3 + 1], bg = u32[ptr + i * 3 + 2];
      const x = (i % cols) * cellW, y = ((i / cols) | 0) * cellH;
      const bgr = bg & 0xff, bgg = (bg >> 8) & 0xff, bgb = (bg >> 16) & 0xff;
      if (bgr || bgg || bgb) {
        const lumBg = (bgr * 0.299 + bgg * 0.587 + bgb * 0.114) / 255;
        ctx.fillStyle = `rgb(${Math.round(ar * lumBg)},${Math.round(ag * lumBg)},${Math.round(ab * lumBg)})`;
        ctx.fillRect(x, y, cellW, cellH);
      }
      if (ch === 32 || ch === 0) continue;
      const key = ch + ":" + fg + ":" + ar + "," + ag + "," + ab;
      let tile = tiles.get(key);
      if (!tile) {
        tile = document.createElement("canvas");
        tile.width = cellW;
        tile.height = cellH;
        const tctx = tile.getContext("2d");
        const fgr = fg & 0xff, fgg = (fg >> 8) & 0xff, fgb = (fg >> 16) & 0xff;
        const lum = Math.max(0.2, (fgr * 0.299 + fgg * 0.587 + fgb * 0.114) / 255);
        tctx.fillStyle = `rgb(${Math.min(255, Math.round(ar * lum * 1.25))},${Math.min(255, Math.round(ag * lum * 1.25))},${Math.min(255, Math.round(ab * lum * 1.25))})`;
        tctx.font = (fg >>> 24 ? "bold " : "") + (cellH - 3) + "px " + FONT_STACK;
        tctx.textBaseline = "top";
        tctx.fillText(String.fromCodePoint(ch), 0, 1);
        tiles.set(key, tile);
      }
      ctx.drawImage(tile, x, y);
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
      let ex = null;
      if ("WebAssembly" in window && canvas.dataset.wasm) {
        try {
          const bytes = await (await fetch(canvas.dataset.wasm)).arrayBuffer();
          const { instance } = await WebAssembly.instantiate(bytes, {});
          ex = instance.exports;
        } catch (we) {
          console.warn("[wasm-saver] wasm fallback:", we);
        }
      }

      let currentActiveScene = canvas.dataset.saver || "fireworks";
      let host = 0, cols = 0, rows = 0, cellW = 10, running = false, last = 0;
      let currentAccent = window.idleCurrentAccent || [255, 176, 0];
      const ctx = canvas.getContext("2d"), tiles = new Map();

      window.idleSaverSetAccent = (r, g, b) => {
        currentAccent = [r, g, b];
        window.idleCurrentAccent = [r, g, b];
        tiles.clear();
        if (ex && ex.saver_set_accent) {
          try { ex.saver_set_accent(r, g, b); } catch (e) {}
        }
      };

      if (currentAccent && ex && ex.saver_set_accent) {
        try { ex.saver_set_accent(currentAccent[0], currentAccent[1], currentAccent[2]); } catch (e) {}
      }

      if (ex && ex.saver_set_audio_bands) {
        window.idleSaverSetAudioBands = (b, l, m, t) => {
          try { ex.saver_set_audio_bands(b, l, m, t); } catch (e) {}
        };
      }

      function fit() {
        const w = canvas.clientWidth || 800, h = canvas.clientHeight || 450;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.font = (CELL_H - 3) + "px " + FONT_STACK;
        cellW = Math.max(6, Math.ceil(ctx.measureText("M").width));
        const nCols = Math.min(160, Math.floor(canvas.width / (cellW * dpr)));
        const nRows = Math.min(90, Math.floor(canvas.height / (CELL_H * dpr)));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const isCustom = window.IdleSceneSim && window.IdleSceneSim.has(currentActiveScene);
        const wasmName = WASM_MAP[currentActiveScene];
        if (ex && !host && !isCustom && wasmName) {
          host = createSaver(ex, wasmName, nCols, nRows);
        } else if (ex && host && (nCols !== cols || nRows !== rows)) {
          ex.saver_resize(host, nCols, nRows);
        }
        cols = nCols; rows = nRows;
      }

      function frame(t) {
        if (!running) return;
        const dt = Math.min(t - last || 16.7, 100);
        last = t;
        const w = canvas.clientWidth || 800, h = canvas.clientHeight || 450;
        const accent = currentAccent || [255, 176, 0];

        if (window.IdleSceneSim && window.IdleSceneSim.has(currentActiveScene)) {
          window.IdleSceneSim.render(ctx, w, h, t, currentActiveScene, accent);
        } else if (ex && host) {
          const ptr = ex.saver_tick(host, dt) / 4;
          const u32 = new Uint32Array(ex.memory.buffer);
          paintCells(ctx, u32, ptr, cols, rows, cellW, CELL_H, tiles, accent);
        } else if (window.IdleSceneSim) {
          window.IdleSceneSim.render(ctx, w, h, t, currentActiveScene, accent);
        }
        requestAnimationFrame(frame);
      }

      fit();

      function switchScene(sceneId) {
        currentActiveScene = sceneId;
        window.idleCurrentSceneId = sceneId;
        const stage = canvas.closest(".saver-stage");
        const video = stage ? stage.querySelector("video") : null;
        const panel = canvas.closest(".saver-panel") || document.getElementById("showcase");
        const liveBadge = panel ? panel.querySelector(".saver-badge-live") : null;
        const isCustom = window.IdleSceneSim && window.IdleSceneSim.has(sceneId);
        const wasmName = WASM_MAP[sceneId];
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        canvas.hidden = false;
        canvas.style.display = "block";
        if (video) {
          video.pause();
          video.style.visibility = "hidden";
          video.style.display = "none";
        }

        if (ex && host) {
          try { ex.saver_destroy(host); } catch (e) {}
          host = 0;
        }

        if (!cols || !rows) fit();

        if (ex && !isCustom && wasmName) {
          host = createSaver(ex, wasmName, cols, rows);
          tiles.clear();
        }

        if (liveBadge) {
          liveBadge.textContent = (ex && host) ? "LIVE WASM ENGINE" : "LIVE 60 FPS SIMULATION";
        }

        if (!reduced && !running) {
          running = true;
          last = 0;
          requestAnimationFrame(frame);
        }
      }

      activeSwitchFn = switchScene;
      window.idleSaverRunScene = switchScene;
      if (window.idleCurrentSceneId) switchScene(window.idleCurrentSceneId);

      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !running) {
            running = true; last = 0; requestAnimationFrame(frame);
          } else if (!e.isIntersecting) {
            running = false;
          }
        });
      }, { root: null, threshold: [0, 0.05] });
      io.observe(canvas);

      let rt;
      window.addEventListener("resize", () => {
        clearTimeout(rt);
        rt = setTimeout(fit, 200);
      });
    } catch (e) {
      console.warn("[wasm-saver] init fallback:", e);
    }
  }

  canvases.forEach((c) => arm(c));
})();

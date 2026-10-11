// wasm-saver.js — runs the real Rust saver in-browser.
// Loads assets/wasm/idlescreen.wasm, ticks it per rAF, paints the packed
// TerminalCell buffer to canvas. Falls back to the mp4 on any failure.
(function initWasmSavers() {
  const canvases = document.querySelectorAll("canvas.saver-canvas[data-wasm]");
  if (!canvases.length || !("WebAssembly" in window)) return;

  const CELL_H = 18; // css px per terminal row
  const FONT_STACK = 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace';

  function paintCells(ctx, u32, ptr, cellCount, cellW, cellH, tiles) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, ctx.canvas.clientWidth, ctx.canvas.clientHeight);
    const cols = Math.floor(ctx.canvas.clientWidth / cellW) || 1;
    for (let i = 0; i < cellCount; i++) {
      const ch = u32[ptr + i * 3];
      const fg = u32[ptr + i * 3 + 1];
      const bg = u32[ptr + i * 3 + 2];
      const x = (i % cols) * cellW;
      const y = ((i / cols) | 0) * cellH;
      const bgr = bg & 0xff, bgg = (bg >> 8) & 0xff, bgb = (bg >> 16) & 0xff;
      if (bgr || bgg || bgb) {
        ctx.fillStyle = "rgb(" + bgr + "," + bgg + "," + bgb + ")";
        ctx.fillRect(x, y, cellW, cellH);
      }
      if (ch === 32) continue;
      const key = ch + ":" + fg;
      let tile = tiles.get(key);
      if (!tile) {
        tile = document.createElement("canvas");
        tile.width = cellW;
        tile.height = cellH;
        const tctx = tile.getContext("2d");
        const fgr = fg & 0xff, fgg = (fg >> 8) & 0xff, fgb = (fg >> 16) & 0xff;
        tctx.fillStyle = "rgb(" + fgr + "," + fgg + "," + fgb + ")";
        tctx.font =
          (fg >>> 24 ? "bold " : "") + (cellH - 3) + "px " + FONT_STACK;
        tctx.textBaseline = "top";
        tctx.fillText(String.fromCodePoint(ch), 0, 1);
        tiles.set(key, tile);
      }
      ctx.drawImage(tile, x, y);
    }
  }

  function createSaver(ex, saverId, cols, rows) {
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
      const bytes = await (await fetch(canvas.dataset.wasm)).arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes, {});
      const ex = instance.exports;

      let currentActiveScene = canvas.dataset.saver || "beams";
      let host = 0, cols = 0, rows = 0, cellW = 10, running = false, last = 0;
      const ctx = canvas.getContext("2d");
      const tiles = new Map();

      if (ex.saver_set_accent) {
        window.idleSaverSetAccent = (r, g, b) => {
          try { ex.saver_set_accent(r, g, b); } catch (e) {}
        };
      }
      if (ex.saver_set_audio_bands) {
        window.idleSaverSetAudioBands = (b, l, m, t) => {
          try { ex.saver_set_audio_bands(b, l, m, t); } catch (e) {}
        };
      }

      function fit() {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.font = (CELL_H - 3) + "px " + FONT_STACK;
        cellW = Math.max(6, Math.ceil(ctx.measureText("M").width));
        const nCols = Math.min(160, Math.floor(canvas.width / (cellW * dpr)));
        const nRows = Math.min(90, Math.floor(canvas.height / (CELL_H * dpr)));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (!host) {
          host = createSaver(ex, currentActiveScene, nCols, nRows);
        } else if (nCols !== cols || nRows !== rows) {
          ex.saver_resize(host, nCols, nRows);
        }
        cols = nCols; rows = nRows;
      }

      function frame(t) {
        if (!running || !host) return;
        const dt = Math.min(t - last || 16.7, 100);
        last = t;
        const ptr = ex.saver_tick(host, dt) / 4;
        const u32 = new Uint32Array(ex.memory.buffer);
        paintCells(ctx, u32, ptr, cols * rows, cellW, CELL_H, tiles);
        requestAnimationFrame(frame);
      }

      fit();

      function switchScene(sceneId) {
        currentActiveScene = sceneId;
        const stage = canvas.closest(".saver-stage");
        const video = stage ? stage.querySelector("video") : null;
        const panel = canvas.closest(".saver-panel") || document.getElementById("showcase");
        const liveBadge = panel ? panel.querySelector(".saver-badge-live") : null;

        const isWasmSupported = (sceneId === "beams");
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (isWasmSupported && !reduced) {
          // Live WASM canvas takes over
          canvas.hidden = false;
          if (video) {
            video.pause();
            video.style.visibility = "hidden";
          }
          if (liveBadge) {
            liveBadge.textContent = "LIVE WASM ENGINE";
          }
          if (!running) {
            running = true;
            last = 0;
            requestAnimationFrame(frame);
          }
        } else {
          // Fall back to video playback
          canvas.hidden = true;
          running = false;
          if (video) {
            video.style.visibility = "visible";
            if (!reduced) {
              video.play().catch(() => {});
            }
          }
          if (liveBadge) {
            liveBadge.textContent = "60–144 FPS DYNAMIC";
          }
        }
      }

      window.idleSaverRunScene = switchScene;

      // Check current scene from gallery if already initialized
      if (window.idleCurrentSceneId) {
        switchScene(window.idleCurrentSceneId);
      }

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && currentActiveScene === "beams" && !running) {
              running = true; last = 0;
              requestAnimationFrame(frame);
            } else if (!e.isIntersecting) {
              running = false;
            }
          });
        },
        { root: null, threshold: 0.15 }
      );
      io.observe(canvas);

      let rt;
      window.addEventListener("resize", () => {
        clearTimeout(rt);
        rt = setTimeout(fit, 200);
      });
    } catch (e) {
      console.warn("[wasm-saver] init fallback to video:", e);
    }
  }

  // Arm when showcase scrolls near or on initial load
  const lazy = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          lazy.unobserve(e.target);
          arm(e.target);
        }
      });
    },
    { root: null, rootMargin: "300px" }
  );
  canvases.forEach((c) => lazy.observe(c));
})();

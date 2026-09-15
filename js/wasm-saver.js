// wasm-saver.js — runs the real Rust saver in-browser.
// Loads assets/wasm/beams.wasm, ticks it per rAF, paints the packed
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

  async function arm(canvas) {
    try {
      const bytes = await (await fetch(canvas.dataset.wasm)).arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes, {});
      const ex = instance.exports;
      const ctx = canvas.getContext("2d");
      const tiles = new Map();
      let host = 0, cols = 0, rows = 0, cellW = 10, running = false, last = 0;

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
          host = ex.saver_new(nCols, nRows);
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

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return; // stay on the paused video fallback
      }
      fit();
      if (!host) return;

      // Success — take over from the video
      canvas.hidden = false;
      const stage = canvas.closest(".saver-stage");
      const video = stage && stage.querySelector("video");
      if (video) { video.pause(); video.style.visibility = "hidden"; }
      const panel = canvas.closest(".saver-panel");
      if (panel) {
        const vidBadge = panel.querySelector(".saver-badge:not(.saver-badge-live)");
        const liveBadge = panel.querySelector(".saver-badge-live");
        if (vidBadge) vidBadge.hidden = true;
        if (liveBadge) liveBadge.hidden = false;
      }

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && !running) {
              running = true; last = 0;
              requestAnimationFrame(frame);
            } else if (!e.isIntersecting) {
              running = false;
            }
          });
        },
        { root: document.querySelector(".scroll-port"), threshold: 0.15 }
      );
      io.observe(canvas);
      let rt;
      window.addEventListener("resize", () => {
        clearTimeout(rt);
        rt = setTimeout(fit, 200);
      });
    } catch (e) {
      // wasm unavailable — the video keeps playing as the fallback
      console.warn("[wasm-saver] init failed:", e);
    }
  }

  // Arm only when a live-capable panel scrolls near
  const lazy = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          lazy.unobserve(e.target);
          arm(e.target);
        }
      });
    },
    { root: document.querySelector(".scroll-port"), rootMargin: "200px" }
  );
  canvases.forEach((c) => lazy.observe(c));
})();

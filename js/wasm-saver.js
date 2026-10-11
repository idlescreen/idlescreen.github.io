// wasm-saver.js — runs Rust WASM savers & Scene 38 live spotlight orbit simulation.
// Loads assets/wasm/idlescreen.wasm, ticks per rAF, and renders live terminal scenes.
(function initWasmSavers() {
  const canvases = document.querySelectorAll("canvas.saver-canvas[data-wasm]");
  if (!canvases.length) return;

  const CELL_H = 18;
  const FONT_STACK = 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace';

  function paintCells(ctx, u32, ptr, cellCount, cellW, cellH, tiles) {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, ctx.canvas.clientWidth, ctx.canvas.clientHeight);
    const cols = Math.floor(ctx.canvas.clientWidth / cellW) || 1;
    for (let i = 0; i < cellCount; i++) {
      const ch = u32[ptr + i * 3], fg = u32[ptr + i * 3 + 1], bg = u32[ptr + i * 3 + 2];
      const x = (i % cols) * cellW, y = ((i / cols) | 0) * cellH;
      const bgr = bg & 0xff, bgg = (bg >> 8) & 0xff, bgb = (bg >> 16) & 0xff;
      if (bgr || bgg || bgb) { ctx.fillStyle = "rgb(" + bgr + "," + bgg + "," + bgb + ")"; ctx.fillRect(x, y, cellW, cellH); }
      if (ch === 32) continue;
      const key = ch + ":" + fg;
      let tile = tiles.get(key);
      if (!tile) {
        tile = document.createElement("canvas"); tile.width = cellW; tile.height = cellH;
        const tctx = tile.getContext("2d"), fgr = fg & 0xff, fgg = (fg >> 8) & 0xff, fgb = (fg >> 16) & 0xff;
        tctx.fillStyle = "rgb(" + fgr + "," + fgg + "," + fgb + ")";
        tctx.font = (fg >>> 24 ? "bold " : "") + (cellH - 3) + "px " + FONT_STACK;
        tctx.textBaseline = "top"; tctx.fillText(String.fromCodePoint(ch), 0, 1);
        tiles.set(key, tile);
      }
      ctx.drawImage(tile, x, y);
    }
  }

  function paintSpotlightOrbit(ctx, w, h, t) {
    ctx.fillStyle = "#070809"; ctx.fillRect(0, 0, w, h);
    const wm = window.IdleScreenWordmark;
    if (!wm || !wm.rows) return;
    const cell = Math.max(3, Math.min(Math.floor((w * 0.82) / wm.width), Math.floor((h * 0.54) / wm.height)));
    const ox = Math.round((w - wm.width * cell) / 2), oy = Math.round((h - wm.height * cell) / 2);
    const cx = w * 0.5, cy = h * 0.5, sec = t * 0.001, angle = sec * 1.35;
    const rx = (wm.width * cell) * 0.56 + 24, ry = (wm.height * cell) * 0.90 + 20;
    const sx = cx + rx * Math.cos(angle), sy = cy + ry * Math.sin(angle);
    const reach = Math.max(80, Math.min(w * 0.32, 220)), reachSq = reach * reach;
    const starInFront = Math.sin(angle) >= 0;

    ctx.strokeStyle = "rgba(255, 176, 0, 0.10)"; ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = 1; i <= 6; i++) {
      const ta = angle - i * 0.12;
      ctx.fillStyle = "rgba(255, 212, 71, " + (0.35 - i * 0.05).toFixed(2) + ")";
      ctx.beginPath(); ctx.arc(cx + rx * Math.cos(ta), cy + ry * Math.sin(ta), Math.max(1, 3.5 - i * 0.5), 0, Math.PI * 2); ctx.fill();
    }

    const drawWordmark = () => {
      for (let r = 0; r < wm.height; r++) {
        const row = wm.rows[r];
        for (let c = 0; c < wm.width; c++) {
          if (row[c] !== "1") continue;
          const px = ox + c * cell, py = oy + r * cell;
          const dx = px + cell * 0.5 - sx, dy = py + cell * 0.5 - sy, dsq = dx * dx + dy * dy;
          const spot = dsq < reachSq ? Math.pow(1 - Math.sqrt(dsq) / reach, 2) : 0, lit = 0.18 + spot * 1.6;
          ctx.fillStyle = lit > 1.25 ? "#ffffff" : lit > 0.88 ? "#ffd447" : lit > 0.52 ? "#ffb000" : lit > 0.28 ? "#b87700" : "#553700";
          ctx.fillRect(px, py, cell - 0.6, cell - 0.6);
        }
      }
    };

    const drawStarBeacon = () => {
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, reach * 0.85);
      grad.addColorStop(0, "rgba(255, 240, 160, 0.40)"); grad.addColorStop(0.25, "rgba(255, 212, 71, 0.22)");
      grad.addColorStop(0.6, "rgba(255, 176, 0, 0.06)"); grad.addColorStop(1, "rgba(255, 176, 0, 0)");
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(sx, sy, reach * 0.85, 0, Math.PI * 2); ctx.fill();

      const pulse = 1 + 0.15 * Math.sin(sec * 6), starR = (8.5 + 2 * Math.sin(sec * 4.5)) * pulse;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(angle * 0.7);
      ctx.fillStyle = "#ffd447"; ctx.shadowColor = "#ffd447"; ctx.shadowBlur = 14; ctx.beginPath();
      for (let p = 0; p < 8; p++) {
        const a = (p * Math.PI) / 4, r = p % 2 === 0 ? starR * 1.4 : starR * 0.42;
        p === 0 ? ctx.moveTo(r * Math.cos(a), r * Math.sin(a)) : ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0, 0, starR * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };

    if (!starInFront) { drawStarBeacon(); drawWordmark(); }
    else { drawWordmark(); drawStarBeacon(); }

    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
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

  let activeSwitchFn = null;
  window.idleSaverRunScene = function (id) {
    if (activeSwitchFn) activeSwitchFn(id);
    else window.idleCurrentSceneId = id;
  };

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

      let currentActiveScene = canvas.dataset.saver || "beams";
      let host = 0, cols = 0, rows = 0, cellW = 10, running = false, last = 0;
      const ctx = canvas.getContext("2d"), tiles = new Map();

      if (ex && ex.saver_set_accent) {
        window.idleSaverSetAccent = (r, g, b) => { try { ex.saver_set_accent(r, g, b); } catch (e) {} };
      }
      if (ex && ex.saver_set_audio_bands) {
        window.idleSaverSetAudioBands = (b, l, m, t) => { try { ex.saver_set_audio_bands(b, l, m, t); } catch (e) {} };
      }

      function fit() {
        const w = canvas.clientWidth || 800, h = canvas.clientHeight || 450;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.font = (CELL_H - 3) + "px " + FONT_STACK;
        cellW = Math.max(6, Math.ceil(ctx.measureText("M").width));
        const nCols = Math.min(160, Math.floor(canvas.width / (cellW * dpr)));
        const nRows = Math.min(90, Math.floor(canvas.height / (CELL_H * dpr)));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (ex && !host && currentActiveScene !== "spotlight_orbit") {
          host = createSaver(ex, currentActiveScene, nCols, nRows);
        } else if (ex && host && (nCols !== cols || nRows !== rows)) {
          ex.saver_resize(host, nCols, nRows);
        }
        cols = nCols; rows = nRows;
      }

      function frame(t) {
        if (!running) return;
        const dt = Math.min(t - last || 16.7, 100);
        last = t;
        const isScene38 = (currentActiveScene === "spotlight_orbit" || currentActiveScene === "spotlight");
        if (isScene38) {
          paintSpotlightOrbit(ctx, canvas.clientWidth || 800, canvas.clientHeight || 450, t);
        } else if (ex && host) {
          const ptr = ex.saver_tick(host, dt) / 4;
          const u32 = new Uint32Array(ex.memory.buffer);
          paintCells(ctx, u32, ptr, cols * rows, cellW, CELL_H, tiles);
        }
        requestAnimationFrame(frame);
      }

      fit();

      function switchScene(sceneId) {
        currentActiveScene = sceneId;
        const stage = canvas.closest(".saver-stage"), video = stage ? stage.querySelector("video") : null;
        const panel = canvas.closest(".saver-panel") || document.getElementById("showcase");
        const liveBadge = panel ? panel.querySelector(".saver-badge-live") : null;
        const isScene38 = (sceneId === "spotlight_orbit" || sceneId === "spotlight");
        const isLiveSupported = isScene38 || (sceneId === "beams" && !!ex);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (isLiveSupported) {
          canvas.hidden = false;
          fit();
          if (video) { video.pause(); video.style.visibility = "hidden"; }
          if (liveBadge) liveBadge.textContent = isScene38 ? "LIVE 60 FPS SIMULATION" : "LIVE WASM ENGINE";
          if (isScene38) paintSpotlightOrbit(ctx, canvas.clientWidth || 800, canvas.clientHeight || 450, performance.now());
          if (!reduced && !running) {
            running = true; last = 0; requestAnimationFrame(frame);
          }
        } else {
          canvas.hidden = true; running = false;
          if (video) {
            video.style.visibility = "visible";
            if (!reduced) video.play().catch(() => {});
          }
          if (liveBadge) liveBadge.textContent = "60–144 FPS DYNAMIC";
        }
      }

      activeSwitchFn = switchScene;
      window.idleSaverRunScene = switchScene;
      if (window.idleCurrentSceneId) switchScene(window.idleCurrentSceneId);

      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          const isLive = (currentActiveScene === "spotlight_orbit" || currentActiveScene === "beams");
          if (e.isIntersecting && isLive && !running) {
            running = true; last = 0; requestAnimationFrame(frame);
          } else if (!e.isIntersecting && currentActiveScene !== "spotlight_orbit") {
            running = false;
          }
        });
      }, { root: null, threshold: 0.15 });
      io.observe(canvas);

      let rt;
      window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(fit, 200); });
    } catch (e) {
      console.warn("[wasm-saver] init fallback:", e);
    }
  }

  canvases.forEach((c) => arm(c));
})();

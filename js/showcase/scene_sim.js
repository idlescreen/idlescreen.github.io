// js/showcase/scene_sim.js — procedural ASCII simulation engine
(function initSceneSim() {

  function rgbStr(r, g, b, a = 1) {
    return a < 1 ? `rgba(${r},${g},${b},${a.toFixed(2)})` : `rgb(${r},${g},${b})`;
  }

  function getCycleAlpha(t) {
    const cycle = (t * 0.001) % 3.2;
    if (cycle < 0.6 || cycle >= 2.6) return 0.95;
    if (cycle < 1.2) return 0.95 - 0.75 * ((cycle - 0.6) / 0.6);
    if (cycle < 2.0) return 0.20;
    return 0.20 + 0.75 * ((cycle - 2.0) / 0.6);
  }

  function drawAsciiText(ctx, w, h, t, acc, alpha = 0.8) {
    const [ar, ag, ab] = acc || [255, 176, 0];
    const wm = window.IdleScreenWordmark;

    ctx.save();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    if (wm && wm.rows) {
      const cell = Math.max(2, Math.min(Math.floor((w * 0.82) / wm.width), Math.floor((h * 0.54) / wm.height)));
      const ox = Math.round((w - wm.width * cell) / 2);
      const oy = Math.round((h - wm.height * cell) / 2);
      ctx.fillStyle = rgbStr(ar, ag, ab, alpha);
      for (let r = 0; r < wm.height; r++) {
        for (let c = 0; c < wm.width; c++) {
          if (wm.rows[r][c] === "1") ctx.fillRect(ox + c * cell, oy + r * cell, cell - 0.6, cell - 0.6);
        }
      }
    }
    ctx.restore();
  }

  window.IdleSceneText = { draw: drawAsciiText, alpha: getCycleAlpha, rgb: rgbStr };

  function renderSpotlightOrbit(ctx, w, h, t, acc) {
    ctx.fillStyle = "#070809"; ctx.fillRect(0, 0, w, h);
    const [ar, ag, ab] = acc || window.idleCurrentAccent || [255, 176, 0], wm = window.IdleScreenWordmark;
    const cx = w * 0.5, cy = h * 0.5, sec = t * 0.001, angle = sec * 1.35;
    const reach = Math.max(70, Math.min(w * 0.32, 220)), reachSq = reach * reach;
    const starInFront = Math.sin(angle) >= 0;
    let cell = 6, ox = 0, oy = 0, rx = w * 0.38, ry = h * 0.28;
    if (wm && wm.rows) {
      cell = Math.max(2, Math.min(Math.floor((w * 0.82) / wm.width), Math.floor((h * 0.54) / wm.height)));
      ox = Math.round((w - wm.width * cell) / 2); oy = Math.round((h - wm.height * cell) / 2);
      rx = Math.min((wm.width * cell) * 0.56 + 24, w * 0.47);
      ry = Math.min((wm.height * cell) * 0.90 + 20, h * 0.44);
    }
    const sx = cx + rx * Math.cos(angle), sy = cy + ry * Math.sin(angle);
    ctx.strokeStyle = rgbStr(ar, ag, ab, 0.12); ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = 1; i <= 6; i++) {
      const ta = angle - i * 0.12;
      ctx.fillStyle = rgbStr(ar, ag, ab, Math.max(0.04, 0.35 - i * 0.05));
      ctx.beginPath(); ctx.arc(cx + rx * Math.cos(ta), cy + ry * Math.sin(ta), Math.max(1, 3.5 - i * 0.5), 0, Math.PI * 2); ctx.fill();
    }
    const drawWordmark = () => {
      if (wm && wm.rows) {
        ctx.save();
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        for (let r = 0; r < wm.height; r++) {
          for (let c = 0; c < wm.width; c++) {
            if (wm.rows[r][c] !== "1") continue;
            const px = ox + c * cell, py = oy + r * cell;
            const dx = px + cell * 0.5 - sx, dy = py + cell * 0.5 - sy, dsq = dx * dx + dy * dy;
            const spot = dsq < reachSq ? Math.pow(1 - Math.sqrt(dsq) / reach, 2) : 0, lit = 0.18 + spot * 1.6;
            ctx.fillStyle = lit > 1.25 ? "#ffffff" : lit > 0.88 ? rgbStr(Math.min(255, ar + 50), Math.min(255, ag + 50), Math.min(255, ab + 50)) : lit > 0.52 ? rgbStr(ar, ag, ab) : lit > 0.28 ? rgbStr(Math.round(ar * 0.7), Math.round(ag * 0.7), Math.round(ab * 0.7)) : rgbStr(Math.round(ar * 0.35), Math.round(ag * 0.35), Math.round(ab * 0.35));
            ctx.fillRect(px, py, cell - 0.6, cell - 0.6);
          }
        }
        ctx.restore();
      }
    };
    const drawBeacon = () => {
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, reach * 0.85);
      grad.addColorStop(0, rgbStr(255, 255, 255, 0.45)); grad.addColorStop(0.25, rgbStr(ar, ag, ab, 0.25));
      grad.addColorStop(0.6, rgbStr(ar, ag, ab, 0.08)); grad.addColorStop(1, rgbStr(ar, ag, ab, 0));
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(sx, sy, reach * 0.85, 0, Math.PI * 2); ctx.fill();
      const pulse = 1 + 0.15 * Math.sin(sec * 6), starR = (8.5 + 2 * Math.sin(sec * 4.5)) * pulse;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(angle * 0.7);
      ctx.fillStyle = rgbStr(ar, ag, ab); ctx.shadowColor = rgbStr(ar, ag, ab); ctx.shadowBlur = 14; ctx.beginPath();
      for (let p = 0; p < 8; p++) {
        const a = (p * Math.PI) / 4, r = p % 2 === 0 ? starR * 1.4 : starR * 0.42;
        p === 0 ? ctx.moveTo(r * Math.cos(a), r * Math.sin(a)) : ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0, 0, starR * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    if (!starInFront) { drawBeacon(); drawWordmark(); } else { drawWordmark(); drawBeacon(); }
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)"; for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  }

  function renderGenericFallback(ctx, w, h, t, acc) {
    const [ar, ag, ab] = acc || [255, 176, 0];
    ctx.fillStyle = "rgba(7, 8, 9, 0.25)"; ctx.fillRect(0, 0, w, h);
    const sec = t * 0.001, cx = w * 0.5, cy = h * 0.5;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + sec * (0.4 + (i % 3) * 0.2), rad = 40 + ((i * 19 + sec * 50) % Math.min(w * 0.4, h * 0.4));
      ctx.fillStyle = rgbStr(ar, ag, ab, Math.max(0.12, 0.8 - rad / (w * 0.45)));
      const sz = i % 2 === 0 ? 2 : 3;
      ctx.fillRect(Math.round(cx + Math.cos(a) * rad - sz * 0.5), Math.round(cy + Math.sin(a) * rad - sz * 0.5), sz, sz);
    }
  }

  const BASE_RENDERERS = {
    spotlight_orbit: renderSpotlightOrbit,
    spotlight: renderSpotlightOrbit
  };

  window.IdleSceneSim = {
    has(sceneId) {
      const procs = window.IdleProceduralScenes || {};
      return Boolean(BASE_RENDERERS[sceneId] || procs[sceneId]);
    },
    render(ctx, w, h, t, sceneId, accent) {
      const procs = window.IdleProceduralScenes || {};
      const fn = BASE_RENDERERS[sceneId] || procs[sceneId] || renderGenericFallback;
      fn(ctx, w, h, t, accent || [255, 176, 0]);
    }
  };
})();

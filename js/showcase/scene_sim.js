// js/showcase/scene_sim.js — procedural ASCII simulations for interactive showcase
(function initSceneSim() {
  const FONT = 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace';

  function rgbStr(r, g, b, a = 1) {
    return a < 1 ? `rgba(${r},${g},${b},${a.toFixed(2)})` : `rgb(${r},${g},${b})`;
  }

  function renderSpotlightOrbit(ctx, w, h, t, acc) {
    ctx.fillStyle = "#070809"; ctx.fillRect(0, 0, w, h);
    const [ar, ag, ab] = acc;
    const wm = window.IdleScreenWordmark;
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
        for (let r = 0; r < wm.height; r++) {
          const row = wm.rows[r];
          for (let c = 0; c < wm.width; c++) {
            if (row[c] !== "1") continue;
            const px = ox + c * cell, py = oy + r * cell;
            const dx = px + cell * 0.5 - sx, dy = py + cell * 0.5 - sy, dsq = dx * dx + dy * dy;
            const spot = dsq < reachSq ? Math.pow(1 - Math.sqrt(dsq) / reach, 2) : 0, lit = 0.18 + spot * 1.6;
            ctx.fillStyle = lit > 1.25 ? "#ffffff" : lit > 0.88 ? rgbStr(Math.min(255, ar + 50), Math.min(255, ag + 50), Math.min(255, ab + 50)) : lit > 0.52 ? rgbStr(ar, ag, ab) : lit > 0.28 ? rgbStr(Math.round(ar * 0.7), Math.round(ag * 0.7), Math.round(ab * 0.7)) : rgbStr(Math.round(ar * 0.35), Math.round(ag * 0.35), Math.round(ab * 0.35));
            ctx.fillRect(px, py, cell - 0.6, cell - 0.6);
          }
        }
      } else {
        const text = "idlescreen", fs = Math.round(Math.min(w * 0.10, 64));
        ctx.font = "bold " + fs + "px " + FONT;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const dx = cx - sx, dy = cy - sy, dsq = dx * dx + dy * dy;
        const spot = dsq < reachSq ? Math.pow(1 - Math.sqrt(dsq) / reach, 2) : 0, lit = 0.25 + spot * 1.5;
        ctx.fillStyle = lit > 1.1 ? "#ffffff" : lit > 0.7 ? rgbStr(Math.min(255, ar + 40), Math.min(255, ag + 40), Math.min(255, ab + 40)) : lit > 0.4 ? rgbStr(ar, ag, ab) : rgbStr(Math.round(ar * 0.7), Math.round(ag * 0.7), Math.round(ab * 0.7));
        ctx.fillText(text, cx, cy);
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
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  }

  function renderMatrix(ctx, w, h, t, [ar, ag, ab]) {
    ctx.fillStyle = "rgba(7, 8, 9, 0.25)"; ctx.fillRect(0, 0, w, h);
    const cellW = 12, cellH = 18, cols = Math.floor(w / cellW), rows = Math.floor(h / cellH);
    ctx.font = "14px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "top";
    const chars = "0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈ";
    for (let c = 0; c < cols; c++) {
      const speed = 0.8 + ((c * 17) % 7) * 0.2;
      const headY = Math.floor(((t * 0.04 * speed) + c * 3) % (rows + 15));
      for (let r = 0; r < rows; r++) {
        const dist = headY - r;
        if (dist >= 0 && dist < 14) {
          const ch = chars[(c * 31 + r * 7 + (t >> 6)) % chars.length];
          if (dist === 0) {
            ctx.fillStyle = "#ffffff";
          } else {
            const alpha = Math.max(0.1, 1 - dist / 14);
            ctx.fillStyle = rgbStr(ar, ag, ab, alpha);
          }
          ctx.fillText(ch, c * cellW + cellW * 0.5, r * cellH);
        }
      }
    }
  }

  function renderSynthgrid(ctx, w, h, t, [ar, ag, ab]) {
    ctx.fillStyle = "#070809"; ctx.fillRect(0, 0, w, h);
    const horizon = h * 0.42, cx = w * 0.5, sec = t * 0.001;
    ctx.strokeStyle = rgbStr(ar, ag, ab, 0.25); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(w, horizon); ctx.stroke();

    const sunR = Math.min(w * 0.16, 70);
    const sunGrad = ctx.createLinearGradient(cx, horizon - sunR, cx, horizon);
    sunGrad.addColorStop(0, rgbStr(255, 255, 255, 0.9)); sunGrad.addColorStop(0.5, rgbStr(ar, ag, ab, 0.8)); sunGrad.addColorStop(1, rgbStr(ar, ag, ab, 0.1));
    ctx.fillStyle = sunGrad; ctx.beginPath(); ctx.arc(cx, horizon, sunR, Math.PI, 0); ctx.fill();

    const speed = (sec * 60) % 36;
    for (let y = horizon + speed; y < h; y += Math.max(12, (y - horizon) * 0.35)) {
      const alpha = Math.min(0.85, (y - horizon) / (h - horizon));
      ctx.strokeStyle = rgbStr(ar, ag, ab, alpha);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    const rayCount = 18;
    for (let i = -rayCount; i <= rayCount; i++) {
      const bottomX = cx + (i / rayCount) * w * 1.4;
      ctx.strokeStyle = rgbStr(ar, ag, ab, 0.35);
      ctx.beginPath(); ctx.moveTo(cx, horizon); ctx.lineTo(bottomX, h); ctx.stroke();
    }
  }

  function renderRain(ctx, w, h, t, [ar, ag, ab]) {
    ctx.fillStyle = "rgba(7, 8, 9, 0.3)"; ctx.fillRect(0, 0, w, h);
    ctx.font = "14px " + FONT;
    const count = 55, sec = t * 0.001;
    for (let i = 0; i < count; i++) {
      const x = (Math.sin(i * 99) * 0.5 + 0.5) * w + (sec * 120) % w;
      const y = (Math.cos(i * 33) * 0.5 + 0.5) * h + (sec * (300 + (i % 5) * 80)) % h;
      const ch = i % 3 === 0 ? "/" : i % 3 === 1 ? "|" : "\\";
      ctx.fillStyle = rgbStr(ar, ag, ab, 0.4 + (i % 4) * 0.15);
      ctx.fillText(ch, x % w, y % h);
      if (y % h > h - 25) {
        ctx.strokeStyle = rgbStr(ar, ag, ab, 0.3); ctx.beginPath();
        ctx.ellipse(x % w, h - 10, 8, 3, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  function renderWaves(ctx, w, h, t, [ar, ag, ab]) {
    ctx.fillStyle = "#070809"; ctx.fillRect(0, 0, w, h);
    const sec = t * 0.001, glyphs = ["~", "^", "v", "≈", "-", "·"];
    ctx.font = "13px " + FONT; ctx.textAlign = "center";
    for (let line = 0; line < 12; line++) {
      const baseY = h * 0.25 + line * (h * 0.05);
      const alpha = 0.2 + (line / 12) * 0.7;
      ctx.fillStyle = rgbStr(ar, ag, ab, alpha);
      for (let x = 10; x < w; x += 16) {
        const offset = Math.sin(x * 0.02 + sec * 3 + line * 0.7) * 14 + Math.cos(x * 0.04 - sec * 2) * 8;
        const g = glyphs[Math.abs(Math.floor(offset * 0.3)) % glyphs.length];
        ctx.fillText(g, x, baseY + offset);
      }
    }
  }

  function renderBinaryPath(ctx, w, h, t, [ar, ag, ab]) {
    ctx.fillStyle = "rgba(7, 8, 9, 0.25)"; ctx.fillRect(0, 0, w, h);
    const sec = t * 0.001, cellW = 16, cellH = 20, cols = Math.floor(w / cellW), rows = Math.floor(h / cellH);
    ctx.font = "12px " + FONT; ctx.textAlign = "center";
    for (let r = 1; r < rows - 1; r += 2) {
      const flow = Math.floor((sec * 12 + r * 5) % cols);
      for (let c = 1; c < cols - 1; c++) {
        const isPulse = Math.abs(c - flow) < 2;
        const bit = ((c * 13 + r * 7 + (t >> 7)) % 2) ? "1" : "0";
        ctx.fillStyle = isPulse ? "#ffffff" : rgbStr(ar, ag, ab, 0.35);
        ctx.fillText(bit, c * cellW, r * cellH);
      }
    }
  }

  function renderVhsTape(ctx, w, h, t, [ar, ag, ab]) {
    ctx.fillStyle = "#070809"; ctx.fillRect(0, 0, w, h);
    const sec = t * 0.001, jitter = Math.sin(sec * 45) * (Math.random() > 0.85 ? 12 : 2);
    ctx.font = "bold 28px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = rgbStr(ar, ag, ab, 0.2); ctx.fillText("[ PLAY ▷ 00:42:19 SP ]", w * 0.5 - 3 + jitter, h * 0.4);
    ctx.fillStyle = rgbStr(ar, ag, ab, 0.9); ctx.fillText("[ PLAY ▷ 00:42:19 SP ]", w * 0.5 + jitter, h * 0.4);
    const noiseBarY = (sec * 180) % h;
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)"; ctx.fillRect(0, noiseBarY, w, 18);
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2);
  }

  function renderBouncyBalls(ctx, w, h, t, [ar, ag, ab]) {
    ctx.fillStyle = "rgba(7, 8, 9, 0.25)"; ctx.fillRect(0, 0, w, h);
    const sec = t * 0.001; ctx.font = "bold 18px " + FONT; ctx.textAlign = "center";
    for (let i = 0; i < 7; i++) {
      const vx = 90 + i * 25, vy = 110 + i * 35;
      const x = Math.abs(((sec * vx + i * 60) % ((w - 40) * 2)) - (w - 40)) + 20;
      const y = Math.abs(((sec * vy + i * 90) % ((h - 40) * 2)) - (h - 40)) + 20;
      ctx.fillStyle = rgbStr(ar, ag, ab, 0.85); ctx.fillText(i % 2 === 0 ? "●" : "◎", x, y);
    }
  }

  function renderGenericFallback(ctx, w, h, t, sceneId, [ar, ag, ab]) {
    ctx.fillStyle = "rgba(7, 8, 9, 0.25)"; ctx.fillRect(0, 0, w, h);
    const sec = t * 0.001, cx = w * 0.5, cy = h * 0.5;
    ctx.font = "14px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const glyphs = ["+", "*", "·", "✦", "✧", "#", "%"];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2 + sec * (0.4 + (i % 3) * 0.2);
      const rad = 40 + ((i * 19 + sec * 50) % Math.min(w * 0.4, h * 0.4));
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      const g = glyphs[i % glyphs.length];
      ctx.fillStyle = rgbStr(ar, ag, ab, Math.max(0.15, 1 - rad / (w * 0.45)));
      ctx.fillText(g, x, y);
    }
  }

  const CUSTOM_RENDERERS = {
    spotlight_orbit: renderSpotlightOrbit,
    spotlight: renderSpotlightOrbit,
    matrix: renderMatrix,
    synthgrid: renderSynthgrid,
    rain: renderRain,
    waves: renderWaves,
    binarypath: renderBinaryPath,
    vhstape: renderVhsTape,
    bouncyballs: renderBouncyBalls,
  };

  window.IdleSceneSim = {
    has(sceneId) {
      return Boolean(CUSTOM_RENDERERS[sceneId]);
    },
    render(ctx, w, h, t, sceneId, accent) {
      const fn = CUSTOM_RENDERERS[sceneId] || renderGenericFallback;
      fn(ctx, w, h, t, accent || [255, 176, 0]);
    }
  };
})();

// js/showcase/procedural_scenes.js — procedural renderers for interactive showcase
(function initProceduralScenes() {
  function getAcc(acc) {
    return acc || window.idleCurrentAccent || [255, 176, 0];
  }


  function rgbStr(r, g, b, a = 1) {
    return window.IdleSceneText ? window.IdleSceneText.rgb(r, g, b, a) : `rgb(${r},${g},${b})`;
  }

  const FONT = 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace';

  function renderMatrix(ctx, w, h, t, acc) {
    const [ar, ag, ab] = getAcc(acc);
    ctx.fillStyle = "rgba(7, 8, 9, 0.25)"; ctx.fillRect(0, 0, w, h);
    const cellW = 12, cellH = 18, cols = Math.floor(w / cellW), rows = Math.floor(h / cellH);
    ctx.font = "14px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "top";
    const chars = "0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈ";
    for (let c = 0; c < cols; c++) {
      const speed = 0.8 + ((c * 17) % 7) * 0.2, headY = Math.floor(((t * 0.04 * speed) + c * 3) % (rows + 15));
      for (let r = 0; r < rows; r++) {
        const dist = headY - r;
        if (dist >= 0 && dist < 14) {
          const ch = chars[(c * 31 + r * 7 + (t >> 6)) % chars.length];
          ctx.fillStyle = dist === 0 ? "#ffffff" : rgbStr(ar, ag, ab, Math.max(0.1, 1 - dist / 14));
          ctx.fillText(ch, c * cellW + cellW * 0.5, r * cellH);
        }
      }
    }
  }

  function renderSynthgrid(ctx, w, h, t, acc) {
    const [ar, ag, ab] = getAcc(acc);
    ctx.fillStyle = "#070809"; ctx.fillRect(0, 0, w, h);
    const horizon = h * 0.42, cx = w * 0.5, sec = t * 0.001;
    ctx.strokeStyle = rgbStr(ar, ag, ab, 0.25); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(w, horizon); ctx.stroke();
    const sunR = Math.min(w * 0.16, 70), sunGrad = ctx.createLinearGradient(cx, horizon - sunR, cx, horizon);
    sunGrad.addColorStop(0, rgbStr(255, 255, 255, 0.9)); sunGrad.addColorStop(0.5, rgbStr(ar, ag, ab, 0.8)); sunGrad.addColorStop(1, rgbStr(ar, ag, ab, 0.1));
    ctx.fillStyle = sunGrad; ctx.beginPath(); ctx.arc(cx, horizon, sunR, Math.PI, 0); ctx.fill();
    const speed = (sec * 60) % 36;
    for (let y = horizon + speed; y < h; y += Math.max(12, (y - horizon) * 0.35)) {
      ctx.strokeStyle = rgbStr(ar, ag, ab, Math.min(0.85, (y - horizon) / (h - horizon)));
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let i = -18; i <= 18; i++) {
      ctx.strokeStyle = rgbStr(ar, ag, ab, 0.35); ctx.beginPath();
      ctx.moveTo(cx, horizon); ctx.lineTo(cx + (i / 18) * w * 1.4, h); ctx.stroke();
    }
  }

  function renderRain(ctx, w, h, t, acc) {
    const [ar, ag, ab] = getAcc(acc);
    ctx.fillStyle = "rgba(7, 8, 9, 0.3)"; ctx.fillRect(0, 0, w, h);
    ctx.font = "14px " + FONT; const count = 55, sec = t * 0.001;
    for (let i = 0; i < count; i++) {
      const x = (Math.sin(i * 99) * 0.5 + 0.5) * w + (sec * 120) % w;
      const y = (Math.cos(i * 33) * 0.5 + 0.5) * h + (sec * (300 + (i % 5) * 80)) % h;
      ctx.fillStyle = rgbStr(ar, ag, ab, 0.4 + (i % 4) * 0.15);
      ctx.fillText(i % 3 === 0 ? "/" : i % 3 === 1 ? "|" : "\\", x % w, y % h);
      if (y % h > h - 25) {
        ctx.strokeStyle = rgbStr(ar, ag, ab, 0.3); ctx.beginPath();
        ctx.ellipse(x % w, h - 10, 8, 3, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  function renderWaves(ctx, w, h, t, acc) {
    const [ar, ag, ab] = getAcc(acc);
    ctx.fillStyle = "#070809"; ctx.fillRect(0, 0, w, h);
    const sec = t * 0.001, glyphs = ["~", "^", "v", "≈", "-", "·"];
    ctx.font = "13px " + FONT; ctx.textAlign = "center";
    for (let line = 0; line < 12; line++) {
      const baseY = h * 0.25 + line * (h * 0.05);
      ctx.fillStyle = rgbStr(ar, ag, ab, 0.2 + (line / 12) * 0.7);
      for (let x = 10; x < w; x += 16) {
        const off = Math.sin(x * 0.02 + sec * 3 + line * 0.7) * 14 + Math.cos(x * 0.04 - sec * 2) * 8;
        ctx.fillText(glyphs[Math.abs(Math.floor(off * 0.3)) % glyphs.length], x, baseY + off);
      }
    }
  }

  function renderBinaryPath(ctx, w, h, t, acc) {
    const [ar, ag, ab] = getAcc(acc);
    ctx.fillStyle = "rgba(7, 8, 9, 0.25)"; ctx.fillRect(0, 0, w, h);
    const sec = t * 0.001, cellW = 16, cellH = 20, cols = Math.floor(w / cellW), rows = Math.floor(h / cellH);
    ctx.font = "12px " + FONT; ctx.textAlign = "center";
    for (let r = 1; r < rows - 1; r += 2) {
      const flow = Math.floor((sec * 12 + r * 5) % cols);
      for (let c = 1; c < cols - 1; c++) {
        const isPulse = Math.abs(c - flow) < 2, bit = ((c * 13 + r * 7 + (t >> 7)) % 2) ? "1" : "0";
        ctx.fillStyle = isPulse ? "#ffffff" : rgbStr(ar, ag, ab, 0.35);
        ctx.fillText(bit, c * cellW, r * cellH);
      }
    }
  }

  let vhsScanPattern = null;
  function getVhsScanPattern(ctx) {
    if (!vhsScanPattern) {
      const p = document.createElement("canvas");
      p.width = 1; p.height = 4;
      const pctx = p.getContext("2d");
      pctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      pctx.fillRect(0, 0, 1, 2);
      vhsScanPattern = ctx.createPattern(p, "repeat");
    }
    return vhsScanPattern;
  }

  function renderVhsTape(ctx, w, h, t, acc) {
    const [ar, ag, ab] = getAcc(acc);
    ctx.fillStyle = "#070809"; ctx.fillRect(0, 0, w, h);
    const sec = t * 0.001, jitter = Math.sin(sec * 45) * (Math.random() > 0.85 ? 12 : 2);
    ctx.font = "bold 28px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = rgbStr(ar, ag, ab, 0.2); ctx.fillText("[ PLAY ▷ 00:42:19 SP ]", w * 0.5 - 3 + jitter, h * 0.32);
    ctx.fillStyle = rgbStr(ar, ag, ab, 0.9); ctx.fillText("[ PLAY ▷ 00:42:19 SP ]", w * 0.5 + jitter, h * 0.32);
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)"; ctx.fillRect(0, (sec * 180) % h, w, 18);
    const vhsP = getVhsScanPattern(ctx);
    if (vhsP) { ctx.fillStyle = vhsP; ctx.fillRect(0, 0, w, h); }
  }

  function renderBouncyBalls(ctx, w, h, t, acc) {
    const [ar, ag, ab] = getAcc(acc);
    ctx.fillStyle = "rgba(7, 8, 9, 0.25)"; ctx.fillRect(0, 0, w, h);
    const sec = t * 0.001; ctx.font = "bold 18px " + FONT; ctx.textAlign = "center";
    for (let i = 0; i < 7; i++) {
      const vx = 90 + i * 25, vy = 110 + i * 35;
      const x = Math.abs(((sec * vx + i * 60) % ((w - 40) * 2)) - (w - 40)) + 20;
      const y = Math.abs(((sec * vy + i * 90) % ((h - 40) * 2)) - (h - 40)) + 20;
      ctx.fillStyle = rgbStr(ar, ag, ab, 0.85); ctx.fillText(i % 2 === 0 ? "●" : "◎", x, y);
    }
  }

  function renderMiddleout(ctx, w, h, t, acc) {
    const [ar, ag, ab] = getAcc(acc);
    ctx.fillStyle = "rgba(7, 8, 9, 0.3)"; ctx.fillRect(0, 0, w, h);
    const sec = t * 0.001, cx = w * 0.5, cy = h * 0.5, phase = (sec * 0.6) % 1.0;
    const spanX = phase * cx * 0.95, spanY = phase * cy * 0.8;
    ctx.font = "bold 14px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = -16; i <= 16; i++) {
      const x = cx + (i / 16) * spanX, y = cy + Math.sin(i * 0.45 + sec * 3) * spanY * 0.35;
      ctx.fillStyle = Math.abs(i) < 2 ? "#ffffff" : rgbStr(ar, ag, ab, 0.25 + 0.75 * phase);
      ctx.fillText(i === 0 ? "■" : (i % 2 === 0 ? "◀" : "▶"), x, y);
    }
  }

  function renderPrint(ctx, w, h, t, acc) {
    const [ar, ag, ab] = getAcc(acc);
    ctx.fillStyle = "rgba(7, 8, 9, 0.3)"; ctx.fillRect(0, 0, w, h);
    const sec = t * 0.001, cellW = 12, cellH = 18, cols = Math.floor(w / cellW), rows = Math.floor(h / cellH);
    const curRow = Math.floor((sec * 1.6) % Math.min(rows, 16)), headX = Math.floor((sec * cols * 2.4) % (cols + 10));
    ctx.font = "13px " + FONT; ctx.textAlign = "left"; ctx.textBaseline = "top";
    for (let r = 0; r <= curRow; r++) {
      const maxC = r === curRow ? Math.min(cols, headX) : cols;
      for (let c = 0; c < maxC; c += 2) {
        ctx.fillStyle = (r === curRow && c >= maxC - 2) ? "#ffffff" : rgbStr(ar, ag, ab, 0.65);
        ctx.fillText("░▒▓"[(c + r) % 3], c * cellW, r * cellH);
      }
    }
    if (headX < cols) { ctx.fillStyle = "#ffffff"; ctx.fillRect(headX * cellW, curRow * cellH, 3, cellH); }
  }

  function renderSlice(ctx, w, h, t, acc) {
    const [ar, ag, ab] = getAcc(acc);
    ctx.fillStyle = "#070809"; ctx.fillRect(0, 0, w, h);
    const sec = t * 0.001, slices = 12, sliceH = h / slices;
    ctx.font = "bold 15px " + FONT; ctx.textBaseline = "middle";
    for (let i = 0; i < slices; i++) {
      const shift = Math.sin(sec * 2.5 + i * 0.8) * (w * 0.22) * (i % 2 === 0 ? 1 : -1);
      ctx.fillStyle = rgbStr(ar, ag, ab, 0.35 + (i / slices) * 0.6);
      ctx.fillText("░▒▓█▓▒░ SLICE // TECTONIC SHEAR ░▒▓█▓▒░", (w * 0.5) + shift - 160, (i + 0.5) * sliceH);
    }
  }

  function renderWipe(ctx, w, h, t, acc) {
    const [ar, ag, ab] = getAcc(acc);
    ctx.fillStyle = "rgba(7, 8, 9, 0.25)"; ctx.fillRect(0, 0, w, h);
    const sec = t * 0.001, cellW = 14, cellH = 18, cols = Math.floor(w / cellW), rows = Math.floor(h / cellH);
    const wipePos = (sec * 24) % (cols + rows + 12);
    ctx.font = "13px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const diag = c + r;
        if (Math.abs(diag - wipePos) < 2) {
          ctx.fillStyle = "#ffffff"; ctx.fillText("▓", (c + 0.5) * cellW, (r + 0.5) * cellH);
        } else if (diag < wipePos) {
          ctx.fillStyle = rgbStr(ar, ag, ab, 0.45); ctx.fillText("·", (c + 0.5) * cellW, (r + 0.5) * cellH);
        }
      }
    }
  }

  window.IdleProceduralScenes = {
    matrix: renderMatrix,
    synthgrid: renderSynthgrid,
    rain: renderRain,
    waves: renderWaves,
    binarypath: renderBinaryPath,
    vhstape: renderVhsTape,
    bouncyballs: renderBouncyBalls,
    middleout: renderMiddleout,
    print: renderPrint,
    slice: renderSlice,
    wipe: renderWipe
  };
})();

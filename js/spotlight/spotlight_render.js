/**
 * js/spotlight/spotlight_render.js — Fixed Global Plasma & Interactive Spotlight Engine.
 *
 * Implements fixed global background canvas, dynamic pixel field, Bayer ordered dithering,
 * smooth transition from full intro intensity to subdued reading mode (12-15% opacity),
 * ambient cursor halo across all page sections and behind cards, and throttled render loop.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('spotlight-canvas');
  if (!canvas) return;
  var stage = document.getElementById('intro');
  var ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  var BAYER = [
     0, 32,  8, 40,  2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44,  4, 36, 14, 46,  6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
     3, 35, 11, 43,  1, 33,  9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47,  7, 39, 13, 45,  5, 37, 63, 31, 55, 23, 61, 29, 53, 21
  ];

  var N = 128;
  var noiseTable = (function () {
    var seed = 10407530, buf = new Float32Array(N * N);
    for (var i = 0; i < buf.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      buf[i] = seed / 4294967296;
    }
    for (var p = 0; p < 2; p++) {
      var next = new Float32Array(N * N);
      for (var y = 0; y < N; y++) {
        for (var x = 0; x < N; x++) {
          var sum = 0;
          for (var dy = -1; dy <= 1; dy++) {
            for (var dx = -1; dx <= 1; dx++) sum += buf[((y + dy + N) % N) * N + ((x + dx + N) % N)];
          }
          next[y * N + x] = sum / 9;
        }
      }
      buf = next;
    }
    var min = Infinity, max = -Infinity;
    for (var j = 0; j < buf.length; j++) {
      if (buf[j] < min) min = buf[j];
      if (buf[j] > max) max = buf[j];
    }
    var span = max - min || 1;
    for (var k = 0; k < buf.length; k++) buf[k] = (buf[k] - min) / span;
    return buf;
  })();

  function sampleNoise(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    var x0 = (ix % N + N) % N, y0 = (iy % N + N) % N, x1 = (x0 + 1) % N, y1 = (y0 + 1) % N;
    var sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return (noiseTable[y0 * N + x0] * (1 - sx) + noiseTable[y0 * N + x1] * sx) * (1 - sy) +
           (noiseTable[y1 * N + x0] * (1 - sx) + noiseTable[y1 * N + x1] * sx) * sy;
  }

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dpr = 1, width = 0, height = 0, cellPx = 8, originX = 0, gridCols = 0, gridRows = 0;
  var wmWidth = 95, wmHeight = 19, wmRows = [];
  var mouse = { x: -2000, y: -2000, active: false };
  var smoothMouse = { x: -2000, y: -2000, strength: 0 };
  var wander = { x: 0, y: 0, reach: 180 };
  var ripples = [], rafId = 0, isVisible = true;
  var currentSubdued = 0, targetSubdued = 0, lastPointerTime = 0, lastRender = 0;

  function initWordmark() {
    var d = window.IdleScreenWordmark;
    if (d && d.rows) { wmWidth = d.width; wmHeight = d.height; wmRows = d.rows; }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.round(window.innerWidth * dpr);
    height = Math.round(window.innerHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    var targetW = Math.min(width * 0.92, 980 * dpr);
    cellPx = Math.max(3, Math.floor(targetW / wmWidth));
    originX = Math.round((width - wmWidth * cellPx) / 2);
    gridCols = Math.ceil(width / cellPx) + 1;
    gridRows = Math.ceil(height / cellPx) + 1;
    wander.reach = 190 * dpr;
    if (reducedMotion) render(0);
  }

  function updateScroll() {
    if (!stage) { targetSubdued = 1; return; }
    var rect = stage.getBoundingClientRect();
    var stageH = stage.offsetHeight || window.innerHeight;
    var scrollPast = Math.max(0, -rect.top);
    targetSubdued = Math.min(1, Math.max(0, scrollPast / (stageH * 0.55)));
  }

  function onPointerMove(e) {
    mouse.x = e.clientX * dpr;
    mouse.y = e.clientY * dpr;
    mouse.active = true;
    lastPointerTime = performance.now();
    if (reducedMotion) render(performance.now());
  }

  function onPointerDown(e) {
    lastPointerTime = performance.now();
    ripples.push({ x: e.clientX * dpr, y: e.clientY * dpr, born: performance.now(), maxR: 380 * dpr, dur: 950 });
    if (ripples.length > 5) ripples.shift();
  }

  function updateLights(t) {
    var target = mouse.active ? 1 : 0;
    smoothMouse.x += (mouse.x - smoothMouse.x) * 0.24;
    smoothMouse.y += (mouse.y - smoothMouse.y) * 0.24;
    smoothMouse.strength += (target - smoothMouse.strength) * 0.12;

    currentSubdued += (targetSubdued - currentSubdued) * 0.15;
    if (Math.abs(targetSubdued - currentSubdued) < 0.005) currentSubdued = targetSubdued;

    var sec = t * 0.001;
    wander.x = width * (0.5 + 0.35 * Math.sin(sec * 0.72));
    wander.y = height * (0.47 + 0.22 * Math.sin(sec * 1.15 + 1.3));
    ripples = ripples.filter(function (rp) { return (t - rp.born) < rp.dur; });
  }

  function render(t) {
    if (!isVisible && !reducedMotion) return;

    var isReading = currentSubdued > 0.75;
    var pointerRecent = (t - lastPointerTime) < 1400;
    var hasRipples = ripples.length > 0;
    var transitioning = Math.abs(targetSubdued - currentSubdued) > 0.005;

    // Energy-efficient throttled render in reading mode
    if (isReading && !pointerRecent && !hasRipples && !transitioning) {
      if (t - lastRender < 48) { rafId = requestAnimationFrame(render); return; }
    }
    lastRender = t;
    updateLights(t);

    ctx.fillStyle = '#070809';
    ctx.fillRect(0, 0, width, height);

    var sub = currentSubdued;
    var mouseReach = (240 + 40 * sub) * dpr, mouseReachSq = mouseReach * mouseReach;
    var wanderReachSq = wander.reach * wander.reach, sec = t * 0.001, ringW = 28 * dpr;

    var activeRipples = ripples.map(function (rp) {
      var progress = (t - rp.born) / rp.dur;
      var curR = rp.maxR * (1 - Math.pow(1 - progress, 3));
      var minR = Math.max(0, curR - ringW), maxR = curR + ringW;
      return { x: rp.x, y: rp.y, r: curR, minRSq: minR * minR, maxRSq: maxR * maxR, amp: Math.pow(1 - progress, 1.8) };
    });

    var ambientWeight = 0.65 * (1 - smoothMouse.strength * 0.75) * (1 - sub);

    // Subdued alphas: ~12-15% of intro plasma opacity
    var aFHigh = (0.24 * (1 - 0.86 * sub)).toFixed(3), aFLow = (0.08 * (1 - 0.86 * sub)).toFixed(3);
    var colorFieldHigh = 'rgba(255, 176, 0, ' + aFHigh + ')', colorFieldLow = 'rgba(255, 176, 0, ' + aFLow + ')';
    var colorSpotHigh = sub < 0.05 ? '#ffd447' : 'rgba(255, 212, 71, ' + (1 - 0.35 * sub).toFixed(2) + ')';
    var colorSpotMid = sub < 0.05 ? '#ffb000' : 'rgba(255, 176, 0, ' + (1 - 0.45 * sub).toFixed(2) + ')';
    var ditherThreshold = 0.74 + 0.12 * sub;

    var stageRect = stage ? stage.getBoundingClientRect() : null;
    var introVisible = stageRect && stageRect.bottom > 0 && stageRect.top < window.innerHeight;
    var originY = stageRect
      ? Math.round((stageRect.top + stageRect.height * 0.5) * dpr - (wmHeight * cellPx) * 0.5)
      : Math.round((height - wmHeight * cellPx) * 0.5);

    for (var r = 0; r < gridRows; r++) {
      var py = r * cellPx;
      var wmRow = Math.floor((py - originY) / cellPx);
      var hasWordRow = introVisible && wmRow >= 0 && wmRow < wmHeight;

      for (var c = 0; c < gridCols; c++) {
        var px = c * cellPx, wmCol = Math.floor((px - originX) / cellPx);
        var inWordBox = hasWordRow && wmCol >= 0 && wmCol < wmWidth;
        var isWord = inWordBox && wmRows[wmRow] && wmRows[wmRow][wmCol] === '1';

        var cx = px + cellPx * 0.5, cy = py + cellPx * 0.5;
        var dxm = cx - smoothMouse.x, dym = cy - smoothMouse.y, dsqM = dxm * dxm + dym * dym;
        var sm = dsqM < mouseReachSq ? Math.pow(1 - Math.sqrt(dsqM) / mouseReach, 2) * smoothMouse.strength : 0;

        var dxw = cx - wander.x, dyw = cy - wander.y, dsqW = dxw * dxw + dyw * dyw;
        var sw = dsqW < wanderReachSq ? Math.pow(1 - Math.sqrt(dsqW) / wander.reach, 2) * ambientWeight : 0;
        var spot = Math.max(sm, sw);

        var ripGlow = 0;
        for (var i = 0; i < activeRipples.length; i++) {
          var rp = activeRipples[i], rx = cx - rp.x, ry = cy - rp.y, dsqR = rx * rx + ry * ry;
          if (dsqR >= rp.minRSq && dsqR <= rp.maxRSq) {
            ripGlow = Math.max(ripGlow, (1 - Math.abs(Math.sqrt(dsqR) - rp.r) / ringW) * rp.amp);
          }
        }

        if (isWord && introVisible) {
          var lit = (0.45 + spot * 1.7 + ripGlow * 1.4) * (1 - sub);
          if (lit > 0.05) {
            ctx.fillStyle = lit > 1.35 ? '#ffffff' : lit > 0.92 ? '#ffd447' : lit > 0.6 ? '#ffb000' : '#b87700';
            ctx.fillRect(px, py, cellPx - 1, cellPx - 1);
          }
        } else if (!inWordBox) {
          var nx = c * 0.07 + sec * 0.16, ny = r * 0.07 - sec * 0.11;
          var nVal = 0.6 * sampleNoise(nx, ny) + 0.4 * sampleNoise(nx * 0.5 - sec * 0.08, ny * 0.5 + sec * 0.07);
          var energy = nVal * 0.75 + (0.5 + 0.5 * Math.sin(sec * 1.8 + (r * 37 + c * 11) % 6.283)) * 0.25;
          var fieldVal = energy * 0.44 + spot * 0.85 + ripGlow * 0.95;
          var dither = BAYER[(r & 7) * 8 + (c & 7)] / 64;

          if (fieldVal > dither * ditherThreshold) {
            ctx.fillStyle = (spot > 0.38 || ripGlow > 0.4) ? colorSpotHigh :
                            (spot > 0.14 || ripGlow > 0.15) ? colorSpotMid :
                            fieldVal > 0.56 ? colorFieldHigh : colorFieldLow;
            ctx.fillRect(px, py, cellPx - 1, cellPx - 1);
          }
        }
      }
    }
    if (!reducedMotion && isVisible) rafId = requestAnimationFrame(render);
  }

  function start() {
    initWordmark(); resize(); updateScroll();
    currentSubdued = targetSubdued;
    isVisible = !document.hidden;
    if (isVisible) render(performance.now());
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('scroll', function () { updateScroll(); if (reducedMotion) render(performance.now()); }, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', function (e) { if (!e || !e.relatedTarget) mouse.active = false; }, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('blur', function () { mouse.active = false; }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      isVisible = !document.hidden;
      if (isVisible) { if (!rafId && !reducedMotion) rafId = requestAnimationFrame(render); }
      else if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

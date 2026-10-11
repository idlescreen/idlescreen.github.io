/**
 * js/spotlight/spotlight_render.js — Interactive Crazy Background & Mouse Spotlight Engine.
 *
 * Implements high-craft dynamic pixel field, Bayer ordered dithering, dual-spotlight
 * tracking (ambient wanderer + cursor spotlight), and click shockwave ripples.
 * Strictly adheres to 0-wakeup idle invariant via IntersectionObserver.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('spotlight-canvas');
  if (!canvas) return;
  var stage = document.getElementById('intro') || canvas.parentElement;
  var ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  var BAYER = [
     0, 32,  8, 40,  2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
    12, 44,  4, 36, 14, 46,  6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
     3, 35, 11, 43,  1, 33,  9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
    15, 47,  7, 39, 13, 45,  5, 37, 63, 31, 55, 23, 61, 29, 53, 21
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
            for (var dx = -1; dx <= 1; dx++) {
              sum += buf[((y + dy + N) % N) * N + ((x + dx + N) % N)];
            }
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
    var ix = Math.floor(x), iy = Math.floor(y);
    var fx = x - ix, fy = y - iy;
    var x0 = (ix % N + N) % N, y0 = (iy % N + N) % N;
    var x1 = (x0 + 1) % N, y1 = (y0 + 1) % N;
    var sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return (noiseTable[y0 * N + x0] * (1 - sx) + noiseTable[y0 * N + x1] * sx) * (1 - sy) +
           (noiseTable[y1 * N + x0] * (1 - sx) + noiseTable[y1 * N + x1] * sx) * sy;
  }

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dpr = 1, width = 0, height = 0, cellPx = 8;
  var originX = 0, originY = 0, gridCols = 0, gridRows = 0;
  var wmWidth = 95, wmHeight = 19, wmRows = [];
  var mouse = { x: -2000, y: -2000, active: false };
  var smoothMouse = { x: -2000, y: -2000, strength: 0 };
  var wander = { x: 0, y: 0, reach: 180 };
  var ripples = [], rafId = 0, isVisible = false;

  function initWordmark() {
    var data = window.IdleScreenWordmark;
    if (data && data.rows) {
      wmWidth = data.width;
      wmHeight = data.height;
      wmRows = data.rows;
    }
  }

  function resize() {
    var rect = stage.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.round(rect.width * dpr);
    height = Math.round(rect.height * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    var targetW = Math.min(width * 0.92, 980 * dpr);
    cellPx = Math.max(3, Math.floor(targetW / wmWidth));
    originX = Math.round((width - wmWidth * cellPx) / 2);
    originY = Math.round((height - wmHeight * cellPx) / 2);
    gridCols = Math.ceil(width / cellPx) + 1;
    gridRows = Math.ceil(height / cellPx) + 1;
    wander.reach = 190 * dpr;
    if (reducedMotion) render(0);
  }

  function onPointerMove(e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * dpr;
    mouse.y = (e.clientY - rect.top) * dpr;
    mouse.active = true;
    if (reducedMotion) render(performance.now());
  }

  function onPointerDown(e) {
    var rect = canvas.getBoundingClientRect();
    ripples.push({
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top) * dpr,
      born: performance.now(), maxR: 380 * dpr, dur: 950
    });
    if (ripples.length > 5) ripples.shift();
  }

  function updateLights(t) {
    var target = mouse.active ? 1 : 0;
    smoothMouse.x += (mouse.x - smoothMouse.x) * 0.24;
    smoothMouse.y += (mouse.y - smoothMouse.y) * 0.24;
    smoothMouse.strength += (target - smoothMouse.strength) * 0.12;

    var sec = t * 0.001;
    wander.x = width * (0.5 + 0.35 * Math.sin(sec * 0.72));
    wander.y = height * (0.47 + 0.22 * Math.sin(sec * 1.15 + 1.3));
    ripples = ripples.filter(function (rp) { return (t - rp.born) < rp.dur; });
  }

  function render(t) {
    if (!isVisible && !reducedMotion) return;
    updateLights(t);

    ctx.fillStyle = '#070809';
    ctx.fillRect(0, 0, width, height);

    var mouseReach = 240 * dpr, mouseReachSq = mouseReach * mouseReach;
    var wanderReachSq = wander.reach * wander.reach;
    var sec = t * 0.001, ringW = 28 * dpr;

    var activeRipples = ripples.map(function (rp) {
      var progress = (t - rp.born) / rp.dur;
      var curR = rp.maxR * (1 - Math.pow(1 - progress, 3));
      var minR = Math.max(0, curR - ringW), maxR = curR + ringW;
      return { x: rp.x, y: rp.y, r: curR, minRSq: minR * minR, maxRSq: maxR * maxR, amp: Math.pow(1 - progress, 1.8) };
    });

    var ambientWeight = 0.65 * (1 - smoothMouse.strength * 0.75);

    for (var r = 0; r < gridRows; r++) {
      var py = r * cellPx;
      var wmRow = Math.floor((py - originY) / cellPx);
      var hasWordRow = wmRow >= 0 && wmRow < wmHeight;

      for (var c = 0; c < gridCols; c++) {
        var px = c * cellPx;
        var wmCol = Math.floor((px - originX) / cellPx);
        var inWordBox = hasWordRow && wmCol >= 0 && wmCol < wmWidth;
        var isWord = inWordBox && wmRows[wmRow] && wmRows[wmRow][wmCol] === '1';

        var cx = px + cellPx * 0.5, cy = py + cellPx * 0.5;
        var dxm = cx - smoothMouse.x, dym = cy - smoothMouse.y;
        var dsqM = dxm * dxm + dym * dym;
        var sm = dsqM < mouseReachSq ? Math.pow(1 - Math.sqrt(dsqM) / mouseReach, 2) * smoothMouse.strength : 0;

        var dxw = cx - wander.x, dyw = cy - wander.y;
        var dsqW = dxw * dxw + dyw * dyw;
        var sw = dsqW < wanderReachSq ? Math.pow(1 - Math.sqrt(dsqW) / wander.reach, 2) * ambientWeight : 0;
        var spot = Math.max(sm, sw);

        var ripGlow = 0;
        for (var i = 0; i < activeRipples.length; i++) {
          var rp = activeRipples[i], rx = cx - rp.x, ry = cy - rp.y, dsqR = rx * rx + ry * ry;
          if (dsqR >= rp.minRSq && dsqR <= rp.maxRSq) {
            ripGlow = Math.max(ripGlow, (1 - Math.abs(Math.sqrt(dsqR) - rp.r) / ringW) * rp.amp);
          }
        }

        if (isWord) {
          var lit = 0.45 + spot * 1.7 + ripGlow * 1.4;
          ctx.fillStyle = lit > 1.35 ? '#ffffff' : lit > 0.92 ? '#ffd447' : lit > 0.6 ? '#ffb000' : '#b87700';
          ctx.fillRect(px, py, cellPx - 1, cellPx - 1);
        } else if (!inWordBox) {
          var nx = c * 0.07 + sec * 0.16, ny = r * 0.07 - sec * 0.11;
          var nVal = 0.6 * sampleNoise(nx, ny) + 0.4 * sampleNoise(nx * 0.5 - sec * 0.08, ny * 0.5 + sec * 0.07);
          var energy = nVal * 0.75 + (0.5 + 0.5 * Math.sin(sec * 1.8 + (r * 37 + c * 11) % 6.283)) * 0.25;
          var fieldVal = energy * 0.44 + spot * 0.85 + ripGlow * 0.95;
          var dither = BAYER[(r & 7) * 8 + (c & 7)] / 64;

          if (fieldVal > dither * 0.74) {
            ctx.fillStyle = (spot > 0.38 || ripGlow > 0.4) ? '#ffd447' :
                            (spot > 0.14 || ripGlow > 0.15) ? '#ffb000' :
                            fieldVal > 0.56 ? 'rgba(255, 176, 0, 0.24)' : 'rgba(255, 176, 0, 0.08)';
            ctx.fillRect(px, py, cellPx - 1, cellPx - 1);
          }
        }
      }
    }
    if (!reducedMotion && isVisible) rafId = requestAnimationFrame(render);
  }

  function start() {
    initWordmark();
    resize();
    isVisible = true;
    render(performance.now());
    window.addEventListener('resize', resize, { passive: true });
    stage.addEventListener('pointermove', onPointerMove, { passive: true });
    stage.addEventListener('pointerleave', function () { mouse.active = false; }, { passive: true });
    stage.addEventListener('pointerdown', onPointerDown, { passive: true });

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          isVisible = entry.isIntersecting;
          if (isVisible) {
            if (!rafId && !reducedMotion) rafId = requestAnimationFrame(render);
          } else if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
          }
        });
      }, { threshold: 0.05 });
      observer.observe(stage);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

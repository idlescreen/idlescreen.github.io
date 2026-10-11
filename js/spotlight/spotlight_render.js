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
     0, 32,  8, 40,  2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44,  4, 36, 14, 46,  6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
     3, 35, 11, 43,  1, 33,  9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47,  7, 39, 13, 45,  5, 37,
    63, 31, 55, 23, 61, 29, 53, 21
  ];

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dpr = 1, width = 0, height = 0, cellPx = 8;
  var originX = 0, originY = 0, gridCols = 0, gridRows = 0;
  var wmWidth = 95, wmHeight = 19, wmRows = [];

  var mouse = { x: -2000, y: -2000, active: false };
  var smoothMouse = { x: -2000, y: -2000, strength: 0 };
  var wander = { x: 0, y: 0, reach: 180 };
  var ripples = [];
  var rafId = 0, isVisible = false;

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

    var targetW = Math.min(width * 0.86, 960 * dpr);
    cellPx = Math.max(3, Math.floor(targetW / wmWidth));
    originX = Math.floor((width - wmWidth * cellPx) / 2);
    originY = Math.floor((height - wmHeight * cellPx) / 2 - 16 * dpr);
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

  function onPointerLeave() {
    mouse.active = false;
  }

  function onPointerDown(e) {
    var rect = canvas.getBoundingClientRect();
    var px = (e.clientX - rect.left) * dpr;
    var py = (e.clientY - rect.top) * dpr;
    ripples.push({ x: px, y: py, born: performance.now(), maxR: 380 * dpr, dur: 950 });
    if (ripples.length > 5) ripples.shift();
  }

  function updateLights(t) {
    var targetStrength = mouse.active ? 1 : 0;
    smoothMouse.x += (mouse.x - smoothMouse.x) * 0.24;
    smoothMouse.y += (mouse.y - smoothMouse.y) * 0.24;
    smoothMouse.strength += (targetStrength - smoothMouse.strength) * 0.12;

    var sec = t * 0.001;
    wander.x = width * (0.5 + 0.35 * Math.sin(sec * 0.72));
    wander.y = height * (0.47 + 0.22 * Math.sin(sec * 1.15 + 1.3));

    ripples = ripples.filter(function (rp) {
      return (t - rp.born) < rp.dur;
    });
  }

  function render(t) {
    if (!isVisible && !reducedMotion) return;
    updateLights(t);

    ctx.fillStyle = '#070809';
    ctx.fillRect(0, 0, width, height);

    var mouseReach = 240 * dpr;
    var sec = t * 0.001;
    var activeRipples = ripples.map(function (rp) {
      var progress = (t - rp.born) / rp.dur;
      return {
        x: rp.x, y: rp.y,
        r: rp.maxR * (1 - Math.pow(1 - progress, 3)),
        amp: Math.pow(1 - progress, 1.8)
      };
    });

    for (var r = 0; r < gridRows; r++) {
      var py = r * cellPx;
      var wmRow = Math.floor((py - originY) / cellPx);
      var hasWordRow = wmRow >= 0 && wmRow < wmHeight;

      for (var c = 0; c < gridCols; c++) {
        var px = c * cellPx;
        var wmCol = Math.floor((px - originX) / cellPx);
        var isWord = hasWordRow && wmCol >= 0 && wmCol < wmWidth && wmRows[wmRow][wmCol] === '1';

        var cx = px + cellPx * 0.5;
        var cy = py + cellPx * 0.5;

        var dxm = cx - smoothMouse.x;
        var dym = cy - smoothMouse.y;
        var dm = Math.sqrt(dxm * dxm + dym * dym);
        var sm = dm < mouseReach ? Math.pow(1 - dm / mouseReach, 2) * smoothMouse.strength : 0;

        var dxw = cx - wander.x;
        var dyw = cy - wander.y;
        var dw = Math.sqrt(dxw * dxw + dyw * dyw);
        var sw = dw < wander.reach ? Math.pow(1 - dw / wander.reach, 2) * 0.72 : 0;
        var spot = Math.max(sm, sw);

        var ripGlow = 0;
        for (var i = 0; i < activeRipples.length; i++) {
          var rp = activeRipples[i];
          var dr = Math.abs(Math.sqrt((cx - rp.x) * (cx - rp.x) + (cy - rp.y) * (cy - rp.y)) - rp.r);
          var ringW = 28 * dpr;
          if (dr < ringW) {
            ripGlow = Math.max(ripGlow, (1 - dr / ringW) * rp.amp);
          }
        }

        if (isWord) {
          var litVal = 0.42 + spot * 1.6 + ripGlow * 1.3;
          if (litVal > 1.35) {
            ctx.fillStyle = '#ffffff';
          } else if (litVal > 0.95) {
            ctx.fillStyle = '#ffd447';
          } else if (litVal > 0.62) {
            ctx.fillStyle = '#ffb000';
          } else {
            ctx.fillStyle = '#b37800';
          }
          ctx.fillRect(px, py, cellPx - 1, cellPx - 1);
        } else {
          var w1 = Math.sin(c * 0.14 + sec * 1.4) * Math.cos(r * 0.12 - sec * 1.1);
          var w2 = Math.sin((c + r) * 0.08 + sec * 2.1);
          var energy = (w1 * 0.55 + w2 * 0.45 + 1) * 0.5;
          var fieldVal = energy * 0.42 + spot * 0.8 + ripGlow * 0.9;
          var dither = BAYER[(r & 7) * 8 + (c & 7)] / 64;

          if (fieldVal > dither * 0.72) {
            if (spot > 0.38 || ripGlow > 0.4) {
              ctx.fillStyle = '#ffd447';
            } else if (spot > 0.14 || ripGlow > 0.15) {
              ctx.fillStyle = '#ffb000';
            } else if (fieldVal > 0.54) {
              ctx.fillStyle = 'rgba(255, 176, 0, 0.28)';
            } else {
              ctx.fillStyle = 'rgba(255, 176, 0, 0.09)';
            }
            ctx.fillRect(px, py, cellPx - 1, cellPx - 1);
          }
        }
      }
    }

    if (!reducedMotion && isVisible) {
      rafId = requestAnimationFrame(render);
    }
  }

  function start() {
    initWordmark();
    resize();
    window.addEventListener('resize', resize, { passive: true });
    stage.addEventListener('pointermove', onPointerMove, { passive: true });
    stage.addEventListener('pointerleave', onPointerLeave, { passive: true });
    stage.addEventListener('pointerdown', onPointerDown, { passive: true });

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          isVisible = entry.isIntersecting;
          if (isVisible) {
            if (!rafId && !reducedMotion) rafId = requestAnimationFrame(render);
          } else {
            if (rafId) {
              cancelAnimationFrame(rafId);
              rafId = 0;
            }
          }
        });
      }, { threshold: 0.05 });
      observer.observe(stage);
    } else {
      isVisible = true;
      if (!reducedMotion) rafId = requestAnimationFrame(render);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

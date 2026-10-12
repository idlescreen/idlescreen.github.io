// js/marquees/marquee_observer.js — IntersectionObserver & fullscreen controller for all 5 marquees
(function initMarqueeObserver() {
  'use strict';

  var SELECTORS = [
    '.tenets-track',
    '#omarchy-track',
    '.stream-left',
    '.stream-right',
    '#ecosystem-grid'
  ];

  var observedElements = new Set();
  var visibilityMap = new Map();

  function isPausedGlobally() {
    return Boolean(document.hidden || window.idleFullscreenActive);
  }

  function updateElementState(el) {
    if (!el || !el.style) return;
    var isVisible = visibilityMap.get(el);
    if (isPausedGlobally() || !isVisible) {
      el.style.animationPlayState = 'paused';
    } else {
      el.style.animationPlayState = '';
    }
  }

  function syncAll() {
    observedElements.forEach(function (el) {
      updateElementState(el);
    });
  }

  window.idleSyncMarqueeState = syncAll;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      visibilityMap.set(entry.target, entry.isIntersecting);
      updateElementState(entry.target);
    });
  }, {
    root: null,
    rootMargin: '100px 0px',
    threshold: 0
  });

  function scanAndObserve() {
    observedElements.forEach(function (el) {
      if (!el.isConnected) {
        observer.unobserve(el);
        observedElements.delete(el);
        visibilityMap.delete(el);
      }
    });

    SELECTORS.forEach(function (sel) {
      var els = document.querySelectorAll(sel);
      els.forEach(function (el) {
        if (!observedElements.has(el)) {
          observedElements.add(el);
          visibilityMap.set(el, false);
          observer.observe(el);
        }
      });
    });
    syncAll();
  }

  function start() {
    scanAndObserve();
    var mutTimer = null;
    var mutObs = new MutationObserver(function () {
      if (!mutTimer) {
        mutTimer = setTimeout(function () {
          mutTimer = null;
          scanAndObserve();
        }, 100);
      }
    });
    mutObs.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('visibilitychange', syncAll, { passive: true });
    document.addEventListener('fullscreenchange', syncAll, { passive: true });
    window.addEventListener('blur', syncAll, { passive: true });
    window.addEventListener('focus', syncAll, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

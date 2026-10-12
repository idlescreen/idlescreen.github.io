// js/spotlight/card_spotlight.js — interactive cursor spotlight tracking for cards
(function initCardSpotlight() {
  'use strict';

  var CARD_SELECTOR = [
    '.spotlight-card',
    '.compare-card',
    '.tui-showcase-container',
    '.matrix-card',
    '.install-card',
    '.eco-card',
    '.terminal-install-box',
    '.showcase-wrapper'
  ].join(', ');

  var activeCard = null;
  var targetX = -999;
  var targetY = -999;
  var rafPending = false;

  function isTextTarget(el) {
    if (window.IdleScreenIsText) return window.IdleScreenIsText(el);
    if (!el || el === document.body || el === document.documentElement) return false;
    var node = el.nodeType === 3 ? el.parentElement : el;
    if (!node || typeof node.closest !== 'function') return false;
    if (node.closest('#showcase-stage, .saver-stage')) return false;
    return !!(node.closest('h1,h2,h3,h4,h5,h6,p,pre,code,li,span,a,button,label,.btn,.spotlight-card'));
  }

  function setActiveCard(card) {
    if (activeCard === card) return;
    if (activeCard) {
      activeCard.classList.remove('spotlight-active', 'spotlight-over-text');
    }
    activeCard = card;
    if (activeCard) {
      activeCard.classList.add('spotlight-active');
    }
  }

  function updateActiveCard() {
    rafPending = false;
    if (!activeCard || !activeCard.isConnected) {
      setActiveCard(null);
      return;
    }

    var rect = activeCard.getBoundingClientRect();
    var x = Math.round(targetX - rect.left);
    var y = Math.round(targetY - rect.top);

    activeCard.style.setProperty('--mouse-x', x + 'px');
    activeCard.style.setProperty('--mouse-y', y + 'px');
  }

  function scheduleUpdate() {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(updateActiveCard);
    }
  }

  function handlePointer(e) {
    if (!e) return;
    if (e.clientX < 0 || e.clientY < 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
      setActiveCard(null);
      return;
    }
    var target = e.target;
    if (!target || typeof target.closest !== 'function') return;

    var card = target.closest(CARD_SELECTOR);
    if (!card) {
      setActiveCard(null);
      return;
    }

    if (activeCard !== card) {
      var rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', Math.round(e.clientX - rect.left) + 'px');
      card.style.setProperty('--mouse-y', Math.round(e.clientY - rect.top) + 'px');
      setActiveCard(card);
    }

    var overText = isTextTarget(target);
    card.classList.toggle('spotlight-over-text', overText);

    targetX = e.clientX;
    targetY = e.clientY;
    scheduleUpdate();
  }

  function handlePointerEnd(e) {
    if (e && e.pointerType === 'touch') {
      setActiveCard(null);
    }
  }

  function handleDocumentLeave(e) {
    if (!e || !e.relatedTarget || e.clientX < 0 || e.clientY < 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
      setActiveCard(null);
    }
  }

  function handleScroll() {
    if (activeCard) {
      scheduleUpdate();
    }
  }

  function setup() {
    document.addEventListener('pointermove', handlePointer, { passive: true });
    document.addEventListener('pointerdown', handlePointer, { passive: true });
    document.addEventListener('pointerup', handlePointerEnd, { passive: true });
    document.addEventListener('pointercancel', function() { setActiveCard(null); }, { passive: true });
    document.addEventListener('pointerleave', handleDocumentLeave, { passive: true });
    document.addEventListener('mouseleave', handleDocumentLeave, { passive: true });
    window.addEventListener('mouseleave', handleDocumentLeave, { passive: true });
    document.addEventListener('mouseout', handleDocumentLeave, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('blur', function() { setActiveCard(null); }, { passive: true });
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) setActiveCard(null);
    }, { passive: true });
  }

  window.idleSetCardSpotlightAccent = function(rgb, hotRgb) {
    if (!rgb) return;
    var root = document.documentElement;
    root.style.setProperty('--spotlight-border', 'rgba(' + rgb.join(', ') + ', 0.45)');
    if (hotRgb) root.style.setProperty('--spotlight-glow', 'rgba(' + hotRgb.join(', ') + ', 0.9)');
    root.style.setProperty('--spotlight-inner', 'rgba(' + rgb.join(', ') + ', 0.035)');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();

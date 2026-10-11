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
    var target = e.target;
    if (!target || typeof target.closest !== 'function') return;

    var card = target.closest(CARD_SELECTOR);
    if (!card) {
      setActiveCard(null);
      return;
    }

    if (activeCard !== card) {
      setActiveCard(card);
      var rect = card.getBoundingClientRect();
      var x = Math.round(e.clientX - rect.left);
      var y = Math.round(e.clientY - rect.top);
      card.style.setProperty('--mouse-x', x + 'px');
      card.style.setProperty('--mouse-y', y + 'px');
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
    if (!e || !e.relatedTarget) {
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
    document.addEventListener('pointercancel', handlePointerEnd, { passive: true });
    document.addEventListener('pointerleave', handleDocumentLeave, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('blur', function() { setActiveCard(null); }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();

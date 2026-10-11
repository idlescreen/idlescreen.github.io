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

  function setActiveCard(card) {
    if (activeCard === card) return;
    if (activeCard) {
      activeCard.classList.remove('spotlight-active');
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

    targetX = e.clientX;
    targetY = e.clientY;
    scheduleUpdate();
  }

  function handlePointerEnd(e) {
    if (!e || e.pointerType === 'touch' || !e.relatedTarget) {
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
    document.addEventListener('pointerleave', handlePointerEnd, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('blur', function() { setActiveCard(null); }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();

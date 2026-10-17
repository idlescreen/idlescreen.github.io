// rotate.js — hero title rotates through program facts with offscreen pause
const HEADLINES = [
  "Ambient by Design",
  "52 Built-In 16-Bit Arcade Scenes",
  "Clean OS-Only 16-Bit Arcade Banner",
  "First-Class SuperFedora Support",
  "wp_viewporter 1x Grid GPU Scaling",
  "Dynamic 60–144 Hz Matching",
  "0.00% CPU at Idle (~2–3 MB RSS)",
  "GNOME Mutter • KDE • COSMIC • Hyprland",
  "systemd • OpenRC • runit • s6 • dinit",
  "idlescreen doctor --fix & inhibitors",
];

(function initRotateHeadline() {
  let currentIdx = 0;
  const titleEl = document.getElementById("hero-title");
  if (!titleEl) return;

  let rotateTimer = null;
  let animInterval = null;
  let isSectionVisible = true;

  function clearRotation() {
    if (rotateTimer) {
      clearTimeout(rotateTimer);
      rotateTimer = null;
    }
    if (animInterval) {
      clearInterval(animInterval);
      animInterval = null;
    }
  }

  function scheduleNext(delay = 5000) {
    clearRotation();
    if (!isSectionVisible || document.hidden) return;
    rotateTimer = setTimeout(rotateHeadline, delay);
  }

  function rotateHeadline() {
    if (!titleEl || !isSectionVisible || document.hidden) return;
    let nextIdx;
    do {
      nextIdx = Math.floor(Math.random() * HEADLINES.length);
    } while (nextIdx === currentIdx && HEADLINES.length > 1);
    currentIdx = nextIdx;
    const target = HEADLINES[nextIdx];

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      titleEl.textContent = target;
      scheduleNext(5000);
      return;
    }

    let text = titleEl.textContent;
    animInterval = setInterval(() => {
      if (!isSectionVisible || document.hidden) {
        clearRotation();
        return;
      }
      if (text.length > 0) {
        text = text.slice(0, -1);
        titleEl.textContent = text;
      } else {
        clearInterval(animInterval);
        animInterval = null;
        let i = 0;
        animInterval = setInterval(() => {
          if (!isSectionVisible || document.hidden) {
            clearRotation();
            return;
          }
          if (i < target.length) {
            text += target[i];
            titleEl.textContent = text;
            i++;
          } else {
            clearInterval(animInterval);
            animInterval = null;
            scheduleNext(5000);
          }
        }, 35);
      }
    }, 20);
  }

  const targetSection = titleEl.closest("section") || document.getElementById("intro") || titleEl;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      isSectionVisible = e.isIntersecting;
      if (isSectionVisible && !document.hidden) {
        if (!rotateTimer && !animInterval) scheduleNext(2500);
      } else {
        clearRotation();
      }
    });
  }, { root: null, threshold: 0.1 });
  io.observe(targetSection);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearRotation();
    } else if (isSectionVisible) {
      if (!rotateTimer && !animInterval) scheduleNext(1500);
    }
  });

  scheduleNext(5000);
})();

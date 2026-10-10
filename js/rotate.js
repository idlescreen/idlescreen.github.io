// rotate.js — hero title rotates through program facts
const HEADLINES = [
  "Ambient by Design",
  "37 In-Tree ASCII Scenes",
  "Host OS • DE • Kernel Tri-Rotation",
  "Dynamic 60–144 Hz Matching",
  "Zero Cycles While Active",
  "GNOME • KDE • COSMIC • Hyprland",
  "systemd • OpenRC • runit • s6",
  "400% Responsive Font Scaling",
  "Multi-Monitor Layer-Shell",
  "Yields on First Input",
];

let currentIdx = 0;
const titleEl = document.getElementById("hero-title");

function rotateHeadline() {
  if (!titleEl) return;
  let nextIdx;
  do {
    nextIdx = Math.floor(Math.random() * HEADLINES.length);
  } while (nextIdx === currentIdx && HEADLINES.length > 1);
  currentIdx = nextIdx;
  const target = HEADLINES[nextIdx];

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    titleEl.textContent = target;
    setTimeout(rotateHeadline, 5000);
    return;
  }

  let text = titleEl.textContent;
  const back = setInterval(() => {
    if (text.length > 0) {
      text = text.slice(0, -1);
      titleEl.textContent = text;
    } else {
      clearInterval(back);
      let i = 0;
      const type = setInterval(() => {
        if (i < target.length) {
          text += target[i];
          titleEl.textContent = text;
          i++;
        } else {
          clearInterval(type);
          setTimeout(rotateHeadline, 5000);
        }
      }, 35);
    }
  }, 20);
}

setTimeout(rotateHeadline, 5000);

// rotate.js — hero title rotates through program facts
const HEADLINES = [
  "Ambient by Design",
  "11 Procedural Savers",
  "Zero Cycles While Active",
  "Stable C ABI, Any Language",
  "Locked 60 FPS",
  "Multi-Monitor Layer-Shell",
  "Written in Rust",
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

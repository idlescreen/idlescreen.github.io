// panels.js — panel reveal + up/down section navigation
const port = document.querySelector(".scroll-port");
const navUp = document.getElementById("nav-up");
const navDown = document.getElementById("nav-down");

// Fade panels in as they enter the port (queried after gallery build)
const panelObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add("vis");
    });
  },
  { root: port, threshold: 0.1 }
);
document.querySelectorAll(".panel").forEach((p) => panelObserver.observe(p));

// Arrow state: show only the direction that can scroll
function updateArrows() {
  if (!port || !navUp || !navDown) return;
  const atTop = port.scrollTop <= 4;
  const atBottom = port.scrollTop + port.clientHeight >= port.scrollHeight - 4;
  navUp.classList.toggle("off", atTop);
  navDown.classList.toggle("off", atBottom);
}

// Jump to the next/previous panel edge relative to scroll position
function goToPanel(dir) {
  const panels = Array.from(document.querySelectorAll(".panel"));
  const portTop = port.getBoundingClientRect().top;
  const tops = panels.map(
    (p) => port.scrollTop + p.getBoundingClientRect().top - portTop
  );
  const pos = port.scrollTop;
  let target;
  if (dir > 0) {
    target = tops.find((t) => t > pos + 8);
    if (target === undefined) target = port.scrollHeight;
  } else {
    const above = tops.filter((t) => t < pos - 8);
    target = above.length ? above[above.length - 1] : 0;
  }
  port.scrollTo({ top: target, behavior: "smooth" });
}

if (port && navUp && navDown) {
  port.addEventListener("scroll", updateArrows, { passive: true });
  navUp.addEventListener("click", () => goToPanel(-1));
  navDown.addEventListener("click", () => goToPanel(1));
  window.addEventListener("resize", updateArrows);
  updateArrows();
}

console.log(
  "%c[IDLESCREEN // 1982 TERMINAL ACTIVE]\n%cWayland Idle Host | 11 Procedural Savers Registered | beams.wasm armed",
  "color: #ffb000; font-weight: bold;",
  "color: #a89f8b;"
);

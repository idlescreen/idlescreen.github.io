// videos.js — zero-waste playback: pause offscreen, honor reduced motion
(function initVideos() {
  const vids = document.querySelectorAll(".saver-media");
  if (!vids.length) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          window._ioFired = (window._ioFired || 0) + 1;
          if (e.isIntersecting) window._ioTrue = (window._ioTrue || 0) + 1;
          const v = e.target;
          if (e.isIntersecting && !reduced.matches) {
            v.play().then(() => { window._playOk = (window._playOk || 0) + 1; })
                    .catch((err) => { window._playErr = err.name; });
          } else {
            v.pause();
          }
        });
      },
      { root: document.querySelector(".scroll-port"), threshold: 0.1 }
    );
    vids.forEach((v) => io.observe(v));
  }

  reduced.addEventListener("change", () => {
    if (reduced.matches) vids.forEach((v) => v.pause());
  });
  if (reduced.matches) vids.forEach((v) => v.pause());
})();

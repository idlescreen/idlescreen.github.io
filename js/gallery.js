// gallery.js — builds saver panels from the SAVERS manifest
(function buildGallery() {
  const port = document.querySelector(".scroll-port");
  const outro = document.getElementById("outro");
  if (!port || !outro || typeof SAVERS === "undefined") return;

  SAVERS.forEach((s, i) => {
    const sec = document.createElement("section");
    sec.className = "panel saver-panel";
    sec.id = "saver-" + s.id;

    const head = document.createElement("div");
    head.className = "saver-head";
    head.innerHTML =
      '<span class="saver-idx">[ ' + s.num + " / " + SAVERS.length + " ]</span>" +
      '<h2 class="saver-name">' + s.name + "</h2>" +
      '<span class="saver-sub">// ' + s.sub + "</span>" +
      '<span class="saver-badge saver-badge-live" hidden>LIVE // WASM</span>' +
      '<span class="saver-badge">VIDEO</span>';
    sec.appendChild(head);

    const stage = document.createElement("div");
    stage.className = "saver-stage";
    const video = document.createElement("video");
    video.className = "saver-media";
    video.src = "assets/videos/" + s.id + ".mp4";
    video.autoplay = true;
    video.muted = true;
    video.setAttribute("muted", "");
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.preload = "auto";
    stage.appendChild(video);
    if (s.live) {
      const canvas = document.createElement("canvas");
      canvas.className = "saver-canvas";
      canvas.hidden = true;
      canvas.dataset.wasm = s.live;
      stage.appendChild(canvas);
    }
    const overlay = document.createElement("div");
    overlay.className = "saver-overlay";
    overlay.innerHTML =
      '<p class="saver-desc">' + s.desc + "</p>" +
      '<div class="saver-metrics">' +
      "<span>FRAME <b>" + s.frame + "</b></span>" +
      "<span>CPU <b>" + s.cpu + "</b></span>" +
      "<span>MATH <b>" + s.math + "</b></span>" +
      "</div>";
    const cmd = document.createElement("code");
    cmd.className = "saver-cmd";
    cmd.title = "Click to copy";
    cmd.innerHTML = "&gt; idlescreen preview " + s.id +
      '<span class="cmd-copy-hint">[COPY]</span>';
    cmd.addEventListener("click", () => copyText("idlescreen preview " + s.id, cmd));
    const tags = document.createElement("div");
    tags.className = "saver-tags";
    s.tags.forEach((t) => {
      const tag = document.createElement("span");
      tag.className = "saver-tag";
      tag.textContent = "#" + t;
      tags.appendChild(tag);
    });
    const src = document.createElement("a");
    src.className = "saver-src";
    src.href = "https://github.com/idlescreen/savers";
    src.target = "_blank";
    src.rel = "noopener noreferrer";
    src.textContent = "[ SOURCE \u2197 ]";
    const footRow = document.createElement("div");
    footRow.className = "saver-footrow";
    footRow.appendChild(cmd);
    footRow.appendChild(tags);
    footRow.appendChild(src);
    overlay.appendChild(footRow);
    stage.appendChild(overlay);
    sec.appendChild(stage);

    port.insertBefore(sec, outro);
  });
})();

// js/matrix/matrix_card.js — card DOM builder for 48 in-tree ASCII scenes
(function initMatrixCard() {
  function buildMatrixCard(s, idx, isClone = false) {
    const card = document.createElement("div");
    card.className = "matrix-card spotlight-card" + (isClone ? " matrix-card-clone" : "");
    if (isClone) {
      card.setAttribute("data-clone", "true");
      card.setAttribute("aria-hidden", "true");
    }
    card.dataset.id = s.id;
    card.dataset.num = s.num;
    card.dataset.name = s.name.toLowerCase();
    card.dataset.sub = (s.sub || "").toLowerCase();
    card.dataset.desc = (s.desc || "").toLowerCase();
    card.dataset.tags = (s.tags || []).join(" ").toLowerCase();
    card.dataset.math = (s.math || "").toLowerCase();

    card.innerHTML = `
      <div class="matrix-card-top">
        <span class="matrix-card-num">[ ${s.num} ]</span>
        <span class="matrix-card-badge">${s.frame}</span>
      </div>
      <h3 class="matrix-card-title">${s.name}</h3>
      <p class="matrix-card-sub">// ${s.sub}</p>
      <p class="matrix-card-desc">${s.desc}</p>
      <div class="matrix-card-math-box">
        <span class="math-label">PHYSICS:</span> <span class="math-val">${s.math}</span>
      </div>
      <div class="matrix-card-actions">
        <button type="button" class="matrix-btn matrix-btn-preview" data-idx="${idx}" title="Preview in showcase stage above">[ PREVIEW ]</button>
        <button type="button" class="matrix-btn matrix-btn-copy" data-cmd="idlescreen preview ${s.id}" title="Copy preview command">[ COPY CMD ]</button>
        <a class="matrix-btn matrix-btn-src" href="${s.sourceUrl}" target="_blank" rel="noopener noreferrer" title="View Rust source code">[ .rs ↗ ]</a>
      </div>
    `;

    // Preview button click
    const prevBtnEl = card.querySelector(".matrix-btn-preview");
    if (prevBtnEl) {
      prevBtnEl.addEventListener("click", () => {
        if (window.selectShowcaseScene) {
          window.selectShowcaseScene(idx);
        }
        const showcaseEl = document.getElementById("showcase");
        if (showcaseEl) {
          showcaseEl.scrollIntoView({ behavior: "smooth" });
        }
      });
    }

    // Copy button click with clipboard fallback
    const copyBtn = card.querySelector(".matrix-btn-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const cmd = copyBtn.getAttribute("data-cmd");
        const showDone = () => {
          const orig = copyBtn.textContent;
          copyBtn.textContent = "[ COPIED! ]";
          copyBtn.classList.add("copied");
          setTimeout(() => {
            copyBtn.textContent = orig;
            copyBtn.classList.remove("copied");
          }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(cmd).then(showDone).catch(() => {
            if (typeof fallbackCopy === "function") {
              fallbackCopy(cmd, showDone);
            } else {
              showDone();
            }
          });
        } else if (typeof fallbackCopy === "function") {
          fallbackCopy(cmd, showDone);
        } else {
          showDone();
        }
      });
    }

    return card;
  }

  window.buildMatrixCard = buildMatrixCard;
})();

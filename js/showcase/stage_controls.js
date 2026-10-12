// js/showcase/stage_controls.js — featured 3 random scenes showcase controller
(function initStageControls() {
  let featuredIndices = [];
  let currentSlot = 0; // 0, 1, 2

  function pickRandomDistinct(count, max, exclude = []) {
    const pool = Array.from({ length: max }, (_, i) => i).filter((idx) => !exclude.includes(idx));
    const chosen = [];
    while (chosen.length < count && pool.length > 0) {
      const rIdx = Math.floor(Math.random() * pool.length);
      chosen.push(pool.splice(rIdx, 1)[0]);
    }
    if (chosen.length < count) {
      for (let i = 0; i < max && chosen.length < count; i++) {
        if (!chosen.includes(i)) chosen.push(i);
      }
    }
    return chosen;
  }

  function rerollFeatured() {
    if (typeof SAVERS === "undefined" || !SAVERS.length) return;
    featuredIndices = pickRandomDistinct(3, SAVERS.length, featuredIndices);
    currentSlot = 0;
    renderSlots();
    loadSlot(0);
  }

  function renderSlots() {
    const slotsContainer = document.getElementById("showcase-slots");
    if (!slotsContainer || typeof SAVERS === "undefined") return;
    slotsContainer.innerHTML = "";

    featuredIndices.forEach((sceneIdx, slotIdx) => {
      const scene = SAVERS[sceneIdx];
      if (!scene) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "showcase-slot" + (slotIdx === currentSlot ? " active" : "");
      btn.setAttribute("aria-label", `Featured scene ${slotIdx + 1}: ${scene.name}`);
      btn.innerHTML = `<span class="slot-num">${scene.num}</span><span class="slot-name">${scene.name}</span>`;
      btn.addEventListener("click", () => {
        loadSlot(slotIdx);
      });
      slotsContainer.appendChild(btn);
    });
  }

  function populateQuickPicker() {
    const picker = document.getElementById("quick-scene-select");
    if (!picker || typeof SAVERS === "undefined") return;
    picker.innerHTML = '<option value="" disabled selected>— Jump to any of the ' + SAVERS.length + ' scenes —</option>';
    SAVERS.forEach((s, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = `[${s.num}] ${s.name} // ${s.sub}`;
      picker.appendChild(opt);
    });
    picker.addEventListener("change", (e) => {
      const selectedIdx = parseInt(e.target.value, 10);
      if (!isNaN(selectedIdx) && SAVERS[selectedIdx]) {
        selectScene(selectedIdx);
      }
    });
  }

  function selectScene(idx) {
    const existingSlot = featuredIndices.indexOf(idx);
    if (existingSlot !== -1) {
      loadSlot(existingSlot);
    } else {
      featuredIndices[currentSlot] = idx;
      renderSlots();
      loadSlot(currentSlot);
    }
  }

  function loadSlot(slotIdx) {
    if (typeof SAVERS === "undefined" || !SAVERS.length) return;
    currentSlot = slotIdx;
    const sceneIdx = featuredIndices[slotIdx];
    const s = SAVERS[sceneIdx];
    if (!s) return;

    const picker = document.getElementById("quick-scene-select");
    if (picker) {
      picker.value = sceneIdx;
    }

    const slotBtns = document.querySelectorAll(".showcase-slot");
    slotBtns.forEach((btn, idx) => {
      btn.classList.toggle("active", idx === slotIdx);
    });

    const idxEl = document.getElementById("showcase-idx");
    const nameEl = document.getElementById("showcase-name");
    const subEl = document.getElementById("showcase-sub");
    const descEl = document.getElementById("showcase-desc");
    const frameEl = document.getElementById("metric-frame");
    const cpuEl = document.getElementById("metric-cpu");
    const mathEl = document.getElementById("metric-math");
    const cmdEl = document.getElementById("showcase-cmd");
    const tagsEl = document.getElementById("showcase-tags");
    const srcEl = document.getElementById("showcase-src");
    const videoEl = document.getElementById("showcase-video");

    const totalPad = SAVERS.length < 10 ? "0" + SAVERS.length : SAVERS.length;
    if (idxEl) idxEl.textContent = `[ SCENE ${s.num} / ${totalPad} ]`;
    if (nameEl) nameEl.textContent = s.name;
    if (subEl) subEl.textContent = `// ${s.sub}`;
    if (descEl) descEl.textContent = s.desc;
    if (frameEl) frameEl.textContent = s.frame;
    if (cpuEl) cpuEl.textContent = s.cpu;
    if (mathEl) mathEl.textContent = s.math;

    if (cmdEl) {
      const cmdText = `idlescreen preview ${s.id}`;
      cmdEl.innerHTML = `&gt; ${cmdText} <span class="cmd-copy-hint">[COPY]</span>`;
      cmdEl.onclick = () => {
        if (typeof copyText === "function") {
          copyText(cmdText, cmdEl);
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(cmdText);
        }
      };
    }

    if (tagsEl) {
      tagsEl.innerHTML = "";
      (s.tags || []).forEach((t) => {
        const span = document.createElement("span");
        span.className = "saver-tag";
        span.textContent = "#" + t;
        tagsEl.appendChild(span);
      });
    }

    if (srcEl) {
      srcEl.href = s.sourceUrl || `https://github.com/idlescreen/idlescreen/blob/master/crates/idlescreen/src/ascii/scenes/${s.id}.rs`;
      srcEl.textContent = s.sourceLabel || `[ SOURCE: ${s.id}.rs ↗ ]`;
    }

    window.idleCurrentSceneId = s.id;
    if (window.idleSaverRunScene) {
      window.idleSaverRunScene(s.id);
    }

    const canvasEl = document.getElementById("showcase-canvas");
    if (canvasEl) {
      canvasEl.hidden = false;
      canvasEl.style.display = "block";
    }
    if (videoEl) {
      videoEl.pause();
      videoEl.style.display = "none";
      videoEl.style.visibility = "hidden";
    }
  }

  function setupControls() {
    const prevBtn = document.getElementById("stage-prev");
    const nextBtn = document.getElementById("stage-next");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        const next = (currentSlot - 1 + featuredIndices.length) % featuredIndices.length;
        loadSlot(next);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        const next = (currentSlot + 1) % featuredIndices.length;
        loadSlot(next);
      });
    }

    document.addEventListener("keydown", (e) => {
      const tag = document.activeElement ? document.activeElement.tagName : "";
      if (e.defaultPrevented || ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(tag)) return;
      if (e.key === "ArrowLeft") {
        const next = (currentSlot - 1 + featuredIndices.length) % featuredIndices.length;
        loadSlot(next);
      } else if (e.key === "ArrowRight") {
        const next = (currentSlot + 1) % featuredIndices.length;
        loadSlot(next);
      }
    });

    const rerollBtn = document.getElementById("reroll-btn");
    if (rerollBtn) {
      rerollBtn.addEventListener("click", () => {
        rerollBtn.classList.add("spinning");
        rerollFeatured();
        setTimeout(() => rerollBtn.classList.remove("spinning"), 300);
      });
    }

    populateQuickPicker();
    rerollFeatured();
  }

  window.selectShowcaseScene = selectScene;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupControls);
  } else {
    setupControls();
  }
})();

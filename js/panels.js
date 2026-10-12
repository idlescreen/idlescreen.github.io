// js/panels.js — page flow, section navigation, and dynamic theme cycling
(function initPanels() {
  if ("IntersectionObserver" in window) {
    const panelObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("vis");
        });
      },
      { root: null, threshold: 0.05 }
    );
    document.querySelectorAll(".panel, .page-section").forEach((p) => panelObserver.observe(p));
  } else {
    document.querySelectorAll(".panel, .page-section").forEach((p) => p.classList.add("vis"));
  }

  const navSections = [
    { id: "intro", el: document.getElementById("intro") },
    { id: "overview", el: document.getElementById("overview") },
    { id: "showcase", el: document.getElementById("showcase") },
    { id: "omarchy-play", el: document.getElementById("omarchy-play") },
    { id: "scene-matrix", el: document.getElementById("scene-matrix") },
    { id: "ecosystem", el: document.getElementById("ecosystem") },
    { id: "install", el: document.getElementById("install") },
  ].filter((s) => s.el !== null);

  const navLinks = document.querySelectorAll(".nav-link, .mobile-nav-link");
  const navArrowUp = document.getElementById("nav-arrow-up") || document.getElementById("nav-up");
  const navArrowDown = document.getElementById("nav-arrow-down") || document.getElementById("nav-down");
  let activeSectionId = null;

  function setActiveNav(activeId) {
    navLinks.forEach((link) => {
      const isMatch = (link.getAttribute("href") || "") === `#${activeId}`;
      link.classList.toggle("active", isMatch);
      if (isMatch) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function getSectionIndex(id) {
    const idx = navSections.findIndex((s) => s.id === id);
    return idx >= 0 ? idx : 0;
  }

  function updateArrowButtons(currentId) {
    const idx = getSectionIndex(currentId);
    const scrollY = window.scrollY || window.pageYOffset;
    if (navArrowUp) {
      const isTop = idx <= 0 && scrollY <= 20;
      navArrowUp.classList.toggle("disabled", isTop);
      navArrowUp.setAttribute("aria-disabled", isTop ? "true" : "false");
      navArrowUp.disabled = isTop;
    }
    if (navArrowDown) {
      const isBottom = idx >= navSections.length - 1;
      navArrowDown.classList.toggle("disabled", isBottom);
      navArrowDown.setAttribute("aria-disabled", isBottom ? "true" : "false");
      navArrowDown.disabled = isBottom;
    }
  }

  let isProgrammaticScroll = false;
  let scrollTimer = null;

  function endProgrammaticScroll() {
    if (isProgrammaticScroll) {
      isProgrammaticScroll = false;
      if (scrollTimer) { clearTimeout(scrollTimer); scrollTimer = null; }
      updateActiveNavOnScroll();
    }
  }

  ["wheel", "touchstart", "scrollend"].forEach((ev) => {
    window.addEventListener(ev, endProgrammaticScroll, { passive: true });
  });

  function onSectionEntered(newId) {
    if (activeSectionId === null) {
      activeSectionId = newId;
      return;
    }
    if (newId !== activeSectionId) {
      activeSectionId = newId;
      if (!isProgrammaticScroll && window.idleCycleRandomAccent) {
        window.idleCycleRandomAccent();
      }
    }
  }

  function updateActiveNavOnScroll() {
    if (!navSections.length || isProgrammaticScroll) return;
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    const scrollY = window.scrollY || window.pageYOffset;
    let activeId = navSections[0].id;

    if (scrollY + winHeight >= docHeight - 80) {
      activeId = "install";
    } else if (scrollY <= 60) {
      activeId = "intro";
    } else {
      const readingLine = 220;
      for (let i = 0; i < navSections.length; i++) {
        const s = navSections[i];
        const rect = s.el.getBoundingClientRect();
        if (rect.top <= readingLine && rect.bottom > readingLine) {
          activeId = s.id;
          break;
        } else if (rect.top <= readingLine) {
          activeId = s.id;
        }
      }
    }

    setActiveNav(activeId);
    onSectionEntered(activeId);
    updateArrowButtons(activeId);
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateActiveNavOnScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
  updateActiveNavOnScroll();

  function navigateToSection(idx) {
    if (idx < 0 || idx >= navSections.length) return;
    const target = navSections[idx];
    activeSectionId = target.id;
    isProgrammaticScroll = true;
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(endProgrammaticScroll, 750);

    if (window.idleCycleRandomAccent) window.idleCycleRandomAccent();
    setActiveNav(target.id);
    updateArrowButtons(target.id);

    if (idx === 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const headerHeight = 60;
      const targetY = target.el.getBoundingClientRect().top + window.pageYOffset - headerHeight;
      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    }
  }

  function moveNext() {
    const curIdx = getSectionIndex(activeSectionId || "intro");
    if (curIdx < navSections.length - 1) navigateToSection(curIdx + 1);
    else if (window.idleCycleRandomAccent) window.idleCycleRandomAccent();
  }

  function movePrev() {
    const curIdx = getSectionIndex(activeSectionId || "intro");
    if (curIdx > 0) navigateToSection(curIdx - 1);
    else if (window.idleCycleRandomAccent) window.idleCycleRandomAccent();
  }

  if (navArrowDown) {
    navArrowDown.addEventListener("click", (e) => {
      e.preventDefault();
      moveNext();
    });
  }

  if (navArrowUp) {
    navArrowUp.addEventListener("click", (e) => {
      e.preventDefault();
      movePrev();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    const active = document.activeElement;
    const tag = active ? active.tagName : "";
    if (
      e.defaultPrevented ||
      ["INPUT", "SELECT", "TEXTAREA"].includes(tag) ||
      (active && active.isContentEditable) ||
      (active && active.matches && (active.matches("[data-accent-name]") || active.matches(".gallery-slider")))
    ) {
      return;
    }
    e.preventDefault();
    if (e.key === "ArrowDown") moveNext();
    else if (e.key === "ArrowUp") movePrev();
  });

  const menuToggle = document.getElementById("menu-toggle");
  const mobileNav = document.getElementById("mobile-nav");
  if (menuToggle && mobileNav) {
    function closeMenu() {
      mobileNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
    function toggleMenu() {
      const isOpen = mobileNav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
    menuToggle.addEventListener("click", toggleMenu);
    document.querySelectorAll(".mobile-nav-link, .mobile-nav-actions .nav-btn").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
    document.addEventListener("click", (e) => {
      if (mobileNav.classList.contains("open") && !mobileNav.contains(e.target) && !menuToggle.contains(e.target)) {
        closeMenu();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mobileNav.classList.contains("open")) {
        closeMenu();
        menuToggle.focus();
      }
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 900 && mobileNav.classList.contains("open")) closeMenu();
    });
  }
})();

console.log(
  "%c[IDLESCREEN // WAYLAND IDLE DAEMON ACTIVE]\n%cEngineered in Rust • 48 In-Tree ASCII Scenes • Dynamic 60–144 FPS",
  "color: #ffb000; font-weight: bold; font-size: 12px;",
  "color: #94a3b8; font-size: 11px;"
);

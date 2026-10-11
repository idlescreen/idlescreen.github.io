// panels.js — page flow, active section tracking, and mobile navigation
(function initPanels() {
  // 1. Reveal panels as they scroll into the viewport
  if ("IntersectionObserver" in window) {
    const panelObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("vis");
          }
        });
      },
      { root: null, threshold: 0.05 }
    );
    document.querySelectorAll(".panel, .page-section").forEach((p) => panelObserver.observe(p));
  } else {
    document.querySelectorAll(".panel, .page-section").forEach((p) => p.classList.add("vis"));
  }

  // 2. Active top navigation link tracking based on scroll position
  const navSections = [
    { id: "overview", el: document.getElementById("overview") },
    { id: "showcase", el: document.getElementById("showcase") },
    { id: "scene-matrix", el: document.getElementById("scene-matrix") },
    { id: "ecosystem", el: document.getElementById("ecosystem") },
    { id: "install", el: document.getElementById("install") },
  ].filter((s) => s.el !== null);

  const navLinks = document.querySelectorAll(".nav-link, .mobile-nav-link");

  function setActiveNav(activeId) {
    navLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const isMatch = href === `#${activeId}`;
      link.classList.toggle("active", isMatch);
      if (isMatch) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function updateActiveNavOnScroll() {
    if (!navSections.length) return;
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;

    // If near bottom, highlight install section
    if (window.scrollY + winHeight >= docHeight - 80) {
      setActiveNav("install");
      return;
    }

    const readingLine = 200;
    let activeId = navSections[0].id;
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
    setActiveNav(activeId);
  }

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateActiveNavOnScroll();
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true }
  );
  updateActiveNavOnScroll();

  // 3. Mobile Navigation Drawer Toggle & Keyboard Handling
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

    // Close mobile nav on clicking any navigation link
    document.querySelectorAll(".mobile-nav-link, .mobile-nav-actions .nav-btn").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
      if (
        mobileNav.classList.contains("open") &&
        !mobileNav.contains(e.target) &&
        !menuToggle.contains(e.target)
      ) {
        closeMenu();
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mobileNav.classList.contains("open")) {
        closeMenu();
        menuToggle.focus();
      }
    });

    // Close on window resize past 900px
    window.addEventListener("resize", () => {
      if (window.innerWidth > 900 && mobileNav.classList.contains("open")) {
        closeMenu();
      }
    });
  }

  // 4. Backward-compatible handler for any legacy up/down nav arrows
  const port = document.querySelector(".scroll-port");
  const navUp = document.getElementById("nav-up");
  const navDown = document.getElementById("nav-down");

  if (port && navUp && navDown) {
    function updateArrows() {
      const atTop = port.scrollTop <= 4;
      const atBottom = port.scrollTop + port.clientHeight >= port.scrollHeight - 4;
      navUp.classList.toggle("off", atTop);
      navDown.classList.toggle("off", atBottom);
    }
    port.addEventListener("scroll", updateArrows, { passive: true });
    updateArrows();
  }
})();

console.log(
  "%c[IDLESCREEN // WAYLAND IDLE DAEMON ACTIVE]\n%cEngineered in Rust • 37 In-Tree ASCII Scenes • Dynamic 60–144 FPS",
  "color: #ffb000; font-weight: bold; font-size: 12px;",
  "color: #94a3b8; font-size: 11px;"
);

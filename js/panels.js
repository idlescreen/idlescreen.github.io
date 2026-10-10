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

  if ("IntersectionObserver" in window && navSections.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        // Find visible section with highest intersection ratio
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          setActiveNav(visible[0].target.id);
        }
      },
      { root: null, threshold: [0.1, 0.3, 0.6] }
    );
    navSections.forEach((s) => sectionObserver.observe(s.el));
  }

  // 3. Mobile Navigation Drawer Toggle
  const menuToggle = document.getElementById("menu-toggle");
  const mobileNav = document.getElementById("mobile-nav");

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = mobileNav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Close mobile nav on clicking any navigation link
    document.querySelectorAll(".mobile-nav-link, .mobile-nav-actions .nav-btn").forEach((link) => {
      link.addEventListener("click", () => {
        mobileNav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
      if (
        mobileNav.classList.contains("open") &&
        !mobileNav.contains(e.target) &&
        !menuToggle.contains(e.target)
      ) {
        mobileNav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
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

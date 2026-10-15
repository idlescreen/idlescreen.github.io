// js/catalog/index.js — unified 50 in-tree 16-bit arcade scenes catalog
// Combines scenes_primary (01–19), scenes_secondary (20–38), and scenes_tertiary (39–50) into canonical window.SAVERS.
(function initCatalog() {
  const primary = window.SAVERS_PRIMARY || [];
  const secondary = window.SAVERS_SECONDARY || [];
  const tertiary = window.SAVERS_TERTIARY || [];
  const allSavers = primary.concat(secondary, tertiary);

  // Expose on window and globalThis for zero-bundler browser standard imports
  window.SAVERS = allSavers;
  if (typeof globalThis !== "undefined") {
    globalThis.SAVERS = allSavers;
  }

  // Provide convenience getter and lookup helpers
  if (!window.getSaverById) {
    window.getSaverById = function (id) {
      return allSavers.find((s) => s.id === id);
    };
  }
  if (!window.getSaverByNum) {
    window.getSaverByNum = function (num) {
      return allSavers.find((s) => s.num === num);
    };
  }
})();

// Backward compatibility alias for global scope
var SAVERS = window.SAVERS;

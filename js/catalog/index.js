// js/catalog/index.js — unified 37 in-tree ASCII scenes catalog
// Combines scenes_primary (01–19) and scenes_secondary (20–37) into canonical window.SAVERS.
(function initCatalog() {
  const primary = window.SAVERS_PRIMARY || [];
  const secondary = window.SAVERS_SECONDARY || [];
  const allSavers = primary.concat(secondary);

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

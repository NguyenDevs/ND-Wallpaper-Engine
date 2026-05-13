(function () {
  'use strict';

  function boot() {
    if (typeof THREE === 'undefined' || typeof WallpaperEngine === 'undefined') {
      setTimeout(boot, 50);
      return;
    }
    const engine = new WallpaperEngine();
    engine.init();
  }

  boot();
})();

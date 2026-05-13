class WallpaperEngine {
  constructor() {
    this.t = 0;
    this.introProgress = 0;
    this.smoothAudioIntensity = 0;
  }

  init() {
    const cfg = window.wallpaperConfig || {};
    this.createCanvas();
    
    this.sceneManager = new SceneManager(this.canvas, cfg);
    this.input = new InputController(this.canvas);
    
    this.mainGroup = new THREE.Group();
    this.sceneManager.scene.add(this.mainGroup);

    this.core = new CoreSystem(this.sceneManager.staticGroup);
    this.rings = new RingSystem(this.mainGroup);
    this.debris = new DebrisSystem(this.mainGroup);
    this.particles = new ParticleSystem(this.sceneManager.scene);

    this.initGlobalEvents();
    this.animate();
  }

  createCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'threejs-canvas';
    Object.assign(this.canvas.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'auto', zIndex: '2', opacity: '0',
      transition: 'opacity 2s ease', cursor: 'grab', background: 'transparent',
    });
    document.body.insertBefore(this.canvas, document.body.firstChild);
    requestAnimationFrame(() => { this.canvas.style.opacity = '1'; });
  }

  initGlobalEvents() {
    window.addEventListener('resize', () => this.sceneManager.updateCamera());
    this.sceneManager.updateCamera();
    const camCfg = window.wallpaperConfig || {};
    this.sceneManager.camera.position.set(this.sceneManager.camera.position.x, camCfg.offsetY ?? 2, camCfg.zoom ?? 18);

    window.addEventListener('threejs-update', (e) => {
      if (e.detail.type === 'rings') this.rings.setupRings();
      if (e.detail.type === 'particles') this.particles.setupParticles();
      if (e.detail.type === 'particlesize') {
        if (this.particles.pSystem) this.particles.pSystem.material.size = window.wallpaperConfig.particleSize;
      }
      if (e.detail.type === 'debris' || e.detail.type === 'debrissize') this.debris.setupDebris();
    });
  }

  updateAudioIntensity(cfg) {
    const audio = window._wallpaperAudioData;
    if (cfg.musicEnable && audio && audio.length > 0) {
      let bass = 0; for (let j = 0; j < 12; j++) bass += audio[j];
      bass = (bass / 12) * ((cfg.musicSensitive ?? 50) / 100) * 7.0;

      let mid = 0; for (let j = 12; j < 48; j++) mid += audio[j];
      mid = (mid / 36) * ((cfg.musicSensitive ?? 50) / 100) * 3.0;

      const target = bass * 0.8 + mid * 0.2;
      const attack = 0.45, decay = 0.12;
      if (target > this.smoothAudioIntensity) this.smoothAudioIntensity += (target - this.smoothAudioIntensity) * attack;
      else this.smoothAudioIntensity += (target - this.smoothAudioIntensity) * decay;
    } else {
      this.smoothAudioIntensity = 0;
    }
    return this.smoothAudioIntensity;
  }

  animate() {
    window._threejsRafId = requestAnimationFrame(() => this.animate());
    this.t += 0.01;
    const cfg = window.wallpaperConfig || {};
    const speedProp = cfg.speed ?? 1.0;

    const targetZoom = this.input.manualZoom !== null ? this.input.manualZoom : (cfg.zoom ?? 18);
    this.sceneManager.camera.position.z += (targetZoom - this.sceneManager.camera.position.z) * 0.05;
    this.sceneManager.camera.position.y += ((cfg.offsetY ?? 2.0) - this.sceneManager.camera.position.y) * 0.05;
    this.sceneManager.camera.updateProjectionMatrix();

    const rotQ = this.input.update(speedProp);
    this.mainGroup.quaternion.copy(rotQ);
    window._threejsRotQ = rotQ;

    this.introProgress = Math.min(1, this.introProgress + 0.004);
    const ringIntro = Utils.smoothstep(Math.min(1, this.introProgress / 0.75));
    const coreIntro = Utils.smoothstep(Math.max(0, (this.introProgress - 0.7) / 0.3));
    const speedBoost = 1.0 + Math.pow(1.0 - ringIntro, 2) * 15.0;
    const audioIntensity = this.updateAudioIntensity(cfg);

    this.core.update(this.t, coreIntro, ringIntro, speedProp, audioIntensity, cfg.musicEnable, cfg.musicStyle, cfg.musicSensitive, this.sceneManager.coreLight);
    this.rings.update(ringIntro, speedBoost, speedProp);
    this.debris.update(this.t, speedProp);
    this.particles.update(this.t, speedProp, audioIntensity, cfg.musicEnable);

    this.sceneManager.ambientLight.intensity = 0.6;
    this.sceneManager.dirLight.intensity = cfg.dirLightIntensity ?? 2.2;
    this.sceneManager.fillLight.intensity = cfg.fillLightIntensity ?? 1.5;

    this.sceneManager.render();
  }
}

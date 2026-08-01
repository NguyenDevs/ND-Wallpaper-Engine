class WallpaperEngine {
  constructor() {
    this.t = 0;
    this.introProgress = 0;
    this.smoothAudioIntensity = 0;
    this._envPeak = 0; 
    this._envAvg = 0;  
    this._envRelative = 0; 
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
      if (e.detail.type === 'coredetail') this.core.setDetail(window.wallpaperConfig.coreDetail);
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
      let bass = 0;
      for (let j = 0; j < 12; j++) bass += audio[j];
      bass /= 12;

      let mid = 0;
      for (let j = 12; j < 48; j++) mid += audio[j];
      mid /= 36;

      let high = 0;
      for (let j = 48; j < 64; j++) high += audio[j];
      high /= 16;

      const sens = (cfg.musicSensitive ?? 50) / 50;
      let raw = (bass * 0.6 + mid * 0.3 + high * 0.1) * sens;

      raw = Math.pow(raw, 0.85);

      if (raw > this._envPeak) {
        this._envPeak += (raw - this._envPeak) * 0.85;
      } else {
        this._envPeak += (raw - this._envPeak) * 0.1;
      }

      this._envAvg += (raw - this._envAvg) * 0.01;

      const delta = Math.max(0, this._envPeak - this._envAvg);
      const boost = 1.0 + (1.0 - Math.min(1.0, delta * 2.0)) * 0.5;
      const scaled = delta * sens * 4.0 * boost;

      const attack = 0.7, decay = 0.1;
      if (scaled > this._envRelative) {
        this._envRelative += (scaled - this._envRelative) * attack;
      } else {
        this._envRelative += (scaled - this._envRelative) * decay;
      }

      this.smoothAudioIntensity = Math.min(1.5, this._envRelative);
    } else {
      this._envPeak *= 0.85;
      this._envAvg *= 0.95;
      this._envRelative *= 0.88;
      this.smoothAudioIntensity = this._envRelative;
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
    const audioData = window._wallpaperAudioData;

    this.core.update(this.t, coreIntro, ringIntro, speedProp, audioIntensity, audioData, cfg.musicEnable, cfg.musicStyle, cfg.musicSensitive, this.sceneManager.coreLight);
    this.rings.update(ringIntro, speedBoost, speedProp);
    this.debris.update(this.t, speedProp);
    this.particles.update(this.t, speedProp, audioIntensity, cfg.musicEnable);

    this.sceneManager.ambientLight.intensity = 0.6;
    this.sceneManager.dirLight.intensity = cfg.dirLightIntensity ?? 2.2;
    this.sceneManager.fillLight.intensity = cfg.fillLightIntensity ?? 1.5;

    this.sceneManager.render();
  }
}

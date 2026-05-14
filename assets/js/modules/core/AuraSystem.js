class AuraSystem {
  constructor(group) {
    this.group = group;
    this._smoothBH = 1.0;
    this.init();
  }

  init() {
    const bhGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.blackHole = new THREE.Mesh(bhGeo, bhMat);
    this.group.add(this.blackHole);

    this.bhGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: Utils.getGlowTex('rgba(130, 17, 250, 0.9)', 64),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    }));
    this.bhGlow.scale.setScalar(1.2);
    this.group.add(this.bhGlow);

    this.glowOrb = new THREE.Sprite(new THREE.SpriteMaterial({
      map: Utils.getGlowTex('rgba(180,50,255,0.8)', 128),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    }));
    this.glowOrb.scale.setScalar(6.5);
    this.group.add(this.glowOrb);
  }

  update(t, coreIntro, audioIntensity, musicEnable, coreLight) {
    const cfg = window.wallpaperConfig || {};
    const glowSize = cfg.glowSize ?? 1.0;
    const glowIntensity = cfg.glowIntensity ?? 1.0;
    const ptIntensity = cfg.pointLightIntensity ?? 5.0;

    let targetBH = 1.0;
    if (musicEnable) {
      coreLight.intensity = (0.5 + audioIntensity * 3) * coreIntro * ptIntensity;
      this.glowOrb.scale.setScalar((6.0 + audioIntensity * 2) * (0.2 + 0.8 * coreIntro) * glowSize);
      targetBH = Math.max(0.5, 1.0 - audioIntensity * 1.1);
    } else {
      coreLight.intensity = (0.8 + Math.sin(t * 2) * 0.4) * coreIntro * ptIntensity;
      this.glowOrb.scale.setScalar((6.5 + Math.sin(t * 3) * 0.8) * (0.2 + 0.8 * coreIntro) * glowSize);
      targetBH = 1.0 + Math.sin(t * 1.5) * 0.05;
      this.bhGlow.scale.setScalar(1.2 * glowSize);
      this.bhGlow.material.opacity = 0.9 * glowIntensity;
    }

    const lerpFactor = targetBH < this._smoothBH ? 0.35 : 0.15;
    this._smoothBH += (targetBH - this._smoothBH) * lerpFactor;
    this.blackHole.scale.setScalar(this._smoothBH);
  }
}

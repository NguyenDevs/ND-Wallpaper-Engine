class AuraSystem {
  constructor(group) {
    this.group = group;
    this.init();
  }

  init() {
    const bhGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.blackHole = new THREE.Mesh(bhGeo, bhMat);
    this.group.add(this.blackHole);

    this.bhGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: Utils.getGlowTex('rgba(200,150,255,0.9)', 64),
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
    if (musicEnable) {
      coreLight.intensity = (0.8 + audioIntensity * 35) * coreIntro;
      this.glowOrb.scale.setScalar((6.0 + audioIntensity * 2) * (0.2 + 0.8 * coreIntro));
      this.blackHole.scale.setScalar(Math.max(0.35, 1.0 - audioIntensity * 0.8));
    } else {
      coreLight.intensity = (4 + Math.sin(t * 2) * 2) * coreIntro;
      this.glowOrb.scale.setScalar((6.5 + Math.sin(t * 3) * 0.8) * (0.2 + 0.8 * coreIntro));
      this.blackHole.scale.setScalar(1.0);
      this.bhGlow.scale.setScalar(1.2);
      this.bhGlow.material.opacity = 0.9;
    }
  }
}

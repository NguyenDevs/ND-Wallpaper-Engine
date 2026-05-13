class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.pSystem = null;
    this.setupParticles();
  }

  setupParticles() {
    if (this.pSystem) this.scene.remove(this.pSystem);
    const amount = window.wallpaperConfig?.particleAmount ?? 5500;
    const size = window.wallpaperConfig?.particleSize ?? 0.08;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(amount * 3);
    for (let i = 0; i < amount; i++) {
      const r = 2.0 + Math.pow(Math.random(), 1.5) * 20.0;
      const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1);
      pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPos[i * 3 + 2] = r * Math.cos(phi);
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      size: size, map: Utils.getGlowTex('rgba(190,100,255,1)', 16),
      transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.pSystem = new THREE.Points(pGeo, pMat);
    this.scene.add(this.pSystem);
  }

  update(t, speedProp, audioIntensity, musicEnable) {
    this.pSystem.rotation.y = t * 0.05 * speedProp;
    this.pSystem.rotation.z = Math.sin(t * 0.1) * 0.1;
    if (musicEnable) {
      this.pSystem.material.opacity = 0.05 + audioIntensity * 1.5;
    } else {
      this.pSystem.material.opacity = 0.4 + Math.sin(t * 4) * 0.2;
    }
  }
}

class CoreSystem {
  constructor(parentGroup) {
    this.group = new THREE.Group();
    parentGroup.add(this.group);

    this.rotGroup = new THREE.Group();
    this.rotGroup.rotation.x = 0.15;
    this.rotGroup.rotation.y = -0.25;
    this.group.add(this.rotGroup);

    this.RADIUS = 1.4;
    this.mesh = new CoreMesh(this.rotGroup, this.RADIUS);
    this.filaments = new FilamentSystem(this.rotGroup);
    this.aura = new AuraSystem(this.group);

    this.userData = { smoothM: 0, targetM: 0, nextPickTime: 0 };
  }

  setDetail(detail) {
    this.mesh.setDetail(detail);
  }

  update(t, coreIntro, ringIntro, speedProp, audioIntensity, audioData, musicEnable, musicStyle, musicSensitive, coreLight) {
    if (!musicEnable) {
      if (!this.userData.nextPickTime || t > this.userData.nextPickTime) {
        const r = Math.random();
        if (r < 0.25) this.userData.targetM = 0;
        else if (r < 0.5) this.userData.targetM = 1;
        else if (r < 0.75) this.userData.targetM = 2;
        else this.userData.targetM = 3;
        this.userData.nextPickTime = t + 5 + Math.random() * 5;
      }
      this.userData.smoothM += (this.userData.targetM - this.userData.smoothM) * 0.04;
    } else {
      this.userData.smoothM = 0;
    }

    this.mesh.update(t, this.userData.smoothM, coreIntro, musicEnable, musicStyle, audioIntensity, audioData);
    this.filaments.update(t, coreIntro);
    this.aura.update(t, coreIntro, audioIntensity, musicEnable, coreLight);

    const coreRotSpeed = 0.01 * (0.1 + 0.3 * coreIntro) * (0.5 + 0.5 * speedProp);
    this.rotGroup.rotation.y += coreRotSpeed;
    this.rotGroup.rotation.z = Math.sin(t * 0.5) * 0.2 * coreIntro;
    this.group.scale.setScalar(0.25 + 0.75 * ringIntro);
  }
}

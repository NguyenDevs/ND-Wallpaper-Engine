class FilamentSystem {
  constructor(group) {
    this.group = new THREE.Group();
    group.add(this.group);
    this.filaments = [];
    this.init();
  }

  init() {
    const count = 20;
    for (let i = 0; i < count; i++) {
      const segs = 48;
      const pts = [];
      for (let j = 0; j <= segs; j++) pts.push(new THREE.Vector3());
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? 0xff0088 : 0xaa00ff,
        transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.group.add(line);
      this.filaments.push({
        line,
        r: 0.4 + Math.random() * 0.5,
        phase: Math.random() * 10,
        speed: 0.8 + Math.random() * 1.5,
        noiseScale: 0.15 + Math.random() * 0.25,
      });
    }
  }

  update(t, coreIntro) {
    this.filaments.forEach((f) => {
      const pos = f.line.geometry.attributes.position.array;
      const segs = 64;
      const time = t * f.speed;
      for (let j = 0; j <= segs; j++) {
        const ang = (j / segs) * Math.PI * 2;
        const n = Math.sin(ang * 3 + time + f.phase) * f.noiseScale;
        const r = f.r * (1 + n * coreIntro);
        pos[j * 3] = Math.cos(ang) * r;
        pos[j * 3 + 1] = Math.sin(ang) * r;
        pos[j * 3 + 2] = Math.sin(time * 0.5 + ang * 2) * f.noiseScale * coreIntro;
      }
      f.line.geometry.attributes.position.needsUpdate = true;
      f.line.rotation.y += 0.01 * coreIntro;
      f.line.rotation.z += 0.005 * coreIntro;
      f.line.material.opacity = (0.2 + Math.sin(t + f.phase) * 0.1) * coreIntro;
    });
  }
}

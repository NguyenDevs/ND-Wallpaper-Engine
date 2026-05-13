class FlareSystem {
  constructor(group, radius) {
    this.group = new THREE.Group();
    group.add(this.group);
    this.RADIUS = radius;
    this.flares = [];
    this.init();
  }

  init() {
    const maxFlares = 4;
    for (let i = 0; i < maxFlares; i++) this.flares.push(this.createFlare());
  }

  createFlare() {
    const segs = 32;
    const pts = [];
    for (let i = 0; i <= segs; i++) pts.push(new THREE.Vector3());
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0xff33aa, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    this.group.add(line);
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI;
    const start = new THREE.Vector3().setFromSphericalCoords(this.RADIUS, theta, phi);
    const end = new THREE.Vector3().setFromSphericalCoords(
      this.RADIUS, theta + (Math.random() - 0.5) * 0.6, phi + (Math.random() - 0.5) * 0.6
    );
    const mid = start.clone().lerp(end, 0.5).normalize().multiplyScalar(this.RADIUS + 0.4 + Math.random() * 0.9);
    return { line, start, mid, end, life: 0, speed: 0.005 + Math.random() * 0.01 };
  }

  update(t, coreIntro) {
    this.flares.forEach((f) => {
      f.life += f.speed * coreIntro;
      if (f.life > 1) {
        f.life = 0;
        const phi = Math.random() * Math.PI * 2, theta = Math.random() * Math.PI;
        f.start.setFromSphericalCoords(this.RADIUS, theta, phi);
        f.end.setFromSphericalCoords(
          this.RADIUS, theta + (Math.random() - 0.5) * 0.6, phi + (Math.random() - 0.5) * 0.6
        );
        f.mid.copy(f.start).lerp(f.end, 0.5).normalize().multiplyScalar(this.RADIUS + 0.4 + Math.random() * 0.9);
      }
      const pos = f.line.geometry.attributes.position.array;
      const segs = 32;
      const alpha = Math.sin(f.life * Math.PI);
      for (let i = 0; i <= segs; i++) {
        const t_lerp = i / segs;
        const p = new THREE.Vector3();
        p.x = (1 - t_lerp) * (1 - t_lerp) * f.start.x + 2 * (1 - t_lerp) * t_lerp * f.mid.x + t_lerp * t_lerp * f.end.x;
        p.y = (1 - t_lerp) * (1 - t_lerp) * f.start.y + 2 * (1 - t_lerp) * t_lerp * f.mid.y + t_lerp * t_lerp * f.end.y;
        p.z = (1 - t_lerp) * (1 - t_lerp) * f.start.z + 2 * (1 - t_lerp) * t_lerp * f.mid.z + t_lerp * t_lerp * f.end.z;
        const noise = Math.sin(t_lerp * 10 + t * 5) * 0.05 * alpha;
        p.addScaledVector(p.clone().normalize(), noise);
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      }
      f.line.geometry.attributes.position.needsUpdate = true;
      f.line.material.opacity = alpha * 0.9 * coreIntro;
      f.line.material.color.setHSL(0.85 + Math.sin(t + f.life) * 0.05, 1, 0.7);
    });
  }
}

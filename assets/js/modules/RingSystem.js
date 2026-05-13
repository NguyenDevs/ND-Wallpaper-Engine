class RingSystem {
  constructor(parentGroup) {
    this.parentGroup = parentGroup;
    this.rings = [];
    this.setupRings();
  }

  setupRings() {
    this.rings.forEach((r) => this.parentGroup.remove(r.obj));
    const amount = window.wallpaperConfig?.ringAmount ?? 4;
    const ringConfigs = [
      { r1: 3.0, r2: 3.6, d: 0.6, s: 0.007, a: new THREE.Vector3(1, 0.5, 0.2), skip: [{ skip: 1, prob: 20 }, { skip: 0, prob: 80 }] },
      { r1: 4.2, r2: 5.0, d: 0.8, s: -0.004, a: new THREE.Vector3(-0.5, 1, 0.5), skip: [{ skip: 1, prob: 30 }, { skip: 0, prob: 70 }] },
      { r1: 5.6, r2: 6.6, d: 1.2, s: 0.003, a: new THREE.Vector3(0.2, -0.5, 1), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 20 }, { skip: 0, prob: 50 }] },
      { r1: 7.2, r2: 8.4, d: 1.4, s: -0.002, a: new THREE.Vector3(0.5, 0.8, -0.3), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 20 }, { skip: 3, prob: 10 }, { skip: 0, prob: 40 }] },
      { r1: 8.8, r2: 10.2, d: 1.6, s: 0.001, a: new THREE.Vector3(0.1, 1, 0.4), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 10 }, { skip: 0, prob: 60 }] },
      { r1: 10.6, r2: 12.2, d: 1.8, s: -0.005, a: new THREE.Vector3(0.8, 0.2, 1), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 10 }, { skip: 0, prob: 60 }] },
      { r1: 12.6, r2: 14.4, d: 2.0, s: 0.006, a: new THREE.Vector3(-1, -0.5, 0.3), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 10 }, { skip: 0, prob: 60 }] },
      { r1: 14.8, r2: 16.8, d: 2.2, s: -0.003, a: new THREE.Vector3(0.3, -1, 0.6), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 10 }, { skip: 0, prob: 60 }] },
    ];
    this.rings = [];
    for (let i = 0; i < amount; i++) {
      const c = ringConfigs[i % ringConfigs.length];
      const r = this.createFragmentedRing(c.r1, c.r2, c.d, 3 + (i % 4), c.s, c.a, this.getSkipIndices(3 + (i % 4), c.skip));
      this.rings.push(r);
      this.parentGroup.add(r.obj);
    }
  }

  createFragmentedRing(innerR, outerR, depth, fragmentsCount, rotSpeed, axis, hiddenIndices = null) {
    const group = new THREE.Group();
    const fragments = [];
    const stoneMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a0b3a, emissive: 0x110522, emissiveIntensity: 0.4,
      metalness: 0.9, roughness: 0.1, clearcoat: 1.0, flatShading: true,
    });
    const bevelMat = new THREE.MeshPhysicalMaterial({
      color: 0x140528, emissive: 0x0a0011, emissiveIntensity: 0.3,
      metalness: 0.8, roughness: 0.3, clearcoat: 0.5, flatShading: true,
    });
    const materials = [stoneMat, bevelMat];
    const gap = 0.3, totalArc = Math.PI * 2, arcLength = totalArc / fragmentsCount - gap;
    let skipArr = hiddenIndices || [];
    if (!hiddenIndices) {
      const maxSkip = fragmentsCount <= 3 ? 1 : 2;
      const numSkip = 1 + Math.floor(Math.random() * maxSkip);
      for (let i = 0; i < numSkip; i++) {
        let idx; do { idx = Math.floor(Math.random() * fragmentsCount); } while (skipArr.includes(idx));
        skipArr.push(idx);
      }
    }
    for (let i = 0; i < fragmentsCount; i++) {
      if (skipArr.includes(i)) continue;
      const start = i * (totalArc / fragmentsCount);
      const shape = new THREE.Shape();
      shape.absarc(0, 0, outerR, start, start + arcLength, false);
      shape.lineTo(Math.cos(start + arcLength) * innerR, Math.sin(start + arcLength) * innerR);
      shape.absarc(0, 0, innerR, start + arcLength, start, true);
      shape.lineTo(Math.cos(start) * outerR, Math.sin(start) * outerR);
      const extrudeSettings = {
        depth: depth, bevelEnabled: true, bevelSegments: 3,
        steps: 1, bevelSize: 0.05, bevelThickness: 0.05, curveSegments: 48,
      };
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.translate(0, 0, -depth / 2);
      const mesh = new THREE.Mesh(geo, materials);
      mesh.castShadow = true; mesh.receiveShadow = true;
      group.add(mesh);
      fragments.push({
        mesh,
        axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        speed: 0.01 + Math.random() * 0.02,
      });
    }
    return { obj: group, axis: axis.normalize(), speed: rotSpeed, fragments };
  }

  getSkipIndices(count, probs) {
    const r = Math.random() * 100;
    let cumulative = 0, numToSkip = 0;
    for (const p of probs) {
      cumulative += p.prob;
      if (r <= cumulative) { numToSkip = p.skip; break; }
    }
    const indices = [], available = Array.from({ length: count }, (_, i) => i);
    for (let i = 0; i < numToSkip; i++) {
      if (available.length === 0) break;
      const idx = Math.floor(Math.random() * available.length);
      indices.push(available.splice(idx, 1)[0]);
    }
    return indices;
  }

  update(ringIntro, speedBoost, speedProp) {
    this.rings.forEach((r) => {
      const ringSpeed = r.speed * (0.2 + 0.8 * ringIntro) * speedBoost * speedProp;
      r.obj.rotateOnAxis(r.axis, ringSpeed);
      r.obj.rotateX(0.002 * speedProp * ringIntro);
      r.obj.rotateZ(0.001 * speedProp * ringIntro);
      r.obj.scale.setScalar(ringIntro);
    });
  }
}

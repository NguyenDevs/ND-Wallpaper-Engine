class RingSystem {
  constructor(parentGroup) {
    this.parentGroup = parentGroup;
    this.rings = [];
    this.setupRings();
  }

  setupRings() {
    this.rings.forEach((r) => this.parentGroup.remove(r.obj));
    const amount = window.wallpaperConfig?.ringAmount ?? 4;
    const spacing = window.wallpaperConfig?.ringSpacing ?? 1.0;

    const ringConfigs = [
      { w: 0.6, d: 0.6, s: 0.007, a: new THREE.Vector3(1, 0.5, 0.2), skip: [{ skip: 1, prob: 20 }, { skip: 0, prob: 80 }] },
      { w: 0.8, d: 0.8, s: -0.004, a: new THREE.Vector3(-0.5, 1, 0.5), skip: [{ skip: 1, prob: 30 }, { skip: 0, prob: 70 }] },
      { w: 1.0, d: 1.2, s: 0.003, a: new THREE.Vector3(0.2, -0.5, 1), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 20 }, { skip: 0, prob: 50 }] },
      { w: 1.2, d: 1.4, s: -0.002, a: new THREE.Vector3(0.5, 0.8, -0.3), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 20 }, { skip: 3, prob: 10 }, { skip: 0, prob: 40 }] },
      { w: 1.4, d: 1.6, s: 0.001, a: new THREE.Vector3(0.1, 1, 0.4), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 10 }, { skip: 0, prob: 60 }] },
      { w: 1.6, d: 1.8, s: -0.005, a: new THREE.Vector3(0.8, 0.2, 1), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 10 }, { skip: 0, prob: 60 }] },
      { w: 1.8, d: 2.0, s: 0.006, a: new THREE.Vector3(-1, -0.5, 0.3), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 10 }, { skip: 0, prob: 60 }] },
      { w: 2.0, d: 2.2, s: -0.003, a: new THREE.Vector3(0.3, -1, 0.6), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 10 }, { skip: 0, prob: 60 }] },
    ];

    this.rings = [];
    let currentR2 = 2.4; 
    for (let i = 0; i < amount; i++) {
      const c = ringConfigs[i % ringConfigs.length];
      const ringGap = 0.6 * spacing;
      const r1 = currentR2 + ringGap;
      const r2 = r1 + c.w;
      currentR2 = r2;
      const fragmentGap = 0.3 / Math.sqrt(spacing);

      const r = this.createFragmentedRing(r1, r2, c.d, 3 + (i % 4), c.s, c.a, this.getSkipIndices(3 + (i % 4), c.skip), fragmentGap);
      this.rings.push(r);
      this.parentGroup.add(r.obj);
    }
  }

  createFragmentedRing(innerR, outerR, depth, fragmentsCount, rotSpeed, axis, hiddenIndices = null, gap = 0.3) {
    const group = new THREE.Group();
    const fragments = [];
    const stoneMat = new THREE.MeshPhysicalMaterial({
       color: 0x140528, emissive: 0x0a0011, emissiveIntensity: 0.3,
      metalness: 1.0, roughness: 0.25, clearcoat: 0.5, flatShading: false,
    });
    const bevelMat = new THREE.MeshPhysicalMaterial({
      color: 0x140528, emissive: 0x0a0011, emissiveIntensity: 0.3,
      metalness: 1.0, roughness: 0.25, clearcoat: 0.5, flatShading: false,
    });
    const materials = [stoneMat, bevelMat];
    const totalArc = Math.PI * 2, arcLength = totalArc / fragmentsCount - gap;
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
      const end = start + arcLength;
      const chamfer = 0.15;
      
      const shape = new THREE.Shape();
      shape.absarc(0, 0, outerR, start + chamfer / outerR, end - chamfer / outerR, false);
      
      shape.lineTo(Math.cos(end) * (outerR - chamfer), Math.sin(end) * (outerR - chamfer));
      shape.lineTo(Math.cos(end) * (innerR + chamfer), Math.sin(end) * (innerR + chamfer));
      
      shape.absarc(0, 0, innerR, end - chamfer / innerR, start + chamfer / innerR, true);
      
      shape.lineTo(Math.cos(start) * (innerR + chamfer), Math.sin(start) * (innerR + chamfer));
      shape.lineTo(Math.cos(start) * (outerR - chamfer), Math.sin(start) * (outerR - chamfer));
      const extrudeSettings = {
        depth: depth, bevelEnabled: true, bevelSegments: 1,
        steps: 1, bevelSize: 0.15, bevelThickness: 0.15, curveSegments: 48,
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

    const gapConnectors = [];
    for (let i = 0; i < fragmentsCount; i++) {
      const nextIdx = (i + 1) % fragmentsCount;
      if (!skipArr.includes(i) && !skipArr.includes(nextIdx)) {
        const midAngle = i * (totalArc / fragmentsCount) + arcLength + gap / 2;
        const poly = this.createTriangle(stoneMat, outerR - innerR);
        poly.position.set(Math.cos(midAngle) * ((innerR + outerR) / 2), Math.sin(midAngle) * ((innerR + outerR) / 2), 0);
        group.add(poly);
        gapConnectors.push(poly);
      }
    }

    return { obj: group, axis: axis.normalize(), speed: rotSpeed, fragments, gapConnectors };
  }

  createTriangle(material, thickness) {
    const size = thickness * 0.4;
    const geo = new THREE.IcosahedronGeometry(size, 0);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
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

      if (r.gapConnectors) {
        r.gapConnectors.forEach((c) => {
          c.rotateX(0.015);
          c.rotateZ(0.01);
        });
      }
    });
  }
}

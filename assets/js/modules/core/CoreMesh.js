class CoreMesh {
  constructor(group, radius) {
    this.group = group;
    this.RADIUS = radius;
    this.initGeometry();
    this.initMaterial();
  }

  initGeometry() {
    this.geo = new THREE.IcosahedronGeometry(this.RADIUS, 5);
    this.basePos = new Float32Array(this.geo.attributes.position.array);
    const N = this.basePos.length / 3;
    this.thetaArr = new Float32Array(N);
    this.phiArr = new Float32Array(N);
    const randoms = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const x = this.basePos[i * 3] / this.RADIUS;
      const y = this.basePos[i * 3 + 1] / this.RADIUS;
      const z = this.basePos[i * 3 + 2] / this.RADIUS;
      this.thetaArr[i] = Math.atan2(y, x);
      this.phiArr[i] = Math.acos(Math.max(-1, Math.min(1, z)));
      randoms[i] = Math.random();
    }
    this.geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
  }

  initMaterial() {
    this.wireMat = new THREE.MeshPhysicalMaterial({
      color: 0xaa00ff, emissive: 0x4400aa, emissiveIntensity: 1.0,
      wireframe: true, transparent: true, opacity: 0.25,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });

    this.pointsMat = new THREE.PointsMaterial({
      size: 0.12, color: 0xdd88ff, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, map: Utils.getGlowTex('rgba(200,100,255,1)', 16), depthWrite: false,
    });

    this.wireMat.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        varying float vNormalZ;
        ${shader.vertexShader}
      `.replace(
        `void main() {`,
        `void main() { vNormalZ = (normalMatrix * normal).z;`
      );
      shader.fragmentShader = `
        varying float vNormalZ;
        ${shader.fragmentShader}
      `.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `
        float depthFade = smoothstep(-0.2, 0.8, vNormalZ);
        vec4 diffuseColor = vec4( diffuse, opacity * depthFade );
        `
      );
    };

    this.pointsMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader = `
        attribute float aRandom;
        varying float vRandom;
        varying float vNormalZ;
        uniform float uTime;
        ${shader.vertexShader}
      `.replace(
        `void main() {`,
        `void main() { 
          vRandom = aRandom;
          vNormalZ = (normalMatrix * normalize(position)).z;`
      ).replace(
        `gl_PointSize = size;`,
        `float t = uTime * (2.0 + aRandom * 3.0) + aRandom * 100.0;
         float twinkle = 0.8 + 0.2 * sin(t);
         gl_PointSize = size * twinkle;`
      );
      shader.fragmentShader = `
        varying float vRandom;
        varying float vNormalZ;
        uniform float uTime;
        ${shader.fragmentShader}
      `.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `float t = uTime * (2.0 + vRandom * 3.0) + vRandom * 100.0;
         float twinkle = 0.4 + 0.6 * pow(0.5 + 0.5 * sin(t), 2.0);
         float depthFade = smoothstep(-0.2, 0.8, vNormalZ);
         vec4 diffuseColor = vec4( diffuse, opacity * twinkle * depthFade );`
      );
      this.pointsMat.userData.shader = shader;
    };

    this.points = new THREE.Points(this.geo, this.pointsMat);
    this.wireMesh = new THREE.Mesh(this.geo, this.wireMat);
    this.wireMesh.castShadow = true;

    this.group.add(this.wireMesh);
    this.group.add(this.points);
  }

  update(t, morphCycle, coreIntro, musicEnable, musicStyle, audioIntensity) {
    const positions = this.geo.attributes.position.array;
    const N = this.basePos.length / 3;

    for (let i = 0; i < N; i++) {
      const idx = i * 3, bx = this.basePos[idx], by = this.basePos[idx + 1], bz = this.basePos[idx + 2];
      const theta = this.thetaArr[i], phi = this.phiArr[i];

      if (musicEnable) {
        let r = 1.0;
        const style = (musicStyle || 'tectonic').toLowerCase();
        if (style === 'tectonic') {
          const n1 = Math.sin(5 * theta) * Math.cos(5 * phi);
          const n2 = Math.sin(12 * theta + t) * Math.cos(12 * phi - t);
          const dr = n1 * 0.6 + n2 * 0.25;
          r = 1.0 + dr * audioIntensity;
        } else if (style === 'wave') {
          const dr = 0.5 * Math.sin(3.5 * theta - t * 2.0);
          r = 1.0 + dr * audioIntensity;
        } else if (style === 'ripple') {
          const dr = 0.45 * Math.sin(8.0 * phi - t * 3.0);
          r = 1.0 + dr * audioIntensity;
        }
        positions[idx] = bx * r; positions[idx + 1] = by * r; positions[idx + 2] = bz * r;
      } else {
        const tectonic = Math.sin(6 * theta) * Math.cos(6 * phi);
        const r1 = 1.0 + (tectonic > 0.3 ? 0.15 : tectonic < -0.3 ? -0.1 : 0);
        const tx1 = bx * r1, ty1 = by * r1, tz1 = bz * r1;
        const r2 = 1.0 + 0.25 * Math.sin(3 * theta - t * 1.5) + 0.2 * Math.cos(4 * phi + t);
        const tx2 = bx * r2, ty2 = by * r2, tz2 = bz * r2;
        const r3 = 1.0 + 0.12 * Math.sin(8 * theta + t * 2) * Math.cos(t * 1.2) + 0.05 * Math.sin(phi * 6);
        const tx3 = bx * r3, ty3 = by * r3, tz3 = bz * r3;

        let tx, ty, tz;
        if (morphCycle < 1) {
          const l = Utils.smoothstep(morphCycle);
          tx = bx + (tx1 - bx) * l; ty = by + (ty1 - by) * l; tz = bz + (tz1 - bz) * l;
        } else if (morphCycle < 2) {
          const l = Utils.smoothstep(morphCycle - 1);
          tx = tx1 + (tx2 - tx1) * l; ty = ty1 + (ty2 - ty1) * l; tz = tz1 + (tz2 - tz1) * l;
        } else if (morphCycle < 3) {
          const l = Utils.smoothstep(morphCycle - 2);
          tx = tx2 + (tx3 - tx2) * l; ty = ty2 + (ty3 - ty2) * l; tz = tz2 + (tz3 - tz2) * l;
        } else {
          const l = Utils.smoothstep(morphCycle - 3);
          tx = tx3 + (bx - tx3) * l; ty = ty3 + (by - ty3) * l; tz = bz + (tz3 - bz) * l;
        }
        positions[idx] = bx + (tx - bx) * coreIntro;
        positions[idx + 1] = by + (ty - by) * coreIntro;
        positions[idx + 2] = bz + (tz - bz) * coreIntro;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
    if (this.pointsMat.userData.shader) this.pointsMat.userData.shader.uniforms.uTime.value = t;
  }
}

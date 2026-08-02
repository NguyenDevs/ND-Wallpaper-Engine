class CoreMesh {
  constructor(group, radius) {
    this.group = group;
    this.RADIUS = radius;
    this._smoothAudio = new Float32Array(64).fill(0);
    this.detail = ((window.wallpaperConfig || {}).coreDetail) ?? 7;
    this.initGeometry();
    this.initMaterial();
  }

  setDetail(detail) {
    const d = Math.max(1, Math.round(detail ?? 7));
    if (d === this.detail) return;
    this.detail = d;
    const oldGeo = this.geo;
    this.initGeometry();
    this.points.geometry = this.geo;
    this.wireMesh.geometry = this.geo;
    oldGeo.dispose();
  }

  initGeometry() {
    this.geo = new THREE.IcosahedronGeometry(this.RADIUS, Math.max(1, Math.round(this.detail || 7)));
    this.basePos = new Float32Array(this.geo.attributes.position.array);
    const N = this.basePos.length / 3;
    this.normBase = new Float32Array(3 * N);
    const randoms = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const x = this.basePos[i * 3] / this.RADIUS;
      const y = this.basePos[i * 3 + 1] / this.RADIUS;
      const z = this.basePos[i * 3 + 2] / this.RADIUS;
      this.normBase[i * 3] = x;
      this.normBase[i * 3 + 1] = y;
      this.normBase[i * 3 + 2] = z;
      randoms[i] = Math.random();
    }
    this.geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
  }

  initMaterial() {
    this.wireMat = new THREE.MeshPhysicalMaterial({
      color: 0x8800ff, emissive: 0x220066, emissiveIntensity: 0.8,
      wireframe: true, transparent: true, opacity: 0.25,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });

    this.pointsMat = new THREE.PointsMaterial({
      size: 0.08, color: 0xaa44ff, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, map: Utils.getGlowTex('rgba(255,255,255,1)', 16), depthWrite: false,
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
        float depthFade = smoothstep(-0.4, 0.6, vNormalZ);
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
         float depthFade = smoothstep(-0.4, 0.6, vNormalZ);
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

  update(t, morphCycle, coreIntro, musicEnable, musicStyle, audioIntensity, audioData) {
    const cfg = window.wallpaperConfig || {};
    this.wireMesh.visible = cfg.corePolygon === true;
    const positions = this.geo.attributes.position.array;
    const N = this.basePos.length / 3;

    if (musicEnable && audioData) {
      for (let j = 0; j < 64; j++) {
        const v = audioData[j];
        this._smoothAudio[j] += (v - this._smoothAudio[j]) * (v > this._smoothAudio[j] ? 0.45 : 0.08);
      }
    }

    for (let i = 0; i < N; i++) {
      const idx = i * 3;
      const bx = this.basePos[idx], by = this.basePos[idx + 1], bz = this.basePos[idx + 2];
      const nx = this.normBase[idx], ny = this.normBase[idx + 1], nz = this.normBase[idx + 2];

      if (musicEnable) {
        let dr = 0;
        const styleL = (musicStyle || 'tectonic').toLowerCase();
        if (styleL === 'tectonic') dr = this.sampleFreq(nx, ny, nz, t, 1.6);
        else if (styleL === 'wave') dr = this.sampleWave(nx, ny, nz, t);
        else if (styleL === 'ripple') dr = this.sampleRipple(nx, ny, nz, t);

        positions[idx] = bx + nx * dr;
        positions[idx + 1] = by + ny * dr;
        positions[idx + 2] = bz + nz * dr;
      } else {
        const tectonic = this.sin2(nx, ny, nz, 3) * this.cos2(nx, ny, nz, 3);
        const r1 = 1.0 + (tectonic > 0.3 ? 0.15 : tectonic < -0.3 ? -0.1 : 0);
        const tx1 = bx * r1, ty1 = by * r1, tz1 = bz * r1;
        const r2 = 1.0 + 0.25 * Math.sin(3 * this.a2(nx, ny) - t * 1.5) + 0.2 * Math.cos(4 * this.e2(ny, nz) + t);
        const tx2 = bx * r2, ty2 = by * r2, tz2 = bz * r2;
        const r3 = 1.0 + 0.12 * Math.sin(8 * this.a2(nx, ny) + t * 2) * Math.cos(t * 1.2) + 0.05 * Math.sin(6 * this.e2(ny, nz));
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

  freqAt(f) {
    const n = this._smoothAudio.length;
    const pos = ((f % 1) + 1) % 1 * n;
    const i0 = Math.floor(pos) % n;
    const i1 = (i0 + 1) % n;
    const fr = pos - Math.floor(pos);
    return this._smoothAudio[i0] * (1 - fr) + this._smoothAudio[i1] * fr;
  }

  a2(x, y) { return Math.atan2(y, x); }
  e2(x, y) { return Math.acos(THREE.MathUtils.clamp(y, -1, 1)); }

  hash(px, py, pz) {
    const s = Math.sin(px * 127.1 + py * 311.7 + pz * 74.7) * 43758.5453;
    return s - Math.floor(s);
  }

  sin2(x, y, z, k) { return Math.sin(x * k + y * k * 0.7 + z * k * 0.5); }
  cos2(x, y, z, k) { return Math.cos(x * k * 0.6 + y * k + z * k * 0.8); }

  sampleRipple(x, y, z, t) {
    const la = 10, lo = 12;
    const px = Math.floor((this.a2(x, y) / (Math.PI * 2) + 0.5) * lo + 0.5);
    const py = Math.floor((this.e2(y, z) / Math.PI) * la + 0.5);
    const bass = this.freqAt(0.04);
    const high = this.freqAt(0.6);

    const wave = Math.sin(this.e2(y, z) * 8 - t * (3.0 + bass * 3.0) * (1.0 + high)) + Math.sin(this.a2(x, y) * 6 - t * (2.0 + bass * 2.0));
    const ripple = Utils.smoothstep(0.5 + 0.5 * wave);
    const weight = 0.5 + 0.5 * this.sin2(x, y, z, 2);
    const amp = (0.4 + bass * 1.6) * (0.25 + high * 1.3);
    return (ripple * weight - 0.25) * amp * 1.4;
  }

  sampleWave(x, y, z, t) {
    const bass = this.freqAt(0.03);
    const mid = this.freqAt(0.4);
    const treble = this.freqAt(0.75);
    const swell = bass * 0.6 + mid * 0.3 + treble * 0.1;

    const travel = t * (0.8 + bass * 1.6);
    const n1 = this.sin2(x, y, z, 2 * 0.7 + swell * 2);
    const n2 = this.cos2(x, y, z, 3 * 0.5 + treble * 1.5);
    const field = Math.sin(this.a2(x, y) * 3 - travel) * (0.4 + bass * 2.2)
               + Math.sin(this.e2(y, z) * 4 + travel * 0.7) * (0.25 + mid * 1.6)
               + n1 * 0.3 * (1 + treble) + n2 * 0.2 * (1 + mid);
    return field * (0.18 + swell * 0.4);
  }

  sampleFreq(x, y, z, t, amp) {
    const cells = 5;
    const px = Math.floor((this.a2(x, y) / (Math.PI * 2) + 0.5) * cells + 0.5);
    const py = Math.floor((this.e2(y, z) / Math.PI) * cells + 0.5) * cells;
    const idx = px + py;
    const drive = this.freqAt((idx * 0.61803) % 1);

    const fx = this.a2(x, y) / (Math.PI * 2) + 0.5;
    const fy = this.e2(y, z) / Math.PI;
    const fxq = (fx * cells - Math.floor(fx * cells)) * 4 - 2;
    const fyq = (fy * cells - Math.floor(fy * cells)) * 4 - 2;
    const mound = Math.max(0, 1 - fxq * fxq) * Math.max(0, 1 - fyq * fyq);

    const wobble = 0.5 + 0.5 * this.sin2(x, y, z, 3);
    const pulsey = 0.6 + 0.4 * Math.sin(t * (0.8 + drive * 1.8) + this.hash(x, y, z) * 12.0);
    const level = (mound * 2 - 0.5) * (0.35 + drive * 1.6) * wobble * pulsey;
    return level * amp;
  }
}

class CoreMesh {
  constructor(group, radius) {
    this.group = group;
    this.RADIUS = radius;
    this._smoothAudio = new Float32Array(64).fill(0);
    this.initGeometry();
    this.initMaterial();
  }

  initGeometry() {
    this.geo = new THREE.IcosahedronGeometry(this.RADIUS, 7);
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
    const positions = this.geo.attributes.position.array;
    const N = this.basePos.length / 3;
    const tSmooth = t * 0.6;

    if (musicEnable && audioData) {
      for (let j = 0; j < 64; j++) {
        this._smoothAudio[j] += (audioData[j] - this._smoothAudio[j]) * 0.15;
      }
    }

    for (let i = 0; i < N; i++) {
      const idx = i * 3, bx = this.basePos[idx], by = this.basePos[idx + 1], bz = this.basePos[idx + 2];
      const theta = this.thetaArr[i], phi = this.phiArr[i];

      if (musicEnable) {
        let r = 1.0;
        const style = (musicStyle || 'tectonic').toLowerCase();
        
        if (style === 'tectonic') {
          const pattern = Math.sin(6 * theta) * Math.cos(6 * phi);
          const block = pattern > 0.33 ? 0.2 : pattern < -0.33 ? -0.15 : 0;
          const dr = block * audioIntensity * 1.2;
          r = 1.0 + dr;
        } else if (style === 'wave') {
          const n1 = Math.sin(4 * theta + tSmooth * 0.5) * Math.cos(4 * phi - tSmooth * 0.4);
          const n2 = Math.sin(8 * theta - tSmooth) * Math.cos(8 * phi + tSmooth * 0.5);
          const plate = Utils.smoothstep(0.5 + (n1 * 0.7 + n2 * 0.3) * 0.5);
          const dr = (plate - 0.5) * 0.8 * audioIntensity;
          r = 1.0 + dr;
        } else if (style === 'ripple') {
          const wave = Math.sin(phi * 8 - tSmooth * 5) * 0.5 + 0.5;
          const dr = wave * audioIntensity * 0.5;
          r = 1.0 + dr;
        }
        positions[idx] = bx * r;
        positions[idx + 1] = by * r;
        positions[idx + 2] = bz * r;
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

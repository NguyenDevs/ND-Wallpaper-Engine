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
    const randoms = new Float32Array(amount);
    const distances = new Float32Array(amount);

    for (let i = 0; i < amount; i++) {
      const r = 2.0 + Math.pow(Math.random(), 1.5) * 22.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPos[i * 3 + 2] = r * Math.cos(phi);
      
      randoms[i] = Math.random();
      distances[i] = r;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    pGeo.setAttribute('aDist', new THREE.BufferAttribute(distances, 1));

    const pMat = new THREE.PointsMaterial({
      size: size, map: Utils.getGlowTex('rgba(190,100,255,1)', 16),
      transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });

    pMat.onBeforeCompile = (shader) => {
      shader.uniforms.uAudioIntensity = { value: 0 };
      shader.uniforms.uMusicEnable = { value: 0 };
      shader.uniforms.uTime = { value: 0 };
      
      shader.vertexShader = `
        attribute float aRandom;
        attribute float aDist;
        varying float vRandom;
        varying float vDist;
        ${shader.vertexShader}
      `.replace(
        `void main() {`,
        `void main() { 
          vRandom = aRandom; 
          vDist = aDist;`
      );

      shader.fragmentShader = `
        varying float vRandom;
        varying float vDist;
        uniform float uAudioIntensity;
        uniform float uMusicEnable;
        uniform float uTime;
        ${shader.fragmentShader}
      `.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `
        float proximity = smoothstep(24.0, 2.0, vDist);
        float baseOpacity = 0.15 + proximity * 0.12;
        float finalOpacity = baseOpacity;

        if (uMusicEnable > 0.5) {
          float distOffset = vDist * 0.015;
          float pulse = smoothstep(vRandom * 0.3 + distOffset, vRandom * 0.3 + 0.6 + distOffset, uAudioIntensity);
          float sparkle = pow(0.5 + 0.5 * sin(uTime * (3.0 + vRandom * 5.0) + vDist * 0.3), 2.0) * 0.4;
          finalOpacity = baseOpacity + pulse * 1.1 + sparkle * (1.0 + uAudioIntensity);
        } else {
          float idleTwinkle = pow(0.5 + 0.5 * sin(uTime * 1.2 + vRandom * 20.0 + vDist * 0.1), 2.0) * 0.2;
          finalOpacity = baseOpacity + idleTwinkle;
        }
        vec4 diffuseColor = vec4( diffuse, finalOpacity );
        `
      );
      pMat.userData.shader = shader;
    };

    this.pSystem = new THREE.Points(pGeo, pMat);
    this.scene.add(this.pSystem);
  }

  update(t, speedProp, audioIntensity, musicEnable) {
    this.pSystem.rotation.y = t * 0.04 * speedProp;
    this.pSystem.rotation.z = Math.sin(t * 0.08) * 0.08;
    
    if (this.pSystem.material.userData.shader) {
      const s = this.pSystem.material.userData.shader;
      s.uniforms.uAudioIntensity.value = audioIntensity;
      s.uniforms.uMusicEnable.value = musicEnable ? 1 : 0;
      s.uniforms.uTime.value = t;
    }
  }
}

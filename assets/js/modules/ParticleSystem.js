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
    for (let i = 0; i < amount; i++) {
      const r = 2.0 + Math.pow(Math.random(), 1.5) * 20.0;
      const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1);
      pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPos[i * 3 + 2] = r * Math.cos(phi);
      randoms[i] = Math.random();
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

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
        varying float vRandom;
        ${shader.vertexShader}
      `.replace(
        `void main() {`,
        `void main() { vRandom = aRandom;`
      );
      shader.fragmentShader = `
        varying float vRandom;
        uniform float uAudioIntensity;
        uniform float uMusicEnable;
        uniform float uTime;
        ${shader.fragmentShader}
      `.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `
        float finalOpacity = opacity;
        if (uMusicEnable > 0.5) {
          float pulse = smoothstep(vRandom * 0.4, vRandom * 0.4 + 0.5, uAudioIntensity);
          float sparkle = pow(0.5 + 0.5 * sin(uTime * (5.0 + vRandom * 10.0) + vRandom * 100.0), 3.0);
          finalOpacity = 0.05 + pulse * 1.1 + sparkle * uAudioIntensity * 0.4;
        } else {
          finalOpacity = 0.3 + 0.2 * sin(uTime * 2.0 + vRandom * 100.0);
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
    this.pSystem.rotation.y = t * 0.05 * speedProp;
    this.pSystem.rotation.z = Math.sin(t * 0.1) * 0.1;
    
    if (this.pSystem.material.userData.shader) {
      const s = this.pSystem.material.userData.shader;
      s.uniforms.uAudioIntensity.value = audioIntensity;
      s.uniforms.uMusicEnable.value = musicEnable ? 1 : 0;
      s.uniforms.uTime.value = t;
    }
  }
}

class AuraSystem {
  constructor(group) {
    this.group = group;
    this._smoothBH = 1.0;
    this.init();
  }

  init() {
    const bhGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.blackHole = new THREE.Mesh(bhGeo, bhMat);
    this.blackHole.renderOrder = 20;
    this.group.add(this.blackHole);

    const glowGeo = new THREE.SphereGeometry(1, 32, 32);
    const createGlowMat = (opacity, power, side) => new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0x9933ff) },
        uOpacity: { value: opacity },
        uPower: { value: power }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewVec;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewVec = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uPower;
        varying vec3 vNormal;
        varying vec3 vViewVec;
        void main() {
          float glow = pow(max(0.0, dot(vNormal, vViewVec)), uPower);
          gl_FragColor = vec4(uColor, glow * uOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: side || THREE.FrontSide
    });

    this.bhGlowMat = createGlowMat(0.8, 3.0);
    this.bhGlow = new THREE.Mesh(glowGeo, this.bhGlowMat);
    this.bhGlow.scale.setScalar(0.7);
    this.bhGlow.renderOrder = 21;
    this.group.add(this.bhGlow);

    this.glowMat = createGlowMat(0.8, 2.0, THREE.BackSide);
    this.glowOrb = new THREE.Mesh(glowGeo, this.glowMat);
    this.glowOrb.renderOrder = 5;
    this.group.add(this.glowOrb);

    this._colorLight = new THREE.Color(0x9933ff);
    this._colorDark = new THREE.Color(0x330077);
  }

  update(t, coreIntro, audioIntensity, musicEnable, coreLight) {
    const cfg = window.wallpaperConfig || {};
    const glowSize = cfg.glowSize ?? 1.0;
    const glowIntensity = cfg.glowIntensity ?? 1.0;
    const ptIntensity = cfg.pointLightIntensity ?? 5.0;

    let targetBH = 1.0;
    if (musicEnable) {
      coreLight.intensity = (0.5 + audioIntensity * 3) * coreIntro * ptIntensity;
      this.glowOrb.scale.setScalar((4.5 + audioIntensity * 2.5) * (0.2 + 0.8 * coreIntro) * glowSize);
      this.bhGlow.scale.setScalar((0.55 + audioIntensity * 0.45) * (0.5 + 0.5 * coreIntro) * glowSize);
      targetBH = Math.max(0.5, 1.0 - audioIntensity * 1.1);
    } else {
      coreLight.intensity = (0.8 + Math.sin(t * 2) * 0.4) * coreIntro * ptIntensity;
      this.glowOrb.scale.setScalar((5.0 + Math.sin(t * 3) * 0.6) * (0.2 + 0.8 * coreIntro) * glowSize);
      this.bhGlow.scale.setScalar(0.7 * glowSize);
      targetBH = 1.0 + Math.sin(t * 1.5) * 0.05;
    }

    const lerpFactor = targetBH < this._smoothBH ? 0.35 : 0.15;
    this._smoothBH += (targetBH - this._smoothBH) * lerpFactor;
    this.blackHole.scale.setScalar(this._smoothBH);

    const cRatio = Math.max(0, Math.min(1, (this._smoothBH - 0.5) / 0.5));
    const finalColor = new THREE.Color().lerpColors(this._colorDark, this._colorLight, cRatio);
    
    this.glowMat.uniforms.uColor.value.copy(finalColor);
    this.glowMat.uniforms.uOpacity.value = (0.5 + (1.0 - cRatio) * 0.35) * glowIntensity * coreIntro;
    this.bhGlowMat.uniforms.uColor.value.copy(finalColor);
    this.bhGlowMat.uniforms.uOpacity.value = 0.7 * glowIntensity * coreIntro;
  }
}

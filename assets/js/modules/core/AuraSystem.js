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
    this.blackHole.renderOrder = 50;
    this.group.add(this.blackHole);

    const glowGeo = new THREE.SphereGeometry(1, 32, 32);
    const createGlowMat = (opacity, power, isAura) => new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0x9933ff) },
        uOpacity: { value: opacity },
        uPower: { value: power }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewVec;
        varying vec3 vLocalPos;
        void main() {
          vLocalPos = position;
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
        varying vec3 vLocalPos;
        void main() {
          float dotNV = abs(dot(vNormal, vViewVec));
          float glow = pow(dotNV, uPower);
          float softEdge = smoothstep(0.0, 0.15, dotNV);
          float zFade = 1.0;
          if (vLocalPos.z > -0.2) {
            zFade = smoothstep(0.2, -0.2, vLocalPos.z);
          }
          gl_FragColor = vec4(uColor, glow * uOpacity * softEdge * zFade);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.bhGlowMat = createGlowMat(1.0, 2.5, false);
    this.bhGlow = new THREE.Mesh(glowGeo, this.bhGlowMat);
    this.bhGlow.scale.setScalar(0.75);
    this.bhGlow.renderOrder = 51;
    this.group.add(this.bhGlow);

    this.glowMat = createGlowMat(0.9, 1.2, true);
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
      this.glowOrb.scale.setScalar((8.0 + audioIntensity * 4.0) * (0.2 + 0.8 * coreIntro) * glowSize);
      this.bhGlow.scale.setScalar((0.65 + audioIntensity * 0.35) * (0.5 + 0.5 * coreIntro) * glowSize);
      targetBH = Math.max(0.5, 1.0 - audioIntensity * 1.1);
    } else {
      coreLight.intensity = (0.8 + Math.sin(t * 2) * 0.4) * coreIntro * ptIntensity;
      this.glowOrb.scale.setScalar((9.0 + Math.sin(t * 3) * 1.0) * (0.2 + 0.8 * coreIntro) * glowSize);
      this.bhGlow.scale.setScalar(0.75 * glowSize);
      targetBH = 1.0 + Math.sin(t * 1.5) * 0.05;
    }

    const lerpFactor = targetBH < this._smoothBH ? 0.35 : 0.15;
    this._smoothBH += (targetBH - this._smoothBH) * lerpFactor;
    this.blackHole.scale.setScalar(this._smoothBH);

    const cRatio = Math.max(0, Math.min(1, (this._smoothBH - 0.5) / 0.5));
    const finalColor = new THREE.Color().lerpColors(this._colorDark, this._colorLight, cRatio);
    
    this.glowMat.uniforms.uColor.value.copy(finalColor);
    this.glowMat.uniforms.uOpacity.value = (0.7 + (1.0 - cRatio) * 0.3) * glowIntensity * coreIntro;
    this.bhGlowMat.uniforms.uColor.value.copy(finalColor);
    this.bhGlowMat.uniforms.uOpacity.value = 0.9 * glowIntensity * coreIntro;
  }
}

(function () {
  'use strict';

  function boot() {
    if (typeof THREE === 'undefined') { setTimeout(boot, 50); return; }
    init();
  }

  function smoothstep(x) {
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  }

  function init() {
    const cfg = window.wallpaperConfig || {};

    const canvas = document.createElement('canvas');
    canvas.id = 'threejs-canvas';
    Object.assign(canvas.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'auto', zIndex: '2', opacity: '0',
      transition: 'opacity 2s ease', cursor: 'grab', background: 'transparent',
    });
    document.body.insertBefore(canvas, document.body.firstChild);
    requestAnimationFrame(() => { canvas.style.opacity = '1'; });

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = cfg.exposure ?? 1.0;
    renderer.outputEncoding = THREE.sRGBEncoding;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    function updateCamera() {
      const cfg = window.wallpaperConfig || {};
      camera.aspect = window.innerWidth / window.innerHeight;
      const cameraX = window.innerWidth <= 768 ? 0 : (cfg.offsetX ?? -4.5);
      camera.position.x = cameraX;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    updateCamera();
    camera.position.set(camera.position.x, cfg.offsetY ?? 2, cfg.zoom ?? 18);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    scene.add(new THREE.AmbientLight(0x150b24, 0.6));

    const coreLight = new THREE.PointLight(0xcc00ff, 5, 25);
    coreLight.castShadow = true;
    coreLight.shadow.bias = -0.001;
    const staticGroup = new THREE.Group();
    scene.add(staticGroup);
    staticGroup.add(coreLight);

    const dirLight = new THREE.DirectionalLight(0xdab3ff, 2.2);
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    dirLight.shadow.bias = -0.001;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x4400aa, 1.5);
    fillLight.position.set(-15, -10, -15);
    scene.add(fillLight);

    const coreGroup = new THREE.Group();
    staticGroup.add(coreGroup);
    coreGroup.rotation.x = 0.15;
    coreGroup.rotation.y = -0.25;

    const CORE_RADIUS = 1.4;
    const coreGeo = new THREE.IcosahedronGeometry(CORE_RADIUS, 5);
    const basePos = new Float32Array(coreGeo.attributes.position.array);
    const N = basePos.length / 3;
    const thetaArr = new Float32Array(N);
    const phiArr = new Float32Array(N);
    const randoms = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const x = basePos[i*3] / CORE_RADIUS, y = basePos[i*3+1] / CORE_RADIUS, z = basePos[i*3+2] / CORE_RADIUS;
      thetaArr[i] = Math.atan2(y, x);
      phiArr[i] = Math.acos(Math.max(-1, Math.min(1, z)));
      randoms[i] = Math.random();
    }
    coreGeo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    function getGlowTex(color = 'rgba(170,0,255,1)', r = 128) {
      const c = document.createElement('canvas'); c.width = c.height = r * 2;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, color); g.addColorStop(0.2, color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, r * 2, r * 2);
      return new THREE.CanvasTexture(c);
    }

    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xaa00ff, emissive: 0x4400aa, emissiveIntensity: 1.0,
      wireframe: true, transparent: true, opacity: 0.25,
      blending: THREE.AdditiveBlending, depthWrite: false
    });

    const filamentGroup = new THREE.Group();
    coreGroup.add(filamentGroup);
    const filaments = [];
    const filamentCount = 20;
    for (let i = 0; i < filamentCount; i++) {
      const segs = 48;
      const pts = [];
      for (let j = 0; j <= segs; j++) pts.push(new THREE.Vector3());
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? 0xff0088 : 0xaa00ff,
        transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false
      });
      const line = new THREE.Line(geo, mat);
      line.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      filamentGroup.add(line);
      filaments.push({
        line,
        r: 0.4 + Math.random() * 0.5,
        phase: Math.random() * 10,
        speed: 0.8 + Math.random() * 1.5,
        noiseScale: 0.15 + Math.random() * 0.25
      });
    }

    const corePointsMat = new THREE.PointsMaterial({
      size: 0.12, color: 0xdd88ff, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, map: getGlowTex('rgba(200,100,255,1)', 16), depthWrite: false
    });
    corePointsMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader = `
        attribute float aRandom;
        varying float vRandom;
        uniform float uTime;
        ${shader.vertexShader}
      `.replace(
        `gl_PointSize = size;`,
        `float t = uTime * (2.0 + aRandom * 3.0) + aRandom * 100.0;
         float twinkle = 0.8 + 0.2 * sin(t);
         gl_PointSize = size * twinkle;
         vRandom = aRandom;`
      );
      shader.fragmentShader = `
        varying float vRandom;
        uniform float uTime;
        ${shader.fragmentShader}
      `.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `float t = uTime * (2.0 + vRandom * 3.0) + vRandom * 100.0;
         float twinkle = 0.4 + 0.6 * pow(0.5 + 0.5 * sin(t), 2.0);
         vec4 diffuseColor = vec4( diffuse, opacity * twinkle );`
      );
      corePointsMat.userData.shader = shader;
    };
    const corePoints = new THREE.Points(coreGeo, corePointsMat);
    const coreMeshWire = new THREE.Mesh(coreGeo, coreMat);
    coreMeshWire.castShadow = true;

    coreGroup.add(coreMeshWire);
    coreGroup.add(corePoints);
    coreGroup.userData.smoothM = 0;

    const bhGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const blackHole = new THREE.Mesh(bhGeo, bhMat);
    coreGroup.add(blackHole);

    const flareGroup = new THREE.Group();
    coreGroup.add(flareGroup);
    const flares = [];
    const maxFlares = 4;

    function createFlare() {
      const segs = 32;
      const pts = [];
      for (let i = 0; i <= segs; i++) pts.push(new THREE.Vector3());
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: 0xff33aa, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const line = new THREE.Line(geo, mat);
      flareGroup.add(line);
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const start = new THREE.Vector3().setFromSphericalCoords(1.4, theta, phi);
      const end = new THREE.Vector3().setFromSphericalCoords(1.4, theta + (Math.random()-0.5)*0.5, phi + (Math.random()-0.5)*0.5);
      const mid = start.clone().lerp(end, 0.5).normalize().multiplyScalar(1.4 + 0.5 + Math.random() * 0.8);
      return { line, start, mid, end, life: 0, speed: 0.005 + Math.random() * 0.01 };
    }

    for (let i = 0; i < maxFlares; i++) flares.push(createFlare());

    const bhGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getGlowTex('rgba(200,150,255,0.9)', 64),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
    }));
    bhGlow.scale.setScalar(1.2);
    coreGroup.add(bhGlow);

    const glowOrb = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getGlowTex('rgba(180,50,255,0.8)', 128),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
    }));
    glowOrb.scale.setScalar(6.5);
    coreGroup.add(glowOrb);

    function createFragmentedRing(innerR, outerR, depth, fragmentsCount, rotSpeed, axis, hiddenIndices = null) {
      const group = new THREE.Group();
      const fragments = [];

      const stoneMat = new THREE.MeshPhysicalMaterial({
        color: 0x1a0b3a, emissive: 0x110522, emissiveIntensity: 0.4,
        metalness: 0.9, roughness: 0.1, clearcoat: 1.0, flatShading: true
      });
      const bevelMat = new THREE.MeshPhysicalMaterial({
        color: 0x140528, emissive: 0x0a0011, emissiveIntensity: 0.3,
        metalness: 0.8, roughness: 0.3, clearcoat: 0.5, flatShading: true
      });
      const materials = [stoneMat, bevelMat];
      const gap = 0.3;
      const totalArc = Math.PI * 2;
      const arcLength = (totalArc / fragmentsCount) - gap;

      let skipArr = hiddenIndices;
      if (!skipArr) {
        skipArr = [];
        const maxSkip = fragmentsCount <= 3 ? 1 : 2;
        const numSkip = 1 + Math.floor(Math.random() * maxSkip);
        for (let i = 0; i < numSkip; i++) {
          let idx;
          do { idx = Math.floor(Math.random() * fragmentsCount); } while (skipArr.includes(idx));
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
          steps: 1, bevelSize: 0.05, bevelThickness: 0.05, curveSegments: 48
        };
        const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geo.translate(0, 0, -depth / 2);
        const mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        fragments.push({
          mesh,
          axis: new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize(),
          speed: 0.01 + Math.random() * 0.02
        });
      }
      return { obj: group, axis: axis.normalize(), speed: rotSpeed, fragments };
    }

    function getSkipIndices(count, probs) {
      const r = Math.random() * 100;
      let cumulative = 0;
      let numToSkip = 0;
      for (const p of probs) {
        cumulative += p.prob;
        if (r <= cumulative) { numToSkip = p.skip; break; }
      }
      const indices = [];
      const available = Array.from({ length: count }, (_, i) => i);
      for (let i = 0; i < numToSkip; i++) {
        if (available.length === 0) break;
        const idx = Math.floor(Math.random() * available.length);
        indices.push(available.splice(idx, 1)[0]);
      }
      return indices;
    }

    let rings = [];
    function setupRings() {
      rings.forEach(r => mainGroup.remove(r.obj));
      const amount = window.wallpaperConfig?.ringAmount ?? 4;
      const ringConfigs = [
        { r1: 3.0, r2: 3.6, d: 0.6, s: 0.007, a: new THREE.Vector3(1, 0.5, 0.2), skip: [{skip:1,prob:20},{skip:0,prob:80}] },
        { r1: 4.2, r2: 5.0, d: 0.8, s: -0.004, a: new THREE.Vector3(-0.5, 1, 0.5), skip: [{skip:1,prob:30},{skip:0,prob:70}] },
        { r1: 5.6, r2: 6.6, d: 1.2, s: 0.003, a: new THREE.Vector3(0.2, -0.5, 1), skip: [{skip:1,prob:30},{skip:2,prob:20},{skip:0,prob:50}] },
        { r1: 7.2, r2: 8.4, d: 1.4, s: -0.002, a: new THREE.Vector3(0.5, 0.8, -0.3), skip: [{skip:1,prob:30},{skip:2,prob:20},{skip:3,prob:10},{skip:0,prob:40}] },
        { r1: 8.8, r2: 10.2, d: 1.6, s: 0.001, a: new THREE.Vector3(0.1, 1, 0.4), skip: [{skip:1,prob:30},{skip:2,prob:10},{skip:0,prob:60}] },
        { r1: 10.6, r2: 12.2, d: 1.8, s: -0.005, a: new THREE.Vector3(0.8, 0.2, 1), skip: [{skip:1,prob:30},{skip:2,prob:10},{skip:0,prob:60}] },
        { r1: 12.6, r2: 14.4, d: 2.0, s: 0.006, a: new THREE.Vector3(-1, -0.5, 0.3), skip: [{skip:1,prob:30},{skip:2,prob:10},{skip:0,prob:60}] },
        { r1: 14.8, r2: 16.8, d: 2.2, s: -0.003, a: new THREE.Vector3(0.3, -1, 0.6), skip: [{skip:1,prob:30},{skip:2,prob:10},{skip:0,prob:60}] }
      ];
      rings = [];
      for (let i = 0; i < amount; i++) {
        const c = ringConfigs[i % ringConfigs.length];
        const r = createFragmentedRing(c.r1, c.r2, c.d, 3 + (i % 4), c.s, c.a, getSkipIndices(3 + (i % 4), c.skip));
        rings.push(r);
        mainGroup.add(r.obj);
      }
    }
    setupRings();

    let debrisGroup = new THREE.Group();
    mainGroup.add(debrisGroup);
    function setupDebris() {
      if (debrisGroup) mainGroup.remove(debrisGroup);
      debrisGroup = new THREE.Group();
      mainGroup.add(debrisGroup);
      const amount = window.wallpaperConfig?.debrisAmount ?? 30;
      const scale = window.wallpaperConfig?.debrisSize ?? 1.0;
      const debrisMat = new THREE.MeshPhysicalMaterial({
        color: 0x110522, roughness: 0.2, metalness: 0.9, clearcoat: 0.8, flatShading: true
      });
      for (let i = 0; i < amount; i++) {
        const size = (0.10 + Math.random()*0.30) * scale;
        const randGeo = Math.floor(Math.random() * 5);
        let geo;
        switch(randGeo) {
          case 0: geo = new THREE.TetrahedronGeometry(size, 0); break;
          case 1: geo = new THREE.BoxGeometry(size*1.3, size*1.3, size*1.3); break;
          case 2: geo = new THREE.OctahedronGeometry(size, 0); break;
          case 3: geo = new THREE.DodecahedronGeometry(size, 0); break;
          default: geo = new THREE.IcosahedronGeometry(size, 0); break;
        }
        const rock = new THREE.Mesh(geo, debrisMat);
        rock.castShadow = true; rock.receiveShadow = true;
        const r = 7 + Math.random() * 8;
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        rock.position.set(r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th), r*Math.cos(ph));
        rock.userData.rotAxis = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
        rock.userData.rotSpeed = 0.01 + Math.random() * 0.02;
        rock.userData.orbitSpeed = (Math.random() - 0.5) * 0.005;
        debrisGroup.add(rock);
      }
    }
    setupDebris();

    let pSystem;
    function setupParticles() {
      if (pSystem) scene.remove(pSystem);
      const amount = window.wallpaperConfig?.particleAmount ?? 5500;
      const size = window.wallpaperConfig?.particleSize ?? 0.08;
      const pGeo = new THREE.BufferGeometry();
      const pPos = new Float32Array(amount * 3);
      for (let i = 0; i < amount; i++) {
        const r = 2.0 + Math.pow(Math.random(), 1.5) * 20.0;
        const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1);
        pPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
        pPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        pPos[i*3+2] = r * Math.cos(phi);
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
      const pMat = new THREE.PointsMaterial({
        size: size, map: getGlowTex('rgba(190,100,255,1)', 16),
        transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false
      });
      pSystem = new THREE.Points(pGeo, pMat);
      scene.add(pSystem);
    }
    setupParticles();

    const rotQ = new THREE.Quaternion();
    const drag = { active: false, px: 0, py: 0 };
    let velocity = { x: 0, y: 0 };
    let manualZoom = null; 
    let autoRotate = true;
    let autoRotateTimeout = null;
    let introProgress = 0;
    let t = 0;
    const _q = new THREE.Quaternion();

    canvas.addEventListener('mousedown', e => {
      const cfg = window.wallpaperConfig || {};
      if (!(cfg.mouseDrag ?? true)) return;
      drag.active = true; drag.px = e.clientX; drag.py = e.clientY;
      canvas.style.cursor = 'grabbing';
      autoRotate = false; clearTimeout(autoRotateTimeout);
    });
    window.addEventListener('mouseup', () => {
      drag.active = false; canvas.style.cursor = 'grab';
      autoRotateTimeout = setTimeout(() => autoRotate = true, 3000);
    });
    window.addEventListener('mousemove', e => {
      const cfg = window.wallpaperConfig || {};
      const canDrag = cfg.mouseDrag ?? true;
      const follow = cfg.mouseFollow ?? false;
      const weight = cfg.mouseWeight ?? 50;
      const sens = 0.01 * (1.1 - weight / 100);

      const dx = e.clientX - (drag.px || e.clientX), dy = e.clientY - (drag.py || e.clientY);
      
      if ((drag.active && canDrag) || follow) {
        velocity.x = dx; velocity.y = dy;
        const speed = Math.sqrt(dx*dx+dy*dy);
        
        if (drag.active && canDrag) {
          if (speed > 0) rotQ.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dy, dx, 0).normalize(), speed * sens));
        }
        
        if (follow) {
          autoRotate = false; clearTimeout(autoRotateTimeout);
          autoRotateTimeout = setTimeout(() => autoRotate = true, 3000);
        }
      }
      drag.px = e.clientX; drag.py = e.clientY;
    });
    window.addEventListener('wheel', e => {
      if (manualZoom === null) manualZoom = window.wallpaperConfig?.zoom ?? 18;
      manualZoom = Math.max(5, Math.min(50, manualZoom + e.deltaY*0.015));
    }, {passive:true});

    let lastT = null;
    let initialPinchDist = null;

    canvas.addEventListener('touchstart', e => {
      const cfg = window.wallpaperConfig || {};
      if (e.touches.length === 2) {
        initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        drag.active = false;
      } else if (cfg.mouseDrag ?? true) {
        lastT = e.touches[0];
        drag.active = true;
      }
      autoRotate = false;
      clearTimeout(autoRotateTimeout);
    }, { passive: true });

    canvas.addEventListener('touchmove', e => {
      const cfg = window.wallpaperConfig || {};
      const weight = cfg.mouseWeight ?? 50;
      const sens = 0.01 * (1.1 - weight / 100);

      if (e.touches.length === 2 && initialPinchDist !== null) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const delta = dist - initialPinchDist;
        if (manualZoom === null) manualZoom = cfg.zoom ?? 18;
        manualZoom = Math.max(5, Math.min(50, manualZoom - delta * 0.05));
        initialPinchDist = dist;
      } else if (e.touches.length === 1 && lastT && (cfg.mouseDrag ?? true)) {
        const t = e.touches[0];
        const dx = t.clientX - lastT.clientX, dy = t.clientY - lastT.clientY;
        velocity.x = dx; velocity.y = dy;
        const speed = Math.sqrt(dx*dx+dy*dy);
        if (speed > 0) rotQ.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dy, dx, 0).normalize(), speed * sens));
        lastT = t;
      }
    }, { passive: true });

    canvas.addEventListener('touchend', e => {
      if (e.touches.length < 2) initialPinchDist = null;
      if (e.touches.length === 0) {
        drag.active = false;
        lastT = null;
        autoRotateTimeout = setTimeout(() => autoRotate = true, 3000);
      }
    });

    function animate() {
      window._threejsRafId = requestAnimationFrame(animate);
      t += 0.01;
      const cfg = window.wallpaperConfig || {};
      const speedProp = cfg.speed ?? 1.0;
      const brightnessProp = cfg.exposure ?? 1.0;
      const targetZoom = manualZoom !== null ? manualZoom : (cfg.zoom ?? 18);

      camera.position.z += (targetZoom - camera.position.z) * 0.05;
      camera.position.y += ((cfg.offsetY ?? 2.0) - camera.position.y) * 0.05;
      camera.updateProjectionMatrix();

      const weight = cfg.mouseWeight ?? 50;
      const sens = 0.012 * (1.05 - weight / 100);
      const damp = 0.94 + (weight / 100) * 0.056;

      if (!drag.active) {
        const speed = Math.sqrt(velocity.x*velocity.x + velocity.y*velocity.y);
        if (speed > 0.08) {
          rotQ.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(velocity.y, velocity.x, 0).normalize(), speed * sens));
          velocity.x *= damp; velocity.y *= damp;
        }
      } else {
        velocity.x *= 0.5; velocity.y *= 0.5;
      }

      if (autoRotate) {
        _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.0015 * speedProp);
        rotQ.premultiply(_q);
      }
      rotQ.normalize();
      mainGroup.quaternion.copy(rotQ);
      window._threejsRotQ = rotQ;

      introProgress = Math.min(1, introProgress + 0.004);
      const ringIntro = smoothstep(Math.min(1, introProgress / 0.75));
      const coreIntro = smoothstep(Math.max(0, (introProgress - 0.7) / 0.3));
      const speedBoost = 1.0 + Math.pow(1.0 - ringIntro, 2) * 15.0;

      if (!coreGroup.userData.nextPickTime || t > coreGroup.userData.nextPickTime) {
        const r = Math.random();
        if (r < 0.25) coreGroup.userData.targetM = 0;
        else if (r < 0.50) coreGroup.userData.targetM = 1;
        else if (r < 0.75) coreGroup.userData.targetM = 2;
        else coreGroup.userData.targetM = 3;
        coreGroup.userData.nextPickTime = t + 5 + Math.random() * 5;
      }
      coreGroup.userData.smoothM += (coreGroup.userData.targetM - coreGroup.userData.smoothM) * 0.04;
      const morphCycle = coreGroup.userData.smoothM;

      const positions = coreGeo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const idx = i * 3, bx = basePos[idx], by = basePos[idx+1], bz = basePos[idx+2];
        const theta = thetaArr[i], phi = phiArr[i];
        const tectonic = Math.sin(6 * theta) * Math.cos(6 * phi);
        const r1 = 1.0 + (tectonic > 0.3 ? 0.15 : (tectonic < -0.3 ? -0.1 : 0));
        const tx1 = bx * r1, ty1 = by * r1, tz1 = bz * r1;
        const r2 = 1.0 + 0.25 * Math.sin(3 * theta - t * 1.5) + 0.2 * Math.cos(4 * phi + t);
        const tx2 = bx * r2, ty2 = by * r2, tz2 = bz * r2;
        const r3 = 1.0 + 0.12 * Math.sin(8 * theta + t * 2) * Math.cos(t * 1.2) + 0.05 * Math.sin(phi * 6);
        const tx3 = bx * r3, ty3 = by * r3, tz3 = bz * r3;
        let tx, ty, tz;
        if (morphCycle < 1) {
          const lerp = smoothstep(morphCycle);
          tx = bx + (tx1 - bx) * lerp; ty = by + (ty1 - by) * lerp; tz = bz + (tz1 - bz) * lerp;
        } else if (morphCycle < 2) {
          const lerp = smoothstep(morphCycle - 1);
          tx = tx1 + (tx2 - tx1) * lerp; ty = ty1 + (ty2 - ty1) * lerp; tz = tz1 + (tz2 - tz1) * lerp;
        } else if (morphCycle < 3) {
          const lerp = smoothstep(morphCycle - 2);
          tx = tx2 + (tx3 - tx2) * lerp; ty = ty2 + (ty3 - ty2) * lerp; tz = tz2 + (tz3 - tz2) * lerp;
        } else {
          const lerp = smoothstep(morphCycle - 3);
          tx = tx3 + (bx - tx3) * lerp; ty = ty3 + (by - ty3) * lerp; tz = tz3 + (bz - tz3) * lerp;
        }
        positions[idx]   = bx + (tx - bx) * coreIntro;
        positions[idx+1] = by + (ty - by) * coreIntro;
        positions[idx+2] = bz + (tz - bz) * coreIntro;
      }
      coreGeo.attributes.position.needsUpdate = true;
      coreGeo.computeVertexNormals();

      const coreRotSpeed = 0.01 * (0.1 + 0.3 * coreIntro) * (0.5 + 0.5 * speedProp);
      coreGroup.rotation.y += coreRotSpeed;
      coreGroup.rotation.z = Math.sin(t * 0.5) * 0.2 * coreIntro;
      coreGroup.scale.setScalar(0.25 + 0.75 * ringIntro);

      flares.forEach(f => {
        f.life += f.speed * coreIntro;
        if (f.life > 1) {
          f.life = 0;
          const phi = Math.random() * Math.PI * 2;
          const theta = Math.random() * Math.PI;
          f.start.setFromSphericalCoords(1.4, theta, phi);
          f.end.setFromSphericalCoords(1.4, theta + (Math.random()-0.5)*0.6, phi + (Math.random()-0.5)*0.6);
          f.mid.copy(f.start).lerp(f.end, 0.5).normalize().multiplyScalar(1.4 + 0.4 + Math.random() * 0.9);
        }
        const pos = f.line.geometry.attributes.position.array;
        const segs = 32;
        const alpha = Math.sin(f.life * Math.PI);
        for (let i = 0; i <= segs; i++) {
          const t_lerp = i / segs;
          const p = new THREE.Vector3();
          p.x = (1-t_lerp)*(1-t_lerp)*f.start.x + 2*(1-t_lerp)*t_lerp*f.mid.x + t_lerp*t_lerp*f.end.x;
          p.y = (1-t_lerp)*(1-t_lerp)*f.start.y + 2*(1-t_lerp)*t_lerp*f.mid.y + t_lerp*t_lerp*f.end.y;
          p.z = (1-t_lerp)*(1-t_lerp)*f.start.z + 2*(1-t_lerp)*t_lerp*f.mid.z + t_lerp*t_lerp*f.end.z;
          const noise = Math.sin(t_lerp * 10 + t * 5) * 0.05 * alpha;
          p.addScaledVector(p.clone().normalize(), noise);
          pos[i*3] = p.x; pos[i*3+1] = p.y; pos[i*3+2] = p.z;
        }
        f.line.geometry.attributes.position.needsUpdate = true;
        f.line.material.opacity = alpha * 0.9 * coreIntro;
        f.line.material.color.setHSL(0.85 + Math.sin(t + f.life)*0.05, 1, 0.7);
      });

      coreLight.intensity = (4 + Math.sin(t * 2) * 2) * coreIntro;
      glowOrb.scale.setScalar((6.5 + Math.sin(t * 3) * 0.8) * (0.2 + 0.8 * coreIntro));

      filaments.forEach((f) => {
        const pos = f.line.geometry.attributes.position.array;
        const segs = 64;
        const time = t * f.speed;
        for (let j = 0; j <= segs; j++) {
          const ang = (j/segs) * Math.PI * 2;
          const n = Math.sin(ang * 3 + time + f.phase) * f.noiseScale;
          const r = f.r * (1 + n * coreIntro);
          pos[j*3] = Math.cos(ang) * r;
          pos[j*3+1] = Math.sin(ang) * r;
          pos[j*3+2] = Math.sin(time * 0.5 + ang * 2) * f.noiseScale * coreIntro;
        }
        f.line.geometry.attributes.position.needsUpdate = true;
        f.line.rotation.y += 0.01 * coreIntro;
        f.line.rotation.z += 0.005 * coreIntro;
        f.line.material.opacity = (0.2 + Math.sin(t + f.phase) * 0.1) * coreIntro;
      });

      rings.forEach((r, i) => {
        const ringSpeed = r.speed * (0.2 + 0.8 * ringIntro) * speedBoost * speedProp;
        r.obj.rotateOnAxis(r.axis, ringSpeed);
        r.obj.rotateX(0.002 * speedProp * ringIntro);
        r.obj.rotateZ(0.001 * speedProp * ringIntro);
        r.obj.scale.setScalar(ringIntro);
      });

      debrisGroup.children.forEach((rock, i) => {
        rock.rotateOnAxis(rock.userData.rotAxis, rock.userData.rotSpeed * speedProp);
        rock.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rock.userData.orbitSpeed * speedProp);
        rock.position.y += Math.sin(t * 2 + i) * 0.005;
      });

      pSystem.rotation.y = t * 0.05 * speedProp;
      pSystem.rotation.z = Math.sin(t * 0.1) * 0.1;
      pSystem.material.opacity = 0.4 + Math.sin(t * 4) * 0.2;

      if (corePointsMat.userData.shader) corePointsMat.userData.shader.uniforms.uTime.value = t;
      renderer.toneMappingExposure = brightnessProp;
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', updateCamera);
    window.addEventListener('threejs-update', (e) => {
      if (e.detail.type === 'rings') setupRings();
      if (e.detail.type === 'particles') setupParticles();
      if (e.detail.type === 'particlesize') if (pSystem) pSystem.material.size = window.wallpaperConfig.particleSize;
      if (e.detail.type === 'debris' || e.detail.type === 'debrissize') setupDebris();
    });
  }

  boot();
})();

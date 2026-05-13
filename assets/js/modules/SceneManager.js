class SceneManager {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    this.initRenderer();
    this.initLights();
  }

  initRenderer() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.config.exposure ?? 1.0;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
  }

  initLights() {
    this.scene.add(new THREE.AmbientLight(0x150b24, 0.6));

    this.coreLight = new THREE.PointLight(0x8800ff, 5, 25);
    this.coreLight.castShadow = true;
    this.coreLight.shadow.bias = -0.001;
    
    this.staticGroup = new THREE.Group();
    this.scene.add(this.staticGroup);
    this.staticGroup.add(this.coreLight);

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
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x4400aa, 1.5);
    fillLight.position.set(-15, -10, -15);
    this.scene.add(fillLight);
  }

  updateCamera() {
    const cfg = window.wallpaperConfig || {};
    this.camera.aspect = window.innerWidth / window.innerHeight;
    const cameraX = window.innerWidth <= 768 ? 0 : (cfg.offsetX ?? -4.5);
    this.camera.position.x = cameraX;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

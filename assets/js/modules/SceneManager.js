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
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
  }

  initLights() {
    this.ambientLight = new THREE.AmbientLight(0x150b24, 0.6);
    this.scene.add(this.ambientLight);

    this.coreLight = new THREE.PointLight(0x8800ff, 5, 25);
    this.coreLight.castShadow = true;
    this.coreLight.shadow.mapSize.width = 2048;
    this.coreLight.shadow.mapSize.height = 2048;
    this.coreLight.shadow.camera.near = 0.1;
    this.coreLight.shadow.camera.far = 25;
    this.coreLight.shadow.bias = -0.0001;
    this.coreLight.shadow.normalBias = 0.05;
    this.coreLight.shadow.radius = 4;

    this.staticGroup = new THREE.Group();
    this.scene.add(this.staticGroup);
    this.staticGroup.add(this.coreLight);

    this.dirLight = new THREE.DirectionalLight(0xdab3ff, 2.2);
    this.dirLight.position.set(10, 20, 15);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 50;
    this.dirLight.shadow.camera.left = -15;
    this.dirLight.shadow.camera.right = 15;
    this.dirLight.shadow.camera.top = 15;
    this.dirLight.shadow.camera.bottom = -15;
    this.dirLight.shadow.bias = -0.001;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.scene.add(this.dirLight);

    this.fillLight = new THREE.DirectionalLight(0x4400aa, 1.5);
    this.fillLight.position.set(-15, -10, -15);
    this.scene.add(this.fillLight);
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

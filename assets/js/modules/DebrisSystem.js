class DebrisSystem {
  constructor(parentGroup) {
    this.parentGroup = parentGroup;
    this.group = new THREE.Group();
    this.parentGroup.add(this.group);
    this.setupDebris();
  }

  setupDebris() {
    this.parentGroup.remove(this.group);
    this.group = new THREE.Group();
    this.parentGroup.add(this.group);
    const amount = window.wallpaperConfig?.debrisAmount ?? 30;
    const scale = window.wallpaperConfig?.debrisSize ?? 1.0;
    const debrisMat = new THREE.MeshPhysicalMaterial({
      color: 0x110522, roughness: 0.2, metalness: 0.9, clearcoat: 0.8, flatShading: true,
    });
    for (let i = 0; i < amount; i++) {
      const size = (0.1 + Math.random() * 0.3) * scale;
      const randGeo = Math.floor(Math.random() * 5);
      let geo;
      switch (randGeo) {
        case 0: geo = new THREE.TetrahedronGeometry(size, 0); break;
        case 1: geo = new THREE.BoxGeometry(size * 1.3, size * 1.3, size * 1.3); break;
        case 2: geo = new THREE.OctahedronGeometry(size, 0); break;
        case 3: geo = new THREE.DodecahedronGeometry(size, 0); break;
        default: geo = new THREE.IcosahedronGeometry(size, 0); break;
      }
      const rock = new THREE.Mesh(geo, debrisMat);
      rock.castShadow = true; rock.receiveShadow = true;
      const r = 7 + Math.random() * 8;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      rock.position.set(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph));
      rock.userData.rotAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      rock.userData.rotSpeed = 0.01 + Math.random() * 0.02;
      rock.userData.orbitSpeed = (Math.random() - 0.5) * 0.005;
      this.group.add(rock);
    }
  }

  update(t, speedProp) {
    this.group.children.forEach((rock, i) => {
      rock.rotateOnAxis(rock.userData.rotAxis, rock.userData.rotSpeed * speedProp);
      rock.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rock.userData.orbitSpeed * speedProp);
      rock.position.y += Math.sin(t * 2 + i) * 0.005;
    });
  }
}

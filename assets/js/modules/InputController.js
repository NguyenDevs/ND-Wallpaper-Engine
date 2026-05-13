class InputController {
  constructor(canvas) {
    this.canvas = canvas;
    this.rotQ = new THREE.Quaternion();
    this.drag = { active: false, px: 0, py: 0 };
    this.velocity = { x: 0, y: 0 };
    this.manualZoom = null;
    this.autoRotate = true;
    this.autoRotateTimeout = null;
    this.lastT = null;
    this.initialPinchDist = null;

    this.initEvents();
  }

  initEvents() {
    this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    window.addEventListener('mousemove', e => this.onMouseMove(e));
    window.addEventListener('wheel', e => this.onWheel(e), { passive: true });
    this.canvas.addEventListener('touchstart', e => this.onTouchStart(e), { passive: true });
    this.canvas.addEventListener('touchmove', e => this.onTouchMove(e), { passive: true });
    this.canvas.addEventListener('touchend', e => this.onTouchEnd(e));
  }

  onMouseDown(e) {
    const cfg = window.wallpaperConfig || {};
    if (!(cfg.mouseDrag ?? true)) return;
    this.drag.active = true;
    this.drag.px = e.clientX;
    this.drag.py = e.clientY;
    this.canvas.style.cursor = 'grabbing';
    this.autoRotate = false;
    clearTimeout(this.autoRotateTimeout);
  }

  onMouseUp() {
    this.drag.active = false;
    this.canvas.style.cursor = 'grab';
    this.autoRotateTimeout = setTimeout(() => (this.autoRotate = true), 3000);
  }

  onMouseMove(e) {
    const cfg = window.wallpaperConfig || {};
    const canDrag = cfg.mouseDrag ?? true;
    const follow = cfg.mouseFollow ?? false;
    const weight = cfg.mouseWeight ?? 50;
    const sens = 0.01 * (1.1 - weight / 100);

    const dx = e.clientX - (this.drag.px || e.clientX);
    const dy = e.clientY - (this.drag.py || e.clientY);

    if ((this.drag.active && canDrag) || follow) {
      this.velocity.x = dx;
      this.velocity.y = dy;
      const speed = Math.sqrt(dx * dx + dy * dy);

      if (this.drag.active && canDrag) {
        if (speed > 0) {
          this.rotQ.premultiply(
            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dy, dx, 0).normalize(), speed * sens)
          );
        }
      }

      if (follow) {
        this.autoRotate = false;
        clearTimeout(this.autoRotateTimeout);
        this.autoRotateTimeout = setTimeout(() => (this.autoRotate = true), 3000);
      }
    }
    this.drag.px = e.clientX;
    this.drag.py = e.clientY;
  }

  onWheel(e) {
    if (this.manualZoom === null) this.manualZoom = window.wallpaperConfig?.zoom ?? 18;
    this.manualZoom = Math.max(5, Math.min(50, this.manualZoom + e.deltaY * 0.015));
  }

  onTouchStart(e) {
    const cfg = window.wallpaperConfig || {};
    if (e.touches.length === 2) {
      this.initialPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      this.drag.active = false;
    } else if (cfg.mouseDrag ?? true) {
      this.lastT = e.touches[0];
      this.drag.active = true;
    }
    this.autoRotate = false;
    clearTimeout(this.autoRotateTimeout);
  }

  onTouchMove(e) {
    const cfg = window.wallpaperConfig || {};
    const weight = cfg.mouseWeight ?? 50;
    const sens = 0.01 * (1.1 - weight / 100);

    if (e.touches.length === 2 && this.initialPinchDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - this.initialPinchDist;
      if (this.manualZoom === null) this.manualZoom = cfg.zoom ?? 18;
      this.manualZoom = Math.max(5, Math.min(50, this.manualZoom - delta * 0.05));
      this.initialPinchDist = dist;
    } else if (e.touches.length === 1 && this.lastT && (cfg.mouseDrag ?? true)) {
      const t = e.touches[0];
      const dx = t.clientX - this.lastT.clientX;
      const dy = t.clientY - this.lastT.clientY;
      this.velocity.x = dx;
      this.velocity.y = dy;
      const speed = Math.sqrt(dx * dx + dy * dy);
      if (speed > 0) {
        this.rotQ.premultiply(
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dy, dx, 0).normalize(), speed * sens)
        );
      }
      this.lastT = t;
    }
  }

  onTouchEnd(e) {
    if (e.touches.length < 2) this.initialPinchDist = null;
    if (e.touches.length === 0) {
      this.drag.active = false;
      this.lastT = null;
      this.autoRotateTimeout = setTimeout(() => (this.autoRotate = true), 3000);
    }
  }

  update(speedProp) {
    const cfg = window.wallpaperConfig || {};
    const weight = cfg.mouseWeight ?? 50;
    const sens = 0.012 * (1.05 - weight / 100);
    const damp = 0.96 + (weight / 100) * 0.038;

    if (!this.drag.active) {
      const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
      if (speed > 0.01) {
        this.rotQ.premultiply(
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(this.velocity.y, this.velocity.x, 0).normalize(), speed * sens)
        );
        this.velocity.x *= damp;
        this.velocity.y *= damp;
      }
    }

    if (this.autoRotate) {
      const _q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.0015 * speedProp);
      this.rotQ.premultiply(_q);
    }
    this.rotQ.normalize();
    return this.rotQ;
  }
}

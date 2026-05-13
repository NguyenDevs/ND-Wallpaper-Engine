class Utils {
  static smoothstep(x) {
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  }

  static getGlowTex(color = 'rgba(170,0,255,1)', r = 128) {
    const c = document.createElement('canvas');
    c.width = c.height = r * 2;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, color);
    g.addColorStop(0.2, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, r * 2, r * 2);
    return new THREE.CanvasTexture(c);
  }
}

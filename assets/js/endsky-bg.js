(function() {
    'use strict';

    const canvas = document.createElement('canvas');
    canvas.id = 'endsky-canvas';
    Object.assign(canvas.style, {
        position: 'fixed',
        inset: '0',
        width: '100%',
        height: '100%',
        zIndex: '0',
        pointerEvents: 'none',
        display: 'block'
    });
    document.body.insertBefore(canvas, document.body.firstChild);

    const gl = canvas.getContext('webgl');
    if (!gl) {
        console.warn('WebGL not supported for end sky background');
        return;
    }

    const vs = `
    attribute vec2 aPos;
    void main() {
        gl_Position = vec4(aPos, 0.0, 1.0);
    }
    `;

    const fs = `
    precision highp float;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform mat3 uRot;
    uniform float uZoom;
    uniform float uExposure;
    uniform float uHoleSize;
    uniform int uIterations;

    #define TAU 6.28318530718

    float Lift(float x, float amount) {
        return (1.0 + amount) * x / (amount * x + 1.0);
    }

    mat2 Rotate(float angle) {
        float s = sin(angle), c = cos(angle);
        return mat2(c, -s, s, c);
    }

    vec3 GetEndSkyColor(vec3 viewDir) {
        vec2 coord = viewDir.xz / (1.0 + abs(viewDir.y)) * uHoleSize;
        vec3 pattern = vec3(0.0);
        float amplitude = 1.0;
        float frequency = 1.0;
        for (int i = 0; i < 32; i++) {
            if (i >= uIterations) break;
            vec2 direction = vec2(0.707106782) * Rotate(float(i) * 4.3333);
            float k = TAU / (20.0 / frequency);
            float a = amplitude / k;
            vec2 dir = direction;
            float f = k * (dot(dir, coord.xy) - Lift(k, 1.6) * uTime * 0.31321);
            vec3 layer;
            layer.xz = dir.xy * (a * cos(f)) / a;
            layer.y = sin(f);
            pattern += layer.y * 0.5 + 0.5;
            coord -= layer.xz * 0.36;
            amplitude *= 0.99;
            frequency *= 1.2;
        }
        pattern = clamp(pattern * 0.05, 0.0, 1.0);
        pattern = pattern * pattern * exp((pow(max(1.3 * pattern - 0.3, 0.0), vec3(2.0)) - 1.0) * (1.0 - vec3(0.7686, 0.6275, 1.0) * 0.5) * 13.0) * 60.0;
        return pattern;
    }

    vec3 LinearTosRGB(vec3 x) {
        vec3 sRGBLo = x * 12.92;
        vec3 sRGBHi = pow(abs(x), vec3(1.0 / 2.4)) * 1.055 - 0.055;
        return mix(sRGBHi, sRGBLo, step(x, vec3(0.0031308)));
    }

    vec3 TechTonemap(vec3 color) {
        vec3 a = color * min(vec3(1.0), 1.0 - exp(-1.0 / 0.038 * color));
        a = mix(a, color, color * color);
        return a / (a + 0.6);
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / uResolution * 2.0 - 1.0;
        uv.x *= uResolution.x / uResolution.y;
        vec3 viewDir = normalize(uRot * vec3(uv, uZoom));
        vec3 color = GetEndSkyColor(viewDir);
        color = TechTonemap(color * uExposure);
        color = LinearTosRGB(color);
        gl_FragColor = vec4(color, 1.0);
    }
    `;

    function createShader(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(s));
        }
        return s;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, createShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, createShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uResolution = gl.getUniformLocation(prog, 'uResolution');
    const uRot = gl.getUniformLocation(prog, 'uRot');
    const uZoom = gl.getUniformLocation(prog, 'uZoom');
    const uExposure = gl.getUniformLocation(prog, 'uExposure');
    const uHoleLoc = gl.getUniformLocation(prog, 'uHoleSize');
    const uIterLoc = gl.getUniformLocation(prog, 'uIterations');

    let lastSrcQ = null;
    let accumulatedQ = { x: 0, y: 0, z: 0, w: 1 };
    let targetQ = { x: 0, y: 0, z: 0, w: 1 };
    let currentQ = { x: 0, y: 0, z: 0, w: 1 };
    
    const initialCfg = window.wallpaperConfig || {};
    let targetZoom = initialCfg.zoom ?? 22;
    let currentZoom = initialCfg.zoom ?? 22;

    function multiplyQ(a, b) {
        return {
            x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
            y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
            z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
            w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
        };
    }

    function lerpQ(curr, target, t) {
        let dot = curr.x * target.x + curr.y * target.y + curr.z * target.z + curr.w * target.w;
        let sign = dot < 0 ? -1 : 1;
        let x = curr.x + (target.x * sign - curr.x) * t;
        let y = curr.y + (target.y * sign - curr.y) * t;
        let z = curr.z + (target.z * sign - curr.z) * t;
        let w = curr.w + (target.w * sign - curr.w) * t;
        let len = Math.sqrt(x * x + y * y + z * z + w * w);
        if (len === 0) return curr;
        return { x: x / len, y: y / len, z: z / len, w: w / len };
    }

    function quatToBasis(q) {
        const xx = q.x * q.x, yy = q.y * q.y, zz = q.z * q.z;
        const xy = q.x * q.y, xz = q.x * q.z, yz = q.y * q.z;
        const xw = q.x * q.w, yw = q.y * q.w, zw = q.z * q.w;

        return {
            rx: 1 - 2 * (yy + zz),
            ry: 2 * (xy + zw),
            rz: 2 * (xz - yw),
            ux: 2 * (xy - zw),
            uy: 1 - 2 * (xx + zz),
            uz: 2 * (yz + xw),
            fx: 2 * (xz + yw),
            fy: 2 * (yz - xw),
            fz: 1 - 2 * (xx + yy)
        };
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    function scaleQ(q, s) {
        let h = Math.acos(Math.max(-1, Math.min(1, q.w)));
        if (Math.abs(h) < 1e-6) return { x: 0, y: 0, z: 0, w: 1 };
        let sn = Math.sin(h);
        if (Math.abs(sn) < 1e-6) return { x: 0, y: 0, z: 0, w: 1 };
        let r = Math.sin(h * s) / sn;
        return { x: q.x * r, y: q.y * r, z: q.z * r, w: Math.cos(h * s) };
    }

    function render() {
        window._endskyRafId = requestAnimationFrame(render);
        const cfg = window.wallpaperConfig || {};
        targetZoom = cfg.zoom ?? 22;

        const srcQ = window._threejsRotQ;
        if (srcQ) {
            if (!lastSrcQ) {
                lastSrcQ = { x: srcQ.x, y: srcQ.y, z: srcQ.z, w: srcQ.w };
            }
            let curQ = { x: srcQ.x, y: srcQ.y, z: srcQ.z, w: srcQ.w };
            let d = curQ.x * lastSrcQ.x + curQ.y * lastSrcQ.y + curQ.z * lastSrcQ.z + curQ.w * lastSrcQ.w;
            if (d < 0) { curQ.x = -curQ.x; curQ.y = -curQ.y; curQ.z = -curQ.z; curQ.w = -curQ.w; }
            
            let invL = { x: -lastSrcQ.x, y: -lastSrcQ.y, z: -lastSrcQ.z, w: lastSrcQ.w };
            let dq = multiplyQ(curQ, invL);
            let dqS = scaleQ(dq, 0.4);
            
            accumulatedQ = multiplyQ(dqS, accumulatedQ);
            let ln = Math.sqrt(accumulatedQ.x**2 + accumulatedQ.y**2 + accumulatedQ.z**2 + accumulatedQ.w**2);
            accumulatedQ.x /= ln; accumulatedQ.y /= ln; accumulatedQ.z /= ln; accumulatedQ.w /= ln;
            
            targetQ = accumulatedQ;
            lastSrcQ = curQ;
        }

        currentZoom += (targetZoom - currentZoom) * 0.05;
        currentQ = lerpQ(currentQ, targetQ, 0.05);
        const b = quatToBasis(currentQ);
        const zoomScale = 1.0 / (1.0 + (currentZoom - 22) * 0.01); 

        const time = performance.now() * 0.001 * (cfg.speed ?? 1.0);
        gl.uniform1f(uTime, time);
        gl.uniform2f(uResolution, canvas.width, canvas.height);
        gl.uniform1f(uZoom, zoomScale * (cfg.endskyZoom ?? 1.0));
        gl.uniform1f(uExposure, (cfg.exposure ?? 0.5) * 1.7);
        gl.uniform1f(uHoleLoc, cfg.endskyHoleSize ?? 80.0);
        gl.uniform1i(uIterLoc, cfg.endskyIterations ?? 16);
        gl.uniformMatrix3fv(uRot, false, new Float32Array([
            b.rx, b.ry, b.rz,
            b.ux, b.uy, b.uz,
            b.fx, b.fy, b.fz
        ]));

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    render();
})();

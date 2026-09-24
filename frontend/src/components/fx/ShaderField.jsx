import React, { useEffect, useRef } from 'react';

// Hand-written WebGL2 background: a domain-warped noise field drawn as
// topographic contour lines, like a terrain map a legged robot might plan
// over. The cursor presses a "footprint" into the terrain that the contours
// flow around, and a trailing ripple follows it. No libraries.

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;      // px, smoothed
uniform float uPress;     // 0..1 footprint strength
uniform float uScroll;    // 0..1 how far the hero has scrolled away
out vec4 o;

vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(dot(hash(i), f), dot(hash(i + vec2(1, 0)), f - vec2(1, 0)), u.x),
             mix(dot(hash(i + vec2(0, 1)), f - vec2(0, 1)), dot(hash(i + vec2(1, 1)), f - vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = r * p * 2.03; a *= 0.45; }
  return v;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float s = min(uRes.x, uRes.y);
  vec2 uv = (frag - 0.5 * uRes) / s;
  float t = uTime * 0.045;

  // Domain warping (Inigo Quilez style) for slow, organic flow.
  vec2 q = vec2(fbm(uv * 0.9 + vec2(0.0, t)), fbm(uv * 0.9 + vec2(5.2, -t)));
  vec2 r = vec2(fbm(uv * 0.9 + 1.8 * q + vec2(1.7, 9.2) + t * 0.6),
                fbm(uv * 0.9 + 1.8 * q + vec2(8.3, 2.8) - t * 0.4));
  float h = fbm(uv * 0.7 + 1.2 * r);

  // Cursor footprint: a smooth depression the contours wrap around.
  vec2 m = (uMouse - 0.5 * uRes) / s;
  float dm = length(uv - m);
  h -= uPress * 0.32 * exp(-dm * dm * 9.0);
  // Ripple ring expanding from the cursor.
  h += uPress * 0.02 * sin(dm * 30.0 - uTime * 2.4) * exp(-dm * 4.0);

  // Contour lines with constant screen-space width.
  float bands = 13.0;
  float v = h * bands;
  float w = fwidth(v);
  float d = min(fract(v), 1.0 - fract(v));                        // distance to nearest contour
  float d4 = min(fract(v / 4.0), 1.0 - fract(v / 4.0)) * 4.0;     // every 4th line is "major"
  float line = 1.0 - smoothstep(0.0, 1.2 * w, d);
  float major = 1.0 - smoothstep(0.0, 1.8 * w, d4);

  // Brand gradient: #0a84ff blue -> #00e0a0 green, shifted by height.
  vec3 blue = vec3(0.04, 0.52, 1.0);
  vec3 green = vec3(0.0, 0.88, 0.63);
  vec3 col = mix(blue, green, clamp(0.5 + h * 1.4 + uv.x * 0.25, 0.0, 1.0));

  float glow = exp(-dm * dm * 6.0) * uPress;
  float intensity = line * 0.26 + major * 0.42 + glow * 0.9 * line;

  // Vignette + fade toward the bottom so the hero melts into the page.
  vec2 n = frag / uRes;
  float vig = smoothstep(1.25, 0.2, length((n - vec2(0.5, 0.55)) * vec2(1.0, 1.3)));
  float fade = smoothstep(0.0, 0.35, n.y);
  // Quiet zone behind the headline so text stays crisp.
  float text = smoothstep(0.05, 0.42, length((n - vec2(0.5, 0.6)) * vec2(1.0, 1.7)));
  intensity *= vig * fade * mix(0.35, 1.0, text) * (1.0 - uScroll * 0.8);

  o = vec4(col * intensity, 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('ShaderField:', gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

const ShaderField = ({ className = '' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) { canvas?.classList.add('is-unsupported'); return undefined; }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { canvas.classList.add('is-unsupported'); return undefined; }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n) => gl.getUniformLocation(prog, n);
    const uRes = u('uRes'), uTime = u('uTime'), uMouse = u('uMouse'), uPress = u('uPress'), uScroll = u('uScroll');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Render below native resolution: the field is soft, lines stay crisp enough.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * 0.85;

    let w = 0, h = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width * dpr));
      h = Math.max(1, Math.round(r.height * dpr));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const target = { x: w * 0.72, y: h * 0.62 };
    const mouse = { ...target };
    let press = 0, pressTarget = 0;
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      target.x = (e.clientX - r.left) * dpr;
      target.y = (r.bottom - e.clientY) * dpr; // GL origin is bottom-left
      pressTarget = e.clientY >= r.top && e.clientY <= r.bottom ? 1 : 0;
    };
    const onLeave = () => { pressTarget = 0; };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    let visible = true;
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) loop(); }, { threshold: 0 });
    io.observe(canvas);

    let raf = 0;
    const start = performance.now();
    let last = start;
    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = 1 - Math.exp(-dt * 6);
      mouse.x += (target.x - mouse.x) * k;
      mouse.y += (target.y - mouse.y) * k;
      press += (pressTarget - press) * (1 - Math.exp(-dt * 3));
      const r = canvas.getBoundingClientRect();
      const scroll = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, reduced ? 12 : (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uPress, press);
      gl.uniform1f(uScroll, scroll);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = () => {
      cancelAnimationFrame(raf);
      const tick = (now) => {
        if (!visible || document.hidden) return;
        draw(now);
        if (!reduced) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const onVis = () => { if (!document.hidden) loop(); };
    document.addEventListener('visibilitychange', onVis);
    loop();
    canvas.classList.add('is-ready');

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
      // Don't loseContext(): StrictMode remounts reuse this same canvas.
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
  }, []);

  return <canvas ref={canvasRef} className={`shader-field ${className}`} aria-hidden="true" />;
};

export default ShaderField;

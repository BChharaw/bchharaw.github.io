// three.js view of the city. Sim coordinates (x east, y north) map to three
// as (x, height, -y), so a heading θ in the sim is rotation.y = θ here.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  N, EXTENT, AVE, RB, LANE, nodeIJ, ROUNDABOUTS, SIGNALS, DIRS, nodePos, nodeId, segKey, segType, segAllowed, legs, legHalf,
  stopDistance, signalState, VEHICLE_DIMS, right, HW, hwLine, SCHOOL_ZONE, TYPES, sampleLoop,
} from './cityModel';

const segHalfAt = (key) => TYPES[segType(key)].half;

const ACCENT = 0xffb224;
let _poleMat = null;
const poleMat0 = () => (_poleMat ||= new THREE.MeshStandardMaterial({ color: 0x2c2d2f, roughness: 0.6, metalness: 0.4 }));
const tv = (x, y, h = 0) => new THREE.Vector3(x, h, -y);

// ---------------------------------------------------------------- helpers

function ribbon(points, halfWidth, offset = 0) {
  const n = points.length;
  const pos = new Float32Array(n * 2 * 3);
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)];
    let tx = b.x - a.x, ty = b.y - a.y;
    const l = Math.hypot(tx, ty) || 1;
    tx /= l; ty /= l;
    const nx = -ty, ny = tx;
    const cx = points[i].x + nx * offset, cy = points[i].y + ny * offset;
    pos.set([cx + nx * halfWidth, 0, -(cy + ny * halfWidth), cx - nx * halfWidth, 0, -(cy - ny * halfWidth)], i * 6);
  }
  const idx = [];
  for (let i = 0; i < n - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3(), p4 = new THREE.Vector3();
function setInst(mesh, i, x, y, h, rot, sx, sy, sz) {
  p4.copy(tv(x, y, h)); e4.set(0, rot, 0); q4.setFromEuler(e4); s4.set(sx, sy, sz);
  m4.compose(p4, q4, s4);
  mesh.setMatrixAt(i, m4);
}

function instanced(geo, mat, items, place, { cast = false, receive = false } = {}) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  mesh.count = items.length;
  items.forEach((it, i) => {
    const r = place(it, i);
    setInst(mesh, i, r.x, r.y, r.h || 0, r.rot || 0, r.sx ?? 1, r.sy ?? 1, r.sz ?? 1);
    if (r.color !== undefined) mesh.setColorAt(i, r.color instanceof THREE.Color ? r.color : new THREE.Color(r.color));
  });
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

const bx = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
const wheel = (r, w, x, z) => { const g = new THREE.CylinderGeometry(r, r, w, 14); g.rotateX(Math.PI / 2); g.translate(x, r, z); return g; };

// Vehicle geometry in local space: x forward, y up, z to the side.
function vehicleParts(kind) {
  const [L, W] = VEHICLE_DIMS[kind];
  const paint = [], dark = [], pale = [];
  const heads = [], tails = [];
  const wheels = (r, inset) => [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => dark.push(wheel(r, 0.28, sx * (L / 2 - inset), sz * (W / 2 - 0.12)))));
  switch (kind) {
    case 'sedan':
      paint.push(bx(L, 0.62, W, 0, 0.62, 0));
      dark.push(bx(L * 0.46, 0.52, W * 0.86, -0.08 * L, 1.18, 0));
      wheels(0.34, 0.85);
      break;
    case 'hatch':
      paint.push(bx(L, 0.66, W, 0, 0.64, 0));
      dark.push(bx(L * 0.55, 0.56, W * 0.86, -0.13 * L, 1.22, 0));
      wheels(0.33, 0.7);
      break;
    case 'suv':
      paint.push(bx(L, 0.86, W, 0, 0.78, 0));
      dark.push(bx(L * 0.62, 0.62, W * 0.88, -0.1 * L, 1.52, 0));
      pale.push(bx(L * 0.5, 0.06, W * 0.7, -0.1 * L, 1.86, 0));
      wheels(0.4, 0.95);
      break;
    case 'pickup':
      paint.push(bx(L, 0.8, W, 0, 0.78, 0));
      dark.push(bx(L * 0.3, 0.62, W * 0.88, 0.1 * L, 1.48, 0));
      paint.push(bx(L * 0.42, 0.42, 0.1, -0.27 * L, 1.39, W / 2 - 0.05), bx(L * 0.42, 0.42, 0.1, -0.27 * L, 1.39, -W / 2 + 0.05));
      wheels(0.42, 1.0);
      break;
    case 'van':
      paint.push(bx(L, 1.95, W, 0, 1.33, 0));
      dark.push(bx(0.08, 0.7, W * 0.84, L / 2 + 0.01, 1.75, 0), bx(L * 0.18, 0.55, 0.04, L * 0.35, 1.75, W / 2 + 0.01), bx(L * 0.18, 0.55, 0.04, L * 0.35, 1.75, -W / 2 - 0.01));
      wheels(0.38, 0.95);
      break;
    case 'truck':
      paint.push(bx(2.1, 2.2, W, L / 2 - 1.05, 1.5, 0));
      dark.push(bx(0.08, 0.8, W * 0.86, L / 2 + 0.01, 2.0, 0));
      pale.push(bx(L - 2.4, 2.9, W + 0.05, -1.2, 2.0, 0));
      wheels(0.5, 1.2);
      break;
    case 'schoolbus':
      paint.push(bx(L, 2.5, W, 0, 1.7, 0));
      dark.push(bx(L * 0.86, 0.85, W + 0.02, -0.03 * L, 2.1, 0), bx(L, 0.12, W + 0.03, 0, 1.25, 0), bx(0.08, 1.2, W * 0.9, L / 2 + 0.01, 1.95, 0));
      wheels(0.5, 2.2);
      break;
    case 'bus':
      paint.push(bx(L, 2.6, W, 0, 1.75, 0));
      dark.push(bx(L * 0.9, 0.95, W + 0.02, -0.02 * L, 2.1, 0), bx(0.08, 1.4, W * 0.9, L / 2 + 0.01, 1.9, 0));
      pale.push(bx(L * 0.95, 0.12, W * 0.9, 0, 3.1, 0));
      wheels(0.52, 2.4);
      break;
    case 'sports':
      paint.push(bx(L, 0.5, W, 0, 0.5, 0), bx(L * 0.25, 0.14, W * 0.9, L * 0.3, 0.82, 0));
      dark.push(bx(L * 0.4, 0.4, W * 0.84, -0.06 * L, 0.95, 0));
      wheels(0.34, 0.78);
      break;
    case 'boxtruck':
      paint.push(bx(1.9, 2.0, W, L / 2 - 0.95, 1.35, 0));
      dark.push(bx(0.08, 0.75, W * 0.86, L / 2 + 0.01, 1.8, 0));
      pale.push(bx(L - 2.1, 2.6, W + 0.04, -1.05, 1.85, 0));
      wheels(0.44, 1.0);
      break;
    case 'bike':
      dark.push(bx(1.1, 0.06, 0.06, 0, 0.6, 0), bx(0.06, 0.66, 0.66, 0.55, 0.33, 0), bx(0.06, 0.66, 0.66, -0.55, 0.33, 0));
      paint.push(bx(0.3, 0.65, 0.4, -0.05, 1.25, 0));
      pale.push(bx(0.22, 0.22, 0.22, 0.02, 1.7, 0));
      break;
    default:
      break;
  }
  if (kind !== 'bike') {
    const hy = kind === 'bus' || kind === 'schoolbus' || kind === 'truck' || kind === 'boxtruck' ? 0.75 : kind === 'van' ? 0.8 : kind === 'sports' ? 0.55 : 0.72;
    heads.push([L / 2 + 0.02, hy, W / 2 - 0.3], [L / 2 + 0.02, hy, -W / 2 + 0.3]);
    tails.push([-L / 2 - 0.02, hy + 0.08, W / 2 - 0.25], [-L / 2 - 0.02, hy + 0.08, -W / 2 + 0.25]);
  } else {
    tails.push([-0.58, 0.75, 0]);
    heads.push([0.58, 0.9, 0]);
  }
  const merge = (list) => (list.length ? mergeGeometries(list, false) : null);
  return { paint: merge(paint), dark: merge(dark), pale: merge(pale), heads, tails };
}

const PAINT = [0x8d8c88, 0x5b5d61, 0x2f3236, 0xb9b7b0, 0x6e2f2a, 0x2d3f55, 0x8a7a63, 0x4c5a4b, 0xd0cec8, 0x3a3a3a, 0x7b8691];
const paintFor = (t) => new THREE.Color(PAINT[Math.floor(t * PAINT.length) % PAINT.length]);

// ---------------------------------------------------------------- facades

// Base tints: 0 stone with punched windows, 1 concrete office ribbons,
// 2 glass curtain wall, 3 brick residential.
const STYLE_TINT = [0xa39a8e, 0x8f9296, 0x44525e, 0x7d5446];

function facadeMaterial(uniforms) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.05 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = uniforms.uNight;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aStyle;
        attribute float aSeed;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying float vStyle;
        varying float vSeed;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 wp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        wp = modelMatrix * wp;
        vWorldPos = wp.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
        vStyle = aStyle;
        vSeed = aSeed;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uNight;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying float vStyle;
        varying float vSeed;
        float hash2(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
        vec3 lightColour(float h) {
          if (h < 0.52) return vec3(1.0, 0.70, 0.42);
          if (h < 0.76) return vec3(1.0, 0.90, 0.76);
          if (h < 0.92) return vec3(0.70, 0.83, 1.0);
          if (h < 0.96) return vec3(0.35, 0.92, 0.85);
          return vec3(0.95, 0.45, 0.80);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 n = normalize(vWorldNormal);
        if (abs(n.y) < 0.5) {
          float u = abs(n.x) > abs(n.z) ? vWorldPos.z : vWorldPos.x;
          float y = vWorldPos.y;
          float side = floor(n.x * 3.0 + n.z * 7.0);
          float style = floor(vStyle + 0.5);
          vec2 cellSize = style < 0.5 ? vec2(3.0, 3.5) : style < 1.5 ? vec2(1.6, 3.6) : style < 2.5 ? vec2(1.5, 3.6) : vec2(2.4, 3.1);
          vec2 cell = floor(vec2(u, y - 0.6) / cellSize);
          vec2 f = fract(vec2(u, y - 0.6) / cellSize);
          float win;
          if (style < 0.5) win = step(0.22, f.x) * step(f.x, 0.78) * step(0.28, f.y) * step(f.y, 0.82);
          else if (style < 1.5) win = step(0.38, f.y) * step(f.y, 0.9) * step(0.05, f.x);
          else if (style < 2.5) win = step(0.04, f.x) * step(0.05, f.y);
          else win = step(0.3, f.x) * step(f.x, 0.7) * step(0.34, f.y) * step(f.y, 0.8);
          if (y < 4.6) win = 0.0;
          // Shopfront glazing along the ground floor of non-glass buildings.
          float ground = step(0.8, y) * step(y, 4.2) * (1.0 - step(1.5, style) * step(style, 2.5)) * step(0.08, fract(u / 6.0));
          float glass = max(win, ground);
          vec3 glassCol = mix(vec3(0.10, 0.12, 0.15), vec3(0.20, 0.26, 0.33), 0.35 + 0.3 * n.z);
          diffuseColor.rgb = mix(diffuseColor.rgb, glassCol, glass * 0.88);
          float h = hash2(cell + vec2(side * 13.1, vSeed * 97.0));
          float litP = mix(0.06, style > 1.5 && style < 2.5 ? 0.16 : 0.34, uNight);
          float lit = step(h, litP) * win * (0.35 + 0.65 * hash2(cell * 3.1 + vSeed));
          float shop = ground * step(hash2(vec2(floor(u / 6.0), vSeed * 31.0 + side)), 0.65);
          vec3 lc = lightColour(hash2(cell * 1.7 + vSeed * 13.0));
          float k = mix(0.2, 0.95, uNight);
          totalEmissiveRadiance += (lit * lc + shop * vec3(1.0, 0.82, 0.6) * 0.7) * k;
        } else {
          diffuseColor.rgb *= 0.72;
        }`);
  };
  return mat;
}

// Soft radial texture for streetlight pools on the ground.
function poolTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,214,160,0.9)');
  grad.addColorStop(0.45, 'rgba(255,190,120,0.3)');
  grad.addColorStop(1, 'rgba(255,190,120,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Kerb slab for one block: rounded corners, concave cut around roundabouts.
function padShape(pad, inset = 0) {
  const { corners } = pad;
  const x0 = pad.x0 + inset, x1 = pad.x1 - inset, y0 = pad.y0 + inset, y1 = pad.y1 - inset;
  const P = [new THREE.Vector2(x0, y0), new THREE.Vector2(x1, y0), new THREE.Vector2(x1, y1), new THREE.Vector2(x0, y1)];
  const shape = new THREE.Shape();
  const kerb = 6;
  for (let k = 0; k < 4; k++) {
    const c = P[k], prev = P[(k + 3) % 4], next = P[(k + 1) % 4];
    const din = c.clone().sub(prev).normalize(), dout = next.clone().sub(c).normalize();
    const info = corners[k];
    if (info.rb) {
      const R = RB.clear + inset;
      const cc = new THREE.Vector2(info.c.x, info.c.y);
      const hit = (p0, d, sign) => {
        const f = p0.clone().sub(cc);
        const b = f.dot(d), cq = f.lengthSq() - R * R;
        const disc = b * b - cq;
        if (disc < 0) return null;
        return p0.clone().addScaledVector(d, -b + sign * Math.sqrt(disc));
      };
      const A = hit(c, din, -1), Bp = hit(c, dout, 1);
      if (A && Bp && A.distanceTo(c) < 60 && Bp.distanceTo(c) < 60) {
        if (k === 0) shape.moveTo(A.x, A.y); else shape.lineTo(A.x, A.y);
        const aA = Math.atan2(A.y - cc.y, A.x - cc.x), aB = Math.atan2(Bp.y - cc.y, Bp.x - cc.x);
        shape.absarc(cc.x, cc.y, R, aA, aB, true);
        continue;
      }
    }
    const A = c.clone().addScaledVector(din, -kerb), Bp = c.clone().addScaledVector(dout, kerb);
    if (k === 0) shape.moveTo(A.x, A.y); else shape.lineTo(A.x, A.y);
    shape.quadraticCurveTo(c.x, c.y, Bp.x, Bp.y);
  }
  shape.closePath();
  return shape;
}

function slabGeometry(shapes, depth, y = 0) {
  const geos = shapes.map((s) => {
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, y, 0);
    return g;
  });
  return mergeGeometries(geos, false);
}

// ---------------------------------------------------------------- scene

export function createCityScene(canvas, sim, { lowPower = false } = {}) {
  const city = sim.city;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const uniforms = { uNight: { value: 1 } };
  const scene = new THREE.Scene();
  const bgNight = new THREE.Color(0x07090c);
  scene.background = bgNight.clone();
  scene.fog = new THREE.Fog(bgNight.clone(), 150, 520);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.4, 2000);

  // Sky dome with a vertical gradient, stars and a moon for night.
  const skyUni = { uNight: uniforms.uNight, uSun: { value: new THREE.Vector3(0, 1, 0) }, uTwi: { value: 0 }, uDay: { value: 1 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(950, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUni,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uDay, uTwi; uniform vec3 uSun; varying vec3 vP;
      void main(){
        vec3 d = normalize(vP);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 dayTop = vec3(0.40, 0.53, 0.68), dayHor = vec3(0.68, 0.72, 0.75);
        vec3 nTop = vec3(0.014, 0.022, 0.05), nHor = vec3(0.07, 0.09, 0.14);
        vec3 top = mix(nTop, dayTop, uDay), hor = mix(nHor, dayHor, uDay);
        vec3 col = mix(hor, top, pow(h, 0.55));
        // Sunrise / sunset: a warm band low on the horizon, strongest towards the sun.
        float toward = max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSun.x, 0.0, uSun.z))), 0.0);
        float band = exp(-h * 7.0) * uTwi;
        col = mix(col, vec3(0.98, 0.52, 0.26), band * (0.35 + 0.65 * pow(toward, 3.0)));
        col = mix(col, vec3(0.45, 0.30, 0.42), exp(-h * 3.0) * uTwi * 0.25 * (1.0 - toward));
        // Sun disc and glow.
        float sd = dot(d, normalize(uSun));
        col += vec3(1.0, 0.85, 0.6) * (pow(max(sd, 0.0), 300.0) * 0.8 + smoothstep(0.9994, 0.9997, sd) * 6.0) * step(-0.02, uSun.y);
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  sky.renderOrder = -10;
  scene.add(sky);
  const starPos = [];
  for (let k = 0; k < 700; k++) {
    const u = Math.random() * Math.PI * 2, v = Math.acos(1 - Math.random() * 0.85);
    starPos.push(Math.cos(u) * Math.sin(v) * 900, Math.cos(v) * 900, Math.sin(u) * Math.sin(v) * 900);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.4, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }));
  scene.add(stars);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(16, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.45, 1.3), toneMapped: false, fog: false, transparent: true }));
  const MOON_DIR = new THREE.Vector3(-0.45, 0.32, -0.83).normalize();
  scene.add(moon);

  const hemi = new THREE.HemisphereLight(0xdde5f0, 0x2a2826, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe9d2, 3.0);
  sun.castShadow = !lowPower;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -85, right: 85, top: 85, bottom: -85, near: 10, far: 420 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.5;
  scene.add(sun, sun.target);
  const SUN_OFFSET = new THREE.Vector3(-120, 150, 70);

  // ---- ground, kerbs, parks, roundabout islands
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(EXTENT + 1200, EXTENT + 1200), new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(EXTENT / 2, 0, -EXTENT / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  const slabs = new THREE.Mesh(slabGeometry(city.pads.filter((p) => !p.interchange).map((p) => padShape(p)), 0.15), new THREE.MeshStandardMaterial({ color: 0x3a3a38, roughness: 0.9 }));
  slabs.receiveShadow = true;
  scene.add(slabs);
  // Parks, lawns, and the landscaped strip between the city and the highway.
  const parkShapes = city.pads.filter((p) => (p.park || p.lawn || p.outer) && !p.interchange).map((p) => padShape(p, p.lawn || p.outer ? 3.2 : 4));
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x3b4a35, roughness: 1 });
  city.pads.filter((p) => p.interchange).forEach((p) => {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(p.x1 - p.x0, p.y1 - p.y0), grassMat);
    g.rotation.x = -Math.PI / 2;
    g.position.copy(tv((p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, 0.004));
    g.receiveShadow = true;
    scene.add(g);
  });
  if (parkShapes.length) {
    const park = new THREE.Mesh(slabGeometry(parkShapes, 0.05, 0.15), new THREE.MeshStandardMaterial({ color: 0x27302a, roughness: 1 }));
    park.receiveShadow = true;
    scene.add(park);
  }
  ROUNDABOUTS.forEach((id) => {
    const p = nodePos(id);
    const isl = new THREE.Mesh(new THREE.CylinderGeometry(RB.island, RB.island + 0.1, 0.3, 40), new THREE.MeshStandardMaterial({ color: 0x3a3a38, roughness: 0.9 }));
    isl.position.copy(tv(p.x, p.y, 0.15));
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(RB.island - 0.5, RB.island - 0.5, 0.34, 40), new THREE.MeshStandardMaterial({ color: 0x28332b, roughness: 1 }));
    grass.position.copy(tv(p.x, p.y, 0.17));
    isl.receiveShadow = grass.receiveShadow = true;
    scene.add(isl, grass);
  });

  // ---- road markings
  const flat = new THREE.PlaneGeometry(1, 1);
  flat.rotateX(-Math.PI / 2);
  const white = [], yellow = [], bike = [], dashes = [], zebra = [];
  const allSegs = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N - 1; i++) allSegs.push([nodeId(i, j), nodeId(i + 1, j)]);
  for (let i = 0; i < N; i++) for (let j = 0; j < N - 1; j++) allSegs.push([nodeId(i, j), nodeId(i, j + 1)]);
  allSegs.forEach(([ia, ib]) => {
    const a = nodePos(ia), b = nodePos(ib);
    const type = segType(segKey(ia, ib));
    const d = b.clone().sub(a).normalize();
    const n = new THREE.Vector2(-d.y, d.x);
    const rot = Math.atan2(d.y, d.x);
    const dI = Math.abs(d.x) > 0.5 ? 0 : 1;
    const s0 = (ROUNDABOUTS.has(ia) ? RB.outer + 2 : stopDistance(ia, dI)) + 0.2;
    const s1 = a.distanceTo(b) - (ROUNDABOUTS.has(ib) ? RB.outer + 2 : stopDistance(ib, dI)) - 0.2;
    const mid = (s0 + s1) / 2, len = s1 - s0;
    const at = (s, lat) => a.clone().addScaledVector(d, s).addScaledVector(n, lat);
    const solid = (list, lat, w = 0.12) => { const p = at(mid, lat); list.push({ x: p.x, y: p.y, rot, sx: len, sz: w }); };
    const dashed = (lat, dl = 3, gap = 6) => { for (let s = s0 + 2; s < s1 - dl; s += dl + gap) { const p = at(s + dl / 2, lat); dashes.push({ x: p.x, y: p.y, rot, sx: dl, sz: 0.12 }); } };
    if (type === 'avenue') {
      [-1, 1].forEach((sd) => {
        dashed(sd * AVE.divider);
        solid(white, sd * AVE.edge);
        const p = at(mid, sd * (AVE.edge + AVE.bike + 0.9) / 2);
        bike.push({ x: p.x, y: p.y, rot, sx: len, sz: AVE.bike - AVE.edge + 0.9 });
      });
    } else if (type === 'street') {
      solid(yellow, 0.14, 0.1); solid(yellow, -0.14, 0.1);
      solid(white, LANE, 0.1); solid(white, -LANE, 0.1);
    } else {
      solid(white, LANE / 2, 0.1); solid(white, -LANE / 2, 0.1);
    }
  });
  for (let id = 0; id < N * N; id++) {
    const p = nodePos(id);
    legs(id).forEach((l) => {
      const L = DIRS[l];
      const dIn = (l + 2) & 3;
      const D = DIRS[dIn];
      const half = legHalf(id, l);
      const sd = stopDistance(id, dIn);
      const rot = Math.atan2(D.y, D.x);
      for (let k = -half + 0.6; k <= half - 0.4; k += 1.1) {
        const q = p.clone().addScaledVector(L, sd - 2.2).addScaledVector(right(D), k);
        zebra.push({ x: q.x, y: q.y, rot, sx: 2.6, sz: 0.55 });
      }
      const [i, j] = nodeIJ(id);
      const key = segKey(id, nodeId(i + L.x, j + L.y));
      if (SIGNALS.has(id) && segAllowed(key, dIn)) {
        const type = segType(key);
        const [lo, hi] = type === 'avenue' ? [AVE.median, AVE.edge] : type === 'street' ? [0.2, LANE] : [-LANE / 2, LANE / 2];
        const q = p.clone().addScaledVector(L, sd - 0.2).addScaledVector(right(D), (lo + hi) / 2);
        white.push({ x: q.x, y: q.y, rot: rot + Math.PI / 2, sx: hi - lo, sz: 0.45 });
      }
    });
  }
  ROUNDABOUTS.forEach((id) => {
    const p = nodePos(id);
    for (let a = 0; a < Math.PI * 2; a += 0.28) {
      const q = p.clone().add(new THREE.Vector2(Math.cos(a), Math.sin(a)).multiplyScalar(RB.centre));
      dashes.push({ x: q.x, y: q.y, rot: a + Math.PI / 2, sx: 1.4, sz: 0.12 });
    }
  });
  // Emissive at night stands in for retroreflective paint.
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xb8b8b2, roughness: 0.7, emissive: 0xb8b8b2, emissiveIntensity: 0 });
  const place = (h) => (d) => ({ x: d.x, y: d.y, h, rot: d.rot, sx: d.sx, sy: 1, sz: d.sz });
  scene.add(instanced(flat, whiteMat, white, place(0.022), { receive: true }));
  scene.add(instanced(flat, whiteMat, dashes, place(0.022), { receive: true }));
  scene.add(instanced(flat, whiteMat, zebra, place(0.021), { receive: true }));
  scene.add(instanced(flat, new THREE.MeshStandardMaterial({ color: 0x9c8546, roughness: 0.7 }), yellow, place(0.022), { receive: true }));
  scene.add(instanced(flat, new THREE.MeshStandardMaterial({ color: 0x2c4235, roughness: 0.9 }), bike, place(0.012), { receive: true }));

  // ---- medians
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  unitBox.translate(0, 0.5, 0);
  scene.add(instanced(unitBox, new THREE.MeshStandardMaterial({ color: 0x46463f, roughness: 0.9 }), city.medians,
    (o) => ({ x: o.pos.x, y: o.pos.y, rot: o.rot, sx: o.width, sy: 0.2, sz: o.height }), { receive: true }));

  // ---- highway: carriageways, shoulders, verges, markings, ramps, barriers
  const centre = hwLine(0).samples.map((q) => q.pos);
  const loopRibbon = (pts, half, off, mat, h, order = 0) => {
    const closed = [...pts, pts[0]];
    const m = new THREE.Mesh(ribbon(closed, half, off), mat);
    m.position.y = h;
    m.renderOrder = order;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  const hwAsphalt = new THREE.MeshStandardMaterial({ color: 0x222223, roughness: 0.9 });
  // Open country outside the city: grass everywhere beyond the outer blocks.
  {
    const M = 900, m = 99;
    const shape = new THREE.Shape([new THREE.Vector2(-M, -M), new THREE.Vector2(EXTENT + M, -M), new THREE.Vector2(EXTENT + M, EXTENT + M), new THREE.Vector2(-M, EXTENT + M)]);
    shape.holes.push(new THREE.Path([new THREE.Vector2(-m, -m), new THREE.Vector2(-m, EXTENT + m), new THREE.Vector2(EXTENT + m, EXTENT + m), new THREE.Vector2(EXTENT + m, -m)]));
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    const country = new THREE.Mesh(g, grassMat);
    country.position.y = 0.002;
    country.receiveShadow = true;
    scene.add(country);
  }
  loopRibbon(centre, HW.half + 3, 0, new THREE.MeshStandardMaterial({ color: 0x2a2a28, roughness: 1 }), 0.005); // gravel shoulder
  loopRibbon(centre, HW.half, 0, hwAsphalt, 0.008);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xb8b8b2 }), yellowMat = new THREE.MeshBasicMaterial({ color: 0x9c8546 });
  const hwEdge = HW.median + 7.45;
  [-1, 1].forEach((sd) => {
    loopRibbon(centre, 0.08, sd * (HW.median + 0.25), yellowMat, 0.02);
    if (sd < 0) loopRibbon(centre, 0.08, sd * hwEdge, lineMat, 0.02);
  });
  // Right-hand edge line of the ramp carriageway: solid, but broken into
  // short merge dashes wherever a ramp's auxiliary lane runs alongside it.
  const rampLane = city.ramps.flatMap((r) => [...r.on, ...r.off]);
  const nearRampLane = (p, d) => rampLane.some((q) => Math.abs(q.x - p.x) < d && Math.abs(q.y - p.y) < d && q.distanceTo(p) < d);
  const edgeMarks = [];
  {
    const L = hwLine(hwEdge).samples;
    for (let k = 0; k < L.length; k += 3) {
      const a = L[k].pos, b = L[(k + 3) % L.length].pos;
      const merge = nearRampLane(a, 3.2);
      if (merge && k % 9 !== 0) continue;
      edgeMarks.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, rot: Math.atan2(b.y - a.y, b.x - a.x), sx: merge ? 3 : a.distanceTo(b) + 0.05, sz: merge ? 0.3 : 0.16 });
    }
  }
  const hwDash = [];
  [-1, 1].forEach((sd) => {
    const L = hwLine(sd * 4.7).samples;
    for (let k = 0; k < L.length; k += 12) {
      const a = L[k].pos, b = L[Math.min(L.length - 1, k + 4)].pos;
      hwDash.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, rot: Math.atan2(b.y - a.y, b.x - a.x), sx: 3.5, sz: 0.13 });
    }
  });
  scene.add(instanced(flat, lineMat, hwDash, place(0.021)));
  scene.add(instanced(flat, lineMat, edgeMarks, place(0.02)));
  // Ramps: asphalt with edge lines, except where the ramp overlaps the
  // highway itself (there the carriageway's own markings take over).
  const hwCentre = hwLine(0).samples.map((q) => q.pos);
  const offHighway = (p) => {
    let best = Infinity;
    for (let k = 0; k < hwCentre.length; k += 2) { const q = hwCentre[k]; if (Math.abs(q.x - p.x) < 20 && Math.abs(q.y - p.y) < 20) best = Math.min(best, q.distanceTo(p)); }
    return best > hwEdge + 0.35;
  };
  city.ramps.forEach((r) => {
    [r.on, r.off].forEach((pts) => {
      const m = new THREE.Mesh(ribbon(pts, 3.4), hwAsphalt);
      m.position.y = 0.012;
      m.receiveShadow = true;
      scene.add(m);
      [-1, 1].forEach((sd) => {
        // Edge points, split into runs that stay off the main carriageway.
        const edge = pts.map((p, i) => {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
          const t = b.clone().sub(a).normalize();
          return p.clone().add(new THREE.Vector2(-t.y, t.x).multiplyScalar(sd * 3.0));
        });
        let run = [];
        const flush = () => { if (run.length > 1) { const e = new THREE.Mesh(ribbon(run, 0.08), lineMat); e.position.y = 0.022; scene.add(e); } run = []; };
        edge.forEach((p) => { if (offHighway(p)) run.push(p); else flush(); });
        flush();
      });
    });
  });
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0x77766f, roughness: 0.85 });
  scene.add(instanced(unitBox, barrierMat, city.barriers.filter((b) => b.median), (b) => ({ x: b.pos.x, y: b.pos.y, rot: b.rot, sx: b.width, sy: 0.85, sz: 0.55 }), { cast: true, receive: true }));
  scene.add(instanced(unitBox, poleMat0(), city.barriers.filter((b) => !b.median), (b) => ({ x: b.pos.x, y: b.pos.y, h: 0.45, rot: b.rot, sx: b.width, sy: 0.3, sz: 0.12 }), { cast: true }));
  // Tall median masts with a lamp over each carriageway.
  const masts = hwLine(0).samples.filter((_, k) => k % 42 === 0).map((q) => ({ pos: q.pos, dir: q.dir }));
  scene.add(instanced(unitBox, poleMat0(), masts, (m) => ({ x: m.pos.x, y: m.pos.y, sx: 0.25, sy: 12, sz: 0.25 }), { cast: true }));
  const hwLamps = [];
  const hwC = hwLine(0).samples.map((q) => q.pos);
  const offHighwayLamp = (p) => hwC.every((q) => Math.abs(q.x - p.x) > 16 || Math.abs(q.y - p.y) > 16 || q.distanceTo(p) > HW.half + 3);
  masts.forEach((m) => [-1, 1].forEach((sd) => { const q = m.pos.clone().addScaledVector(right(m.dir), sd * 3.4); hwLamps.push({ pos: q, facing: right(m.dir).multiplyScalar(sd), mast: true }); }));
  // Lamp posts along the outside of each ramp.
  city.ramps.forEach((r) => [r.on, r.off].forEach((pts) => {
    for (let i = 6; i < pts.length - 4; i += 7) {
      const a = pts[i - 1], b = pts[i + 1];
      const t = b.clone().sub(a).normalize();
      const out = new THREE.Vector2(t.y, -t.x); // right of travel
      const q = pts[i].clone().addScaledVector(out, 4.6);
      if (offHighwayLamp(q)) hwLamps.push({ pos: q, facing: out.negate(), ramp: true });
    }
  }));

  // ---- buildings: base boxes, towers on podiums, rooftop plant
  const parts = [];
  const plant = [];
  city.buildings.forEach((b) => {
    if (b.house) return;
    const tint = new THREE.Color(STYLE_TINT[b.style]).multiplyScalar(0.8 + b.seed * 0.35);
    if (b.landmark >= 0) tint.set(0x55636e);
    if (b.podium) {
      parts.push({ x: b.x, y: b.y, w: b.w, d: b.d, h: 11, base: 0.15, style: 1, seed: b.seed, tint: new THREE.Color(STYLE_TINT[1]).multiplyScalar(0.9) });
      parts.push({ x: b.x, y: b.y, w: b.w * 0.66, d: b.d * 0.66, h: b.h - 11, base: 11.15, style: b.style, seed: b.seed * 3.1, tint });
    } else {
      parts.push({ x: b.x, y: b.y, w: b.w, d: b.d, h: b.h, base: 0.15, style: b.style, seed: b.seed, tint });
    }
    if (b.landmark < 0 && b.seed > 0.35) {
      const w = (b.podium ? b.w * 0.66 : b.w) * 0.3, d = (b.podium ? b.d * 0.66 : b.d) * 0.3;
      plant.push({ x: b.x + (b.seed - 0.5) * w, y: b.y - (b.seed - 0.5) * d, h: b.h + 0.15, sx: w, sy: 1.6 + b.seed * 1.6, sz: d });
    }
  });
  city.skyline.forEach((b) => parts.push({ x: b.x, y: b.y, w: b.w, d: b.d, h: b.h, base: 0, style: b.style, seed: b.seed, tint: new THREE.Color(STYLE_TINT[b.style]).multiplyScalar(0.7) }));
  const bmesh = instanced(unitBox, facadeMaterial(uniforms), parts, (p) => ({ x: p.x, y: p.y, h: p.base, sx: p.w, sy: p.h, sz: p.d, color: p.tint }), { cast: true, receive: true });
  bmesh.geometry = unitBox.clone();
  bmesh.geometry.setAttribute('aStyle', new THREE.InstancedBufferAttribute(new Float32Array(parts.map((p) => p.style)), 1));
  bmesh.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(parts.map((p) => p.seed)), 1));
  scene.add(bmesh);
  scene.add(instanced(unitBox, new THREE.MeshStandardMaterial({ color: 0x5b5b57, roughness: 0.8 }), plant, (p) => p, { cast: true }));

  const landmarkLines = city.landmarks.map((lm) => {
    const b = lm.building;
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(b.w + 0.1, b.h + 0.1, b.d + 0.1)), new THREE.LineBasicMaterial({ color: 0x8c8b86, transparent: true, opacity: 0.6 }));
    line.position.copy(tv(b.x, b.y, 0.15 + b.h / 2));
    scene.add(line);
    return line;
  });

  // ---- vegetation and street furniture
  const trunk = new THREE.CylinderGeometry(0.12, 0.16, 1, 6); trunk.translate(0, 0.5, 0);
  const canopy = new THREE.IcosahedronGeometry(1, 1);
  const leafTones = [0x2c3a2c, 0x33402f, 0x283428, 0x3a4632];
  const tall = city.trees.filter((t) => t.kind !== 'shrub');
  scene.add(instanced(trunk, new THREE.MeshStandardMaterial({ color: 0x3a3029, roughness: 1 }), tall, (t) => ({ x: t.x, y: t.y, h: 0.15, sy: t.s * 1.2 })));
  scene.add(instanced(canopy, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), city.trees,
    (t, i) => (t.kind === 'shrub'
      ? { x: t.x, y: t.y, h: 0.55, sx: 0.8, sy: 0.55, sz: 0.8, color: leafTones[i % 4] }
      : { x: t.x, y: t.y, h: 0.15 + t.s * 1.6, sx: t.s, sy: t.s * 1.15, sz: t.s, color: leafTones[i % 4] }), { cast: true }));

  const hyd = new THREE.CylinderGeometry(0.16, 0.2, 0.75, 10); hyd.translate(0, 0.375 + 0.15, 0);
  scene.add(instanced(hyd, new THREE.MeshStandardMaterial({ color: 0x9c2f26, roughness: 0.6 }), city.hydrants, (p) => ({ x: p.x, y: p.y }), { cast: true }));

  const pole = new THREE.CylinderGeometry(0.07, 0.1, 1, 8); pole.translate(0, 0.5, 0);
  const poleMat = poleMat0();
  scene.add(instanced(pole, poleMat, [...city.lamps, ...hwLamps.filter((l) => l.ramp)], (l) => ({ x: l.pos.x, y: l.pos.y, h: 0.15, sy: 7.5 }), { cast: true }));
  const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffd6a0, emissiveIntensity: 2.2 });
  const allLamps = [...city.lamps, ...hwLamps];
  scene.add(instanced(unitBox, lampHeadMat, allLamps, (l) => ({ x: l.pos.x + l.facing.x * 0.9, y: l.pos.y + l.facing.y * 0.9, h: l.mast ? 11.8 : 7.5, rot: Math.atan2(l.facing.y, l.facing.x), sx: 1.6, sy: 0.16, sz: 0.45 })));
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 });
  const pools = instanced(flat, poolMat, allLamps, (l) => ({ x: l.pos.x + l.facing.x * (l.mast ? 3 : 3), y: l.pos.y + l.facing.y * 3, h: 0.03, sx: l.mast ? 26 : 16, sz: l.mast ? 26 : 16 }));
  pools.renderOrder = 1;
  scene.add(pools);

  // ---- traffic signals: pole, mast arm over the lanes, head, three lamps
  const into = (s) => right(s.facing); // from the kerb towards the lanes
  const armLen = (s) => Math.max(2, s.reach * 0.55);
  const headAt = (s) => s.pos.clone().addScaledVector(into(s), armLen(s));
  scene.add(instanced(pole, poleMat, city.signals, (s) => ({ x: s.pos.x, y: s.pos.y, h: 0.15, sy: 5.4 }), { cast: true }));
  scene.add(instanced(unitBox, poleMat, city.signals, (s) => {
    const c = s.pos.clone().addScaledVector(into(s), armLen(s) / 2);
    return { x: c.x, y: c.y, h: 5.3, rot: Math.atan2(into(s).y, into(s).x), sx: armLen(s), sy: 0.12, sz: 0.12 };
  }));
  scene.add(instanced(unitBox, new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.5 }), city.signals, (s) => {
    const h = headAt(s);
    return { x: h.x, y: h.y, h: 4.1, rot: Math.atan2(s.facing.y, s.facing.x), sx: 0.35, sy: 1.15, sz: 0.4 };
  }, { cast: true }));
  const sigLamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), city.signals.length * 3);
  city.signals.forEach((s, i) => {
    const h = headAt(s).addScaledVector(s.facing, 0.2);
    [0, 1, 2].forEach((k) => { setInst(sigLamps, i * 3 + k, h.x, h.y, 4.95 - k * 0.36, 0, 1, 1, 1); sigLamps.setColorAt(i * 3 + k, new THREE.Color(0x111111)); });
  });
  scene.add(sigLamps);
  const SIG = { red: [new THREE.Color(2.4, 0.15, 0.1), 0], yellow: [new THREE.Color(2.4, 1.3, 0.12), 1], green: [new THREE.Color(0.2, 2.2, 0.9), 2] };
  const OFF = [new THREE.Color(0.12, 0.02, 0.02), new THREE.Color(0.1, 0.07, 0.01), new THREE.Color(0.02, 0.09, 0.05)];

  // ---- vehicles: parked and blocking (static), traffic (dynamic)
  const paintMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.25 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x14171a, roughness: 0.3, metalness: 0.4 });
  const paleMat = new THREE.MeshStandardMaterial({ color: 0xd8d6cf, roughness: 0.7 });
  const partsCache = {};
  const kindParts = (k) => (partsCache[k] ||= vehicleParts(k));

  // Parked cars, blocking trucks and cones are rigid bodies in the sim; their
  // instances are re-posed whenever a body moves.
  const bodyKinds = {};
  const coneIdx = [];
  sim.bodies.forEach((b, i) => { if (b.kind === 'cone') coneIdx.push(i); else (bodyKinds[b.src.vkind] ||= []).push(i); });
  const bodyMeshes = Object.entries(bodyKinds).map(([k, idx]) => {
    const P = kindParts(k);
    const meshes = [[P.paint, paintMat], [P.dark, darkMat], [P.pale, paleMat]].filter(([g]) => g).map(([g, mat], part) => {
      const m = instanced(g, mat, idx, (bi) => {
        const b = sim.bodies[bi];
        const colour = part === 0 ? (k === 'truck' ? new THREE.Color(0x3d4b5c) : paintFor(b.src.tone)) : undefined;
        return { x: b.pos.x, y: b.pos.y, rot: b.rot, color: colour };
      }, { cast: true });
      scene.add(m);
      return m;
    });
    return { idx, meshes, ver: new Int32Array(idx.length) };
  });
  const coneGeo = new THREE.ConeGeometry(0.28, 0.75, 12); coneGeo.translate(0, 0.375, 0);
  const coneMesh = instanced(coneGeo, new THREE.MeshStandardMaterial({ color: 0xd9772b, roughness: 0.7 }), coneIdx, (bi) => ({ x: sim.bodies[bi].pos.x, y: sim.bodies[bi].pos.y }), { cast: true });
  scene.add(coneMesh);
  const coneVer = new Int32Array(coneIdx.length);
  const syncBodies = () => {
    bodyMeshes.forEach((bm) => {
      let dirty = false;
      bm.idx.forEach((bi, j) => {
        const b = sim.bodies[bi];
        if (b.version === bm.ver[j]) return;
        bm.ver[j] = b.version;
        bm.meshes.forEach((m) => setInst(m, j, b.pos.x, b.pos.y, 0, b.rot, 1, 1, 1));
        dirty = true;
      });
      if (dirty) bm.meshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
    });
    let dirty = false;
    coneIdx.forEach((bi, j) => {
      const b = sim.bodies[bi];
      if (b.version === coneVer[j]) return;
      coneVer[j] = b.version;
      // A knocked cone tips over while it slides.
      p4.copy(tv(b.pos.x, b.pos.y, 0)); e4.set(b.moving ? 1.2 : 0, b.rot, 0); q4.setFromEuler(e4); s4.set(1, 1, 1);
      m4.compose(p4, q4, s4); coneMesh.setMatrixAt(j, m4);
      dirty = true;
    });
    if (dirty) coneMesh.instanceMatrix.needsUpdate = true;
  };

  const agents = sim.agents;
  const dyn = {};
  agents.forEach((a, i) => { (dyn[a.kind] ||= []).push(i); });
  const dynMeshes = Object.entries(dyn).map(([k, idx]) => {
    const P = kindParts(k);
    const mk = (geo, mat) => {
      if (!geo) return null;
      const m = new THREE.InstancedMesh(geo, mat, idx.length);
      m.castShadow = true;
      scene.add(m);
      return m;
    };
    const paint = mk(P.paint, paintMat), dark = mk(P.dark, darkMat), pale = mk(P.pale, paleMat);
    idx.forEach((ai, j) => paint && paint.setColorAt(j, k === 'bus' ? new THREE.Color(0x2e5d7a) : k === 'schoolbus' ? new THREE.Color(0xe3a414) : k === 'truck' ? new THREE.Color(0x3d4b5c) : paintFor(agents[ai].tone)));
    return { kind: k, idx, paint, dark, pale };
  });
  const lampBox = new THREE.BoxGeometry(0.06, 0.13, 0.34);
  const nHead = agents.reduce((s, a) => s + kindParts(a.kind).heads.length, 0);
  const nTail = agents.reduce((s, a) => s + kindParts(a.kind).tails.length, 0);
  const heads = new THREE.InstancedMesh(lampBox, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), nHead);
  const tails = new THREE.InstancedMesh(lampBox, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), nTail);
  scene.add(heads, tails);
  const beamMat = new THREE.MeshBasicMaterial({ map: poolTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 });
  const beamPools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), beamMat, agents.length);
  beamPools.renderOrder = 1;
  scene.add(beamPools);
  const nVeh = agents.filter((a) => a.kind !== 'bike').length;
  const indicators = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.1, 0.18), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), Math.max(1, nVeh * 4));
  scene.add(indicators);
  const blinkOn = new THREE.Color(3.2, 1.5, 0.1), blinkOff = new THREE.Color(0.06, 0.04, 0.01);

  // ---- pedestrians
  const nPed = sim.peds.length;
  const pedBody = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 0.85, 4, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), nPed);
  const pedHead = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc9a88c, roughness: 0.7 }), nPed);
  const pedTones = [0x3b4a5c, 0x6b3b3b, 0x2e2e2e, 0x7a6a4f, 0x405a48, 0x8a8a86, 0x5a4a6a];
  sim.peds.forEach((p, i) => pedBody.setColorAt(i, new THREE.Color(pedTones[Math.floor(p.tone * pedTones.length)])));
  pedBody.castShadow = true;
  scene.add(pedBody, pedHead);

  // ---- ego
  const ego = new THREE.Group();
  const egoParts = vehicleParts('sedan');
  const egoPaint = new THREE.Mesh(egoParts.paint, new THREE.MeshStandardMaterial({ color: 0xecebe8, roughness: 0.35, metalness: 0.2 }));
  const egoDark = new THREE.Mesh(egoParts.dark, darkMat);
  egoPaint.castShadow = egoDark.castShadow = true;
  ego.add(egoPaint, egoDark);
  const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.26, 20), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 }));
  puck.position.set(-0.3, 1.58, 0);
  ego.add(puck);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 6, 24), new THREE.MeshBasicMaterial({ color: ACCENT, toneMapped: false }));
  halo.rotation.x = Math.PI / 2;
  halo.position.set(-0.3, 1.6, 0);
  ego.add(halo);
  const egoLamp = (x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.4), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    m.position.set(x, y, z);
    ego.add(m);
    return m;
  };
  const L2 = VEHICLE_DIMS.sedan[0] / 2, W2 = VEHICLE_DIMS.sedan[1] / 2;
  const egoHeads = [egoLamp(L2 + 0.02, 0.72, W2 - 0.3), egoLamp(L2 + 0.02, 0.72, -W2 + 0.3)];
  const egoTails = [egoLamp(-L2 - 0.02, 0.8, W2 - 0.25), egoLamp(-L2 - 0.02, 0.8, -W2 + 0.25)];
  const egoRev = [egoLamp(-L2 - 0.03, 0.62, 0.35), egoLamp(-L2 - 0.03, 0.62, -0.35)];
  const egoBlink = [[L2 + 0.01, 1], [L2 + 0.01, -1], [-L2 - 0.01, 1], [-L2 - 0.01, -1]].map(([x, side]) => ({ m: egoLamp(x, 0.9, side * (W2 - 0.08)), side }));
  const beams = [W2 - 0.4, -W2 + 0.4].map((z) => {
    const s = new THREE.SpotLight(0xfff1dd, 0, 70, 0.42, 0.55, 1.2);
    s.position.set(L2, 0.75, z);
    s.target.position.set(L2 + 20, -1.2, z * 2.5);
    ego.add(s, s.target);
    return s;
  });
  scene.add(ego);

  // ---- houses: siding boxes with gabled roofs
  const prism = new THREE.BufferGeometry();
  {
    const v = [
      -0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5, // gable
      0.5, 0, 0.5, -0.5, 0, 0.5, 0, 1, 0.5, // gable
      -0.5, 0, -0.5, 0, 1, -0.5, 0, 1, 0.5, -0.5, 0, -0.5, 0, 1, 0.5, -0.5, 0, 0.5, // slope
      0.5, 0, -0.5, 0.5, 0, 0.5, 0, 1, 0.5, 0.5, 0, -0.5, 0, 1, 0.5, 0, 1, -0.5, // slope
    ];
    prism.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    prism.computeVertexNormals();
  }
  const siding = [0xb9b1a2, 0x8e9a9e, 0x9d7c68, 0xc8c3b8, 0x6f7f86, 0xa89478];
  const roofs = [0x3a3634, 0x2f3438, 0x4a3a33, 0x2b2b2b];
  scene.add(instanced(unitBox, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), city.houses,
    (h) => ({ x: h.x, y: h.y, h: 0.15, rot: h.rot, sx: h.d, sy: h.h, sz: h.w, color: siding[Math.floor(h.tone * siding.length)] }), { cast: true, receive: true }));
  scene.add(instanced(prism, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide }), city.houses,
    (h) => ({ x: h.x, y: h.y, h: 0.15 + h.h, rot: h.rot, sx: h.d * 1.1, sy: 2.6 + h.roof, sz: h.w * 1.08, color: roofs[Math.floor(h.roof * roofs.length)] }), { cast: true }));
  // Warm porch / window glow at night.
  const porchMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.1, 0.6), toneMapped: false });
  scene.add(instanced(unitBox, porchMat, city.houses.filter((h) => h.tone > 0.35), (h) => {
    const n = { x: Math.cos(h.rot), y: Math.sin(h.rot) };
    return { x: h.x - n.x * (h.d / 2 + 0.02), y: h.y - n.y * (h.d / 2 + 0.02), h: 1.6, rot: h.rot, sx: 0.05, sy: 1.1, sz: 1.4 };
  }));

  // ---- stop signs (red octagon, white rim) and school-zone signs
  const octo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 8); octo.rotateZ(Math.PI / 2); octo.rotateX(Math.PI / 8);
  const rim = new THREE.CylinderGeometry(0.45, 0.45, 0.04, 8); rim.rotateZ(Math.PI / 2); rim.rotateX(Math.PI / 8);
  scene.add(instanced(pole, poleMat0(), city.stopSigns, (g) => ({ x: g.pos.x, y: g.pos.y, h: 0.15, sy: 2.6 })));
  scene.add(instanced(rim, new THREE.MeshStandardMaterial({ color: 0xe8e8e2, roughness: 0.6 }), city.stopSigns, (g) => ({ x: g.pos.x - g.facing.x * 0.02, y: g.pos.y - g.facing.y * 0.02, h: 2.5, rot: Math.atan2(g.facing.y, g.facing.x) })));
  scene.add(instanced(octo, new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.5, emissive: 0x3a0806 }), city.stopSigns, (g) => ({ x: g.pos.x, y: g.pos.y, h: 2.5, rot: Math.atan2(g.facing.y, g.facing.x) })));
  const zoneSigns = [];
  SCHOOL_ZONE.forEach((key) => {
    const h = key[0] === 'h';
    const [i, j] = key.slice(1).split(',').map(Number);
    const a = nodePos(nodeId(i, j)), b = nodePos(h ? nodeId(i + 1, j) : nodeId(i, j + 1));
    [[a, b], [b, a]].forEach(([p0, p1]) => {
      const d = p1.clone().sub(p0).normalize();
      const q = p0.clone().addScaledVector(d, 22).addScaledVector(right(d), segHalfAt(key) + 0.9);
      zoneSigns.push({ pos: q, facing: d.clone().negate() });
    });
  });
  scene.add(instanced(pole, poleMat0(), zoneSigns, (g) => ({ x: g.pos.x, y: g.pos.y, h: 0.15, sy: 2.8 })));
  scene.add(instanced(unitBox, new THREE.MeshStandardMaterial({ color: 0xc9e33c, roughness: 0.5, emissive: 0x1c2206 }), zoneSigns, (g) => ({ x: g.pos.x, y: g.pos.y, h: 2.2, rot: Math.atan2(g.facing.y, g.facing.x), sx: 0.05, sy: 0.75, sz: 0.75 })));
  if (city.school) {
    const sc = city.school;
    const flag = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 12, 8), poleMat0());
    flag.position.copy(tv(sc.x - sc.w / 2 - 6, sc.y - sc.d / 2 - 6, 6));
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshStandardMaterial({ color: 0xc8322b, side: THREE.DoubleSide }));
    cloth.position.copy(tv(sc.x - sc.w / 2 - 6 + 1.15, sc.y - sc.d / 2 - 6, 11.2));
    scene.add(flag, cloth);
  }

  // ---- the parked school bus, with a stop arm and flashing reds
  const sbParts = vehicleParts('schoolbus');
  const sbGroup = new THREE.Group();
  sbGroup.add(new THREE.Mesh(sbParts.paint, new THREE.MeshStandardMaterial({ color: 0xe3a414, roughness: 0.5 })), new THREE.Mesh(sbParts.dark, darkMat));
  sbGroup.children.forEach((m) => { m.castShadow = true; });
  const armPivot = new THREE.Group();
  const arm = new THREE.Mesh(octo.clone(), new THREE.MeshStandardMaterial({ color: 0xb3261e, emissive: 0x220000 }));
  arm.rotation.y = Math.PI / 2;
  arm.position.set(0, 0, 0.5);
  armPivot.add(arm);
  const SBL = city.schoolBus.L, SBW = city.schoolBus.W;
  armPivot.position.set(SBL / 2 - 1.6, 1.9, SBW / 2 + 0.05);
  sbGroup.add(armPivot);
  const sbLights = [[SBL / 2 - 0.1, 1], [SBL / 2 - 0.1, -1], [-SBL / 2 + 0.1, 1], [-SBL / 2 + 0.1, -1]].map(([x, side]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0x220000, toneMapped: false }));
    m.position.set(x, 2.95, side * (SBW / 2 - 0.3));
    sbGroup.add(m);
    return { m, side };
  });
  sbGroup.position.copy(tv(city.schoolBus.pos.x, city.schoolBus.pos.y));
  sbGroup.rotation.y = city.schoolBus.rot;
  scene.add(sbGroup);

  // ---- pond with ducks
  let ducks = null;
  if (city.pond) {
    const P = city.pond;
    const water = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ color: 0x173640, roughness: 0.06, metalness: 0.5 }));
    water.rotation.x = -Math.PI / 2;
    water.scale.set(P.rx, P.ry, 1);
    water.position.copy(tv(P.x, P.y, 0.215));
    const rimM = new THREE.Mesh(new THREE.RingGeometry(1, 1.06, 64), new THREE.MeshStandardMaterial({ color: 0x55534d, roughness: 0.9 }));
    rimM.rotation.x = -Math.PI / 2;
    rimM.scale.set(P.rx, P.ry, 1);
    rimM.position.copy(tv(P.x, P.y, 0.22));
    scene.add(water, rimM);
    const nD = 7;
    ducks = {
      P,
      body: new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), nD),
      head: new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }), nD),
      beak: new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 0.14, 6).rotateZ(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd9902b }), nD),
      params: Array.from({ length: nD }, (_, k) => ({ r: 0.35 + (k % 4) * 0.13, w: (0.06 + (k % 3) * 0.025) * (k % 2 ? 1 : -1), ph: k * 0.9 })),
    };
    ducks.params.forEach((q, k) => {
      ducks.body.setColorAt(k, new THREE.Color(k % 3 === 0 ? 0xe9e6de : 0x6b5440));
      ducks.head.setColorAt(k, new THREE.Color(k % 3 === 1 ? 0x1f5a3a : k % 3 === 0 ? 0xe9e6de : 0x5a4636));
    });
    scene.add(ducks.body, ducks.head, ducks.beak);
  }

  // ---- debug layers (display only; never fed back into the sim)
  const layers = { route: false, plan: true, lattice: true, perception: true, costmap: false, lidar: false, predictions: true, search: false };
  const cmSize = 160, cmRes = 0.5;
  const cmCanvas = document.createElement('canvas');
  cmCanvas.width = cmCanvas.height = cmSize;
  const cmCtx = cmCanvas.getContext('2d');
  const cmTex = new THREE.CanvasTexture(cmCanvas);
  cmTex.magFilter = THREE.NearestFilter;
  const costmap = new THREE.Mesh(new THREE.PlaneGeometry(cmSize * cmRes, cmSize * cmRes).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: cmTex, transparent: true, depthWrite: false, opacity: 0.85 }));
  costmap.renderOrder = 1;
  costmap.visible = false;
  scene.add(costmap);
  const lidarGeo = new THREE.BufferGeometry();
  const lidar = new THREE.Points(lidarGeo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
  lidar.visible = false;
  scene.add(lidar);
  const predGeo = new THREE.BufferGeometry();
  const preds = new THREE.LineSegments(predGeo, new THREE.LineBasicMaterial({ color: 0x7fc8ff, transparent: true, opacity: 0.8 }));
  preds.position.y = 0.3;
  preds.visible = false;
  scene.add(preds);
  const searchGeo = new THREE.BufferGeometry();
  const search = new THREE.Points(searchGeo, new THREE.PointsMaterial({ color: 0x9aa7ff, size: 0.18, transparent: true, opacity: 0.6, depthWrite: false }));
  search.position.y = 0.08;
  search.visible = false;
  scene.add(search);
  let layerT = 0, searchRef = null;

  // Cost map in the planner's own terms: obstacles dilated by Dash's collision
  // zone (red, infeasible) and hazard zone (amber, penalised), around the car.
  function drawCostmap() {
    const cp = sim.car.position;
    const cx = cp.x, cy = cp.y, half = (cmSize * cmRes) / 2;
    cmCtx.clearRect(0, 0, cmSize, cmSize);
    const toPx = (x, y) => [(x - cx + half) / cmRes, (half - (y - cy)) / cmRes];
    const box = (x, y, rot, hw, hh, fill) => {
      const [px, py] = toPx(x, y);
      cmCtx.save();
      cmCtx.translate(px, py);
      cmCtx.rotate(-rot);
      cmCtx.fillStyle = fill;
      cmCtx.fillRect(-hw / cmRes, -hh / cmRes, (2 * hw) / cmRes, (2 * hh) / cmRes);
      cmCtx.restore();
    };
    const near = (x, y) => Math.abs(x - cx) < half + 10 && Math.abs(y - cy) < half + 10;
    const obs = sim.statics.filter((o) => near(o.pos.x, o.pos.y));
    const C = sim.config;
    obs.forEach((o) => box(o.pos.x, o.pos.y, o.rot, o.width / 2 + C.collisionDilationS + C.hazardDilationS, o.height / 2 + C.collisionDilationL + C.hazardDilationL, 'rgba(255,178,36,0.22)'));
    obs.forEach((o) => box(o.pos.x, o.pos.y, o.rot, o.width / 2 + C.collisionDilationS, o.height / 2 + C.collisionDilationL, 'rgba(230,70,60,0.5)'));
    sim.trafficAt().forEach((c) => { if (near(c.pos.x, c.pos.y)) box(c.pos.x, c.pos.y, c.rot, c.L / 2 + C.collisionDilationS, c.W / 2 + C.collisionDilationL, 'rgba(120,170,255,0.45)'); });
    obs.forEach((o) => box(o.pos.x, o.pos.y, o.rot, o.width / 2, o.height / 2, 'rgba(255,255,255,0.9)'));
    cmTex.needsUpdate = true;
    costmap.position.copy(tv(cx, cy, 0.07));
  }

  // Simulated 2D LiDAR: rays from the roof against everything solid, drawn as
  // three scan rings on whatever they hit, coloured by range.
  function drawLidar() {
    const cp = sim.car.position;
    const shapes = [...sim.solids.near(cp.x, cp.y, 45)];
    sim.bodies.forEach((b) => { if (b.pos.distanceTo(cp) < 45) shapes.push({ box: true, x: b.pos.x, y: b.pos.y, rot: b.rot, hw: b.hw, hh: b.hh, h: 1.4 }); });
    sim.trafficAt().forEach((c) => { if (c.pos.distanceTo(cp) < 45) shapes.push({ box: true, x: c.pos.x, y: c.pos.y, rot: c.rot, hw: c.L / 2, hh: c.W / 2, h: 1.6 }); });
    sim.pedsAt().forEach((q) => { if (q.pos.distanceTo(cp) < 45) shapes.push({ box: false, x: q.pos.x, y: q.pos.y, r: 0.3, h: 1.7 }); });
    const pos = [], col = [];
    const R = 45, N_RAYS = 360;
    for (let k = 0; k < N_RAYS; k++) {
      const a = (k / N_RAYS) * Math.PI * 2;
      const dx = Math.cos(a), dy = Math.sin(a);
      let tBest = R, hBest = 0;
      shapes.forEach((sh) => {
        let t;
        if (sh.box) {
          // Ray vs oriented box, in the box frame (slab test).
          const cs = Math.cos(-sh.rot), sn = Math.sin(-sh.rot);
          const ox = (cp.x - sh.x) * cs - (cp.y - sh.y) * sn, oy = (cp.x - sh.x) * sn + (cp.y - sh.y) * cs;
          const rx = dx * cs - dy * sn, ry = dx * sn + dy * cs;
          let t0 = -Infinity, t1 = Infinity;
          if (Math.abs(rx) < 1e-9) { if (Math.abs(ox) > sh.hw) return; } else { const a1 = (-sh.hw - ox) / rx, a2 = (sh.hw - ox) / rx; t0 = Math.max(t0, Math.min(a1, a2)); t1 = Math.min(t1, Math.max(a1, a2)); }
          if (Math.abs(ry) < 1e-9) { if (Math.abs(oy) > sh.hh) return; } else { const b1 = (-sh.hh - oy) / ry, b2 = (sh.hh - oy) / ry; t0 = Math.max(t0, Math.min(b1, b2)); t1 = Math.min(t1, Math.max(b1, b2)); }
          if (t1 < t0 || t1 < 0) return;
          t = t0 > 0 ? t0 : null;
        } else {
          const fx = cp.x - sh.x, fy = cp.y - sh.y;
          const bq = fx * dx + fy * dy, cq = fx * fx + fy * fy - sh.r * sh.r;
          const disc = bq * bq - cq;
          if (disc < 0) return;
          t = -bq - Math.sqrt(disc);
          if (t < 0) return;
        }
        if (t && t < tBest) { tBest = t; hBest = sh.h || (sh.kind === 'building' ? 8 : 1.2); }
      });
      if (tBest >= R) continue;
      const c = new THREE.Color().setHSL(0.08 + (tBest / R) * 0.5, 0.9, 0.6);
      [0.5, 1.1, 1.8].forEach((z) => {
        if (z > hBest + 0.2) return;
        pos.push(cp.x + dx * tBest, z, -(cp.y + dy * tBest));
        col.push(c.r, c.g, c.b);
      });
    }
    lidarGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    lidarGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  }

  // Predicted paths, 3 s ahead, for traffic and people crossing.
  function drawPredictions() {
    const cp = sim.car.position;
    const seg = [];
    sim.agents.forEach((a) => {
      const now = sampleLoop(a.loop, a.s).pos;
      if (now.distanceTo(cp) > 90) return;
      let prev = now;
      for (let t = 0.5; t <= 3; t += 0.5) {
        const q = sampleLoop(a.loop, a.s + a.v * t).pos;
        seg.push(prev.x, 0, -prev.y, q.x, 0, -q.y);
        prev = q;
      }
    });
    sim.jay.forEach((j) => {
      const q = j.pos.clone().addScaledVector(j.dir, j.v * 3);
      seg.push(j.pos.x, 0, -j.pos.y, q.x, 0, -q.y);
    });
    predGeo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  }

  // ---- jaywalkers and their dogs
  const jayBody = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 0.85, 4, 8), new THREE.MeshStandardMaterial({ color: 0x5a6b7a, roughness: 0.8 }), 2);
  const jayHead = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc9a88c }), 2);
  const dogBody = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.3, 0.26), new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.9 }), 2);
  const dogHead = new THREE.InstancedMesh(new THREE.BoxGeometry(0.24, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.9 }), 2);
  jayBody.castShadow = dogBody.castShadow = true;
  scene.add(jayBody, jayHead, dogBody, dogHead);

  // ---- perception: 3D boxes round every tracked object, coloured by class,
  // with whatever the planner is currently reacting to picked out in amber and
  // tethered to the car.
  const MAX_BOX = 90;
  const boxPos = new Float32Array((MAX_BOX * 24 + 2) * 3), boxCol = new Float32Array((MAX_BOX * 24 + 2) * 3);
  const boxGeo = new THREE.BufferGeometry();
  boxGeo.setAttribute('position', new THREE.BufferAttribute(boxPos, 3).setUsage(THREE.DynamicDrawUsage));
  boxGeo.setAttribute('color', new THREE.BufferAttribute(boxCol, 3).setUsage(THREE.DynamicDrawUsage));
  const boxes = new THREE.LineSegments(boxGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false }));
  boxes.frustumCulled = false;
  boxes.renderOrder = 4;
  scene.add(boxes);
  const CLS = {
    vehicle: new THREE.Color(0.45, 0.72, 1.0), cyclist: new THREE.Color(0.55, 0.95, 0.5), person: new THREE.Color(1.0, 0.5, 0.38),
    static: new THREE.Color(0.5, 0.5, 0.47), focus: new THREE.Color(1.6, 1.0, 0.2),
  };
  const HEIGHT = { sedan: 1.5, hatch: 1.55, sports: 1.2, suv: 1.95, pickup: 1.9, van: 2.35, truck: 3.5, boxtruck: 3.2, bus: 3.2, schoolbus: 3.0, bike: 1.8 };
  let boxN = 0, focusT = 0, focusObj = null;
  const pushBox = (x, y, rot, hl, hw, h, col) => {
    if (boxN >= MAX_BOX) return;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const c = [[hl, hw], [hl, -hw], [-hl, -hw], [-hl, hw]].map(([a, b]) => [x + cs * a - sn * b, y + sn * a + cs * b]);
    let o = boxN * 24 * 3;
    const v = (p, z) => { boxPos[o] = p[0]; boxPos[o + 1] = z; boxPos[o + 2] = -p[1]; boxCol[o] = col.r; boxCol[o + 1] = col.g; boxCol[o + 2] = col.b; o += 3; };
    for (let k = 0; k < 4; k++) {
      const a = c[k], b = c[(k + 1) % 4];
      v(a, 0.06); v(b, 0.06); v(a, h); v(b, h); v(a, 0.06); v(a, h);
    }
    boxN++;
  };
  // What the planner is reacting to: a pedestrian stepping out, the school
  // bus, or the lead vehicle in our lane.
  function pickFocus() {
    if (sim.mode !== 'auto' || sim.autoState !== 'lane' || !sim.route) return null;
    const cp = sim.car.position;
    const j = sim.jay.find((q) => q.pos.distanceTo(cp) < 45 && !q.done);
    if (j) return { jay: j };
    if (sim.wait?.reason === 'bus') return { bus: true };
    let best = null, bs = Infinity;
    sim.trafficAt().forEach((c) => {
      if (c.pos.distanceTo(cp) > 60) return;
      const pr = sim._project(c.pos, sim.station + 2, sim.station + 55);
      if (!pr || Math.abs(pr[1] - sim.latitude) > 1.9 || c.dir.dot(pr[2]) < 0.6) return;
      if (pr[0] < bs) { bs = pr[0]; best = c; }
    });
    return best ? { car: best.id ?? best } : null;
  }
  function drawBoxes() {
    boxN = 0;
    const cp = sim.car.position;
    const traffic = sim.trafficAt();
    let tether = null;
    traffic.forEach((c, i) => {
      if (Math.abs(c.pos.x - cp.x) > 60 || Math.abs(c.pos.y - cp.y) > 60) return;
      const isFocus = focusObj && focusObj.car === (c.id ?? c);
      if (isFocus) tether = c.pos;
      pushBox(c.pos.x, c.pos.y, c.rot, c.L / 2 + 0.1, c.W / 2 + 0.1, HEIGHT[c.kind] || 1.6, isFocus ? CLS.focus : c.kind === 'bike' ? CLS.cyclist : CLS.vehicle);
    });
    sim.pedsAt().forEach((q) => { if (q.pos.distanceTo(cp) < 30) pushBox(q.pos.x, q.pos.y, q.rot, 0.35, 0.35, 1.85, CLS.person); });
    sim.jay.forEach((j) => {
      const f = focusObj && focusObj.jay === j;
      if (f) tether = j.pos;
      pushBox(j.pos.x, j.pos.y, Math.atan2(j.dir.y, j.dir.x), 0.38, 0.38, 1.9, f ? CLS.focus : CLS.person);
      if (j.dog) pushBox(j.dog.x, j.dog.y, Math.atan2(j.dir.y, j.dir.x), 0.45, 0.2, 0.7, f ? CLS.focus : CLS.person);
    });
    sim.bodies.forEach((b) => {
      if (b.kind === 'cone' || Math.abs(b.pos.x - cp.x) > 28 || Math.abs(b.pos.y - cp.y) > 28) return;
      pushBox(b.pos.x, b.pos.y, b.rot, b.hw + 0.05, b.hh + 0.05, HEIGHT[b.src.vkind] || 1.6, b.moving ? CLS.focus : CLS.static);
    });
    const SB = sim.schoolBus;
    if (SB.pos.distanceTo(cp) < 60) {
      const f = focusObj && focusObj.bus;
      if (f) tether = SB.pos;
      pushBox(SB.pos.x, SB.pos.y, SB.rot, SB.L / 2 + 0.1, SB.W / 2 + 0.1, 3.1, f ? CLS.focus : CLS.static);
    }
    let n = boxN * 24;
    if (tether) {
      const nose = cp.clone().addScaledVector(new THREE.Vector2(Math.cos(sim.car.rotation), Math.sin(sim.car.rotation)), 2.5);
      boxPos.set([nose.x, 1.0, -nose.y, tether.x, 1.0, -tether.y], n * 3);
      boxCol.set([CLS.focus.r * 0.5, CLS.focus.g * 0.5, CLS.focus.b * 0.5, CLS.focus.r, CLS.focus.g, CLS.focus.b], n * 3);
      n += 2;
    }
    boxGeo.setDrawRange(0, n);
    boxGeo.attributes.position.needsUpdate = true;
    boxGeo.attributes.color.needsUpdate = true;
  }

  // Stop fence: a translucent wall on the line the car is holding for.
  const fenceTex = (() => {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.06, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0.02)');
    g.fillStyle = grad; g.fillRect(0, 0, 4, 64);
    const t = new THREE.CanvasTexture(c);
    return t;
  })();
  const fence = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ map: fenceTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  fence.renderOrder = 5;
  fence.visible = false;
  scene.add(fence);
  const FENCE = { red: new THREE.Color(1.6, 0.25, 0.18), stop: new THREE.Color(1.6, 0.25, 0.18), bus: new THREE.Color(1.6, 0.25, 0.18), yield: new THREE.Color(1.6, 1.0, 0.2) };

  // ---- autonomy overlays
  const routeMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.1, depthWrite: false }));
  routeMesh.position.y = 0.035; routeMesh.renderOrder = 2;
  const planMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, depthWrite: false }));
  planMesh.position.y = 0.05; planMesh.renderOrder = 3;
  const fwdMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 0.95, 0.92), toneMapped: false, depthWrite: false }));
  const revMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.3, 0.26), toneMapped: false, depthWrite: false }));
  fwdMesh.position.y = revMesh.position.y = 0.06; fwdMesh.renderOrder = revMesh.renderOrder = 3;
  const latticeGeo = new THREE.BufferGeometry();
  const lattice = new THREE.Points(latticeGeo, new THREE.PointsMaterial({ color: 0xbdbcb6, size: 0.32, transparent: true, opacity: 0.55, depthWrite: false }));
  lattice.position.y = 0.06;
  scene.add(routeMesh, planMesh, fwdMesh, revMesh, lattice);
  let routeVersion = -1, planRef = null, latticeRef = null, manRef = null;
  const speedCol = [new THREE.Color(1.3, 0.28, 0.2), new THREE.Color(1.1, 0.68, 0.14), new THREE.Color(0.95, 0.93, 0.85)];

  // ---- post-processing: bloom on lights only
  let composer = null, bloom = null;
  if (!lowPower) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.45, 0.35, 0.96);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  // ---- time of day: a full day every two minutes, or pinned to day / night.
  // clock is in hours; the sun is up from 05:30 to 19:30.
  const DAY_SECONDS = 120;
  const tod = { mode: 'cycle', clock: 15.2 };
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const sunDir = new THREE.Vector3(), moonDirLight = new THREE.Vector3(0.45, 0.6, 0.66).normalize();
  const fogDay = new THREE.Color(0xa9b3bb), fogNight = new THREE.Color(0x121824), fogDusk = new THREE.Color(0x8a6a5c);
  const sunWarm = new THREE.Color(0xffa860), sunNoon = new THREE.Color(0xfff0dc), moonCol = new THREE.Color(0xa9bfe6);
  const hemiDay = new THREE.Color(0xdde5f0), hemiNight = new THREE.Color(0x7688b8), hemiDusk = new THREE.Color(0xe0b89c);
  let dayK = 1, lightsK = 0, moonK = 0, twi = 0;
  const applyTime = () => {
    const c = tod.clock;
    // Sun position: rises in the east, peaks ~60 degrees up in the south, sets in the west.
    const u = (c - 5.5) / 14;
    const el = u >= 0 && u <= 1 ? Math.sin(Math.PI * u) : -Math.sin(Math.PI * (((c - 19.5 + 24) % 24) / 10));
    const sinE = el * 0.87;
    const cosE = Math.sqrt(1 - sinE * sinE);
    const az = Math.PI * Math.min(1, Math.max(0, u));
    sunDir.set(Math.cos(az) * cosE, sinE, Math.sin(az) * cosE * 0.8).normalize(); // three: +z is south
    dayK = smooth(-0.1, 0.18, sinE);
    twi = Math.exp(-(((sinE - 0.02) / 0.13) ** 2));
    lightsK = 1 - smooth(0.02, 0.22, sinE);
    moonK = 1 - smooth(-0.25, -0.06, sinE);
    uniforms.uNight.value = lightsK;
    skyUni.uSun.value.copy(sunDir);
    skyUni.uTwi.value = twi;
    skyUni.uDay.value = dayK;
    scene.fog.color.copy(fogNight).lerp(fogDay, dayK).lerp(fogDusk, twi * 0.45);
    scene.background.copy(scene.fog.color);
    stars.material.opacity = (1 - dayK) ** 2 * 0.9;
    moon.material.opacity = 1 - dayK;
    stars.visible = moon.visible = dayK < 0.95;
    // Moonlit nights are blue and readable, not black.
    hemi.intensity = 1.05 + 0.45 * dayK;
    hemi.color.copy(hemiNight).lerp(hemiDay, dayK).lerp(hemiDusk, twi * 0.35);
    if (sinE > -0.08) {
      sun.intensity = 3.0 * smooth(-0.08, 0.2, sinE);
      sun.color.copy(sunWarm).lerp(sunNoon, smooth(0.05, 0.4, sinE));
      SUN_OFFSET.copy(sunDir).multiplyScalar(200);
    } else {
      sun.intensity = 1.1 * moonK;
      sun.color.copy(moonCol);
      SUN_OFFSET.copy(moonDirLight).multiplyScalar(200);
    }
    lampHeadMat.emissiveIntensity = 0.15 + 1.6 * lightsK;
    poolMat.opacity = 0.42 * lightsK;
    beams.forEach((b) => { b.intensity = 60 + 260 * lightsK; });
    lampLights.forEach((l) => { l.intensity = 90 * lightsK; });
    whiteMat.emissiveIntensity = 0.16 * lightsK;
    renderer.toneMappingExposure = 1.0 + 0.3 * (1 - dayK);
    if (bloom) bloom.strength = 0.2 + 0.3 * lightsK;
  };

  // The eight street lamps nearest the car cast real light (the rest are glow
  // sprites), so kerbs, cars and facades pick up pools of sodium light.
  const lampLights = [];
  if (!lowPower) {
    for (let k = 0; k < 8; k++) {
      const l = new THREE.PointLight(0xffc98a, 0, 26, 1.6);
      scene.add(l);
      lampLights.push(l);
    }
  }
  let lampT = 1;
  const placeLampLights = (cp) => {
    if (!lampLights.length) return;
    const near = [];
    allLamps.forEach((l) => { const d = (l.pos.x - cp.x) ** 2 + (l.pos.y - cp.y) ** 2; if (d < 70 * 70) near.push([d, l]); });
    near.sort((a, b) => a[0] - b[0]);
    lampLights.forEach((L, k) => {
      const e = near[k];
      if (!e) { L.visible = false; return; }
      const l = e[1];
      L.visible = true;
      L.position.copy(tv(l.pos.x + l.facing.x * 1.5, l.pos.y + l.facing.y * 1.5, l.mast ? 10.5 : 6.8));
    });
  };
  applyTime();

  const cam = { mode: 'chase', yaw: 0, pitch: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), init: false, shake: 0 };
  const headOn = new THREE.Color(), tailDim = new THREE.Color();
  const tailBrake = new THREE.Color(4, 0.12, 0.08);

  function update(dt) {
    if (tod.mode === 'cycle') tod.clock = (tod.clock + (dt * 24) / DAY_SECONDS) % 24;
    else {
      // Pinned: run the clock forward quickly to the chosen time.
      const target = tod.mode === 'day' ? 13 : 23.5;
      const ahead = (target - tod.clock + 24) % 24;
      tod.clock = ahead < 0.05 ? target : (tod.clock + Math.min(ahead, dt * 9)) % 24;
    }
    applyTime();
    const night = lightsK;
    const car = sim.car;
    const cp = car.position;
    lampT += dt;
    if (lampT > 0.25) { lampT = 0; placeLampLights(cp); }

    // Route, plan, lattice, recovery manoeuvre.
    if (sim.version !== routeVersion && sim.route) {
      routeVersion = sim.version;
      routeMesh.geometry.dispose();
      routeMesh.geometry = ribbon(sim.route.pts, 0.45, -1.85);
    }
    const lane = sim.mode === 'auto' && sim.autoState === 'lane';
    if (sim.route) {
      const st = sim.route.station;
      let i0 = 0;
      while (i0 < st.length - 1 && st[i0] < sim.station - 5) i0++;
      const end = (sim.destination?.station ?? sim.station + 300) + 25;
      let i1 = i0;
      while (i1 < st.length - 1 && st[i1] < end) i1++;
      routeMesh.geometry.setDrawRange(i0 * 6, Math.max(0, (i1 - i0) * 6));
    }
    routeMesh.visible = lane && layers.route;
    if (sim.plannedPath !== planRef) {
      planRef = sim.plannedPath;
      planMesh.geometry.dispose();
      planMesh.geometry = planRef && planRef.length > 1 ? ribbon(planRef.map((p) => p.pos), 0.13) : new THREE.BufferGeometry();
      if (planRef && planRef.length > 1) {
        // Colour by planned speed against the limit: red where it plans to
        // stop, amber when slowing, pale at cruise.
        const lim = Math.max(3, sim.speedLimit || 10);
        const col = new Float32Array(planRef.length * 6);
        planRef.forEach((p, i) => {
          const r = Math.min(1, Math.max(0, (p.velocity || 0) / lim));
          const c = r < 0.5 ? speedCol[0].clone().lerp(speedCol[1], r * 2) : speedCol[1].clone().lerp(speedCol[2], (r - 0.5) * 2);
          col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
        });
        planMesh.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
      }
    }
    planMesh.visible = lane && layers.plan;
    if (sim.lattice !== latticeRef) {
      latticeRef = sim.lattice;
      const pts = [];
      (latticeRef || []).forEach((row) => row.forEach((c) => pts.push(c.pos.x, 0, -c.pos.y)));
      latticeGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    }
    lattice.visible = lane && layers.lattice;
    const man = sim.maneuver;
    if (man !== manRef) {
      manRef = man;
      fwdMesh.geometry.dispose(); revMesh.geometry.dispose();
      fwdMesh.geometry = new THREE.BufferGeometry(); revMesh.geometry = new THREE.BufferGeometry();
      if (man) {
        // Forward runs in white, reverse runs in red, drawn at the car's centre.
        const runs = { 1: [], '-1': [] };
        let cur = null;
        man.path.forEach((p) => {
          const c = { x: p.x + Math.cos(p.th) * 1.43, y: p.y + Math.sin(p.th) * 1.43 };
          if (!cur || cur.dir !== p.dir) { cur = { dir: p.dir, pts: [] }; runs[p.dir].push(cur); }
          cur.pts.push(c);
        });
        const merged = (list) => {
          const geos = list.filter((r) => r.pts.length > 1).map((r) => ribbon(r.pts, 0.12));
          return geos.length ? mergeGeometries(geos, false) : new THREE.BufferGeometry();
        };
        fwdMesh.geometry = merged(runs[1]);
        revMesh.geometry = merged(runs['-1']);
      }
    }

    syncBodies();

    // Perception boxes (10 Hz focus pick, every frame for positions).
    boxes.visible = layers.perception;
    if (layers.perception) {
      focusT += dt;
      if (focusT > 0.1) { focusT = 0; focusObj = pickFocus(); }
      drawBoxes();
    }
    const w = sim.wait;
    fence.visible = false;
    if (layers.perception && lane && w && w.at != null && w.dist < 70 && FENCE[w.reason] && sim.lanePath) {
      const [q] = sim.lanePath.sampleStations(w.at, 1, 0);
      if (q) {
        fence.visible = true;
        fence.position.copy(tv(q.pos.x, q.pos.y, 0.02));
        fence.rotation.y = q.rot + Math.PI / 2;
        fence.scale.set(7.4, 1.5, 1);
        fence.material.color.copy(FENCE[w.reason]);
      }
    }

    // Debug layers, refreshed a few times a second while visible.
    layerT += dt;
    costmap.visible = layers.costmap;
    lidar.visible = layers.lidar;
    preds.visible = layers.predictions;
    search.visible = layers.search && !!sim.maneuver;
    if (layerT > 0.12) {
      layerT = 0;
      if (layers.costmap) drawCostmap();
      if (layers.lidar) drawLidar();
      if (layers.predictions) drawPredictions();
    }
    if (layers.search && sim.maneuver && sim.maneuver.explored !== searchRef) {
      searchRef = sim.maneuver.explored;
      const e = searchRef || [];
      const pts = [];
      for (let i = 0; i < e.length; i += 2) pts.push(e[i], 0, -e[i + 1]);
      searchGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    }

    // Ducks paddle round the pond.
    if (ducks) {
      const P = ducks.P, t = sim.simTime;
      ducks.params.forEach((q, k) => {
        const a = q.ph + t * q.w;
        const x = P.x + Math.cos(a) * P.rx * q.r, y = P.y + Math.sin(a) * P.ry * q.r;
        const heading = Math.atan2(Math.cos(a) * P.ry * q.w, -Math.sin(a) * P.rx * q.w);
        const bob = Math.sin(t * 3 + k) * 0.02;
        setInst(ducks.body, k, x, y, 0.3 + bob, heading, 0.32, 0.17, 0.2);
        const hx = x + Math.cos(heading) * 0.27, hy = y + Math.sin(heading) * 0.27;
        setInst(ducks.head, k, hx, hy, 0.5 + bob, heading, 0.11, 0.11, 0.11);
        setInst(ducks.beak, k, hx + Math.cos(heading) * 0.13, hy + Math.sin(heading) * 0.13, 0.49 + bob, heading, 1, 1, 1);
      });
      ducks.body.instanceMatrix.needsUpdate = ducks.head.instanceMatrix.needsUpdate = ducks.beak.instanceMatrix.needsUpdate = true;
    }

    // School bus: stop arm swings out, reds alternate while loading.
    const busOn = sim.schoolBus.active;
    armPivot.rotation.y += ((busOn ? -Math.PI / 2 : 0) - armPivot.rotation.y) * Math.min(1, dt * 6);
    const flash = Math.sin(sim.simTime * Math.PI * 4) > 0;
    sbLights.forEach(({ m, side }) => m.material.color.setRGB(busOn && (flash === side > 0) ? 4 : 0.15, busOn && (flash === side > 0) ? 0.2 : 0.02, 0.02));

    // Jaywalkers and dogs.
    [jayBody, jayHead, dogBody, dogHead].forEach((m) => { m.count = 0; });
    sim.jay.forEach((j, k) => {
      if (k > 1) return;
      const rot = Math.atan2(j.dir.y, j.dir.x);
      const bob = j.paused ? 0 : Math.abs(Math.sin(j.t * 5)) * 0.05;
      setInst(jayBody, k, j.pos.x, j.pos.y, 0.8 + bob, rot, 1, 1, 1);
      setInst(jayHead, k, j.pos.x, j.pos.y, 1.77 + bob, rot, 1, 1, 1);
      jayBody.count = jayHead.count = k + 1;
      if (j.dog) {
        setInst(dogBody, k, j.dog.x, j.dog.y, 0.38, rot, 1, 1, 1);
        setInst(dogHead, k, j.dog.x + Math.cos(rot) * 0.42, j.dog.y + Math.sin(rot) * 0.42, 0.52, rot, 1, 1, 1);
        dogBody.count = dogHead.count = k + 1;
      }
    });
    [jayBody, jayHead, dogBody, dogHead].forEach((m) => { m.instanceMatrix.needsUpdate = true; });

    // Signals.
    city.signals.forEach((s, i) => {
      const [on, k] = SIG[signalState(s.node, s.axis, sim.simTime).colour];
      [0, 1, 2].forEach((j) => sigLamps.setColorAt(i * 3 + j, j === k ? on : OFF[j]));
    });
    sigLamps.instanceColor.needsUpdate = true;

    // Traffic and its lights.
    const traffic = sim.trafficAt();
    dynMeshes.forEach((dm) => {
      dm.idx.forEach((ai, j) => {
        const c = traffic[ai];
        const bob = dm.kind === 'bike' ? Math.sin(sim.simTime * 6 + ai) * 0.02 : 0;
        [dm.paint, dm.dark, dm.pale].forEach((m) => m && setInst(m, j, c.pos.x, c.pos.y, bob, c.rot, 1, 1, 1));
      });
      [dm.paint, dm.dark, dm.pale].forEach((m) => { if (m) m.instanceMatrix.needsUpdate = true; });
    });
    headOn.setRGB(1.3, 1.25, 1.1).multiplyScalar(0.35 + night * 0.9);
    tailDim.setRGB(0.8, 0.02, 0.02).multiplyScalar(0.4 + night * 0.8);
    let hi = 0, ti = 0;
    traffic.forEach((c) => {
      const P = kindParts(c.kind);
      const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
      const put = (mesh, i, [lx, ly, lz]) => setInst(mesh, i, c.pos.x + cs * lx + sn * lz, c.pos.y + sn * lx - cs * lz, ly - 0.065, c.rot, 1, 1, 1);
      P.heads.forEach((h) => { put(heads, hi, h); heads.setColorAt(hi++, headOn); });
      P.tails.forEach((t) => { put(tails, ti, t); tails.setColorAt(ti++, c.braking ? tailBrake : tailDim); });
    });
    // Indicators flash at 1.5 Hz.
    const phase = Math.sin(sim.simTime * Math.PI * 3) > 0;
    let ii = 0;
    traffic.forEach((c) => {
      if (c.kind === 'bike') return;
      const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
      [[c.L / 2, 1], [c.L / 2, -1], [-c.L / 2, 1], [-c.L / 2, -1]].forEach(([lx, side]) => {
        const lz = side * (c.W / 2 - 0.05);
        setInst(indicators, ii, c.pos.x + cs * lx + sn * lz, c.pos.y + sn * lx - cs * lz, 0.95, c.rot, 1, 1, 1);
        // Local +z is the car's right-hand side.
        const on = phase && ((c.blinker === 'right' && side > 0) || (c.blinker === 'left' && side < 0));
        indicators.setColorAt(ii++, on ? blinkOn : blinkOff);
      });
    });
    indicators.instanceMatrix.needsUpdate = true;
    if (indicators.instanceColor) indicators.instanceColor.needsUpdate = true;
    // Headlight pools on the road ahead of every vehicle at night.
    beamMat.opacity = 0.45 * night;
    beamPools.visible = night > 0.05;
    if (beamPools.visible) {
      traffic.forEach((c, i) => {
        const reach = c.kind === 'bike' ? 2.5 : c.L / 2 + 5;
        setInst(beamPools, i, c.pos.x + Math.cos(c.rot) * reach, c.pos.y + Math.sin(c.rot) * reach, 0.04, c.rot, c.kind === 'bike' ? 3 : 10, 1, c.kind === 'bike' ? 2 : 6);
      });
      beamPools.instanceMatrix.needsUpdate = true;
    }
    heads.instanceMatrix.needsUpdate = tails.instanceMatrix.needsUpdate = true;
    if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
    if (tails.instanceColor) tails.instanceColor.needsUpdate = true;

    // Pedestrians, with a small walking bob.
    sim.pedsAt().forEach((p, i) => {
      const bob = p.moving ? Math.abs(Math.sin(p.phase * 4.2)) * 0.05 : 0;
      setInst(pedBody, i, p.pos.x, p.pos.y, 0.8 + bob, p.rot, 1, 1, 1);
      setInst(pedHead, i, p.pos.x, p.pos.y, 1.77 + bob, p.rot, 1, 1, 1);
    });
    pedBody.instanceMatrix.needsUpdate = pedHead.instanceMatrix.needsUpdate = true;

    // Ego, with brake, reverse and headlights.
    const onKerb = city.pads.some((b) => cp.x > b.x0 && cp.x < b.x1 && cp.y > b.y0 && cp.y < b.y1);
    ego.position.copy(tv(cp.x, cp.y, onKerb ? 0.15 : 0));
    ego.rotation.y = car.rotation;
    const brake = sim.lights.brake, rev = sim.lights.reverse;
    egoTails.forEach((m) => m.material.color.setRGB(brake ? 4 : 0.7 + night * 0.6, brake ? 0.1 : 0.02, brake ? 0.06 : 0.02));
    egoRev.forEach((m) => m.material.color.setRGB(rev ? 3 : 0.08, rev ? 3 : 0.08, rev ? 3 : 0.08));
    egoHeads.forEach((m) => m.material.color.setRGB(1.0 + night * 0.8, 0.97 + night * 0.75, 0.9 + night * 0.65));
    halo.material.color.set(sim.mode === 'manual' ? 0xecebe8 : ACCENT);
    const bl = sim.blinker;
    egoBlink.forEach(({ m, side }) => {
      const on = phase && (bl === 'hazard' || (bl === 'right' && side > 0) || (bl === 'left' && side < 0));
      m.material.color.copy(on ? blinkOn : blinkOff);
    });

    // Landmark highlight.
    const dest = sim.destination?.index;
    landmarkLines.forEach((l, k) => { l.material.color.setHex(k === dest ? ACCENT : 0x8c8b86); l.material.opacity = k === dest ? 1 : 0.5; });

    // Camera.
    const heading = car.rotation;
    const target = new THREE.Vector3(), look = new THREE.Vector3();
    const yaw = heading + Math.PI + cam.yaw;
    if (cam.mode === 'chase') {
      target.copy(tv(cp.x + Math.cos(yaw) * 13.5, cp.y + Math.sin(yaw) * 13.5, 5.8 + cam.pitch * 12));
      look.copy(tv(cp.x + Math.cos(heading) * 9, cp.y + Math.sin(heading) * 9, 1.2));
    } else {
      target.copy(tv(cp.x + Math.cos(yaw) * 24, cp.y + Math.sin(yaw) * 24, 72 + cam.pitch * 40));
      look.copy(tv(cp.x + Math.cos(heading) * 12, cp.y + Math.sin(heading) * 12, 0));
    }
    const k = cam.init ? 1 - Math.exp(-dt * 3.4) : 1;
    cam.pos.lerp(target, k);
    cam.look.lerp(look, k);
    cam.init = true;
    camera.position.copy(cam.pos);
    if (cam.shake > 0) {
      cam.shake = Math.max(0, cam.shake - dt * 2.5);
      camera.position.x += (Math.random() - 0.5) * cam.shake * 0.5;
      camera.position.y += (Math.random() - 0.5) * cam.shake * 0.3;
    }
    camera.lookAt(cam.look);

    sky.position.copy(camera.position);
    stars.position.copy(camera.position);
    moon.position.copy(camera.position).addScaledVector(MOON_DIR, 860);
    moon.lookAt(camera.position);
    sun.target.position.copy(tv(cp.x, cp.y));
    sun.position.copy(sun.target.position).add(SUN_OFFSET);
  }

  const v3 = new THREE.Vector3();
  function project(x, y, h) {
    v3.copy(tv(x, y, h)).project(camera);
    return { x: (v3.x + 1) / 2, y: (1 - v3.y) / 2, behind: v3.z > 1 };
  }

  function resize(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    if (composer) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
    }
  }

  function render() {
    if (composer) composer.render(); else renderer.render(scene, camera);
  }

  const setTimeMode = (m) => { tod.mode = m; };
  const clockTime = () => tod.clock;
  const setClock = (c) => { tod.clock = ((c % 24) + 24) % 24; };
  const shake = (amount = 1) => { cam.shake = Math.max(cam.shake, amount); };

  function dispose() {
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    composer?.dispose?.();
    renderer.dispose();
  }

  const setLayer = (name, on) => { layers[name] = on; };
  return { update, render, resize, dispose, project, cam, camera, setTimeMode, clockTime, setClock, shake, setLayer, layers };
}

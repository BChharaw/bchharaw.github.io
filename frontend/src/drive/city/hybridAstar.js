// Hybrid A* (Dolgov, Thrun, Montemerlo, Diebel 2008) for low-speed recovery
// manoeuvres: getting the car from wherever it ended up back to a lane pose,
// using reverse gear and multi-point turns when it has to.
//
// Dash's kinematic car moves its centre along its heading (not the rear axle,
// as a textbook bicycle model would), so the search state is the body centre
// to match; poses come in and go out as rear-axle poses like the rest of the sim.
// Collision checking uses three discs along the body against a distance field
// built from the obstacles; the heuristic is the larger of straight-line
// distance and an obstacle-aware 2D Dijkstra distance from the goal.

const RES = 0.5; // metres per grid cell
const HEADINGS = 72; // 5 degree bins
const WHEEL_BASE = 3.03;
const MAX_STEER = 0.45; // rad: the car's limit is 0.56; the rest is the tracking controller's authority
const STEP = 1.2; // metres per motion primitive
const AXLE = 1.43; // rear axle to body centre
// Footprint relative to the body centre: 5.0 x 2.0 m (Dash's car).
const REAR = -2.5, FRONT = 2.5, HALF_W = 1.0;
const MARGIN = 0.25; // clearance kept around the body
// Obstacles are rasterised by cell centre, so anything thinner than a cell
// (lamp posts, trees, guardrails) could fall between centres and vanish.
// Grow every shape by a little over half a cell diagonal so it can't.
const GROW = RES * 0.72;
// Fast conservative test: three discs that cover the whole body.
const DISCS = [-1.53, 0, 1.53];
const DISC_R = 1.45;
// Exact test: points on the body outline (≤ 0.5 m apart) plus the centre line.
const OUTLINE = [];
for (let x = REAR; x <= FRONT + 1e-6; x += (FRONT - REAR) / 10) OUTLINE.push([x, HALF_W], [x, -HALF_W], [x, 0]);
for (let y = -HALF_W; y <= HALF_W + 1e-6; y += 0.5) OUTLINE.push([REAR, y], [FRONT, y]);
const STEERS = [-MAX_STEER, -MAX_STEER / 2, 0, MAX_STEER / 2, MAX_STEER];

const HW = 1.5; // heuristic weight: slightly greedy, much faster, near-optimal in practice
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

class Heap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const k = this.k, v = this.v;
    let i = k.length;
    k.push(key); v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v;
    const top = v[0];
    const lk = k.pop(), lv = v.pop();
    if (k.length) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= k.length) break;
        if (c + 1 < k.length && k[c + 1] < k[c]) c++;
        if (k[c] >= lk) break;
        k[i] = k[c]; v[i] = v[c]; i = c;
      }
      k[i] = lk; v[i] = lv;
    }
    return top;
  }
}

function buildGrid(start, goals, boxes, circles) {
  let x0 = start.x, x1 = start.x, y0 = start.y, y1 = start.y;
  goals.forEach((g) => { x0 = Math.min(x0, g.x); x1 = Math.max(x1, g.x); y0 = Math.min(y0, g.y); y1 = Math.max(y1, g.y); });
  const pad = 22;
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  const W = Math.min(260, Math.ceil((x1 - x0) / RES)), H = Math.min(260, Math.ceil((y1 - y0) / RES));
  const occ = new Uint8Array(W * H);
  for (let i = 0; i < W; i++) { occ[i] = 1; occ[(H - 1) * W + i] = 1; }
  for (let j = 0; j < H; j++) { occ[j * W] = 1; occ[j * W + W - 1] = 1; }
  boxes.forEach((b0) => {
    const b = { ...b0, hw: b0.hw + GROW, hh: b0.hh + GROW };
    const c = Math.cos(b.rot), s = Math.sin(b.rot);
    const ex = Math.abs(c) * b.hw + Math.abs(s) * b.hh, ey = Math.abs(s) * b.hw + Math.abs(c) * b.hh;
    const i0 = Math.max(0, Math.floor((b.x - ex - x0) / RES)), i1 = Math.min(W - 1, Math.ceil((b.x + ex - x0) / RES));
    const j0 = Math.max(0, Math.floor((b.y - ey - y0) / RES)), j1 = Math.min(H - 1, Math.ceil((b.y + ey - y0) / RES));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const dx = x0 + (i + 0.5) * RES - b.x, dy = y0 + (j + 0.5) * RES - b.y;
        const lx = dx * c + dy * s, ly = -dx * s + dy * c;
        if (Math.abs(lx) <= b.hw && Math.abs(ly) <= b.hh) occ[j * W + i] = 1;
      }
    }
  });
  circles.forEach((q0) => {
    const q = { ...q0, r: q0.r + GROW };
    const i0 = Math.max(0, Math.floor((q.x - q.r - x0) / RES)), i1 = Math.min(W - 1, Math.ceil((q.x + q.r - x0) / RES));
    const j0 = Math.max(0, Math.floor((q.y - q.r - y0) / RES)), j1 = Math.min(H - 1, Math.ceil((q.y + q.r - y0) / RES));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = x0 + (i + 0.5) * RES - q.x, dy = y0 + (j + 0.5) * RES - q.y;
      if (dx * dx + dy * dy <= q.r * q.r) occ[j * W + i] = 1;
    }
  });
  // Two-pass chamfer distance transform, in metres.
  const INF = 1e9;
  const dist = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) dist[k] = occ[k] ? 0 : INF;
  const D1 = RES, D2 = RES * Math.SQRT2;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i;
    let d = dist[k];
    if (i > 0) d = Math.min(d, dist[k - 1] + D1);
    if (j > 0) {
      d = Math.min(d, dist[k - W] + D1);
      if (i > 0) d = Math.min(d, dist[k - W - 1] + D2);
      if (i < W - 1) d = Math.min(d, dist[k - W + 1] + D2);
    }
    dist[k] = d;
  }
  for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) {
    const k = j * W + i;
    let d = dist[k];
    if (i < W - 1) d = Math.min(d, dist[k + 1] + D1);
    if (j < H - 1) {
      d = Math.min(d, dist[k + W] + D1);
      if (i < W - 1) d = Math.min(d, dist[k + W + 1] + D2);
      if (i > 0) d = Math.min(d, dist[k + W - 1] + D2);
    }
    dist[k] = d;
  }
  return { x0, y0, W, H, dist };
}

// Obstacle-aware distance-to-goal for every cell (multi-source Dijkstra).
function holonomic(grid, goals) {
  const { x0, y0, W, H, dist } = grid;
  const h = new Float32Array(W * H).fill(Infinity);
  const heap = new Heap();
  goals.forEach((g) => {
    const i = Math.floor((g.x - x0) / RES), j = Math.floor((g.y - y0) / RES);
    if (i >= 0 && j >= 0 && i < W && j < H) { h[j * W + i] = 0; heap.push(0, j * W + i); }
  });
  const nb = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  while (heap.size) {
    const k = heap.pop();
    const i = k % W, j = (k / W) | 0;
    const base = h[k];
    for (const [di, dj, c] of nb) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const nk = nj * W + ni;
      if (dist[nk] < 1.0) continue;
      const nv = base + c * RES;
      if (nv < h[nk]) { h[nk] = nv; heap.push(nv, nk); }
    }
  }
  return h;
}

const toCentre = (p) => ({ ...p, x: p.x + AXLE * Math.cos(p.th), y: p.y + AXLE * Math.sin(p.th) });

export function planManeuver({ start: start0, goals: goals0, boxes = [], circles = [], budgetMs = 400 }) {
  const start = toCentre(start0), goals = goals0.map(toCentre);
  const t0 = performance.now();
  const grid = buildGrid(start, goals, boxes, circles);
  const { x0, y0, W, H, dist } = grid;
  const hGrid = holonomic(grid, goals);

  const clearAt = (x, y) => {
    const i = Math.floor((x - x0) / RES), j = Math.floor((y - y0) / RES);
    if (i < 0 || j < 0 || i >= W || j >= H) return 0;
    return dist[j * W + i];
  };
  // Minimum clearance between the body outline and any obstacle, but only
  // computed exactly when something is actually near.
  const bodyClear = (x, y, th) => {
    const c = Math.cos(th), s = Math.sin(th);
    let fast = Infinity;
    for (const o of DISCS) fast = Math.min(fast, clearAt(x + c * o, y + s * o) - DISC_R);
    if (fast >= MARGIN) return fast;
    let m = Infinity;
    for (const [px, py] of OUTLINE) m = Math.min(m, clearAt(x + c * px - s * py, y + s * px + c * py));
    return m;
  };
  const free = (x, y, th, need = MARGIN) => bodyClear(x, y, th) >= need;
  const heur = (x, y) => {
    const i = Math.floor((x - x0) / RES), j = Math.floor((y - y0) / RES);
    let e = Infinity;
    goals.forEach((g) => { e = Math.min(e, Math.hypot(g.x - x, g.y - y)); });
    const hv = i >= 0 && j >= 0 && i < W && j < H ? hGrid[j * W + i] : Infinity;
    return Number.isFinite(hv) ? Math.max(e, hv) : e * 1.5;
  };
  const key = (x, y, th) => {
    const i = Math.floor((x - x0) / RES), j = Math.floor((y - y0) / RES);
    const t = ((Math.round((wrap(th) + Math.PI) / (2 * Math.PI) * HEADINGS) % HEADINGS) + HEADINGS) % HEADINGS;
    return (j * W + i) * HEADINGS + t;
  };
  const atGoal = (x, y, th) => goals.findIndex((g) => Math.hypot(g.x - x, g.y - y) < 0.8 && Math.abs(wrap(g.th - th)) < 0.14);

  // After a crash the start pose may already be touching something. Near the
  // start the required clearance stays at what the car has now for the first
  // 3 m (inside an obstacle the distance field just reads 0), then ramps up
  // to the full margin, so it can back away but can't creep along it.
  const startClear = bodyClear(start.x, start.y, start.th);
  const escapeNeed = Math.min(MARGIN, Math.max(-0.4 - GROW, startClear - 0.1));
  const nodes = [{ x: start.x, y: start.y, th: start.th, g: 0, dir: 0, steer: 0, parent: -1, depth: 0, len: 0 }];
  const nStates = W * H * HEADINGS;
  const closed = new Uint8Array(nStates);
  const bestG = new Float32Array(nStates).fill(Infinity);
  // Near the start, moves are short (a parallel-parked car may have 40 cm to
  // play with), so those states live on a much finer lattice of their own.
  const FINE_DEPTH = startClear < 1.0 ? 12 : 0;
  const fineKey = (x, y, th) => `${Math.round(x / 0.1)},${Math.round(y / 0.1)},${Math.round(wrap(th) / 0.0175)}`;
  const fineClosed = new Set();
  const fineBest = new Map();
  const heap = new Heap();
  heap.push(heur(start.x, start.y) * HW, 0);
  let expansions = 0, found = -1, goalIdx = -1;

  while (heap.size) {
    if ((expansions & 255) === 0 && performance.now() - t0 > budgetMs) break;
    const ni = heap.pop();
    const n = nodes[ni];
    if (n.depth < FINE_DEPTH) {
      const fk = fineKey(n.x, n.y, n.th);
      if (fineClosed.has(fk)) continue;
      fineClosed.add(fk);
    } else {
      const k = key(n.x, n.y, n.th);
      if (closed[k]) continue;
      closed[k] = 1;
    }
    expansions++;
    const gi = atGoal(n.x, n.y, n.th);
    if (gi >= 0) { found = ni; goalIdx = gi; break; }
    // Short, careful moves near the start (e.g. parallel parked bumper to
    // bumper), longer ones once there's room.
    const need = n.len < 3 ? escapeNeed : Math.min(MARGIN, escapeNeed + 0.1 * (n.len - 3));
    const step = n.depth < FINE_DEPTH ? 0.25 : n.depth < FINE_DEPTH + 4 ? 0.6 : STEP;
    const sub = Math.max(2, Math.round(step / 0.15));

    for (const dir of [1, -1]) {
      for (const steer of STEERS) {
        let x = n.x, y = n.y, th = n.th, ok = true;
        const ds = (dir * step) / sub;
        for (let s = 0; s < sub; s++) {
          th += (ds * Math.tan(steer)) / WHEEL_BASE;
          x += ds * Math.cos(th);
          y += ds * Math.sin(th);
          if (!free(x, y, th, need)) { ok = false; break; }
        }
        if (!ok) continue;
        const fine = n.depth + 1 < FINE_DEPTH;
        const nk = fine ? fineKey(x, y, th) : key(x, y, th);
        if (fine ? fineClosed.has(nk) : closed[nk]) continue;
        const g = n.g + step * (dir > 0 ? 1 : 1.7)
          + (n.dir !== 0 && dir !== n.dir ? 6 : 0)
          + step * (0.4 * Math.abs(steer)) + 1.6 * Math.abs(steer - n.steer);
        if (fine) {
          if (fineBest.get(nk) <= g) continue;
          fineBest.set(nk, g);
        } else {
          if (bestG[nk] <= g) continue;
          bestG[nk] = g;
        }
        nodes.push({ x, y, th, g, dir, steer, parent: ni, depth: n.depth + 1, step, sub, len: n.len + step });
        heap.push(g + HW * heur(x, y), nodes.length - 1);
      }
    }
  }

  const ms = performance.now() - t0;
  if (found < 0) return { ok: false, expansions, ms };

  // Rebuild a dense path by re-integrating each primitive.
  const chain = [];
  for (let i = found; i >= 0; i = nodes[i].parent) chain.push(nodes[i]);
  chain.reverse();
  const path = [{ x: chain[0].x - AXLE * Math.cos(chain[0].th), y: chain[0].y - AXLE * Math.sin(chain[0].th), th: chain[0].th, dir: chain[1] ? chain[1].dir : 1, steer: chain[1] ? chain[1].steer : 0 }];
  for (let c = 1; c < chain.length; c++) {
    const p = chain[c - 1], n = chain[c];
    let x = p.x, y = p.y, th = p.th;
    const ds = (n.dir * n.step) / n.sub;
    for (let s = 0; s < n.sub; s++) {
      th += (ds * Math.tan(n.steer)) / WHEEL_BASE;
      x += ds * Math.cos(th);
      y += ds * Math.sin(th);
      path.push({ x: x - AXLE * Math.cos(th), y: y - AXLE * Math.sin(th), th, dir: n.dir, steer: n.steer });
    }
  }
  let changes = 0;
  for (let i = 1; i < path.length; i++) if (path[i].dir !== path[i - 1].dir) changes++;
  // A thinned sample of what the search explored, for the debug view.
  const explored = [];
  const step = Math.max(1, Math.floor(nodes.length / 2500));
  for (let i = 0; i < nodes.length; i += step) explored.push(nodes[i].x, nodes[i].y);
  return { ok: true, path, goal: goalIdx, expansions, ms, changes, explored };
}

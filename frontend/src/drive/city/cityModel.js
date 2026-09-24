// Procedural city, in Dash's world frame (x east, y north, metres).
//
// Street grid with three road types:
//   avenue  divided, two lanes each way plus a bike lane (the two ring roads)
//   street  one lane each way with parking on both sides
//   oneway  a single lane with parking on both sides
// Two intersections are roundabouts; every other junction with three or more
// legs is signalised. Everything is deterministic so every visitor gets the
// same city.
import { Vector2 } from 'three';

export const N = 6; // intersections per side
export const B = 100; // block pitch, centre line to centre line
export const LANE = 3.7;
export const EXTENT = (N - 1) * B;
export const CORNER_R = 15; // turn radius for routes

// Street lines aren't evenly spaced, so blocks vary in size.
export const XS = [0, 92, 207, 300, 413, 500];
export const YS = [0, 110, 202, 318, 404, 500];
export const gx = (i) => (i < 0 ? -B : i > N - 1 ? EXTENT + B : XS[i]);
export const gy = (j) => (j < 0 ? -B : j > N - 1 ? EXTENT + B : YS[j]);
const nearestLine = (v, arr) => { let b = 0; arr.forEach((a, i) => { if (Math.abs(a - v) < Math.abs(arr[b] - v)) b = i; }); return b; };
const segIndex = (v, arr) => { let k = 0; for (let i = 0; i < arr.length - 1; i++) if (arr[i] <= v) k = i; return k; };

export const TYPES = {
  // planOffset: where the planner's road centre line sits, relative to the
  // street centre line, positive to the right of travel.
  avenue: { half: 11.0, walk: 3.5, parking: false, planOffset: 4.5 },
  street: { half: 7.2, walk: 3.0, parking: true, planOffset: 0 },
  oneway: { half: 5.4, walk: 3.0, parking: true, planOffset: -1.85 },
  ramp: { half: 5.5, walk: 0, parking: false, planOffset: -1.85 },
  highway: { half: 11, walk: 0, parking: false, planOffset: 4.7 },
};

// Ring highway outside the city: divided, two lanes each way, with an
// auxiliary lane on the inside shoulder for the ramps. Distances from the
// highway centre line.
export const HW = { offset: 110, R: 55, half: 11, median: 1.0, laneIn: 2.85, laneOut: 6.55, plan: 4.7, aux: 10.25, rampR: 42 };
// Avenue cross-section, distance from the centre line.
export const AVE = { median: 0.8, inner: 2.65, divider: 4.5, outer: 6.35, edge: 8.2, bike: 9.1 };
export const RB = { island: 6.5, centre: 10.2, outer: 13.9, clear: 17 };

export const DIRS = [new Vector2(1, 0), new Vector2(0, 1), new Vector2(-1, 0), new Vector2(0, -1)];
export const right = (d) => new Vector2(d.y, -d.x);

export const nodeId = (i, j) => j * N + i;
export const nodeIJ = (id) => [id % N, Math.floor(id / N)];
export const nodePos = (id) => { const [i, j] = nodeIJ(id); return new Vector2(gx(i), gy(j)); };
export const adjacent = (a, b) => { const [ai, aj] = nodeIJ(a), [bi, bj] = nodeIJ(b); return Math.abs(ai - bi) + Math.abs(aj - bj) === 1; };
export const inGrid = (i, j) => i >= 0 && j >= 0 && i < N && j < N;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- network

export const RINGS = [[0, N - 1], [1, N - 2]];
const ringSegs = new Set();
RINGS.forEach(([a, b]) => {
  for (let i = a; i < b; i++) {
    ringSegs.add(`h${i},${a}`); ringSegs.add(`h${i},${b}`);
    ringSegs.add(`v${a},${i}`); ringSegs.add(`v${b},${i}`);
  }
});
export const ROUNDABOUTS = new Set([nodeId(2, 2), nodeId(3, 3)]);
// One-way segments and the direction (index into DIRS) they allow.
const ONEWAY = { 'v2,3': 1, 'v2,4': 1, 'h3,2': 0, 'h4,2': 0 };

// Corners in clockwise order (SW, NW, NE, SE). Each has an off-ramp arriving
// from the highway and an on-ramp leaving for it, as extra junction legs. The
// ramps only serve the clockwise carriageway: driving on the right, that's the
// one whose right-hand side faces the city.
export const CORNERS = [0, N * (N - 1), N * N - 1, N - 1];
const CC = EXTENT / 2;
// Rotate a point / direction index clockwise by k quarter turns about the city centre.
export const rotW = (p, k) => { let x = p.x - CC, y = p.y - CC; for (let i = 0; i < k; i++) [x, y] = [y, -x]; return new Vector2(x + CC, y + CC); };
const unrotW = (p, k) => rotW(p, (4 - k) % 4);
const rotD = (d, k) => (d + 3 * k) & 3;
export const onDir = (k) => rotD(2, k); // on-ramp leaves the corner this way
export const offArrive = (k) => rotD(1, k); // off-ramp traffic arrives moving this way
const cornerIndex = (id) => CORNERS.indexOf(id);

export function segKey(a, b) {
  const [ai, aj] = nodeIJ(a), [bi, bj] = nodeIJ(b);
  return aj === bj ? `h${Math.min(ai, bi)},${aj}` : `v${ai},${Math.min(aj, bj)}`;
}
export function segType(key) {
  if (ringSegs.has(key)) return 'avenue';
  if (ONEWAY[key] !== undefined) return 'oneway';
  return 'street';
}
export const segAllowed = (key, dir) => ONEWAY[key] === undefined || ONEWAY[key] === dir;
export const onewayDir = (key) => ONEWAY[key];

// Half width of the street leaving node `id` in direction d (0..3), or 0.
export function legHalf(id, d) {
  const [i, j] = nodeIJ(id);
  const ni = i + DIRS[d].x, nj = j + DIRS[d].y;
  if (!inGrid(ni, nj)) {
    const k = cornerIndex(id);
    return k >= 0 && (d === onDir(k) || d === ((offArrive(k) + 2) & 3)) ? TYPES.ramp.half : 0;
  }
  return TYPES[segType(segKey(id, nodeId(ni, nj)))].half;
}
export const legs = (id) => [0, 1, 2, 3].filter((d) => legHalf(id, d) > 0);
// Distance from the node centre to the stop line for traffic arriving along
// direction dIn (index): the widest crossing street plus the crosswalk.
export function stopDistance(id, dIn) {
  if (ROUNDABOUTS.has(id)) return RB.outer + 4;
  const a = (dIn + 1) & 3, b = (dIn + 3) & 3;
  return Math.max(legHalf(id, a), legHalf(id, b), 4) + 4.2;
}

// Signals only where an avenue is involved; quiet street-on-street junctions
// are uncontrolled, as they would be in a real grid.
const isAveLeg = (id, d) => legHalf(id, d) === TYPES.avenue.half;
// All-way stops where quiet residential streets meet, and the school zone.
export const STOPS = new Set([nodeId(2, 3), nodeId(3, 2)]);
export const RESIDENTIAL = new Set(['2,2', '3,2']);
export const SCHOOL_BLOCK = '2,3';
export const SCHOOL_ZONE = new Set(['h2,3', 'v2,3', 'v3,3', 'h1,3']);
export const POND_BLOCK = '2,1';

export const SIGNALS = new Set();
for (let id = 0; id < N * N; id++) {
  if (ROUNDABOUTS.has(id) || STOPS.has(id) || legs(id).length < 3) continue;
  if ([0, 1, 2, 3].some((d) => isAveLeg(id, d))) SIGNALS.add(id);
}

// Fixed-time plan per junction: the avenue axis gets the longer green.
// green, yellow, all-red for N-S, then the same for E-W.
const PLANS = new Map();
SIGNALS.forEach((id) => {
  const ns = isAveLeg(id, 1) || isAveLeg(id, 3), ew = isAveLeg(id, 0) || isAveLeg(id, 2);
  const gNS = ns && !ew ? 12 : !ns && ew ? 7 : 10;
  const gEW = ew && !ns ? 12 : !ew && ns ? 7 : 10;
  const phases = [['ns', 'green', gNS], ['ns', 'yellow', 2.5], ['all', 'red', 1], ['ew', 'green', gEW], ['ew', 'yellow', 2.5], ['all', 'red', 1]];
  PLANS.set(id, { phases, length: phases.reduce((a, p) => a + p[2], 0) });
});
export function signalState(id, axis, t) {
  const plan = PLANS.get(id);
  if (!plan) return { colour: 'green', left: Infinity };
  const [i, j] = nodeIJ(id);
  let u = (((t + i * 4.3 + j * 2.9) % plan.length) + plan.length) % plan.length;
  for (const [ax, colour, len] of plan.phases) {
    if (u < len) return ax === axis ? { colour, left: len - u } : { colour: 'red', left: 0 };
    u -= len;
  }
  return { colour: 'red', left: 0 };
}
export const axisOf = (d) => (Math.abs(d.x) > Math.abs(d.y) ? 'ew' : 'ns');

// ---------------------------------------------------------------- routing

// Dijkstra over (node, heading): turns cost a little, one-way streets are
// respected, and U-turns are only possible by lapping a roundabout.
export function shortestRoute(startNode, startDir, goalNode) {
  const S = N * N * 4;
  const dist = new Float64Array(S).fill(Infinity);
  const prev = new Int32Array(S).fill(-1);
  const done = new Uint8Array(S);
  const s0 = startNode * 4 + startDir;
  dist[s0] = 0;
  for (;;) {
    let u = -1, best = Infinity;
    for (let s = 0; s < S; s++) if (!done[s] && dist[s] < best) { best = dist[s]; u = s; }
    if (u < 0) return null;
    done[u] = 1;
    const node = u >> 2, dir = u & 3;
    if (node === goalNode && u !== s0) {
      const out = [];
      for (let s = u; s !== s0; s = prev[s]) out.push(s >> 2);
      return out.reverse();
    }
    const [i, j] = nodeIJ(node);
    const rb = ROUNDABOUTS.has(node);
    for (let d = 0; d < 4; d++) {
      const uturn = d === ((dir + 2) & 3);
      if (uturn && !rb) continue;
      const ni = i + DIRS[d].x, nj = j + DIRS[d].y;
      if (!inGrid(ni, nj)) {
        // On-ramp: ride the highway clockwise to any other corner's off-ramp.
        const kc = cornerIndex(node);
        if (kc >= 0 && d === onDir(kc)) {
          for (let m = 1; m <= 3; m++) {
            const jc = (kc + m) % 4;
            const v = CORNERS[jc] * 4 + offArrive(jc);
            const c = best + (d === dir ? 0 : 35) + 90 + m * HW_SIDE_COST;
            if (c < dist[v]) { dist[v] = c; prev[v] = u; }
          }
        }
        continue;
      }
      const nid = nodeId(ni, nj);
      if (!segAllowed(segKey(node, nid), d)) continue;
      const v = nid * 4 + d;
      const c = best + nodePos(node).distanceTo(nodePos(nid)) + (d === dir ? 0 : 35) + (rb ? 15 : 0) + (uturn ? 80 : 0);
      if (c < dist[v]) { dist[v] = c; prev[v] = u; }
    }
  }
}

// Highway time is cheap: ~100 km/h against ~40-50 in town.
const HW_SIDE_COST = (EXTENT + 2 * HW.offset) * 0.38;

export const dirIndex = (v) => {
  let best = 0, bd = -Infinity;
  DIRS.forEach((d, k) => { const s = d.dot(v); if (s > bd) { bd = s; best = k; } });
  return best;
};

// Nearest street to a free-driving car: which segment, which way to drive it
// (the car's heading, unless it's one-way), the planner-centre-line point
// level with the car, and the first intersection far enough ahead.
export function snapToStreet(pos, heading, minAhead = 30) {
  if (!inCity(pos)) {
    const out = snapOutside(pos, heading);
    if (out) return out;
  }
  const fwd = new Vector2(Math.cos(heading), Math.sin(heading));
  const clampI = (v) => Math.min(N - 1, Math.max(0, v));
  const jy = clampI(nearestLine(pos.y, YS)), ix = clampI(nearestLine(pos.x, XS));
  // Distance to the street segments, not their infinite lines: off the end of
  // a street (outside the grid) the perimeter avenue is the one alongside.
  const over = (v) => Math.max(0, -v, v - EXTENT);
  const dh = Math.hypot(pos.y - gy(jy), over(pos.x)), dv = Math.hypot(pos.x - gx(ix), over(pos.y));
  let horizontal = dh < dv;
  if (dh < 12 && dv < 12) horizontal = Math.abs(fwd.x) >= Math.abs(fwd.y);
  const along = Math.min(EXTENT, Math.max(0, horizontal ? pos.x : pos.y));
  const k = Math.min(N - 2, segIndex(along, horizontal ? XS : YS));
  const a = horizontal ? nodeId(k, jy) : nodeId(ix, k);
  const b = horizontal ? nodeId(k + 1, jy) : nodeId(ix, k + 1);
  const key = segKey(a, b);
  let dir = horizontal ? (fwd.x >= 0 ? 0 : 2) : (fwd.y >= 0 ? 1 : 3);
  const forced = onewayDir(key);
  if (forced !== undefined) dir = forced;
  const axis = DIRS[dir];
  const type = segType(key);
  const line = horizontal ? new Vector2(along, gy(jy)) : new Vector2(gx(ix), along);
  const point = line.clone().addScaledVector(right(axis), TYPES[type].planOffset);
  const arr = horizontal ? XS : YS;
  let kk;
  if (axis.x + axis.y > 0) { kk = arr.findIndex((v) => v >= along + minAhead); if (kk < 0) kk = N - 1; }
  else { kk = -1; arr.forEach((v, i) => { if (v <= along - minAhead) kk = i; }); if (kk < 0) kk = 0; }
  const lineIdx = horizontal ? jy : ix;
  const next = horizontal ? nodeId(kk, lineIdx) : nodeId(lineIdx, kk);
  const lanePoint = point.clone().addScaledVector(right(axis), 1.85);
  return { point, lanePoint, dir, axis: axis.clone(), next, key, type, forced: forced !== undefined };
}

const planOffsetOf = (a, b) => TYPES[segType(segKey(a, b))].planOffset;

// Lane-path anchors along a node sequence: rounded corners that respect each
// street's lane offsets, and a proper counter-clockwise lap of roundabouts.
export function routeAnchors(start, startDir, startKey, nodes, prefix = null) {
  const R = CORNER_R;
  const anchors = [];
  let cur, curDir, curOff;
  if (prefix && prefix.length > 1) {
    // Starting on the highway or a ramp: follow it into town first.
    const a = prefix[0], b = prefix[1];
    anchors.push(a.clone().addScaledVector(b.clone().sub(a).normalize(), -25));
    prefix.forEach((p) => anchors.push(p.clone()));
    cur = prefix[prefix.length - 1].clone();
    curDir = DIRS[startDir].clone();
    curOff = TYPES.ramp.planOffset;
  } else {
    cur = start.clone();
    curDir = DIRS[startDir].clone();
    curOff = TYPES[segType(startKey)].planOffset;
    anchors.push(cur.clone().addScaledVector(curDir, -25), cur.clone());
  }
  const fill = (to) => {
    const len = cur.distanceTo(to);
    if (len < 1) return;
    const n = Math.max(1, Math.round(len / 25));
    for (let k = 1; k <= n; k++) anchors.push(cur.clone().lerp(to, k / n));
    cur = to.clone();
  };
  nodes.forEach((id, k) => {
    const p = nodePos(id);
    const next = nodes[k + 1];
    const kc = cornerIndex(id), jc = next !== undefined ? cornerIndex(next) : -1;
    const hop = kc >= 0 && jc >= 0 && !adjacent(id, next);
    const out = hop ? DIRS[onDir(kc)].clone() : next !== undefined ? nodePos(next).sub(p).normalize() : curDir.clone();
    const outOff = hop ? TYPES.ramp.planOffset : next !== undefined ? planOffsetOf(id, next) : curOff;
    if (ROUNDABOUTS.has(id)) {
      fill(p.clone().addScaledVector(curDir, -(RB.outer + 12)).addScaledVector(right(curDir), curOff));
      const aIn = Math.atan2(-curDir.y, -curDir.x);
      let aOut = Math.atan2(out.y, out.x);
      while (aOut < aIn + 0.6) aOut += Math.PI * 2;
      const a0 = aIn + 0.45, a1 = aOut - 0.45;
      const steps = Math.max(1, Math.round((a1 - a0) / 0.55));
      for (let s = 0; s <= steps; s++) {
        const a = a0 + ((a1 - a0) * s) / steps;
        anchors.push(p.clone().add(new Vector2(Math.cos(a), Math.sin(a)).multiplyScalar(RB.centre)));
      }
      cur = p.clone().addScaledVector(out, RB.outer + 12).addScaledVector(right(out), outOff);
      anchors.push(cur.clone());
    } else if (out.dot(curDir) > 0.9) {
      if (Math.abs(outOff - curOff) > 0.1) {
        fill(p.clone().addScaledVector(curDir, -16).addScaledVector(right(curDir), curOff));
        cur = p.clone().addScaledVector(out, 16).addScaledVector(right(out), outOff);
        anchors.push(cur.clone());
      } else {
        fill(p.clone().addScaledVector(right(curDir), curOff));
      }
    } else {
      const X = p.clone().addScaledVector(right(curDir), curOff).addScaledVector(right(out), outOff);
      fill(X.clone().addScaledVector(curDir, -(R + 6)));
      anchors.push(X.clone().addScaledVector(curDir, -R));
      anchors.push(X.clone().add(out.clone().sub(curDir).multiplyScalar(R * 0.2929)));
      anchors.push(X.clone().addScaledVector(out, R));
      cur = X.clone().addScaledVector(out, R + 6);
      anchors.push(cur.clone());
    }
    curDir = out;
    curOff = outOff;
    if (hop) {
      // Up the on-ramp, round the highway, down the off-ramp to the next node.
      highwayHop(kc, jc).forEach((q) => { if (q.distanceTo(cur) > 3) anchors.push(q); });
      cur = anchors[anchors.length - 1].clone();
      curDir = DIRS[offArrive(jc)].clone();
      curOff = TYPES.ramp.planOffset;
    }
  });
  anchors.push(cur.clone().addScaledVector(curDir, 40));
  anchors.push(cur.clone().addScaledVector(curDir, 80));
  return anchors;
}

// ---------------------------------------------------------------- highway

const lineTo = (pts, a, b, step = 5) => {
  const n = Math.max(1, Math.round(a.distanceTo(b) / step));
  for (let k = pts.length ? 1 : 0; k <= n; k++) pts.push(a.clone().lerp(b, k / n));
};
const arcTo = (pts, c, r, a0, a1, step = 0.1) => {
  const n = Math.max(2, Math.round(Math.abs(a1 - a0) / step));
  for (let k = 1; k <= n; k++) { const a = a0 + ((a1 - a0) * k) / n; pts.push(new Vector2(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r)); }
};
// Ramp lane centre lines for the SW corner, in its own frame. The other three
// corners are the same geometry rotated about the city centre.
const H0 = HW.offset, RR = HW.rampR;
const ON_LOCAL = (() => {
  const pts = [];
  const x2 = -H0 + HW.aux + RR;
  lineTo(pts, new Vector2(-8, 0), new Vector2(x2, 0));
  arcTo(pts, new Vector2(x2, RR), RR, -Math.PI / 2, -Math.PI);
  lineTo(pts, pts[pts.length - 1].clone(), new Vector2(x2 - RR, RR + 50));
  lineTo(pts, pts[pts.length - 1].clone(), new Vector2(-H0 + HW.laneOut, RR + 115));
  return pts;
})();
const OFF_LOCAL = (() => {
  const pts = [];
  const yR = -H0 + HW.aux;
  lineTo(pts, new Vector2(RR + 150, -H0 + HW.laneOut), new Vector2(RR + 80, yR));
  lineTo(pts, pts[pts.length - 1].clone(), new Vector2(RR, yR));
  arcTo(pts, new Vector2(RR, yR + RR), RR, -Math.PI / 2, -Math.PI);
  lineTo(pts, pts[pts.length - 1].clone(), new Vector2(0, -8));
  return pts;
})();
// Planner centre line for a single-lane ramp: the lane is its right lane.
const toPlan = (pts) => pts.map((p, i) => {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  const t = b.clone().sub(a).normalize();
  return p.clone().add(new Vector2(-t.y, t.x).multiplyScalar(1.85));
});
export const RAMPS = [0, 1, 2, 3].map((k) => ({
  on: ON_LOCAL.map((p) => rotW(p, k)),
  off: OFF_LOCAL.map((p) => rotW(p, k)),
  onPlan: toPlan(ON_LOCAL).map((p) => rotW(p, k)),
  offPlan: toPlan(OFF_LOCAL).map((p) => rotW(p, k)),
}));
// Clockwise carriageway, planner centre line (between its two lanes).
export const HW_PLAN = rectLoopXY(-H0, EXTENT + H0, true, HW.plan, HW.R);
export const hwLine = (off) => rectLoopXY(-H0, EXTENT + H0, true, off, HW.R);
const nearestIdx = (loop, p) => {
  let best = Infinity, bi = 0;
  loop.samples.forEach((q, i) => { const d = q.pos.distanceToSquared(p); if (d < best) { best = d; bi = i; } });
  return bi;
};
const MERGE_IDX = RAMPS.map((r) => nearestIdx(HW_PLAN, r.onPlan[r.onPlan.length - 1]));
const DIVERGE_IDX = RAMPS.map((r) => nearestIdx(HW_PLAN, r.offPlan[0]));
const loopRun = (from, to, step = 20) => {
  const out = [];
  const n = HW_PLAN.samples.length;
  from = ((from % n) + n) % n; to = ((to % n) + n) % n;
  const span = (to - from + n) % n;
  for (let k = 0; k <= span; k += step) out.push(HW_PLAN.samples[(from + k) % n].pos.clone());
  return out;
};
const inCity = (p, m = 14) => p.x > -m && p.y > -m && p.x < EXTENT + m && p.y < EXTENT + m;
const polyDist = (pts, p) => { let d = Infinity, bi = 0; pts.forEach((q, i) => { const e = q.distanceToSquared(p); if (e < d) { d = e; bi = i; } }); return [Math.sqrt(d), bi]; };

// Plan points from corner k's on-ramp, round the highway, down corner j's off-ramp.
function highwayHop(k, j) {
  const node0 = nodePos(CORNERS[k]), node1 = nodePos(CORNERS[j]);
  const on = RAMPS[k].onPlan.filter((p) => p.distanceTo(node0) > 22);
  const off = RAMPS[j].offPlan.filter((p) => p.distanceTo(node1) > 22);
  return [...on, ...loopRun(MERGE_IDX[k] + 8, DIVERGE_IDX[j] - 8).slice(1), ...off];
}

// If the car is on the highway or a ramp, how to get from here back into town.
function snapOutside(pos, heading) {
  const fwd = new Vector2(Math.cos(heading), Math.sin(heading));
  for (let k = 0; k < 4; k++) {
    const R = RAMPS[k];
    const [dOff, iOff] = polyDist(R.off, pos);
    if (dOff < 7) {
      const t = R.off[Math.min(R.off.length - 1, iOff + 1)].clone().sub(R.off[Math.max(0, iOff - 1)]).normalize();
      const node = nodePos(CORNERS[k]);
      const prefix = R.offPlan.slice(Math.max(0, iOff - 5)).filter((p) => p.distanceTo(node) > 22);
      return { type: 'ramp', rampKind: 'off', prefix, next: CORNERS[k], dir: offArrive(k), axis: t, lanePoint: R.off[iOff].clone(), point: R.offPlan[iOff].clone(), key: 'ramp', forced: true };
    }
    const [dOn, iOn] = polyDist(R.on, pos);
    if (dOn < 7) {
      const t = R.on[Math.min(R.on.length - 1, iOn + 1)].clone().sub(R.on[Math.max(0, iOn - 1)]).normalize();
      const jc = (k + 1) % 4;
      const node1 = nodePos(CORNERS[jc]);
      const prefix = [...R.onPlan.slice(Math.max(0, iOn - 5)), ...loopRun(MERGE_IDX[k] + 8, DIVERGE_IDX[jc] - 8).slice(1), ...RAMPS[jc].offPlan.filter((p) => p.distanceTo(node1) > 22)];
      return { type: 'ramp', rampKind: 'on', prefix, next: CORNERS[jc], dir: offArrive(jc), axis: t, lanePoint: R.on[iOn].clone(), point: R.onPlan[iOn].clone(), key: 'ramp', forced: true };
    }
  }
  const idx = nearestIdx(HW_PLAN, pos);
  const smp = HW_PLAN.samples[idx];
  if (smp.pos.distanceTo(pos) < 9 && fwd.dot(smp.dir) > -0.3) {
    // Next off-ramp at least 120 m ahead.
    const n = HW_PLAN.samples.length;
    let best = null;
    for (let m = 0; m < 4; m++) {
      const d = (DIVERGE_IDX[m] - idx + n) % n;
      if (d > 120 && (!best || d < best.d)) best = { d, m };
    }
    const jc = best.m;
    const node1 = nodePos(CORNERS[jc]);
    const prefix = [...loopRun((idx - 25 + n) % n, DIVERGE_IDX[jc] - 8), ...RAMPS[jc].offPlan.filter((p) => p.distanceTo(node1) > 22)];
    const lanePoint = smp.pos.clone().addScaledVector(right(smp.dir), 1.85);
    return { type: 'highway', prefix, next: CORNERS[jc], dir: offArrive(jc), axis: smp.dir.clone(), lanePoint, point: smp.pos.clone(), key: 'highway', forced: true };
  }
  return null;
}

// ---------------------------------------------------------------- agents

// Closed loop around a rectangle of nodes, offset `off` to the right of travel,
// with rounded corners. Clockwise loops sit inside the ring, counter-clockwise
// outside, so opposite directions never cross.
function rectLoop(a, b, reverse, off, R) {
  return rectLoopXY(gx(a), gx(b), reverse, off, R, gy(a), gy(b));
}
function rectLoopXY(lo, hi, reverse, off, R, ylo = lo, yhi = hi) {
  const cs = [[lo, ylo], [hi, ylo], [hi, yhi], [lo, yhi]].map(([x, y]) => new Vector2(x, y));
  const pts = reverse ? [...cs].reverse() : cs;
  const samples = [];
  for (let c = 0; c < 4; c++) {
    const p0 = pts[c], p1 = pts[(c + 1) % 4], p2 = pts[(c + 2) % 4];
    const d = p1.clone().sub(p0).normalize(), d2 = p2.clone().sub(p1).normalize();
    const d0 = p0.clone().sub(pts[(c + 3) % 4]).normalize();
    const X0 = p0.clone().addScaledVector(right(d0), off).addScaledVector(right(d), off);
    const X1 = p1.clone().addScaledVector(right(d), off).addScaledVector(right(d2), off);
    const from = X0.clone().addScaledVector(d, R), to = X1.clone().addScaledVector(d, -R);
    const len = from.distanceTo(to);
    for (let s = 0; s < len; s += 1) samples.push({ pos: from.clone().addScaledVector(d, s), dir: d.clone() });
    const c1 = X1.clone().addScaledVector(d2, R);
    for (let k = 0; k < 14; k++) {
      const t = k / 14;
      const pos = to.clone().multiplyScalar((1 - t) ** 2).addScaledVector(X1, 2 * (1 - t) * t).addScaledVector(c1, t * t);
      const dir = X1.clone().sub(to).multiplyScalar(2 * (1 - t)).addScaledVector(c1.clone().sub(X1), 2 * t).normalize();
      samples.push({ pos, dir });
    }
  }
  const cum = [0];
  for (let k = 1; k < samples.length; k++) cum.push(cum[k - 1] + samples[k].pos.distanceTo(samples[k - 1].pos));
  const length = cum[cum.length - 1] + samples[samples.length - 1].pos.distanceTo(samples[0].pos);
  return { samples, cum, length, stops: [] };
}

export function sampleLoop(loop, s) {
  s = ((s % loop.length) + loop.length) % loop.length;
  let lo = 0, hi = loop.cum.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (loop.cum[m] <= s) lo = m; else hi = m - 1; }
  return loop.samples[lo];
}

// Where on a loop each signal's stop line is, and which phase governs it.
function addStops(loop) {
  SIGNALS.forEach((id) => {
    const n = nodePos(id);
    for (let k = 0; k < loop.samples.length; k++) {
      const { pos, dir } = loop.samples[k];
      const rel = n.clone().sub(pos);
      const along = rel.dot(dir);
      const lat = Math.abs(dir.x * rel.y - dir.y * rel.x);
      const sd = stopDistance(id, dirIndex(dir));
      if (lat < 14 && along > sd - 0.6 && along < sd + 0.6) {
        loop.stops.push({ s: loop.cum[k], node: id, axis: axisOf(dir) });
        k += 20;
      }
    }
  });
  loop.stops.sort((p, q) => p.s - q.s);
}

// Stop signs: one per approach at each all-way stop, near-right corner.
function stopSigns() {
  const out = [];
  STOPS.forEach((id) => {
    const p = nodePos(id);
    legs(id).forEach((l) => {
      const dIn = (l + 2) & 3;
      const [i, j] = nodeIJ(id);
      const nb = nodeId(i + DIRS[l].x, j + DIRS[l].y);
      if (!segAllowed(segKey(id, nb), dIn)) return;
      const D = DIRS[dIn];
      const pos = p.clone().addScaledVector(D, -(stopDistance(id, dIn) - 1.5)).addScaledVector(right(D), legHalf(id, l) + 0.8);
      out.push({ node: id, pos, facing: D.clone().negate() });
    });
  });
  return out;
}

// Both carriageways of the highway, two lanes each.
function highwayLoops() {
  const loops = [];
  [true, false].forEach((cw) => {
    [{ kind: 'hwOut', off: HW.laneOut }, { kind: 'hwIn', off: HW.laneIn }].forEach(({ kind, off }) => {
      const loop = rectLoopXY(-H0, EXTENT + H0, cw, off, HW.R);
      Object.assign(loop, { kind, ring: 2, reverse: cw });
      loops.push(loop);
    });
  });
  return loops;
}

function buildLoops() {
  const loops = [];
  RINGS.forEach(([a, b], ri) => {
    [false, true].forEach((reverse) => {
      [
        { kind: 'outer', off: AVE.outer, R: 15 },
        { kind: 'inner', off: AVE.inner, R: 15 },
        { kind: 'bike', off: AVE.bike, R: 11 },
      ].forEach(({ kind, off, R }) => {
        const loop = rectLoop(a, b, reverse, off, R);
        Object.assign(loop, { kind, ring: ri, reverse });
        addStops(loop);
        loops.push(loop);
      });
    });
  });
  return loops;
}

// ---------------------------------------------------------------- city

const PARKED_KINDS = ['sedan', 'sedan', 'hatch', 'suv', 'suv', 'pickup', 'van', 'sedan', 'hatch', 'sports', 'boxtruck'];
export const VEHICLE_DIMS = {
  sedan: [4.7, 1.85], hatch: [4.1, 1.8], suv: [4.9, 1.95], pickup: [5.5, 2.0],
  van: [5.6, 2.1], truck: [7.8, 2.45], bus: [12, 2.55], bike: [1.8, 0.6],
  sports: [4.5, 1.95], boxtruck: [6.4, 2.2], schoolbus: [11.5, 2.5],
};

export function buildCity(landmarkNodes) {
  const r = rng(20260923);
  const pads = []; // raised kerb + sidewalk slabs
  const houses = [];
  let school = null;
  let pond = null;
  const buildings = [];
  const trees = [];
  const parked = [];
  const laneObstacles = [];
  const hydrants = [];
  const lamps = [];
  const medians = [];
  const signals = [];
  const peds = [];

  const landmarkAt = new Map(landmarkNodes.map((id, k) => [id, k]));
  const parks = new Set(['2,1', '1,2']);

  // Half width of the street along a block edge. Off the grid entirely the
  // block just extends; on the city's edge lines beyond the last intersection
  // it keeps the avenue clear; between two outer blocks the edges meet flush.
  const edgeHalf = (line, along, key) => {
    if (line < 0 || line > N - 1) return B - HW.offset + HW.half + 1.5; // stop at the highway
    if (along >= 0 && along < N - 1) return TYPES[segType(key)].half;
    return line === 0 || line === N - 1 ? TYPES.avenue.half : 0;
  };
  const halfV = (i, j) => edgeHalf(i, j, `v${i},${j}`);
  const halfH = (i, j) => edgeHalf(j, i, `h${i},${j}`);
  const walkV = (i, j) => (i >= 0 && i < N && j >= 0 && j < N - 1 ? TYPES[segType(`v${i},${j}`)].walk : 0);
  const walkH = (i, j) => (j >= 0 && j < N && i >= 0 && i < N - 1 ? TYPES[segType(`h${i},${j}`)].walk : 0);
  const typeH = (i, j) => (j >= 0 && j < N && i >= 0 && i < N - 1 ? segType(`h${i},${j}`) : null);
  const typeV = (i, j) => (i >= 0 && i < N && j >= 0 && j < N - 1 ? segType(`v${i},${j}`) : null);

  const rampPts = RAMPS.flatMap((r) => [...r.on, ...r.off]);
  const nearRamp = (x, y, pad) => rampPts.some((q) => Math.abs(q.x - x) < pad && Math.abs(q.y - y) < pad);
  for (let i = -1; i < N; i++) {
    for (let j = -1; j < N; j++) {
      const outer = i < 0 || j < 0 || i >= N - 1 || j >= N - 1;
      const interchange = (i < 0 || i >= N - 1) && (j < 0 || j >= N - 1);
      const x0 = gx(i) + halfV(i, j), x1 = gx(i + 1) - halfV(i + 1, j);
      const y0 = gy(j) + halfH(i, j), y1 = gy(j + 1) - halfH(i, j + 1);
      const corner = (ni, nj) => (inGrid(ni, nj) && ROUNDABOUTS.has(nodeId(ni, nj)) ? { rb: true, c: new Vector2(gx(ni), gy(nj)) } : { rb: false });
      const pad = { x0, x1, y0, y1, outer, interchange, park: parks.has(`${i},${j}`) || interchange, corners: [corner(i, j), corner(i + 1, j), corner(i + 1, j + 1), corner(i, j + 1)] };
      pads.push(pad);
      if (interchange) {
        // Landscaped interchange: a few trees clear of the ramps.
        for (let t = 0; t < 14; t++) {
          const x = x0 + 6 + r() * (x1 - x0 - 12), y = y0 + 6 + r() * (y1 - y0 - 12);
          if (!nearRamp(x, y, 12)) trees.push({ x, y, s: 2.4 + r() * 2, kind: 'park' });
        }
        continue;
      }

      const wl = walkV(i, j), wr = walkV(i + 1, j), wb = walkH(i, j), wt = walkH(i, j + 1);
      const lx0 = x0 + wl + 1, lx1 = x1 - wr - 1, ly0 = y0 + wb + 1, ly1 = y1 - wt - 1;
      const nearRB = (x, y) => pad.corners.some((c) => c.rb && c.c.distanceTo(new Vector2(x, y)) < RB.clear + 12);

      // Street furniture along every kerb that faces a street.
      const edges = [
        { a: new Vector2(x0, y0), b: new Vector2(x1, y0), n: new Vector2(0, 1), type: typeH(i, j) },
        { a: new Vector2(x1, y0), b: new Vector2(x1, y1), n: new Vector2(-1, 0), type: typeV(i + 1, j) },
        { a: new Vector2(x1, y1), b: new Vector2(x0, y1), n: new Vector2(0, -1), type: typeH(i, j + 1) },
        { a: new Vector2(x0, y1), b: new Vector2(x0, y0), n: new Vector2(1, 0), type: typeV(i, j) },
      ];
      edges.forEach((e) => {
        if (!e.type) return;
        const len = e.a.distanceTo(e.b);
        const d = e.b.clone().sub(e.a).normalize();
        for (let s = 14; s < len - 10; s += 26) {
          const p = e.a.clone().addScaledVector(d, s).addScaledVector(e.n, 0.7);
          if (!nearRB(p.x, p.y)) lamps.push({ pos: p, facing: e.n.clone().negate() });
        }
        const ave = e.type === 'avenue';
        for (let s = 20; s < len - 12; s += ave ? 13 : 29) {
          const p = e.a.clone().addScaledVector(d, s).addScaledVector(e.n, 1.8);
          if (!nearRB(p.x, p.y)) trees.push({ x: p.x, y: p.y, s: 1.9 + r() * 0.8, kind: 'street' });
        }
        if (!outer) {
          const p = e.a.clone().addScaledVector(d, 7).addScaledVector(e.n, 0.7);
          if (!nearRB(p.x, p.y)) hydrants.push(p);
        }
      });

      // Pedestrians walk laps of the sidewalk.
      if (!outer) {
        const inset = 1.5;
        const ring = [new Vector2(x0 + inset, y0 + inset), new Vector2(x1 - inset, y0 + inset), new Vector2(x1 - inset, y1 - inset), new Vector2(x0 + inset, y1 - inset)];
        const path = [];
        ring.forEach((p, k) => {
          const c = pad.corners[k];
          if (c.rb) {
            const a0 = Math.atan2(p.y - c.c.y, p.x - c.c.x);
            for (let t = -2; t <= 2; t++) {
              const a = a0 + t * 0.32;
              path.push(c.c.clone().add(new Vector2(Math.cos(a), Math.sin(a)).multiplyScalar(RB.clear + 2.2)));
            }
          } else {
            // Round the corner like the kerb does (6 m radius), or people would
            // cut across the road at every junction corner.
            const prev = ring[(k + 3) % 4], next = ring[(k + 1) % 4];
            const din = p.clone().sub(prev).normalize(), dout = next.clone().sub(p).normalize();
            path.push(p.clone().addScaledVector(din, -6.5), p.clone().addScaledVector(din, -2).addScaledVector(dout, 2), p.clone().addScaledVector(dout, 6.5));
          }
        });
        const count = pad.park ? 5 : 3;
        for (let k = 0; k < count; k++) peds.push({ path, s: r() * 400, v: 1.1 + r() * 0.5, tone: r() });
      }

      const key = `${i},${j}`;
      if (key === POND_BLOCK) {
        pond = { x: (lx0 + lx1) / 2, y: (ly0 + ly1) / 2, rx: (lx1 - lx0) * 0.3, ry: (ly1 - ly0) * 0.28 };
      }
      const inPond = (x, y, m = 3) => pond && key === POND_BLOCK && ((x - pond.x) / (pond.rx + m)) ** 2 + ((y - pond.y) / (pond.ry + m)) ** 2 < 1;
      if (pad.park) {
        for (let t = 0; t < 22; t++) {
          const x = lx0 + 3 + r() * (lx1 - lx0 - 6), y = ly0 + 3 + r() * (ly1 - ly0 - 6);
          if (!nearRB(x, y) && !inPond(x, y)) trees.push({ x, y, s: 2.6 + r() * 2.2, kind: 'park' });
        }
        continue;
      }
      if (RESIDENTIAL.has(key)) {
        // Houses along every street edge, facing the street, on lawns.
        pad.lawn = true;
        edges.forEach((e) => {
          if (!e.type) return;
          const len = e.a.distanceTo(e.b);
          const d = e.b.clone().sub(e.a).normalize();
          for (let s0 = 14; s0 < len - 14; s0 += 15 + r() * 3) {
            const c = e.a.clone().addScaledVector(d, s0).addScaledVector(e.n, 3 + 8 + 5.5);
            if (nearRB(c.x, c.y)) continue;
            if (houses.some((h) => h.x !== undefined && Math.hypot(h.x - c.x, h.y - c.y) < 12)) continue;
            houses.push({ x: c.x, y: c.y, w: 9 + r() * 2, d: 10 + r() * 2, h: 4.8 + r() * 1.6, rot: Math.atan2(e.n.y, e.n.x), tone: r(), roof: r() });
            trees.push({ ...(() => { const q = c.clone().addScaledVector(d, 7.5).addScaledVector(e.n, -6); return { x: q.x, y: q.y }; })(), s: 1.8 + r(), kind: 'street' });
          }
        });
        continue;
      }
      if (key === SCHOOL_BLOCK) {
        // The school takes the block, clear of the landmark on its corner lot.
        const w = (lx1 - lx0) * 0.55, d = (ly1 - ly0) * 0.42;
        school = { x: lx1 - w / 2 - 4, y: ly1 - d / 2 - 4, w, d, h: 11, style: 3, seed: 0.37, landmark: -1, podium: false, school: true };
        buildings.push(school);
        trees.push({ x: lx0 + 12, y: ly1 - 10, s: 3, kind: 'park' }, { x: lx1 - 10, y: ly0 + 12, s: 3, kind: 'park' });
        const k = landmarkAt.get(nodeId(i, j));
        if (k !== undefined) {
          const cw = (lx1 - lx0) / 2 - 2, rh = (ly1 - ly0) / 2 - 2;
          buildings.push({ x: lx0 + cw / 2, y: ly0 + rh / 2, w: cw - 1.5, d: rh - 1.5, h: 30 + (k % 3) * 9, style: 2, seed: 0.5 + k * 0.05, landmark: k, podium: false });
        }
        continue;
      }

      const cols = r() < 0.5 ? 2 : 3, rows = r() < 0.5 ? 2 : 3, gap = 4;
      const cw = (lx1 - lx0 - gap * (cols - 1)) / cols, rh = (ly1 - ly0 - gap * (rows - 1)) / rows;
      const centre = 1 - Math.min(1, Math.hypot((x0 + x1) / 2 - EXTENT / 2, (y0 + y1) / 2 - EXTENT / 2) / (EXTENT * 0.72));
      for (let c = 0; c < cols; c++) {
        for (let rr = 0; rr < rows; rr++) {
          const inset = 0.8 + r() * 2.2;
          const w = cw - inset * 2, d = rh - inset * 2;
          const x = lx0 + c * (cw + gap) + cw / 2, y = ly0 + rr * (rh + gap) + rh / 2;
          if (nearRB(x, y)) { trees.push({ x, y, s: 3.2, kind: 'park' }); continue; }
          if (outer && nearRamp(x, y, Math.max(w, d) / 2 + 10)) continue;
          const tall = !outer && r() < centre * 0.8;
          const h = outer ? 9 + r() * 20 : tall ? 32 + r() * 55 * centre : 8 + r() * 18;
          // Style: 0 punched windows, 1 office ribbons, 2 curtain wall, 3 residential brick.
          const style = tall ? (r() < 0.55 ? 2 : 1) : r() < 0.45 ? 3 : r() < 0.6 ? 0 : 1;
          buildings.push({ x, y, w, d, h, style, seed: r(), landmark: -1, podium: tall && r() < 0.6 });
        }
      }
      const k = outer ? undefined : landmarkAt.get(nodeId(i, j));
      if (k !== undefined) {
        const bx = lx0 + cw / 2, by = ly0 + rh / 2;
        const idx = buildings.findIndex((bd) => Math.abs(bd.x - bx) < 0.01 && Math.abs(bd.y - by) < 0.01);
        const lm = { x: bx, y: by, w: cw - 1.5, d: rh - 1.5, h: 30 + (k % 3) * 9, style: 2, seed: 0.5 + k * 0.05, landmark: k, podium: false };
        if (idx >= 0) buildings[idx] = lm; else buildings.push(lm);
      }
    }
  }

  // Segments: parking, things blocking the lane, avenue medians.
  const segments = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N - 1; i++) segments.push({ a: nodeId(i, j), b: nodeId(i + 1, j) });
  for (let i = 0; i < N; i++) for (let j = 0; j < N - 1; j++) segments.push({ a: nodeId(i, j), b: nodeId(i, j + 1) });
  const box = (pos, rot, w, h, kind, extra = {}) => ({ pos, rot, width: w, height: h, kind, ...extra });
  segments.forEach(({ a, b }) => {
    const key = segKey(a, b);
    const type = segType(key);
    const T = TYPES[type];
    const pa = nodePos(a), pb = nodePos(b);
    const SEG = pa.distanceTo(pb);
    const d = pb.clone().sub(pa).normalize();
    const n = new Vector2(-d.y, d.x);
    const rot = Math.atan2(d.y, d.x);
    const clearA = ROUNDABOUTS.has(a) ? RB.clear + 8 : stopDistance(a, dirIndex(d)) + 6;
    const clearB = ROUNDABOUTS.has(b) ? RB.clear + 8 : stopDistance(b, dirIndex(d)) + 6;
    if (type === 'avenue') {
      const s0 = clearA - 4, s1 = SEG - clearB + 4;
      medians.push(box(pa.clone().addScaledVector(d, (s0 + s1) / 2), rot, s1 - s0, AVE.median * 2, 'median'));
      for (let s = s0 + 5; s < s1 - 4; s += 9) {
        const p = pa.clone().addScaledVector(d, s);
        trees.push({ x: p.x, y: p.y, s: 1.1, kind: 'shrub' });
      }
      return;
    }
    const laneEdge = type === 'street' ? LANE : LANE / 2;
    const parkLat = laneEdge + (T.half - laneEdge) / 2;
    [-1, 1].forEach((side) => {
      for (let s = clearA + 2; s < SEG - clearB - 2; s += 1) {
        if (r() < 0.4) { s += 5; continue; }
        const kind = PARKED_KINDS[Math.floor(r() * PARKED_KINDS.length)];
        const [L, W] = VEHICLE_DIMS[kind];
        if (s + L > SEG - clearB) break;
        const p = pa.clone().addScaledVector(d, s + L / 2).addScaledVector(n, side * parkLat);
        parked.push(box(p, side > 0 ? rot + Math.PI : rot, L, W, 'parked', { vkind: kind, tone: r() }));
        s += L + 1.2 + r() * 3;
      }
    });
    if (r() < (type === 'oneway' ? 0.5 : 0.6)) {
      const s = clearA + 12 + r() * (SEG - clearA - clearB - 30);
      const side = r() < 0.5 ? -1 : 1;
      if (type === 'street') {
        if (r() < 0.55) {
          laneObstacles.push(box(pa.clone().addScaledVector(d, s).addScaledVector(n, side * (LANE / 2 + 0.3)), side > 0 ? rot + Math.PI : rot, 7.8, 2.45, 'truck', { vkind: 'truck', tone: r() }));
        } else {
          for (let c = 0; c < 5; c++) {
            const p = pa.clone().addScaledVector(d, s + c * 3).addScaledVector(n, side * (LANE - 0.5 - c * 0.42));
            laneObstacles.push(box(p, rot, 0.6, 0.6, 'cone'));
          }
        }
      } else {
        laneObstacles.push(box(pa.clone().addScaledVector(d, s).addScaledVector(n, side * 0.7), rot, 5.6, 2.1, 'van', { vkind: 'van', tone: r() }));
      }
    }
  });

  // Signal heads: one per approach, on the near-right corner.
  SIGNALS.forEach((id) => {
    const p = nodePos(id);
    legs(id).forEach((l) => {
      const dIn = (l + 2) & 3; // traffic arriving from leg l travels in direction dIn
      const D = DIRS[dIn];
      const own = legHalf(id, l);
      const pos = p.clone().addScaledVector(D, -(stopDistance(id, dIn) - 2.5)).addScaledVector(right(D), own + 1.2);
      signals.push({ node: id, pos, facing: D.clone().negate(), axis: axisOf(D), reach: own });
    });
  });

  // Houses are solid too (collisions, recovery planning).
  houses.forEach((h) => buildings.push({ x: h.x, y: h.y, w: Math.abs(Math.cos(h.rot)) * h.d + Math.abs(Math.sin(h.rot)) * h.w, d: Math.abs(Math.sin(h.rot)) * h.d + Math.abs(Math.cos(h.rot)) * h.w, h: h.h, house: true }));

  // A school bus parked outside the school, on the street along its east side.
  const busLine = nodePos(nodeId(3, 3)), busEnd = nodePos(nodeId(3, 4));
  const busDir = busEnd.clone().sub(busLine).normalize();
  const busPos = busLine.clone().addScaledVector(busDir, 48).addScaledVector(new Vector2(-busDir.y, busDir.x), (LANE + TYPES.street.half) / 2);
  const schoolBus = { pos: busPos, rot: Math.atan2(-busDir.y, -busDir.x), L: 11.5, W: 2.5 };
  for (let q = parked.length - 1; q >= 0; q--) if (parked[q].pos.distanceTo(busPos) < 10) parked.splice(q, 1);

  const landmarks = landmarkNodes.map((id, k) => ({ node: id, pos: nodePos(id), building: buildings.find((bd) => bd.landmark === k) }));

  // Distant skyline beyond the highway (visual only).
  const skyline = [];
  for (let t = 0; t < 90; t++) {
    const side = t % 4, u = r() * (EXTENT + 2 * H0 + 200) - H0 - 100, dd = H0 + 30 + r() * 150;
    const along = side < 2 ? u : u;
    const x = side === 0 ? along : side === 1 ? EXTENT + dd : side === 2 ? along : -dd;
    const y = side === 0 ? -dd : side === 1 ? along : side === 2 ? EXTENT + dd : along;
    const w = 16 + r() * 26;
    skyline.push({ x, y, w, d: w * (0.6 + r() * 0.8), h: 25 + r() * 110, style: r() < 0.6 ? 2 : 1, seed: r(), landmark: -1, podium: false, far: true });
  }

  // Highway barriers: concrete median and outer guardrail, as collision boxes.
  const barriers = [];
  [0, -HW.half - 0.4].forEach((off) => {
    const line = rectLoopXY(-H0, EXTENT + H0, true, off, HW.R);
    for (let k = 0; k < line.samples.length; k += 6) {
      const a = line.samples[k], b = line.samples[Math.min(line.samples.length - 1, k + 6)];
      const c = a.pos.clone().add(b.pos).multiplyScalar(0.5);
      barriers.push({ pos: c, rot: Math.atan2(b.pos.y - a.pos.y, b.pos.x - a.pos.x), width: a.pos.distanceTo(b.pos) + 0.3, height: off === 0 ? 0.6 : 0.3, kind: 'barrier', median: off === 0 });
    }
  });

  return {
    pads, buildings, skyline, trees, parked, laneObstacles, hydrants, lamps, medians, signals, peds, landmarks, barriers,
    houses, school, schoolBus, pond, stopSigns: stopSigns(),
    ramps: RAMPS, loops: [...buildLoops(), ...highwayLoops()],
  };
}

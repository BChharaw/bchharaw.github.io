// Simulation and autonomy stack for the city drive.
//
//   route      turn-aware Dijkstra over the street graph (one-ways, roundabouts)
//   lane path  the route as a smooth centre line with per-road lane offsets
//   planner    Dash's GPU lattice planner (github.com/mattbradley/dash, MIT)
//              in a worker: lane changes, overtakes, yielding to traffic
//   rules      signals and unprotected left turns become virtual stop walls
//   recovery   Hybrid A* with reverse gear, in its own worker, for when the
//              car is somewhere a lane planner can't start from
//   control    Dash's path follower on the lane; pure pursuit (forwards and
//              backwards) along recovery manoeuvres
//
// Traffic, buses and cyclists follow the car ahead and stop at red lights
// using the Intelligent Driver Model. Any key or touch hands the car to the
// visitor; when they let go, autonomy picks up from wherever they left it.
import { Vector2 } from 'three';
import '../dash/setup';
import Car from '../dash/physics/Car';
import LanePath from '../dash/autonomy/LanePath';
import Path from '../dash/autonomy/Path';
import StaticObstacle from '../dash/autonomy/StaticObstacle';
import DynamicObstacle from '../dash/autonomy/DynamicObstacle';
import MovingAverage from '../dash/autonomy/MovingAverage';
import FollowController from '../dash/autonomy/control/FollowController';
import CubicPath from '../dash/autonomy/path-planning/CubicPath';
import RoadLattice from '../dash/autonomy/path-planning/RoadLattice';
import plannerConfig from '../dash/plannerConfig';
import {
  buildCity, shortestRoute, snapToStreet, routeAnchors, nodePos, sampleLoop, dirIndex, EXTENT, SIGNALS,
  ROUNDABOUTS, signalState, stopDistance, axisOf, DIRS, RB, VEHICLE_DIMS, AVE, HW, CORNERS, onDir, offArrive, adjacent, N, STOPS, SCHOOL_ZONE,
} from './cityModel';

export const RESUME_AFTER = 2.5; // seconds without input before autonomy resumes
const LANE_RIGHT = -3.7 / 2; // Dash latitude is positive to the left
const NEAR = 150; // metres of world the planner is told about
const MANUAL_TOP_SPEED = 45; // the visitor may speed; autonomy never does
// Rule walls sit this far past the stop line: Dash keeps an 8 m hazard
// buffer in front of any obstacle, so this puts the bumper ~5 m from the line
// instead of ~12, while the hard collision limit stays short of the junction.
const WALL_AHEAD = 5;
const ROLLING_START = 5; // m/s, see _requestPlan
const FRONT_OVERHANG = Car.HALF_CAR_LENGTH - Car.REAR_AXLE_POS; // rear axle to front bumper, 3.93 m
// Posted limits (km/h / 3.6): Ontario's 50 default in town, 40 on residential
// streets, 30 on the narrow one-ways, 60 on ramps, 100 on the highway.
export const SPEED_LIMITS = { avenue: 50 / 3.6, street: 40 / 3.6, oneway: 30 / 3.6, ramp: 60 / 3.6, highway: 100 / 3.6 };

// Yaw inertia is inflated ~1.6x for the tyres resisting the spin.
const EGO_MASS = 1600, EGO_INERTIA = (1.6 * 1600 * (4.8 ** 2 + 1.9 ** 2)) / 12;
// Coefficient of restitution by what the car hit.
const RESTITUTION = { barrier: 0.35, median: 0.3, building: 0.2, car: 0.25, tree: 0.2, lamp: 0.25, signal: 0.25, hydrant: 0.2, island: 0.3, bus: 0.2, pond: 0.1 };
// Decision-log lines for behaviour changes worth explaining.
const BEHAVIOUR_NOTES = {
  'Changing lanes to overtake': 'Slower vehicle ahead and the left lane is clear on the lattice: changing lanes to pass',
  'Pulling out around a stopped vehicle': 'Lane blocked by a stopped vehicle: planning a path around it',
  'Moving back into the right lane': 'Pass complete: keeping right, returning to the right lane',
  'Moving to the left lane to turn left': 'Left turn ahead on a multi-lane road: moving to the left lane early, as Ontario requires',
  'Merging onto the highway': 'On-ramp: accelerating to match traffic, signalling left to merge',
  'Taking the exit': 'Exit ahead: signalling right and slowing for the ramp',
  'Navigating a roundabout': 'Roundabout: yielding to traffic already circulating, then counter-clockwise',
  'Queued behind stopped traffic': 'Queued behind stopped traffic: holding a safe gap',
  'School zone: 30 km/h': 'Entering a school zone: limit drops to 30 km/h',
};
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Uniform grid so collision queries only look at nearby things.
class SpatialHash {
  constructor(cell = 20) { this.cell = cell; this.map = new Map(); }
  add(shape, x0, y0, x1, y1) {
    const c = this.cell;
    for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) {
      for (let j = Math.floor(y0 / c); j <= Math.floor(y1 / c); j++) {
        const k = `${i},${j}`;
        if (!this.map.has(k)) this.map.set(k, []);
        this.map.get(k).push(shape);
      }
    }
  }
  near(x, y, r) {
    const out = new Set();
    const c = this.cell;
    for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++) {
      for (let j = Math.floor((y - r) / c); j <= Math.floor((y + r) / c); j++) {
        const list = this.map.get(`${i},${j}`);
        if (list) list.forEach((s) => out.add(s));
      }
    }
    return out;
  }
}

const isHop = (a, b) => CORNERS.includes(a) && CORNERS.includes(b) && !adjacent(a, b);
// Direction of travel leaving node a for b, and arriving at b.
const leaveDir = (a, b) => (isHop(a, b) ? onDir(CORNERS.indexOf(a)) : dirIndex(nodePos(b).sub(nodePos(a))));
const arriveDir = (a, b) => (isHop(a, b) ? offArrive(CORNERS.indexOf(b)) : dirIndex(nodePos(b).sub(nodePos(a))));

export default class CitySim {
  constructor(landmarkNodes) {
    this.landmarkNodes = landmarkNodes;
    const city = (this.city = buildCity(landmarkNodes));

    // Things the lane planner must avoid.
    // Parked cars, blocking trucks and cones are rigid bodies: they can be
    // shoved. They share their position with the planner's obstacle so the
    // planner always sees where they are now.
    const MASS = { sedan: 1450, hatch: 1200, suv: 2000, pickup: 2200, van: 2400, truck: 6500, boxtruck: 4500, sports: 1350 };
    this.bodies = [...city.parked, ...city.laneObstacles].map((o) => {
      const pos = o.pos.clone();
      const mass = o.kind === 'cone' ? 4 : MASS[o.vkind] || 1500;
      const obstacle = Object.assign(new StaticObstacle(pos, o.rot, o.width, o.height), { kind: o.kind });
      return { src: o, pos, rot: o.rot, hw: o.width / 2, hh: o.height / 2, mass, inertia: (mass * (o.width ** 2 + o.height ** 2)) / 12, vel: new Vector2(), w: 0, obstacle, kind: o.kind, moving: false, version: 0 };
    });
    this.statics = [
      ...this.bodies.map((b) => b.obstacle),
      ...[...city.medians, ...city.barriers].map((o) => Object.assign(new StaticObstacle(o.pos.clone(), o.rot, o.width, o.height), { kind: o.kind })),
    ];
    ROUNDABOUTS.forEach((id) => {
      const p = nodePos(id);
      const side = RB.island * 1.8;
      [0, Math.PI / 4].forEach((rot) => this.statics.push(Object.assign(new StaticObstacle(p.clone(), rot, side, side), { kind: 'island' })));
    });

    // Everything solid, for collisions and the recovery planner.
    this.solids = new SpatialHash();
    const addBox = (x, y, rot, hw, hh, kind) => {
      const e = Math.abs(Math.cos(rot)) * hw + Math.abs(Math.sin(rot)) * hh;
      const f = Math.abs(Math.sin(rot)) * hw + Math.abs(Math.cos(rot)) * hh;
      this.solids.add({ box: true, x, y, rot, hw, hh, kind }, x - e, y - f, x + e, y + f);
    };
    const addCircle = (x, y, r, kind) => this.solids.add({ box: false, x, y, r, kind }, x - r, y - r, x + r, y + r);
    city.buildings.forEach((b) => addBox(b.x, b.y, 0, b.w / 2, b.d / 2, 'building'));
    [...city.medians, ...city.barriers].forEach((o) => addBox(o.pos.x, o.pos.y, o.rot, o.width / 2, o.height / 2, o.kind));
    this.bodyHash = new SpatialHash(15);
    this.bodies.forEach((b, i) => this.bodyHash.add(i, b.pos.x - 4, b.pos.y - 4, b.pos.x + 4, b.pos.y + 4));
    city.hydrants.forEach((p) => addCircle(p.x, p.y, 0.25, 'hydrant'));
    city.lamps.forEach((l) => addCircle(l.pos.x, l.pos.y, 0.18, 'lamp'));
    city.signals.forEach((s) => addCircle(s.pos.x, s.pos.y, 0.22, 'signal'));
    city.trees.forEach((t) => { if (t.kind !== 'shrub') addCircle(t.x, t.y, t.kind === 'park' ? 0.5 : 0.35, 'tree'); });
    ROUNDABOUTS.forEach((id) => { const p = nodePos(id); addCircle(p.x, p.y, RB.island, 'island'); });
    if (city.pond) {
      const P = city.pond;
      const major = P.rx > P.ry;
      for (let t = -0.7; t <= 0.71; t += 0.35) {
        const cx = P.x + (major ? t * P.rx : 0), cy = P.y + (major ? 0 : t * P.ry);
        addCircle(cx, cy, Math.min(P.rx, P.ry) * Math.sqrt(1 - t * t) + 1, 'pond');
      }
    }
    const SB = city.schoolBus;
    addBox(SB.pos.x, SB.pos.y, SB.rot, SB.L / 2, SB.W / 2, 'bus');
    this.statics.push(Object.assign(new StaticObstacle(SB.pos.clone(), SB.rot, SB.L, SB.W), { kind: 'bus' }));
    this.schoolBus = { ...SB, active: false };

    // Ambient traffic on the avenue rings: cars, a bus and a truck in the
    // kerb lane, cyclists in the bike lanes.
    this.agents = [];
    city.loops.forEach((loop, li) => {
      const plans = {
        bike: Array(loop.ring === 0 ? 3 : 2).fill('bike'),
        outer: loop.ring === 0 ? ['bus', 'sedan', 'boxtruck', 'suv', 'hatch'] : [loop.reverse ? 'schoolbus' : 'bus', 'sedan', 'suv', 'sports'],
        inner: loop.ring === 0 ? ['sedan', 'suv', 'sports', 'pickup'] : ['sedan', 'hatch', 'suv'],
        // The highway carries the most traffic.
        hwOut: ['truck', 'sedan', 'suv', 'boxtruck', 'sedan', 'hatch', 'truck', 'pickup', 'van', 'sedan', 'suv', 'bus'],
        hwIn: ['sports', 'sedan', 'suv', 'sedan', 'sports', 'hatch', 'suv', 'sedan', 'sports'],
      };
      const plan = plans[loop.kind];
      plan.forEach((kind, k) => {
        const [L, W] = VEHICLE_DIMS[kind];
        const heavy = kind === 'bus' || kind === 'schoolbus' || kind === 'truck' || kind === 'boxtruck';
        const v0 = kind === 'bike' ? 4.5 + (k % 2) * 0.6
          : loop.kind === 'hwOut' ? (heavy ? 23 : 26) + (k % 3)
            : loop.kind === 'hwIn' ? 29 + (k % 3) * 1.5 + (kind === 'sports' ? 2 : 0)
              : heavy ? 8.5 : loop.kind === 'inner' ? 13 : 12;
        this.agents.push({ loop, s: (k / plan.length) * loop.length + li * 7, v: v0 * 0.6, v0, kind, L, W, tone: ((li * 7 + k * 3) % 11) / 11, braking: false });
      });
    });

    this.peds = city.peds.map((p) => ({ ...p }));
    this.jay = []; // jaywalkers, sometimes with a dog
    this.nextJay = 14;
    this._pathCache = new Map();

    // Comfort: keep lateral acceleration nearer 3 m/s^2 than Dash's default 4.
    this.config = plannerConfig({ speedLimit: SPEED_LIMITS.street, lanePreference: Math.sign(LANE_RIGHT), softLateralAccelerationLimit: 2.8, softLateralAccelerationPenalty: 160, linearLateralAccelerationPenalty: 16 });
    this.speedLimit = SPEED_LIMITS.avenue;
    this.car = new Car();
    this.simTime = 0;
    this.mode = 'auto'; // 'auto' | 'manual'
    this.autoState = 'lane'; // 'lane' | 'recover-plan' | 'recover'
    this.plannerMode = 'starting'; // 'gpu' | 'cpu'
    this.idle = 0;
    this.averagePlanTime = new MovingAverage(20);
    this.planMs = null;
    this.planCount = 0;
    this.version = 0;
    this.sentVersion = -1;
    this.plannedPath = null;
    this.lattice = null;
    this.controller = false;
    this.reached = 0;
    this.pending = null;
    this.collided = 0;
    // Crash dynamics layered on Dash's kinematic car: sideways velocity and a
    // yaw rate from impacts, bled off by tyre grip.
    this.slide = { lat: 0, w: 0 };
    this.nullFor = 0;
    this.slowFor = 0;
    this.events = [];
    this.behaviour = 'Starting up';
    this.lights = { brake: false, reverse: false };
    this.maneuver = null;
    this.recoveryId = 0;
    this.stats = { recoveries: 0, gearChanges: 0 };
    this.blinker = null; // 'left' | 'right' | 'hazard' | null
    this.audit = { redRuns: 0, yellowEntries: 0, greenEntries: 0, autoHits: 0, laneDepartures: 0, speeding: 0, hardBrakes: 0, maxLatAcc: 0, recoveries: 0, reseats: 0, distance: 0 };

    // Start on the south avenue, eastbound in the kerb lane.
    this.car.setPose(40, -AVE.outer, 0);
    this.car.velocity = 7;
    this._startWorkers();
    this.setRoute({ landmark: 1 });
  }

  // ------------------------------------------------------------ routing

  setRoute(dest) {
    const snap = snapToStreet(this.car.rearAxlePosition, this.car.rotation);
    const nodes = [snap.next];
    const stops = [];
    let node = snap.next;
    let dir = snap.dir;
    const n = this.landmarkNodes.length;
    let k = dest.landmark ?? ((this.reached + 1) % n);
    const legs = [];
    if (dest.node !== undefined) legs.push({ node: dest.node, index: null });
    for (let c = 0; c < n + 1; c++) { legs.push({ node: this.landmarkNodes[k], index: k }); k = (k + 1) % n; }
    for (const leg of legs) {
      if (leg.node !== node) {
        const seg = shortestRoute(node, dir, leg.node);
        if (!seg || !seg.length) break;
        nodes.push(...seg);
        dir = arriveDir(nodes[nodes.length - 2], nodes[nodes.length - 1]);
        node = leg.node;
      }
      stops.push({ ...leg });
    }

    const lanePath = new LanePath();
    routeAnchors(snap.point, snap.dir, snap.key, nodes, snap.prefix).forEach((p) => lanePath.addAnchor(p, false));
    lanePath.resampleAll();
    this.lanePath = lanePath;
    this.version++;

    const pts = lanePath.centerline;
    const station = new Float32Array(pts.length);
    for (let i = 1; i < pts.length; i++) station[i] = station[i - 1] + pts[i].distanceTo(pts[i - 1]);
    this.route = { pts, station, length: station[pts.length - 1] };

    // Closest approach to a point, searching forward so repeated streets don't alias.
    let from = 0;
    const along = (target) => {
      let best = Infinity, bestI = from;
      for (let i = from; i < pts.length; i++) {
        const d = pts[i].distanceToSquared(target);
        if (d < best) { best = d; bestI = i; }
        if (best < 400 && d > best + 1600) break;
      }
      from = bestI + 1;
      return station[bestI];
    };

    // Signals and roundabouts along the way, in order, plus every turn.
    this.controls = [];
    this.turns = [];
    const hops = [];
    let prevDir = snap.dir;
    nodes.forEach((id, i) => {
      const next = nodes[i + 1];
      const outDir = next !== undefined ? leaveDir(id, next) : prevDir;
      const s = along(nodePos(id));
      const cross = DIRS[prevDir].x * DIRS[outDir].y - DIRS[prevDir].y * DIRS[outDir].x;
      const uturn = DIRS[prevDir].dot(DIRS[outDir]) < -0.5;
      const side = uturn ? 'left' : cross > 0.5 ? 'left' : cross < -0.5 ? 'right' : null;
      if (side) this.turns.push({ station: s, side, node: id, rb: ROUNDABOUTS.has(id) });
      if (STOPS.has(id)) {
        this.controls.push({ type: 'stop', node: id, dIn: prevDir, station: s, stopStation: s - stopDistance(id, prevDir) });
      } else if (SIGNALS.has(id)) {
        this.controls.push({ type: 'signal', node: id, dIn: prevDir, dOut: outDir, axis: axisOf(DIRS[prevDir]), left: side === 'left', right: side === 'right', station: s, stopStation: s - stopDistance(id, prevDir) });
      } else if (ROUNDABOUTS.has(id)) {
        this.controls.push({ type: 'roundabout', node: id, side, station: s, stopStation: s - RB.outer - 4 });
      }
      if (next !== undefined && isHop(id, next)) hops.push([CORNERS.indexOf(id), CORNERS.indexOf(next)]);
      prevDir = next !== undefined ? arriveDir(id, next) : outDir;
    });

    // Signal left for the highway merge and right for the exit.
    const stationOf = (q) => { let best = Infinity, bi = 0; pts.forEach((p, i) => { const d = p.distanceToSquared(q); if (d < best) { best = d; bi = i; } }); return station[bi]; };
    const rampOf = (k) => this.city.ramps[k];
    hops.forEach(([k, j]) => {
      const on = rampOf(k).onPlan, off = rampOf(j).offPlan;
      this.turns.push({ station: stationOf(on[on.length - 1]) - 30, side: 'left', merge: true });
      this.turns.push({ station: stationOf(off[0]) + 10, side: 'right', exit: true });
    });
    if (snap.type === 'ramp' && snap.rampKind === 'on') {
      const on = snap.prefix;
      this.turns.push({ station: stationOf(on[0]) + 60, side: 'left', merge: true });
    }
    if (snap.type === 'highway') {
      const off = this.city.ramps[CORNERS.indexOf(snap.next)].offPlan;
      this.turns.push({ station: stationOf(off[0]) + 10, side: 'right', exit: true });
    }
    this.turns.sort((a, b) => a.station - b.station);

    from = 0;
    this.stops = stops.map((s) => ({ ...s, station: along(nodePos(s.node)) })).filter((s) => s.station > 30);
    const goal = this.stops[0];
    if (goal) {
      const before = (c) => c.station < goal.station;
      this.events.push({
        type: 'route-plan', index: goal.index, length: goal.station,
        signals: this.controls.filter((c) => c.type === 'signal' && before(c)).length,
        stopSigns: this.controls.filter((c) => c.type === 'stop' && before(c)).length,
        roundabouts: this.controls.filter((c) => c.type === 'roundabout' && before(c)).length,
        highway: hops.some(([k]) => stationOf(rampOf(k).onPlan[0]) < goal.station) || snap.type === 'highway' || snap.rampKind === 'on',
      });
    }

    const [st, l, idx] = lanePath.stationLatitudeFromPosition(this.car.rearAxlePosition, snap.prefix ? null : 1);
    this.station = st; this.latitude = l; this.aroundAnchorIndex = idx;
    this.plannerReset = true;
    this.lattice = null;
    this.events.push({ type: 'route' });
  }

  // A line for the HUD's decision log: what the stack decided and why.
  _decide(text, key = text) {
    if (this.mode !== 'auto') return;
    if (this._lastDecision === key && this.simTime - (this._lastDecisionT || 0) < 6) return;
    this._lastDecision = key;
    this._lastDecisionT = this.simTime;
    this.events.push({ type: 'decision', text });
  }

  _currentDest() {
    const d = this.stops?.[0];
    if (d && d.index === null) return { node: d.node };
    return { landmark: d ? d.index : (this.reached + 1) % this.landmarkNodes.length };
  }

  goTo(dest) {
    if (this.mode === 'manual' || this.autoState !== 'lane') { this.pending = dest; return; }
    this.setRoute(dest);
  }

  get destination() {
    return this.stops?.[0] ?? null;
  }

  // ------------------------------------------------------------ world

  _loopPos(a) {
    const smp = sampleLoop(a.loop, a.s);
    return { pos: smp.pos, dir: smp.dir };
  }

  trafficAt() {
    return this.agents.map((a, id) => {
      const { pos, dir } = this._loopPos(a);
      // Indicate ~30 m before a corner of the loop.
      const ahead = sampleLoop(a.loop, a.s + 30).dir;
      const turn = dir.x * ahead.y - dir.y * ahead.x;
      const blinker = a.kind === 'bike' ? null : turn > 0.3 ? 'left' : turn < -0.3 ? 'right' : null;
      return { id, pos, rot: Math.atan2(dir.y, dir.x), dir, vel: dir.clone().multiplyScalar(a.v), kind: a.kind, L: a.L, W: a.W, tone: a.tone, braking: a.braking, v: a.v, blinker };
    });
  }

  _pedPath(path) {
    let c = this._pathCache.get(path);
    if (!c) {
      const cum = [0];
      for (let i = 1; i <= path.length; i++) cum.push(cum[i - 1] + path[i % path.length].distanceTo(path[i - 1]));
      c = { cum, length: cum[cum.length - 1] };
      this._pathCache.set(path, c);
    }
    return c;
  }

  pedsAt() {
    return this.peds.map((p) => {
      const c = this._pedPath(p.path);
      const s = ((p.s % c.length) + c.length) % c.length;
      let i = 0;
      while (i < c.cum.length - 2 && c.cum[i + 1] < s) i++;
      const a = p.path[i], b = p.path[(i + 1) % p.path.length];
      const t = (s - c.cum[i]) / Math.max(1e-6, c.cum[i + 1] - c.cum[i]);
      const pos = a.clone().lerp(b, t);
      return { pos, rot: Math.atan2(b.y - a.y, b.x - a.x), tone: p.tone, phase: s, moving: !p.paused };
    });
  }

  // Intelligent Driver Model for every agent: follow the vehicle ahead on the
  // same loop, stop at red lights, and don't drive into the ego car.
  _stepAgents(dt) {
    const ego = this.car.position;
    const egoV = Math.max(0, this.car.velocity);
    const t = this.simTime;
    // Ego footprint as three points along its body.
    const eh = Vector2.fromAngle(this.car.rotation);
    const egoPts = [-2.1, 0, 2.1].map((o) => ego.clone().addScaledVector(eh, o));
    const byLoop = new Map();
    this.agents.forEach((a) => { if (!byLoop.has(a.loop)) byLoop.set(a.loop, []); byLoop.get(a.loop).push(a); });
    this.agents.forEach((a) => {
      const L = a.loop.length;
      let gap = Infinity, leadV = a.v0;
      byLoop.get(a.loop).forEach((o) => {
        if (o === a) return;
        const d = (((o.s - a.s) % L) + L) % L;
        const g = d - (o.L + a.L) / 2 - 0.5;
        if (d > 0 && g < gap) { gap = g; leadV = o.v; }
      });
      for (const st of a.loop.stops) {
        const d = (((st.s - a.s) % L) + L) % L;
        if (d > 80) continue;
        const toLine = d - a.L / 2;
        if (toLine < -0.5) continue;
        const sig = signalState(st.node, st.axis, t);
        const canStop = toLine > (a.v * a.v) / (2 * 3.5) + 0.5;
        if (sig.colour === 'red' || (sig.colour === 'yellow' && canStop)) {
          if (toLine < gap) { gap = Math.max(0.1, toLine); leadV = 0; }
        }
        break;
      }
      // Swept check along the agent's own (possibly curving) path: if the
      // ego car sits anywhere on the next 40 m, it is the leader.
      const reach = a.W / 2 + 1.2;
      for (let d = 0; d <= 40; d += 1.5) {
        const q = sampleLoop(a.loop, a.s + a.L / 2 + d).pos;
        if (egoPts.some((e) => e.distanceToSquared(q) < reach * reach)) {
          const g = d - 0.5;
          if (g < gap) { gap = Math.max(0.05, g); leadV = egoV; }
          break;
        }
      }
      const aMax = a.kind === 'bike' || a.kind === 'bus' || a.kind === 'truck' ? 1.0 : 1.6;
      const bComf = 2.5, s0 = a.kind === 'bike' ? 1.5 : 2.5, T = 1.3;
      const sStar = s0 + Math.max(0, a.v * T + (a.v * (a.v - leadV)) / (2 * Math.sqrt(aMax * bComf)));
      let acc = aMax * (1 - (a.v / a.v0) ** 4 - (gap === Infinity ? 0 : (sStar / Math.max(0.3, gap)) ** 2));
      acc = Math.max(-8, acc);
      a.braking = acc < -0.6 || (a.v < 0.3 && gap < 12);
      a.v = Math.max(0, Math.min(a.v0 * 1.05, a.v + acc * dt));
      a.s += a.v * dt;
    });

    // Pedestrians pause if the car is right in front of them.
    this.peds.forEach((p) => { p.s += (p.paused ? 0 : p.v) * dt; });
    if (Math.floor(this.simTime * 4) !== this._pedTick) {
      this._pedTick = Math.floor(this.simTime * 4);
      this.pedsAt().forEach((q, i) => {
        const d = q.pos.distanceTo(ego);
        const fwd = Vector2.fromAngle(q.rot);
        this.peds[i].paused = d < 5 && ego.clone().sub(q.pos).dot(fwd) > 0 && Math.abs(this.car.velocity) > 0.3;
      });
    }
  }

  // Now and then someone crosses mid-block ahead of the car (often walking a
  // dog). They're dynamic obstacles to the planner, which must yield.
  _stepJaywalkers(dt) {
    const ego = this.car.position;
    this.jay.forEach((j) => {
      const next = j.pos.clone().addScaledVector(j.dir, 2.5);
      j.paused = next.distanceTo(ego) < 3.8 && Math.abs(this.car.velocity) > 0.2;
      if (!j.paused) j.pos.addScaledVector(j.dir, j.v * dt);
      j.t += dt;
      j.dog = j.hasDog ? j.pos.clone().addScaledVector(j.dir, 0.9).addScaledVector(new Vector2(-j.dir.y, j.dir.x), 0.55) : null;
    });
    this.jay = this.jay.filter((j) => j.t < j.life);
    if (this.mode !== 'auto' || this.autoState !== 'lane' || this.simTime < this.nextJay || this.jay.length >= 2 || !this.lanePath) return;
    for (let d = 55; d <= 90; d += 5) {
      const [c] = this.lanePath.sampleStations(this.station + d, 1, 0);
      if (!c) return;
      const snap = snapToStreet(c.pos, c.rot);
      if (snap.type !== 'street') continue;
      let nodeD = Infinity;
      for (let id = 0; id < N * N; id++) nodeD = Math.min(nodeD, nodePos(id).distanceTo(c.pos));
      if (nodeD < 30) continue;
      const side = Math.random() < 0.5 ? -1 : 1;
      const n = Vector2.fromAngle(c.rot + Math.PI / 2);
      const hasDog = Math.random() < 0.6;
      this.jay.push({ pos: c.pos.clone().addScaledVector(n, side * 8.2), dir: n.clone().multiplyScalar(-side), v: hasDog ? 1.1 : 1.35, t: 0, life: 16.4 / 1.1 + 1, hasDog, tone: Math.random() });
      this.nextJay = this.simTime + 22 + Math.random() * 16;
      this.events.push({ type: 'jaywalker' });
      this._decide(`Pedestrian${hasDog ? ' and dog' : ''} stepping out ${d} m ahead: predicted path crosses ours, yielding`);
      return;
    }
    this.nextJay = this.simTime + 3;
  }

  // Nearest point on the route within a station window: [station, latitude, tangent].
  _project(p, s0, s1) {
    const { pts, station } = this.route;
    let lo = 0, hi = station.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (station[m] < s0) lo = m + 1; else hi = m; }
    let best = Infinity, bi = -1;
    for (let i = lo; i < pts.length && station[i] <= s1; i++) {
      const d = pts[i].distanceToSquared(p);
      if (d < best) { best = d; bi = i; }
    }
    if (bi < 0) return null;
    const a = pts[Math.max(0, bi - 1)], b = pts[Math.min(pts.length - 1, bi + 1)];
    const t = b.clone().sub(a).normalize();
    const rel = p.clone().sub(pts[bi]);
    const st = station[bi] + rel.dot(t);
    // Off either end of the window (behind the car, say): not a match.
    if (st < s0 - 1 || st > s1 + 1) return null;
    return [st, t.x * rel.y - t.y * rel.x, t];
  }

  _dynamicObstacles(time) {
    const out = [];
    const here = this.car.position;
    this.trafficAt().forEach((c) => {
      if (c.pos.distanceTo(here) > NEAR) return;
      const pr = this._project(c.pos, this.station - 30, this.station + NEAR);
      if (!pr || Math.abs(pr[1]) > 10) return;
      const [s, l, t] = pr;
      const vs = c.vel.dot(t);
      const vl = t.x * c.vel.y - t.y * c.vel.x;
      // Same-direction traffic behind us is its job to avoid, not ours: Dash
      // dilates vehicles ~20 m along the lane, which would swallow the ego.
      if (s < this.station + 1 && vs > -0.5) return;
      const parallel = Math.abs(vs) >= Math.abs(vl);
      const o = new DynamicObstacle(c.kind === 'bike' ? 'cyclist' : 'vehicle', new Vector2(s - vs * this.simTime, l - vl * this.simTime), new Vector2(vs, vl), parallel);
      if (c.kind !== 'bike') o.size = parallel ? { w: c.L / 2, h: c.W / 2 } : { w: c.W / 2, h: c.L / 2 };
      out.push(o);
    });
    this.jay.forEach((j) => {
      [j.pos, j.dog].forEach((q) => {
        if (!q || q.distanceTo(here) > 90) return;
        const pr = this._project(q, this.station - 10, this.station + 100);
        if (!pr || Math.abs(pr[1]) > 12) return;
        const [s, l, t] = pr;
        const vel = j.paused ? new Vector2(0, 0) : j.dir.clone().multiplyScalar(j.v);
        const vs = vel.dot(t), vl = t.x * vel.y - t.y * vel.x;
        out.push(new DynamicObstacle('pedestrian', new Vector2(s - vs * this.simTime, l - vl * this.simTime), new Vector2(vs, vl), true));
      });
    });
    return out.filter((o) => o.positionAtTime(time).x >= 0);
  }

  _schoolBusWall(front) {
    const bus = this.schoolBus;
    if (!bus.active || !this.route) return null;
    const pr = this._project(bus.pos, front - 5, front + 140);
    if (!pr || Math.abs(pr[1]) > 8 || pr[0] > front + 140) return null;
    // The projection must land beside the bus, not just at the end of the window.
    const [foot] = this.lanePath.sampleStations(pr[0], 1, 0);
    if (!foot || foot.pos.distanceTo(bus.pos) > 9) return null;
    let stopAt = pr[0] - bus.L / 2 - 20;
    // Never stop on a roundabout: hold before entering, or if already
    // circulating, stop on the straight just past the exit.
    const rb = this.controls.find((c) => c.type === 'roundabout' && stopAt > c.stopStation - 2 && stopAt < c.station + RB.clear + 10);
    if (rb) stopAt = front < rb.stopStation - 1 ? rb.stopStation : rb.station + RB.clear + 10;
    const dist = stopAt - front;
    if (dist < -2) return null; // already level with it: carry on
    this.wait = { reason: 'bus', dist: Math.max(0, dist), at: Math.max(this.station + 5, stopAt) };
    if (dist < 90) this._decide('School bus ahead with its stop arm out: holding at least 20 m back (HTA s.175)', `bus${Math.floor(this.simTime / 32)}`);
    const [p] = this.lanePath.sampleStations(Math.max(this.station + 5, stopAt + WALL_AHEAD), 1, 0);
    return p ? Object.assign(new StaticObstacle(p.pos, p.rot, 1.0, 9.5), { kind: 'wall' }) : null;
  }

  // Traffic approaching along the road we'd turn right into, or anyone on foot near the corner.
  _crossTraffic(ctrl) {
    const D = DIRS[ctrl.dOut];
    const n = nodePos(ctrl.node);
    const cars = this.trafficAt().some((c) => {
      if (c.dir.dot(D) < 0.7) return false;
      const rel = c.pos.clone().sub(n);
      const along = rel.dot(D);
      return along > -80 && along < 8 && Math.abs(D.x * rel.y - D.y * rel.x) < 12;
    });
    return cars || this.jay.some((j) => j.pos.distanceTo(n) < 25);
  }

  // Oncoming traffic that makes an unprotected left turn unsafe right now.
  _oncoming(ctrl) {
    const D = DIRS[ctrl.dIn];
    const n = nodePos(ctrl.node);
    return this.trafficAt().some((c) => {
      if (c.dir.dot(D) > -0.7) return false;
      const rel = c.pos.clone().sub(n);
      const along = rel.dot(D);
      const lat = Math.abs(D.x * rel.y - D.y * rel.x);
      return lat < 14 && along > -6 && along < 10 + c.v * 3.5;
    });
  }

  // Signals and left-turn gap acceptance, as walls across the planner's road.
  // Distances are to the front bumper. On yellow the car decides once whether
  // it can stop comfortably and sticks to it; once the bumper is over the line
  // it clears the junction.
  _ruleWalls(time) {
    this.wait = null;
    const front = this.station + FRONT_OVERHANG;
    const v = Math.max(0, this.car.velocity);
    // Stopped school bus with its red lights flashing: stop at least 20 m
    // away, from either direction (HTA s.175).
    // A stopped school bus and a signal can both apply: keep whichever wall is
    // nearer, and never let one hide the other.
    const busWall = this._schoolBusWall(front);
    const busWait = this.wait;
    const walls = this._controlWalls(time, front, v);
    if (busWall && (!walls.length || busWait.dist <= this.wait.dist)) { this.wait = busWait; return [busWall, ...walls]; }
    if (busWall) return [...walls, busWall];
    return walls;
  }

  _controlWalls(time, front, v) {
    for (const c of this.controls) {
      const dist = c.stopStation - front;
      // Unprotected left (Ontario practice): on green, pull into the junction
      // and wait there for a gap; once in, clear it when the gap comes, even if
      // the light has changed.
      if (c.type === 'signal' && c.left && !c.cleared && dist < -0.5 && front < c.station - 2) {
        if (this._oncoming(c)) {
          const at = c.station - 1;
          if (!c.yieldLogged) { c.yieldLogged = true; this._decide('Unprotected left: into the junction, oncoming traffic inside the gap, waiting to turn'); }
          this.wait = { reason: 'yield', dist: Math.max(0, at - front - 8), ctrl: c, at };
          const [p] = this.lanePath.sampleStations(at, 1, 0);
          return p ? [Object.assign(new StaticObstacle(p.pos, p.rot, 1.0, 9.5), { kind: 'wall' })] : [];
        }
        if (c.yieldLogged && !c.goLogged) { c.goLogged = true; this._decide('Gap accepted: completing the left turn'); }
        c.cleared = true;
      }
      if ((c.type !== 'signal' && c.type !== 'stop') || c.committed) continue;
      if (dist < -0.5) continue;
      if (dist > 90) break;
      if (c.type === 'stop') {
        // All-way stop: come to a complete stop at the line, then go when clear.
        if (dist < 15 && v < 0.15) c.stopT = c.stopT ?? time;
        if (c.stopT != null && time - c.stopT > 1.2 && !this.jay.some((j) => j.pos.distanceTo(nodePos(c.node)) < 22)) {
          c.committed = true;
          this.stopDoneUntil = this.simTime + 3;
          this._decide(`All-way stop: held ${(time - c.stopT).toFixed(1)} s at the line, junction clear, proceeding`);
          continue;
        }
        if (!c.logged) { c.logged = true; this._decide(`Stop sign ${Math.round(dist)} m ahead: full stop required`); }
        this.wait = { reason: 'stop', dist, ctrl: c, at: c.stopStation };
        const [p] = this.lanePath.sampleStations(c.stopStation + WALL_AHEAD, 1, 0);
        return p ? [Object.assign(new StaticObstacle(p.pos, p.rot, 1.0, 9.5), { kind: 'wall' })] : [];
      }
      const sig = signalState(c.node, c.axis, time);
      let reason = null;
      if (sig.colour === 'green') {
        c.decision = null;
      } else if (sig.colour === 'yellow') {
        if (c.decision == null) {
          const need = (v * v) / (2 * 3.0) + 1;
          c.decision = dist > need ? 'stop' : 'go';
          this._decide(c.decision === 'stop'
            ? `Yellow, ${Math.round(dist)} m to the line at ${Math.round(v * 3.6)} km/h: stopping (needs ${Math.round(need)} m at 3 m/s²)`
            : `Yellow, ${Math.round(dist)} m to the line at ${Math.round(v * 3.6)} km/h: can't stop comfortably, clearing the junction`);
        }
        if (c.decision === 'go') { c.committed = true; continue; }
        reason = 'red';
      } else {
        reason = 'red';
        // Ontario: right on red after a complete stop, once the way is clear.
        if (c.right) {
          if (dist < 8 && v < 0.2) c.stopT = c.stopT ?? time;
          else if (dist > 6) c.stopT = null;
          if (c.stopT != null && time - c.stopT > 1.5 && !this._crossTraffic(c)) {
            c.committed = true;
            this.rtorUntil = this.simTime + 6;
            this._decide('Red, turning right: full stop made, no cross traffic or pedestrians, turning (HTA s.144(18))');
            this.events.push({ type: 'rtor', node: c.node });
            continue;
          }
        }
      }
      if (sig.colour === 'green') c.stopT = null;
      if (reason === 'red' && sig.colour === 'red' && !c.redLogged && dist < 70) {
        c.redLogged = true;
        this._decide(`Red light ${Math.round(dist)} m ahead: planning a smooth stop at the line`);
      }
      if (!reason && c.redLogged && sig.colour === 'green' && !c.greenLogged) { c.greenLogged = true; this._decide('Green: proceeding through the junction'); }
      if (!reason) return [];
      this.wait = { reason, dist, ctrl: c, at: c.stopStation };
      // Join the queue: if traffic in our lane is already stopped for this
      // light, the wall moves to just behind the last car, so the planner
      // queues instead of weaving round stopped cars at a red.
      let wallAt = c.stopStation + WALL_AHEAD;
      if (reason === 'red') {
        this.trafficAt().forEach((q) => {
          if (q.v > 1.5 || q.pos.distanceTo(this.car.position) > 110) return;
          const pr = this._project(q.pos, front, c.stopStation + 3);
          if (!pr || Math.abs(pr[1] - this.latitude) > 2.4 || q.dir.dot(pr[2]) < 0.7) return;
          const rear = pr[0] - q.L / 2;
          if (rear + 6.5 < wallAt) { wallAt = rear + 6.5; this.wait = { reason, dist: Math.max(0, rear - 3 - front), ctrl: c, at: c.stopStation, queue: true }; }
        });
      }
      const [p] = this.lanePath.sampleStations(wallAt, 1, 0);
      if (!p) return [];
      return [Object.assign(new StaticObstacle(p.pos, p.rot, 1.0, 9.5), { kind: 'wall' })];
    }
    return [];
  }

  // ------------------------------------------------------------ workers

  _startWorkers() {
    try {
      this.worker = new Worker(new URL('../planner.worker.js', import.meta.url));
      this.plannerReady = false;
      this.worker.onmessage = (e) => this._onPlan(e.data);
      this.worker.onerror = () => this._useFallback('unsupported');
    } catch (e) {
      this._useFallback('unsupported');
    }
    try {
      this.recoveryWorker = new Worker(new URL('./recovery.worker.js', import.meta.url));
      this.recoveryWorker.onmessage = (e) => this._onRecovery(e.data);
    } catch (e) {
      this.recoveryWorker = null;
    }
  }

  _useFallback(reason) {
    this.plannerMode = 'cpu';
    this.fallbackReason = reason;
    this.worker?.terminate();
    this.worker = null;
    this.plannedPath = null;
    this.lattice = null;
  }

  _onPlan(data) {
    if (data.ready) { this.plannerMode = 'gpu'; this.plannerReady = true; return; }
    if (data.error !== undefined) { this._useFallback('unsupported'); return; }
    this.averagePlanTime.addSample((performance.now() - this.lastPlanStart) / 1000);
    this.planMs = data.planMs;
    this.plannerReady = true;
    this.planCount++;
    if (this.planCount >= 4 && this.averagePlanTime.average > 0.4) { this._useFallback('slow'); return; }
    if (this.plannerReset || data.failed || this.mode !== 'auto' || this.autoState !== 'lane' || data.version !== this.version) return;

    this.lattice = new RoadLattice(this.lanePath, data.latticeStartStation, this.config).lattice;
    let { path, fromVehicleSegment } = data;
    if (path === null) { this.controller = null; this.plannedPath = null; return; }
    const hydrate = (p) => Object.setPrototypeOf(p.pos, Vector2.prototype);
    path.forEach(hydrate);
    fromVehicleSegment.forEach(hydrate);
    if (data.fromVehicleParams.type === 'cubic') {
      const end = fromVehicleSegment[fromVehicleSegment.length - 1];
      const builder = new CubicPath(this.car.pose, end, data.fromVehicleParams.params);
      if (builder.optimize()) {
        fromVehicleSegment = builder.buildPath(Math.ceil(builder.params.sG / 0.25));
        const v0sq = this.car.velocity * this.car.velocity;
        const accel = (end.velocity * end.velocity - v0sq) / 2 / builder.params.sG;
        const ds = builder.params.sG / (fromVehicleSegment.length - 1);
        fromVehicleSegment.forEach((p, i) => {
          p.velocity = Math.sqrt(Math.max(0, 2 * accel * ds * i + v0sq));
          p.acceleration = accel;
        });
      }
    }
    const full = fromVehicleSegment.concat(path);
    full.forEach(hydrate);
    this._comfortProfile(full);
    const followPath = new Path(full);
    if (this.controller) this.controller.replacePath(followPath);
    else this.controller = new FollowController(followPath, this.car);
    this.plannedPath = full;
  }

  // Speed profile post-processing: cap speed so lateral acceleration stays
  // under ~3 m/s^2 in curves, then a backward pass so braking into those caps
  // never exceeds 3 m/s^2. Accelerations are recomputed so Dash's controller
  // sees a consistent profile.
  _comfortProfile(path) {
    const A_LAT = 2.6, A_DEC = 3.0;
    const n = path.length;
    if (n < 3) return;
    const ds = new Float32Array(n);
    for (let i = 1; i < n; i++) ds[i] = path[i].pos.distanceTo(path[i - 1].pos);
    for (let i = 0; i < n; i++) {
      const a = path[Math.max(0, i - 2)], b = path[Math.min(n - 1, i + 2)];
      const span = a.pos.distanceTo(b.pos);
      const k = span > 0.5 ? Math.abs(wrap(b.rot - a.rot)) / span : Math.abs(path[i].curv || 0);
      const cap = k > 1e-4 ? Math.sqrt(A_LAT / k) : Infinity;
      if (path[i].velocity > cap) path[i].velocity = Math.max(2.0, cap);
    }
    for (let i = n - 2; i >= 0; i--) {
      const lim = Math.sqrt(path[i + 1].velocity ** 2 + 2 * A_DEC * ds[i + 1]);
      if (path[i].velocity > lim) path[i].velocity = lim;
    }
    for (let i = 1; i < n; i++) {
      path[i].acceleration = ds[i] > 1e-3 ? (path[i].velocity ** 2 - path[i - 1].velocity ** 2) / (2 * ds[i]) : 0;
    }
  }

  // Stopped traffic just ahead in our lane: we're queued, not stuck.
  _queuedBehind() {
    return this.trafficAt().some((c) => {
      if (c.v > 1) return false;
      const pr = this._project(c.pos, this.station + 2, this.station + FRONT_OVERHANG + 12);
      // Only traffic going our way: a stopped oncoming car near the turn isn't a queue.
      return pr && Math.abs(pr[1] - this.latitude) < 1.8 && c.dir.dot(pr[2]) > 0.7;
    });
  }

  _plannerStatics() {
    const here = this.car.position;
    const fwd = Vector2.fromAngle(this.car.rotation);
    return this.statics.filter((o) => {
      const d = o.pos.distanceTo(here);
      if (d > NEAR + (o.kind === 'median' ? 60 : 0)) return false;
      // Already beside or behind the car: a forward-only planner can't hit
      // it, and including it could put the ego inside its buffer.
      if (o.kind !== 'median' && d < 9 && o.pos.clone().sub(here).dot(fwd) < 3) return false;
      return true;
    });
  }

  // Keep right except to pass, but (Ontario HTA) begin a left turn from the
  // far-left lane: on multi-lane roads, move left ahead of a left turn, and
  // take the inner lane of a roundabout for a left or U-turn.
  _preferLeft() {
    const front = this.station + FRONT_OVERHANG;
    if (this.roadType === 'avenue' || this.roadType === 'highway') {
      const t = this.turns.find((q) => !q.merge && !q.exit && q.station - front > -5);
      if (t && t.side === 'left' && !t.rb && t.station - front < 200) return true;
    }
    const rb = this.controls.find((c) => c.type === 'roundabout' && c.side === 'left' && front > c.stopStation + 4 && front < c.station + 14);
    return !!rb;
  }

  _requestPlan() {
    this.plannerReady = false;
    this.lastPlanStart = performance.now();
    let pose = this.car.pose;
    let startTime = this.simTime;
    if (!this.plannerReset && this.controller) {
      const latency = this.averagePlanTime.average || 0;
      pose = this.controller.predictPoseAfterTime(pose, latency) || pose;
      startTime += latency;
    }
    // Dash can't plan from a standstill, so plan from a rolling start and let
    // the controller accelerate onto it.
    if (!(pose.velocity >= ROLLING_START)) pose = { ...pose, velocity: ROLLING_START };
    const reset = this.plannerReset;
    this.plannerReset = false;
    const preferLeft = this._preferLeft();
    const msg = {
      version: this.version,
      // Dash's lane preference is a soft cost; ahead of a left turn it needs
      // to outweigh the planner's hysteresis so the change happens early.
      config: { ...this.config, speedLimit: this.speedLimit, ...(preferLeft ? { lanePreference: 1, lanePreferenceDiscount: 240 } : { lanePreference: -1 }) },
      vehiclePose: pose,
      vehicleStation: this.station,
      startTime,
      staticObstacles: [...this._plannerStatics(), ...this._ruleWalls(startTime)],
      dynamicObstacles: this._dynamicObstacles(startTime),
      reset,
    };
    if (this.sentVersion !== this.version) { msg.lanePath = this.lanePath; this.sentVersion = this.version; }
    this.worker.postMessage(msg);
  }

  // ------------------------------------------------------------ recovery

  _laneReady() {
    const snap = snapToStreet(this.car.rearAxlePosition, this.car.rotation);
    const rel = this.car.rearAxlePosition.clone().sub(snap.lanePoint);
    const lat = Math.abs(rel.x * snap.axis.y - rel.y * snap.axis.x);
    const head = Math.abs(wrap(this.car.rotation - Math.atan2(snap.axis.y, snap.axis.x)));
    return lat < 0.9 && head < 0.25 && this.collided <= 0;
  }

  _obstaclesNear(cx, cy, r) {
    const boxes = [], circles = [];
    const c0 = new Vector2(cx, cy);
    this.solids.near(cx, cy, r).forEach((s) => {
      if (s.box) boxes.push({ x: s.x, y: s.y, rot: s.rot, hw: s.hw, hh: s.hh });
      else circles.push({ x: s.x, y: s.y, r: s.r });
    });
    this.bodies.forEach((b) => { if (b.pos.distanceTo(c0) < r) boxes.push({ x: b.pos.x, y: b.pos.y, rot: b.rot, hw: b.hw, hh: b.hh }); });
    this.trafficAt().forEach((c) => {
      if (c.pos.distanceTo(c0) < r) boxes.push({ x: c.pos.x, y: c.pos.y, rot: c.rot, hw: c.L / 2 + 0.3, hh: c.W / 2 + 0.2 });
    });
    this.pedsAt().forEach((q) => { if (q.pos.distanceTo(c0) < r) circles.push({ x: q.pos.x, y: q.pos.y, r: 0.5 }); });
    return { boxes, circles };
  }

  _laneBlockedAhead(p, axis, len) {
    const hit = (q) => {
      const rel = q.clone().sub(p);
      const along = rel.dot(axis);
      return along > -2 && along < len && Math.abs(axis.x * rel.y - axis.y * rel.x) < 2.3;
    };
    return this.statics.some((o) => o.kind !== 'median' && o.kind !== 'island' && o.pos.distanceToSquared(p) < 900 && hit(o.pos))
      || this.trafficAt().some((c) => c.v < 1 && hit(c.pos));
  }

  _startRecovery(dest, attempt = 0, reason = 'resume') {
    this.events.push({ type: 'recover-start', reason });
    this.wait = null;
    if (reason !== 'resume' && reason !== 'replan') this.audit.recoveries++;
    if (reason !== 'replan') this.replans = 0;
    this.autoState = 'recover-plan';
    this.recoverDest = dest || this.recoverDest || this._currentDest();
    this.recoverAttempt = attempt;
    this.plannedPath = null;
    this.lattice = null;
    this.maneuver = null;
    this.controller = false;
    const rear = this.car.rearAxlePosition;
    const snaps = [snapToStreet(rear, this.car.rotation)];
    if (!snaps[0].forced) snaps.push(snapToStreet(rear, this.car.rotation + Math.PI));
    const dists = attempt === 0 ? [14, 20, 27, 35, 45] : [18, 30, 42, 55, 70];
    const goals = [];
    if (snaps[0].prefix) {
      // Highway or ramp: goals follow the road's own curve.
      const pre = snaps[0].prefix;
      let i0 = 0, bd = Infinity;
      pre.forEach((q, i) => { const d = q.distanceToSquared(rear); if (d < bd) { bd = d; i0 = i; } });
      [12, 20, 30, 42, 56, 72].forEach((dist) => {
        let acc = 0, i = i0;
        while (i < pre.length - 1 && acc < dist) { acc += pre[i + 1].distanceTo(pre[i]); i++; }
        const a = pre[Math.max(0, i - 1)], b = pre[Math.min(pre.length - 1, i + 1)];
        const t = b.clone().sub(a).normalize();
        const lane = pre[i].clone().add(new Vector2(t.y, -t.x).multiplyScalar(1.85));
        if (!this._laneBlockedAhead(lane, t, 18)) goals.push({ x: lane.x, y: lane.y, th: Math.atan2(t.y, t.x) });
      });
    }
    const lanes = [];
    snaps.forEach((snap) => {
      if (!snap.prefix) lanes.push({ snap, lat: 0 });
    });
    // The far lane only if the near one didn't work out: it leaves the car
    // beside the median or oncoming traffic.
    if (attempt > 0) snaps.forEach((snap) => { if (snap.type !== 'oneway' && !snap.prefix) lanes.push({ snap, lat: 3.7 }); });
    lanes.forEach(({ snap, lat }) => dists.forEach((d) => {
      const left = new Vector2(-snap.axis.y, snap.axis.x);
      const p = snap.lanePoint.clone().addScaledVector(snap.axis, d).addScaledVector(left, lat);
      if (p.x < -15 || p.y < -15 || p.x > EXTENT + 15 || p.y > EXTENT + 15) return;
      // Stay on the street itself: never on its imaginary extension past the grid.
      const along = Math.abs(snap.axis.x) > 0.5 ? p.x : p.y;
      if (along < -2 || along > EXTENT + 2) return;
      if ([...ROUNDABOUTS].some((id) => nodePos(id).distanceTo(p) < RB.outer + 8)) return;
      // Don't park the car right behind something blocking its lane: the lane
      // planner needs room to pull out around it.
      if (this._laneBlockedAhead(p, snap.axis, 18)) return;
      goals.push({ x: p.x, y: p.y, th: Math.atan2(snap.axis.y, snap.axis.x) });
    }));
    const request = { start: { x: rear.x, y: rear.y, th: this.car.rotation }, goals, budgetMs: 400 };
    let cx = rear.x, cy = rear.y;
    goals.forEach((g) => { cx += g.x; cy += g.y; });
    cx /= goals.length + 1; cy /= goals.length + 1;
    Object.assign(request, this._obstaclesNear(cx, cy, 95));
    this.recoveryId++;
    this.recoverySent = this.simTime;
    if (this.recoveryWorker && goals.length) this.recoveryWorker.postMessage({ id: this.recoveryId, request });
    else this._reseat(goals.length ? 'no-worker' : 'no-goals');
  }

  _onRecovery({ id, result }) {
    if (id !== this.recoveryId || this.autoState !== 'recover-plan' || this.mode !== 'auto') return;
    this.recoveryMs = result.ms;
    if (result.ok) {
      this.maneuver = { path: result.path, i: 0, changes: result.changes, best: Infinity, lastProgress: this.simTime, explored: result.explored, replans: this.replans || 0 };
      this.autoState = 'recover';
      this.stats.recoveries++;
      this.stats.gearChanges += result.changes;
      this.events.push({ type: 'recover', changes: result.changes, ms: result.ms });
    } else if (this.recoverAttempt < 1) {
      this._startRecovery(this.recoverDest, this.recoverAttempt + 1, 'no-path');
    } else {
      this._reseat('no-path');
    }
  }

  // Last resort: put the car back in the nearest lane, like a safety driver would.
  _poseClear(rear, th) {
    const h = Vector2.fromAngle(th);
    const centre = rear.clone().addScaledVector(h, 1.43);
    const shapes = [...this.solids.near(centre.x, centre.y, 8), ...this.bodies.filter((b) => b.pos.distanceTo(centre) < 10).map((b) => ({ box: true, x: b.pos.x, y: b.pos.y, rot: b.rot, hw: b.hw, hh: b.hh }))];
    return [-1.55, 0, 1.55].every((o) => {
      const p = centre.clone().addScaledVector(h, o);
      return shapes.every((b) => {
        if (!b.box) return Math.hypot(p.x - b.x, p.y - b.y) - b.r > 1.1;
        const cs = Math.cos(-b.rot), sn = Math.sin(-b.rot);
        const dx = p.x - b.x, dy = p.y - b.y;
        const lx = dx * cs - dy * sn, ly = dx * sn + dy * cs;
        return Math.hypot(lx - Math.max(-b.hw, Math.min(b.hw, lx)), ly - Math.max(-b.hh, Math.min(b.hh, ly))) > 1.1;
      });
    });
  }

  _reseat(reason = 'fallback') {
    this.events.push({ type: 'reseat', reason });
    this.audit.reseats++;
    const snap = snapToStreet(this.car.rearAxlePosition, this.car.rotation);
    const th = Math.atan2(snap.axis.y, snap.axis.x);
    let p = null;
    for (const d of [8, 20, 34, 50, -10, 70]) {
      const q = snap.lanePoint.clone().addScaledVector(snap.axis, d);
      if (this._poseClear(q, th)) { p = q; break; }
    }
    if (!p) p = snap.lanePoint.clone().addScaledVector(snap.axis, 8);
    this.car.setPose(p.x, p.y, th);
    this.slide = { lat: 0, w: 0 };
    this.laneSince = this.simTime;
    this.maneuver = null;
    this.autoState = 'lane';
    this.controller = false;
    this.events.push({ type: 'reset' });
    this.setRoute(this.pending || this.recoverDest || this._currentDest());
    this.pending = null;
  }

  // Tracks the manoeuvre one gear at a time. Wheels are set while stopped
  // before each segment (as when parking), then steering is feedforward from
  // the planned curvature plus feedback on cross-track and heading error,
  // worked out in the direction of motion so it holds in reverse too.
  _followManeuver() {
    const m = this.maneuver;
    const path = m.path;
    const rear = this.car.rearAxlePosition;
    const dir = path[m.i].dir;
    let end = m.i;
    while (end + 1 < path.length && path[end + 1].dir === dir) end++;
    let bi = m.i, bd = Infinity;
    for (let k = m.i; k <= Math.min(end, m.i + 25); k++) {
      const d = (path[k].x - rear.x) ** 2 + (path[k].y - rear.y) ** 2;
      if (d < bd) { bd = d; bi = k; }
    }
    m.i = bi;
    let remaining = 0;
    for (let k = m.i; k < end; k++) remaining += Math.hypot(path[k + 1].x - path[k].x, path[k + 1].y - path[k].y);
    if (m.i === end) remaining = Math.sqrt(bd);
    const v = this.car.velocity;
    const stop = { gas: 0, brake: 1, steer: 0 };
    if (remaining < m.best - 0.2) { m.best = remaining; m.lastProgress = this.simTime; }

    // End of this gear: stop, then line the wheels up for the next one.
    if (remaining < 0.3) {
      if (Math.abs(v) > 0.15) return stop;
      if (end >= path.length - 1) { m.done = true; return stop; }
      // Stopped at a gear change: if tracking has drifted, re-plan from where
      // the car actually is rather than start the next leg off the path.
      const nx = path[end + 1];
      const eLat = Math.abs(-Math.sin(nx.th) * (rear.x - nx.x) + Math.cos(nx.th) * (rear.y - nx.y));
      const eHead = Math.abs(wrap(this.car.rotation - nx.th));
      if ((eLat > 0.3 || eHead > 0.1) && (m.replans || 0) < 3) {
        const replans = (m.replans || 0) + 1;
        this._decide(`Gear change: ${eLat.toFixed(2)} m / ${(eHead * 57.3).toFixed(0)}° off the manoeuvre, re-planning from the actual pose`);
        this._startRecovery(this.recoverDest, this.recoverAttempt || 0, 'replan');
        this.replans = replans;
        return stop;
      }
      m.i = end + 1;
      m.best = Infinity;
      m.lastProgress = this.simTime;
      m.aligned = false;
      return stop;
    }
    const p = path[Math.min(m.i + 1, end)];
    if (!m.aligned) {
      m.wheel = Math.clamp(p.steer || 0, -Car.MAX_WHEEL_ANGLE, Car.MAX_WHEEL_ANGLE);
      m.lastProgress = this.simTime;
      if (Math.abs(this.car.wheelAngle - m.wheel) > 0.06 || Math.abs(v) > 0.15) return stop;
      m.aligned = true;
    }

    // Anything moving close to the next few metres of path: wait for it.
    const ahead = [];
    for (let k = m.i; k <= end && ahead.length < 8; k += 3) ahead.push(path[k]);
    // Only things that are moving: stationary ones were in the plan already,
    // and waiting on them could deadlock (a pedestrian waiting on us).
    const blocker = this.trafficAt().some((c) => c.v > 0.5 && ahead.some((q) => Math.hypot(c.pos.x - q.x, c.pos.y - q.y) < c.L / 2 + 2.2))
      || this.pedsAt().some((q) => q.moving && ahead.some((a) => Math.hypot(q.pos.x - a.x, q.pos.y - a.y) < 2.2))
      || this.jay.some((j) => !j.paused && ahead.some((a) => Math.hypot(j.pos.x - a.x, j.pos.y - a.y) < 2.4));
    m.waitT = blocker ? (m.waitT || 0) + 1 / 60 : 0;
    m.waiting = blocker;
    if (blocker) { m.lastProgress = this.simTime; return stop; }

    // Errors on the body centre: that's the point Dash's car moves along its heading.
    const th = p.th;
    const cen = this.car.position;
    const rel = { x: cen.x - (p.x + 1.43 * Math.cos(th)), y: cen.y - (p.y + 1.43 * Math.sin(th)) };
    const e = -Math.sin(th) * rel.x + Math.cos(th) * rel.y; // + = left of the path
    const eTh = wrap(this.car.rotation - th);
    const em = dir > 0 ? e : -e; // lateral error in the direction of motion
    // Feedforward from ~0.3 s ahead: the wheel needs that long to get there.
    let fi = Math.min(m.i + 1, end), acc = 0;
    while (fi < end && acc < Math.abs(v) * 0.3) { acc += Math.hypot(path[fi + 1].x - path[fi].x, path[fi + 1].y - path[fi].y); fi++; }
    const kFF = (dir > 0 ? 1 : -1) * Math.tan(path[fi].steer || 0) / Car.WHEEL_BASE;
    const kappa = kFF - 0.6 * em - 1.4 * eTh;
    const delta = Math.atan((dir > 0 ? 1 : -1) * Car.WHEEL_BASE * kappa);
    m.wheel = Math.clamp(delta, -Car.MAX_WHEEL_ANGLE, Car.MAX_WHEEL_ANGLE);

    // Walking pace, a little quicker on long forward legs.
    // Crawl through steering reversals: the planner treats steering as
    // instant, the rack takes ~0.35 s lock to lock.
    let swing = 0, look = 0;
    for (let k = m.i; k < end && look < 3; k++) { swing = Math.max(swing, Math.abs((path[k + 1].steer || 0) - this.car.wheelAngle)); look += Math.hypot(path[k + 1].x - path[k].x, path[k + 1].y - path[k].y); }
    const vCap = swing > 0.5 ? 0.9 : swing > 0.3 ? 1.4 : swing > 0.12 ? 2.2 : dir > 0 ? 3.4 : 1.8;
    const vt = dir * Math.min(vCap, 0.3 + Math.sqrt(2 * 0.8 * remaining));
    const err = vt - v;
    if (Math.sign(v) !== Math.sign(vt) && Math.abs(v) > 0.2) return stop;
    if (dir > 0) return err >= 0 ? { gas: Math.min(1, err * 1.2), brake: 0, steer: 0 } : { gas: 0, brake: Math.min(1, -err), steer: 0 };
    return err <= 0 ? { gas: Math.max(-1, err * 1.2), brake: 0, steer: 0 } : { gas: 0, brake: Math.min(1, err), steer: 0 };
  }

  // ------------------------------------------------------------ control

  _manualControls(inp) {
    const v = this.car.velocity;
    let gas = 0, brake = 0;
    if (inp.handbrake) brake = 1;
    else if (inp.throttle) { if (v < -0.3) brake = 1; else gas = 1; }
    else if (inp.brake) { if (v > 0.3) brake = 1; else gas = -0.7; }
    else if (Math.abs(v) > 0.2) brake = 0.06;
    return { gas, brake, steer: 0 };
  }

  // Pure pursuit in the right lane when the GPU planner is unavailable.
  // Honours the same signal walls and stops for anything in the lane.
  _fallbackControls() {
    const look = Math.max(9, this.car.velocity * 1.1);
    const walls = this._ruleWalls(this.simTime);
    const traffic = this.trafficAt().map((c) => ({ pos: c.pos, kind: 'car' }));
    const ahead = this.statics.filter((o) => o.kind !== 'median' && o.kind !== 'island').concat(traffic)
      .filter((o) => o.pos.distanceTo(this.car.position) < 45)
      .map((o) => ({ o, pr: this._project(o.pos, this.station, this.station + 40) }))
      .filter(({ pr }) => pr && Math.abs(pr[1]) < 3.7);
    const inLane = ahead.filter(({ pr }) => pr[1] < 0.2);
    const swerve = inLane.some(({ o }) => o.kind === 'van' || o.kind === 'cone' || o.kind === 'truck');
    const blocked = inLane.some(({ o, pr }) => o.kind === 'car' && pr[0] - this.station < 14);
    this.fallbackLat = this.fallbackLat ?? LANE_RIGHT;
    this.fallbackLat += ((swerve ? -LANE_RIGHT : LANE_RIGHT) - this.fallbackLat) * 0.02;
    const [c] = this.lanePath.sampleStations(this.station + look, 1, 0);
    if (!c) return { steer: 0, gas: 0, brake: 1 };
    const target = Vector2.fromAngle(c.rot + Math.PI / 2).multiplyScalar(this.fallbackLat).add(c.pos);
    const d = target.sub(this.car.rearAxlePosition);
    const alpha = wrap(Math.atan2(d.y, d.x) - this.car.rotation);
    const wheel = Math.atan((2 * Car.WHEEL_BASE * Math.sin(alpha)) / d.length());
    const vStop = walls.length && this.wait ? Math.sqrt(Math.max(0, 2 * 2.5 * (this.wait.dist - 6))) : Infinity;
    const vTarget = blocked ? 0 : Math.min(this.speedLimit, vStop, Math.sqrt(3.5 / Math.max(1e-3, Math.abs(c.curv))));
    const err = vTarget - this.car.velocity;
    return { steer: Math.clamp((wheel - this.car.wheelAngle) * 4, -1, 1), gas: Math.clamp(err * 0.5, 0, 1), brake: err < -0.5 ? Math.min(1, -err * 0.3) : 0 };
  }

  // Velocity of a point on the ego at offset r from its centre.
  _egoPointVel(r) {
    const h = Vector2.fromAngle(this.car.rotation);
    const nL = new Vector2(-h.y, h.x);
    const { lat, w } = this.slide;
    return h.multiplyScalar(this.car.velocity).addScaledVector(nL, lat).add(new Vector2(-r.y * w, r.x * w));
  }

  // Apply an impulse J (world frame) to the ego at offset r from its centre.
  _egoImpulse(J, r) {
    const h = Vector2.fromAngle(this.car.rotation);
    const nL = new Vector2(-h.y, h.x);
    this.car.velocity += J.dot(h) / EGO_MASS;
    this.slide.lat += J.dot(nL) / EGO_MASS;
    this.slide.w += (r.x * J.y - r.y * J.x) / EGO_INERTIA;
  }

  // Impact against something that doesn't move (barrier, wall, tree,
  // traffic we don't simulate as a body): impulse along the contact normal
  // with restitution, Coulomb friction along it, and the torque from where
  // it struck, so a glancing blow deflects and spins the car away.
  _impactFixed(n, e, mu = 0.3) {
    // Contact at the body's support point towards the obstacle: a corner when
    // it strikes at an angle, the middle of a face when square on.
    const h = Vector2.fromAngle(this.car.rotation);
    const nL = new Vector2(-h.y, h.x);
    const r = h.clone().multiplyScalar(2.4 * Math.clamp(-n.dot(h) * 4, -1, 1)).addScaledVector(nL, 0.95 * Math.clamp(-n.dot(nL) * 4, -1, 1));
    const v = this._egoPointVel(r);
    const vn = v.dot(n);
    if (vn >= -0.05) return 0;
    if (vn > -2) {
      // A scrape at walking pace (parking, a recovery manoeuvre): no bounce,
      // no spin, just stop moving into it.
      const h0 = Vector2.fromAngle(this.car.rotation);
      const along = h0.dot(n);
      if (Math.abs(along) > 0.3 && Math.sign(this.car.velocity) === -Math.sign(along)) this.car.velocity *= 0.2;
      this.slide.lat = 0; this.slide.w = 0;
      return -vn;
    }
    const rxn = r.x * n.y - r.y * n.x;
    const j = (-(1 + e) * vn) / (1 / EGO_MASS + (rxn * rxn) / EGO_INERTIA);
    const J = n.clone().multiplyScalar(j);
    const vt = v.clone().addScaledVector(n, -vn);
    const vtl = vt.length();
    if (vtl > 1e-3) J.addScaledVector(vt, -Math.min(mu * j, vtl * EGO_MASS * 0.5) / vtl);
    this._egoImpulse(J, r);
    return -vn;
  }

  _stepSlide(dt) {
    const S = this.slide;
    if (!S.lat && !S.w) return;
    const car = this.car;
    const h = Vector2.fromAngle(car.rotation);
    car.position = car.position.clone().addScaledVector(new Vector2(-h.y, h.x), S.lat * dt);
    car.rotation = wrap(car.rotation + S.w * dt);
    // Tyres scrub the sideways speed off at about 0.9 g and damp the spin.
    const dl = 8.5 * dt;
    S.lat = Math.abs(S.lat) <= dl ? 0 : S.lat - Math.sign(S.lat) * dl;
    S.w *= Math.exp(-3 * dt);
    S.w = Math.abs(S.w) < 0.4 * dt ? 0 : S.w - Math.sign(S.w) * 0.4 * dt;
  }

  // Ego against the movable bodies: an impulse along the contact normal with
  // a little restitution, mass-weighted separation, and torques on both, so a
  // clipped car spins and so does the ego.
  _collideBodies() {
    const car = this.car;
    const h = Vector2.fromAngle(car.rotation);
    const ME = EGO_MASS, e = 0.15, r = 1.05;
    let hit = null;
    const idx = this.bodyHash.near(car.position.x, car.position.y, 10);
    this.bodies.forEach((b, i) => { if (b.moving) idx.add(i); });
    idx.forEach((bi) => {
      const b = this.bodies[bi];
      if (b.pos.distanceToSquared(car.position) > 64) return;
      [-1.55, 0, 1.55].forEach((o) => {
        const p = car.position.clone().addScaledVector(h, o);
        const cs = Math.cos(-b.rot), sn = Math.sin(-b.rot);
        const dx = p.x - b.pos.x, dy = p.y - b.pos.y;
        const lx = dx * cs - dy * sn, ly = dx * sn + dy * cs;
        const qx = Math.max(-b.hw, Math.min(b.hw, lx)), qy = Math.max(-b.hh, Math.min(b.hh, ly));
        let nx = lx - qx, ny = ly - qy;
        let dist = Math.hypot(nx, ny);
        if (dist >= r) return;
        if (dist < 1e-6) { nx = Math.sign(lx) || 1; ny = 0; dist = 0; } else { nx /= dist; ny /= dist; }
        const n = new Vector2(nx * Math.cos(b.rot) - ny * Math.sin(b.rot), nx * Math.sin(b.rot) + ny * Math.cos(b.rot));
        const pen = r - dist;
        // Positional correction, split by mass.
        const share = b.mass / (b.mass + ME);
        car.position = car.position.clone().addScaledVector(n, pen * share);
        b.pos.addScaledVector(n, -pen * (1 - share));
        // Impulse along the normal.
        const contact = p.clone().addScaledVector(n, -r);
        const re = contact.clone().sub(car.position);
        const egoVel = this._egoPointVel(re);
        const rb = contact.clone().sub(b.pos);
        const vb = b.vel.clone().add(new Vector2(-rb.y * b.w, rb.x * b.w));
        const vRel = egoVel.clone().sub(vb).dot(n);
        if (vRel < 0) {
          const rbxn = rb.x * n.y - rb.y * n.x, rexn = re.x * n.y - re.y * n.x;
          const j = (-(1 + e) * vRel) / (1 / ME + 1 / b.mass + (rbxn * rbxn) / b.inertia + (rexn * rexn) / EGO_INERTIA);
          this._egoImpulse(n.clone().multiplyScalar(j), re);
          b.vel.addScaledVector(n, -j / b.mass);
          b.w -= (rbxn * j) / b.inertia;
          b.moving = true;
          if (Math.abs(vRel) > 1.5 && this.collided <= 0) this.events.push({ type: 'bump', what: b.kind, speed: Math.abs(vRel) });
          this.collided = 0.4;
        }
        hit = b.kind === 'cone' ? hit : 'body';
      });
    });
    return hit;
  }

  // Shoved bodies slide to a stop on tyre friction and stop against walls.
  _stepBodies(dt) {
    this.bodies.forEach((b, i) => {
      if (!b.moving) return;
      const sp = b.vel.length();
      const mu = b.kind === 'cone' ? 3 : 7;
      const nv = Math.max(0, sp - mu * dt);
      if (sp > 0) b.vel.multiplyScalar(nv / sp);
      b.w *= Math.exp(-4 * dt);
      b.pos.addScaledVector(b.vel, dt);
      b.rot += b.w * dt;
      // Stop against anything fixed.
      this.solids.near(b.pos.x, b.pos.y, 3).forEach((sd) => {
        const d = sd.box ? Math.hypot(Math.max(0, Math.abs(b.pos.x - sd.x) - sd.hw), Math.max(0, Math.abs(b.pos.y - sd.y) - sd.hh)) : b.pos.distanceTo(new Vector2(sd.x, sd.y)) - sd.r;
        if (d < Math.min(b.hw, b.hh) * 0.8) { b.vel.multiplyScalar(-0.2); b.w = 0; }
      });
      b.obstacle.rot = b.rot;
      b.obstacle.updateVertices();
      b.version++;
      if (nv < 0.02 && Math.abs(b.w) < 0.01) {
        b.moving = false;
        this.bodyHash.add(i, b.pos.x - 4, b.pos.y - 4, b.pos.x + 4, b.pos.y + 4);
      }
    });
  }

  _collide() {
    const car = this.car;
    const here = car.position;
    const shapes = [...this.solids.near(here.x, here.y, 8)];
    this.trafficAt().forEach((c) => {
      if (c.pos.distanceToSquared(here) < 225) shapes.push({ box: true, x: c.pos.x, y: c.pos.y, rot: c.rot, hw: c.L / 2, hh: c.W / 2, kind: 'car' });
    });
    this.pedsAt().forEach((q) => { if (q.pos.distanceToSquared(here) < 64) shapes.push({ box: false, x: q.pos.x, y: q.pos.y, r: 0.35, kind: 'ped' }); });
    this.jay.forEach((j) => {
      shapes.push({ box: false, x: j.pos.x, y: j.pos.y, r: 0.4, kind: 'ped' });
      if (j.dog) shapes.push({ box: false, x: j.dog.x, y: j.dog.y, r: 0.35, kind: 'ped' });
    });
    const hitBody = this._collideBodies();
    let hit = hitBody;
    const r = 1.05;
    let impact = 0;
    [-1.55, 0, 1.55].forEach((o) => {
      shapes.forEach((b) => {
        const p = car.position.clone().addScaledVector(Vector2.fromAngle(car.rotation), o);
        let nx, ny, dist;
        if (b.box) {
          const cs = Math.cos(-b.rot), sn = Math.sin(-b.rot);
          const dx = p.x - b.x, dy = p.y - b.y;
          const lx = dx * cs - dy * sn, ly = dx * sn + dy * cs;
          const qx = Math.max(-b.hw, Math.min(b.hw, lx)), qy = Math.max(-b.hh, Math.min(b.hh, ly));
          let lnx = lx - qx, lny = ly - qy;
          dist = Math.hypot(lnx, lny);
          if (dist >= r) return;
          if (dist < 1e-6) {
            const px = b.hw - Math.abs(lx), py = b.hh - Math.abs(ly);
            if (px < py) { lnx = Math.sign(lx) || 1; lny = 0; dist = -px; } else { lnx = 0; lny = Math.sign(ly) || 1; dist = -py; }
          } else { lnx /= dist; lny /= dist; }
          nx = lnx * Math.cos(b.rot) - lny * Math.sin(b.rot);
          ny = lnx * Math.sin(b.rot) + lny * Math.cos(b.rot);
        } else {
          const dx = p.x - b.x, dy = p.y - b.y;
          dist = Math.hypot(dx, dy) - b.r;
          if (dist >= r) return;
          const l = Math.hypot(dx, dy) || 1;
          nx = dx / l; ny = dy / l;
        }
        const push = r - dist;
        const n = new Vector2(nx, ny);
        car.position = car.position.clone().addScaledVector(n, push);
        if (b.kind === 'ped') {
          // Soft: people aren't walls. Just stop.
          car.velocity *= 0.3; this.slide.lat *= 0.3; this.slide.w *= 0.3;
          impact = Math.max(impact, 1);
        } else {
          impact = Math.max(impact, this._impactFixed(n, RESTITUTION[b.kind] ?? 0.25));
        }
        hit = b.kind;
      });
    });
    const m = HW.offset + 60;
    const cx = Math.min(EXTENT + m, Math.max(-m, car.position.x)), cy = Math.min(EXTENT + m, Math.max(-m, car.position.y));
    if (cx !== car.position.x || cy !== car.position.y) {
      const n = new Vector2(Math.sign(cx - car.position.x), Math.sign(cy - car.position.y)).normalize();
      car.position = new Vector2(cx, cy);
      impact = Math.max(impact, this._impactFixed(n, 0.3));
      hit = 'edge';
    }
    if (hit && hit !== 'body') {
      if (this.collided <= 0 && impact > 1.5) this.events.push({ type: 'bump', what: hit, speed: impact });
      this.collided = 0.4;
    }
    return hit;
  }

  // ------------------------------------------------------------ step

  step(dt, input) {
    dt = Math.min(dt, 1 / 20);
    this.simTime += dt;
    this.collided -= dt;

    const touching = input && (input.throttle || input.brake || input.steer || input.handbrake);
    if (touching) {
      if (this.mode !== 'manual') {
        this.mode = 'manual';
        this.autoState = 'lane';
        this.maneuver = null;
        this.plannedPath = null;
        this.lattice = null;
        this.events.push({ type: 'manual' });
      }
      this.idle = 0;
    } else if (this.mode === 'manual') {
      this.idle += dt;
      if (this.idle > RESUME_AFTER) {
        this.mode = 'auto';
        this.controller = false;
        const dest = this.pending || this._currentDest();
        this.pending = null;
        if (this._laneReady()) { this.autoState = 'lane'; this.laneSince = this.simTime; this.setRoute(dest); } else this._startRecovery(dest);
        this.events.push({ type: 'auto' });
      }
    }

    // The school bus loads for 11 s out of every 32, lights flashing.
    this.schoolBus.active = (this.simTime % 32) > 14 && (this.simTime % 32) < 25;
    this._stepAgents(dt);
    this._stepJaywalkers(dt);
    this._stepBodies(dt);

    // Speed limit for the road we're on.
    if (!this._limitT || this.simTime - this._limitT > 0.5) {
      this._limitT = this.simTime;
      const snap = snapToStreet(this.car.rearAxlePosition, this.car.rotation);
      this.roadType = snap.type;
      this.rampKind = snap.rampKind;
      this.schoolZone = SCHOOL_ZONE.has(snap.key);
      this.speedLimit = this.schoolZone ? 30 / 3.6 : SPEED_LIMITS[snap.type];
    }

    if (this.mode === 'manual') this.blinker = null;
    else if (this.autoState !== 'lane') this.blinker = 'hazard';
    let controls;
    if (this.mode === 'manual') controls = this._manualControls(input || {});
    else if (this.autoState === 'lane' && this.car.velocity < 0.6 && ((this.wait && this.wait.dist < 4) || ((this.queued || (this.wait && (this.wait.reason === 'red' || this.wait.reason === 'bus') && this.wait.dist < 60)) && this.controller === null))) controls = { gas: 0, brake: 0.6, steer: 0 };
    else if (this.autoState === 'recover-plan') controls = { gas: 0, brake: 1, steer: 0 };
    else if (this.autoState === 'recover') controls = this._followManeuver();
    else if (this.plannerMode === 'cpu' || this.simTime < (this.settleUntil || 0)) controls = this._fallbackControls();
    else if (this.controller) controls = this.controller.control(this.car.pose, this.car.wheelAngle, this.car.velocity, dt, true);
    else if (this.controller === null) controls = { steer: 0, brake: 1, gas: 0 };
    else controls = { steer: 0, brake: 0, gas: 0 };

    this.car.update(controls, dt);
    if (this.mode === 'manual') {
      const target = (input?.steer || 0) * Car.MAX_WHEEL_ANGLE * (1 - Math.min(0.6, Math.abs(this.car.velocity) / 30));
      this.car.wheelAngularVelocity = Math.clamp((target - this.car.wheelAngle) * 7, -2.4, 2.4);
    } else if (this.autoState === 'recover' && this.maneuver) {
      this.car.wheelAngularVelocity = Math.clamp(((this.maneuver.wheel || 0) - this.car.wheelAngle) * 8, -3, 3);
    }
    this.car.step(dt);
    this._stepSlide(dt);
    if (this.mode === 'manual') this.car.velocity = Math.clamp(this.car.velocity, this.collided > 0 ? -15 : -5, MANUAL_TOP_SPEED);
    const hit = this._collide();
    this.lights = { brake: controls.brake > 0.05 || (this.mode === 'manual' && !!input?.brake && this.car.velocity > 0.3), reverse: this.car.velocity < -0.1 };

    if (this.mode === 'auto') {
      if (this.autoState === 'recover-plan' && this.simTime - this.recoverySent > 2) this._reseat('timeout');
      if (this.autoState === 'recover') {
        const m = this.maneuver;
        if (m.done) {
          this.maneuver = null;
          this.autoState = 'lane';
          this.controller = false;
          this.setRoute(this.pending || this.recoverDest || this._currentDest());
          this.pending = null;
          this.laneSince = this.simTime;
          this.events.push({ type: 'recovered' });
        } else if (this.simTime - m.lastProgress > 3.5) {
          // Contact alone isn't failure (a crashed car starts out touching
          // something and the plan backs away from it); stalling is.
          if ((this.recoverAttempt || 0) < 2) this._startRecovery(this.recoverDest, (this.recoverAttempt || 0) + 1, hit ? `stalled:${hit}` : 'stalled');
          else this._reseat('attempts');
        }
      }
      if (this.autoState === 'lane') this._stepLane(dt, hit);
    }
    this._updateBehaviour();
  }

  _stepLane(dt, hit) {
    const [s, l, idx] = this.lanePath.stationLatitudeFromPosition(this.car.rearAxlePosition, this.aroundAnchorIndex);
    this._auditStep(dt, s, l, hit);
    this.station = s; this.latitude = l; this.aroundAnchorIndex = idx;
    this._updateBlinker();

    const stop = this.stops[0];
    if (stop && s >= stop.station - 16) {
      this.stops.shift();
      if (stop.index !== null) { this.reached = stop.index; this.events.push({ type: 'arrive', index: stop.index }); }
    }
    while (this.controls.length && this.controls[0].station < s - 25) this.controls.shift();
    if ((this.stops.length <= 1 || s > this.route.length - 160) && Math.abs(this.car.curvature) < 0.01) {
      this.setRoute({ landmark: (this.reached + 1) % this.landmarkNodes.length });
    }

    // Health checks: no feasible plan, a collision, or stuck for no reason.
    this.queued = this.car.velocity < 1.5 && this._queuedBehind();
    // Stopped for a red anywhere in the approach (maybe queued well back from
    // the line) or at the line to yield: no plan is expected, just hold.
    const atLine = this.wait && (((this.wait.reason === 'red' || this.wait.reason === 'bus') && this.wait.dist < 60) || this.wait.dist < 22);
    this.nullFor = this.controller === null && !atLine && !this.queued ? this.nullFor + dt : 0;
    const waiting = (atLine && ['red', 'yield', 'stop', 'bus'].includes(this.wait.reason)) || this.queued || (this.car.velocity < 0.4 && this._trafficAhead());
    this.slowFor = this.car.velocity < 0.4 && !waiting ? this.slowFor + dt : 0;
    if (hit && hit !== 'car' && hit !== 'ped' && this.simTime - (this.laneSince || 0) > 1.5) { this._startRecovery(this._currentDest(), 0, `lane-hit:${hit}`); return; }
    // Dash can't plan from here (just after a recovery, or pulling away from a
    // standstill on a tight curve) but the car is still on the road: drive a
    // few metres on the pure-pursuit fallback, then hand back to Dash. Only if
    // that fails too is it a recovery.
    const onRoad = Math.abs(this.latitude) < 4.2;
    if (this.nullFor > 1.2 && !this.settleUntil && (onRoad || this.simTime - (this.laneSince || -99) < 6)) {
      this.settleUntil = this.simTime + 3;
      this.nullFor = 0;
      this._decide('Lane planner has no feasible plan from this pose: settling into the lane on the pure-pursuit fallback');
    }
    if (this.settleUntil && this.simTime > this.settleUntil + 4) this.settleUntil = 0;
    if (this.nullFor > 1.2 || this.slowFor > 7) {
      const why = this.nullFor > 1.2 ? 'null-plan' : 'slow';
      this.nullFor = 0; this.slowFor = 0;
      this.events.push({
        type: 'lane-fail', why, x: Math.round(this.car.position.x), y: Math.round(this.car.position.y), beh: this.behaviour,
        rot: Math.round(this.car.rotation * 57.3), lat: +this.latitude.toFixed(2), st: +this.station.toFixed(1), v: +this.car.velocity.toFixed(2),
        wait: this.wait ? `${this.wait.reason}@${this.wait.dist.toFixed(1)}` : '', plannerMode: this.plannerMode,
        start: `${this.route.pts[0].x.toFixed(0)},${this.route.pts[0].y.toFixed(0)}`,
      });
      this._startRecovery(this._currentDest(), 0, why);
      return;
    }
    if (this.plannerMode === 'gpu' && this.plannerReady) this._requestPlan();
  }

  // Driving audit: every signal crossing is checked against the light, and
  // collisions, lane departures, speeding and harsh manoeuvres are counted.
  _auditStep(dt, s, l, hit) {
    const A = this.audit;
    const front = s + FRONT_OVERHANG;
    if (this._prevFront !== undefined && this.laneVersion === this.version) {
      A.distance += Math.max(0, s - this._prevStation);
      for (const c of this.controls) {
        if (c.type !== 'signal') continue;
        if (this._prevFront < c.stopStation && front >= c.stopStation) {
          const colour = signalState(c.node, c.axis, this.simTime).colour;
          if (colour === 'red' && !c.committed) { A.redRuns++; this.events.push({ type: 'audit', what: 'red-run', node: c.node }); }
          else if (colour === 'green') A.greenEntries++;
          else A.yellowEntries++;
        }
      }
    }
    this._prevFront = front;
    this._prevStation = s;
    this.laneVersion = this.version;
    if (hit && !this._hitNow) { A.autoHits++; this.events.push({ type: 'audit', what: `hit:${hit}` }); }
    this._hitNow = !!hit;
    const inRb = this.controls.some((c) => c.type === 'roundabout' && Math.abs(c.station - s) < 30);
    this._offFor = Math.abs(l) > 4.4 && !inRb ? (this._offFor || 0) + dt : 0;
    if (this._offFor > 0.5 && !this._offCounted) { A.laneDepartures++; this._offCounted = true; this.events.push({ type: 'audit', what: 'lane-departure', lat: l }); }
    if (this._offFor === 0) this._offCounted = false;
    const v = this.car.velocity;
    this._overFor = v > this.speedLimit * 1.1 + 0.5 ? (this._overFor || 0) + dt : 0;
    if (this._overFor > 1 && !this._overCounted) { A.speeding++; this._overCounted = true; }
    if (this._overFor === 0) this._overCounted = false;
    const accel = (v - (this._prevV ?? v)) / dt;
    this._prevV = v;
    const hard = accel < -4.5 && this.car.velocity > 1;
    if (hard && !this._hardNow) A.hardBrakes++;
    this._hardNow = hard;
    const lat = Math.abs(v * v * this.car.curvature);
    if (lat > A.maxLatAcc) { A.maxLatAcc = lat; A.maxLatAt = { x: +this.car.position.x.toFixed(0), y: +this.car.position.y.toFixed(0), v: +v.toFixed(1), k: +this.car.curvature.toFixed(3), b: this.behaviour, t: +this.simTime.toFixed(1) }; }
  }

  // Indicators: for turns on the route, for lane changes the planner is
  // about to make, and hazards while recovering.
  _updateBlinker() {
    const front = this.station + FRONT_OVERHANG;
    const turn = this.turns.find((t) => t.station - front > -14 && t.station - front < 45);
    if (turn) { this.blinker = turn.side; return; }
    if (this._preferLeft() && this.latitude - LANE_RIGHT < 2.4 && (this.roadType === 'avenue' || this.roadType === 'highway')) { this.blinker = 'left'; return; }
    if (this.plannedPath && this.route) {
      let target = null;
      for (let i = 0; i < this.plannedPath.length; i += 4) {
        const pr = this._project(this.plannedPath[i].pos, this.station + 8, this.station + 30);
        if (pr) { target = pr[1]; break; }
      }
      if (target !== null && Math.abs(target - this.latitude) > 1.2) { this.blinker = target > this.latitude ? 'left' : 'right'; return; }
    }
    this.blinker = null;
  }

  // One line describing what the car is doing and why, for the HUD.
  _updateBehaviour() {
    if (this._behaviourT && this.simTime - this._behaviourT < 0.2) return;
    this._behaviourT = this.simTime;
    let b;
    if (this.mode === 'manual') b = 'Manual control';
    else if (this.autoState === 'recover-plan') b = 'Planning a way out (Hybrid A*)';
    else if (this.simTime < (this.settleUntil || 0) && this.autoState === 'lane') b = 'Settling into the lane (fallback controller)';
    else if (this.autoState === 'recover') {
      const rev = this.car.velocity < -0.1 || (this.maneuver && this.maneuver.path[this.maneuver.i].dir < 0);
      b = rev ? 'Recovery manoeuvre: reversing' : 'Recovery manoeuvre: rejoining the lane';
    } else if (this.wait?.reason === 'red' && this.wait.dist < 60) b = this.wait.queue ? (this.car.velocity < 0.5 ? 'Queued at a red light' : 'Joining the queue at a red light') : this.car.velocity < 0.5 ? 'Waiting at a red light' : 'Stopping for a red light';
    else if (this.wait?.reason === 'yield') b = 'Unprotected left: waiting in the junction for a gap';
    else if (this.wait?.reason === 'bus' && this.wait.dist < 60) b = this.car.velocity < 0.5 ? 'Stopped for a school bus (red lights flashing)' : 'Stopping for a school bus';
    else if (this.wait?.reason === 'stop' && this.wait.dist < 40) b = this.car.velocity < 0.3 ? 'Full stop at the stop sign' : 'Stopping for a stop sign';
    else if (this.stopDoneUntil && this.simTime < this.stopDoneUntil) b = 'Proceeding after a full stop';
    else if (this.rtorUntil && this.simTime < this.rtorUntil) b = 'Right on red after a full stop';
    else if (this.jay.some((j) => j.pos.distanceTo(this.car.position) < 30 && !j.done)) b = this.car.velocity < 1 ? 'Yielding to a pedestrian crossing' : 'Slowing for a pedestrian ahead';
    else if (this.roadType === 'ramp') b = this.rampKind === 'on' ? 'Merging onto the highway' : 'Taking the exit';
    else if (this.queued) b = 'Queued behind stopped traffic';
    else {
      const rb = this.controls.find((c) => c.type === 'roundabout' && c.station > this.station - 20 && c.station - this.station < 45);
      const plannedLat = this._plannedLateral();
      const lead = this.trafficAt().some((c) => {
        const pr = this._project(c.pos, this.station + 3, this.station + 30);
        return pr && Math.abs(pr[1] - LANE_RIGHT) < 1.4 && c.dir.dot(pr[2]) > 0.8 && c.v < this.speedLimit - 1.5;
      });
      const inLeft = this.latitude - LANE_RIGHT > 2.2;
      if (rb) b = 'Navigating a roundabout';
      else if (this._preferLeft() && (inLeft || plannedLat > 2.2 || this.blinker === 'left') && !this._turnSoon()) b = inLeft ? 'In the left lane for the left turn' : 'Moving to the left lane to turn left';
      else if (this.blinker === 'left' && !this._turnSoon()) b = this._obstacleAhead() ? 'Pulling out around a stopped vehicle' : 'Changing lanes to overtake';
      else if (this.blinker === 'right' && inLeft && !this._turnSoon()) b = 'Moving back into the right lane';
      else if (inLeft || plannedLat > 2.2) b = this._obstacleAhead() ? 'Passing a stopped vehicle' : 'Overtaking in the passing lane';
      else if (this._turnSoon()) b = `Turning ${this._turnSoon().side}`;
      else if (lead) b = 'Following traffic';
      else if (this.schoolZone) b = 'School zone: 30 km/h';
      else b = this.roadType === 'highway' ? `On the highway at the ${Math.round(this.speedLimit * 3.6)} km/h limit` : `Cruising at the ${Math.round(this.speedLimit * 3.6)} km/h limit`;
    }
    if (b !== this.behaviour && BEHAVIOUR_NOTES[b]) this._decide(BEHAVIOUR_NOTES[b]);
    this.behaviour = b;
  }

  // Any vehicle or person close ahead on (or crossing) our route: stopping
  // for it is expected, not a fault.
  _trafficAhead() {
    const near = (q) => {
      if (q.distanceTo(this.car.position) > 35) return false;
      const pr = this._project(q, this.station + 1, this.station + 30);
      return pr && Math.abs(pr[1] - this.latitude) < 5;
    };
    return this.trafficAt().some((c) => near(c.pos)) || this.jay.some((j) => near(j.pos));
  }

  _turnSoon() {
    const front = this.station + FRONT_OVERHANG;
    return this.turns?.find((t) => t.station - front > -14 && t.station - front < 45);
  }

  _plannedLateral() {
    if (!this.plannedPath || !this.route) return 0;
    let m = 0;
    for (let i = 0; i < this.plannedPath.length; i += 6) {
      const pr = this._project(this.plannedPath[i].pos, this.station - 5, this.station + 45);
      if (pr) m = Math.max(m, pr[1] - LANE_RIGHT);
    }
    return m;
  }

  _obstacleAhead() {
    const here = this.car.position;
    return this.statics.some((o) => {
      if (o.kind === 'median' || o.kind === 'island' || o.pos.distanceTo(here) > 50) return false;
      const pr = this._project(o.pos, this.station, this.station + 45);
      return pr && pr[1] < 0.3 && pr[1] > -3.7;
    });
  }

  dispose() {
    this.worker?.terminate();
    this.recoveryWorker?.terminate();
  }
}

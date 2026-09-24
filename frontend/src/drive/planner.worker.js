/* eslint-disable no-restricted-globals */
// Runs Dash's GPU lattice planner off the main thread (WebGL2 on an
// OffscreenCanvas). Based on workers/PathPlannerWorker.js upstream; the lane
// path is sent only when the route changes and cached here.
import './dash/setup';
import PathPlanner from './dash/autonomy/path-planning/PathPlanner';
import LanePath from './dash/autonomy/LanePath';
import StaticObstacle from './dash/autonomy/StaticObstacle';
import DynamicObstacle from './dash/autonomy/DynamicObstacle';

let planner = null;
try {
  planner = new PathPlanner();
  self.postMessage({ ready: true });
} catch (e) {
  self.postMessage({ error: String(e && e.message ? e.message : e) });
}

const V2 = () => THREE.Vector2.prototype;
let lanePath = null;

self.onmessage = (event) => {
  if (!planner) return;
  const { version, config, vehiclePose, vehicleStation, startTime, staticObstacles, dynamicObstacles, reset } = event.data;

  if (event.data.lanePath) {
    lanePath = event.data.lanePath;
    LanePath.hydrate(lanePath);
    lanePath.anchors.forEach((a) => Object.setPrototypeOf(a, V2()));
    lanePath.centerlines.forEach((c) => c.forEach((p) => Object.setPrototypeOf(p, V2())));
  }
  if (!lanePath) return;
  Object.setPrototypeOf(vehiclePose.pos, V2());
  staticObstacles.forEach((o) => StaticObstacle.hydrate(o));
  dynamicObstacles.forEach((o) => DynamicObstacle.hydrate(o));

  if (reset) planner.reset();
  planner.config = config;

  const t0 = performance.now();
  try {
    const { path, fromVehicleSegment, fromVehicleParams, latticeStartStation } =
      planner.plan(vehiclePose, vehicleStation, lanePath, startTime, staticObstacles, dynamicObstacles);
    self.postMessage({ version, path, fromVehicleSegment, fromVehicleParams, latticeStartStation, planMs: performance.now() - t0 });
  } catch (e) {
    self.postMessage({ version, failed: true, planMs: performance.now() - t0 });
  }
};

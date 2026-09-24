/* eslint-disable no-restricted-globals */
// Runs the Hybrid A* recovery planner off the main thread.
import { planManeuver } from './hybridAstar';

self.onmessage = (e) => {
  const { id, request } = e.data;
  let result;
  try {
    result = planManeuver(request);
  } catch (err) {
    result = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  self.postMessage({ id, result });
};

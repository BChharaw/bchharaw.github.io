// Dash was written against a global THREE (r89) plus a few Math helpers
// (js/Utils.js upstream). The planner only needs Vector2 and Matrix3, so we
// expose those from the modern package and restore the one removed method.
import { Vector2, Matrix3 } from 'three';

if (!Matrix3.prototype.getInverse) {
  Matrix3.prototype.getInverse = function getInverse(m) {
    return this.copy(m).invert();
  };
}

Vector2.fromAngle = (angle) => new Vector2(Math.cos(angle), Math.sin(angle));

Math.clamp = (number, min, max) => Math.max(min, Math.min(number, max));

Math.wrapAngle = (angle) => {
  angle %= Math.PI * 2;
  if (angle <= -Math.PI) return angle + Math.PI * 2;
  if (angle > Math.PI) return angle - Math.PI * 2;
  return angle;
};

const scope = typeof self !== 'undefined' ? self : globalThis;
scope.THREE = Object.assign(scope.THREE || {}, { Vector2, Matrix3 });

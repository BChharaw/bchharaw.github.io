import React, { useEffect, useRef, useState } from "react";

// Bubble level using iPhone IMU (plain React + JSX)
// Works on Safari iOS 13+ after user grants motion/orientation access.

export default function BubbleLevel() {
  const [permNeeded, setPermNeeded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [pitchDeg, setPitchDeg] = useState(0); // tilt forward/back
  const [rollDeg, setRollDeg] = useState(0);  // tilt left/right
  const [alphaDeg, setAlphaDeg] = useState(null); // yaw if available
  const [zero, setZero] = useState({ pitch: 0, roll: 0 });
  const [smoothing, setSmoothing] = useState(0.15); // 0..1
  const rafRef = useRef(null);
  const latestRef = useRef({ ax: 0, ay: 0, az: 0, alpha: null });

  // Detect if explicit permission is required
  useEffect(() => {
    const needs =
      (window.DeviceMotionEvent && window.DeviceMotionEvent.requestPermission) ||
      (window.DeviceOrientationEvent && window.DeviceOrientationEvent.requestPermission);
    setPermNeeded(!!needs);
  }, []);

  function toDeg(rad) {
    return (rad * 180) / Math.PI;
  }

  function handleMotion(e) {
    const accG = e.accelerationIncludingGravity;
    if (!accG) return;
    const ax = accG.x || 0;
    const ay = accG.y || 0;
    const az = accG.z || 0;
    latestRef.current.ax = ax;
    latestRef.current.ay = ay;
    latestRef.current.az = az;
  }

  function handleOrientation(e) {
    if (typeof e.alpha === "number") latestRef.current.alpha = e.alpha;
  }

  function start() {
    const dm = window.DeviceMotionEvent;
    const dor = window.DeviceOrientationEvent;

    const add = () => {
      window.addEventListener("devicemotion", handleMotion);
      window.addEventListener("deviceorientation", handleOrientation);
      setEnabled(true);
      tick();
    };

    const req = async () => {
      try {
        if (dm && dm.requestPermission) {
          const r = await dm.requestPermission();
          if (r !== "granted") return;
        }
        if (dor && dor.requestPermission) {
          try { await dor.requestPermission(); } catch (err) {}
        }
        add();
      } catch (err) {}
    };

    if ((dm && dm.requestPermission) || (dor && dor.requestPermission)) req();
    else add();
  }

  function stop() {
    window.removeEventListener("devicemotion", handleMotion);
    window.removeEventListener("deviceorientation", handleOrientation);
    setEnabled(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }

  function tick() {
    const { ax, ay, az, alpha } = latestRef.current;
    const g = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
    const nx = ax / g, ny = ay / g, nz = az / g;
    const roll = Math.atan2(ny, nz);
    const pitch = Math.atan2(-nx, Math.hypot(ny, nz));
    setRollDeg((prev) => prev + (toDeg(roll) - prev) * smoothing);
    setPitchDeg((prev) => prev + (toDeg(pitch) - prev) * smoothing);
    if (alpha != null) setAlphaDeg((prev) => (prev == null ? alpha : prev + (alpha - prev) * smoothing));
    rafRef.current = requestAnimationFrame(tick);
  }

  // UI layout
  const size = 260;
  const bubbleSize = 40;
  const maxOffset = (size - bubbleSize) / 2;
  const sens = 3.0; // px/deg

  const x = Math.max(-maxOffset, Math.min(maxOffset, (rollDeg - zero.roll) * sens));
  const y = Math.max(-maxOffset, Math.min(maxOffset, (pitchDeg - zero.pitch) * sens));
  const centered = Math.hypot(x, y) < 4;

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight mb-4">Bubble Level</h1>
        <div className="flex gap-2 mb-4">
          {!enabled ? (
            <button onClick={start} className="px-4 py-2 rounded-2xl bg-neutral-200 text-neutral-900 hover:bg-white transition">
              {permNeeded ? "Enable sensors" : "Start"}
            </button>
          ) : (
            <button onClick={stop} className="px-4 py-2 rounded-2xl bg-neutral-800 hover:bg-neutral-700 transition">
              Stop
            </button>
          )}
          <button onClick={() => setZero({ pitch: pitchDeg, roll: rollDeg })} className="px-4 py-2 rounded-2xl bg-neutral-800 hover:bg-neutral-700 transition">
            Calibrate at current
          </button>
          <label className="flex items-center gap-2 text-sm ml-auto">
            <span>smooth</span>
            <input
              type="range"
              min={0.02}
              max={0.6}
              step={0.01}
              value={smoothing}
              onChange={(e) => setSmoothing(parseFloat(e.target.value))}
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
          <Metric label="Roll" value={rollDeg - zero.roll} />
          <Metric label="Pitch" value={pitchDeg - zero.pitch} />
          <Metric label="Yaw" value={alphaDeg == null ? NaN : alphaDeg} suffix={alphaDeg == null ? "n/a" : "°"} />
        </div>

        <div className="mx-auto" style={{ width: size, height: size }}>
          <div className="relative" style={{ width: size, height: size }}>
            <div className="absolute inset-0 rounded-full bg-neutral-900 shadow-[inset_0_0_40px_rgba(0,0,0,0.7)] border border-neutral-800" />
            <div className="absolute inset-6 rounded-full border border-neutral-700" />
            <div className="absolute inset-12 rounded-full border border-neutral-700" />
            <div className="absolute left-1/2 top-0 -translate-x-1/2 text-xs text-neutral-400 select-none">N</div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-neutral-400 select-none">E</div>
            <div className="absolute left-1/2 bottom-0 -translate-x-1/2 text-xs text-neutral-400 select-none">S</div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-xs text-neutral-400 select-none">W</div>
            <div
              className="absolute rounded-full bg-neutral-200/90 shadow-xl border border-white/40 transition-transform"
              style={{ width: bubbleSize, height: bubbleSize, transform: `translate(${x + maxOffset}px, ${y + maxOffset}px)` }}
            />
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border ${
                centered ? "border-green-500/70" : "border-neutral-600"
              }`}
              style={{ width: bubbleSize + 6, height: bubbleSize + 6 }}
            />
          </div>
        </div>

        <p className="mt-4 text-xs text-neutral-400">
          Open in Safari on iPhone. Tap "Enable sensors" if prompted. Place flat, then tap Calibrate.
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value, suffix = "°" }) {
  const isNa = Number.isNaN(value);
  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="text-lg font-medium tabular-nums">{isNa ? "—" : value.toFixed(1)}{isNa ? "" : suffix}</div>
    </div>
  );
}

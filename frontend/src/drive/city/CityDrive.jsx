import React, { useEffect, useMemo, useRef, useState } from 'react';
import CitySim, { RESUME_AFTER } from './CitySim';
import { createCityScene } from './cityScene';
import { N, EXTENT, TYPES, nodeId, segKey, segType, ROUNDABOUTS, RB, nodePos } from './cityModel';
import './city.css';

const STEP = 1 / 60;
const KEYS = {
  w: 'throttle', arrowup: 'throttle',
  s: 'brake', arrowdown: 'brake',
  a: 'left', arrowleft: 'left',
  d: 'right', arrowright: 'right',
  ' ': 'handbrake',
};
const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = () => window.matchMedia('(pointer: coarse)').matches;
const fmtT = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const fmt = (n, d = 1) => (n == null || !isFinite(n) ? '—' : n.toFixed(d));

// ---- minimap -------------------------------------------------------------
const MAP_PAD = 16;
const toMap = (x, y, size) => {
  const k = (size - 2 * MAP_PAD) / EXTENT;
  return [MAP_PAD + x * k, size - MAP_PAD - y * k];
};
const fromMap = (mx, my, size) => {
  const k = (size - 2 * MAP_PAD) / EXTENT;
  return [(mx - MAP_PAD) / k, (size - MAP_PAD - my) / k];
};

function drawMap(ctx, sim, size, dpr) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(13,13,13,0.92)';
  ctx.fillRect(0, 0, size, size);
  const k = (size - 2 * MAP_PAD) / EXTENT;
  const line = (a, b, w) => {
    const [x0, y0] = toMap(a.x, a.y, size); const [x1, y1] = toMap(b.x, b.y, size);
    ctx.lineWidth = Math.max(1.5, w * 2 * k);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  };
  ctx.strokeStyle = '#34342f';
  for (let j = 0; j < N; j++) for (let i = 0; i < N - 1; i++) {
    const a = nodeId(i, j), b = nodeId(i + 1, j);
    line(nodePos(a), nodePos(b), TYPES[segType(segKey(a, b))].half);
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N - 1; j++) {
    const a = nodeId(i, j), b = nodeId(i, j + 1);
    line(nodePos(a), nodePos(b), TYPES[segType(segKey(a, b))].half);
  }
  ROUNDABOUTS.forEach((id) => {
    const p = nodePos(id); const [x, y] = toMap(p.x, p.y, size);
    ctx.beginPath(); ctx.arc(x, y, RB.outer * k, 0, Math.PI * 2); ctx.fillStyle = '#34342f'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, RB.island * k, 0, Math.PI * 2); ctx.fillStyle = 'rgba(13,13,13,1)'; ctx.fill();
  });

  // Route to the next stop.
  if (sim.mode === 'auto' && sim.autoState === 'lane' && sim.route) {
    const { pts, station } = sim.route;
    const end = (sim.destination?.station ?? sim.station + 300) + 20;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < pts.length; i += 3) {
      if (station[i] < sim.station) continue;
      if (station[i] > end) break;
      const [x, y] = toMap(pts[i].x, pts[i].y, size);
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#ffb224';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Landmarks.
  const dest = sim.destination;
  sim.city.landmarks.forEach((lm, i) => {
    const b = lm.building;
    const [x, y] = toMap(b.x, b.y, size);
    const on = dest && dest.index === i;
    ctx.fillStyle = on ? '#ffb224' : i === sim.reached ? '#ecebe8' : '#6f6e6b';
    ctx.fillRect(x - 3, y - 3, 6, 6);
  });
  if (dest && dest.index === null) {
    const p = sim.route && dest.node !== undefined ? [nodePos(dest.node).x, nodePos(dest.node).y] : null;
    if (p) { const [x, y] = toMap(p[0], p[1], size); ctx.strokeStyle = '#ffb224'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 4, y - 4, 8, 8); }
  }

  // Traffic and the car.
  ctx.fillStyle = '#8a8984';
  sim.trafficAt().forEach((c) => { const [x, y] = toMap(c.pos.x, c.pos.y, size); const r = c.kind === 'bike' ? 1 : 1.5; ctx.fillRect(x - r, y - r, r * 2, r * 2); });
  const [cx, cy] = toMap(sim.car.position.x, sim.car.position.y, size);
  const r = sim.car.rotation;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-r);
  ctx.beginPath();
  ctx.moveTo(6, 0); ctx.lineTo(-4, 4); ctx.lineTo(-2, 0); ctx.lineTo(-4, -4); ctx.closePath();
  ctx.fillStyle = '#ecebe8';
  ctx.fill();
  ctx.restore();
}

// ---- component -------------------------------------------------------------
const CityDrive = ({ milestones }) => {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const mapRef = useRef(null);
  const labelRefs = useRef([]);
  const hud = useRef({});
  const simRef = useRef(null);
  const sceneRef = useRef(null);
  const pressed = useRef(new Set());
  const [focus, setFocus] = useState(0);
  const [nextStop, setNextStop] = useState(1);
  const [mode, setMode] = useState('auto');
  const [planner, setPlanner] = useState('starting');
  const [autoState, setAutoState] = useState('lane');
  const [running, setRunning] = useState(() => !reducedMotion());
  const [camMode, setCamMode] = useState('chase');
  const [timeMode, setTimeMode] = useState('cycle');
  const [bump, setBump] = useState(0);
  const [toast, setToast] = useState(null);
  const [log, setLog] = useState([]);
  const [layersOpen, setLayersOpen] = useState(false);
  const [layers, setLayers] = useState(() => {
    const base = { route: false, plan: true, lattice: true, perception: true, costmap: false, lidar: false, predictions: true, search: true };
    try { return { ...base, ...JSON.parse(localStorage.getItem('city-layers-v2') || '{}') }; } catch { return base; }
  });
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const toastTimer = useRef(0);
  const say = (text, tone = '') => {
    setToast({ text, tone, key: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };
  const [touched, setTouched] = useState(false); // has the visitor driven yet
  const [error, setError] = useState(null);
  const touch = useMemo(() => coarse(), []);
  const runningRef = useRef(running);
  runningRef.current = running;

  const landmarkNodes = useMemo(() => milestones.map((m) => nodeId(m.node[0], m.node[1])), [milestones]);

  useEffect(() => {
    const sim = new CitySim(landmarkNodes);
    simRef.current = sim;
    if (process.env.NODE_ENV === 'development') window.__citySim = sim;
    let view;
    try {
      view = createCityScene(canvasRef.current, sim, { lowPower: coarse() });
    } catch (e) {
      setError('This demo needs WebGL, which is turned off or unavailable in this browser.');
      sim.dispose();
      return undefined;
    }
    sceneRef.current = view;
    if (process.env.NODE_ENV === 'development') window.__cityView = view;
    Object.entries(layersRef.current).forEach(([k, v]) => view.setLayer(k, v));

    const stage = stageRef.current;
    const map = mapRef.current;
    const mctx = map.getContext('2d');
    let mapSize = 0, dpr = 1;
    const resize = () => {
      const r = stage.getBoundingClientRect();
      view.resize(r.width, r.height);
      const mr = map.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      mapSize = mr.width;
      map.width = Math.round(mr.width * dpr);
      map.height = Math.round(mr.height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.intersectionRatio > 0.05; stage.dataset.armed = e.intersectionRatio > 0.35 ? '1' : ''; }, { threshold: [0, 0.05, 0.35, 0.6] });
    io.observe(stage);

    // Keyboard: WASD works whenever the city is on screen; arrows and space
    // only once the city has focus, so they don't hijack page scrolling.
    const onKeyDown = (e) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!stage.dataset.armed) return;
      const k = e.key.toLowerCase();
      const focused = stage.contains(document.activeElement);
      if (k === 'c' && !e.repeat) { view.cam.mode = view.cam.mode === 'chase' ? 'top' : 'chase'; setCamMode(view.cam.mode); return; }
      const act = KEYS[k];
      if (!act) return;
      if ((k.startsWith('arrow') || k === ' ') && !focused) return;
      e.preventDefault();
      pressed.current.add(act);
    };
    const onKeyUp = (e) => { const act = KEYS[e.key.toLowerCase()]; if (act) pressed.current.delete(act); };
    const clear = () => pressed.current.clear();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clear);

    // Drag to look around the car; the view eases back on release.
    let drag = null, releasedAt = -1;
    const onDown = (e) => {
      if (e.target !== canvasRef.current) return;
      stage.focus({ preventScroll: true });
      if (e.pointerType === 'touch') return;
      drag = { x: e.clientX, y: e.clientY, yaw: view.cam.yaw, pitch: view.cam.pitch };
      canvasRef.current.setPointerCapture(e.pointerId);
    };
    const onMove = (e) => {
      if (!drag) return;
      view.cam.yaw = drag.yaw - (e.clientX - drag.x) * 0.006;
      view.cam.pitch = Math.max(-0.25, Math.min(1.2, drag.pitch + (e.clientY - drag.y) * 0.004));
    };
    const onUp = () => { if (drag) { drag = null; releasedAt = performance.now(); } };
    canvasRef.current.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    let logId = 0;
    const note = (text) => {
      const id = ++logId;
      setLog((l) => [...l.slice(-1), { id, text, t: sim.simTime }]);
      setTimeout(() => setLog((l) => l.filter((e) => e.id !== id)), 9000);
    };
    let raf = 0, last = performance.now(), acc = 0, hudT = 1, lastMode = '', lastPlanner = '', lastAuto = '', lastDest;
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!visible || document.hidden) return;

      const p = pressed.current;
      const input = {
        throttle: p.has('throttle'), brake: p.has('brake'), handbrake: p.has('handbrake'),
        steer: (p.has('left') ? 1 : 0) - (p.has('right') ? 1 : 0),
      };
      if (runningRef.current) {
        acc += dt;
        let n = 0;
        while (acc >= STEP && n++ < 5) { sim.step(STEP, input); acc -= STEP; }
        if (n >= 5) acc = 0;
      }
      if (!drag && releasedAt > 0 && now - releasedAt > 1500) {
        view.cam.yaw *= Math.exp(-dt * 2.5);
        view.cam.pitch *= Math.exp(-dt * 2.5);
      }

      // Events from the sim.
      while (sim.events.length) {
        const ev = sim.events.shift();
        if (ev.type === 'arrive') setFocus(ev.index);
        if (ev.type === 'manual') { setTouched(true); say('Autopilot disengaged. You have control.', 'manual'); }
        if (ev.type === 'auto') say('Autopilot engaged. Re-planning from here.', 'auto');
        if (ev.type === 'recover') say(`Hybrid A* found a way out: ${ev.changes + 1}-point manoeuvre, planned in ${Math.round(ev.ms)} ms`, 'recover');
        if (ev.type === 'reset') say('Safety reset: car placed back in its lane', 'recover');
        if (ev.type === 'rtor') say('Right on red after a full stop', 'auto');
        if (ev.type === 'jaywalker') say('Pedestrian crossing mid-block ahead', 'auto');
        if (ev.type === 'decision') note(ev.text);
        if (ev.type === 'route-plan') {
          const name = ev.index != null ? milestones[ev.index]?.where : 'the chosen junction';
          const parts = [`${(ev.length / 1000).toFixed(1)} km`];
          if (ev.highway) parts.push('via the highway');
          if (ev.signals) parts.push(`${ev.signals} signal${ev.signals > 1 ? 's' : ''}`);
          if (ev.stopSigns) parts.push(`${ev.stopSigns} stop sign${ev.stopSigns > 1 ? 's' : ''}`);
          if (ev.roundabouts) parts.push(`${ev.roundabouts} roundabout${ev.roundabouts > 1 ? 's' : ''}`);
          note(`Route to ${name}: ${parts.join(', ')}`);
        }
        if (ev.type === 'bump') { view.shake(Math.min(1.2, ev.speed / 6)); setBump((b) => b + 1); }
      }
      const dest = sim.destination ? sim.destination.index : null;
      if (dest !== lastDest) { lastDest = dest; setNextStop(dest); }
      if (sim.mode !== lastMode) { lastMode = sim.mode; setMode(sim.mode); }
      if (sim.plannerMode !== lastPlanner) { lastPlanner = sim.plannerMode; setPlanner(sim.plannerMode); }
      if (sim.autoState !== lastAuto) { lastAuto = sim.autoState; setAutoState(sim.autoState); }

      view.update(dt);
      view.render();

      // Landmark labels, projected into the stage.
      const rect = stage.getBoundingClientRect();
      sim.city.landmarks.forEach((lm, i) => {
        const el = labelRefs.current[i];
        if (!el) return;
        const b = lm.building;
        const d = Math.hypot(b.x - sim.car.position.x, b.y - sim.car.position.y);
        const pr = view.project(b.x, b.y, b.h + 4);
        const show = !pr.behind && d < 320 && pr.x > 0.04 && pr.x < 0.96 && pr.y > 0.14 && pr.y < 0.86;
        el.style.opacity = show ? String(Math.max(0.35, 1 - d / 320)) : '0';
        el.style.transform = `translate(${Math.round(pr.x * rect.width)}px, ${Math.round(pr.y * rect.height)}px) translate(-50%, -100%)`;
        el.dataset.dest = dest === i ? '1' : '';
      });

      drawMap(mctx, sim, mapSize, dpr);

      hudT += dt;
      if (hudT > 0.1) {
        hudT = 0;
        const H = hud.current;
        if (H.v) H.v.textContent = fmt(Math.abs(sim.car.velocity) * 3.6, 0);
        if (H.p) H.p.textContent = sim.mode === 'auto' && sim.autoState === 'lane' && sim.plannerMode === 'gpu' ? fmt(sim.planMs, 0) : sim.autoState !== 'lane' && sim.recoveryMs ? fmt(sim.recoveryMs, 0) : '—';
        if (H.r) H.r.textContent = sim.mode === 'manual' ? (sim.idle > 0.3 ? `Autonomy resumes in ${fmt(Math.max(0, RESUME_AFTER - sim.idle), 1)} s` : 'You have the wheel') : '';
        if (H.b) H.b.textContent = sim.behaviour;
        if (H.bar) H.bar.style.transform = `scaleX(${sim.mode === 'manual' ? Math.min(1, sim.idle / RESUME_AFTER) : 0})`;
        if (H.g) {
          const g = !runningRef.current ? 'P' : sim.car.velocity < -0.1 ? 'R' : Math.abs(sim.car.velocity) < 0.05 && sim.lights.brake ? 'N' : 'D';
          H.g.dataset.gear = g;
        }
        if (H.k) H.k.dataset.state = sim.blinker && Math.sin(sim.simTime * Math.PI * 3) > 0 ? sim.blinker : '';
        if (H.l) H.l.textContent = String(Math.round((sim.speedLimit || 0) * 3.6));
        if (H.t) { const c = view.clockTime(); H.t.textContent = `${String(Math.floor(c)).padStart(2, '0')}:${String(Math.floor((c % 1) * 60)).padStart(2, '0')}`; }
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clear);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      view.dispose();
      sim.dispose();
    };
  }, [landmarkNodes, milestones]);

  const goTo = (i) => {
    simRef.current?.goTo({ landmark: i });
    setFocus(i);
    if (!running) setRunning(true);
  };

  const onMapClick = (e) => {
    const sim = simRef.current;
    if (!sim) return;
    const r = e.currentTarget.getBoundingClientRect();
    const [x, y] = fromMap(e.clientX - r.left, e.clientY - r.top, r.width);
    // Snap to a landmark if one is close, otherwise to the nearest intersection.
    let best = -1, bd = 40;
    sim.city.landmarks.forEach((lm, i) => { const d = Math.hypot(lm.building.x - x, lm.building.y - y); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) { goTo(best); return; }
    let nearest = 0, nd = Infinity;
    for (let id = 0; id < N * N; id++) { const q = nodePos(id); const d = Math.hypot(q.x - x, q.y - y); if (d < nd) { nd = d; nearest = id; } }
    sim.goTo({ node: nearest });
    if (!running) setRunning(true);
  };

  const hold = (act) => ({
    onPointerDown: (e) => { e.preventDefault(); pressed.current.add(act); },
    onPointerUp: () => pressed.current.delete(act),
    onPointerCancel: () => pressed.current.delete(act),
    onPointerLeave: () => pressed.current.delete(act),
  });

  const m = milestones[focus];
  const next = nextStop != null ? milestones[nextStop] : null;
  const status = mode === 'manual'
    ? 'Manual'
    : autoState === 'recover-plan' ? 'Autonomous · planning recovery'
      : autoState === 'recover' ? 'Autonomous · Hybrid A* manoeuvre'
        : planner === 'gpu' ? 'Autonomous · GPU lattice planner' : planner === 'cpu' ? 'Autonomous · CPU fallback' : 'Starting planner';
  const statusClass = mode === 'manual' ? 'manual' : autoState !== 'lane' ? 'recover' : planner;
  const TIME_NEXT = { cycle: 'day', day: 'night', night: 'cycle' };
  const cycleTime = () => { const v = TIME_NEXT[timeMode]; setTimeMode(v); sceneRef.current?.setTimeMode(v); };
  const setLayer = (k, v) => {
    const next = { ...layers, [k]: v };
    setLayers(next);
    sceneRef.current?.setLayer(k, v);
    try { localStorage.setItem('city-layers-v2', JSON.stringify(next)); } catch { /* private mode */ }
  };
  const pilot = mode === 'manual'
    ? { cls: 'manual', title: 'You’re driving', sub: 'Autopilot resumes 2.5 s after you let go' }
    : autoState !== 'lane'
      ? { cls: 'recover', title: 'Autopilot · recovering', sub: 'Planning a way out with Hybrid A*' }
      : { cls: 'auto', title: 'Autopilot', sub: touch ? 'Driving itself. Use the pedals to take over' : 'Driving itself. Press W A S D to take over' };
  const LAYERS = [
    ['perception', 'Perception boxes'], ['plan', 'Planned trajectory (by speed)'], ['lattice', 'Planner lattice'], ['route', 'Global route'], ['costmap', 'Cost map'],
    ['lidar', 'LiDAR'], ['predictions', 'Predicted paths'], ['search', 'Hybrid A* search'],
  ];

  return (
    <div className="city">
      <div className={`city-stage is-${pilot.cls}`} ref={stageRef} tabIndex={0} aria-label="Interactive 3D city. An autonomous car drives between milestones from Brendan's career. Use W A S D or the arrow keys to take control." role="application">
        <canvas ref={canvasRef} className="city-canvas" />
        {error && <p className="city-error">{error}</p>}
        {bump > 0 && <div key={bump} className="city-flash" aria-hidden="true" />}

        <div className="city-labels" aria-hidden="true">
          {milestones.map((ms, i) => (
            <div key={ms.when + ms.where} ref={(el) => { labelRefs.current[i] = el; }} className="city-label">
              <span className="city-label-when">{ms.when}</span>
              <span className="city-label-where">{ms.where}</span>
            </div>
          ))}
        </div>

        {toast && <div key={toast.key} className={`city-toast is-${toast.tone}`} role="status">{toast.text}</div>}

        <div className="city-hud city-hud-top">
          <div className="city-chips city-chips-col">
            <div className={`city-pilot is-${pilot.cls}`} aria-live="polite">
              <span className="city-pilot-dot" aria-hidden="true" />
              <span className="city-pilot-title">{pilot.title}</span>
              <span className="city-pilot-sub">{pilot.sub}</span>
              <span className="city-pilot-bar" ref={(el) => { hud.current.bar = el; }} aria-hidden="true" />
            </div>
            <div className="city-chips">
              <span className="city-chip city-blink" ref={(el) => { hud.current.k = el; }} aria-hidden="true"><i>◀</i><i>▶</i></span>
              <span className="city-chip city-behaviour" ref={(el) => { hud.current.b = el; }} aria-live="off" />
            </div>
            {mode === 'auto' && log.length > 0 && (
              <ol className="city-log" aria-label="Recent planning decisions">
                {log.map((e) => (
                  <li key={e.id}><time>{fmtT(e.t)}</time>{e.text}</li>
                ))}
              </ol>
            )}
          </div>
          <div className="city-chips">
            <div className="city-layers">
              <button type="button" className="city-chip city-btn" onClick={() => setLayersOpen((o) => !o)} aria-expanded={layersOpen}>Layers</button>
              {layersOpen && (
                <div className="city-layers-menu" role="group" aria-label="Debug views (display only)">
                  {LAYERS.map(([k, label]) => (
                    <label key={k}><input type="checkbox" checked={!!layers[k]} onChange={(e) => setLayer(k, e.target.checked)} /> {label}</label>
                  ))}
                  <p>Display only: the stack runs the same either way.</p>
                </div>
              )}
            </div>
            <button type="button" className="city-chip city-btn city-clock" onClick={cycleTime} title="Time of day: cycling, day or night" aria-label={`Time of day: ${timeMode === 'cycle' ? 'cycling every two minutes' : timeMode}. Click to change.`}>
              <span ref={(el) => { hud.current.t = el; }}>—</span> {timeMode === 'cycle' ? '' : timeMode === 'day' ? '· day' : '· night'}
            </button>
            <button type="button" className="city-chip city-btn" onClick={() => { const v = sceneRef.current; if (!v) return; v.cam.mode = v.cam.mode === 'chase' ? 'top' : 'chase'; setCamMode(v.cam.mode); }}>
              {camMode === 'chase' ? 'Overhead' : 'Chase cam'}
            </button>
            <button type="button" className="city-chip city-btn" onClick={() => setRunning((r) => !r)} aria-pressed={!running}>{running ? 'Pause' : 'Play'}</button>
          </div>
        </div>

        <div className="city-hud city-hud-bottom">
          <dl className="city-chips city-telemetry">
            <div className="city-chip city-gear" ref={(el) => { hud.current.g = el; }} aria-label="Gear"><i>P</i><i>R</i><i>N</i><i>D</i></div>
            <div className="city-chip"><dt>speed</dt><dd><span ref={(el) => { hud.current.v = el; }}>—</span> km/h</dd></div>
            <div className="city-chip"><dt>limit</dt><dd><span ref={(el) => { hud.current.l = el; }}>—</span></dd></div>
            <div className="city-chip"><dt>{status.replace('Autonomous · ', '').replace('Manual', 'planner idle')}</dt><dd><span ref={(el) => { hud.current.p = el; }}>—</span> ms</dd></div>
          </dl>
          {!touched && !touch && (
            <p className="city-hint">
              <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to take the wheel. Crash it, park it anywhere, then let go: it plans its own way out.
            </p>
          )}
        </div>

        <canvas ref={mapRef} className="city-map" onClick={onMapClick} title="Click to send the car somewhere" aria-label="Minimap: click to set a destination" role="button" tabIndex={-1} />

        {touch && !error && (
          <div className="city-touch" aria-hidden="true">
            <div className="city-touch-group">
              <button type="button" {...hold('left')}>◀</button>
              <button type="button" {...hold('right')}>▶</button>
            </div>
            <div className="city-touch-group">
              <button type="button" {...hold('brake')}>▼</button>
              <button type="button" {...hold('throttle')}>▲</button>
            </div>
          </div>
        )}
      </div>

      <ol className="drive-rail" aria-label="Milestones: choose one and the car will route there">
        {milestones.map((ms, i) => (
          <li key={ms.when + ms.where} className={i === focus ? 'is-active' : i === nextStop ? 'is-next' : ''}>
            <button type="button" onClick={() => goTo(i)} aria-current={i === focus ? 'step' : undefined} aria-label={`Drive to ${ms.when}: ${ms.where}`}>
              <span className="drive-tick" aria-hidden="true" />
              <span className="drive-when">{ms.when}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="drive-card" aria-live="polite">
        <p className="drive-card-head">
          <span className="drive-card-when">{m.when}</span>
          <span className="drive-card-where">{m.where}</span>
          {next && next !== m && <span className="drive-card-next">Next stop: {next.where}</span>}
        </p>
        <p className="drive-card-what">{m.what}</p>
        <p className="drive-card-detail">{m.detail} {m.href && <a href={m.href}>Details</a>}</p>
      </div>

      <p className="drive-credit">
        Mine: the city, routing, traffic rules, IDM traffic, Hybrid A* recovery with reverse, behaviour logic and rendering.
        On-road local planning is <a href="https://github.com/mattbradley/dash" target="_blank" rel="noopener noreferrer">Dash</a>, Matt Bradley’s
        open-source GPU lattice planner (MIT), running in a web worker. Click the map or a milestone to send the car somewhere.
      </p>
    </div>
  );
};

export default CityDrive;

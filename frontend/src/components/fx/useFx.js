import { useEffect } from 'react';
import { mountLiquidGlass } from './liquidGlass';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => window.matchMedia('(pointer: fine)').matches;

// One delegated pointer listener drives every [data-tilt] and [data-magnetic]
// element on the page; each only receives CSS variables, the look lives in fx.css.
function mountPointerFx() {
  if (reducedMotion() || !finePointer()) return () => {};

  let tiltEl = null;
  let magEl = null;
  let raf = 0;
  let last = null;

  const clearTilt = () => {
    if (!tiltEl) return;
    tiltEl.classList.remove('is-hovered');
    tiltEl.style.setProperty('--rx', '0deg');
    tiltEl.style.setProperty('--ry', '0deg');
    tiltEl = null;
  };
  const clearMag = () => {
    if (!magEl) return;
    magEl.classList.remove('is-hovered');
    magEl.style.setProperty('--tx', '0px');
    magEl.style.setProperty('--ty', '0px');
    magEl = null;
  };

  const frame = () => {
    raf = 0;
    const e = last;
    const target = e.target instanceof Element ? e.target : null;

    const t = target?.closest('[data-tilt]');
    if (t !== tiltEl) { clearTilt(); tiltEl = t; t?.classList.add('is-hovered'); }
    if (tiltEl) {
      const r = tiltEl.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const max = parseFloat(tiltEl.dataset.tilt) || 4;
      tiltEl.style.setProperty('--mx', `${px * 100}%`);
      tiltEl.style.setProperty('--my', `${py * 100}%`);
      tiltEl.style.setProperty('--rx', `${(0.5 - py) * max}deg`);
      tiltEl.style.setProperty('--ry', `${(px - 0.5) * max}deg`);
    }

    // Magnetic: pull toward the cursor within a radius around the button.
    let m = null;
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const reach = Math.max(r.width, r.height) * 0.9;
      if (Math.abs(e.clientX - cx) < reach && Math.abs(e.clientY - cy) < reach) m = { el, cx, cy };
    });
    if (m?.el !== magEl) { clearMag(); magEl = m?.el || null; magEl?.classList.add('is-hovered'); }
    if (m) {
      const pull = parseFloat(m.el.dataset.magnetic) || 0.3;
      m.el.style.setProperty('--tx', `${(e.clientX - m.cx) * pull}px`);
      m.el.style.setProperty('--ty', `${(e.clientY - m.cy) * pull}px`);
    }
  };

  const onMove = (e) => { last = e; if (!raf) raf = requestAnimationFrame(frame); };
  const onLeave = () => { clearTilt(); clearMag(); };

  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);
  return () => {
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('blur', onLeave);
    cancelAnimationFrame(raf);
  };
}

export default function useFx() {
  useEffect(() => {
    const unmountGlass = mountLiquidGlass();
    const unmountPointer = mountPointerFx();
    return () => { unmountGlass(); unmountPointer(); };
  }, []);
}

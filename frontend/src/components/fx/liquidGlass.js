// Liquid glass: real refraction for any element with the `lg` class.
//
// For each glass element we render a displacement map shaped like a rounded
// rectangle with a curved (squircle-profile) bezel, then use it in an SVG
// filter that the element applies as its backdrop-filter. Light passing
// through the bezel is bent by Snell's law, so whatever sits behind the
// panel's edges appears to curve inward, like looking through thick glass.
//
// SVG filters inside backdrop-filter only work in Chromium, so other
// browsers keep the frosted fallback defined in fx.css.

const SVG_NS = 'http://www.w3.org/2000/svg';
const N_GLASS = 1.5; // refractive index of the "glass"
const SAMPLES = 128; // resolution of the precomputed bezel profile

export const supportsRefraction = () => {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-transparency: reduce)').matches) return false;
  const brands = navigator.userAgentData?.brands || [];
  return brands.some((b) => /Chromium/i.test(b.brand));
};

// Squircle surface height, t = 0 at the outer edge, 1 where the bezel ends.
const height = (t) => Math.pow(1 - Math.pow(1 - t, 4), 0.25);

// Lateral ray displacement across the bezel, normalised so the max is 1.
const bezelProfile = (() => {
  const out = new Float32Array(SAMPLES);
  const dt = 1e-3;
  let max = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const t = Math.min(1 - dt, Math.max(dt, i / (SAMPLES - 1)));
    const slope = (height(t + dt) - height(t - dt)) / (2 * dt);
    const incidence = Math.atan(slope);
    const refracted = Math.asin(Math.sin(incidence) / N_GLASS);
    const shift = Math.tan(incidence - refracted) * (1 - height(t) * 0.5);
    out[i] = shift;
    max = Math.max(max, shift);
  }
  for (let i = 0; i < SAMPLES; i++) out[i] /= max || 1;
  return out;
})();

function buildMap(w, h, radius, bezel) {
  // Build at half resolution; the filter stretches it back smoothly.
  const s = 0.5;
  const cw = Math.max(2, Math.round(w * s));
  const ch = Math.max(2, Math.round(h * s));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(cw, ch);
  const d = img.data;
  const hx = w / 2, hy = h / 2;
  const r = Math.min(radius, hx, hy);

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const px = (x + 0.5) / s - hx;
      const py = (y + 0.5) / s - hy;
      // Signed distance to the rounded rectangle (negative inside).
      const qx = Math.abs(px) - (hx - r);
      const qy = Math.abs(py) - (hy - r);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
      const dist = Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
      const inset = -dist;

      let nx = 0, ny = 0, mag = 0;
      if (inset > 0 && inset < bezel) {
        // Outward surface normal of the rounded rect.
        if (qx > 0 && qy > 0) {
          const l = Math.hypot(qx, qy) || 1;
          nx = (qx / l) * Math.sign(px);
          ny = (qy / l) * Math.sign(py);
        } else if (qx > qy) {
          nx = Math.sign(px);
        } else {
          ny = Math.sign(py);
        }
        const t = inset / bezel;
        mag = bezelProfile[Math.min(SAMPLES - 1, Math.round(t * (SAMPLES - 1)))];
      }
      const i = (y * cw + x) * 4;
      // Sample from further inside the panel: displacement points inward.
      d[i] = 128 - nx * mag * 127;
      d[i + 1] = 128 - ny * mag * 127;
      d[i + 2] = 128;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

let uid = 0;

export function mountLiquidGlass(root = document) {
  if (!supportsRefraction()) return () => {};
  document.documentElement.classList.add('lg-refract');

  const defs = document.createElementNS(SVG_NS, 'svg');
  defs.setAttribute('aria-hidden', 'true');
  defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  document.body.appendChild(defs);

  const tracked = new Map(); // element -> { filter, image, disp, key }

  const update = (el) => {
    const rect = el.getBoundingClientRect();
    const w = Math.round(el.offsetWidth || rect.width);
    const h = Math.round(el.offsetHeight || rect.height);
    if (w < 8 || h < 8) return;
    const cs = getComputedStyle(el);
    const radius = parseFloat(cs.borderTopLeftRadius) || 0;
    const bezel = parseFloat(cs.getPropertyValue('--lg-bezel')) || Math.min(28, w / 4, h / 4);
    const scale = parseFloat(cs.getPropertyValue('--lg-refraction')) || 42;
    const key = `${w}x${h}r${radius}b${bezel}`;

    let entry = tracked.get(el);
    if (!entry) {
      const id = `lg-${++uid}`;
      const filter = document.createElementNS(SVG_NS, 'filter');
      filter.setAttribute('id', id);
      filter.setAttribute('color-interpolation-filters', 'sRGB');
      filter.setAttribute('x', '0');
      filter.setAttribute('y', '0');
      filter.setAttribute('width', '100%');
      filter.setAttribute('height', '100%');
      const image = document.createElementNS(SVG_NS, 'feImage');
      image.setAttribute('x', '0');
      image.setAttribute('y', '0');
      image.setAttribute('preserveAspectRatio', 'none');
      image.setAttribute('result', 'map');
      const disp = document.createElementNS(SVG_NS, 'feDisplacementMap');
      disp.setAttribute('in', 'SourceGraphic');
      disp.setAttribute('in2', 'map');
      disp.setAttribute('xChannelSelector', 'R');
      disp.setAttribute('yChannelSelector', 'G');
      filter.append(image, disp);
      defs.appendChild(filter);
      entry = { id, filter, image, disp, key: '' };
      tracked.set(el, entry);
    }
    entry.disp.setAttribute('scale', String(scale));
    if (entry.key === key) return;
    entry.key = key;
    entry.image.setAttribute('width', String(w));
    entry.image.setAttribute('height', String(h));
    entry.image.setAttribute('href', buildMap(w, h, radius, bezel));
    el.style.setProperty('--lg-filter', `url(#${entry.id})`);
  };

  // Rebuild maps after layout settles; resizing is the only costly path.
  const pending = new Set();
  let raf = 0;
  const schedule = (el) => {
    pending.add(el);
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        pending.forEach((e) => e.isConnected && update(e));
        pending.clear();
      });
    }
  };

  const ro = new ResizeObserver((entries) => entries.forEach((e) => schedule(e.target)));

  const observed = new WeakSet();
  const scan = () => {
    root.querySelectorAll('.lg.refract, .lg.refract-hover').forEach((el) => {
      if (!observed.has(el)) {
        observed.add(el);
        ro.observe(el); // fires once immediately, which builds the first map
      }
    });
    tracked.forEach((entry, el) => {
      if (!el.isConnected) {
        ro.unobserve(el);
        entry.filter.remove();
        tracked.delete(el);
      }
    });
  };

  let scanQueued = false;
  // Safety net: if scrolling keeps dropping frames, fall back to frosted glass.
  let frames = [];
  let lastT = 0;
  let sampling = 0;
  const sample = (t) => {
    if (lastT) frames.push(t - lastT);
    lastT = t;
    if (frames.length < 90) { sampling = requestAnimationFrame(sample); return; }
    const slow = frames.filter((d) => d > 28).length / frames.length;
    frames = [];
    lastT = 0;
    sampling = 0;
    if (slow > 0.3) {
      document.documentElement.classList.remove('lg-refract');
      window.removeEventListener('scroll', onScroll);
      console.info('liquid glass: refraction disabled to keep scrolling smooth');
    }
  };
  const onScroll = () => { if (!sampling) sampling = requestAnimationFrame(sample); };
  window.addEventListener('scroll', onScroll, { passive: true });

  const mo = new MutationObserver(() => {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => { scanQueued = false; scan(); });
  });
  mo.observe(root === document ? document.body : root, { childList: true, subtree: true });
  scan();

  return () => {
    window.removeEventListener('scroll', onScroll);
    cancelAnimationFrame(sampling);
    mo.disconnect();
    ro.disconnect();
    cancelAnimationFrame(raf);
    defs.remove();
    document.documentElement.classList.remove('lg-refract');
  };
}

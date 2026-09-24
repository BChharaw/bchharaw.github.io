import React, { useEffect, useRef } from 'react';

// Decodes text left-to-right through random glyphs, like a readout locking on.
// Each character keeps its final width (the real glyph stays in the layout,
// just hidden) so centred text never jitters while it scrambles.
//
// Safari can't background-clip:text through per-letter boxes, so with
// `gradient` each letter paints its own slice of one shared gradient,
// positioned from measured offsets so the slices line up seamlessly.
const GLYPHS = '01<>/\\[]{}#*+=~^ABCDEFGHJKLMNPQRSTUVWXYZ';

const ScrambleText = ({ text, delay = 0, stagger = 38, cycles = 7, className = '', gradient = false }) => {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!gradient || !root) return undefined;
    const measure = () => {
      const box = root.getBoundingClientRect();
      root.style.setProperty('--gw', `${box.width}px`);
      root.style.setProperty('--gh', `${box.height}px`);
      root.querySelectorAll('[data-ch]').forEach((ch) => {
        const r = ch.getBoundingClientRect();
        ch.style.setProperty('--gx', `${r.left - box.left}px`);
        ch.style.setProperty('--gy', `${r.top - box.top}px`);
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root.parentElement || root); // inline spans don't report resizes
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [text, gradient]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const spans = Array.from(root.querySelectorAll('[data-ch]'));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      spans.forEach((s) => s.classList.remove('sc-pending'));
      return undefined;
    }
    let raf = 0;
    let startAt = 0;
    const frameMs = 45;
    const tick = (now) => {
      if (!startAt) startAt = now + delay;
      let done = true;
      spans.forEach((s, i) => {
        if (!s.classList.contains('sc-pending')) return;
        done = false;
        const settleAt = startAt + i * stagger + cycles * frameMs;
        if (now >= settleAt) {
          s.classList.remove('sc-pending');
        } else if (now >= startAt + i * stagger * 0.35) {
          const step = Math.floor(now / frameMs);
          if (s.dataset.step !== String(step)) {
            s.dataset.step = String(step);
            s.dataset.g = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          }
        }
      });
      if (!done) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, delay, stagger, cycles]);

  return (
    <span ref={ref} className={`scramble ${gradient ? 'scramble-gradient' : ''} ${className}`} aria-label={text}>
      {text.split(' ').map((word, w) => (
        <React.Fragment key={w}>
          {w > 0 && ' '}
          <span className="sc-word" aria-hidden="true">
            {Array.from(word).map((ch, i) => (
              <span key={i} data-ch className="sc-pending" data-g="">{ch}</span>
            ))}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
};

export default ScrambleText;

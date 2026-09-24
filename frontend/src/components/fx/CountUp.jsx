import React, { useEffect, useRef } from 'react';

// Counts every number inside `text` up from zero when it scrolls into view,
// e.g. "4 co-ops + 1 URA" -> 0..4 and 0..1 together.
const CountUp = ({ text, duration = 1400, className = '' }) => {
  const ref = useRef(null);
  const parts = String(text).split(/(\d+)/);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const nums = Array.from(el.querySelectorAll('[data-to]'));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    nums.forEach((n) => { n.textContent = '0'; });

    let raf = 0;
    const run = () => {
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        const e = 1 - Math.pow(1 - p, 4); // ease-out quart
        nums.forEach((n) => { n.textContent = String(Math.round(e * Number(n.dataset.to))); });
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { io.disconnect(); run(); }
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [text, duration]);

  return (
    <span ref={ref} className={`countup ${className}`} aria-label={text}>
      {parts.map((p, i) =>
        /^\d+$/.test(p) ? <span key={i} data-to={p} aria-hidden="true">{p}</span> : <span key={i} aria-hidden="true">{p}</span>
      )}
    </span>
  );
};

export default CountUp;

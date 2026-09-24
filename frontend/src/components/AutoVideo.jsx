import React, { useEffect, useRef } from 'react';

// Muted looping clip that only downloads and plays while it is on screen.
const AutoVideo = ({ src, poster, label, className = '' }) => {
  const ref = useRef(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!v.getAttribute('src')) v.setAttribute('src', src);
        if (!reduced) v.play().catch(() => {});
      } else {
        v.pause();
      }
    }, { rootMargin: '200px 0px' });
    io.observe(v);
    return () => io.disconnect();
  }, [src]);

  return <video ref={ref} className={className} poster={poster} muted loop playsInline preload="none" aria-label={label} />;
};

export default AutoVideo;

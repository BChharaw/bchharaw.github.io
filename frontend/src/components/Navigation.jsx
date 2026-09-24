import React, { useEffect, useState } from 'react';
import { profile } from '../data/site';
import './Navigation.css';

const links = [
  { id: 'experience', label: 'Experience' },
  { id: 'robbie', label: 'Humanoid' },
  { id: 'research', label: 'Research' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
];

const Navigation = () => {
  const [active, setActive] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Highlight whichever section occupies the band just under the nav.
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: '-80px 0px -70% 0px' }
    );
    ['hero', ...links.map((l) => l.id), 'rl', 'motion'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => { window.removeEventListener('scroll', onScroll); io.disconnect(); };
  }, []);

  const current = active === 'rl' || active === 'motion' ? 'robbie' : active;

  return (
    <header className={`nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="wrap nav-inner">
        <a href="#hero" className="nav-name">{profile.name}</a>
        <nav aria-label="Sections">
          <ul className="nav-links">
            {links.map((l) => (
              <li key={l.id}>
                <a href={`#${l.id}`} aria-current={current === l.id ? 'true' : undefined}>{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="nav-actions">
          {profile.resume && (
            <a className="btn" href={profile.resume} target="_blank" rel="noopener noreferrer">Resume</a>
          )}
          <a className="btn btn-primary" href={`mailto:${profile.email}`}>Get in touch</a>
        </div>
      </div>
    </header>
  );
};

export default Navigation;

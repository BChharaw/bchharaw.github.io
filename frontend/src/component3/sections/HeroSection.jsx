import React, { useEffect, useRef, useState } from 'react';
import './HeroSection.css';

const HeroSection = () => {
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate');
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (titleRef.current) observer.observe(titleRef.current);
    if (subtitleRef.current) observer.observe(subtitleRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section id="hero" className="hero-section">
      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-badge fade-in">
            <div className="badge-dot"></div>
            <span className="badge-text">Available for internships Jan - Aug 2026</span>
          </div>
          
          <h1 ref={titleRef} className="hero-title fade-in">
            I'm your guy for
            <br />
            <span className="hero-accent">Robotics Machine Learning.</span>
          </h1>
          
          <p ref={subtitleRef} className="hero-subtitle fade-in delay-1">
            Mechatronics Engineering at University of Waterloo. 
            Looking for a 5th/6th co-op entering 4th year (and hopefully convert to full time). 
          </p>
          
          <div className="hero-highlights fade-in delay-2">
            <div className="highlight-item">
              <div className="highlight-metric">4 Co-ops + 1 URA</div>
              <div className="highlight-label">+3 terms doing part-time engineering work during school.</div>
            </div>
            <div className="highlight-item">
              <div className="highlight-metric">3 ft tall</div>
              <div className="highlight-label">humanoid robot designed from scratch and trained to walk in real life.</div>
            </div>
            <div className="highlight-item">
              <div className="highlight-metric">2</div>
              <div className="highlight-label">Accepted research publications (along with 1 in review and 1 being written).</div>
            </div>
          </div>
          
          <div className="hero-actions fade-in delay-3">
            <button 
              className="cta-button primary"
              onClick={() => document.getElementById('work').scrollIntoView({ behavior: 'smooth' })}
            >
              Click to see what I'm capable of
            </button>
            <button 
              className="cta-button secondary"
              onClick={() => window.open('/resume.pdf', '_blank')}
            >
              Find me on LinkedIn
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
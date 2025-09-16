import React, { useEffect, useRef } from 'react';
import './FinalSection.css';

const FinalSection = ({ assets }) => {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('animate'); });
    }, { threshold: 0.1 });
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="contact" className="final-section section" ref={sectionRef}>
      <div className="final-background">
        <div className="code-matrix">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="code-line" style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${2 + Math.random() * 3}s`,
              animationDelay: `${Math.random() * 2}s`
            }}>
              {Math.random() > 0.5 ? '01010110' : '11001010'}
            </div>
          ))}
        </div>
      </div>

      <div className="final-content" ref={contentRef}>
        <div className="content-wrapper fade-in">
          <div className="final-header">
            <h2 className="section-title">
              ... thats not even everything
              <br />
            </h2>
            <p className="final-subtitle">
              I'm well versed in applied machine learning, robotics, reinforcement learning, sim-to-real transfer, and sensor-fusion. I know what integration hell is like and at this point, I embrace it. Like any human, I don't know everything but I'm always willing to learn what it takes to get the job done. 
            </p>
          </div>

          {/* Prev @ logos */}
          <div className="prev-at fade-in delay-1">
            <span className="badge">Prev @</span>
            <div className="logo-strip">
              <a
                className="logo-item"
                href="https://www.goodlabs.studio"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GoodLabs Studio"
                title="GoodLabs Studio"
              >
                <img src={assets.goodlabs} alt="GoodLabs Studio" loading="lazy" />
              </a>

              <a
                className="logo-item"
                href="https://nrc.canada.ca"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="National Research Council of Canada"
                title="National Research Council of Canada"
              >
                <img src={assets.nrc} alt="National Research Council of Canada" loading="lazy" />
              </a>

              <a
                className="logo-item"
                href="https://vip.uwaterloo.ca"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Vision Image Processing Group, University of Waterloo"
                title="Vision Image Processing Group, University of Waterloo"
              >
                <img src={assets.vip} alt="Vision Image Processing Group, University of Waterloo" loading="lazy" />
              </a>
            <span className="badge">Studying Mechatronics Engineering @</span>

              <a
                className="logo-item"
                href="https://www.uwaterloo.ca"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="University of Waterloo"
                title="University of Waterloo"
              >
                <img src={assets.waterloologo} alt="University of Waterloo" loading="lazy" />
              </a>
            </div>
          </div>

          <div className="call-to-action fade-in delay-2">
            <div className="cta-content">
              <div className="contact-buttons">
                <button className="cta-button primary" onClick={() => window.open('mailto:brendancmechatronics@gmail.com')}>
                  Email Me
                </button>
                <button className="cta-button secondary" onClick={() => window.open('https://linkedin.com/in/bchharawala', '_blank')}>
                  LinkedIn
                </button>
                <button className="cta-button secondary" onClick={() => window.open('https://github.com/bchharaw', '_blank')}>
                  GitHub
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer className="footer">
          <div className="footer-content">
            <div className="footer-bottom">
              <div className="footer-info">
                <div className="copyright">© {currentYear} Brendan Chharawala</div>
                <div className="build-info">Built with many late hours in Engineering 7.</div>
              </div>
              <div className="footer-meta">
                <div className="availability-status"><span>Available for internships Jan - Aug 2026</span></div>
                <div className="location-info">Open to relocation; Work authorization: Canada, EU, (US via H1B)</div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
};

export default FinalSection;

import React, { useEffect, useRef } from 'react';
import './FinalSection.css';

const FinalSection = () => {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate');
          }
        });
      },
      { threshold: 0.1 }
    );

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
              Ready to Build the 
              <br />
              <span className="final-accent">Future Together?</span>
            </h2>
            
            <p className="final-subtitle">
              Experienced ML Robotics Engineer with proven track record in 
              cutting-edge research, practical implementations, and innovative solutions
            </p>
          </div>
          
          <div className="competency-showcase fade-in delay-1">
            <div className="competency-grid">
              <div className="competency-card">
                <div className="competency-icon">🎯</div>
                <h3>Proven Track Record</h3>
                <ul>
                  <li>3+ research publications in top-tier venues</li>
                  <li>2.5mm precision in robotic manipulation</li>
                  <li>98% accuracy in machine learning models</li>
                  <li>Real-world robot deployment success</li>
                </ul>
              </div>
              
              <div className="competency-card">
                <div className="competency-icon">⚡</div>
                <h3>Technical Excellence</h3>
                <ul>
                  <li>Advanced PyTorch & TensorFlow expertise</li>
                  <li>NVIDIA Isaac Gym specialization</li>
                  <li>Full-stack robotics development</li>
                  <li>Research-to-production pipeline</li>
                </ul>
              </div>
              
              <div className="competency-card">
                <div className="competency-icon">🚀</div>
                <h3>Innovation Mindset</h3>
                <ul>
                  <li>Leading-edge research contributions</li>
                  <li>Creative problem-solving approach</li>
                  <li>Cross-disciplinary collaboration</li>
                  <li>Continuous learning & adaptation</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="call-to-action fade-in delay-2">
            <div className="cta-content">
              <h3>Let's Connect</h3>
              <p>
                Looking for a ML Robotics Engineer who can turn ambitious ideas into reality? 
                I'm ready to contribute to groundbreaking projects and push the boundaries 
                of what's possible in robotics and AI.
              </p>
              
              <div className="contact-buttons">
                <button 
                  className="cta-button primary"
                  onClick={() => window.open('mailto:bchharaw@uwaterloo.ca')}
                >
                  Email Me
                </button>
                <button 
                  className="cta-button secondary"
                  onClick={() => window.open('https://linkedin.com/in/bchharawala', '_blank')}
                >
                  LinkedIn
                </button>
                <button 
                  className="cta-button secondary"
                  onClick={() => window.open('https://github.com/bchharaw', '_blank')}
                >
                  GitHub
                </button>
              </div>
            </div>
          </div>
          
          <div className="final-stats fade-in delay-3">
            <div className="stats-grid">
              <div className="stat">
                <div className="stat-number">3.7</div>
                <div className="stat-label">GPA</div>
              </div>
              <div className="stat">
                <div className="stat-number">2+</div>
                <div className="stat-label">Years Experience</div>
              </div>
              <div className="stat">
                <div className="stat-number">5+</div>
                <div className="stat-label">Major Projects</div>
              </div>
              <div className="stat">
                <div className="stat-number">150+</div>
                <div className="stat-label">Students Taught</div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

export default FinalSection;
import React, { useEffect, useRef, useState } from 'react';
import './FinalSection.css';

const FinalSection = ({ assets }) => {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);
  const currentYear = new Date().getFullYear();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('https://formspree.io/f/mnjwjpwe', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (res.ok) {
        setStatus('sent');
        setName(''); setEmail(''); setMessage('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('animate');
      });
    }, { threshold: 0.1 });
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="contact" className="final-section section" ref={sectionRef}>
      <div className="final-background">
        <div className="code-matrix">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="code-line"
              style={{
                left: `${Math.random() * 100}%`,
                animationDuration: `${2 + Math.random() * 3}s`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              {Math.random() > 0.5 ? '01010110' : '11001010'}
            </div>
          ))}
        </div>
      </div>

      <div className="final-content" ref={contentRef}>
        <div className="content-wrapper fade-in">
          <div className="final-header">
            <h2 className="section-title">... that's not even everything</h2>
            <p className="final-subtitle">
              I'm well versed in applied machine learning, robotics, reinforcement learning,
              sim-to-real transfer, and sensor fusion. I know what integration hell is like
              and at this point, I embrace it. Like any human, I don't know everything but
              I'm always willing to learn what it takes to get the job done.
            </p>
          </div>

          <div className="prev-at fade-in delay-1">
            <span className="badge">Prev @</span>
            <div className="logo-strip">
              <a className="logo-item" href="https://www.goodlabs.studio" target="_blank" rel="noopener noreferrer" aria-label="GoodLabs Studio">
                <img src={assets.goodlabs} alt="GoodLabs Studio" loading="lazy" />
              </a>
              <a className="logo-item" href="https://nrc.canada.ca" target="_blank" rel="noopener noreferrer" aria-label="National Research Council of Canada">
                <img src={assets.nrc} alt="National Research Council of Canada" loading="lazy" />
              </a>
              <a className="logo-item" href="https://vip.uwaterloo.ca" target="_blank" rel="noopener noreferrer" aria-label="Vision Image Processing Group, University of Waterloo">
                <img src={assets.vip} alt="Vision Image Processing Group, University of Waterloo" loading="lazy" />
              </a>
              <span className="badge">Studying Mechatronics Engineering @</span>
              <a className="logo-item" href="https://www.uwaterloo.ca" target="_blank" rel="noopener noreferrer" aria-label="University of Waterloo">
                <img src={assets.waterloologo} alt="University of Waterloo" loading="lazy" />
              </a>
            </div>
          </div>

          <div className="contact-section fade-in delay-2">
            <div className="contact-grid">
              <div className="contact-form-panel">
                <h3 className="contact-heading">Get in touch</h3>

                {status === 'sent' ? (
                  <div className="form-success-msg">
                    <p>Message sent. I'll get back to you soon.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="contact-form">
                    <div className="form-row-two">
                      <div className="form-field">
                        <label className="field-label" htmlFor="cf-name">Name</label>
                        <input
                          id="cf-name"
                          type="text"
                          className="field-input"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          required
                          placeholder="Your name"
                        />
                      </div>
                      <div className="form-field">
                        <label className="field-label" htmlFor="cf-email">Email</label>
                        <input
                          id="cf-email"
                          type="email"
                          className="field-input"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>
                    <div className="form-field">
                      <label className="field-label" htmlFor="cf-message">Message</label>
                      <textarea
                        id="cf-message"
                        className="field-input field-textarea"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        required
                        rows={6}
                        placeholder="What's on your mind?"
                      />
                    </div>
                    {status === 'error' && (
                      <p className="form-error-msg">Something went wrong. Please try again or email me directly.</p>
                    )}
                    <button type="submit" disabled={status === 'sending'} className="form-send-btn">
                      {status === 'sending' ? 'Sending...' : 'Send message'}
                    </button>
                  </form>
                )}
              </div>

              <div className="contact-info-panel">
                <h3 className="contact-heading">Reach me directly</h3>
                <a href="mailto:brendancmechatronics@gmail.com" className="contact-direct-email">
                  brendancmechatronics@gmail.com
                </a>
                <div className="contact-social-links">
                  <a href="https://linkedin.com/in/bchharawala" target="_blank" rel="noopener noreferrer" className="social-pill">LinkedIn</a>
                  <a href="https://github.com/bchharaw" target="_blank" rel="noopener noreferrer" className="social-pill">GitHub</a>
                </div>
                <div className="contact-avail">
                  <span className="avail-dot" />
                  Available for internships Jan - Aug 2026
                </div>
                <p className="contact-location">
                  Open to relocation. Work authorization: Canada, EU, US (via J1)
                </p>
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
                <div className="location-info">Open to relocation. Work authorization: Canada, EU, US (via J1)</div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
};

export default FinalSection;

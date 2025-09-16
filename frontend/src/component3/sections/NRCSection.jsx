import React, { useEffect, useRef } from 'react';
import './NRCSection.css';

const NRCSection = () => {
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

  const publications = [
    {
      title: "Design Decisions that Matter in Imitation Learning",
      venue: "CoRL 2025 Data in Robotics Workshop",
      status: "Accepted",
      role: "1st Author",
      description: "Analysis of critical design choices in imitation learning for robotic manipulation."
    },
    {
      title: "Teleoperation for Scalable Learning",
      venue: "HUMANOIDS 2025 ARC Workshop", 
      status: "Accepted",
      role: "3rd Author",
      description: "Framework for scalable robotic learning through teleoperation."
    },
    {
      title: "More coming soon",
      venue: "HUMANOIDS 2025 ARC Workshop", 
      status: "Accepted",
      role: "3rd Author",
      description: "Framework for scalable robotic learning through teleoperation."
    },
    {
      title: "More coming soon", 
      venue: "",
      status: "2 Papers, 1 under review, and 1 being written.",
      role: "2nd Author, 1st Author",
      description: "Shh."
    },
  ];

  const contributions = [
    {
      title: "Automated Trajectory Generation",
      metric: "2.5mm",
      description: "Bézier-based trajectory generator with 75 uninterrupted executions."
    },
    {
      title: "Policy Analysis",
      metric: "3 Models",
      description: "Diagnosed failure modes for OpenVLA, Octo, and ACT policies."
    },
    {
      title: "Comprehensive Ablations",
      metric: "15 Settings",
      description: "Analysis of capture frequency, lighting, and camera configurations."
    }
  ];

  return (
    <section id="research" className="nrc-section" ref={sectionRef}>
      <div className="section-container">
        <div className="nrc-content" ref={contentRef}>
          <div className="section-header fade-in">
            <h2 className="section-title">
              Research at National Research Council
            </h2>
            <p className="section-subtitle">
              Leading-edge research in imitation learning and robotic manipulation
            </p>
          </div>
          
          {/* Publications */}
          <div className="publications-section fade-in delay-1">
            <h3 className="subsection-title">Publications</h3>
            <div className="publications-list">
              {publications.map((pub, index) => (
                <div key={index} className="publication-item">
                  <div className="publication-header">
                    <div className="publication-status">
                      <span className={`status-badge ${pub.status.toLowerCase().replace(' ', '-')}`}>
                        {pub.status}
                      </span>
                      <span className="publication-role">{pub.role}</span>
                    </div>
                  </div>
                  <h4 className="publication-title">{pub.title}</h4>
                  <p className="publication-venue">{pub.venue}</p>
                  <p className="publication-description">{pub.description}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Technical Contributions */}
          <div className="contributions-section fade-in delay-2">
            <h3 className="subsection-title">Key Technical Contributions</h3>
            <div className="contributions-grid">
              {contributions.map((contrib, index) => (
                <div key={index} className="contribution-item">
                  <div className="contribution-metric">{contrib.metric}</div>
                  <h4 className="contribution-title">{contrib.title}</h4>
                  <p className="contribution-description">{contrib.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NRCSection;
import React, { useEffect, useRef } from 'react';
import './MatryoshkaSection.css';

const MatryoshkaSection = () => {
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

  const layers = [768, 384, 192, 96, 48];
  const metrics = [
    { value: "95%", label: "Classification Accuracy" },
    { value: "16x", label: "Efficiency Gain" },
    { value: "Linear", label: "Scaling Behavior" }
  ];

  const innovations = [
    {
      title: "Mixture of Experts Framework",
      description: "Linear routing mechanism based on task complexity for optimal resource allocation."
    },
    {
      title: "Dynamic Scaling", 
      description: "Runtime adaptation of model capacity based on computational constraints."
    },
    {
      title: "Efficient Transfer Learning",
      description: "Nested representations that preserve semantic information across scales."
    }
  ];

  return (
    <section className="matryoshka-section" ref={sectionRef}>
      <div className="section-container">
        <div className="matryoshka-content" ref={contentRef}>
          <div className="section-header fade-in">
            <h2 className="section-title">
              Matryoshka Representation Learning
            </h2>
            <p className="section-subtitle">
              Efficient scalable adaptation using BERT for emotion classification 
              with linear downscaling capabilities
            </p>
          </div>
          
          {/* Architecture Visualization */}
          <div className="architecture-section fade-in delay-1">
            <h3 className="subsection-title">Nested Architecture</h3>
            <div className="layers-container">
              {layers.map((size, index) => (
                <div 
                  key={size} 
                  className="layer-bar"
                  style={{
                    width: `${(size / 768) * 100}%`,
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <span className="layer-label">{size}d</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Performance Metrics */}
          <div className="metrics-section fade-in delay-2">
            <h3 className="subsection-title">Performance</h3>
            <div className="metrics-grid">
              {metrics.map((metric, index) => (
                <div key={index} className="metric-item">
                  <div className="metric-value">{metric.value}</div>
                  <div className="metric-label">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Key Innovations */}
          <div className="innovations-section fade-in delay-3">
            <h3 className="subsection-title">Key Innovations</h3>
            <div className="innovations-grid">
              {innovations.map((innovation, index) => (
                <div key={index} className="innovation-item">
                  <h4 className="innovation-title">{innovation.title}</h4>
                  <p className="innovation-description">{innovation.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MatryoshkaSection;
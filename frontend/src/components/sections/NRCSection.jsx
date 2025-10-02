import React, { useEffect, useRef } from 'react';
import './NRCSection.css';

const NRCSection = ({assets}) => {
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
      link: "https://openreview.net/forum?id=XS2Z3nMxXC",
      role: "     1st Author",
      description: "How temporal horizons, proprioceptive data, teleoperation modalities, and other data manipulations affect generalist robotic policies.",
      thumbnail: assets.corl

    },
        {
      title: "SHARE: Scene-Human Aligned Reconstruction",
      venue: "Siggraph Asia Technical Communications", 
      status: "Accepted",
      link: "https://asia.siggraph.org/2025/program/technical-communications/",

      role: "     2nd Author",
      description: "Accurate in-the-wild human-scene 3D reconstructions from single camera videos, significantly beating all available SOTA methods. Link to come following conference Dec 18th 2025.",
      thumbnail: assets.siggraph

    },
    {
      title: "Teleoperation for Scalable Learning",
      venue: "HUMANOIDS 2025 ARC Workshop", 
      status: "Accepted",
      link: "https://arcworkshop2025.wordpress.com/wp-content/uploads/2025/09/pengchengxi_abstract3-1.pdf",
      role: "     3rd Author",
      description: "Framework for scalable robotic learning through teleoperation, critically evaluating how teleoperation modalities shape learned distributions.",
      thumbnail: assets.humanoids

    }
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
            Summer 2025: The National Research Council of Canada
            </h2>
            <p className="section-subtitle">
              Lots of fun researching lots to do with robotics based machine learning polcies. Lots of papers read, and even some written.
            </p>
          </div>
          
          {/* Publications */}
          <div className="publications-section fade-in delay-1">
            <h3 className="subsection-title">Publications</h3>
            <div className="publications-list">
            {publications.map((pub, index) => (
              <div key={index} className="publication-item">
                <a href={pub.link} target="_blank" rel="noopener noreferrer">

                <div className="publication-content">
                  <div>
                    <div className="publication-header">
                      <div className="publication-status">
                        {/* <span className={`status-badge ${pub.status.toLowerCase().replace(' ', '-')}`}>
                          {pub.status}
                        </span> */}
                        <span className="publication-role">{pub.role}</span>
                      </div>
                    </div>
                    <h4 className="publication-title">{pub.title}</h4>
                    <p className="publication-venue">{pub.venue}</p>
                    <p className="publication-description">{pub.description}</p>
                  </div>

                  {pub.thumbnail && (
                    <img
                      src={pub.thumbnail}
                      alt={`${pub.title} thumbnail`}
                      className="publication-thumbnail"
                    />
                  )}
                </div>
               </a>

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
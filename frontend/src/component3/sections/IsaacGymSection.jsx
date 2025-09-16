import React, { useEffect, useRef, useState } from 'react';
import './IsaacGymSection.css';

const IsaacGymSection = () => {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const [videoOpacity, setVideoOpacity] = useState(0);

  // environments + technical specs (unchanged)
  const environments = [
    {
      title: "Massively Parallel Simulation",
      description: "Up to 4096 humanoid instances running in lockstep at 1000 Hz",
      metric: "4096",
      label: "Parallel Sims"
    },
    {
      title: "Domain Randomization",
      description: "Friction, mass, pushes, and sensor noise randomized to improve transfer",
      metric: "15+",
      label: "Randomized Params"
    },
    {
      title: "Reference-guided Gait",
      description: "Sinusoidal reference motions shaped into PPO rewards for stable walking",
      metric: "0.6 m/s",
      label: "Max Speed"
    }
  ];

  const technicalSpecs = [
    {
      category: "Simulation Framework",
      items: [
        "GPU-accelerated physics at 1000 Hz",
        "Up to 4096 envs per GPU",
        "PyTorch PPO trainer (custom Actor-Critic)",
        "Phase-based reference trajectories"
      ]
    },
    {
      category: "Domain Randomization",
      items: [
        "Friction range [0.5 – 2.0]",
        "Added base mass ±0.3 kg",
        "Random pushes every 1.5 s (vel, torque)",
        "Sensor & observation noise injection"
      ]
    },
    {
      category: "Sim2Real Transfer",
      items: [
        "Reward shaping for foot clearance, stance timing, and balance",
        "Latency & torque smoothness penalties",
        "Calibration of IMU & controller gains",
        "Policies deployed on Jetson Nano in <20 ms/step"
      ]
    }
  ];

// === Fade in/out background video on scroll ===
useEffect(() => {
  const handleScroll = () => {
    if (sectionRef.current) {
      const rect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
      const sectionHeight = rect.height;
      const rawProgress = visibleHeight / sectionHeight;

      // Clamp into [0,1]
      let progress = Math.min(1, Math.max(0, rawProgress));

      // Add thresholds for smoother entry/exit
      const fadeStart = 0.2; // 20% visible
      const fadeEnd = 0.8;   // 80% visible

      if (progress <= fadeStart) {
        progress = 0;
      } else if (progress >= fadeEnd) {
        progress = 1;
      } else {
        // Normalize between fadeStart and fadeEnd
        progress = (progress - fadeStart) / (fadeEnd - fadeStart);
      }

      setVideoOpacity(progress * 0.6); // fade to max 0.6
    }
  };

  window.addEventListener('scroll', handleScroll);
  handleScroll(); // run once on mount
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

  return (
    <section className="isaac-gym-section" ref={sectionRef}>
      {/* Background video */}
      <video
        ref={videoRef}
        className="isaac-background-video"
        src="/robbie_walk2.mp4"  // put your mp4 in /public
        muted
        loop
        playsInline
        autoPlay
        style={{ opacity: videoOpacity }}
      />

      <div className="section-container">
        <div className="isaac-content">
          <div className="section-header fade-in">
            <h2 className="section-title">
              Making Robbie walk using RL in NVIDIA Isaac Gym
            </h2>
<p className="section-subtitle">
  Custom PPO training in NVIDIA Isaac Gym — 4096 parallel humanoids, 
  domain randomization, and reward shaping to produce a robust walking policy.
</p>
          </div>

          {/* Metrics */}
          <div className="metrics-section fade-in delay-1">
            <div className="metrics-grid">
              <div className="metric-card primary">
                <div className="metric-value">1000+</div>
                <div className="metric-label">Parallel Simulations</div>
                <div className="metric-description">Simultaneous robot training instances</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">75</div>
                <div className="metric-label">Consecutive Runs</div>
                <div className="metric-description">Uninterrupted execution cycles</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">0.6 m/s</div>
                <div className="metric-label">Max Speed</div>
                <div className="metric-description">Achieved walking velocity</div>
              </div>
            </div>
          </div>
{/* Environments + Technical side-by-side */}
<div className="env-tech-section fade-in delay-2">
  {/* Training Environments */}
  <div className="environments-section">
    <h3 className="subsection-title">Training Environments</h3>
    {environments.map((env, index) => (
      <div key={index} className={`environment ${index === 0 ? 'active' : ''}`}>
        <div className="env-metric">
          {env.metric} <span className="env-label">{env.label}</span>
        </div>
        <h4 className="env-title">{env.title}</h4>
        <p className="env-description">{env.description}</p>
      </div>
    ))}
  </div>

  {/* Technical Implementation */}
  <div className="technical-section">
    <h3 className="subsection-title">Technical Implementation</h3>
    {technicalSpecs.map((spec, index) => (
      <div key={index} className="tech-category">
        <h4 className="category-title">{spec.category}</h4>
        <ul className="category-items">
          {spec.items.map((item, itemIndex) => (
            <li key={itemIndex} className="category-item">{item}</li>
          ))}
        </ul>
      </div>
    ))}
  </div>
</div>
        </div>
      </div>
    </section>
  );
};

export default IsaacGymSection;
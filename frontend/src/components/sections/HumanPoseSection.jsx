import React, { useEffect, useRef, useState } from 'react';
import './HumanPoseSection.css';

// import latentspacegood from "../../assets/latentspace.gif";
// import L1 from "../../assets/L1.gif";
// import L2 from "../../assets/L2.gif";
// import L3 from "../../assets/L3.gif";
// import L4 from "../../assets/L4.gif";

const motionSteps = [
  {
    phase: "Step 1",
    title: "Variational Encoding",
    description:
      "Each 72-dimensional human pose is compressed into a 3-dimensional latent vector. The VAE’s KL-regularized bottleneck ensures smoothness: nearby poses map to nearby points, so interpolating between latents generates natural in-between postures.",
    metrics: { value: "72→3", label: "Dimensionality reduction" }
  },
  {
    phase: "Step 2",
    title: "Temporal Prediction with LSTM",
    description:
      "Sequences of latent vectors are passed into an LSTM. The recurrence models continuity, predicting the next latent from history. This encodes rhythm and balance — the system can generate entire gait cycles without supervision.",
    metrics: { value: "200+", label: "Steps predicted" }
  },
  {
    phase: "Step 3",
    title: "Reconstruction & Error Metric",
    description:
      "Decoded poses are compared against ground truth. Reconstruction error (MSE in joint angles) becomes a metric for motion plausibility. The downstream RL policy uses this signal to discriminate unnatural trajectories from human-like ones.",
    metrics: { value: "<2%", label: "Reconstruction error" }
  },
  {
    phase: "Step 4",
    title: "RL Integration & Transfer",
    description:
      "Latent rollouts guide an RL policy. Instead of manually shaping rewards, the RL agent learns by aligning with the latent manifold. This lightweight, efficient method transfers to simulation and eventually hardware with minimal task engineering.",
    metrics: { value: "30%", label: "Faster convergence" }
  }
];

const HumanPoseSection = ({assets}) => {
  const sectionRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-rotate carousel
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveStep(prev => (prev + 1) % motionSteps.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const currentStep = motionSteps[activeStep];

  return (
    <section className="human-pose-section" ref={sectionRef}>
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title">Learning Human Motion with VAE-LSTM</h2>
          <p className="section-subtitle">
            A variational autoencoder combined with temporal modeling
            — turning 45,000+ human poses into structured latent trajectories
            that drive reinforcement learning for Robbie the humanoid robot.
          </p>
        </div>

        <div className="motion-workspace">
          {/* Left: Carousel steps */}
          <div
            className="motion-process"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="process-header">
              <div className="step-counter">{activeStep + 1} / {motionSteps.length}</div>
              <div className="phase-label">{currentStep.phase}</div>
            </div>

            <div className="step-content">
              <h3 className="step-title">{currentStep.title}</h3>
              <p className="step-description">{currentStep.description}</p>
              <div className="step-metric">
                <div className="metric-value">{currentStep.metrics.value}</div>
                <div className="metric-label">{currentStep.metrics.label}</div>
              </div>
            </div>

            <div className="carousel-controls">
              <button onClick={() => setActiveStep((activeStep - 1 + motionSteps.length) % motionSteps.length)}>⟨</button>
              <button onClick={() => setActiveStep((activeStep + 1) % motionSteps.length)}>⟩</button>
            </div>

            <div className="progress-dots">
              {motionSteps.map((_, index) => (
                <button
                  key={index}
                  className={`progress-dot ${index === activeStep ? 'active' : ''}`}
                  onClick={() => setActiveStep(index)}
                />
              ))}
            </div>
          </div>

          {/* Right: Latent space visualization */}
          <div className="motion-visual">
            <img
              src={assets.latentspacegood}
              
              alt="Latent space visualization"
              className="motion-image"
            />
            <p className="visual-caption">
              Latent space visualization — each arc corresponds to gait phases
              captured by the VAE-LSTM pipeline.
            </p>
          </div>
        </div>

        {/* === Additional Latent Configurations Section === */}
        <div className="gallery-block">
          <h2 className="block-title">Alternative Latent Spaces</h2>
          <p className="visual-caption">
            Beyond the primary manifold, other VAE configurations revealed different structural
            symmetries of the human body. Some emphasized bilateral limb coupling, others highlighted
            torso–limb coordination or phase-specific clustering. Each latent geometry offered a
            unique perspective on how motion can be organized.
          </p>
          <div className="latent-gallery">
            <img src={assets.L1} alt="Latent variation 1" className="latent-image"/>
            <img src={assets.L2} alt="Latent variation 2" className="latent-image"/>
            <img src={assets.L3} alt="Latent variation 3" className="latent-image"/>
            <img src={assets.L4} alt="Latent variation 4" className="latent-image"/>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HumanPoseSection;

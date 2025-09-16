import React, { useEffect, useRef, useState } from 'react';
import './RobotSection.css';

const RobotSection = () => {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  // Carousel state
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

const engineeringSteps = [
  {
    phase: "Project overview",
    title: "Two years designing and training Robbie",
    description:
      "Robbie is a 3-ft, 18-DoF humanoid robot that Lucas Reljic and I built and trained from scratch over two years. Ethan Hemeon contributed during the initial summer design sprint, while Lucas and I continued full-time (and later part-time during school) through mechanics, reinforcement learning, and deployment. Scroll down for more details on the RL and real-world walking work.",
    metrics: { value: "18", label: "Degrees of freedom" }
  },
  {
    phase: "May – Aug 2023 (FT, team of 3)",
    title: "First humanoid prototype",
    description:
      "In our first summer, Lucas, Ethan, and I designed and built Robbie’s prototype body: a 3-ft, 18-DoF frame. I handled much of the hardware bring-up — over 100 printed parts, power distribution, actuator/sensor integration, and Jetson Nano control. By August, the full prototype stood powered on the bench.",
    metrics: { value: "100+", label: "Custom parts" }
  },
  {
    phase: "Sep – Dec 2023 (PT, solo)",
    title: "Reliability and stability revisions",
    description:
      "Back in school, I iterated part-time to keep Robbie running. That meant widening the feet for balance, upgrading near-limit servos, cleaning harnessing, and retuning PID loops to stop power blackouts mid-stride. These upgrades turned a fragile prototype into a system that could reliably support its own weight.",
    metrics: { value: "3", label: "Major revisions" }
  },
  {
    phase: "Jan – Apr 2024 (FT, Lucas + me)",
    title: "Reinforcement learning at scale",
    description:
      "Lucas and I shifted into NVIDIA Isaac Gym. I authored a detailed URDF twin, tuned its dynamics, and implemented a PyTorch PPO trainer while we co-designed curriculum and rewards. A gait-phase sampling method I introduced cut convergence time by ~33%, enabling robust locomotion across 1000+ parallel simulations.",
    metrics: { value: "1000+", label: "Parallel sims" }
  },
  {
    phase: "May – Aug 2024 (PT, solo + Lucas on DR)",
    title: "Closing the sim-to-real gap",
    description:
      "Simulation-trained policies initially face-planted on hardware. I tackled latency audits, contact-model corrections, and sensor calibration; Lucas expanded domain randomization. I added 15+ randomized parameters, calibrated the IMU, refined fusion, and re-balanced gains — key steps toward controllers that could transfer.",
    metrics: { value: "15+", label: "Randomized params" }
  },
  {
    phase: "Sep 2024 – Jan 2025 (FT, mostly me on deployment)",
    title: "On-device walking",
    description:
      "With Robbie running on a Jetson Nano, I profiled and optimized inference down to <20 ms/step, aligned accelerometers, and tuned controllers. Robbie walked 0.1–0.6 m/s with push tolerance — the moment where two years of design and training became real. (Scroll down for details on RL and deployment work.)",
    metrics: { value: "<20 ms", label: "Inference/step" }
  }
];
  // === Scroll handling for scrubbing ===
  useEffect(() => {
    let scrollTimeout;
    const handleScroll = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const sectionHeight = rect.height;
        const scrolled = Math.max(0, window.innerHeight - rect.top);
        const progress = Math.min(1, Math.max(0, scrolled / sectionHeight));
        setScrollProgress(progress);
      }

      setIsScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => setIsScrolling(false), 150);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Apply scrubbing while scrolling
  useEffect(() => {
    const video = videoRef.current;
    if (video && videoReady && video.duration > 0 && isScrolling) {
      video.currentTime = scrollProgress * video.duration;
    }
  }, [scrollProgress, videoReady, isScrolling]);

  // // Idle spin when not scrolling
  // useEffect(() => {
  //   const video = videoRef.current;
  //   if (!video || !videoReady) return;

  //   let lastTime = performance.now();

  //   const spin = (time) => {
  //     const dt = (time - lastTime) / 1000;
  //     lastTime = time;

  //     if (!isScrolling && video.duration > 0) {
  //       const idleSpeed = 0.05; // fraction of rotation per second
  //       let newTime = video.currentTime + idleSpeed * video.duration * dt;
  //       if (newTime > video.duration) newTime -= video.duration;
  //       video.currentTime = newTime;
  //     }

  //     requestAnimationFrame(spin);
  //   };

  //   requestAnimationFrame(spin);
  // }, [videoReady, isScrolling]);

  // === Independent carousel ===
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveStep(prev => (prev + 1) % engineeringSteps.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused, engineeringSteps.length]);

  const currentStep = engineeringSteps[activeStep];

  return (
    <section id="work" className="robot-section" ref={sectionRef}>
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title">Designing a 3 ft tall humanoid robot (Robbie)</h2>
          <p className="section-subtitle">
            End-to-end learning pipeline from design, to simulation training, to building and deploying in real-life.
          </p>
        </div>

        <div className="robot-workspace">
          {/* Scroll-scrubbed + idle-spinning video */}
          <div className="robot-viewport">
            <video
              ref={videoRef}
              className="robot-video"
              src="/spin.mp4"   // put spin.mp4 in /public
              muted
              playsInline
              onLoadedMetadata={() => setVideoReady(true)}
            />

            <div className="tech-specs">
              <div className="spec-row"><span className="spec-label">Height</span><span className="spec-value">3 feet</span></div>
              <div className="spec-row"><span className="spec-label">Weight</span><span className="spec-value">26.2 lbs</span></div>
              <div className="spec-row"><span className="spec-label">DoF</span><span className="spec-value">18 joints</span></div>
            </div>
          </div>

          {/* Independent carousel for process steps */}
          <div 
            className="engineering-process"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="process-header">
              <div className="step-counter">{activeStep + 1} / {engineeringSteps.length}</div>
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
              <button onClick={() => setActiveStep((activeStep - 1 + engineeringSteps.length) % engineeringSteps.length)}>⟨</button>
              <button onClick={() => setActiveStep((activeStep + 1) % engineeringSteps.length)}>⟩</button>
            </div>

            <div className="progress-dots">
              {engineeringSteps.map((_, index) => (
                <button
                  key={index}
                  className={`progress-dot ${index === activeStep ? 'active' : ''}`}
                  onClick={() => setActiveStep(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RobotSection;

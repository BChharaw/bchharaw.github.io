import React, { useEffect, useRef, useState } from 'react';
import './RobotSection.css';
// import robot_spin from "../../assets/spin.mp4" 
const RobotSection = ({assets}) => {
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
      "Robbie is a 3-ft, 18-DoF humanoid robot that we built and trained from scratch over two years. After an initial 4-month design sprint, development continued full-time (and later part-time during school) through simulation, reinforcement learning, and deployment. The project spanned hardware design, URDF digital twins, policy training, and sim-to-real transfer. Explore this carousel for more about Robbie's story or scroll down for more details on the RL methods and deployment.",
    metrics: { value: "18", label: "Degrees of freedom" }
  },
  {
    phase: "May – Aug 2023",
    title: "First humanoid prototype",
    description:
      "In our first summer at GoodLabs Studio we designed and built Robbie’s prototype body: a 3-ft, 18-DoF frame. While all of us tackled mechanical part design, we also integrated embedded systems and custom electronics needed to later support real-time inference. By August, the powered prototype was operational — providing a physical testbed for machine learning-driven locomotion experiments.",
    metrics: { value: "100+", label: "Custom 3D printed parts" }
  },
  {
    phase: "Sep – Dec 2023 (PT, solo)",
    title: "Reliability and control stability",
    description:
      "Back in school, I iterated part-time to get Robbie stable enough for training and deployment. This involved widening the feet for balance, upgrading under-spec'd servos, tuning PID and other low-level controllers, and hardening the electronics to avoid power brownouts during high-load actions. These refinements created a platform robust enough to host reinforcement learning policies without catastrophic failures.",
    metrics: { value: "3", label: "Major control revisions" }
  },
  {
    phase: "Jan – Apr 2024 (FT, Lucas + me)",
    title: "Reinforcement learning at scale",
    description:
      "During our second co-op, we shifted into NVIDIA Isaac Gym. Using a URDF digital twin, we tuned dynamics and ran thousands of parallel rollouts to train locomotion policies. I prototyped a VAE-LSTM pose embedding model to keep learned gaits close to human priors from motion-capture video. For RL, we implemented a PyTorch PPO trainer with a custom curriculum and reward shaping. A gait-phase sampling method reduced convergence time by ~33%, yielding stable locomotion across 4096 parallel simulations.",
    metrics: { value: "80kg/cm", label: "Torque (lower body servos)" }
  },
  {
    phase: "May – Aug 2024 (PT, solo)",
    title: "Sim-to-real transfer experiments",
    description:
      "Continuing solo during school, I began deploying trained policies to the real robot. As expected, early trials failed dramatically, highlighting latency and cross-board communication issues. I implemented sensor calibration, contact-model corrections, and expanded domain randomization for better generalization. These improvements enabled Robbie to take its first (tethered) steps under a reinforcement learning policy.",
    metrics: { value: "15+", label: "Randomized sim parameters" }
  },
  {
    phase: "Sep 2024 – Jan 2025 (FT, Lucas + me)",
    title: "On-device RL-driven walking",
    description:
      "With Robbie running inference on a Jetson Nano, we tackled bottlenecks in the full pipeline: from sensor input to neural policy output to actuation. We optimized latency to <20 ms per step, enabling real-time closed-loop reinforcement learning policies on-device. While simulation produced multiple walking styles, the most robust in reality resembled a duck-like wobble. Robbie could perform different gaits depending on support conditions — untethered, semi-tethered, or fully tethered for safety.",
    metrics: { value: "<20 ms", label: "End-to-end inference latency" }
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
  // useEffect(() => {
  //   if (isPaused) return;
  //   const timer = setInterval(() => {
  //     setActiveStep(prev => (prev + 1) % engineeringSteps.length);
  //   }, 5000);
  //   return () => clearInterval(timer);
  // }, [isPaused, engineeringSteps.length]);

  const currentStep = engineeringSteps[activeStep];

  return (
    <section id="work" className="robot-section" ref={sectionRef}>
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title">Designing a 3 ft tall humanoid robot (Robbie) @ <a href='https://www.goodlabs.studio'>GoodLabs Studio</a></h2>
          <p className="section-subtitle">
            Designed and built on a team of 3 people total, we handled everything from design, to reinforcement learning, along with construction and deploying in real-life.
          </p>
        </div>

        <div className="robot-workspace">
          {/* Scroll-scrubbed + idle-spinning video */}
          <div className="robot-viewport">
            <video
              ref={videoRef}
              className="robot-video"
              src={assets.spin}   // put spin.mp4 in /public
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

// import React, { useEffect, useRef, useState } from 'react';
// import './IsaacGymSection.css';
// import { TestTube } from 'lucide-react';
// // import robot_sim_walk from "../../assets/robbie_walk2.mp4" 

// const IsaacGymSection = ({assets}) => {
//   const sectionRef = useRef(null);
//   const videoRef = useRef(null);
//   const [videoOpacity, setVideoOpacity] = useState(0);

//   // environments + technical specs (unchanged)
//   const environments = [
//     {
//       title: "Massively Parallel Simulation",
//       description: "Up to 4096 humanoid instances running in lockstep at 1000 Hz",
//       metric: "4096",
//       label: "Parallel Sims"
//     },
//     {
//       title: "Domain Randomization",
//       description: "Friction, mass, pushes, and sensor noise randomized to improve transfer",
//       metric: "15+",
//       label: "Randomized Params"
//     },
//     {
//       title: "Reference-guided Gait",
//       description: "Sinusoidal reference motions shaped into PPO rewards for stable walking",
//       metric: "0.6 m/s",
//       label: "Max Speed"
//     }
//   ];

//   const technicalSpecs = [
//     {
//       category: "Simulation Framework",
//       items: [
//         "GPU-accelerated physics at 1000 Hz",
//         "Up to 4096 envs per GPU",
//         "PyTorch PPO trainer (custom Actor-Critic)",
//         "Phase-based reference trajectories"
//       ]
//     },
//     {
//       category: "Domain Randomization",
//       items: [
//         "Friction range [0.5 – 2.0]",
//         "Added base mass ±0.3 kg",
//         "Random pushes every 1.5 s (vel, torque)",
//         "Sensor & observation noise injection"
//       ]
//     },
//     {
//       category: "Sim2Real Transfer",
//       items: [
//         "Reward shaping for foot clearance, stance timing, and balance",
//         "Latency & torque smoothness penalties",
//         "Calibration of IMU & controller gains",
//         "Policies deployed on Jetson Nano in <20 ms/step"
//       ]
//     }
//   ];

// // === Fade in/out background video on scroll ===
// useEffect(() => {
//   const handleScroll = () => {
//     if (sectionRef.current) {
//       const rect = sectionRef.current.getBoundingClientRect();
//       const windowHeight = window.innerHeight;

//       const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
//       const sectionHeight = rect.height;
//       const rawProgress = visibleHeight / sectionHeight;

//       // Clamp into [0,1]
//       let progress = Math.min(1, Math.max(0, rawProgress));

//       // Add thresholds for smoother entry/exit
//       const fadeStart = 0.2; // 20% visible
//       const fadeEnd = 0.8;   // 80% visible

//       if (progress <= fadeStart) {
//         progress = 0;
//       } else if (progress >= fadeEnd) {
//         progress = 1;
//       } else {
//         // Normalize between fadeStart and fadeEnd
//         progress = (progress - fadeStart) / (fadeEnd - fadeStart);
//       }

//       setVideoOpacity(progress * 0.6); // fade to max 0.6
//     }
//   };

//   window.addEventListener('scroll', handleScroll);
//   handleScroll(); // run once on mount
//   return () => window.removeEventListener('scroll', handleScroll);
// }, []);

//   return (
//     <section className="isaac-gym-section" ref={sectionRef}>
//       {/* Background video */}
//       <video
//         ref={videoRef}
//         className="isaac-background-video"
//         src={assets.robot_sim_walk}  // put your mp4 in /public
//         muted
//         loop
//         playsInline
//         autoPlay
//         style={{ opacity: videoOpacity }}
//       />

//       <div className="section-container">
//         <div className="isaac-content">
//           <div className="section-header fade-in">
//             <h2 className="section-title">
//               Making Robbie walk using RL in NVIDIA Isaac Gym
//             </h2>
// <p className="section-subtitle">
//   Custom PPO training in NVIDIA Isaac Gym — 4096 parallel humanoids, 
//   domain randomization, and reward shaping to produce a robust walking policy.
// </p>
//           </div>

//           {/* Metrics */}
//           <div className="metrics-section fade-in delay-1">
//             <div className="metrics-grid">
//               <div className="metric-card primary">
//                 <div className="metric-value">1000+</div>
//                 <div className="metric-label">Parallel Simulations</div>
//                 <div className="metric-description">Simultaneous robot training instances</div>
//               </div>
//               <div className="metric-card">
//                 <div className="metric-value">75</div>
//                 <div className="metric-label">Consecutive Runs</div>
//                 <div className="metric-description">Uninterrupted execution cycles</div>
//               </div>
//               <div className="metric-card">
//                 <div className="metric-value">0.6 m/s</div>
//                 <div className="metric-label">Max Speed</div>
//                 <div className="metric-description">Achieved walking velocity</div>
//               </div>
//             </div>
//           </div>
// {/* Environments + Technical side-by-side */}
// <div className="env-tech-section fade-in delay-2">
//   {/* Training Environments */}
//   <div className="environments-section">
//     <h3 className="subsection-title">Training Environments</h3>
//     {environments.map((env, index) => (
//       <div key={index} className={`environment ${index === 0 ? 'active' : ''}`}>
//         <div className="env-metric">
//           {env.metric} <span className="env-label">{env.label}</span>
//         </div>
//         <h4 className="env-title">{env.title}</h4>
//         <p className="env-description">{env.description}</p>
//       </div>
//     ))}
//   </div>

//   {/* Technical Implementation */}
//   <div className="technical-section">
//     <h3 className="subsection-title">Technical Implementation</h3>
//     {technicalSpecs.map((spec, index) => (
//       <div key={index} className="tech-category">
//         <h4 className="category-title">{spec.category}</h4>
//         <ul className="category-items">
//           {spec.items.map((item, itemIndex) => (
//             <li key={itemIndex} className="category-item">{item}</li>
//           ))}
//         </ul>
//       </div>
//     ))}
//   </div>
// </div>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default IsaacGymSection;


import React, { useEffect, useRef, useState } from 'react';
import './IsaacGymSection.css';

const IsaacGymSection = ({ assets }) => {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);

  const [videoOpacity, setVideoOpacity] = useState(0.0);
  const [activeBeat, setActiveBeat] = useState(0);

  const storyBeats = [
    {
      k: "setup",
      title: "Why simulation first",
      lead: "We built a URDF twin and calibrated dynamics to de-risk failures and iterate at 1000 Hz before touching hardware.",
      support: "The twin let us validate contact models, center-of-mass shifts, and controller latencies with repeatability.",
      metrics: [{ v: "1000 Hz", l: "Physics step" }, { v: "URDF", l: "Digital twin" }]
    },
    {
      k: "train",
      title: "Massively parallel PPO",
      lead: "4096 humanoids in lockstep, curriculum steps, and phase-guided references stabilized early gait learning.",
      support: "Custom Actor–Critic in PyTorch with reward shaping for clearance, stance timing, and torso stability.",
      metrics: [{ v: "4096", l: "Parallel sims" }, { v: "~33%", l: "Faster convergence" }]
    },
    {
      k: "stress",
      title: "Randomize and perturb",
      lead: "We inject friction/mass variation, pushes, and sensor noise to harden policies against edge cases.",
      support: "Broader randomization ranges cut overfitting and improved recovery after slips and lateral nudges.",
      metrics: [{ v: "15+", l: "Rand. params" }, { v: "1.5 s", l: "Perturb cadence" }]
    },
    {
      k: "transfer",
      title: "Close the sim-to-real gap",
      lead: "Latency budgets, torque smoothing, and IMU calibration brought policy behavior closer to the twin.",
      support: "Full loop sensor→policy→actuator sustained <20 ms on-device, aligning with control horizons.",
      metrics: [{ v: "<20 ms", l: "E2E step" }, { v: "Jetson", l: "On-device" }]
    },
    {
      k: "deploy",
      title: "Real-world walking",
      lead: "Stable, slightly duck-wobble gaits emerged as the most robust under safety tethers and partial support.",
      support: "Policies generalize across support modes; failure cases degrade gracefully rather than catastrophically.",
      metrics: [{ v: "0.6 m/s", l: "Top speed (sim)" }, { v: "Safety", l: "Tether modes" }]
    }
  ];

  const environments = [
    { title: "Massively Parallel Simulation", description: "Up to 4096 humanoid instances running in lockstep at 1000 Hz", metric: "4096", label: "Parallel Sims" },
    { title: "Domain Randomization", description: "Friction, mass, pushes, and sensor noise randomized to improve transfer", metric: "15+", label: "Randomized Params" },
    { title: "Reference-guided Gait", description: "Sinusoidal reference motions shaped into PPO rewards for stable walking", metric: "0.6 m/s", label: "Max Speed" }
  ];

  const technicalSpecs = [
    { category: "Simulation Framework", items: ["GPU-accelerated physics at 1000 Hz", "Up to 4096 envs per GPU", "PyTorch PPO trainer (custom Actor-Critic)", "Phase-based reference trajectories"] },
    { category: "Domain Randomization", items: ["Friction range [0.5 – 2.0]", "Added base mass ±0.3 kg", "Random pushes every 1.5 s (vel, torque)", "Sensor & observation noise injection"] },
    { category: "Sim2Real Transfer", items: ["Reward shaping for foot clearance, stance timing, and balance", "Latency & torque smoothness penalties", "Calibration of IMU & controller gains", "Policies deployed on Jetson Nano in <20 ms/step"] }
  ];

useEffect(() => {
  const onScroll = () => {
    if (!sectionRef.current) return;

    // fade video based on how much of the section is visible
    const rect = sectionRef.current.getBoundingClientRect();
    const h = window.innerHeight;
    const visible = Math.min(rect.bottom, h) - Math.max(rect.top, 0);
    const p = Math.max(0, Math.min(1, visible / rect.height));
    const fadeStart = 0.2, fadeEnd = 0.8;
    const t = p <= fadeStart ? 0 : p >= fadeEnd ? 1 : (p - fadeStart) / (fadeEnd - fadeStart);
    setVideoOpacity(t * 0.6); // identical feel to your original

    // keep the sticky “Now training” in sync
    const mid = h * 0.45;
    const beats = sectionRef.current.querySelectorAll('.story-beat');
    let best = 0, bestDist = Infinity;
    beats.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const c = r.top + r.height * 0.5;
      const d = Math.abs(c - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    setActiveBeat(best);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  return () => window.removeEventListener('scroll', onScroll);
}, []);


  return (
    <section className="isaac-gym-section" ref={sectionRef}>
<video
  ref={videoRef}
  className="isaac-background-video"
  src={assets.robot_sim_walk}
  muted
  loop
  playsInline
  autoPlay
  style={{ opacity: videoOpacity }}
/>

      <div className="video-vignette" />

      <div className="section-container">
        <header className="section-header fade-in">
          <h2 className="section-title">Teaching Robbie to walk with Reinforcement Learning</h2>
          <p className="section-subtitle">
            A focused pipeline: URDF twin → massively parallel PPO → aggressive randomization → latency-aware on-device deployment.
          </p>

          <div className="metric-ribbon">
            <div className="ribbon-pill"><span className="v">4096</span><span className="l">parallel sims</span></div>
            <div className="ribbon-pill"><span className="v">1000 Hz</span><span className="l">physics</span></div>
            <div className="ribbon-pill"><span className="v">&lt;20 ms</span><span className="l">inference/step</span></div>
            <div className="ribbon-pill"><span className="v">0.6 m/s</span><span className="l">sim speed</span></div>
          </div>
        </header>

{/* Story (centered column, no sticky panel) */}
<div className="story-grid">
  <div className="story-column">
    {storyBeats.map((b, i) => (
      <article key={b.k} className={`story-beat ${i === activeBeat ? 'active' : ''}`}>
        <div className="beat-header">
          <div className="beat-index">{String(i + 1).padStart(2, '0')}</div>
          <h3 className="beat-title">{b.title}</h3>
        </div>
        <p className="beat-lead">{b.lead}</p>
        <p className="beat-support">{b.support}</p>
        <div className="beat-metrics">
          {b.metrics.map((m, j) => (
            <div key={j} className="beat-pill">
              <span className="v">{m.v}</span><span className="l">{m.l}</span>
            </div>
          ))}
        </div>
      </article>
    ))}
  </div>
</div>


        <div className="env-tech-section fade-in delay-2">
          <div className="environments-section">
            <h3 className="subsection-title">Training Environments</h3>
            {environments.map((env, index) => (
              <div key={index} className={`environment glass ${index === 0 ? 'active' : ''}`}>
                <div className="env-metric">{env.metric} <span className="env-label">{env.label}</span></div>
                <h4 className="env-title">{env.title}</h4>
                <p className="env-description">{env.description}</p>
              </div>
            ))}
          </div>

          <div className="technical-section">
            <h3 className="subsection-title">Technical Details</h3>
            {technicalSpecs.map((spec, index) => (
              <div key={index} className="tech-category glass">
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
    </section>
  );
};

export default IsaacGymSection;

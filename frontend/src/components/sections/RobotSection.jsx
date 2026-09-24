import React, { useEffect, useRef, useState } from 'react';
import './RobotSection.css';

const chapters = [
  {
    phase: "Project overview",
    title: "Two years designing and training Robbie",
    description:
      "Robbie is a 3-ft, 18-DoF humanoid robot that we built and trained from scratch over two years. After an initial 4-month design sprint, development continued full-time (and later part-time during school) through simulation, reinforcement learning, and deployment. The project spanned hardware design, URDF digital twins, policy training, and sim-to-real transfer.",
    metrics: { value: "18", label: "Degrees of freedom" }
  },
  {
    phase: "May - Aug 2023",
    title: "First humanoid prototype",
    description:
      "In our first summer at GoodLabs Studio we designed and built Robbie’s prototype body: a 3-ft, 18-DoF frame. While all of us tackled mechanical part design, we also integrated embedded systems and custom electronics needed to later support real-time inference. By August, the powered prototype was operational, providing a physical testbed for machine learning-driven locomotion experiments.",
    metrics: { value: "100+", label: "Custom 3D printed parts" }
  },
  {
    phase: "Sep - Dec 2023 (PT, solo)",
    title: "Reliability and control stability",
    description:
      "Back in school, I iterated part-time to get Robbie stable enough for training and deployment. This involved widening the feet for balance, upgrading under-spec'd servos, tuning PID and other low-level controllers, and hardening the electronics to avoid power brownouts during high-load actions. These refinements created a platform robust enough to host reinforcement learning policies without catastrophic failures.",
    metrics: { value: "3", label: "Major control revisions" }
  },
  {
    phase: "Jan - Apr 2024 (FT, Lucas + me)",
    title: "Reinforcement learning at scale",
    description:
      "During our second co-op, we shifted into NVIDIA Isaac Gym. Using a URDF digital twin, we tuned dynamics and ran thousands of parallel rollouts to train locomotion policies. I prototyped a VAE-LSTM pose embedding model to keep learned gaits close to human priors from motion-capture video. For RL, we implemented a PyTorch PPO trainer with a custom curriculum and reward shaping. A gait-phase sampling method reduced convergence time by ~33%, yielding stable locomotion across 4096 parallel simulations.",
    metrics: { value: "80kg/cm", label: "Torque (lower body servos)" }
  },
  {
    phase: "May - Aug 2024 (PT, solo)",
    title: "Sim-to-real transfer experiments",
    description:
      "Continuing solo during school, I began deploying trained policies to the real robot. As expected, early trials failed dramatically, highlighting latency and cross-board communication issues. I implemented sensor calibration, contact-model corrections, and expanded domain randomization for better generalization. These improvements enabled Robbie to take its first (tethered) steps under a reinforcement learning policy.",
    metrics: { value: "15+", label: "Randomized sim parameters" }
  },
  {
    phase: "Sep 2024 - Jan 2025 (FT, Lucas + me)",
    title: "On-device RL-driven walking",
    description:
      "With Robbie running inference on a Jetson Nano, we tackled bottlenecks in the full pipeline: from sensor input to neural policy output to actuation. We optimized latency to <20 ms per step, enabling real-time closed-loop reinforcement learning policies on-device. While simulation produced multiple walking styles, the most robust in reality resembled a duck-like wobble. Robbie could perform different gaits depending on support conditions: untethered, semi-tethered, or fully tethered for safety.",
    metrics: { value: "<20 ms", label: "End-to-end inference latency" }
  }
];

const RobotSection = ({ assets }) => {
  const videoRef = useRef(null);
  const [active, setActive] = useState(0);
  const chapter = chapters[active];

  // === Turntable: auto-rotate by default, slider / drag to take control ===
  const sliderRef = useRef(null);
  const readoutRef = useRef(null);
  const [autoSpin, setAutoSpin] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const spin = useRef({ dragging: false, seeking: false, pending: null, resumeTimer: 0, auto: autoSpin });
  spin.current.auto = autoSpin;

  // Reflect the current angle in the slider without re-rendering the section.
  const showAngle = (deg) => {
    const a = ((Math.round(deg) % 360) + 360) % 360;
    if (sliderRef.current) {
      sliderRef.current.value = String(a);
      sliderRef.current.style.setProperty('--p', `${(a / 360) * 100}%`);
    }
    if (readoutRef.current) readoutRef.current.textContent = `${a}°`;
  };

  // spin.mp4 has a single keyframe, so seeks are slow: coalesce them so only
  // the latest requested angle is decoded once the previous seek lands.
  const seekTo = (deg) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const s = spin.current;
    s.pending = ((((deg % 360) + 360) % 360) / 360) * video.duration;
    showAngle(deg);
    if (s.seeking) return;
    s.seeking = true;
    video.currentTime = s.pending;
    s.pending = null;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const s = spin.current;
    const onSeeked = () => {
      s.seeking = false;
      if (s.pending != null) {
        s.seeking = true;
        video.currentTime = s.pending;
        s.pending = null;
      }
    };
    let raf = 0;
    const track = () => {
      if (video.duration && !s.dragging) showAngle((video.currentTime / video.duration) * 360);
      raf = requestAnimationFrame(track);
    };
    const onMeta = () => { video.playbackRate = 0.35; };
    // play() before the source has loaded gets aborted, so (re)start once ready.
    const onReady = () => {
      if (s.auto && !s.dragging && video.paused) video.play().catch(() => {});
    };
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('canplay', onReady);
    if (video.readyState >= 1) onMeta();
    if (video.readyState >= 3) onReady();
    raf = requestAnimationFrame(track);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(s.resumeTimer);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('canplay', onReady);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (autoSpin && !spin.current.dragging) {
      video.playbackRate = 0.35;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [autoSpin]);

  const beginControl = () => {
    const s = spin.current;
    s.dragging = true;
    clearTimeout(s.resumeTimer);
    videoRef.current?.pause();
  };
  const endControl = () => {
    const s = spin.current;
    s.dragging = false;
    clearTimeout(s.resumeTimer);
    // Hand control back to the turntable after a short pause.
    if (autoSpin) s.resumeTimer = setTimeout(() => videoRef.current?.play().catch(() => {}), 1800);
  };

  // Grab-and-drag the robot itself, like spinning a turntable.
  const onViewportPointerDown = (e) => {
    const video = videoRef.current;
    if (!video?.duration) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    beginControl();
    const startX = e.clientX;
    const startDeg = (video.currentTime / video.duration) * 360;
    const move = (ev) => seekTo(startDeg - (ev.clientX - startX) * 0.6);
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      endControl();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };

  return (
    <section id="robbie" className="section">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow"><b>02</b> Humanoid</p>
          <div>
            <h2 className="h2">Robbie: a 3 ft humanoid we built from scratch and taught to walk</h2>
            <p className="lede">
              Two years at <a href="https://www.goodlabs.studio" target="_blank" rel="noopener noreferrer">GoodLabs Studio</a> on
              a team of three: mechanical design, electronics, a URDF digital twin, reinforcement learning, and
              sim-to-real deployment on the robot.
            </p>
          </div>
        </div>

        <div className="robot-grid">
          <figure className="figure robot-figure">
            <div className="robot-stage panel" onPointerDown={onViewportPointerDown} title="Drag to rotate">
              <video
                ref={videoRef}
                className="robot-video"
                src={assets.spin}
                muted
                loop
                playsInline
                autoPlay={autoSpin}
                preload="auto"
                aria-label="Robbie rotating on a turntable"
              />
            </div>

            <div className="turntable">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setAutoSpin((v) => !v)}
                aria-pressed={!autoSpin}
                aria-label={autoSpin ? 'Pause rotation' : 'Resume rotation'}
              >
                {autoSpin ? (
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>
                )}
              </button>
              <input
                ref={sliderRef}
                type="range"
                min="0"
                max="359"
                step="1"
                defaultValue="0"
                aria-label="Rotate Robbie"
                className="turntable-slider"
                onPointerDown={beginControl}
                onPointerUp={endControl}
                onPointerCancel={endControl}
                onKeyDown={beginControl}
                onKeyUp={endControl}
                onInput={(e) => seekTo(Number(e.currentTarget.value))}
              />
              <output ref={readoutRef} className="turntable-readout" aria-live="off">0°</output>
            </div>

            <dl className="kv robot-specs">
              <div><dt>Height</dt><dd>0.91 m (3 ft)</dd></div>
              <div><dt>Mass</dt><dd>11.9 kg (26.2 lb)</dd></div>
              <div><dt>Actuation</dt><dd>18 servo joints, 80 kg·cm in the legs</dd></div>
              <div><dt>Compute</dt><dd>Jetson Nano, policy step &lt; 20 ms</dd></div>
              <div><dt>Parts</dt><dd>100+ custom 3D-printed</dd></div>
            </dl>
          </figure>

          <div className="chapters">
            <ol className="chapter-list" role="tablist" aria-label="Project timeline">
              {chapters.map((c, i) => (
                <li key={c.title}>
                  <button
                    type="button"
                    role="tab"
                    id={`chapter-tab-${i}`}
                    aria-selected={i === active}
                    aria-controls="chapter-panel"
                    onClick={() => setActive(i)}
                  >
                    <span className="chapter-phase">{c.phase}</span>
                    <span className="chapter-title">{c.title}</span>
                  </button>
                </li>
              ))}
            </ol>

            <div className="chapter-panel" id="chapter-panel" role="tabpanel" aria-labelledby={`chapter-tab-${active}`}>
              <p className="eyebrow">{String(active + 1).padStart(2, '0')} / {String(chapters.length).padStart(2, '0')} · {chapter.phase}</p>
              <h3 className="h3">{chapter.title}</h3>
              <p>{chapter.description}</p>
              <div className="stats">
                <div><b>{chapter.metrics.value}</b><span>{chapter.metrics.label}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RobotSection;

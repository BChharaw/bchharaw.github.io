// import React, { useState, useEffect, useRef } from 'react';
// import './ProjectsCarousel.css';

// const ProjectsCarousel = ({assets}) => {
//   const [activeProject, setActiveProject] = useState(0);
//   const [isAutoPlaying, setIsAutoPlaying] = useState(true);
//   const sectionRef = useRef(null);


// const projects = [


//   {
//     id: 1,
//     title: "Internal library for generating human pose datasets from videos",
//     category: "Research Tool",
//     company: "GoodLabs Studio — Team Robbie",
//     description:
//       "Video-to-3D-pose pipeline using MeTRAbs with batched decoding, vectorized post-processing, and configurable normalization. Provides pose visualization, dataset integrity checks, and compact serialization for downstream learning. Formed the data backbone for the VAE-LSTM described earlier in the site.",
//     image: assets.dataset,
//     video: assets.rotationpose,
//     tech: ["Python", "MeTRAbs", "NumPy", "Visualization"],
//     // metrics: { outputs: "3D skeletons", integrity: "auto-checks", viz: "overlay/export" }
//   },

//   {
//     id: 2,
//     title: "DocUrCODE",
//     category: "Hackathon Project",
//     event: "Hack the North 2023",
//     description:
//       "A GPT wrapper from a while ago which serves as an interactive code explainer: paste code → annotated panels with line-linked highlights. Three abstraction levels (overview/normal/detailed), supports large inputs (~60k chars), and language-agnostic parsing for navigation. Built fast for demo; known gaps: mobile responsiveness and non-Python highlighting.",
//     image: assets.codeexplain2,
//     tech: ["React", "Annotation Engine", "UX"],
//     metrics: { input: "60k chars", levels: "3" },
//     // demo: "https://docurcode.tech/",
//     extraLinks: [
//       { href: "https://devpost.com/software/doc_ur_code", label: "Devpost" },
//       { href: "https://youtu.be/WVcPCwQh6ig", label: "Video Demo" }
//     ]
//   },
//     {
//     id: 3,
//     title: "C++ Machine Vision Car Tracker",
//     category: "Hackathon Project",
//     event: "Toyota Innovation Challenge",
//     description:
//       "C++ machine-vision pipeline that tracks model cars on a conveyor using depth + binarized frames. Starting from a bare camera window, we built our own segmentation, masking, and centroid extraction to isolate bumpers and reject distractors (e.g., hands). Achieved ±1 mm bumper tracking (camera-limited) in real time.",
//     image: assets.conveyorsetup,
//     video: assets.toyotainnovation,
//     tech: ["C++", "Depth + Binary", "Tracking"],
//     metrics: { precision: "±1 mm", runtime: "Real-time", "": "Hand-rejection" },
//     github: "https://github.com/BChharaw/CarTrackingMachineVisionAlgorithm"
//   },

//   {
//     id: 4,
//     title: "Ultraviolet Conduit Cell (UVCC)",
//     category: "Professional Engineers Ontario, Engineering Idol Design Challenge",
//     description:
//       "Autonomous UVC water disinfection concept from a 4-month PEO challenge. System integrates flow handling, UVC dose control, and monitoring; site requirements, safety considerations, and test constraints. Focus on practical assembly and serviceability for field use. Won 2nd place + $750 scholarship.",
//     image: assets.in_tank,
//     tech: ["UVC", "Embedded", "Systems Design"],
//     metrics: { disinfection: "log 4-7", focus: "Indigenous Community Water Safety" },
//     // demo: "https://theuvcc.brenc.repl.co/",
//     github: "https://github.com/BChharaw/AutonomousWaterDisinfection"
//   },


//   {
//     id: 5,
//     title: "Keyboard Typing Gantry",
//     category: "Course Project",
//     course: "MTE 100",
//     description:
//       "2-axis gantry that types on a real keyboard and navigates a desktop UI to send SMS messages. Closed-loop homing, end-stop calibration, and per-key offset maps give ±5 mm repeatability after calibration. Robust inertia compensation made it tolerant to frame vibrations.",
//     image: assets.frontgantry,
//     video: assets.gantrymotion,
//     tech: ["C / RobotC", "Kinematics", "Sensors"],
//     metrics: { axes: "2", precision: "±5 mm", task: "SMS automation" },
//     github: "https://github.com/BChharaw/HighPrecisionGantry"
//   },
//   {
//     id: 6,
//     title: "DIY Bluetooth Speaker (v1)",
//     category: "Personal Project",
//     description:
//       "From salvaged 2007 laptop speakers, hand-wired receiver, and a simple op-amp stage to a printable PLA enclosure. Designed in SolidWorks with battery management, USB charging, and tactile controls. ~2–3 h runtime at typical volume; built for fun, great learning on signal routing and enclosure acoustics.",
//     image: assets.speaker1image2,
//     tech: ["Op-Amp", "Li-ion", "3D CAD/Print"],
//     metrics: { runtime: "2–3 h", charging: "USB", enclosure: "PLA" },
//     demo: "https://drive.google.com/file/d/1UJn1_mlDJh7KRgchUkCvpnsx2lXTTpMn/view?usp=sharing"
//   },

//   {
//     id: 7,
//     title: "DIY Bluetooth Speaker (v2)",
//     category: "Personal Project",
//     description:
//       "Second-gen build focused on real acoustic improvements: higher-quality BT module, proper class-D amplifier PCB, larger 7.4 V pack, and a stiffer PETG enclosure. Stereo module salvaged from a SONY soundbar plus redesigned baffles/ports yielded audibly cleaner mids and higher SPL. Tactile external buttons replaced the embedded switches from v1.",
//     image: assets.speaker2image1,
//     tech: ["Class-D Amp", "BT Audio", "PETG Enclosure"],
//     metrics: { runtime: "~4 h @ max", battery: "7.4 V Li-ion", form: "Stereo" },
//     demo: "https://drive.google.com/file/d/1HR9SodwSb5HQviZwyhfjB5PnNal1oF-9/view?usp=sharing"
//   },

//   {
//     id: 8,
//     title: "RC Crane Project",
//     category: "Team Project",
//     course: "Tron Day",
//     description:
//       "Four score, many years ago back in 1A we made a remote-controlled crane designed for precise pickup/placement of awkward objects (smooth/odd-contour/small area). We tuned linkage geometry and controller gains for smooth, low-overshoot slewing and added a compliant end-effector for grip stability. Demonstrated hand-off between robots; ranked top 15% overall.",
//     image: assets.crane,
//     video: assets.crane_vid,
//     tech: ["Mechanisms", "PID Control", "Rapid Prototyping"],
//     metrics: { placement: "Top 15%", handoff: "Successful", team: "4" },
//     duration: "1 term"
//   },

//   // {
//   //   id: 9,
//   //   title: "Torque Optimizer",
//   //   category: "Academic / Tools",
//   //   description:
//   //     "Brute-force search over 3-axis arm link lengths to minimize peak joint torque under workspace + payload constraints. Provides quick feasibility scans, highlighting trade-offs between reach and actuator sizing; used to inform early geometry choices before detailed FEA.",
//   //   image: assets.torqueoptimizer,
//   //   tech: ["Python", "Search / Grid", "Kinematics"],
//   //   metrics: { joints: "3", objective: "Min peak torque" },
//   //   github: "https://github.com/BChharaw/TorqueOptimizer"
//   // },

//   // {
//   //   id: 10,
//   //   title: "Car Value Estimator",
//   //   category: "Personal Project",
//   //   description:
//   //     "TensorFlow linear regression trained on cleaned CarDekho features (mileage, power, transmission, age, owners). I compared outlier-clipped vs raw targets and inspected feature collinearity in Sheets to avoid leakage. Baseline shows sensible trends; notes included on susceptibility to condition/option packages.",
//   //   image: assets.car_estimator_model,
//   //   tech: ["TensorFlow", "Pandas", "Data Cleaning"],
//   //   metrics: { model: "Linear", source: "CarDekho", target: "Resale price" },
//   //   github: "https://github.com/BChharaw/CarValueEstimator"
//   // },

//   // {
//   //   id: 11,
//   //   title: "Today My Goal Is…",
//   //   category: "Personal Project",
//   //   description:
//   //     "Minimal one-goal-per-day tracker built while learning JS. Cookie-based state, inline editing, and a friction-free UI that encourages daily intent. Used as a browser homepage to create consistency; simple by design, but extremely sticky in practice.",
//   //   image: assets.goals_as_list,
//   //   tech: ["HTML", "CSS", "JavaScript"],
//   //   metrics: { mode: "Single daily goal", persist: "Cookies" },
//   //   github: "https://github.com/BChharaw/GoalTracker"
//   // },
// ];
//   // useEffect(() => {
//   //   if (isAutoPlaying) {
//   //     const interval = setInterval(() => {
//   //       setActiveProject((prev) => (prev + 1) % projects.length);
//   //     }, 5000);
//   //     return () => clearInterval(interval);
//   //   }
//   // }, [isAutoPlaying, projects.length]);

//   useEffect(() => {
//     const observer = new IntersectionObserver(
//       (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('animate')),
//       { threshold: 0.1 }
//     );
//     if (sectionRef.current) observer.observe(sectionRef.current);
//     return () => observer.disconnect();
//   }, []);

//   const currentProject = projects[activeProject];

//   return (
//     <section className="projects-carousel section" ref={sectionRef}>
//       <div className="content-container">
//         <div className="section-header fade-in">
//           {/* <div className="header-badge"><span>Featured Projects</span></div> */}
//           <h2 className="section-title">
//                         A few other things I've done here and there
// <br />
//             {/* <span className="title-accent">Portfolio</span> */}
//           </h2>
//           <p className="section-subtitle">
//             Coursework, research, internships, personal builds, along with random stuff I've done for fun.
//           </p>
//         </div>

//         <div className="carousel-container fade-in delay-1">
//           <div className="carousel-header">
//             <div className="project-navigation">
//               <button
//                 className="nav-btn prev"
//                 onClick={() => setActiveProject((p) => (p - 1 + projects.length) % projects.length)}
//               >‹</button>
//               <div className="project-counter">
//                 <span className="current">{activeProject + 1}</span>
//                 <span className="separator">/</span>
//                 <span className="total">{projects.length}</span>
//               </div>
//               <button
//                 className="nav-btn next"
//                 onClick={() => setActiveProject((p) => (p + 1) % projects.length)}
//               >›</button>
//             </div>
// {/* 
//             <button
//               className={`autoplay-btn ${isAutoPlaying ? 'active' : ''}`}
//               onClick={() => setIsAutoPlaying(!isAutoPlaying)}
//             >
//               {isAutoPlaying ? '⏸' : '▶'} Auto Play
//             </button> */}
//           </div>

//           <div className="project-showcase">
//             <div className="project-media">
//               <div className="media-container">
//                 {currentProject.image && (
//                   <img
//                     src={currentProject.image}
//                     alt={currentProject.title}
//                     className="project-image"
//                   />
//                 )}
//                 <div className="media-overlay">
//                   {currentProject.video && (
//                     <a className="play-button" href={currentProject.video} target="_blank" rel="noreferrer">
//                       <span className="play-icon">▶</span>
//                     </a>
//                   )}
//                   <div className="project-badge">{currentProject.category}</div>
//                 </div>
//               </div>

//               <div className="project-metrics">
//                 <div className="metrics-grid">
//                   {Object.entries(currentProject.metrics || {}).map(([k, v]) => (
//                     <div key={k} className="metric-item">
//                       <div className="metric-value">{v}</div>
//                       <div className="metric-label">{k}</div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>

//             <div className="project-details">
//               <div className="project-header">
//                 <h3 className="project-title">{currentProject.title}</h3>
//                 <div className="project-meta">
//                   {currentProject.course && <span className="meta-item"> {currentProject.course}</span>}
//                   {currentProject.company && <span className="meta-item"> {currentProject.company}</span>}
//                   {currentProject.lab && <span className="meta-item"> {currentProject.lab}</span>}
//                   {currentProject.event && <span className="meta-item"> {currentProject.event}</span>}
//                   {currentProject.duration && <span className="meta-item">⏱ {currentProject.duration}</span>}
//                 </div>
//               </div>

//               <p className="project-description">{currentProject.description}</p>

//               <div className="project-tech">
//                 <h4>Technologies Used</h4>
//                 <div className="tech-stack">
//                   {(currentProject.tech || []).map((t, i) => (
//                     <span key={i} className="tech-tag">{t}</span>
//                   ))}
//                 </div>
//               </div>

//               <div className="project-links">
//                 {currentProject.github && (
//                   <a href={currentProject.github} className="project-link primary" target="_blank" rel="noreferrer">
//                     <span className="link-icon">📂</span> View Code
//                   </a>
//                 )}
//                 {currentProject.demo && (
//                   <a href={currentProject.demo} className="project-link secondary" target="_blank" rel="noreferrer">
//                     <span className="link-icon">🔗</span> Live Demo
//                   </a>
//                 )}
//                 {(currentProject.extraLinks || []).map((l, idx) => (
//                   <a key={idx} href={l.href} className="project-link secondary" target="_blank" rel="noreferrer">
//                     <span className="link-icon">🔗</span> {l.label}
//                   </a>
//                 ))}
//               </div>
//             </div>
//           </div>

//           <div className="carousel-indicators">
//             {projects.map((_, i) => (
//               <button
//                 key={i}
//                 className={`indicator ${i === activeProject ? 'active' : ''}`}
//                 onClick={() => setActiveProject(i)}
//               />
//             ))}
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default ProjectsCarousel;
import React, { useState, useEffect, useRef, useMemo } from 'react';
import './ProjectsCarousel.css';

const ProjectsCarousel = ({ assets = {} }) => {
  const [activeProject, setActiveProject] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const sectionRef = useRef(null);

  const projects = useMemo(() => [
    {
      id: 1,
      title: "Internal library for generating human pose datasets from videos",
      category: "Research Tool",
      company: "GoodLabs Studio — Team Robbie",
      description:
        "Video-to-3D-pose pipeline using MeTRAbs with batched decoding, vectorized post-processing, and configurable normalization. Provides pose visualization, dataset integrity checks, and compact serialization for downstream learning. Formed the data backbone for the VAE-LSTM described earlier in the site.",
      image: assets.dataset,
      video: assets.rotationpose,
      tech: ["Python", "MeTRAbs", "NumPy", "Visualization"],
    },
    {
      id: 2,
      title: "DocUrCODE",
      category: "Hackathon Project",
      event: "Hack the North 2023",
      description:
        "A GPT wrapper from a while ago which serves as an interactive code explainer: paste code → annotated panels with line-linked highlights. Three abstraction levels (overview/normal/detailed), supports large inputs (~60k chars), and language-agnostic parsing for navigation. Built fast for demo; known gaps: mobile responsiveness and non-Python highlighting.",
      image: assets.codeexplain2,
      tech: ["React", "Annotation Engine", "UX"],
      metrics: { input: "60k chars", levels: "3" },
      extraLinks: [
        { href: "https://devpost.com/software/doc_ur_code", label: "Devpost" },
        { href: "https://youtu.be/WVcPCwQh6ig", label: "Video Demo" }
      ]
    },
    {
      id: 3,
      title: "C++ Machine Vision Car Tracker",
      category: "Hackathon Project",
      event: "Toyota Innovation Challenge",
      description:
        "C++ machine-vision pipeline that tracks model cars on a conveyor using depth + binarized frames. Starting from a bare camera window, we built our own segmentation, masking, and centroid extraction to isolate bumpers and reject distractors (e.g., hands). Achieved ±1 mm bumper tracking (camera-limited) in real time.",
      image: assets.conveyorsetup,
      video: assets.toyotainnovation,
      tech: ["C++", "Depth + Binary", "Tracking"],
      metrics: { precision: "±1 mm", runtime: "Real-time", "": "Hand-rejection" },
      github: "https://github.com/BChharaw/CarTrackingMachineVisionAlgorithm"
    },
    {
      id: 4,
      title: "Ultraviolet Conduit Cell (UVCC)",
      category: "Professional Engineers Ontario, Engineering Idol Design Challenge",
      description:
        "Autonomous UVC water disinfection concept from a 4-month PEO challenge. System integrates flow handling, UVC dose control, and monitoring; site requirements, safety considerations, and test constraints. Focus on practical assembly and serviceability for field use. Won 2nd place + $750 scholarship.",
      image: assets.in_tank,
      tech: ["UVC", "Embedded", "Systems Design"],
      metrics: { disinfection: "log 4-7", focus: "Indigenous Community Water Safety" },
      github: "https://github.com/BChharaw/AutonomousWaterDisinfection"
    },
    {
      id: 5,
      title: "Keyboard Typing Gantry",
      category: "Course Project",
      course: "MTE 100",
      description:
        "2-axis gantry that types on a real keyboard and navigates a desktop UI to send SMS messages. Closed-loop homing, end-stop calibration, and per-key offset maps give ±5 mm repeatability after calibration. Robust inertia compensation made it tolerant to frame vibrations.",
      image: assets.frontgantry,
      video: assets.gantrymotion,
      tech: ["C / RobotC", "Kinematics", "Sensors"],
      metrics: { axes: "2", precision: "±5 mm", task: "SMS automation" },
      github: "https://github.com/BChharaw/HighPrecisionGantry"
    },
    {
      id: 6,
      title: "DIY Bluetooth Speaker (v1)",
      category: "Personal Project",
      description:
        "From salvaged 2007 laptop speakers, hand-wired receiver, and a simple op-amp stage to a printable PLA enclosure. Designed in SolidWorks with battery management, USB charging, and tactile controls. ~2–3 h runtime at typical volume; built for fun, great learning on signal routing and enclosure acoustics.",
      image: assets.speaker1image2,
      tech: ["Op-Amp", "Li-ion", "3D CAD/Print"],
      metrics: { runtime: "2–3 h", charging: "USB", enclosure: "PLA" },
      demo: "https://drive.google.com/file/d/1UJn1_mlDJh7KRgchUkCvpnsx2lXTTpMn/view?usp=sharing"
    },
    {
      id: 7,
      title: "DIY Bluetooth Speaker (v2)",
      category: "Personal Project",
      description:
        "Second-gen build focused on real acoustic improvements: higher-quality BT module, proper class-D amplifier PCB, larger 7.4 V pack, and a stiffer PETG enclosure. Stereo module salvaged from a SONY soundbar plus redesigned baffles/ports yielded audibly cleaner mids and higher SPL. Tactile external buttons replaced the embedded switches from v1.",
      image: assets.speaker2image1,
      tech: ["Class-D Amp", "BT Audio", "PETG Enclosure"],
      metrics: { runtime: "~4 h @ max", battery: "7.4 V Li-ion", form: "Stereo" },
      demo: "https://drive.google.com/file/d/1HR9SodwSb5HQviZwyhfjB5PnNal1oF-9/view?usp=sharing"
    },
    {
      id: 8,
      title: "RC Crane Project",
      category: "Team Project",
      course: "Tron Day",
      description:
        "Remote-controlled crane designed for precise pickup/placement of awkward objects. Tuned linkage geometry and controller gains for smooth, low-overshoot slewing; compliant end-effector for grip stability. Demonstrated hand-off between robots; ranked top 15% overall.",
      image: assets.crane,
      video: assets.crane_vid,
      tech: ["Mechanisms", "PID Control", "Rapid Prototyping"],
      metrics: { placement: "Top 15%", handoff: "Successful", team: "4" },
      duration: "1 term"
    },
  ], [assets]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('animate')),
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (projects.length === 0) return;
    if (activeProject > projects.length - 1) {
      setActiveProject(projects.length - 1);
    }
  }, [projects.length, activeProject]);

  const hasProjects = projects.length > 0;
  const currentProject = hasProjects ? projects[activeProject] : null;

  return (
    <section className="projects-carousel section" ref={sectionRef}>
      <div className="content-container">
        <div className="section-header fade-in">
          <h2 className="section-title">A few other things I've done here and there</h2>
          <p className="section-subtitle">
            Coursework, research, internship projects, personal builds, along with random stuff I've done for fun.
          </p>
        </div>

        {!hasProjects ? (
          <div className="fade-in delay-1">No projects to display.</div>
        ) : (
          <div className="carousel-container fade-in delay-1">
            <div className="carousel-header">
              <div className="project-navigation">
                <button
                  className="nav-btn prev"
                  onClick={() => setActiveProject((p) => (p - 1 + projects.length) % projects.length)}
                >‹</button>
                <div className="project-counter">
                  <span className="current">{activeProject + 1}</span>
                  <span className="separator">/</span>
                  <span className="total">{projects.length}</span>
                </div>
                <button
                  className="nav-btn next"
                  onClick={() => setActiveProject((p) => (p + 1) % projects.length)}
                >›</button>
              </div>
            </div>

            {currentProject && (
              <div className="project-showcase">
                <div className="project-media">
                  <div className="media-container">
                    {currentProject.image && (
                      <img
                        src={currentProject.image}
                        alt={currentProject.title}
                        className="project-image"
                      />
                    )}
                    <div className="media-overlay">
                      {currentProject.video && (
                        <a className="play-button" href={currentProject.video} target="_blank" rel="noreferrer">
                          <span className="play-icon">▶</span>
                        </a>
                      )}
                      <div className="project-badge">{currentProject.category}</div>
                    </div>
                  </div>

                  <div className="project-metrics">
                    <div className="metrics-grid">
                      {Object.entries(currentProject.metrics || {}).map(([k, v]) => (
                        <div key={k} className="metric-item">
                          <div className="metric-value">{v}</div>
                          <div className="metric-label">{k}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="project-details">
                  <div className="project-header">
                    <h3 className="project-title">{currentProject.title}</h3>
                    <div className="project-meta">
                      {currentProject.course && <span className="meta-item"> {currentProject.course}</span>}
                      {currentProject.company && <span className="meta-item"> {currentProject.company}</span>}
                      {currentProject.lab && <span className="meta-item"> {currentProject.lab}</span>}
                      {currentProject.event && <span className="meta-item"> {currentProject.event}</span>}
                      {currentProject.duration && <span className="meta-item">⏱ {currentProject.duration}</span>}
                    </div>
                  </div>

                  <p className="project-description">{currentProject.description}</p>

                  <div className="project-tech">
                    <h4>Technologies Used</h4>
                    <div className="tech-stack">
                      {(currentProject.tech || []).map((t, i) => (
                        <span key={i} className="tech-tag">{t}</span>
                      ))}
                    </div>
                  </div>

                  <div className="project-links">
                    {currentProject.github && (
                      <a href={currentProject.github} className="project-link primary" target="_blank" rel="noreferrer">
                        <span className="link-icon">📂</span> View Code
                      </a>
                    )}
                    {currentProject.demo && (
                      <a href={currentProject.demo} className="project-link secondary" target="_blank" rel="noreferrer">
                        <span className="link-icon">🔗</span> Live Demo
                      </a>
                    )}
                    {(currentProject.extraLinks || []).map((l, idx) => (
                      <a key={idx} href={l.href} className="project-link secondary" target="_blank" rel="noreferrer">
                        <span className="link-icon">🔗</span> {l.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="carousel-indicators">
              {projects.map((_, i) => (
                <button
                  key={i}
                  className={`indicator ${i === activeProject ? 'active' : ''}`}
                  onClick={() => setActiveProject(i)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProjectsCarousel;

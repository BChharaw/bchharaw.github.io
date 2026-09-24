import React from 'react';
import './ProjectsSection.css';

const projects = (a) => [
  {
    title: 'Video-to-3D-pose dataset library',
    context: 'GoodLabs Studio · internal tool',
    body: 'MeTRAbs-based pipeline that turns video into 3D pose datasets: batched decoding, vectorised post-processing, configurable normalisation, integrity checks and compact serialisation. The data backbone for the VAE-LSTM motion prior.',
    image: a.dataset,
    tags: ['Python', 'NumPy', 'MeTRAbs'],
    links: [],
  },
  {
    title: 'Machine-vision car tracker',
    context: 'Toyota Innovation Challenge · hackathon',
    body: 'Real-time C++ pipeline that tracks model cars on a conveyor from depth and binarised frames. Starting from a bare camera feed, we wrote our own segmentation, masking and centroid extraction, rejecting distractors like hands. Bumper position to ±1 mm, limited by the camera.',
    image: a.conveyorsetup,
    tags: ['C++', 'Depth camera', 'Segmentation'],
    links: [
      { label: 'Code', href: 'https://github.com/BChharaw/CarTrackingMachineVisionAlgorithm' },
      { label: 'Clip', href: a.toyotainnovation },
    ],
  },
  {
    title: 'Keyboard-typing gantry',
    context: 'MTE 100 · first-year design project',
    body: 'A 2-axis gantry that types on a real keyboard and navigates a desktop UI to send text messages. Closed-loop homing, end-stop calibration and per-key offset maps give ±5 mm repeatability, with inertia compensation for frame vibration.',
    image: a.frontgantry,
    tags: ['RobotC', 'Kinematics', 'Calibration'],
    links: [
      { label: 'Code', href: 'https://github.com/BChharaw/HighPrecisionGantry' },
      { label: 'Clip', href: a.gantrymotion },
    ],
  },
  {
    title: 'Ultraviolet Conduit Cell',
    context: 'PEO Engineering Idol · 2nd place',
    body: 'Autonomous UVC water-disinfection unit designed over four months for community water safety: flow handling, UVC dose control and monitoring, designed for practical assembly and field servicing. 2nd place and a $750 scholarship.',
    image: a.in_tank,
    tags: ['UVC dosing', 'Embedded', 'log 4–7 reduction'],
    links: [{ label: 'Code', href: 'https://github.com/BChharaw/AutonomousWaterDisinfection' }],
  },
  {
    title: 'RC crane',
    context: 'Tron Day · team project',
    body: 'Remote-controlled crane for picking and placing awkward objects. Tuned linkage geometry and controller gains for smooth, low-overshoot slewing and a compliant end effector for grip stability; handed objects off between robots. Top 15% overall.',
    image: a.crane,
    tags: ['PID', 'Rapid prototyping'],
    links: [{ label: 'Clip', href: a.crane_vid }],
  },
  {
    title: 'DocUrCODE',
    context: 'Hack the North 2023',
    body: 'Interactive code explainer: paste code and get annotated panels with line-linked highlights at three levels of detail. Handles inputs up to ~60k characters with language-agnostic navigation. Built in a weekend on an LLM backend.',
    image: a.codeexplain2,
    tags: ['React', 'GCP', 'LLM'],
    links: [
      { label: 'Devpost', href: 'https://devpost.com/software/doc_ur_code' },
      { label: 'Demo video', href: 'https://youtu.be/WVcPCwQh6ig' },
    ],
  },
  {
    title: 'Bluetooth speaker, v2',
    context: 'Personal build',
    body: 'Class-D amplifier board, stereo drivers salvaged from a Sony soundbar, a two-cell pack and a stiffer PETG enclosure with redesigned baffles and ports. Noticeably cleaner mids and higher SPL than v1, about 4 h at full volume.',
    image: a.speaker2image1,
    tags: ['Audio', 'PETG', 'CAD'],
    links: [{ label: 'Video', href: 'https://drive.google.com/file/d/1HR9SodwSb5HQviZwyhfjB5PnNal1oF-9/view?usp=sharing' }],
  },
  {
    title: 'Bluetooth speaker, v1',
    context: 'Personal build',
    body: 'Salvaged 2007 laptop drivers, a hand-wired receiver and an op-amp stage in a SolidWorks-designed PLA enclosure, with battery management, USB charging and tactile controls. 2–3 h of runtime.',
    image: a.speaker1image2,
    tags: ['Op-amp', 'Li-ion', 'SolidWorks'],
    links: [{ label: 'Video', href: 'https://drive.google.com/file/d/1UJn1_mlDJh7KRgchUkCvpnsx2lXTTpMn/view?usp=sharing' }],
  },
];

const ProjectsSection = ({ assets }) => (
  <section id="projects" className="section">
    <div className="wrap">
      <div className="section-head">
        <p className="eyebrow"><b>06</b> Projects</p>
        <div>
          <h2 className="h2">Other things I’ve built</h2>
          <p className="lede">Tools from internships, hackathons, coursework, and hardware I built because I wanted to.</p>
        </div>
      </div>

      <ul className="projects">
        {projects(assets).map((p) => (
          <li key={p.title} className="project">
            <div className="project-media">
              <img src={p.image} alt="" loading="lazy" />
            </div>
            <div className="project-body">
              <p className="eyebrow">{p.context}</p>
              <h3 className="h3">{p.title}</h3>
              <p className="project-text">{p.body}</p>
              <div className="project-foot">
                <div className="tags">{p.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
                {p.links.length > 0 && (
                  <div className="project-links">
                    {p.links.map((l) => (
                      <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default ProjectsSection;

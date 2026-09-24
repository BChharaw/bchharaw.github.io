import React from 'react';
import './ExperienceSection.css';

const roles = [
  {
    org: 'GoodLabs Studio',
    href: 'https://www.goodlabs.studio',
    title: 'Autonomous Vehicles Developer',
    where: 'Toronto, ON',
    when: 'Sep 2026 – present',
    points: [],
  },
  {
    org: 'ENVGO',
    href: 'https://envgo.com',
    title: 'Perception Systems Developer, Radar',
    where: 'Waterloo, ON',
    when: 'May – Aug 2026',
    points: [
      'Developed state-of-the-art radar signal processing for an 8T6R MIMO radar (48 virtual channels), getting the most performance out of the sensor.',
      'Wrote the radar processing firmware for the system.',
    ],
  },
  {
    org: 'ENVGO',
    href: 'https://envgo.com',
    title: 'Machine Learning Developer',
    where: 'Waterloo, ON',
    when: 'Jan – Apr 2026',
    points: [
      'Designed and built a fully automated ML dataset-generation pipeline: novelty-based sample isolation plus downstream processing replaced a manual workflow, making data preparation 24× faster and 32× cheaper.',
      'Architected the move of training and inference to AWS, with automated experiment scheduling, IoT-triggered anomaly flagging on camera feeds, and scalable model serving.',
    ],
  },
  {
    org: 'National Research Council of Canada',
    href: 'https://nrc.canada.ca',
    title: 'ML Robotics Engineering Intern',
    where: 'Ottawa, ON',
    when: 'May – Aug 2025',
    points: [
      'Trained and stress-tested OpenVLA, Octo and ACT on a UR10e; characterised failure modes, outlier robustness and sensitivity to augmentation.',
      'Built a Bézier-based natural-trajectory generator for a 6-DoF arm: 2.5 mm path error over 75 uninterrupted runs.',
      'Three papers from the term: first author at CoRL ’25 (Data in Robotics workshop), second author at SIGGRAPH Asia ’25, third author at Humanoids ’25 (ARC workshop).',
    ],
  },
  {
    org: 'Vision and Image Processing Lab, University of Waterloo',
    href: 'https://vip.uwaterloo.ca',
    title: 'Machine Learning Researcher',
    where: 'Waterloo, ON',
    when: 'Oct 2024 – Apr 2025',
    points: [
      'Reproduced Matryoshka Representation Learning and applied it to efficient BERT adaptation for emotion classification.',
      'Designed a Matryoshka-style mixture of experts with linear routing.',
    ],
  },
  {
    org: 'GoodLabs Studio',
    href: 'https://www.goodlabs.studio',
    title: 'Machine Learning and Robotics Developer',
    where: 'Toronto, ON',
    when: 'May 2023 – Jan 2025',
    points: [
      'Built Robbie, a 3 ft, 18-DoF humanoid, on a team of three: designed the legs and torso and co-developed the RL training and deployment pipeline.',
      'Implemented PPO actor-critic in PyTorch; the robot walks on hardware at 0.1–0.6 m/s and recovers from pushes.',
      'Wrote a VAE-LSTM pipeline that turns human walking video into 3D pose latents used as a motion prior.',
    ],
  },
];

const ExperienceSection = () => (
  <section id="experience" className="section">
    <div className="wrap">
      <div className="section-head">
        <p className="eyebrow"><b>01</b> Experience</p>
        <div>
          <h2 className="h2">Humanoids, radar, research, and now autonomous vehicles</h2>
          <p className="lede">
            Six co-op terms and a research assistantship across a robotics startup, a marine-autonomy company,
            a national research lab and a university vision lab, while studying Mechatronics Engineering at
            Waterloo.
          </p>
        </div>
      </div>

      <ol className="roles">
        {roles.map((r) => (
          <li key={r.org + r.when} className="role">
            <div className="role-meta">
              <p className="role-when">{r.when}</p>
              <p className="muted">{r.where}</p>
            </div>
            <div className="role-body">
              <h3 className="h3">{r.title}</h3>
              <p className="role-org"><a href={r.href} target="_blank" rel="noopener noreferrer">{r.org}</a></p>
              {r.points.length > 0 && (
                <ul className="role-points">
                  {r.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default ExperienceSection;

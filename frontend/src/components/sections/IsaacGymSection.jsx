import React from 'react';
import AutoVideo from '../AutoVideo';
import YouTube from '../YouTube';
import './IsaacGymSection.css';

const pipeline = [
  {
    title: 'Digital twin',
    body: 'URDF model with calibrated dynamics so contact, centre-of-mass shifts and controller latency could be tested at 1000 Hz before touching hardware.',
    tags: ['URDF', '1000 Hz physics'],
  },
  {
    title: 'Parallel PPO',
    body: 'Custom actor-critic PPO in PyTorch over 4096 humanoids, with a curriculum and phase-guided reference gaits. Gait-phase sampling cut convergence time by about a third.',
    tags: ['4096 envs', '~33% faster'],
  },
  {
    title: 'Randomise and perturb',
    body: 'Friction, mass, pushes and sensor noise randomised across 15+ parameters to stop the policy overfitting the twin and improve recovery from slips and shoves.',
    tags: ['15+ params', 'push every 1.5 s'],
  },
  {
    title: 'Latency budget',
    body: 'Sensor calibration, torque smoothing and contact-model fixes; the full sensor → policy → actuator loop runs on a Jetson Nano in under 20 ms.',
    tags: ['< 20 ms', 'Jetson Nano'],
  },
  {
    title: 'Hardware',
    body: 'Untethered, semi-tethered and tethered gaits on the real robot. The most robust gait turned out to be a slight duck-like wobble.',
    tags: ['0.1–0.6 m/s'],
  },
];

const specs = [
  { title: 'Simulation', items: ['Isaac Gym, GPU physics at 1000 Hz', 'Up to 4096 environments per GPU', 'Custom PPO actor-critic trainer in PyTorch', 'Phase-based reference trajectories'] },
  { title: 'Domain randomisation', items: ['Friction 0.5–2.0', 'Base mass ± 0.3 kg', 'Velocity and torque pushes every 1.5 s', 'Sensor and observation noise'] },
  { title: 'Reward and transfer', items: ['Foot clearance, stance timing and balance terms', 'Latency and torque-smoothness penalties', 'IMU and controller-gain calibration', 'On-device inference under 20 ms per step'] },
];

const IsaacGymSection = ({ assets }) => (
  <section id="rl" className="section">
    <div className="wrap">
      <div className="section-head">
        <p className="eyebrow"><b>03</b> Reinforcement learning</p>
        <div>
          <h2 className="h2">From 4096 simulated humanoids to one real one</h2>
          <p className="lede">
            How we got Robbie walking: a calibrated digital twin, massively parallel PPO, aggressive domain
            randomisation, and a deployment loop tight enough to run on the robot.
          </p>
        </div>
      </div>

      <div className="rl-media">
        <figure className="figure">
          <div className="media-frame">
            <AutoVideo src={assets.robot_sim_walk} label="Walking policy rolled out in Isaac Gym" />
          </div>
          <figcaption><b>Simulation.</b> Policy rollout in Isaac Gym.</figcaption>
        </figure>
        <figure className="figure">
          <div className="media-frame">
            <YouTube id="vApPSJQu870" title="Robbie walking in simulation and on hardware" />
          </div>
          <figcaption><b>Hardware.</b> Robbie walking in the lab, tethered and untethered.</figcaption>
        </figure>
      </div>

      <ol className="pipeline">
        {pipeline.map((p, i) => (
          <li key={p.title}>
            <p className="pipeline-n">{String(i + 1).padStart(2, '0')}</p>
            <h3 className="h3">{p.title}</h3>
            <p>{p.body}</p>
            <div className="tags">{p.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
          </li>
        ))}
      </ol>

      <div className="rl-specs">
        {specs.map((s) => (
          <div key={s.title}>
            <h3 className="eyebrow">{s.title}</h3>
            <ul>{s.items.map((it) => <li key={it}>{it}</li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default IsaacGymSection;

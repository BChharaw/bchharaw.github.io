import React from 'react';
import AutoVideo from '../AutoVideo';
import './HumanPoseSection.css';

const steps = [
  {
    title: 'Variational encoding',
    body: 'Each 72-dimensional human pose is compressed to a 3-dimensional latent. The KL-regularised bottleneck keeps the space smooth, so interpolating between latents gives natural in-between postures.',
    metric: ['72 → 3', 'dimensions'],
  },
  {
    title: 'Temporal prediction',
    body: 'An LSTM over latent sequences predicts the next latent from history, which captures rhythm and balance well enough to generate whole gait cycles.',
    metric: ['200+', 'steps predicted'],
  },
  {
    title: 'Plausibility signal',
    body: 'Decoded poses are compared with ground truth; joint-angle reconstruction error becomes a measure of how human a motion looks.',
    metric: ['< 2%', 'reconstruction error'],
  },
  {
    title: 'Prior for RL',
    body: 'Latent rollouts shape the locomotion reward, so the policy learns from recorded human motion as well as hand-written reward terms.',
    metric: ['30%', 'faster convergence'],
  },
];

const HumanPoseSection = ({ assets }) => (
  <section id="motion" className="section">
    <div className="wrap">
      <div className="section-head">
        <p className="eyebrow"><b>04</b> Motion prior</p>
        <div>
          <h2 className="h2">Learning human gait with a VAE-LSTM</h2>
          <p className="lede">
            45,000+ human poses extracted from walking videos, compressed into a 3D latent space and modelled over
            time, then used to keep Robbie’s learned gaits close to human motion.
          </p>
        </div>
      </div>

      <div className="motion-grid">
        <figure className="figure">
          <div className="plot-frame">
            <AutoVideo src={assets.latentspacegood} poster={assets.latentPoster} label="Rotating 3D scatter of the VAE latent space; each arc is a gait cycle" />
          </div>
          <figcaption><b>Fig. 1</b> Primary latent space. Each arc traces the phases of a gait cycle.</figcaption>
        </figure>

        <ol className="motion-steps">
          {steps.map((s, i) => (
            <li key={s.title}>
              <p className="pipeline-n">{String(i + 1).padStart(2, '0')}</p>
              <div>
                <h3 className="h3">{s.title}</h3>
                <p>{s.body}</p>
              </div>
              <p className="motion-metric"><b>{s.metric[0]}</b> {s.metric[1]}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="latent-gallery">
        {['L1', 'L2', 'L3', 'L4'].map((k, i) => (
          <figure key={k} className="figure">
            <div className="plot-frame">
              <AutoVideo src={assets[k]} poster={assets[`${k}Poster`]} label={`Rotating 3D scatter of alternative latent space ${i + 1}`} />
            </div>
            <figcaption><b>Fig. {i + 2}</b> Alternative configuration {i + 1}</figcaption>
          </figure>
        ))}
      </div>
      <p className="gallery-note">
        Other hyperparameter settings, especially the choice of activation function, produced latent spaces with
        different structure: some emphasise bilateral limb coupling, others torso–limb coordination or
        phase-specific clusters.
      </p>
    </div>
  </section>
);

export default HumanPoseSection;

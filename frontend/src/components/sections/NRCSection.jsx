import React, { useState } from 'react';
import YouTube from '../YouTube';
import './NRCSection.css';

const ME = 'B. Chharawala';

const publications = [
  {
    year: '2025',
    title: 'Design Decisions that Matter in Imitation Learning',
    authors: [ME, 'et al.'],
    venue: 'CoRL 2025 Workshop on Data in Robotics',
    role: 'First author',
    summary: 'How action horizon, proprioceptive state, teleoperation modality and other dataset choices change what generalist robot policies learn, measured by fine-tuning Octo on lamp and wiping tasks.',
    links: [{ label: 'OpenReview', href: 'https://openreview.net/forum?id=XS2Z3nMxXC' }],
    thumb: 'corl',
  },
  {
    year: '2025',
    title: 'SHARE: Scene-Human Aligned Reconstruction',
    authors: ['J. Li', ME, 'C. Shu', 'X. B. Peng', 'P. Xi'],
    venue: 'SIGGRAPH Asia 2025 Technical Communications',
    role: 'Second author',
    summary: 'Metric-scale reconstruction of people and the scene around them from a single stationary RGB video, grounding human meshes in scene point maps with two simple losses.',
    links: [
      { label: 'arXiv', href: 'https://arxiv.org/abs/2510.15342' },
      { label: 'ACM DL', href: 'https://dl.acm.org/doi/10.1145/3757376.3771393' },
    ],
    video: '4Mr1j8nbVsM',
    thumb: 'siggraph',
  },
  {
    year: '2025',
    title: 'Teleoperation Modalities for Assistive Learning',
    authors: ['S. Yang', 'S. Liu', ME, 'J. Li', 'D. Liu', 'C. Bellinger', 'C. Shu', 'Y. Hu', 'P. Xi'],
    venue: 'Humanoids 2025, ARC Workshop',
    role: 'Third author',
    summary: 'A comparison of markerless hand tracking, VR controllers and haptic interfaces as sources of demonstrations, and how each shapes the policies learned from them.',
    links: [{ label: 'PDF', href: 'https://arcworkshop2025.wordpress.com/wp-content/uploads/2025/09/pengchengxi_abstract3-1.pdf' }],
    thumb: 'humanoids',
  },
];

const Publication = ({ pub, assets }) => {
  const [showVideo, setShowVideo] = useState(false);
  return (
    <li className="pub">
      <p className="pub-year">{pub.year}</p>
      <div className="pub-body">
        <h3 className="h3"><a href={pub.links[0].href} target="_blank" rel="noopener noreferrer">{pub.title}</a></h3>
        <p className="pub-authors">
          {pub.authors.map((a, i) => (
            <React.Fragment key={a}>{i > 0 && ', '}{a === ME ? <b>{a}</b> : a}</React.Fragment>
          ))}
        </p>
        <p className="pub-venue">{pub.venue} <span className="muted">· {pub.role}</span></p>
        <p className="pub-summary">{pub.summary}</p>
        <div className="pub-links">
          {pub.links.map((l) => (
            <a key={l.label} className="tag" href={l.href} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>
          ))}
          {pub.video && (
            <button type="button" className="tag pub-video-toggle" onClick={() => setShowVideo((v) => !v)} aria-expanded={showVideo}>
              {showVideo ? 'Hide video' : 'Video'}
            </button>
          )}
        </div>
        {showVideo && (
          <div className="media-frame pub-video"><YouTube id={pub.video} title={`${pub.title} video`} /></div>
        )}
      </div>
      <a className="pub-thumb" href={pub.links[0].href} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">
        <img src={assets[pub.thumb]} alt="" loading="lazy" />
      </a>
    </li>
  );
};

const NRCSection = ({ assets }) => (
  <section id="research" className="section">
    <div className="wrap">
      <div className="section-head">
        <p className="eyebrow"><b>05</b> Research</p>
        <div>
          <h2 className="h2">Imitation learning and human–scene reconstruction at the NRC</h2>
          <p className="lede">
            Summer 2025 at the National Research Council of Canada in Ottawa: fine-tuning and stress-testing
            generalist robot policies on a UR10e arm, writing a trajectory generator for it, and three papers.
          </p>
        </div>
      </div>

      <ol className="pubs">
        {publications.map((p) => <Publication key={p.title} pub={p} assets={assets} />)}
      </ol>

      <div className="nrc-work">
        <h3 className="eyebrow">Engineering at NRC</h3>
        <div className="stats">
          <div><b>2.5 mm</b><span>Path error of the Bézier trajectory generator for the 6-DoF arm, over 75 uninterrupted runs</span></div>
          <div><b>3 policies</b><span>OpenVLA, Octo and ACT: failure modes, outlier robustness and augmentation sensitivity</span></div>
          <div><b>15 settings</b><span>Ablations over capture frequency, lighting and camera configuration</span></div>
        </div>
      </div>
    </div>
  </section>
);

export default NRCSection;

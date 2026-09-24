import React, { Suspense, lazy } from 'react';
import { milestones, profile, problemMailto } from '../../data/site';
import './HeroSection.css';

// three.js and the planner load after the text has painted.
const CityDrive = lazy(() => import('../../drive/city/CityDrive'));

const HeroSection = () => (
  <section id="hero" className="hero">
    <div className="wrap">
      <div className="hero-grid">
        <div className="hero-intro">
          <p className="eyebrow">
            <span className="status"><span><b>{profile.current.title}</b> · {profile.current.org}</span></span>
          </p>
          <h1 className="hero-title">Throw me your hardest robotics problem.</h1>
          <p className="lede">
            I’ve taken an 18-DoF humanoid from 4096-environment RL to walking on real hardware, written radar
            processing and firmware for an 8T6R radar, cut ML data preparation time 24×, and published on
            imitation learning at the National Research Council of Canada. ML, RL, embedded, simulation: I go
            wherever the problem is.
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary" href={problemMailto}>Send me a problem</a>
            <a className="btn" href={profile.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a className="btn" href={profile.github} target="_blank" rel="noopener noreferrer">GitHub</a>
            {profile.resume && (
              <a className="btn" href={profile.resume} target="_blank" rel="noopener noreferrer">Resume</a>
            )}
          </div>

          <dl className="kv hero-facts">
            <div><dt>Now</dt><dd>{profile.current.title}, {profile.current.org}</dd></div>
            <div><dt>Range</dt><dd>{profile.range}</dd></div>
            <div><dt>Before</dt><dd>ENVGO, NRC Canada, GoodLabs Studio, VIP Lab</dd></div>
            <div><dt>Papers</dt><dd>CoRL ’25 workshop (1st author), SIGGRAPH Asia ’25 (2nd), Humanoids ’25 workshop (3rd)</dd></div>
            <div><dt>Education</dt><dd>BASc Mechatronics Engineering, AI specialization, University of Waterloo</dd></div>
          </dl>
        </div>

        <Suspense fallback={<div className="city city-loading" aria-busy="true"><div className="city-stage" /></div>}>
          <CityDrive milestones={milestones} />
        </Suspense>
      </div>
    </div>
  </section>
);

export default HeroSection;

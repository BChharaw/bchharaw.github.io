import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navigation from './Navigation';
import HeroSection from './sections/HeroSection';
import ExperienceSection from './sections/ExperienceSection';
import RobotSection from './sections/RobotSection';
import IsaacGymSection from './sections/IsaacGymSection';
import HumanPoseSection from './sections/HumanPoseSection';
import NRCSection from './sections/NRCSection';
import ProjectsSection from './sections/ProjectsSection';
import ContactSection from './sections/ContactSection';
import '../styles/site.css';

const Portfolio = ({ assets }) => {
  const { pathname } = useLocation();

  // "#research" arrives as the path "/research" under HashRouter.
  useEffect(() => {
    const id = decodeURIComponent(pathname.replace(/^\//, ''));
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ block: 'start' });
  }, [pathname]);

  return (
    <>
      <Navigation />
      <main>
        <HeroSection />
        <ExperienceSection />
        <RobotSection assets={assets} />
        <IsaacGymSection assets={assets} />
        <HumanPoseSection assets={assets} />
        <NRCSection assets={assets} />
        <ProjectsSection assets={assets} />
      </main>
      <ContactSection />
    </>
  );
};

export default Portfolio;

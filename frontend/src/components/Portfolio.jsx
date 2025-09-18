// import React, { useEffect, useRef } from 'react';
// import HeroSection from './sections/HeroSection';
// import RobotSection from './sections/RobotSection';
// import IsaacGymSection from './sections/IsaacGymSection';
// import HumanPoseSection from './sections/HumanPoseSection';
// import NRCSection from './sections/NRCSection';
// import ProjectsCarousel from './sections/ProjectsCarousel';
// import FinalSection from './sections/FinalSection';
// import Footer from './sections/Footer';
// import Navigation from './Navigation';
// import './Portfolio.css';

// const Portfolio = () => {
//   const portfolioRef = useRef(null);

//   useEffect(() => {
//     const handleScroll = () => {
//       const scrolled = window.scrollY;
//       const parallax = document.querySelectorAll('.parallax');
      
//       parallax.forEach((element) => {
//         const speed = element.dataset.speed;
//         const yPos = -(scrolled * speed);
//         element.style.transform = `translateY(${yPos}px)`;
//       });
//     };

//     window.addEventListener('scroll', handleScroll);
//     return () => window.removeEventListener('scroll', handleScroll);
//   }, []);

//   return (
//     <div className="portfolio" ref={portfolioRef}>
//       <Navigation />
//       <HeroSection />
//       <RobotSection />
//       <IsaacGymSection />
//       <HumanPoseSection />
//       <NRCSection />
//       <ProjectsCarousel />
//       <FinalSection />
//       <Footer />
//     </div>
//   );
// };

// export default Portfolio;


import React, { useEffect, useRef } from 'react';
import HeroSection from './sections/HeroSection';
import RobotSection from './sections/RobotSection';
import IsaacGymSection from './sections/IsaacGymSection';
import HumanPoseSection from './sections/HumanPoseSection';
import NRCSection from './sections/NRCSection';
import ProjectsCarousel from './sections/ProjectsCarousel';
import FinalSection from './sections/FinalSection';
import Footer from './sections/Footer';
import Navigation from './Navigation';
import RobotVideoSection from './sections/RobbieVideoSection';
import './Portfolio.css';

const Portfolio = ({ assets }) => {
  const portfolioRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const parallax = document.querySelectorAll('.parallax');

      parallax.forEach((element) => {
        const speed = element.dataset.speed;
        const yPos = -(scrolled * speed);
        element.style.transform = `translateY(${yPos}px)`;
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="portfolio" ref={portfolioRef}>
      <Navigation />
      <HeroSection assets={assets} />
      <RobotSection assets={assets} />
      <IsaacGymSection assets={assets} />
      <HumanPoseSection assets={assets} />
      <RobotVideoSection youtubeUrl="https://youtu.be/vApPSJQu870" />
      {/* <NRCSection assets={assets} /> */}
      <ProjectsCarousel assets={assets} />
      <FinalSection assets={assets} />
      {/* <Footer /> */}
    </div>
  );
};

export default Portfolio;

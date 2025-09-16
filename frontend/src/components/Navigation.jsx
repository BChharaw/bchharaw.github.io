import React, { useState, useEffect } from 'react';
import './Navigation.css';

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);

      // Update active section based on scroll position
      const sections = ['hero', 'work', 'research', 'contact'];
      const scrollPosition = window.scrollY + 200;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className={`navigation ${isScrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        <div className="nav-logo">
          <button onClick={() => scrollToSection('hero')}>
            <span className="logo-text">Brendan Chharawala</span>
          </button>
        </div>
        
        <div className="nav-links">
          <button 
            className={activeSection === 'work' ? 'active' : ''}
            onClick={() => scrollToSection('work')}
          >
            Work
          </button>
          <button 
            className={activeSection === 'research' ? 'active' : ''}
            onClick={() => scrollToSection('research')}
          >
            Research
          </button>
          <button 
            className={activeSection === 'contact' ? 'active' : ''}
            onClick={() => scrollToSection('contact')}
          >
            Contact
          </button>
        </div>

        
      </div>
    </nav>
  );
};

export default Navigation;
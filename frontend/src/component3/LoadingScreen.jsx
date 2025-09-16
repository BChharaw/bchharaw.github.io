import React, { useState, useEffect } from 'react';
import './LoadingScreen.css';

const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile based on aspect ratio and screen width
    const checkMobile = () => {
      const aspectRatio = window.innerWidth / window.innerHeight;
      const isMobileDevice = window.innerWidth < 768 || aspectRatio < 1.2;
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <h1 className="loading-title">Brendan Chharawala</h1>
          <p className="loading-subtitle">ML Robotics Engineer</p>
        </div>
        
        {isMobile && (
          <div className="mobile-warning">
            <div className="warning-icon">⚠️</div>
            <p>This site works best on desktop for optimal interactive experience</p>
          </div>
        )}
        
        <div className="loading-bar-container">
          <div className="loading-bar">
            <div 
              className="loading-progress" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="loading-percentage">{progress}%</span>
        </div>
        
        <div className="loading-assets">
          <p>Loading interactive assets...</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
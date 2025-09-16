import React, { useState, useRef } from 'react';
import './VideoShowcase.css';

const VideoShowcase = ({ videos, title, layout = 'grid' }) => {
  const [activeVideo, setActiveVideo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleVideoClick = (index) => {
    setActiveVideo(index);
    setIsPlaying(!isPlaying);
  };

  if (layout === 'featured') {
    return (
      <div className="video-showcase featured">
        <div className="showcase-header">
          <h3>{title}</h3>
        </div>
        
        <div className="featured-layout">
          <div className="main-video">
            <div className="video-container">
              <img 
                src={videos[activeVideo].thumbnail}
                alt={videos[activeVideo].title}
                className="video-thumbnail"
              />
              <div className="video-overlay">
                <button 
                  className={`play-button ${isPlaying ? 'playing' : ''}`}
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <div className="video-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '45%' }}></div>
                  </div>
                  <span className="time-display">2:34 / 5:42</span>
                </div>
              </div>
            </div>
            
            <div className="video-info">
              <h4>{videos[activeVideo].title}</h4>
              <p>{videos[activeVideo].description}</p>
              <div className="video-stats">
                <span className="stat">
                  <strong>{videos[activeVideo].duration}</strong> Duration
                </span>
                <span className="stat">
                  <strong>{videos[activeVideo].quality}</strong> Quality
                </span>
              </div>
            </div>
          </div>
          
          <div className="video-sidebar">
            {videos.map((video, index) => (
              <div 
                key={index}
                className={`sidebar-video ${index === activeVideo ? 'active' : ''}`}
                onClick={() => handleVideoClick(index)}
              >
                <div className="sidebar-thumbnail">
                  <img src={video.thumbnail} alt={video.title} />
                  <div className="sidebar-overlay">
                    <span className="play-icon">▶</span>
                  </div>
                </div>
                <div className="sidebar-info">
                  <h5>{video.title}</h5>
                  <span className="duration">{video.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'carousel') {
    return (
      <div className="video-showcase carousel">
        <div className="showcase-header">
          <h3>{title}</h3>
          <div className="carousel-controls">
            <button 
              className="carousel-btn prev"
              onClick={() => setActiveVideo(Math.max(0, activeVideo - 1))}
              disabled={activeVideo === 0}
            >
              ‹
            </button>
            <span className="carousel-counter">
              {activeVideo + 1} / {videos.length}
            </span>
            <button 
              className="carousel-btn next"
              onClick={() => setActiveVideo(Math.min(videos.length - 1, activeVideo + 1))}
              disabled={activeVideo === videos.length - 1}
            >
              ›
            </button>
          </div>
        </div>
        
        <div className="carousel-container">
          <div 
            className="carousel-track"
            style={{ transform: `translateX(-${activeVideo * 100}%)` }}
          >
            {videos.map((video, index) => (
              <div key={index} className="carousel-slide">
                <div className="video-container">
                  <img 
                    src={video.thumbnail}
                    alt={video.title}
                    className="video-thumbnail"
                  />
                  <div className="video-overlay">
                    <button 
                      className="play-button"
                      onClick={() => handleVideoClick(index)}
                    >
                      ▶
                    </button>
                    <div className="video-badge">
                      {video.category}
                    </div>
                  </div>
                </div>
                <div className="slide-info">
                  <h4>{video.title}</h4>
                  <p>{video.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="carousel-dots">
          {videos.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === activeVideo ? 'active' : ''}`}
              onClick={() => setActiveVideo(index)}
            />
          ))}
        </div>
      </div>
    );
  }

  // Default grid layout
  return (
    <div className="video-showcase grid">
      <div className="showcase-header">
        <h3>{title}</h3>
      </div>
      
      <div className="video-grid">
        {videos.map((video, index) => (
          <div key={index} className="video-card">
            <div className="video-container">
              <img 
                src={video.thumbnail}
                alt={video.title}
                className="video-thumbnail"
              />
              <div className="video-overlay">
                <button 
                  className="play-button"
                  onClick={() => handleVideoClick(index)}
                >
                  ▶
                </button>
                <div className="video-duration">
                  {video.duration}
                </div>
              </div>
            </div>
            
            <div className="video-meta">
              <h4>{video.title}</h4>
              <p>{video.description}</p>
              <div className="video-tags">
                {video.tags && video.tags.map((tag, tagIndex) => (
                  <span key={tagIndex} className="video-tag">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoShowcase;
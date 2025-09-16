import React from 'react';
import './RobbieVideo.css';

function getYouTubeId(input) {
  if (!input) return '';
  const url = String(input);
  const m =
    url.match(/(?:v=|\/embed\/|\.be\/)([A-Za-z0-9_-]{6,})/) ||
    url.match(/^([A-Za-z0-9_-]{6,})$/);
  return m ? m[1] : '';
}

const RobbieVideoSection = ({
  videoId,
  youtubeUrl,
  title = "Watch Robbie work in Real Life!",
  subtitle = "Take a look at how Robbie looks in it's various forms of walking, both in sim and real life!"
}) => {
  const id = videoId || getYouTubeId(youtubeUrl);
  const src = id
    ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&color=white`
    : '';

  return (
    <section className="robbie-video-section">
      <div className="video-vignette" />
      <div className="section-container">
        <h2 className="section-title">{title}</h2>
        <p className="section-subtitle">{subtitle}</p>

        <div className="video-frame-wrap fade-in">
          {src ? (
            <iframe
              className="video-frame"
              src={src}
              title="Robbie Video"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="video-placeholder">Add a YouTube videoId or youtubeUrl</div>
          )}
        </div>
      </div>
    </section>
  );
};

export default RobbieVideoSection;

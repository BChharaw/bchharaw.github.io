import React, { useState } from 'react';

// Poster first, player on click: the YouTube iframe is ~1 MB of script, so it
// only loads for people who actually want to watch.
const YouTube = ({ id, title }) => {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="yt">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" className="yt-poster" onClick={() => setPlaying(true)} aria-label={`Play video: ${title}`}>
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
          <span className="yt-play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>
            Play
          </span>
        </button>
      )}
    </div>
  );
};

export default YouTube;

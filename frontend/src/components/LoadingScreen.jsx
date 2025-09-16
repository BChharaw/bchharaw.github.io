// import React, { useState, useEffect } from 'react';
// import './LoadingScreen.css';

// const LoadingScreen = () => {
//   const [progress, setProgress] = useState(0);
//   const [isMobile, setIsMobile] = useState(false);

//   useEffect(() => {
//     // Check if device is mobile based on aspect ratio and screen width
//     const checkMobile = () => {
//       const aspectRatio = window.innerWidth / window.innerHeight;
//       const isMobileDevice = window.innerWidth < 768 || aspectRatio < 1.2;
//       setIsMobile(isMobileDevice);
//     };

//     checkMobile();
//     window.addEventListener('resize', checkMobile);

//     const interval = setInterval(() => {
//       setProgress(prev => {
//         if (prev >= 100) {
//           clearInterval(interval);
//           return 100;
//         }
//         return prev + 2;
//       });
//     }, 50);

//     return () => {
//       clearInterval(interval);
//       window.removeEventListener('resize', checkMobile);
//     };
//   }, []);

//   return (
//     <div className="loading-screen">
//       <div className="loading-content">
//         <div className="loading-logo">
//           <h1 className="loading-title">Brendan Chharawala</h1>
//           <p className="loading-subtitle">ML Robotics Engineer</p>
//         </div>
        
//         {isMobile && (
//           <div className="mobile-warning">
//             <div className="warning-icon">⚠️</div>
//             <p>This site works best on desktop :)</p>
//           </div>
//         )}
        
//         <div className="loading-bar-container">
//           <div className="loading-bar">
//             <div 
//               className="loading-progress" 
//               style={{ width: `${progress}%` }}
//             />
//           </div>
//           <span className="loading-percentage">{progress}%</span>
//         </div>
        
//         <div className="loading-assets">
//           <p>Loading interactive assets...</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LoadingScreen;

import React, { useState, useEffect } from "react";
import "./LoadingScreen.css";

const ASSET_PREFIX = process.env.PUBLIC_URL + "/assets/";

// define as object instead of array
const assets = {
  // existing
  heroBackground: `${ASSET_PREFIX}robotbackground.webp`,
  logo: `${ASSET_PREFIX}logo.png`,
  latentspacegood: `${ASSET_PREFIX}latentspace.gif`,
  L1: `${ASSET_PREFIX}L1.gif`,
  L2: `${ASSET_PREFIX}L2.gif`,
  L3: `${ASSET_PREFIX}L3.gif`,
  L4: `${ASSET_PREFIX}L4.gif`,
  robot_sim_walk: `${ASSET_PREFIX}robbie_walk2.mp4`,
  spin: `${ASSET_PREFIX}spin.mp4`,
  corl: `${ASSET_PREFIX}corl_paper.jpeg`,
  humanoids: `${ASSET_PREFIX}humanoids_paper.jpeg`,
  siggraph: `${ASSET_PREFIX}siggraph_potential_paper.jpeg`,
  crane: `${ASSET_PREFIX}crane.webp`,
  crane_vid: `${ASSET_PREFIX}cranemoving.MOV`,

  frontgantry: `${ASSET_PREFIX}frontgantry.webp`,
  gantrymotion: `${ASSET_PREFIX}gantrymotion.mp4`,
  dataset: `${ASSET_PREFIX}dataset.webp`,
  rotationpose: `${ASSET_PREFIX}rotationpose.gif`,
  codeexplain2: `${ASSET_PREFIX}codeexplain2.webp`,
  in_tank: `${ASSET_PREFIX}in-tank.webp`,
  conveyorsetup: `${ASSET_PREFIX}conveyorsetup.webp`,
  toyotainnovation: `${ASSET_PREFIX}toyotainnovation.mp4`,
  speaker1image2: `${ASSET_PREFIX}speaker1image2.webp`,
  speaker2image1: `${ASSET_PREFIX}speaker2image1.webp`,
  torqueoptimizer: `${ASSET_PREFIX}torqueoptimizer.webp`,
  car_estimator_model: `${ASSET_PREFIX}CarEstimatorModel.webp`,
  goals_as_list: `${ASSET_PREFIX}goals-as-list.webp`,
    vip: `${ASSET_PREFIX}viplogo-1.png`,

      goodlabs: `${ASSET_PREFIX}goodlabs_logo.png`,

        nrc: `${ASSET_PREFIX}nrclogo.png`,
                waterloologo: `${ASSET_PREFIX}uwlogo.jpg`,


};

const LoadingScreen = ({ onFinish, setAssets }) => {
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // detect mobile
    const checkMobile = () => {
      const aspectRatio = window.innerWidth / window.innerHeight;
      setIsMobile(window.innerWidth < 768 || aspectRatio < 0.6);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    let loaded = 0;
    const loadedAssets = {};

const updateProgress = () => {
  loaded++;
  const target = Math.round((loaded / Object.keys(assets).length) * 100);

  const step = () => {
    setProgress(prev => {
      if (prev < target) {
        requestAnimationFrame(step);
        return prev + 1;
      }
      return prev;
    });
  };

  requestAnimationFrame(step);

  if (loaded === Object.keys(assets).length) {
    setAssets(loadedAssets);
    setTimeout(() => onFinish?.(), 400);
  }
};



    // preload assets
// preload assets
Object.entries(assets).forEach(([key, src]) => {
if (/\.(png|jpg|jpeg|webp|gif)$/i.test(src)) {
  const img = new Image();
  img.crossOrigin = "anonymous"; // safer for remote
  img.src = src;

  img.onload = () => {
    if (img.decode) {
      img.decode()
        .then(() => {
          loadedAssets[key] = img.src;
          updateProgress();
        })
        .catch(() => {
          loadedAssets[key] = img.src;
          updateProgress();
        });
    } else {
      loadedAssets[key] = img.src;
      updateProgress();
    }
  };

  img.onerror = updateProgress;




  } else if (/\.(mp4|webm|ogg)$/i.test(src)) {
    // ---- VIDEOS ----
    fetch(src) // fetch entire file into memory
      .then(res => res.blob())
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        loadedAssets[key] = objectUrl; // safe URL you can pass to <video>
        updateProgress();
      })
      .catch(updateProgress);

  } else {
    // ---- OTHER FILES (json, models, etc.) ----
    fetch(src)
      .then(() => {
        loadedAssets[key] = src;
        updateProgress();
      })
      .catch(updateProgress);
  }
});




    

    return () => window.removeEventListener("resize", checkMobile);
  }, [onFinish, setAssets]);

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <h1 className="loading-title">Brendan Chharawala</h1>
          <p className="loading-subtitle">Machine Learning and Robotics Dev</p>
        </div>

        {isMobile && (
          <div className="mobile-warning">
            <div className="warning-icon">⚠️</div>
            <p>Coding this site took a while, it looks best on desktop :)</p>
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
          <p>Preloading assets. Verifying that grass is green</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;

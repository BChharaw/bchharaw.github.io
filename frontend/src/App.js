// import React, { useState } from "react";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import "./App.css";
// import LoadingScreen from "./components/LoadingScreen";
// import Portfolio from "./components/Portfolio";
// import SilentProjects from "./components/SilentProjects";

// function App() {
//   const [loading, setLoading] = useState(true);
//   const [assets, setAssets] = useState({});

//   return (
//     <div className="App">
//       {loading ? (
//         <LoadingScreen onFinish={() => setLoading(false)} setAssets={setAssets} />
//       ) : (
//         <BrowserRouter>
//           <Routes>
//             <Route path="/" element={<Portfolio assets={assets} />} />
//             <Route path="/silent_projects/IMU" element={<SilentProjects assets={assets} />} />

//           </Routes>
//         </BrowserRouter>
//       )}
//     </div>
//   );
// }

// export default App;
import React, { useState } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import LoadingScreen from "./components/LoadingScreen";
import Portfolio from "./components/Portfolio";
import SilentProjects from "./components/SilentProjects";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState({});

  return (
    <div className="App">
      {loading ? (
        <LoadingScreen onFinish={() => setLoading(false)} setAssets={setAssets} />
      ) : (
        <Router>
          <Routes>
            <Route path="/" element={<Portfolio assets={assets} />} />
            <Route path="/silent_projects/IMU" element={<SilentProjects assets={assets} />} />
          </Routes>
        </Router>
      )}
    </div>
  );
}

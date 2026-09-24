import React from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Portfolio from "./components/Portfolio";
import SilentProjects from "./components/SilentProjects";
import assets from "./data/assets";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/silent_projects/IMU" element={<SilentProjects assets={assets} />} />
        {/* Section links are plain "#id" hrefs; HashRouter sees them as paths,
            so every other path renders the portfolio and scrolls to that id. */}
        <Route path="*" element={<Portfolio assets={assets} />} />
      </Routes>
    </Router>
  );
}

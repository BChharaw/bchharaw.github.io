import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import LoadingScreen from "./components/LoadingScreen";
import Portfolio from "./components/Portfolio";

function App() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState({});

  return (
    <div className="App">
      {loading ? (
        <LoadingScreen onFinish={() => setLoading(false)} setAssets={setAssets} />
      ) : (
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Portfolio assets={assets} />} />
          </Routes>
        </BrowserRouter>
      )}
    </div>
  );
}

export default App;

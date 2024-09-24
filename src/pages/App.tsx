import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import LandingPage from "./LandingPage";
import Currents from "./Currents";

import "./global.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Currents debug={false} />} />
        <Route
          path="/debug"
          element={
            <Currents
              debug={true}
              seed={
                "0x1b50318e0b301eab6c7147d253268b6a06cdb98920792de015b8927cdd44087a"
              }
            />
          }
        />

        <Route path="/landing" element={<LandingPage />} />
        <Route path="/currents" element={<Currents debug={true} />} />
      </Routes>
    </Router>
  );
}

export default App;

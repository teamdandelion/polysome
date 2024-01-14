import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import LandingPage from "./LandingPage";
import Currents from "./Currents";
import Testbed from "./Testbed";

import "./global.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Currents />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/currents" element={<Currents />} />
        <Route path="/testbed" element={<Testbed />} />
      </Routes>
    </Router>
  );
}

export default App;

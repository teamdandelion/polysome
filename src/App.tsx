import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import Currents from "./pages/Currents";
import Testbed from "./pages/Testbed";

import "./pages/global.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/currents" element={<Currents />} />
        <Route path="/testbed" element={<Testbed />} />
      </Routes>
    </Router>
  );
}

export default App;

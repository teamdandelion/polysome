import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import LandingPage from "./LandingPage";
import Currents from "./Currents";
import Currents2 from "./Currents2";

import Testbed from "./Testbed";

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
        <Route path="/currents" element={<Currents debug={false} />} />
        <Route path="/currents2" element={<Currents2 debug={true} />} />
        <Route path="/testbed" element={<Testbed />} />
      </Routes>
    </Router>
  );
}

export default App;

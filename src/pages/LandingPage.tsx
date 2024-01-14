import React from "react";
import "./LandingPage.css";

const LandingPage = () => {
  console.log("Landing v2");
  return (
    <div className="landing">
      <h1 className="title">Polysome</h1>

      <ul className="menu">
        <li>
          <a href="/currents">Currents</a>
        </li>
      </ul>
      <p className="byline">by Indigo Mané</p>
    </div>
  );
};

export default LandingPage;

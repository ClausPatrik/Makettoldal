import React from "react";
import { Routes, Route, NavLink, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import SajatVelemenyek from "./pages/SajatVelemenyek";
import Kedvencek from "./pages/Kedvencek";
import EpitesiNaplo from "./pages/EpitesiNaplo";
import Kezdolap from "./pages/Kezdolap";
import Makettek from "./pages/Makettek";
import Bejelentkezes from "./pages/Bejelentkezes";
import Regisztracio from "./pages/Regisztracio";
import Profil from "./pages/Profil";
import Forum from "./pages/Forum"; 
import NavBar from "./components/NavBar";

import AiChatWidget from "./components/AiChatWidget";

function generalSzin(nev) {
  if (!nev) return "#4b5563";
  let hash = 0;
  for (let i = 0; i < nev.length; i++) {
    hash = nev.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

function AvatarKicsi({ nev, profilKepUrl }) {
  if (profilKepUrl) {
    return (
      <img
        src={profilKepUrl}
        alt={`${nev || "Felhasználó"} profilképe`}
        className="nav-avatar-img"
      />
    );
  }

  if (!nev) nev = "P";
  const kezdobetu = nev.trim().charAt(0).toUpperCase();
  const hatter = generalSzin(nev);

  const stilus = {
    width: "32px",
    height: "32px",
    borderRadius: "9999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "bold",
    background: hatter,
    color: "white",
  };

  return <div style={stilus}>{kezdobetu}</div>;
}

export default function App() {
  const { felhasznalo, bejelentkezve, kijelentkezes } = useAuth();
  const admin = felhasznalo?.szerepkor_id === 2;

  return (
    <div className="app">
      
      <NavBar />

      <main className="main">
          <Routes>
          <Route path="/" element={<Kezdolap />} />
          <Route path="/makettek" element={<Makettek />} />
          <Route path="/bejelentkezes" element={<Bejelentkezes />} />
          <Route path="/regisztracio" element={<Regisztracio />} />
          <Route path="/profil" element={<Profil />} />
          <Route path="/forum" element={<Forum />} />
          <Route path="/velemenyeim" element={<SajatVelemenyek />} />
          <Route path="/kedvencek" element={<Kedvencek />} />
          <Route path="/epitesinaplo" element={<EpitesiNaplo />} />
        </Routes>

      </main>

      {/* Lebegő AI chat minden oldalon */}
      <AiChatWidget />
    </div>
  );
}

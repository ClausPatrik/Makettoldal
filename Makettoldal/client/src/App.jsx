import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Kezdolap from "./pages/Kezdolap";
import Makettek from "./pages/Makettek";
import Bejelentkezes from "./pages/Bejelentkezes";
import Regisztracio from "./pages/Regisztracio";
import Profil from "./pages/Profil";
import Forum from "./pages/Forum";
import Rolunk from "./pages/Rolunk";

import SajatVelemenyek from "./pages/SajatVelemenyek";
import Kedvencek from "./pages/Kedvencek";
import EpitesiNaplo from "./pages/EpitesiNaplo";

import MakettBekuldes from "./pages/MakettBekuldes";
import MakettJovahagyas from "./pages/MakettJovahagyas";
import Makettjeim from "./pages/Makettjeim";


import NavBar from "./components/NavBar";
import AiChatWidget from "./components/AiChatWidget";
import Footer from "./components/footer";

import AdminFelhasznalok from "./pages/AdminFelhasznalok";



// Vite: automatikusan összeszedi az ikonokat ebből a mappából
const favModules = import.meta.glob("./assets/favicons/*.{png,ico}", {
  eager: true,
  query: "?url",
  import: "default",
});
const favIcons = Object.values(favModules);



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

  // Favicon: frissítéskor random + percenként váltás
useEffect(() => {
  console.log("favicon effect ran, icons:", favIcons);

  if (!favIcons.length) return;

  const pick = () => favIcons[Math.floor(Math.random() * favIcons.length)];

  const setFavicon = () => {
    const chosen = pick();
    const href = chosen.includes("?") ? `${chosen}&v=${Date.now()}` : `${chosen}?v=${Date.now()}`;

    // 1) törlünk minden régi favicon linket (különben sokszor nem frissül)
    document
      .querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link#favicon')
      .forEach((l) => l.parentNode?.removeChild(l));

    // 2) új linkeket hozunk létre
    const link1 = document.createElement("link");
    link1.id = "favicon";
    link1.rel = "icon";
    link1.href = href;

    const link2 = document.createElement("link");
    link2.rel = "shortcut icon";
    link2.href = href;

    document.head.appendChild(link1);
    document.head.appendChild(link2);
  };

  setFavicon(); // induláskor (frissítéskor)
  const id = setInterval(setFavicon, 10_000); // percenként
  return () => clearInterval(id);
}, []);




  





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
          <Route path="/rolunk" element={<Rolunk />} />

          <Route path="/velemenyeim" element={<SajatVelemenyek />} />
          <Route path="/kedvencek" element={<Kedvencek />} />
          <Route path="/epitesinaplo" element={<EpitesiNaplo />} />

          <Route path="/makett-bekuldes" element={<MakettBekuldes />} />
          <Route path="/makettjeim" element={<Makettjeim />} />
          <Route path="/admin/makett-jovahagyas" element={<MakettJovahagyas />} />
          <Route path="/admin/felhasznalok" element={<AdminFelhasznalok />} />

        </Routes>
      </main>

      <Footer />

      {/* Lebegő AI chat minden oldalon */}
      <AiChatWidget />
    </div>

    
  );
}

import React from "react";
import { NavLink, Route, Routes, Link } from "react-router-dom";
import Kezdolap from "./pages/Kezdolap";
import Makettek from "./pages/Makettek";
import Bejelentkezes from "./pages/Bejelentkezes";
import Regisztracio from "./pages/Regisztracio";
import Profil from "./pages/Profil";
import { useAuth } from "./context/AuthContext";

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
      <header className="nav">
        <div className="nav-left">
          <span className="logo">Makettező Klub</span>
          <NavLink to="/" className="nav-link">
            Kezdőlap
          </NavLink>
          <NavLink to="/makettek" className="nav-link">
            Makettek
          </NavLink>
          {admin && <span className="nav-badge">Admin</span>}
        </div>

        <div className="nav-right">
          {bejelentkezve ? (
            <>
              <Link to="/profil" className="nav-profile">
                <AvatarKicsi
                  nev={felhasznalo.felhasznalo_nev}
                  profilKepUrl={felhasznalo.profil_kep_url}
                />
                <span className="nav-user-name">
                  {felhasznalo.felhasznalo_nev}
                </span>
              </Link>
              <button className="nav-btn" onClick={kijelentkezes}>
                Kijelentkezés
              </button>
            </>
          ) : (
            <>
              <NavLink to="/bejelentkezes" className="nav-link">
                Bejelentkezés
              </NavLink>
              <NavLink to="/regisztracio" className="nav-link">
                Regisztráció
              </NavLink>
            </>
          )}
        </div>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<Kezdolap />} />
          <Route path="/makettek" element={<Makettek />} />
          <Route path="/bejelentkezes" element={<Bejelentkezes />} />
          <Route path="/regisztracio" element={<Regisztracio />} />
          <Route path="/profil" element={<Profil />} />
        </Routes>
      </main>
    </div>
  );
}

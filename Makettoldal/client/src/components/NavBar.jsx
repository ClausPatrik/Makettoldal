import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AvatarKicsi({ nev, profilKepUrl }) {
  if (profilKepUrl) {
    return (
      <img
        src={profilKepUrl}
        alt={`${nev || "Felhasználó"} profilképe`}
        className="avatar-kicsi"
      />
    );
  }

  const kezdobetuk = (nev || "?")
    .split(" ")
    .map((r) => r[0])
    .join("")
    .toUpperCase();

  return (
    <div className="avatar-kicsi avatar-initials">
      {kezdobetuk}
    </div>
  );
}

export default function NavBar() {
  const { felhasznalo, kijelentkezes } = useAuth();
  const bejelentkezve = !!felhasznalo;
  const admin = felhasznalo?.admin || false;

  return (
    <header className="nav">
      <div className="nav-left">
        <span className="logo">Makettező Klub</span>

        <NavLink to="/" className="nav-link">Kezdőlap</NavLink>
        <NavLink to="/makettek" className="nav-link">Makettek</NavLink>
        <NavLink to="/forum" className="nav-link">Fórum</NavLink>
        <NavLink to="/rolunk" className="nav-link">Rólunk</NavLink>

        {bejelentkezve && (
          <>
            <NavLink to="/kedvencek" className="nav-link">Kedvenceim</NavLink>
            <NavLink to="/velemenyeim" className="nav-link">Véleményeim</NavLink>
            <NavLink to="/epitesinaplo" className="nav-link">Építési napló</NavLink>
          </>
        )}

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

            <button
              className="logout-btn"
              onClick={kijelentkezes}
            >
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
  );
}

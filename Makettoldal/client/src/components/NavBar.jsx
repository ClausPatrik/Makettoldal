import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AvatarKicsi({ nev, profilKepUrl }) {
  const normalizal = (url) => {
    if (!url) return "";
    if (url.startsWith("/uploads/")) return `http://localhost:3001${url}`;
    return url;
  };

  if (profilKepUrl) {
    return (
      <img
        src={normalizal(profilKepUrl)}
        alt={`${nev || "Felhasznalo"} profilkepe`}
        className="nav-avatar-img"
      />
    );
  }

  const kezdobetuk = (nev || "?")
    .split(" ")
    .map((r) => r[0])
    .join("")
    .toUpperCase();

  return <div className="nav-avatar">{kezdobetuk}</div>;
}

const linkClass = ({ isActive }) => `nav-link${isActive ? " active" : ""}`;

export default function NavBar() {
  const { felhasznalo, kijelentkezes } = useAuth();
  const bejelentkezve = !!felhasznalo;
  const admin = felhasznalo?.szerepkor_id === 2;

  const [menuNyitva, setMenuNyitva] = useState(false);

  function toggleMenu() {
    setMenuNyitva((p) => !p);
  }

  function closeMenu() {
    setMenuNyitva(false);
  }

  // ESC bezarja a mobil menut
  useEffect(() => {
    if (!menuNyitva) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuNyitva]);

  return (
    <>
      <header className="nav">
        <div className="nav-left">
          <span className="logo">MakettMester</span>
        </div>

        {/* Desktop menu */}
        <nav className="nav-links-desktop" aria-label="Fo menu">
          <NavLink to="/" className={linkClass}>Kezdolap</NavLink>
          <NavLink to="/makettek" className={linkClass}>Makettek</NavLink>
          <NavLink to="/forum" className={linkClass}>Forum</NavLink>
          <NavLink to="/rolunk" className={linkClass}>Rolunk</NavLink>

          {bejelentkezve && (
            <>
              <NavLink to="/kedvencek" className={linkClass}>Kedvenceim</NavLink>
              <NavLink to="/velemenyeim" className={linkClass}>Velemenyeim</NavLink>
              <NavLink to="/epitesinaplo" className={linkClass}>Epitesi naplo</NavLink>
              <NavLink to="/makett-bekuldes" className={linkClass}>Makett bekuldes</NavLink>

              {admin && (
                <NavLink to="/admin/makett-jovahagyas" className={linkClass}>
                  Jovahagyas
                </NavLink>
              )}
            </>
          )}

          {admin && <span className="nav-badge">Admin</span>}
        </nav>

        {/* Desktop right */}
        <div className="nav-right nav-right-desktop">
          {bejelentkezve ? (
            <>
              <Link to="/profil" className="nav-profile">
                <AvatarKicsi
                  nev={felhasznalo.felhasznalo_nev}
                  profilKepUrl={felhasznalo.profil_kep_url}
                />
                <span className="nav-user-name">{felhasznalo.felhasznalo_nev}</span>
              </Link>

              <button className="nav-btn nav-btn-danger" onClick={kijelentkezes}>
                KIJELENTKEZES
              </button>
            </>
          ) : (
            <>
              <NavLink to="/bejelentkezes" className={linkClass}>Bejelentkezes</NavLink>
              <NavLink to="/regisztracio" className={linkClass}>Regisztracio</NavLink>
            </>
          )}
        </div>

        {/* Hamburger (mobile) */}
        <button
          className="nav-hamburger"
          onClick={toggleMenu}
          aria-label="Menu"
          aria-expanded={menuNyitva ? "true" : "false"}
        >
          {menuNyitva ? "✕" : "☰"}
        </button>
      </header>

      {/* Overlay */}
      {menuNyitva && <div className="nav-overlay" onClick={closeMenu} />}

      {/* Mobile menu */}
      <nav className={`nav-mobile ${menuNyitva ? "open" : ""}`} aria-label="Mobil menu">
        <div className="nav-mobile-inner">
          <NavLink to="/" className={linkClass} onClick={closeMenu}>Kezdolap</NavLink>
          <NavLink to="/makettek" className={linkClass} onClick={closeMenu}>Makettek</NavLink>
          <NavLink to="/forum" className={linkClass} onClick={closeMenu}>Forum</NavLink>
          <NavLink to="/rolunk" className={linkClass} onClick={closeMenu}>Rolunk</NavLink>

          {bejelentkezve ? (
            <>
              <NavLink to="/kedvencek" className={linkClass} onClick={closeMenu}>Kedvenceim</NavLink>
              <NavLink to="/velemenyeim" className={linkClass} onClick={closeMenu}>Velemenyeim</NavLink>
              <NavLink to="/epitesinaplo" className={linkClass} onClick={closeMenu}>Epitesi naplo</NavLink>
              <NavLink to="/makett-bekuldes" className={linkClass} onClick={closeMenu}>Makett bekuldes</NavLink>

              {admin && (
                <NavLink to="/admin/makett-jovahagyas" className={linkClass} onClick={closeMenu}>
                  Jovahagyas
                </NavLink>
              )}

              <Link to="/profil" className="nav-profile nav-profile-mobile" onClick={closeMenu}>
                <AvatarKicsi
                  nev={felhasznalo.felhasznalo_nev}
                  profilKepUrl={felhasznalo.profil_kep_url}
                />
                <span className="nav-user-name">{felhasznalo.felhasznalo_nev}</span>
                {admin && <span className="nav-badge">Admin</span>}
              </Link>

              <button
                className="nav-btn nav-btn-danger nav-btn-mobile"
                onClick={() => {
                  kijelentkezes();
                  closeMenu();
                }}
              >
                KIJELENTKEZES
              </button>
            </>
          ) : (
            <>
              <NavLink to="/bejelentkezes" className={linkClass} onClick={closeMenu}>Bejelentkezes</NavLink>
              <NavLink to="/regisztracio" className={linkClass} onClick={closeMenu}>Regisztracio</NavLink>
            </>
          )}
        </div>
      </nav>
    </>
  );
}

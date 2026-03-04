import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * AvatarKicsi komponens
 *
 * Kis profil ikon a navbarban:
 * - ha van profilkép URL, akkor képet jelenít meg
 * - ha nincs kép, akkor a névből generált kezdőbetűket mutatja
 *
 * Megjegyzés:
 * - A normalizal() a backend által adott relatív /uploads útvonalat teljes URL-lé alakítja.
 */
function AvatarKicsi({ nev, profilKepUrl }) {
  const normalizal = (url) => {
    // Kép URL normalizálás:
    // - ha a backend relatív /uploads/... útvonalat ad, előtagoljuk a szerver címmel
    // - egyébként az URL-t változtatás nélkül használjuk
    if (!url) return "";
    if (url.startsWith("/uploads/")) return `http://localhost:3001${url}`;
    return url;
  };

  // Ha van profilkép, akkor <img>-et renderelünk
  if (profilKepUrl) {
    return (
      <img
        src={normalizal(profilKepUrl)}
        alt={`${nev || "Felhasznalo"} profilkepe`}
        className="nav-avatar-img"
      />
    );
  }

  // Ha nincs profilkép, akkor a felhasználónévből készítünk kezdőbetűket (pl. "Nagy Béla" -> "NB")
  const kezdobetuk = (nev || "?")
    .split(" ")
    .map((r) => r[0])
    .join("")
    .toUpperCase();

  return <div className="nav-avatar">{kezdobetuk}</div>;
}

// NavLink osztály: ha az útvonal aktív, hozzáadjuk az "active" class-t (pl. kiemeléshez)
const linkClass = ({ isActive }) => `nav-link${isActive ? " active" : ""}`;

/**
 * NavBar komponens
 *
 * Reszponzív navigációs sáv:
 * - Desktop nézet: menüpontok + jobb oldali profil / auth gombok
 * - Mobil nézet: hamburger menü + overlay + oldalsó/lenyíló menü
 *
 * Jogosultságok:
 * - bejelentkezve: extra menüpontok (kedvencek, véleményeim, napló, beküldés, makettjeim)
 * - admin: admin oldalak (jóváhagyás, felhasználók) + badge
 * - moderátor: badge megjelenítés
 */
export default function NavBar() {
  // AuthContext-ből jön a bejelentkezett felhasználó és a kijelentkezés függvény
  const { felhasznalo, kijelentkezes } = useAuth();

  // Egyszerű szerepkör jelzők (szerepkor_id alapján)
  const admin = felhasznalo?.szerepkor_id === 2;
  const moderator = felhasznalo?.szerepkor_id === 3;

  // Ha van felhasználó objektum, akkor be van jelentkezve
  const bejelentkezve = !!felhasznalo;

  // Mobil menü nyitás/zárás állapota (hamburger)
  const [menuNyitva, setMenuNyitva] = useState(false);

  function toggleMenu() {
    // Mobil menü ki-be kapcsolása
    setMenuNyitva((p) => !p);
  }

  function closeMenu() {
    // Mobil menü bezárása (overlay kattintás, ESC, link kattintás)
    setMenuNyitva(false);
  }

  // ESC bezarja a mobil menut
  useEffect(() => {
    // Csak akkor hallgatjuk az ESC-et, ha a mobil menü nyitva van
    if (!menuNyitva) return;

    const onKey = (e) => {
      if (e.key === "Escape") closeMenu();
    };

    window.addEventListener("keydown", onKey);

    // Cleanup: bezáráskor levesszük az event listenert (memóriaszivárgás elkerülés)
    return () => window.removeEventListener("keydown", onKey);
  }, [menuNyitva]);

  return (
    <>
      <header className="nav">
        <div className="nav-left">
          {/* Logo / brand felirat */}
          <span className="logo">MakettMester</span>
        </div>

        {/* Desktop menu */}
        <nav className="nav-links-desktop" aria-label="Fo menu">
          {/* Alap menüpontok mindenki számára */}
          <NavLink to="/" className={linkClass}>Kezdolap</NavLink>
          <NavLink to="/makettek" className={linkClass}>Makettek</NavLink>
          <NavLink to="/forum" className={linkClass}>Forum</NavLink>
          <NavLink to="/rolunk" className={linkClass}>Rolunk</NavLink>

          {/* Bejelentkezett felhasználóknak extra menüpontok */}
          {bejelentkezve && (
            <>
              <NavLink to="/kedvencek" className={linkClass}>Kedvenceim</NavLink>
              <NavLink to="/velemenyeim" className={linkClass}>Velemenyeim</NavLink>
              <NavLink to="/epitesinaplo" className={linkClass}>Epitesi naplo</NavLink>
              <NavLink to="/makett-bekuldes" className={linkClass}>Makett bekuldes</NavLink>
              <NavLink to="/makettjeim" className={linkClass}>Makettjeim</NavLink>

              {/* Admin menüpontok: csak admin szerepkörnél */}
              {admin && (
                <>
                  <NavLink to="/admin/makett-jovahagyas" className={linkClass}>Jovahagyas</NavLink>
                  <NavLink to="/admin/felhasznalok" className={linkClass}>Felhasznalok</NavLink>
                </>
              )}
            </>
          )}

          {/* Szerepkör badge a desktop menüben (vizuális jelzés) */}
          {admin && <span className="nav-badge">Admin</span>}
          {!admin && moderator && <span className="nav-badge">Moderátor</span>}
        </nav>

        {/* Desktop right: profil + auth gombok */}
        <div className="nav-right nav-right-desktop">
          {bejelentkezve ? (
            <>
              {/* Profil link: avatarral és névvel */}
              <Link to="/profil" className="nav-profile">
                <AvatarKicsi
                  nev={felhasznalo.felhasznalo_nev}
                  profilKepUrl={felhasznalo.profil_kep_url}
                />
                <span className="nav-user-name">{felhasznalo.felhasznalo_nev}</span>
              </Link>

              {/* Kijelentkezés gomb (AuthContext funkció) */}
              <button className="nav-btn nav-btn-danger" onClick={kijelentkezes}>
                KIJELENTKEZES
              </button>
            </>
          ) : (
            <>
              {/* Vendég menü: belépés / regisztráció */}
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
          // Accessibility: jelzi, hogy a menü nyitva van-e
          aria-expanded={menuNyitva ? "true" : "false"}
        >
          {menuNyitva ? "✕" : "☰"}
        </button>
      </header>

      {/* Overlay: csak akkor látszik, ha a mobil menü nyitva van.
          Kattintásra bezárjuk a menüt. */}
      {menuNyitva && <div className="nav-overlay" onClick={closeMenu} />}

      {/* Mobile menu */}
      <nav className={`nav-mobile ${menuNyitva ? "open" : ""}`} aria-label="Mobil menu">
        <div className="nav-mobile-inner">
          {/* Alap menüpontok mobilon */}
          <NavLink to="/" className={linkClass} onClick={closeMenu}>Kezdolap</NavLink>
          <NavLink to="/makettek" className={linkClass} onClick={closeMenu}>Makettek</NavLink>
          <NavLink to="/forum" className={linkClass} onClick={closeMenu}>Forum</NavLink>
          <NavLink to="/rolunk" className={linkClass} onClick={closeMenu}>Rolunk</NavLink>

          {bejelentkezve ? (
            <>
              {/* Bejelentkezett felhasználó mobil menü pontjai */}
              <NavLink to="/kedvencek" className={linkClass} onClick={closeMenu}>Kedvenceim</NavLink>
              <NavLink to="/velemenyeim" className={linkClass} onClick={closeMenu}>Velemenyeim</NavLink>
              <NavLink to="/epitesinaplo" className={linkClass} onClick={closeMenu}>Epitesi naplo</NavLink>
              <NavLink to="/makett-bekuldes" className={linkClass} onClick={closeMenu}>Makett bekuldes</NavLink>

              {/* Admin menüpontok mobilon */}
              {admin && (
                <>
                  <NavLink to="/admin/makett-jovahagyas" className={linkClass} onClick={closeMenu}>
                    Jovahagyas
                  </NavLink>
                  <NavLink to="/admin/felhasznalok" className={linkClass} onClick={closeMenu}>
                    Felhasznalok
                  </NavLink>
                </>
              )}

              {/* Profil blokk mobilon (avatar + név + badge) */}
              <Link to="/profil" className="nav-profile nav-profile-mobile" onClick={closeMenu}>
                <AvatarKicsi
                  nev={felhasznalo.felhasznalo_nev}
                  profilKepUrl={felhasznalo.profil_kep_url}
                />
                <span className="nav-user-name">{felhasznalo.felhasznalo_nev}</span>

                {/* Szerepkör jelzés mobilon */}
                {admin && <span className="nav-badge">Admin</span>}
                {!admin && moderator && <span className="nav-badge">Moderátor</span>}
              </Link>

              {/* Mobil kijelentkezés: előbb kijelentkezik, majd bezárja a menüt */}
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
              {/* Vendég menü mobilon */}
              <NavLink to="/bejelentkezes" className={linkClass} onClick={closeMenu}>Bejelentkezes</NavLink>
              <NavLink to="/regisztracio" className={linkClass} onClick={closeMenu}>Regisztracio</NavLink>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
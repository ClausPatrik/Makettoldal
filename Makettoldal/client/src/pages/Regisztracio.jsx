import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Regisztracio() {
  /**
   * AuthContext: regisztrációs művelet (backend hívás, token/user beállítás a contextben).
   * A konkrét validáció / hibakezelés részlete a `regisztracio()` implementációjától függ.
   */
  const { regisztracio } = useAuth();

  // Navigáció sikeres regisztráció után
  const navigate = useNavigate();

  // Form mezők (controlled inputs)
  const [felhasznaloNev, beallitFelhasznaloNev] = useState("");
  const [email, beallitEmail] = useState("");
  const [jelszo, beallitJelszo] = useState("");

  // UI állapotok: folyamatban jelző + hibaüzenet
  const [betolt, beallitBetolt] = useState(false);
  const [hiba, beallitHiba] = useState(null);

  /**
   * Regisztrációs űrlap elküldése:
   * - megakadályozza a natív submit újratöltést
   * - loading flag: gomb tiltás + visszajelzés
   * - hiba esetén az üzenetet megjelenítjük a form tetején
   */
  async function kezeliKuldes(e) {
    e.preventDefault();
    try {
      beallitBetolt(true);
      beallitHiba(null);

      // Regisztráció (AuthContext intézi a backend kérést és az esetleges session beállítást)
      await regisztracio(felhasznaloNev, email, jelszo);

      // Sikeres regisztráció után visszanavigálunk a főoldalra
      navigate("/");
    } catch (err) {
      // A `regisztracio()` által dobott hiba üzenetét megjelenítjük a felhasználónak
      beallitHiba(err.message);
    } finally {
      beallitBetolt(false);
    }
  }

  return (
    <section className="page auth-page">
      <h1>Regisztráció</h1>

      <form onSubmit={kezeliKuldes} className="card form auth-form">
        {/* Backend/validációs hiba visszajelzés */}
        {hiba && <p className="error">{hiba}</p>}

        <label>
          Felhasználónév
          <input
            type="text"
            value={felhasznaloNev}
            onChange={(e) => beallitFelhasznaloNev(e.target.value)}
            required
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => beallitEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Jelszó
          <input
            type="password"
            value={jelszo}
            onChange={(e) => beallitJelszo(e.target.value)}
            required
          />
        </label>

        <button type="submit" className="btn" disabled={betolt}>
          {betolt ? "Regisztráció..." : "Regisztráció"}
        </button>

        <p className="small">
          Már van fiókod? <Link to="/bejelentkezes">Bejelentkezés</Link>
        </p>
      </form>
    </section>
  );
}
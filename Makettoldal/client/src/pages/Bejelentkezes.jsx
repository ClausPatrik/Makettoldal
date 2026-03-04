import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Bejelentkezes oldal
 *
 * Feladata:
 * - Email + jelszó bekérése
 * - useAuth().bejelentkezes() meghívása
 * - Siker esetén átirányítás a főoldalra
 * - Hibák megjelenítése (pl. rossz jelszó, tiltás, szerver hiba)
 *
 * Megjegyzés:
 * - A "betolt" state UI szinten jelzi a folyamatot (gomb tiltás + felirat).
 * - A "tiltas" state külön panelben jeleníthető meg, ha a backend tiltási adatot is ad.
 */
export default function Bejelentkezes() {
  // AuthContext-ből jön a login függvény (backend hívást a context kezeli)
  const { bejelentkezes } = useAuth();

  // Navigáció React Routerrel (sikeres login után átirányítás)
  const navigate = useNavigate();

  // Űrlap mezők állapotai
  const [email, beallitEmail] = useState("");
  const [jelszo, beallitJelszo] = useState("");

  // UI állapotok: betöltés folyamatban + hibaüzenet + tiltás részletek
  const [betolt, beallitBetolt] = useState(false);
  const [hiba, beallitHiba] = useState(null);
  const [tiltas, beallitTiltas] = useState(null);

  /**
   * kezeliKuldes
   *
   * Űrlap beküldés kezelése:
   * - preventDefault: ne frissüljön újra az oldal
   * - betöltés jelzés indítása, előző hibák törlése
   * - bejelentkezes(email, jelszo) meghívása
   * - siker esetén navigálás a főoldalra
   * - hiba esetén hibaüzenet és opcionális tiltás adatok eltárolása
   */
  async function kezeliKuldes(e) {
    e.preventDefault();

    try {
      beallitBetolt(true);
      beallitHiba(null);
      beallitTiltas(null);

      await bejelentkezes(email, jelszo);

      // Sikeres login után: főoldal
      navigate("/");
    } catch (err) {
      // Általános hiba szöveg kiírás
      beallitHiba(err.message);

      // Ha a backend/Context külön tiltás objektumot ad, itt meg tudjuk jeleníteni
      beallitTiltas(err.tiltas || null);
    } finally {
      // Mindig visszaállítjuk a betöltési állapotot (siker/hiba mindegy)
      beallitBetolt(false);
    }
  }

  return (
    <section className="page auth-page">
      <h1>Bejelentkezés</h1>

      {/* Login űrlap */}
      <form onSubmit={kezeliKuldes} className="card form auth-form">
        {/* Általános hiba megjelenítés */}
        {hiba && <p className="error">{hiba}</p>}

        {/* Tiltás panel: csak akkor jelenik meg, ha van tiltás objektum */}
        {tiltas && (
          <div className="error" style={{ padding: 10, borderRadius: 8 }}>
            <div>
              <b>Tiltás típusa:</b>{" "}
              {tiltas.tipus === "ideiglenes" ? "Ideiglenes" : "Végleges"}
            </div>

            {/* Ideiglenes tiltásnál megjelenítjük a feloldás idejét */}
            {tiltas.tipus === "ideiglenes" && (
              <div>
                <b>Feloldás:</b>{" "}
                {tiltas.eddig ? new Date(tiltas.eddig).toLocaleString() : "—"}
              </div>
            )}

            {/* Indok opcionális mező */}
            <div>
              <b>Indok:</b> {tiltas.ok || "—"}
            </div>
          </div>
        )}

        {/* Email mező (HTML validáció: type="email" + required) */}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => beallitEmail(e.target.value)}
            required
          />
        </label>

        {/* Jelszó mező (required) */}
        <label>
          Jelszó
          <input
            type="password"
            value={jelszo}
            onChange={(e) => beallitJelszo(e.target.value)}
            required
          />
        </label>

        {/* Beküldés gomb: betöltés alatt tiltva + felirat váltás */}
        <button type="submit" className="btn" disabled={betolt}>
          {betolt ? "Bejelentkezés..." : "Bejelentkezés"}
        </button>

        {/* Navigáció regisztrációra */}
        <p className="small">
          Még nincs fiókod? <Link to="/regisztracio">Regisztráció</Link>
        </p>
      </form>

      {/* Demo adatok: teszteléshez / bemutatóhoz */}
      <div className="card" style={{ marginTop: 16 }}>
        <p className="small">
          <strong>Demo felhasználó:</strong> demo@pelda.hu / demo123
        </p>
        <p className="small">
          <strong>Admin felhasználó:</strong> admin@pelda.hu / admin123
        </p>
      </div>
    </section>
  );
}
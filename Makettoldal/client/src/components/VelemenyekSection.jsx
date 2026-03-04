import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CsillagValaszto from "./CsillagValaszto";

/**
 * VelemenyekSection komponens
 *
 * Feladata:
 * - A kiválasztott maketthez tartozó vélemények megjelenítése
 * - Új vélemény írásának lehetősége bejelentkezett felhasználóknak
 * - Saját vélemény szerkesztése és törlése
 * - Admin és moderátor jogosultságok kezelése
 *
 * A komponens több helyen is használható:
 * - MakettCard (lista nézet)
 * - MakettModal (részletes nézet)
 */
export default function VelemenyekSection({
  makettId,
  velemenyek = [],

  // Felhasználói állapot és jogosultságok
  bejelentkezve,
  felhasznalo,
  isAdmin,
  isModerator,

  // Külső dátum formázó függvény (ha nincs, fallback lesz használva)
  formatDatum,

  // CRUD műveletek handlerjei (parent komponens kezeli az API hívást)
  hozzaadVelemeny,
  modositVelemeny,
  torolVelemeny,
}) {

  // --- Maketthez tartozó vélemények kiszűrése ---
  const lista = useMemo(() => {
    // Az aktuális makett ID számmá alakítása
    const mid = Number(makettId);

    // Csak az adott maketthez tartozó vélemények maradnak
    return (velemenyek || []).filter((v) => Number(v.makett_id) === mid);
  }, [velemenyek, makettId]);

  // --- Új vélemény form state ---
  const [ujSzoveg, setUjSzoveg] = useState("");
  const [ujErtekeles, setUjErtekeles] = useState(5);

  // --- Szerkesztési mód state ---
  const [editId, setEditId] = useState(null);
  const [editSzoveg, setEditSzoveg] = useState("");
  const [editErtekeles, setEditErtekeles] = useState(5);

  // Ellenőrzi, hogy a vélemény a jelenlegi felhasználó sajátja-e
  function sajatVelemeny(v) {
    if (!felhasznalo || !v) return false;

    const uid = Number(felhasznalo.id);

    return Number(v.felhasznalo_id ?? v.felhasznaloId) === uid;
  }

  // Jogosultság: szerkeszthető-e a vélemény
  // Saját vélemény vagy admin esetén igaz
  function szerkesztheto(v) {
    return Boolean(isAdmin || sajatVelemeny(v));
  }

  // Jogosultság: törölhető-e
  // Admin, moderátor vagy a saját vélemény törölhető
  function torolheto(v) {
    return Boolean(isAdmin || isModerator || sajatVelemeny(v));
  }

  // Dátum megjelenítés
  function datumKiir(d) {
    // Ha a parent adott saját formázót, azt használjuk
    if (formatDatum) return formatDatum(d);

    // Ellenkező esetben egyszerű magyar dátum formátum
    try {
      const dd = new Date(d);
      return dd.toLocaleDateString("hu-HU");
    } catch {
      return d || "";
    }
  }

  // --- Új vélemény küldése ---
  async function ujVelemenyKuldes(e) {
    e.preventDefault();

    // Csak bejelentkezve engedélyezett
    if (!bejelentkezve) return;

    // Ha nincs handler átadva a parentből, kilépünk
    if (!hozzaadVelemeny) return;

    try {
      await hozzaadVelemeny(makettId, {
        szoveg: ujSzoveg,
        ertekeles: Number(ujErtekeles),
      });

      // Sikeres mentés után ürítjük az űrlapot
      setUjSzoveg("");
      setUjErtekeles(5);

    } catch (err) {
      console.error("Vélemény mentési hiba:", err);
      alert("Hiba történt a vélemény mentésekor.");
    }
  }

  // --- Szerkesztés indítása ---
  function szerkesztesIndit(v) {
    // A kiválasztott vélemény adatait betöltjük a szerkesztő formba
    setEditId(v.id);
    setEditSzoveg(v.szoveg || "");
    setEditErtekeles(Number(v.ertekeles) || 5);
  }

  // --- Szerkesztés mentése ---
  async function szerkesztesMentes(e) {
    e.preventDefault();

    if (!editId) return;
    if (!modositVelemeny) return;

    try {
      await modositVelemeny(editId, {
        szoveg: editSzoveg,
        ertekeles: Number(editErtekeles),
      });

      // Szerkesztő mód bezárása
      setEditId(null);
      setEditSzoveg("");
      setEditErtekeles(5);

    } catch (err) {
      console.error("Vélemény módosítási hiba:", err);
      alert("Hiba történt a vélemény módosításakor.");
    }
  }

  // --- Vélemény törlése ---
  async function velemenyTorles(id) {
    if (!torolVelemeny) return;

    // Felhasználói megerősítés
    if (!window.confirm("Biztosan törlöd ezt a véleményt?")) return;

    try {
      await torolVelemeny(id);

    } catch (err) {
      console.error("Vélemény törlési hiba:", err);
      alert("Hiba történt a vélemény törlésekor.");
    }
  }

  return (
    <section className="velemenyek-szekcio velemeny-panel">
      <h3>Vélemények</h3>

      {/* Ha nincs vélemény */}
      {lista.length === 0 ? (
        <p>Még nem érkezett vélemény ehhez a maketthez.</p>

      ) : (
        <ul className="velemeny-lista">
          {lista.map((v) => {

            const canEdit = szerkesztheto(v);
            const canDelete = torolheto(v);

            // --- Ha ezt a véleményt szerkesztjük ---
            if (editId === v.id) {
              return (
                <li key={v.id} className="card velemeny-card">

                  {/* Inline szerkesztő form */}
                  <form className="form" onSubmit={szerkesztesMentes}>
                    <h4>Vélemény szerkesztése</h4>

                    <label>
                      Értékelés (1–5)
                      <CsillagValaszto
                        value={editErtekeles}
                        onChange={(x) => setEditErtekeles(x)}
                      />
                    </label>

                    <label>
                      Vélemény szövege
                      <textarea
                        rows={4}
                        required
                        value={editSzoveg}
                        onChange={(e) => setEditSzoveg(e.target.value)}
                      />
                    </label>

                    <div className="button-row">
                      <button className="btn" type="submit">
                        Mentés
                      </button>

                      {/* Szerkesztés megszakítása */}
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={() => setEditId(null)}
                      >
                        Mégse
                      </button>

                      {/* Törlés gomb */}
                      {canDelete && (
                        <button
                          className="btn danger"
                          type="button"
                          onClick={() => velemenyTorles(v.id)}
                        >
                          Törlés
                        </button>
                      )}
                    </div>
                  </form>
                </li>
              );
            }

            // --- Normál megjelenítés ---
            return (
              <li key={v.id} className="card velemeny-card">

                {/* Fejléc: név + dátum + értékelés */}
                <header className="velemeny-fejlec">
                  <div>
                    <strong>{v.felhasznalo_nev || "Ismeretlen"}</strong>
                    <p className="small">{datumKiir(v.letrehozva)}</p>
                  </div>

                  <div>
                    {/* Csillag értékelés csak megjelenítésre */}
                    <CsillagValaszto value={Number(v.ertekeles) || 0} readOnly />
                  </div>
                </header>

                {/* Vélemény szöveg */}
                <p>{v.szoveg}</p>

                {/* Műveleti gombok */}
                {(canEdit || canDelete) && (
                  <div className="button-row">

                    {canEdit && (
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => szerkesztesIndit(v)}
                      >
                        Szerkesztés
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        className="btn danger"
                        onClick={() => velemenyTorles(v.id)}
                      >
                        Törlés
                      </button>
                    )}

                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Új vélemény form */}
      {bejelentkezve ? (
        <form className="card form" onSubmit={ujVelemenyKuldes}>
          <h3>Új vélemény írása</h3>

          <label>
            Értékelés (1–5)
            <CsillagValaszto
              value={ujErtekeles}
              onChange={(x) => setUjErtekeles(x)}
            />
          </label>

          <label>
            Vélemény szövege
            <textarea
              rows={4}
              required
              value={ujSzoveg}
              onChange={(e) => setUjSzoveg(e.target.value)}
            />
          </label>

          <button type="submit" className="btn">
            Vélemény elküldése
          </button>
        </form>

      ) : (
        <p>
          Vélemény írásához <Link to="/bejelentkezes">jelentkezz be</Link>.
        </p>
      )}
    </section>
  );
}
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CsillagValaszto from "./CsillagValaszto";

/**
 * Vélemények panel (MakettCard és MakettModal is ezt használja)
 * - listázza a makettId-hoz tartozó véleményeket
 * - bejelentkezett user tud új véleményt írni
 * - a user tudja szerkeszteni (és törölni) a SAJÁT véleményét
 * - admin bárkiét tudja szerkeszteni/törölni
 */
export default function VelemenyekSection({
  makettId,
  velemenyek = [],

  bejelentkezve,
  felhasznalo,
  isAdmin,
  isModerator,

  formatDatum,

  hozzaadVelemeny,
  modositVelemeny,
  torolVelemeny,
}) {
  // --- Maketthez tartozó vélemények kiszűrése ---
  const lista = useMemo(() => {
    const mid = Number(makettId);
    return (velemenyek || []).filter((v) => Number(v.makett_id) === mid);
  }, [velemenyek, makettId]);

  // --- Új vélemény state ---
  const [ujSzoveg, setUjSzoveg] = useState("");
  const [ujErtekeles, setUjErtekeles] = useState(5);

  // --- Szerkesztés state ---
  const [editId, setEditId] = useState(null);
  const [editSzoveg, setEditSzoveg] = useState("");
  const [editErtekeles, setEditErtekeles] = useState(5);

  // Saját-e egy vélemény?
  function sajatVelemeny(v) {
    if (!felhasznalo || !v) return false;
    const uid = Number(felhasznalo.id);
    return Number(v.felhasznalo_id ?? v.felhasznaloId) === uid;
  }

  // Jog: szerkeszthető/törölhető-e
  function szerkesztheto(v) {
    return Boolean(isAdmin || sajatVelemeny(v));
  }

  // Jog: törölhető-e (admin/moderátor/bárki a sajátját)
  function torolheto(v) {
    return Boolean(isAdmin || isModerator || sajatVelemeny(v));
  }

  // Dátum formázás (ha nincs átadva, ne omoljon össze)
  function datumKiir(d) {
    if (formatDatum) return formatDatum(d);
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
    if (!bejelentkezve) return;
    if (!hozzaadVelemeny) return;

    try {
      await hozzaadVelemeny(makettId, {
        szoveg: ujSzoveg,
        ertekeles: Number(ujErtekeles),
      });

      setUjSzoveg("");
      setUjErtekeles(5);
    } catch (err) {
      console.error("Vélemény mentési hiba:", err);
      alert("Hiba történt a vélemény mentésekor.");
    }
  }

  // --- Szerkesztés indítása (gombnyomás) ---
  function szerkesztesIndit(v) {
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

      // szerkesztő mód bezárása
      setEditId(null);
      setEditSzoveg("");
      setEditErtekeles(5);
    } catch (err) {
      console.error("Vélemény módosítási hiba:", err);
      alert("Hiba történt a vélemény módosításakor.");
    }
  }

  // --- Törlés ---
  async function velemenyTorles(id) {
    if (!torolVelemeny) return;
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

      {lista.length === 0 ? (
        <p>Még nem érkezett vélemény ehhez a maketthez.</p>
      ) : (
        <ul className="velemeny-lista">
          {lista.map((v) => {
            const canEdit = szerkesztheto(v);
            const canDelete = torolheto(v);

            // --- Ha EZT a véleményt szerkesztjük, akkor a helyén form jelenik meg ---
            if (editId === v.id) {
              return (
                <li key={v.id} className="card velemeny-card">
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

                      {/* “Mégse” bezárja a szerkesztést */}
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={() => setEditId(null)}
                      >
                        Mégse
                      </button>

                      {/* Törlés */}
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

            // --- Normál (nem szerkesztős) megjelenítés ---
            return (
              <li key={v.id} className="card velemeny-card">
                <header className="velemeny-fejlec">
                  <div>
                    <strong>{v.felhasznalo_nev || "Ismeretlen"}</strong>
                    <p className="small">{datumKiir(v.letrehozva)}</p>
                  </div>

                  <div>
                    {/* Csak megjelenítés (readOnly) */}
                    <CsillagValaszto value={Number(v.ertekeles) || 0} readOnly />
                  </div>
                </header>

                <p>{v.szoveg}</p>

                {/* ✅ EZ A RÉSZ: Szerkesztés gomb csak saját/admin esetén */}
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

      {/* Új vélemény írása */}
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

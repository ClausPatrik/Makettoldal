import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAdat } from "../context/AdatContext";

import MakettModal from "../components/MakettModal";
import CsillagValaszto from "../components/CsillagValaszto";

/**
 * Backend API bázis URL (REST végpontok).
 * Megjegyzés: lokális fejlesztés; éles környezetben jellemzően env-ből érkezik.
 */
const API_BASE_URL = "http://localhost:3001/api";

export default function SajatVelemenyek() {
  const { bejelentkezve, felhasznalo } = useAuth();

  // Jogosultság jelzők (MakettModal-ban admin/moderátor műveletek feltételeihez)
  const isAdmin = felhasznalo?.szerepkor_id === 2;
  const isModerator = felhasznalo?.szerepkor_id === 3;

  /**
   * AdatContext:
   * - `makettek`: makettek listája (a Megtekintés gomb innen keres makett objektumot)
   * - `mindenVelemeny`: globális véleménylista (MakettModal-hoz szűrjük belőle a makett véleményeit)
   * - CRUD műveletek véleményhez + kedvencek kezelése
   */
  const {
    makettek,
    velemenyek: mindenVelemeny,
    szamolAtlagErtekeles,
    hozzaadVelemeny,
    modositVelemeny,
    torolVelemeny,
    kedvencek,
    betoltKedvencek,
    valtKedvenc,
  } = useAdat();

  /**
   * Saját vélemények listája:
   * - külön endpointból jön (GET /sajat/velemenyek)
   * - elkülönítjük a globális `mindenVelemeny` listától
   */
  const [velemenyek, setVelemenyek] = useState([]);
  const [betoltes, setBetoltes] = useState(false);
  const [hiba, setHiba] = useState(null);

  // Makett megtekintés modal: kiválasztott makett objektum (null => zárva)
  const [modalMakett, setModalMakett] = useState(null);

  // Vélemény szerkesztő modal állapotai
  const [editModalNyitva, setEditModalNyitva] = useState(false);
  const [aktivVelemeny, setAktivVelemeny] = useState(null);
  const [editErtekeles, setEditErtekeles] = useState(5);
  const [editSzoveg, setEditSzoveg] = useState("");

  // ---------------------------------------------------------------------------
  // Helper függvények
  // ---------------------------------------------------------------------------

  /**
   * JWT token lekérése LocalStorage-ból.
   * Megjegyzés: a token kezelés/élettartam a bejelentkezési logikától függ.
   */
  function token() {
    return localStorage.getItem("token");
  }

  /**
   * Dátum/idő formázás (hu-HU).
   * Hibás dátum esetén az eredeti stringet adja vissza.
   */
  function formatDatum(datumStr) {
    if (!datumStr) return "";
    const d = new Date(datumStr);
    if (Number.isNaN(d.getTime())) return datumStr;
    return d.toLocaleString("hu-HU");
  }

  /**
   * Csillag megjelenítő komponens (read-only).
   * - Nem kattintható (pointerEvents: none), csak vizuális kijelzés a listában.
   */
  function CsillagKijelzo({ value }) {
    const v = Math.max(0, Math.min(5, Number(value) || 0));
    return (
      <span
        className="rating-stars"
        style={{ pointerEvents: "none", userSelect: "none" }}
        aria-label={`Értékelés: ${v} / 5`}
      >
        {Array.from({ length: 5 }).map((_, i) => {
          const akt = i + 1 <= v;
          return (
            <span key={i} className={akt ? "star active" : "star"}>
              {akt ? "★" : "☆"}
            </span>
          );
        })}
      </span>
    );
  }

  /**
   * Makett azonosító kinyerése vélemény rekordból.
   * Megjegyzés: többféle backend/serializer névvel is előfordulhat, ezért fallback-eket kezelünk.
   */
  function velemenyMakettId(v) {
    return Number(v.makett_id ?? v.makettId ?? v.makettID ?? v.makettid ?? 0);
  }

  /**
   * Kedvenc státusz ellenőrzése:
   * - kezeli azt is, ha `kedvencek` objektumlista (pl. { makett_id: ... })
   * - és azt is, ha egyszerű ID-lista
   */
  function makettKedvenc(makettId) {
    if (!Array.isArray(kedvencek)) return false;
    const mid = Number(makettId);

    if (kedvencek.length > 0 && typeof kedvencek[0] === "object") {
      return kedvencek.some((k) => Number(k.makett_id ?? k.id) === mid);
    }

    return kedvencek.some((id) => Number(id) === mid);
  }

  // ---------------------------------------------------------------------------
  // Saját vélemények betöltése
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!bejelentkezve) return;

    /**
     * Saját vélemények lekérése:
     * - auth headerrel (Bearer token)
     * - hiba esetén felhasználóbarát üzenet `hiba` state-ben
     */
    async function betolt() {
      try {
        setBetoltes(true);
        setHiba(null);

        const res = await fetch(`${API_BASE_URL}/sajat/velemenyek`, {
          headers: { Authorization: `Bearer ${token()}` },
        });

        if (!res.ok) {
          const h = await res.json().catch(() => ({}));
          throw new Error(h.uzenet || "Nem sikerült betölteni a véleményeket.");
        }

        const adat = await res.json();
        setVelemenyek(adat);
      } catch (err) {
        setHiba(err.message);
      } finally {
        setBetoltes(false);
      }
    }

    betolt();
  }, [bejelentkezve]);

  /**
   * Kedvencek betöltése:
   * A MakettModal-ban a kedvenc gomb/állapot korrekt megjelenítéséhez szükséges.
   */
  useEffect(() => {
    if (bejelentkezve && betoltKedvencek) {
      betoltKedvencek();
    }
  }, [bejelentkezve, betoltKedvencek]);

  // ---------------------------------------------------------------------------
  // Gomb: Megtekintés (MakettModal)
  // ---------------------------------------------------------------------------

  /**
   * Makett megtekintése:
   * - a véleményből kinyerjük a makett ID-t
   * - megpróbáljuk kikeresni a `makettek` context listából
   * - ha nincs meg, itt csak jelzést adunk (nincs ezen oldalon külön makett-betöltés)
   */
  function megtekintes(v) {
    const mid = velemenyMakettId(v);
    if (!mid) {
      alert("Nem találom a makett azonosítóját ennél a véleménynél.");
      return;
    }

    const mk = (makettek || []).find((m) => Number(m.id) === mid);
    if (!mk) {
      alert(
        "A makett adatai nem elérhetők ezen az oldalon. Menj a Makettek oldalra, vagy szólj és hozzáadom itt is a betöltést."
      );
      return;
    }

    setModalMakett(mk);
  }

  // ---------------------------------------------------------------------------
  // Gomb: Szerkesztés (csak gomb nyitja a modalt)
  // ---------------------------------------------------------------------------

  /**
   * Vélemény szerkesztő modal megnyitása:
   * - a kijelölt vélemény adatait betöltjük a szerkesztő state-ekbe (értékelés + szöveg)
   */
  function szerkesztesMegnyit(v) {
    setAktivVelemeny(v);
    setEditErtekeles(Number(v.ertekeles) || 5);
    setEditSzoveg(v.szoveg || "");
    setEditModalNyitva(true);
  }

  /**
   * Szerkesztő modal bezárása + aktív vélemény reset.
   */
  function szerkesztesBezar() {
    setEditModalNyitva(false);
    setAktivVelemeny(null);
  }

  /**
   * Vélemény módosítás mentése:
   * - context `modositVelemeny` hívása
   * - lokális listában azonnali UI frissítés (optimista jelleggel)
   */
  async function szerkesztesMentes() {
    if (!aktivVelemeny?.id) return;

    try {
      await modositVelemeny(aktivVelemeny.id, {
        ertekeles: Number(editErtekeles),
        szoveg: editSzoveg,
      });

      // UI frissítés helyben (ne kelljen újratölteni az egész listát)
      setVelemenyek((prev) =>
        prev.map((x) =>
          x.id === aktivVelemeny.id
            ? { ...x, ertekeles: Number(editErtekeles), szoveg: editSzoveg }
            : x
        )
      );

      szerkesztesBezar();
    } catch (err) {
      console.error("Vélemény módosítás hiba:", err);
      alert("Hiba történt a vélemény mentésekor.");
    }
  }

  /**
   * Vélemény törlése:
   * - megerősítés után context `torolVelemeny`
   * - lokális listából kivesszük a törölt elemet
   */
  async function szerkesztesTorles() {
    if (!aktivVelemeny?.id) return;
    if (!window.confirm("Biztosan törlöd ezt a véleményt?")) return;

    try {
      await torolVelemeny(aktivVelemeny.id);

      // UI: törlés listából
      setVelemenyek((prev) => prev.filter((x) => x.id !== aktivVelemeny.id));
      szerkesztesBezar();
    } catch (err) {
      console.error("Vélemény törlés hiba:", err);
      alert("Hiba történt a vélemény törlésekor.");
    }
  }

  // ---------------------------------------------------------------------------
  // MakettModal-hoz számolt adatok
  // ---------------------------------------------------------------------------
  const modalMakettId = Number(modalMakett?.id || 0);

  /**
   * Makett átlagértékelés a modálban:
   * - a context `szamolAtlagErtekeles` függvényét használjuk
   * - memoizáljuk, hogy csak releváns változásokkor számoljon újra
   */
  const modalAtlag = useMemo(() => {
    if (!modalMakettId) return 0;
    return szamolAtlagErtekeles ? szamolAtlagErtekeles(modalMakettId) || 0 : 0;
  }, [modalMakettId, szamolAtlagErtekeles]);

  /**
   * Makett véleményei a modálhoz:
   * - a globális `mindenVelemeny` listából szűrjük az adott makett véleményeit
   */
  const modalVelemenyek = useMemo(() => {
    if (!modalMakettId) return [];
    return (mindenVelemeny || []).filter((v) => Number(v.makett_id) === modalMakettId);
  }, [modalMakettId, mindenVelemeny]);

  /**
   * Kedvenc státusz a modálban (szív gomb állapotához).
   * Megjegyzés: a memo függ a `kedvencek` változásától is, mert attól lesz naprakész.
   */
  const modalKedvenc = useMemo(() => {
    if (!modalMakettId) return false;
    return makettKedvenc(modalMakettId);
  }, [modalMakettId, kedvencek]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (!bejelentkezve) {
    return (
      <section className="page">
        <h1>Saját véleményeim</h1>
        <p>Kérlek jelentkezz be, hogy lásd a saját véleményeidet.</p>
        <Link to="/bejelentkezes" className="btn">
          Bejelentkezés
        </Link>
      </section>
    );
  }

  return (
    <section className="page">
      <h1>Saját véleményeim</h1>
      <p className="small">Itt látod az összes véleményt, amit makettekről írtál.</p>

      {betoltes && <p>Betöltés...</p>}
      {hiba && <p className="error">{hiba}</p>}

      {velemenyek.length === 0 && !betoltes ? (
        <p>Még nem írtál véleményt egyetlen makettről sem.</p>
      ) : (
        <div className="card">
          <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
            {velemenyek.map((v) => {
              const datum = v.letrehozva ? formatDatum(v.letrehozva) : "";
              const mid = velemenyMakettId(v);

              return (
                <li
                  key={v.id}
                  style={{
                    borderBottom: "1px solid #111827",
                    padding: "10px 0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <strong>{v.makett_nev}</strong>{" "}
                      <span className="small">({v.gyarto})</span>
                      <p className="small" style={{ margin: 0 }}>
                        {v.skala} • {v.kategoria}
                      </p>

                      {/* Lista nézet: értékelés csak kijelzés (nem szerkeszthető) */}
                      <div style={{ marginTop: 6 }}>
                        <CsillagKijelzo value={v.ertekeles} />{" "}
                        <span className="small">{Number(v.ertekeles) || 0}/5</span>
                      </div>
                    </div>

                    {/* Műveletek: megtekintés (makett modal) + szerkesztés (vélemény modal) */}
                    <div className="button-row" style={{ justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => megtekintes(v)}
                        disabled={!mid}
                        title="Makett megtekintése"
                      >
                        Megtekintés
                      </button>

                      <button
                        type="button"
                        className="btn"
                        onClick={() => szerkesztesMegnyit(v)}
                        title="Saját vélemény szerkesztése"
                      >
                        Szerkesztés
                      </button>
                    </div>
                  </div>

                  <p style={{ marginTop: 8, marginBottom: 0 }}>{v.szoveg}</p>
                  <p className="small" style={{ marginTop: 6, marginBottom: 0 }}>
                    {datum}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <Link to="/makettek" className="btn secondary">
          Vissza a makettekhez
        </Link>
      </div>

      {/* Makett megtekintés modal: a "Megtekintés" gomb nyitja, teljes vélemény funkcióval */}
      <MakettModal
        open={Boolean(modalMakett)}
        makett={modalMakett}
        onClose={() => setModalMakett(null)}
        atlag={modalAtlag}
        velemenyek={modalVelemenyek}
        kedvenc={modalKedvenc}
        onToggleKedvenc={valtKedvenc}
        showReviews={true}
        bejelentkezve={bejelentkezve}
        felhasznalo={felhasznalo}
        isAdmin={isAdmin}
        isModerator={isModerator}
        formatDatum={(d) => formatDatum(d)}
        hozzaadVelemeny={hozzaadVelemeny}
        modositVelemeny={modositVelemeny}
        torolVelemeny={torolVelemeny}
      />

      {/* Vélemény szerkesztő modal: csak a "Szerkesztés" gomb nyitja */}
      {editModalNyitva && aktivVelemeny && (
        <div className="modal-overlay" onClick={szerkesztesBezar}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ marginBottom: 4 }}>Vélemény szerkesztése</h2>
                <p className="small" style={{ margin: 0 }}>
                  {aktivVelemeny.makett_nev} • {aktivVelemeny.gyarto} • {aktivVelemeny.skala}
                </p>
              </div>

              <button className="modal-close" onClick={szerkesztesBezar} title="Bezárás">
                ×
              </button>
            </div>

            <div className="form" style={{ marginTop: 10 }}>
              <label>
                Értékelés (1–5)
                {/* Itt szerkeszthető a csillag értékelés */}
                <CsillagValaszto value={editErtekeles} onChange={setEditErtekeles} />
              </label>

              <label>
                Vélemény szövege
                <textarea
                  rows={4}
                  value={editSzoveg}
                  onChange={(e) => setEditSzoveg(e.target.value)}
                  required
                />
              </label>

              <div className="button-row">
                <button type="button" className="btn" onClick={szerkesztesMentes}>
                  Mentés
                </button>

                <button type="button" className="btn secondary" onClick={szerkesztesBezar}>
                  Mégse
                </button>

                <button type="button" className="btn danger" onClick={szerkesztesTorles}>
                  Törlés
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
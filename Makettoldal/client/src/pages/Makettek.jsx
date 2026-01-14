import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdat } from "../context/AdatContext";
import { useAuth } from "../context/AuthContext";

/**
 * Egyszerű csillagválasztó komponens (1–5)
 * - value: aktuális érték (szám)
 * - onChange: visszahívás új értékkel
 */
function CsillagValaszto({ value, onChange }) {
  const aktivErtek = Number(value) || 0;

  return (
    <div className="rating-stars">
      {Array.from({ length: 5 }).map((_, idx) => {
        const csillagErtek = idx + 1;
        const aktiv = csillagErtek <= aktivErtek;

        return (
          <button
            key={csillagErtek}
            type="button"
            className={aktiv ? "star active" : "star"}
            onClick={() => onChange(csillagErtek)}
          >
            {aktiv ? "★" : "☆"}
          </button>
        );
      })}
    </div>
  );
}

export default function Makettek() {
  /**
   * Adatok és műveletek (contextből)
   */
  const {
    makettek,
    velemenyek,
    szamolAtlagErtekeles,
    hozzaadVelemeny,
    modositVelemeny,
    torolVelemeny,
    kedvencek,
    betoltKedvencek,
    valtKedvenc,
    betoltesFolyamatban,
    hiba,
  } = useAdat();

  /**
   * Auth (bejelentkezés, user)
   */
  const { bejelentkezve, felhasznalo } = useAuth();
  const isAdmin = felhasznalo?.szerepkor_id === 2;

  /**
   * Szűrők UI state
   */
  const [kategoriaSzuro, beallitKategoriaSzuro] = useState("osszes");
  const [skalaSzuro, beallitSkalaSzuro] = useState("osszes");
  const [kereses, beallitKereses] = useState("");
  const [minAtlagErtekeles, beallitMinAtlagErtekeles] = useState(0);
  const [rendezes, beallitRendezes] = useState("nev");

  /**
   * Modal (nagy ablak) state:
   * - null => nincs nyitva modal
   * - objektum => a kiválasztott makett adatai
   */
  const [modalMakett, setModalMakett] = useState(null);

  /**
   * Vélemények “kártyán belüli” ki/bekapcsolása (nem a modalhoz)
   * - a régi működésed megmarad
   */
  const [kivalasztottMakettId, beallitKivalasztottMakettId] = useState(null);

  /**
   * Új vélemény űrlap state (a kártyákon és a modalban is ezt használjuk)
   */
  const [ujVelemenySzoveg, beallitUjVelemenySzoveg] = useState("");
  const [ujVelemenyErtekeles, beallitUjVelemenyErtekeles] = useState(5);

  /**
   * Vélemény szerkesztés state (ugyanazt használjuk modalban és listában is)
   */
  const [szerkesztettVelemenyId, beallitSzerkesztettVelemenyId] =
    useState(null);
  const [szerkesztettSzoveg, beallitSzerkesztettSzoveg] = useState("");
  const [szerkesztettErtekeles, beallitSzerkesztettErtekeles] = useState(5);

  /**
   * Kedvencek betöltése, ha bejelentkezett a user
   */
  useEffect(() => {
    if (bejelentkezve) {
      betoltKedvencek();
    }
  }, [bejelentkezve, betoltKedvencek]);

  /**
   * Ha a modal nyitva van, ne lehessen scrollozni a háttér oldalt
   */
  useEffect(() => {
    document.body.style.overflow = modalMakett ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalMakett]);

  /**
   * Makettek szűrése és rendezése
   * useMemo: csak akkor számolja újra, ha a függőségek változnak
   */
  const szurtMakettek = useMemo(() => {
    let lista = [...(makettek || [])];

    // kategória szűrő
    if (kategoriaSzuro !== "osszes") {
      lista = lista.filter((m) => m.kategoria === kategoriaSzuro);
    }

    // skála szűrő
    if (skalaSzuro !== "osszes") {
      lista = lista.filter((m) => m.skala === skalaSzuro);
    }

    // kereső (név/gyártó)
    if (kereses.trim() !== "") {
      const q = kereses.trim().toLowerCase();
      lista = lista.filter((m) => {
        const nev = m.nev?.toLowerCase() || "";
        const gyarto = m.gyarto?.toLowerCase() || "";
        return nev.includes(q) || gyarto.includes(q);
      });
    }

    // minimum átlagértékelés szűrő
    if (minAtlagErtekeles > 0) {
      lista = lista.filter((m) => {
        const atlag = szamolAtlagErtekeles
          ? szamolAtlagErtekeles(m.id) || 0
          : 0;
        return atlag >= minAtlagErtekeles;
      });
    }

    // rendezés
    lista.sort((a, b) => {
      if (rendezes === "nev") {
        return (a.nev || "").localeCompare(b.nev || "");
      }
      if (rendezes === "ev") {
        return (b.megjelenes_eve || 0) - (a.megjelenes_eve || 0);
      }
      if (rendezes === "ertekeles") {
        const aAtlag = szamolAtlagErtekeles
          ? szamolAtlagErtekeles(a.id) || 0
          : 0;
        const bAtlag = szamolAtlagErtekeles
          ? szamolAtlagErtekeles(b.id) || 0
          : 0;
        return bAtlag - aAtlag;
      }
      return 0;
    });

    return lista;
  }, [
    makettek,
    kategoriaSzuro,
    skalaSzuro,
    kereses,
    minAtlagErtekeles,
    rendezes,
    szamolAtlagErtekeles,
  ]);

  /**
   * Egy maketthez tartozó vélemények listája
   */
  function makettVelemenyek(makettId) {
    return (velemenyek || []).filter((v) => v.makett_id === makettId);
  }

  /**
   * Dátum formázó (hu-HU)
   */
  function formatDatum(datumStr) {
    if (!datumStr) return "";
    const d = new Date(datumStr);
    if (Number.isNaN(d.getTime())) return datumStr;
    return d.toLocaleDateString("hu-HU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  /**
   * Kártyán a “vélemények megtekintése/elrejtése” gomb működése
   */
  function kezeliMakettValasztas(makettId) {
    if (kivalasztottMakettId === makettId) {
      // ugyanarra nyomtunk => zárjuk
      beallitKivalasztottMakettId(null);
    } else {
      // új makettet nyitunk meg
      beallitKivalasztottMakettId(makettId);
      // űrlap tisztítás
      beallitUjVelemenySzoveg("");
      beallitUjVelemenyErtekeles(5);
      // szerkesztés bezárása
      beallitSzerkesztettVelemenyId(null);
    }
  }

  /**
   * Új vélemény elküldése (kártyákon belül)
   * (ezt a régi logikádat meghagyjuk)
   */
  async function kezeliUjVelemenyKuldes(e) {
    e.preventDefault();
    if (!kivalasztottMakettId) return;

    try {
      await hozzaadVelemeny(kivalasztottMakettId, {
        szoveg: ujVelemenySzoveg,
        ertekeles: Number(ujVelemenyErtekeles),
      });
      beallitUjVelemenySzoveg("");
      beallitUjVelemenyErtekeles(5);
    } catch (err) {
      console.error("Vélemény mentési hiba:", err);
      alert("Hiba történt a vélemény mentésekor.");
    }
  }

  /**
   * Új vélemény elküldése MODAL-ból:
   * - itt NEM a kivalasztottMakettId-t nézzük,
   *   hanem közvetlenül a modalMakett.id-t használjuk
   */
  async function kezeliUjVelemenyKuldesModal(e) {
    e.preventDefault();
    if (!modalMakett?.id) return;

    try {
      await hozzaadVelemeny(modalMakett.id, {
        szoveg: ujVelemenySzoveg,
        ertekeles: Number(ujVelemenyErtekeles),
      });
      beallitUjVelemenySzoveg("");
      beallitUjVelemenyErtekeles(5);
    } catch (err) {
      console.error("Vélemény mentési hiba (modal):", err);
      alert("Hiba történt a vélemény mentésekor.");
    }
  }

  /**
   * Szerkesztés indítása
   */
  function kezeliVelemenySzerkesztesInditasa(velemeny) {
    beallitSzerkesztettVelemenyId(velemeny.id);
    beallitSzerkesztettSzoveg(velemeny.szoveg || "");
    beallitSzerkesztettErtekeles(velemeny.ertekeles || 5);
  }

  /**
   * Szerkesztés mentése
   */
  async function kezeliVelemenySzerkesztesKuldes(e) {
    e.preventDefault();
    if (!szerkesztettVelemenyId) return;

    try {
      await modositVelemeny(szerkesztettVelemenyId, {
        szoveg: szerkesztettSzoveg,
        ertekeles: Number(szerkesztettErtekeles),
      });
      beallitSzerkesztettVelemenyId(null);
    } catch (err) {
      console.error("Vélemény módosítási hiba:", err);
      alert("Hiba történt a vélemény módosításakor.");
    }
  }

  /**
   * Vélemény törlése
   */
  async function kezeliVelemenyTorles(velemenyId) {
    if (!window.confirm("Biztosan törlöd ezt a véleményt?")) return;
    try {
      await torolVelemeny(velemenyId);
    } catch (err) {
      console.error("Vélemény törlési hiba:", err);
      alert("Hiba történt a vélemény törlésekor.");
    }
  }

  /**
   * Megnézzük, hogy egy vélemény a bejelentkezett useré-e
   */
  function velemenySzerzoSajat(velemeny) {
    if (!felhasznalo || !velemeny) return false;
    return (
      velemeny.felhasznalo_id === felhasznalo.id ||
      velemeny.felhasznaloId === felhasznalo.id
    );
  }

  /**
   * Makett kedvenc-e?
   * - kezeli, ha kedvencek listája objektumokból áll vagy ID listából
   */
  function makettKedvenc(makettId) {
    if (!Array.isArray(kedvencek)) return false;

    const mid = Number(makettId);

    // ha objektumok listája (pl. [{makett_id: "3"}])
    if (kedvencek.length > 0 && typeof kedvencek[0] === "object") {
      return kedvencek.some((k) => Number(k.makett_id ?? k.id) === mid);
    }

    // ha sima ID lista (pl. ["3", "5"] vagy [3, 5])
    return kedvencek.some((id) => Number(id) === mid);
  }

  /**
   * Kedvenc váltás (hozzáadás/eltávolítás)
   */
  async function kezeliKedvencValtas(makettId) {
    if (!bejelentkezve) {
      alert("Kedvencekhez kérlek jelentkezz be.");
      return;
    }
    try {
      await valtKedvenc(makettId);
    } catch (err) {
      console.error("Kedvenc váltási hiba:", err);
      alert("Hiba történt a kedvencek módosításakor.");
    }
  }

  /**
   * MODAL-hoz előre kiszámolt értékek (csak ha modal nyitva van)
   */
  const modalAtlag = modalMakett
    ? szamolAtlagErtekeles
      ? szamolAtlagErtekeles(modalMakett.id) || 0
      : 0
    : 0;

  const modalVelemenyLista = modalMakett ? makettVelemenyek(modalMakett.id) : [];
  const modalKedvenc = modalMakett ? makettKedvenc(modalMakett.id) : false;

  return (
    <section className="page">
      <header className="page-header">
        <h1>Makettek</h1>
        <p>
          Böngészd a maketteket, olvasd el mások véleményét, és írd meg a saját
          tapasztalataidat!
        </p>
      </header>

      {/* Szűrők */}
      <section className="card filters">
        <div className="filters-row">
          <input
            type="text"
            placeholder="Keresés név vagy gyártó alapján..."
            value={kereses}
            onChange={(e) => beallitKereses(e.target.value)}
          />

          <select
            value={kategoriaSzuro}
            onChange={(e) => beallitKategoriaSzuro(e.target.value)}
          >
            <option value="osszes">Összes kategória</option>
            <option value="harckocsi">Harckocsi</option>
            <option value="repülő">Repülő</option>
            <option value="hajó">Hajó</option>
            <option value="figura">Figura</option>
          </select>

          <select
            value={skalaSzuro}
            onChange={(e) => beallitSkalaSzuro(e.target.value)}
          >
            <option value="osszes">Összes skála</option>
            <option value="1:35">1:35</option>
            <option value="1:72">1:72</option>
            <option value="1:48">1:48</option>
            <option value="1:350">1:350</option>
          </select>

          <select
            value={minAtlagErtekeles}
            onChange={(e) => beallitMinAtlagErtekeles(Number(e.target.value))}
          >
            <option value={0}>Bármilyen értékelés</option>
            <option value={3}>Min. 3★</option>
            <option value={4}>Min. 4★</option>
            <option value={4.5}>Min. 4.5★</option>
          </select>

          <select
            value={rendezes}
            onChange={(e) => beallitRendezes(e.target.value)}
          >
            <option value="nev">Név szerint</option>
            <option value="ev">Megjelenés éve szerint</option>
            <option value="ertekeles">Átlagértékelés szerint</option>
          </select>
        </div>
      </section>

      {betoltesFolyamatban && <p>Betöltés folyamatban...</p>}
      {hiba && <p className="error">Hiba történt az adatok betöltésekor: {hiba}</p>}

      {/* Makett lista */}
      <section className="card-grid">
        {szurtMakettek.length === 0 ? (
          <p>Nincsenek a szűrésnek megfelelő makettek.</p>
        ) : (
          szurtMakettek.map((m) => {
            const atlag = szamolAtlagErtekeles ? szamolAtlagErtekeles(m.id) || 0 : 0;
            const velemenyLista = makettVelemenyek(m.id);
            const nyitva = kivalasztottMakettId === m.id;
            const kedvenc = makettKedvenc(m.id);

            return (
              <article key={m.id} className="card makett-card">
                <div className="makett-fejlec">
                  <div>
                    <h2>{m.nev}</h2>
                    <p className="small">
                      {m.gyarto} • {m.skala} • {m.kategoria}
                    </p>
                    <p className="small">
                      Nehézség: {m.nehezseg}/5 • Megjelenés éve: {m.megjelenes_eve}
                    </p>
                  </div>

                  <div className="makett-ertekeles">
                    <CsillagValaszto value={atlag} onChange={() => {}} />
                    <p className="small">
                      Átlag: {atlag.toFixed(1)} ({velemenyLista.length} vélemény)
                    </p>
                  </div>
                </div>

                {/* Képre kattintva felugrik a MODAL */}
                {m.kep_url && (
                  <div
                    className="makett-kep-wrapper"
                    onClick={() => {
                      // modal nyitáskor érdemes “szerkesztést” bezárni, hogy ne legyen félbehagyott
                      beallitSzerkesztettVelemenyId(null);
                      setModalMakett(m);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        beallitSzerkesztettVelemenyId(null);
                        setModalMakett(m);
                      }
                    }}
                  >
                    <img src={m.kep_url} alt={m.nev} className="makett-kep" />
                  </div>
                )}

                <div className="button-row">
                  <button
                    type="button"
                    className={kedvenc ? "btn secondary" : "btn"}
                    onClick={() => kezeliKedvencValtas(m.id)}
                  >
                    {kedvenc ? "Kedvencekből eltávolítás" : "Kedvencekhez adás"}
                  </button>

                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => kezeliMakettValasztas(m.id)}
                  >
                    {nyitva ? "Vélemények elrejtése" : "Vélemények megtekintése"}
                  </button>
                </div>

                {/* Kártyán belüli vélemény rész (meghagyva, ahogy volt) */}
                {nyitva && (
                  <section className="velemenyek-szekcio">
                    <h3>Vélemények</h3>

                    {velemenyLista.length === 0 ? (
                      <p>Még nem érkezett vélemény ehhez a maketthez.</p>
                    ) : (
                      <ul className="velemeny-lista">
                        {velemenyLista.map((v) => {
                          const szerzoSajat = velemenySzerzoSajat(v);
                          const szerkesztheto = szerzoSajat || isAdmin;

                          if (szerkesztettVelemenyId === v.id) {
                            return (
                              <li key={v.id} className="card velemeny-card">
                                <form
                                  onSubmit={kezeliVelemenySzerkesztesKuldes}
                                  className="form"
                                >
                                  <h4>Vélemény szerkesztése</h4>

                                  <label>
                                    Értékelés (1–5)
                                    <CsillagValaszto
                                      value={szerkesztettErtekeles}
                                      onChange={(ertek) =>
                                        beallitSzerkesztettErtekeles(ertek)
                                      }
                                    />
                                  </label>

                                  <label>
                                    Vélemény szövege
                                    <textarea
                                      value={szerkesztettSzoveg}
                                      onChange={(e) =>
                                        beallitSzerkesztettSzoveg(e.target.value)
                                      }
                                      rows={4}
                                      required
                                    />
                                  </label>

                                  <div className="button-row">
                                    <button type="submit" className="btn">
                                      Mentés
                                    </button>
                                    <button
                                      type="button"
                                      className="btn secondary"
                                      onClick={() => beallitSzerkesztettVelemenyId(null)}
                                    >
                                      Mégse
                                    </button>
                                  </div>
                                </form>
                              </li>
                            );
                          }

                          return (
                            <li key={v.id} className="card velemeny-card">
                              <header className="velemeny-fejlec">
                                <div>
                                  <strong>{v.felhasznalo_nev}</strong>
                                  <p className="small">{formatDatum(v.letrehozva)}</p>
                                </div>
                                <div>
                                  <CsillagValaszto value={v.ertekeles} onChange={() => {}} />
                                </div>
                              </header>

                              <p>{v.szoveg}</p>

                              {szerkesztheto && (
                                <div className="button-row">
                                  <button
                                    type="button"
                                    className="btn secondary"
                                    onClick={() => kezeliVelemenySzerkesztesInditasa(v)}
                                  >
                                    Szerkesztés
                                  </button>
                                  <button
                                    type="button"
                                    className="btn danger"
                                    onClick={() => kezeliVelemenyTorles(v.id)}
                                  >
                                    Törlés
                                  </button>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {bejelentkezve ? (
                      <form onSubmit={kezeliUjVelemenyKuldes} className="card form">
                        <h3>Új vélemény írása</h3>

                        <label>
                          Értékelés (1–5)
                          <CsillagValaszto
                            value={ujVelemenyErtekeles}
                            onChange={(ertek) => beallitUjVelemenyErtekeles(ertek)}
                          />
                        </label>

                        <label>
                          Vélemény szövege
                          <textarea
                            value={ujVelemenySzoveg}
                            onChange={(e) => beallitUjVelemenySzoveg(e.target.value)}
                            rows={4}
                            required
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
                )}
              </article>
            );
          })
        )}
      </section>

      {/* =========================
          MODAL (NAGY ABLAK)
          - kép kattintásra nyílik
          - itt is látszik: kedvenc gomb + vélemények + új vélemény írás
         ========================= */}
      {modalMakett && (
        <div className="modal-overlay" onClick={() => setModalMakett(null)}>
          {/* stopPropagation: ne záródjon be, ha a modalt kattintjuk */}
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{modalMakett.nev}</h2>
                <p className="small">
                  {modalMakett.gyarto} • {modalMakett.skala} • {modalMakett.kategoria}
                </p>

                {/* Átlagértékelés a modalban is */}
                <div className="makett-ertekeles">
                  <CsillagValaszto value={modalAtlag} onChange={() => {}} />
                  <p className="small">
                    Átlag: {modalAtlag.toFixed(1)} ({modalVelemenyLista.length} vélemény)
                  </p>
                </div>
              </div>

              <button className="modal-close" onClick={() => setModalMakett(null)}>
                ×
              </button>
            </div>

            {modalMakett.kep_url && (
              <img className="modal-kep" src={modalMakett.kep_url} alt={modalMakett.nev} />
            )}

            <div className="modal-grid">
              <p className="small">
                <strong>Nehézség:</strong> {modalMakett.nehezseg}/5
              </p>
              <p className="small">
                <strong>Megjelenés éve:</strong> {modalMakett.megjelenes_eve}
              </p>
            </div>

            {/* Modal gombok: kedvenc + bezárás */}
            <div className="button-row">
              <button
                type="button"
                className={modalKedvenc ? "btn secondary" : "btn"}
                onClick={() => kezeliKedvencValtas(modalMakett.id)}
              >
                {modalKedvenc ? "Kedvencekből eltávolítás" : "Kedvencekhez adás"}
              </button>

              <button type="button" className="btn secondary" onClick={() => setModalMakett(null)}>
                Bezárás
              </button>
            </div>

            {/* Vélemények: itt mindig megjelennek */}
            <section className="velemenyek-szekcio">
              <h3>Vélemények</h3>

              {modalVelemenyLista.length === 0 ? (
                <p>Még nem érkezett vélemény ehhez a maketthez.</p>
              ) : (
                <ul className="velemeny-lista">
                  {modalVelemenyLista.map((v) => {
                    const szerzoSajat = velemenySzerzoSajat(v);
                    const szerkesztheto = szerzoSajat || isAdmin;

                    // Ha épp ezt a véleményt szerkeszted, ugyanaz a szerkesztős UI jön
                    if (szerkesztettVelemenyId === v.id) {
                      return (
                        <li key={v.id} className="card velemeny-card">
                          <form onSubmit={kezeliVelemenySzerkesztesKuldes} className="form">
                            <h4>Vélemény szerkesztése</h4>

                            <label>
                              Értékelés (1–5)
                              <CsillagValaszto
                                value={szerkesztettErtekeles}
                                onChange={(ertek) => beallitSzerkesztettErtekeles(ertek)}
                              />
                            </label>

                            <label>
                              Vélemény szövege
                              <textarea
                                value={szerkesztettSzoveg}
                                onChange={(e) => beallitSzerkesztettSzoveg(e.target.value)}
                                rows={4}
                                required
                              />
                            </label>

                            <div className="button-row">
                              <button type="submit" className="btn">
                                Mentés
                              </button>
                              <button
                                type="button"
                                className="btn secondary"
                                onClick={() => beallitSzerkesztettVelemenyId(null)}
                              >
                                Mégse
                              </button>
                            </div>
                          </form>
                        </li>
                      );
                    }

                    return (
                      <li key={v.id} className="card velemeny-card">
                        <header className="velemeny-fejlec">
                          <div>
                            <strong>{v.felhasznalo_nev}</strong>
                            <p className="small">{formatDatum(v.letrehozva)}</p>
                          </div>
                          <div>
                            <CsillagValaszto value={v.ertekeles} onChange={() => {}} />
                          </div>
                        </header>

                        <p>{v.szoveg}</p>

                        {szerkesztheto && (
                          <div className="button-row">
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => kezeliVelemenySzerkesztesInditasa(v)}
                            >
                              Szerkesztés
                            </button>
                            <button
                              type="button"
                              className="btn danger"
                              onClick={() => kezeliVelemenyTorles(v.id)}
                            >
                              Törlés
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Új vélemény írása a modalban */}
              {bejelentkezve ? (
                <form onSubmit={kezeliUjVelemenyKuldesModal} className="card form">
                  <h3>Új vélemény írása</h3>

                  <label>
                    Értékelés (1–5)
                    <CsillagValaszto
                      value={ujVelemenyErtekeles}
                      onChange={(ertek) => beallitUjVelemenyErtekeles(ertek)}
                    />
                  </label>

                  <label>
                    Vélemény szövege
                    <textarea
                      value={ujVelemenySzoveg}
                      onChange={(e) => beallitUjVelemenySzoveg(e.target.value)}
                      rows={4}
                      required
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
          </div>
        </div>
      )}
    </section>
  );
}

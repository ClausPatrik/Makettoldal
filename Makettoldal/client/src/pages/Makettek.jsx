import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdat } from "../context/AdatContext";
import { useAuth } from "../context/AuthContext";

// Egyszerű csillagválasztó komponens értékeléshez
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
  const {
    makettek,
    velemenyek,
    betoltAlapAdatok,
    szamolAtlagErtekeles,
    hozzaadVelemeny,
    modositVelemeny,
    torolVelemeny,
    kedvencek,
    betoltKedvencek,
    hozzaadKedvenc,
    torolKedvenc,
    betoltesFolyamatban,
    hiba,
  } = useAdat();

  const { bejelentkezve, felhasznalo } = useAuth();

  // Szűrők
  const [kategoriaSzuro, beallitKategoriaSzuro] = useState("osszes");
  const [skalaSzuro, beallitSkalaSzuro] = useState("osszes");
  const [kereses, beallitKereses] = useState("");
  const [minAtlagErtekeles, beallitMinAtlagErtekeles] = useState(0);
  const [rendezes, beallitRendezes] = useState("nev");

  // Vélemények / kedvencek UI state
  const [kivalasztottMakettId, beallitKivalasztottMakettId] = useState(null);

  const [ujVelemenySzoveg, beallitUjVelemenySzoveg] = useState("");
  const [ujVelemenyErtekeles, beallitUjVelemenyErtekeles] = useState(5);

  const [szerkesztettVelemenyId, beallitSzerkesztettVelemenyId] =
    useState(null);
  const [szerkesztettSzoveg, beallitSzerkesztettSzoveg] = useState("");
  const [szerkesztettErtekeles, beallitSzerkesztettErtekeles] = useState(5);

  const isAdmin = felhasznalo?.szerepkor_id === 2;

  // Betöltés első rendernél
  useEffect(() => {
    betoltAlapAdatok();
  }, [betoltAlapAdatok]);

  useEffect(() => {
    if (bejelentkezve) {
      betoltKedvencek();
    }
  }, [bejelentkezve, betoltKedvencek]);

  // Makettek szűrése és rendezése
  const szurtMakettek = useMemo(() => {
    let lista = [...(makettek || [])];

    if (kategoriaSzuro !== "osszes") {
      lista = lista.filter((m) => m.kategoria === kategoriaSzuro);
    }

    if (skalaSzuro !== "osszes") {
      lista = lista.filter((m) => m.skala === skalaSzuro);
    }

    if (kereses.trim() !== "") {
      const q = kereses.trim().toLowerCase();
      lista = lista.filter((m) => {
        const nev = m.nev?.toLowerCase() || "";
        const gyarto = m.gyarto?.toLowerCase() || "";
        return nev.includes(q) || gyarto.includes(q);
      });
    }

    if (minAtlagErtekeles > 0) {
      lista = lista.filter((m) => {
        const atlag = szamolAtlagErtekeles
          ? szamolAtlagErtekeles(m.id) || 0
          : 0;
        return atlag >= minAtlagErtekeles;
      });
    }

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

  // Egy maketthez tartozó vélemények
  function makettVelemenyek(makettId) {
    return (velemenyek || []).filter((v) => v.makett_id === makettId);
  }

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

  function kezeliMakettValasztas(makettId) {
    if (kivalasztottMakettId === makettId) {
      beallitKivalasztottMakettId(null);
    } else {
      beallitKivalasztottMakettId(makettId);
      beallitUjVelemenySzoveg("");
      beallitUjVelemenyErtekeles(5);
      beallitSzerkesztettVelemenyId(null);
    }
  }

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

  function kezeliVelemenySzerkesztesInditasa(velemeny) {
    beallitSzerkesztettVelemenyId(velemeny.id);
    beallitSzerkesztettSzoveg(velemeny.szoveg || "");
    beallitSzerkesztettErtekeles(velemeny.ertekeles || 5);
  }

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

  async function kezeliVelemenyTorles(velemenyId) {
    if (!window.confirm("Biztosan törlöd ezt a véleményt?")) return;
    try {
      await torolVelemeny(velemenyId);
    } catch (err) {
      console.error("Vélemény törlési hiba:", err);
      alert("Hiba történt a vélemény törlésekor.");
    }
  }

  function velemenySzerzoSajat(velemeny) {
    if (!felhasznalo || !velemeny) return false;
    return (
      velemeny.felhasznalo_id === felhasznalo.id ||
      velemeny.felhasznaloId === felhasznalo.id
    );
  }

  function makettKedvenc(makettId) {
    if (!kedvencek) return false;
    // lehet, hogy ID-k listája vagy objektumok listája
    if (kedvencek.some && typeof kedvencek[0] === "object") {
      return kedvencek.some(
        (k) => k.makett_id === makettId || k.id === makettId
      );
    }
    return kedvencek.includes(makettId);
  }

  async function kezeliKedvencValtas(makettId) {
    if (!bejelentkezve) {
      alert("Kedvencekhez kérlek jelentkezz be.");
      return;
    }
    try {
      if (makettKedvenc(makettId)) {
        await torolKedvenc(makettId);
      } else {
        await hozzaadKedvenc(makettId);
      }
    } catch (err) {
      console.error("Kedvenc váltási hiba:", err);
      alert("Hiba történt a kedvencek módosításakor.");
    }
  }

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
            onChange={(e) =>
              beallitMinAtlagErtekeles(Number(e.target.value))
            }
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
      {hiba && (
        <p className="error">
          Hiba történt az adatok betöltésekor: {hiba}
        </p>
      )}

      {/* Makett lista */}
      <section className="card-grid">
        {szurtMakettek.length === 0 ? (
          <p>Nincsenek a szűrésnek megfelelő makettek.</p>
        ) : (
          szurtMakettek.map((m) => {
            const atlag = szamolAtlagErtekeles
              ? szamolAtlagErtekeles(m.id) || 0
              : 0;
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
                      Nehézség: {m.nehezseg}/5 • Megjelenés éve:{" "}
                      {m.megjelenes_eve}
                    </p>
                  </div>

                  <div className="makett-ertekeles">
                    <CsillagValaszto value={atlag} onChange={() => {}} />
                    <p className="small">
                      Átlag: {atlag.toFixed(1)} ({velemenyLista.length} vélemény)
                    </p>
                  </div>
                </div>

                {m.kep_url && (
                  <div className="makett-kep-wrapper">
                    <img
                      src={m.kep_url}
                      alt={m.nev}
                      className="makett-kep"
                    />
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
                                        beallitSzerkesztettSzoveg(
                                          e.target.value
                                        )
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
                                      onClick={() =>
                                        beallitSzerkesztettVelemenyId(null)
                                      }
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
                                  <p className="small">
                                    {formatDatum(v.letrehozva)}
                                  </p>
                                </div>
                                <div>
                                  <CsillagValaszto
                                    value={v.ertekeles}
                                    onChange={() => {}}
                                  />
                                </div>
                              </header>

                              <p>{v.szoveg}</p>

                              {szerkesztheto && (
                                <div className="button-row">
                                  <button
                                    type="button"
                                    className="btn secondary"
                                    onClick={() =>
                                      kezeliVelemenySzerkesztesInditasa(v)
                                    }
                                  >
                                    Szerkesztés
                                  </button>
                                  <button
                                    type="button"
                                    className="btn danger"
                                    onClick={() =>
                                      kezeliVelemenyTorles(v.id)
                                    }
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
                      <form
                        onSubmit={kezeliUjVelemenyKuldes}
                        className="card form"
                      >
                        <h3>Új vélemény írása</h3>

                        <label>
                          Értékelés (1–5)
                          <CsillagValaszto
                            value={ujVelemenyErtekeles}
                            onChange={(ertek) =>
                              beallitUjVelemenyErtekeles(ertek)
                            }
                          />
                        </label>

                        <label>
                          Vélemény szövege
                          <textarea
                            value={ujVelemenySzoveg}
                            onChange={(e) =>
                              beallitUjVelemenySzoveg(e.target.value)
                            }
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
                        Vélemény írásához{" "}
                        <Link to="/bejelentkezes">jelentkezz be</Link>.
                      </p>
                    )}
                  </section>
                )}
              </article>
            );
          })
        )}
      </section>
    </section>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdat } from "../context/AdatContext";
import { useAuth } from "../context/AuthContext";

function Csillagok({ ertek }) {
  const teljes = Math.round(ertek || 0);
  return (
    <span>
      {Array.from({ length: 5 }).map((_, idx) => (
        <span key={idx}>{idx < teljes ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

export default function Makettek() {
  const {
    makettek,
    velemenyek,
    kedvencek,
    betoltesFolyamatban,
    hiba,
    szamolAtlagErtekeles,
    hozzaadVelemeny,
    modositVelemeny,
    torolVelemeny,
    betoltKedvencek,
    valtKedvenc,
  } = useAdat();

  const { felhasznalo, bejelentkezve } = useAuth();
  const admin = felhasznalo?.szerepkor_id === 2;

  const [kategoriaSzuro, beallitKategoriaSzuro] = useState("osszes");
  const [kereses, beallitKereses] = useState("");
  const [rendezes, beallitRendezes] = useState("nev");
  const [kivalasztottMakettId, beallitKivalasztottMakettId] = useState(null);

  const [ujVelemenySzoveg, beallitUjVelemenySzoveg] = useState("");
  const [ujVelemenyErtekeles, beallitUjVelemenyErtekeles] = useState(5);

  const [szerkesztettVelemenyId, beallitSzerkesztettVelemenyId] = useState(null);
  const [szerkesztettSzoveg, beallitSzerkesztettSzoveg] = useState("");
  const [szerkesztettErtekeles, beallitSzerkesztettErtekeles] = useState(5);

  const [szerkesztettMakett, beallitSzerkesztettMakett] = useState(null);

  useEffect(() => {
    if (bejelentkezve) {
      betoltKedvencek();
    }
  }, [bejelentkezve, betoltKedvencek]);

  const szurtMakettek = useMemo(() => {
    let lista = [...makettek];

    if (kategoriaSzuro !== "osszes") {
      lista = lista.filter((m) => m.kategoria === kategoriaSzuro);
    }

    if (kereses.trim() !== "") {
      const q = kereses.trim().toLowerCase();
      lista = lista.filter(
        (m) =>
          m.nev.toLowerCase().includes(q) ||
          m.gyarto.toLowerCase().includes(q)
      );
    }

    lista.sort((a, b) => {
      if (rendezes === "nev") {
        return a.nev.localeCompare(b.nev);
      }
      if (rendezes === "ev") {
        return (b.megjelenes_eve || 0) - (a.megjelenes_eve || 0);
      }
      if (rendezes === "ertekeles") {
        const aAtlag = szamolAtlagErtekeles(a.id) || 0;
        const bAtlag = szamolAtlagErtekeles(b.id) || 0;
        return bAtlag - aAtlag;
      }
      return 0;
    });

    return lista;
  }, [makettek, kategoriaSzuro, kereses, rendezes, szamolAtlagErtekeles]);

  const aktivMakett =
    kivalasztottMakettId != null
      ? makettek.find((m) => m.id === kivalasztottMakettId)
      : null;

  const aktivMakettVelemenyek = useMemo(
    () =>
      velemenyek.filter(
        (v) => v.makett_id === kivalasztottMakettId
      ),
    [velemenyek, kivalasztottMakettId]
  );

  function kezeliMegnyitVelemenyek(makettId) {
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
      alert(err.message);
    }
  }

  function kezeliVelemenySzerkesztesInditasa(velemeny) {
    beallitSzerkesztettVelemenyId(velemeny.id);
    beallitSzerkesztettSzoveg(velemeny.szoveg);
    beallitSzerkesztettErtekeles(velemeny.ertekeles);
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
      alert(err.message);
    }
  }

  async function kezeliVelemenyTorles(velemenyId) {
    if (!window.confirm("Biztosan törlöd a véleményt?")) return;
    try {
      await torolVelemeny(velemenyId);
    } catch (err) {
      alert(err.message);
    }
  }

  async function kezeliKedvencValtas(makettId) {
    try {
      await valtKedvenc(makettId);
    } catch (err) {
      alert(err.message);
    }
  }

  function kezeliMakettSzerkesztesInditasa(makett) {
    beallitSzerkesztettMakett(
      makett || {
        id: null,
        nev: "",
        gyarto: "",
        kategoria: "harckocsi",
        skala: "1:35",
        nehezseg: 3,
        megjelenes_eve: new Date().getFullYear(),
        kep_url: "",
      }
    );
  }

  async function kezeliMakettMentese(e) {
    e.preventDefault();
    if (!szerkesztettMakett) return;

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Csak bejelentkezett admin szerkeszthet maketteket.");
      return;
    }

    const {
      id,
      nev,
      gyarto,
      kategoria,
      skala,
      nehezseg,
      megjelenes_eve,
      kep_url,
    } = szerkesztettMakett;

    const payload = {
      nev,
      gyarto,
      kategoria,
      skala,
      nehezseg: Number(nehezseg),
      megjelenes_eve: Number(megjelenes_eve),
      kep_url: kep_url || null,
    };

    const url = id
      ? `http://localhost:3001/api/makettek/${id}`
      : "http://localhost:3001/api/makettek";
    const method = id ? "PUT" : "POST";

    const valasz = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!valasz.ok) {
      const hiba = await valasz.json().catch(() => ({}));
      alert(hiba.uzenet || "Hiba a makett mentése során.");
      return;
    }

    await valasz.json().catch(() => null);
    window.location.reload();
  }

  return (
    <section className="page">
      <h1>Makettek</h1>

      {hiba && <p className="error">{hiba}</p>}
      {betoltesFolyamatban && <p>Betöltés folyamatban...</p>}

      <div className="filters">
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

      {admin && (
        <div className="admin-section">
          <h2>Admin – makett felvétele / szerkesztése</h2>
          <button onClick={() => kezeliMakettSzerkesztesInditasa(null)}>
            Új makett
          </button>
          {szerkesztettMakett && (
            <form onSubmit={kezeliMakettMentese} className="card form">
              <label>
                Név
                <input
                  type="text"
                  value={szerkesztettMakett.nev}
                  onChange={(e) =>
                    beallitSzerkesztettMakett((m) => ({
                      ...m,
                      nev: e.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                Gyártó
                <input
                  type="text"
                  value={szerkesztettMakett.gyarto}
                  onChange={(e) =>
                    beallitSzerkesztettMakett((m) => ({
                      ...m,
                      gyarto: e.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                Kategória
                <select
                  value={szerkesztettMakett.kategoria}
                  onChange={(e) =>
                    beallitSzerkesztettMakett((m) => ({
                      ...m,
                      kategoria: e.target.value,
                    }))
                  }
                >
                  <option value="harckocsi">Harckocsi</option>
                  <option value="repülő">Repülő</option>
                  <option value="hajó">Hajó</option>
                </select>
              </label>
              <label>
                Skála
                <input
                  type="text"
                  value={szerkesztettMakett.skala}
                  onChange={(e) =>
                    beallitSzerkesztettMakett((m) => ({
                      ...m,
                      skala: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Nehézség (1–5)
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={szerkesztettMakett.nehezseg}
                  onChange={(e) =>
                    beallitSzerkesztettMakett((m) => ({
                      ...m,
                      nehezseg: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Megjelenés éve
                <input
                  type="number"
                  value={szerkesztettMakett.megjelenes_eve}
                  onChange={(e) =>
                    beallitSzerkesztettMakett((m) => ({
                      ...m,
                      megjelenes_eve: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Kép URL
                <input
                  type="url"
                  value={szerkesztettMakett.kep_url}
                  onChange={(e) =>
                    beallitSzerkesztettMakett((m) => ({
                      ...m,
                      kep_url: e.target.value,
                    }))
                  }
                />
              </label>
              <button type="submit">Makett mentése</button>
            </form>
          )}
        </div>
      )}

      <div className="grid">
        {szurtMakettek.map((m) => {
          const atlag = szamolAtlagErtekeles(m.id);
          const kedvenc = kedvencek.includes(m.id);
          return (
            <article key={m.id} className="card">
              <header className="card-header">
                <h2>{m.nev}</h2>
                {bejelentkezve && (
                  <button
                    className={kedvenc ? "fav-btn active" : "fav-btn"}
                    type="button"
                    onClick={() => kezeliKedvencValtas(m.id)}
                    title={
                      kedvenc
                        ? "Eltávolítás a kedvencek közül"
                        : "Hozzáadás a kedvencekhez"
                    }
                  >
                    {kedvenc ? "❤️" : "🤍"}
                  </button>
                )}
              </header>
              <p>
                <strong>Gyártó:</strong> {m.gyarto}
              </p>
              <p>
                <strong>Kategória:</strong> {m.kategoria} –{" "}
                <strong>Skála:</strong> {m.skala}
              </p>
              <p>
                <strong>Nehézség:</strong> {m.nehezseg} / 5
              </p>
              <p>
                <strong>Megjelenés éve:</strong> {m.megjelenes_eve}
              </p>
              <p>
                <strong>Átlagértékelés:</strong>{" "}
                {atlag ? (
                  <>
                    {atlag.toFixed(1)} <Csillagok ertek={atlag} />
                  </>
                ) : (
                  "még nincs értékelés"
                )}
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => kezeliMegnyitVelemenyek(m.id)}
              >
                Vélemények megtekintése
              </button>
              {admin && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => kezeliMakettSzerkesztesInditasa(m)}
                >
                  Makett szerkesztése
                </button>
              )}
            </article>
          );
        })}
      </div>

      {aktivMakett && (
        <section className="velemeny-panel">
          <h2>{aktivMakett.nev} – vélemények</h2>

          <div className="velemeny-lista">
            {aktivMakettVelemenyek.length === 0 ? (
              <p>Még nem érkezett vélemény ehhez a maketthez.</p>
            ) : (
              aktivMakettVelemenyek.map((v) => {
                const sajat =
                  felhasznalo &&
                  (v.felhasznalo_id === felhasznalo.id || admin);
                const datum = v.letrehozva
                  ? new Date(v.letrehozva).toLocaleString("hu-HU")
                  : "";

                if (szerkesztettVelemenyId === v.id) {
                  return (
                    <form
                      key={v.id}
                      onSubmit={kezeliVelemenySzerkesztesKuldes}
                      className="card form"
                    >
                      <h3>Vélemény szerkesztése</h3>
                      <label>
                        Szöveg
                        <textarea
                          value={szerkesztettSzoveg}
                          onChange={(e) =>
                            beallitSzerkesztettSzoveg(e.target.value)
                          }
                          required
                        />
                      </label>
                      <label>
                        Értékelés (1–5)
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={szerkesztettErtekeles}
                          onChange={(e) =>
                            beallitSzerkesztettErtekeles(e.target.value)
                          }
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
                  );
                }

                return (
                  <article key={v.id} className="card">
                    <header className="card-header">
                      <strong>{v.felhasznalo_nev}</strong>
                      <span>
                        {v.ertekeles} / 5 <Csillagok ertek={v.ertekeles} />
                      </span>
                    </header>
                    <p>{v.szoveg}</p>
                    <small>{datum}</small>
                    {sajat && (
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
                  </article>
                );
              })
            )}
          </div>

          {bejelentkezve ? (
            <form onSubmit={kezeliUjVelemenyKuldes} className="card form">
              <h3>Új vélemény írása</h3>
              <label>
                Szöveg
                <textarea
                  value={ujVelemenySzoveg}
                  onChange={(e) => beallitUjVelemenySzoveg(e.target.value)}
                  required
                />
              </label>
              <label>
                Értékelés (1–5)
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={ujVelemenyErtekeles}
                  onChange={(e) =>
                    beallitUjVelemenyErtekeles(e.target.value)
                  }
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
    </section>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useAdat } from "../context/AdatContext";

import CsillagValaszto from "../components/CsillagValaszto";
import MakettModal from "../components/MakettModal";

const API_BASE_URL = "http://localhost:3001/api";

function allapotCimke(allapot) {
  if (allapot === "jovahagyva") return { txt: "Jóváhagyva", cls: "status-ok" };
  if (allapot === "varakozik") return { txt: "Jóváhagyásra vár", cls: "status-warn" };
  if (allapot === "elutasitva") return { txt: "Elutasítva", cls: "status-bad" };
  return { txt: allapot || "ismeretlen", cls: "status" };
}

export default function Makettjeim() {
  const { bejelentkezve, felhasznalo } = useAuth();
  const {
    velemenyek,
    szamolAtlagErtekeles,
    hozzaadVelemeny,
    modositVelemeny,
    torolVelemeny,
  } = useAdat();

  const isAdmin = felhasznalo?.szerepkor_id === 2;

  const authHeader = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [bejelentkezve]);

  const [makettek, setMakettek] = useState([]);
  const [betolt, setBetolt] = useState(false);
  const [hiba, setHiba] = useState(null);
  const [uzenet, setUzenet] = useState(null);

  // Makett megtekintés modal
  const [modalMakett, setModalMakett] = useState(null);

  const [szerkOpen, setSzerkOpen] = useState(false);
  const [szerk, setSzerk] = useState(null);
  const [mentesFut, setMentesFut] = useState(false);

  async function betoltes() {
    if (!bejelentkezve) return;
    setBetolt(false);
    setHiba(null);
    try {
      const r = await fetch(`${API_BASE_URL}/sajat/makettek`, {
        headers: { ...authHeader },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.uzenet || "Hiba a lekérdezésnél.");
      setMakettek(Array.isArray(data) ? data : []);
    } catch (e) {
      setHiba(e.message);
    } finally {
      setBetolt(true);
    }
  }

  useEffect(() => {
    betoltes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bejelentkezve]);

  function nyitSzerkesztes(m) {
    setUzenet(null);
    setHiba(null);
    setSzerk({
      id: m.id,
      nev: m.nev || "",
      gyarto: m.gyarto || "",
      kategoria: m.kategoria || "",
      skala: m.skala || "",
      nehezseg: Number(m.nehezseg || 1),
      megjelenes_eve: Number(m.megjelenes_eve || 2000),
      kep_url: m.kep_url || "",
      vasarlasi_link: m.vasarlasi_link || "",
      leiras: m.leiras || "",
    });
    setSzerkOpen(true);
  }

  async function mentes(e) {
    e?.preventDefault?.();
    if (!szerk?.id) return;

    setMentesFut(true);
    setUzenet(null);
    setHiba(null);
    try {
      const r = await fetch(`${API_BASE_URL}/sajat/makettek/${szerk.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          nev: szerk.nev,
          gyarto: szerk.gyarto,
          kategoria: szerk.kategoria,
          skala: szerk.skala,
          nehezseg: Number(szerk.nehezseg),
          megjelenes_eve: Number(szerk.megjelenes_eve),
          kep_url: szerk.kep_url || null,
          leiras: szerk.leiras || null,
          vasarlasi_link: szerk.vasarlasi_link || null,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.uzenet || "Hiba mentés közben.");

      // nagyon fontos: tájékoztatás, hogy újra jóvá kell hagyatni
      setUzenet(data?.uzenet || "Makett módosítva (jóváhagyásra visszakerült). ");

      setSzerkOpen(false);
      setSzerk(null);
      await betoltes();
    } catch (e2) {
      setHiba(e2.message);
    } finally {
      setMentesFut(false);
    }
  }

  async function torles(m) {
    const ok = window.confirm(`Biztosan törlöd?\n\n${m.nev}`);
    if (!ok) return;

    setUzenet(null);
    setHiba(null);
    try {
      const r = await fetch(`${API_BASE_URL}/makettek/${m.id}`, {
        method: "DELETE",
        headers: { ...authHeader },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.uzenet || "Hiba törlés közben.");
      setUzenet("Makett törölve.");
      await betoltes();
    } catch (e) {
      setHiba(e.message);
    }
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

  function makettVelemenyek(makettId) {
    return (velemenyek || []).filter((v) => Number(v.makett_id) === Number(makettId));
  }

  async function adminMakettUpdate(id, payload) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE_URL}/makettek/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const h = await res.json().catch(() => ({}));
      throw new Error(h.uzenet || "Nem sikerült menteni a makettet.");
    }
    return await res.json();
  }

  async function adminMakettDelete(id) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE_URL}/makettek/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const h = await res.json().catch(() => ({}));
      throw new Error(h.uzenet || "Nem sikerült törölni a makettet.");
    }
    return await res.json().catch(() => ({}));
  }

  if (!bejelentkezve) {
    return (
      <section className="container">
        <h1 className="page-title">Makettjeim</h1>
        <div className="card">
          <p>Ehhez be kell jelentkezned.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="container">
      <h1 className="page-title">Makettjeim</h1>

      <div className="card" style={{ marginBottom: 12 }}>
        <p className="small" style={{ margin: 0 }}>
          Itt a <b>saját beküldött</b> makettjeidet látod. Ha módosítasz egy már jóváhagyott makettet,
          akkor a rendszer <b>automatikusan visszateszi jóváhagyásra</b>.
        </p>
      </div>

      {uzenet && <div className="alert ok">{uzenet}</div>}
      {hiba && <div className="alert bad">{hiba}</div>}

      {!betolt ? (
        <div className="card">Betöltés...</div>
      ) : makettek.length === 0 ? (
        <div className="card">Még nincs saját maketted.</div>
      ) : (
        <div className="card-grid card-grid-fixed">
          {makettek.map((m) => {
            const st = allapotCimke(m.allapot);
            const atlag = szamolAtlagErtekeles ? szamolAtlagErtekeles(m.id) || 0 : 0;
            const vList = makettVelemenyek(m.id);
            return (
              <article key={m.id} className="card makett-card">
               <div className="makett-fejlec">
  <div>
    <h2 className="makett-nev" title={m.nev}>
      {m.nev}
    </h2>
    <p className="small">
      {m.gyarto} • {m.skala} • {m.kategoria}
    </p>
    <p className="small">
      Nehézség: {m.nehezseg}/5 • Megjelenés éve: {m.megjelenes_eve}
    </p>
    {/* IDE kerül át a csillag + átlag + státusz */}
    <div className="makett-bal-meta">
      <div className="makett-ertekeles">
        <CsillagValaszto value={atlag} readOnly />
        <br />
        <span className="small">
          Átlag: {Number(atlag).toFixed(1)} ({vList.length} vélemény)
          
        </span>
      </div>
      <br />
      <div className={`status-pill ${st.cls}`}>{st.txt}</div>
    </div>

    
  </div>
</div>

                {m.kep_url && (
                  <div
                    className="makett-kep-wrapper"
                    onClick={() => setModalMakett(m)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setModalMakett(m);
                    }}
                  >
                    <img src={m.kep_url} alt={m.nev} className="makett-kep" />
                  </div>
                )}

                <div className="button-row">
                  <button className="btn secondary" onClick={() => setModalMakett(m)}>
                    Megtekintés
                  </button>
                  <button className="btn" onClick={() => nyitSzerkesztes(m)}>
                    Szerkesztés
                  </button>
                  <button className="btn danger" onClick={() => torles(m)}>
                    Törlés
                  </button>
                </div>

                {m.allapot === "elutasitva" && m.elutasitas_ok ? (
                  <p className="small" style={{ marginTop: 8 }}>
                    <b>Elutasítás oka:</b> {m.elutasitas_ok}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {/* Makett modal (vélemények csak jóváhagyottnál, építési napló létrehozás tiltás nem jóváhagyottnál) */}
      {modalMakett && (
        <MakettModal
          open={!!modalMakett}
          makett={modalMakett}
          onClose={() => setModalMakett(null)}
          atlag={szamolAtlagErtekeles ? szamolAtlagErtekeles(modalMakett.id) || 0 : 0}
          velemenyek={makettVelemenyek(modalMakett.id)}
          showReviews={modalMakett.allapot === "jovahagyva"}
          bejelentkezve={bejelentkezve}
          felhasznalo={felhasznalo}
          isAdmin={isAdmin}
          formatDatum={formatDatum}
          hozzaadVelemeny={hozzaadVelemeny}
          modositVelemeny={modositVelemeny}
          torolVelemeny={torolVelemeny}
          // kedvencek itt nem fontos, de a komponens várja
          kedvenc={false}
          onToggleKedvenc={() => {}}
          onAdminUpdate={isAdmin ? adminMakettUpdate : null}
          onAdminDelete={isAdmin ? adminMakettDelete : null}
          allowNaploCreate={modalMakett.allapot === "jovahagyva"}
        />
      )}

      {/* Szerkesztő modal */}
      {szerkOpen && szerk && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-head">
              <h2>Saját makett szerkesztése</h2>
              <button className="icon-btn" onClick={() => setSzerkOpen(false)} aria-label="Bezárás">
                ✕
              </button>
            </div>

            <div className="alert warn" style={{ marginTop: 0 }}>
              <b>Fontos:</b> Mentés után a makett <b>jóváhagyásra visszakerül</b>, és amíg az admin nem hagyja
              jóvá, nem fog megjelenni a publikus Makettek listában.
            </div>

            <form onSubmit={mentes} className="form-grid">
              <label>
                Név
                <input
                  value={szerk.nev}
                  maxLength={50}
                  onChange={(e) => setSzerk((p) => ({ ...p, nev: e.target.value }))}
                  required
                />
              </label>
              <label>
                Gyártó
                <input
                  value={szerk.gyarto}
                  onChange={(e) => setSzerk((p) => ({ ...p, gyarto: e.target.value }))}
                  required
                />
              </label>
              <label>
                Kategória
                <input
                  value={szerk.kategoria}
                  onChange={(e) => setSzerk((p) => ({ ...p, kategoria: e.target.value }))}
                  required
                />
              </label>
              <label>
                Skála
                <input
                  value={szerk.skala}
                  onChange={(e) => setSzerk((p) => ({ ...p, skala: e.target.value }))}
                  required
                />
              </label>
              <label>
                Nehézség (1-5)
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={szerk.nehezseg}
                  onChange={(e) => setSzerk((p) => ({ ...p, nehezseg: e.target.value }))}
                  required
                />
              </label>
              <label>
                Megjelenés éve
                <input
                  type="number"
                  min={1900}
                  max={2100}
                  value={szerk.megjelenes_eve}
                  onChange={(e) => setSzerk((p) => ({ ...p, megjelenes_eve: e.target.value }))}
                  required
                />
              </label>
              <label className="span-2">
                Kép URL
                <input
                  value={szerk.kep_url}
                  onChange={(e) => setSzerk((p) => ({ ...p, kep_url: e.target.value }))}
                  placeholder="https://..."
                />
              </label>
              <label className="span-2">
                Vásárlási link
                <input
                  value={szerk.vasarlasi_link}
                  onChange={(e) => setSzerk((p) => ({ ...p, vasarlasi_link: e.target.value }))}
                  placeholder="https://..."
                />
              </label>
              <label className="span-2">
                Leírás
                <textarea
                  rows={5}
                  value={szerk.leiras}
                  onChange={(e) => setSzerk((p) => ({ ...p, leiras: e.target.value }))}
                />
              </label>

              <div className="button-row span-2" style={{ justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    setSzerkOpen(false);
                    setSzerk(null);
                  }}
                >
                  Mégse
                </button>
                <button type="submit" className="btn" disabled={mentesFut}>
                  {mentesFut ? "Mentés..." : "Mentés"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

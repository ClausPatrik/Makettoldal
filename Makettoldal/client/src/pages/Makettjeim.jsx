import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import MakettModal from "../MakettModal";

const API_BASE_URL = "http://localhost:3001/api";

function allapotCimke(allapot) {
  if (allapot === "jovahagyva") return { txt: "Jóváhagyva", cls: "status-ok" };
  if (allapot === "varakozik") return { txt: "Jóváhagyásra vár", cls: "status-warn" };
  if (allapot === "elutasitva") return { txt: "Elutasítva", cls: "status-bad" };
  return { txt: allapot || "ismeretlen", cls: "status" };
}

export default function Makettjeim() {
  const { bejelentkezve } = useAuth();

  const authHeader = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [bejelentkezve]);

  const [makettek, setMakettek] = useState([]);
  const [betolt, setBetolt] = useState(false);
  const [hiba, setHiba] = useState(null);
  const [uzenet, setUzenet] = useState(null);

  const [szerkOpen, setSzerkOpen] = useState(false);
  const [szerk, setSzerk] = useState(null);
  const [mentesFut, setMentesFut] = useState(false);

  // Megtekintés modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMakett, setModalMakett] = useState(null);

  function nyitMegtekintes(m) {
    setModalMakett(m);
    setModalOpen(true);
  }

  function zarMegtekintes() {
    setModalOpen(false);
    setModalMakett(null);
  }

  const formatDatum = (d) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleString("hu-HU");
    } catch {
      return String(d);
    }
  };

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
                  </div>

                  <div className={`status-pill ${st.cls}`}>{st.txt}</div>
                </div>

                {m.kep_url && (
                  <div
                    className="makett-kep-wrapper"
                    onClick={() => nyitMegtekintes(m)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") nyitMegtekintes(m);
                    }}
                  >
                    <img src={m.kep_url} alt={m.nev} className="makett-kep" />
                  </div>
                )}

                <div className="button-row">
                  <button type="button" className="btn secondary" onClick={() => nyitMegtekintes(m)}>
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

      {/* Megtekintés modal (kép + gomb) */}
      <MakettModal
        open={modalOpen}
        makett={modalMakett}
        onClose={zarMegtekintes}
        // ezen az oldalon elég a megtekintés, nem kell vélemény blokk
        showReviews={false}
        atlag={0}
        velemenyek={[]}
        kedvenc={false}
        bejelentkezve={bejelentkezve}
        felhasznalo={null}
        isAdmin={false}
        formatDatum={formatDatum}
      />

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

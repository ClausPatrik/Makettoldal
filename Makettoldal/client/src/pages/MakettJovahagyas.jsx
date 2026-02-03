import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MakettModal from "../components/MakettModal";

const API = "http://localhost:3001/api";

function fmt(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("hu-HU");
  } catch {
    return String(d);
  }
}

export default function MakettJovahagyas() {
  const { felhasznalo } = useAuth();
  const admin = felhasznalo?.szerepkor_id === 2;

  const [lista, setLista] = useState([]);
  const [hiba, setHiba] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Modal csak gombnyomásra
  const [modalMakett, setModalMakett] = useState(null);

  const token = localStorage.getItem("token");

  const betolt = async () => {
    setHiba("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/makett-javaslatok`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.uzenet || "Hiba a lista betöltésekor.");
      setLista(Array.isArray(data) ? data : []);
    } catch (e) {
      setHiba(e.message || "Hiba.");
      setLista([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admin) betolt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin]);

  // A modalhoz nem kell vélemény / kedvenc itt
  // FONTOS: Hookokat csak feltételek előtt hívunk (különben "Rendered more hooks" hiba lesz).
  const modalAtlag = useMemo(() => 0, []);
  const modalVelemenyek = useMemo(() => [], []);

  if (!felhasznalo) {
    return (
      <div className="page">
        <div className="card">
          <h2>Jóváhagyás</h2>
          <p className="small">Be kell jelentkezned.</p>
          <Link className="btn" to="/bejelentkezes">
            Bejelentkezés
          </Link>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="page">
        <div className="card">
          <h2>Jóváhagyás</h2>
          <div className="notice error">Nincs jogosultságod.</div>
          <Link className="btn secondary" to="/makettek">
            Vissza
          </Link>
        </div>
      </div>
    );
  }

  const jovahagy = async (id) => {
    await fetch(`${API}/admin/makett-javaslatok/${id}/jovahagy`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    betolt();
  };

  const elutasit = async (id) => {
    const ok = prompt("Elutasítás oka (opcionális):") || "";
    await fetch(`${API}/admin/makett-javaslatok/${id}/elutasit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ok }),
    });
    betolt();
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 style={{ marginBottom: 6 }}>Makett javaslatok</h2>
            <span className="small">Várakozó beküldések (admin)</span>
          </div>

          <button className="btn secondary" onClick={betolt} disabled={loading}>
            {loading ? "Frissítés..." : "Frissítés"}
          </button>
        </div>

        {hiba && <div className="notice error">{hiba}</div>}

        {lista.length === 0 ? (
          <div className="notice">
            {loading ? "Betöltés..." : "Nincs várakozó javaslat."}
          </div>
        ) : (
          <section className="card-grid card-grid-fixed">
            {lista.map((m) => (
              <article key={m.id} className="card makett-card approval-card">
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

                    <p className="small approval-meta">
                      Beküldő: <b>{m.bekuldo_nev || "ismeretlen"}</b> • Beküldve: {fmt(m.bekuldve)}
                    </p>
                  </div>

                  <div>
                    <span className="chip chip-wait">várakozik</span>
                  </div>
                </div>

                {/* ✅ Kép csak megjelenítésre (fix magasság), ha nincs: placeholder, hogy ne ugorjon a méret */}
                {m.kep_url ? (
                  <div className="makett-kep-wrapper makett-kep-wrapper--static">
                    <img src={m.kep_url} alt={m.nev} className="makett-kep" />
                  </div>
                ) : (
                  <div className="makett-kep-placeholder">Nincs kép</div>
                )}

                {/* ✅ Gombnyomásra modal, és előtte legyen a megtekintés */}
                <div className="button-row">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setModalMakett(m)}
                  >
                    Megtekintés
                  </button>

                  <button className="btn" onClick={() => jovahagy(m.id)}>
                    Jóváhagy
                  </button>

                  <button className="btn danger" onClick={() => elutasit(m.id)}>
                    Elutasít
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      {/* ✅ Modal gombnyomásra */}
      <MakettModal
        open={Boolean(modalMakett)}
        makett={modalMakett}
        onClose={() => setModalMakett(null)}
        atlag={modalAtlag}
        velemenyek={modalVelemenyek}
        kedvenc={false}
        onToggleKedvenc={() => {}}
        showReviews={false}
        bejelentkezve={true}
        felhasznalo={felhasznalo}
        isAdmin={false}         // ✅ itt ne admin-szerkesztős modal legyen
        formatDatum={fmt}
      />
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MakettModal from "../components/MakettModal";

/**
 * Backend API bázis URL.
 * Megjegyzés: lokális fejlesztés; éles környezetben jellemzően env-ből jön.
 */
const API = "http://localhost:3001/api";

/**
 * Backend root URL:
 * - a képekhez visszakapott relatív útvonalak feloldásához használjuk
 * - az API végéről levágjuk a /api részt
 */
const BACKEND_BASE_URL = API.replace(/\/api\/?$/, "");

/**
 * Dátum/idő formázás admin listához (hu-HU).
 * Hibás input esetén fallback-kel tér vissza.
 */
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

  // Admin jogosultság jelző (szerepkör azonosító alapján)
  const admin = felhasznalo?.szerepkor_id === 2;

  // Várakozó makett-javaslatok listája + UI állapotok
  const [lista, setLista] = useState([]);
  const [hiba, setHiba] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Modal: csak gombnyomásra nyitjuk meg.
   * A kiválasztott javaslat objektumát tároljuk; null esetén zárva.
   */
  const [modalMakett, setModalMakett] = useState(null);

  /**
   * Admin lista betöltése (GET /admin/makett-javaslatok).
   * - tokenes auth header
   * - hiba esetén userbarát üzenet + üres lista
   */
  const betolt = async () => {
    setHiba("");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

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
    // Megjegyzés: a lint figyelmeztetés itt tudatosan van tiltva,
    // hogy a betöltés csak admin státusz változásakor fusson újra.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin]);

  /**
   * A MakettModal-hoz ebben a nézetben nem kell vélemény/kedvenc funkció,
   * ezért stabil (memózott) üres értékeket adunk át.
   *
   * Megjegyzés: a comment eredeti értelme helyes annyiban, hogy a hookokat
   * top-szinten, feltételes returnök ELŐTT kell meghívni. Itt ezt betartjuk.
   */
  const modalAtlag = useMemo(() => 0, []);
  const modalVelemenyek = useMemo(() => [], []);

  // Auth guard: csak bejelentkezve érhető el az oldal
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

  // Jogosultság guard: csak admin láthatja a jóváhagyási listát
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

  /**
   * Jóváhagyás (POST /admin/makett-javaslatok/:id/jovahagy).
   * Megjegyzés: itt nem kezeljük külön a hibát; a következő `betolt()` újra szinkronizálja a listát.
   */
  const jovahagy = async (id) => {
    const token = localStorage.getItem("token");
    await fetch(`${API}/admin/makett-javaslatok/${id}/jovahagy`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    betolt();
  };

  /**
   * Elutasítás (POST /admin/makett-javaslatok/:id/elutasit).
   * - opcionális indok promptból
   * - a body JSON-ben megy át (ok mező)
   */
  const elutasit = async (id) => {
    const ok = prompt("Elutasítás oka (opcionális):") || "";
    const token = localStorage.getItem("token");

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
            {lista.map((m) => {
              /**
               * Kép forrás feloldása:
               * - ha a `kep_url` relatív (nem http/https), eléfűzzük a backend root-ot
               * - ha teljes URL, változatlanul használjuk
               */
              const kepSrc =
                m?.kep_url && !String(m.kep_url).startsWith("http")
                  ? `${BACKEND_BASE_URL}${m.kep_url}`
                  : m?.kep_url;

              return (
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
                        Beküldő: <b>{m.bekuldo_nev || "ismeretlen"}</b> • Beküldve:{" "}
                        {fmt(m.bekuldve)}
                      </p>
                    </div>

                    <div>
                      <span className="chip chip-wait">várakozik</span>
                    </div>
                  </div>

                  {/* Kép fix magassággal: stabil kártya layout (ne “ugorjon” a grid) */}
                  {m.kep_url ? (
                    <div className="makett-kep-wrapper makett-kep-wrapper--static">
                      <img src={kepSrc} alt={m.nev} className="makett-kep" />
                    </div>
                  ) : (
                    <div className="makett-kep-placeholder">Nincs kép</div>
                  )}

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
              );
            })}
          </section>
        )}
      </div>

      {/* Modal: csak megtekintés (nincs vélemény, nincs kedvenc, nincs admin-szerkesztés ebben a nézetben) */}
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
        isAdmin={false} 
        formatDatum={fmt}
      />
    </div>

  );
}
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:3001/api";

function fmt(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

function roleLabel(roleId) {
  if (roleId === 2) return "ADMIN";
  if (roleId === 3) return "MODERÁTOR";
  return "FELHASZNÁLÓ";
}

export default function AdminFelhasznalok() {
  const { felhasznalo } = useAuth();
  const admin = felhasznalo?.szerepkor_id === 2;

  const [lista, setLista] = useState([]);
  const [hiba, setHiba] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const betolt = async () => {
    setHiba("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/felhasznalok`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.uzenet || "Hiba a felhasználók betöltésekor.");
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

  if (!felhasznalo) {
    return (
      <section className="page">
        <div className="card">
          <h2>Felhasználók (admin)</h2>
          <p className="small">Be kell jelentkezned.</p>
          <Link className="btn" to="/bejelentkezes">Bejelentkezés</Link>
        </div>
      </section>
    );
  }

  if (!admin) {
    return (
      <section className="page">
        <div className="card">
          <h2>Felhasználók (admin)</h2>
          <p className="error">Nincs jogosultságod.</p>
          <Link className="btn" to="/">Vissza</Link>
        </div>
      </section>
    );
  }

  const setSzerepkor = async (id, szerepkor_id) => {
    await fetch(`${API}/admin/felhasznalok/${id}/szerepkor`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ szerepkor_id }),
    });
    betolt();
  };

  const tiltFel = async (id) => {
    await fetch(`${API}/admin/felhasznalok/${id}/tiltas`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tiltva: "nincs" }),
    });
    betolt();
  };

  const veglegesTilt = async (id) => {
    const ok = prompt("Tiltás oka (opcionális):") || "";
    await fetch(`${API}/admin/felhasznalok/${id}/tiltas`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tiltva: "vegleges", tilt_ok: ok }),
    });
    betolt();
  };

  const ideiglenesTilt = async (id) => {
    const ok = prompt("Tiltás oka (opcionális):") || "";
    const meddig = prompt("Ideiglenes tiltás eddig (pl. 2026-02-01 12:00):");
    if (!meddig) return;
    const iso = meddig.includes("T") ? meddig : meddig.replace(" ", "T");

    await fetch(`${API}/admin/felhasznalok/${id}/tiltas`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tiltva: "ideiglenes", tilt_eddig: iso, tilt_ok: ok }),
    });
    betolt();
  };

  return (
    <section className="page">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h2 style={{ marginBottom: 6 }}>Felhasználók kezelése</h2>
            <span className="small">Tiltás (ideiglenes/végleges) + Moderátor rang</span>
          </div>
          <button className="btn" onClick={betolt} disabled={loading}>
            {loading ? "Frissítés..." : "Frissítés"}
          </button>
        </div>

        {hiba && <p className="error" style={{ marginTop: 12 }}>{hiba}</p>}

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {lista.map((u) => (
            <div className="card" key={u.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{u.felhasznalo_nev}</h3>
                  <div className="small">{u.email}</div>
                </div>
                <div className="small"><b>{roleLabel(u.szerepkor_id)}</b></div>
              </div>

              <div className="small" style={{ marginTop: 8 }}>
                Tiltás: <b>{u.tiltva === "nincs" || !u.tiltva ? "NINCS" : u.tiltva === "ideiglenes" ? "IDEIGLENES" : "VÉGLEGES"}</b><br />
                Meddig: {u.tiltva === "ideiglenes" ? fmt(u.tilt_eddig) : "—"}<br />
                Ok: {u.tilt_ok || "—"}
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {u.szerepkor_id === 3 ? (
                  <button className="btn" onClick={() => setSzerepkor(u.id, 1)}>Moderátor elvétel</button>
                ) : (
                  <button className="btn" onClick={() => setSzerepkor(u.id, 3)}>Moderátor adás</button>
                )}

                <button className="btn" onClick={() => veglegesTilt(u.id)}>Végleges tiltás</button>
                <button className="btn" onClick={() => ideiglenesTilt(u.id)}>Ideiglenes tiltás</button>
                <button className="btn" onClick={() => tiltFel(u.id)}>Feloldás</button>
              </div>
            </div>
          ))}

          {lista.length === 0 && !loading && <p className="small">Nincs adat.</p>}
        </div>
      </div>
    </section>
  );
}

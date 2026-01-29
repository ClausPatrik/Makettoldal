import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:3001/api";
const FILE_BASE = "http://localhost:3001";

function fmt(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

function normalizalKep(url) {
  if (!url) return "";
  if (url.startsWith("/uploads/")) return FILE_BASE + url;
  return url;
}

function roleLabel(roleId) {
  if (roleId === 2) return "ADMIN";
  if (roleId === 3) return "MODERÁTOR";
  return "FELHASZNÁLÓ";
}

function AvatarMini({ url, nev }) {
  const src = normalizalKep(url);
  if (src) {
    return <img className="admin-avatar" src={src} alt="profil" />;
  }

  const betu = (nev || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="admin-avatar admin-avatar-fallback" title="Nincs profilkép">
      {betu}
    </div>
  );
}

export default function AdminFelhasznalok() {
  const { felhasznalo } = useAuth();
  const token = felhasznalo?.token || "";
  const admin = felhasznalo?.szerepkor_id === 2;

  const [lista, setLista] = useState([]);
  const [hiba, setHiba] = useState("");
  const [loading, setLoading] = useState(false);

  const [kereses, setKereses] = useState("");

  // Tiltás szerkesztés UI (felhasználónként)
  const [tiltForm, setTiltForm] = useState({}); // { [id]: { tiltva, tilt_eddig, tilt_ok } }
  const [mentesFut, setMentesFut] = useState({}); // { [id]: boolean }

  // Aktivitás panel
  const [aktivitasok, setAktivitasok] = useState([]);
  const [aktivFelhasznaloId, setAktivFelhasznaloId] = useState(null);
  const [aktivitasBetolt, setAktivitasBetolt] = useState(false);

  function toDateTimeLocal(d) {
    try {
      const dt = new Date(d);
      const pad = (n) => String(n).padStart(2, "0");
      return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(
        dt.getHours()
      )}:${pad(dt.getMinutes())}`;
    } catch {
      return "";
    }
  }

  const betoltLista = async () => {
    setHiba("");
    setLoading(true);
    try {
      if (!token) throw new Error("Nincs token. Jelentkezz be újra.");

      const res = await fetch(`${API}/admin/felhasznalok`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.uzenet || "Hiba a felhasználók lekérésénél.");

      setLista(Array.isArray(data) ? data : []);

      // alap tiltForm feltöltés
      const init = {};
      (Array.isArray(data) ? data : []).forEach((u) => {
        init[u.id] = {
          tiltva: u.tiltva || "nincs",
          tilt_eddig: u.tilt_eddig ? toDateTimeLocal(u.tilt_eddig) : "",
          tilt_ok: u.tilt_ok || "",
        };
      });
      setTiltForm(init);
    } catch (e) {
      setHiba(e.message || "Hiba.");
      setLista([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admin) betoltLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin]);

  const szurt = useMemo(() => {
    const q = (kereses || "").trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((u) => {
      const n = (u.felhasznalo_nev || "").toLowerCase();
      const e = (u.email || "").toLowerCase();
      return n.includes(q) || e.includes(q) || String(u.id).includes(q);
    });
  }, [lista, kereses]);

  const betoltAktivitas = async (id) => {
    try {
      setAktivFelhasznaloId(id);
      setAktivitasBetolt(true);
      setAktivitasok([]);

      const res = await fetch(`${API}/admin/felhasznalok/${id}/aktivitas?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.uzenet || "Nem sikerült betölteni az aktivitást");

      setAktivitasok(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      alert(err.message || "Hiba az aktivitás lekérésekor");
    } finally {
      setAktivitasBetolt(false);
    }
  };

  const setUserForm = (id, patch) => {
    setTiltForm((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...patch },
    }));
  };

  const mentesTiltas = async (id) => {
    try {
      setMentesFut((p) => ({ ...p, [id]: true }));

      const f = tiltForm[id] || { tiltva: "nincs", tilt_eddig: "", tilt_ok: "" };

      const payload = {
        tiltva: f.tiltva || "nincs",
        tilt_eddig: f.tiltva === "ideiglenes" ? f.tilt_eddig || null : null,
        tilt_ok: (f.tilt_ok || "").trim() || null,
      };

      const res = await fetch(`${API}/admin/felhasznalok/${id}/tiltas`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.uzenet || "Tiltás mentése sikertelen.");

      await betoltLista();
      if (aktivFelhasznaloId === id) await betoltAktivitas(id);
      alert("Tiltás frissítve.");
    } catch (e) {
      alert(e.message || "Hiba a tiltás mentésekor.");
    } finally {
      setMentesFut((p) => ({ ...p, [id]: false }));
    }
  };

  const toggleModerator = async (id, ujSzerepkorId) => {
    try {
      const res = await fetch(`${API}/admin/felhasznalok/${id}/szerepkor`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ szerepkor_id: ujSzerepkorId }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.uzenet || "Szerepkör mentése sikertelen.");

      await betoltLista();
      if (aktivFelhasznaloId === id) await betoltAktivitas(id);
      alert("Szerepkör frissítve.");
    } catch (e) {
      alert(e.message || "Hiba a szerepkör mentésekor.");
    }
  };

  if (!admin) {
    return (
      <div className="page admin-page">
        <div className="card">
          <h2>Admin felület</h2>
          <p>Nincs jogosultságod ehhez az oldalhoz.</p>
          <Link to="/" className="nav-link">
            Vissza a kezdőlapra
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page admin-page">
      {/* HEAD */}
      <div className="admin-head card">
        <div className="admin-head-left">
          <div className="admin-title">
            <span className="admin-title-badge">ADMIN</span>
            <h2>Felhasználók kezelése</h2>
          </div>
          <div className="admin-sub small">
            Jogosultságok, tiltások, aktivitás napló – mindent egy helyen.
          </div>
        </div>

        <div className="admin-head-right">
          <button className="btn" onClick={betoltLista} disabled={loading}>
            {loading ? "Frissítés…" : "Frissítés"}
          </button>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="admin-toolbar card">
        <div className="admin-search">
          <input
            className="admin-input"
            value={kereses}
            onChange={(e) => setKereses(e.target.value)}
            placeholder="Keresés (név / email / id)…"
          />
          <div className="admin-count chip">
            Találat: <b style={{ marginLeft: 6 }}>{szurt.length}</b>
          </div>
        </div>

        {hiba && <div className="notice error">⚠ {hiba}</div>}
        {loading && <div className="notice">Betöltés…</div>}
      </div>

      {/* LIST */}
      <div className="admin-list">
        {szurt.map((u) => {
          const f = tiltForm[u.id] || { tiltva: u.tiltva || "nincs", tilt_eddig: "", tilt_ok: "" };
          const isAdminUser = u.szerepkor_id === 2;
          const isModerator = u.szerepkor_id === 3;

          return (
            <div key={u.id} className="card admin-user-card">
              <div className="admin-user-top">
                <div className="admin-user-left">
                  <AvatarMini url={u.profil_kep_url} nev={u.felhasznalo_nev} />
                  <div className="admin-user-meta">
                    <div className="admin-user-name">
                      <span className="admin-id">#{u.id}</span> {u.felhasznalo_nev}
                    </div>
                    <div className="admin-user-email">{u.email}</div>
                    <div className="admin-user-join small">Csatlakozott: {fmt(u.csatlakozas_datum)}</div>
                  </div>
                </div>

                <div className="admin-user-right">
                  <span
                    className={`admin-pill ${u.szerepkor_id === 2 ? "is-admin" : isModerator ? "is-mod" : "is-user"}`}
                    title="Szerepkör"
                  >
                    {roleLabel(u.szerepkor_id)}
                  </span>

                  <button className="btn secondary" onClick={() => betoltAktivitas(u.id)}>
                    Aktivitás
                  </button>
                </div>
              </div>

              {/* MODERATOR SWITCH */}
              {!isAdminUser && (
                <div className="admin-row">
                  <div className="admin-row-title">Moderátor</div>
                  <div className="admin-row-actions">
                    <button
                      className={`btn ${isModerator ? "danger" : ""}`}
                      onClick={() => toggleModerator(u.id, isModerator ? 1 : 3)}
                    >
                      {isModerator ? "Moderátor levétele" : "Moderátor adása"}
                    </button>
                    <div className="small">(Csak felhasználó ↔ moderátor állítható)</div>
                  </div>
                </div>
              )}

              {/* BAN */}
              <div className="admin-divider" />

              <div className="admin-row">
                <div className="admin-row-title">Tiltás</div>

                <div className="admin-ban-grid">
                  <select
                    className="admin-input"
                    value={f.tiltva || "nincs"}
                    onChange={(e) => setUserForm(u.id, { tiltva: e.target.value })}
                    disabled={isAdminUser}
                    title={isAdminUser ? "Admin felhasználót itt nem tiltunk" : ""}
                  >
                    <option value="nincs">nincs</option>
                    <option value="ideiglenes">ideiglenes</option>
                    <option value="vegleges">végleges</option>
                  </select>

                  {f.tiltva === "ideiglenes" && (
                    <input
                      className="admin-input"
                      type="datetime-local"
                      value={f.tilt_eddig || ""}
                      onChange={(e) => setUserForm(u.id, { tilt_eddig: e.target.value })}
                      disabled={isAdminUser}
                    />
                  )}

                  <input
                    className="admin-input"
                    value={f.tilt_ok || ""}
                    onChange={(e) => setUserForm(u.id, { tilt_ok: e.target.value })}
                    placeholder="Ok (opcionális)"
                    disabled={isAdminUser}
                  />

                  <button
                    className="btn"
                    onClick={() => mentesTiltas(u.id)}
                    disabled={isAdminUser || !!mentesFut[u.id]}
                  >
                    {mentesFut[u.id] ? "Mentés…" : "Mentés"}
                  </button>
                </div>

                <div className="admin-ban-status small">
                  Jelenlegi: <b>{u.tiltva}</b>
                  {u.tiltva === "ideiglenes" && u.tilt_eddig ? (
                    <>
                      {" "}
                      · eddig: <b>{fmt(u.tilt_eddig)}</b>
                    </>
                  ) : null}
                  {u.tilt_ok ? (
                    <>
                      {" "}
                      · ok: <b>{u.tilt_ok}</b>
                    </>
                  ) : null}
                </div>
              </div>

              {/* ACTIVITY */}
              {aktivFelhasznaloId === u.id && (
                <div className="admin-activity">
                  <div className="admin-activity-head">
                    <h3>Aktivitás (utolsó 50)</h3>
                    <button className="btn secondary" onClick={() => setAktivFelhasznaloId(null)}>
                      Bezár
                    </button>
                  </div>

                  {aktivitasBetolt && <div className="notice">Betöltés…</div>}

                  {!aktivitasBetolt && aktivitasok.length === 0 && (
                    <div className="notice">Nincs rögzített aktivitás.</div>
                  )}

                  {!aktivitasBetolt && aktivitasok.length > 0 && (
                    <div className="admin-activity-list">
                      {aktivitasok.map((a) => (
                        <div key={a.id} className="admin-activity-item">
                          <div className="admin-activity-type">{a.tipus}</div>
                          {a.szoveg ? <div className="admin-activity-text">{a.szoveg}</div> : null}
                          <div className="admin-activity-time small">{fmt(a.letrehozva)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

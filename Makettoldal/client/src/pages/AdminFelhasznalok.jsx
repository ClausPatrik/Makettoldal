import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// API és fájl kiszolgáló alap URL-ek (fejlesztői környezet: localhost)
const API = "http://localhost:3001/api";
const FILE_BASE = "http://localhost:3001";

/**
 * fmt
 *
 * Dátum/idő megjelenítés a felületen.
 * - ha nincs érték, "—" jelzést ad
 * - ha dátumként értelmezhető, akkor lokális formátumban kiírja
 * - hibás értéknél stringgé alakítja (ne omoljon össze a UI)
 */
function fmt(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

/**
 * normalizalKep
 *
 * Profilkép URL normalizálása:
 * - ha a backend relatív "/uploads/..." útvonalat ad, előtagoljuk a szerver címével
 * - egyébként változtatás nélkül visszaadjuk az URL-t
 */
function normalizalKep(url) {
  if (!url) return "";
  if (url.startsWith("/uploads/")) return FILE_BASE + url;
  return url;
}

/**
 * roleLabel
 *
 * Szerepkör azonosító (szerepkor_id) → felirat a UI-hoz.
 * Megjegyzés: itt csak a megjelenítés miatt van (nem jogosultság-ellenőrzés).
 */
function roleLabel(roleId) {
  if (roleId === 2) return "ADMIN";
  if (roleId === 3) return "MODERÁTOR";
  return "FELHASZNÁLÓ";
}

/**
 * AvatarMini
 *
 * Admin listában megjelenő mini avatar:
 * - ha van profilkép, akkor <img>
 * - ha nincs, akkor fallback: név első betűje
 */
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

/**
 * AdminFelhasznalok oldal
 *
 * Funkciók:
 * - felhasználók listázása (admin endpoint)
 * - keresés név/email/id alapján
 * - szerepkör állítás: felhasználó ↔ moderátor (admin nem állítható innen)
 * - tiltás kezelése: nincs / ideiglenes / végleges + ok + ideiglenesnél dátum
 * - aktivitás napló megtekintése felhasználónként (utolsó 50)
 *
 * Jogosultság:
 * - az oldalt csak admin láthatja (szerepkor_id === 2)
 */
export default function AdminFelhasznalok() {
  const { felhasznalo } = useAuth();
  const token = felhasznalo?.token || "";

  // Egyszerű admin ellenőrzés (UI szint, a backend is ellenőrizze!)
  const admin = felhasznalo?.szerepkor_id === 2;

  // Lista + UI állapotok
  const [lista, setLista] = useState([]);
  const [hiba, setHiba] = useState("");
  const [loading, setLoading] = useState(false);

  // Kereső mező állapota
  const [kereses, setKereses] = useState("");

  // Tiltás szerkesztés UI (felhasználónként)
  // tiltForm: az űrlap állapota id-kulccsal tárolva (hogy több usernél külön kezelhető legyen)
  const [tiltForm, setTiltForm] = useState({}); // { [id]: { tiltva, tilt_eddig, tilt_ok } }

  // Mentés folyamatban jelző userenként (gomb disabled és "Mentés..." felirat)
  const [mentesFut, setMentesFut] = useState({}); // { [id]: boolean }

  // Aktivitás panel (egy kiválasztott felhasználóra)
  const [aktivitasok, setAktivitasok] = useState([]);
  const [aktivFelhasznaloId, setAktivFelhasznaloId] = useState(null);
  const [aktivitasBetolt, setAktivitasBetolt] = useState(false);

  /**
   * toDateTimeLocal
   *
   * Backend dátum → <input type="datetime-local"> által elvárt formátum:
   * "YYYY-MM-DDTHH:mm"
   *
   * Megjegyzés:
   * - A datetime-local nem kezeli a másodpercet / timezone-t úgy, mint egy sima ISO string,
   *   ezért itt kézzel formázunk.
   */
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

  /**
   * betoltLista
   *
   * Admin felhasználólista betöltése a backendből.
   * - token szükséges (Authorization: Bearer)
   * - siker után beállítja a listát
   * - és inicializálja a tiltForm állapotot a felhasználók aktuális tiltási adatai alapján
   */
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

      // Tiltás form alapértékek feltöltése:
      // azért kell külön tiltForm, hogy a felhasználó szerkeszthessen mentés előtt
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

  // Az oldal megnyitásakor (és ha admin jogosultság adott) betöltjük a listát
  useEffect(() => {
    if (admin) betoltLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin]);

  /**
   * szurt
   *
   * Keresési szűrés a listára:
   * - név / email / id mezőkben keres (kisbetűsítve)
   * - useMemo: csak akkor számolja újra, ha lista vagy keresés változik
   */
  const szurt = useMemo(() => {
    const q = (kereses || "").trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((u) => {
      const n = (u.felhasznalo_nev || "").toLowerCase();
      const e = (u.email || "").toLowerCase();
      return n.includes(q) || e.includes(q) || String(u.id).includes(q);
    });
  }, [lista, kereses]);

  /**
   * betoltAktivitas
   *
   * Egy felhasználó aktivitás naplóját tölti be (limit=50).
   * - a panel a kiválasztott userhez jelenik meg
   * - betöltés közben státusz jelzés
   */
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

  /**
   * setUserForm
   *
   * Egy felhasználó tiltForm állapotának részleges frissítése (patch).
   * Megjegyzés:
   * - immutábilis frissítés (spread) → React state szabályos kezelése
   */
  const setUserForm = (id, patch) => {
    setTiltForm((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...patch },
    }));
  };

  /**
   * mentesTiltas
   *
   * Tiltás adatok mentése a backend felé.
   * - ideiglenes tiltásnál tilt_eddig mezőt küldünk (különben null)
   * - ok mező opcionális
   * - siker után frissítjük a listát és (ha nyitva van) az aktivitás panelt is
   */
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

  /**
   * toggleModerator
   *
   * Szerepkör átállítása:
   * - itt csak felhasználó (1) ↔ moderátor (3) váltás történik
   * - admin usert a UI eleve kihagyja ebből a blokkból
   * - siker után friss lista + (ha nyitva) aktivitás is
   */
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

  // Ha nem admin a felhasználó, akkor egy egyszerű "nincs jogosultság" panelt mutatunk
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
      {/* HEAD: cím + gyors frissítés gomb */}
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

      {/* TOOLBAR: keresés + találat számláló + hibák / betöltés jelzés */}
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

      {/* LIST: felhasználók kártyás megjelenítése */}
      <div className="admin-list">
        {szurt.map((u) => {
          // Az aktuális (vagy alap) tiltás form értékek ehhez a userhez
          const f = tiltForm[u.id] || { tiltva: u.tiltva || "nincs", tilt_eddig: "", tilt_ok: "" };

          // Az admin felhasználót nem módosítjuk itt (védelem a UI-ban)
          const isAdminUser = u.szerepkor_id === 2;

          // Ennél a usernél moderátor-e
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
                  {/* Szerepkör pill (csak megjelenítés) */}
                  <span
                    className={`admin-pill ${u.szerepkor_id === 2 ? "is-admin" : isModerator ? "is-mod" : "is-user"}`}
                    title="Szerepkör"
                  >
                    {roleLabel(u.szerepkor_id)}
                  </span>

                  {/* Aktivitás panel megnyitása */}
                  <button className="btn secondary" onClick={() => betoltAktivitas(u.id)}>
                    Aktivitás
                  </button>
                </div>
              </div>

              {/* MODERATOR SWITCH: admin usernél nem jelenik meg */}
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

              {/* BAN: tiltás kezelő blokk */}
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

                  {/* Ideiglenes tiltásnál kérjük be a lejárati dátumot */}
                  {f.tiltva === "ideiglenes" && (
                    <input
                      className="admin-input"
                      type="datetime-local"
                      value={f.tilt_eddig || ""}
                      onChange={(e) => setUserForm(u.id, { tilt_eddig: e.target.value })}
                      disabled={isAdminUser}
                    />
                  )}

                  {/* Indok (opcionális) */}
                  <input
                    className="admin-input"
                    value={f.tilt_ok || ""}
                    onChange={(e) => setUserForm(u.id, { tilt_ok: e.target.value })}
                    placeholder="Ok (opcionális)"
                    disabled={isAdminUser}
                  />

                  {/* Mentés gomb: userenként külön disabled állapot */}
                  <button
                    className="btn"
                    onClick={() => mentesTiltas(u.id)}
                    disabled={isAdminUser || !!mentesFut[u.id]}
                  >
                    {mentesFut[u.id] ? "Mentés…" : "Mentés"}
                  </button>
                </div>

                {/* Jelenlegi tiltás állapot visszajelzés (nem az űrlap, hanem a backend szerinti érték) */}
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

              {/* ACTIVITY: csak a kiválasztott felhasználónál jelenik meg */}
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
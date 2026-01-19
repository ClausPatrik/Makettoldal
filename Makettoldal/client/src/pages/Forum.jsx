import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = "http://localhost:3001/api";

/**
 * Fórum oldal:
 * - Bal oldalt témák listája
 * - Jobb oldalt: kiválasztott téma + hozzászólások
 * - Admin: témát és hozzászólásokat is tud szerkeszteni/törölni
 */
export default function Forum() {
  const { bejelentkezve, felhasznalo } = useAuth();
  const isAdmin = felhasznalo?.szerepkor_id === 2;

  // ===== Bal oldal (témák) =====
  const [temak, setTemak] = useState([]);
  const [temaKereses, setTemaKereses] = useState("");
  const [kivalasztottTemaId, setKivalasztottTemaId] = useState(null);

  // ===== Jobb oldal (hozzászólások) =====
  const [uzenetek, setUzenetek] = useState([]);
  const [ujUzenet, setUjUzenet] = useState("");

  // ===== Általános UI =====
  const [betoltes, setBetoltes] = useState(false);
  const [hiba, setHiba] = useState(null);

  // ===== Új téma: gombbal nyitható =====
  const [ujTemaNyitva, setUjTemaNyitva] = useState(false);
  const [ujTemaCim, setUjTemaCim] = useState("");
  const [ujTemaKategoria, setUjTemaKategoria] = useState("általános");
  const [ujTemaLeiras, setUjTemaLeiras] = useState("");

  // ===== Admin: téma szerkesztés (csak a jobb oldalon) =====
  const [temaEditNyitva, setTemaEditNyitva] = useState(false);
  const [temaEditForm, setTemaEditForm] = useState({
    cim: "",
    kategoria: "",
    leiras: "",
  });

  // ===== Admin: hozzászólás szerkesztés (egy darab egyszerre) =====
  const [uzenetEditId, setUzenetEditId] = useState(null);
  const [uzenetEditSzoveg, setUzenetEditSzoveg] = useState("");

  // ---------------------------------------------------------------------------
  // Segédek
  // ---------------------------------------------------------------------------
  function token() {
    return localStorage.getItem("token");
  }

  function formatDatum(datumStr) {
    if (!datumStr) return "";
    const d = new Date(datumStr);
    if (Number.isNaN(d.getTime())) return datumStr;
    return d.toLocaleString("hu-HU");
  }

  const kivalasztottTema = useMemo(() => {
    return temak.find((t) => t.id === kivalasztottTemaId) || null;
  }, [temak, kivalasztottTemaId]);

  const szurtTemak = useMemo(() => {
    const q = temaKereses.trim().toLowerCase();
    if (!q) return temak;

    return temak.filter((t) => {
      const cim = (t.cim || "").toLowerCase();
      const leiras = (t.leiras || "").toLowerCase();
      const kat = (t.kategoria || "").toLowerCase();
      return cim.includes(q) || leiras.includes(q) || kat.includes(q);
    });
  }, [temak, temaKereses]);

  // ---------------------------------------------------------------------------
  // API: témák
  // ---------------------------------------------------------------------------
  async function betoltTemak() {
    try {
      setBetoltes(true);
      setHiba(null);

      // ✅ Ha nálad más az útvonal, itt írd át:
      const res = await fetch(`${API_BASE_URL}/forum/temak`);
      if (!res.ok) throw new Error("Nem sikerült betölteni a témákat.");

      const adat = await res.json();
      setTemak(adat);

      // Ha még nincs kiválasztva, válasszuk az elsőt
      if (!kivalasztottTemaId && adat.length > 0) {
        setKivalasztottTemaId(adat[0].id);
      }
    } catch (err) {
      setHiba(err.message);
    } finally {
      setBetoltes(false);
    }
  }

  async function letrehozTema(e) {
    e.preventDefault();
    if (!bejelentkezve) {
      alert("Új téma indításához jelentkezz be.");
      return;
    }

    try {
      setBetoltes(true);
      setHiba(null);

      // ✅ Ha nálad más az útvonal, itt írd át:
      const res = await fetch(`${API_BASE_URL}/forum/temak`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          cim: ujTemaCim,
          kategoria: ujTemaKategoria,
          leiras: ujTemaLeiras,
        }),
      });

      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült létrehozni a témát.");
      }

      const uj = await res.json();

      // UI: téma lista elejére, és válasszuk ki
      setTemak((prev) => [uj, ...prev]);
      setKivalasztottTemaId(uj.id);

      // form reset + bezárás
      setUjTemaCim("");
      setUjTemaKategoria("általános");
      setUjTemaLeiras("");
      setUjTemaNyitva(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setBetoltes(false);
    }
  }

  async function adminTemaMentes() {
    if (!isAdmin || !kivalasztottTemaId) return;

    try {
      setBetoltes(true);
      setHiba(null);

      // ✅ Ha nálad más az útvonal, itt írd át:
      const res = await fetch(`${API_BASE_URL}/forum/temak/${kivalasztottTemaId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          cim: temaEditForm.cim,
          kategoria: temaEditForm.kategoria,
          leiras: temaEditForm.leiras,
        }),
      });

      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült menteni a témát.");
      }

      const frissitett = await res.json();

      // frissítsük a bal oldali listát
      setTemak((prev) => prev.map((t) => (t.id === frissitett.id ? frissitett : t)));

      setTemaEditNyitva(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setBetoltes(false);
    }
  }

  async function adminTemaTorles() {
    if (!isAdmin || !kivalasztottTemaId) return;

    if (!window.confirm("Biztosan törlöd ezt a témát? A hozzászólások is elveszhetnek.")) return;

    try {
      setBetoltes(true);
      setHiba(null);

      // ✅ Ha nálad más az útvonal, itt írd át:
      const res = await fetch(`${API_BASE_URL}/forum/temak/${kivalasztottTemaId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token()}`,
        },
      });

      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült törölni a témát.");
      }

      // UI: vegyük ki a listából + válasszunk másikat
      setTemak((prev) => prev.filter((t) => t.id !== kivalasztottTemaId));
      setUzenetek([]);
      setTemaEditNyitva(false);

      // válasszuk a következő elérhetőt
      const marad = temak.filter((t) => t.id !== kivalasztottTemaId);
      setKivalasztottTemaId(marad.length > 0 ? marad[0].id : null);
    } catch (err) {
      alert(err.message);
    } finally {
      setBetoltes(false);
    }
  }

  // ---------------------------------------------------------------------------
  // API: üzenetek
  // ---------------------------------------------------------------------------
  async function betoltUzenetek(temaId) {
    if (!temaId) return;
    try {
      setBetoltes(true);
      setHiba(null);

      // ✅ Ha nálad más az útvonal, itt írd át:
      const res = await fetch(`${API_BASE_URL}/forum/temak/${temaId}/uzenetek`);
      if (!res.ok) throw new Error("Nem sikerült betölteni a hozzászólásokat.");

      const adat = await res.json();
      setUzenetek(adat);
    } catch (err) {
      setHiba(err.message);
      setUzenetek([]);
    } finally {
      setBetoltes(false);
    }
  }

  async function kuldUzenet(e) {
    e.preventDefault();
    if (!bejelentkezve) {
      alert("Hozzászóláshoz jelentkezz be.");
      return;
    }
    if (!kivalasztottTemaId) return;

    try {
      setBetoltes(true);
      setHiba(null);

      // ✅ Ha nálad más az útvonal, itt írd át:
      const res = await fetch(`${API_BASE_URL}/forum/temak/${kivalasztottTemaId}/uzenetek`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ szoveg: ujUzenet }),
      });

      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült elküldeni a hozzászólást.");
      }

      const uj = await res.json();
      setUzenetek((prev) => [...prev, uj]);
      setUjUzenet("");
    } catch (err) {
      alert(err.message);
    } finally {
      setBetoltes(false);
    }
  }

  // Admin hozzászólás szerkesztés indítása
  function adminUzenetEditStart(uzenet) {
    setUzenetEditId(uzenet.id);
    setUzenetEditSzoveg(uzenet.szoveg || "");
  }

  async function adminUzenetMentes(uzenetId) {
    if (!isAdmin) return;

    try {
      setBetoltes(true);
      setHiba(null);

      // ✅ Ha nálad más az útvonal, itt írd át:
      const res = await fetch(`${API_BASE_URL}/forum/uzenetek/${uzenetId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ szoveg: uzenetEditSzoveg }),
      });

      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült menteni a hozzászólást.");
      }

      const frissitett = await res.json();

      setUzenetek((prev) => prev.map((u) => (u.id === frissitett.id ? frissitett : u)));
      setUzenetEditId(null);
      setUzenetEditSzoveg("");
    } catch (err) {
      alert(err.message);
    } finally {
      setBetoltes(false);
    }
  }

  async function adminUzenetTorles(uzenetId) {
    if (!isAdmin) return;
    if (!window.confirm("Biztosan törlöd ezt a hozzászólást?")) return;

    try {
      setBetoltes(true);
      setHiba(null);

      // ✅ Ha nálad más az útvonal, itt írd át:
      const res = await fetch(`${API_BASE_URL}/forum/uzenetek/${uzenetId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token()}`,
        },
      });

      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült törölni a hozzászólást.");
      }

      setUzenetek((prev) => prev.filter((u) => u.id !== uzenetId));

      // ha épp ezt szerkesztette, zárjuk le
      if (uzenetEditId === uzenetId) {
        setUzenetEditId(null);
        setUzenetEditSzoveg("");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setBetoltes(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Betöltések
  // ---------------------------------------------------------------------------
  useEffect(() => {
    betoltTemak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // téma váltáskor:
  // - töltsük a hozzászólásokat
  // - admin szerkesztő formot állítsuk be a kiválasztott témára
  useEffect(() => {
    if (!kivalasztottTemaId) {
      setUzenetek([]);
      setTemaEditNyitva(false);
      return;
    }

    betoltUzenetek(kivalasztottTemaId);

    const tema = temak.find((t) => t.id === kivalasztottTemaId);
    if (tema) {
      setTemaEditForm({
        cim: tema.cim ?? "",
        kategoria: tema.kategoria ?? "",
        leiras: tema.leiras ?? "",
      });
    }

    // üzenetszerkesztés is záródjon témaváltáskor
    setUzenetEditId(null);
    setUzenetEditSzoveg("");
    setTemaEditNyitva(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kivalasztottTemaId]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <section className="page">
      <header className="page-header">
        <h1>Fórum</h1>
        <p className="small">
          Válassz témát bal oldalon, és a hozzászólások a jobb oldalon jelennek meg.
        </p>
      </header>

      {hiba && <p className="error">{hiba}</p>}
      {betoltes && <p className="small">Betöltés...</p>}

      {/* Új téma (gombbal nyíló) */}
      <div className="card">
        <div className="forum-newtopic-header">
          <h2 style={{ margin: 0 }}>Új téma</h2>
          <button
            type="button"
            className={ujTemaNyitva ? "btn secondary" : "btn"}
            onClick={() => setUjTemaNyitva((p) => !p)}
          >
            {ujTemaNyitva ? "Bezárás" : "Új téma indítása"}
          </button>
        </div>

        {ujTemaNyitva && (
          <div className="form" style={{ marginTop: 12 }}>
            {!bejelentkezve && (
              <p className="small">Új téma indításához jelentkezz be.</p>
            )}

            <form onSubmit={letrehozTema}>
              <label>
                Cím
                <input
                  value={ujTemaCim}
                  onChange={(e) => setUjTemaCim(e.target.value)}
                  required
                />
              </label>

              <label>
                Kategória
                <select
                  value={ujTemaKategoria}
                  onChange={(e) => setUjTemaKategoria(e.target.value)}
                >
                  <option value="általános">Általános</option>
                  <option value="építési napló">Építési napló</option>
                  <option value="festés / weathering">Festés / weathering</option>
                  <option value="kezdők kérdeznek">Kezdők kérdeznek</option>
                  <option value="eszközök / anyagok">Eszközök / anyagok</option>
                </select>
              </label>

              <label>
                Leírás (nem kötelező)
                <textarea
                  value={ujTemaLeiras}
                  onChange={(e) => setUjTemaLeiras(e.target.value)}
                  rows={3}
                />
              </label>

              <div className="button-row">
                <button type="submit" className="btn" disabled={!bejelentkezve}>
                  Téma létrehozása
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setUjTemaNyitva(false)}
                >
                  Mégse
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Két oszlopos elrendezés */}
      <div className="forum-layout" style={{ marginTop: 16 }}>
        {/* BAL: témák */}
        <div className="forum-left card">
          <h2>Témák</h2>

          <input
            type="text"
            placeholder="Keresés cím / kategória / leírás..."
            value={temaKereses}
            onChange={(e) => setTemaKereses(e.target.value)}
            style={{ marginBottom: 10 }}
          />

          {szurtTemak.length === 0 ? (
            <p className="small">Nincs találat.</p>
          ) : (
            <ul className="forum-topic-list">
              {szurtTemak.map((t) => {
                const aktiv = t.id === kivalasztottTemaId;
                return (
                  <li
                    key={t.id}
                    className={aktiv ? "forum-topic active" : "forum-topic"}
                    onClick={() => setKivalasztottTemaId(t.id)}
                  >
                    <div>
                      <strong>{t.cim}</strong>
                      {t.kategoria && (
                        <span className="nav-badge" style={{ marginLeft: 8 }}>
                          {t.kategoria}
                        </span>
                      )}
                    </div>
                    <p className="small" style={{ margin: "4px 0 0 0" }}>
                      {t.felhasznalo_nev ? `Indította: ${t.felhasznalo_nev}` : ""}
                      {t.letrehozva ? ` • ${formatDatum(t.letrehozva)}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* JOBB: hozzászólások */}
        <div className="forum-right card">
          {!kivalasztottTema ? (
            <p className="small">Válassz egy témát bal oldalon.</p>
          ) : (
            <>
              {/* Téma fejléc + admin szerkesztés gomb */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h2 style={{ marginBottom: 4 }}>{kivalasztottTema.cim}</h2>
                  <p className="small" style={{ marginTop: 0 }}>
                    {kivalasztottTema.kategoria ? kivalasztottTema.kategoria : ""}
                    {kivalasztottTema.leiras ? ` • ${kivalasztottTema.leiras}` : ""}
                  </p>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setTemaEditNyitva((p) => !p)}
                    style={{ height: 40 }}
                  >
                    {temaEditNyitva ? "Szerkesztés bezárása" : "Téma szerkesztése"}
                  </button>
                )}
              </div>

              {/* Admin: téma szerkesztő blokk (itt van a törlés is) */}
              {isAdmin && temaEditNyitva && (
                <div className="card form" style={{ marginTop: 12 }}>
                  <h3>Téma szerkesztése (admin)</h3>

                  <label>
                    Cím
                    <input
                      value={temaEditForm.cim}
                      onChange={(e) =>
                        setTemaEditForm((p) => ({ ...p, cim: e.target.value }))
                      }
                    />
                  </label>

                  <label>
                    Kategória
                    <input
                      value={temaEditForm.kategoria}
                      onChange={(e) =>
                        setTemaEditForm((p) => ({ ...p, kategoria: e.target.value }))
                      }
                    />
                  </label>

                  <label>
                    Leírás
                    <textarea
                      value={temaEditForm.leiras}
                      onChange={(e) =>
                        setTemaEditForm((p) => ({ ...p, leiras: e.target.value }))
                      }
                      rows={3}
                    />
                  </label>

                  <div className="button-row">
                    <button type="button" className="btn" onClick={adminTemaMentes}>
                      Mentés
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => setTemaEditNyitva(false)}
                    >
                      Mégse
                    </button>

                    {/* Törlés csak adminnak, szerkesztés blokkban */}
                    <button type="button" className="btn danger" onClick={adminTemaTorles}>
                      Téma törlése
                    </button>
                  </div>
                </div>
              )}

              {/* Üzenetek listája */}
              {uzenetek.length === 0 ? (
                <p className="small" style={{ marginTop: 12 }}>
                  Még nincs hozzászólás ebben a témában.
                </p>
              ) : (
                <ul className="forum-msg-list" style={{ marginTop: 12 }}>
                  {uzenetek.map((u) => {
                    const szerkeszt = uzenetEditId === u.id;

                    return (
                      <li key={u.id} className="forum-msg">
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <div>
                            <strong>{u.felhasznalo_nev || "Felhasználó"}</strong>
                            <p className="small" style={{ margin: 0 }}>
                              {formatDatum(u.letrehozva)}
                            </p>
                          </div>

                          {/* Admin üzenet műveletek */}
                          {isAdmin && !szerkeszt && (
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => adminUzenetEditStart(u)}
                              style={{ height: 36 }}
                            >
                              Szerkesztés
                            </button>
                          )}
                        </div>

                        {/* Üzenet tartalom / szerkesztő mód */}
                        {!szerkeszt ? (
                          <p style={{ marginTop: 8 }}>{u.szoveg}</p>
                        ) : (
                          <div className="form" style={{ marginTop: 8 }}>
                            <label>
                              Hozzászólás szerkesztése (admin)
                              <textarea
                                value={uzenetEditSzoveg}
                                onChange={(e) => setUzenetEditSzoveg(e.target.value)}
                                rows={3}
                              />
                            </label>

                            <div className="button-row">
                              <button
                                type="button"
                                className="btn"
                                onClick={() => adminUzenetMentes(u.id)}
                              >
                                Mentés
                              </button>

                              <button
                                type="button"
                                className="btn secondary"
                                onClick={() => {
                                  setUzenetEditId(null);
                                  setUzenetEditSzoveg("");
                                }}
                              >
                                Mégse
                              </button>

                              {/* Törlés csak akkor látszik, ha szerkesztésben van */}
                              <button
                                type="button"
                                className="btn danger"
                                onClick={() => adminUzenetTorles(u.id)}
                              >
                                Törlés
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Új hozzászólás */}
              <div style={{ marginTop: 12 }}>
                {bejelentkezve ? (
                  <form onSubmit={kuldUzenet} className="form">
                    <label>
                      Új hozzászólás
                      <textarea
                        value={ujUzenet}
                        onChange={(e) => setUjUzenet(e.target.value)}
                        rows={3}
                        required
                      />
                    </label>

                    <div className="button-row">
                      <button type="submit" className="btn">
                        Küldés
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="small">Hozzászóláshoz jelentkezz be.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

// Backend API alap URL (fórum témák + üzenetek endpointok)
const API_BASE_URL = "http://localhost:3001/api";

/**
 * Fórum oldal
 *
 * Felépítés:
 * - Bal oldali panel: témák listája + kereső
 * - Jobb oldali panel: kiválasztott téma részletei + hozzászólások
 *
 * Jogosultságok (UI szinten):
 * - Admin: témát/üzenetet szerkeszthet és törölhet
 * - Moderátor: üzenetet törölhet (és admin jogosultság nélkül nem szerkeszt témát)
 * - Felhasználó: a saját témáját/üzenetét szerkesztheti, és a saját üzenetét törölheti
 *
 * Fontos: a frontend csak a gombokat rejti/mutatja, de a backendnek is ellenőriznie kell a jogokat.
 */
export default function Forum() {
  // Bejelentkezési állapot és felhasználói adatok (id, szerepkör) az AuthContextből
  const { bejelentkezve, felhasznalo } = useAuth();

  // Admin ellenőrzés (szerepkor_id === 2)
  const isAdmin = felhasznalo?.szerepkor_id === 2;

  // Moderátor ellenőrzés (szerepkor_id === 3)
  const isModerator = felhasznalo?.szerepkor_id === 3;

  /**
   * Aktuális felhasználó azonosítója számmá alakítva.
   * Ha nincs belépve, Number(undefined) -> NaN, ezért később Number.isFinite(...) védi a logikát.
   */
  const userId = Number(felhasznalo?.id);

  // ===== Témák (bal oldal) =====
  const [temak, setTemak] = useState([]);
  const [temaKereses, setTemaKereses] = useState("");
  const [kivalasztottTemaId, setKivalasztottTemaId] = useState(null);

  // ===== Üzenetek (jobb oldal) =====
  const [uzenetek, setUzenetek] = useState([]);
  const [ujUzenet, setUjUzenet] = useState("");

  // ===== Általános UI állapotok =====
  const [betoltes, setBetoltes] = useState(false);
  const [hiba, setHiba] = useState(null);

  // ===== Új téma űrlap (gombbal nyitható/zárható) =====
  const [ujTemaNyitva, setUjTemaNyitva] = useState(false);
  const [ujTemaCim, setUjTemaCim] = useState("");
  const [ujTemaKategoria, setUjTemaKategoria] = useState("általános");
  const [ujTemaLeiras, setUjTemaLeiras] = useState("");

  // ===== Téma szerkesztés (admin vagy a téma indítója) =====
  const [temaEditNyitva, setTemaEditNyitva] = useState(false);
  const [temaEditForm, setTemaEditForm] = useState({
    cim: "",
    kategoria: "",
    leiras: "",
  });

  /**
   * Üzenet szerkesztés
   * - Egyszerre csak 1 üzenet lehet szerkesztésben
   * - uzenetEditId: melyik üzenetet szerkesztjük
   * - uzenetEditSzoveg: kontrollált textarea értéke
   */
  const [uzenetEditId, setUzenetEditId] = useState(null);
  const [uzenetEditSzoveg, setUzenetEditSzoveg] = useState("");

  // ---------------------------------------------------------------------------
  // Segédfüggvények
  // ---------------------------------------------------------------------------

  /**
   * token() – JWT token lekérése localStorage-ből.
   * (A fetch hívások Authorization: Bearer fejlécéhez használjuk.)
   */
  function token() {
    return localStorage.getItem("token");
  }

  /**
   * Dátum formázása megjelenítéshez.
   * - Ha nem értelmezhető dátum, akkor az eredeti stringet adjuk vissza.
   */
  function formatDatum(datumStr) {
    if (!datumStr) return "";
    const d = new Date(datumStr);
    if (Number.isNaN(d.getTime())) return datumStr;
    return d.toLocaleString("hu-HU");
  }

  // Kiválasztott téma objektum a listából (id alapján)
  const kivalasztottTema = useMemo(() => {
    return temak.find((t) => t.id === kivalasztottTemaId) || null;
  }, [temak, kivalasztottTemaId]);

  /**
   * Téma szerkesztési jog:
   * - admin mindig
   * - egyébként csak a téma indítója (felhasznalo_id egyezés)
   */
  const temaSzerzoId = Number(kivalasztottTema?.felhasznalo_id);
  const canEditTema =
    isAdmin || (Number.isFinite(userId) && temaSzerzoId === userId);

  /**
   * Témák szűrése kereső alapján:
   * - cím / leírás / kategória mezőkben keres
   * - kisbetűsítve hasonlít, hogy ne számítson a nagybetű
   */
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
  // API: témák kezelése
  // ---------------------------------------------------------------------------

  /**
   * Témák betöltése a bal oldali listához.
   * - Ha még nincs kiválasztott téma, automatikusan az elsőt kiválasztja.
   */
  async function betoltTemak() {
    try {
      setBetoltes(true);
      setHiba(null);

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

  /**
   * Új téma létrehozása (POST).
   * - Csak bejelentkezve engedélyezett.
   * - Siker esetén: lista elejére tesszük + automatikusan kiválasztjuk.
   */
  async function letrehozTema(e) {
    e.preventDefault();
    if (!bejelentkezve) {
      alert("Új téma indításához jelentkezz be.");
      return;
    }

    try {
      setBetoltes(true);
      setHiba(null);

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

      // Űrlap reset + bezárás
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

  /**
   * Téma mentése (PUT)
   * - UI szerint: admin vagy a téma indítója
   * - Backendben is kell jogosultság-ellenőrzés
   */
  async function temaMentes() {
    if (!canEditTema || !kivalasztottTemaId) return;

    try {
      setBetoltes(true);
      setHiba(null);

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

      // Frissítjük a bal oldali listát (id alapján cseréljük)
      setTemak((prev) =>
        prev.map((t) => (t.id === frissitett.id ? frissitett : t))
      );

      setTemaEditNyitva(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setBetoltes(false);
    }
  }

  /**
   * Téma törlése (DELETE)
   * - UI szerint: admin vagy a téma indítója
   * - Confirm: véletlen törlés ellen
   * - Siker esetén: kivesszük a listából, és átváltunk másik témára (ha van)
   */
  async function temaTorles() {
    if (!canEditTema || !kivalasztottTemaId) return;

    if (
      !window.confirm(
        "Biztosan törlöd ezt a témát? A hozzászólások is elveszhetnek."
      )
    )
      return;

    try {
      setBetoltes(true);
      setHiba(null);

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
      const ujLista = temak.filter((t) => t.id !== kivalasztottTemaId);
      setTemak(ujLista);
      setUzenetek([]);
      setTemaEditNyitva(false);

      setKivalasztottTemaId(ujLista.length > 0 ? ujLista[0].id : null);
    } catch (err) {
      alert(err.message);
    } finally {
      setBetoltes(false);
    }
  }

  // ---------------------------------------------------------------------------
  // API: üzenetek (hozzászólások)
  // ---------------------------------------------------------------------------

  /**
   * Hozzászólások betöltése egy témához.
   * - Témaváltáskor fut le (useEffect-ből hívva).
   */
  async function betoltUzenetek(temaId) {
    if (!temaId) return;
    try {
      setBetoltes(true);
      setHiba(null);

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

  /**
   * Új hozzászólás küldése (POST).
   * - Csak bejelentkezve engedélyezett
   * - Siker esetén: hozzáfűzzük a listához + textarea ürítés
   */
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

  /**
   * Üzenet mentése (PUT).
   * - UI szerint: admin vagy a hozzászólás szerzője
   * - A szerkesztés szövegét a uzenetEditSzoveg állapot tárolja.
   */
  async function uzenetMentes(uzenetId) {
    if (!uzenetId) return;

    try {
      setBetoltes(true);
      setHiba(null);

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

      // Lista frissítése: id alapján cseréljük a módosított elemet
      setUzenetek((prev) =>
        prev.map((u) => (u.id === frissitett.id ? frissitett : u))
      );
      setUzenetEditId(null);
      setUzenetEditSzoveg("");
    } catch (err) {
      alert(err.message);
    } finally {
      setBetoltes(false);
    }
  }

  /**
   * Üzenet törlése (DELETE).
   * - UI szerint: admin, moderátor, vagy a szerző (saját üzenet)
   * - Ha éppen azt szerkesztettük, a szerkesztést is bezárjuk.
   */
  async function uzenetTorles(uzenetId) {
    if (!uzenetId) return;
    if (!window.confirm("Biztosan törlöd ezt a hozzászólást?")) return;

    try {
      setBetoltes(true);
      setHiba(null);

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

      // Ha épp ezt szerkesztettük, zárjuk le a szerkesztő módot
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
  // Betöltések (useEffect)
  // ---------------------------------------------------------------------------

  /**
   * Kezdeti betöltés: témák lekérése első render után.
   * (A kommentelt eslint sor azért kell, mert betoltTemak nincs a deps-ben,
   * és itt direkt csak egyszer akarjuk meghívni.)
   */
  useEffect(() => {
    betoltTemak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Téma váltás figyelése:
   * - hozzászólások betöltése
   * - téma szerkesztő űrlap feltöltése a kiválasztott téma adataival
   * - üzenetszerkesztés lezárása (ne maradjon nyitva más témára)
   */
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

    // Üzenetszerkesztés záródjon témaváltáskor
    setUzenetEditId(null);
    setUzenetEditSzoveg("");

    // Téma szerkesztés panelt is zárjuk témaváltáskor (átláthatóság miatt)
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

      {/* Globálisan megjelenített hiba és betöltés jelzés */}
      {hiba && <p className="error">{hiba}</p>}
      {betoltes && <p className="small">Betöltés...</p>}

      {/* Új téma blokk: gomb nyitja/zárja, a form csak nyitva látszik */}
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
            {/* Bejelentkezés nélkül a form látszik, de a létrehozás gomb disabled */}
            {!bejelentkezve && <p className="small">Új téma indításához jelentkezz be.</p>}

            <form onSubmit={letrehozTema}>
              <label>
                Cím
                <input value={ujTemaCim} onChange={(e) => setUjTemaCim(e.target.value)} required />
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
                <button type="button" className="btn secondary" onClick={() => setUjTemaNyitva(false)}>
                  Mégse
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Két oszlopos elrendezés: bal (témák) + jobb (üzenetek) */}
      <div className="forum-layout" style={{ marginTop: 16 }}>
        {/* BAL: témák */}
        <div className="forum-right card">
          <h2>Témák</h2>

          {/* Kereső: a szűrt lista a szurtTemak useMemo-ból jön */}
          <div className="filters" style={{ marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Keresés cím / kategória / leírás..."
              value={temaKereses}
              onChange={(e) => setTemaKereses(e.target.value)}
            />
          </div>

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
        <div className="forum-left card">
          {!kivalasztottTema ? (
            <p className="small">Válassz egy témát bal oldalon.</p>
          ) : (
            <>
              {/* Téma fejléc + szerkesztés toggle (ha van jog) */}
              <div className="forum-topic-header">
                <div>
                  <h2 style={{ marginBottom: 4 }}>{kivalasztottTema.cim}</h2>
                  <p className="small" style={{ marginTop: 0 }}>
                    {kivalasztottTema.kategoria ? kivalasztottTema.kategoria : ""}
                    {kivalasztottTema.leiras ? ` • ${kivalasztottTema.leiras}` : ""}
                  </p>
                </div>

                {canEditTema && (
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

              {/* Téma szerkesztés panel (csak jogosultnak és ha nyitva) */}
              {canEditTema && temaEditNyitva && (
                <div className="card form" style={{ marginTop: 12 }}>
                  <h3>Téma szerkesztése</h3>

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
                    <button type="button" className="btn" onClick={temaMentes}>
                      Mentés
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => setTemaEditNyitva(false)}
                    >
                      Mégse
                    </button>

                    <button type="button" className="btn danger" onClick={temaTorles}>
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

                    /**
                     * Üzenet jogosultság:
                     * - szerkesztés: admin vagy szerző
                     * - törlés: admin vagy moderátor vagy szerző
                     */
                    const uzenetSzerzoId = Number(u.felhasznalo_id);
                    const canEditUzenet =
                      isAdmin || (Number.isFinite(userId) && uzenetSzerzoId === userId);

                    const canDeleteUzenet =
                      isAdmin ||
                      isModerator ||
                      (Number.isFinite(userId) && uzenetSzerzoId === userId);

                    return (
                      <li key={u.id} className="forum-msg">
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <div>
                            <strong>{u.felhasznalo_nev || "Felhasználó"}</strong>
                            <p className="small" style={{ margin: 0 }}>
                              {formatDatum(u.letrehozva)}
                            </p>
                          </div>

                          {/* Akciógombok: csak akkor látszanak, ha nem szerkesztő módban vagyunk */}
                          {!szerkeszt && (
                            <div style={{ display: "flex", gap: 8 }}>
                              {canEditUzenet && (
                                <button
                                  type="button"
                                  className="btn secondary forum-admin-btn"
                                  onClick={() => {
                                    // Szerkesztés indítása: id beállítás + textarea feltöltése
                                    setUzenetEditId(u.id);
                                    setUzenetEditSzoveg(u.szoveg || "");
                                  }}
                                >
                                  Szerkesztés
                                </button>
                              )}

                              {canDeleteUzenet && (
                                <button
                                  type="button"
                                  className="btn danger"
                                  onClick={() => uzenetTorles(u.id)}
                                >
                                  Törlés
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Üzenet tartalom / szerkesztő mód */}
                        {!szerkeszt ? (
                          <p style={{ marginTop: 8 }}>{u.szoveg}</p>
                        ) : (
                          <div className="form" style={{ marginTop: 8 }}>
                            <label>
                              Hozzászólás szerkesztése
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
                                onClick={() => uzenetMentes(u.id)}
                              >
                                Mentés
                              </button>

                              <button
                                type="button"
                                className="btn secondary"
                                onClick={() => {
                                  // Szerkesztés megszakítása: state-ek visszaállítása
                                  setUzenetEditId(null);
                                  setUzenetEditSzoveg("");
                                }}
                              >
                                Mégse
                              </button>

                              {/* Törlés gomb szerkesztés közben is megjelenhet (ha van jog) */}
                              {canDeleteUzenet && (
                                <button
                                  type="button"
                                  className="btn danger"
                                  onClick={() => uzenetTorles(u.id)}
                                >
                                  Törlés
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Új hozzászólás űrlap */}
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
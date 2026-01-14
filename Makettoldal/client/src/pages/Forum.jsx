import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = "http://localhost:3001/api";

export default function Forum() {
  const { bejelentkezve } = useAuth();

  // Bal oldal: témák
  const [temak, beallitTemak] = useState([]);
  const [temaKereses, beallitTemaKereses] = useState("");

  // Jobb oldal: kiválasztott téma + üzenetek
  const [kivalasztottTemaId, beallitKivalasztottTemaId] = useState(null);
  const [uzenetek, beallitUzenetek] = useState([]);

  // Új téma form
  const [ujTemaCim, beallitUjTemaCim] = useState("");
  const [ujTemaLeiras, beallitUjTemaLeiras] = useState("");
  const [ujTemaKategoria, beallitUjTemaKategoria] = useState("általános");

  // Új hozzászólás form
  const [ujUzenetSzoveg, beallitUjUzenetSzoveg] = useState("");

  const [betoltes, beallitBetoltes] = useState(false);
  const [hiba, beallitHiba] = useState(null);

  const [ujTemaNyitva, beallitUjTemaNyitva] = useState(false);
  // ========= API hívások =========

  // Témák betöltése
  async function betoltTemak() {
    try {
      beallitBetoltes(true);
      beallitHiba(null);
      const valasz = await fetch(`${API_BASE_URL}/forum/temak`);
      if (!valasz.ok) throw new Error("Nem sikerült lekérni a témákat.");
      const adat = await valasz.json();
      beallitTemak(adat);

      // UX: ha még nincs kiválasztva téma, automatikusan kijelöljük az elsőt
      if (!kivalasztottTemaId && adat.length > 0) {
        beallitKivalasztottTemaId(adat[0].id);
      }
    } catch (err) {
      beallitHiba(err.message);
    } finally {
      beallitBetoltes(false);
    }
  }

  // Kiválasztott téma üzenetei
  async function betoltUzenetek(temaId) {
    try {
      beallitBetoltes(true);
      beallitHiba(null);

      const valasz = await fetch(`${API_BASE_URL}/forum/temak/${temaId}/uzenetek`);
      if (!valasz.ok) throw new Error("Nem sikerült lekérni a hozzászólásokat.");

      const adat = await valasz.json();
      beallitUzenetek(adat);
    } catch (err) {
      beallitHiba(err.message);
      beallitUzenetek([]);
    } finally {
      beallitBetoltes(false);
    }
  }

  // ========= lifecycle =========

  useEffect(() => {
    betoltTemak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ha a kiválasztott téma változik, töltsük a hozzászólásokat a jobb oldalon
  useEffect(() => {
    if (kivalasztottTemaId) {
      betoltUzenetek(kivalasztottTemaId);
    } else {
      beallitUzenetek([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kivalasztottTemaId]);

  // ========= eseménykezelők =========

  function kezeliTemaKattintas(temaId) {
    // Bal oldali listán: egyszerűen kijelöljük
    beallitKivalasztottTemaId(temaId);
    // új üzenet doboz kiürítése témaváltásnál
    beallitUjUzenetSzoveg("");
  }

  // Új téma küldése
  async function kezeliUjTemaKuldes(e) {
    e.preventDefault();
    if (!bejelentkezve) {
      alert("Új téma indításához jelentkezz be.");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const valasz = await fetch(`${API_BASE_URL}/forum/temak`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cim: ujTemaCim,
          leiras: ujTemaLeiras,
          kategoria: ujTemaKategoria,
        }),
      });

      if (!valasz.ok) {
        const h = await valasz.json().catch(() => ({}));
        throw new Error(h.uzenet || "Hiba az új téma létrehozásakor.");
      }

      const uj = await valasz.json();

      // Bal oldali listába előre beszúrjuk
      beallitTemak((elozo) => [uj, ...elozo]);

      // UX: az új témát automatikusan kijelöljük (jobb oldalon megjelenik)
      beallitKivalasztottTemaId(uj.id);

      // form reset
      beallitUjTemaCim("");
      beallitUjTemaLeiras("");
      beallitUjTemaKategoria("általános");
    } catch (err) {
      alert(err.message);
    }
  }

  // Új üzenet küldése
  async function kezeliUjUzenetKuldes(e) {
    e.preventDefault();
    if (!bejelentkezve) {
      alert("Hozzászóláshoz jelentkezz be.");
      return;
    }
    if (!kivalasztottTemaId) return;

    try {
      const token = localStorage.getItem("token");
      const valasz = await fetch(
        `${API_BASE_URL}/forum/temak/${kivalasztottTemaId}/uzenetek`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ szoveg: ujUzenetSzoveg }),
        }
      );

      if (!valasz.ok) {
        const h = await valasz.json().catch(() => ({}));
        throw new Error(h.uzenet || "Hiba a hozzászólás mentésekor.");
      }

      const uj = await valasz.json();

      // Jobb oldali listába hozzáadjuk
      beallitUzenetek((elozo) => [...elozo, uj]);
      beallitUjUzenetSzoveg("");
    } catch (err) {
      alert(err.message);
    }
  }

  // ========= szűrt témák (bal oldal kereső) =========
  const szurtTemak = useMemo(() => {
    const q = temaKereses.trim().toLowerCase();
    if (!q) return temak;

    return temak.filter((t) => {
      const cim = t.cim?.toLowerCase() || "";
      const leiras = t.leiras?.toLowerCase() || "";
      const kat = t.kategoria?.toLowerCase() || "";
      return cim.includes(q) || leiras.includes(q) || kat.includes(q);
    });
  }, [temak, temaKereses]);

  // Segéd: kiválasztott téma objektum (jobb oldali címhez)
  const kivalasztottTema = temak.find((t) => t.id === kivalasztottTemaId) || null;

  return (
    <section className="page">
      <h1>Fórum</h1>

      {hiba && <p className="error">{hiba}</p>}
      {betoltes && <p className="small">Betöltés...</p>}

      {/* Új téma gomb + lenyíló form */}
<div className="card">
  <div className="forum-newtopic-header">
    <h2 style={{ margin: 0 }}>Új téma</h2>

    <button
      type="button"
      className={ujTemaNyitva ? "btn secondary" : "btn"}
      onClick={() => beallitUjTemaNyitva((prev) => !prev)}
    >
      {ujTemaNyitva ? "Bezárás" : "Új téma indítása"}
    </button>
  </div>

  {/* Csak akkor jelenik meg, ha nyitva van */}
  {ujTemaNyitva && (
    <div className="form" style={{ marginTop: 12 }}>
      {!bejelentkezve && (
        <p className="small">Új téma indításához előbb jelentkezz be.</p>
      )}

      <form
        onSubmit={async (e) => {
          await kezeliUjTemaKuldes(e);

          // ha sikerült, csukjuk össze (és legyen szép UX)
          // (ha hibázik, úgyis alertel a függvény, és nem csukjuk)
          // egyszerű megoldás: ha van cím és üres lett, akkor sikerült
          // biztosabb: a kezeliUjTemaKuldes-ben return true/false (ha akarod, megcsinálom)
          beallitUjTemaNyitva(false);
        }}
      >
        <label>
          Cím
          <input
            type="text"
            value={ujTemaCim}
            onChange={(e) => beallitUjTemaCim(e.target.value)}
            required
          />
        </label>

        <label>
          Kategória
          <select
            value={ujTemaKategoria}
            onChange={(e) => beallitUjTemaKategoria(e.target.value)}
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
            onChange={(e) => beallitUjTemaLeiras(e.target.value)}
          />
        </label>

        <div className="button-row">
          <button type="submit" className="btn" disabled={!bejelentkezve}>
            Téma létrehozása
          </button>

          <button
            type="button"
            className="btn secondary"
            onClick={() => beallitUjTemaNyitva(false)}
          >
            Mégse
          </button>
        </div>
      </form>
    </div>
  )}
</div>

      {/* ===== Két oszlopos elrendezés ===== */}
      <div className="forum-layout">
        {/* BALBAL OLDAL: témák */}
        <div className="forum-left card">
          <h2>Témák</h2>

          <div className="filters" style={{ marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Keresés cím / leírás / kategória..."
              value={temaKereses}
              onChange={(e) => beallitTemaKereses(e.target.value)}
            />
          </div>

          {szurtTemak.length === 0 ? (
            <p className="small">Nincs a keresésnek megfelelő téma.</p>
          ) : (
            <ul className="forum-topic-list">
              {szurtTemak.map((t) => {
                const aktiv = t.id === kivalasztottTemaId;
                const datum = t.letrehozva
                  ? new Date(t.letrehozva).toLocaleString("hu-HU")
                  : "";

                return (
                  <li
                    key={t.id}
                    className={aktiv ? "forum-topic active" : "forum-topic"}
                    onClick={() => kezeliTemaKattintas(t.id)}
                  >
                    <div className="forum-topic-top">
                      <div>
                        <strong>{t.cim}</strong>
                        {t.kategoria && (
                          <span className="nav-badge" style={{ marginLeft: 8 }}>
                            {t.kategoria}
                          </span>
                        )}
                        <p className="small" style={{ margin: 0 }}>
                          Indította: {t.felhasznalo_nev} – {datum}
                        </p>
                      </div>

                      <div className="forum-topic-meta">
                        <p className="small" style={{ margin: 0 }}>
                          Hozzászólások: {t.uzenet_db}
                        </p>
                        {t.utolso_valasz && (
                          <p className="small" style={{ margin: 0 }}>
                            Utolsó:{" "}
                            {new Date(t.utolso_valasz).toLocaleDateString("hu-HU")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Leírást itt mindig megmutathatjuk (vagy csak aktívnál) */}
                    {t.leiras && (
                      <p className="small" style={{ marginTop: 6 }}>
                        {t.leiras}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* JOBB OLDAL: hozzászólások */}
        <div className="forum-right card">
          {!kivalasztottTemaId ? (
            <p className="small">Válassz ki egy témát bal oldalon.</p>
          ) : (
            <>
              <h2>Hozzászólások</h2>
              {kivalasztottTema && (
                <p className="small" style={{ marginTop: -6 }}>
                  Téma: <strong>{kivalasztottTema.cim}</strong>
                </p>
              )}

              {uzenetek.length === 0 ? (
                <p className="small">Még nincs hozzászólás ebben a témában.</p>
              ) : (
                <ul className="forum-msg-list">
                  {uzenetek.map((u) => {
                    const datum = u.letrehozva
                      ? new Date(u.letrehozva).toLocaleString("hu-HU")
                      : "";
                    return (
                      <li key={u.id} className="forum-msg">
                        <p style={{ margin: 0 }}>
                          <strong>{u.felhasznalo_nev}</strong>
                        </p>
                        <p className="small" style={{ margin: 0 }}>
                          {datum}
                        </p>
                        <p style={{ marginTop: 6 }}>{u.szoveg}</p>
                      </li>
                    );
                  })}
                </ul>
              )}

              {bejelentkezve ? (
                <form onSubmit={kezeliUjUzenetKuldes} className="form" style={{ marginTop: 12 }}>
                  <label>
                    Új hozzászólás
                    <textarea
                      value={ujUzenetSzoveg}
                      onChange={(e) => beallitUjUzenetSzoveg(e.target.value)}
                      required
                    />
                  </label>
                  <button type="submit" className="btn">
                    Küldés
                  </button>
                </form>
              ) : (
                <p className="small" style={{ marginTop: 8 }}>
                  Hozzászóláshoz jelentkezz be.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

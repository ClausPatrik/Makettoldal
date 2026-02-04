import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useAdat } from "../context/AdatContext";

const API_BASE_URL = "http://localhost:3001/api";

export default function EpitesiNaplo() {
  const { bejelentkezve, felhasznalo } = useAuth();
  const { makettek, betoltAlapAdatok, betoltesFolyamatban } = useAdat();

  const isAdminOrModOrMod = felhasznalo?.szerepkor_id === 2 || felhasznalo?.szerepkor_id === 3;

  const [valasztottMakettId, setValasztottMakettId] = useState("");

  const [betolt, setBetolt] = useState(false);
  const [hiba, setHiba] = useState(null);

  const [naplok, setNaplok] = useState([]);
  const [aktivNaploId, setAktivNaploId] = useState("");

  const [naplo, setNaplo] = useState(null);
  const [blokkok, setBlokkok] = useState([]);

  const [ujBlokk, setUjBlokk] = useState({
    tipus: "osszeepites",
    cim: "",
    tippek: "",
    sorrend: 0,
  });

  const [szerkId, setSzerkId] = useState(null);
  const [szerk, setSzerk] = useState({
    tipus: "osszeepites",
    cim: "",
    tippek: "",
    sorrend: 0,
  });

  useEffect(() => {
    betoltAlapAdatok();
  }, [betoltAlapAdatok]);

  const authHeader = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [bejelentkezve]);

  const tudSzerkeszteni = useMemo(() => {
    if (!bejelentkezve || !naplo) return false;
    if (isAdminOrModOrMod) return true;
    return Number(naplo.letrehozo_felhasznalo_id) === Number(felhasznalo?.id);
  }, [bejelentkezve, naplo, isAdminOrModOrMod, felhasznalo]);

  async function betoltMakettNaplo(makettId) {
    if (!bejelentkezve || !makettId) return;

    const parseNaplok = (data) => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.naplok)) return data.naplok;
      if (data.naplo) return [data.naplo];
      if (data.id && (data.makett_id || data.letrehozo_felhasznalo_id)) return [data];
      return [];
    };

    try {
      setBetolt(true);
      setHiba(null);

      const res = await fetch(`${API_BASE_URL}/makettek/${makettId}/epitesi-tippek`, {
        headers: { ...authHeader },
      });

      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült betölteni az építési naplókat.");
      }

      const data = await res.json();
      const list = parseNaplok(data);

      setNaplok(list);

      const firstId = list[0]?.id ? String(list[0].id) : "";
      const chosenId = aktivNaploId || firstId;

      setAktivNaploId(chosenId);

      const active = list.find((n) => String(n.id) === String(chosenId)) || null;
      setNaplo(active);

      // Régi API esetén a blokkok rögtön érkeznek
      if (data.blokkok && (data.naplo || (Array.isArray(data.naplok) && data.naplok.length === 1))) {
        setBlokkok(Array.isArray(data.blokkok) ? data.blokkok : []);
      } else {
        setBlokkok([]);
        if (chosenId) await betoltBlokkok(chosenId);
      }
    } catch (err) {
      setHiba(err.message);
      setNaplok([]);
      setAktivNaploId("");
      setNaplo(null);
      setBlokkok([]);
    } finally {
      setBetolt(false);
    }
  }

  async function betoltBlokkok(naploId) {
    if (!bejelentkezve || !naploId) return;

    const res = await fetch(`${API_BASE_URL}/epitesi-tippek/${naploId}/blokkok`, {
      headers: { ...authHeader },
    });

    if (!res.ok) {
      const h = await res.json().catch(() => ({}));
      throw new Error(h.uzenet || "Nem sikerült betölteni a blokkokat.");
    }

    const data = await res.json();
    setBlokkok(Array.isArray(data) ? data : Array.isArray(data.blokkok) ? data.blokkok : []);
  }

  useEffect(() => {
    if (valasztottMakettId) {
      setAktivNaploId("");
      betoltMakettNaplo(valasztottMakettId);
    } else {
      setNaplok([]);
      setAktivNaploId("");
      setNaplo(null);
      setBlokkok([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valasztottMakettId]);

  useEffect(() => {
    if (!aktivNaploId) return;
    const active = naplok.find((n) => String(n.id) === String(aktivNaploId)) || null;
    setNaplo(active);
    // ha nincs blokk listánk, töltsük
    if (active) {
      betoltBlokkok(aktivNaploId).catch((e) => setHiba(e.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktivNaploId]);


  async function naploLetrehoz() {
    if (!valasztottMakettId) return;

    try {
      setBetolt(true);
      setHiba(null);

      const res = await fetch(`${API_BASE_URL}/makettek/${valasztottMakettId}/epitesi-tippek`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ cim: "Építési napló" }),
      });

      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült létrehozni a naplót.");
      }

      // frissítjük a listát
      setAktivNaploId("");
      await betoltMakettNaplo(valasztottMakettId);
    } catch (err) {
      setHiba(err.message);
    } finally {
      setBetolt(false);
    }
  }

  async function ujBlokkMent() {
    if (!aktivNaploId) return;
    if (!ujBlokk.cim.trim() || !ujBlokk.tippek.trim()) {
      alert("A blokk címe és tippek mezője kötelező.");
      return;
    }

    try {
      setBetolt(true);
      setHiba(null);

      const res = await fetch(`${API_BASE_URL}/epitesi-tippek/${aktivNaploId}/blokkok`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          tipus: ujBlokk.tipus,
          cim: ujBlokk.cim,
          tippek: ujBlokk.tippek,
          sorrend: Number(ujBlokk.sorrend || 0),
        }),
      });

      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült létrehozni a blokkot.");
      }

      const created = await res.json();
      setBlokkok((prev) =>
        [...prev, created].sort((a, b) => (a.sorrend ?? 0) - (b.sorrend ?? 0) || a.id - b.id)
      );
      setUjBlokk({ tipus: "osszeepites", cim: "", tippek: "", sorrend: 0 });
    } catch (err) {
      setHiba(err.message);
    } finally {
      setBetolt(false);
    }
  }

  function szerkesztMegnyit(blokk) {
    setSzerkId(blokk.id);
    setSzerk({
      tipus: blokk.tipus ?? "osszeepites",
      cim: blokk.cim ?? "",
      tippek: blokk.tippek ?? "",
      sorrend: Number(blokk.sorrend ?? 0),
    });
  }

  async function szerkMent(blokkId) {
    if (!szerk.cim.trim() || !szerk.tippek.trim()) {
      alert("A blokk címe és tippek mezője kötelező.");
      return;
    }

    try {
      setBetolt(true);
      setHiba(null);

      const res = await fetch(`${API_BASE_URL}/epitesi-tippek-blokk/${blokkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          tipus: szerk.tipus,
          cim: szerk.cim,
          tippek: szerk.tippek,
          sorrend: Number(szerk.sorrend ?? 0),
        }),
      });

      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült menteni a blokkot.");
      }

      const updated = await res.json();
      setBlokkok((prev) =>
        prev
          .map((b) => (b.id === blokkId ? updated : b))
          .sort((a, b) => (a.sorrend ?? 0) - (b.sorrend ?? 0) || a.id - b.id)
      );
      setSzerkId(null);
    } catch (err) {
      setHiba(err.message);
    } finally {
      setBetolt(false);
    }
  }

  async function blokkTorol(blokkId) {
    if (!window.confirm("Biztosan törlöd ezt a blokkot?")) return;

    try {
      setBetolt(true);
      setHiba(null);

      const res = await fetch(`${API_BASE_URL}/epitesi-tippek-blokk/${blokkId}`, {
        method: "DELETE",
        headers: { ...authHeader },
      });

      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült törölni a blokkot.");
      }

      setBlokkok((prev) => prev.filter((b) => b.id !== blokkId));
      if (szerkId === blokkId) setSzerkId(null);
    } catch (err) {
      setHiba(err.message);
    } finally {
      setBetolt(false);
    }
  }

  function tipusFelirat(t) {
    switch (t) {
      case "osszeepites":
        return "Összeépítés";
      case "festes":
        return "Festés";
      case "matricazas":
        return "Matricázás";
      case "lakkozas":
        return "Lakkozás";
      case "koszolas":
        return "Koszolás";
      default:
        return "Egyéb";
    }
  }

  return (
    <section className="page">
      <h1>Építési napló</h1>
      <p className="small">Blokkokból álló építési tippek makettenként (csak bejelentkezve).</p>

      {!bejelentkezve ? (
        <div className="card">
          <p>Az oldal megtekintéséhez jelentkezz be.</p>
        </div>
      ) : (
        <>
          {betoltesFolyamatban && <p>Makettek betöltése...</p>}

          <div className="card form">
            <label>
              Makett kiválasztása
              <select value={valasztottMakettId} onChange={(e) => setValasztottMakettId(e.target.value)}>
                <option value="">Válassz...</option>
                {makettek.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nev} ({m.gyarto}, {m.skala})
                  </option>
                ))}
              </select>
            </label>

            {naplok.length > 0 && (
              <label>
                Napló kiválasztása
                <select
                  value={aktivNaploId}
                  onChange={(e) => {
                    setBlokkok([]);
                    setSzerkId(null);
                    setAktivNaploId(e.target.value);
                  }}
                >
                  {naplok.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.cim} (#{n.id})
                    </option>
                  ))}
                </select>
              </label>
            )}

            {hiba && <p className="error">{hiba}</p>}
            {betolt && <p className="small">Betöltés...</p>}

            {!valasztottMakettId ? (
              <p className="small">Válassz egy makettet a napló kezeléséhez.</p>
            ) : !naplo ? (
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <p className="small" style={{ margin: 0 }}>
                  Ehhez a maketthez még nincs napló.
                </p>
                <button className="btn" onClick={naploLetrehoz} disabled={betolt}>
                  Napló létrehozása
                </button>
              </div>
            ) : (
              <>
                <div className="card" style={{ marginTop: 10 }}>
                  <h3>Blokkok</h3>

                  {blokkok.length === 0 ? (
                    <p className="small">Még nincs blokk.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {blokkok.map((b) => (
                        <div key={b.id} className="card" style={{ margin: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <div>
                              <div className="chip">{tipusFelirat(b.tipus)}</div>
                              <h4 style={{ margin: "8px 0 0 0" }}>
                                {b.sorrend ?? 0}. {b.cim}
                              </h4>
                            </div>

                            {tudSzerkeszteni && (
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {szerkId !== b.id ? (
                                  <button className="btn secondary" onClick={() => szerkesztMegnyit(b)}>
                                    Szerkesztés
                                  </button>
                                ) : (
                                  <button className="btn secondary" onClick={() => setSzerkId(null)}>
                                    Mégse
                                  </button>
                                )}
                                <button className="btn danger" onClick={() => blokkTorol(b.id)}>
                                  Törlés
                                </button>
                              </div>
                            )}
                          </div>

                          {szerkId !== b.id ? (
                            <pre style={{ whiteSpace: "pre-wrap", marginTop: 10 }}>{b.tippek}</pre>
                          ) : (
                            <div className="form" style={{ marginTop: 10 }}>
                              <label>
                                Típus
                                <select value={szerk.tipus} onChange={(e) => setSzerk((p) => ({ ...p, tipus: e.target.value }))}>
                                  <option value="osszeepites">Összeépítés</option>
                                  <option value="festes">Festés</option>
                                  <option value="matricazas">Matricázás</option>
                                  <option value="lakkozas">Lakkozás</option>
                                  <option value="koszolas">Koszolás</option>
                                  <option value="egyeb">Egyéb</option>
                                </select>
                              </label>

                              <label>
                                Sorrend
                                <input type="number" value={szerk.sorrend} onChange={(e) => setSzerk((p) => ({ ...p, sorrend: Number(e.target.value) }))} />
                              </label>

                              <label>
                                Cím
                                <input value={szerk.cim} onChange={(e) => setSzerk((p) => ({ ...p, cim: e.target.value }))} />
                              </label>

                              <label>
                                Tippek
                                <textarea rows={6} value={szerk.tippek} onChange={(e) => setSzerk((p) => ({ ...p, tippek: e.target.value }))} />
                              </label>

                              <div className="button-row">
                                <button className="btn" onClick={() => szerkMent(b.id)} disabled={betolt}>
                                  Mentés
                                </button>
                                <button className="btn secondary" onClick={() => setSzerkId(null)} disabled={betolt}>
                                  Mégse
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {tudSzerkeszteni && (
                  <div className="card form" style={{ marginTop: 10 }}>
                    <h3>Új blokk</h3>

                    <label>
                      Típus
                      <select value={ujBlokk.tipus} onChange={(e) => setUjBlokk((p) => ({ ...p, tipus: e.target.value }))}>
                        <option value="osszeepites">Összeépítés</option>
                        <option value="festes">Festés</option>
                        <option value="matricazas">Matricázás</option>
                        <option value="lakkozas">Lakkozás</option>
                        <option value="koszolas">Koszolás</option>
                        <option value="egyeb">Egyéb</option>
                      </select>
                    </label>

                    <label>
                      Sorrend
                      <input type="number" value={ujBlokk.sorrend} onChange={(e) => setUjBlokk((p) => ({ ...p, sorrend: Number(e.target.value) }))} />
                    </label>

                    <label>
                      Cím
                      <input value={ujBlokk.cim} onChange={(e) => setUjBlokk((p) => ({ ...p, cim: e.target.value }))} />
                    </label>

                    <label>
                      Tippek
                      <textarea rows={6} value={ujBlokk.tippek} onChange={(e) => setUjBlokk((p) => ({ ...p, tippek: e.target.value }))} />
                    </label>

                    <button className="btn" onClick={ujBlokkMent} disabled={betolt}>
                      Blokk mentése
                    </button>
                  </div>
                )}

                {!tudSzerkeszteni && (
                  <p className="small" style={{ marginTop: 10 }}>
                    Ezt a naplót csak a létrehozója vagy az admin szerkesztheti.
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

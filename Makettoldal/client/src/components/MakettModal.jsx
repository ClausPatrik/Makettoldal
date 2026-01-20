import React, { useEffect, useMemo, useState } from "react";
import CsillagValaszto from "./CsillagValaszto";
import VelemenyekSection from "./VelemenyekSection";

/**
 * MakettModal
 * - Makett részletek
 * - Kedvencek
 * - Admin: szerkesztés + törlés
 * - Vélemények
 * - ÚJ: Építési tippek (építési napló blokkokkal) -> CSAK bejelentkezve látható
 * - ÚJ: Makett leírás + vásárlási link (megjelenítés + admin szerkesztés)
 */
export default function MakettModal({
  open,
  makett,
  onClose,

  atlag = 0,
  velemenyek = [],
  kedvenc = false,
  onToggleKedvenc,

  showReviews = true,

  bejelentkezve,
  felhasznalo,
  isAdmin,
  formatDatum,
  hozzaadVelemeny,
  modositVelemeny,
  torolVelemeny,

  onAdminUpdate,
  onAdminDelete,
}) {
  const makettId = makett?.id ?? makett?.makett_id;
  const API_BASE_URL = "http://localhost:3001/api";

  // ===== Modal UX =====
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // ===== Admin szerkesztés =====
  const [szerkesztesNyitva, setSzerkesztesNyitva] = useState(false);
  const [mentesFolyamatban, setMentesFolyamatban] = useState(false);

  const [form, setForm] = useState({
    nev: "",
    gyarto: "",
    skala: "",
    kategoria: "",
    nehezseg: 1,
    megjelenes_eve: "",
    kep_url: "",
    leiras: "",
    vasarlasi_link: "",
  });

  useEffect(() => {
    if (!open || !makett) return;
    setSzerkesztesNyitva(false);
    setMentesFolyamatban(false);

    setForm({
      nev: makett.nev ?? "",
      gyarto: makett.gyarto ?? "",
      skala: makett.skala ?? "",
      kategoria: makett.kategoria ?? "",
      nehezseg: Number(makett.nehezseg ?? 1),
      megjelenes_eve: makett.megjelenes_eve ?? "",
      kep_url: makett.kep_url ?? "",
      leiras: makett.leiras ?? "",
      vasarlasi_link: makett.vasarlasi_link ?? "",
    });
  }, [open, makett]);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function normalizalLink(url) {
    if (!url) return "";
    const u = String(url).trim();
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    // ha csak "www..." vagy domain, legyen belőle https
    return "https://" + u;
  }

  async function kezeliAdminMentes() {
    if (!onAdminUpdate) {
      alert("Hiányzik az onAdminUpdate handler a MakettModalból.");
      return;
    }

    try {
      setMentesFolyamatban(true);
      const payload = {
        nev: form.nev,
        gyarto: form.gyarto,
        skala: form.skala,
        kategoria: form.kategoria,
        nehezseg: Number(form.nehezseg),
        megjelenes_eve: form.megjelenes_eve,
        kep_url: form.kep_url,
        leiras: form.leiras,
        vasarlasi_link: form.vasarlasi_link,
      };

      await onAdminUpdate(makettId, payload);
      setSzerkesztesNyitva(false);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Hiba történt mentés közben.");
    } finally {
      setMentesFolyamatban(false);
    }
  }

  async function kezeliAdminTorles() {
    if (!onAdminDelete) {
      alert("Hiányzik az onAdminDelete handler a MakettModalból.");
      return;
    }

    if (!window.confirm("Biztosan törlöd ezt a makettet? Ez nem visszavonható!")) return;

    try {
      setMentesFolyamatban(true);
      await onAdminDelete(makettId);
      onClose?.();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Hiba történt törlés közben.");
    } finally {
      setMentesFolyamatban(false);
    }
  }

  // ===== Építési tippek (csak bejelentkezve) =====
  const authHeader = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [bejelentkezve]);

  const [tippekNaplo, setTippekNaplo] = useState(null);
  const [tippekBlokkok, setTippekBlokkok] = useState([]);
  const [tippekBetolt, setTippekBetolt] = useState(false);
  const [tippekHiba, setTippekHiba] = useState(null);

  const [ujBlokk, setUjBlokk] = useState({
    tipus: "osszeepites",
    cim: "",
    tippek: "",
    sorrend: 0,
  });

  const [szerkesztBlokkId, setSzerkesztBlokkId] = useState(null);
  const [szerkesztBlokk, setSzerkesztBlokk] = useState({
    tipus: "osszeepites",
    cim: "",
    tippek: "",
    sorrend: 0,
  });

  const tudTippeketSzerkeszteni = useMemo(() => {
    if (!bejelentkezve || !tippekNaplo) return false;
    if (isAdmin) return true;
    return Number(tippekNaplo.letrehozo_felhasznalo_id) === Number(felhasznalo?.id);
  }, [bejelentkezve, tippekNaplo, isAdmin, felhasznalo]);

  useEffect(() => {
    async function betoltTippek() {
      if (!open || !makettId || !bejelentkezve) return;

      try {
        setTippekBetolt(true);
        setTippekHiba(null);

        const res = await fetch(`${API_BASE_URL}/makettek/${makettId}/epitesi-tippek`, {
          headers: { ...authHeader },
        });

        if (!res.ok) {
          const h = await res.json().catch(() => ({}));
          throw new Error(h.uzenet || "Nem sikerült betölteni az építési naplót.");
        }

        const data = await res.json();
        setTippekNaplo(data.naplo);
        setTippekBlokkok(Array.isArray(data.blokkok) ? data.blokkok : []);
      } catch (err) {
        setTippekHiba(err.message);
        setTippekNaplo(null);
        setTippekBlokkok([]);
      } finally {
        setTippekBetolt(false);
      }
    }

    // reset modal nyitáskor
    if (open) {
      setTippekNaplo(null);
      setTippekBlokkok([]);
      setTippekHiba(null);
      setSzerkesztBlokkId(null);
      setUjBlokk({ tipus: "osszeepites", cim: "", tippek: "", sorrend: 0 });
    }

    betoltTippek();
  }, [open, makettId, bejelentkezve, authHeader]);

  async function tippekNaploLetrehoz() {
    try {
      setTippekBetolt(true);
      setTippekHiba(null);

      const res = await fetch(`${API_BASE_URL}/makettek/${makettId}/epitesi-tippek`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ cim: "Építési napló" }),
      });

      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült létrehozni a naplót.");
      }

      const created = await res.json();
      setTippekNaplo(created);
      setTippekBlokkok([]);
    } catch (err) {
      setTippekHiba(err.message);
    } finally {
      setTippekBetolt(false);
    }
  }

  async function ujBlokkMent() {
    if (!tippekNaplo) return;
    if (!ujBlokk.cim.trim() || !ujBlokk.tippek.trim()) {
      alert("A blokk címe és tippek mezője kötelező.");
      return;
    }

    try {
      setTippekBetolt(true);
      setTippekHiba(null);

      const res = await fetch(`${API_BASE_URL}/epitesi-tippek/${tippekNaplo.id}/blokkok`, {
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
      setTippekBlokkok((prev) =>
        [...prev, created].sort(
          (a, b) => (a.sorrend ?? 0) - (b.sorrend ?? 0) || a.id - b.id
        )
      );
      setUjBlokk({ tipus: "osszeepites", cim: "", tippek: "", sorrend: 0 });
    } catch (err) {
      setTippekHiba(err.message);
    } finally {
      setTippekBetolt(false);
    }
  }

  function szerkesztMegnyit(blokk) {
    setSzerkesztBlokkId(blokk.id);
    setSzerkesztBlokk({
      tipus: blokk.tipus ?? "osszeepites",
      cim: blokk.cim ?? "",
      tippek: blokk.tippek ?? "",
      sorrend: Number(blokk.sorrend ?? 0),
    });
  }

  async function szerkesztMent() {
    if (!szerkesztBlokkId) return;
    if (!szerkesztBlokk.cim.trim() || !szerkesztBlokk.tippek.trim()) {
      alert("A blokk címe és tippek mezője kötelező.");
      return;
    }

    try {
      setTippekBetolt(true);
      setTippekHiba(null);

      const res = await fetch(`${API_BASE_URL}/epitesi-tippek-blokk/${szerkesztBlokkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          tipus: szerkesztBlokk.tipus,
          cim: szerkesztBlokk.cim,
          tippek: szerkesztBlokk.tippek,
          sorrend: Number(szerkesztBlokk.sorrend ?? 0),
        }),
      });

      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült menteni a blokkot.");
      }

      const updated = await res.json();
      setTippekBlokkok((prev) =>
        prev
          .map((b) => (b.id === szerkesztBlokkId ? updated : b))
          .sort((a, b) => (a.sorrend ?? 0) - (b.sorrend ?? 0) || a.id - b.id)
      );
      setSzerkesztBlokkId(null);
    } catch (err) {
      setTippekHiba(err.message);
    } finally {
      setTippekBetolt(false);
    }
  }

  async function blokkTorol(blokkId) {
    if (!window.confirm("Biztosan törlöd ezt a blokkot?")) return;

    try {
      setTippekBetolt(true);
      setTippekHiba(null);

      const res = await fetch(`${API_BASE_URL}/epitesi-tippek-blokk/${blokkId}`, {
        method: "DELETE",
        headers: { ...authHeader },
      });

      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült törölni a blokkot.");
      }

      setTippekBlokkok((prev) => prev.filter((b) => b.id !== blokkId));
      if (szerkesztBlokkId === blokkId) setSzerkesztBlokkId(null);
    } catch (err) {
      setTippekHiba(err.message);
    } finally {
      setTippekBetolt(false);
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

  if (!open || !makett) return null;

  const vasarloLink = normalizalLink(makett.vasarlasi_link);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{makett.nev}</h2>
            <p className="small">
              {makett.gyarto} • {makett.skala} • {makett.kategoria}
            </p>

            <div className="makett-ertekeles">
              <CsillagValaszto value={atlag} readOnly />
              <p className="small">
                Átlag: {Number(atlag).toFixed(1)} ({velemenyek.length} vélemény)
              </p>
            </div>
          </div>

          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {makett.kep_url && (
          <div className="modal-kep-wrap">
            <img className="modal-kep" src={makett.kep_url} alt={makett.nev} />
          </div>
        )}

        <div className="modal-grid">
          <p className="small">
            <strong>Nehézség:</strong> {makett.nehezseg}/5
          </p>

          <p className="small">
            <strong>Megjelenés éve:</strong> {makett.megjelenes_eve}
          </p>
        </div>

        {/* ÚJ: leírás + vásárlási link */}
        {(makett.leiras || vasarloLink) && (
          <section className="card" style={{ marginTop: 12 }}>
            {makett.leiras && (
              <>
                <h3 style={{ marginTop: 0 }}>Leírás</h3>
                <p className="small" style={{ whiteSpace: "pre-wrap", marginBottom: 10 }}>
                  {makett.leiras}
                </p>
              </>
            )}

            {vasarloLink && (
              <div className="button-row" style={{ marginTop: 0 }}>
                <a
                  className="btn"
                  href={vasarloLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Megvásárlás
                </a>

                <a
                  className="btn secondary"
                  href={vasarloLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={vasarloLink}
                >
                  Link megnyitása
                </a>
              </div>
            )}
          </section>
        )}

        <div className="button-row">
          <button
            type="button"
            className={kedvenc ? "btn secondary" : "btn"}
            onClick={() => onToggleKedvenc?.(makettId)}
          >
            {kedvenc ? "Kedvencekből eltávolítás" : "Kedvencekhez adás"}
          </button>

          {isAdmin && !szerkesztesNyitva && (
            <button
              type="button"
              className="btn secondary"
              onClick={() => setSzerkesztesNyitva(true)}
              disabled={mentesFolyamatban}
            >
              Szerkesztés
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              className="btn danger"
              onClick={kezeliAdminTorles}
              disabled={mentesFolyamatban}
            >
              Makett törlése
            </button>
          )}

          <button type="button" className="btn secondary" onClick={onClose}>
            Bezárás
          </button>
        </div>

        {isAdmin && szerkesztesNyitva && (
          <section className="card form" style={{ marginTop: 12 }}>
            <h3>Makett szerkesztése</h3>

            <label>
              Név
              <input value={form.nev} onChange={(e) => setField("nev", e.target.value)} />
            </label>

            <label>
              Gyártó
              <input
                value={form.gyarto}
                onChange={(e) => setField("gyarto", e.target.value)}
              />
            </label>

            <label>
              Skála
              <input value={form.skala} onChange={(e) => setField("skala", e.target.value)} />
            </label>

            <label>
              Kategória
              <input
                value={form.kategoria}
                onChange={(e) => setField("kategoria", e.target.value)}
              />
            </label>

            <label>
              Nehézség (1–5)
              <input
                type="number"
                min={1}
                max={5}
                value={form.nehezseg}
                onChange={(e) => setField("nehezseg", e.target.value)}
              />
            </label>

            <label>
              Megjelenés éve
              <input
                value={form.megjelenes_eve}
                onChange={(e) => setField("megjelenes_eve", e.target.value)}
              />
            </label>

            <label>
              Kép URL
              <input
                value={form.kep_url}
                onChange={(e) => setField("kep_url", e.target.value)}
              />
            </label>

            {/* ÚJ mezők */}
            <label>
              Leírás
              <textarea
                rows={5}
                value={form.leiras}
                onChange={(e) => setField("leiras", e.target.value)}
                placeholder="Írj rövid leírást a makettről…"
              />
            </label>

            <label>
              Vásárlási link
              <input
                value={form.vasarlasi_link}
                onChange={(e) => setField("vasarlasi_link", e.target.value)}
                placeholder="https://..."
              />
            </label>

            <div className="button-row">
              <button
                type="button"
                className="btn"
                onClick={kezeliAdminMentes}
                disabled={mentesFolyamatban}
              >
                Mentés
              </button>

              <button
                type="button"
                className="btn secondary"
                onClick={() => setSzerkesztesNyitva(false)}
                disabled={mentesFolyamatban}
              >
                Mégse
              </button>
            </div>
          </section>
        )}

        {/* Építési tippek (csak bejelentkezve) */}
        {bejelentkezve && (
          <section className="card" style={{ marginTop: 12 }}>
            <h3>Építési napló (tippek)</h3>

            {tippekHiba && <p className="error">{tippekHiba}</p>}
            {tippekBetolt && <p className="small">Betöltés...</p>}

            {!tippekNaplo ? (
              <div className="button-row">
                <button className="btn" type="button" onClick={tippekNaploLetrehoz}>
                  Napló létrehozása
                </button>
              </div>
            ) : (
              <>
                {tippekBlokkok.length === 0 ? (
                  <p className="small">Még nincs blokk ebben a naplóban.</p>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {tippekBlokkok.map((b) => (
                      <div key={b.id} className="card">
                        <div className="makett-fejlec">
                          <div>
                            <h4 style={{ margin: 0 }}>{b.cim}</h4>
                            <p className="small" style={{ margin: 0 }}>
                              {tipusFelirat(b.tipus)} • Sorrend: {b.sorrend ?? 0}
                            </p>
                          </div>

                          {tudTippeketSzerkeszteni && (
                            <div className="button-row" style={{ margin: 0 }}>
                              <button
                                className="btn secondary"
                                type="button"
                                onClick={() => szerkesztMegnyit(b)}
                              >
                                Szerkesztés
                              </button>
                              <button
                                className="btn danger"
                                type="button"
                                onClick={() => blokkTorol(b.id)}
                              >
                                Törlés
                              </button>
                            </div>
                          )}
                        </div>

                        <pre className="naplo-pre">{b.tippek}</pre>

                        {szerkesztBlokkId === b.id && (
                          <div className="card" style={{ marginTop: 10 }}>
                            <h4>Szerkesztés</h4>
                            <label>
                              Típus
                              <select
                                value={szerkesztBlokk.tipus}
                                onChange={(e) =>
                                  setSzerkesztBlokk((p) => ({ ...p, tipus: e.target.value }))
                                }
                              >
                                <option value="osszeepites">Összeépítés</option>
                                <option value="festes">Festés</option>
                                <option value="matricazas">Matricázás</option>
                                <option value="lakkozas">Lakkozás</option>
                                <option value="koszolas">Koszolás</option>
                                <option value="egyeb">Egyéb</option>
                              </select>
                            </label>

                            <label>
                              Cím
                              <input
                                value={szerkesztBlokk.cim}
                                onChange={(e) =>
                                  setSzerkesztBlokk((p) => ({ ...p, cim: e.target.value }))
                                }
                              />
                            </label>

                            <label>
                              Tippek
                              <textarea
                                rows={5}
                                value={szerkesztBlokk.tippek}
                                onChange={(e) =>
                                  setSzerkesztBlokk((p) => ({ ...p, tippek: e.target.value }))
                                }
                              />
                            </label>

                            <label>
                              Sorrend
                              <input
                                type="number"
                                value={szerkesztBlokk.sorrend}
                                onChange={(e) =>
                                  setSzerkesztBlokk((p) => ({
                                    ...p,
                                    sorrend: Number(e.target.value || 0),
                                  }))
                                }
                              />
                            </label>

                            <div className="button-row">
                              <button className="btn" type="button" onClick={szerkesztMent}>
                                Mentés
                              </button>
                              <button
                                className="btn secondary"
                                type="button"
                                onClick={() => setSzerkesztBlokkId(null)}
                              >
                                Mégse
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {tudTippeketSzerkeszteni && (
                  <div className="card" style={{ marginTop: 10 }}>
                    <h4>Új blokk</h4>

                    <label>
                      Típus
                      <select
                        value={ujBlokk.tipus}
                        onChange={(e) => setUjBlokk((p) => ({ ...p, tipus: e.target.value }))}
                      >
                        <option value="osszeepites">Összeépítés</option>
                        <option value="festes">Festés</option>
                        <option value="matricazas">Matricázás</option>
                        <option value="lakkozas">Lakkozás</option>
                        <option value="koszolas">Koszolás</option>
                        <option value="egyeb">Egyéb</option>
                      </select>
                    </label>

                    <label>
                      Cím
                      <input
                        value={ujBlokk.cim}
                        onChange={(e) => setUjBlokk((p) => ({ ...p, cim: e.target.value }))}
                      />
                    </label>

                    <label>
                      Tippek
                      <textarea
                        rows={5}
                        value={ujBlokk.tippek}
                        onChange={(e) => setUjBlokk((p) => ({ ...p, tippek: e.target.value }))}
                      />
                    </label>

                    <label>
                      Sorrend
                      <input
                        type="number"
                        value={ujBlokk.sorrend}
                        onChange={(e) =>
                          setUjBlokk((p) => ({ ...p, sorrend: Number(e.target.value || 0) }))
                        }
                      />
                    </label>

                    <div className="button-row">
                      <button className="btn" type="button" onClick={ujBlokkMent}>
                        Blokk hozzáadása
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* Vélemények */}
        {showReviews && (
          <VelemenyekSection
            makettId={makettId}
            velemenyek={velemenyek}
            bejelentkezve={bejelentkezve}
            felhasznalo={felhasznalo}
            isAdmin={isAdmin}
            formatDatum={formatDatum}
            hozzaadVelemeny={hozzaadVelemeny}
            modositVelemeny={modositVelemeny}
            torolVelemeny={torolVelemeny}
          />
        )}
      </div>
    </div>
  );
}

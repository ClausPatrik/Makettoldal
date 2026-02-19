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
  isModerator,
  hozzaadVelemeny,
  modositVelemeny,
  torolVelemeny,

  onAdminUpdate,
  onAdminDelete,

  // saját maketteknél: csak jóváhagyott esetén lehessen új naplót létrehozni
  allowNaploCreate = true,
}) {
  const makettId = makett?.id ?? makett?.makett_id;
  const API_BASE_URL = "http://localhost:3001/api";



function EpitesiNaplokModal({ open, onClose, makettId, bejelentkezve, felhasznalo, allowNaploCreate }) {
  const authHeader = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [bejelentkezve]);

  const isAdminOrMod = felhasznalo?.szerepkor_id === 2 || felhasznalo?.szerepkor_id === 3;

  const [naplok, setNaplok] = useState([]);
  const [aktivNaploId, setAktivNaploId] = useState("");
  const [blokkok, setBlokkok] = useState([]);

  const [betolt, setBetolt] = useState(false);
  const [hiba, setHiba] = useState(null);

  const [ujNaploCim, setUjNaploCim] = useState("Építési napló");
  const [ujBlokk, setUjBlokk] = useState({ tipus: "osszeepites", cim: "", tippek: "", sorrend: 0 });

  const [szerkId, setSzerkId] = useState(null);
  const [szerk, setSzerk] = useState({ tipus: "osszeepites", cim: "", tippek: "", sorrend: 0 });

  const aktivNaplo = useMemo(() => naplok.find((n) => String(n.id) === String(aktivNaploId)) || null, [naplok, aktivNaploId]);

  const tudSzerkeszteni = useMemo(() => {
    if (!bejelentkezve || !aktivNaplo) return false;
    if (isAdminOrMod) return true;
    return Number(aktivNaplo.letrehozo_felhasznalo_id) === Number(felhasznalo?.id);
  }, [bejelentkezve, aktivNaplo, isAdminOrMod, felhasznalo]);

  function parseNaplok(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.naplok)) return data.naplok;
    if (data.naplo) return [data.naplo];
    // fallback: ha egy napló objektum jön vissza közvetlenül
    if (data.id && (data.makett_id || data.letrehozo_felhasznalo_id)) return [data];
    return [];
  }

  async function betoltNaplok() {
    if (!open || !bejelentkezve || !makettId) return;
    try {
      setBetolt(true);
      setHiba(null);

      const res = await fetch(`${API_BASE_URL}/makettek/${makettId}/epitesi-tippek`, { headers: { ...authHeader } });
      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült betölteni az építési naplókat.");
      }
      const data = await res.json();

      const list = parseNaplok(data);
      setNaplok(list);

      const firstId = list[0]?.id ? String(list[0].id) : "";
      setAktivNaploId((prev) => (prev ? prev : firstId));

      // ha a régi endpoint rögtön blokkokat is ad, használjuk
      if (data.blokkok && (data.naplo || (Array.isArray(data.naplok) && data.naplok.length === 1))) {
        setBlokkok(Array.isArray(data.blokkok) ? data.blokkok : []);
      } else {
        setBlokkok([]);
      }
    } catch (e) {
      setHiba(e.message);
      setNaplok([]);
      setAktivNaploId("");
      setBlokkok([]);
    } finally {
      setBetolt(false);
    }
  }

  async function betoltBlokkok(naploId) {
    if (!open || !bejelentkezve || !naploId) return;
    try {
      setBetolt(true);
      setHiba(null);

      const res = await fetch(`${API_BASE_URL}/epitesi-tippek/${naploId}/blokkok`, { headers: { ...authHeader } });
      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült betölteni a blokkokat.");
      }
      const data = await res.json();
      setBlokkok(Array.isArray(data) ? data : (Array.isArray(data.blokkok) ? data.blokkok : []));
    } catch (e) {
      setHiba(e.message);
      setBlokkok([]);
    } finally {
      setBetolt(false);
    }
  }

  useEffect(() => {
    if (open) {
      setHiba(null);
      setNaplok([]);
      setAktivNaploId("");
      setBlokkok([]);
      setSzerkId(null);
      setUjBlokk({ tipus: "osszeepites", cim: "", tippek: "", sorrend: 0 });
      betoltNaplok();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, makettId, bejelentkezve]);

  useEffect(() => {
    if (open && aktivNaploId) {
      // ha már vannak blokkok (régi endpoint), ne töltsük újra feleslegesen
      if (blokkok.length === 0) betoltBlokkok(aktivNaploId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktivNaploId]);

  async function naploLetrehoz() {
    if (!bejelentkezve || !makettId || !allowNaploCreate) return;
    try {
      setBetolt(true);
      setHiba(null);

      const res = await fetch(`${API_BASE_URL}/makettek/${makettId}/epitesi-tippek`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ cim: ujNaploCim || "Építési napló" }),
      });
      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült létrehozni a naplót.");
      }

      // frissítjük a listát
      await betoltNaplok();
    } catch (e) {
      setHiba(e.message);
    } finally {
      setBetolt(false);
    }
  }

  async function ujBlokkMentes() {
    if (!tudSzerkeszteni || !aktivNaploId) return;
    try {
      setBetolt(true);
      setHiba(null);

      const res = await fetch(`${API_BASE_URL}/epitesi-tippek/${aktivNaploId}/blokkok`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(ujBlokk),
      });
      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült létrehozni a blokkot.");
      }
      setUjBlokk({ tipus: "osszeepites", cim: "", tippek: "", sorrend: 0 });
      await betoltBlokkok(aktivNaploId);
    } catch (e) {
      setHiba(e.message);
    } finally {
      setBetolt(false);
    }
  }

  function szerkesztMegnyit(b) {
    setSzerkId(b.id);
    setSzerk({ tipus: b.tipus, cim: b.cim, tippek: b.tippek, sorrend: b.sorrend ?? 0 });
  }

  async function blokkMent(blokkId) {
    if (!tudSzerkeszteni || !blokkId) return;
    try {
      setBetolt(true);
      setHiba(null);

      const res = await fetch(`${API_BASE_URL}/epitesi-tippek-blokk/${blokkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(szerk),
      });
      if (!res.ok) {
        const h = await res.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült menteni a blokkot.");
      }
      setSzerkId(null);
      await betoltBlokkok(aktivNaploId);
    } catch (e) {
      setHiba(e.message);
    } finally {
      setBetolt(false);
    }
  }

  async function blokkTorol(blokkId) {
    if (!tudSzerkeszteni || !blokkId) return;
    if (!window.confirm("Biztosan törlöd a blokkot?")) return;

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
      await betoltBlokkok(aktivNaploId);
    } catch (e) {
      setHiba(e.message);
    } finally {
      setBetolt(false);
    }
  }

  function tipusFelirat(tipus) {
    switch (tipus) {
      case "osszeepites": return "Összeépítés";
      case "festes": return "Festés";
      case "matricazas": return "Matricázás";
      case "lakkozas": return "Lakkozás";
      case "koszolas": return "Koszolás";
      default: return "Egyéb";
    }
  }

  if (!open) return null;

  return (
    <div className="modal-overlay naplo-overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>Építési naplók</h2>
          <button className="modal-close" onClick={onClose} aria-label="Bezárás">✕</button>
        </div>

        {hiba && <p className="error">{hiba}</p>}
        {betolt && <p className="small">Betöltés...</p>}

        <section className="card" style={{ marginTop: 10 }}>
          <h3 style={{ marginTop: 0 }}>Napló kiválasztása</h3>

          {naplok.length === 0 ? (
            <p className="small">Még nincs napló ehhez a maketthez.</p>
          ) : (
            <label>
              Elérhető naplók
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

          <div className="card" style={{ marginTop: 10 }}>
            <h4 style={{ marginTop: 0 }}>Új napló létrehozása</h4>

            {!allowNaploCreate ? (
              <div className="alert warn" style={{ margin: 0 }}>
                Ez a makett még <b>nincs jóváhagyva</b>, ezért új építési naplót csak jóváhagyás után lehet létrehozni.
              </div>
            ) : (
              <div className="button-row">
                <input
                  style={{ flex: 1, minWidth: 180 }}
                  value={ujNaploCim}
                  onChange={(e) => setUjNaploCim(e.target.value)}
                  placeholder="Napló címe"
                />
                <button
                  className="btn"
                  type="button"
                  onClick={naploLetrehoz}
                  disabled={!bejelentkezve || betolt}
                >
                  Létrehozás
                </button>
              </div>
            )}
          </div>
        </section>

        {aktivNaplo ? (
          <section className="card" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Blokkok</h3>

            {!tudSzerkeszteni && (
              <p className="small">
                Ezeket a blokkokat csak a napló készítője, admin vagy moderátor szerkesztheti.
              </p>
            )}

            {blokkok.length === 0 ? (
              <p className="small">Még nincs blokk ebben a naplóban.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {blokkok.map((b) => (
                  <div key={b.id} className="card" style={{ margin: 0 }}>
                    <div className="makett-fejlec">
                      <div>
                        <h4 style={{ margin: 0 }}>{b.cim}</h4>
                        <p className="small" style={{ margin: 0 }}>
                          {tipusFelirat(b.tipus)} • Sorrend: {b.sorrend ?? 0}
                        </p>
                      </div>

                      {tudSzerkeszteni && (
                        <div className="button-row" style={{ margin: 0 }}>
                          <button className="btn secondary" type="button" onClick={() => szerkesztMegnyit(b)}>
                            Szerkesztés
                          </button>
                          <button className="btn danger" type="button" onClick={() => blokkTorol(b.id)}>
                            Törlés
                          </button>
                        </div>
                      )}
                    </div>

                    <pre className="naplo-pre">{b.tippek}</pre>

                    {szerkId === b.id && tudSzerkeszteni && (
                      <div className="card" style={{ marginTop: 10 }}>
                        <h4>Szerkesztés</h4>

                        <label>
                          Típus
                          <select
                            value={szerk.tipus}
                            onChange={(e) => setSzerk((p) => ({ ...p, tipus: e.target.value }))}
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
                          <input value={szerk.cim} onChange={(e) => setSzerk((p) => ({ ...p, cim: e.target.value }))} />
                        </label>

                        <label>
                          Tippek / leírás
                          <textarea
                            rows={6}
                            value={szerk.tippek}
                            onChange={(e) => setSzerk((p) => ({ ...p, tippek: e.target.value }))}
                          />
                        </label>

                        <label>
                          Sorrend
                          <input
                            type="number"
                            value={szerk.sorrend}
                            onChange={(e) => setSzerk((p) => ({ ...p, sorrend: Number(e.target.value) || 0 }))}
                          />
                        </label>

                        <div className="button-row">
                          <button className="btn" type="button" onClick={() => blokkMent(b.id)} disabled={betolt}>
                            Mentés
                          </button>
                          <button className="btn secondary" type="button" onClick={() => setSzerkId(null)}>
                            Mégse
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tudSzerkeszteni && (
              <div className="card" style={{ marginTop: 12 }}>
                <h4>Új blokk</h4>

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
                  Cím
                  <input value={ujBlokk.cim} onChange={(e) => setUjBlokk((p) => ({ ...p, cim: e.target.value }))} />
                </label>

                <label>
                  Tippek / leírás
                  <textarea
                    rows={6}
                    value={ujBlokk.tippek}
                    onChange={(e) => setUjBlokk((p) => ({ ...p, tippek: e.target.value }))}
                  />
                </label>

                <label>
                  Sorrend
                  <input
                    type="number"
                    value={ujBlokk.sorrend}
                    onChange={(e) => setUjBlokk((p) => ({ ...p, sorrend: Number(e.target.value) || 0 }))}
                  />
                </label>

                <div className="button-row">
                  <button className="btn" type="button" onClick={ujBlokkMentes} disabled={betolt}>
                    Blokk hozzáadása
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}

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

  
  // ===== Építési naplók (külön modalban, csak bejelentkezve) =====
  const [naplokModalOpen, setNaplokModalOpen] = useState(false);
  if (!open || !makett) return null;


  const vasarloLink = normalizalLink(makett?.vasarlasi_link);
  return (
    <>
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
            <h3>Építési naplók</h3>
            <p className="small" style={{ marginTop: 6 }}>
              A naplókat külön ablakban tudod megnyitni (blokkok, szerkesztés, új napló).
            </p>

            {!allowNaploCreate && (
              <div className="alert warn" style={{ marginTop: 8 }}>
                <b>Figyelem:</b> amíg a makett nincs jóváhagyva, <b>új napló létrehozása nem engedélyezett</b>.
              </div>
            )}

            <div className="button-row">
              <button className="btn" type="button" onClick={() => setNaplokModalOpen(true)}>
                Megtekintés
              </button>
            </div>
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
            isModerator={isModerator}
            formatDatum={formatDatum}
            hozzaadVelemeny={hozzaadVelemeny}
            modositVelemeny={modositVelemeny}
            torolVelemeny={torolVelemeny}
          />
        )}
      </div>
    </div>

      <EpitesiNaplokModal
        open={naplokModalOpen}
        onClose={() => setNaplokModalOpen(false)}
        makettId={makettId}
        bejelentkezve={bejelentkezve}
        felhasznalo={felhasznalo}
        allowNaploCreate={allowNaploCreate}
      />
    </>
  );
}
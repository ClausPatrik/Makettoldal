import React, { useEffect, useMemo, useState } from "react";
import CsillagValaszto from "./CsillagValaszto";
import VelemenyekSection from "./VelemenyekSection";

/**
 * MakettModal komponens
 *
 * Feladata:
 * - Egy kiválasztott makett részleteinek megjelenítése modál ablakban
 * - Kedvencek kezelése (hozzáadás / eltávolítás)
 * - Admin funkciók: szerkesztés + törlés
 * - Vélemények megjelenítése + kezelése (hozzáadás/módosítás/törlés jogosultság szerint)
 * - Építési naplók / tippek: külön modalban (csak bejelentkezve érhető el)
 * - Makett leírás + vásárlási link: megjelenítés, admin esetén szerkeszthető
 *
 * Fontos:
 * - A modál overlay-re kattintva bezárható, de a belső "modal card" kattintása nem zárja be.
 * - ESC billentyűre is bezárható.
 */
export default function MakettModal({
  open,
  makett,
  onClose,

  // számolt értékek (pl. átlag rating és vélemény lista a parent komponensből jön)
  atlag = 0,
  velemenyek = [],
  kedvenc = false,
  onToggleKedvenc,

  // ha false, a vélemények szekció nem renderelődik (pl. bizonyos oldalakon)
  showReviews = true,

  // felhasználói állapot + jogosultságok (vélemény műveletekhez, naplókhoz)
  bejelentkezve,
  felhasznalo,
  isAdmin,
  formatDatum,
  isModerator,
  hozzaadVelemeny,
  modositVelemeny,
  torolVelemeny,

  // admin műveleti handlerek (külső komponens intézi az API hívást)
  onAdminUpdate,
  onAdminDelete,

  // Saját maketteknél: csak jóváhagyott esetén lehessen új naplót létrehozni
  allowNaploCreate = true,
}) {
  // Makett azonosító kezelése: néha id, néha makett_id néven érkezik
  const makettId = makett?.id ?? makett?.makett_id;

  // API alap URL (építési naplók / blokkok végpontjai ehhez viszonyítva vannak)
  const API_BASE_URL = "http://localhost:3001/api";

  // Backend alap URL a relatív képutak (pl. /uploads/...) kiegészítéséhez
  const BACKEND_BASE = "http://localhost:3001";

  const kepSrc = useMemo(() => {
    // Kép URL normalizálás:
    // - ha teljes URL (http/https), akkor úgy hagyjuk
    // - ha relatív (pl. /uploads/...), akkor backend domain-t fűzünk elé
    const url = makett?.kep_url;
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${BACKEND_BASE}${url}`; // /uploads/... -> http://localhost:3001/uploads/...
  }, [makett?.kep_url]);

  /**
   * EpitesiNaplokModal (belső alkomponens)
   *
   * Külön modál az építési naplókhoz:
   * - naplók listázása / kiválasztása
   * - blokkok betöltése a kiválasztott naplóhoz
   * - jogosultság alapján szerkesztés / törlés
   * - új napló és új blokk létrehozása
   *
   * Megjegyzés:
   * - Az auth fejlécet a localStorage token alapján állítja össze.
   * - Van "régi endpoint" kompatibilitás: néha a naplók mellett rögtön blokkokat is visszaadhat az API.
   */
  function EpitesiNaplokModal({ open, onClose, makettId, bejelentkezve, felhasznalo, allowNaploCreate }) {
    const authHeader = useMemo(() => {
      // Authorization header összeállítása a JWT tokenből
      // (ha nincs token, üres objektumot adunk vissza)
      const token = localStorage.getItem("token");
      return token ? { Authorization: `Bearer ${token}` } : {};
    }, [bejelentkezve]);

    // Admin vagy moderátor jogosultság jelző (szerepkor_id alapján)
    const isAdminOrMod = felhasznalo?.szerepkor_id === 2 || felhasznalo?.szerepkor_id === 3;

    // Naplók listája + kiválasztott napló azonosítója
    const [naplok, setNaplok] = useState([]);
    const [aktivNaploId, setAktivNaploId] = useState("");

    // Kiválasztott napló blokkjai (építési tippek szöveges blokkok)
    const [blokkok, setBlokkok] = useState([]);

    // UI állapotok: betöltés és hibaüzenet
    const [betolt, setBetolt] = useState(false);
    const [hiba, setHiba] = useState(null);

    // Új napló / új blokk felviteli állapotok (kontrollált mezők)
    const [ujNaploCim, setUjNaploCim] = useState("Építési napló");
    const [ujBlokk, setUjBlokk] = useState({ tipus: "osszeepites", cim: "", tippek: "", sorrend: 0 });

    // Szerkesztés állapot (melyik blokkot szerkesztjük, és a szerkesztett adatok)
    const [szerkId, setSzerkId] = useState(null);
    const [szerk, setSzerk] = useState({ tipus: "osszeepites", cim: "", tippek: "", sorrend: 0 });

    // Az aktuálisan kiválasztott napló objektum a naplók listájából
    const aktivNaplo = useMemo(
      () => naplok.find((n) => String(n.id) === String(aktivNaploId)) || null,
      [naplok, aktivNaploId]
    );

    const tudSzerkeszteni = useMemo(() => {
      // Szerkesztési jogosultság:
      // - be kell jelentkezni
      // - kell legyen kiválasztott napló
      // - admin/mod: mindig szerkeszthet
      // - különben csak a napló létrehozója szerkeszthet
      if (!bejelentkezve || !aktivNaplo) return false;
      if (isAdminOrMod) return true;
      return Number(aktivNaplo.letrehozo_felhasznalo_id) === Number(felhasznalo?.id);
    }, [bejelentkezve, aktivNaplo, isAdminOrMod, felhasznalo]);

    function parseNaplok(data) {
      // API válasz normalizálása:
      // eltérő backend válaszformátumok esetén is tömbbé alakítjuk a naplókat
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.naplok)) return data.naplok;
      if (data.naplo) return [data.naplo];
      // fallback: ha egy napló objektum jön vissza közvetlenül
      if (data.id && (data.makett_id || data.letrehozo_felhasznalo_id)) return [data];
      return [];
    }

    async function betoltNaplok() {
      // Naplók betöltése:
      // - csak akkor, ha a modal nyitva van, a user be van jelentkezve, és van makettId
      if (!open || !bejelentkezve || !makettId) return;

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

        // Naplók listája beállítás
        const list = parseNaplok(data);
        setNaplok(list);

        // Ha még nincs kiválasztott napló, automatikusan az elsőt kiválasztjuk
        const firstId = list[0]?.id ? String(list[0].id) : "";
        setAktivNaploId((prev) => (prev ? prev : firstId));

        // Régi endpoint kompatibilitás:
        // ha a válasz tartalmaz blokkokat is, és csak 1 naplóhoz kötött,
        // akkor azonnal beállítjuk a blokkokat
        if (data.blokkok && (data.naplo || (Array.isArray(data.naplok) && data.naplok.length === 1))) {
          setBlokkok(Array.isArray(data.blokkok) ? data.blokkok : []);
        } else {
          setBlokkok([]);
        }
      } catch (e) {
        // Hibánál mindent visszaállítunk üresre, és kiírjuk az üzenetet
        setHiba(e.message);
        setNaplok([]);
        setAktivNaploId("");
        setBlokkok([]);
      } finally {
        setBetolt(false);
      }
    }

    async function betoltBlokkok(naploId) {
      // Blokkok betöltése a kiválasztott naplóhoz
      if (!open || !bejelentkezve || !naploId) return;

      try {
        setBetolt(true);
        setHiba(null);

        const res = await fetch(`${API_BASE_URL}/epitesi-tippek/${naploId}/blokkok`, {
          headers: { ...authHeader },
        });

        if (!res.ok) {
          const h = await res.json().catch(() => ({}));
          throw new Error(h.uzenet || "Nem sikerült betölteni a blokkokat.");
        }

        const data = await res.json();

        // Támogatjuk azt is, ha a backend közvetlen tömböt ad vissza, vagy { blokkok: [] } formátumot
        setBlokkok(Array.isArray(data) ? data : (Array.isArray(data.blokkok) ? data.blokkok : []));
      } catch (e) {
        setHiba(e.message);
        setBlokkok([]);
      } finally {
        setBetolt(false);
      }
    }

    useEffect(() => {
      // Modal nyitásakor "resetelünk" és betöltjük a napló listát
      // (így a korábbi makett adatai nem keverednek be)
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
      // Ha változik a kiválasztott napló, betöltjük hozzá a blokkokat.
      // Kivétel: ha már vannak blokkok (régi endpointból), akkor nem kérjük le újra.
      if (open && aktivNaploId) {
        if (blokkok.length === 0) betoltBlokkok(aktivNaploId);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aktivNaploId]);

    async function naploLetrehoz() {
      // Új napló létrehozása: csak bejelentkezve + makettId + allowNaploCreate esetén
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

        // Naplók listájának frissítése, hogy az új napló is megjelenjen
        await betoltNaplok();
      } catch (e) {
        setHiba(e.message);
      } finally {
        setBetolt(false);
      }
    }

    async function ujBlokkMentes() {
      // Új blokk mentése: csak akkor, ha a user szerkeszthet és van aktív napló
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

        // Siker után ürítjük az új blokk űrlapot, majd frissítjük a blokkok listáját
        setUjBlokk({ tipus: "osszeepites", cim: "", tippek: "", sorrend: 0 });
        await betoltBlokkok(aktivNaploId);
      } catch (e) {
        setHiba(e.message);
      } finally {
        setBetolt(false);
      }
    }

    function szerkesztMegnyit(b) {
      // Egy blokk szerkesztésének megnyitása:
      // eltároljuk a szerkesztett blokk id-jét és előtöltjük a form state-et
      setSzerkId(b.id);
      setSzerk({ tipus: b.tipus, cim: b.cim, tippek: b.tippek, sorrend: b.sorrend ?? 0 });
    }

    async function blokkMent(blokkId) {
      // Blokk módosítás mentése PUT-tal (csak jogosultsággal)
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

        // Siker után bezárjuk a szerkesztést és frissítjük a blokkok listáját
        setSzerkId(null);
        await betoltBlokkok(aktivNaploId);
      } catch (e) {
        setHiba(e.message);
      } finally {
        setBetolt(false);
      }
    }

    async function blokkTorol(blokkId) {
      // Blokk törlés DELETE-tal (csak jogosultsággal)
      if (!tudSzerkeszteni || !blokkId) return;

      // Visszajelzés a felhasználónak, mert törlés nem visszavonható
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

        // Siker után frissítjük a listát
        await betoltBlokkok(aktivNaploId);
      } catch (e) {
        setHiba(e.message);
      } finally {
        setBetolt(false);
      }
    }

    function tipusFelirat(tipus) {
      // Backendben tárolt típus kódok -> felhasználóbarát felirat
      switch (tipus) {
        case "osszeepites": return "Összeépítés";
        case "festes": return "Festés";
        case "matricazas": return "Matricázás";
        case "lakkozas": return "Lakkozás";
        case "koszolas": return "Koszolás";
        default: return "Egyéb";
      }
    }

    // Ha a modal zárva van, ne rendereljünk semmit (teljesen eltűnik a DOM-ból)
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
                    // Napló váltáskor töröljük a blokkokat, hogy biztos újratöltődjön a megfelelő lista
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

              {/* Ha a makett nincs jóváhagyva, új napló tiltva (UX visszajelzés) */}
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
                    // Betöltés alatt tiltjuk a duplakattintást
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

              {/* Jogosultsági infó: ha nem szerkeszthet, jelezzük */}
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

                        {/* Szerkesztés/törlés gombok csak akkor, ha van jogosultság */}
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

                      {/* Tippek megjelenítése pre tagben (formázás megtartása) */}
                      <pre className="naplo-pre">{b.tippek}</pre>

                      {/* Inline blokk szerkesztő – csak az adott blokk esetén nyílik meg */}
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

              {/* Új blokk felvitele csak akkor, ha szerkeszthet */}
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
    // Háttér görgetés letiltása, amíg a modal nyitva van (jobb UX)
    document.body.style.overflow = open ? "hidden" : "";

    // Cleanup: bezáráskor vagy komponens unmountnál visszaállítjuk
    return () => (document.body.style.overflow = "");
  }, [open]);

  useEffect(() => {
    // ESC billentyű kezelése: modal bezárása
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKey);

    // Cleanup: event listener eltávolítása
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // ===== Admin szerkesztés =====
  // Admin felületen a szerkesztő blokk megnyitása/zárása és mentési állapot jelző
  const [szerkesztesNyitva, setSzerkesztesNyitva] = useState(false);
  const [mentesFolyamatban, setMentesFolyamatban] = useState(false);

  // Admin szerkesztő űrlap state: a makett adatait ide töltjük be megnyitáskor
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
    // Modal megnyitásakor betöltjük a form state-et a kiválasztott makett adataival
    if (!open || !makett) return;

    // Minden megnyitásnál alap reset, hogy a régi állapot ne maradjon bent
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
    // Űrlap mezők frissítése kulcs alapján (egyszerűbb, mint mezőnként külön state)
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function normalizalLink(url) {
    // Vásárlási link normalizálás:
    // - whitespace levágás
    // - ha nincs protokoll, https:// eléfűzés
    if (!url) return "";
    const u = String(url).trim();
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    return "https://" + u;
  }

  async function kezeliAdminMentes() {
    // Admin mentés: a tényleges API hívást a parent handler végzi (onAdminUpdate)
    if (!onAdminUpdate) {
      alert("Hiányzik az onAdminUpdate handler a MakettModalból.");
      return;
    }

    try {
      setMentesFolyamatban(true);

      // Payload összeállítása: csak a szükséges mezőket küldjük
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
    // Admin törlés: a tényleges API hívást a parent handler végzi (onAdminDelete)
    if (!onAdminDelete) {
      alert("Hiányzik az onAdminDelete handler a MakettModalból.");
      return;
    }

    // Biztonsági megerősítés: törlés nem visszavonható
    if (!window.confirm("Biztosan törlöd ezt a makettet? Ez nem visszavonható!")) return;

    try {
      setMentesFolyamatban(true);
      await onAdminDelete(makettId);

      // Sikeres törlés után bezárjuk a modalt
      onClose?.();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Hiba történt törlés közben.");
    } finally {
      setMentesFolyamatban(false);
    }
  }

  // ===== Építési naplók (külön modalban, csak bejelentkezve) =====
  // A naplók külön modalban nyílnak, hogy ne legyen túlzsúfolt a fő MakettModal
  const [naplokModalOpen, setNaplokModalOpen] = useState(false);

  // Ha a MakettModal nincs nyitva vagy nincs makett, akkor nem renderelünk semmit
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

              {/* Átlagos értékelés (csillag + szám) */}
              <div className="makett-ertekeles">
                <CsillagValaszto value={atlag} readOnly />
                <p className="small">
                  Átlag: {Number(atlag).toFixed(1)} ({velemenyek.length} vélemény)
                </p>
              </div>
            </div>

            {/* Bezárás gomb */}
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>

          {/* Makett kép megjelenítése (ha van) */}
          {makett.kep_url && (
            <div className="modal-kep-wrap">
              <img className="modal-kep" src={kepSrc} alt={makett.nev} />
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

          {/* Leírás + vásárlási link: csak akkor, ha van mit mutatni */}
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

              {/* Vásárlási link gombok: külön "Megvásárlás" és "Link megnyitása" */}
              {vasarloLink && (
                <div className="button-row" style={{ marginTop: 0 }}>
                  <a className="btn" href={vasarloLink} target="_blank" rel="noopener noreferrer">
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
            {/* Kedvenc gomb */}
            <button
              type="button"
              className={kedvenc ? "btn secondary" : "btn"}
              onClick={() => onToggleKedvenc?.(makettId)}
            >
              {kedvenc ? "Kedvencekből eltávolítás" : "Kedvencekhez adás"}
            </button>

            {/* Admin: szerkesztés megnyitása */}
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

            {/* Admin: törlés */}
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

            {/* Bezárás */}
            <button type="button" className="btn secondary" onClick={onClose}>
              Bezárás
            </button>
          </div>

          {/* Admin szerkesztő űrlap */}
          {isAdmin && szerkesztesNyitva && (
            <section className="card form" style={{ marginTop: 12 }}>
              <h3>Makett szerkesztése</h3>

              <label>
                Név
                <input value={form.nev} onChange={(e) => setField("nev", e.target.value)} />
              </label>

              <label>
                Gyártó
                <input value={form.gyarto} onChange={(e) => setField("gyarto", e.target.value)} />
              </label>

              <label>
                Skála
                <input value={form.skala} onChange={(e) => setField("skala", e.target.value)} />
              </label>

              <label>
                Kategória
                <input value={form.kategoria} onChange={(e) => setField("kategoria", e.target.value)} />
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
                <input value={form.megjelenes_eve} onChange={(e) => setField("megjelenes_eve", e.target.value)} />
              </label>

              <label>
                Kép URL
                <input value={form.kep_url} onChange={(e) => setField("kep_url", e.target.value)} />
              </label>

              {/* Új mezők: leírás + vásárlási link */}
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
                <button type="button" className="btn" onClick={kezeliAdminMentes} disabled={mentesFolyamatban}>
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

          {/* Építési naplók szekció: csak bejelentkezve látható */}
          {bejelentkezve && (
            <section className="card" style={{ marginTop: 12 }}>
              <h3>Építési naplók</h3>
              <p className="small" style={{ marginTop: 6 }}>
                A naplókat külön ablakban tudod megnyitni (blokkok, szerkesztés, új napló).
              </p>

              {/* UX figyelmeztetés: jóváhagyás nélkül nem készíthető új napló */}
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

          {/* Vélemények szekció */}
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

      {/* Építési naplók modal komponens – a fő modalon kívül, külön renderelve */}
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
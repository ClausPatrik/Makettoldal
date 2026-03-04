import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useAdat } from "../context/AdatContext";
import { Link, useNavigate } from "react-router-dom";

/**
 * Backend API bázis URL (REST végpontok).
 * Megjegyzés: lokális fejlesztés; éles környezetben jellemzően env-ből jön.
 */
const API_BASE_URL = "http://localhost:3001/api";

/**
 * Fájl/kép kiszolgálás bázisa:
 * - a backend root URL (API-ból levágjuk az "/api" részt)
 * - relatív feltöltési útvonalakhoz (pl. "/uploads/...") használjuk
 */
const FILE_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

/**
 * Profilkép URL normalizálása:
 * - ha az URL relatív feltöltési útvonal ("/uploads/..."), akkor a backend base URL-lel egészítjük ki
 * - egyébként változatlanul használjuk (pl. teljes https URL)
 */
function normalizalKepUrl(url) {
  if (!url) return "";
  if (url.startsWith("/uploads/")) return FILE_BASE_URL + url;
  return url;
}

/**
 * Determinisztikus “avatar háttérszín” generálás névből.
 * Cél: ha nincs profilkép, akkor a fallback avatar mindig ugyanazt a színt kapja az adott névhez.
 */
function generalSzin(nev) {
  if (!nev) return "#4b5563";
  let hash = 0;
  for (let i = 0; i < nev.length; i++) {
    hash = nev.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

/**
 * AvatarNagy
 * - ha van profilkép URL, akkor képet jelenít meg
 * - különben fallback “monogram” avatart: első betű + név-alapú háttérszín
 */
function AvatarNagy({ nev, profilKepUrl }) {
  if (profilKepUrl) {
    return (
      <div className="profile-avatar-wrapper">
        <img
          src={normalizalKepUrl(profilKepUrl)}
          alt={`${nev || "Felhasználó"} profilképe`}
          className="profile-avatar-image"
        />
      </div>
    );
  }

  const safeNev = (nev || "P").trim();
  const kezdobetu = safeNev.charAt(0).toUpperCase();
  const hatter = generalSzin(safeNev);

  return (
    <div
      className="profile-avatar-fallback"
      style={{ background: hatter }}
      aria-label="Profil avatar"
      title={safeNev}
    >
      {kezdobetu}
    </div>
  );
}

export default function Profil() {
  /**
   * AuthContext:
   * - `felhasznalo`, `bejelentkezve`: auth state
   * - `kijelentkezes`: session törlése
   * - `profilFrissites`: profiladatok frissítése (név, profilkép URL)
   */
  const { felhasznalo, bejelentkezve, kijelentkezes, profilFrissites } = useAuth();

  /**
   * AdatContext:
   * - `makettek`: makettek listája
   * - `kedvencek`: kedvenc ID-k listája
   * - `betoltKedvencek`: kedvencek betöltése a backendből
   */
  const { makettek, kedvencek, betoltKedvencek } = useAdat();

  const navigate = useNavigate();

  // Form state: szerkeszthető név + profilkép URL + opcionális feltöltött fájl
  const [nev, beallitNev] = useState(felhasznalo?.felhasznalo_nev || "");
  const [profilKepUrl, beallitProfilKepUrl] = useState(felhasznalo?.profil_kep_url || "");
  const [ujProfilKep, beallitUjProfilKep] = useState(null);

  // Mentés folyamatban jelző (gomb tiltás / spinner jellegű UX)
  const [mentesFolyamatban, beallitMentesFolyamatban] = useState(false);

  /**
   * Auth guard + kedvencek betöltése:
   * - ha nincs bejelentkezve, átirányítjuk
   * - ha be van, akkor betöltjük a kedvenceket, hogy a lista/statisztika naprakész legyen
   */
  useEffect(() => {
    if (!bejelentkezve) {
      navigate("/bejelentkezes");
      return;
    }
    betoltKedvencek();
  }, [bejelentkezve, navigate, betoltKedvencek]);

  /**
   * Ha a felhasználó objektum frissül (pl. belépés után, vagy profil mentése után),
   * akkor szinkronizáljuk a form state-et is.
   */
  useEffect(() => {
    if (felhasznalo) {
      beallitNev(felhasznalo.felhasznalo_nev || "");
      beallitProfilKepUrl(normalizalKepUrl(felhasznalo.profil_kep_url || ""));
    }
  }, [felhasznalo]);

  // UI: amíg nincs bejelentkezve, nem renderelünk profilt (a redirect is lefut)
  if (!bejelentkezve) return null;

  /**
   * Profil mentése:
   * 1) alap adatok mentése (név + profilkép URL) a contexten keresztül
   * 2) opcionális: fájlfeltöltés külön endpointon (multipart/form-data)
   * 3) feltöltés után a backend által visszaadott URL-t újra elmentjük profilFrissites-sel
   */
  async function kezeliProfilMentese(e) {
    e.preventDefault();
    try {
      beallitMentesFolyamatban(true);

      // 1) Név / profil URL frissítése
      await profilFrissites({
        felhasznalo_nev: nev,
        profil_kep_url: profilKepUrl,
      });

      // 2) Ha van feltöltött kép → külön kérés
      if (ujProfilKep) {
        const formData = new FormData();
        formData.append("profilkep", ujProfilKep);

        const token = localStorage.getItem("token");

        // Megjegyzés: FormData esetén nem állítunk be manuálisan Content-Type-ot (boundary miatt).
        const valasz = await fetch(`${API_BASE_URL}/profil/feltoltes`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const data = await valasz.json();
        if (data.kepUrl) {
          // A kapott URL-t beállítjuk és persistáljuk is a profilban
          beallitProfilKepUrl(data.kepUrl);
          await profilFrissites({
            felhasznalo_nev: nev,
            profil_kep_url: data.kepUrl,
          });
        }
      }

      alert("Profil sikeresen frissítve!");
    } catch (err) {
      alert(err.message);
    } finally {
      beallitMentesFolyamatban(false);
    }
  }

  /**
   * Kijelentkezés:
   * - auth state törlése (tokenek, user state)
   * - navigáció a főoldalra
   */
  function kezeliKijelentkezes() {
    kijelentkezes();
    navigate("/");
  }

  /**
   * Kedvenc makettek kinyerése:
   * - a makettek listájából kiszűrjük azokat, amelyek ID-ja benne van a `kedvencek` tömbben
   * Megjegyzés: feltételezi, hogy `kedvencek` ID-lista (nem objektum lista).
   */
  const kedvencMakettek = makettek.filter((m) => kedvencek.includes(m.id));

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h1 style={{ marginBottom: 6 }}>Profilom</h1>
          <p className="small" style={{ margin: 0 }}>
            Adataid frissítése és kedvenceid kezelése.
          </p>
        </div>
        <div className="chip">
          {felhasznalo?.szerepkor_id === 2 ? "ADMIN ACCESS" : "USER ACCESS"}
        </div>
      </div>

      <div className="profile-grid">
        {/* BAL: felhasználói összefoglaló kártya (avatar + meta + stat + kijelentkezés) */}
        <aside className="card profile-side">
          <div className="profile-side-top">
            <AvatarNagy nev={nev} profilKepUrl={profilKepUrl} />
            <div className="profile-side-meta">
              <div className="profile-name">{nev || "Felhasználó"}</div>
              <div className="profile-email">{felhasznalo.email}</div>
              <div className="profile-role">
                <span className="chip">
                  {felhasznalo.szerepkor_id === 2 ? "ADMIN" : "FELHASZNÁLÓ"}
                </span>
              </div>
            </div>
          </div>

          <div className="profile-side-stats">
            <div className="stat">
              <div className="stat-label">Kedvencek</div>
              <div className="stat-value">{kedvencMakettek.length}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Státusz</div>
              <div className="stat-value ok">ONLINE</div>
            </div>
          </div>

          <div className="profile-side-actions">
            <button type="button" className="btn danger" onClick={kezeliKijelentkezes}>
              Kijelentkezés
            </button>
          </div>
        </aside>

        {/* JOBB: profil szerkesztés (név, profilkép URL, fájlfeltöltés) */}
        <div className="card profile-main">
          <div className="profile-main-head">
            <h2 style={{ margin: 0 }}>Profil beállítások</h2>
            <div className="chip">PROFILE CONFIG</div>
          </div>

          <form onSubmit={kezeliProfilMentese} className="form profile-form-grid">
            <label>
              Név
              <input
                type="text"
                value={nev}
                onChange={(e) => beallitNev(e.target.value)}
                required
              />
            </label>

            <label>
              Profilkép URL
              <input
                type="url"
                value={profilKepUrl}
                onChange={(e) => beallitProfilKepUrl(e.target.value)}
                placeholder="https://..."
              />
            </label>

            <div className="profile-file">
              <label className="profile-file-label">Profilkép feltöltése</label>

              {/* Rejtett file input: a label gombbal triggereljük (jobb UX) */}
              <input
                type="file"
                id="profilkep-file"
                accept="image/*"
                className="file-hidden-input"
                onChange={(e) => beallitUjProfilKep(e.target.files[0])}
              />

              {/* “Szép” gomb: label-ként működik, a rejtett inputot nyitja */}
              <label htmlFor="profilkep-file" className="file-btn">
                📁 Fájl kiválasztása
              </label>

              {/* Kiválasztott fájl neve */}
              {ujProfilKep && (
                <div className="file-name">
                  Kiválasztva: <strong>{ujProfilKep.name}</strong>
                </div>
              )}

              <span className="small file-hint">
                Tipp: 1–2 MB alatti JPG vagy PNG ajánlott.
              </span>
            </div>

            {/* Kép előnézet a kiválasztott fájlról (helyi objektum URL-lel) */}
            {ujProfilKep && (
              <div className="makett-kep-wrapper" style={{ marginTop: 10 }}>
                <img
                  src={URL.createObjectURL(ujProfilKep)}
                  alt="Profilkép előnézet"
                  className="makett-kep"
                />
              </div>
            )}

            <div className="profile-form-actions">
              <button type="submit" className="btn" disabled={mentesFolyamatban}>
                {mentesFolyamatban ? "Mentés..." : "Profil mentése"}
              </button>

              <Link to="/makettek" className="btn secondary profile-linkbtn">
                Makettek megnyitása
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Kedvencek: egyszerű listanézet a profil oldalon */}
      <section className="card" style={{ marginTop: 16 }}>
        <div className="profile-main-head" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Kedvenc makettjeim</h2>
          <div className="chip">FAVORITES</div>
        </div>

        {kedvencMakettek.length === 0 ? (
          <p>
            Még nincs kedvenc maketted. A <Link to="/makettek">Makettek</Link>{" "}
            oldalon a szívecskével tudsz kedvencet jelölni.
          </p>
        ) : (
          <ul className="kedvenc-lista">
            {kedvencMakettek.map((m) => (
              <li key={m.id} className="kedvenc-sor">
                <strong>{m.nev}</strong>
                <span className="small" style={{ opacity: 0.9 }}>
                  {" "}
                  — {m.gyarto} ({m.kategoria}, {m.skala})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
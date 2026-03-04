import React, { createContext, useContext, useEffect, useState } from "react";

// AuthContext: bejelentkezéshez kapcsolódó adatok és függvények megosztására (Context API)
const AuthContext = createContext(null);

// Backend API alap URL (auth, profil endpointok ehhez viszonyítva vannak)
const API_BASE_URL = "http://localhost:3001/api";

export function AuthProvider({ children }) {
  // A bejelentkezett felhasználó adatai (token + profil adatok)
  const [felhasznalo, beallitFelhasznalo] = useState(null);

  // Egyszerű állapot: akkor tekintjük bejelentkezettnek, ha van token a felhasználó objektumban
  const bejelentkezve = !!felhasznalo?.token;

  useEffect(() => {
    // App indulásakor: ha vannak mentett adatok a localStorage-ben,
    // akkor visszaállítjuk belőlük a bejelentkezett állapotot (újratöltés után is).
    const token = localStorage.getItem("token");
    const felhasznalo_nev = localStorage.getItem("felhasznalo_nev");
    const email = localStorage.getItem("felhasznalo_email");
    const szerepkorId = localStorage.getItem("felhasznalo_szerepkor_id");
    const profilKepUrl = localStorage.getItem("felhasznalo_profil_kep_url");
    const id = localStorage.getItem("felhasznalo_id");

    // Csak akkor állítjuk vissza a state-et, ha van token + alap adatok (név + email)
    if (token && felhasznalo_nev && email) {
      beallitFelhasznalo({
        token,
        id: id ? Number(id) : null,
        felhasznalo_nev,
        email,
        szerepkor_id: szerepkorId ? Number(szerepkorId) : 1,
        profil_kep_url: profilKepUrl || null,
      });
    }
  }, []);

  /**
   * mentsLocalStorage
   *
   * A bejelentkezési adatokat (token + user adatok) elmenti localStorage-be,
   * hogy böngésző frissítés után is megmaradjon a session jellegű állapot.
   *
   * Megjegyzés:
   * - A token külön kulcson van tárolva.
   * - Profilkép URL-nél üres string is lehet (könnyebb visszaolvasás miatt).
   */
  function mentsLocalStorage(token, felhasznaloAdat) {
    localStorage.setItem("token", token);
    localStorage.setItem("felhasznalo_id", felhasznaloAdat.id);
    localStorage.setItem("felhasznalo_nev", felhasznaloAdat.felhasznalo_nev);
    localStorage.setItem("felhasznalo_email", felhasznaloAdat.email);
    localStorage.setItem(
      "felhasznalo_szerepkor_id",
      felhasznaloAdat.szerepkor_id
    );
    localStorage.setItem(
      "felhasznalo_profil_kep_url",
      felhasznaloAdat.profil_kep_url || ""
    );
  }

  /**
   * bejelentkezes
   *
   * Login folyamat:
   * - elküldi az email+jelszó párost a backendnek
   * - siker esetén megkapja a tokent és a felhasználó adatait
   * - eltárolja localStorage-ben + beállítja a state-et
   *
   * Külön kezelés:
   * - ha a backend "tiltott" státuszt küld, akkor részletes hibaüzenetet dobunk
   *   (ideiglenes/végleges tiltás + ok + esetleges dátum).
   */
  async function bejelentkezes(email, jelszo) {
    const valasz = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, jelszo }),
    });

    // Hibakezelés: nem 2xx válasz esetén a backend üzenetét próbáljuk megjeleníteni
    if (!valasz.ok) {
      const hiba = await valasz.json().catch(() => ({}));

      // Speciális eset: a backend jelzi, hogy a felhasználó tiltott
      if (hiba.tiltott) {
        // Ideiglenes tiltás: van "tilt_eddig" időpont
        if (hiba.tilt_tipus === "ideiglenes") {
          throw new Error(
            `Ideiglenesen ki vagy tiltva eddig: ${
              hiba.tilt_eddig ? new Date(hiba.tilt_eddig).toLocaleString() : "—"
            }` + (hiba.tilt_ok ? ` | Ok: ${hiba.tilt_ok}` : "")
          );
        }

        // Végleges tiltás
        throw new Error(
          `Véglegesen ki vagy tiltva.` + (hiba.tilt_ok ? ` | Ok: ${hiba.tilt_ok}` : "")
        );
      }

      // Általános hiba (pl. rossz jelszó, nem létező email, stb.)
      throw new Error(hiba.uzenet || "Hiba a bejelentkezés során.");
    }

    // Sikeres login: token + felhasználó adatok beolvasása
    const adat = await valasz.json();
    const { token, felhasznalo: f } = adat;

    // Egységesített felhasználó objektum a frontend számára
    const felhasznaloAdat = {
      token,
      id: f.id,
      felhasznalo_nev: f.felhasznalo_nev,
      email: f.email,
      szerepkor_id: f.szerepkor_id,
      profil_kep_url: f.profil_kep_url || null,
    };

    // Session mentés + state frissítés
    mentsLocalStorage(token, felhasznaloAdat);
    beallitFelhasznalo(felhasznaloAdat);
  }

  /**
   * regisztracio
   *
   * Regisztrációs folyamat:
   * - elküldi a felhasználónevet, emailt és jelszót
   * - siker esetén (ha a backend így adja) azonnal beléptet tokennel
   * - eltárolja localStorage-ben + beállítja a state-et
   */
  async function regisztracio(felhasznalo_nev, email, jelszo) {
    const valasz = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ felhasznalo_nev, email, jelszo }),
    });

    if (!valasz.ok) {
      const hiba = await valasz.json().catch(() => ({}));
      throw new Error(hiba.uzenet || "Hiba a regisztráció során.");
    }

    const adat = await valasz.json();
    const { token, felhasznalo: f } = adat;

    const felhasznaloAdat = {
      token,
      id: f.id,
      felhasznalo_nev: f.felhasznalo_nev,
      email: f.email,
      szerepkor_id: f.szerepkor_id,
      profil_kep_url: f.profil_kep_url || null,
    };

    mentsLocalStorage(token, felhasznaloAdat);
    beallitFelhasznalo(felhasznaloAdat);
  }

  /**
   * kijelentkezes
   *
   * Kijelentkezés:
   * - localStorage takarítás (minden authhoz kötött kulcs törlése)
   * - felhasználó state null-ra állítása
   */
  function kijelentkezes() {
    localStorage.removeItem("token");
    localStorage.removeItem("felhasznalo_id");
    localStorage.removeItem("felhasznalo_nev");
    localStorage.removeItem("felhasznalo_email");
    localStorage.removeItem("felhasznalo_szerepkor_id");
    localStorage.removeItem("felhasznalo_profil_kep_url");
    beallitFelhasznalo(null);
  }

  /**
   * profilFrissites
   *
   * Profil adatok módosítása (PUT /profil):
   * - csak bejelentkezve fut le (token szükséges)
   * - siker esetén a backend friss user objektumot + tokent adhat vissza
   * - mentjük localStorage-be és frissítjük a state-et is
   */
  async function profilFrissites({ felhasznalo_nev, profil_kep_url }) {
    if (!felhasznalo?.token) return;

    const valasz = await fetch(`${API_BASE_URL}/profil`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${felhasznalo.token}`,
      },
      body: JSON.stringify({ felhasznalo_nev, profil_kep_url }),
    });

    if (!valasz.ok) {
      const hiba = await valasz.json().catch(() => ({}));
      throw new Error(hiba.uzenet || "Hiba a profil frissítése során.");
    }

    const adat = await valasz.json();
    const { token, felhasznalo: f } = adat;

    const felhasznaloAdat = {
      token,
      id: f.id,
      felhasznalo_nev: f.felhasznalo_nev,
      email: f.email,
      szerepkor_id: f.szerepkor_id,
      profil_kep_url: f.profil_kep_url || null,
    };

    // Friss session mentés + state update
    mentsLocalStorage(token, felhasznaloAdat);
    beallitFelhasznalo(felhasznaloAdat);
  }

  // Context value: amit a gyerek komponensek elérnek useAuth() hookkal
  const ertek = {
    felhasznalo,
    bejelentkezve,
    bejelentkezes,
    regisztracio,
    kijelentkezes,
    profilFrissites,
  };

  return (
    <AuthContext.Provider value={ertek}>{children}</AuthContext.Provider>
  );
}

/**
 * useAuth hook
 *
 * Kényelmes hozzáférés az AuthContext-hez.
 * - Ha nincs AuthProvider a komponens fa felett, hibát dob (fejlesztői védelem).
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth csak AuthProvider-en belül használható");
  }
  return ctx;
}
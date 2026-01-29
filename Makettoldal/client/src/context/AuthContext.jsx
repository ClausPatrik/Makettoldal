import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const API_BASE_URL = "http://localhost:3001/api";




export function AuthProvider({ children }) {
  const [felhasznalo, beallitFelhasznalo] = useState(null);
  const bejelentkezve = !!felhasznalo?.token;

  useEffect(() => {
    const token = localStorage.getItem("token");
    const felhasznalo_nev = localStorage.getItem("felhasznalo_nev");
    const email = localStorage.getItem("felhasznalo_email");
    const szerepkorId = localStorage.getItem("felhasznalo_szerepkor_id");
    const profilKepUrl = localStorage.getItem("felhasznalo_profil_kep_url");
    const id = localStorage.getItem("felhasznalo_id");

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

  async function bejelentkezes(email, jelszo) {
    const valasz = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, jelszo }),
    });

if (!valasz.ok) {
  const hiba = await valasz.json().catch(() => ({}));

  if (hiba.tiltott) {
    if (hiba.tilt_tipus === "ideiglenes") {
      throw new Error(
        `Ideiglenesen ki vagy tiltva eddig: ${hiba.tilt_eddig ? new Date(hiba.tilt_eddig).toLocaleString() : "—"}`
        + (hiba.tilt_ok ? ` | Ok: ${hiba.tilt_ok}` : "")
      );
    }
    throw new Error(
      `Véglegesen ki vagy tiltva.`
      + (hiba.tilt_ok ? ` | Ok: ${hiba.tilt_ok}` : "")
    );
  }

  throw new Error(hiba.uzenet || "Hiba a bejelentkezés során.");
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

  function kijelentkezes() {
    localStorage.removeItem("token");
    localStorage.removeItem("felhasznalo_id");
    localStorage.removeItem("felhasznalo_nev");
    localStorage.removeItem("felhasznalo_email");
    localStorage.removeItem("felhasznalo_szerepkor_id");
    localStorage.removeItem("felhasznalo_profil_kep_url");
    beallitFelhasznalo(null);
  }

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

    mentsLocalStorage(token, felhasznaloAdat);
    beallitFelhasznalo(felhasznaloAdat);
  }

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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth csak AuthProvider-en belül használható");
  }
  return ctx;
}

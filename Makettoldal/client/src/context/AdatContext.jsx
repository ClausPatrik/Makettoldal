import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

// AdatContext: globális állapot és műveletek megosztására (Context API)
const AdatContext = createContext(null);

// Backend API alap URL (ehhez fűzzük hozzá az endpointokat)
const API_BASE_URL = "http://localhost:3001/api";

/**
 * AdatProvider
 *
 * A teljes alkalmazás számára biztosítja a központi adatokat és műveleteket:
 * - makettek listája
 * - vélemények listája
 * - kedvencek listája (makett ID-k)
 * - betöltési állapot és hibaüzenet
 *
 * A Provider-t általában a legfelső szinten (App környékén) érdemes használni,
 * hogy a gyerek komponensek useAdat() hookkal hozzáférjenek.
 */
export function AdatProvider({ children }) {
  // --- Globális adatok state-jei ---
  const [makettek, beallitMakettek] = useState([]);
  const [velemenyek, beallitVelemenyek] = useState([]);
  const [kedvencek, beallitKedvencek] = useState([]);

  // --- UI állapotok (betöltés / hiba) ---
  const [betoltesFolyamatban, beallitBetoltes] = useState(false);
  const [hiba, beallitHiba] = useState(null);

  /**
   * betoltAlapAdatok
   *
   * Egyszerre betölti:
   * - a makettek listáját
   * - a vélemények listáját
   *
   * Megjegyzés:
   * - Promise.all-t használunk, így a két kérés párhuzamosan fut (gyorsabb).
   * - useCallback azért kell, hogy stabil legyen a függvény referenciája,
   *   és a useEffect dependency-ben ne okozzon felesleges újrahívásokat.
   */
  const betoltAlapAdatok = useCallback(async () => {
    try {
      beallitBetoltes(true);
      beallitHiba(null);

      const [makettValasz, velemenyValasz] = await Promise.all([
        fetch(`${API_BASE_URL}/makettek`),
        fetch(`${API_BASE_URL}/velemenyek`),
      ]);

      // Egyszerű hibakezelés: ha bármelyik válasz nem ok (pl. 500/404), dobunk hibát
      if (!makettValasz.ok || !velemenyValasz.ok) {
        throw new Error("Hiba az adatok betöltésekor.");
      }

      const makettAdat = await makettValasz.json();
      const velemenyAdat = await velemenyValasz.json();

      // State frissítés: a beolvasott adatokat eltároljuk globálisan
      beallitMakettek(makettAdat);
      beallitVelemenyek(velemenyAdat);
    } catch (err) {
      // Hibánál log + felhasználóbarát üzenet state-ben
      console.error(err);
      beallitHiba(err.message || "Ismeretlen hiba.");
    } finally {
      beallitBetoltes(false);
    }
  }, []);

  // Provider mountolásakor egyszer betöltjük az alap adatokat
  useEffect(() => {
    betoltAlapAdatok();
  }, [betoltAlapAdatok]);

  /**
   * szamolAtlagErtekeles
   *
   * Kiszámolja egy adott makett átlagos értékelését a véleményekből.
   * - ha nincs vélemény, null értéket ad vissza (így a UI eldöntheti mit mutat).
   */
  function szamolAtlagErtekeles(makettId) {
    const lista = velemenyek.filter((v) => v.makett_id === makettId);
    if (lista.length === 0) return null;

    // Összegzés + átlag számítás (Number() a biztonság kedvéért)
    const osszeg = lista.reduce((sum, v) => sum + Number(v.ertekeles || 0), 0);
    return osszeg / lista.length;
  }

  /**
   * hozzaadVelemeny
   *
   * Új vélemény létrehozása a backendben.
   * - csak bejelentkezett felhasználó esetén működik (token kell)
   * - siker után a friss véleményt a helyi state elejére tesszük (optimális UX)
   */
  async function hozzaadVelemeny(makettId, { szoveg, ertekeles }) {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Be kell jelentkezned vélemény írásához.");
    }

    const valasz = await fetch(
      `${API_BASE_URL}/makettek/${makettId}/velemenyek`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ szoveg, ertekeles }),
      }
    );

    // Hibás válasz esetén a backend üzenetét próbáljuk kiolvasni
    if (!valasz.ok) {
      const hiba = await valasz.json().catch(() => ({}));
      throw new Error(hiba.uzenet || "Hiba a vélemény mentésekor.");
    }

    const uj = await valasz.json();

    // State frissítés: az új vélemény bekerül a lista elejére
    beallitVelemenyek((elozo) => [uj, ...elozo]);
  }

  /**
   * modositVelemeny
   *
   * Vélemény szerkesztése (PUT).
   * - token szükséges
   * - siker után a state-ben kicseréljük a módosított elemet
   */
  async function modositVelemeny(velemenyId, { szoveg, ertekeles }) {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Be kell jelentkezned a módosításhoz.");
    }

    const valasz = await fetch(`${API_BASE_URL}/velemenyek/${velemenyId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ szoveg, ertekeles }),
    });

    if (!valasz.ok) {
      const hiba = await valasz.json().catch(() => ({}));
      throw new Error(hiba.uzenet || "Hiba a vélemény módosításakor.");
    }

    const frissitett = await valasz.json();

    // State frissítés: a megfelelő id-jú véleményt lecseréljük
    beallitVelemenyek((elozo) =>
      elozo.map((v) => (v.id === frissitett.id ? frissitett : v))
    );
  }

  /**
   * torolVelemeny
   *
   * Vélemény törlése (DELETE).
   * - token szükséges
   * - siker után kiszűrjük a state-ből
   */
  async function torolVelemeny(velemenyId) {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Be kell jelentkezned a törléshez.");
    }

    const valasz = await fetch(`${API_BASE_URL}/velemenyek/${velemenyId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!valasz.ok) {
      const hiba = await valasz.json().catch(() => ({}));
      throw new Error(hiba.uzenet || "Hiba a vélemény törlésekor.");
    }

    // State frissítés: törölt elem eltávolítása
    beallitVelemenyek((elozo) => elozo.filter((v) => v.id !== velemenyId));
  }

  /**
   * betoltKedvencek
   *
   * Bejelentkezett user kedvenceinek lekérése.
   * - token hiányában ürítjük a kedvenceket (vendég felhasználó)
   * - siker esetén a kedvencek state-be csak a makett ID-kat tesszük (Number-re alakítva)
   */
  const betoltKedvencek = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      beallitKedvencek([]);
      return;
    }

    const valasz = await fetch(`${API_BASE_URL}/kedvencek`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!valasz.ok) {
      console.error("Nem sikerült betölteni a kedvenceket.");
      return;
    }

    const adat = await valasz.json();
    beallitKedvencek(adat.map((k) => Number(k.makett_id)));
  }, []);

  /**
   * valtKedvenc
   *
   * Kedvenc ki/be kapcsolása egy makettnél.
   * - ha már kedvenc: DELETE
   * - ha még nem kedvenc: POST
   *
   * Megjegyzés:
   * - A kedvencek state frissítésénél Set-et használunk, hogy ne lehessen duplikált ID.
   * - useCallback + dependency: a kedvencek aktuális értékétől függ a művelet.
   */
  const valtKedvenc = useCallback(async (makettId) => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Be kell jelentkezned a kedvencek kezeléséhez.");

    const mid = Number(makettId);

    // Eldöntjük, hogy a makett már kedvenc-e
    const kedvenc = kedvencek.some((id) => Number(id) === mid);

    const url = `${API_BASE_URL}/kedvencek/${mid}`;

    const valasz = await fetch(url, {
      method: kedvenc ? "DELETE" : "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!valasz.ok) {
      const hiba = await valasz.json().catch(() => ({}));
      throw new Error(hiba.uzenet || "Hiba a kedvencek módosításakor.");
    }

    // State frissítés: eltávolítjuk vagy hozzáadjuk a makett ID-t
    beallitKedvencek((elozo) =>
      kedvenc
        ? elozo.filter((id) => Number(id) !== mid)
        : [...new Set([...elozo.map(Number), mid])]
    );
  }, [kedvencek]);

  /**
   * ertek (context value)
   *
   * Azok az adatok és függvények, amiket a gyerek komponensek elérhetnek a useAdat() hookkal.
   */
  const ertek = {
    makettek,
    velemenyek,
    kedvencek,
    betoltesFolyamatban,
    hiba,
    betoltAlapAdatok,
    szamolAtlagErtekeles,
    hozzaadVelemeny,
    modositVelemeny,
    torolVelemeny,
    betoltKedvencek,
    valtKedvenc,
  };

  return (
    <AdatContext.Provider value={ertek}>{children}</AdatContext.Provider>
  );
}

/**
 * useAdat hook
 *
 * Egyszerűsített hozzáférés az AdatContext-hez.
 * - Ha nincs AdatProvider a komponens fa felett, akkor hibát dob (fejlesztői védelem).
 */
export function useAdat() {
  const ctx = useContext(AdatContext);
  if (!ctx) {
    throw new Error("useAdat csak AdatProvider-en belül használható");
  }
  return ctx;
}
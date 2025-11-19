import React, { createContext, useContext, useEffect, useState } from "react";

const AdatContext = createContext(null);
const API_BASE_URL = "http://localhost:3001/api";

export function AdatProvider({ children }) {
  const [makettek, beallitMakettek] = useState([]);
  const [velemenyek, beallitVelemenyek] = useState([]);
  const [kedvencek, beallitKedvencek] = useState([]);
  const [betoltesFolyamatban, beallitBetoltes] = useState(false);
  const [hiba, beallitHiba] = useState(null);

  async function betoltAlapAdatok() {
    try {
      beallitBetoltes(true);
      beallitHiba(null);

      const [makettValasz, velemenyValasz] = await Promise.all([
        fetch(`${API_BASE_URL}/makettek`),
        fetch(`${API_BASE_URL}/velemenyek`),
      ]);

      if (!makettValasz.ok || !velemenyValasz.ok) {
        throw new Error("Hiba az adatok betöltésekor.");
      }

      const makettAdat = await makettValasz.json();
      const velemenyAdat = await velemenyValasz.json();

      beallitMakettek(makettAdat);
      beallitVelemenyek(velemenyAdat);
    } catch (err) {
      console.error(err);
      beallitHiba(err.message || "Ismeretlen hiba.");
    } finally {
      beallitBetoltes(false);
    }
  }

  useEffect(() => {
    betoltAlapAdatok();
  }, []);

  function szamolAtlagErtekeles(makettId) {
    const lista = velemenyek.filter((v) => v.makett_id === makettId);
    if (lista.length === 0) return null;
    const osszeg = lista.reduce((sum, v) => sum + Number(v.ertekeles || 0), 0);
    return osszeg / lista.length;
  }

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

    if (!valasz.ok) {
      const hiba = await valasz.json().catch(() => ({}));
      throw new Error(hiba.uzenet || "Hiba a vélemény mentésekor.");
    }

    const uj = await valasz.json();
    beallitVelemenyek((elozo) => [uj, ...elozo]);
  }

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

    beallitVelemenyek((elozo) =>
      elozo.map((v) => (v.id === frissitett.id ? frissitett : v))
    );
  }

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

    beallitVelemenyek((elozo) => elozo.filter((v) => v.id !== velemenyId));
  }

  async function betoltKedvencek() {
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
    beallitKedvencek(adat.map((k) => k.makett_id));
  }

  async function valtKedvenc(makettId) {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Be kell jelentkezned a kedvencek kezeléséhez.");
    }

    const kedvenc = kedvencek.includes(makettId);
    const url = `${API_BASE_URL}/kedvencek/${makettId}`;

    const valasz = await fetch(url, {
      method: kedvenc ? "DELETE" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!valasz.ok) {
      const hiba = await valasz.json().catch(() => ({}));
      throw new Error(hiba.uzenet || "Hiba a kedvencek módosításakor.");
    }

    beallitKedvencek((elozo) =>
      kedvenc ? elozo.filter((id) => id !== makettId) : [...elozo, makettId]
    );
  }

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

export function useAdat() {
  const ctx = useContext(AdatContext);
  if (!ctx) {
    throw new Error("useAdat csak AdatProvider-en belül használható");
  }
  return ctx;
}

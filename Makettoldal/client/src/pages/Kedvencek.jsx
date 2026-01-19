import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import MakettCard from "../components/MakettCard";
import MakettModal from "../components/MakettModal";

const API_BASE_URL = "http://localhost:3001/api";

export default function Kedvencek() {
  const { bejelentkezve, felhasznalo } = useAuth();
  const isAdmin = felhasznalo?.szerepkor_id === 2;

  const [makettek, beallitMakettek] = useState([]);
  const [betoltes, beallitBetoltes] = useState(false);
  const [hiba, beallitHiba] = useState(null);
  const [velemenyek, beallitVelemenyek] = useState([]);
  // Modal a kedvenceknél is (kép kattintásra)
  const [modalMakett, setModalMakett] = useState(null);

  function formatDatum(datumStr) {
    if (!datumStr) return "";
    const d = new Date(datumStr);
    if (Number.isNaN(d.getTime())) return datumStr;
    return d.toLocaleDateString("hu-HU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  async function betoltKedvencek() {
    try {
      beallitBetoltes(true);
      beallitHiba(null);
      const token = localStorage.getItem("token");

      const valasz = await fetch(`${API_BASE_URL}/kedvencek`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!valasz.ok) {
        const h = await valasz.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült betölteni a kedvenceket.");
      }

      const adat = await valasz.json();
      beallitMakettek(adat);
    } catch (err) {
      beallitHiba(err.message);
    } finally {
      beallitBetoltes(false);
    }
  }

  useEffect(() => {
    if (bejelentkezve) {
      betoltKedvencek();
      betoltVelemenyek(); // ✅ ÚJ
    }
  }, [bejelentkezve]);
  // Kedvencekből eltávolítás (ugyanaz mint eddig)
  async function kezeliEltavolitas(makettId) {
    if (!window.confirm("Biztosan eltávolítod a kedvencek közül?")) return;

    try {
      const token = localStorage.getItem("token");
      const valasz = await fetch(`${API_BASE_URL}/kedvencek/${makettId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!valasz.ok) {
        const h = await valasz.json().catch(() => ({}));
        throw new Error(h.uzenet || "Nem sikerült módosítani a kedvenceket.");
      }

      // UI frissítés
      beallitMakettek((elozo) => elozo.filter((m) => Number(m.makett_id) !== Number(makettId)));

      // ha épp ezt nézted a modalban, zárjuk
      setModalMakett((prev) => (prev?.makett_id === makettId ? null : prev));
    } catch (err) {
      alert(err.message);
    }
  }
  function szamolAtlag(makettId) {
    const lista = velemenyek.filter((v) => Number(v.makett_id) === Number(makettId));
    if (lista.length === 0) return 0;
    const osszeg = lista.reduce((s, v) => s + Number(v.ertekeles || 0), 0);
    return osszeg / lista.length;
  }
  async function betoltVelemenyek() {
    try {
      const valasz = await fetch(`${API_BASE_URL}/velemenyek`);
      if (!valasz.ok) throw new Error("Nem sikerült betölteni a véleményeket.");
      const adat = await valasz.json();
      beallitVelemenyek(adat);
    } catch (err) {
      console.error(err);
    }
  }
  if (!bejelentkezve) {
    return (
      <section className="page">
        <h1>Kedvenc makettjeim</h1>
        <p>Kérlek jelentkezz be, hogy lásd a kedvenc makettjeidet.</p>
        <Link to="/bejelentkezes" className="btn">
          Bejelentkezés
        </Link>
      </section>
    );
  }

  // Kedvencek oldalon nincs értékelés/vélemény adat a backend válaszban,
  // így itt 0-át adunk és a modalban se kérünk véleményeket.
  const modalAtlag = 0;

  return (
    <section className="page">
      <h1>Kedvenc makettjeim</h1>

      {betoltes && <p>Betöltés...</p>}
      {hiba && <p className="error">{hiba}</p>}

      {makettek.length === 0 && !betoltes ? (
        <p>Még nincs egyetlen kedvenc maketted sem.</p>
      ) : (
        <section className="card-grid">
          {makettek.map((m) => (
            <MakettCard
              key={m.makett_id}
              // itt a backend mezőneve: makett_id, de a kártya mindkettőt kezeli
              makett={{
                ...m,
                id: m.makett_id, // hogy egységes legyen a komponenseknek
              }}
              mode="favorites"
              atlag={0}
              velemenyek={[]}
              kedvenc={true}
              onToggleKedvenc={(id) => kezeliEltavolitas(id)} // kedvencekben ez eltávolítás
              onOpenModal={(mk) => setModalMakett(mk)}
            />
          ))}
        </section>
      )}

      {/* Kedvencek modal (vélemények nélkül, mert itt nincs hozzá adat) */}
      <MakettModal
  open={!!modalMakett}
  makett={modalMakett ? { ...modalMakett, id: modalMakett.id ?? modalMakett.makett_id } : null}
  onClose={() => setModalMakett(null)}

  atlag={modalMakett ? szamolAtlag(modalMakett.id ?? modalMakett.makett_id) : 0}
  velemenyek={modalMakett
    ? velemenyek.filter((v) => Number(v.makett_id) === Number(modalMakett.id ?? modalMakett.makett_id))
    : []
  }

  kedvenc={true}
  onToggleKedvenc={(id) => kezeliEltavolitas(id)}

  showReviews={true}   // ✅ ENGEDÉLYEZVE

  bejelentkezve={bejelentkezve}
  felhasznalo={felhasznalo}
  isAdmin={isAdmin}
  formatDatum={formatDatum}

  hozzaadVelemeny={async (makettId, adat) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE_URL}/velemenyek`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ makett_id: makettId, ...adat }),
    });
    if (!res.ok) throw new Error("Nem sikerült menteni a véleményt.");
    const uj = await res.json();
    beallitVelemenyek((elozo) => [...elozo, uj]);
  }}

  modositVelemeny={async (id, adat) => {
    const token = localStorage.getItem("token");
    await fetch(`${API_BASE_URL}/velemenyek/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(adat),
    });
  }}

  torolVelemeny={async (id) => {
    const token = localStorage.getItem("token");
    await fetch(`${API_BASE_URL}/velemenyek/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    beallitVelemenyek((elozo) => elozo.filter((v) => v.id !== id));
  }}
/>

      <div style={{ marginTop: 12 }}>
        <Link to="/makettek" className="btn secondary">
          Vissza a makettekhez
        </Link>
      </div>
    </section>
  );
}

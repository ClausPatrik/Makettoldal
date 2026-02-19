import React, { useEffect, useMemo, useState } from "react";
import { useAdat } from "../context/AdatContext";
import { useAuth } from "../context/AuthContext";

import MakettCard from "../components/MakettCard";
import MakettModal from "../components/MakettModal";

export default function Makettek() {
  const {
    makettek,
    velemenyek,
    szamolAtlagErtekeles,
    hozzaadVelemeny,
    modositVelemeny,
    torolVelemeny,
    kedvencek,
    betoltKedvencek,
    valtKedvenc,
    betoltesFolyamatban,
    hiba,
  } = useAdat();

  const { bejelentkezve, felhasznalo } = useAuth();
  const isAdmin = felhasznalo?.szerepkor_id === 2;
  const isModerator = felhasznalo?.szerepkor_id === 3;
  const API_BASE_URL = "http://localhost:3001/api";

  // Szűrők
  const [kategoriaSzuro, beallitKategoriaSzuro] = useState("osszes");
  const [skalaSzuro, beallitSkalaSzuro] = useState("osszes");
  const [kereses, beallitKereses] = useState("");
  const [minAtlagErtekeles, beallitMinAtlagErtekeles] = useState(0);
  const [rendezes, beallitRendezes] = useState("nev");

  // Kártyán belüli vélemény nyitás (csak a listában)
  const [kivalasztottMakettId, beallitKivalasztottMakettId] = useState(null);

  // Modal
  const [modalMakett, setModalMakett] = useState(null);

  useEffect(() => {
    if (bejelentkezve) betoltKedvencek();
  }, [bejelentkezve, betoltKedvencek]);

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
  async function adminMakettUpdate(id, payload) {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE_URL}/makettek/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const h = await res.json().catch(() => ({}));
      throw new Error(h.uzenet || "Nem sikerült menteni a makettet.");
    }

    const updated = await res.json();

    // UX: modal frissüljön az új adatokkal
    setModalMakett(updated);

    return updated;
  }

  async function adminMakettDelete(id) {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE_URL}/makettek/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const h = await res.json().catch(() => ({}));
      throw new Error(h.uzenet || "Nem sikerült törölni a makettet.");
    }

    // UX: modal zár
    setModalMakett(null);

    // ⚠️ Ha a lista nem frissül magától a contextből,
    // akkor itt kell egy "betoltMakettek()" vagy hasonló hívás.
  }

  function makettVelemenyek(makettId) {
    return (velemenyek || []).filter((v) => v.makett_id === makettId);
  }

  function makettKedvenc(makettId) {
    if (!Array.isArray(kedvencek)) return false;
    const mid = Number(makettId);

    if (kedvencek.length > 0 && typeof kedvencek[0] === "object") {
      return kedvencek.some((k) => Number(k.makett_id ?? k.id) === mid);
    }
    return kedvencek.some((id) => Number(id) === mid);
  }

  async function kezeliKedvencValtas(makettId) {
    if (!bejelentkezve) {
      alert("Kedvencekhez kérlek jelentkezz be.");
      return;
    }
    try {
      await valtKedvenc(makettId);
    } catch (err) {
      console.error("Kedvenc váltási hiba:", err);
      alert("Hiba történt a kedvencek módosításakor.");
    }
  }

  // Szűrés + rendezés
  const szurtMakettek = useMemo(() => {
    let lista = [...(makettek || [])];

    if (kategoriaSzuro !== "osszes") {
      lista = lista.filter((m) => m.kategoria === kategoriaSzuro);
    }
    if (skalaSzuro !== "osszes") {
      lista = lista.filter((m) => m.skala === skalaSzuro);
    }
    if (kereses.trim() !== "") {
      const q = kereses.trim().toLowerCase();
      lista = lista.filter((m) => {
        const nev = m.nev?.toLowerCase() || "";
        const gyarto = m.gyarto?.toLowerCase() || "";
        return nev.includes(q) || gyarto.includes(q);
      });
    }
    if (minAtlagErtekeles > 0) {
      lista = lista.filter((m) => {
        const atlag = szamolAtlagErtekeles ? szamolAtlagErtekeles(m.id) || 0 : 0;
        return atlag >= minAtlagErtekeles;
      });
    }

    lista.sort((a, b) => {
      if (rendezes === "nev") return (a.nev || "").localeCompare(b.nev || "");
      if (rendezes === "ev") return (b.megjelenes_eve || 0) - (a.megjelenes_eve || 0);
      if (rendezes === "ertekeles") {
        const aAtlag = szamolAtlagErtekeles ? szamolAtlagErtekeles(a.id) || 0 : 0;
        const bAtlag = szamolAtlagErtekeles ? szamolAtlagErtekeles(b.id) || 0 : 0;
        return bAtlag - aAtlag;
      }
      return 0;
    });

    return lista;
  }, [
    makettek,
    kategoriaSzuro,
    skalaSzuro,
    kereses,
    minAtlagErtekeles,
    rendezes,
    szamolAtlagErtekeles,
  ]);

  // Modal számolt adatok
  const modalAtlag = modalMakett
    ? (szamolAtlagErtekeles ? szamolAtlagErtekeles(modalMakett.id) || 0 : 0)
    : 0;
  const modalVelemenyLista = modalMakett ? makettVelemenyek(modalMakett.id) : [];
  const modalKedvenc = modalMakett ? makettKedvenc(modalMakett.id) : false;

  return (
    <section className="page">
      <header className="page-header">
        <h1>Makettek</h1>
        <p>
          Böngészd a maketteket, olvasd el mások véleményét, és írd meg a saját
          tapasztalataidat!
        </p>
      </header>

      {/* Szűrők */}
      <section className="card filters">
        <div className="filters-row">
          <input
            type="text"
            placeholder="Keresés név vagy gyártó alapján..."
            value={kereses}
            onChange={(e) => beallitKereses(e.target.value)}
          />

          <select value={kategoriaSzuro} onChange={(e) => beallitKategoriaSzuro(e.target.value)}>
            <option value="osszes">Jármű Típus</option>
            <option value="harckocsi">Harckocsi</option>
            <option value="repülő">Repülő</option>
            <option value="hajó">Hajó</option>
            <option value="mecha">mecha</option>
          </select>

          <select value={skalaSzuro} onChange={(e) => beallitSkalaSzuro(e.target.value)}>
            <option value="osszes">Összes skála</option>
            <option value="1:35">1:35</option>
            <option value="1:72">1:72</option>
            <option value="1:48">1:48</option>
            <option value="1:350">1:350</option>
          </select>

          <select
            value={minAtlagErtekeles}
            onChange={(e) => beallitMinAtlagErtekeles(Number(e.target.value))}>
            <option value={0}>Értékelés</option>
            <option value={3}>Min. 3★</option>
            <option value={4}>Min. 4★</option>
            <option value={4.5}>Min. 4.5★</option>
          </select>

          <select value={rendezes} onChange={(e) => beallitRendezes(e.target.value)}>
            <option value="nev">Név szerint sorrend</option>
            <option value="ev">Megjelenés éve szerint sorrend</option>
            <option value="ertekeles">Átlagértékelés szerint sorrend</option>
          </select>
        </div>
      </section>

      {betoltesFolyamatban && <p>Betöltés folyamatban...</p>}
      {hiba && <p className="error">Hiba történt az adatok betöltésekor: {hiba}</p>}

      {/* Lista */}
      <section className="card-grid">
        {szurtMakettek.length === 0 ? (
          <p>Nincsenek a szűrésnek megfelelő makettek.</p>
        ) : (
          szurtMakettek.map((m) => {
            const atlag = szamolAtlagErtekeles ? szamolAtlagErtekeles(m.id) || 0 : 0;
            const velemenyLista = makettVelemenyek(m.id);
            const nyitva = kivalasztottMakettId === m.id;
            const kedvenc = makettKedvenc(m.id);

            return (
              <MakettCard
                key={m.id}
                makett={m}
                mode="list"
                atlag={atlag}
                velemenyek={velemenyLista}
                nyitva={nyitva}
                kedvenc={kedvenc}
                onToggleKedvenc={kezeliKedvencValtas}
                onToggleVelemeny={(id) =>
                  beallitKivalasztottMakettId((prev) => (prev === id ? null : id))
                }
                onOpenModal={(mk) => setModalMakett(mk)}
                // vélemény műveletek
                bejelentkezve={bejelentkezve}
                felhasznalo={felhasznalo}
                isAdmin={isAdmin}
                isModerator={isModerator}
                formatDatum={formatDatum}
                hozzaadVelemeny={hozzaadVelemeny}
                modositVelemeny={modositVelemeny}
                torolVelemeny={torolVelemeny}
              />
            );
          })
        )}
      </section>

      {/* MODAL */}
      <MakettModal
        open={!!modalMakett}
        makett={modalMakett}
        onClose={() => setModalMakett(null)}
        atlag={modalAtlag}
        velemenyek={modalVelemenyLista}
        kedvenc={modalKedvenc}
        onToggleKedvenc={kezeliKedvencValtas}
        showReviews={true}
        bejelentkezve={bejelentkezve}
        felhasznalo={felhasznalo}
        isAdmin={isAdmin}
        isModerator={isModerator}
        formatDatum={formatDatum}
        hozzaadVelemeny={hozzaadVelemeny}
        modositVelemeny={modositVelemeny}
        torolVelemeny={torolVelemeny}
        onAdminUpdate={adminMakettUpdate}
        onAdminDelete={adminMakettDelete}
      />
    </section>
  );
}

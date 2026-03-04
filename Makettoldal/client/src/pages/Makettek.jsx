import React, { useEffect, useMemo, useState } from "react";
import { useAdat } from "../context/AdatContext";
import { useAuth } from "../context/AuthContext";

import MakettCard from "../components/MakettCard";
import MakettModal from "../components/MakettModal";

export default function Makettek() {
  /**
   * AdatContext-ből érkező adatok és műveletek:
   * - `makettek`, `velemenyek`: lista-adatok (a megjelenítés alapjai)
   * - `szamolAtlagErtekeles`: helper átlagértékelés számításhoz makett ID alapján
   * - `hozzaadVelemeny`, `modositVelemeny`, `torolVelemeny`: vélemény CRUD műveletek
   * - `kedvencek`, `betoltKedvencek`, `valtKedvenc`: kedvencek kezelése (UI + backend szinkron)
   * - `betoltesFolyamatban`, `hiba`: globális betöltési/hiba állapotok a contextből
   */
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

  /**
   * AuthContext:
   * - `bejelentkezve`: UI döntésekhez (kedvencek, vélemény írás stb.)
   * - `felhasznalo`: szerepkör azonosítók alapján admin/moderátor jogosultság
   */
  const { bejelentkezve, felhasznalo } = useAuth();
  const isAdmin = felhasznalo?.szerepkor_id === 2;
  const isModerator = felhasznalo?.szerepkor_id === 3;

  /**
   * Backend API bázis URL.
   * Megjegyzés: lokális fejlesztés; éles környezetben jellemzően env változóból jön.
   */
  const API_BASE_URL = "http://localhost:3001/api";

  // Szűrő és rendezés állapotok (lista UI)
  const [kategoriaSzuro, beallitKategoriaSzuro] = useState("osszes");
  const [skalaSzuro, beallitSkalaSzuro] = useState("osszes");
  const [kereses, beallitKereses] = useState("");
  const [minAtlagErtekeles, beallitMinAtlagErtekeles] = useState(0);
  const [rendezes, beallitRendezes] = useState("nev");

  /**
   * Kártyán belüli “vélemény” rész nyitásának állapota a listában.
   * Itt csak egyetlen makett ID lehet nyitva egyszerre.
   */
  const [kivalasztottMakettId, beallitKivalasztottMakettId] = useState(null);

  // Modalban megnyitott makett (objektum); null esetén zárva
  const [modalMakett, setModalMakett] = useState(null);

  /**
   * Bejelentkezés után betöltjük a kedvencek listáját, hogy a csillag/ikon állapota helyes legyen.
   * A függőségek közt szerepel a `betoltKedvencek`, mert contextből jön (stabil referencia esetén is korrekt).
   */
  useEffect(() => {
    if (bejelentkezve) betoltKedvencek();
  }, [bejelentkezve, betoltKedvencek]);

  /**
   * Dátum formázás megjelenítéshez (HU formátum).
   * Ha a dátum nem parse-olható, az eredeti stringet adja vissza.
   */
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

  /**
   * Admin: makett módosítás (PUT /makettek/:id).
   * - JWT token szükséges
   * - siker esetén a modal tartalma azonnal frissül (UX okokból)
   * - a lista frissítése a context/parent logikájától függ (itt csak a modalt frissítjük)
   */
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

    // UX: a modal azonnal tükrözze a mentett állapotot
    setModalMakett(updated);

    return updated;
  }

  /**
   * Admin: makett törlés (DELETE /makettek/:id).
   * - JWT token szükséges
   * - siker esetén a modal bezáródik
   *
   * Megjegyzés: ha a lista nem frissül automatikusan a contextből,
   * akkor itt kellene egy újratöltés (pl. betoltMakettek()) – de ez már programlogika, itt csak jelezzük.
   */
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

    // UX: törlés után a modal záródik
    setModalMakett(null);

    // Megjegyzés: lista frissítése (ha nem történik automatikusan) a context szintjén intézendő.
  }

  /**
   * Adott maketthez tartozó vélemények kinyerése a globális véleménylistából.
   * Fontos: itt szigorú (===) összehasonlítás van, tehát a típusok (number/string) konzisztenciája számít.
   */
  function makettVelemenyek(makettId) {
    return (velemenyek || []).filter((v) => v.makett_id === makettId);
  }

  /**
   * Kedvenc státusz meghatározása:
   * - támogatja, ha a `kedvencek` tömb ID-kat tartalmaz (number/string)
   * - és azt is, ha objektumokat tartalmaz (pl. { makett_id: ... } vagy { id: ... })
   */
  function makettKedvenc(makettId) {
    if (!Array.isArray(kedvencek)) return false;
    const mid = Number(makettId);

    if (kedvencek.length > 0 && typeof kedvencek[0] === "object") {
      return kedvencek.some((k) => Number(k.makett_id ?? k.id) === mid);
    }
    return kedvencek.some((id) => Number(id) === mid);
  }

  /**
   * Kedvenc váltás kezelése (UI esemény):
   * - bejelentkezés nélkül nem engedjük (UX + auth védelem)
   * - hiba esetén log + általános user üzenet
   */
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

  /**
   * Szűrés + rendezés:
   * - kategória/skála/keresés/min átlagértékelés szűrések
   * - többféle rendezés (név, év, átlagértékelés)
   *
   * useMemo: a lista csak akkor számolódik újra, ha bármelyik függőség változik.
   */
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

    // Rendelés a kiválasztott rendezési mód szerint
    lista.sort((a, b) => {
      if (rendezes === "nev") return (a.nev || "").localeCompare(b.nev || "");
      if (rendezes === "ev")
        return (b.megjelenes_eve || 0) - (a.megjelenes_eve || 0);
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

  /**
   * Modalhoz számolt adatok:
   * - átlagértékelés, véleménylista, kedvenc státusz
   * Megjegyzés: ezek a `modalMakett` változásakor “derivált” értékek, ezért külön state helyett számoljuk.
   */
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

      {/* Szűrők: kliens oldali szűrés és rendezés vezérlők */}
      <section className="card filters">
        <div className="filters-row">
          <input
            type="text"
            placeholder="Keresés név vagy gyártó alapján..."
            value={kereses}
            onChange={(e) => beallitKereses(e.target.value)}
          />

          <select
            value={kategoriaSzuro}
            onChange={(e) => beallitKategoriaSzuro(e.target.value)}
          >
            <option value="osszes">Jármű Típus</option>
            <option value="harckocsi">Harckocsi</option>
            <option value="repülő">Repülő</option>
            <option value="hajó">Hajó</option>
            <option value="mecha">mecha</option>
          </select>

          <select
            value={skalaSzuro}
            onChange={(e) => beallitSkalaSzuro(e.target.value)}
          >
            <option value="osszes">Összes skála</option>
            <option value="1:35">1:35</option>
            <option value="1:72">1:72</option>
            <option value="1:48">1:48</option>
            <option value="1:350">1:350</option>
          </select>

          <select
            value={minAtlagErtekeles}
            onChange={(e) => beallitMinAtlagErtekeles(Number(e.target.value))}
          >
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

      {/* Lista: szűrt és rendezett makettek megjelenítése */}
      <section className="card-grid card-grid-5">
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
                // Vélemény műveletek: a kártya innen kapja a szükséges callbackeket és auth információt
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

      {/* Modal: részletek + vélemények + kedvenc + admin műveletek (jogosultság szerint) */}
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
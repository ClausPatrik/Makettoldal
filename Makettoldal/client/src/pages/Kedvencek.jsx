import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import MakettCard from "../components/MakettCard";
import MakettModal from "../components/MakettModal";

/**
 * Backend API bázis URL.
 * Megjegyzés: lokális fejlesztési környezetre mutat; éles környezetben tipikusan env változóból érdemes adni.
 */
const API_BASE_URL = "http://localhost:3001/api";

export default function Kedvencek() {
  const { bejelentkezve, felhasznalo } = useAuth();
  const isAdmin = felhasznalo?.szerepkor_id === 2;
  const isModerator = felhasznalo?.szerepkor_id === 3;

  // Kedvencként mentett makettek listája (backend /kedvencek végpont válaszából)
  const [makettek, beallitMakettek] = useState([]);

  // Oldalszintű betöltés jelző a kedvencek lekéréséhez
  const [betoltes, beallitBetoltes] = useState(false);

  // Oldalszintű hibaüzenet (kedvencek betöltésekor használt)
  const [hiba, beallitHiba] = useState(null);

  // Vélemények cache: egyszerre tárolhat globális listát és/vagy a modalhoz betöltött aktuális makett véleményeit
  const [velemenyek, beallitVelemenyek] = useState([]);

  /**
   * A kedvencek oldalon is használunk modalt:
   * a kiválasztott makett objektumát tároljuk, és ennek alapján nyitjuk/zárjuk.
   */
  const [modalMakett, setModalMakett] = useState(null);

  /**
   * Dátum formázás megjelenítéshez (HU formátum).
   * Hibás/parse-olhatatlan dátum esetén az eredeti stringet adja vissza.
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
   * Modal megnyitásakor (modalMakett beállításakor) betöltjük az adott maketthez tartozó véleményeket.
   * Fontos: ez a beállítás felülírja a `velemenyek` state-et a kiválasztott makett véleményeivel.
   * (Később a komponens más helyen globális véleménylistát is betölt ugyanebbe a state-be.)
   */
  useEffect(() => {
    if (!modalMakett) return;

    (async () => {
      try {
        const id = modalMakett.id ?? modalMakett.makett_id;
        const res = await fetch(`${API_BASE_URL}/makettek/${id}/velemenyek`);
        if (!res.ok) return;
        const adat = await res.json();

        // Az aktuális (modalban megnyitott) makett véleményei kerülnek a state-be.
        beallitVelemenyek(adat);
      } catch {
        // Szándékosan elnyelt hiba: a modal véleménybetöltése nem blokkolja az oldal működését.
        // (Ha később diagnosztika kell, itt lehetne logolni.)
      }
    })();
  }, [modalMakett]);

  /**
   * Kedvencek betöltése bejelentkezett felhasználónak.
   * - JWT tokent LocalStorage-ból olvassa
   * - Hiba esetén `hiba` state-be írható üzenetet ad
   */
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

  /**
   * Bejelentkezés után:
   * - kedvencek lekérése
   * - vélemények lekérése (globális lista) az átlag/megjelentés számításhoz és a modalhoz
   */
  useEffect(() => {
    if (bejelentkezve) {
      betoltKedvencek();
      betoltVelemenyek(); // ✅ Vélemények betöltése (globális lista)
    }
  }, [bejelentkezve]);

  /**
   * Kedvencekből eltávolítás:
   * - megerősítés után DELETE hívás
   * - siker esetén lokális UI frissítés (lista szűrése)
   * - ha a törölt elem van nyitva a modalban, bezárjuk
   */
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

      // UI frissítés: a törölt kedvencet kivesszük a listából
      beallitMakettek((elozo) => elozo.filter((m) => Number(m.makett_id) !== Number(makettId)));

      // Ha a modal éppen ezt a makettet mutatja, zárjuk be
      setModalMakett((prev) => (prev?.makett_id === makettId ? null : prev));
    } catch (err) {
      alert(err.message);
    }
  }

  /**
   * Átlagértékelés számítása egy adott makett ID-ra.
   * A `velemenyek` state-ből szűr (makett_id alapján) és átlagolja az `ertekeles` mezőt.
   */
  function szamolAtlag(makettId) {
    const lista = velemenyek.filter((v) => Number(v.makett_id) === Number(makettId));
    if (lista.length === 0) return 0;
    const osszeg = lista.reduce((s, v) => s + Number(v.ertekeles || 0), 0);
    return osszeg / lista.length;
  }

  /**
   * Vélemények betöltése (globális lista).
   * Megjegyzés: ez ugyanabba a `velemenyek` state-be ír, mint a modal megnyitásakor történő betöltés,
   * így a két adatforrás felülírhatja egymást.
   */
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

  /**
   * Megjegyzés: ez a konstans jelenleg nincs felhasználva a komponensben.
   * Ha később átlagértékelést fix 0-ra akarsz kényszeríteni modal szinten, innen adható tovább.
   */
  const modalAtlag = 0;

  return (
    <section className="page">
      <h1>Kedvenc makettjeim</h1>

      {betoltes && <p>Betöltés...</p>}
      {hiba && <p className="error">{hiba}</p>}

      {makettek.length === 0 && !betoltes ? (
        <p>Még nincs egyetlen kedvenc maketted sem.</p>
      ) : (
        <section className="card-grid card-grid-5">
          {makettek.map((m) => (
            <MakettCard
              key={m.makett_id}
              // A backend a kedvenceknél `makett_id` mezőt ad; a kártya számára egységesítjük `id`-re is.
              makett={{
                ...m,
                id: m.makett_id, // Komponensek közti kompatibilitás: `id` alias a `makett_id`-ra.
              }}
              mode="favorites"
              atlag={0}
              velemenyek={[]}
              kedvenc={true}
              // Kedvencek oldalon a "toggle" itt ténylegesen eltávolítást jelent.
              onToggleKedvenc={(id) => kezeliEltavolitas(id)}
              onOpenModal={(mk) => setModalMakett(mk)}
            />
          ))}
        </section>
      )}

      {/* Kedvencek modal: itt a vélemények megjelenítése ENGEDÉLYEZETT, és a komponenshez átadjuk a szűrt listát + átlagot. */}
      <MakettModal
        open={!!modalMakett}
        makett={modalMakett ? { ...modalMakett, id: modalMakett.id ?? modalMakett.makett_id } : null}
        onClose={() => setModalMakett(null)}
        atlag={modalMakett ? szamolAtlag(modalMakett.id ?? modalMakett.makett_id) : 0}
        velemenyek={
          modalMakett
            ? velemenyek.filter((v) => Number(v.makett_id) === Number(modalMakett.id ?? modalMakett.makett_id))
            : []
        }
        kedvenc={true}
        onToggleKedvenc={(id) => kezeliEltavolitas(id)}
        showReviews={true} // Vélemény szekció megjelenítése a modalban
        bejelentkezve={bejelentkezve}
        felhasznalo={felhasznalo}
        isAdmin={isAdmin}
        isModerator={isModerator}
        formatDatum={formatDatum}
        hozzaadVelemeny={async (makettId, adat) => {
          const token = localStorage.getItem("token");
          const res = await fetch(`${API_BASE_URL}/makettek/${makettId}/velemenyek`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            // A makett azonosítója az URL-ben van, így a body-ban elég a vélemény payload.
            body: JSON.stringify(adat),
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
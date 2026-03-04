import React from "react";
import CsillagValaszto from "./CsillagValaszto";
import VelemenyekSection from "./VelemenyekSection";

// Backend alap URL – akkor használjuk, ha a kép relatív útvonallal érkezik az API-ból
const BACKEND_BASE = "http://localhost:3001";

/**
 * MakettCard komponens
 *
 * Egy makett adatait megjelenítő kártya.
 * Tartalmazza:
 * - a makett alap adatait
 * - az átlagos értékelést csillagokkal
 * - a makett képét
 * - műveleti gombokat (megtekintés, kedvenc, vélemények)
 *
 * Mode működése:
 * - "list": a Makettek oldalon használjuk (vélemények is kezelhetők)
 * - "favorites": a Kedvencek oldalon (csak kedvencek eltávolítása)
 */
export default function MakettCard({
  makett,
  mode = "list",

  // számolt adatok (backend vagy parent komponens számolja)
  atlag = 0,
  velemenyek = [],

  // jelzi, hogy a vélemények panel nyitva van-e
  nyitva = false,

  // kedvenc állapot
  kedvenc = false,
  onToggleKedvenc,

  // vélemény szekció nyitása/zárása (csak list módban)
  onToggleVelemeny,

  // kép vagy gomb kattintására megnyíló részletes modal
  onOpenModal,

  // vélemény műveletekhez szükséges adatok és függvények
  bejelentkezve,
  felhasznalo,
  isAdmin,
  formatDatum,
  isModerator,
  hozzaadVelemeny,
  modositVelemeny,
  torolVelemeny,
}) {

  // A kép URL kezelése:
  // ha relatív útvonal érkezik a backendtől (pl. /uploads/kep.jpg),
  // akkor hozzáfűzzük a backend domain-t
  const kepSrc =
    makett?.kep_url && !makett.kep_url.startsWith("http")
      ? `${BACKEND_BASE}${makett.kep_url}`
      : makett?.kep_url;

  return (
    <article className="card makett-card">

      {/* Kártya fejléc: név, alap adatok és átlagos értékelés */}
      <div className="makett-fejlec">
        <div>
          <h2 className="makett-nev" title={makett.nev}>
            {makett.nev}
          </h2>

          {/* Gyártó, skála és kategória */}
          <p className="small">
            {makett.gyarto} • {makett.skala} • {makett.kategoria}
          </p>

          {/* Nehézségi szint és kiadás éve */}
          <p className="small">
            Nehézség: {makett.nehezseg}/5 • Megjelenés éve:{" "}
            {makett.megjelenes_eve}
          </p>
        </div>

        {/* Átlagos értékelés megjelenítése csillagokkal (nem kattintható) */}
        <div className="makett-ertekeles">
          <CsillagValaszto value={atlag} readOnly />

          {/* Szöveges átlag + vélemények száma */}
          <p className="small">
            Átlag: {Number(atlag).toFixed(1)} ({velemenyek.length} vélemény)
          </p>
        </div>
      </div>

      {/* Makett kép – kattintásra modal nyílik */}
      {makett.kep_url && (
        <div
          className="makett-kep-wrapper"
          onClick={() => onOpenModal?.(makett)}
          role="button"
          tabIndex={0}

          // Billentyűzet támogatás (accessibility)
          // Enter vagy Space lenyomására is megnyílik a modal
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onOpenModal?.(makett);
          }}
        >
          <img src={kepSrc} alt={makett.nev} className="makett-kep" />
        </div>
      )}

      {/* Műveleti gombok sora */}
      <div className="button-row">

        {/* Modal megnyitása */}
        <button
          type="button"
          className="btn secondary"
          onClick={() => onOpenModal?.(makett)}
        >
          Megtekintés
        </button>

        {/* Kedvenc kezelés (hozzáadás vagy eltávolítás) */}
        <button
          type="button"
          className={kedvenc ? "btn secondary" : "btn"}
          onClick={() => onToggleKedvenc?.(makett.id ?? makett.makett_id)}
        >
          {kedvenc ? "Kedvencekből eltávolítás" : "Kedvencekhez adás"}
        </button>

        {/* Vélemények gomb csak a Makettek listában jelenik meg */}
        {mode === "list" && (
          <button
            type="button"
            className="btn secondary"
            onClick={() => onToggleVelemeny?.(makett.id)}
          >
            {nyitva ? "Vélemények elrejtése" : "Vélemények megtekintése"}
          </button>
        )}
      </div>

      {/* Vélemények szekció
          - csak list módban
          - csak akkor renderelődik ha a panel nyitva van */}
      {mode === "list" && nyitva && (
        <VelemenyekSection
          makettId={makett.id}
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
    </article>
  );
}
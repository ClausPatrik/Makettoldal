import React from "react";
import CsillagValaszto from "./CsillagValaszto";
import VelemenyekSection from "./VelemenyekSection";

/**
 * Egy makett kártya
 * - "mode":
 *    - "list": Makettek oldal (kedvenc + vélemény toggle)
 *    - "favorites": Kedvencek oldal (csak eltávolítás)
 */
export default function MakettCard({
  makett,
  mode = "list",

  // számolt adatok
  atlag = 0,
  velemenyek = [],

  // kártya állapot
  nyitva = false,

  // kedvenc
  kedvenc = false,
  onToggleKedvenc,

  // vélemények nyit/zár (csak list módban)
  onToggleVelemeny,

  // kép kattintás (modal nyitás)
  onOpenModal,

  // vélemény műveletek (csak list módban kell)
  bejelentkezve,
  felhasznalo,
  isAdmin,
  formatDatum,
  hozzaadVelemeny,
  modositVelemeny,
  torolVelemeny,
}) {
  return (
    <article className="card makett-card">
      <div className="makett-fejlec">
        <div>
          <h2 className="makett-nev" title={makett.nev}>
  {makett.nev}
</h2>
          <p className="small">
            {makett.gyarto} • {makett.skala} • {makett.kategoria}
          </p>
          <p className="small">
            Nehézség: {makett.nehezseg}/5 • Megjelenés éve: {makett.megjelenes_eve}
          </p>
        </div>

        {/* Átlag csillagok (readOnly) */}
        <div className="makett-ertekeles">
          <CsillagValaszto value={atlag} readOnly />
          <p className="small">
            Átlag: {Number(atlag).toFixed(1)} ({velemenyek.length} vélemény)
          </p>
        </div>
      </div>

      {makett.kep_url && (
        <div
          className="makett-kep-wrapper"
          onClick={() => onOpenModal?.(makett)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onOpenModal?.(makett);
          }}
        >
          <img src={makett.kep_url} alt={makett.nev} className="makett-kep" />
        </div>
      )}

      <div className="button-row">
        {/* Kedvenc gomb mindkét oldalon */}
        <button
          type="button"
          className={kedvenc ? "btn secondary" : "btn"}
          onClick={() => onToggleKedvenc?.(makett.id ?? makett.makett_id)}
        >
          {kedvenc ? "Kedvencekből eltávolítás" : "Kedvencekhez adás"}
        </button>

        {/* Makettek listában van vélemény toggle, Kedvencekben nincs */}
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

      {/* Vélemények szekció csak list módban és ha nyitva */}
      {mode === "list" && nyitva && (
        <VelemenyekSection
          makettId={makett.id}
          velemenyek={velemenyek}
          bejelentkezve={bejelentkezve}
          felhasznalo={felhasznalo}
          isAdmin={isAdmin}
          formatDatum={formatDatum}
          hozzaadVelemeny={hozzaadVelemeny}
          modositVelemeny={modositVelemeny}
          torolVelemeny={torolVelemeny}
        />
      )}
    </article>
  );
}

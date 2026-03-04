import React from "react";

/**
 * CsillagValaszto komponens
 *
 * Egy egyszerű 1–5 csillagos értékelő UI elem.
 * Gyakran használják például véleményeknél vagy termékértékeléseknél.
 *
 * Paraméterek (props):
 * - value: az aktuális értékelés száma (1–5). Meghatározza, hány csillag aktív.
 * - onChange: függvény, amely kattintáskor lefut és visszaadja az új értéket.
 * - readOnly: ha true, a csillagok csak megjelennek, de nem kattinthatók.
 */
export default function CsillagValaszto({ value, onChange, readOnly = false }) {

  // Az aktuális érték számmá alakítása.
  // Ha undefined vagy hibás érték érkezik, akkor 0 lesz.
  const aktivErtek = Number(value) || 0;

  return (
    // A teljes csillag értékelő blokk
    <div className="rating-stars" aria-label="Értékelés">

      {/* 5 csillag létrehozása tömb generálással */}
      {Array.from({ length: 5 }).map((_, idx) => {

        // A csillag sorszáma (1–5)
        const csillagErtek = idx + 1;

        // Meghatározza, hogy az adott csillag aktív-e
        const aktiv = csillagErtek <= aktivErtek;

        return (
          <button
            key={csillagErtek}
            type="button"

            // Ha a csillag aktív, akkor kap egy plusz CSS class-t
            className={aktiv ? "star active" : "star"}

            // Kattintáskor csak akkor hívjuk meg az onChange függvényt,
            // ha a komponens nem readOnly módban van
            onClick={() => !readOnly && onChange?.(csillagErtek)}

            // ReadOnly módban a gomb le van tiltva
            disabled={readOnly}

            // Képernyőolvasók számára leírás
            aria-label={`${csillagErtek} csillag`}
          >
            {/* Aktív csillag: ★  |  Inaktív csillag: ☆ */}
            {aktiv ? "★" : "☆"}
          </button>
        );
      })}
    </div>
  );
}
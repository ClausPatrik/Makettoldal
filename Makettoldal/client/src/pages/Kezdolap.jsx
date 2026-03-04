import React, { useMemo, useState } from "react";
import { useAdat } from "../context/AdatContext";

/**
 * CsillagokKicsi
 * Kisméretű (inline) csillag-megjelenítő komponens 0–5 skálára.
 * - `ertek` lehet tört is (pl. 4.2), itt vizuálisan a legközelebbi egészre kerekítünk.
 * - A megjelenítés kizárólag UI célú, nem végez validációt.
 */
function CsillagokKicsi({ ertek }) {
  const teljes = Math.round(ertek || 0);
  return (
    <span style={{ fontSize: 14 }}>
      {Array.from({ length: 5 }).map((_, idx) => (
        <span key={idx}>{idx < teljes ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

export default function Kezdolap() {
  /**
   * AdatContext-ből érkező állapot + helper függvény.
   * - `makettek`: makettek listája
   * - `velemenyek`: vélemények listája
   * - `szamolAtlagErtekeles`: atlag számító helper (ID alapján)
   */
  const { makettek, velemenyek, szamolAtlagErtekeles } = useAdat();

  // AI kérdezz–felelek: input, válasz, betöltés, hibák és modell betöltési állapot
  const [aiKerdes, beallitAiKerdes] = useState("");
  const [aiValasz, beallitAiValasz] = useState("");
  const [aiBetolt, beallitAiBetolt] = useState(false);
  const [aiHiba, beallitAiHiba] = useState(null);
  const [aiModellToltes, beallitAiModellToltes] = useState(false);
  const [aiModellProgress, beallitAiModellProgress] = useState(0);

  // Összesítő számok a kezdőlap “dashboard” részéhez
  const osszesMakett = makettek.length;
  const osszesVelemeny = velemenyek.length;

  /**
   * Globális átlagértékelés az összes vélemény alapján.
   * Ha nincs vélemény, `null`, így a UI-ban “még nincs értékelés” jelenik meg.
   */
  const globalisAtlag =
    velemenyek.length > 0
      ? velemenyek.reduce((sum, v) => sum + Number(v.ertekeles || 0), 0) /
        velemenyek.length
      : null;

  /**
   * Top makettek (legjobbra értékelt):
   * - átlagot számolunk makett ID alapján
   * - kiszűrjük a 0 átlagosakat (nincs értékelés)
   * - csökkenő sorrendben rendezzük, majd top 3-at választunk
   *
   * useMemo: elkerüli a felesleges újraszámolást, ha a függőségek nem változnak.
   */
  const topMakettek = useMemo(() => {
    if (!makettek.length || !velemenyek.length) return [];

    const lista = makettek
      .map((m) => {
        const atlag = szamolAtlagErtekeles(m.id) || 0;
        return { ...m, atlag };
      })
      .filter((m) => m.atlag > 0)
      .sort((a, b) => b.atlag - a.atlag)
      .slice(0, 3);

    return lista;
  }, [makettek, velemenyek, szamolAtlagErtekeles]);

  /**
   * Legutóbbi vélemények:
   * - másolatot készítünk, hogy ne módosítsuk a contextből érkező tömböt
   * - `letrehozva` alapján csökkenő sorrend (legfrissebb elöl)
   * - top 3 elem
   */
  const legutobbiVelemenyek = useMemo(() => {
    if (!velemenyek.length) return [];
    const masolat = [...velemenyek];

    masolat.sort((a, b) => {
      const da = a.letrehozva ? new Date(a.letrehozva).getTime() : 0;
      const db = b.letrehozva ? new Date(b.letrehozva).getTime() : 0;
      return db - da;
    });

    return masolat.slice(0, 3);
  }, [velemenyek]);

  /**
   * UI segédfüggvény: hosszú szöveg rövidítése listanézetben.
   * - `max` alapértelmezetten 120 karakter
   * - három ponttal zár
   */
  function roviditSzoveg(szoveg, max = 120) {
    if (!szoveg) return "";
    if (szoveg.length <= max) return szoveg;
    return szoveg.slice(0, max - 3) + "...";
  }

  /**
   * AI kérdés elküldése:
   * - form submit megfogása
   * - WebGPU jelenlét ellenőrzése (a WebLLM / helyi futtatás előfeltétele lehet)
   * - modell/engine betöltése progress callbackkel
   * - chat completion kérés és válasz megjelenítése
   *
   * Megjegyzés: `getWebLlmEngine` ebben a fájlban nincs importálva; feltételezhetően globális vagy máshol kerül be.
   */
  async function kezeliAiKerdesKuldes(e) {
    e.preventDefault();
    const kerdes = aiKerdes.trim();
    if (!kerdes || aiBetolt) return;

    try {
      beallitAiBetolt(true);
      beallitAiHiba(null);
      beallitAiValasz("");

      // WebGPU támogatás ellenőrzése (régebbi böngészők esetén érthető hibaüzenet)
      const nincsWebGPU =
        typeof navigator !== "undefined" && !("gpu" in navigator);
      if (nincsWebGPU) {
        throw new Error(
          "A böngésződ nem támogatja a WebGPU-t. Próbáld meg egy frissebb Chrome / Edge / Brave böngészővel."
        );
      }

      // Engine/model betöltése, progress megjelenítés az első használatkor
      const engine = await getWebLlmEngine((p) => {
        if (typeof p.progress === "number") {
          beallitAiModellToltes(true);
          beallitAiModellProgress(Math.round(p.progress * 100));
        }
      });

      // A modell betöltése kész, a progress UI elrejthető
      beallitAiModellToltes(false);

      /**
       * Prompt / üzenetek:
       * - system üzenet: persona + válaszstílus
       * - user üzenet: a felhasználó kérdése
       */
      const messages = [
        {
          role: "system",
          content:
            "Te egy 'MakettMester AI' nevű segítő vagy. Magyarul válaszolsz, tegezel. " +
            "Kezdő és haladó makettezőknek segítesz: festés, ragasztás, csiszolás, panelvonalak, diorámák. " +
            "Mindig adj konkrét, lépésről lépésre tippeket, említs meg gyakori hibákat és azok elkerülését. " +
            "Válaszaid legyenek rövidek (3–5 mondat), de informatívak. Ha valamiben nem vagy biztos, írd le, hogy bizonytalan vagy.",
        },
        {
          role: "user",
          content: kerdes,
        },
      ];

      // Chat completion meghívása az engine-nel (WebLLM kompatibilis API)
      const reply = await engine.chat.completions.create({
        messages,
      });

      // Biztonságos fallback, ha a válasz struktúrája nem a várt
      const text =
        reply?.choices?.[0]?.message?.content ||
        "Nem sikerült most értelmes választ adnom.";

      beallitAiValasz(text);
    } catch (err) {
      // Diagnosztika: konzolra logolunk, a felhasználónak rövid hibaüzenet
      console.error(err);
      beallitAiHiba(err.message || "Nem sikerült választ kapni.");
    } finally {
      beallitAiBetolt(false);
    }
  }

  return (
    <section className="page">
      <h1>Üdv a MakettMester oldalán!</h1>

      <div className="card">
        <h2>Makettezők tudásbázisa és fóruma</h2>
        <p>
          Ez az oldal a makettezés iránt érdeklődők közösségi tere. Itt különböző
          maketteket böngészhetsz, értékeléseket és véleményeket olvashatsz,
          valamint megoszthatod a saját tapasztalataidat is másokkal.
        </p>
        <p>
          A fórumon kérdéseket tehetsz fel, építési naplókat követhetsz, és
          segítséget kaphatsz festéssel, technikákkal vagy eszközökkel
          kapcsolatban. Ha elakadnál, a <strong>MakettMester AI</strong> gyors
          tippekkel is segít.
        </p>
      </div>

      <div className="card">
        <h2>Összefoglaló</h2>
        <p>
          Összes makett: <strong>{osszesMakett}</strong>
        </p>
        <p>
          Összes vélemény: <strong>{osszesVelemeny}</strong>
        </p>
        <p>
          Átlagos értékelés:{" "}
          {globalisAtlag ? (
            <>
              <strong>{globalisAtlag.toFixed(2)}</strong>{" "}
              <CsillagokKicsi ertek={globalisAtlag} />
            </>
          ) : (
            "még nincs értékelés"
          )}
        </p>
      </div>

      <div className="card">
        <h2>Legjobbra értékelt makettek</h2>
        {topMakettek.length === 0 ? (
          <p className="small">
            Még nincs elég értékelés a listához. Adj véleményt néhány makettről a{" "}
            <strong>Makettek</strong> oldalon! 🙂
          </p>
        ) : (
          <ol style={{ paddingLeft: 20, margin: 0 }}>
            {topMakettek.map((m) => (
              <li key={m.id} style={{ marginBottom: 6 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span>
                    <strong>{m.nev}</strong> – {m.gyarto} ({m.kategoria},{" "}
                    {m.skala})
                  </span>
                  <span style={{ whiteSpace: "nowrap" }}>
                    {m.atlag.toFixed(2)} <CsillagokKicsi ertek={m.atlag} />
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="card">
        <h2>Legutóbbi vélemények</h2>
        {legutobbiVelemenyek.length === 0 ? (
          <p className="small">
            Még nincs egyetlen vélemény sem. Légy te az első, aki ír a{" "}
            <strong>Makettek</strong> oldalon! 🙂
          </p>
        ) : (
          <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
            {legutobbiVelemenyek.map((v) => {
              const datum = v.letrehozva
                ? new Date(v.letrehozva).toLocaleString("hu-HU")
                : "";
              return (
                <li
                  key={v.id}
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid #111827",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 2,
                    }}
                  >
                    <span>
                      <strong>{v.felhasznalo_nev}</strong> a{" "}
                      <em>{v.makett_nev}</em> makettről
                    </span>
                    <span style={{ whiteSpace: "nowrap" }}>
                      {v.ertekeles} / 5 <CsillagokKicsi ertek={v.ertekeles} />
                    </span>
                  </div>
                  <p className="small">{roviditSzoveg(v.szoveg)}</p>
                  {datum && (
                    <p className="small" style={{ opacity: 0.8 }}>
                      {datum}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Gyors kérdés a MakettMester AI-tól</h2>
        <p className="small">
          Írj be egy rövid kérdést makettezésről (festék, ragasztó, technika,
          tipp kezdőknek), és az AI rövid választ ad.
        </p>

        {aiHiba && <p className="error">{aiHiba}</p>}

        {aiModellToltes && (
          <p className="small">
            Modell betöltése... {aiModellProgress}% (első használatkor kicsit
            tovább tarthat)
          </p>
        )}

        <form className="form" onSubmit={kezeliAiKerdesKuldes}>
          <label>
            Kérdés
            <input
              type="text"
              value={aiKerdes}
              onChange={(e) => beallitAiKerdes(e.target.value)}
              placeholder="Pl.: Milyen festéket ajánlasz 1:35-ös harckocsihoz?"
            />
          </label>
          <button type="submit" className="btn" disabled={aiBetolt}>
            {aiBetolt ? "Gondolkodom..." : "Kérdezek"}
          </button>
        </form>

        {aiValasz && (
          <div className="card" style={{ marginTop: 12 }}>
            <p className="small">
              <strong>MakettMester AI válasza:</strong>
            </p>
            <p>{aiValasz}</p>
          </div>
        )}
      </div>

      <p className="small">
        A fenti menüben eléred a makettek listáját, véleményeket írhatsz, és a
        profilodnál a kedvenc makettjeidet is megnézheted.
      </p>
    </section>
  );
}
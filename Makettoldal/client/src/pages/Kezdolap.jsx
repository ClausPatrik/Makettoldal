import React, { useMemo, useState } from "react";
import { useAdat } from "../context/AdatContext";


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
  const { makettek, velemenyek, szamolAtlagErtekeles } = useAdat();

  const [aiKerdes, beallitAiKerdes] = useState("");
  const [aiValasz, beallitAiValasz] = useState("");
  const [aiBetolt, beallitAiBetolt] = useState(false);
  const [aiHiba, beallitAiHiba] = useState(null);
  const [aiModellToltes, beallitAiModellToltes] = useState(false);
  const [aiModellProgress, beallitAiModellProgress] = useState(0);

  const osszesMakett = makettek.length;
  const osszesVelemeny = velemenyek.length;

  const globalisAtlag =
    velemenyek.length > 0
      ? velemenyek.reduce((sum, v) => sum + Number(v.ertekeles || 0), 0) /
        velemenyek.length
      : null;

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

  function roviditSzoveg(szoveg, max = 120) {
    if (!szoveg) return "";
    if (szoveg.length <= max) return szoveg;
    return szoveg.slice(0, max - 3) + "...";
  }

  async function kezeliAiKerdesKuldes(e) {
    e.preventDefault();
    const kerdes = aiKerdes.trim();
    if (!kerdes || aiBetolt) return;

    try {
      beallitAiBetolt(true);
      beallitAiHiba(null);
      beallitAiValasz("");

      const nincsWebGPU =
        typeof navigator !== "undefined" && !("gpu" in navigator);
      if (nincsWebGPU) {
        throw new Error(
          "A böngésződ nem támogatja a WebGPU-t. Próbáld meg egy frissebb Chrome / Edge / Brave böngészővel."
        );
      }

      const engine = await getWebLlmEngine((p) => {
        if (typeof p.progress === "number") {
          beallitAiModellToltes(true);
          beallitAiModellProgress(Math.round(p.progress * 100));
        }
      });

      beallitAiModellToltes(false);

      const messages = [
        {
          role: "system",
          content:
"Te egy 'MakettMester AI' nevű segítő vagy. Magyarul válaszolsz, tegezel. " +
"Kezdő és haladó makettezőknek segítesz: festés, ragasztás, csiszolás, panelvonalak, diorámák. " +
"Mindig adj konkrét, lépésről lépésre tippeket, említs meg gyakori hibákat és azok elkerülését. " +
"Válaszaid legyenek rövidek (3–5 mondat), de informatívak. Ha valamiben nem vagy biztos, írd le, hogy bizonytalan vagy."

        },
        {
          role: "user",
          content: kerdes,
        },
      ];

      const reply = await engine.chat.completions.create({
        messages,
      });

      const text =
        reply?.choices?.[0]?.message?.content ||
        "Nem sikerült most értelmes választ adnom.";

      beallitAiValasz(text);
    } catch (err) {
      console.error(err);
      beallitAiHiba(err.message || "Nem sikerült választ kapni.");
    } finally {
      beallitAiBetolt(false);
    }
  }

  return (
    <section className="page">
      <h1>Üdv a makettező klub oldalán!</h1>
      <div className="card">
        <h2>Makettezők tudásbázisa és fóruma</h2>
  <p>
    Ez az oldal a makettezés iránt érdeklődők közösségi tere.  
    Itt különböző maketteket böngészhetsz, értékeléseket és véleményeket
    olvashatsz, valamint megoszthatod a saját tapasztalataidat is másokkal.
  </p>
  <p>
    A fórumon kérdéseket tehetsz fel, építési naplókat követhetsz,
    és segítséget kaphatsz festéssel, technikákkal vagy eszközökkel kapcsolatban.
    Ha elakadnál, a <strong>MakettMester AI</strong> gyors tippekkel is segít.
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
            Még nincs elég értékelés a listához. Adj véleményt néhány
            makettről a <strong>Makettek</strong> oldalon! 🙂
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
                      {v.ertekeles} / 5{" "}
                      <CsillagokKicsi ertek={v.ertekeles} />
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

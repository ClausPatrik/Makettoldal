// client/src/components/AiChatWidget.jsx
import React, { useRef, useState } from "react";

const API_BASE =
  (import.meta?.env?.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

export default function AiChatWidget() {
  const [nyitva, beallitNyitva] = useState(false);
  const [uzenet, beallitUzenet] = useState("");
  const [uzenetek, beallitUzenetek] = useState([]); // {from:"user"|"bot", text}
  const [betolt, beallitBetolt] = useState(false);
  const [hiba, beallitHiba] = useState(null);

  // Ha a user gyorsan többször küld, az előző kérést megszakítjuk
  const abortRef = useRef(null);

  async function kuldUzenet(e) {
    e?.preventDefault();
    const szoveg = uzenet.trim();
    if (!szoveg || betolt) return;
    beallitHiba(null);

    const ujUser = { from: "user", text: szoveg };
    const ujLista = [...uzenetek, ujUser];

    // UI: azonnal írjuk ki a user üzenetet
    beallitUzenetek(ujLista);
    beallitUzenet("");

    try {
      beallitBetolt(true);

      // előző request megszakítása
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      // Költségcsökkentés: csak az utolsó N üzenetet küldjük fel
      const MAX_HISTORY = 14;
      const trimmed = ujLista.slice(Math.max(0, ujLista.length - MAX_HISTORY));

      const SYSTEM =
        "Te egy 'MakettMester AI' nevű segítő vagy. Magyarul válaszolsz, tegezel. " +
        "Kezdő és haladó makettezőknek segítesz: festés, ragasztás, csiszolás, panelvonalak, diorámák. " +
        "Mindig adj konkrét, lépésről lépésre tippeket, említs meg gyakori hibákat és azok elkerülését. " +
        "Válaszaid legyenek rövidek (3–5 mondat), de informatívak. Ha valamiben nem vagy biztos, írd le, hogy bizonytalan vagy.";

      // A backend a te szervereden hívja az OpenAI-t (gpt-4o-mini)
      const messages = [
        { role: "system", content: SYSTEM },
        ...trimmed.map((m) => ({
          role: m.from === "bot" ? "assistant" : "user",
          content: m.text,
        })),
      ];

      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Ha később auth-ot raksz az AI-ra, akkor itt már készen áll:
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
        body: JSON.stringify({ messages }),
        signal: abortRef.current.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.uzenet || "Hiba az AI híváskor.");
      }

      const valaszSzoveg =
        (data?.reply && String(data.reply).trim()) ||
        "Nem sikerült értelmes választ adnom, bocs 😅";

      const ujBot = { from: "bot", text: valaszSzoveg };
      beallitUzenetek((elozo) => [...elozo, ujBot]);
    } catch (err) {
      if (err?.name === "AbortError") return; // ez oké, user újraküldött
      console.error(err);
      beallitHiba(err.message || "Ismeretlen hiba történt az AI híváskor.");
      const ujBot = {
        from: "bot",
        text:
          "Sajnáljuk" +
          (err.message || ""),
      };
      beallitUzenetek((elozo) => [...elozo, ujBot]);
    } finally {
      beallitBetolt(false);
    }
  }

  return (
    <>
      {/* Lebegő gomb jobb alsó sarokban */}
      <button
        className="ai-fab"
        type="button"
        onClick={() => beallitNyitva((nyit) => !nyit)}
      >
        🤖
      </button>

      {nyitva && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <strong>MakettMester AI</strong>
            <button
              type="button"
              className="ai-chat-close"
              onClick={() => beallitNyitva(false)}
            >
              ×
            </button>
          </div>

          <div className="ai-chat-body">
            {/* Ugyanaz a megjelenés megmarad: a WebGPU figyelmeztetést kivesszük,
                mert már nem WebLLM-et használunk */}
            {uzenetek.length === 0 && (
              <p className="ai-chat-hint">
                Kérdezz bátran makettezésről: festés, ragasztás, alap technikák,
                mit vegyen egy kezdő, stb. Röviden fogok válaszolni.
              </p>
            )}

            {hiba && <p className="error">{hiba}</p>}

            {uzenetek.map((m, idx) => (
              <div
                key={idx}
                className={
                  m.from === "user" ? "ai-msg ai-msg-user" : "ai-msg ai-msg-bot"
                }
              >
                <span>{m.text}</span>
              </div>
            ))}

            {betolt && <p className="ai-chat-hint">Gondolkodom...</p>}
          </div>

          <form className="ai-chat-footer" onSubmit={kuldUzenet}>
            <input
              type="text"
              placeholder="Írd ide a kérdésed..."
              value={uzenet}
              onChange={(e) => beallitUzenet(e.target.value)}
              disabled={betolt}
            />
            <button type="submit" disabled={betolt || !uzenet.trim()}>
              Küldés
            </button>
          </form>
        </div>
      )}
    </>
  );
}

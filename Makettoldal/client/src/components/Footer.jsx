import React, { useMemo, useState } from "react";
import "../styles.css";

export default function Footer() {
  const [uzenetModalNyitva, setUzenetModalNyitva] = useState(false);
  const [targy, setTargy] = useState("");
  const [uzenet, setUzenet] = useState("");
  const [kuldesFolyamatban, setKuldesFolyamatban] = useState(false);
  const [kuldesUzenet, setKuldesUzenet] = useState("");

  const token = useMemo(() => {
    // Több elterjedt kulcsnév támogatása (hogy passzoljon a projektedhez)
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      ""
    );
  }, [uzenetModalNyitva]);

  const bejelentkezve = !!token;

  function megnyitUzenetModal() {
    setKuldesUzenet("");
    setUzenetModalNyitva(true);
  }

  function bezarUzenetModal() {
    if (kuldesFolyamatban) return;
    setUzenetModalNyitva(false);
  }

  async function kuldUzenet(e) {
    e.preventDefault();
    setKuldesUzenet("");

    if (!bejelentkezve) {
      setKuldesUzenet("Bejelentkezés szükséges az üzenetküldéshez.");
      return;
    }

    if (!targy.trim() || !uzenet.trim()) {
      setKuldesUzenet("A tárgy és az üzenet mező kötelező.");
      return;
    }

    try {
      setKuldesFolyamatban(true);

      const resp = await fetch("http://localhost:3001/api/uzenetek", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targy: targy.trim(), uzenet: uzenet.trim() }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setKuldesUzenet(data?.uzenet || "Nem sikerült elküldeni az üzenetet.");
        return;
      }

      setKuldesUzenet("✅ Üzenet elküldve! Köszi, hamarosan válaszolunk.");
      setTargy("");
      setUzenet("");
    } catch (err) {
      console.error(err);
      setKuldesUzenet("Szerver hiba. Próbáld meg később.");
    } finally {
      setKuldesFolyamatban(false);
    }
  }

  return (
    <footer className="tank-footer">
      <div className="tank-footer-inner">
        {/* Brand panel */}
        <div className="footer-panel footer-brand">
          <h3 className="footer-title">MAKETT PARANCSNOKSÁG</h3>
          <p className="footer-desc">
            Makettek véleményezése, építési naplók, technikák és közösségi tudásbázis.
          </p>
          <div className="footer-status">
            <span className="status-dot online"></span>
            SYSTEM ONLINE
          </div>
        </div>

        {/* Navigáció */}
        <div className="footer-panel footer-nav">
          <h3 className="footer-title">NAVIGÁCIÓ</h3>
          <ul>
            <li><a href="/">Főoldal</a></li>
            <li><a href="/makettek">Makettek</a></li>
            <li><a href="/feltoltes">Feltöltés</a></li>
            <li><a href="/forum">Fórum</a></li>
          </ul>
        </div>

        {/* Kapcsolat */}
        <div className="footer-panel footer-contact">
          <h3 className="footer-title">KAPCSOLAT</h3>
          <p>Email: support@makettparancsnoksag.hu</p>
          <p>Verzió: v1.0.0</p>

          <button
            className="footer-message-btn"
            onClick={megnyitUzenetModal}
            type="button"
          >
            ÜZENJ NEKÜNK
          </button>
        </div>
      </div>

      {/* Alsó sáv */}
      <div className="footer-bottom">
        <span>© 2026 Makett Parancsnokság — Minden jog fenntartva</span>
        <span className="footer-tag">TACTICAL MODELING SYSTEM</span>
      </div>

      {/* Modal */}
      {uzenetModalNyitva && (
        <div className="uzenet-modal-overlay" onClick={bezarUzenetModal}>
          <div className="uzenet-modal" onClick={(e) => e.stopPropagation()}>
            <div className="uzenet-modal-head">
              <h3>Üzenj nekünk</h3>
              <button
                type="button"
                className="uzenet-modal-close"
                onClick={bezarUzenetModal}
                aria-label="Bezárás"
              >
                ✕
              </button>
            </div>

            {!bejelentkezve && (
              <div className="uzenet-modal-info">
                Bejelentkezés után tudsz üzenetet küldeni.
              </div>
            )}

            <form className="uzenet-form" onSubmit={kuldUzenet}>
              <label>
                Tárgy
                <input
                  value={targy}
                  onChange={(e) => setTargy(e.target.value)}
                  placeholder="Pl. Hibát találtam / Ötlet"
                  maxLength={120}
                  disabled={kuldesFolyamatban}
                />
              </label>

              <label>
                Üzenet
                <textarea
                  value={uzenet}
                  onChange={(e) => setUzenet(e.target.value)}
                  placeholder="Írd le röviden, miben segíthetünk…"
                  disabled={kuldesFolyamatban}
                />
              </label>

              {kuldesUzenet && <div className="uzenet-modal-msg">{kuldesUzenet}</div>}

              <div className="uzenet-form-actions">
                <button
                  type="button"
                  className="uzenet-btn secondary"
                  onClick={bezarUzenetModal}
                  disabled={kuldesFolyamatban}
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="uzenet-btn primary"
                  disabled={kuldesFolyamatban || !bejelentkezve}
                >
                  {kuldesFolyamatban ? "Küldés…" : "Küldés"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </footer>
  );
}

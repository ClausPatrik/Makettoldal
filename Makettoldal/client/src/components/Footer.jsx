import React, { useMemo, useState } from "react";
import "../styles.css";

export default function Footer() {
  // Modal állapota: meg van-e nyitva az "Üzenj nekünk" ablak
  const [uzenetModalNyitva, setUzenetModalNyitva] = useState(false);

  // Űrlap mezők (kontrollált inputok): tárgy és üzenet szövege
  const [targy, setTargy] = useState("");
  const [uzenet, setUzenet] = useState("");

  // Küldés közbeni tiltásokhoz / UX-hez (gombok letiltása, bezárás tiltása)
  const [kuldesFolyamatban, setKuldesFolyamatban] = useState(false);

  // Felhasználónak megjelenített visszajelzés (hiba / siker üzenet)
  const [kuldesUzenet, setKuldesUzenet] = useState("");

  const token = useMemo(() => {
    // Token kiolvasása localStorage-ból.
    // Több elterjedt kulcsnév támogatása, hogy kompatibilis legyen több auth megoldással.
    // Ha egyik sincs, üres stringet adunk vissza.
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      ""
    );

    // A dependency tömb célja: ha a modalt nyitjuk/zárjuk, újraolvassuk a tokent,
    // így ha közben bejelentkezett a felhasználó, a UI rögtön reagáljon.
  }, [uzenetModalNyitva]);

  // Egyszerű logikai érték: van-e token → be van-e jelentkezve a felhasználó
  const bejelentkezve = !!token;

  function megnyitUzenetModal() {
    // Modal nyitásakor alapból töröljük az előző visszajelzést,
    // hogy ne maradjon bent régi "siker/hiba" üzenet
    setKuldesUzenet("");
    setUzenetModalNyitva(true);
  }

  function bezarUzenetModal() {
    // Küldés közben ne lehessen bezárni (ne veszítsen el adatot / ne legyen félbehagyott kérés)
    if (kuldesFolyamatban) return;
    setUzenetModalNyitva(false);
  }

  async function kuldUzenet(e) {
    // Form submit alapértelmezett viselkedésének tiltása (ne töltse újra az oldalt)
    e.preventDefault();

    // Új próbálkozás előtt töröljük a régi státusz üzenetet
    setKuldesUzenet("");

    // Jogosultság ellenőrzés: üzenetküldéshez bejelentkezés kell
    if (!bejelentkezve) {
      setKuldesUzenet("Bejelentkezés szükséges az üzenetküldéshez.");
      return;
    }

    // Minimális validáció: tárgy és üzenet ne legyen üres/whitespace
    if (!targy.trim() || !uzenet.trim()) {
      setKuldesUzenet("A tárgy és az üzenet mező kötelező.");
      return;
    }

    try {
      // Küldési állapot beállítása: ezzel tiltjuk az inputokat/gombokat UX miatt
      setKuldesFolyamatban(true);

      // Backend kérés: üzenet létrehozása POST-tal JSON body-val
      const resp = await fetch("http://localhost:3001/api/uzenetek", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // JWT Bearer token küldése az Authorization headerben
          Authorization: `Bearer ${token}`,
        },
        // A backend felé tisztított (trimelt) adatokat küldünk
        body: JSON.stringify({ targy: targy.trim(), uzenet: uzenet.trim() }),
      });

      // Válasz JSON olvasása: ha a backend nem küld JSON-t, ne dobjon hibát
      const data = await resp.json().catch(() => ({}));

      // HTTP hibakezelés: resp.ok false → hibás státuszkód (pl. 400/401/500)
      if (!resp.ok) {
        // Ha a backend ad saját üzenetet, azt kiírjuk, különben alap hibaüzenet
        setKuldesUzenet(data?.uzenet || "Nem sikerült elküldeni az üzenetet.");
        return;
      }

      // Sikeres küldés: UI visszajelzés + űrlap ürítése
      setKuldesUzenet("✅ Üzenet elküldve! Köszi, hamarosan válaszolunk.");
      setTargy("");
      setUzenet("");
    } catch (err) {
      // Hálózati hiba / szerver nem elérhető / fetch dobott hibát
      console.error(err);
      setKuldesUzenet("Szerver hiba. Próbáld meg később.");
    } finally {
      // Mindig fut: a "küldés folyamatban" állapot visszaállítása
      setKuldesFolyamatban(false);
    }
  }

  return (
    <footer className="tank-footer">
      <div className="tank-footer-inner">
        {/* Brand panel: név + rövid leírás + státusz jelzés */}
        <div className="footer-panel footer-brand">
          <h3 className="footer-title">MakettMester</h3>
          <p className="footer-desc">
            Makettek véleményezése, építési naplók, technikák és közösségi tudásbázis.
          </p>
          <div className="footer-status">
            {/* Kis "online" pont (CSS animáció / szín jelzés) */}
            <span className="status-dot online"></span>
            SYSTEM ONLINE
          </div>
        </div>

        {/* Navigáció: egyszerű linkek az oldalakhoz */}
        <div className="footer-panel footer-nav">
          <h3 className="footer-title">NAVIGÁCIÓ</h3>
          <ul>
            <li><a href="/">Főoldal</a></li>
            <li><a href="/makettek">Makettek</a></li>
            <li><a href="/forum">Fórum</a></li>
          </ul>
        </div>

        {/* Kapcsolat panel: statikus infók + üzenetküldő modal megnyitása */}
        <div className="footer-panel footer-contact">
          <h3 className="footer-title">KAPCSOLAT</h3>
          <p>Email: makettkluboldal@gmail.com</p>
          <p>Verzió: v1.0.0</p>

          {/* Gomb: modal megnyitása */}
          <button
            className="footer-message-btn"
            onClick={megnyitUzenetModal}
            type="button"
          >
            ÜZENJ NEKÜNK
          </button>
        </div>
      </div>

      {/* Alsó sáv: jogi/brand sor */}
      <div className="footer-bottom">
        <span>© 2026 MakettMester — Minden jog fenntartva</span>
      </div>

      {/* Modal: csak akkor renderelődik, ha nyitva van */}
      {uzenetModalNyitva && (
        // Overlay: kattintásra zár (kivéve küldés közben)
        <div className="uzenet-modal-overlay" onClick={bezarUzenetModal}>
          {/* Modal tartalom: a kattintást megállítjuk, hogy ne záródjon be */}
          <div className="uzenet-modal" onClick={(e) => e.stopPropagation()}>
            <div className="uzenet-modal-head">
              <h3>Üzenj nekünk</h3>

              {/* Bezárás gomb: accessibility miatt aria-label */}
              <button
                type="button"
                className="uzenet-modal-close"
                onClick={bezarUzenetModal}
                aria-label="Bezárás"
              >
                ✕
              </button>
            </div>

            {/* Információs doboz: ha nincs login, jelezzük */}
            {!bejelentkezve && (
              <div className="uzenet-modal-info">
                Bejelentkezés után tudsz üzenetet küldeni.
              </div>
            )}

            {/* Űrlap: submit → kuldUzenet */}
            <form className="uzenet-form" onSubmit={kuldUzenet}>
              <label>
                Tárgy
                <input
                  value={targy}
                  onChange={(e) => setTargy(e.target.value)}
                  placeholder="Pl. Hibát találtam / Ötlet"
                  maxLength={120}
                  // Küldés közben tiltjuk, hogy ne módosuljon a tartalom
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

              {/* Státusz üzenet megjelenítése (hiba/siker) */}
              {kuldesUzenet && <div className="uzenet-modal-msg">{kuldesUzenet}</div>}

              <div className="uzenet-form-actions">
                {/* Mégse: bezárás (küldés közben tiltva) */}
                <button
                  type="button"
                  className="uzenet-btn secondary"
                  onClick={bezarUzenetModal}
                  disabled={kuldesFolyamatban}
                >
                  Mégse
                </button>

                {/* Küldés: login nélkül is tiltva + küldés közben "Küldés…" felirat */}
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
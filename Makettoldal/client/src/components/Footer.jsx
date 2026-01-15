import React from "react";
import "../styles.css";

export default function Footer() {
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
        </div>

      </div>

      {/* Alsó sáv */}
      <div className="footer-bottom">
        <span>© 2026 Makett Parancsnokság — Minden jog fenntartva</span>
        <span className="footer-tag">TACTICAL MODELING SYSTEM</span>
      </div>
    </footer>
  );
}

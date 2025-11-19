import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Regisztracio() {
  const { regisztracio } = useAuth();
  const navigate = useNavigate();
  const [felhasznaloNev, beallitFelhasznaloNev] = useState("");
  const [email, beallitEmail] = useState("");
  const [jelszo, beallitJelszo] = useState("");
  const [betolt, beallitBetolt] = useState(false);
  const [hiba, beallitHiba] = useState(null);

  async function kezeliKuldes(e) {
    e.preventDefault();
    try {
      beallitBetolt(true);
      beallitHiba(null);
      await regisztracio(felhasznaloNev, email, jelszo);
      navigate("/");
    } catch (err) {
      beallitHiba(err.message);
    } finally {
      beallitBetolt(false);
    }
  }

  return (
    <section className="page auth-page">
      <h1>Regisztráció</h1>
      <form onSubmit={kezeliKuldes} className="card form auth-form">
        {hiba && <p className="error">{hiba}</p>}
        <label>
          Felhasználónév
          <input
            type="text"
            value={felhasznaloNev}
            onChange={(e) => beallitFelhasznaloNev(e.target.value)}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => beallitEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Jelszó
          <input
            type="password"
            value={jelszo}
            onChange={(e) => beallitJelszo(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn" disabled={betolt}>
          {betolt ? "Regisztráció..." : "Regisztráció"}
        </button>
        <p className="small">
          Már van fiókod? <Link to="/bejelentkezes">Bejelentkezés</Link>
        </p>
      </form>
    </section>
  );
}

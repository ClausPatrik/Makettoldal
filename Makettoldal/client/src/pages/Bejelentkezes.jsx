import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Bejelentkezes() {
  const { bejelentkezes } = useAuth();
  const navigate = useNavigate();
  const [email, beallitEmail] = useState("");
  const [jelszo, beallitJelszo] = useState("");
  const [betolt, beallitBetolt] = useState(false);
  const [hiba, beallitHiba] = useState(null);

  async function kezeliKuldes(e) {
    e.preventDefault();
    try {
      beallitBetolt(true);
      beallitHiba(null);
      await bejelentkezes(email, jelszo);
      navigate("/");
    } catch (err) {
      beallitHiba(err.message);
    } finally {
      beallitBetolt(false);
    }
  }

  return (
    <section className="page auth-page">
      <h1>Bejelentkezés</h1>
      <form onSubmit={kezeliKuldes} className="card form auth-form">
        {hiba && <p className="error">{hiba}</p>}
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
          {betolt ? "Bejelentkezés..." : "Bejelentkezés"}
        </button>
        <p className="small">
          Még nincs fiókod? <Link to="/regisztracio">Regisztráció</Link>
        </p>
      </form>

      <div className="card" style={{ marginTop: 16 }}>
        <p className="small">
          <strong>Demo felhasználó:</strong> demo@pelda.hu / demo123
        </p>
        <p className="small">
          <strong>Admin felhasználó:</strong> admin@pelda.hu / admin123
        </p>
      </div>
    </section>
  );
}

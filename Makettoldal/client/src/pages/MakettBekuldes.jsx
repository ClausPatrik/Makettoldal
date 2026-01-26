import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:3001/api";

export default function MakettBekuldes() {
  const nav = useNavigate();
  const { felhasznalo } = useAuth();

  const [form, setForm] = useState({
    nev: "",
    gyarto: "",
    kategoria: "harckocsi",
    skala: "1:35",
    nehezseg: 3,
    megjelenes_eve: new Date().getFullYear(),
    kep_url: "",
    leiras: "", // ✅ ÚJ mező
    vasarlasi_link: "",   // ✅ ÚJ
  });

  const [hiba, setHiba] = useState("");
  const [uzenet, setUzenet] = useState("");
  const [loading, setLoading] = useState(false);

  if (!felhasznalo) {
    return (
      <div className="page">
        <div className="card">
          <h2>Makett beküldés</h2>
          <p className="small">Ehhez be kell jelentkezned.</p>
          <Link className="btn" to="/bejelentkezes">
            Bejelentkezés
          </Link>
        </div>
      </div>
    );
  }

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setHiba("");
    setUzenet("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Nincs token (jelentkezz be újra).");

      const body = {
        ...form,
        nehezseg: Number(form.nehezseg),
        megjelenes_eve: Number(form.megjelenes_eve),
        kep_url: form.kep_url?.trim() || null,
        leiras: form.leiras?.trim() || null,
        vasarlasi_link: form.vasarlasi_link?.trim() || null, // ✅ ÚJ
      };

      const res = await fetch(`${API}/makett-javaslatok`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.uzenet || "Hiba a beküldésnél.");

      setUzenet("Beküldve jóváhagyásra ✅");
      nav("/makettek");
    } catch (err) {
      setHiba(err.message || "Ismeretlen hiba.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <h2>Makett beküldése</h2>
          <span className="chip chip-wait">jóváhagyásra</span>
        </div>

        <form className="form" onSubmit={onSubmit}>
          <label>
            Név
            <input name="nev" value={form.nev} onChange={onChange} required />
          </label>

          <label>
            Gyártó
            <input name="gyarto" value={form.gyarto} onChange={onChange} required />
          </label>

          <label>
            Kategória
            <select
              name="kategoria"
              value={form.kategoria}
              onChange={onChange}
              required
            >
              <option value="harckocsi">harckocsi</option>
              <option value="repülő">repülő</option>
              <option value="hajó">hajó</option>
              <option value="mecha">mecha</option>
            </select>
          </label>

          <label>
            Skála
            <input name="skala" value={form.skala} onChange={onChange} required />
          </label>

          <label>
            Nehézség (1–5)
            <input
              name="nehezseg"
              type="number"
              min="1"
              max="5"
              value={form.nehezseg}
              onChange={onChange}
              required
            />
          </label>

          <label>
            Megjelenés éve
            <input
              name="megjelenes_eve"
              type="number"
              value={form.megjelenes_eve}
              onChange={onChange}
              required
            />
          </label>

          {/* ✅ ÚJ: Leírás */}
          <label>
            Leírás (opcionális)
            <textarea
              name="leiras"
              value={form.leiras}
              onChange={onChange}
              rows={4}
              placeholder="Rövid leírás a makettről (változat, érdekességek, megjegyzés)"
            />
          </label>

          <label>
            Kép URL (opcionális)
            <input name="kep_url" value={form.kep_url} onChange={onChange} />
          </label>
          <label>
  Webáruház link (opcionális)
  <input
    type="url"
    name="vasarlasi_link"
    value={form.vasarlasi_link}
    onChange={onChange}
    placeholder="https://www.pelda-webshop.hu/makett"
  />
</label>

          <div className="button-row">
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Küldés..." : "Beküldés"}
            </button>
            <Link className="btn secondary" to="/makettek">
              Mégse
            </Link>
          </div>

          {uzenet && <div className="notice success">{uzenet}</div>}
          {hiba && <div className="notice error">{hiba}</div>}

          <p className="small" style={{ marginTop: 10 }}>
            Beküldés után az admin jóváhagyása szükséges, csak utána kerül ki a
            makettek közé.
          </p>
        </form>
      </div>
    </div>
  );
}

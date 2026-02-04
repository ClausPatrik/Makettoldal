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
    megjelenes_eve: String(new Date().getFullYear()),
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

  const onChange = (e) => {
    const { name, value } = e.target;

    // 50 karakteres limitek
    if (name === "nev" && value.length > 50) return;
    if (name === "gyarto" && value.length > 50) return;

    // Skála: csak számok és kettőspont (pl. 1:35)
    if (name === "skala") {
      if (!/^[0-9:]*$/.test(value)) return;
      if (value.length > 10) return;
    }

    // Megjelenés éve: csak 4 számjegy (YYYY)
    if (name === "megjelenes_eve") {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 4) return;
    }

    setForm((p) => ({ ...p, [name]: value }));
  };
  
  const onSubmit = async (e) => {
    e.preventDefault();
    setHiba("");
    setUzenet("");
    setLoading(true);

    // Frontend ellenőrzések
    if (!/^\d+:\d+$/.test(form.skala.trim())) {
      setLoading(false);
      setHiba('A skála formátuma legyen pl. 1:35 (csak számok és ":").');
      return;
    }

    if (!/^\d{4}$/.test(String(form.megjelenes_eve).trim())) {
      setLoading(false);
      setHiba("A megjelenés éve 4 számjegyű év legyen (pl. 2026).");
      return;
    }

    const ev = Number(String(form.megjelenes_eve).trim());
    if (ev < 1900 || ev > 2031) {
      setLoading(false);
      setHiba("A megjelenés éve nem tűnik érvényesnek.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Nincs token (jelentkezz be újra).");

      const body = {
        ...form,
        nehezseg: Number(form.nehezseg),
        megjelenes_eve: ev,
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
  Név (max. 50 karakter)
  <input
    name="nev"
    value={form.nev}
    onChange={onChange}
    maxLength={50}          // ✅ HTML limit
    required
  />
  <span className="small">
    {form.nev.length}/50
  </span>
</label>


          <label>
            Gyártó neve
            <input placeholder="Fujimi" name="gyarto" value={form.gyarto} onChange={onChange} required />
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
            Skála (pl. 1:35)
            <input
              name="skala"
              value={form.skala}
              onChange={onChange}
              placeholder="1:35"
              inputMode="numeric"
              pattern="[0-9]+:[0-9]+"
              required
            />
            <span className="small">Csak számok és kettőspont (pl. 1:35)</span>
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
            Megjelenés éve (csak év)
            <input
              name="megjelenes_eve"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{4}"
              placeholder="2026"
              value={form.megjelenes_eve}
              onChange={onChange}
              required
            />
            <span className="small">{form.megjelenes_eve.length}/4</span>
          </label>

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

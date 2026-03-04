import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Backend API bázis URL.
 * Megjegyzés: lokális fejlesztési környezet; éles környezetben jellemzően env változóból jön.
 */
const API = "http://localhost:3001/api";

export default function MakettBekuldes() {
  const nav = useNavigate();
  const { felhasznalo } = useAuth();

  /**
   * Űrlap állapot:
   * - default értékekkel inicializálva (kategória, skála, nehézség, aktuális év)
   * - `kep_url` és `vasarlasi_link` opcionális mezők
   */
  const [form, setForm] = useState({
    nev: "",
    gyarto: "",
    kategoria: "harckocsi",
    skala: "1:35",
    nehezseg: 3,
    megjelenes_eve: String(new Date().getFullYear()),
    kep_url: "",
    leiras: "",
    vasarlasi_link: "",
  });

  // UI állapotok: hibaüzenet, sikerüzenet, submit folyamatban jelző
  const [hiba, setHiba] = useState("");
  const [uzenet, setUzenet] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Kép feltöltéshez kiválasztott fájl (opcionális).
   * Ha van `kepFile`, akkor FormData-ban fájlként megy, és a backend ezt használhatja a `kep_url` helyett.
   */
  const [kepFile, setKepFile] = useState(null);

  // Auth guard: csak bejelentkezett felhasználó küldhet be makettet
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

    /**
     * Kliens oldali, azonnali input-szűrések:
     * - cél: egyszerű UX (ne engedjen túl hosszú / nyilvánvalóan hibás bevitelt)
     * - fontos: a backend oldali validációt nem helyettesíti
     */

    // Név és gyártó: max. 50 karakter (UI limit)
    if (name === "nev" && value.length > 50) return;
    if (name === "gyarto" && value.length > 50) return;

    // Skála: csak számok és kettőspont (pl. 1:35)
    if (name === "skala") {
      if (!/^[0-9:]*$/.test(value)) return;
      if (value.length > 10) return;
    }

    // Megjelenés éve: csak számjegyek, max. 4 karakter (YYYY)
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

    /**
     * Frontend validáció:
     * - gyors visszajelzés a felhasználónak
     * - a backend validációt kiegészíti (nem helyettesíti)
     */

    // Skála formátum: "szám:szám" (pl. 1:35)
    if (!/^\d+:\d+$/.test(form.skala.trim())) {
      setLoading(false);
      setHiba('A skála formátuma legyen pl. 1:35 (csak számok és ":").');
      return;
    }

    // Megjelenés éve: pontosan 4 számjegy
    if (!/^\d{4}$/.test(String(form.megjelenes_eve).trim())) {
      setLoading(false);
      setHiba("A megjelenés éve 4 számjegyű év legyen (pl. 2026).");
      return;
    }

    // Év tartomány ellenőrzés (UI/business szabály)
    const ev = Number(String(form.megjelenes_eve).trim());
    if (ev < 1900 || ev > 2031) {
      setLoading(false);
      setHiba("A megjelenés éve nem tűnik érvényesnek.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Nincs token (jelentkezz be újra).");

      /**
       * `body` normalizálás:
       * - számmá alakítások
       * - trim + üres mező -> null
       *
       * Megjegyzés: ebben a megoldásban végül FormData kerül elküldésre,
       * a `body` inkább egy “kanonikus” (normalizált) értékkészlet.
       */
      const body = {
        ...form,
        nehezseg: Number(form.nehezseg),
        megjelenes_eve: ev,
        kep_url: form.kep_url?.trim() || null,
        leiras: form.leiras?.trim() || null,
        vasarlasi_link: form.vasarlasi_link?.trim() || null,
      };

      /**
       * FormData összeállítása:
       * - támogatja a fájlfeltöltést (multipart/form-data)
       * - ha nincs fájl, akkor is elküldi a `kep_url` mezőt (URL-es megoldás támogatásához)
       *
       * Fontos: FormData esetén NEM állítunk be manuálisan Content-Type headert,
       * mert a boundary-t a böngésző adja hozzá.
       */
      const fd = new FormData();
      fd.append("nev", body.nev);
      fd.append("gyarto", body.gyarto);
      fd.append("kategoria", body.kategoria);
      fd.append("skala", body.skala);
      fd.append("nehezseg", String(body.nehezseg));
      fd.append("megjelenes_eve", String(body.megjelenes_eve));
      fd.append("leiras", body.leiras || "");
      fd.append("vasarlasi_link", body.vasarlasi_link || "");
      fd.append("kep_url", body.kep_url || ""); // fájl nélkül is működhessen URL-lel

      // Opcionális: kép fájlként csatolása
      if (kepFile) fd.append("kep", kepFile);

      // Beküldés jóváhagyásra (makett-javaslatok végpont)
      const res = await fetch(`${API}/makett-javaslatok`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.uzenet || "Hiba a beküldésnél.");

      // Sikeres beküldés: UI üzenet + navigáció
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
              maxLength={50}
              required
            />
            <span className="small">{form.nev.length}/50</span>
          </label>

          <label>
            Gyártó neve
            <input
              placeholder="Fujimi"
              name="gyarto"
              value={form.gyarto}
              onChange={onChange}
              required
            />
          </label>

          <label>
            Kategória
            <select name="kategoria" value={form.kategoria} onChange={onChange} required>
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

          {/* Opcionális fájlfeltöltés: ha van kép, a backend ezt preferálhatja a URL-lel szemben */}
          <label>
            <label>
              Kép feltöltés (opcionális)
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setKepFile(e.target.files?.[0] || null)}
              />
              <span className="small">
                Ha töltesz fel képet, az lesz használva a Kép URL helyett.
              </span>
            </label>
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
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useAdat } from "../context/AdatContext";
import { Link, useNavigate } from "react-router-dom";

function generalSzin(nev) {
  if (!nev) return "#4b5563";
  let hash = 0;
  for (let i = 0; i < nev.length; i++) {
    hash = nev.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

function AvatarNagy({ nev, profilKepUrl }) {
  if (profilKepUrl) {
    return (
      <div className="profile-avatar-wrapper">
        <img
          src={profilKepUrl}
          alt={`${nev || "Felhasználó"} profilképe`}
          className="profile-avatar-image"
        />
      </div>
    );
  }

  if (!nev) nev = "P";
  const kezdobetu = nev.trim().charAt(0).toUpperCase();
  const hatter = generalSzin(nev);

  const stilus = {
    width: "96px",
    height: "96px",
    borderRadius: "9999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "42px",
    fontWeight: "bold",
    background: hatter,
    color: "white",
  };

  return <div style={stilus}>{kezdobetu}</div>;
}

export default function Profil() {
  const { felhasznalo, bejelentkezve, kijelentkezes, profilFrissites } =
    useAuth();
  const { makettek, kedvencek, betoltKedvencek } = useAdat();
  const navigate = useNavigate();

  const [nev, beallitNev] = useState(felhasznalo?.felhasznalo_nev || "");
  const [profilKepUrl, beallitProfilKepUrl] = useState(
    felhasznalo?.profil_kep_url || ""
  );
  const [mentesFolyamatban, beallitMentesFolyamatban] = useState(false);

  useEffect(() => {
    if (!bejelentkezve) {
      navigate("/bejelentkezes");
      return;
    }
    betoltKedvencek();
  }, [bejelentkezve, betoltKedvencek, navigate]);

  useEffect(() => {
    if (felhasznalo) {
      beallitNev(felhasznalo.felhasznalo_nev || "");
      beallitProfilKepUrl(felhasznalo.profil_kep_url || "");
    }
  }, [felhasznalo]);

  if (!bejelentkezve) {
    return null;
  }

  async function kezeliProfilMentese(e) {
    e.preventDefault();
    try {
      beallitMentesFolyamatban(true);
      await profilFrissites({
        felhasznalo_nev: nev,
        profil_kep_url: profilKepUrl,
      });
      alert("Profil mentve.");
    } catch (err) {
      alert(err.message);
    } finally {
      beallitMentesFolyamatban(false);
    }
  }

  function kezeliKijelentkezes() {
    kijelentkezes();
    navigate("/");
  }

  const kedvencMakettek = makettek.filter((m) => kedvencek.includes(m.id));

  return (
    <section className="page">
      <h1>Profilom</h1>

      <div className="profile-card card">
        <AvatarNagy nev={nev} profilKepUrl={profilKepUrl} />
        <div className="profile-info">
          <p>
            <strong>Email:</strong> {felhasznalo.email}
          </p>
          <p>
            <strong>Szerepkör:</strong>{" "}
            {felhasznalo.szerepkor_id === 2 ? "Admin" : "Felhasználó"}
          </p>
        </div>

        <form onSubmit={kezeliProfilMentese} className="profile-form form">
          <label>
            Név
            <input
              type="text"
              value={nev}
              onChange={(e) => beallitNev(e.target.value)}
              required
            />
          </label>
          <label>
            Profilkép URL
            <input
              type="url"
              value={profilKepUrl}
              onChange={(e) => beallitProfilKepUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <div className="button-row">
            <button type="submit" className="btn" disabled={mentesFolyamatban}>
              {mentesFolyamatban ? "Mentés..." : "Profil mentése"}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={kezeliKijelentkezes}
            >
              Kijelentkezés
            </button>
          </div>
        </form>
      </div>

      <section className="card">
        <h2>Kedvenc makettjeim</h2>
        {kedvencMakettek.length === 0 ? (
          <p>
            Még nincs kedvenc maketted. A{" "}
            <Link to="/makettek">Makettek</Link> oldalon a szívecskével tudsz
            kedvencet jelölni.
          </p>
        ) : (
          <ul className="kedvenc-lista">
            {kedvencMakettek.map((m) => (
              <li key={m.id} className="kedvenc-sor">
                <strong>{m.nev}</strong> – {m.gyarto} ({m.kategoria},{" "}
                {m.skala})
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

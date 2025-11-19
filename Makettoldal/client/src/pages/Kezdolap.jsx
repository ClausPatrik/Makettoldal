import React from "react";
import { useAdat } from "../context/AdatContext";

export default function Kezdolap() {
  const { makettek, velemenyek } = useAdat();

  const osszesMakett = makettek.length;
  const osszesVelemeny = velemenyek.length;

  const atlag =
    velemenyek.length > 0
      ? velemenyek.reduce((sum, v) => sum + Number(v.ertekeles || 0), 0) /
        velemenyek.length
      : null;

  return (
    <section className="page">
      <h1>Üdv a makettező klub oldalán!</h1>
      <div className="card">
        <p>Összes makett: {osszesMakett}</p>
        <p>Összes vélemény: {osszesVelemeny}</p>
        <p>
          Átlagos értékelés:{" "}
          {atlag ? atlag.toFixed(2) : "még nincs értékelés"}
        </p>
      </div>
      <p className="small">
        A fenti menüben eléred a makettek listáját, véleményeket írhatsz, és a
        profilodnál a kedvenc makettjeidet is megnézheted.
      </p>
    </section>
  );
}

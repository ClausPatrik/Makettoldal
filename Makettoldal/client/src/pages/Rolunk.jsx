import React from "react";

/**
 * Rolunk oldal
 * 
 * Statikus információs oldal a MakettKlub projektről.
 * Célja:
 * - bemutatni a közösséget
 * - röviden ismertetni az oldal célját
 * - ösztönözni a felhasználókat az aktív részvételre
 *
 * Megjegyzés:
 * Ez a komponens nem használ state-et, contextet vagy API hívást,
 * kizárólag statikus tartalmat renderel.
 */
export default function Rolunk() {
  return (
    <section className="page">
      <header className="page-header">
        <h1>Rólunk</h1>

        {/* Rövid bemutatkozó szöveg a MakettKlub közösségről */}
        <p className="page-intro">
          A MakettKlub egy online közösség, ahol a makettezés szerelmesei
          megoszthatják egymással az elkészült munkáikat, tapasztalataikat és
          ötleteiket.
        </p>
      </header>

      {/* Közösség bemutatása */}
      <section className="card">
        <h2>Kik vagyunk?</h2>

        <p>
          Az oldalt olyan makettezők hozták létre, akik szerettek volna egy
          barátságos, átlátható felületet, ahol könnyen lehet inspirációt
          gyűjteni, véleményt cserélni és nyomon követni az építési folyamatokat.
        </p>
      </section>

      {/* Közösségi támogatás / részvétel ösztönzése */}
      <section className="card">
        <h2>Támogass minket</h2>

        <p>
          Ha tetszik az oldal, és szeretnéd, hogy tovább fejlődjön, több funkció
          és tartalom kerüljön fel, a következő módokon tudsz segíteni:
        </p>

        {/* Felhasználói aktivitást ösztönző lista */}
        <ul>
          <li>Meséld el másoknak, oszd meg az oldalt ismerőseiddel.</li>
          <li>Írj visszajelzést, hogy mit fejlesszünk tovább.</li>
          <li>Légy aktív: tölts fel maketteket, írj véleményt, használd a fórumot.</li>
        </ul>

        {/* Közösségi záróüzenet */}
        <p>
          Köszönjük, hogy része vagy a közösségnek és támogatod a MakettKlubot! 🎨
        </p>
      </section>
    </section>
  );
}
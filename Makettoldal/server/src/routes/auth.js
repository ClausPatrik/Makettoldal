import express from "express";

export default function createAuthRoutes(ctx) {
  const router = express.Router();
  const {
    adatbazisLekeres,
    authMiddleware,
    adminMiddleware,
    upload,
    aiLimiter,
    generalToken,
    bcrypt,
    jwt,
    nodemailer,
    naplozAktivitas,
  } = ctx;

  router.post("/api/auth/register", async (req, res) => {
    try {
      const { felhasznalo_nev, email, jelszo } = req.body;
      if (!felhasznalo_nev || !email || !jelszo) {
        return res.status(400).json({ uzenet: "Minden mező kitöltése kötelező." });
      }

      const letezo = await adatbazisLekeres("SELECT id FROM felhasznalo WHERE email = ?", [email]);
      if (letezo.length > 0) {
        return res.status(400).json({ uzenet: "Ezzel az email címmel már létezik felhasználó." });
      }

      const hash = await bcrypt.hash(jelszo, 10);
      const eredmeny = await adatbazisLekeres(
        `INSERT INTO felhasznalo (felhasznalo_nev, email, jelszo_hash, szerepkor_id)
         VALUES (?, ?, ?, 1)`,
        [felhasznalo_nev, email, hash]
      );

      const ujId = eredmeny.insertId;
      const [uj] = await adatbazisLekeres("SELECT * FROM felhasznalo WHERE id = ?", [ujId]);
      const token = generalToken(uj);

      return res.status(201).json({
        token,
        felhasznalo: {
          id: uj.id,
          felhasznalo_nev: uj.felhasznalo_nev,
          email: uj.email,
          szerepkor_id: uj.szerepkor_id,
          profil_kep_url: uj.profil_kep_url,
        },
      });
    } catch (err) {
      console.error("Regisztrációs hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a regisztráció során." });
    }
  });

  router.post("/api/auth/login", async (req, res) => {
    try {
      const { email, jelszo } = req.body;
      const felhasznalok = await adatbazisLekeres("SELECT * FROM felhasznalo WHERE email = ?", [email]);
      if (!felhasznalok.length) {
        return res.status(400).json({ uzenet: "Hibás email vagy jelszó." });
      }

      const user = felhasznalok[0];
      const egyezik = await bcrypt.compare(jelszo, user.jelszo_hash);
      if (!egyezik) {
        return res.status(400).json({ uzenet: "Hibás email vagy jelszó." });
      }

      // tiltás login-nál is
      if (user.tiltva && user.tiltva !== "nincs") {
        if (user.tiltva === "ideiglenes" && user.tilt_eddig) {
          const most = new Date();
          const eddig = new Date(user.tilt_eddig);
          if (!isNaN(eddig.getTime()) && eddig <= most) {
            await adatbazisLekeres(
              `UPDATE felhasznalo
               SET tiltva='nincs', tilt_eddig=NULL, tilt_ok=NULL, tiltva_ekkor=NULL, tiltva_admin_id=NULL
               WHERE id=?`,
              [user.id]
            );
          } else {
            return res.status(403).json({
              uzenet: "A fiókod ideiglenesen ki van tiltva.",
              tiltott: true,
              tilt_tipus: "ideiglenes",
              tilt_eddig: user.tilt_eddig,
              tilt_ok: user.tilt_ok || null,
            });
          }
        } else {
          return res.status(403).json({
            uzenet: "A fiókod véglegesen ki van tiltva.",
            tiltott: true,
            tilt_tipus: "vegleges",
            tilt_eddig: null,
            tilt_ok: user.tilt_ok || null,
          });
        }
      }

      const token = generalToken(user);
      return res.json({
        token,
        felhasznalo: {
          id: user.id,
          felhasznalo_nev: user.felhasznalo_nev,
          email: user.email,
          szerepkor_id: user.szerepkor_id,
          profil_kep_url: user.profil_kep_url,
        },
      });
    } catch (err) {
      console.error("Bejelentkezési hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a bejelentkezés során." });
    }
  });

  return router;
}

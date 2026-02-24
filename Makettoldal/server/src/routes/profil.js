import express from "express";

export default function createProfilRoutes(ctx) {
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

  router.put("/api/profil", authMiddleware, async (req, res) => {
    try {
      const { felhasznalo_nev, profil_kep_url } = req.body;
      const id = req.felhasznalo.id;

      await adatbazisLekeres(
        `UPDATE felhasznalo
         SET felhasznalo_nev = ?, profil_kep_url = ?
         WHERE id = ?`,
        [felhasznalo_nev, profil_kep_url || null, id]
      );

      const [uj] = await adatbazisLekeres("SELECT * FROM felhasznalo WHERE id = ?", [id]);
      const token = generalToken(uj);

      return res.json({
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
      console.error("Profil frissítési hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a profil frissítése során." });
    }
  });

  router.post("/api/profil/feltoltes", authMiddleware, upload.single("profilkep"), async (req, res) => {
    if (!req.file) return res.status(400).json({ uzenet: "Nincs feltöltött fájl." });

    // frontend a /uploads/...-t is tudja kezelni (jobb), de ha kell, itt a teljes URL
    const kepUrl = `/uploads/${req.file.filename}`;

    try {
      await adatbazisLekeres("UPDATE felhasznalo SET profil_kep_url = ? WHERE id = ?", [
        kepUrl,
        req.felhasznalo.id,
      ]);

      return res.json({ uzenet: "Profilkép frissítve.", kepUrl });
    } catch (err) {
      console.error("Profilkép mentési hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Hiba adatbázis mentés közben." });
    }
  });

  return router;
}

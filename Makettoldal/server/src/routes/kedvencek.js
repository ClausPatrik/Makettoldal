import express from "express";

export default function createKedvencekRoutes(ctx) {
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

  router.get("/api/kedvencek", authMiddleware, async (req, res) => {
    try {
      const userId = req.felhasznalo.id;
      const sorok = await adatbazisLekeres(
        `SELECT k.makett_id, m.nev, m.gyarto, m.kategoria, m.skala, m.kep_url
         FROM kedvenc k
         JOIN makett m ON m.id = k.makett_id
         WHERE k.felhasznalo_id = ?`,
        [userId]
      );
      return res.json(sorok);
    } catch (err) {
      console.error("Kedvencek lekérdezési hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a kedvencek lekérdezése során." });
    }
  });

  router.post("/api/kedvencek/:makettId", authMiddleware, async (req, res) => {
    try {
      const userId = req.felhasznalo.id;
      const makettId = Number(req.params.makettId);
      await adatbazisLekeres(
        `INSERT IGNORE INTO kedvenc (felhasznalo_id, makett_id) VALUES (?, ?)`,
        [userId, makettId]
      );
      return res.status(201).json({ uzenet: "Hozzáadva a kedvencekhez." });
    } catch (err) {
      console.error("Kedvencek hozzáadási hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a kedvencek módosítása során." });
    }
  });

  router.delete("/api/kedvencek/:makettId", authMiddleware, async (req, res) => {
    try {
      const userId = req.felhasznalo.id;
      const makettId = Number(req.params.makettId);
      await adatbazisLekeres("DELETE FROM kedvenc WHERE felhasznalo_id = ? AND makett_id = ?", [userId, makettId]);
      return res.json({ uzenet: "Eltávolítva a kedvencek közül." });
    } catch (err) {
      console.error("Kedvencek törlési hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a kedvencek módosítása során." });
    }
  });

  return router;
}

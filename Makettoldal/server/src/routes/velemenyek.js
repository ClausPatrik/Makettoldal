import express from "express";

export default function createVelemenyekRoutes(ctx) {
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

  router.get("/api/velemenyek", async (req, res) => {
    try {
      const velemenyek = await adatbazisLekeres(
        `SELECT v.id, v.makett_id, v.felhasznalo_id, v.szoveg, v.ertekeles, v.letrehozva,
                f.felhasznalo_nev, m.nev AS makett_nev
         FROM velemeny v
         JOIN felhasznalo f ON f.id = v.felhasznalo_id
         JOIN makett m ON m.id = v.makett_id
         ORDER BY v.letrehozva DESC`
      );
      return res.json(velemenyek);
    } catch (err) {
      console.error("Vélemények lekérdezési hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a vélemények lekérdezése során." });
    }
  });

  router.get("/api/sajat/velemenyek", authMiddleware, async (req, res) => {
    try {
      const felhasznaloId = req.felhasznalo.id;
      const sorok = await adatbazisLekeres(
        `SELECT v.id, v.makett_id, v.szoveg, v.ertekeles, v.letrehozva,
                m.nev AS makett_nev, m.gyarto, m.skala, m.kategoria
         FROM velemeny v
         JOIN makett m ON m.id = v.makett_id
         WHERE v.felhasznalo_id = ?
         ORDER BY v.letrehozva DESC`,
        [felhasznaloId]
      );
      return res.json(sorok);
    } catch (err) {
      console.error("Saját vélemények lekérdezési hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a saját vélemények lekérdezése során." });
    }
  });

  router.put("/api/velemenyek/:id", authMiddleware, async (req, res) => {
    try {
      const velemenyId = Number(req.params.id);
      const { szoveg, ertekeles } = req.body;
      const userId = req.felhasznalo.id;
      const admin = req.felhasznalo.szerepkor_id === 2;

      const eredeti = await adatbazisLekeres("SELECT * FROM velemeny WHERE id = ?", [velemenyId]);
      if (!eredeti.length) return res.status(404).json({ uzenet: "A vélemény nem található." });
      if (!admin && eredeti[0].felhasznalo_id !== userId) {
        return res.status(403).json({ uzenet: "Nem módosíthatod más felhasználó véleményét." });
      }

      const ertek = Number(ertekeles);
      if (!(ertek >= 1 && ertek <= 5)) return res.status(400).json({ uzenet: "Az értékelés 1 és 5 között lehet." });

      await adatbazisLekeres("UPDATE velemeny SET szoveg = ?, ertekeles = ? WHERE id = ?", [
        String(szoveg || "").trim(),
        ertek,
        velemenyId,
      ]);

      const [uj] = await adatbazisLekeres(
        `SELECT v.id, v.makett_id, v.felhasznalo_id, v.szoveg, v.ertekeles, v.letrehozva,
                f.felhasznalo_nev
         FROM velemeny v
         JOIN felhasznalo f ON f.id = v.felhasznalo_id
         WHERE v.id = ?`,
        [velemenyId]
      );
      return res.json(uj);
    } catch (err) {
      console.error("Vélemény módosítási hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a vélemény módosítása során." });
    }
  });

  router.delete("/api/velemenyek/:id", authMiddleware, async (req, res) => {
    try {
      const velemenyId = Number(req.params.id);
      const userId = req.felhasznalo.id;
      const admin = req.felhasznalo.szerepkor_id === 2;
      const moderator = req.felhasznalo.szerepkor_id === 3;

      const eredeti = await adatbazisLekeres("SELECT * FROM velemeny WHERE id = ?", [velemenyId]);
      if (!eredeti.length) return res.status(404).json({ uzenet: "A vélemény nem található." });
      if (!(admin || moderator) && eredeti[0].felhasznalo_id !== userId) {
        return res.status(403).json({ uzenet: "Nem törölheted más felhasználó véleményét." });
      }

      await adatbazisLekeres("DELETE FROM velemeny WHERE id = ?", [velemenyId]);
      return res.json({ uzenet: "Vélemény törölve." });
    } catch (err) {
      console.error("Vélemény törlési hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a vélemény törlése során." });
    }
  });

  return router;
}

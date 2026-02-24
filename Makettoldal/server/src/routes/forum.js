import express from "express";

export default function createForumRoutes(ctx) {
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

  router.get("/api/forum/temak", async (req, res) => {
    try {
      const temak = await adatbazisLekeres(
        `SELECT t.id, t.cim, t.leiras, t.kategoria, t.letrehozva, t.felhasznalo_id,
                f.felhasznalo_nev,
                COUNT(u.id) AS uzenet_db,
                MAX(u.letrehozva) AS utolso_valasz
         FROM forum_tema t
         JOIN felhasznalo f ON f.id = t.felhasznalo_id
         LEFT JOIN forum_uzenet u ON u.tema_id = t.id
         GROUP BY t.id
         ORDER BY COALESCE(MAX(u.letrehozva), t.letrehozva) DESC`
      );
      return res.json(temak);
    } catch (err) {
      console.error("Fórum témák hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Hiba a fórum témák lekérdezésekor." });
    }
  });

  router.post("/api/forum/temak", authMiddleware, async (req, res) => {
    try {
      const { cim, leiras, kategoria } = req.body;
      if (!cim || String(cim).trim() === "") return res.status(400).json({ uzenet: "A cím megadása kötelező." });

      const eredmeny = await adatbazisLekeres(
        `INSERT INTO forum_tema (cim, leiras, kategoria, felhasznalo_id)
         VALUES (?, ?, ?, ?)`,
        [String(cim).trim(), leiras || null, kategoria || null, req.felhasznalo.id]
      );

      const [uj] = await adatbazisLekeres(
        `SELECT t.id, t.cim, t.leiras, t.kategoria, t.letrehozva, t.felhasznalo_id,
                f.felhasznalo_nev,
                0 AS uzenet_db,
                t.letrehozva AS utolso_valasz
         FROM forum_tema t
         JOIN felhasznalo f ON f.id = t.felhasznalo_id
         WHERE t.id = ?`,
        [eredmeny.insertId]
      );
      return res.status(201).json(uj);
    } catch (err) {
      console.error("Új fórum téma hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Hiba a téma létrehozása során." });
    }
  });

  router.get("/api/forum/temak/:id/uzenetek", async (req, res) => {
    try {
      const temaId = Number(req.params.id);
      const uzenetek = await adatbazisLekeres(
        `SELECT u.id, u.tema_id, u.felhasznalo_id, u.szoveg, u.letrehozva,
                f.felhasznalo_nev
         FROM forum_uzenet u
         JOIN felhasznalo f ON f.id = u.felhasznalo_id
         WHERE u.tema_id = ?
         ORDER BY u.letrehozva ASC`,
        [temaId]
      );
      return res.json(uzenetek);
    } catch (err) {
      console.error("Fórum üzenetek hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Hiba a fórum üzenetek lekérdezésekor." });
    }
  });

  router.post("/api/forum/temak/:id/uzenetek", authMiddleware, async (req, res) => {
    try {
      const temaId = Number(req.params.id);
      const { szoveg } = req.body;
      if (!szoveg || String(szoveg).trim() === "") return res.status(400).json({ uzenet: "Az üzenet szövege kötelező." });

      const eredmeny = await adatbazisLekeres(
        `INSERT INTO forum_uzenet (tema_id, felhasznalo_id, szoveg)
         VALUES (?, ?, ?)`,
        [temaId, req.felhasznalo.id, String(szoveg).trim()]
      );

      const [uj] = await adatbazisLekeres(
        `SELECT u.id, u.tema_id, u.felhasznalo_id, u.szoveg, u.letrehozva,
                f.felhasznalo_nev
         FROM forum_uzenet u
         JOIN felhasznalo f ON f.id = u.felhasznalo_id
         WHERE u.id = ?`,
        [eredmeny.insertId]
      );
      return res.status(201).json(uj);
    } catch (err) {
      console.error("Új fórum üzenet hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Hiba az üzenet mentése során." });
    }
  });

  router.put("/api/forum/temak/:id", authMiddleware, async (req, res) => {
    try {
      const temaId = Number(req.params.id);
      const { cim, leiras, kategoria } = req.body;
      const userId = req.felhasznalo.id;
      const admin = req.felhasznalo.szerepkor_id === 2;

      const [tema] = await adatbazisLekeres("SELECT * FROM forum_tema WHERE id = ?", [temaId]);
      if (!tema) return res.status(404).json({ uzenet: "A téma nem található." });
      if (!admin && tema.felhasznalo_id !== userId) {
        return res.status(403).json({ uzenet: "Nincs jogosultságod a téma módosításához." });
      }

      await adatbazisLekeres(
        "UPDATE forum_tema SET cim = ?, leiras = ?, kategoria = ? WHERE id = ?",
        [cim, leiras || null, kategoria || null, temaId]
      );

      const [friss] = await adatbazisLekeres("SELECT * FROM forum_tema WHERE id = ?", [temaId]);
      return res.json(friss);
    } catch (err) {
      console.error("Fórum téma módosítás hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba." });
    }
  });

  router.delete("/api/forum/temak/:id", authMiddleware, async (req, res) => {
    try {
      const temaId = Number(req.params.id);
      const userId = req.felhasznalo.id;
      const admin = req.felhasznalo.szerepkor_id === 2;

      const [tema] = await adatbazisLekeres("SELECT * FROM forum_tema WHERE id = ?", [temaId]);
      if (!tema) return res.status(404).json({ uzenet: "A téma nem található." });
      if (!admin && tema.felhasznalo_id !== userId) {
        return res.status(403).json({ uzenet: "Nincs jogosultságod a téma törléséhez." });
      }

      await adatbazisLekeres("DELETE FROM forum_tema WHERE id = ?", [temaId]);
      return res.json({ uzenet: "Téma törölve." });
    } catch (err) {
      console.error("Fórum téma törlés hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba." });
    }
  });

  router.put("/api/forum/uzenetek/:id", authMiddleware, async (req, res) => {
    try {
      const uzenetId = Number(req.params.id);
      const { szoveg } = req.body;
      const userId = req.felhasznalo.id;
      const admin = req.felhasznalo.szerepkor_id === 2;

      const [uzenet] = await adatbazisLekeres("SELECT * FROM forum_uzenet WHERE id = ?", [uzenetId]);
      if (!uzenet) return res.status(404).json({ uzenet: "Hozzászólás nem található." });
      if (!admin && uzenet.felhasznalo_id !== userId) {
        return res.status(403).json({ uzenet: "Nincs jogosultságod a hozzászólás módosításához." });
      }

      await adatbazisLekeres("UPDATE forum_uzenet SET szoveg = ? WHERE id = ?", [String(szoveg).trim(), uzenetId]);
      const [friss] = await adatbazisLekeres("SELECT * FROM forum_uzenet WHERE id = ?", [uzenetId]);
      return res.json(friss);
    } catch (err) {
      console.error("Fórum üzenet módosítás hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba." });
    }
  });

  router.delete("/api/forum/uzenetek/:id", authMiddleware, async (req, res) => {
    try {
      const uzenetId = Number(req.params.id);
      const userId = req.felhasznalo.id;
      const admin = req.felhasznalo.szerepkor_id === 2;
      const moderator = req.felhasznalo.szerepkor_id === 3;

      const [uzenet] = await adatbazisLekeres("SELECT * FROM forum_uzenet WHERE id = ?", [uzenetId]);
      if (!uzenet) return res.status(404).json({ uzenet: "Hozzászólás nem található." });
      if (!(admin || moderator) && uzenet.felhasznalo_id !== userId) {
        return res.status(403).json({ uzenet: "Nincs jogosultságod a hozzászólás törléséhez." });
      }

      await adatbazisLekeres("DELETE FROM forum_uzenet WHERE id = ?", [uzenetId]);
      return res.json({ uzenet: "Hozzászólás törölve." });
    } catch (err) {
      console.error("Fórum üzenet törlés hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba." });
    }
  });

  return router;
}

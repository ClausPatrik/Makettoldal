import express from "express";

export default function createEpitesinaploRoutes(ctx) {
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

  router.get("/api/epitesinaplo", async (req, res) => {
    try {
      const sorok = await adatbazisLekeres(
        `SELECT e.id, e.makett_id, e.cim, e.leiras, e.kep_url, e.letrehozva,
                m.nev AS makett_nev, m.gyarto, m.skala,
                f.felhasznalo_nev
         FROM epitesi_naplo e
         JOIN makett m ON m.id = e.makett_id
         JOIN felhasznalo f ON f.id = e.felhasznalo_id
         ORDER BY e.letrehozva DESC`
      );
      return res.json(sorok);
    } catch (err) {
      console.error("Építési napló lekérdezési hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba az építési napló lekérdezése során." });
    }
  });

  router.get("/api/epitesinaplo/sajat", authMiddleware, async (req, res) => {
    try {
      const felhasznaloId = req.felhasznalo.id;
      const sorok = await adatbazisLekeres(
        `SELECT e.id, e.makett_id, e.cim, e.leiras, e.kep_url, e.letrehozva,
                m.nev AS makett_nev, m.gyarto, m.skala
         FROM epitesi_naplo e
         JOIN makett m ON m.id = e.makett_id
         WHERE e.felhasznalo_id = ?
         ORDER BY e.letrehozva DESC`,
        [felhasznaloId]
      );
      return res.json(sorok);
    } catch (err) {
      console.error("Saját építési napló lekérdezési hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba az építési naplók lekérdezése során." });
    }
  });

  router.post("/api/epitesinaplo", authMiddleware, async (req, res) => {
    try {
      const felhasznaloId = req.felhasznalo.id;
      const { makett_id, cim, leiras, kep_url } = req.body;

      const makettId = Number(makett_id);
      if (!Number.isFinite(makettId)) return res.status(400).json({ uzenet: "Érvénytelen makett azonosító." });
      if (!cim || !leiras) return res.status(400).json({ uzenet: "Cím és leírás megadása kötelező." });

      const eredmeny = await adatbazisLekeres(
        `INSERT INTO epitesi_naplo (makett_id, felhasznalo_id, cim, leiras, kep_url)
         VALUES (?, ?, ?, ?, ?)`,
        [makettId, felhasznaloId, String(cim).trim(), String(leiras).trim(), kep_url || null]
      );

      const [uj] = await adatbazisLekeres(
        `SELECT e.id, e.makett_id, e.cim, e.leiras, e.kep_url, e.letrehozva,
                m.nev AS makett_nev, m.gyarto, m.skala,
                f.felhasznalo_nev
         FROM epitesi_naplo e
         JOIN makett m ON m.id = e.makett_id
         JOIN felhasznalo f ON f.id = e.felhasznalo_id
         WHERE e.id = ?`,
        [eredmeny.insertId]
      );
      return res.status(201).json(uj);
    } catch (err) {
      console.error("Építési napló létrehozási hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba az építési napló létrehozása során." });
    }
  });

  return router;
}

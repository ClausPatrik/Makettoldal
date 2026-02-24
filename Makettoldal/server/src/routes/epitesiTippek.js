import express from "express";

export default function createEpitesiTippekRoutes(ctx) {
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

  function adminVagyTulajTippekNaplo(req, naplo) {
    const szerep = req.felhasznalo?.szerepkor_id;
    const admin = szerep === 2;
    const moderator = szerep === 3;
    const tulaj = Number(naplo?.letrehozo_felhasznalo_id) === Number(req.felhasznalo?.id);
    return admin || moderator || tulaj;
  }

  router.get("/api/epitesi-tippek/:naploId/blokkok", async (req, res) => {
    try {
      const naploId = Number(req.params.naploId);
      if (!Number.isFinite(naploId)) return res.status(400).json({ uzenet: "Érvénytelen napló azonosító." });

      const [naplo] = await adatbazisLekeres("SELECT * FROM epitesi_tippek_naplo WHERE id = ?", [naploId]);
      if (!naplo) return res.status(404).json({ uzenet: "A napló nem található." });

      const blokkok = await adatbazisLekeres(
        "SELECT * FROM epitesi_tippek_blokk WHERE naplo_id = ? ORDER BY sorrend ASC, id ASC",
        [naploId]
      );
      return res.json({ blokkok });
    } catch (err) {
      console.error("Építési tippek blokkok lekérdezési hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a blokkok lekérdezése során." });
    }
  });

  router.post("/api/epitesi-tippek/:naploId/blokkok", authMiddleware, async (req, res) => {
    try {
      const naploId = Number(req.params.naploId);
      if (!Number.isFinite(naploId)) return res.status(400).json({ uzenet: "Érvénytelen napló azonosító." });

      const { tipus, cim, tippek, sorrend } = req.body || {};
      if (!cim || !tippek) return res.status(400).json({ uzenet: "Cím és tippek megadása kötelező." });

      const [naplo] = await adatbazisLekeres("SELECT * FROM epitesi_tippek_naplo WHERE id = ?", [naploId]);
      if (!naplo) return res.status(404).json({ uzenet: "A napló nem található." });
      if (!adminVagyTulajTippekNaplo(req, naplo)) return res.status(403).json({ uzenet: "Nincs jogosultságod ehhez a naplóhoz." });

      const eredmeny = await adatbazisLekeres(
        "INSERT INTO epitesi_tippek_blokk (naplo_id, tipus, cim, tippek, sorrend) VALUES (?, ?, ?, ?, ?)",
        [
          naploId,
          String(tipus || "egyeb").trim(),
          String(cim).trim(),
          String(tippek).trim(),
          Number.isFinite(Number(sorrend)) ? Number(sorrend) : 0,
        ]
      );

      const [uj] = await adatbazisLekeres("SELECT * FROM epitesi_tippek_blokk WHERE id = ?", [eredmeny.insertId]);
      return res.status(201).json(uj);
    } catch (err) {
      console.error("Építési tippek blokk létrehozási hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a blokk létrehozása során." });
    }
  });

  router.put("/api/epitesi-tippek-blokk/:blokkId", authMiddleware, async (req, res) => {
    try {
      const blokkId = Number(req.params.blokkId);
      if (!Number.isFinite(blokkId)) return res.status(400).json({ uzenet: "Érvénytelen blokk azonosító." });

      const { tipus, cim, tippek, sorrend } = req.body || {};
      const [blokk] = await adatbazisLekeres("SELECT * FROM epitesi_tippek_blokk WHERE id = ?", [blokkId]);
      if (!blokk) return res.status(404).json({ uzenet: "A blokk nem található." });

      const [naplo] = await adatbazisLekeres("SELECT * FROM epitesi_tippek_naplo WHERE id = ?", [blokk.naplo_id]);
      if (!naplo) return res.status(404).json({ uzenet: "A napló nem található." });
      if (!adminVagyTulajTippekNaplo(req, naplo)) return res.status(403).json({ uzenet: "Nincs jogosultságod ehhez a naplóhoz." });

      await adatbazisLekeres(
        "UPDATE epitesi_tippek_blokk SET tipus = ?, cim = ?, tippek = ?, sorrend = ? WHERE id = ?",
        [
          String(tipus || blokk.tipus).trim(),
          String(cim || blokk.cim).trim(),
          String(tippek || blokk.tippek).trim(),
          Number.isFinite(Number(sorrend)) ? Number(sorrend) : blokk.sorrend,
          blokkId,
        ]
      );

      const [uj] = await adatbazisLekeres("SELECT * FROM epitesi_tippek_blokk WHERE id = ?", [blokkId]);
      return res.json(uj);
    } catch (err) {
      console.error("Építési tippek blokk módosítási hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a blokk módosítása során." });
    }
  });

  router.delete("/api/epitesi-tippek-blokk/:blokkId", authMiddleware, async (req, res) => {
    try {
      const blokkId = Number(req.params.blokkId);
      if (!Number.isFinite(blokkId)) return res.status(400).json({ uzenet: "Érvénytelen blokk azonosító." });

      const [blokk] = await adatbazisLekeres("SELECT * FROM epitesi_tippek_blokk WHERE id = ?", [blokkId]);
      if (!blokk) return res.status(404).json({ uzenet: "A blokk nem található." });

      const [naplo] = await adatbazisLekeres("SELECT * FROM epitesi_tippek_naplo WHERE id = ?", [blokk.naplo_id]);
      if (!naplo) return res.status(404).json({ uzenet: "A napló nem található." });
      if (!adminVagyTulajTippekNaplo(req, naplo)) return res.status(403).json({ uzenet: "Nincs jogosultságod ehhez a naplóhoz." });

      await adatbazisLekeres("DELETE FROM epitesi_tippek_blokk WHERE id = ?", [blokkId]);
      return res.json({ uzenet: "Blokk törölve." });
    } catch (err) {
      console.error("Építési tippek blokk törlési hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a blokk törlése során." });
    }
  });

  return router;
}

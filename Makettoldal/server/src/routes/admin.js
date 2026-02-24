import express from "express";

export default function createAdminRoutes(ctx) {
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

  router.get("/api/admin/makett-javaslatok", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const sorok = await adatbazisLekeres(
        `SELECT m.*, f.felhasznalo_nev AS bekuldo_nev, f.email AS bekuldo_email
         FROM makett m
         LEFT JOIN felhasznalo f ON f.id = m.bekuldo_felhasznalo_id
         WHERE m.allapot = 'varakozik'
         ORDER BY m.bekuldve DESC`
      );
      return res.json(sorok);
    } catch (err) {
      console.error("Admin makett javaslatok hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba az admin listánál." });
    }
  });

  router.post("/api/admin/makett-javaslatok/:id/jovahagy", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ uzenet: "Érvénytelen azonosító." });

      const eredmeny = await adatbazisLekeres(
        `UPDATE makett
         SET allapot='jovahagyva', elbiralta_admin_id=?, elbiralva=NOW(), elutasitas_ok=NULL
         WHERE id=? AND allapot='varakozik'`,
        [req.felhasznalo.id, id]
      );
      if (!eredmeny.affectedRows) return res.status(404).json({ uzenet: "Nem található függőben lévő javaslat ezzel az ID-vel." });

      await naplozAktivitas({
        felhasznalo_id: req.felhasznalo.id,
        tipus: "ADMIN_MAKETT_JOVAHAGY",
        cel_tipus: "makett",
        cel_id: id,
        ip: req.ip,
      });

      return res.json({ uzenet: "Jóváhagyva." });
    } catch (err) {
      console.error("Makett jóváhagyás hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a jóváhagyás során." });
    }
  });

  router.post("/api/admin/makett-javaslatok/:id/elutasit", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ uzenet: "Érvénytelen azonosító." });

      const ok = String(req.body?.ok || "").trim();
      const eredmeny = await adatbazisLekeres(
        `UPDATE makett
         SET allapot='elutasitva', elbiralta_admin_id=?, elbiralva=NOW(), elutasitas_ok=?
         WHERE id=? AND allapot='varakozik'`,
        [req.felhasznalo.id, ok || null, id]
      );
      if (!eredmeny.affectedRows) return res.status(404).json({ uzenet: "Nem található függőben lévő javaslat ezzel az ID-vel." });

      await naplozAktivitas({
        felhasznalo_id: req.felhasznalo.id,
        tipus: "ADMIN_MAKETT_ELUTASIT",
        cel_tipus: "makett",
        cel_id: id,
        szoveg: ok || null,
        ip: req.ip,
      });

      return res.json({ uzenet: "Elutasítva." });
    } catch (err) {
      console.error("Makett elutasítás hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba az elutasítás során." });
    }
  });

  router.get("/api/admin/felhasznalok", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const sorok = await adatbazisLekeres(
        `SELECT id, felhasznalo_nev, email, szerepkor_id, profil_kep_url,
                csatlakozas_datum,
                tiltva, tilt_eddig, tilt_ok, tiltva_ekkor, tiltva_admin_id
         FROM felhasznalo
         ORDER BY id ASC`
      );
      return res.json(sorok);
    } catch (err) {
      console.error("Admin felhasználók lista hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a felhasználók listázásánál." });
    }
  });

  router.get("/api/admin/felhasznalok/:id/aktivitas", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const celId = Number(req.params.id);
      const limit = Math.min(Number(req.query.limit || 50), 200);
      const offset = Math.max(Number(req.query.offset || 0), 0);

      const sorok = await adatbazisLekeres(
        `SELECT id, felhasznalo_id, tipus, cel_tipus, cel_id, szoveg, meta_json, ip, letrehozva
         FROM felhasznalo_aktivitas
         WHERE felhasznalo_id = ?
         ORDER BY letrehozva DESC
         LIMIT ? OFFSET ?`,
        [celId, limit, offset]
      );

      return res.json(sorok);
    } catch (err) {
      console.error("Aktivitás lekérés hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba az aktivitás lekérésénél." });
    }
  });

  router.put("/api/admin/felhasznalok/:id/tiltas", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const celId = Number(req.params.id);
      if (!Number.isFinite(celId)) return res.status(400).json({ uzenet: "Érvénytelen felhasználó ID." });

      if (celId === req.felhasznalo.id) {
        return res.status(400).json({ uzenet: "Saját magadat nem tilthatod ki." });
      }

      const { tiltva, tilt_eddig, tilt_ok } = req.body || {};
      const ervenyes = ["nincs", "ideiglenes", "vegleges"];
      if (!ervenyes.includes(tiltva)) {
        return res.status(400).json({ uzenet: "Érvénytelen tiltás típus." });
      }

      const cel = await adatbazisLekeres("SELECT id, szerepkor_id FROM felhasznalo WHERE id=?", [celId]);
      if (!cel.length) return res.status(404).json({ uzenet: "Felhasználó nem található." });
      if (cel[0].szerepkor_id === 2) return res.status(400).json({ uzenet: "Admin felhasználót nem tilthatsz." });

      if (tiltva === "nincs") {
        await adatbazisLekeres(
          `UPDATE felhasznalo
           SET tiltva='nincs', tilt_eddig=NULL, tilt_ok=NULL, tiltva_ekkor=NULL, tiltva_admin_id=NULL
           WHERE id=?`,
          [celId]
        );

        await naplozAktivitas({
          felhasznalo_id: req.felhasznalo.id,
          tipus: "ADMIN_TILTAS",
          cel_tipus: "felhasznalo",
          cel_id: celId,
          szoveg: "nincs",
          meta: { tilt_ok: (tilt_ok || "").trim() || null, tilt_eddig: tilt_eddig || null },
          ip: req.ip,
        });

        return res.json({ uzenet: "Tiltás feloldva." });
      }

      if (tiltva === "ideiglenes") {
        if (!tilt_eddig) return res.status(400).json({ uzenet: "Ideiglenes tiltáshoz kell tilt_eddig." });
        const eddig = new Date(tilt_eddig);
        if (isNaN(eddig.getTime())) return res.status(400).json({ uzenet: "Hibás dátum (tilt_eddig)." });

        await adatbazisLekeres(
          `UPDATE felhasznalo
           SET tiltva='ideiglenes', tilt_eddig=?, tilt_ok=?, tiltva_ekkor=NOW(), tiltva_admin_id=?
           WHERE id=?`,
          [eddig, (tilt_ok || "").trim() || null, req.felhasznalo.id, celId]
        );

        await naplozAktivitas({
          felhasznalo_id: req.felhasznalo.id,
          tipus: "ADMIN_TILTAS",
          cel_tipus: "felhasznalo",
          cel_id: celId,
          szoveg: `ideiglenes (${tilt_eddig})`,
          meta: { tilt_ok: (tilt_ok || "").trim() || null },
          ip: req.ip,
        });

        return res.json({ uzenet: "Ideiglenes tiltás beállítva." });
      }

      // vegleges
      await adatbazisLekeres(
        `UPDATE felhasznalo
         SET tiltva='vegleges', tilt_eddig=NULL, tilt_ok=?, tiltva_ekkor=NOW(), tiltva_admin_id=?
         WHERE id=?`,
        [(tilt_ok || "").trim() || null, req.felhasznalo.id, celId]
      );

      await naplozAktivitas({
        felhasznalo_id: req.felhasznalo.id,
        tipus: "ADMIN_TILTAS",
        cel_tipus: "felhasznalo",
        cel_id: celId,
        szoveg: "vegleges",
        meta: { tilt_ok: (tilt_ok || "").trim() || null },
        ip: req.ip,
      });

      return res.json({ uzenet: "Végleges tiltás beállítva." });
    } catch (err) {
      console.error("Admin tiltás hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a tiltás mentésekor." });
    }
  });

  router.put("/api/admin/felhasznalok/:id/szerepkor", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const celId = Number(req.params.id);
      if (!Number.isFinite(celId)) return res.status(400).json({ uzenet: "Érvénytelen felhasználó ID." });

      if (celId === req.felhasznalo.id) {
        return res.status(400).json({ uzenet: "Saját magad szerepkörét itt ne módosítsd." });
      }

      const uj = Number(req.body?.szerepkor_id);
      if (![1, 3].includes(uj)) {
        return res.status(400).json({ uzenet: "Csak felhasználó/moderátor állítható." });
      }

      const cel = await adatbazisLekeres("SELECT id, szerepkor_id FROM felhasznalo WHERE id=?", [celId]);
      if (!cel.length) return res.status(404).json({ uzenet: "Felhasználó nem található." });
      if (cel[0].szerepkor_id === 2) return res.status(400).json({ uzenet: "Admin szerepkört itt nem módosítunk." });

      await adatbazisLekeres("UPDATE felhasznalo SET szerepkor_id=? WHERE id=?", [uj, celId]);

      await naplozAktivitas({
        felhasznalo_id: req.felhasznalo.id,
        tipus: "ADMIN_SZEREPKOR",
        cel_tipus: "felhasznalo",
        cel_id: celId,
        szoveg: `szerepkor_id -> ${uj}`,
        ip: req.ip,
      });

      return res.json({ uzenet: "Szerepkör frissítve." });
    } catch (err) {
      console.error("Admin szerepkör hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a szerepkör mentésekor." });
    }
  });

  return router;
}

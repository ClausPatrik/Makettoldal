import express from "express";

export default function createMakettekRoutes(ctx) {
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

  router.get("/api/makettek", async (req, res) => {
    try {
      const { kategoria, skala, q, minPont, rendezes } = req.query;

      let sql = `
        SELECT
          m.*,
          AVG(v.ertekeles) AS atlag_ertekeles,
          COUNT(v.id) AS velemeny_db
        FROM makett m
        LEFT JOIN velemeny v ON v.makett_id = m.id
      `;

      const feltetelek = ["m.allapot = 'jovahagyva'"];
      const parameterek = [];

      if (kategoria && kategoria !== "osszes") {
        feltetelek.push("m.kategoria = ?");
        parameterek.push(kategoria);
      }

      if (skala && skala !== "osszes") {
        feltetelek.push("m.skala = ?");
        parameterek.push(skala);
      }

      if (q && String(q).trim() !== "") {
        feltetelek.push("(m.nev LIKE ? OR m.gyarto LIKE ?)");
        const like = `%${String(q).trim()}%`;
        parameterek.push(like, like);
      }

      if (feltetelek.length) sql += " WHERE " + feltetelek.join(" AND ");
      sql += " GROUP BY m.id";

      if (minPont) {
        sql += " HAVING COALESCE(AVG(v.ertekeles), 0) >= ?";
        parameterek.push(Number(minPont));
      }

      if (rendezes === "ev") sql += " ORDER BY m.megjelenes_eve DESC";
      else if (rendezes === "ertekeles") sql += " ORDER BY atlag_ertekeles DESC";
      else sql += " ORDER BY m.nev ASC";

      const makettek = await adatbazisLekeres(sql, parameterek);
      return res.json(makettek);
    } catch (err) {
      console.error("Makettek lekérdezési hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a makettek lekérdezése során." });
    }
  });

  router.post("/api/makettek", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const {
        nev,
        gyarto,
        kategoria,
        skala,
        nehezseg,
        megjelenes_eve,
        kep_url,
        leiras,
        vasarlasi_link,
      } = req.body;

      if (!nev || !gyarto || !kategoria || !skala) {
        return res.status(400).json({ uzenet: "Név, gyártó, kategória és skála kötelező." });
      }

      const nehezsegSzam = Number(nehezseg);
      const evSzam = Number(megjelenes_eve);

      if (!Number.isFinite(nehezsegSzam) || nehezsegSzam < 1 || nehezsegSzam > 5) {
        return res.status(400).json({ uzenet: "A nehézség 1 és 5 közötti szám legyen." });
      }
      if (!Number.isFinite(evSzam) || evSzam < 1900 || evSzam > 2100) {
        return res.status(400).json({ uzenet: "A megjelenés éve 1900 és 2100 közé essen." });
      }

      const eredmeny = await adatbazisLekeres(
        `INSERT INTO makett
          (nev, gyarto, kategoria, skala, nehezseg, megjelenes_eve, kep_url, leiras, vasarlasi_link,
           allapot, elbiralta_admin_id, elbiralva)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'jovahagyva', ?, NOW())`,
        [
          String(nev).trim(),
          String(gyarto).trim(),
          String(kategoria).trim(),
          String(skala).trim(),
          nehezsegSzam,
          evSzam,
          kep_url?.trim?.() ? kep_url.trim() : (kep_url || null),
          leiras?.trim?.() ? leiras.trim() : (leiras || null),
          vasarlasi_link?.trim?.() ? vasarlasi_link.trim() : (vasarlasi_link || null),
          req.felhasznalo.id,
        ]
      );

      const [uj] = await adatbazisLekeres("SELECT * FROM makett WHERE id = ?", [eredmeny.insertId]);
      return res.status(201).json(uj);
    } catch (err) {
      console.error("Makett létrehozási hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a makett létrehozása során." });
    }
  });

  router.put("/api/makettek/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const makettId = Number(req.params.id);
      if (!Number.isFinite(makettId)) return res.status(400).json({ uzenet: "Érvénytelen makett ID." });

      const {
        nev,
        gyarto,
        kategoria,
        skala,
        nehezseg,
        megjelenes_eve,
        kep_url,
        leiras,
        vasarlasi_link,
      } = req.body;

      if (!nev || !gyarto || !kategoria || !skala) {
        return res.status(400).json({ uzenet: "Név, gyártó, kategória és skála kötelező." });
      }

      const nehezsegSzam = Number(nehezseg);
      const evSzam = Number(megjelenes_eve);

      if (!Number.isFinite(nehezsegSzam) || nehezsegSzam < 1 || nehezsegSzam > 5) {
        return res.status(400).json({ uzenet: "A nehézség 1 és 5 közötti szám legyen." });
      }
      if (!Number.isFinite(evSzam) || evSzam < 1900 || evSzam > 2100) {
        return res.status(400).json({ uzenet: "A megjelenés éve 1900 és 2100 közé essen." });
      }

      await adatbazisLekeres(
        `UPDATE makett
         SET nev = ?, gyarto = ?, kategoria = ?, skala = ?, nehezseg = ?, megjelenes_eve = ?,
             kep_url = ?, leiras = ?, vasarlasi_link = ?
         WHERE id = ?`,
        [
          String(nev).trim(),
          String(gyarto).trim(),
          String(kategoria).trim(),
          String(skala).trim(),
          nehezsegSzam,
          evSzam,
          kep_url?.trim?.() ? kep_url.trim() : (kep_url || null),
          leiras?.trim?.() ? leiras.trim() : (leiras || null),
          vasarlasi_link?.trim?.() ? vasarlasi_link.trim() : (vasarlasi_link || null),
          makettId,
        ]
      );

      const [uj] = await adatbazisLekeres("SELECT * FROM makett WHERE id = ?", [makettId]);
      return res.json(uj);
    } catch (err) {
      console.error("Makett módosítási hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a makett módosítása során." });
    }
  });

  router.delete("/api/makettek/:id", authMiddleware, async (req, res) => {
    try {
      const makettId = Number(req.params.id);
      if (!Number.isFinite(makettId)) return res.status(400).json({ uzenet: "Érvénytelen makett ID." });

      const [makett] = await adatbazisLekeres(
        "SELECT id, bekuldo_felhasznalo_id FROM makett WHERE id = ?",
        [makettId]
      );
      if (!makett) return res.status(404).json({ uzenet: "Nincs ilyen makett." });

      const admin = req.felhasznalo.szerepkor_id === 2;
      const tulaj =
        makett.bekuldo_felhasznalo_id !== null &&
        Number(makett.bekuldo_felhasznalo_id) === Number(req.felhasznalo.id);

      if (!admin && !tulaj) return res.status(403).json({ uzenet: "Nincs jogosultságod törölni." });

      await adatbazisLekeres("DELETE FROM makett WHERE id = ?", [makettId]);
      return res.json({ uzenet: "Makett törölve." });
    } catch (err) {
      console.error("Makett törlés hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba." });
    }
  });

  router.post("/api/makett-javaslatok", authMiddleware, async (req, res) => {
    try {
      const { nev, gyarto, kategoria, skala, nehezseg, megjelenes_eve, kep_url, leiras, vasarlasi_link } = req.body;

      if (!nev || !gyarto || !kategoria || !skala) {
        return res.status(400).json({ uzenet: "Hiányzó kötelező adatok." });
      }

      if (nev.length > 50) {
        return res.status(400).json({
          uzenet: "A makett neve legfeljebb 50 karakter lehet.",
        });
      }
      const nehezsegSzam = Number(nehezseg);
      const evSzam = Number(megjelenes_eve);
      if (Number.isNaN(nehezsegSzam) || nehezsegSzam < 1 || nehezsegSzam > 5) {
        return res.status(400).json({ uzenet: "Érvénytelen nehézség." });
      }
      if (Number.isNaN(evSzam) || evSzam < 1900 || evSzam > 2100) {
        return res.status(400).json({ uzenet: "Érvénytelen megjelenési év." });
      }

      await adatbazisLekeres(
        `INSERT INTO makett
          (nev, gyarto, kategoria, skala, nehezseg, megjelenes_eve,
           kep_url, leiras, vasarlasi_link,
           allapot, bekuldo_felhasznalo_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'varakozik', ?)`,
        [
          String(nev).trim(),
          String(gyarto).trim(),
          String(kategoria).trim(),
          String(skala).trim(),
          nehezsegSzam,
          evSzam,
          kep_url?.trim?.() ? kep_url.trim() : (kep_url || null),
          leiras?.trim?.() ? leiras.trim() : (leiras || null),
          vasarlasi_link?.trim?.() ? vasarlasi_link.trim() : (vasarlasi_link || null),
          req.felhasznalo.id,
        ]
      );

      return res.status(201).json({ uzenet: "Makett beküldve jóváhagyásra." });
    } catch (err) {
      console.error("Makett beküldési hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba történt." });
    }
  });

  router.get("/api/sajat/makett-javaslatok", authMiddleware, async (req, res) => {
    try {
      const sorok = await adatbazisLekeres(
        `SELECT id, nev, gyarto, kategoria, skala, nehezseg, megjelenes_eve, kep_url,
                leiras, vasarlasi_link,
                allapot, bekuldve, elbiralva, elutasitas_ok
         FROM makett
         WHERE bekuldo_felhasznalo_id = ?
         ORDER BY bekuldve DESC`,
        [req.felhasznalo.id]
      );
      return res.json(sorok);
    } catch (err) {
      console.error("Saját makett javaslatok hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a saját beküldések lekérdezése során." });
    }
  });

  router.get("/api/sajat/makettek", authMiddleware, async (req, res) => {
    try {
      const sorok = await adatbazisLekeres(
        `SELECT id, nev, gyarto, kategoria, skala, nehezseg, megjelenes_eve,
                kep_url, leiras, vasarlasi_link,
                allapot, bekuldve, elbiralva, elutasitas_ok
         FROM makett
         WHERE bekuldo_felhasznalo_id = ?
         ORDER BY bekuldve DESC, id DESC`,
        [req.felhasznalo.id]
      );
      return res.json(sorok);
    } catch (err) {
      console.error("Saját makettek hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a saját makettek lekérdezése során." });
    }
  });

  router.put("/api/sajat/makettek/:id", authMiddleware, async (req, res) => {
    try {
      const makettId = Number(req.params.id);
      if (!Number.isFinite(makettId)) return res.status(400).json({ uzenet: "Érvénytelen makett ID." });

      // tulaj ellenőrzés
      const [mk] = await adatbazisLekeres(
        `SELECT id, bekuldo_felhasznalo_id
         FROM makett
         WHERE id = ?`,
        [makettId]
      );
      if (!mk) return res.status(404).json({ uzenet: "Nincs ilyen makett." });

      const tulaj =
        mk.bekuldo_felhasznalo_id !== null &&
        Number(mk.bekuldo_felhasznalo_id) === Number(req.felhasznalo.id);
      if (!tulaj) return res.status(403).json({ uzenet: "Nincs jogosultságod módosítani ezt a makettet." });

      const {
        nev,
        gyarto,
        kategoria,
        skala,
        nehezseg,
        megjelenes_eve,
        kep_url,
        leiras,
        vasarlasi_link,
      } = req.body;

      if (!nev || !gyarto || !kategoria || !skala) {
        return res.status(400).json({ uzenet: "Név, gyártó, kategória és skála kötelező." });
      }

      if (String(nev).length > 50) {
        return res.status(400).json({ uzenet: "A makett neve legfeljebb 50 karakter lehet." });
      }

      const nehezsegSzam = Number(nehezseg);
      const evSzam = Number(megjelenes_eve);

      if (!Number.isFinite(nehezsegSzam) || nehezsegSzam < 1 || nehezsegSzam > 5) {
        return res.status(400).json({ uzenet: "A nehézség 1 és 5 közötti szám legyen." });
      }
      if (!Number.isFinite(evSzam) || evSzam < 1900 || evSzam > 2100) {
        return res.status(400).json({ uzenet: "A megjelenés éve 1900 és 2100 közé essen." });
      }

      await adatbazisLekeres(
        `UPDATE makett
         SET nev = ?, gyarto = ?, kategoria = ?, skala = ?, nehezseg = ?, megjelenes_eve = ?,
             kep_url = ?, leiras = ?, vasarlasi_link = ?,
             allapot = 'varakozik',
             elbiralta_admin_id = NULL,
             elbiralva = NULL,
             elutasitas_ok = NULL,
             bekuldve = NOW()
         WHERE id = ?`,
        [
          String(nev).trim(),
          String(gyarto).trim(),
          String(kategoria).trim(),
          String(skala).trim(),
          nehezsegSzam,
          evSzam,
          kep_url?.trim?.() ? kep_url.trim() : (kep_url || null),
          leiras?.trim?.() ? leiras.trim() : (leiras || null),
          vasarlasi_link?.trim?.() ? vasarlasi_link.trim() : (vasarlasi_link || null),
          makettId,
        ]
      );

      const [uj] = await adatbazisLekeres(
        `SELECT id, nev, gyarto, kategoria, skala, nehezseg, megjelenes_eve,
                kep_url, leiras, vasarlasi_link,
                allapot, bekuldve, elbiralva, elutasitas_ok
         FROM makett WHERE id = ?`,
        [makettId]
      );

      return res.json({
        uzenet: "Makett módosítva. A módosítások miatt újra jóvá kell hagyatni (jóváhagyásra visszakerült).",
        makett: uj,
      });
    } catch (err) {
      console.error("Saját makett módosítás hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a makett módosítása során." });
    }
  });

  router.get("/api/makettek/:id/velemenyek", async (req, res) => {
    try {
      const makettId = Number(req.params.id);
      const velemenyek = await adatbazisLekeres(
        `SELECT v.id, v.makett_id, v.felhasznalo_id, v.szoveg, v.ertekeles, v.letrehozva,
                f.felhasznalo_nev
         FROM velemeny v
         JOIN felhasznalo f ON f.id = v.felhasznalo_id
         WHERE v.makett_id = ?
         ORDER BY v.letrehozva DESC`,
        [makettId]
      );
      return res.json(velemenyek);
    } catch (err) {
      console.error("Makett vélemények lekérdezési hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a makett véleményeinek lekérdezése során." });
    }
  });

  router.post("/api/makettek/:id/velemenyek", authMiddleware, async (req, res) => {
    try {
      const makettId = Number(req.params.id);
      const { szoveg, ertekeles } = req.body;
      const felhasznaloId = req.felhasznalo.id;

      if (!szoveg || ertekeles === undefined) return res.status(400).json({ uzenet: "Hiányzó adatok." });
      const ertek = Number(ertekeles);
      if (!(ertek >= 1 && ertek <= 5)) return res.status(400).json({ uzenet: "Az értékelés 1 és 5 között lehet." });

      const eredmeny = await adatbazisLekeres(
        `INSERT INTO velemeny (makett_id, felhasznalo_id, szoveg, ertekeles)
         VALUES (?, ?, ?, ?)`,
        [makettId, felhasznaloId, String(szoveg).trim(), ertek]
      );

      const [uj] = await adatbazisLekeres(
        `SELECT v.id, v.makett_id, v.felhasznalo_id, v.szoveg, v.ertekeles, v.letrehozva,
                f.felhasznalo_nev
         FROM velemeny v
         JOIN felhasznalo f ON f.id = v.felhasznalo_id
         WHERE v.id = ?`,
        [eredmeny.insertId]
      );

      return res.status(201).json(uj);
    } catch (err) {
      console.error("Vélemény mentési hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba a vélemény mentése során." });
    }
  });

  router.get("/api/makettek/:makettId/epitesi-tippek", async (req, res) => {
    try {
      const makettId = Number(req.params.makettId);
      if (!Number.isFinite(makettId)) return res.status(400).json({ uzenet: "Érvénytelen makett azonosító." });

      // Több napló is lehet egy maketthez, ezért listát adunk vissza.
      const naplok = await adatbazisLekeres(
        "SELECT * FROM epitesi_tippek_naplo WHERE makett_id = ? ORDER BY id DESC",
        [makettId]
      );

      // Visszafelé kompatibilitás: ha nincs napló, régi forma szerint is értelmezhető
      if (!naplok.length) return res.json({ naplok: [] });

      return res.json({ naplok });
    } catch (err) {
      console.error("Építési tippek lekérdezési hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba az építési tippek lekérdezése során." });
    }
  });

  router.post("/api/makettek/:makettId/epitesi-tippek", authMiddleware, async (req, res) => {
    try {
      const makettId = Number(req.params.makettId);
      if (!Number.isFinite(makettId)) return res.status(400).json({ uzenet: "Érvénytelen makett azonosító." });

      const cim = String(req.body?.cim || "Építési tippek").trim();

      const eredmeny = await adatbazisLekeres(
        "INSERT INTO epitesi_tippek_naplo (makett_id, letrehozo_felhasznalo_id, cim) VALUES (?, ?, ?)",
        [makettId, req.felhasznalo.id, cim]
      );

      const [uj] = await adatbazisLekeres("SELECT * FROM epitesi_tippek_naplo WHERE id = ?", [eredmeny.insertId]);
      return res.status(201).json(uj);
    } catch (err) {
      console.error("Építési tippek napló létrehozási hiba:", err?.message || err);
      return res.status(500).json({ uzenet: "Szerver hiba az építési tippek napló létrehozása során." });
    }
  });

  return router;
}

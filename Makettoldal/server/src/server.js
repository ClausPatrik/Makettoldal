import "dotenv/config";
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";

/**
 * MakettMester – backend (Express + MySQL)
 * - Auth (JWT)
 * - Admin/moderáció (tiltás, szerepkör)
 * - Makettek (publikus lista + admin CRUD + felhasználói beküldés/jóváhagyás)
 * - Vélemények, Kedvencek
 * - Fórum (témák + üzenetek) + szerkesztés/törlés jogosultsággal
 * - Építési napló + Építési tippek (1 napló / makett + blokkok)
 * - Profil frissítés + profilkép feltöltés
 * - Üzenetek a fejlesztőnek + opcionális email értesítés
 * - AI chat endpoint (OpenAI) külön rate limit-tel
 */

// -------------------- ALAPOK --------------------
const app = express();

const PORT = Number(process.env.PORT || 3001);
const JWT_TITOK = process.env.JWT_TITOK || "nagyon_titkos_jwt_kulcs";

// -------------------- UPLOADS --------------------
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = req.felhasznalo?.id || "ismeretlen";
    cb(null, `profil_${id}_${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// -------------------- ADATBÁZIS --------------------
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT || 3307);
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "makett";

let adatbazisPool = null;

async function adatbazisLekeres(sql, parameterek = []) {
  if (!adatbazisPool) throw new Error("Nincs adatbázis pool inicializálva.");
  const [sorok] = await adatbazisPool.query(sql, parameterek);
  return sorok;
}

// -------------------- JWT / AUTH --------------------
function generalToken(felhasznalo) {
  const payload = {
    id: felhasznalo.id,
    felhasznalo_nev: felhasznalo.felhasznalo_nev,
    email: felhasznalo.email,
    szerepkor_id: felhasznalo.szerepkor_id,
    profil_kep_url: felhasznalo.profil_kep_url || null,
  };
  return jwt.sign(payload, JWT_TITOK, { expiresIn: "7d" });
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ uzenet: "Hiányzó vagy érvénytelen token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_TITOK);

    // friss adatok a DB-ből (szerepkör + tiltás)
    const sorok = await adatbazisLekeres(
      `SELECT id, felhasznalo_nev, email, szerepkor_id, profil_kep_url,
              tiltva, tilt_eddig, tilt_ok
       FROM felhasznalo
       WHERE id = ?`,
      [decoded.id]
    );

    if (!sorok.length) {
      return res.status(401).json({ uzenet: "Felhasználó nem található." });
    }

    const user = sorok[0];

    // tiltás ellenőrzés + auto feloldás ideiglenesnél
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

    req.felhasznalo = {
      id: user.id,
      felhasznalo_nev: user.felhasznalo_nev,
      email: user.email,
      szerepkor_id: user.szerepkor_id,
      profil_kep_url: user.profil_kep_url || null,
    };

    next();
  } catch (err) {
    console.error("JWT hiba:", err?.message || err);
    return res.status(401).json({ uzenet: "Érvénytelen vagy lejárt token" });
  }
}

function adminMiddleware(req, res, next) {
  if (req.felhasznalo?.szerepkor_id !== 2) {
    return res.status(403).json({ uzenet: "Admin jogosultság szükséges." });
  }
  next();
}

// -------------------- CORS / JSON / STATIC --------------------
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// -------------------- NAPLÓZÁS (admin aktivitás) --------------------
async function naplozAktivitas({
  felhasznalo_id,
  tipus,
  cel_tipus = null,
  cel_id = null,
  szoveg = null,
  meta = null,
  ip = null,
}) {
  try {
    await adatbazisLekeres(
      `INSERT INTO felhasznalo_aktivitas (felhasznalo_id, tipus, cel_tipus, cel_id, szoveg, meta_json, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        felhasznalo_id,
        tipus,
        cel_tipus,
        cel_id,
        szoveg,
        meta ? JSON.stringify(meta) : null,
        ip || null,
      ]
    );
  } catch (e) {
    console.error("naplozAktivitas hiba:", e?.message || e);
  }
}

// -------------------- RATE LIMIT --------------------
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { uzenet: "Túl sok AI kérés. Próbáld meg később." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { uzenet: "Túl sok próbálkozás. Próbáld meg később." },
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// -------------------- AI --------------------
app.post("/api/ai/chat", aiLimiter, async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ uzenet: "Nincs OPENAI_API_KEY a server/.env-ben." });
    }

    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ uzenet: "Hibás kérés: messages hiányzik." });
    }

    const fetchFn = globalThis.fetch || (await import("node-fetch")).default;
    const r = await fetchFn("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini",
        messages: messages.map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : String(m.content ?? ""),
        })),
        max_tokens: 400,
      }),
    });

    const raw = await r.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { uzenet: raw };
    }

    if (!r.ok) {
      return res.status(500).json({ uzenet: data?.error?.message || "AI hiba" });
    }

    const reply = data?.choices?.[0]?.message?.content || "";
    return res.json({ reply });
  } catch (err) {
    console.error("AI hiba:", err?.message || err);
    return res.status(500).json({ uzenet: err?.message || "AI szerver hiba" });
  }
});

// -------------------- AUTH --------------------
app.post("/api/auth/register", async (req, res) => {
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

app.post("/api/auth/login", async (req, res) => {
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

// -------------------- PROFIL --------------------
app.put("/api/profil", authMiddleware, async (req, res) => {
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

app.post("/api/profil/feltoltes", authMiddleware, upload.single("profilkep"), async (req, res) => {
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

// -------------------- MAKETTEK (publikus lista + admin CRUD) --------------------
app.get("/api/makettek", async (req, res) => {
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

// Admin: létrehozás
app.post("/api/makettek", authMiddleware, adminMiddleware, async (req, res) => {
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

// Admin: módosítás
app.put("/api/makettek/:id", authMiddleware, adminMiddleware, async (req, res) => {
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

// Törlés (admin vagy beküldő)
app.delete("/api/makettek/:id", authMiddleware, async (req, res) => {
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

// -------------------- MAKETT BEKÜLDÉS + JÓVÁHAGYÁS --------------------
app.post("/api/makett-javaslatok", authMiddleware, async (req, res) => {
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

app.get("/api/sajat/makett-javaslatok", authMiddleware, async (req, res) => {
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

app.get("/api/admin/makett-javaslatok", authMiddleware, adminMiddleware, async (req, res) => {
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

app.post("/api/admin/makett-javaslatok/:id/jovahagy", authMiddleware, adminMiddleware, async (req, res) => {
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

app.post("/api/admin/makett-javaslatok/:id/elutasit", authMiddleware, adminMiddleware, async (req, res) => {
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

// -------------------- ADMIN: FELHASZNÁLÓK (tiltás + moderátor) --------------------
app.get("/api/admin/felhasznalok", authMiddleware, adminMiddleware, async (req, res) => {
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

app.get("/api/admin/felhasznalok/:id/aktivitas", authMiddleware, adminMiddleware, async (req, res) => {
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

app.put("/api/admin/felhasznalok/:id/tiltas", authMiddleware, adminMiddleware, async (req, res) => {
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

app.put("/api/admin/felhasznalok/:id/szerepkor", authMiddleware, adminMiddleware, async (req, res) => {
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

// -------------------- VÉLEMÉNYEK --------------------
app.get("/api/velemenyek", async (req, res) => {
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

app.get("/api/makettek/:id/velemenyek", async (req, res) => {
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

app.get("/api/sajat/velemenyek", authMiddleware, async (req, res) => {
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

app.post("/api/makettek/:id/velemenyek", authMiddleware, async (req, res) => {
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

app.put("/api/velemenyek/:id", authMiddleware, async (req, res) => {
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

app.delete("/api/velemenyek/:id", authMiddleware, async (req, res) => {
  try {
    const velemenyId = Number(req.params.id);
    const userId = req.felhasznalo.id;
    const admin = req.felhasznalo.szerepkor_id === 2;

    const eredeti = await adatbazisLekeres("SELECT * FROM velemeny WHERE id = ?", [velemenyId]);
    if (!eredeti.length) return res.status(404).json({ uzenet: "A vélemény nem található." });
    if (!admin && eredeti[0].felhasznalo_id !== userId) {
      return res.status(403).json({ uzenet: "Nem törölheted más felhasználó véleményét." });
    }

    await adatbazisLekeres("DELETE FROM velemeny WHERE id = ?", [velemenyId]);
    return res.json({ uzenet: "Vélemény törölve." });
  } catch (err) {
    console.error("Vélemény törlési hiba:", err?.message || err);
    return res.status(500).json({ uzenet: "Szerver hiba a vélemény törlése során." });
  }
});

// -------------------- KEDVENCEK --------------------
app.get("/api/kedvencek", authMiddleware, async (req, res) => {
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

app.post("/api/kedvencek/:makettId", authMiddleware, async (req, res) => {
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

app.delete("/api/kedvencek/:makettId", authMiddleware, async (req, res) => {
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

// -------------------- ÉPÍTÉSI TIPPEK (napló + blokkok) --------------------
app.get("/api/makettek/:makettId/epitesi-tippek", async (req, res) => {
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

app.post("/api/makettek/:makettId/epitesi-tippek", authMiddleware, async (req, res) => {
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

function adminVagyTulajTippekNaplo(req, naplo) {
  const szerep = req.felhasznalo?.szerepkor_id;
  const admin = szerep === 2;
  const moderator = szerep === 3;
  const tulaj = Number(naplo?.letrehozo_felhasznalo_id) === Number(req.felhasznalo?.id);
  return admin || moderator || tulaj;
}

app.get("/api/epitesi-tippek/:naploId/blokkok", async (req, res) => {
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

app.post("/api/epitesi-tippek/:naploId/blokkok", authMiddleware, async (req, res) => {
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

app.put("/api/epitesi-tippek-blokk/:blokkId", authMiddleware, async (req, res) => {
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

app.delete("/api/epitesi-tippek-blokk/:blokkId", authMiddleware, async (req, res) => {
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

// -------------------- ÉPÍTÉSI NAPLÓK --------------------
app.get("/api/epitesinaplo", async (req, res) => {
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

app.get("/api/epitesinaplo/sajat", authMiddleware, async (req, res) => {
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

app.post("/api/epitesinaplo", authMiddleware, async (req, res) => {
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

// -------------------- ÜZENETEK (felhasználó -> fejlesztő) --------------------
app.post("/api/uzenetek", authMiddleware, async (req, res) => {
  try {
    const { targy, uzenet } = req.body;
    if (!targy || !uzenet) return res.status(400).json({ uzenet: "A tárgy és üzenet kötelező." });
    if (String(targy).length > 120) return res.status(400).json({ uzenet: "A tárgy max. 120 karakter." });

    await adatbazisLekeres(
      "INSERT INTO uzenetek (kuldo_felhasznalo_id, targy, uzenet) VALUES (?, ?, ?)",
      [req.felhasznalo.id, String(targy).trim(), String(uzenet).trim()]
    );

    if (process.env.MAIL_ENABLED === "true") {
      await kuldEmailErtesitesFejlesztonek({
        kuldoNev: req.felhasznalo.felhasznalo_nev,
        kuldoEmail: req.felhasznalo.email,
        targy: String(targy).trim(),
        uzenet: String(uzenet).trim(),
      });
    }

    return res.json({ uzenet: "Üzenet elküldve." });
  } catch (err) {
    console.error("Uzenet kuldes hiba:", err?.message || err);
    return res.status(500).json({ uzenet: "Szerver hiba." });
  }
});

app.get("/api/uzenetek", authMiddleware, async (req, res) => {
  try {
    const admin = req.felhasznalo?.szerepkor_id === 2;
    if (!admin) return res.status(403).json({ uzenet: "Nincs jogosultság." });

    const uzenetek = await adatbazisLekeres(
      `SELECT u.id, u.targy, u.uzenet, u.letrehozva, u.olvasva,
              f.felhasznalo_nev AS kuldo_nev
       FROM uzenetek u
       JOIN felhasznalo f ON f.id = u.kuldo_felhasznalo_id
       ORDER BY u.letrehozva DESC`
    );
    return res.json(uzenetek);
  } catch (err) {
    console.error("Uzenetek lekeres hiba:", err?.message || err);
    return res.status(500).json({ uzenet: "Szerver hiba." });
  }
});

app.patch("/api/uzenetek/:id/olvasva", authMiddleware, async (req, res) => {
  try {
    const admin = req.felhasznalo?.szerepkor_id === 2;
    if (!admin) return res.status(403).json({ uzenet: "Nincs jogosultság." });

    const id = Number(req.params.id);
    await adatbazisLekeres("UPDATE uzenetek SET olvasva = 1 WHERE id = ?", [id]);
    return res.json({ uzenet: "Olvasottra állítva." });
  } catch (err) {
    console.error("Olvasva update hiba:", err?.message || err);
    return res.status(500).json({ uzenet: "Szerver hiba." });
  }
});

async function kuldEmailErtesitesFejlesztonek({ kuldoNev, kuldoEmail, targy, uzenet }) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS || !process.env.MAIL_TO) return;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"MakettMester" <${process.env.MAIL_USER}>`,
    to: process.env.MAIL_TO,
    subject: `[MakettMester] ${targy}`,
    text:
      `Feladó: ${kuldoNev}\n` +
      `Email: ${kuldoEmail || "(nincs megadva)"}\n\n` +
      `Üzenet:\n${uzenet}\n`,
    replyTo: kuldoEmail || undefined,
  });
}

// -------------------- FÓRUM --------------------
app.get("/api/forum/temak", async (req, res) => {
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

app.post("/api/forum/temak", authMiddleware, async (req, res) => {
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

app.get("/api/forum/temak/:id/uzenetek", async (req, res) => {
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

app.post("/api/forum/temak/:id/uzenetek", authMiddleware, async (req, res) => {
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

// téma módosítás/törlés
app.put("/api/forum/temak/:id", authMiddleware, async (req, res) => {
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

app.delete("/api/forum/temak/:id", authMiddleware, async (req, res) => {
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

// hozzászólás módosítás/törlés
app.put("/api/forum/uzenetek/:id", authMiddleware, async (req, res) => {
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

app.delete("/api/forum/uzenetek/:id", authMiddleware, async (req, res) => {
  try {
    const uzenetId = Number(req.params.id);
    const userId = req.felhasznalo.id;
    const admin = req.felhasznalo.szerepkor_id === 2;

    const [uzenet] = await adatbazisLekeres("SELECT * FROM forum_uzenet WHERE id = ?", [uzenetId]);
    if (!uzenet) return res.status(404).json({ uzenet: "Hozzászólás nem található." });
    if (!admin && uzenet.felhasznalo_id !== userId) {
      return res.status(403).json({ uzenet: "Nincs jogosultságod a hozzászólás törléséhez." });
    }

    await adatbazisLekeres("DELETE FROM forum_uzenet WHERE id = ?", [uzenetId]);
    return res.json({ uzenet: "Hozzászólás törölve." });
  } catch (err) {
    console.error("Fórum üzenet törlés hiba:", err?.message || err);
    return res.status(500).json({ uzenet: "Szerver hiba." });
  }
});

// -------------------- GYÖKÉR --------------------
app.get("/", (req, res) => res.send("Makett API fut."));

// -------------------- DB INIT --------------------
async function inicializalAdatbazis() {
  // 1) DB létrehozás
  const bootstrapPool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 2,
  });

  await bootstrapPool.query(
    `CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_hungarian_ci`
  );
  await bootstrapPool.end();

  // 2) csatlakozás az adatbázishoz
  adatbazisPool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  await adatbazisPool.query(`
    CREATE TABLE IF NOT EXISTS szerepkor (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nev VARCHAR(50) NOT NULL UNIQUE
    )
  `);

  await adatbazisPool.query(`
    CREATE TABLE IF NOT EXISTS felhasznalo (
      id INT AUTO_INCREMENT PRIMARY KEY,
      felhasznalo_nev VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      jelszo_hash VARCHAR(255) NOT NULL,
      szerepkor_id INT NOT NULL,
      profil_kep_url VARCHAR(255) NULL,
      csatlakozas_datum DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

      tiltva ENUM('nincs','ideiglenes','vegleges') NOT NULL DEFAULT 'nincs',
      tilt_eddig DATETIME NULL,
      tilt_ok VARCHAR(255) NULL,
      tiltva_ekkor DATETIME NULL,
      tiltva_admin_id INT NULL,

      FOREIGN KEY (szerepkor_id) REFERENCES szerepkor(id),
      CONSTRAINT fk_felhasznalo_tiltva_admin FOREIGN KEY (tiltva_admin_id) REFERENCES felhasznalo(id) ON DELETE SET NULL
    )
  `);

  await adatbazisPool.query(`
    CREATE TABLE IF NOT EXISTS felhasznalo_aktivitas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      felhasznalo_id INT NOT NULL,
      tipus VARCHAR(80) NOT NULL,
      cel_tipus VARCHAR(80) NULL,
      cel_id INT NULL,
      szoveg VARCHAR(255) NULL,
      meta_json TEXT NULL,
      ip VARCHAR(80) NULL,
      letrehozva DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_aktivitas_user (felhasznalo_id),
      INDEX idx_aktivitas_date (letrehozva),
      FOREIGN KEY (felhasznalo_id) REFERENCES felhasznalo(id)
    )
  `);

  await adatbazisPool.query(`
    CREATE TABLE IF NOT EXISTS makett (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nev VARCHAR(200) NOT NULL,
      gyarto VARCHAR(200) NOT NULL,
      kategoria VARCHAR(100) NOT NULL,
      skala VARCHAR(50) NOT NULL,
      nehezseg INT NOT NULL,
      megjelenes_eve INT NOT NULL,
      kep_url VARCHAR(255) NULL,
      leiras TEXT NULL,
      vasarlasi_link VARCHAR(500) NULL,

      allapot ENUM('jovahagyva','varakozik','elutasitva') NOT NULL DEFAULT 'jovahagyva',
      bekuldo_felhasznalo_id INT NULL,
      bekuldve DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      elbiralta_admin_id INT NULL,
      elbiralva DATETIME NULL,
      elutasitas_ok VARCHAR(255) NULL,

      INDEX idx_makett_allapot (allapot),
      INDEX idx_makett_bekuldve (bekuldve),

      CONSTRAINT fk_makett_bekuldo FOREIGN KEY (bekuldo_felhasznalo_id) REFERENCES felhasznalo(id) ON DELETE SET NULL,
      CONSTRAINT fk_makett_elbiralo FOREIGN KEY (elbiralta_admin_id) REFERENCES felhasznalo(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await adatbazisPool.query(`
    CREATE TABLE IF NOT EXISTS velemeny (
      id INT AUTO_INCREMENT PRIMARY KEY,
      makett_id INT NOT NULL,
      felhasznalo_id INT NOT NULL,
      szoveg TEXT NOT NULL,
      ertekeles INT NOT NULL,
      letrehozva DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (makett_id) REFERENCES makett(id) ON DELETE CASCADE,
      FOREIGN KEY (felhasznalo_id) REFERENCES felhasznalo(id) ON DELETE CASCADE
    )
  `);

  await adatbazisPool.query(`
    CREATE TABLE IF NOT EXISTS kedvenc (
      felhasznalo_id INT NOT NULL,
      makett_id INT NOT NULL,
      letrehozva DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (felhasznalo_id, makett_id),
      FOREIGN KEY (felhasznalo_id) REFERENCES felhasznalo(id) ON DELETE CASCADE,
      FOREIGN KEY (makett_id) REFERENCES makett(id) ON DELETE CASCADE
    )
  `);

  await adatbazisPool.query(`
    CREATE TABLE IF NOT EXISTS epitesi_naplo (
      id INT AUTO_INCREMENT PRIMARY KEY,
      makett_id INT NOT NULL,
      felhasznalo_id INT NOT NULL,
      cim VARCHAR(200) NOT NULL,
      leiras TEXT NOT NULL,
      kep_url VARCHAR(255) NULL,
      letrehozva DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (makett_id) REFERENCES makett(id) ON DELETE CASCADE,
      FOREIGN KEY (felhasznalo_id) REFERENCES felhasznalo(id) ON DELETE CASCADE
    )
  `);

  await adatbazisPool.query(`
    CREATE TABLE IF NOT EXISTS epitesi_tippek_naplo (
      id INT AUTO_INCREMENT PRIMARY KEY,
      makett_id INT NOT NULL UNIQUE,
      letrehozo_felhasznalo_id INT NOT NULL,
      cim VARCHAR(120) NOT NULL DEFAULT 'Építési tippek',
      letrehozva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      frissitve TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (makett_id) REFERENCES makett(id) ON DELETE CASCADE,
      FOREIGN KEY (letrehozo_felhasznalo_id) REFERENCES felhasznalo(id) ON DELETE CASCADE
    )
  `);

  await adatbazisPool.query(`
    CREATE TABLE IF NOT EXISTS epitesi_tippek_blokk (
      id INT AUTO_INCREMENT PRIMARY KEY,
      naplo_id INT NOT NULL,
      tipus VARCHAR(40) NOT NULL,
      cim VARCHAR(120) NOT NULL,
      tippek TEXT NOT NULL,
      sorrend INT NOT NULL DEFAULT 0,
      letrehozva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      frissitve TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (naplo_id) REFERENCES epitesi_tippek_naplo(id) ON DELETE CASCADE,
      INDEX idx_tippek_blokk_naplo (naplo_id),
      INDEX idx_tippek_blokk_sorrend (naplo_id, sorrend)
    )
  `);

  await adatbazisPool.query(`
    CREATE TABLE IF NOT EXISTS forum_tema (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cim VARCHAR(200) NOT NULL,
      leiras TEXT NULL,
      kategoria VARCHAR(100) NULL,
      letrehozva DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      felhasznalo_id INT NOT NULL,
      FOREIGN KEY (felhasznalo_id) REFERENCES felhasznalo(id) ON DELETE CASCADE
    )
  `);

  await adatbazisPool.query(`
    CREATE TABLE IF NOT EXISTS forum_uzenet (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tema_id INT NOT NULL,
      felhasznalo_id INT NOT NULL,
      szoveg TEXT NOT NULL,
      letrehozva DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tema_id) REFERENCES forum_tema(id) ON DELETE CASCADE,
      FOREIGN KEY (felhasznalo_id) REFERENCES felhasznalo(id) ON DELETE CASCADE
    )
  `);

  await adatbazisPool.query(`
    CREATE TABLE IF NOT EXISTS uzenetek (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kuldo_felhasznalo_id INT NOT NULL,
      targy VARCHAR(120) NOT NULL,
      uzenet TEXT NOT NULL,
      olvasva TINYINT(1) NOT NULL DEFAULT 0,
      letrehozva DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kuldo_felhasznalo_id) REFERENCES felhasznalo(id) ON DELETE CASCADE
    )
  `);

  // alap szerepkörök
  await adatbazisPool.query(
    `INSERT IGNORE INTO szerepkor (id, nev)
     VALUES (1, 'felhasznalo'), (2, 'admin'), (3, 'moderator')`
  );

  // admin létrehozása
  const adminFelhasznaloNev = "Admin";
  const adminEmail = "admin@pelda.hu";
  const adminJelszo = "admin123";

  const adminok = await adatbazisLekeres(
    "SELECT id FROM felhasznalo WHERE felhasznalo_nev = ? OR email = ?",
    [adminFelhasznaloNev, adminEmail]
  );

  if (!adminok.length) {
    const hash = await bcrypt.hash(adminJelszo, 10);
    await adatbazisLekeres(
      `INSERT INTO felhasznalo (felhasznalo_nev, email, jelszo_hash, szerepkor_id)
       VALUES (?, ?, ?, 2)`,
      [adminFelhasznaloNev, adminEmail, hash]
    );
    console.log("Létrehozva admin felhasználó (admin@pelda.hu / admin123)");
  }

  // demo user
  const demoEmail = "demo@pelda.hu";
  const demok = await adatbazisLekeres("SELECT id FROM felhasznalo WHERE email = ?", [demoEmail]);
  if (!demok.length) {
    const demoHash = await bcrypt.hash("demo123", 10);
    await adatbazisLekeres(
      `INSERT INTO felhasznalo (felhasznalo_nev, email, jelszo_hash, szerepkor_id)
       VALUES (?, ?, ?, 1)`,
      ["Demó felhasználó", demoEmail, demoHash]
    );
    console.log("Létrehozva demo felhasználó (demo@pelda.hu / demo123)");
  }

  // seed makettek
  const makettek = await adatbazisLekeres("SELECT COUNT(*) AS db FROM makett");
  if (makettek[0].db === 0) {
    await adatbazisLekeres(
      `INSERT INTO makett (nev, gyarto, kategoria, skala, nehezseg, megjelenes_eve, kep_url)
       VALUES
        ('T-34/85 szovjet közepes harckocsi', 'Zvezda', 'harckocsi', '1:35', 3, 2019, NULL),
        ('Bismarck csatahajó', 'Revell', 'hajó', '1:350', 4, 2015, NULL),
        ('Messerschmitt Bf 109', 'Airfix', 'repülő', '1:72', 2, 2020, NULL)`
    );
  }

  console.log("Adatbázis inicializálva.");
}

// -------------------- INDÍTÁS --------------------
inicializalAdatbazis()
  .then(() => {
    app.listen(PORT, () => console.log(`Backend fut: http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Adatbázis inicializálási hiba:", err?.message || err);
    process.exit(1);
  });

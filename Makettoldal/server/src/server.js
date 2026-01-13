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

const PORT = Number(process.env.PORT || 3001);
const JWT_TITOK = process.env.JWT_TITOK || "nagyon_titkos_jwt_kulcs";

// --- PROFILKÉP FELTÖLTÉS --- //
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = req.felhasznalo?.id || "ismeretlen";
    const nev = "profil_" + id + "_" + Date.now() + ext;
    cb(null, nev);
  },
});

const upload = multer({ storage });

// --- ADATBÁZIS KAPCSOLAT --- //
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT || 3307);
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "makett";

let adatbazisPool = null;

async function adatbazisLekeres(sql, parameterek = []) {
  const [sorok] = await adatbazisPool.query(sql, parameterek);
  return sorok;
}

// --- JWT / AUTH SEGÉDFÜGGVÉNYEK --- //
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

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ uzenet: "Hiányzó vagy érvénytelen token" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_TITOK);
    req.felhasznalo = decoded;
    next();
  } catch (err) {
    console.error("JWT hiba:", err.message);
    return res.status(401).json({ uzenet: "Érvénytelen vagy lejárt token" });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.felhasznalo || req.felhasznalo.szerepkor_id !== 2) {
    return res.status(403).json({ uzenet: "Admin jogosultság szükséges" });
  }
  next();
}

// --- ADATBÁZIS INICIALIZÁLÁS --- //
async function inicializalAdatbazis() {
  // 1) DB létrehozás olyan kapcsolattal, ami NEM várja el, hogy a DB már létezzen
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

  // 2) Innentől már a DB-re csatlakozunk
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
      FOREIGN KEY (szerepkor_id) REFERENCES szerepkor(id)
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

      -- jóváhagyásos feltöltés mezők
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


  // Ha a tábla már korábban létrejött régi szerkezettel, próbáljuk "migrálni" (hibát figyelmen kívül hagyunk)
  const probalSema = async (sql) => {
    try {
      await adatbazisPool.query(sql);
    } catch (e) {
      const msg = e?.message || "";
      // tipikus "már létezik" hibák
      if (
        msg.includes("Duplicate column name") ||
        msg.includes("Duplicate key name") ||
        msg.includes("Duplicate foreign key constraint name") ||
        msg.includes("already exists")
      ) {
        return;
      }
      console.warn("Séma frissítés figyelmeztetés:", msg);
    }
  };

  await probalSema("ALTER TABLE makett ADD COLUMN allapot ENUM('jovahagyva','varakozik','elutasitva') NOT NULL DEFAULT 'jovahagyva'");
  await probalSema("ALTER TABLE makett ADD COLUMN bekuldo_felhasznalo_id INT NULL");
  await probalSema("ALTER TABLE makett ADD COLUMN bekuldve DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
  await probalSema("ALTER TABLE makett ADD COLUMN elbiralta_admin_id INT NULL");
  await probalSema("ALTER TABLE makett ADD COLUMN elbiralva DATETIME NULL");
  await probalSema("ALTER TABLE makett ADD COLUMN elutasitas_ok VARCHAR(255) NULL");
  await probalSema("ALTER TABLE makett ADD INDEX idx_makett_allapot (allapot)");
  await probalSema("ALTER TABLE makett ADD INDEX idx_makett_bekuldve (bekuldve)");
  await probalSema("ALTER TABLE makett ADD CONSTRAINT fk_makett_bekuldo FOREIGN KEY (bekuldo_felhasznalo_id) REFERENCES felhasznalo(id) ON DELETE SET NULL");
  await probalSema("ALTER TABLE makett ADD CONSTRAINT fk_makett_elbiralo FOREIGN KEY (elbiralta_admin_id) REFERENCES felhasznalo(id) ON DELETE SET NULL");
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
    INSERT IGNORE INTO szerepkor (id, nev)
    VALUES (1, 'felhasznalo'), (2, 'admin')
  `);

  // --- ADMIN LÉTREHOZÁSA DUPLIKÁCIÓ NÉLKÜL --- //
  const adminFelhasznaloNev = "Admin";
  const adminEmail = "admin@pelda.hu";
  const adminJelszo = "admin123";

  const adminok = await adatbazisLekeres(
    "SELECT id FROM felhasznalo WHERE felhasznalo_nev = ? OR email = ?",
    [adminFelhasznaloNev, adminEmail]
  );

  if (adminok.length === 0) {
    const hash = await bcrypt.hash(adminJelszo, 10);
    await adatbazisLekeres(
      `INSERT INTO felhasznalo (felhasznalo_nev, email, jelszo_hash, szerepkor_id)
       VALUES (?, ?, ?, 2)`,
      [adminFelhasznaloNev, adminEmail, hash]
    );
    console.log("Létrehozva admin felhasználó (admin@pelda.hu / admin123)");
  }

 const demoEmail = "demo@pelda.hu";
const demok = await adatbazisLekeres(
  "SELECT id FROM felhasznalo WHERE email = ?",
  [demoEmail]
);
if (demok.length === 0) {   
  const demoHash = await bcrypt.hash("demo123", 10);
  await adatbazisLekeres(
    `INSERT INTO felhasznalo (felhasznalo_nev, email, jelszo_hash, szerepkor_id)
     VALUES (?, ?, ?, 1)`,
    ["Demó felhasználó", demoEmail, demoHash]
  );
  console.log("Létrehozva demo felhasználó (demo@pelda.hu / demo123)");
}


  const makettek = await adatbazisLekeres("SELECT COUNT(*) AS db FROM makett");
  if (makettek[0].db === 0) {
    await adatbazisLekeres(
      `INSERT INTO makett
        (nev, gyarto, kategoria, skala, nehezseg, megjelenes_eve, kep_url)
       VALUES
        ('T-34/85 szovjet közepes harckocsi', 'Zvezda', 'harckocsi', '1:35', 3, 2019, NULL),
        ('Bismarck csatahajó', 'Revell', 'hajó', '1:350', 4, 2015, NULL),
        ('Messerschmitt Bf 109', 'Airfix', 'repülő', '1:72', 2, 2020, NULL)`
    );
  }

  await adatbazisLekeres(`
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

  await adatbazisLekeres(`
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

  console.log("Adatbázis inicializálva.");
}

// --- APP & RATE LIMIT --- //
const app = express();
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(express.json());

// --- AI (OpenAI GPT-4o mini) --- //
// Külön rate limit, hogy ne lehessen spammelni
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 perc
  max: 20, // 20 kérés / perc / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { uzenet: "Túl sok AI kérés. Próbáld meg később." },
});

// Fontos: ez az endpoint NINCS auth-hoz kötve (ne dobjon 401-et)
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

    // Node 18+ esetén van global fetch, régebbin node-fetch kell
    const fetchFn = globalThis.fetch || (await import("node-fetch")).default;

    // A Chat Completions API közvetlenül tudja a {role, content} formátumot
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

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status).json({
        uzenet: data?.error?.message || "OpenAI hiba",
        raw: data,
      });
    }

    const reply = data?.choices?.[0]?.message?.content || "";
    return res.json({ reply });
  } catch (err) {
    console.error("AI hiba:", err);
    return res.status(500).json({ uzenet: err?.message || "AI szerver hiba" });
  }
});

// Rate limit az auth végpontokra (brute force ellen)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 perc
  max: 20, // max 20 próbálkozás
  standardHeaders: true,
  legacyHeaders: false,
  message: { uzenet: "Túl sok próbálkozás. Próbáld meg később." },
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// --- AUTH --- //
app.post("/api/auth/register", async (req, res) => {
  try {
    const { felhasznalo_nev, email, jelszo } = req.body;

    if (!felhasznalo_nev || !email || !jelszo) {
      return res
        .status(400)
        .json({ uzenet: "Minden mező kitöltése kötelező." });
    }

    const letezo = await adatbazisLekeres(
      "SELECT id FROM felhasznalo WHERE email = ?",
      [email]
    );
    if (letezo.length > 0) {
      return res
        .status(400)
        .json({ uzenet: "Ezzel az email címmel már létezik felhasználó." });
    }

    const hash = await bcrypt.hash(jelszo, 10);
    const eredmeny = await adatbazisLekeres(
      `INSERT INTO felhasznalo
        (felhasznalo_nev, email, jelszo_hash, szerepkor_id)
       VALUES (?, ?, ?, 1)`,
      [felhasznalo_nev, email, hash]
    );

    const ujId = eredmeny.insertId;
    const [uj] = await adatbazisLekeres(
      "SELECT * FROM felhasznalo WHERE id = ?",
      [ujId]
    );
    const token = generalToken(uj);

    res.status(201).json({
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
    console.error("Regisztrációs hiba:", err);
    res.status(500).json({ uzenet: "Szerver hiba a regisztráció során." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, jelszo } = req.body;

    const felhasznalok = await adatbazisLekeres(
      "SELECT * FROM felhasznalo WHERE email = ?",
      [email]
    );
    if (felhasznalok.length === 0) {
      return res.status(400).json({ uzenet: "Hibás email vagy jelszó." });
    }

    const user = felhasznalok[0];
    const egyezik = await bcrypt.compare(jelszo, user.jelszo_hash);
    if (!egyezik) {
      return res.status(400).json({ uzenet: "Hibás email vagy jelszó." });
    }

    const token = generalToken(user);
    res.json({
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
    console.error("Bejelentkezési hiba:", err);
    res.status(500).json({ uzenet: "Szerver hiba a bejelentkezés során." });
  }
});

// --- FÓRUM --- //
// Fórum – témák listázása
app.get("/api/forum/temak", async (req, res) => {
  try {
    const temak = await adatbazisLekeres(
      `SELECT t.id,
              t.cim,
              t.leiras,
              t.kategoria,
              t.letrehozva,
              t.felhasznalo_id,
              f.felhasznalo_nev,
              COUNT(u.id) AS uzenet_db,
              MAX(u.letrehozva) AS utolso_valasz
       FROM forum_tema t
       JOIN felhasznalo f ON f.id = t.felhasznalo_id
       LEFT JOIN forum_uzenet u ON u.tema_id = t.id
       GROUP BY t.id
       ORDER BY COALESCE(MAX(u.letrehozva), t.letrehozva) DESC`
    );
    res.json(temak);
  } catch (err) {
    console.error("Fórum témák hiba:", err);
    res.status(500).json({ uzenet: "Hiba a fórum témák lekérdezésekor." });
  }
});

// Fórum – új téma létrehozása
app.post("/api/forum/temak", authMiddleware, async (req, res) => {
  try {
    const { cim, leiras, kategoria } = req.body;
    if (!cim || cim.trim() === "") {
      return res.status(400).json({ uzenet: "A cím megadása kötelező." });
    }

    const felhasznaloId = req.felhasznalo.id;

    const eredmeny = await adatbazisLekeres(
      `INSERT INTO forum_tema (cim, leiras, kategoria, felhasznalo_id)
       VALUES (?, ?, ?, ?)`,
      [cim.trim(), leiras || null, kategoria || null, felhasznaloId]
    );

    const [uj] = await adatbazisLekeres(
      `SELECT t.id,
              t.cim,
              t.leiras,
              t.kategoria,
              t.letrehozva,
              t.felhasznalo_id,
              f.felhasznalo_nev,
              0 AS uzenet_db,
              t.letrehozva AS utolso_valasz
       FROM forum_tema t
       JOIN felhasznalo f ON f.id = t.felhasznalo_id
       WHERE t.id = ?`,
      [eredmeny.insertId]
    );

    res.status(201).json(uj);
  } catch (err) {
    console.error("Új fórum téma hiba:", err);
    res.status(500).json({ uzenet: "Hiba a téma létrehozása során." });
  }
});

// Fórum – egy téma hozzászólásai
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
    res.json(uzenetek);
  } catch (err) {
    console.error("Fórum üzenetek hiba:", err);
    res.status(500).json({ uzenet: "Hiba a fórum üzenetek lekérdezésekor." });
  }
});

// Fórum – új hozzászólás
app.post(
  "/api/forum/temak/:id/uzenetek",
  authMiddleware,
  async (req, res) => {
    try {
      const temaId = Number(req.params.id);
      const { szoveg } = req.body;
      const felhasznaloId = req.felhasznalo.id;

      if (!szoveg || szoveg.trim() === "") {
        return res.status(400).json({ uzenet: "Az üzenet szövege kötelező." });
      }

      const eredmeny = await adatbazisLekeres(
        `INSERT INTO forum_uzenet (tema_id, felhasznalo_id, szoveg)
         VALUES (?, ?, ?)`,
        [temaId, felhasznaloId, szoveg.trim()]
      );

      const [uj] = await adatbazisLekeres(
        `SELECT u.id, u.tema_id, u.felhasznalo_id, u.szoveg, u.letrehozva,
                f.felhasznalo_nev
         FROM forum_uzenet u
         JOIN felhasznalo f ON f.id = u.felhasznalo_id
         WHERE u.id = ?`,
        [eredmeny.insertId]
      );

      res.status(201).json(uj);
    } catch (err) {
      console.error("Új fórum üzenet hiba:", err);
      res.status(500).json({ uzenet: "Hiba az üzenet mentése során." });
    }
  }
);

// --- PROFIL --- //
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

    const [uj] = await adatbazisLekeres(
      "SELECT * FROM felhasznalo WHERE id = ?",
      [id]
    );
    const token = generalToken(uj);

    res.json({
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
    console.error("Profil frissítési hiba:", err);
    res.status(500).json({ uzenet: "Szerver hiba a profil frissítése során." });
  }
});



// --- MAKETTEK --- //
// Makettek (publikus lista + szűrés)
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

    const feltetelek = [];
    feltetelek.push("m.allapot = 'jovahagyva'");
    const parameterek = [];

    if (kategoria && kategoria !== "osszes") {
      feltetelek.push("m.kategoria = ?");
      parameterek.push(kategoria);
    }

    if (skala && skala !== "osszes") {
      feltetelek.push("m.skala = ?");
      parameterek.push(skala);
    }

    if (q && q.trim() !== "") {
      feltetelek.push("(m.nev LIKE ? OR m.gyarto LIKE ?)");
      const like = `%${q.trim()}%`;
      parameterek.push(like, like);
    }

    if (feltetelek.length > 0) {
      sql += " WHERE " + feltetelek.join(" AND ");
    }

    sql += " GROUP BY m.id";

    if (minPont) {
      sql += " HAVING COALESCE(AVG(v.ertekeles), 0) >= ?";
      parameterek.push(Number(minPont));
    }

    if (rendezes === "ev") {
      sql += " ORDER BY m.megjelenes_eve DESC";
    } else if (rendezes === "ertekeles") {
      sql += " ORDER BY atlag_ertekeles DESC";
    } else {
      sql += " ORDER BY m.nev ASC";
    }

    const makettek = await adatbazisLekeres(sql, parameterek);
    res.json(makettek);
  } catch (err) {
    console.error("Makettek lekérdezési hiba:", err);
    res
      .status(500)
      .json({ uzenet: "Szerver hiba a makettek lekérdezése során." });
  }
});

// Makettek admin műveletek
app.post("/api/makettek", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    let {
      nev,
      gyarto,
      kategoria,
      skala,
      nehezseg,
      megjelenes_eve,
      kep_url,
    } = req.body;

    if (!nev || !gyarto || !kategoria || !skala) {
      return res
        .status(400)
        .json({ uzenet: "Név, gyártó, kategória és skála kötelező." });
    }

    const nehezsegSzam = Number(nehezseg);
    const evSzam = Number(megjelenes_eve);

    if (!Number.isFinite(nehezsegSzam) || nehezsegSzam < 1 || nehezsegSzam > 5) {
      return res
        .status(400)
        .json({ uzenet: "A nehézség 1 és 5 közötti szám legyen." });
    }

    if (!Number.isFinite(evSzam) || evSzam < 1900 || evSzam > 2100) {
      return res
        .status(400)
        .json({ uzenet: "A megjelenés éve 1900 és 2100 közé essen." });
    }

    const eredmeny = await adatbazisLekeres(
      `INSERT INTO makett
        (nev, gyarto, kategoria, skala, nehezseg, megjelenes_eve, kep_url, allapot, elbiralta_admin_id, elbiralva)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'jovahagyva', ?, NOW())`,
      [
        nev.trim(),
        gyarto.trim(),
        kategoria.trim(),
        skala.trim(),
        nehezsegSzam,
        evSzam,
        kep_url || null,
        req.felhasznalo.id,
      ]
    );

    const ujId = eredmeny.insertId;
    const [uj] = await adatbazisLekeres("SELECT * FROM makett WHERE id = ?", [
      ujId,
    ]);
    res.status(201).json(uj);
  } catch (err) {
    console.error("Makett létrehozási hiba:", err);
    res
      .status(500)
      .json({ uzenet: "Szerver hiba a makett létrehozása során." });
  }
});

app.put(
  "/api/makettek/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const makettId = Number(req.params.id);
      let {
        nev,
        gyarto,
        kategoria,
        skala,
        nehezseg,
        megjelenes_eve,
        kep_url,
      } = req.body;

      if (!nev || !gyarto || !kategoria || !skala) {
        return res
          .status(400)
          .json({ uzenet: "Név, gyártó, kategória és skála kötelező." });
      }

      const nehezsegSzam = Number(nehezseg);
      const evSzam = Number(megjelenes_eve);

      if (
        !Number.isFinite(nehezsegSzam) ||
        nehezsegSzam < 1 ||
        nehezsegSzam > 5
      ) {
        return res
          .status(400)
          .json({ uzenet: "A nehézség 1 és 5 közötti szám legyen." });
      }

      if (!Number.isFinite(evSzam) || evSzam < 1900 || evSzam > 2100) {
        return res
          .status(400)
          .json({ uzenet: "A megjelenés éve 1900 és 2100 közé essen." });
      }

      await adatbazisLekeres(
        `UPDATE makett
         SET nev = ?, gyarto = ?, kategoria = ?, skala = ?, nehezseg = ?, megjelenes_eve = ?, kep_url = ?
         WHERE id = ?`,
        [
          nev.trim(),
          gyarto.trim(),
          kategoria.trim(),
          skala.trim(),
          nehezsegSzam,
          evSzam,
          kep_url || null,
          makettId,
        ]
      );

      const [uj] = await adatbazisLekeres(
        "SELECT * FROM makett WHERE id = ?",
        [makettId]
      );
      res.json(uj);
    } catch (err) {
      console.error("Makett módosítási hiba:", err);
      res
        .status(500)
        .json({ uzenet: "Szerver hiba a makett módosítása során." });
    }
  }
);



// --- MAKETT BEKÜLDÉS (felhasználó) + JÓVÁHAGYÁS (admin) --- //

// Felhasználó beküld új makettet jóváhagyásra
app.post("/api/makett-javaslatok", authMiddleware, async (req, res) => {
  try {
    let { nev, gyarto, kategoria, skala, nehezseg, megjelenes_eve, kep_url } = req.body;

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
        (nev, gyarto, kategoria, skala, nehezseg, megjelenes_eve, kep_url, allapot, bekuldo_felhasznalo_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'varakozik', ?)`,
      [
        nev.trim(),
        gyarto.trim(),
        kategoria.trim(),
        skala.trim(),
        nehezsegSzam,
        evSzam,
        kep_url || null,
        req.felhasznalo.id,
      ]
    );

    return res.status(201).json({ uzenet: "Beküldve jóváhagyásra.", id: eredmeny.insertId });
  } catch (err) {
    console.error("Makett javaslat hiba:", err);
    return res.status(500).json({ uzenet: "Szerver hiba a makett beküldése során." });
  }
});

// Saját beküldések (hogy a user lássa mi várakozik / elutasítva / jóváhagyva)
app.get("/api/sajat/makett-javaslatok", authMiddleware, async (req, res) => {
  try {
    const sorok = await adatbazisLekeres(
      `SELECT id, nev, gyarto, kategoria, skala, nehezseg, megjelenes_eve, kep_url,
              allapot, bekuldve, elbiralva, elutasitas_ok
       FROM makett
       WHERE bekuldo_felhasznalo_id = ?
       ORDER BY bekuldve DESC`,
      [req.felhasznalo.id]
    );
    return res.json(sorok);
  } catch (err) {
    console.error("Saját makett javaslatok hiba:", err);
    return res.status(500).json({ uzenet: "Szerver hiba a saját beküldések lekérdezése során." });
  }
});

// Admin: függőben lévő javaslatok listája
app.get("/api/admin/makett-javaslatok", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const sorok = await adatbazisLekeres(
      `SELECT m.*,
              f.felhasznalo_nev AS bekuldo_nev,
              f.email AS bekuldo_email
       FROM makett m
       LEFT JOIN felhasznalo f ON f.id = m.bekuldo_felhasznalo_id
       WHERE m.allapot = 'varakozik'
       ORDER BY m.bekuldve DESC`
    );
    return res.json(sorok);
  } catch (err) {
    console.error("Admin makett javaslatok hiba:", err);
    return res.status(500).json({ uzenet: "Szerver hiba az admin listánál." });
  }
});

// Admin: jóváhagyás
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

    return res.json({ uzenet: "Jóváhagyva." });
  } catch (err) {
    console.error("Makett jóváhagyás hiba:", err);
    return res.status(500).json({ uzenet: "Szerver hiba a jóváhagyás során." });
  }
});

// Admin: elutasítás (ok opcionális)
app.post("/api/admin/makett-javaslatok/:id/elutasit", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ uzenet: "Érvénytelen azonosító." });

    const ok = (req.body?.ok || "").trim();

    const eredmeny = await adatbazisLekeres(
      `UPDATE makett
       SET allapot='elutasitva', elbiralta_admin_id=?, elbiralva=NOW(), elutasitas_ok=?
       WHERE id=? AND allapot='varakozik'`,
      [req.felhasznalo.id, ok || null, id]
    );

    if (!eredmeny.affectedRows) return res.status(404).json({ uzenet: "Nem található függőben lévő javaslat ezzel az ID-vel." });

    return res.json({ uzenet: "Elutasítva." });
  } catch (err) {
    console.error("Makett elutasítás hiba:", err);
    return res.status(500).json({ uzenet: "Szerver hiba az elutasítás során." });
  }
});


// --- VÉLEMÉNYEK --- //
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
    res.json(velemenyek);
  } catch (err) {
    console.error("Vélemények lekérdezési hiba:", err);
    res
      .status(500)
      .json({ uzenet: "Szerver hiba a vélemények lekérdezése során." });
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
    res.json(velemenyek);
  } catch (err) {
    console.error("Makett vélemények lekérdezési hiba:", err);
    res.status(500).json({
      uzenet: "Szerver hiba a makett véleményeinek lekérdezése során.",
    });
  }
});

// Saját vélemények – csak bejelentkezve
app.get("/api/sajat/velemenyek", authMiddleware, async (req, res) => {
  try {
    const felhasznaloId = req.felhasznalo.id;

    const sorok = await adatbazisLekeres(
      `SELECT v.id,
              v.makett_id,
              v.szoveg,
              v.ertekeles,
              v.letrehozva,
              m.nev AS makett_nev,
              m.gyarto,
              m.skala,
              m.kategoria
       FROM velemeny v
       JOIN makett m ON m.id = v.makett_id
       WHERE v.felhasznalo_id = ?
       ORDER BY v.letrehozva DESC`,
      [felhasznaloId]
    );

    res.json(sorok);
  } catch (err) {
    console.error("Saját vélemények lekérdezési hiba:", err);
    res
      .status(500)
      .json({ uzenet: "Szerver hiba a saját vélemények lekérdezése során." });
  }
});

// Vélemény létrehozása – csak bejelentkezve
app.post("/api/makettek/:id/velemenyek", authMiddleware, async (req, res) => {
  try {
    const makettId = Number(req.params.id);
    const { szoveg, ertekeles } = req.body;
    const felhasznaloId = req.felhasznalo.id;

    if (!szoveg || !ertekeles) {
      return res.status(400).json({ uzenet: "Hiányzó adatok." });
    }

    const ertek = Number(ertekeles);
    if (!(ertek >= 1 && ertek <= 5)) {
      return res
        .status(400)
        .json({ uzenet: "Az értékelés 1 és 5 között lehet." });
    }

    const eredmeny = await adatbazisLekeres(
      `INSERT INTO velemeny
        (makett_id, felhasznalo_id, szoveg, ertekeles)
       VALUES (?, ?, ?, ?)`,
      [makettId, felhasznaloId, szoveg, ertek]
    );

    const ujId = eredmeny.insertId;
    const [uj] = await adatbazisLekeres(
      `SELECT v.id, v.makett_id, v.felhasznalo_id, v.szoveg, v.ertekeles, v.letrehozva,
              f.felhasznalo_nev
       FROM velemeny v
       JOIN felhasznalo f ON f.id = v.felhasznalo_id
       WHERE v.id = ?`,
      [ujId]
    );

    res.status(201).json(uj);
  } catch (err) {
    console.error("Vélemény mentési hiba:", err);
    res
      .status(500)
      .json({ uzenet: "Szerver hiba a vélemény mentése során." });
  }
});

// Vélemény módosítása – csak saját vagy admin
app.put("/api/velemenyek/:id", authMiddleware, async (req, res) => {
  try {
    const velemenyId = Number(req.params.id);
    const { szoveg, ertekeles } = req.body;
    const userId = req.felhasznalo.id;
    const admin = req.felhasznalo.szerepkor_id === 2;

    const eredeti = await adatbazisLekeres(
      "SELECT * FROM velemeny WHERE id = ?",
      [velemenyId]
    );
    if (eredeti.length === 0) {
      return res.status(404).json({ uzenet: "A vélemény nem található." });
    }
    if (!admin && eredeti[0].felhasznalo_id !== userId) {
      return res
        .status(403)
        .json({ uzenet: "Nem módosíthatod más felhasználó véleményét." });
    }

    const ertek = Number(ertekeles);
    if (!(ertek >= 1 && ertek <= 5)) {
      return res
        .status(400)
        .json({ uzenet: "Az értékelés 1 és 5 között lehet." });
    }

    await adatbazisLekeres(
      `UPDATE velemeny
       SET szoveg = ?, ertekeles = ?
       WHERE id = ?`,
      [szoveg, ertek, velemenyId]
    );

    const [uj] = await adatbazisLekeres(
      `SELECT v.id, v.makett_id, v.felhasznalo_id, v.szoveg, v.ertekeles, v.letrehozva,
              f.felhasznalo_nev
       FROM velemeny v
       JOIN felhasznalo f ON f.id = v.felhasznalo_id
       WHERE v.id = ?`,
      [velemenyId]
    );

    res.json(uj);
  } catch (err) {
    console.error("Vélemény módosítási hiba:", err);
    res
      .status(500)
      .json({ uzenet: "Szerver hiba a vélemény módosítása során." });
  }
});

// Vélemény törlése – csak saját vagy admin
app.delete("/api/velemenyek/:id", authMiddleware, async (req, res) => {
  try {
    const velemenyId = Number(req.params.id);
    const userId = req.felhasznalo.id;
    const admin = req.felhasznalo.szerepkor_id === 2;

    const eredeti = await adatbazisLekeres(
      "SELECT * FROM velemeny WHERE id = ?",
      [velemenyId]
    );
    if (eredeti.length === 0) {
      return res.status(404).json({ uzenet: "A vélemény nem található." });
    }
    if (!admin && eredeti[0].felhasznalo_id !== userId) {
      return res
        .status(403)
        .json({ uzenet: "Nem törölheted más felhasználó véleményét." });
    }

    await adatbazisLekeres("DELETE FROM velemeny WHERE id = ?", [velemenyId]);
    res.json({ uzenet: "Vélemény törölve." });
  } catch (err) {
    console.error("Vélemény törlési hiba:", err);
    res
      .status(500)
      .json({ uzenet: "Szerver hiba a vélemény törlése során." });
  }
});

// --- KEDVENCEK --- //
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
    res.json(sorok);
  } catch (err) {
    console.error("Kedvencek lekérdezési hiba:", err);
    res
      .status(500)
      .json({ uzenet: "Szerver hiba a kedvencek lekérdezése során." });
  }
});

app.post("/api/kedvencek/:makettId", authMiddleware, async (req, res) => {
  try {
    const userId = req.felhasznalo.id;
    const makettId = Number(req.params.makettId);

    await adatbazisLekeres(
      `INSERT IGNORE INTO kedvenc (felhasznalo_id, makett_id)
       VALUES (?, ?)`,
      [userId, makettId]
    );

    res.status(201).json({ uzenet: "Hozzáadva a kedvencekhez." });
  } catch (err) {
    console.error("Kedvencek hozzáadási hiba:", err);
    res
      .status(500)
      .json({ uzenet: "Szerver hiba a kedvencek módosítása során." });
  }
});

app.delete("/api/kedvencek/:makettId", authMiddleware, async (req, res) => {
  try {
    const userId = req.felhasznalo.id;
    const makettId = Number(req.params.makettId);

    await adatbazisLekeres(
      "DELETE FROM kedvenc WHERE felhasznalo_id = ? AND makett_id = ?",
      [userId, makettId]
    );

    res.json({ uzenet: "Eltávolítva a kedvencek közül." });
  } catch (err) {
    console.error("Kedvencek törlési hiba:", err);
    res
      .status(500)
      .json({ uzenet: "Szerver hiba a kedvencek módosítása során." });
  }
});

// --- PROFILKÉP FELTÖLTÉS ENDPOINT --- //
app.post(
  "/api/profil/feltoltes",
  authMiddleware,
  upload.single("profilkep"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ uzenet: "Nincs feltöltött fájl." });
    }

    const kepUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    try {
      await adatbazisLekeres(
        "UPDATE felhasznalo SET profil_kep_url = ? WHERE id = ?",
        [kepUrl, req.felhasznalo.id]
      );

      return res.json({
        uzenet: "Profilkép frissítve.",
        kepUrl,
      });
    } catch (err) {
      console.error("Profilkép mentési hiba:", err);
      return res
        .status(500)
        .json({ uzenet: "Hiba adatbázis mentés közben." });
    }
  }
);

// --- ÉPÍTÉSI NAPLÓK --- //
// Építési naplók – publikus lista
app.get("/api/epitesinaplo", async (req, res) => {
  try {
    const sorok = await adatbazisLekeres(
      `SELECT e.id,
              e.makett_id,
              e.cim,
              e.leiras,
              e.kep_url,
              e.letrehozva,
              m.nev AS makett_nev,
              m.gyarto,
              m.skala,
              f.felhasznalo_nev
       FROM epitesi_naplo e
       JOIN makett m ON m.id = e.makett_id
       JOIN felhasznalo f ON f.id = e.felhasznalo_id
       ORDER BY e.letrehozva DESC`
    );
    res.json(sorok);
  } catch (err) {
    console.error("Építési napló lekérdezési hiba:", err);
    res
      .status(500)
      .json({ uzenet: "Szerver hiba az építési napló lekérdezése során." });
  }
});

// Saját építési naplók
app.get("/api/epitesinaplo/sajat", authMiddleware, async (req, res) => {
  try {
    const felhasznaloId = req.felhasznalo.id;

    const sorok = await adatbazisLekeres(
      `SELECT e.id,
              e.makett_id,
              e.cim,
              e.leiras,
              e.kep_url,
              e.letrehozva,
              m.nev AS makett_nev,
              m.gyarto,
              m.skala
       FROM epitesi_naplo e
       JOIN makett m ON m.id = e.makett_id
       WHERE e.felhasznalo_id = ?
       ORDER BY e.letrehozva DESC`,
      [felhasznaloId]
    );

    res.json(sorok);
  } catch (err) {
    console.error("Saját építési napló lekérdezési hiba:", err);
    res
      .status(500)
      .json({ uzenet: "Szerver hiba az építési naplók lekérdezése során." });
  }
});

// Új építési napló bejegyzés
app.post("/api/epitesinaplo", authMiddleware, async (req, res) => {
  try {
    const felhasznaloId = req.felhasznalo.id;
    const { makett_id, cim, leiras, kep_url } = req.body;

    const makettId = Number(makett_id);
    if (!Number.isFinite(makettId)) {
      return res
        .status(400)
        .json({ uzenet: "Érvénytelen makett azonosító." });
    }

    if (!cim || !leiras) {
      return res
        .status(400)
        .json({ uzenet: "Cím és leírás megadása kötelező." });
    }

    const eredmeny = await adatbazisLekeres(
      `INSERT INTO epitesi_naplo (makett_id, felhasznalo_id, cim, leiras, kep_url)
       VALUES (?, ?, ?, ?, ?)`,
      [makettId, felhasznaloId, cim.trim(), leiras.trim(), kep_url || null]
    );

    const ujId = eredmeny.insertId;
    const [uj] = await adatbazisLekeres(
      `SELECT e.id,
              e.makett_id,
              e.cim,
              e.leiras,
              e.kep_url,
              e.letrehozva,
              m.nev AS makett_nev,
              m.gyarto,
              m.skala,
              f.felhasznalo_nev
       FROM epitesi_naplo e
       JOIN makett m ON m.id = e.makett_id
       JOIN felhasznalo f ON f.id = e.felhasznalo_id
       WHERE e.id = ?`,
      [ujId]
    );

    
  } catch (err) {
    console.error("Építési napló létrehozási hiba:", err);
    res
      .status(500)
      .json({ uzenet: "Szerver hiba az építési napló létrehozása során." });
  }
});

// --- GYÖKÉR ENDPOINT --- //
app.get("/", (req, res) => {
  res.send("Makett API fut.");
});

// --- INDÍTÁS --- //
inicializalAdatbazis()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend fut: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Adatbázis inicializálási hiba:", err);
    process.exit(1);
  });

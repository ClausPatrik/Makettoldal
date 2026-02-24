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

import createAiRoutes from "./routes/ai.js";
import createAuthRoutes from "./routes/auth.js";
import createProfilRoutes from "./routes/profil.js";
import createMakettekRoutes from "./routes/makettek.js";
import createAdminRoutes from "./routes/admin.js";
import createVelemenyekRoutes from "./routes/velemenyek.js";
import createKedvencekRoutes from "./routes/kedvencek.js";
import createEpitesiTippekRoutes from "./routes/epitesiTippek.js";
import createEpitesinaploRoutes from "./routes/epitesinaplo.js";
import createUzenetekRoutes from "./routes/uzenetek.js";
import createForumRoutes from "./routes/forum.js";
import createRootRoutes from "./routes/root.js";

export const app = express();

export const PORT = Number(process.env.PORT || 3001);
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
      `INSERT INTO felhasznalo_aktivitas 
      (felhasznalo_id, tipus, cel_tipus, cel_id, szoveg, meta_json, ip)
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

// -------------------- ROUTES --------------------
const ctx = {
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
};

app.use(createAiRoutes(ctx));
app.use(createAuthRoutes(ctx));
app.use(createProfilRoutes(ctx));
app.use(createMakettekRoutes(ctx));
app.use(createAdminRoutes(ctx));
app.use(createVelemenyekRoutes(ctx));
app.use(createKedvencekRoutes(ctx));
app.use(createEpitesiTippekRoutes(ctx));
app.use(createEpitesinaploRoutes(ctx));
app.use(createUzenetekRoutes(ctx));
app.use(createForumRoutes(ctx));
app.use(createRootRoutes(ctx));

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

export async function inicializalAdatbazisExport() {
  return inicializalAdatbazis();
}

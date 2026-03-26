// Környezeti változók és külső csomagok importálása
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

// Route modulok importálása
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

// Express alkalmazás és port beállítása
export const app = express();

export const PORT = Number(process.env.PORT || 3001);
const JWT_TITOK = process.env.JWT_TITOK || "nagyon_titkos_jwt_kulcs";

// Fájlfeltöltés konfigurálása (makett képek és profilképek tárolása)
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = req.felhasznalo?.id || "ismeretlen";
  
    const prefix = file.fieldname === "kep" ? "makett" : "profil";
    cb(null, `${prefix}_${id}_${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// MySQL adatbázis kapcsolat beállítása
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT || 3307 || 3306);
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "makett";

let adatbazisPool = null;

// SQL lekérdezés futtatása a pool-on keresztül
async function adatbazisLekeres(sql, parameterek = []) {
  if (!adatbazisPool) throw new Error("Nincs adatbázis pool inicializálva.");
  const [sorok] = await adatbazisPool.query(sql, parameterek);
  return sorok;
}

// JWT token generálása felhasználói adatokból (7 napos lejárat)
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

// Hitelesítés middleware – token ellenőrzés, tiltás kezelés, felhasználó betöltése
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ uzenet: "Hiányzó vagy érvénytelen token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_TITOK);

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

// Admin jogosultság ellenőrzés (szerepkor_id === 2)
function adminMiddleware(req, res, next) {
  if (req.felhasznalo?.szerepkor_id !== 2) {
    return res.status(403).json({ uzenet: "Admin jogosultság szükséges." });
  }
  next();
}

// Felhasználói aktivitás naplózása az adatbázisba
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

// CORS, JSON body parser és statikus fájlkiszolgálás beállítása
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

// Kérés-korlátozás (rate limit) az AI és auth végpontokra
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

// Kontextus objektum és route-ok regisztrálása
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

app.use(createAiRoutes(ctx));            // AI chatbot végpontok
app.use(createAuthRoutes(ctx));          // Regisztráció és bejelentkezés
app.use(createProfilRoutes(ctx));        // Profil megtekintés és szerkesztés
app.use(createMakettekRoutes(ctx));      // Makettek CRUD műveletei
app.use(createAdminRoutes(ctx));         // Admin felület (felhasználókezelés, jóváhagyás)
app.use(createVelemenyekRoutes(ctx));    // Vélemények és értékelések kezelése
app.use(createKedvencekRoutes(ctx));     // Kedvencek hozzáadása/eltávolítása
app.use(createEpitesiTippekRoutes(ctx)); // Építési tippek lekérdezése
app.use(createEpitesinaploRoutes(ctx));  // Építési napló bejegyzések kezelése
app.use(createUzenetekRoutes(ctx));      // Privát üzenetek küldése/fogadása
app.use(createForumRoutes(ctx));         // Fórum témák és hozzászólások
app.use(createRootRoutes(ctx));          // Gyökér és egyéb általános végpontok

// MySQL connection pool inicializálása
async function inicializalAdatbazis() {
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

  console.log("Adatbázis csatlakozás kész.");
}

export async function inicializalAdatbazisExport() {
  return inicializalAdatbazis();
}

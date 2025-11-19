import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const PORT = 3001;
const JWT_TITOK = "nagyon_titkos_jwt_kulcs";

const adatbazisPool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "makett",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function adatbazisLekeres(sql, parameterek = []) {
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
  return jwt.sign(payload, JWT_TITOK, { expiresIn: "2h" });
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

async function inicializalAdatbazis() {
  await adatbazisPool.query("CREATE DATABASE IF NOT EXISTS makett CHARACTER SET utf8mb4 COLLATE utf8mb4_hungarian_ci");
  await adatbazisPool.query("USE makett");

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
      kep_url VARCHAR(255) NULL
    )
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
    INSERT IGNORE INTO szerepkor (id, nev)
    VALUES (1, 'felhasznalo'), (2, 'admin')
  `);

  const adminEmail = "admin@pelda.hu";
  const adminJelszo = "admin123";
  const adminok = await adatbazisLekeres(
    "SELECT id FROM felhasznalo WHERE email = ?",
    [adminEmail]
  );
  if (adminok.length === 0) {
    const hash = await bcrypt.hash(adminJelszo, 10);
    await adatbazisLekeres(
      `INSERT INTO felhasznalo (felhasznalo_nev, email, jelszo_hash, szerepkor_id)
       VALUES (?, ?, ?, 2)`,
      ["Admin", adminEmail, hash]
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

  console.log("Adatbázis inicializálva.");
}

const app = express();
app.use(cors());
app.use(express.json());

// AUTH

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
      return res
        .status(400)
        .json({ uzenet: "Hibás email vagy jelszó." });
    }

    const user = felhasznalok[0];
    const egyezik = await bcrypt.compare(jelszo, user.jelszo_hash);
    if (!egyezik) {
      return res
        .status(400)
        .json({ uzenet: "Hibás email vagy jelszó." });
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

// Profil

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

// Makettek (publikus lista)

app.get("/api/makettek", async (req, res) => {
  try {
    const makettek = await adatbazisLekeres("SELECT * FROM makett");
    res.json(makettek);
  } catch (err) {
    console.error("Makettek lekérdezési hiba:", err);
    res.status(500).json({ uzenet: "Szerver hiba a makettek lekérdezése során." });
  }
});

// Makettek admin műveletek

app.post("/api/makettek", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { nev, gyarto, kategoria, skala, nehezseg, megjelenes_eve, kep_url } =
      req.body;

    const eredmeny = await adatbazisLekeres(
      `INSERT INTO makett
        (nev, gyarto, kategoria, skala, nehezseg, megjelenes_eve, kep_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nev, gyarto, kategoria, skala, nehezseg, megjelenes_eve, kep_url || null]
    );

    const ujId = eredmeny.insertId;
    const [uj] = await adatbazisLekeres(
      "SELECT * FROM makett WHERE id = ?",
      [ujId]
    );
    res.status(201).json(uj);
  } catch (err) {
    console.error("Makett létrehozási hiba:", err);
    res.status(500).json({ uzenet: "Szerver hiba a makett létrehozása során." });
  }
});

app.put("/api/makettek/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const makettId = Number(req.params.id);
    const { nev, gyarto, kategoria, skala, nehezseg, megjelenes_eve, kep_url } =
      req.body;

    await adatbazisLekeres(
      `UPDATE makett
       SET nev = ?, gyarto = ?, kategoria = ?, skala = ?, nehezseg = ?, megjelenes_eve = ?, kep_url = ?
       WHERE id = ?`,
      [nev, gyarto, kategoria, skala, nehezseg, megjelenes_eve, kep_url || null, makettId]
    );

    const [uj] = await adatbazisLekeres(
      "SELECT * FROM makett WHERE id = ?",
      [makettId]
    );
    res.json(uj);
  } catch (err) {
    console.error("Makett módosítási hiba:", err);
    res.status(500).json({ uzenet: "Szerver hiba a makett módosítása során." });
  }
});

// Vélemények (publikus lista + egy makett véleményei)

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
    res.status(500).json({ uzenet: "Szerver hiba a vélemények lekérdezése során." });
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
    res.status(500).json({ uzenet: "Szerver hiba a makett véleményeinek lekérdezése során." });
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
      return res.status(400).json({ uzenet: "Az értékelés 1 és 5 között lehet." });
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
    res.status(500).json({ uzenet: "Szerver hiba a vélemény mentése során." });
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
      return res.status(400).json({ uzenet: "Az értékelés 1 és 5 között lehet." });
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
    res.status(500).json({ uzenet: "Szerver hiba a vélemény módosítása során." });
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
    res.status(500).json({ uzenet: "Szerver hiba a vélemény törlése során." });
  }
});

// Kedvencek – csak bejelentkezve

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
    res.status(500).json({ uzenet: "Szerver hiba a kedvencek lekérdezése során." });
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
    res.status(500).json({ uzenet: "Szerver hiba a kedvencek módosítása során." });
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
    res.status(500).json({ uzenet: "Szerver hiba a kedvencek módosítása során." });
  }
});

app.get("/", (req, res) => {
  res.send("Makett API fut.");
});

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

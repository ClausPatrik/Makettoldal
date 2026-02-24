import express from "express";

export default function createUzenetekRoutes(ctx) {
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

  async function kuldEmailErtesitesFejlesztonek({ kuldoNev, kuldoEmail, targy, uzenet }) {
    try {
      // Ha nincs rendesen beállítva a mail, akkor ne dobjon hibát, csak lépjen tovább
      if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS || !process.env.MAIL_TO) {
        console.log("MAIL nincs beállítva rendesen (.env) -> kihagyva az email küldés.");
        return;
      }
  
      const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT || 587),
        secure: String(process.env.MAIL_SECURE || "false") === "true", // 465 esetén true
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });
  
      await transporter.sendMail({
        from: `"MakettMester" <${process.env.MAIL_USER}>`,
        to: process.env.MAIL_TO,
        subject: `MakettMester üzenet: ${String(targy || "").trim()}`,
        text:
          `Küldő: ${kuldoNev || "-"}\n` +
          `Email: ${kuldoEmail || "-"}\n\n` +
          `Üzenet:\n${uzenet || ""}\n`,
      });
    } catch (err) {
      console.error("Email küldés hiba:", err?.message || err);
    }
  }

  router.get("/api/uzenetek", authMiddleware, async (req, res) => {
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

  router.patch("/api/uzenetek/:id/olvasva", authMiddleware, async (req, res) => {
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

  return router;
}

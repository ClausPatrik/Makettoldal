import express from "express";

export default function createAiRoutes(ctx) {
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

  router.post("/api/ai/chat", aiLimiter, async (req, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ uzenet: "Ez a funkció jelenleg még nem működik." });
      }

      const { messages } = req.body || {};
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ uzenet: "Hibás kérés: Üzenet hiányzik." });
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

  return router;
}

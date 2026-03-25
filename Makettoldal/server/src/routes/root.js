import express from "express";

export default function createRootRoutes() {
  const router = express.Router();

  // Gyökér végpont – API állapot ellenőrzés
  router.get("/", (req, res) => res.send("Makett API fut."));

  return router;
}

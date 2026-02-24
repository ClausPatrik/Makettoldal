import { app, PORT, inicializalAdatbazisExport } from "./src/app.js";

inicializalAdatbazisExport()
  .then(() => {
    app.listen(PORT, () => console.log(`Backend fut: http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Adatbázis inicializálási hiba:", err?.message || err);
    process.exit(1);
  });

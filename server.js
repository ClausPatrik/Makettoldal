const mysql = require("mysql2");

const express = require("express");
const path = require("path");
const port = 3000;
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
/* 
const db = mysql.createConnection({
  host: "localhost",
  port: 3307, 
  user: "root",
  password: "",
  database: ""
});
 
db.connect(err => {
  if (err) console.error(" Adatbázis hiba:", err);
  else console.log(" MySQL kapcsolat létrejött!");
});
 
 
app.get("/felhasznalok", (req, res) => {
  db.query("SELECT * FROM felhasznalok", (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});
 
 
*/

app.listen(port, () => console.log("server running http://localhost:" + port));

 
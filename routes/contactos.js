const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const { isAuthenticated } = require("../middleware/auth");

// Conectar a la base de datos
const db = new sqlite3.Database("./models/contactos.db");

// Ruta protegida para mostrar contactos
router.get("/", isAuthenticated, (req, res) => {
  db.all("SELECT * FROM contactos", [], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Error al recuperar datos");
    } else {
      res.render("contactos", {
        contactos: rows,
        title: "Peluquería Versalles - Contáctanos",
        ogTitle: "Contáctanos | Peluquería Versalles",
        ogDescription: "¡Hablemos! Envíanos tus consultas y comentarios."
      });
    }
  });
});


module.exports = router;

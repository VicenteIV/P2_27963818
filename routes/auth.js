const express = require("express");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
require("dotenv").config();

const router = express.Router();
const db = new sqlite3.Database("./models/users.db");

// Crear tabla 'users' si no existe y agregar un usuario de prueba
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    (err) => {
      if (err) {
        console.error("Error al crear la tabla 'users':", err.message);
      } else {
        console.log("Tabla 'users' verificada o creada exitosamente.");
        
        // Verificar si existe un usuario de prueba
        const testUser = "vicente";
        const testPassword = "4321";
        db.get("SELECT * FROM users WHERE username = ?", [testUser], (err, row) => {
          if (err) {
            console.error("Error al buscar usuario de prueba:", err.message);
          } else if (!row) {
            // Insertar usuario de prueba si no existe
            bcrypt.hash(testPassword, 10, (err, hash) => {
              if (err) {
                console.error("Error al generar hash de contraseña:", err.message);
              } else {
                db.run(
                  `INSERT INTO users (username, password_hash) VALUES (?, ?)`,
                  [testUser, hash],
                  (err) => {
                    if (err) {
                      console.error("Error al insertar usuario de prueba:", err.message);
                    } else {
                      console.log("Usuario de prueba creado: vicente / 4321");
                    }
                  }
                );
              }
            });
          } else {
            console.log("Usuario de prueba ya existe.");
          }
        });
      }
    }
  );
});

// Serialización y deserialización de usuario
passport.serializeUser((user, done) => {
    done(null, user.id); // Guarda solo el id del usuario
  });
  
  passport.deserializeUser((id, done) => {
    db.get("SELECT * FROM users WHERE id = ?", [id], (err, user) => {
      done(err, user); // Recupera el usuario desde la base de datos
    });
  });
  

// Middleware para proteger rutas privadas
function ensureAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect("/login");
}

// Configurar Passport para Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      const email = profile.emails[0].value;
      db.get("SELECT * FROM users WHERE username = ?", [email], (err, user) => {
        if (err) return done(err);
        if (user) {
          return done(null, user);
        } else {
          db.run("INSERT INTO users (username) VALUES (?)", [email], function (err) {
            if (err) return done(err);
            return done(null, { id: this.lastID, username: email });
          });
        }
      });
    }
  )
);

// Ruta para manejar el login con usuario y contraseña
router.post("/login", (req, res, next) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) return next(err);
    if (!user) return res.status(401).send("Usuario no encontrado");

    bcrypt.compare(password, user.password_hash, (err, match) => {
      if (err) return next(err);
      if (match) {
        req.session.userId = user.id;
        return res.redirect("/contactos");
      } else {
        return res.status(401).send("Credenciales incorrectas");
      }
    });
  });
});

// Ruta para cerrar sesión
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Ruta para iniciar sesión con Google
router.get("/auth/google", passport.authenticate("google", { scope: ["email", "profile"] }));

// Callback de Google OAuth
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Después de la autenticación exitosa, redirige a /contactos
    req.session.userId = req.user.id; // Guardamos el ID del usuario en la sesión
    res.redirect("/contactos");
  }
);

// Proteger la ruta de contactos con el middleware de autenticación
router.get("/contactos", ensureAuthenticated, (req, res, next) => {
  db.all("SELECT * FROM contactos", (err, rows) => {
    if (err) return next(err);
    res.render("contactos", { contactos: rows });
  });
});

// Ruta para mostrar el formulario de inicio de sesión
router.get("/login", (req, res) => {
  res.render("login"); // Asegúrate de que "login.ejs" exista en tu carpeta de vistas
});

// Ruta para mostrar el formulario de registro
router.get("/registro", (req, res) => {
  res.render("registro"); // Asegúrate de tener un archivo `registro.ejs` en tu carpeta de vistas
});

// Ruta para manejar el registro de nuevos usuarios
router.post("/registro", (req, res, next) => {
  const { username, password } = req.body;

  // Verificar si el usuario ya existe
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) return next(err);
    if (user) {
      return res.status(400).send("El usuario ya existe. Prueba con otro nombre.");
    }

    // Hash de la contraseña
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return next(err);

      // Insertar el nuevo usuario en la base de datos
      db.run(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        [username, hash],
        (err) => {
          if (err) return next(err);

          // Registro exitoso, redirigir al login
          res.redirect("/");
        }
      );
    });
  });
});


module.exports = router;

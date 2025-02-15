require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { body, param, validationResult } = require("express-validator");

const app = express();
app.use(express.json());
app.use(helmet());

const corsOptions = {
  origin: "*", // Permite cualquier origen
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization",
};


app.use(cors(corsOptions));

// Rate Limiting: Máximo 100 peticiones cada 15 minutos
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: "Demasiadas solicitudes, intenta de nuevo más tarde",
});

app.use(limiter);

// Configuración de PostgreSQL con Supabase
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Middleware para verificar el token JWT
function verificarToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "Acceso denegado" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token inválido" });
    req.user = user;
    next();
  });
}

// Endpoint de prueba
app.get("/", (req, res) => {
  res.send("API conectada a Supabase 🚀");
});

// ✅ **GET - Obtener usuarios** (Protegido con autenticación y validación)
app.get("/users", verificarToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM User;");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error obteniendo usuarios");
  }
});

// ✅ **POST - Crear un usuario** (Validación de datos)
app.post(
  "/crear-usuario",
  [
    body("Name").isString().notEmpty(),
    body("Email").isEmail().notEmpty(),
    body("Phone").isMobilePhone(),
    body("NickName").isString().notEmpty(),
    body("password").isString().notEmpty(),
  ],
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const { Name, Email, phone, nickname, password } = req.body;

    try {
      // Hashear la contraseña antes de guardarla
      const saltRounds = 10; // Número de rondas para generar el hash
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const result = await pool.query(
        'INSERT INTO "User" ("Name", "Email", "Phone", "NickName", "password") VALUES ($1, $2, $3, $4, $5) RETURNING id_user',
        [nombre, email, phone, nickname, hashedPassword] // Guardamos la contraseña cifrada
      );

      res.status(201).json({ message: "Usuario creado", id: result.rows[0].id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al crear usuario" });
    }
  }
);

// ✅ **PUT - Actualizar un usuario** (Validación de ID y datos)
app.put(
  "/actualizar-usuario/:id",
  [
    param("id").isInt(),
    body("nombre").optional().isString(),
    body("email").optional().isEmail(),
    body("phone").optional().isMobilePhone(),
    body("nickname").optional().isString(),
  ],
  verificarToken,
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const { id } = req.params;
    const { nombre, email, phone, nickname } = req.body;

    try {
      const result = await pool.query(
        'UPDATE "User" SET "Name" = COALESCE($1, "Name"), "Email" = COALESCE($2, "Email"), "Phone" = COALESCE($3, "Phone"), "NickName" = COALESCE($4, "NickName") WHERE id = $5',
        [nombre, email, phone, nickname, id]
      );
      res.json({ message: "Usuario actualizado" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al actualizar usuario" });
    }
  }
);

// ✅ **DELETE - Eliminar un usuario** (Protegido con autenticación y validación)
app.delete(
  "/eliminar-usuario/:id",
  [param("id").isInt()],
  verificarToken,
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const { id } = req.params;

    try {
      await pool.query("DELETE FROM user WHERE id = $1", [id]);
      res.json({ message: "Usuario eliminado" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al eliminar usuario" });
    }
  }
);

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Verificar si el usuario existe en la base de datos
    const result = await pool.query("SELECT * FROM user WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const user = result.rows[0];

    // Comparar la contraseña ingresada con la almacenada en la base de datos
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // Generar Access Token (válido por 1 hora)
    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Generar Refresh Token (válido por 30 días)
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.REFRESH_SECRET,
      { expiresIn: "30d" }
    );

    res.json({ accessToken, refreshToken });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});


app.post("/refresh-token", (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: "Token de actualización requerido" });
  }

  jwt.verify(refreshToken, process.env.REFRESH_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Refresh Token inválido" });
    }

    // Crear un nuevo Access Token
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ accessToken: newAccessToken });
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
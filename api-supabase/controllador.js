const pool = require("./db/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

// ✅ **GET - Obtener usuarios** (Protegido con autenticación)
async function getUsers(req, res) {
  try {
    const result = await pool.query("SELECT * FROM \"User\";");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error obteniendo usuarios");
  }
}

// ✅ **POST - Crear un usuario** (Validación de datos)
async function createUser(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  const { Name, Email, phone, nickname, password } = req.body;

  try {
    // Hashear la contraseña antes de guardarla
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      'INSERT INTO "User" ("Name", "Email", "Phone", "NickName", "password") VALUES ($1, $2, $3, $4, $5) RETURNING id_user',
      [Name, Email, phone, nickname, hashedPassword] // Guardamos la contraseña cifrada
    );

    res.status(201).json({ message: "Usuario creado", id: result.rows[0].id_user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
}

// ✅ **PUT - Actualizar un usuario** (Validación de ID y datos)
async function updateUser(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  const { id } = req.params;
  const { Name, Email, phone, nickname } = req.body;

  try {
    const result = await pool.query(
      'UPDATE "User" SET "Name" = COALESCE($1, "Name"), "Email" = COALESCE($2, "Email"), "Phone" = COALESCE($3, "Phone"), "NickName" = COALESCE($4, "NickName") WHERE id_user = $5',
      [Name, Email, phone, nickname, id]
    );
    res.json({ message: "Usuario actualizado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
}

// ✅ **DELETE - Eliminar un usuario** (Protegido con autenticación)
async function deleteUser(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  const { id } = req.params;

  try {
    await pool.query("DELETE FROM \"User\" WHERE id_user = $1", [id]);
    res.json({ message: "Usuario eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
}

// ✅ **POST - Login** (Verificar usuario y generar tokens)
async function login(req, res) {
  const { email, password } = req.body;
  const emailTrimmed = email.trim();

  try {
    // Verificar si el usuario existe en la base de datos
    const result = await pool.query("SELECT * FROM \"User\" WHERE  \"Email\" = $1", [emailTrimmed]);

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
      { id: user.id_user, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Generar Refresh Token (válido por 30 días)
    const refreshToken = jwt.sign(
      { id: user.id_user, email: user.email },
      process.env.REFRESH_SECRET,
      { expiresIn: "30d" }
    );

    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
}

// ✅ **POST - Refresh Token** (Generar nuevo Access Token)
function refreshToken(req, res) {
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
      { id: user.id_user, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ accessToken: newAccessToken });
  });
}

module.exports = { getUsers, createUser, updateUser, deleteUser, login, refreshToken };
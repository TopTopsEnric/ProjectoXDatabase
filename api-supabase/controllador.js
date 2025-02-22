const pool = require("./db/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

// GET - Obtener usuarios (usando el ID del token)
async function getUsers(req, res) {
  try {
    // El ID del usuario viene del token JWT
    const userId = req.user.id;
    const result = await pool.query('SELECT "Name","Email","Phone","NickName" FROM "User" WHERE id_user = $1;', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error obteniendo usuario");
  }
}

// POST - Crear un usuario (sin retornar ID)
async function createUser(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  const { name, email, phone, nickname, password } = req.body;
  console.log("Valores:", name, email, phone, nickname, password);

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await pool.query(
      'INSERT INTO "User" ("Name", "Email", "Phone", "NickName", password) VALUES ($1, $2, $3, $4, $5)',
      [name, email, phone, nickname, hashedPassword]
    );

    res.status(201).json({ message: "Usuario creado exitosamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
}

// PUT - Actualizar un usuario (usando el ID del token)
async function updateUser(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  const userId = req.user.id; // Obtenemos el ID del token
  const { name, email, phone, nickname } = req.body;

  try {
    const result = await pool.query(
      'UPDATE "User" SET "Name" = COALESCE($1, "Name"), "Email" = COALESCE($2, "Email"), "Phone" = COALESCE($3, "Phone"), "NickName" = COALESCE($4, "NickName") WHERE id_user = $5',
      [name, email, phone, nickname, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ message: "Usuario actualizado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
}

// DELETE - Eliminar un usuario (usando el ID del token)
async function deleteUser(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  const userId = req.user.id; // Obtenemos el ID del token

  try {
    const result = await pool.query('DELETE FROM "User" WHERE id_user = $1', [userId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ message: "Usuario eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
}

// POST - Login (incluye ID en el token)
async function login(req, res) {
  const { email, password } = req.body;
  const emailTrimmed = email.trim();

  try {
    const result = await pool.query('SELECT * FROM "User" WHERE "Email" = $1', [emailTrimmed]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // Incluimos el ID en el payload del token
    const accessToken = jwt.sign(
      { 
        id: user.id_user,
        email: user.Email
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { 
        id: user.id_user,
        email: user.Email
      },
      process.env.REFRESH_SECRET,
      { expiresIn: "30d" }
    );

    res.json({ 
      accessToken, 
      refreshToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
}

// POST - Refresh Token (mantiene el ID en el nuevo token)
function refreshToken(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: "Token de actualización requerido" });
  }

  jwt.verify(refreshToken, process.env.REFRESH_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Refresh Token inválido" });
    }

    const newAccessToken = jwt.sign(
      { 
        id: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ accessToken: newAccessToken });
  });
}

// GET - Obtener estadísticas (usando el ID del token)
async function getDates(req, res) {
  const userId = req.user.id; // Obtenemos el ID del token
  
  try {
    const result = await pool.query('SELECT * FROM "Statics" WHERE user_id = $1;', [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error obteniendo estadísticas");
  }
}

// POST - Crear una partida
async function createPlay(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }
  
  const userId = req.user.id;
  const { soldier_used, shoot_made, ship_sinked, time_left, points, win } = req.body;

  try {
    await pool.query(
      'INSERT INTO "Play" (id_user, soldier_used, shoot_made, ship_sinked, time_left, points, win) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, soldier_used, shoot_made, ship_sinked, time_left, points, win]
    );

    res.status(201).json({ message: "Partida creada exitosamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear partida" });
  }
}

module.exports = { getUsers, createUser, updateUser, deleteUser, login, refreshToken, getDates,createPlay };
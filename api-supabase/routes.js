const express = require("express");
const { body, param } = require("express-validator");
const {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  login,
  refreshToken,
  getDates,
  createPlay,
} = require("./controllador");
const { verificarToken } = require("./auth/auth");

const router = express.Router();

// Ruta de prueba (no protegida)
router.get("/", (req, res) => {
  res.send("API conectada a Supabase 🚀");
});

// ✅ GET - Obtener usuarios (Protegido)
router.get(
  "/users",
  verificarToken,
  getUsers
);

// ✅ GET - Obtener datos (Protegido)
router.get(
  "/dates",
  verificarToken,
  getDates
);

// ✅ POST - Crear un usuario (Validación de datos)
router.post(
  "/crear-usuario",
  [
    body("name").isString().notEmpty(),
    body("email").isEmail().notEmpty(),
    body("phone").isString().notEmpty(),       
    body("nickname").isString().notEmpty(),
    body("password").isString().notEmpty(),
  ],
  createUser
);

// ✅ PUT - Actualizar un usuario (Validación de ID y datos, protegido)
router.put(
  "/actualizar-usuario",
  [
    body("name").optional().isString(),
    body("email").optional().isEmail(),
    body("phone").optional().isString(),
    body("nickname").optional().isString(),
  ],
  verificarToken,
  updateUser
);

// ✅ DELETE - Eliminar un usuario (Protegido)
router.delete(
  "/eliminar-usuario/:id",
  [param("id").isInt()],
  verificarToken,
  deleteUser
);

router.post(
  "/play",
  [
    body("soldier_used").isInt().notEmpty(),
    body("shoot_made").isInt().notEmpty(),
    body("ship_sinked").isInt().notEmpty(),
    body("time_left").isFloat().notEmpty(),
    body("points").isInt().notEmpty(),
    body("win").isBoolean().notEmpty(),
  ],
  verificarToken,
  createPlay
);

// POST - Login (Autenticación, sin token requerido)
router.post("/login", login);

// POST - Refresh Token
router.post("/refresh-token", refreshToken);

module.exports = router;
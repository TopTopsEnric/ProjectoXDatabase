require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de PostgreSQL con Supabase
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Endpoint de prueba
app.get("/", (req, res) => {
  res.send("API conectada a Supabase 🚀");
});

// Obtener datos de la tabla 'users'
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users;");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error obteniendo usuarios");
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
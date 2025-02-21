require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { body, param, validationResult } = require("express-validator");
const routes = require('./routes');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use('/', routes); 
app.use((req, res, next) => {
  console.log('Request Path:', req.path);
  console.log('Request Method:', req.method);
  next();
});
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.url 
  });
});


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

// Rutas

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});


module.exports = app;
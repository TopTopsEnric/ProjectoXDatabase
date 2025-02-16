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

// Rutas
app.use("/", routes);

module.exports = app;
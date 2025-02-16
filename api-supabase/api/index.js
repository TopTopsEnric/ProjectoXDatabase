
require("dotenv").config();
const app = require('../app');

// Para Vercel, necesitamos exportar la configuración del handler
module.exports = app;



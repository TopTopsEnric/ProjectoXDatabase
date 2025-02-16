const app = require('../app');
const port = process.env.PORT || 3000;

// Para Vercel, necesitamos exportar la configuración del handler
module.exports = app;

// Si estamos en desarrollo local, podemos iniciar el servidor
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

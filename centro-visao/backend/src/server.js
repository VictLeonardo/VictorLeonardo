/**
 * Servidor local de longa duração (desenvolvimento).
 * Para deploy serverless (Vercel), ver ../api/index.js, que importa o mesmo app.
 */

const createApp = require('./app');
const { DATA_SOURCE } = require('./repositories');

const app = createApp();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Centro Visão API rodando em http://localhost:${PORT} (fonte de dados: ${DATA_SOURCE})`);
});

module.exports = app;

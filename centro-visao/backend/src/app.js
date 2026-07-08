/**
 * Monta a aplicação Express (sem `listen`).
 *
 * Separado do server.js para poder ser reaproveitado tanto pelo servidor
 * local de longa duração quanto por um handler serverless (ex.: Vercel),
 * que importa este app diretamente.
 */

const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { DATA_SOURCE } = require('./repositories');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ ok: true, dataSource: DATA_SOURCE }));
  app.use('/api', routes);

  // handler de erro central
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.message || 'Erro interno' });
  });

  return app;
}

module.exports = createApp;

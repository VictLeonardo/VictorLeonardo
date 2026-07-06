/**
 * API do sistema Centro Visão (conciliação financeira + status de câmeras).
 * Fase mock: sem banco, dados simulados em memória via camada de repositório.
 */

const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { DATA_SOURCE } = require('./repositories');

const app = express();
const PORT = process.env.PORT || 4000;

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

app.listen(PORT, () => {
  console.log(`Centro Visão API rodando em http://localhost:${PORT} (fonte de dados: ${DATA_SOURCE})`);
});

module.exports = app;

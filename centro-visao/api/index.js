/**
 * Entrada serverless (Vercel) da API Centro Visão.
 *
 * Um app Express é um handler (req, res) válido, então basta exportá-lo.
 * O vercel.json reescreve `/api/*` para esta função; o Express faz o
 * roteamento interno (as rotas já são registradas sob `/api`).
 *
 * Observação: nesta fase os dados mock vivem em memória, então o log de
 * auditoria não persiste entre invocações frias. Para produção, plugue um
 * banco na camada `backend/src/repositories/` (a interface já está pronta).
 */

const createApp = require('../backend/src/app');

const app = createApp();

module.exports = app;

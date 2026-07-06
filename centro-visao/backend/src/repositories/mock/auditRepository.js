/**
 * Repositório MOCK de auditoria + log de aprendizado.
 *
 * Guarda em memória cada ação humana sobre uma exceção (quem, quando, por quê).
 * Este mesmo log é a base do "aprendizado": casos aprovados/recusados ficam
 * registrados de forma estruturada para depois recalibrar os pesos de confiança
 * (ver services/auditService.js -> learningSignals()).
 *
 * Em produção, isto vira uma tabela append-only (imutável).
 */

let auditLog = [];

module.exports = {
  async append(entry) {
    const record = { id: `AUD-${auditLog.length + 1}`, ...entry };
    auditLog.push(record);
    return JSON.parse(JSON.stringify(record));
  },

  async list() {
    return JSON.parse(JSON.stringify(auditLog));
  },

  async listByTransaction(transactionId) {
    return JSON.parse(JSON.stringify(auditLog.filter((e) => e.transactionId === transactionId)));
  },
};

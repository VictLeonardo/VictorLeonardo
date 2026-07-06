/**
 * Repositório MOCK de transações.
 *
 * Implementa a interface esperada pela aplicação. Mantém os dados em memória
 * (clonados do seed) para que ações de auditoria não corrompam o seed original.
 *
 * Para trocar por integração real (POS + ERP Presence Domain + Banco), basta
 * criar ../api/transactionRepository.js com os mesmos métodos e apontar o
 * seletor em ../index.js — nenhuma rota/serviço muda.
 */

const { transactions: seed } = require('../../data/seedTransactions');

// cópia mutável em memória
let transactions = JSON.parse(JSON.stringify(seed));

module.exports = {
  /** Retorna todas as transações (POS x ERP x Banco agrupadas). */
  async list() {
    return JSON.parse(JSON.stringify(transactions));
  },

  /** Retorna uma transação pelo id. */
  async getById(id) {
    const t = transactions.find((x) => x.id === id);
    return t ? JSON.parse(JSON.stringify(t)) : null;
  },

  /**
   * Persiste o resultado de uma decisão humana sobre a transação
   * (status: 'aprovada' | 'suspeita_fraude' | 'aguardando_loja').
   */
  async setDecision(id, decision) {
    const t = transactions.find((x) => x.id === id);
    if (!t) return null;
    t.decision = decision;
    return JSON.parse(JSON.stringify(t));
  },
};

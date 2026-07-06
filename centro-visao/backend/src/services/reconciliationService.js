/**
 * Serviço que junta repositório + motor de conciliação.
 * Fornece as views usadas pelas rotas (dashboard, fila de exceções, detalhe).
 */

const { transactionRepository, cameraRepository } = require('../repositories');
const { reconcileBatch } = require('../engine/reconciliation');
const { confidenceRules } = require('../config/confidenceRules');
const { stores } = require('../data/seedStores');

/** Concilia todas as transações e devolve transação + resultado juntos. */
async function reconcileAll(rules = confidenceRules) {
  const txs = await transactionRepository.list();
  const results = reconcileBatch(txs, rules);
  const byId = new Map(results.map((r) => [r.transactionId, r]));
  return txs.map((t) => ({ ...t, reconciliation: byId.get(t.id) }));
}

/** Fila de exceções: tudo que NÃO conciliou automaticamente (média + baixa). */
async function getExceptions(rules = confidenceRules) {
  const all = await reconcileAll(rules);
  return all
    .filter((t) => t.reconciliation.band !== 'high')
    .sort((a, b) => a.reconciliation.score - b.reconciliation.score); // piores primeiro
}

/** Métricas de topo para o dashboard. */
async function getDashboardMetrics(rules = confidenceRules) {
  const all = await reconcileAll(rules);
  const total = all.length;
  const auto = all.filter((t) => t.reconciliation.band === 'high').length;
  const medium = all.filter((t) => t.reconciliation.band === 'medium').length;
  const low = all.filter((t) => t.reconciliation.band === 'low').length;

  const cameras = await cameraRepository.list();
  const camApiActive = cameras.filter((c) => c.apiActive).length;

  const mappedStores = new Set(cameras.map((c) => c.storeId)).size;

  return {
    totalTransactions: total,
    autoReconciledPct: total ? Math.round((auto / total) * 100) : 0,
    autoReconciledCount: auto,
    pendingExceptions: medium + low,
    mediumCount: medium,
    lowCount: low,
    storesMapped: mappedStores,
    totalStores: stores.length,
    camerasApiActive: camApiActive,
    camerasTotal: cameras.length,
  };
}

module.exports = { reconcileAll, getExceptions, getDashboardMetrics };

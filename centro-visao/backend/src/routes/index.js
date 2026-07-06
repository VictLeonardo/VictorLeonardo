const express = require('express');
const router = express.Router();

const {
  getDashboardMetrics,
  getExceptions,
  reconcileAll,
} = require('../services/reconciliationService');
const { transactionRepository, cameraRepository } = require('../repositories');
const { recordAction, learningSignals } = require('../services/auditService');
const { auditRepository } = require('../repositories');
const { confidenceRules } = require('../config/confidenceRules');
const { stores } = require('../data/seedStores');

// wrapper para async handlers
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// --- Dashboard ---
router.get('/dashboard', wrap(async (req, res) => {
  const metrics = await getDashboardMetrics();
  const exceptions = await getExceptions();
  res.json({ metrics, exceptions });
}));

// --- Regras de confiança (leitura/ajuste) ---
router.get('/rules', (req, res) => res.json(confidenceRules));

// --- Transações conciliadas (todas) ---
router.get('/transactions', wrap(async (req, res) => {
  res.json(await reconcileAll());
}));

// --- Fila de exceções ---
router.get('/exceptions', wrap(async (req, res) => {
  res.json(await getExceptions());
}));

// --- Detalhe de uma transação/exceção (inclui auditoria) ---
router.get('/transactions/:id', wrap(async (req, res) => {
  const all = await reconcileAll();
  const tx = all.find((t) => t.id === req.params.id);
  if (!tx) return res.status(404).json({ error: 'Transação não encontrada' });
  const audit = await auditRepository.listByTransaction(tx.id);
  res.json({ ...tx, audit });
}));

// --- Ação sobre uma exceção (gera auditoria) ---
router.post('/transactions/:id/action', wrap(async (req, res) => {
  const { action, user, reason, scoreAtDecision, band } = req.body || {};
  const entry = await recordAction({
    transactionId: req.params.id,
    action,
    user,
    reason,
    scoreAtDecision,
    band,
  });
  res.status(201).json(entry);
}));

// --- Auditoria completa ---
router.get('/audit', wrap(async (req, res) => {
  res.json(await auditRepository.list());
}));

// --- Sinais de aprendizado (recalibração) ---
router.get('/learning', wrap(async (req, res) => {
  res.json(await learningSignals());
}));

// --- Câmeras ---
router.get('/cameras', wrap(async (req, res) => {
  res.json(await cameraRepository.list());
}));

// --- Lojas ---
router.get('/stores', (req, res) => res.json(stores));

module.exports = router;

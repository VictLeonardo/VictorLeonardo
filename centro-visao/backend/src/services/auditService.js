/**
 * Serviço de auditoria + aprendizado.
 *
 * Centraliza as três ações possíveis sobre uma exceção e garante que cada uma
 * gere um registro de auditoria (quem, quando, por quê). Também expõe os
 * "sinais de aprendizado": um resumo estruturado das decisões humanas que
 * permite, no futuro, recalibrar os pesos das regras de confiança.
 */

const { transactionRepository, auditRepository } = require('../repositories');

const ACTIONS = {
  aprovar: { decision: 'aprovada', label: 'Casamento aprovado' },
  fraude: { decision: 'suspeita_fraude', label: 'Marcada como suspeita de fraude' },
  pedir_dados: { decision: 'aguardando_loja', label: 'Solicitado mais dados à loja' },
};

/**
 * Registra uma ação humana sobre uma transação/exceção.
 * @param {object} p { transactionId, action, user, reason, scoreAtDecision, band }
 */
async function recordAction({ transactionId, action, user, reason, scoreAtDecision, band }) {
  const def = ACTIONS[action];
  if (!def) {
    const err = new Error(`Ação inválida: ${action}`);
    err.status = 400;
    throw err;
  }
  const tx = await transactionRepository.getById(transactionId);
  if (!tx) {
    const err = new Error(`Transação ${transactionId} não encontrada`);
    err.status = 404;
    throw err;
  }

  await transactionRepository.setDecision(transactionId, def.decision);

  const entry = await auditRepository.append({
    transactionId,
    action,
    decision: def.decision,
    label: def.label,
    user: user || 'operador',
    reason: reason || '',
    scoreAtDecision: scoreAtDecision ?? null,
    band: band ?? null,
    at: new Date().toISOString(),
  });

  return entry;
}

/**
 * Sinais de aprendizado: agrega as decisões para permitir recalibração.
 *
 * Ideia simples e explícita para começar: se muitos casos de faixa BAIXA/MÉDIA
 * acabam APROVADOS manualmente, o motor está sendo conservador demais — sinal
 * para revisar pesos/tolerâncias. Se casos de faixa ALTA aparecem como
 * suspeita de fraude, o motor está frouxo. Aqui só medimos; a recalibração
 * fica a cargo de quem administra as regras.
 */
async function learningSignals() {
  const log = await auditRepository.list();
  const byBand = {};
  for (const e of log) {
    const band = e.band || 'desconhecida';
    byBand[band] = byBand[band] || { aprovada: 0, suspeita_fraude: 0, aguardando_loja: 0, total: 0 };
    byBand[band][e.decision] = (byBand[band][e.decision] || 0) + 1;
    byBand[band].total += 1;
  }

  const hints = [];
  const low = byBand.low;
  if (low && low.total >= 3 && low.aprovada / low.total > 0.6) {
    hints.push('Muitas exceções de confiança BAIXA foram aprovadas manualmente — considere afrouxar tolerâncias ou revisar pesos.');
  }
  const high = byBand.high;
  if (high && high.suspeita_fraude > 0) {
    hints.push('Casos de confiança ALTA foram marcados como fraude — o motor pode estar frouxo; revise os pesos.');
  }

  return { totalDecisions: log.length, byBand, hints };
}

module.exports = { recordAction, learningSignals, ACTIONS };

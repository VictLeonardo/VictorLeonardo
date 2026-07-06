/**
 * Motor de conciliação financeira.
 *
 * Recebe uma transação com até três origens (POS, ERP, Banco) e produz um
 * resultado explicável: score final (0–100%), faixa de confiança e o
 * detalhamento por critério — porque quem revisa precisa entender *por que*
 * a confiança é aquela, não só o número.
 *
 * O motor é puro: não lê estado global além das regras passadas como
 * parâmetro. Isso mantém o cálculo testável e recalibrável.
 */

const { confidenceRules, classifyBand } = require('../config/confidenceRules');

/** Fatores de avaliação de cada critério. */
const FACTOR = { PASS: 1, PARTIAL: 0.5, FAIL: 0 };

function presentSources(sources) {
  return ['pos', 'erp', 'banco'].filter((k) => sources[k] && sources[k].present);
}

function daysBetween(a, b) {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Critério: valor bate entre as fontes presentes.
 */
function evalValueMatch(sources, present, tol) {
  if (present.length < 2) {
    return {
      factor: FACTOR.FAIL,
      status: 'fail',
      detail: 'Menos de duas fontes presentes — não há como cruzar o valor.',
    };
  }
  const values = present.map((k) => sources[k].amount);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const diff = +(max - min).toFixed(2);
  if (diff === 0) {
    return { factor: FACTOR.PASS, status: 'pass', detail: `Valores idênticos (R$ ${max.toFixed(2)}).` };
  }
  if (diff <= tol.valuePartialMaxDiff) {
    return {
      factor: FACTOR.PARTIAL,
      status: 'partial',
      detail: `Diferença de R$ ${diff.toFixed(2)} entre as fontes (dentro da tolerância).`,
    };
  }
  return {
    factor: FACTOR.FAIL,
    status: 'fail',
    detail: `Divergência de R$ ${diff.toFixed(2)} entre as fontes.`,
  };
}

/**
 * Critério: data bate entre as fontes presentes.
 */
function evalDateMatch(sources, present, tol) {
  if (present.length < 2) {
    return { factor: FACTOR.FAIL, status: 'fail', detail: 'Fonte insuficiente para comparar datas.' };
  }
  const dates = present.map((k) => sources[k].date);
  let maxDiff = 0;
  for (let i = 0; i < dates.length; i++) {
    for (let j = i + 1; j < dates.length; j++) {
      maxDiff = Math.max(maxDiff, daysBetween(dates[i], dates[j]));
    }
  }
  if (maxDiff === 0) {
    return { factor: FACTOR.PASS, status: 'pass', detail: 'Mesma data em todas as fontes.' };
  }
  if (maxDiff <= tol.datePartialMaxDays) {
    return {
      factor: FACTOR.PARTIAL,
      status: 'partial',
      detail: `Diferença de ${maxDiff} dia(s) — comum entre venda (POS) e liquidação bancária.`,
    };
  }
  return { factor: FACTOR.FAIL, status: 'fail', detail: `Diferença de ${maxDiff} dias entre as fontes.` };
}

/**
 * Critério: NSU é único (sem duplicidade no universo de transações).
 * `duplicateNsus` é um Set de NSUs que aparecem mais de uma vez.
 */
function evalNsuUnique(transaction, duplicateNsus) {
  const nsu = transaction.nsu;
  if (!nsu) {
    return { factor: FACTOR.FAIL, status: 'fail', detail: 'Transação sem NSU informado.' };
  }
  if (duplicateNsus.has(nsu)) {
    return {
      factor: FACTOR.FAIL,
      status: 'fail',
      detail: `NSU ${nsu} aparece em mais de uma transação — possível digitação duplicada ou fraude.`,
    };
  }
  return { factor: FACTOR.PASS, status: 'pass', detail: `NSU ${nsu} é único no lote.` };
}

/**
 * Critério: loja consistente entre as fontes.
 * Como cada loja tem CNPJ próprio, mercadoria de uma loja registrada em outra
 * não permite transferência direta e deve ser sinalizada.
 */
function evalStoreConsistent(sources, present) {
  if (present.length < 2) {
    return { factor: FACTOR.FAIL, status: 'fail', detail: 'Fonte insuficiente para checar a loja.' };
  }
  const stores = present.map((k) => sources[k].storeId);
  const allSame = stores.every((s) => s === stores[0]);
  if (allSame) {
    return { factor: FACTOR.PASS, status: 'pass', detail: 'Mesma loja (CNPJ) em todas as fontes.' };
  }
  return {
    factor: FACTOR.FAIL,
    status: 'fail',
    detail: 'Loja divergente entre as fontes — venda de uma loja registrada em outra (CNPJs distintos).',
  };
}

/**
 * Concilia uma única transação.
 *
 * @param {object} transaction  transação com { id, storeId, storeName, date, amount, nsu, sources }
 * @param {Set<string>} duplicateNsus  NSUs que se repetem no lote
 * @param {object} rules  regras de confiança (default: confidenceRules)
 */
function reconcileTransaction(transaction, duplicateNsus, rules = confidenceRules) {
  const { weights, tolerances, bands } = rules;
  const sources = transaction.sources || {};
  const present = presentSources(sources);

  const criteria = {
    valueMatch: evalValueMatch(sources, present, tolerances),
    dateMatch: evalDateMatch(sources, present, tolerances),
    nsuUnique: evalNsuUnique(transaction, duplicateNsus),
    storeConsistent: evalStoreConsistent(sources, present),
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let weighted = 0;
  const breakdown = [];
  for (const key of Object.keys(weights)) {
    const c = criteria[key];
    const contribution = weights[key] * c.factor;
    weighted += contribution;
    breakdown.push({
      criterion: key,
      weight: weights[key],
      status: c.status, // pass | partial | fail
      factor: c.factor,
      score: Math.round((weights[key] * c.factor / totalWeight) * 100),
      maxScore: Math.round((weights[key] / totalWeight) * 100),
      detail: c.detail,
    });
  }

  let score = Math.round((weighted / totalWeight) * 100);

  // Critérios críticos (ex.: NSU duplicado) limitam o score final, mesmo que
  // os demais critérios batam — é sinal de possível fraude/erro operacional.
  const criticalCriteria = rules.criticalCriteria || [];
  const criticalCap = rules.criticalFailCap ?? 35;
  const failedCritical = criticalCriteria.filter((key) => criteria[key] && criteria[key].status === 'fail');
  if (failedCritical.length && score > criticalCap) {
    score = criticalCap;
  }

  const band = classifyBand(score, bands);

  return {
    transactionId: transaction.id,
    score,
    band, // high | medium | low
    autoReconciled: band === 'high',
    missingSources: ['pos', 'erp', 'banco'].filter((k) => !present.includes(k)),
    reason: buildReason(band, breakdown),
    breakdown,
  };
}

/**
 * Texto explicativo do motivo — o "porquê" legível para quem revisa.
 */
function buildReason(band, breakdown) {
  const failing = breakdown.filter((b) => b.status === 'fail');
  const partial = breakdown.filter((b) => b.status === 'partial');
  const labels = {
    valueMatch: 'valor',
    dateMatch: 'data',
    nsuUnique: 'NSU',
    storeConsistent: 'loja',
  };
  if (band === 'high') {
    return partial.length
      ? `Conciliado automaticamente com pequenas divergências em: ${partial.map((b) => labels[b.criterion]).join(', ')}.`
      : 'Todos os critérios batem — conciliado automaticamente.';
  }
  const problems = failing.map((b) => labels[b.criterion]);
  if (band === 'low') {
    return `Exceção crítica: falha em ${problems.join(', ')}. Possível erro operacional ou fraude.`;
  }
  return `Revisão sugerida: divergência em ${problems.join(', ') || 'critérios secundários'}.`;
}

/**
 * Concilia um lote inteiro, pré-computando os NSUs duplicados uma única vez.
 */
function reconcileBatch(transactions, rules = confidenceRules) {
  const counts = new Map();
  for (const t of transactions) {
    if (!t.nsu) continue;
    counts.set(t.nsu, (counts.get(t.nsu) || 0) + 1);
  }
  const duplicateNsus = new Set([...counts.entries()].filter(([, n]) => n > 1).map(([nsu]) => nsu));

  return transactions.map((t) => reconcileTransaction(t, duplicateNsus, rules));
}

module.exports = { reconcileTransaction, reconcileBatch, presentSources };

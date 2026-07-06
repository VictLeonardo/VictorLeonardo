/**
 * Regras de confiança do motor de conciliação.
 *
 * IMPORTANTE: estes valores são AJUSTÁVEIS pelo usuário e NÃO devem ser
 * tratados como constantes fixas espalhadas pelo código. Toda a lógica de
 * score (engine/reconciliation.js) lê a partir daqui. No futuro, este objeto
 * pode vir de um banco de dados / tela de configuração sem mudar o motor.
 *
 * Pesos: quanto cada critério contribui para o score final (0–100%).
 * A soma dos pesos é normalizada, então não precisa fechar exatamente em 100.
 */

const confidenceRules = {
  weights: {
    valueMatch: 35, // valor bate entre as fontes
    dateMatch: 25, // data bate
    nsuUnique: 25, // NSU único, sem duplicidade
    storeConsistent: 15, // loja consistente entre as fontes
  },

  // Tolerâncias usadas na avaliação de cada critério.
  tolerances: {
    // diferença de valor (em reais) ainda considerada "casamento parcial"
    valuePartialMaxDiff: 1.0,
    // diferença de dias ainda considerada "casamento parcial"
    datePartialMaxDays: 1,
  },

  // Critérios "críticos": quando falham, são um sinal forte de erro
  // operacional ou fraude e não devem ser diluídos pelo peso. Ex.: NSU
  // duplicado. Se qualquer critério desta lista falhar, o score final é
  // limitado a `criticalFailCap`, empurrando a transação para a faixa baixa.
  criticalCriteria: ['nsuUnique'],
  criticalFailCap: 35,

  // Faixas de confiança (ajustáveis). Determinam o roteamento da transação.
  bands: {
    // Alta (>= high): concilia automaticamente, sem intervenção humana
    high: 75,
    // Média (>= medium e < high): fila de revisão com sugestão de casamento
    medium: 40,
    // Baixa (< medium): exceção crítica (possível erro operacional ou fraude)
  },
};

/**
 * Classifica um score numérico em uma faixa nomeada.
 */
function classifyBand(score, bands = confidenceRules.bands) {
  if (score >= bands.high) return 'high';
  if (score >= bands.medium) return 'medium';
  return 'low';
}

module.exports = { confidenceRules, classifyBand };

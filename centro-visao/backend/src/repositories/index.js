/**
 * Seletor de origem de dados (mock vs API real).
 *
 * Toda a aplicação importa os repositórios daqui — nunca diretamente de
 * mock/ ou api/. Assim, trocar a origem é uma mudança de uma linha (ou de
 * uma variável de ambiente), sem tocar em rotas nem no motor.
 *
 *   DATA_SOURCE=mock  (padrão)  -> dados simulados em memória
 *   DATA_SOURCE=api             -> integrações reais (POS/ERP/Banco/Câmeras)
 */

const DATA_SOURCE = process.env.DATA_SOURCE || 'mock';

function load(name) {
  if (DATA_SOURCE === 'api') {
    // Os adapters reais devem ser criados em ./api/<name>.js com a mesma interface.
    return require(`./api/${name}`);
  }
  return require(`./mock/${name}`);
}

module.exports = {
  DATA_SOURCE,
  transactionRepository: load('transactionRepository'),
  cameraRepository: load('cameraRepository'),
  // auditoria fica sempre em mock nesta fase (vira tabela append-only depois)
  auditRepository: require('./mock/auditRepository'),
};

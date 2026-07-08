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

// Requires estáticos dos mocks: garante que empacotadores (ex.: o bundler
// serverless do Vercel) incluam estes arquivos — requires com template string
// não são rastreados e ficariam de fora do deploy.
const mock = {
  transactionRepository: require('./mock/transactionRepository'),
  cameraRepository: require('./mock/cameraRepository'),
};

function load(name) {
  if (DATA_SOURCE === 'api') {
    // Adapters reais criados em ./api/<name>.js com a mesma interface.
    // Carregado dinamicamente só quando explicitamente habilitado.
    return require(`./api/${name}`);
  }
  return mock[name];
}

module.exports = {
  DATA_SOURCE,
  transactionRepository: load('transactionRepository'),
  cameraRepository: load('cameraRepository'),
  // auditoria fica sempre em mock nesta fase (vira tabela append-only depois)
  auditRepository: require('./mock/auditRepository'),
};

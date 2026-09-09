import { randomUUID } from 'node:crypto';
import { PrismaClient, type JourneyCategory, type Plan, type MemberStatus, type Tier } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seed de desenvolvimento. Gera uma comunidade com o tamanho e o formato do que
 * foi mapeado na plataforma atual — 36 membros, planos e status variados, doze
 * meses de historico — para que os graficos do admin tenham serie real para exibir.
 */

const PASSWORD = 'SmartMoney2026';

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length];
}

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const FIRST_NAMES = [
  'Ricardo', 'Ana Paula', 'Fernando', 'Juliana', 'Marcelo', 'Camila', 'Roberto', 'Patrícia',
  'Eduardo', 'Luciana', 'Gustavo', 'Renata', 'André', 'Beatriz', 'Rodrigo', 'Mariana',
  'Thiago', 'Carolina', 'Leonardo', 'Fernanda', 'Bruno', 'Vanessa', 'Felipe', 'Isabela',
  'Rafael', 'Priscila', 'Daniel', 'Aline', 'Vinícius', 'Tatiana', 'Alexandre', 'Simone',
  'Gabriel', 'Cristina', 'Henrique', 'Adriana',
];

const LAST_NAMES = [
  'Almeida', 'Barbosa', 'Carvalho', 'Duarte', 'Esteves', 'Fonseca', 'Gomes', 'Henriques',
  'Iglesias', 'Junqueira', 'Klein', 'Lacerda', 'Machado', 'Nogueira', 'Oliveira', 'Pacheco',
  'Queiroz', 'Ribeiro', 'Salgado', 'Tavares', 'Uchôa', 'Vasconcelos', 'Werneck', 'Xavier',
  'Yamamoto', 'Zanetti', 'Andrade', 'Bittencourt', 'Cardoso', 'Dantas', 'Estrela', 'Freitas',
  'Guimarães', 'Horta', 'Ipanema', 'Jordão',
];

const JOB_TITLES = [
  'CEO', 'Diretor Financeiro', 'Sócio-fundador', 'Gerente de Investimentos',
  'Consultor de Patrimônio', 'Diretor de Operações', 'Head de Planejamento Tributário',
  'Investidor', 'Family Officer', 'Diretor Comercial', 'Advogado Tributarista', 'CFO',
];

const COMPANIES = [
  'Grupo Ativa', 'Meridiano Participações', 'Vértice Capital', 'Nordeste Agro',
  'Prisma Consultoria', 'Atlas Holding', 'Solar Energia', 'Brava Investimentos',
  'Quantum Advisors', 'Orion Family Office', 'Costa Norte', 'Terra Firme Agro',
];

const CITIES = [
  ['São Paulo', 'SP'], ['Rio de Janeiro', 'RJ'], ['Belo Horizonte', 'MG'], ['Curitiba', 'PR'],
  ['Porto Alegre', 'RS'], ['Recife', 'PE'], ['Salvador', 'BA'], ['Brasília', 'DF'],
  ['Florianópolis', 'SC'], ['Goiânia', 'GO'],
] as const;

const SPECIALTIES = [
  'Planejamento tributário', 'Sucessão familiar', 'Renda variável', 'Fundos exclusivos',
  'Investimentos internacionais', 'Holding patrimonial', 'M&A', 'Gestão de caixa',
  'Previdência', 'Proteção patrimonial', 'Agronegócio', 'Real estate',
];

const JOURNEY_QUESTIONS: { category: JourneyCategory; prompt: string; helpText?: string; options: string[] }[] = [
  {
    category: 'CONTROLE',
    prompt: 'Com que frequência você acompanha o próprio fluxo de caixa pessoal?',
    helpText: 'Considere o controle da pessoa física, separado da empresa.',
    options: ['Não acompanho', 'De forma esporadica', 'Mensalmente', 'Semanalmente', 'Diariamente, com painel consolidado'],
  },
  {
    category: 'CONTROLE',
    prompt: 'Você mantem reserva de emergência equivalente a quantos meses de custo fixo?',
    options: ['Não tenho reserva', 'Menos de 3 meses', 'De 3 a 6 meses', 'De 6 a 12 meses', 'Mais de 12 meses'],
  },
  {
    category: 'CONTROLE',
    prompt: 'As finanças da pessoa física e da empresa estão separadas?',
    options: ['Totalmente misturadas', 'Parcialmente separadas', 'Separadas, sem formalização', 'Separadas e formalizadas', 'Separadas, formalizadas e auditadas'],
  },
  {
    category: 'INVESTIMENTOS',
    prompt: 'Você tem uma politica de investimento documentada?',
    helpText: 'Objetivos por horizonte, classes-alvo e bandas de rebalanceamento.',
    options: ['Não tenho', 'Tenho apenas na cabeca', 'Tenho um rascunho', 'Documentada e revisada anualmente', 'Documentada com testes de estresse'],
  },
  {
    category: 'INVESTIMENTOS',
    prompt: 'Qual a concentração do seu maior ativo na carteira total?',
    options: ['Acima de 70%', 'Entre 50% e 70%', 'Entre 30% e 50%', 'Entre 15% e 30%', 'Abaixo de 15%'],
  },
  {
    category: 'INVESTIMENTOS',
    prompt: 'Qual sua exposição a ativos internacionais?',
    options: ['Nenhuma', 'Abaixo de 5%', 'Entre 5% e 15%', 'Entre 15% e 30%', 'Acima de 30%, com hedge definido'],
  },
  {
    category: 'PROTECAO',
    prompt: 'Você mapeou os riscos que comprometeriam seu patrimônio hoje?',
    options: ['Nunca fiz', 'Tenho noção informal', 'Mapeei uma vez', 'Mapeado e revisado anualmente', 'Mapeado, revisado e com plano de mitigação'],
  },
  {
    category: 'PROTECAO',
    prompt: 'Como está a cobertura de seguros da família e do patrimônio?',
    options: ['Sem cobertura', 'Apenas o obrigatório', 'Vida e saude', 'Vida, saude e patrimônio', 'Cobertura completa com revisão anual'],
  },
  {
    category: 'PROTECAO',
    prompt: 'Existe acordo societário com cláusulas de saída e sucessão?',
    options: ['Não existe', 'Existe informalmente', 'Existe, desatualizado', 'Existe e está atualizado', 'Atualizado com governança formal'],
  },
  {
    category: 'TRIBUTACAO',
    prompt: 'Você conhece sua carga tributária efetiva sobre renda e patrimônio?',
    options: ['Não faco ideia', 'Tenho uma estimativa grosseira', 'Calculei uma vez', 'Acompanho anualmente', 'Acompanho e simulo cenários'],
  },
  {
    category: 'TRIBUTACAO',
    prompt: 'Com que frequência o regime tributário da sua PJ passa por revisão?',
    options: ['Nunca revisei', 'Somente na abertura', 'A cada dois ou três anos', 'Anualmente', 'Anualmente com simulação de alternativas'],
  },
  {
    category: 'TRIBUTACAO',
    prompt: 'Você avalia a eficiência tributária dos veículos de investimento que usa?',
    options: ['Não avalio', 'Avalio superficialmente', 'Avalio na hora de investir', 'Avalio periodicamente', 'Avalio com apoio especializado'],
  },
  {
    category: 'SUCESSAO',
    prompt: 'Existe um inventário formal do seu patrimônio?',
    options: ['Não existe', 'Existe parcialmente', 'Existe, desatualizado', 'Existe e está atualizado', 'Atualizado e compartilhado com a família'],
  },
  {
    category: 'SUCESSAO',
    prompt: 'Qual instrumento de sucessão você já implementou?',
    options: ['Nenhum', 'Apenas conversas em família', 'Testamento', 'Doação em vida ou holding', 'Holding com protocolo familiar'],
  },
  {
    category: 'SUCESSAO',
    prompt: 'Você já calculou o custo tributário da sua sucessão?',
    options: ['Nunca calculei', 'Tenho uma noção', 'Calculei uma vez', 'Calculo e acompanho', 'Calculo e tenho plano de mitigação'],
  },
];

const ARTICLES = [
  ['Reforma tributária: o que muda para holdings familiares', 'Tributário', 'A transição do IBS e da CBS altera a lógica de distribuição de lucros. Veja o que revisar ainda neste exercício.'],
  ['Come-cotas: quando o diferimento vale mais que a isenção', 'Investimentos', 'Comparamos três veículos para o mesmo objetivo de longo prazo e o resultado surpreende.'],
  ['O ciclo de juros e o custo de oportunidade do caixa', 'Mercado', 'Manter liquidez tem preço. Como dimensionar a reserva sem destruir retorno.'],
  ['Governança familiar antes do patrimônio', 'Estratégia', 'Estruturas societárias não resolvem conflito de expectativa. O protocolo familiar, sim.'],
  ['O viés do custo afundado nas decisões de venda', 'Comportamento', 'Por que investidores sofisticados seguram posições perdedoras por tempo demais.'],
  ['Holding patrimonial: quando ela realmente compensa', 'Tributário', 'O ponto de equilíbrio entre custo de manutenção e economia tributária efetiva.'],
  ['Alocação internacional sem ruído cambial', 'Investimentos', 'Instrumentos de hedge e o custo real de cada um para o investidor pessoa física.'],
  ['Leitura de balanço para sócios não financeiros', 'Estratégia', 'Os cinco indicadores que dizem se a empresa está gerando ou consumindo valor.'],
  ['Doação em vida com reserva de usufruto', 'Sucessão', 'O instrumento mais usado para antecipar sucessão e o que costuma dar errado nele.'],
  ['Fundos exclusivos abaixo de dez milhões fazem sentido?', 'Investimentos', 'A conta de custo fixo contra benefício tributário, com números.'],
  ['Pró-labore e distribuição: o desenho que minimiza a carga', 'Tributário', 'Como equilibrar as duas retiradas sem criar risco na fiscalização.'],
  ['O que o mercado precifica quando o fiscal aperta', 'Mercado', 'Curva de juros, prêmio de risco e o que historicamente veio depois.'],
  ['Seguro de vida como instrumento de liquidez sucessória', 'Proteção', 'Pagar o inventário sem vender ativo no pior momento.'],
  ['Concentração patrimonial: o risco que ninguém mede', 'Comportamento', 'A empresa que gerou o patrimônio costuma ser a maior posição da carteira.'],
  ['Previdência privada depois da reforma', 'Investimentos', 'Onde ela ainda ganha e onde virou produto caro.'],
  ['Acordo de sócios: as cláusulas que evitam litígio', 'Estratégia', 'Saída, avaliação e impasse. As três que resolvem a maioria dos conflitos.'],
  ['Renda fixa não é sinônimo de baixo risco', 'Investimentos', 'Marcação a mercado, crédito privado e o que o investidor descobre tarde.'],
  ['Planejamento sucessório para patrimônio no exterior', 'Sucessão', 'Duas jurisdições, duas regras de inventário e o custo de ignorar isso.'],
  ['O custo invisível da falta de governança', 'Estratégia', 'Decisão lenta, sócio desalinhado e o valuation que não se sustenta na due diligence.'],
  ['Tributação de criptoativos para pessoa física', 'Tributário', 'Obrigações acessórias, apuração e os erros mais comuns na declaração.'],
];

const ANALYSES = [
  ['Panorama macro do trimestre', 'Macro', 'Atividade, inflação e o cenário fiscal para os próximos seis meses.'],
  ['Small caps: assimetria ou armadilha', 'Ações', 'Múltiplos comprimidos e o que os balanços revelam sobre o setor.'],
  ['Fundos imobiliários: vacância e a taxa de juros', 'Fundos', 'Onde a distribuição de rendimento está sustentável.'],
  ['Dólar e o diferencial de juros', 'Câmbio', 'Cenários de curto prazo para a moeda e o impacto na carteira internacional.'],
  ['Tributação de investimentos no exterior', 'Internacional', 'O regime atual e as obrigações acessórias que costumam passar batido.'],
  ['Crédito privado: prêmio compensa o risco?', 'Fundos', 'Spreads atuais contra o histórico de inadimplência do segmento.'],
  ['Setor bancário: margem e inadimplência', 'Ações', 'O que os últimos resultados dizem sobre o ciclo de crédito.'],
  ['Curva de juros e o que ela precifica', 'Macro', 'Leitura da inclinação e os cenários implícitos nos vértices longos.'],
  ['Agronegócio: safra, câmbio e endividamento', 'Ações', 'Os três fatores que definem o resultado do setor neste ciclo.'],
  ['Renda fixa global para o investidor brasileiro', 'Internacional', 'Custo de hedge, tributação e o retorno que sobra.'],
  ['Fundos multimercado: dispersão de resultados', 'Fundos', 'Por que a média da indústria esconde o que importa na escolha.'],
  ['Imóveis comerciais e o trabalho híbrido', 'Fundos', 'Vacância estrutural ou ajuste temporário, com dados de ocupação.'],
  ['Cenário eleitoral e prêmio de risco', 'Macro', 'O que os ciclos anteriores mostram sobre volatilidade e retorno.'],
  ['Ouro e proteção em carteira brasileira', 'Internacional', 'Correlação com o real e o papel do metal na diversificação.'],
];

const VIDEOS = [
  ['Estruturas societárias para proteção patrimonial', 'Gestão', 2340],
  ['Como ler o relatório Focus sem se perder', 'Mercado', 1680],
  ['Entrevista: a visão de um family officer', 'Entrevista', 3120],
  ['Planejamento tributário na prática', 'Tributário', 2760],
  ['Montando a política de investimento da família', 'Investimentos', 2520],
  ['Due diligence: o que olhar antes de comprar', 'Gestão', 2940],
  ['Entrevista: sucessão em empresa familiar de terceira geração', 'Entrevista', 3480],
  ['Indicadores macro que realmente movem carteira', 'Mercado', 1980],
  ['Holding: montagem, custo e manutenção', 'Tributário', 3060],
  ['Alocação em cenário de juro alto', 'Investimentos', 2220],
  ['Entrevista: o erro que quase custou a empresa', 'Entrevista', 2880],
  ['Governança para empresas de médio porte', 'Gestão', 2640],
];

const PODCASTS = [
  ['O erro mais comum na sucessão familiar', 'Gestão', 1980, 'Smart Money Talks', 1],
  ['Renda fixa não é sinônimo de segurança', 'Investimentos', 2220, 'Smart Money Talks', 2],
  ['Quando vender uma empresa faz sentido', 'Gestão', 2580, 'Smart Money Talks', 3],
  ['O peso do imposto na decisão de investir', 'Tributário', 2100, 'Smart Money Talks', 4],
  ['Diversificar é diferente de espalhar', 'Investimentos', 1860, 'Smart Money Talks', 5],
  ['Conselho consultivo: quando faz diferença', 'Gestão', 2400, 'Smart Money Talks', 6],
  ['Abrindo a caixa: como monto minha carteira', 'Investimentos', 2760, 'Mesa Redonda SM', 1],
  ['Abrindo a caixa: o que eu faria diferente', 'Mercado', 2940, 'Mesa Redonda SM', 2],
  ['Abrindo a caixa: erros que me custaram caro', 'Comportamento', 2640, 'Mesa Redonda SM', 3],
];

const EBOOKS = [
  ['Guia da holding familiar', 'Sucessão', 68],
  ['Manual de proteção patrimonial', 'Proteção patrimonial', 84],
  ['Planejamento tributário para alta renda', 'Tributário', 52],
  ['Carteira internacional do zero', 'Investimentos', 96],
  ['Governança familiar na prática', 'Planejamento', 72],
  ['Checklist do acordo de sócios', 'Planejamento', 38],
  ['Sucessão sem litígio: casos e modelos', 'Sucessão', 110],
  ['Reserva de emergência para empresários', 'Investimentos', 44],
  ['Seguros como instrumento patrimonial', 'Proteção patrimonial', 58],
];

const LECTURES = [
  ['Reforma tributária: próximos passos', 'Tributário', -150, 'Dra. Helena Vasques', 'Advogada tributarista', 'Especialista em planejamento tributário para grupos familiares, com 20 anos de atuação junto a holdings.'],
  ['Sucessão em empresas familiares', 'Sucessão', -120, 'Dra. Helena Vasques', 'Advogada tributarista', 'Especialista em planejamento tributário para grupos familiares, com 20 anos de atuação junto a holdings.'],
  ['Construindo a política de investimento', 'Investimentos', -95, 'Marcos Tavares', 'Gestor de fundos multimercado', 'Gestor com 15 anos de mercado e passagem por casas de asset independentes.'],
  ['Leitura de balanço para sócios', 'Gestão', -75, 'Carla Bittencourt', 'Sócia de auditoria', 'Sócia de firma de auditoria com foco em empresas familiares de médio porte.'],
  ['Alocação em ciclo de juros alto', 'Investimentos', -60, 'Marcos Tavares', 'Gestor de fundos multimercado', 'Gestor com 15 anos de mercado e passagem por casas de asset independentes.'],
  ['Proteção patrimonial na prática', 'Proteção', -45, 'Dr. Rogério Lemos', 'Advogado societário', 'Advogado societário com atuação em reorganização de grupos empresariais.'],
  ['Investindo no exterior: primeiros passos', 'Internacional', -30, 'Ana Beatriz Nunes', 'Planejadora financeira', 'Planejadora financeira certificada, com foco em famílias com patrimônio internacional.'],
  ['Sucessão sem litígio: casos reais', 'Sucessão', -14, 'Dra. Helena Vasques', 'Advogada tributarista', 'Especialista em planejamento tributário para grupos familiares, com 20 anos de atuação junto a holdings.'],
  ['O que esperar do próximo ciclo de crédito', 'Macro', -5, 'Paulo Reimberg', 'Economista-chefe', 'Economista-chefe de casa de research independente, doutor em economia aplicada.'],
  ['Cenário macro e o próximo semestre', 'Macro', 8, 'Paulo Reimberg', 'Economista-chefe', 'Economista-chefe de casa de research independente, doutor em economia aplicada.'],
  ['Governança familiar: montando o conselho', 'Gestão', 19, 'Carla Bittencourt', 'Sócia de auditoria', 'Sócia de firma de auditoria com foco em empresas familiares de médio porte.'],
  ['Investimento no exterior na prática', 'Internacional', 26, 'Marcos Tavares', 'Gestor de fundos multimercado', 'Gestor com 15 anos de mercado e passagem por casas de asset independentes.'],
  ['Blindagem patrimonial: mitos e limites', 'Proteção', 40, 'Dr. Rogério Lemos', 'Advogado societário', 'Advogado societário com atuação em reorganização de grupos empresariais.'],
  ['Planejamento para o encerramento do exercício', 'Tributário', 54, 'Dra. Helena Vasques', 'Advogada tributarista', 'Especialista em planejamento tributário para grupos familiares, com 20 anos de atuação junto a holdings.'],
];

const REPLIES = [
  'Passei por situação parecida no ano passado. O que mais pesou foi o custo fixo anual, que só fecha a conta acima de um determinado patrimônio. Posso compartilhar os números que levantei.',
  'Concordo com a leitura acima. Vale considerar também o efeito da mudança regulatória em discussão antes de decidir.',
  'No meu caso a decisão mudou quando incluí o custo de oportunidade do tempo de gestão. Não é só o custo financeiro.',
  'Fiz esse mesmo exercício com meu assessor e cheguei a uma conclusão diferente. Depende muito do horizonte que você tem em mente.',
  'Recomendo levantar o número antes de decidir. Sem os valores na mesa, a discussão fica no achismo.',
  'Tenho uma planilha que compara os três cenários. Posso mandar por mensagem para quem quiser conferir.',
  'Atenção a um detalhe que quase me passou: a regra muda conforme a data de constituição. Vale confirmar com quem entende.',
  'Nós resolvemos isso formalizando em acordo. Custou uma reunião difícil, mas evitou anos de desgaste depois.',
  'Discordo em parte. Na minha experiência o benefício aparece só no longo prazo, e muita gente desiste antes.',
  'Excelente tópico. Estava com essa dúvida e não sabia como formular.',
  'Passei por isso com a empresa da família. O que funcionou foi trazer alguém de fora para mediar a conversa.',
  'Vale olhar o histórico dos últimos ciclos antes de concluir. O padrão se repete mais do que parece.',
  'Aqui a gente optou pelo caminho mais conservador e não me arrependo. Dormir tranquilo tem valor.',
  'Tenho um contato que resolveu exatamente esse ponto. Mando por mensagem.',
  'Cuidado com a comparação direta. Os dois casos parecem iguais mas a tributação é diferente.',
  'Levei essa questão para o meu conselho e a resposta foi unânime. Faz sentido investir tempo nisso agora.',
];

const TOPICS = [
  ['INVESTIMENTOS', 'Alguém já usou fundo exclusivo abaixo de R$ 10 milhões?', 'Estou avaliando montar um exclusivo, mas o custo fixo parece pesar demais nessa faixa. Quem já passou por isso conseguiu justificar o veículo? Interessa saber principalmente o custo total anual de manutenção.'],
  ['TRIBUTARIO', 'Distribuição de lucros: como vocês estão se preparando', 'Diante das mudanças em discussão, estou antecipando parte da distribuição ainda neste exercício. Faz sentido ou seria precipitado? Meu contador sugere aguardar a regulamentação.'],
  ['MERCADO', 'Leitura do último Copom', 'A comunicação veio mais dura do que o mercado esperava. Alguém mudou a duration da carteira depois disso?'],
  ['REDES', 'Grupo de estudo sobre governança familiar', 'Estou organizando um encontro mensal para discutir protocolo familiar e conselho consultivo. Quem tiver interesse, comenta aqui que monto a lista.'],
  ['OPORTUNIDADES', 'Busco sócio para operação de real estate em SP', 'Operação de retrofit em região central, ticket de entrada a partir de R$ 2 milhões, horizonte de 36 meses. Posso compartilhar o memorando com quem tiver interesse.'],
  ['TRIBUTARIO', 'Holding: vale a pena abaixo de R$ 5 milhões?', 'Fiz a conta de custo de manutenção contra economia tributária e não fechou no meu caso. Queria comparar com quem já montou.'],
  ['INVESTIMENTOS', 'Como vocês tratam a concentração na própria empresa', 'A empresa representa mais de 70% do meu patrimônio. Sei que é risco, mas vender participação não está no radar. Alguém encontrou um meio-termo?'],
  ['MERCADO', 'Crédito privado depois dos últimos eventos', 'Os spreads abriram bastante. Quem aumentou exposição e com que critério de seleção?'],
  ['REDES', 'Indicação de advogado tributarista em Minas', 'Estou reestruturando a holding e procuro alguém com experiência em grupo familiar. Aceito indicação por mensagem.'],
  ['OPORTUNIDADES', 'Participação em operação de energia solar', 'Projeto de geração distribuída no interior de SP, contratos de longo prazo já firmados. Busco dois sócios para completar a rodada.'],
  ['INVESTIMENTOS', 'Previdência ainda faz sentido para quem já tem PJ?', 'Com a tributação atual, fiquei em dúvida se o benefício fiscal compensa o custo do produto.'],
  ['TRIBUTARIO', 'Experiências com doação em vida', 'Estou avaliando antecipar parte da sucessão. Quem já fez, como lidou com a questão do usufruto?'],
  ['MERCADO', 'Alguém acompanhando o setor de saúde?', 'Os múltiplos comprimiram muito e alguns balanços parecem descolados do preço. Queria trocar impressões.'],
  ['REDES', 'Encontro presencial em São Paulo', 'Estou pensando em organizar um jantar informal para quem é de SP. Quem topa?'],
  ['OPORTUNIDADES', 'Empresa de tecnologia buscando investidor-anjo', 'Startup em fase de tração, receita recorrente crescendo. Posso apresentar os números para quem tiver interesse no segmento.'],
  ['INVESTIMENTOS', 'Hedge cambial: quanto custa na prática', 'Levantei o custo de três instrumentos diferentes e a diferença foi maior do que eu esperava. Compartilho a planilha se alguém quiser.'],
  ['TRIBUTARIO', 'Pró-labore x distribuição: qual proporção vocês usam', 'Meu contador sugere um desenho e um consultor sugere outro. Queria entender o critério de quem já testou.'],
  ['MERCADO', 'O que vocês estão fazendo com a reserva em caixa', 'Com o juro atual, manter liquidez ficou menos doloroso. Mas até quando faz sentido?'],
] as const;

/**
 * O seed apaga tudo antes de popular, entao rodar contra uma base em uso destroi
 * dados reais. Os registros de exemplo sao reconheciveis pelo dominio do e-mail;
 * qualquer conta fora desse padrao indica base real e interrompe a execucao.
 */
async function abortarSeBaseReal() {
  const reais = await prisma.user.count({
    where: {
      email: { not: { endsWith: '@exemplo.com.br' } },
      NOT: { email: 'admin@smboard.com.br' },
    },
  });

  if (reais === 0 || process.env.SEED_FORCE === '1') return;

  throw new Error(
    `Esta base tem ${reais} conta(s) que não vieram do seed.\n` +
      '  O seed apaga TODAS as tabelas antes de popular, então a execução foi interrompida.\n' +
      '  Para limpar sem repopular:   CONFIRMAR=SIM npm run db:clean\n' +
      '  Para popular mesmo assim:    SEED_FORCE=1 npm run db:seed',
  );
}

async function main() {
  await abortarSeBaseReal();

  console.log('Limpando dados existentes...');
  await prisma.$transaction([
    prisma.journeyAnswer.deleteMany(),
    prisma.journeySubmission.deleteMany(),
    prisma.journeyQuestion.deleteMany(),
    prisma.topicReply.deleteMany(),
    prisma.topic.deleteMany(),
    prisma.notificationRecipient.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.contentView.deleteMany(),
    prisma.activityLog.deleteMany(),
    prisma.content.deleteMany(),
    prisma.lecture.deleteMany(),
    prisma.speaker.deleteMany(),
    prisma.emailLog.deleteMany(),
    prisma.whatsappLog.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.wahaHealthCheck.deleteMany(),
    prisma.messageTemplate.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  console.log('Criando administrador...');
  const admin = await prisma.user.create({
    data: {
      name: 'Victor Leonardo',
      email: 'admin@smboard.com.br',
      passwordHash,
      role: 'ADMIN',
      status: 'ATIVO',
      plan: 'CORTESIA',
      tier: 'VIP',
      isPartner: true,
      jobTitle: 'Gestor da comunidade',
      company: 'SM Smart Money',
      phone: '5511999990000',
      joinedAt: daysAgo(400),
      lastLoginAt: new Date(),
      profile: {
        create: {
          slug: 'victor-leonardo',
          isPublic: true,
          bio: 'Responsável pela curadoria e pela operação da comunidade SM Smart Money.',
          city: 'São Paulo',
          state: 'SP',
          specialties: ['Estratégia', 'Educação financeira'],
          activatedAt: daysAgo(390),
        },
      },
    },
  });

  console.log('Criando 36 membros...');
  const plans: Plan[] = ['PADRAO', 'PADRAO', 'PADRAO', 'COM_DESCONTO', 'PADRAO', 'CORTESIA'];

  // indice do membro -> ha quantos dias ele cancelou. Os valores sao menores que
  // o tempo de casa do respectivo indice, entao a saida nunca antecede a entrada.
  const CANCELED_AFTER_DAYS = new Map([
    [3, 250],
    [9, 180],
    [16, 120],
    [24, 45],
    [26, 40],
  ]);
  const members = [];

  for (let i = 0; i < 36; i += 1) {
    const name = `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, i * 7 + 3)}`;
    const [city, state] = pick(CITIES, i * 3);

    // Distribuicao: 29 ativos, 5 cancelados, 2 pendentes.
    const status: MemberStatus =
      i >= 34 ? 'PENDENTE' : CANCELED_AFTER_DAYS.has(i) ? 'CANCELADO' : 'ATIVO';
    const plan = pick(plans, i);
    const tier: Tier = i % 5 === 0 ? 'VIP' : 'PADRAO';

    // Entradas ao longo de 12 meses com curva de aceleracao: o expoente faz os
    // meses recentes receberem mais gente que os antigos, entao o grafico de
    // crescimento conta uma historia em vez de virar uma reta.
    const joinedDays = Math.round(360 * ((36 - i) / 36) ** 1.35);
    const joinedAt = daysAgo(joinedDays);

    // Saidas espalhadas por meses alternados; cada data e' sempre posterior a
    // entrada do proprio membro.
    const canceledAfter = CANCELED_AFTER_DAYS.get(i);
    const canceledAt = canceledAfter != null ? daysAgo(canceledAfter) : null;
    if (canceledAt && canceledAt <= joinedAt) {
      throw new Error(`Membro ${i}: data de cancelamento anterior a de entrada.`);
    }

    const publicProfile = i % 3 !== 2;

    const member = await prisma.user.create({
      data: {
        name,
        email: `${slugify(name)}@exemplo.com.br`,
        passwordHash,
        role: 'MEMBER',
        status,
        plan,
        tier,
        isPartner: i % 11 === 0,
        jobTitle: pick(JOB_TITLES, i),
        company: pick(COMPANIES, i * 5),
        phone: `5511${String(900000000 + i * 1013).slice(0, 9)}`,
        joinedAt,
        canceledAt,
        lastLoginAt: status === 'ATIVO' ? daysAgo(i % 14) : null,
        profile: {
          create: {
            slug: slugify(name),
            isPublic: publicProfile && status !== 'PENDENTE',
            bio:
              i % 2 === 0
                ? `${pick(JOB_TITLES, i)} com atuação em ${pick(SPECIALTIES, i)}. Busca trocar experiência sobre estrutura patrimonial e alocação de longo prazo.`
                : null,
            city,
            state,
            specialties: [pick(SPECIALTIES, i), pick(SPECIALTIES, i * 3 + 1)],
            linkedinUrl: i % 2 === 0 ? `https://linkedin.com/in/${slugify(name)}` : null,
            showWhatsapp: i % 6 === 0,
            inviteSentAt: publicProfile ? daysAgo(joinedDays) : null,
            activatedAt:
              publicProfile && status !== 'PENDENTE'
                ? daysAgo(Math.max(1, joinedDays - 2))
                : null,
          },
        },
      },
    });

    members.push(member);
  }

  const activeMembers = members.filter((m) => m.status === 'ATIVO');

  console.log('Criando questionário do Smart Money Journey...');
  const questionsByCategory = new Map<JourneyCategory, number>();
  const questions = [];
  for (const item of JOURNEY_QUESTIONS) {
    const order = (questionsByCategory.get(item.category) ?? 0) + 1;
    questionsByCategory.set(item.category, order);

    questions.push(
      await prisma.journeyQuestion.create({
        data: {
          category: item.category,
          order,
          prompt: item.prompt,
          helpText: item.helpText ?? null,
          // O indice da opcao e' a nota: 0 (pior) a 4 (melhor).
          options: item.options.map((label, index) => ({ label, score: index })),
        },
      }),
    );
  }

  console.log('Gerando diagnósticos concluídos...');
  // 21 dos 29 ativos concluiram: taxa de ~72%, proxima do que se espera na operacao real.
  for (const [index, member] of activeMembers.slice(0, 21).entries()) {
    const answers = questions.map((question, qi) => {
      const options = question.options as { label: string; score: number }[];
      const optionIndex = (index * 3 + qi * 2) % options.length;
      return {
        questionId: question.id,
        category: question.category,
        optionIndex,
        score: options[optionIndex].score,
      };
    });

    const totals = new Map<JourneyCategory, { sum: number; count: number }>();
    for (const answer of answers) {
      const current = totals.get(answer.category) ?? { sum: 0, count: 0 };
      current.sum += answer.score;
      current.count += 1;
      totals.set(answer.category, current);
    }

    const categoryScores: Record<string, number> = {};
    for (const [category, { sum, count }] of totals) {
      categoryScores[category] = Math.round((sum / (count * 4)) * 100);
    }
    const values = Object.values(categoryScores);
    const overallScore = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

    const submission = await prisma.journeySubmission.create({
      data: {
        userId: member.id,
        startedAt: daysAgo(60 + index),
        completedAt: daysAgo(58 + index),
        overallScore,
        categoryScores,
      },
    });

    await prisma.journeyAnswer.createMany({
      data: answers.map((a) => ({
        submissionId: submission.id,
        questionId: a.questionId,
        optionIndex: a.optionIndex,
        score: a.score,
      })),
    });

    // Um terco dos membros ganha um diagnostico anterior, com nota menor. Sem
    // isso a tela nunca mostra evolucao nem historico.
    if (index % 3 === 0) {
      const anterior: Record<string, number> = {};
      for (const [categoria, nota] of Object.entries(categoryScores)) {
        anterior[categoria] = Math.max(8, nota - 9 - (index % 7));
      }
      const notasAnteriores = Object.values(anterior);
      await prisma.journeySubmission.create({
        data: {
          userId: member.id,
          startedAt: daysAgo(220 + index),
          completedAt: daysAgo(218 + index),
          overallScore: Math.round(
            notasAnteriores.reduce((a, b) => a + b, 0) / notasAnteriores.length,
          ),
          categoryScores: anterior,
        },
      });
    }
  }

  console.log('Criando speakers e palestras...');
  const speakerIds = new Map<string, string>();
  for (const [title, theme, offsetDays, speakerName, speakerJob, speakerBio] of LECTURES) {
    let speakerId = speakerIds.get(speakerName as string);
    if (!speakerId) {
      const speaker = await prisma.speaker.create({
        data: { name: speakerName as string, jobTitle: speakerJob as string, bio: speakerBio as string },
      });
      speakerId = speaker.id;
      speakerIds.set(speakerName as string, speaker.id);
    }

    const days = offsetDays as number;
    const startsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    startsAt.setHours(19, 30, 0, 0);

    await prisma.lecture.create({
      data: {
        slug: slugify(title as string),
        title: title as string,
        description: `Sessão ao vivo com espaço para perguntas dos membros. Tema: ${theme}.`,
        theme: theme as string,
        speakerId,
        startsAt,
        durationMin: 90,
        liveUrl: days > 0 ? 'https://meet.example.com/sm-smart-money' : null,
        recordingUrl: days < 0 ? 'https://player.vimeo.com/video/76979871' : null,
        status: 'PUBLICADO',
        visibility: days === -20 ? 'VIP' : 'TODOS',
      },
    });
  }

  console.log('Criando conteúdo editorial...');
  const contents = [];

  for (const [index, [title, category, excerpt]] of ARTICLES.entries()) {
    contents.push(
      await prisma.content.create({
        data: {
          type: 'ARTIGO',
          slug: slugify(title),
          title,
          excerpt,
          category,
          body: `<p>${excerpt}</p><h2>Por que isso importa agora</h2><p>A combinação de mudança regulatoria e custo de capital elevado muda a ordem das prioridades para quem administra patrimônio relevante. O ponto de partida não é o produto, é a estrutura.</p><p>Ao longo deste material, tratamos do impacto prático da decisão, dos números que sustentam a análise e das perguntas que valem ser levadas ao seu assessor.</p><h3>O que revisar ainda neste exercício</h3><ul><li>Estrutura societária e o custo efetivo de manutenção;</li><li>Distribuição de resultados e o momento de faze-la;</li><li>Veículos de investimento e a eficiência tributária de cada um.</li></ul><blockquote>Estrutura sem objetivo definido é custo. Objetivo sem estrutura é risco.</blockquote><p>A recomendação geral é revisar a estrutura a cada ciclo de doze meses, ou sempre que houver evento societário relevante.</p>`,
          status: 'PUBLICADO',
          visibility: index === 1 ? 'VIP' : 'TODOS',
          publishedAt: daysAgo(index * 11 + 2),
          authorName: index % 2 === 0 ? 'Curadoria SM Smart Money' : 'Dra. Helena Vasques',
          authorId: admin.id,
          readingMinutes: 6 + (index % 4),
        },
      }),
    );
  }

  for (const [index, [title, category, excerpt]] of ANALYSES.entries()) {
    contents.push(
      await prisma.content.create({
        data: {
          type: 'ANALISE',
          slug: slugify(title),
          title,
          excerpt,
          category,
          body: `<p>${excerpt}</p><p>O relatório completo detalha as premissas, os cenários considerados e a sensibilidade de cada projeção.</p>`,
          status: 'PUBLICADO',
          visibility: index === 4 ? 'VIP' : 'TODOS',
          publishedAt: daysAgo(index * 7 + 1),
          authorName: 'Paulo Reimberg',
          authorId: admin.id,
        },
      }),
    );
  }

  for (const [index, [title, category, duration]] of VIDEOS.entries()) {
    contents.push(
      await prisma.content.create({
        data: {
          type: 'VIDEO',
          slug: slugify(title as string),
          title: title as string,
          excerpt: 'Sessão gravada com os principais pontos práticos do tema.',
          category: category as string,
          status: 'PUBLICADO',
          visibility: 'TODOS',
          publishedAt: daysAgo(index * 9 + 4),
          mediaUrl: 'https://player.vimeo.com/video/76979871',
          durationSecs: duration as number,
          authorId: admin.id,
        },
      }),
    );
  }

  for (const [index, [title, category, duration, series, episode]] of PODCASTS.entries()) {
    contents.push(
      await prisma.content.create({
        data: {
          type: 'PODCAST',
          slug: slugify(title as string),
          title: title as string,
          excerpt: 'Episodio do podcast da comunidade, com convidados do mercado.',
          category: category as string,
          status: 'PUBLICADO',
          visibility: 'TODOS',
          publishedAt: daysAgo(index * 14 + 6),
          mediaUrl: 'https://file-examples.com/storage/audio/sample.mp3',
          durationSecs: duration as number,
          seriesName: series as string,
          episodeNumber: episode as number,
          authorId: admin.id,
        },
      }),
    );
  }

  for (const [index, [title, category, pages]] of EBOOKS.entries()) {
    contents.push(
      await prisma.content.create({
        data: {
          type: 'EBOOK',
          slug: slugify(title as string),
          title: title as string,
          excerpt: 'Material completo para consulta, com checklists e modelos práticos.',
          category: category as string,
          status: 'PUBLICADO',
          visibility: index === 3 ? 'VIP' : 'TODOS',
          publishedAt: daysAgo(index * 21 + 10),
          fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          pageCount: pages as number,
          authorName: 'SM Smart Money',
          authorId: admin.id,
        },
      }),
    );
  }

  // Um rascunho e um agendamento para o admin ver os dois estados no CMS.
  await prisma.content.create({
    data: {
      type: 'ARTIGO',
      slug: 'previa-do-relatorio-anual',
      title: 'Prévia do relatório anual da comunidade',
      excerpt: 'Rascunho em preparação pela curadoria.',
      category: 'Estratégia',
      body: '<p>Texto em elaboração.</p>',
      status: 'RASCUNHO',
      visibility: 'TODOS',
      authorId: admin.id,
    },
  });

  const scheduledFor = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  await prisma.content.create({
    data: {
      type: 'ANALISE',
      slug: 'previa-macro-do-proximo-mes',
      title: 'Prévia macro do próximo mês',
      excerpt: 'Publicação agendada — invisível no portal até a data marcada.',
      category: 'Macro',
      body: '<p>Conteúdo agendado.</p>',
      status: 'PUBLICADO',
      visibility: 'TODOS',
      publishedAt: scheduledFor,
      scheduledFor,
      authorName: 'Paulo Reimberg',
      authorId: admin.id,
    },
  });

  console.log('Gerando visualizações e atividade...');
  const sections = ['Dashboard', 'Conteúdo Exclusivo', 'Análises de Mercado', 'Palestras', 'Vídeos & Podcasts', 'E-books', 'Comunidade VIP'];

  for (const [memberIndex, member] of activeMembers.entries()) {
    const viewCount = 4 + (memberIndex % 9);
    for (let i = 0; i < viewCount; i += 1) {
      const content = pick(contents, memberIndex * 5 + i * 3);
      await prisma.contentView.upsert({
        where: { userId_contentId: { userId: member.id, contentId: content.id } },
        create: {
          userId: member.id,
          contentId: content.id,
          completed: i % 3 === 0,
          viewedAt: daysAgo((memberIndex + i) % 28),
        },
        update: {},
      });
    }

    for (let i = 0; i < 6; i += 1) {
      const section = pick(sections, memberIndex + i * 2);
      await prisma.activityLog.create({
        data: {
          userId: member.id,
          section,
          path: `/${slugify(section)}`,
          createdAt: daysAgo((memberIndex + i) % 30),
        },
      });
    }
  }

  console.log('Criando tópicos da comunidade...');
  for (const [index, [category, title, body]] of TOPICS.entries()) {
    const author = activeMembers[index % activeMembers.length];
    const topic = await prisma.topic.create({
      data: {
        authorId: author.id,
        category,
        title,
        body,
        pinned: index === 0,
        isVip: index === 4,
        createdAt: daysAgo(index * 4 + 1),
      },
    });

    for (let r = 0; r < 3 + (index % 5); r += 1) {
      const replier = activeMembers[(index * 3 + r + 1) % activeMembers.length];
      await prisma.topicReply.create({
        data: {
          topicId: topic.id,
          authorId: replier.id,
          body: pick(REPLIES, index * 7 + r * 3),
          createdAt: daysAgo(Math.max(0, index * 4 - r)),
        },
      });
    }
  }

  console.log('Criando notificações...');
  const notification = await prisma.notification.create({
    data: {
      title: 'Nova palestra confirmada',
      body: 'Cenário macro e o próximo semestre, com Paulo Reimberg. Adicione ao seu calendário.',
      url: '/palestras',
      audience: 'TODOS',
      createdById: admin.id,
      sentAt: daysAgo(3),
      createdAt: daysAgo(3),
    },
  });

  await prisma.notificationRecipient.createMany({
    data: activeMembers.map((m, i) => ({
      notificationId: notification.id,
      userId: m.id,
      readAt: i % 3 === 0 ? daysAgo(2) : null,
    })),
    skipDuplicates: true,
  });

  const vipNotification = await prisma.notification.create({
    data: {
      title: 'Relatório exclusivo VIP disponível',
      body: 'A análise sobre tributação de investimentos no exterior já está no portal.',
      url: '/analises',
      audience: 'VIP',
      createdById: admin.id,
      sentAt: daysAgo(9),
      createdAt: daysAgo(9),
    },
  });

  await prisma.notificationRecipient.createMany({
    data: activeMembers
      .filter((m) => m.tier === 'VIP')
      .map((m) => ({ notificationId: vipNotification.id, userId: m.id })),
    skipDuplicates: true,
  });

  // Demais avisos, cobrindo os tres publicos e os estados enviada, agendada e
  // rascunho, para a tela do admin mostrar as tres situacoes.
  const outrosAvisos: {
    title: string;
    body: string;
    url: string | null;
    audience: 'TODOS' | 'VIP' | 'POR_PLANO';
    planFilter: Plan | null;
    dias: number;
    enviada: boolean;
    agendada?: number;
  }[] = [
    {
      title: 'Novo e-book na biblioteca',
      body: 'Governança familiar na prática já está disponível para download.',
      url: '/ebooks',
      audience: 'TODOS',
      planFilter: null,
      dias: 16,
      enviada: true,
    },
    {
      title: 'Smart Money Journey: refaça e compare',
      body: 'Quem concluiu há mais de 90 dias já pode refazer o diagnóstico e medir a evolução.',
      url: '/journey',
      audience: 'TODOS',
      planFilter: null,
      dias: 27,
      enviada: true,
    },
    {
      title: 'Encontro presencial em São Paulo',
      body: 'Confirmações abertas no fórum da comunidade. Vagas limitadas.',
      url: '/comunidade',
      audience: 'VIP',
      planFilter: null,
      dias: 5,
      enviada: true,
    },
    {
      title: 'Condição especial de renovação',
      body: 'Aviso direcionado aos membros do plano com desconto.',
      url: null,
      audience: 'POR_PLANO',
      planFilter: 'COM_DESCONTO',
      dias: 12,
      enviada: true,
    },
    {
      title: 'Nova análise macro na próxima semana',
      body: 'O relatório trimestral será publicado na terça.',
      url: '/analises',
      audience: 'TODOS',
      planFilter: null,
      dias: 0,
      enviada: false,
      agendada: 4,
    },
    {
      title: 'Rascunho: pesquisa de satisfação',
      body: 'Texto em revisão pela curadoria, ainda não disparado.',
      url: null,
      audience: 'TODOS',
      planFilter: null,
      dias: 2,
      enviada: false,
    },
  ];

  for (const aviso of outrosAvisos) {
    const criada = await prisma.notification.create({
      data: {
        title: aviso.title,
        body: aviso.body,
        url: aviso.url,
        audience: aviso.audience,
        planFilter: aviso.planFilter,
        createdById: admin.id,
        sentAt: aviso.enviada ? daysAgo(aviso.dias) : null,
        scheduledFor: aviso.agendada
          ? new Date(Date.now() + aviso.agendada * 24 * 60 * 60 * 1000)
          : null,
        createdAt: daysAgo(aviso.dias + 1),
      },
    });

    if (!aviso.enviada) continue;

    const publico = activeMembers.filter((m) =>
      aviso.audience === 'VIP'
        ? m.tier === 'VIP'
        : aviso.audience === 'POR_PLANO'
          ? m.plan === aviso.planFilter
          : true,
    );

    await prisma.notificationRecipient.createMany({
      data: publico.map((m, i) => ({
        notificationId: criada.id,
        userId: m.id,
        readAt: i % 2 === 0 ? daysAgo(aviso.dias - 1 > 0 ? aviso.dias - 1 : 0) : null,
      })),
      skipDuplicates: true,
    });
  }

  console.log('Criando templates de mensagem...');
  await prisma.messageTemplate.createMany({
    data: [
      {
        channel: 'EMAIL',
        key: 'boas-vindas',
        name: 'E-mail de boas-vindas',
        subject: 'Bem-vindo à SM Smart Money',
        body: 'Olá, {{primeiro_nome}}. Seu acesso à comunidade está liberado. Comece definindo sua senha em {{link}} e conclua o Smart Money Journey.',
      },
      {
        channel: 'EMAIL',
        key: 'cancelamento',
        name: 'E-mail de cancelamento',
        subject: 'Sua assinatura foi pausada',
        body: 'Olá, {{primeiro_nome}}. Sua assinatura foi pausada e o acesso ao conteúdo está suspenso. Seu perfil público continua no ar. Para reativar, responda este e-mail.',
      },
      {
        channel: 'WHATSAPP',
        key: 'lembrete-palestra',
        name: 'Lembrete de palestra',
        body: 'Olá, {{primeiro_nome}}! A palestra da comunidade começa em 1 hora. Acesse por {{link}}.',
      },
    ],
  });

  console.log('Registrando histórico administrativo...');

  // Auditoria com variedade de ações, para a tela ter conteúdo e o filtro por
  // entidade ser demonstrável.
  const acoes: [string, string, Record<string, unknown>][] = [
    ['conteudo.publicar', 'content', { title: contents[0].title }],
    ['conteudo.publicar', 'content', { title: contents[3].title }],
    ['conteudo.criar', 'content', { title: 'Rascunho do relatório anual' }],
    ['conteudo.atualizar', 'content', { title: contents[1].title }],
    ['conteudo.arquivar', 'content', { title: contents[5].title }],
    ['palestra.criar', 'lecture', { title: 'Cenário macro e o próximo semestre' }],
    ['palestra.atualizar', 'lecture', { title: 'Sucessão sem litígio: casos reais' }],
    ['membro.criar', 'user', { email: 'novo.membro@exemplo.com.br', plan: 'PADRAO' }],
    ['membro.atualizar', 'user', { antes: { plan: 'PADRAO' }, depois: { plan: 'COM_DESCONTO' } }],
    ['membro.cancelar', 'user', { antes: { status: 'ATIVO' }, depois: { status: 'CANCELADO' } }],
    ['membro.reativar', 'user', { antes: { status: 'CANCELADO' }, depois: { status: 'ATIVO' } }],
    ['membro.reset_senha', 'user', { email: 'membro@exemplo.com.br' }],
    ['membro.email_manual', 'user', { subject: 'Confirmação de presença na palestra' }],
    ['perfil.convite_lote', 'invite', { total: 12, enviados: 12, falhas: 0 }],
    ['perfil.convite_lote', 'invite', { total: 7, enviados: 6, falhas: 1 }],
    ['perfil.convite_enviar', 'invite', { total: 1, enviados: 1, falhas: 0 }],
    ['notificacao.criar', 'notification', { title: 'Nova palestra confirmada' }],
    ['notificacao.disparar', 'notification', { destinatarios: 29 }],
    ['notificacao.disparar', 'notification', { destinatarios: 6 }],
    ['whatsapp.reiniciar', 'waha', { sucesso: true }],
    ['whatsapp.mensagem', 'user', { enviado: true }],
    ['template.atualizar', 'setting', { name: 'E-mail de boas-vindas' }],
    ['configuracao.atualizar', 'setting', { chave: 'comunidade.nome' }],
    ['conteudo.excluir', 'content', { title: 'Rascunho descartado' }],
    ['membro.excluir', 'user', { nome: 'Cadastro duplicado', email: 'duplicado@exemplo.com.br' }],
  ];

  await prisma.auditLog.createMany({
    data: acoes.map(([action, entity, metadata], index) => ({
      actorId: admin.id,
      actorName: admin.name,
      action,
      entity,
      metadata: metadata as object,
      ip: '187.0.0.1',
      createdAt: daysAgo(index * 3 + 1),
    })),
  });

  // Histórico de e-mails com dois lotes de convite de perfil. Sem isso o painel
  // de convites exibe o recurso sem nenhum disparo registrado.
  const loteA = randomUUID();
  const loteB = randomUUID();
  const conviteAssunto = 'Ative seu perfil de Membro Estratégico';

  await prisma.emailLog.createMany({
    data: [
      ...members.slice(0, 12).map((m) => ({
        userId: m.id,
        to: m.email,
        template: 'convite-perfil',
        subject: conviteAssunto,
        status: 'ENVIADO' as const,
        batchId: loteA,
        sentAt: daysAgo(30),
      })),
      ...members.slice(12, 19).map((m, i) => ({
        userId: m.id,
        to: m.email,
        template: 'convite-perfil',
        subject: conviteAssunto,
        // Uma falha proposital, para a tela mostrar o resultado por destinatário.
        status: (i === 3 ? 'FALHOU' : 'ENVIADO') as 'ENVIADO' | 'FALHOU',
        error: i === 3 ? 'Caixa de entrada indisponível' : null,
        batchId: loteB,
        sentAt: daysAgo(9),
      })),
      ...members.slice(0, 14).map((m, i) => ({
        userId: m.id,
        to: m.email,
        template: 'boas-vindas',
        subject: 'Bem-vindo à SM Smart Money',
        status: 'ENVIADO' as const,
        sentAt: daysAgo(200 - i * 9),
      })),
      ...members.slice(29, 34).map((m) => ({
        userId: m.id,
        to: m.email,
        template: 'cancelamento',
        subject: 'Sua assinatura foi pausada',
        status: 'ENVIADO' as const,
        sentAt: daysAgo(24),
      })),
    ],
  });

  // Disparos de WhatsApp, para a página da integração ter histórico.
  const kinds = ['lembrete-palestra', 'novo-conteudo', 'manual'];
  await prisma.whatsappLog.createMany({
    data: activeMembers.slice(0, 18).map((m, i) => ({
      userId: m.id,
      phone: m.phone ?? '5511900000000',
      kind: pick(kinds, i),
      message:
        i % 3 === 0
          ? 'Olá! A palestra da comunidade começa em 1 hora. Acesse pelo portal.'
          : i % 3 === 1
            ? 'Nova análise de mercado publicada no portal da comunidade.'
            : 'Confirmando sua presença no encontro presencial de sexta.',
      status: (i === 5 || i === 13 ? 'FALHOU' : 'ENVIADO') as 'ENVIADO' | 'FALHOU',
      error: i === 5 || i === 13 ? 'Número não encontrado no WhatsApp' : null,
      sentAt: daysAgo(i * 2 + 1),
    })),
  });

  await prisma.wahaHealthCheck.createMany({
    data: [
      { connected: true, state: 'WORKING', checkedAt: daysAgo(1) },
      { connected: false, state: 'FAILED', detail: 'Timeout na API', alertSent: true, checkedAt: daysAgo(4) },
      { connected: true, state: 'WORKING', checkedAt: daysAgo(6) },
    ],
  });

  // Contas de demonstracao para a apresentacao: uma de cada estado que muda a
  // tela. Todas compartilham a mesma senha, entao a base nunca deve ir para
  // producao real.
  const padrao = members.find((m) => m.tier === 'PADRAO' && m.status === 'ATIVO');
  const vip = members.find((m) => m.tier === 'VIP' && m.status === 'ATIVO');
  const cancelado = members.find((m) => m.status === 'CANCELADO');

  console.log('');
  console.log(`Seed concluído. Senha de todas as contas: ${PASSWORD}`);
  console.log('');
  console.log('  Administrador  admin@smboard.com.br');
  if (padrao) console.log(`  Membro padrão  ${padrao.email}`);
  if (vip) console.log(`  Membro VIP     ${vip.email}`);
  if (cancelado) console.log(`  Cancelado      ${cancelado.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

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
  'Ricardo', 'Ana Paula', 'Fernando', 'Juliana', 'Marcelo', 'Camila', 'Roberto', 'Patricia',
  'Eduardo', 'Luciana', 'Gustavo', 'Renata', 'Andre', 'Beatriz', 'Rodrigo', 'Mariana',
  'Thiago', 'Carolina', 'Leonardo', 'Fernanda', 'Bruno', 'Vanessa', 'Felipe', 'Isabela',
  'Rafael', 'Priscila', 'Daniel', 'Aline', 'Vinicius', 'Tatiana', 'Alexandre', 'Simone',
  'Gabriel', 'Cristina', 'Henrique', 'Adriana',
];

const LAST_NAMES = [
  'Almeida', 'Barbosa', 'Carvalho', 'Duarte', 'Esteves', 'Fonseca', 'Gomes', 'Henriques',
  'Iglesias', 'Junqueira', 'Klein', 'Lacerda', 'Machado', 'Nogueira', 'Oliveira', 'Pacheco',
  'Queiroz', 'Ribeiro', 'Salgado', 'Tavares', 'Uchoa', 'Vasconcelos', 'Werneck', 'Xavier',
  'Yamamoto', 'Zanetti', 'Andrade', 'Bittencourt', 'Cardoso', 'Dantas', 'Estrela', 'Freitas',
  'Guimaraes', 'Horta', 'Ipanema', 'Jordao',
];

const JOB_TITLES = [
  'CEO', 'Diretor Financeiro', 'Socio-fundador', 'Gerente de Investimentos',
  'Consultor de Patrimônio', 'Diretor de Operações', 'Head de Planejamento Tributário',
  'Investidor', 'Family Officer', 'Diretor Comercial', 'Advogado Tributarista', 'CFO',
];

const COMPANIES = [
  'Grupo Ativa', 'Meridiano Participacoes', 'Vertice Capital', 'Nordeste Agro',
  'Prisma Consultoria', 'Atlas Holding', 'Solar Energia', 'Brava Investimentos',
  'Quantum Advisors', 'Orion Family Office', 'Costa Norte', 'Terra Firme Agro',
];

const CITIES = [
  ['São Paulo', 'SP'], ['Rio de Janeiro', 'RJ'], ['Belo Horizonte', 'MG'], ['Curitiba', 'PR'],
  ['Porto Alegre', 'RS'], ['Recife', 'PE'], ['Salvador', 'BA'], ['Brasilia', 'DF'],
  ['Florianopolis', 'SC'], ['Goiania', 'GO'],
] as const;

const SPECIALTIES = [
  'Planejamento tributário', 'Sucessão familiar', 'Renda variável', 'Fundos exclusivos',
  'Investimentos internacionais', 'Holding patrimonial', 'M&A', 'Gestão de caixa',
  'Previdencia', 'Proteção patrimonial', 'Agronegocio', 'Real estate',
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
    options: ['Totalmente misturadas', 'Parcialmente separadas', 'Separadas, sem formalizacao', 'Separadas e formalizadas', 'Separadas, formalizadas e auditadas'],
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
    options: ['Nunca fiz', 'Tenho nocao informal', 'Mapeei uma vez', 'Mapeado e revisado anualmente', 'Mapeado, revisado e com plano de mitigacao'],
  },
  {
    category: 'PROTECAO',
    prompt: 'Como está a cobertura de seguros da família e do patrimônio?',
    options: ['Sem cobertura', 'Apenas o obrigatório', 'Vida e saude', 'Vida, saude e patrimônio', 'Cobertura completa com revisão anual'],
  },
  {
    category: 'PROTECAO',
    prompt: 'Existe acordo societário com clausulas de saida e sucessão?',
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
    prompt: 'Qual instrumento de sucessão você ja implementou?',
    options: ['Nenhum', 'Apenas conversas em família', 'Testamento', 'Doação em vida ou holding', 'Holding com protocolo familiar'],
  },
  {
    category: 'SUCESSAO',
    prompt: 'Você ja calculou o custo tributário da sua sucessão?',
    options: ['Nunca calculei', 'Tenho uma nocao', 'Calculei uma vez', 'Calculo e acompanho', 'Calculo e tenho plano de mitigacao'],
  },
];

const ARTICLES = [
  ['Reforma tributária: o que muda para holdings familiares', 'Tributário', 'A transicao do IBS e da CBS altera a logica de distribuição de lucros. Veja o que revisar ainda neste exercício.'],
  ['Come-cotas: quando o diferimento vale mais que a isencao', 'Investimentos', 'Comparamos três veículos para o mesmo objetivo de longo prazo e o resultado surpreende.'],
  ['O ciclo de juros e o custo de oportunidade do caixa', 'Mercado', 'Manter liquidez tem preço. Como dimensionar a reserva sem destruir retorno.'],
  ['Governança familiar antes do patrimônio', 'Estratégia', 'Estruturas societarias não resolvem conflito de expectativa. O protocolo familiar, sim.'],
  ['Viés do custo afundado nas decisões de venda', 'Comportamento', 'Por que investidores sofisticados seguram posições perdedoras por tempo demais.'],
  ['Holding patrimonial: quando ela realmente compensa', 'Tributário', 'O ponto de equilibrio entre custo de manutenção e economia tributária efetiva.'],
  ['Alocação internacional sem ruido cambial', 'Investimentos', 'Instrumentos de hedge e o custo real de cada um para o investidor pessoa física.'],
  ['Leitura de balanco para sócios não financeiros', 'Estratégia', 'Os cinco indicadores que dizem se a empresa está gerando ou consumindo valor.'],
];

const ANALYSES = [
  ['Panorama macro do trimestre', 'Macro', 'Atividade, inflacao e o cenário fiscal para os próximos seis meses.'],
  ['Small caps: assimetria ou armadilha', 'Ações', 'Múltiplos comprimidos e o que os balancos revelam sobre o setor.'],
  ['Fundos imobiliarios: vacância e a taxa de juros', 'Fundos', 'Onde a distribuição de rendimento está sustentável.'],
  ['Dolar e o diferencial de juros', 'Câmbio', 'Cenários de curto prazo para a moeda e o impacto na carteira internacional.'],
  ['Tributação de investimentos no exterior', 'Internacional', 'O regime atual e as obrigações acessórias que costumam passar batido.'],
];

const VIDEOS = [
  ['Estruturas societarias para proteção patrimonial', 'Gestão', 2340],
  ['Como ler o relatório Focus sem se perder', 'Mercado', 1680],
  ['Entrevista: a visão de um family officer', 'Entrevista', 3120],
  ['Planejamento tributário na prática', 'Tributário', 2760],
];

const PODCASTS = [
  ['O erro mais comum na sucessão familiar', 'Gestão', 1980, 'Smart Money Talks', 1],
  ['Renda fixa não e sinonimo de segurança', 'Investimentos', 2220, 'Smart Money Talks', 2],
  ['Quando vender uma empresa faz sentido', 'Gestão', 2580, 'Smart Money Talks', 3],
];

const EBOOKS = [
  ['Guia da holding familiar', 'Sucessão', 68],
  ['Manual de proteção patrimonial', 'Proteção patrimonial', 84],
  ['Planejamento tributário para alta renda', 'Tributário', 52],
  ['Carteira internacional do zero', 'Investimentos', 96],
];

const LECTURES = [
  ['Reforma tributária: próximos passos', 'Tributário', -45, 'Dra. Helena Vasques', 'Advogada tributarista', 'Especialista em planejamento tributário para grupos familiares, com 20 anos de atuação junto a holdings.'],
  ['Alocação em ciclo de juros alto', 'Investimentos', -20, 'Marcos Tavares', 'Gestor de fundos multimercado', 'Gestor com 15 anos de mercado e passagem por casas de asset independentes.'],
  ['Sucessão sem litigio: casos reais', 'Sucessão', -5, 'Dra. Helena Vasques', 'Advogada tributarista', 'Especialista em planejamento tributário para grupos familiares, com 20 anos de atuação junto a holdings.'],
  ['Cenário macro e o próximo semestre', 'Macro', 8, 'Paulo Reimberg', 'Economista-chefe', 'Economista-chefe de casa de research independente, doutor em economia aplicada.'],
  ['Investimento no exterior na prática', 'Internacional', 26, 'Marcos Tavares', 'Gestor de fundos multimercado', 'Gestor com 15 anos de mercado e passagem por casas de asset independentes.'],
];

const TOPICS = [
  ['INVESTIMENTOS', 'Alguém ja usou fundo exclusivo abaixo de R$ 10 milhoes?', 'Estou avaliando montar um exclusivo, mas o custo fixo parece pesar demais nessa faixa. Quem ja passou por isso conseguiu justificar o veículo? Interessa saber principalmente o custo total anual de manutenção.'],
  ['TRIBUTARIO', 'Distribuição de lucros: como vocês estão se preparando', 'Diante das mudanças em discussão, estou antecipando parte da distribuição ainda neste exercício. Faz sentido ou seria precipitado? Meu contador sugere aguardar a regulamentação.'],
  ['MERCADO', 'Leitura do último Copom', 'A comunicação veio mais dura do que o mercado esperava. Alguém mudou a duration da carteira depois disso?'],
  ['REDES', 'Grupo de estudo sobre governança familiar', 'Estou organizando um encontro mensal para discutir protocolo familiar e conselho consultivo. Quem tiver interesse, comenta aqui que monto a lista.'],
  ['OPORTUNIDADES', 'Busco sócio para operação de real estate em SP', 'Operação de retrofit em região central, ticket de entrada a partir de R$ 2 milhoes, horizonte de 36 meses. Posso compartilhar o memorando com quem tiver interesse.'],
] as const;

async function main() {
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
  const members = [];

  for (let i = 0; i < 36; i += 1) {
    const name = `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, i * 7 + 3)}`;
    const [city, state] = pick(CITIES, i * 3);

    // Distribuicao: 29 ativos, 5 cancelados, 2 pendentes.
    const status: MemberStatus = i >= 34 ? 'PENDENTE' : i >= 29 ? 'CANCELADO' : 'ATIVO';
    const plan = pick(plans, i);
    const tier: Tier = i % 5 === 0 ? 'VIP' : 'PADRAO';

    // Entradas espalhadas ao longo de 12 meses para o grafico de crescimento ter forma.
    const joinedAt = daysAgo(350 - i * 9);
    const canceledAt = status === 'CANCELADO' ? daysAgo(20 + (i - 29) * 26) : null;
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
            inviteSentAt: publicProfile ? daysAgo(30) : null,
            activatedAt: publicProfile && status !== 'PENDENTE' ? daysAgo(25) : null,
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

  console.log('Gerando diagnósticos concluidos...');
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
          body: `<p>${excerpt}</p><h2>Por que isso importa agora</h2><p>A combinacao de mudança regulatoria e custo de capital elevado muda a ordem das prioridades para quem administra patrimônio relevante. O ponto de partida não é o produto, é a estrutura.</p><p>Ao longo deste material, tratamos do impacto prático da decisão, dos números que sustentam a análise e das perguntas que valem ser levadas ao seu assessor.</p><h3>O que revisar ainda neste exercício</h3><ul><li>Estrutura societária e o custo efetivo de manutenção;</li><li>Distribuição de resultados e o momento de faze-la;</li><li>Veículos de investimento e a eficiência tributária de cada um.</li></ul><blockquote>Estrutura sem objetivo definido é custo. Objetivo sem estrutura é risco.</blockquote><p>A recomendacao geral é revisar a estrutura a cada ciclo de doze meses, ou sempre que houver evento societário relevante.</p>`,
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
      body: '<p>Texto em elaboracao.</p>',
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

    for (let r = 0; r < 2 + (index % 3); r += 1) {
      const replier = activeMembers[(index * 3 + r + 1) % activeMembers.length];
      await prisma.topicReply.create({
        data: {
          topicId: topic.id,
          authorId: replier.id,
          body:
            r === 0
              ? 'Passei por situação parecida no ano passado. O ponto que mais pesou foi o custo fixo anual, que so fecha a conta acima de um determinado patrimônio. Posso compartilhar os números que levantei.'
              : 'Concordo com a leitura acima. Vale considerar também o efeito da mudança regulatoria em discussão antes de decidir.',
          createdAt: daysAgo(index * 4),
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

  console.log('Criando templates de mensagem...');
  await prisma.messageTemplate.createMany({
    data: [
      {
        channel: 'EMAIL',
        key: 'boas-vindas',
        name: 'E-mail de boas-vindas',
        subject: 'Bem-vindo a SM Smart Money',
        body: 'Ola, {{primeiro_nome}}. Seu acesso a comunidade está liberado. Comece definindo sua senha em {{link}} e conclua o Smart Money Journey.',
      },
      {
        channel: 'EMAIL',
        key: 'cancelamento',
        name: 'E-mail de cancelamento',
        subject: 'Sua assinatura foi pausada',
        body: 'Ola, {{primeiro_nome}}. Sua assinatura foi pausada e o acesso ao conteúdo está suspenso. Seu perfil público continua no ar. Para reativar, responda este e-mail.',
      },
      {
        channel: 'WHATSAPP',
        key: 'lembrete-palestra',
        name: 'Lembrete de palestra',
        body: 'Ola, {{primeiro_nome}}! A palestra da comunidade começa em 1 hora. Acesse por {{link}}.',
      },
    ],
  });

  console.log('Registrando histórico administrativo...');
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        actorName: admin.name,
        action: 'conteudo.publicar',
        entity: 'content',
        entityId: contents[0].id,
        metadata: { title: contents[0].title },
        ip: '187.0.0.1',
        createdAt: daysAgo(2),
      },
      {
        actorId: admin.id,
        actorName: admin.name,
        action: 'perfil.convite_lote',
        entity: 'invite',
        metadata: { total: 12, enviados: 12, falhas: 0 },
        ip: '187.0.0.1',
        createdAt: daysAgo(30),
      },
    ],
  });

  await prisma.wahaHealthCheck.createMany({
    data: [
      { connected: true, state: 'WORKING', checkedAt: daysAgo(1) },
      { connected: false, state: 'FAILED', detail: 'Timeout na API', alertSent: true, checkedAt: daysAgo(4) },
      { connected: true, state: 'WORKING', checkedAt: daysAgo(6) },
    ],
  });

  console.log('');
  console.log('Seed concluido.');
  console.log(`  Admin:  admin@smboard.com.br / ${PASSWORD}`);
  console.log(`  Membro: ${members[0].email} / ${PASSWORD}`);
  console.log(`  Membro VIP: ${members.find((m) => m.tier === 'VIP')?.email} / ${PASSWORD}`);
  console.log(`  Cancelado: ${members.find((m) => m.status === 'CANCELADO')?.email} / ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

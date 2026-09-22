import { PrismaClient } from '@prisma/client';

/**
 * Esvazia a base mantendo o schema e, por padrao, as contas de administrador.
 *
 * Serve ao ciclo "explorar com dados simulados, depois carregar os oficiais":
 * o seed popula, este comando limpa, e o administrador continua conseguindo
 * entrar. Sem preservar o admin, a limpeza tranca o dono para fora.
 *
 * O questionario do Journey e os templates de mensagem NAO sao dados simulados:
 * sao configuracao do produto. O seed os cria junto do resto so' por conveniencia,
 * mas apaga-los deixaria o diagnostico sem perguntas e a comunicacao sem modelo,
 * numa base que acabou de virar producao. Por isso eles ficam, salvo pedido
 * explicito.
 *
 *   CONFIRMAR=SIM npm run db:clean
 *   CONFIRMAR=SIM INCLUIR_ADMINS=1 npm run db:clean
 *   CONFIRMAR=SIM INCLUIR_CONFIG=1 npm run db:clean
 */

const prisma = new PrismaClient();

async function contar() {
  const [
    membros,
    admins,
    conteudos,
    palestras,
    topicos,
    diagnosticos,
    notificacoes,
    perguntas,
    templates,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'MEMBER' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.content.count(),
    prisma.lecture.count(),
    prisma.topic.count(),
    prisma.journeySubmission.count(),
    prisma.notification.count(),
    prisma.journeyQuestion.count(),
    prisma.messageTemplate.count(),
  ]);
  return {
    membros,
    admins,
    conteudos,
    palestras,
    topicos,
    diagnosticos,
    notificacoes,
    perguntas,
    templates,
  };
}

async function main() {
  const incluirAdmins = process.env.INCLUIR_ADMINS === '1';
  const incluirConfig = process.env.INCLUIR_CONFIG === '1';
  const antes = await contar();

  const destino = (apaga: boolean) => (apaga ? '(serão apagados)' : '(preservados)');

  console.log('Conteúdo atual da base:');
  console.log(`  membros:         ${antes.membros}`);
  console.log(`  administradores: ${antes.admins} ${destino(incluirAdmins)}`);
  console.log(`  conteúdos:       ${antes.conteudos}`);
  console.log(`  palestras:       ${antes.palestras}`);
  console.log(`  tópicos:         ${antes.topicos}`);
  console.log(`  diagnósticos:    ${antes.diagnosticos}`);
  console.log(`  notificações:    ${antes.notificacoes}`);
  console.log(`  perguntas Journey: ${antes.perguntas} ${destino(incluirConfig)}`);
  console.log(`  templates:         ${antes.templates} ${destino(incluirConfig)}`);
  console.log('');

  // Confirmacao explicita: a operacao e' irreversivel e costuma rodar contra
  // uma base de producao.
  if (process.env.CONFIRMAR !== 'SIM') {
    console.log('Nada foi apagado.');
    console.log('Para executar de verdade:  CONFIRMAR=SIM npm run db:clean');
    return;
  }

  // Ordem importa: filhos antes dos pais, para nao esbarrar em chave estrangeira.
  // As respostas saem sempre; as perguntas so' com INCLUIR_CONFIG, e a cascata
  // de JourneyAnswer -> JourneyQuestion nao se incomoda com a ordem porque as
  // respostas ja' foram embora.
  await prisma.$transaction([
    prisma.journeyAnswer.deleteMany(),
    prisma.journeySubmission.deleteMany(),
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
    prisma.whatsappHealthCheck.deleteMany(),
    ...(incluirConfig
      ? [prisma.journeyQuestion.deleteMany(), prisma.messageTemplate.deleteMany()]
      : []),
  ]);

  // Perfis e tokens caem junto com o usuario, por cascata no schema.
  await prisma.user.deleteMany(
    incluirAdmins ? undefined : { where: { role: 'MEMBER' } },
  );

  const depois = await contar();
  console.log('Base limpa.');
  console.log(`  membros restantes:        ${depois.membros}`);
  console.log(`  administradores mantidos: ${depois.admins}`);
  console.log(`  perguntas do Journey:     ${depois.perguntas}`);
  console.log(`  templates de mensagem:    ${depois.templates}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

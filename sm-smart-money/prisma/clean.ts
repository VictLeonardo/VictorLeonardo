import { PrismaClient } from '@prisma/client';

/**
 * Esvazia a base mantendo o schema e, por padrao, as contas de administrador.
 *
 * Serve ao ciclo "explorar com dados simulados, depois carregar os oficiais":
 * o seed popula, este comando limpa, e o administrador continua conseguindo
 * entrar. Sem preservar o admin, a limpeza tranca o dono para fora.
 *
 *   CONFIRMAR=SIM npm run db:clean
 *   CONFIRMAR=SIM INCLUIR_ADMINS=1 npm run db:clean
 */

const prisma = new PrismaClient();

async function contar() {
  const [membros, admins, conteudos, palestras, topicos, diagnosticos, notificacoes] =
    await Promise.all([
      prisma.user.count({ where: { role: 'MEMBER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.content.count(),
      prisma.lecture.count(),
      prisma.topic.count(),
      prisma.journeySubmission.count(),
      prisma.notification.count(),
    ]);
  return { membros, admins, conteudos, palestras, topicos, diagnosticos, notificacoes };
}

async function main() {
  const incluirAdmins = process.env.INCLUIR_ADMINS === '1';
  const antes = await contar();

  console.log('Conteúdo atual da base:');
  console.log(`  membros:       ${antes.membros}`);
  console.log(`  administradores: ${antes.admins}${incluirAdmins ? ' (serão apagados)' : ' (preservados)'}`);
  console.log(`  conteúdos:     ${antes.conteudos}`);
  console.log(`  palestras:     ${antes.palestras}`);
  console.log(`  tópicos:       ${antes.topicos}`);
  console.log(`  diagnósticos:  ${antes.diagnosticos}`);
  console.log(`  notificações:  ${antes.notificacoes}`);
  console.log('');

  // Confirmacao explicita: a operacao e' irreversivel e costuma rodar contra
  // uma base de producao.
  if (process.env.CONFIRMAR !== 'SIM') {
    console.log('Nada foi apagado.');
    console.log('Para executar de verdade:  CONFIRMAR=SIM npm run db:clean');
    return;
  }

  // Ordem importa: filhos antes dos pais, para nao esbarrar em chave estrangeira.
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
  ]);

  // Perfis e tokens caem junto com o usuario, por cascata no schema.
  await prisma.user.deleteMany(
    incluirAdmins ? undefined : { where: { role: 'MEMBER' } },
  );

  const depois = await contar();
  console.log('Base limpa.');
  console.log(`  membros restantes:        ${depois.membros}`);
  console.log(`  administradores mantidos: ${depois.admins}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getSessionUser } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { ehTipoDeArquivo, REGRAS } from '@/lib/arquivos';

/**
 * Assina o envio de um arquivo direto do navegador para o Blob.
 *
 * O arquivo nao passa por aqui. A Vercel corta requisicao em 4,5 MB, em todos
 * os planos, e uma analise com graficos passa disso -- entao o servidor so'
 * autoriza, e o navegador manda direto.
 *
 * A autorizacao acontece dentro de `onBeforeGenerateToken`, e nao no topo da
 * rota, por um motivo que nao e' estilo: esta mesma rota recebe dois tipos de
 * chamada. Uma e' do navegador pedindo permissao, com o cookie da sessao. A
 * outra e' da propria Vercel avisando que o envio terminou -- sem cookie
 * nenhum. Barrar no topo mataria a segunda.
 *
 * Nao vive sob `/api/admin` porque nem todo envio e' de administrador: a foto
 * de perfil quem manda e' o proprio membro. Quem decide o que cada um pode e'
 * a regra do tipo pedido, nao o caminho da rota.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const resultado = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // O tipo vem da tela e diz o que aceitar. Desconhecido nao vira padrao:
        // viraria uma porta para subir qualquer coisa.
        if (!ehTipoDeArquivo(clientPayload)) {
          throw new Error('Tipo de arquivo não reconhecido');
        }
        const regra = REGRAS[clientPayload];

        const quem = await getSessionUser();
        if (!quem) {
          throw new Error('Acesso restrito');
        }
        // A permissao e' do tipo pedido, nao da rota. Foto de perfil qualquer
        // membro manda; o resto e' do administrador.
        if (regra.quem === 'admin' && quem.role !== 'ADMIN') {
          throw new Error('Acesso restrito');
        }
        if (regra.quem === 'membro' && quem.role !== 'ADMIN' && quem.status !== 'ATIVO') {
          throw new Error('Acesso restrito');
        }

        return {
          allowedContentTypes: regra.tipos,
          maximumSizeInBytes: regra.limiteBytes,
          // Dois arquivos com o mesmo nome nao se sobrescrevem: quem publica
          // chama tudo de "analise.pdf", e sem isto a analise de outubro
          // apagaria a de setembro.
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            adminId: quem.id,
            adminNome: quem.name,
            tipo: clientPayload,
          }),
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Chamada pela Vercel, nao pelo navegador. Serve para registrar: quem
        // subiu arquivo para a plataforma e quando e' coisa que se pergunta
        // depois, e o painel so' guarda o endereco final no conteudo.
        try {
          const { adminId, adminNome, tipo } = JSON.parse(tokenPayload ?? '{}') as {
            adminId?: string;
            adminNome?: string;
            tipo?: string;
          };
          if (!adminId) return;
          await recordAudit({
            actor: { id: adminId, name: adminNome ?? '—' },
            action: 'arquivo.enviar',
            entity: 'arquivo',
            entityId: blob.pathname,
            metadata: { url: blob.url, tipo: tipo ?? null },
          });
        } catch {
          // O arquivo ja' esta' la'. Falhar o registro nao pode desfazer o envio
          // nem devolver erro a quem ja' viu a barra chegar ao fim.
        }
      },
    });

    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json(
      { error: erro instanceof Error ? erro.message : 'Falha no envio' },
      { status: 400 },
    );
  }
}

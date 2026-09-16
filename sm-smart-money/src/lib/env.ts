import { z } from 'zod';

/**
 * URL publica da plataforma, base de todo link absoluto que sai daqui:
 * redefinicao de senha, convite, retorno do checkout, host do cartao virtual.
 *
 * O default de localhost serve ao desenvolvimento, mas em producao ele e'
 * veneno silencioso: nao derruba nada, apenas manda o membro para uma maquina
 * que nao e' a dele. O e-mail de recuperacao vira link morto e quem paga volta
 * do Stripe para lugar nenhum -- sem erro em log nenhum.
 *
 * Por isso a Vercel entra como segunda fonte antes do localhost:
 * `VERCEL_PROJECT_PRODUCTION_URL` carrega o dominio estavel do projeto, sem
 * esquema. Um deploy que esqueceu a variavel ainda acerta o destino certo.
 */
const urlPublicaPadrao = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000';

/**
 * Validacao das variaveis de ambiente no boot. Falhar aqui e' melhor do que
 * descobrir um segredo ausente no meio de um disparo de e-mail em massa.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET precisa ter ao menos 32 caracteres'),
  AUTH_ACCESS_MINUTES: z.coerce.number().int().positive().default(15),
  AUTH_REFRESH_DAYS: z.coerce.number().int().positive().default(7),
  AUTH_REMEMBER_DAYS: z.coerce.number().int().positive().default(30),
  NEXT_PUBLIC_APP_URL: z.string().url().default(urlPublicaPadrao),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  // Ausente precisa continuar ausente: quem decide o modo e' a porta, no mailer.
  // Transformar direto para boolean fazia a variavel nao definida virar `false`,
  // e um `?? true` la' na frente nunca entrava em acao.
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default('SM Smart Money <contato@smboard.com.br>'),
  ADMIN_ALERT_EMAIL: z.string().optional(),
  WAHA_BASE_URL: z.string().optional(),
  WAHA_API_KEY: z.string().optional(),
  WAHA_SESSION: z.string().default('default'),
  CRON_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Id do preco recorrente no Stripe (price_...). O valor em reais vive la',
  // nao aqui: mudar o preco da comunidade nao pode exigir um deploy.
  STRIPE_PRICE_PADRAO: z.string().optional(),
});

/**
 * Variavel definida como string vazia vale como ausente.
 *
 * Plataformas de deploy criam variaveis em lote a partir do .env.example e
 * deixam o valor em branco. Sem esta normalizacao o default do schema nao entra
 * em acao: `AUTH_ACCESS_MINUTES=""` viraria o numero 0 e seria recusado, e
 * `NEXT_PUBLIC_APP_URL=""` falharia a validacao de URL.
 */
const rawEnv = Object.fromEntries(
  Object.entries(process.env).map(([key, value]) => [key, value === '' ? undefined : value]),
);

const parsed = schema.safeParse(rawEnv);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
}

export const env = parsed.data;

/**
 * Producao apontando para localhost e' erro de configuracao, nao de codigo.
 *
 * O aviso vai para o log em vez de abortar o boot porque o proprio `next build`
 * importa este modulo: derrubar o build por causa de uma variavel que so' existe
 * em runtime trocaria um problema por outro, e a imagem Docker nem chegaria a
 * ser gerada.
 */
if (process.env.NODE_ENV === 'production' && env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
  console.warn(
    '[env] NEXT_PUBLIC_APP_URL ausente: links de e-mail e o retorno do Stripe vao apontar para localhost.',
  );
}

/** O envio real so acontece quando o SMTP esta completamente configurado. */
export const mailConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);

/** WAHA e' opcional em desenvolvimento; a UI mostra "não configurada". */
export const wahaConfigured = Boolean(env.WAHA_BASE_URL);

/**
 * A cobranca so' entra em cena com as tres variaveis presentes.
 *
 * Sem elas a plataforma funciona inteira, apenas sem o caminho de assinatura:
 * o CTA de inscricao some da tela de login e as rotas de checkout respondem que
 * a cobranca nao esta configurada. E' o mesmo criterio do WAHA e do SMTP, para
 * dev e staging nao precisarem de credencial de pagamento.
 */
export const stripeConfigured = Boolean(
  env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_PRICE_PADRAO,
);

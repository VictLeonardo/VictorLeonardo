import { z } from 'zod';

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
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default('SM Smart Money <contato@smboard.com.br>'),
  ADMIN_ALERT_EMAIL: z.string().optional(),
  WAHA_BASE_URL: z.string().optional(),
  WAHA_API_KEY: z.string().optional(),
  WAHA_SESSION: z.string().default('default'),
  CRON_SECRET: z.string().optional(),
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

/** O envio real so acontece quando o SMTP esta completamente configurado. */
export const mailConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);

/** WAHA e' opcional em desenvolvimento; a UI mostra "não configurada". */
export const wahaConfigured = Boolean(env.WAHA_BASE_URL);

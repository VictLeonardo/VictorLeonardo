import 'server-only';
import nodemailer from 'nodemailer';
import { env, mailConfigured } from '@/lib/env';
import { prisma } from '@/lib/prisma';

/**
 * Envio transacional via Zoho. Sem SMTP configurado o envio nao falha: a mensagem
 * vai para o console e o EmailLog registra a tentativa. Assim dev e staging
 * exercitam o fluxo completo (incluindo o historico de disparos) sem enviar nada.
 */

// O tipo vem do proprio createTransport: @types/nodemailer nao acompanha a v10.
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!mailConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 465,
      secure: env.SMTP_SECURE ?? true,
      auth: { user: env.SMTP_USER!, pass: env.SMTP_PASSWORD! },
    });
  }
  return transporter;
}

export type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  template: string;
  userId?: string | null;
  batchId?: string | null;
};

export type MailResult = { ok: true } | { ok: false; error: string };

export async function sendMail(payload: MailPayload): Promise<MailResult> {
  let result: MailResult;
  try {
    const tx = getTransporter();
    if (tx) {
      await tx.sendMail({
        from: env.MAIL_FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text ?? htmlToText(payload.html),
      });
    } else {
      console.info(`[mail:dry-run] ${payload.template} -> ${payload.to} :: ${payload.subject}`);
    }
    result = { ok: true };
  } catch (error) {
    result = { ok: false, error: error instanceof Error ? error.message : 'Falha desconhecida' };
  }

  await prisma.emailLog.create({
    data: {
      userId: payload.userId ?? null,
      to: payload.to,
      template: payload.template,
      subject: payload.subject,
      status: result.ok ? 'ENVIADO' : 'FALHOU',
      error: result.ok ? null : result.error,
      batchId: payload.batchId ?? null,
    },
  });

  return result;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Layout unico dos e-mails, com as cores da marca. Mantido inline porque muitos
 * clientes de e-mail descartam <style> no head.
 */
export function renderEmail(options: {
  title: string;
  intro: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footnote?: string;
}): string {
  const cta =
    options.ctaLabel && options.ctaUrl
      ? `<tr><td style="padding:8px 0 24px">
           <a href="${options.ctaUrl}" style="background:#c8a96e;color:#201a0e;text-decoration:none;padding:13px 26px;border-radius:10px;font-weight:600;display:inline-block">${options.ctaLabel}</a>
         </td></tr>`
      : '';

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#faf8f4;padding:32px 12px;font-family:'Helvetica Neue',Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e6dfd2">
    <tr><td style="padding:28px 32px 0">
      <p style="margin:0;font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#9a7a42;font-weight:700">SM Smart Money</p>
    </td></tr>
    <tr><td style="padding:16px 32px 0">
      <h1 style="margin:0;font-size:24px;line-height:1.25;color:#16150f;font-family:Georgia,serif">${options.title}</h1>
    </td></tr>
    <tr><td style="padding:14px 32px 0">
      <p style="margin:0;font-size:15px;line-height:1.65;color:#5b5647">${options.intro}</p>
    </td></tr>
    ${options.body ? `<tr><td style="padding:14px 32px 0"><div style="font-size:15px;line-height:1.65;color:#5b5647">${options.body}</div></td></tr>` : ''}
    <tr><td style="padding:20px 32px 0">
      <table role="presentation" cellpadding="0" cellspacing="0">${cta}</table>
    </td></tr>
    <tr><td style="padding:8px 32px 30px">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#8a8474">${options.footnote ?? 'Você recebeu este e-mail porque faz parte da comunidade SM Smart Money.'}</p>
    </td></tr>
  </table>
</body></html>`;
}

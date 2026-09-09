import bcrypt from 'bcryptjs';
import { z } from 'zod';

const ROUNDS = 12;

export const passwordSchema = z
  .string()
  .min(10, 'A senha precisa ter ao menos 10 caracteres')
  .regex(/[a-z]/, 'Inclua ao menos uma letra minuscula')
  .regex(/[A-Z]/, 'Inclua ao menos uma letra maiuscula')
  .regex(/[0-9]/, 'Inclua ao menos um número');

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Compara contra um hash descartavel quando o e-mail nao existe. Sem isso, o
 * tempo de resposta revelaria quais e-mails estao cadastrados.
 */
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO1oRUuJ.pMBrHRLI4nHfz8zPZ0RkeDLu';

export async function verifyPasswordConstantTime(
  plain: string,
  hash: string | null,
): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(plain, DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(plain, hash);
}

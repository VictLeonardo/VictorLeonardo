-- Publico de notificacao para quem ainda nao vinculou o LinkedIn.
-- O portao do LinkedIn so' cobra quem acessa o portal; quem nunca entra nunca
-- ve' a tela de pendencia. Este publico permite avisar exatamente essas
-- pessoas, sem incomodar quem ja' preencheu.
ALTER TYPE "NotificationAudience" ADD VALUE IF NOT EXISTS 'SEM_LINKEDIN';

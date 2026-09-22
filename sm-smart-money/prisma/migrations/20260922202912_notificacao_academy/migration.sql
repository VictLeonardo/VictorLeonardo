-- ------------------------------------------- Audiencia de notificacao
-- Com dois niveis, o Academy precisa poder ser o destino de um aviso: antes
-- so' existia a audiencia VIP, e quem nao fosse VIP so' recebia o que fosse
-- para todos. A resolucao acontece no disparo, entao os avisos ja' enviados
-- nao mudam de destinatario -- eles ja' viraram linhas em
-- NotificationRecipient.
ALTER TYPE "NotificationAudience" ADD VALUE 'ACADEMY';

-- O UPDATE que usa este valor vive na migration seguinte: o Postgres recusa
-- usar um valor de enum que ainda nao foi commitado, e cada migration roda
-- na sua propria transacao.

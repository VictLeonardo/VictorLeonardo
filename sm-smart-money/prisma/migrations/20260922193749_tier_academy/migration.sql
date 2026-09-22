-- AlterEnum
--
-- `BEFORE 'VIP'` em vez do append que o Prisma gera sozinho: o schema declara
-- PADRAO -> ACADEMY -> VIP, da menor para a maior abrangencia, e sem isto o
-- banco guardaria ACADEMY depois de VIP. Nada ordena por tier hoje, mas quem
-- escrever o primeiro `orderBy: { tier: 'asc' }` receberia a ordem errada sem
-- nenhum aviso.
ALTER TYPE "Tier" ADD VALUE 'ACADEMY' BEFORE 'VIP';

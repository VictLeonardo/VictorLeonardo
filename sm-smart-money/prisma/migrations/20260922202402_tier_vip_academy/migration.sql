-- Troca cruzada dos niveis de acesso: o sistema passa a ter dois, e os nomes
-- mudam de dono.
--
--   PADRAO  -> VIP      (o nivel de entrada, que a assinatura entrega)
--   VIP     -> ACADEMY  (o nivel de cima, que era chamado de VIP)
--
-- Precisa ser uma passada so'. Dois UPDATEs em sequencia -- primeiro
-- PADRAO->VIP, depois VIP->ACADEMY -- transformariam todo mundo em ACADEMY,
-- porque o segundo pegaria as linhas que o primeiro acabou de escrever. O
-- `USING` com CASE le' o valor antigo de cada linha uma vez.
--
-- O Postgres nao remove valor de enum nem reordena, entao o tipo e' refeito.

-- ---------------------------------------------------------------- Tier
CREATE TYPE "Tier_new" AS ENUM ('VIP', 'ACADEMY');

ALTER TABLE "User" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "User"
  ALTER COLUMN "tier" TYPE "Tier_new"
  USING (
    CASE "tier"::text
      WHEN 'PADRAO'  THEN 'VIP'
      WHEN 'VIP'     THEN 'ACADEMY'
      WHEN 'ACADEMY' THEN 'ACADEMY'
    END
  )::"Tier_new";
ALTER TABLE "User" ALTER COLUMN "tier" SET DEFAULT 'VIP';

DROP TYPE "Tier";
ALTER TYPE "Tier_new" RENAME TO "Tier";

-- ---------------------------------------------------------- Visibility
-- O conteudo acompanha quem podia ve-lo. Os itens marcados "apenas VIP" eram
-- vistos pelo nivel de cima, que agora se chama ACADEMY; deixa-los como VIP
-- os entregaria a quem nunca teve acesso a eles.
CREATE TYPE "Visibility_new" AS ENUM ('TODOS', 'VIP', 'ACADEMY');

-- Duas tabelas usam este enum: conteudo e palestra. Converter so' uma deixaria
-- o tipo antigo preso por dependencia, e o DROP abaixo falharia.
ALTER TABLE "Content" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE "Content"
  ALTER COLUMN "visibility" TYPE "Visibility_new"
  USING (
    CASE "visibility"::text
      WHEN 'VIP' THEN 'ACADEMY'
      ELSE "visibility"::text
    END
  )::"Visibility_new";
ALTER TABLE "Content" ALTER COLUMN "visibility" SET DEFAULT 'TODOS';

ALTER TABLE "Lecture" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE "Lecture"
  ALTER COLUMN "visibility" TYPE "Visibility_new"
  USING (
    CASE "visibility"::text
      WHEN 'VIP' THEN 'ACADEMY'
      ELSE "visibility"::text
    END
  )::"Visibility_new";
ALTER TABLE "Lecture" ALTER COLUMN "visibility" SET DEFAULT 'TODOS';

DROP TYPE "Visibility";
ALTER TYPE "Visibility_new" RENAME TO "Visibility";

-- ------------------------------------------------- Matriz de acesso salva
-- A matriz de telas guarda os tiers pelo nome, em JSON. Sem este passo ela
-- citaria niveis que deixaram de existir, e `lerMatriz` descartaria cada um
-- deles -- uma tela marcada so' para PADRAO ficaria sem nenhum nivel, isto e',
-- fechada para todos. O DISTINCT existe porque PADRAO e VIP podem colidir em
-- VIP e ACADEMY na mesma tela.
UPDATE "Setting"
SET value = (
  SELECT jsonb_object_agg(tela, niveis)
  FROM (
    SELECT
      e.key AS tela,
      (
        SELECT jsonb_agg(DISTINCT
          CASE antigo
            WHEN 'PADRAO' THEN 'VIP'
            WHEN 'VIP'    THEN 'ACADEMY'
            ELSE antigo
          END
        )
        FROM jsonb_array_elements_text(e.value) AS t(antigo)
      ) AS niveis
    FROM jsonb_each(value::jsonb) AS e
    WHERE jsonb_typeof(e.value) = 'array'
  ) AS mapeado
)
WHERE key = 'acesso.telas'
  AND jsonb_typeof(value::jsonb) = 'object';

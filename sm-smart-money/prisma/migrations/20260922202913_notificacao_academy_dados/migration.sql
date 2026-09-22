-- Aviso criado mirando o nivel de cima, e ainda nao disparado, acompanha a
-- troca de nome. So' os nao disparados: quem ja' foi virou linha em
-- NotificationRecipient, e reescrever a audiencia contaria uma historia
-- diferente da que aconteceu.
UPDATE "Notification"
SET audience = 'ACADEMY'
WHERE audience = 'VIP' AND "sentAt" IS NULL;

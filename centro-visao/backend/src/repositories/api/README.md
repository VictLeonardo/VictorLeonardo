# Adapters de integração real (stubs)

Esta pasta é o ponto de plugagem das integrações reais. Hoje ela está vazia
(a aplicação usa os repositórios `mock/`). Quando as integrações estiverem
disponíveis, crie aqui os arquivos com **a mesma interface** dos mocks:

## `transactionRepository.js`
Deve expor `list()`, `getById(id)`, `setDecision(id, decision)`.
Aqui é onde entram:
- **POS** — API do sistema de caixa (venda).
- **ERP Presence Domain** — lançamento contábil.
- **Banco / adquirente** — extrato / conciliação de recebíveis.

O trabalho do adapter é buscar cada fonte, agrupar por chave
(NSU / valor / loja / data) e devolver no formato de "transação com origens"
(`{ id, storeId, storeName, date, amount, nsu, sources: { pos, erp, banco } }`),
exatamente como o mock devolve. O motor de conciliação não muda.

## `cameraRepository.js`
Deve expor `list()`, `getById(id)`.
Aqui entra a integração com as câmeras Intelbras via API/IP (SDK/ONVIF/RTSP
para status). Nesta fase é só status de infraestrutura — nada de vídeo.

## Como ativar
Depois de criar os arquivos, aponte o seletor em
`../index.js` mudando `DATA_SOURCE` (env `DATA_SOURCE=api`).

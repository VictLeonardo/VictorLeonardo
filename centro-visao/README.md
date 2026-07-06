# Centro Visão — Conciliação Financeira & Status de Câmeras

Sistema interno da rede de óticas **Centro Visão** (~45 lojas em Minas Gerais).
Dois módulos:

1. **Motor de conciliação financeira** — cruza transações de três fontes
   (POS, ERP/Presence Domain e extrato bancário), decide automaticamente o que
   bate e o que precisa de revisão humana, com um **score de confiança
   explicável** por critério.
2. **Monitoramento de câmeras** — painel de status técnico das câmeras Intelbras
   por loja (acesso via API/IP, dependência de cartão local, IP fixo/dinâmico,
   observações).

> **Fase atual: dados mock/simulados.** Não há integração real com POS, ERP,
> banco ou câmeras físicas ainda. A camada de dados é desacoplada para que a
> troca de mock → integração real seja simples (ver [Onde plugar as integrações
> reais](#onde-plugar-as-integrações-reais)).

## Stack

| Camada     | Tecnologia                    |
|------------|-------------------------------|
| Front-end  | React + Vite + Tailwind CSS   |
| Back-end   | Node.js + Express             |
| Dados      | Seeds mock em memória (camada de repositório/adapter) |
| Auth       | Fora de escopo nesta fase (ver observações no fim) |

## Como rodar

Pré-requisito: **Node.js 18+** (testado no Node 22).

```bash
cd centro-visao

# 1) instalar dependências (backend + frontend)
npm run install:all

# 2) subir tudo junto (API :4000 + web :5173)
npm run dev
```

Depois abra **http://localhost:5173**.

O frontend faz proxy de `/api` para o backend (`http://localhost:4000`),
configurado em `frontend/vite.config.js`.

### Rodando separadamente (dois terminais)

```bash
# terminal 1 — API
npm --prefix backend start        # http://localhost:4000

# terminal 2 — web
npm --prefix frontend run dev     # http://localhost:5173
```

### Testes do motor de conciliação

```bash
npm test        # roda os testes do backend (node:test)
```

## Telas

- **Dashboard** (`/`) — métricas de topo (% conciliado automático, exceções
  pendentes, lojas mapeadas, câmeras com API ativa) + fila de exceções com
  badge de confiança colorido (verde/amarelo/vermelho).
- **Exceções** (`/excecoes`) — lista à esquerda, detalhe à direita com
  comparação **POS × ERP × Banco** lado a lado, **barra por critério de
  confiança**, motivo explicável e as três ações (aprovar / suspeita de fraude /
  pedir dados à loja). Cada ação gera **registro de auditoria**.
- **Câmeras** (`/cameras`) — grade de cards por loja com status
  (API ativa / instável / offline), tipo de IP e observações, com filtros.

## Como funciona o motor de conciliação

Cada transação agrupa até três origens (`pos`, `erp`, `banco`). O motor
(`backend/src/engine/reconciliation.js`) avalia **quatro critérios ponderados**:

| Critério          | Peso padrão | O que verifica |
|-------------------|-------------|----------------|
| `valueMatch`      | 35 | Valor bate entre as fontes (com tolerância de centavos) |
| `dateMatch`       | 25 | Data bate (1 dia de diferença = liquidação bancária, parcial) |
| `nsuUnique`       | 25 | NSU único no lote (duplicado = crítico) |
| `storeConsistent` | 15 | Mesma loja/CNPJ em todas as fontes |

O score final (0–100%) determina a faixa:

- **Alta (≥ 75%)** → concilia automaticamente, sem intervenção.
- **Média (40–74%)** → fila de revisão, com sugestão de casamento.
- **Baixa (< 40%)** → exceção crítica (possível erro operacional ou fraude).

Pesos, tolerâncias e faixas ficam em **`backend/src/config/confidenceRules.js`**
— são **ajustáveis** e não estão espalhados pelo código. Há também
`criticalCriteria` (ex.: NSU duplicado), que **limita o score** mesmo quando os
demais critérios batem, porque duplicidade de NSU é sinal forte de fraude/erro.

O detalhamento por critério (`breakdown`) acompanha cada transação, para que
quem revisa entenda **por que** a confiança é aquela — não só o número final.

### Aprendizado / recalibração

Toda ação humana vira registro de auditoria (`auditRepository`). O endpoint
`GET /api/learning` (`services/auditService.js → learningSignals()`) agrega
essas decisões por faixa e emite dicas de recalibração (ex.: "muitas exceções
de confiança baixa aprovadas manualmente → afrouxar tolerâncias"). É a base
simples e estruturada para, no futuro, reajustar os pesos com dados reais.

## Estrutura do projeto

```
centro-visao/
├── backend/
│   └── src/
│       ├── config/confidenceRules.js     # pesos, tolerâncias, faixas (AJUSTÁVEIS)
│       ├── engine/reconciliation.js       # motor puro de score explicável
│       ├── engine/reconciliation.test.js  # testes do motor
│       ├── data/                          # seeds mock (lojas, transações, câmeras)
│       ├── repositories/
│       │   ├── index.js                   # seletor mock vs api (DATA_SOURCE)
│       │   ├── mock/                       # repositórios em memória
│       │   └── api/                        # <- adapters reais entram aqui (stubs)
│       ├── services/                      # conciliação + auditoria/aprendizado
│       ├── routes/index.js                # endpoints REST
│       └── server.js
└── frontend/
    └── src/
        ├── api/client.js                  # cliente HTTP
        ├── components/                    # Logo, Layout, ConfidenceBadge, MetricCard
        └── pages/                         # Dashboard, Exceptions, Cameras
```

## Onde plugar as integrações reais

A aplicação **nunca** importa dados direto dos seeds — tudo passa por
`backend/src/repositories/index.js`, que escolhe a origem via variável de
ambiente:

```bash
DATA_SOURCE=mock   # padrão — dados simulados em memória
DATA_SOURCE=api    # integrações reais
```

Para ativar as integrações reais, crie em `backend/src/repositories/api/` os
arquivos com **a mesma interface** dos mocks (ver
`backend/src/repositories/api/README.md`):

- **`transactionRepository.js`** — `list()`, `getById(id)`, `setDecision(id, decision)`.
  Aqui entram **POS** (caixa), **ERP Presence Domain** (contábil) e
  **Banco/adquirente** (extrato). O adapter busca cada fonte, agrupa por
  chave (NSU/valor/loja/data) e devolve no formato `{ ..., sources: { pos, erp, banco } }`.
  **O motor de conciliação não muda.**
- **`cameraRepository.js`** — `list()`, `getById(id)`. Integração com as
  câmeras Intelbras via API/IP (SDK/ONVIF/RTSP apenas para status).

Depois rode com `DATA_SOURCE=api npm --prefix backend start`.

### Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET  | `/api/health` | Status + origem de dados atual |
| GET  | `/api/dashboard` | Métricas de topo + fila de exceções |
| GET  | `/api/transactions` | Todas as transações conciliadas |
| GET  | `/api/exceptions` | Fila de exceções (média + baixa) |
| GET  | `/api/transactions/:id` | Detalhe + auditoria |
| POST | `/api/transactions/:id/action` | Ação (`aprovar`/`fraude`/`pedir_dados`) → auditoria |
| GET  | `/api/audit` | Log de auditoria |
| GET  | `/api/learning` | Sinais de aprendizado/recalibração |
| GET  | `/api/cameras` | Status das câmeras |
| GET  | `/api/rules` | Regras de confiança vigentes |
| GET  | `/api/stores` | Lojas |

## Identidade visual

- Cores da marca: azul `#1C63A1` e teal `#3897AF` (em `tailwind.config.js` como
  `brand.blue` / `brand.teal`).
- Estilo sóbrio e limpo, sem gradientes/sombras pesadas — é ferramenta
  operacional interna.
- **Logo:** a logo oficial tem fundo preto e deve ser aplicada em container
  escuro sem distorcer. Como o PNG oficial não acompanhou o código, o
  componente `frontend/src/components/Logo.jsx` traz uma **recriação em SVG**
  do símbolo nas cores reais. Para usar o PNG oficial: coloque
  `centro-visao-logo.png` em `frontend/src/assets/` e troque o `<svg>` por
  `<img>` (há um comentário no componente indicando como).

## Fora de escopo nesta fase (próximos passos)

- **Autenticação/perfis** de acesso (o usuário de auditoria hoje é fixo como
  `operador`).
- **Persistência** real (banco de dados) — hoje os dados vivem em memória.
- **Métricas de cliente** nas câmeras (contagem de pessoas, permanência) —
  só depois que a cobertura de API estiver mapeada.
- **Processamento de vídeo** — não faz parte desta fase.

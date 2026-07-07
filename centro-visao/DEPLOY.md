# Deploy — Centro Visão

O repositório já vem **configurado**. Você escolhe onde publicar; o único passo
que resta (o que exige a sua conta/login) está marcado com 👉.

Há dois "produtos" que dá para hospedar:

| | O que é | Precisa de backend? | Onde |
|---|---|---|---|
| **A. Preview (recomendado p/ compartilhar)** | Visualização navegável das 3 telas com dados mock e a mesma lógica de conciliação | Não — 100% estático | `web-preview/index.html` |
| **B. App completo** | Front React + API Node/Express com camada de dados desacoplada | Sim | `frontend/` + `backend/` |

---

## A. Publicar o preview estático (mais fácil e sem custo)

Já existe `vercel.json` e `netlify.toml` apontando para `web-preview/`.
Nada para configurar — só publicar.

### Netlify Drop (sem CLI, ~30s) — mais simples
1. Abra **https://app.netlify.com/drop**
2. 👉 Arraste a pasta `web-preview/` para a área indicada.
3. Sai uma URL pública `https://algo.netlify.app`. Pronto para compartilhar.

### Vercel via CLI
Dentro de `centro-visao/`:
```bash
npx vercel --prod
```
👉 login na 1ª vez → gera `https://algo.vercel.app`.
(O `vercel.json` já diz para servir `web-preview/` sem build.)

### Vercel/Netlify/Cloudflare conectando o GitHub (deploy automático a cada push)
1. Suba o repositório para o GitHub.
2. 👉 No Vercel: *Add New → Project*, importe o repo.
   - **Root Directory:** `centro-visao`
   - Framework Preset: **Other** · Build Command: *(vazio)* · Output: `web-preview`
3. Deploy. Cada push republica sozinho.

### GitHub Pages
1. Suba o repo.
2. 👉 Settings → Pages → Source: `main` / pasta `docs` ou raiz.
   (Se usar Pages, copie `web-preview/index.html` para `/docs/index.html`.)

---

## B. Publicar o app completo (front + API)

O app usa uma camada de repositório desacoplada (`DATA_SOURCE=mock|api`), então
hoje roda com dados simulados. Para hospedar com backend:

- **Opção mais simples:** rodar o backend em um serviço que aceita Node de longa
  duração (Render, Railway, Fly.io) e o frontend no Vercel/Netlify apontando
  `VITE`/proxy para a URL da API.
- **Vercel serverless:** converter as rotas Express (`backend/src/routes`) em
  funções em `/api`. O motor (`backend/src/engine`) e os dados
  (`backend/src/data`) são JS puro e podem ser reaproveitados sem mudança.
  Observação: como os dados mock vivem em memória, o log de auditoria não
  persiste entre invocações frias — para produção, plugue um banco na camada
  `repositories/`.

Para rodar localmente (as duas partes):
```bash
npm run install:all
npm run dev        # API :4000 + web :5173
```

---

### Resumo
- Para **compartilhar um link agora**: opção **A → Netlify Drop** com a pasta `web-preview/`.
- O repositório já está com `vercel.json` e `netlify.toml` prontos.

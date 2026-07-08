# Deploy — Centro Visão

O repositório já vem **configurado**. O único passo que resta (o que exige a
sua conta/login) está marcado com 👉.

Há dois alvos de deploy prontos:

| Alvo | O que publica | Backend? | Config |
|---|---|---|---|
| **Vercel** | **App completo** — front React + API Express (serverless) | Sim (serverless) | `vercel.json` + `api/` |
| **Netlify** | **Preview estático** — visualização das 3 telas com dados mock | Não | `netlify.toml` + `web-preview/` |

Não precisa do GitHub para nenhum dos dois: dá para publicar **direto do seu
computador** com a CLI.

---

## Opção 1 — Vercel (app completo, recomendado) 🚀

Estrutura já pronta:
- `frontend/` → build estático (Vite) servido na raiz.
- `api/index.js` → a API Express roda como *serverless function*.
- `vercel.json` → reescreve `/api/*` para a função e faz o fallback SPA.

### Publicar direto do seu computador (sem GitHub)
Dentro de `centro-visao/`:
```bash
npm i -g vercel            # ou use: npx vercel
vercel                     # 👉 login na 1ª vez; aceite os padrões detectados
vercel --prod              # publica em produção → https://algo.vercel.app
```
A CLL sobe os arquivos locais direto — não precisa do repositório no GitHub.
Compartilhe a URL `*.vercel.app` gerada.

### Ou conectando o GitHub (deploy automático a cada push)
1. Suba o repositório para o GitHub.
2. 👉 Vercel → *Add New → Project* → importe o repo.
   - **Root Directory:** `centro-visao`
   - Build Command / Output: **deixe como está** (o `vercel.json` já define
     `npm run vercel-build` e `frontend/dist`).
3. Deploy. Cada push republica sozinho.

> Nota: os dados são mock em memória, então o log de auditoria não persiste
> entre invocações frias da função. Dashboard, fila de exceções, detalhamento
> e câmeras funcionam normalmente (são determinísticos a partir dos seeds).
> Para persistir tudo, plugue um banco na camada `backend/src/repositories/`.

---

## Opção 2 — Netlify Drop (preview estático, sem CLI, ~30s)

Para um link de visualização sem backend:
1. 👉 Abra **https://app.netlify.com/drop**
2. Arraste a pasta **`web-preview/`** para lá.
3. Sai `https://algo.netlify.app`. Pronto para compartilhar.

(O `netlify.toml` também permite conectar o repo no Netlify apontando
`publish = web-preview`, se preferir deploy automático do preview.)

---

## Rodar localmente (as duas partes)
```bash
npm run install:all
npm run dev        # API :4000 + web :5173
```

### Resumo
- **App real com API para compartilhar:** Opção 1 → `vercel --prod` (dentro de `centro-visao/`).
- **Só um link de visualização rápido:** Opção 2 → Netlify Drop com `web-preview/`.

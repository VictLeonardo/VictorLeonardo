# syntax=docker/dockerfile:1

# ------------------------------------------------------------------ dependencias
FROM node:22-slim AS deps
# Debian slim em vez de Alpine: o engine do Prisma usado aqui e' o
# debian-openssl-3.0.x, o caminho mais testado da combinacao Prisma + Node.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ------------------------------------------------------------------ build
FROM node:22-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npx next build

# --------------------------------------------------------------- ferramentas
# Estagio com o node_modules completo, usado pelos servicos `migrate` e `seed`
# do compose. Fica fora da imagem que serve o trafego.
FROM node:22-slim AS tools
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma
RUN npx prisma generate
CMD ["npx", "prisma", "migrate", "deploy"]

# ------------------------------------------------------------------ producao
FROM node:22-slim AS runner
# curl entra so para o healthcheck do compose.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuario sem privilegios: o processo nao roda como root.
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m -s /bin/bash nextjs

# O output standalone do Next ja' inclui o @prisma/client e o query engine
# tracados, entao a imagem nao precisa do node_modules completo nem da CLI.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]

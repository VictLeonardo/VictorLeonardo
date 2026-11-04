import { readFileSync } from 'node:fs';

/**
 * Caminho em que a plataforma esta montada, derivado de NEXT_PUBLIC_APP_URL.
 *
 * O prefixo e' o pathname da URL publica: se a plataforma responde em
 * `https://smpartner.com.br/viplounge`, o basePath e' `/viplounge`. Derivar em
 * vez de pedir uma segunda variavel e' deliberado — NEXT_PUBLIC_APP_URL ja' e'
 * a base dos links de e-mail, do retorno do Stripe e dos convites, e duas
 * variaveis que precisam concordar acabam divergindo. NEXT_BASE_PATH existe
 * como escape explicito (build local, preview) e tem precedencia.
 */
function caminhoPublico() {
  const bruto = process.env.NEXT_BASE_PATH ?? pathnameDe(process.env.NEXT_PUBLIC_APP_URL);
  const limpo = bruto.trim().replace(/\/+$/, '');
  if (!limpo || limpo === '/') return '';
  return limpo.startsWith('/') ? limpo : `/${limpo}`;
}

function pathnameDe(url) {
  if (!url) return '';
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

const prefixo = caminhoPublico();

/**
 * Os crons vivem no vercel.json, que e' JSON estatico e nao le variavel de
 * ambiente. Se a plataforma passa a responder num prefixo, o caminho deles tem
 * de acompanhar: `/api/cron/x` com basePath `/viplounge` da' 404, e os dois jobs
 * diarios (agendamentos e saude do WhatsApp) param sem avisar ninguem.
 *
 * Conferir aqui troca esse erro silencioso por uma falha de build. O prefixo
 * continua vindo de um lugar so' -- NEXT_PUBLIC_APP_URL --; o vercel.json apenas
 * tem de concordar com ele.
 */
function conferirCronsDoVercel(prefixo) {
  const arquivo = new URL('./vercel.json', import.meta.url);
  let crons;
  try {
    crons = JSON.parse(readFileSync(arquivo, 'utf8')).crons;
  } catch {
    return; // sem vercel.json (Docker, dev): nada a conferir
  }
  if (!Array.isArray(crons)) return;

  const fora = crons
    .map((c) => c?.path)
    .filter((caminho) => typeof caminho === 'string')
    .filter((caminho) => (prefixo ? !caminho.startsWith(`${prefixo}/`) : caminho.startsWith('/viplounge/')));

  if (fora.length) {
    throw new Error(
      `vercel.json: cron(s) ${fora.join(', ')} nao batem com o basePath ` +
        `${prefixo ? `"${prefixo}"` : '(raiz)'} derivado de NEXT_PUBLIC_APP_URL. ` +
        `Sem o prefixo correto a chamada da Vercel da' 404 e o job para em silencio. ` +
        `Ajuste "crons[].path" no vercel.json para ${prefixo || ''}/api/cron/...`,
    );
  }
}

conferirCronsDoVercel(prefixo);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Empacota servidor e dependencias tracadas num diretorio so, para a imagem
  // Docker nao precisar carregar o node_modules inteiro. Fora do Docker fica
  // desligado: a Vercel monta o proprio output e nao usa este modo.
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  // Servir a plataforma dentro de um caminho do dominio da empresa
  // (smpartner.com.br/viplounge) em vez de na raiz do host.
  basePath: prefixo || undefined,
  // O mesmo prefixo, inlinado no bundle do cliente. O `basePath` reescreve
  // <Link>, o router e os assets que o proprio Next gera, mas NAO reescreve
  // caminho montado a' mao: `fetch('/api/x')` sai do navegador como `/api/x`.
  // `src/lib/rotas.ts` le este valor para montar o prefixo nesses casos.
  env: { NEXT_PUBLIC_BASE_PATH: prefixo },
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Avatares e capas vem do storage S3-compatible e dos CDNs de video.
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: 'i.vimeocdn.com' },
      { protocol: 'https', hostname: '**.b-cdn.net' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Empacota servidor e dependencias tracadas num diretorio so, para a imagem
  // Docker nao precisar carregar o node_modules inteiro. Fora do Docker fica
  // desligado: a Vercel monta o proprio output e nao usa este modo.
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
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

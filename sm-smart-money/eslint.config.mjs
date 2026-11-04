import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/** eslint-config-next 16 já exporta flat config; não há necessidade de FlatCompat. */
export default [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // A plataforma pode ser servida num prefixo (`basePath`, ex. /viplounge).
      // O Next reescreve <Link>, router e assets proprios, mas nao reescreve
      // caminho que o nosso codigo monta como string. Sem `rota()`, um
      // `fetch('/api/x')` vira 404 em producao e passa em desenvolvimento.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="fetch"] > Literal:first-child[value=/^\\//]',
          message: "Caminho absoluto em fetch(): use fetch(rota('/api/...')) — ver src/lib/rotas.ts.",
        },
        {
          selector:
            'CallExpression[callee.name="fetch"] > TemplateLiteral:first-child > TemplateElement:first-child[value.raw=/^\\//]',
          message: 'Caminho absoluto em fetch(): use fetch(rota(`/api/...`)) — ver src/lib/rotas.ts.',
        },
        {
          selector:
            'MemberExpression[object.object.name="window"][object.property.name="location"][property.name="origin"]',
          message: 'window.location.origin perde o prefixo da aplicacao: use urlAbsoluta() de src/lib/rotas.ts.',
        },
      ],
    },
  },
  {
    // rotas.ts e' a propria implementacao: e' onde o prefixo e a origem sao lidos.
    files: ['src/lib/rotas.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // Arquivos de configuração exportam o objeto direto por contrato da ferramenta.
    files: ['*.mjs', '*.js', '*.ts'],
    rules: { 'import/no-anonymous-default-export': 'off' },
  },
];

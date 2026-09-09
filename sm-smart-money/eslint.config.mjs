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
    },
  },
  {
    // Arquivos de configuração exportam o objeto direto por contrato da ferramenta.
    files: ['*.mjs', '*.js', '*.ts'],
    rules: { 'import/no-anonymous-default-export': 'off' },
  },
];

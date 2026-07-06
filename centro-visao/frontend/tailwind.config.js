/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Cores da marca Centro Visão (extraídas da logo oficial)
        brand: {
          blue: '#1C63A1',
          teal: '#3897AF',
          dark: '#0b0f14', // container escuro do cabeçalho/logo
        },
      },
    },
  },
  plugins: [],
};

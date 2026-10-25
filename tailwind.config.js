/** @type {import('tailwindcss').Config} */

// cores semânticas: o valor real vem de variáveis CSS em globals.css (muda com o tema)
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  darkMode : 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        app: token('c-app'),            // fundo da janela
        surface: token('c-surface'),    // cartões, painéis, sidebar
        subtle: token('c-subtle'),      // cabeçalhos de tabela, campos de busca, trilhas
        hover: token('c-hover'),        // hover de itens clicáveis
        line: token('c-line'),          // bordas discretas
        'line-strong': token('c-line-strong'),
        fg: token('c-fg'),              // texto principal
        muted: token('c-muted'),        // texto secundário
        faint: token('c-faint'),        // texto de apoio / placeholders
        accent: {
          DEFAULT: token('c-accent'),
          fg: token('c-accent-fg'),     // texto sobre o accent
          soft: token('c-accent-soft'), // fundo suave do item ativo
          strong: token('c-accent-strong'),
        },
        danger: token('c-danger'),
        success: token('c-success'),
        warning: token('c-warning'),
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
      },
      keyframes: {
        'tooltip-in': { from: { opacity: '0', transform: 'translateY(2px) scale(0.98)' }, to: { opacity: '1', transform: 'none' } },
        'pop-in': { from: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'tooltip-in': 'tooltip-in 120ms ease-out',
        'pop-in': 'pop-in 140ms ease-out',
      },
      boxShadow: {
        sm: '0 1px 2px rgb(var(--c-shadow) / 0.06)',
        DEFAULT: '0 1px 3px rgb(var(--c-shadow) / 0.08), 0 1px 2px rgb(var(--c-shadow) / 0.04)',
        md: '0 4px 12px -2px rgb(var(--c-shadow) / 0.10), 0 2px 4px -2px rgb(var(--c-shadow) / 0.06)',
        lg: '0 12px 28px -8px rgb(var(--c-shadow) / 0.18), 0 4px 8px -4px rgb(var(--c-shadow) / 0.08)',
        xl: '0 20px 40px -12px rgb(var(--c-shadow) / 0.25)',
        '2xl': '0 28px 60px -16px rgb(var(--c-shadow) / 0.35)',
      },
    },
  },
  plugins: [],
};

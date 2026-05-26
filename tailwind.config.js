/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    // Themes and other config-shaped modules under lib/ hold Tailwind class
    // strings (theme.card, theme.linkRow, arbitrary-value shadows / glows
    // for the per-theme hover variants). Without this entry JIT silently
    // drops those classes — mono's brutalist offset shadow had been a
    // no-op until this got added.
    './lib/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        // Slower, gentler than the default animate-pulse — used for the
        // halo behind visited-country dots on the world map. Three-second
        // cycle is calm enough to not steal attention from the dot itself.
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}






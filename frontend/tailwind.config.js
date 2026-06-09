/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          yellow: '#ecad0a',
        },
        primary: {
          blue: '#209dd7',
        },
        secondary: {
          purple: '#753991',
        },
        background: {
          dark: '#0d1117',
          panel: '#1a1a2e',
          surface: '#1e2033',
          border: '#2a2d3e',
        },
        text: {
          primary: '#e6edf3',
          secondary: '#8b949e',
          muted: '#6e7681',
        },
        status: {
          up: '#3fb950',
          down: '#f85149',
          neutral: '#8b949e',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}

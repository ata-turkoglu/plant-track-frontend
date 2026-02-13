/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#0056A3',
          50: '#e6f0fa',
          100: '#cce1f5',
          200: '#99c3e8',
          300: '#67a5dc',
          400: '#1f76c2',
          500: '#0056A3',
          600: '#004c93',
          700: '#003f7c',
        },
        shell: '#f4f6f8',
        panel: '#ffffff',
        slate: '#243447',
        accent: '#e9f5f4',
      },
      boxShadow: {
        card: '0 25px 70px rgba(15, 23, 42, 0.12)',
      },
    },
  },
  plugins: [],
};

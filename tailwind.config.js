/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        orange: '#E57A3A',
        'gray-light': '#D9D8D6',
      },
      fontFamily: {
        // Swap these src values when real fonts arrive — just update the @font-face
        // declarations in index.css and change these names to match.
        display: ['"Playfair Display"', 'Georgia', 'serif'],   // → Eames Century Modern Bold
        sans: ['"Barlow"', '"Arial"', 'sans-serif'],           // → DIN 2014
      },
    },
  },
  plugins: [],
}

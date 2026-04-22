/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        acorn: {
          50: '#fdf8f0',
          100: '#faecd9',
          500: '#d97706',
          600: '#b45309',
        },
        forest: {
          500: '#16a34a',
          600: '#15803d',
        },
      },
    },
  },
  plugins: [],
}

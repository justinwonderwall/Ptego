/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

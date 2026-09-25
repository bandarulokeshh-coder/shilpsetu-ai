/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef3e2',
          100: '#fde6c5',
          200: '#fbcd8b',
          300: '#f9b451',
          400: '#f79b17',
          500: '#e8890b',
          600: '#b46b08',
          700: '#804d06',
          800: '#4c2e04',
          900: '#181002',
        },
      },
    },
  },
  plugins: [],
}

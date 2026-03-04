/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef5ff',
          100: '#d9e9ff',
          200: '#bcd6ff',
          300: '#8eb9ff',
          400: '#5990ff',
          500: '#3265f5',
          600: '#1e45eb',
          700: '#1a33d1',
          800: '#1c2eaa',
          900: '#1e2e86',
          950: '#141e52',
        },
        slate: {
          850: '#1a2234',
          900: '#0f172a',
          950: '#080e1c',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

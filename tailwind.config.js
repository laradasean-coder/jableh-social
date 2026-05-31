/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  safelist: [
    // Dynamic color classes used in JS template literals
    { pattern: /^(bg|text|border|ring)-(blue|purple|green|red|yellow|orange|teal|pink|gray|amber)-(50|100|200|400|600|700|800)$/ },
    'animate-spin', 'animate-pulse',
    'bg-green-500','bg-red-500','bg-yellow-500','bg-blue-500','bg-purple-500',
    'text-green-600','text-red-600','text-yellow-600','text-blue-600','text-purple-600','text-teal-600','text-orange-600',
  ],
  theme: {
    extend: {
      fontFamily: { arabic: ['Cairo', 'Tajawal', 'sans-serif'] },
      colors: {
        primary: { 50:'#eff6ff',100:'#dbeafe',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' },
        accent:  { 500:'#10b981', 600:'#059669' }
      }
    },
  },
  plugins: [],
}

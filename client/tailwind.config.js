/** @type {import('tailwindcss').Config} */
export default {
  // Must match ThemeContext: `dark` on <html> toggles `dark:*` utilities.
  // Without this, Tailwind defaults to `media` (OS preference) and fights app theme → e.g. white text on light BG.
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
} 
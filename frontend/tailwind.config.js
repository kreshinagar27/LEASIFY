/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Precise Palette from Reference & Instructions
        brand: {
          50: '#FBF7F0',   // Surface
          100: '#F5EEE3',  // Background
          200: '#DFD0BD',  // Border
          300: '#C58A58',  // Accent terracotta
          400: '#837166',  // Text muted
          500: '#4B1715',  // Deep burgundy / primary
          600: '#652522',  // Primary hover
          700: '#35110F',  // Primary active
          800: '#261714',  // Dark surface
          900: '#1B100E',  // Dark background
          950: '#120A09',
        },
        cream: {
          50: '#FDFBF7',
          100: '#FBF7F0',
          200: '#F5EEE3',
          300: '#EFE5D5',
          400: '#DFD0BD',
          500: '#C7B49F',
          600: '#9B8779',
          700: '#837166',
          800: '#54443B',
          900: '#35231F',
        },
        espresso: {
          50: '#F7EFE5',
          100: '#EBDCCE',
          200: '#C1AD9D',
          300: '#9A8474',
          400: '#755F51',
          500: '#533D31',
          600: '#3D2A20',
          700: '#35231F',
          800: '#261714',
          900: '#1B100E',
          950: '#120A09',
        },
        terracotta: {
          400: '#D49563',
          500: '#B97843',
          600: '#A16332',
        },
        darkBrand: {
          primary: '#5C211D',
          primaryHover: '#75302A',
          primaryActive: '#471815',
          bg: '#1B100E',
          surface: '#261714',
          surfaceElevated: '#30201C',
          surfaceMuted: '#3D2823',
          textPrimary: '#F7EFE5',
          textSecondary: '#C1AD9D',
          textMuted: '#9A8474',
          border: '#49312A',
          accent: '#C58A58',
        },
        // Warm sand / espresso replacement for slate/gray to eliminate cool blue tones
        slate: {
          50: '#FBF7F0',
          100: '#F5EEE3',
          200: '#EFE5D5',
          300: '#DFD0BD',
          400: '#837166',
          500: '#6D5B51',
          600: '#54443B',
          700: '#35231F',
          800: '#261714',
          900: '#1B100E',
          950: '#120A09',
        },
        status: {
          success: '#2D6A4F',
          successBg: 'rgba(45, 106, 79, 0.12)',
          warning: '#B45309',
          warningBg: 'rgba(180, 83, 9, 0.12)',
          error: '#8B2622',
          errorBg: 'rgba(139, 38, 34, 0.12)',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'warm-sm': '0 2px 8px -1px rgba(63, 43, 31, 0.05)',
        'warm': '0 10px 30px rgba(63, 43, 31, 0.07)',
        'warm-lg': '0 16px 36px rgba(63, 43, 31, 0.09)',
        'warm-xl': '0 24px 50px rgba(63, 43, 31, 0.12)',
        'glow-brand': '0 10px 26px -5px rgba(74, 25, 23, 0.38)',
        'glass-light': '0 10px 30px rgba(63, 43, 31, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.38)',
        'glass-dark': '0 10px 30px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 245, 232, 0.035)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'float-slow': 'float 7s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' }
        }
      }
    },
  },
  plugins: [],
}

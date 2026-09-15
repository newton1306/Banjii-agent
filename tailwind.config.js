/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#0A0A12',
          secondary: '#10101A',
          tertiary: '#141422',
        },
        card: {
          DEFAULT: '#181826',
          secondary: '#202034',
          highlight: '#25253e',
        },
        neon: {
          lime: '#D4F933',
          limeHover: '#c1e620',
          limeGlow: 'rgba(212, 249, 51, 0.25)',
        },
        electric: {
          violet: '#5B4EFF',
          violetHover: '#4b3ee8',
          violetGlow: 'rgba(91, 78, 255, 0.35)',
        },
        bank: {
          kbank: '#138F2D',
          ktb: '#00A7E6',
          bbl: '#1E3A8A',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'Kanit', 'sans-serif'],
      },
      boxShadow: {
        'glow-lime': '0 0 20px -2px rgba(212, 249, 51, 0.4)',
        'glow-violet': '0 0 24px -2px rgba(91, 78, 255, 0.45)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}

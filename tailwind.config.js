const { fontFamily } = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}", // add components folder if needed
  ],
  theme: {
    extend: {
      backgroundImage: {
        'landing-gradient':
            'linear-gradient(160deg,rgba(255, 167, 38, 1) 0%, rgba(168, 160, 160, 1) 21%, rgba(26, 32, 55, 1) 23%, rgba(20, 35, 92, 1) 43%, rgba(16, 37, 122, 1) 48%, rgba(26, 32, 55, 1) 71%, rgba(36, 50, 103, 1) 100%)',
      },
      keyframes: {
        'border-spin': {
          '100%': {
            transform: 'rotate(-360deg)',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up-fade': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'border-spin': 'border-spin 3s linear infinite',
        float: 'float 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up-fade': 'slide-up-fade 0.25s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
      fontFamily: {
        poppins: ['Poppins', ...fontFamily.sans],
        jersey: ['"Jersey 10"', 'cursive'],
      },
    },
  },
  plugins:  [require('tailwind-scrollbar'),
],
} 
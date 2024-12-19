/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./src/**/*.{html,js}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark-primary': '#000000',
        'dark-secondary': '#0a0a0a',
        'dark-accent': '#111111',
        'light-primary': '#ffffff',
        'light-secondary': '#f3f4f6',
        'accent-blue': '#3b82f6',
        'accent-purple': '#8b5cf6',
        'accent-pink': '#ec4899'
      },
      backgroundColor: {
        'glass': 'rgba(255, 255, 255, 0.02)',
        'glass-dark': 'rgba(0, 0, 0, 0.7)',
        'glass-darker': 'rgba(0, 0, 0, 0.9)'
      },
      backdropFilter: {
        'glass': 'blur(16px)',
        'glass-sm': 'blur(8px)',
        'glass-lg': 'blur(24px)'
      },
      boxShadow: {
        'glass': '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
        'glass-hover': '0 8px 32px 0 rgba(59, 130, 246, 0.15)',
        'glass-inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
      },
      borderColor: {
        'glass': 'rgba(255, 255, 255, 0.03)',
        'glass-dark': 'rgba(255, 255, 255, 0.02)'
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        }
      },
      animation: {
        shimmer: 'shimmer 2s infinite'
      }
    },
  },
  plugins: [
    function({ addBase, addComponents, theme }) {
      addBase({
        'html.dark': {
          backgroundColor: theme('colors.dark-primary'),
          color: theme('colors.light-primary'),
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.03), transparent 1000px)',
        },
        'body': {
          minHeight: '100vh',
        }
      });
      
      addComponents({
        '.glass-card': {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(16px)',
          borderRadius: theme('borderRadius.xl'),
          padding: theme('spacing.6'),
          boxShadow: theme('boxShadow.glass-dark'),
          border: '1px solid rgba(255, 255, 255, 0.03)',
          transition: 'all 300ms ease',
          '&:hover': {
            boxShadow: theme('boxShadow.glass-hover'),
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: 'rgba(255, 255, 255, 0.05)',
          }
        },
        '.glass-button': {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(16px)',
          padding: `${theme('spacing.2')} ${theme('spacing.4')}`,
          borderRadius: theme('borderRadius.lg'),
          border: '1px solid rgba(255, 255, 255, 0.03)',
          transition: 'all 300ms ease',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            boxShadow: theme('boxShadow.glass-hover'),
            transform: 'translateY(-1px)',
            borderColor: theme('colors.accent-blue'),
          },
          '&:active': {
            transform: 'translateY(0)',
          }
        },
        '.glass-input': {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(16px)',
          padding: `${theme('spacing.2')} ${theme('spacing.4')}`,
          borderRadius: theme('borderRadius.lg'),
          border: '1px solid rgba(255, 255, 255, 0.03)',
          color: theme('colors.light-primary'),
          transition: 'all 300ms ease',
          '&:focus': {
            outline: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: theme('colors.accent-blue'),
            boxShadow: `0 0 0 2px ${theme('colors.accent-blue')}20`,
          },
        },
        '.glass-panel': {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(24px)',
          borderRadius: theme('borderRadius.2xl'),
          padding: theme('spacing.8'),
          boxShadow: theme('boxShadow.glass-dark'),
          border: '1px solid rgba(255, 255, 255, 0.03)',
          position: 'relative',
          zIndex: '10',
          transition: 'all 300ms ease',
          '&:hover': {
            boxShadow: theme('boxShadow.glass-hover'),
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
          }
        },
        '.nav-item': {
          padding: `${theme('spacing.2')} ${theme('spacing.4')}`,
          borderRadius: theme('borderRadius.lg'),
          color: theme('colors.gray.400'),
          transition: 'all 300ms ease',
          '&:hover': {
            color: theme('colors.light-primary'),
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
          '&.active': {
            color: theme('colors.accent-blue'),
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          }
        },
        '.stat-card': {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(16px)',
          borderRadius: theme('borderRadius.xl'),
          padding: theme('spacing.6'),
          boxShadow: theme('boxShadow.glass-dark'),
          border: '1px solid rgba(255, 255, 255, 0.03)',
          transition: 'all 300ms ease',
          '&:hover': {
            boxShadow: theme('boxShadow.glass-hover'),
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            transform: 'translateY(-2px)',
          }
        },
        '.project-card': {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(16px)',
          borderRadius: theme('borderRadius.xl'),
          padding: theme('spacing.6'),
          boxShadow: theme('boxShadow.glass-dark'),
          border: '1px solid rgba(255, 255, 255, 0.03)',
          transition: 'all 300ms ease',
          '&:hover': {
            boxShadow: theme('boxShadow.glass-hover'),
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            transform: 'translateY(-2px)',
          }
        },
        '.animated-shape': {
          position: 'absolute',
          borderRadius: '50%',
          filter: 'blur(80px)',
          zIndex: '1',
          opacity: '0.15',
          mixBlendMode: 'screen',
        },
        '.skeleton': {
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            transform: 'translateX(-100%)',
            backgroundImage: 'linear-gradient(90deg, rgba(255, 255, 255, 0) 0, rgba(255, 255, 255, 0.02) 20%, rgba(255, 255, 255, 0.05) 60%, rgba(255, 255, 255, 0))',
            animation: 'shimmer 2s infinite',
          }
        }
      });
    }
  ],
}; 
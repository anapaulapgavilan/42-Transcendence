export default {
  content: ["./src/views/**/*.ejs"],
  theme: {
    extend: {
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
        'orbitron': ['Orbitron', 'monospace']
      },
      animation: {
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'glow-green': 'glow-green 2s ease-in-out infinite alternate',
        'glow-purple': 'glow-purple 2s ease-in-out infinite alternate',
        'fadeInUp': 'fadeInUp 0.6s ease-out',
        'fadeInUp-delay-1': 'fadeInUp 0.6s ease-out 0.1s both',
        'fadeInUp-delay-2': 'fadeInUp 0.6s ease-out 0.2s both',
        'fadeInUp-delay-3': 'fadeInUp 0.6s ease-out 0.3s both',
        'fadeInUp-delay-4': 'fadeInUp 0.6s ease-out 0.4s both',
        'fadeInUp-delay-5': 'fadeInUp 0.6s ease-out 0.5s both',
        'fadeInUp-delay-6': 'fadeInUp 0.6s ease-out 0.6s both',
        'fadeInUp-delay-7': 'fadeInUp 0.6s ease-out 0.7s both',
        'fadeInUp-delay-8': 'fadeInUp 0.6s ease-out 0.8s both',
        'ripple': 'ripple-animation 0.6s linear',
        'subtle-pulse': 'subtle-pulse 4s ease-in-out infinite',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        'glow': {
          '0%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)' },
          '100%': { boxShadow: '0 0 40px rgba(168, 85, 247, 0.8)' }
        },
        'glow-green': {
          '0%': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)' },
          '100%': { boxShadow: '0 0 40px rgba(34, 197, 94, 0.8)' }
        },
        'glow-purple': {
          '0%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)' },
          '100%': { boxShadow: '0 0 40px rgba(139, 92, 246, 0.8)' }
        },
        'fadeInUp': {
          'from': {
            opacity: '0',
            transform: 'translateY(30px) scale(0.95)'
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0) scale(1)'
          }
        },
        'ripple-animation': {
          'to': {
            transform: 'scale(4)',
            opacity: '0'
          }
        },
        'subtle-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(168, 85, 247, 0.4)' }
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-pattern': `
          radial-gradient(circle at 25% 25%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 75% 25%, rgba(236, 72, 153, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 25% 75%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)
        `,
      },
      backgroundSize: {
        '400': '400% 400%',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 30px rgba(168, 85, 247, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass-hover': '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 40px rgba(168, 85, 247, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        'neon': '0 0 20px rgba(168, 85, 247, 0.3), inset 0 0 20px rgba(168, 85, 247, 0.1)',
        'neon-hover': '0 0 25px rgba(168, 85, 247, 0.4), inset 0 0 20px rgba(168, 85, 247, 0.15)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    }
  },
  plugins: [],
}

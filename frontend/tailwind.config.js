/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        jakarta: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        linen: {
          bg: '#F8F7F4',
          'surface-1': '#FFFFFF',
          'surface-2': '#F2F1EE',
          'surface-3': '#ECEAE6',
          'border': '#E4E2DC',
          'border-strong': '#C9C7C0',
          primary: '#1A1A1A',
          'primary-hover': '#333333',
          amber: '#D97706',
          success: '#16A34A',
          danger: '#DC2626',
          info: '#2563EB',
          lime: '#84CC16',
          'text-primary': '#1A1A1A',
          'text-secondary': '#6B6966',
          'text-muted': '#A8A5A0',
        },
      },
      borderRadius: {
        'linen-sm': '6px',
        'linen': '8px',
        'linen-lg': '12px',
        'linen-xl': '16px',
        'linen-pill': '100px',
      },
      boxShadow: {
        'linen-modal': '0 8px 32px rgba(0,0,0,0.08)',
        'linen-toast': '0 4px 16px rgba(0,0,0,0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease',
        'modal-in': 'modalIn 200ms ease',
        'cart-flash': 'cartFlash 300ms ease',
        'breathe': 'breathe 3s infinite ease-in-out',
        'shimmer': 'shimmer 1.8s infinite',
      },
    },
  },
  plugins: [],
}

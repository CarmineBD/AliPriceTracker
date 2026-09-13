import type { Config } from 'tailwindcss';

const color = (token: string) => `oklch(from var(${token}) l c h / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: color('--border'),
        input: color('--input'),
        ring: color('--ring'),
        background: color('--background'),
        foreground: color('--foreground'),
        primary: {
          DEFAULT: color('--primary'),
          foreground: color('--primary-foreground'),
        },
        secondary: {
          DEFAULT: color('--secondary'),
          foreground: color('--secondary-foreground'),
        },
        destructive: {
          DEFAULT: color('--destructive'),
          foreground: color('--destructive-foreground'),
        },
        muted: {
          DEFAULT: color('--muted'),
          foreground: color('--muted-foreground'),
        },
        accent: {
          DEFAULT: color('--accent'),
          foreground: color('--accent-foreground'),
        },
        popover: {
          DEFAULT: color('--popover'),
          foreground: color('--popover-foreground'),
        },
        card: {
          DEFAULT: color('--card'),
          foreground: color('--card-foreground'),
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      ringWidth: {
        3: '3px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
    },
  },
  plugins: [],
} satisfies Config;

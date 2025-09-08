import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				'ocean-blue': 'hsl(var(--ocean-blue))',
				'ocean-blue-dark': 'hsl(var(--ocean-blue-dark))',
				'ocean-blue-light': 'hsl(var(--ocean-blue-light))',
				'ocean-blue-glow': 'hsl(var(--ocean-blue-glow))',
				'earth-warm': 'hsl(var(--earth-warm))',
				'earth-warm-dark': 'hsl(var(--earth-warm-dark))',
				'earth-light': 'hsl(var(--earth-light))',
				'earth-muted': 'hsl(var(--earth-muted))',
				'success-green': 'hsl(var(--success-green))',
				'success-green-dark': 'hsl(var(--success-green-dark))',
				'success-green-light': 'hsl(var(--success-green-light))',
				'success-green-glow': 'hsl(var(--success-green-glow))',
        /* Brand-safe aliases used in new glass UI polish (deprecated - use semantic tokens) */
        brand: {
          blue: 'hsl(214 100% 59%)',
          blue700: 'hsl(217 91% 60%)',
          green: 'hsl(142 76% 47%)',
          green600: 'hsl(142 72% 44%)',
          gray900: 'hsl(222 84% 5%)',
          gray700: 'hsl(215 28% 17%)',
          gray500: 'hsl(220 9% 46%)',
          gray200: 'hsl(220 13% 91%)',
          white: 'hsl(0 0% 100%)',
        },
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			backgroundImage: {
				'brand-gradient': 'var(--brand-gradient)'
			},
			boxShadow: {
				soft: '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
				card: '0 6px 20px rgba(37,99,235,.08)',
				pop: '0 12px 24px rgba(0,0,0,.12), 0 8px 12px rgba(37,99,235,.08)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				xl: '0.9rem',
				'2xl': '1.25rem'
			},
			transitionTimingFunction: {
				'out-soft': 'cubic-bezier(.22,.61,.36,1)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'soft-float': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-2px)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'soft-float': 'soft-float 6s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

import type { Config } from "tailwindcss";

const defaultTheme = require('tailwindcss/defaultTheme');

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
		"../../packages/**/*.{ts,tsx}",
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
			fontFamily: {
				sans: ['Inter var', ...defaultTheme.fontFamily.sans],
				display: ['Inter var', ...defaultTheme.fontFamily.sans],
			},
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
			success: {
				DEFAULT: 'hsl(var(--success))',
				foreground: 'hsl(var(--success-foreground))'
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

				// iOS-inspired colors
				'ios-blue': 'hsl(var(--ios-blue))',
				'ios-blue-dark': 'hsl(var(--ios-blue-dark))',
				'ios-blue-light': 'hsl(var(--ios-blue-light))',
				'ios-green': 'hsl(var(--ios-green))',
				'ios-green-light': 'hsl(var(--ios-green-light))',
				'ios-orange': 'hsl(var(--ios-orange))',
				'ios-red': 'hsl(var(--ios-red))',
				'ios-purple': 'hsl(var(--ios-purple))',
				'ios-indigo': 'hsl(var(--ios-indigo))',
				'ios-teal': 'hsl(var(--ios-teal))',
				'ios-pink': 'hsl(var(--ios-pink))',
				'ios-gray': 'hsl(var(--ios-gray))',
				'ios-gray-light': 'hsl(var(--ios-gray-light))',
				'ios-gray-dark': 'hsl(var(--ios-gray-dark))',

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
				pop: '0 12px 24px rgba(0,0,0,.12), 0 8px 12px rgba(37,99,235,.08)',
				'ios-xs': '0 1px 3px rgba(0, 0, 0, 0.08)',
				'ios-sm': '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.08)',
				'ios-md': '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
				'ios-lg': '0 8px 32px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04)',
				'ios-xl': '0 16px 64px rgba(0, 0, 0, 0.12), 0 8px 32px rgba(0, 0, 0, 0.06)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				xl: '1rem',
				'2xl': '1.25rem',
				'3xl': '1.5rem',
				'ios': '1.25rem', // iOS-style rounded corners
				'ios-card': '1rem',
				'ios-button': '0.75rem'
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
				},
				'message-incoming': {
					'0%': { transform: 'translateY(6px) scale(0.98)', opacity: '0' },
					'60%': { transform: 'translateY(-2px) scale(1.01)', opacity: '1' },
					'100%': { transform: 'translateY(0) scale(1)', opacity: '1' }
				},
				'message-outgoing': {
					'0%': { transform: 'translateY(6px) translateX(12px) scale(0.96)', opacity: '0' },
					'70%': { transform: 'translateY(-2px) translateX(0) scale(1.02)', opacity: '1' },
					'100%': { transform: 'translateY(0) translateX(0) scale(1)', opacity: '1' }
				},
				'message-status-pulse': {
					'0%': { transform: 'scale(0.9)', opacity: '0.4' },
					'50%': { transform: 'scale(1)', opacity: '1' },
					'100%': { transform: 'scale(0.95)', opacity: '0.7' }
				},
				'typing-bounce': {
					'0%, 80%, 100%': { transform: 'scale(0)' },
					'40%': { transform: 'scale(1)' }
				},
        'composer-focus': {
          '0%': { transform: 'translateY(10px) scale(0.98)', opacity: '0' },
          '60%': { transform: 'translateY(-2px) scale(1.01)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' }
        },
        'send-press': {
          '0%': { transform: 'scale(0.92) rotate(-6deg)' },
          '60%': { transform: 'scale(1.08) rotate(2deg)' },
          '100%': { transform: 'scale(1) rotate(0)' }
        },
        'attachment-pop': {
          '0%': { transform: 'translateY(8px) scale(0.96)', opacity: '0' },
          '60%': { transform: 'translateY(-2px) scale(1.02)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' }
        },
				'conversation-entry': {
					'0%': { transform: 'translateY(12px)', opacity: '0' },
					'60%': { transform: 'translateY(-4px)', opacity: '1' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'badge-pop': {
					'0%': { transform: 'scale(0.6)', opacity: '0' },
					'70%': { transform: 'scale(1.15)', opacity: '1' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'msg-spring-pop': {
					'0%': { transform: 'scale(0.55) translateY(14px)', opacity: '0' },
					'50%': { transform: 'scale(1.08) translateY(-4px)', opacity: '1' },
					'75%': { transform: 'scale(0.97) translateY(1px)', opacity: '1' },
					'100%': { transform: 'scale(1) translateY(0)', opacity: '1' }
				},
				'msg-slide-in': {
					'0%': { transform: 'translateX(-16px) scale(0.96)', opacity: '0' },
					'60%': { transform: 'translateX(3px) scale(1.01)', opacity: '1' },
					'100%': { transform: 'translateX(0) scale(1)', opacity: '1' }
				},
				'nav-pill-in': {
					'0%': { opacity: '0', transform: 'scaleX(0.6)' },
					'100%': { opacity: '1', transform: 'scaleX(1)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'soft-float': 'soft-float 6s ease-in-out infinite',
				'message-incoming': 'message-incoming 0.24s cubic-bezier(.22,.61,.36,1) both',
				'message-outgoing': 'message-outgoing 0.24s cubic-bezier(.22,.61,.36,1) both',
				'message-status-pulse': 'message-status-pulse 1.6s ease-in-out infinite',
				'typing-bounce': 'typing-bounce 1.2s ease-in-out infinite',
				'composer-focus': 'composer-focus 0.18s cubic-bezier(.22,.61,.36,1) both',
				'send-press': 'send-press 0.22s cubic-bezier(.22,.61,.36,1) both',
				'attachment-pop': 'attachment-pop 0.3s cubic-bezier(.22,.61,.36,1) both',
				'conversation-entry': 'conversation-entry 0.28s cubic-bezier(.22,.61,.36,1) both',
				'badge-pop': 'badge-pop 0.4s ease-out',
				'msg-spring-pop': 'msg-spring-pop 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both',
				'msg-slide-in': 'msg-slide-in 0.3s cubic-bezier(.22,.61,.36,1) both',
				'nav-pill-in': 'nav-pill-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

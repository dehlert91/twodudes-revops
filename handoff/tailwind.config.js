// tailwind.config.js — Two Dudes Design System
// Drop-in replacement. Extends your existing Tailwind config with the full
// design-system token set. Your original `orange` and `gray-light` values
// are preserved; everything else is additive.

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand (same hex values, semantic namespace)
        orange: {
          DEFAULT: '#E57A3A',
          dark:    '#C4622A',
          light:   '#F0A882',
        },
        'gray-light': '#D9D8D6', // preserved from original config

        // Semantic neutrals — use these in components, not raw hex
        ink:      '#1A1A1A',
        charcoal: '#434343',
        'charcoal-darker': '#222222',
        muted:    '#8E8E8E',
        line:     '#E0E0E0',
        'line-strong': '#CCCCCC',
        'line-soft':   '#E8E8E8',
        surface:  '#FFFFFF',
        'surface-subtle': '#F8F8F8',
        'surface-muted':  '#F4F4F4',

        // Status
        success: '#4A8C5C',
        warning: '#E57A3A',
        error:   '#C0392B',
        info:    '#2980B9',
      },
      fontFamily: {
        // Swap src values in index.css when licensed DIN 2014 / Eames files arrive
        display: ['"Barlow"', '"din-2014"', '"Helvetica Neue"', 'Arial', 'sans-serif'], // → DIN 2014
        sans:    ['"Barlow"', '"din-2014"', '"Helvetica Neue"', 'Arial', 'sans-serif'], // → DIN 2014
        mono:    ['"DM Mono"', '"Courier New"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Type scale — see SKILL.md
        'label':   ['11px', { lineHeight: '1.4', letterSpacing: '0.06em', fontWeight: '600' }],
        'small':   ['13px', { lineHeight: '1.4' }],
        'body':    ['15px', { lineHeight: '1.5' }],
        'h3':      ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'h2':      ['24px', { lineHeight: '1.2', fontWeight: '700' }],
        'h1':      ['32px', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.01em' }],
        'display': ['44px', { lineHeight: '1',   fontWeight: '700', letterSpacing: '-0.015em' }],
      },
      spacing: {
        xs:  '4px',
        sm:  '8px',
        md:  '16px',
        lg:  '24px',
        xl:  '40px',
        '2xl': '64px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        card:     '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        elevated: '0 4px 12px rgba(0,0,0,0.10)',
        focus:    '0 0 0 3px rgba(229,122,58,0.15)',
      },
    },
  },
  plugins: [],
}

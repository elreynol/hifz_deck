import { extendTheme } from '@chakra-ui/react'

/**
 * Visual system for Hifz Deck:
 * cool stone mist + deep teal ink + muted gold (ties to السابقون Elite).
 * Avoids purple gradients and flat gray dashboards.
 */
const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  fonts: {
    heading: `'Fraunces', Georgia, serif`,
    body: `'Source Sans 3', 'Segoe UI', sans-serif`,
    arabic: `'Noto Naskh Arabic', serif`,
  },
  colors: {
    // Soft stone / mist surfaces
    mist: {
      50: '#f4f7f6',
      100: '#e8efec',
      200: '#d5e0db',
      300: '#b7c9c1',
      400: '#8fa89e',
      500: '#6f8b81',
      600: '#587069',
      700: '#475a55',
      800: '#3b4a46',
      900: '#333f3c',
    },
    // Deep teal ink for brand + primary actions
    ink: {
      50: '#eef7f5',
      100: '#d5ebe6',
      200: '#aed7ce',
      300: '#7ebbb0',
      400: '#549a90',
      500: '#3a7d74',
      600: '#2d645d',
      700: '#27514c',
      800: '#22423f',
      900: '#1f3836',
    },
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
    },
    error: {
      50: '#fef2f2',
      500: '#ef4444',
    },
    // السابقون Elite — muted gold + deep ink
    elite: {
      50: '#faf6eb',
      100: '#f0e6c8',
      200: '#e0c97a',
      300: '#c9a84a',
      400: '#b8922e',
      500: '#9a7b24',
      600: '#7a611c',
      700: '#5c4a16',
      800: '#1a2332',
      900: '#0f1620',
    },
  },
  radii: {
    md: '0.65rem',
    lg: '1rem',
    xl: '1.25rem',
  },
  shadows: {
    soft: '0 8px 28px rgba(31, 56, 54, 0.08)',
    panel: '0 12px 40px rgba(31, 56, 54, 0.10)',
  },
  styles: {
    global: (props) => {
      const isDark = props.colorMode === 'dark'
      return {
        'html, body, #root': {
          minHeight: '100%',
        },
        body: {
          bg: isDark ? 'ink.900' : 'mist.50',
          color: isDark ? 'mist.50' : 'ink.900',
          fontFamily: 'body',
        },
        '[data-elite="true"]': {
          borderTopWidth: '3px',
          borderTopColor: isDark ? 'elite.300' : 'elite.500',
        },
      }
    },
  },
  components: {
    Heading: {
      baseStyle: {
        fontFamily: 'heading',
        fontWeight: '600',
        letterSpacing: '-0.02em',
      },
    },
    Button: {
      baseStyle: {
        fontWeight: '600',
        borderRadius: 'md',
      },
    },
  },
})

export default theme

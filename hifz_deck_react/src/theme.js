import { extendTheme } from '@chakra-ui/react'

/**
 * Visual system for Hifzer:
 * warm stone surfaces + deep slate ink + muted gold (Elite).
 * Neutral and layered — avoids flat green-teal dashboards.
 */
const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  fonts: {
    heading: `'Fraunces', Georgia, serif`,
    body: `'Source Sans 3', 'Segoe UI', sans-serif`,
    arabic: `'Noto Naskh Arabic', serif`,
  },
  colors: {
    // Warm stone / parchment surfaces
    mist: {
      50: '#faf9f7',
      100: '#f0ede8',
      200: '#e0dbd3',
      300: '#c9c2b8',
      400: '#a89f94',
      500: '#8a8178',
      600: '#6f6760',
      700: '#5a534d',
      800: '#4a4540',
      900: '#3f3b37',
    },
    // Deep slate ink for brand + primary actions
    ink: {
      50: '#f4f5f7',
      100: '#e8eaee',
      200: '#d0d5dc',
      300: '#aeb6c2',
      400: '#8893a3',
      500: '#6b7788',
      600: '#556070',
      700: '#454e5c',
      800: '#383f4a',
      900: '#2c323b',
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
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  shadows: {
    soft: '0 4px 18px rgba(44, 50, 59, 0.07), 0 1px 3px rgba(44, 50, 59, 0.04)',
    panel:
      '0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 12px 32px rgba(20, 24, 30, 0.14), 0 2px 8px rgba(20, 24, 30, 0.06)',
    panelLight:
      '0 1px 0 rgba(255, 255, 255, 0.85) inset, 0 10px 28px rgba(44, 50, 59, 0.08), 0 2px 6px rgba(44, 50, 59, 0.04)',
    insetSoft: 'inset 0 1px 2px rgba(20, 24, 30, 0.12)',
    insetSoftLight: 'inset 0 1px 2px rgba(44, 50, 59, 0.06)',
    focusRing: '0 0 0 3px rgba(107, 119, 136, 0.28)',
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
    Select: {
      variants: {
        compact: (props) => {
          const isDark = props.colorMode === 'dark'
          return {
            field: {
              h: '2rem',
              minH: '2rem',
              fontSize: 'sm',
              borderRadius: 'md',
              borderWidth: '1px',
              bg: isDark ? 'rgba(255, 255, 255, 0.06)' : 'white',
              borderColor: isDark ? 'whiteAlpha.250' : 'mist.300',
              boxShadow: isDark ? 'insetSoft' : 'insetSoftLight',
              _hover: {
                borderColor: isDark ? 'whiteAlpha.350' : 'mist.400',
              },
              _focusVisible: {
                borderColor: 'ink.400',
                boxShadow: 'focusRing',
              },
            },
            icon: {
              color: isDark ? 'whiteAlpha.600' : 'mist.500',
            },
          }
        },
      },
      defaultProps: {
        variant: 'compact',
      },
    },
  },
})

export default theme

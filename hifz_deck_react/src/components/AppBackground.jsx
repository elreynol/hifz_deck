import React from 'react'
import { Box, useColorMode } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'

/**
 * Atmospheric page background:
 * soft mist→ink gradient + a faint geometric lattice (Islamic-inspired, very quiet).
 * One gentle opacity drift so the page feels alive without distraction.
 */
const drift = keyframes`
  0% { opacity: 0.22; transform: translate3d(0, 0, 0); }
  50% { opacity: 0.32; transform: translate3d(-1.5%, 1%, 0); }
  100% { opacity: 0.22; transform: translate3d(0, 0, 0); }
`

const AppBackground = () => {
  const { colorMode } = useColorMode()
  const isDark = colorMode === 'dark'

  // Subtle 8-point lattice — readable as texture, not a loud pattern
  const patternStroke = isDark ? 'rgba(201, 168, 74, 0.18)' : 'rgba(58, 125, 116, 0.14)'
  const patternSvg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
      <g fill="none" stroke="${patternStroke}" stroke-width="1">
        <path d="M36 4 L68 36 L36 68 L4 36 Z"/>
        <path d="M36 16 L56 36 L36 56 L16 36 Z"/>
        <circle cx="36" cy="36" r="3"/>
      </g>
    </svg>`
  )

  return (
    <Box
      aria-hidden="true"
      position="fixed"
      inset={0}
      zIndex={0}
      pointerEvents="none"
      overflow="hidden"
    >
      {/* Base gradient atmosphere */}
      <Box
        position="absolute"
        inset={0}
        bgGradient={
          isDark
            ? 'radial(ellipse at 20% 0%, ink.800 0%, transparent 55%), radial(ellipse at 90% 20%, elite.900 0%, transparent 45%), linear(180deg, ink.900 0%, ink.800 55%, #121a1f 100%)'
            : 'radial(ellipse at 15% -10%, ink.100 0%, transparent 50%), radial(ellipse at 100% 0%, mist.100 0%, transparent 45%), linear(165deg, mist.50 0%, #eef4f2 42%, mist.100 100%)'
        }
      />

      {/* Soft vignette so content stays readable */}
      <Box
        position="absolute"
        inset={0}
        bgGradient={
          isDark
            ? 'radial(ellipse at center, transparent 40%, rgba(8,12,14,0.55) 100%)'
            : 'radial(ellipse at center, transparent 35%, rgba(244,247,246,0.65) 100%)'
        }
      />

      {/* Quiet geometric lattice with a slow drift */}
      <Box
        position="absolute"
        inset="-8%"
        opacity={isDark ? 0.28 : 0.26}
        animation={`${drift} 28s ease-in-out infinite`}
        style={{
          backgroundImage: `url("data:image/svg+xml,${patternSvg}")`,
          backgroundSize: '72px 72px',
        }}
      />
    </Box>
  )
}

export default AppBackground

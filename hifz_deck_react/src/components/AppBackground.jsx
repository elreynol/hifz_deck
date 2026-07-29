import React from 'react'
import { Box, useColorMode } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'

/**
 * Atmospheric page background:
 * warm stone gradient + quiet geometric lattice + soft depth layers.
 */
const drift = keyframes`
  0% { opacity: 0.18; transform: translate3d(0, 0, 0); }
  50% { opacity: 0.26; transform: translate3d(-1.5%, 1%, 0); }
  100% { opacity: 0.18; transform: translate3d(0, 0, 0); }
`

const AppBackground = () => {
  const { colorMode } = useColorMode()
  const isDark = colorMode === 'dark'

  const patternStroke = isDark ? 'rgba(201, 168, 74, 0.14)' : 'rgba(107, 119, 136, 0.12)'
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
      <Box
        position="absolute"
        inset={0}
        bgGradient={
          isDark
            ? 'radial(ellipse at 18% 0%, ink.800 0%, transparent 52%), radial(ellipse at 92% 12%, elite.900 0%, transparent 42%), linear(180deg, #232830 0%, ink.900 48%, #181c22 100%)'
            : 'radial(ellipse at 12% -8%, mist.100 0%, transparent 48%), radial(ellipse at 100% 0%, #ebe7e1 0%, transparent 40%), linear(168deg, mist.50 0%, #f3f0eb 45%, mist.100 100%)'
        }
      />

      {/* Warm highlight band for depth */}
      <Box
        position="absolute"
        top="-20%"
        left="10%"
        w="55%"
        h="45%"
        borderRadius="full"
        filter="blur(80px)"
        bg={isDark ? 'rgba(201, 168, 74, 0.06)' : 'rgba(255, 255, 255, 0.55)'}
      />

      <Box
        position="absolute"
        inset={0}
        bgGradient={
          isDark
            ? 'radial(ellipse at center, transparent 38%, rgba(12, 14, 18, 0.5) 100%)'
            : 'radial(ellipse at center, transparent 32%, rgba(250, 249, 247, 0.55) 100%)'
        }
      />

      <Box
        position="absolute"
        inset="-8%"
        opacity={isDark ? 0.22 : 0.2}
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

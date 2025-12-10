'use client'

import {
  Box,
  Container,
  Text,
  Button,
  Heading,
  VStack,
  Badge,
  Icon,
  Spinner, // (not used, but keep if you want a fallback)
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { FaFileInvoice, FaCalculator, FaHistory, FaChartPie } from 'react-icons/fa'

// 3D scene (no SSR)
const Hero3DDevices = dynamic(() => import('../3d/Hero3DDevices'), { ssr: false })

const COLORS = { black: '#08131F', teal: '#265966', gold: '#DC9807' }

/* -------------------- Hypnotic Loader Animations -------------------- */
const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`

const pulse = keyframes`
  0%   { transform: scale(0.95); filter: blur(10px); opacity: .9; }
  50%  { transform: scale(1.05); filter: blur(14px); opacity: .8; }
  100% { transform: scale(0.95); filter: blur(10px); opacity: .9; }
`

const morph = keyframes`
  0%   { border-radius: 36% 64% 58% 42% / 43% 35% 65% 57%; transform: rotate(0deg) scale(1); }
  50%  { border-radius: 58% 42% 36% 64% / 53% 65% 35% 47%; transform: rotate(10deg) scale(1.03); }
  100% { border-radius: 36% 64% 58% 42% / 43% 35% 65% 57%; transform: rotate(0deg) scale(1); }
`

const orbit = keyframes`
  from { transform: rotate(0deg) translateX(90px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(90px) rotate(-360deg); }
`

function LoaderOverlay() {
  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={9999}
      // 👉 Brighter background: white with gradient of blue
      bg="linear-gradient(135deg, #ffffff 0%, #e6f7ff 50%, #a3d9ff 100%)"
      display="grid"
      placeItems="center"
    >
      <Box position="relative" w="220px" h="220px">
        {/* Glass ring */}
        <Box
          position="absolute"
          inset="-8px"
          borderRadius="full"
          bg="conic-gradient(from 0deg, rgba(0,128,255,0.15), rgba(255,255,255,0.65), rgba(0,128,255,0.15))"
          animation={`${spin} 3.4s linear infinite`}
          filter="blur(2px)"
          _after={{
            content: '""',
            position: 'absolute',
            inset: '14px',
            borderRadius: 'full',
            bg: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(6px)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
          }}
        />

        {/* Morphing luminous blob */}
        <Box
          position="absolute"
          top="50%"
          left="50%"
          w="160px"
          h="160px"
          transform="translate(-50%, -50%)"
          bg="radial-gradient(circle at 30% 30%, rgba(0,180,255,0.55), rgba(0,128,255,0.9))"
          animation={`${morph} 5s ease-in-out infinite, ${pulse} 2.2s ease-in-out infinite`}
          mixBlendMode="screen"
        />

        {/* Orbiting dots */}
        {Array.from({ length: 6 }).map((_, i) => (
          <Box
            key={i}
            position="absolute"
            top="50%"
            left="50%"
            w="8px"
            h="8px"
            borderRadius="full"
            bg="blue.400"
            boxShadow="0 0 14px 4px rgba(0,180,255,0.45)"
            transform="translate(-50%, -50%)"
            animation={`${orbit} ${6 + i * 0.6}s linear infinite`}
            opacity={0.9}
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </Box>
    </Box>
  )
}


/* -------------------- Callout -------------------- */
function Callout({
  x,
  y,
  align = 'left',
  label,
  children,
  icon,
  alt = false,
}: {
  x: string
  y: string
  align?: 'left' | 'right'
  label: string
  children: React.ReactNode
  icon?: React.ElementType
  alt?: boolean
}) {
  return (
    <Box
      position="absolute"
      left={align === 'left' ? x : 'auto'}
      right={align === 'right' ? x : 'auto'}
      top={y}
      bg="whiteAlpha.90"
      color={COLORS.black}
      rounded="2xl"
      boxShadow="xl"
      px={5}
      py={4}
      maxW="280px"
      zIndex={2}
    >
      <Badge
        bg={COLORS.teal}
        color="white"
        rounded="full"
        px={3}
        py={1}
        fontWeight="semibold"
        mb={2}
      >
        {label}
      </Badge>
      <Text fontWeight="semibold" display="flex" alignItems="center" gap={2}>
        {icon && <Icon as={icon} color={COLORS.teal} />}
        {children}
      </Text>
    </Box>
  )
}

/* -------------------- Page -------------------- */
export default function Performance3DSection() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLHeadingElement | null>(null)
  const textRef = useRef<HTMLParagraphElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const [loading, setLoading] = useState(true)

  // Show the mesmerizing loader for ~2s
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {loading && <LoaderOverlay />}

      <Box
        ref={rootRef}
        position="relative"
        minH="100vh"
        overflow="hidden"
        bg="linear-gradient(135deg, #08131F 0%, #1A2A44 100%)"
        // Fade-in once loader disappears
        opacity={loading ? 0 : 1}
        transition="opacity .6s ease"
      >
        {/* 3D Background Layer */}
        <Box className="background-layer" position="absolute" inset={0} zIndex={0} opacity={0.95}>
          <Hero3DDevices height={1200} />
        </Box>

        {/* Foreground */}
        <Container maxW="container.xl" position="relative" zIndex={1} py={{ base: 20, md: 32 }}>
          <VStack spacing={6} textAlign="center" mb={14}>
            <Heading
              ref={titleRef}
              as="h1"
              className="title"
              fontSize={{ base: '3xl', md: '5xl' }}
              fontWeight="extrabold"
              bgGradient="linear(to-r, teal.700, teal.900)"
              bgClip="text"
            >
              Votre Calculateur Carbone
            </Heading>

            <Text
              ref={textRef}
              className="text"
              fontSize={{ base: 'md', md: 'xl' }}
              color="gray.200"
              fontWeight="semibold"
              maxW="700px"
            >
              Une solution simple et rapide pour calculer, analyser et réduire vos émissions GES.
              Découvrez vos postes d’émissions et générez vos rapports automatiquement.
            </Text>

            <Link href="/intro">
              <Button
                ref={buttonRef}
                className="button"
                size="lg"
                px={12}
                py={7}
                rounded="full"
                fontWeight="bold"
                fontSize="xl"
                bgGradient="linear(to-r, teal.500, teal.700)"
                color="white"
                _hover={{
                  bgGradient: 'linear(to-r, teal.600, teal.800)',
                  transform: 'scale(1.08)',
                }}
                _active={{ transform: 'scale(0.96)' }}
                boxShadow="0 15px 40px rgba(38, 89, 102, 0.6)"
                transition="all 0.3s ease-in-out"
              >
                🚀 COMMENCER
              </Button>
            </Link>
          </VStack>

          {/* Callouts */}
          <Callout x="5%" y="25%" align="left" label="Données" icon={FaFileInvoice}>
            Collecte des factures et consommations
          </Callout>
          <Callout x="2%" y="55%" align="left" label="Calculs" icon={FaCalculator}>
            Émissions GES (CO₂, CH₄, N₂O)
          </Callout>
          <Callout x="8%" y="75%" align="left" label="Suivi" icon={FaHistory} alt>
            Historique et comparaison annuelle
          </Callout>
          <Callout x="5%" y="30%" align="right" label="Rapports" icon={FaChartPie}>
            Génération automatique de bilans carbone
          </Callout>
          <Callout x="10%" y="65%" align="right" label="Indicateurs" alt>
            Intensité carbone par site et service
          </Callout>
        </Container>
      </Box>
    </>
  )
}

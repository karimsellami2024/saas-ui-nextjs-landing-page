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
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { FaFileInvoice, FaCalculator, FaHistory, FaChartPie } from 'react-icons/fa'

// Import the 3D Canvas notebook scene
const Hero3DDevices = dynamic(() => import('../3d/Hero3DDevices'), { ssr: false })

const COLORS = { black: '#08131F', teal: '#265966', gold: '#DC9807' }

/** Floating keyframes for callouts */
const float1 = keyframes`
  0% { transform: translateY(0px) translateX(0px) rotate(0.2deg); }
  100% { transform: translateY(-12px) translateX(6px) rotate(-0.2deg); }
`
const float2 = keyframes`
  0% { transform: translateY(0px) translateX(0px) rotate(-0.2deg); }
  100% { transform: translateY(-10px) translateX(-6px) rotate(0.2deg); }
`

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
      animation={`${alt ? float2 : float1} 4.8s ease-in-out infinite alternate`}
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

export default function Performance3DSection() {
  return (
    <Box
      position="relative"
      minH="100vh"
      overflow="hidden"
      bg="black"
    >
      {/* === 3D Background Layer === */}
      <Box
        position="absolute"
        inset={0}
        zIndex={0}
        opacity={0.35} // 👈 léger fondu pour laisser le texte ressortir
      >
        <Hero3DDevices height={1200} />
      </Box>

      {/* === Foreground Content === */}
      <Container
        maxW="container.xl"
        position="relative"
        zIndex={1}
        py={{ base: 20, md: 32 }}
      >
        {/* Hero Text */}
        <VStack spacing={6} textAlign="center" mb={14}>
          <Heading
            as="h1"
            fontSize={{ base: '3xl', md: '5xl' }}
            fontWeight="extrabold"
            bgGradient="linear(to-r, teal.300, teal.600)"
            bgClip="text"
          >
            Votre Calculateur Carbone
          </Heading>
          <Text fontSize={{ base: 'md', md: 'xl' }} color="gray.100" maxW="700px">
            Une solution simple et rapide pour calculer, analyser et réduire vos émissions GES.  
            Découvrez vos postes d’émissions et générez vos rapports automatiquement.
          </Text>

          {/* CTA */}
          <Link href="/intro">
            <Button
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
                transform: 'scale(1.05)',
              }}
              _active={{
                transform: 'scale(0.98)',
              }}
              boxShadow="0 10px 30px rgba(0,0,0,0.4)"
              transition="all 0.25s ease-in-out"
            >
              🚀 COMMENCER
            </Button>
          </Link>
        </VStack>

        {/* Floating callouts */}
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
  )
}


// 'use client'
// import { useEffect, useRef } from 'react'
// import {
//   Box,
//   Container,
//   Heading,
//   Text,
//   Badge,
  
//   useBreakpointValue,
// } from '@chakra-ui/react'
// import Image from 'next/image'
// import { keyframes } from '@emotion/react'

// const COLORS = { tealBlue: '#265966', black: '#08131F', gold: '#DC9807' }

// /** Floating keyframes for callouts */
// const float1 = keyframes`
//   0% { transform: translateY(0px) translateX(0px) rotate(0.2deg); }
//   100% { transform: translateY(-12px) translateX(6px) rotate(-0.2deg); }
// `
// const float2 = keyframes`
//   0% { transform: translateY(0px) translateX(0px) rotate(-0.2deg); }
//   100% { transform: translateY(-10px) translateX(-6px) rotate(0.2deg); }
// `

// function Callout({
//   x,
//   y,
//   align = 'left',
//   label = 'Owner',
//   children,
//   alt = false,
// }: {
//   x: string
//   y: string
//   align?: 'left' | 'right'
//   label?: string
//   children: React.ReactNode
//   alt?: boolean
// }) {
//   return (
//     <Box
//       position="absolute"
//       left={align === 'left' ? x : 'auto'}
//       right={align === 'right' ? x : 'auto'}
//       top={y}
//       bg="gray.100"
//       color={COLORS.black}
//       rounded="2xl"
//       boxShadow="lg"
//       border="1px solid"
//       borderColor="blackAlpha.100"
//       px={5}
//       py={4}
//       maxW="320px"
//       animation={`${alt ? float2 : float1} 4.8s ease-in-out infinite alternate`}
//     >
//       <Badge
//         bg="black"
//         color="white"
//         rounded="full"
//         px={3}
//         py={1}
//         fontWeight="semibold"
//         mb={2}
//       >
//         {label}
//       </Badge>
//       <Text fontWeight="semibold">{children}</Text>
//     </Box>
//   )
// }

// /** Smooth pointer-tilt without any library */
// function useTilt(elRef: React.RefObject<HTMLElement>, opts?: { max?: number; scale?: number }) {
//   useEffect(() => {
//     const el = elRef.current
//     if (!el) return

//     const max = opts?.max ?? 14 // degrees
//     const scale = opts?.scale ?? 1.03
//     const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
//     const disableOnMobile = window.matchMedia('(pointer: coarse)').matches

//     if (prefersReduce || disableOnMobile) return

//     let rx = 0, ry = 0
//     let tx = 0, ty = 0
//     let s = 1
//     let raf = 0

//     const lerp = (a: number, b: number, t: number) => a + (b - a) * t

//     const animate = () => {
//       rx = lerp(rx, tx, 0.12)
//       ry = lerp(ry, ty, 0.12)
//       s = lerp(s, scale, 0.12)
//       el.style.transform = `rotateX(${ry.toFixed(2)}deg) rotateY(${rx.toFixed(2)}deg) scale(${s.toFixed(3)})`
//       raf = requestAnimationFrame(animate)
//     }

//     const onMove = (e: PointerEvent) => {
//       const rect = el.getBoundingClientRect()
//       const px = (e.clientX - rect.left) / rect.width - 0.5
//       const py = (e.clientY - rect.top) / rect.height - 0.5
//       tx = -(py * max)
//       ty = px * max
//       if (!raf) raf = requestAnimationFrame(animate)
//     }

//     const onLeave = () => {
//       tx = 0
//       ty = 0
//       s = 1
//       if (!raf) raf = requestAnimationFrame(animate)
//       // stop after it settles
//       setTimeout(() => {
//         cancelAnimationFrame(raf)
//         raf = 0
//       }, 350)
//     }

//     el.addEventListener('pointermove', onMove)
//     el.addEventListener('pointerleave', onLeave)

//     return () => {
//       el.removeEventListener('pointermove', onMove)
//       el.removeEventListener('pointerleave', onLeave)
//       if (raf) cancelAnimationFrame(raf)
//     }
//   }, [elRef, opts?.max, opts?.scale])
// }

// export default function Performance3DSection({
//   imageSrc = '/static/images/ges-dashboard.png', // ⬅️ put your screenshot here
// }: {
//   imageSrc?: string
// }) {
//   const deviceRef = useRef<HTMLDivElement | null>(null)
//   useTilt(deviceRef, { max: 16, scale: 1.035 })
//   const w = useBreakpointValue({ base: '92%', md: '780px' })
//   const h = useBreakpointValue({ base: '420px', md: '520px' })

//   return (
//     <Box position="relative" py={{ base: 16, md: 24 }} overflow="hidden" bg="white">
//       <Container maxW="container.xl" position="relative" minH={{ base: '780px', md: '780px' }}>
//         {/* Headline */}
//         <Heading as="h2" size="xl" color={COLORS.black} maxW="760px" mb={6}>
//           <Box as="span" fontWeight="extrabold" color={COLORS.black}>
//             Restez connecté·e
//           </Box>{' '}
//           à la performance de vos programmes climatiques
//         </Heading>

//         {/* 3D device */}
//         <Box
//           ref={deviceRef}
//           position="absolute"
//           right={{ base: '2%', md: '6%' }}
//           top={{ base: '30%', md: '18%' }}
//           w={w}
//           h={h}
//           transform="rotateZ(-10deg) rotateX(18deg) rotateY(-10deg)"
//           transition="transform .2s ease-out"
//           sx={{ transformStyle: 'preserve-3d' }}
//           cursor="pointer"
//         >
//           {/* outline / faux line-art */}
//           <Box
//             position="absolute"
//             inset={0}
//             rounded="2xl"
//             bg="white"
//             boxShadow="
//               0 0 0 2px rgba(0,0,0,.6),
//               6px 6px 0 0 rgba(0,0,0,.25),
//               12px 12px 0 0 rgba(0,0,0,.15)
//             "
//           />

//           {/* screen frame */}
//           <Box
//             position="absolute"
//             inset="24px 24px auto 24px"
//             h="70%"
//             rounded="xl"
//             bg="white"
//             border="2px solid rgba(0,0,0,.6)"
//             overflow="hidden"
//             sx={{ transform: 'translateZ(40px)' }}
//           >
//             {/* Your screenshot IN the device */}
//             <Image
//               src={imageSrc}
//               alt="Dashboard"
//               fill
//               priority
//               sizes="(min-width: 62em) 700px, 90vw"
//               style={{ objectFit: 'cover' }}
//             />
//           </Box>

//           {/* keyboard deck */}
//           <Box
//             position="absolute"
//             left="24px"
//             right="24px"
//             bottom="26px"
//             top="72%"
//             rounded="xl"
//             border="2px solid rgba(0,0,0,.6)"
//             bg="linear-gradient(transparent 88%, rgba(0,0,0,.08) 0) left/100% 28px repeat-y,
//                 linear-gradient(90deg, transparent 92%, rgba(0,0,0,.08) 0) left/40px 100% repeat-x"
//             sx={{ transform: 'translateZ(20px)' }}
//           />
//         </Box>

//         {/* Floating callouts around the device */}
//         <Callout x="2%" y="36%" align="left">Onboarding et mise en place</Callout>
//         <Callout x="12%" y="58%" align="left">Performance des abonnés</Callout>
//         <Callout x="6%" y="74%" align="left" label="I manage" alt>
//           Suivi des économies
//         </Callout>

//         <Callout x="6%" y="22%" align="right">Données bâtiment & locataires</Callout>
//         <Callout x="10%" y="64%" align="right" alt>
//           Indicateurs financiers (NOI)
//         </Callout>
//       </Container>
//     </Box>
//   )
// }

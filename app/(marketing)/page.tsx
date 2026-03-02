'use client'

import Link from 'next/link'
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Grid,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { useEffect, useState } from 'react'

// Subtle animations
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`

const drawLine = keyframes`
  from { stroke-dashoffset: 1000; }
  to { stroke-dashoffset: 0; }
`

const fillBar = keyframes`
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
`

const pulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
`

// Feature card component
const FeatureCard = ({ icon, title, description, delay }: any) => (
  <Box
    bg="rgba(255, 255, 255, 0.05)"
    backdropFilter="blur(10px)"
    p={6}
    borderRadius="xl"
    border="1px solid rgba(255, 255, 255, 0.1)"
    animation={`${fadeInUp} 0.6s ease-out ${delay}s both`}
    _hover={{
      bg: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(73, 195, 172, 0.3)',
      transform: 'translateY(-2px)',
    }}
    transition="all 0.3s ease"
  >
    <Text fontSize="2xl" mb={3}>{icon}</Text>
    <Heading size="sm" color="white" mb={2} fontWeight="600">
      {title}
    </Heading>
    <Text fontSize="sm" color="rgba(255, 255, 255, 0.7)" lineHeight="1.6">
      {description}
    </Text>
  </Box>
)

// Mini bar chart component
const MiniBarChart = ({ delay }: any) => {
  const bars = [
    { height: 40, label: 'Scope 1' },
    { height: 65, label: 'Scope 2' },
    { height: 85, label: 'Scope 3' },
  ]

  return (
    <Box
      bg="rgba(255, 255, 255, 0.03)"
      backdropFilter="blur(10px)"
      p={6}
      borderRadius="xl"
      border="1px solid rgba(255, 255, 255, 0.08)"
      animation={`${fadeInUp} 0.6s ease-out ${delay}s both`}
    >
      <HStack spacing={2} mb={2}>
        <Box w={2} h={2} bg="#49C3AC" borderRadius="sm" />
        <Text fontSize="xs" color="rgba(255, 255, 255, 0.5)" fontWeight="600">
          RÉPARTITION DES ÉMISSIONS
        </Text>
      </HStack>
      
      <HStack align="flex-end" justify="space-around" h="120px" mt={4}>
        {bars.map((bar, i) => (
          <VStack key={i} spacing={2} flex={1}>
            <Box
              w="full"
              maxW="60px"
              h={`${bar.height}%`}
              bg="linear-gradient(180deg, #49C3AC 0%, #2D8A7E 100%)"
              borderRadius="md"
              position="relative"
              animation={`${fillBar} 1s ease-out ${delay + 0.2 + i * 0.1}s both`}
              transformOrigin="bottom"
              _before={{
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '30%',
                bg: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 'md',
              }}
            />
            <Text fontSize="xs" color="rgba(255, 255, 255, 0.6)" fontWeight="500">
              {bar.label}
            </Text>
          </VStack>
        ))}
      </HStack>
    </Box>
  )
}

// Line chart component
const MiniLineChart = ({ delay }: any) => {
  const points = [
    { x: 20, y: 80 },
    { x: 40, y: 60 },
    { x: 60, y: 65 },
    { x: 80, y: 45 },
    { x: 100, y: 30 },
    { x: 120, y: 35 },
  ]

  const pathData = points.map((p, i) => 
    i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
  ).join(' ')

  return (
    <Box
      bg="rgba(255, 255, 255, 0.03)"
      backdropFilter="blur(10px)"
      p={6}
      borderRadius="xl"
      border="1px solid rgba(255, 255, 255, 0.08)"
      animation={`${fadeInUp} 0.6s ease-out ${delay}s both`}
    >
      <HStack spacing={2} mb={2}>
        <Box w={2} h={2} bg="#49C3AC" borderRadius="sm" />
        <Text fontSize="xs" color="rgba(255, 255, 255, 0.5)" fontWeight="600">
          TENDANCE DE RÉDUCTION
        </Text>
      </HStack>

      <Box position="relative" h="120px" mt={4}>
        <svg width="100%" height="100%" viewBox="0 0 140 100">
          {/* Grid lines */}
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="140"
              y2={y}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="1"
            />
          ))}
          
          {/* Area under curve */}
          <path
            d={`${pathData} L 120 100 L 20 100 Z`}
            fill="url(#gradient)"
            opacity="0.3"
          />
          
          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="#49C3AC"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1000"
            strokeDashoffset="1000"
            style={{
              animation: `${drawLine} 2s ease-out ${delay + 0.3}s forwards`
            }}
          />
          
          {/* Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#49C3AC"
              opacity="0"
              style={{
                animation: `${fadeInUp} 0.3s ease-out ${delay + 0.5 + i * 0.1}s both`
              }}
            />
          ))}
          
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#49C3AC" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#49C3AC" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        
        <HStack justify="space-between" mt={2}>
          <Text fontSize="xs" color="rgba(255, 255, 255, 0.4)">2020</Text>
          <Text fontSize="xs" color="rgba(255, 255, 255, 0.4)">2025</Text>
        </HStack>
      </Box>
      
      <HStack justify="space-between" mt={3}>
        <VStack align="flex-start" spacing={0}>
          <Text fontSize="xs" color="rgba(255, 255, 255, 0.5)">Réduction</Text>
          <Text fontSize="lg" color="#49C3AC" fontWeight="700">-62%</Text>
        </VStack>
        <VStack align="flex-end" spacing={0}>
          <Text fontSize="xs" color="rgba(255, 255, 255, 0.5)">Objectif 2030</Text>
          <Text fontSize="lg" color="white" fontWeight="700">-80%</Text>
        </VStack>
      </HStack>
    </Box>
  )
}

// Donut chart component
const MiniDonutChart = ({ delay }: any) => {
  const segments = [
    { percent: 45, color: '#49C3AC', label: 'Transport' },
    { percent: 30, color: '#2D8A7E', label: 'Énergie' },
    { percent: 25, color: '#1A5F6F', label: 'Autres' },
  ]

  let cumulativePercent = 0

  return (
    <Box
      bg="rgba(255, 255, 255, 0.03)"
      backdropFilter="blur(10px)"
      p={6}
      borderRadius="xl"
      border="1px solid rgba(255, 255, 255, 0.08)"
      animation={`${fadeInUp} 0.6s ease-out ${delay}s both`}
    >
      <HStack spacing={2} mb={2}>
        <Box w={2} h={2} bg="#49C3AC" borderRadius="sm" />
        <Text fontSize="xs" color="rgba(255, 255, 255, 0.5)" fontWeight="600">
          SOURCES PRINCIPALES
        </Text>
      </HStack>

      <HStack spacing={6} align="center" mt={4}>
        <Box position="relative" w="100px" h="100px">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="20"
            />
            {segments.map((segment, i) => {
              const startAngle = (cumulativePercent / 100) * 360 - 90
              const endAngle = ((cumulativePercent + segment.percent) / 100) * 360 - 90
              cumulativePercent += segment.percent

              const startRad = (startAngle * Math.PI) / 180
              const endRad = (endAngle * Math.PI) / 180

              const x1 = 50 + 40 * Math.cos(startRad)
              const y1 = 50 + 40 * Math.sin(startRad)
              const x2 = 50 + 40 * Math.cos(endRad)
              const y2 = 50 + 40 * Math.sin(endRad)

              const largeArc = segment.percent > 50 ? 1 : 0

              return (
                <path
                  key={i}
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={segment.color}
                  opacity="0"
                  style={{
                    animation: `${fadeInUp} 0.5s ease-out ${delay + 0.2 + i * 0.15}s both`
                  }}
                />
              )
            })}
            <circle cx="50" cy="50" r="25" fill="#0B1F24" />
          </svg>
          <VStack
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            spacing={0}
          >
            <Text fontSize="xl" color="white" fontWeight="700">100%</Text>
            <Text fontSize="2xs" color="rgba(255, 255, 255, 0.5)">Total</Text>
          </VStack>
        </Box>

        <VStack align="flex-start" spacing={2} flex={1}>
          {segments.map((segment, i) => (
            <HStack key={i} spacing={2} w="full">
              <Box w={3} h={3} bg={segment.color} borderRadius="sm" />
              <Text fontSize="xs" color="rgba(255, 255, 255, 0.7)" flex={1}>
                {segment.label}
              </Text>
              <Text fontSize="xs" color="white" fontWeight="600">
                {segment.percent}%
              </Text>
            </HStack>
          ))}
        </VStack>
      </HStack>
    </Box>
  )
}

// Data metric card
const DataMetric = ({ value, label, trend, delay }: any) => (
  <Box
    bg="rgba(255, 255, 255, 0.03)"
    backdropFilter="blur(10px)"
    p={5}
    borderRadius="lg"
    border="1px solid rgba(255, 255, 255, 0.08)"
    animation={`${fadeInUp} 0.6s ease-out ${delay}s both`}
  >
    <HStack justify="space-between" mb={2}>
      <Text fontSize="xs" color="rgba(255, 255, 255, 0.5)" fontWeight="600">
        {label}
      </Text>
      {trend && (
        <HStack spacing={1}>
          <Text fontSize="xs" color="#49C3AC">↓</Text>
          <Text fontSize="xs" color="#49C3AC" fontWeight="600">{trend}</Text>
        </HStack>
      )}
    </HStack>
    <Text fontSize="2xl" color="white" fontWeight="700">
      {value}
    </Text>
  </Box>
)

export default function Home() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <Box
      minH="100vh"
      position="relative"
      overflow="hidden"
      bg="#0B1F24"
    >
      {/* Subtle gradient background */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bgGradient="linear(to-br, #0B1F24 0%, #154350 50%, #1A5F6F 100%)"
        opacity="0.9"
      />

      {/* Subtle grid pattern */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        opacity="0.03"
        backgroundImage="linear-gradient(rgba(73, 195, 172, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(73, 195, 172, 0.5) 1px, transparent 1px)"
        backgroundSize="50px 50px"
      />

      {/* Subtle accent glow */}
      <Box
        position="absolute"
        top="20%"
        right="10%"
        w="400px"
        h="400px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(73, 195, 172, 0.08) 0%, transparent 70%)"
        pointerEvents="none"
        style={{
          transform: `translateY(${scrollY * 0.2}px)`,
        }}
      />

      {/* Main content */}
      <Container maxW="container.xl" position="relative" zIndex={1} py={16}>
        <VStack spacing={12}>
          {/* Hero section */}
          <VStack spacing={6} maxW="800px" textAlign="center">
            {/* Badge */}
            <Box
              animation={`${fadeInUp} 0.6s ease-out`}
              display="inline-block"
            >
              <HStack
                spacing={2}
                px={4}
                py={2}
                bg="rgba(73, 195, 172, 0.1)"
                border="1px solid rgba(73, 195, 172, 0.2)"
                borderRadius="full"
                fontSize="sm"
                color="rgba(255, 255, 255, 0.8)"
              >
                <Box w={2} h={2} bg="#49C3AC" borderRadius="full" animation={`${pulse} 2s ease-in-out infinite`} />
                <Text fontWeight="500">Solution professionnelle de gestion carbone</Text>
              </HStack>
            </Box>

            {/* Main heading */}
            <Heading
              fontSize={{ base: '4xl', md: '6xl', lg: '7xl' }}
              fontWeight="700"
              color="white"
              animation={`${fadeInUp} 0.6s ease-out 0.1s both`}
              letterSpacing="tight"
              lineHeight="1.1"
            >
              Carbone Québec
            </Heading>
            
            <Text
              fontSize={{ base: 'lg', md: 'xl' }}
              color="rgba(255, 255, 255, 0.7)"
              maxW="600px"
              fontWeight="400"
              animation={`${fadeInUp} 0.6s ease-out 0.2s both`}
              lineHeight="1.8"
            >
              Plateforme complète pour le calcul, le suivi et le reporting de vos émissions de gaz à effet de serre. Conforme aux standards internationaux.
            </Text>

            {/* CTA Buttons */}
            <HStack
              spacing={4}
              animation={`${fadeInUp} 0.6s ease-out 0.3s both`}
              flexWrap="wrap"
              justify="center"
            >
              <Link href="/intro" passHref legacyBehavior>
                <Button
                  as="a"
                  size="lg"
                  px={8}
                  py={6}
                  rounded="lg"
                  fontWeight="600"
                  fontSize="md"
                  bg="#49C3AC"
                  color="white"
                  _hover={{
                    bg: '#3AB39B',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 10px 30px rgba(73, 195, 172, 0.3)',
                  }}
                  _active={{ transform: 'translateY(0)' }}
                  boxShadow="0 4px 14px rgba(73, 195, 172, 0.2)"
                  transition="all 0.2s ease"
                >
                  Commencer l'évaluation
                </Button>
              </Link>

              <Button
                size="lg"
                px={8}
                py={6}
                rounded="lg"
                fontWeight="600"
                fontSize="md"
                bg="transparent"
                color="white"
                border="1px solid rgba(255, 255, 255, 0.2)"
                _hover={{
                  bg: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                }}
                transition="all 0.2s ease"
              >
                En savoir plus
              </Button>
            </HStack>

            {/* Trust indicators */}
            <HStack
              spacing={6}
              pt={4}
              flexWrap="wrap"
              justify="center"
              animation={`${fadeInUp} 0.6s ease-out 0.4s both`}
              color="rgba(255, 255, 255, 0.5)"
              fontSize="sm"
              divider={<Text>•</Text>}
            >
              <Text>Accès immédiat</Text>
              <Text>Aucun engagement</Text>
              <Text>Données sécurisées</Text>
            </HStack>
          </VStack>

          {/* Data metrics row */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} w="full" maxW="1100px">
            <DataMetric value="2,500+" label="ORGANISATIONS" delay="0.5" />
            <DataMetric value="50K+" label="TONNES CO₂" trend="12%" delay="0.55" />
            <DataMetric value="98%" label="SATISFACTION" delay="0.6" />
            <DataMetric value="156" label="RAPPORTS/MOIS" trend="8%" delay="0.65" />
          </SimpleGrid>

          {/* Charts section */}
          <Grid
            templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
            gap={6}
            w="full"
            maxW="1100px"
          >
            <MiniLineChart delay="0.7" />
            <MiniBarChart delay="0.75" />
            <MiniDonutChart delay="0.8" />
          </Grid>

          {/* Features grid */}
          <SimpleGrid
            columns={{ base: 1, md: 3 }}
            spacing={6}
            w="full"
            maxW="1100px"
          >
            <FeatureCard
              icon="📊"
              title="Analyse précise"
              description="Calculs conformes aux protocoles GHG et ISO 14064 pour des résultats fiables."
              delay="0.85"
            />
            <FeatureCard
              icon="⚡"
              title="Génération automatique"
              description="Rapports professionnels générés en quelques clics, prêts à être partagés."
              delay="0.9"
            />
            <FeatureCard
              icon="🔒"
              title="Conformité garantie"
              description="Respect des normes environnementales et protection complète de vos données."
              delay="0.95"
            />
          </SimpleGrid>
        </VStack>
      </Container>

      {/* Bottom accent line */}
      <Box
        position="absolute"
        bottom="0"
        left="0"
        right="0"
        height="1px"
        bgGradient="linear(to-r, transparent, rgba(73, 195, 172, 0.3), transparent)"
      />
    </Box>
  )
}
// 'use client'
// import Section from "#components/postes/maincomponent"


// import dynamic from 'next/dynamic'



// // ✅ Dynamically load 3D component only on client
// const Hero3DDevices = dynamic(() => import('../../components/3d/Hero3DDevices'), {
//   ssr: false,
//   loading: () => <div style={{ height: 640, background: '#F3FAF9' }} />, // Optional fallback
// })




// import Performance3DSection from '#components/animations/Performance3DSection'

// import {
//   Box,
//   ButtonGroup,
//   Container,
//   Flex,
//   HStack,
//   Heading,
//   Icon,
//   IconButton,
//   SimpleGrid,
//   Stack,
//   Tag,
//   Text,
//   VStack,
//   Wrap,
//   useClipboard,
//   Tabs,
//   TabList,
//   TabPanels,
//   Tab,
//   TabPanel,
//   useColorModeValue,
//   Divider,
//   Badge,
//   chakra,
//             // ✅ add this
// } from '@chakra-ui/react'
// import type { NextPage } from 'next'
// import Image from 'next/image'
// import {
//   FiArrowRight,
//   FiCheck,
//   FiCopy,
//   FiActivity,
//   FiFileText,
//   FiBarChart2,
//   FiTrendingUp,
//   FiUsers,
//   FiUser,
// } from 'react-icons/fi'
// import * as React from 'react'
// import { keyframes } from '@emotion/react' 
// import { ButtonLink } from '#components/button-link/button-link'
// import { Features } from '#components/features'
// import { BackgroundGradient } from '#components/gradients/background-gradient'
// import { Hero } from '#components/hero'
// import {
//   Highlights,
//   HighlightsItem,
//   HighlightsTestimonialItem,
// } from '#components/highlights'
// import { FallInPlace } from '#components/motion/fall-in-place'
// import { Testimonial, Testimonials } from '#components/testimonials'
// import testimonials from '#data/testimonials'

// import { useLandingAnimations } from '#components/animations/useLandingAnimations'
// import Particles from '#components/visuals/Particles'

// const COLORS = {
//   tealBlue: "#265966",
//   blueGray: "#8A9992",
//   black: "#08131F",
//   forest: "#273F2A",
//   gold: "#DC9807",
//   olive: "#93A55A",
// }

// const Home: NextPage = () => {
//   useLandingAnimations(COLORS)
//   return (
//     <Box>
//       {/* <HeroSection />

//       <OwnerTenantSection />

//       <HighlightsSection />

//       <StatsSection />

//       <FeaturedStrip />

//       <FeaturesSection /> */}
//       {/* <Performance3DSection /> */}
//       {/* <TestimonialsSection /> */}

//       {/* Parallax + reveal for main Section block */}
//       {/* <Box data-reveal data-parallax="0.08">
//         <Box data-reveal-item>
//           <Section/>
//         </Box>
//       </Box> */}

//       {/* <CTASection /> */}
//     </Box>
//   )
// }

// /* ===========================
//    HERO
//    =========================== */

// // floating keyframes
// const floatA = keyframes`
//   0% { transform: translateY(0) }
//   100% { transform: translateY(-10px) }
// `;
// const floatB = keyframes`
//   0% { transform: translateY(0) }
//   100% { transform: translateY(-14px) }
// `;

// // tiny mouse-tilt helper (use React.useEffect)
// function useTilt(elRef: React.RefObject<HTMLElement>, opts?: { max?: number; scale?: number }) {
//   React.useEffect(() => {               // ✅ use React.useEffect
//     const el = elRef.current;
//     if (!el) return;
//     const max = opts?.max ?? 14;
//     const scale = opts?.scale ?? 1.03;
//     const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
//     const coarse = window.matchMedia('(pointer: coarse)').matches;
//     if (reduce || coarse) return;

//     let rx=0, ry=0, tx=0, ty=0, s=1, raf=0;
//     const lerp = (a:number,b:number,t:number)=>a+(b-a)*t;
//     const animate = ()=>{
//       rx = lerp(rx, tx, .12);
//       ry = lerp(ry, ty, .12);
//       s  = lerp(s, scale, .12);
//       (el as HTMLElement).style.transform =
//         `rotateX(${ry.toFixed(2)}deg) rotateY(${rx.toFixed(2)}deg) scale(${s.toFixed(3)})`;
//       raf = requestAnimationFrame(animate);
//     };
//     const onMove = (e: PointerEvent)=>{
//       const r = el.getBoundingClientRect();
//       const px = (e.clientX - r.left)/r.width - .5;
//       const py = (e.clientY - r.top)/r.height - .5;
//       tx = -(py*max);
//       ty =  (px*max);
//       if (!raf) raf = requestAnimationFrame(animate);
//     };
//     const onLeave = ()=>{
//       tx=0; ty=0; s=1;
//       if (!raf) raf = requestAnimationFrame(animate);
//       setTimeout(()=>{ cancelAnimationFrame(raf); raf=0; }, 320);
//     };
//     el.addEventListener('pointermove', onMove);
//     el.addEventListener('pointerleave', onLeave);
//     return ()=>{ el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); if(raf) cancelAnimationFrame(raf); };
//   }, [elRef, opts?.max, opts?.scale]);
// }

// const HeroSection: React.FC = () => {
//   const groupRef = React.useRef<HTMLDivElement | null>(null);
//   useTilt(groupRef, { max: 16, scale: 1.035 });


//   return (
//     <Box position="relative" overflow="hidden" bg="#F3FAF9">
//       {/* soft aurora glows */}
//       <Box
//         position="absolute" top="-20%" left="-10%" w="60vw" h="60vh"
//         filter="blur(100px)" opacity={0.45}
//         bg="radial-gradient(60% 60% at 30% 30%, #265966 0%, transparent 70%)"
//         pointerEvents="none" zIndex={1}
//       />
//       <Box
//         position="absolute" bottom="-22%" right="-12%" w="55vw" h="55vh"
//         filter="blur(120px)" opacity={0.55}
//         bg="radial-gradient(60% 60% at 70% 60%, #DC9807 0%, transparent 70%)"
//         pointerEvents="none" zIndex={1}
//       />

//       <Container maxW="container.xl" pt={{ base: 28, lg: 40 }} pb={{ base: 16, lg: 24 }}>
//         <Stack direction={{ base: 'column', lg: 'row' }} align="center" spacing={{ base: 12, lg: 6 }}>
//           {/* LEFT: copy + CTAs */}
//           <Box flex="1" zIndex={2}>
//             <Heading as="h1" lineHeight="1.1" fontWeight="800" color={COLORS.tealBlue}
//               fontSize={{ base: '3xl', md: '5xl' }}>
//               Calculez vos{' '}
//               <Box as="span" color={COLORS.gold} position="relative" display="inline-block">
//                 émissions GES
//                 <Box
//                   position="absolute" left={0} bottom={-3} h="6px" w="100%"
//                   bg={`linear-gradient(90deg, ${COLORS.gold}, #49C3AC)`}
//                   borderRadius="9999px"
//                 />
//               </Box>
//             </Heading>
//             <Text mt={3} fontSize={{ base: 'lg', md: 'xl' }} color={COLORS.black} fontWeight="700">
//               en moins de 2 minutes avec Carbone Québec
//             </Text>
//             <Text mt={5} fontSize="lg" color={COLORS.tealBlue}>
//               Mesurez et comprenez votre impact climatique avec notre calculateur gratuit et convivial.
//               Recevez un rapport PDF instantané et des conseils personnalisés pour réduire vos émissions.
//             </Text>

//             <ButtonGroup spacing={4} alignItems="center" pt="8">
//               <ButtonLink
//                 data-cta-item
//                 href="/calculateur"
//                 size="lg"
//                 bg={COLORS.tealBlue}
//                 color="white"
//                 rounded="xl"
//                 px={8}
//                 py={6}
//                 _hover={{ bg: COLORS.gold, color: COLORS.black }}
//               >
//                 Essayez gratuitement
//               </ButtonLink>
//               <ButtonLink
//                 data-cta-item
//                 href="#features"
//                 size="lg"
//                 variant="outline"
//                 color={COLORS.tealBlue}
//                 borderColor={COLORS.tealBlue}
//                 rounded="xl"
//               >
//                 Voir les avantages
//               </ButtonLink>
//             </ButtonGroup>
//           </Box>

//           {/* RIGHT: 3D devices */}
//           <Box
//             flex="1" position="relative" height={{ base: '520px', lg: '640px' }}
//             w="100%" zIndex={2} style={{ perspective: '1400px' }}
//           >
//             <Box flex="1" pl={{ lg: 8 }}>
//   <Hero3DDevices  height={740} />
// </Box>
//           </Box>
//         </Stack>
//       </Container>
//     </Box>
//   );
// };

// /* ===========================
//    OWNER / TENANT TOGGLE
//    =========================== */
// const OwnerTenantSection = () => {
//   const cardBg = useColorModeValue('white', '#0f1517')
//   return (
//     <Container maxW="container.xl" py={{ base: 10, md: 16 }} data-reveal>
//       <Heading data-reveal-item as="h2" size="lg" color={COLORS.tealBlue} mb={6}>
//         Solutions adaptées à chaque profil
//       </Heading>

//       <Tabs variant="soft-rounded" colorScheme="teal">
//         <TabList>
//           <Tab>Propriétaire</Tab>
//           <Tab>Locataire</Tab>
//         </TabList>
//         <TabPanels>
//           <TabPanel p={0} pt={6}>
//             <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
//               <FeatureCard
//                 title="Monétisez vos installations"
//                 points={['Générez des revenus avec vos actifs énergétiques', 'Intégration comptable simple', 'Transparence des paiements']}
//                 bg={cardBg}
//               />
//               <FeatureCard
//                 title="Pilotez par la donnée"
//                 points={['Suivi production/consommation', 'Tableau de bord unique', 'Insights pour optimiser le ROI']}
//                 bg={cardBg}
//               />
//             </SimpleGrid>
//           </TabPanel>
//           <TabPanel p={0} pt={6}>
//             <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
//               <FeatureCard
//                 title="Économisez facilement"
//                 points={['Accès à une énergie plus abordable', 'Facturation claire', 'Récompenses et suivi perso']}
//                 bg={cardBg}
//               />
//               <FeatureCard
//                 title="Recharge EV conviviale"
//                 points={['Bornes sur place', 'Paiement fluide', 'Support expert']}
//                 bg={cardBg}
//               />
//             </SimpleGrid>
//           </TabPanel>
//         </TabPanels>
//       </Tabs>
//     </Container>
//   )
// }

// const FeatureCard = ({
//   title,
//   points,
//   bg,
// }: {
//   title: string
//   points: string[]
//   bg: string
// }) => (
//   <Box
//     data-reveal-item
//     data-tilt="1"
//     data-tilt-max="10"
//     data-tilt-scale="1.02"
//     bg={bg}
//     p={6}
//     rounded="2xl"
//     boxShadow="xl"
//     border="1px solid"
//     borderColor="blackAlpha.100"
//   >
//     <Heading as="h3" size="md" color={COLORS.tealBlue} mb={3}>{title}</Heading>
//     <VStack align="flex-start" spacing={2}>
//       {points.map((p, i) => (
//         <HStack key={i} spacing={3}>
//           <Badge bg={COLORS.gold} color={COLORS.black} rounded="full">✓</Badge>
//           <Text color={COLORS.black}>{p}</Text>
//         </HStack>
//       ))}
//     </VStack>
//   </Box>
// )

// /* ===========================
//    HIGHLIGHTS (unchanged except data-* attrs)
//    =========================== */
// const HighlightsSection = () => {
//   const { onCopy, hasCopied } = useClipboard('https://www.carbonequebec.ca/')
//   return (
//     <Box data-reveal bg="#F3FAF9">
//       <Highlights>
//         <HighlightsItem colSpan={[1, null, 2]} title="Calculateur de GES Carbone Québec">
//           <VStack alignItems="flex-start" spacing="8">
//             <Text data-reveal-item color="#00496F" fontSize="xl" fontWeight="bold">
//               Passez à l’action avec notre 
//             </Text>
//             <Text data-reveal-item color="#19516C" fontSize="md">
//               Obtenez une estimation instantanée et gratuite de vos émissions. Outil simple et rapide pour entreprises, municipalités et particuliers.
//             </Text>
//             <Flex
//               rounded="full"
//               borderWidth="1px"
//               borderColor="#49C3AC"
//               flexDirection="row"
//               alignItems="center"
//               py="1"
//               ps="8"
//               pe="2"
//               bg="#00496F"
//               data-reveal-item
//             >
//               <Box>
//                 <Text color="#B2D235" display="inline" fontWeight="bold">
//                   Essayez-le maintenant&nbsp;
//                 </Text>
//                 <Text color="#49C3AC" display="inline" fontWeight="bold">
//                   carbonequebec.org/calculateur
//                 </Text>
//               </Box>
//               <IconButton
//                 icon={hasCopied ? <Icon as={FiCheck} color="#49C3AC" /> : <Icon as={FiCopy} color="#49C3AC" />}
//                 aria-label="Copier le lien du calculateur"
//                 onClick={onCopy}
//                 variant="ghost"
//                 ms="4"
//                 isRound
//                 color="#B2D235"
//               />
//             </Flex>
//           </VStack>
//         </HighlightsItem>

//         <HighlightsItem title="Pourquoi calculer vos GES?">
//           <Text data-reveal-item color="#00496F" fontSize="lg">
//             Réduisez vos coûts, accédez à de nouveaux marchés, et démontrez votre engagement climatique.
//           </Text>
//         </HighlightsItem>

//         <HighlightsTestimonialItem
//           name="Amélie Roy"
//           description="Directrice développement durable"
//           avatar="/static/images/amelie-avatar.jpg"
//           gradient={['#49C3AC', '#B2D235']}
//         >
//           <span data-reveal-item>
//             « Un diagnostic clair pour mobiliser notre équipe autour de la réduction des émissions. »
//           </span>
//         </HighlightsTestimonialItem>

//         <HighlightsItem colSpan={[1, null, 2]} title="Vos avantages">
//           <Wrap mt="2" data-reveal-item>
//             {[
//               'Rapport PDF instantané',
//               'Calcul simplifié',
//               'Pour tous les secteurs',
//               'Normes reconnues',
//               'Analyse comparative',
//               'Support expert',
//               'Outil gratuit',
//               'Accès sécurisé',
//             ].map((value) => (
//               <Tag key={value} data-tag variant="subtle" bg="#49C3AC" color="#00496F" rounded="full" px="3" fontWeight="semibold">
//                 {value}
//               </Tag>
//             ))}
//           </Wrap>
//         </HighlightsItem>
//       </Highlights>
//     </Box>
//   )
// }

// /* ===========================
//    KPI STATS (count-up like Ivy)
//    =========================== */
// // --- StatsSection (no anime.js) ---
// const StatsSection = () => {
//   const stats = [
//     { value: 400,   suffix: '+',  label: 'Communautés accompagnées' },
//     { value: 50000, suffix: '+',  label: 'Foyers bénéficiant de tarifs réduits' },
//     { value: 40,    suffix: 'M+', label: 'kg de CO₂ évités' },
//     { value: 5,     suffix: 'M$', label: 'de valeur créée' },
//   ];

//   React.useEffect(() => {
//     const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
//     const io = new IntersectionObserver((entries) => {
//       entries.forEach((entry) => {
//         if (!entry.isIntersecting) return;
//         const el = entry.target as HTMLElement;
//         const end = parseFloat(el.dataset.to || '0');
//         const suffix = el.dataset.suffix || '';
//         const start = performance.now();
//         const dur = 1400;

//         const tick = (now: number) => {
//           const p = Math.min((now - start) / dur, 1);
//           const v = Math.round(end * easeOutCubic(p));
//           el.textContent = v.toLocaleString('fr-CA') + suffix;
//           if (p < 1) requestAnimationFrame(tick);
//         };
//         requestAnimationFrame(tick);
//         io.unobserve(el);
//       });
//     }, { threshold: 0.3 });

//     document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => io.observe(el));
//     return () => io.disconnect();
//   }, []);

//   return (
//     <Container maxW="container.xl" py={{ base: 10, md: 16 }} data-reveal>
//       <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6}>
//         {stats.map((s, i) => (
//           <Box key={i} data-reveal-item bg="white" rounded="2xl" boxShadow="xl" p={6} border="1px solid" borderColor="blackAlpha.100">
//             <Text
//               as="span"
//               fontSize="4xl"
//               fontWeight="extrabold"
//               color={COLORS.tealBlue}
//               lineHeight="1"
//               data-count
//               data-to={s.value}
//               data-suffix={s.suffix}
//             >
//               0
//             </Text>
//             <Text color={COLORS.black} mt={2}>{s.label}</Text>
//           </Box>
//         ))}
//       </SimpleGrid>
//     </Container>
//   );
// };


// /* ===========================
//    "FEATURED IN" STRIP
//    =========================== */
// const FeaturedStrip = () => {
//   const items = ['Cleantech', 'SD Business', 'Multifamily', 'Yahoo Finance', 'Solar Power']
//   return (
//     <Box bg="#F3FAF9" py={6} data-reveal>
//       <Container maxW="container.xl">
//         <HStack justify="space-between" spacing={8} overflow="hidden" data-reveal-item>
//           <Text color={COLORS.tealBlue} fontWeight="bold">Ils parlent de nous</Text>
//           <Box flex="1" overflow="hidden">
//             {/* simple marquee */}
//             <chakra.div
//               sx={{
//                 display: 'flex',
//                 gap: '48px',
//                 animation: 'marquee 28s linear infinite',
//                 '@keyframes marquee': { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
//               }}
//             >
//               {[...items, ...items].map((it, i) => (
//                 <Box key={i} px={4} py={2} bg="white" rounded="full" border="1px solid" borderColor="blackAlpha.200" boxShadow="sm">
//                   <Text color={COLORS.black} fontWeight="medium">{it}</Text>
//                 </Box>
//               ))}
//             </chakra.div>
//           </Box>
//         </HStack>
//       </Container>
//     </Box>
//   )
// }

// /* ===========================
//    FEATURES (kept, with theme icons)
//    =========================== */
// const FeaturesSection = () => {
//   return (
//     <Box data-reveal>
//       <Box data-reveal-item>
//         <Features
//           id="features"
//           title={
//             <Heading
//               lineHeight="short"
//               fontSize={['2xl', null, '4xl']}
//               textAlign="left"
//               as="p"
//               color="#00496F"
//             >
//               Pourquoi utiliser le <span style={{ color: "#49C3AC" }}>calculateur Carbone Québec</span> ?
//             </Heading>
//           }
//           description={
//             <span>
//               Notre plateforme vous aide à <b>mesurer</b>, <b>comprendre</b> et <b>réduire</b> votre empreinte carbone, facilement et gratuitement.
//             </span>
//           }
//           align="left"
//           columns={[1, 2, 4]}
//           iconSize={4}
//           features={[
//             { title: "Calcul en temps réel", icon: () => <Icon as={FiActivity} color="#49C3AC" boxSize={6} />, description: "Résultats instantanés, clairs et visuels.", variant: "inline" },
//             { title: "Rapport PDF complet", icon: () => <Icon as={FiFileText} color="#49C3AC" boxSize={6} />, description: "Un livrable prêt à partager.", variant: "inline" },
//             { title: "Analyse comparative", icon: () => <Icon as={FiBarChart2} color="#49C3AC" boxSize={6} />, description: "Comparez-vous à votre secteur.", variant: "inline" },
//             { title: "Conseils personnalisés", icon: () => <Icon as={FiTrendingUp} color="#49C3AC" boxSize={6} />, description: "Passez de la mesure à l’action.", variant: "inline" },
//             { title: "Sécurité & confidentialité", icon: () => <Icon as={FiUsers} color="#49C3AC" boxSize={6} />, description: "Des bonnes pratiques éprouvées.", variant: "inline" },
//             { title: "Pour tous les profils", icon: () => <Icon as={FiUser} color="#49C3AC" boxSize={6} />, description: "Entreprises, citoyens et municipalités.", variant: "inline" },
//           ]}
//         />
//       </Box>
//     </Box>
//   )
// }

// /* ===========================
//    TESTIMONIALS
//    =========================== */
// const TestimonialsSection = () => {
//   const columns = React.useMemo(() => {
//     return testimonials.items.reduce<Array<typeof testimonials.items>>(
//       (columns, t, i) => {
//         columns[i % 3].push(t)
//         return columns
//       },
//       [[], [], []],
//     )
//   }, [])

//   return (
//     <Box data-reveal>
//       <Testimonials title={testimonials.title} columns={[1, 2, 3]} innerWidth="container.xl">
//         <>
//           {columns.map((column, i) => (
//             <Stack key={i} spacing="8" data-reveal-item>
//               {column.map((t, i) => (
//                 <Testimonial key={i} {...t} />
//               ))}
//             </Stack>
//           ))}
//         </>
//       </Testimonials>
//     </Box>
//   )
// }

// /* ===========================
//    CTA FOOTER
//    =========================== */
// const CTASection = () => (
//   <Box bg="#F3FAF9" py={16} mt={10} data-reveal>
//     <Container maxW="container.xl" data-reveal-item>
//       <Stack direction={{ base: 'column', md: 'row' }} align="center" justify="space-between" spacing={6} bg="white" p={8} rounded="2xl" boxShadow="2xl" border="1px solid" borderColor="blackAlpha.100">
//         <Box>
//           <Heading as="h3" size="lg" color={COLORS.tealBlue} mb={2}>Passez à l’action</Heading>
//           <Text color={COLORS.black}>Commencez à mesurer et réduire vos émissions dès aujourd’hui.</Text>
//         </Box>
//         <ButtonGroup>
//           <ButtonLink
//             data-cta-item
//             data-magnetic="12"
//             href="/calculateur"
//             bg={COLORS.tealBlue}
//             color="#fff"
//             rounded="xl"
//             px={6}
//             py={4}
//             _hover={{ bg: COLORS.gold, color: COLORS.black }}
//           >
//             Démarrer maintenant
//           </ButtonLink>
//           <ButtonLink
//             data-cta-item
//             data-magnetic="10"
//             href="#features"
//             variant="outline"
//             color={COLORS.tealBlue}
//             borderColor={COLORS.tealBlue}
//             rounded="xl"
//           >
//             En savoir plus
//           </ButtonLink>
//         </ButtonGroup>
//       </Stack>
//     </Container>
//   </Box>
// )

// export default Home

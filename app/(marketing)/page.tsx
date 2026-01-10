'use client'

import Link from 'next/link'
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
} from '@chakra-ui/react'

export default function Home() {
  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="linear-gradient(135deg, #F3FAF9 0%, #E6F7FF 100%)"
      px={4}
    >
      <Container maxW="container.md">
        <VStack spacing={6} textAlign="center">
          <Heading
            fontSize={{ base: '3xl', md: '5xl' }}
            fontWeight="extrabold"
            color="#265966"
          >
            Carbone Québec
          </Heading>

          <Text
            fontSize={{ base: 'md', md: 'lg' }}
            color="gray.700"
            maxW="640px"
          >
            Calculez rapidement vos émissions de gaz à effet de serre et
            générez vos rapports automatiquement.
          </Text>

          <Link href="/intro" passHref legacyBehavior>
            <Button
              as="a"
              size="lg"
              px={12}
              py={7}
              rounded="full"
              fontWeight="bold"
              fontSize="xl"
              bg="linear-gradient(90deg, #49C3AC, #265966)"
              color="white"
              _hover={{
                transform: 'scale(1.05)',
                bg: 'linear-gradient(90deg, #3AB7A0, #1F4F59)',
              }}
              _active={{ transform: 'scale(0.97)' }}
              boxShadow="0 12px 30px rgba(38, 89, 102, 0.35)"
              transition="all 0.25s ease"
            >
              🚀 COMMENCER
            </Button>
          </Link>

          <Text fontSize="sm" color="gray.500">
            Accès immédiat · Aucun engagement
          </Text>
        </VStack>
      </Container>
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

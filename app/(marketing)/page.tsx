'use client'

import Link from 'next/link'
import {
  Box, Button, Container, Flex, Grid, Heading,
  HStack, SimpleGrid, Text, VStack, Icon, Badge, Divider,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import {
  FiArrowRight, FiCheckCircle, FiBarChart2, FiFileText,
  FiShield, FiZap, FiCpu, FiTruck, FiMonitor, FiPackage, FiDroplet,
  FiList, FiEdit3, FiDownload, FiLock, FiChevronDown, FiChevronUp,
} from 'react-icons/fi'
import { useState } from 'react'

/* ─── Palette ─── */
const G = {
  dark:   '#1B2E25',
  brand:  '#344E41',
  accent: '#588157',
  light:  '#A3B18A',
  soft:   '#DDE5E0',
  bg:     '#F5F6F4',
  white:  '#FFFFFF',
  muted:  '#6B7A72',
  border: '#E4E6E1',
}

/* ─── Animations ─── */
const fadeUp  = keyframes`from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}`
const fadeIn  = keyframes`from{opacity:0}to{opacity:1}`
const pulse   = keyframes`0%,100%{transform:scale(1)}50%{transform:scale(1.04)}`
const shimmer = keyframes`0%{background-position:200% center}100%{background-position:-200% center}`

/* ══════════════════════════════════════════
   PAGE
══════════════════════════════════════════ */
export default function Home() {
  return (
    <Box bg={G.bg} minH="100vh">
      <HeroSection />
      <StatsBar />
      <FeaturesSection />
      <HowItWorksSection />
      <CategoriesSection />
      <TestimonialSection />
      <StandardsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </Box>
  )
}

/* ══════════════════════════════════════════
   HERO
══════════════════════════════════════════ */
function HeroSection() {
  return (
    <Box
      position="relative" overflow="hidden"
      bgGradient={`linear(135deg, ${G.dark} 0%, ${G.brand} 55%, ${G.accent} 100%)`}
      pt={{ base: 28, md: 36 }} pb={{ base: 20, md: 28 }}
    >
      <Box position="absolute" inset={0} pointerEvents="none" opacity={0.04}
        backgroundImage="linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)"
        backgroundSize="48px 48px" />
      <Box position="absolute" top="-80px" right="-60px" w="480px" h="480px" borderRadius="full"
        bg="radial-gradient(circle, rgba(163,177,138,0.18) 0%, transparent 70%)" pointerEvents="none" />
      <Box position="absolute" bottom="-60px" left="-40px" w="380px" h="380px" borderRadius="full"
        bg="radial-gradient(circle, rgba(88,129,87,0.2) 0%, transparent 70%)" pointerEvents="none" />

      <Container maxW="container.xl" position="relative" zIndex={1}>
        <VStack spacing={8} maxW="780px" mx="auto" textAlign="center">

          <Box animation={`${fadeUp} 0.6s ease both`}>
            <HStack spacing={2} px={4} py={2}
              bg="rgba(163,177,138,0.15)" border="1px solid rgba(163,177,138,0.35)"
              borderRadius="full" display="inline-flex">
              <Box w="8px" h="8px" bg={G.light} borderRadius="full"
                animation={`${pulse} 2.2s ease infinite`} />
              <Text fontSize="sm" color={G.light} fontWeight="600" letterSpacing="wide">
                Calculateur GES &middot; ISO 14064 &middot; GHG Protocol
              </Text>
            </HStack>
          </Box>

          <Heading
            as="h1"
            fontSize={{ base: '3xl', md: '5xl', lg: '6xl' }}
            fontWeight="800" color="white" lineHeight="1.1" letterSpacing="tight"
            animation={`${fadeUp} 0.6s ease 0.1s both`}
          >
            Mesurez et réduisez vos{' '}
            <Box as="span"
              bgGradient={`linear(90deg, ${G.light}, #C9D9C5, ${G.light})`}
              bgClip="text" backgroundSize="200% auto"
              animation={`${shimmer} 4s linear infinite`}>
              émissions de GES
            </Box>
          </Heading>

          <Text
            fontSize={{ base: 'md', md: 'xl' }} color="rgba(255,255,255,0.75)"
            maxW="600px" lineHeight="1.8"
            animation={`${fadeUp} 0.6s ease 0.2s both`}
          >
            Carbone Québec est la plateforme complète pour quantifier, suivre et déclarer
            l&apos;empreinte carbone de votre organisation — conformément aux normes
            internationales reconnues.
          </Text>

          <HStack spacing={4} flexWrap="wrap" justify="center" animation={`${fadeUp} 0.6s ease 0.3s both`}>
            <Link href="/signup" passHref legacyBehavior>
              <Button as="a" size="lg" px={8} h="52px" borderRadius="full"
                bg={G.light} color={G.dark} fontWeight="800" fontSize="md"
                rightIcon={<Icon as={FiArrowRight} />}
                _hover={{ bg: '#B8CAAA', transform: 'translateY(-2px)', boxShadow: '0 12px 32px rgba(163,177,138,0.4)' }}
                transition="all 0.2s" boxShadow="0 4px 18px rgba(163,177,138,0.3)">
                Commencer gratuitement
              </Button>
            </Link>
            <Link href="/login" passHref legacyBehavior>
              <Button as="a" size="lg" px={8} h="52px" borderRadius="full"
                variant="outline" borderColor="rgba(255,255,255,0.35)"
                color="white" fontWeight="600" fontSize="md"
                _hover={{ bg: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.6)' }}
                transition="all 0.2s">
                Se connecter
              </Button>
            </Link>
          </HStack>

          <HStack spacing={6} flexWrap="wrap" justify="center"
            color="rgba(255,255,255,0.45)" fontSize="sm"
            animation={`${fadeIn} 0.8s ease 0.5s both`}
            divider={<Box w="4px" h="4px" bg="rgba(255,255,255,0.25)" borderRadius="full" />}
          >
            <HStack spacing={1}><Icon as={FiCheckCircle} boxSize={3} /><Text>Accès immédiat</Text></HStack>
            <HStack spacing={1}><Icon as={FiLock} boxSize={3} /><Text>Données sécurisées</Text></HStack>
            <HStack spacing={1}><Icon as={FiShield} boxSize={3} /><Text>Conforme ISO 14064</Text></HStack>
          </HStack>

        </VStack>
      </Container>
    </Box>
  )
}

/* ══════════════════════════════════════════
   STATS BAR
══════════════════════════════════════════ */
const STATS = [
  { value: '6',     unit: 'catégories',  label: "d'émissions couvertes" },
  { value: 'ISO',   unit: '14064',       label: 'Norme internationale'   },
  { value: '100%',  unit: 'automatique', label: 'Sauvegarde en temps réel' },
  { value: 'PDF',   unit: '+ Excel',     label: 'Export du rapport GES'  },
]

function StatsBar() {
  return (
    <Box bg={G.white} borderBottom={`1px solid ${G.border}`} py={5}>
      <Container maxW="container.xl">
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={0}>
          {STATS.map((s, i) => (
            <Box key={i} textAlign="center"
              borderRight={{ base: i % 2 === 0 ? `1px solid ${G.border}` : 'none', md: i < 3 ? `1px solid ${G.border}` : 'none' }}
              borderBottom={{ base: i < 2 ? `1px solid ${G.border}` : 'none', md: 'none' }}
              px={4} py={3}>
              <HStack spacing={1} justify="center" mb={0.5}>
                <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="800" color={G.brand}>{s.value}</Text>
                <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="700" color={G.accent}>{s.unit}</Text>
              </HStack>
              <Text fontSize="xs" color={G.muted}>{s.label}</Text>
            </Box>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  )
}

/* ══════════════════════════════════════════
   FEATURES
══════════════════════════════════════════ */
const FEATURES = [
  { icon: FiBarChart2, title: 'Calcul en temps réel',       color: G.brand,
    desc: "Vos émissions sont calculées automatiquement à chaque saisie — aucun tableau croisé dynamique requis." },
  { icon: FiFileText,  title: 'Rapport conforme ISO',        color: G.accent,
    desc: "Générez un rapport de durabilité structuré selon la norme ISO 14064 et le GHG Protocol, prêt à soumettre." },
  { icon: FiShield,    title: "Facteurs d'émission validés", color: '#4A7C59',
    desc: "Chaque facteur est issu de sources reconnues (ECCC, IPCC, ADEME) et mis à jour régulièrement." },
  { icon: FiZap,       title: 'Sauvegarde automatique',      color: G.accent,
    desc: "Toutes vos données sont enregistrées en continu — reprenez votre bilan à tout moment." },
  { icon: FiCpu,       title: 'Multi-sites & multi-produits',color: G.brand,
    desc: "Configurez vos sites de production et vos lignes de produits pour un bilan granulaire." },
  { icon: FiLock,      title: 'Données sécurisées',          color: '#344E41',
    desc: "Infrastructure chiffrée, accès par rôle et séparation stricte des données par organisation." },
]

function FeaturesSection() {
  return (
    <Box py={{ base: 16, md: 24 }} bg={G.bg}>
      <Container maxW="container.xl">
        <VStack spacing={3} mb={12} textAlign="center">
          <Badge bg={G.soft} color={G.brand} px={3} py={1} borderRadius="full" fontSize="xs" fontWeight="700">
            Fonctionnalités
          </Badge>
          <Heading fontSize={{ base: '2xl', md: '3xl' }} color={G.dark} fontWeight="800">
            Tout ce qu&apos;il faut pour votre bilan GES
          </Heading>
          <Text color={G.muted} maxW="520px" fontSize="md">
            Une plateforme conçue pour les équipes développement durable, sans compromis sur la rigueur méthodologique.
          </Text>
        </VStack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {FEATURES.map((f, i) => (
            <Box key={i} bg={G.white} borderRadius="18px" p={6}
              border={`1px solid ${G.border}`} boxShadow="0 2px 12px rgba(0,0,0,0.05)"
              _hover={{ boxShadow: '0 8px 28px rgba(0,0,0,0.09)', transform: 'translateY(-3px)', borderColor: G.soft }}
              transition="all 0.25s">
              <Box w="44px" h="44px" borderRadius="12px" bg={G.soft}
                display="flex" alignItems="center" justifyContent="center" mb={4}>
                <Icon as={f.icon} color={f.color} boxSize={5} />
              </Box>
              <Heading size="sm" color={G.dark} mb={2} fontWeight="700">{f.title}</Heading>
              <Text fontSize="sm" color={G.muted} lineHeight="1.7">{f.desc}</Text>
            </Box>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  )
}

/* ══════════════════════════════════════════
   HOW IT WORKS
══════════════════════════════════════════ */
const STEPS = [
  { num: '01', icon: FiList,      title: 'Configurez votre organisation',
    desc: "Renseignez vos sites de production et vos produits/services dans l'onglet Entreprise." },
  { num: '02', icon: FiEdit3,     title: 'Saisissez vos données',
    desc: "Pour chaque catégorie (1 à 6), activez les sources pertinentes et entrez vos consommations." },
  { num: '03', icon: FiBarChart2, title: 'Consultez votre bilan GES',
    desc: "Visualisez vos émissions calculées en temps réel, par catégorie, site ou produit." },
  { num: '04', icon: FiDownload,  title: 'Exportez votre rapport',
    desc: "Téléchargez un rapport de durabilité conforme ISO 14064 pour vos parties prenantes." },
]

function HowItWorksSection() {
  return (
    <Box py={{ base: 16, md: 24 }} bg={G.white}>
      <Container maxW="container.xl">
        <VStack spacing={3} mb={14} textAlign="center">
          <Badge bg={G.soft} color={G.brand} px={3} py={1} borderRadius="full" fontSize="xs" fontWeight="700">
            Comment ça marche
          </Badge>
          <Heading fontSize={{ base: '2xl', md: '3xl' }} color={G.dark} fontWeight="800">
            Votre premier bilan en 4 étapes
          </Heading>
          <Text color={G.muted} maxW="480px" fontSize="md">
            Guidé pas à pas, de la configuration à l&apos;export du rapport final.
          </Text>
        </VStack>

        <Grid templateColumns={{ base: '1fr', md: 'repeat(4,1fr)' }} gap={0} position="relative">
          {/* connector line — desktop only */}
          <Box display={{ base: 'none', md: 'block' }}
            position="absolute" top="31px" left="calc(12.5% + 32px)" right="calc(12.5% + 32px)"
            h="2px" bgGradient={`linear(to-r, ${G.brand}, ${G.accent}, ${G.light})`} zIndex={0} opacity={0.35} />

          {STEPS.map((s, i) => (
            <VStack key={i} spacing={4} align="center" textAlign="center"
              position="relative" zIndex={1} px={{ base: 2, md: 4 }} pb={{ base: 8, md: 0 }}>
              {/* numbered circle */}
              <Box w="64px" h="64px" borderRadius="full"
                bg={G.brand} color="white"
                border="3px solid" borderColor={i === 0 ? G.brand : G.soft}
                display="flex" alignItems="center" justifyContent="center"
                boxShadow={`0 4px 18px rgba(52,78,65,${0.35 - i * 0.06})`}
                opacity={1 - i * 0.08}>
                <Text fontWeight="900" fontSize="lg" color="white">{s.num}</Text>
              </Box>
              <Box w="40px" h="40px" borderRadius="full" bg={G.soft}
                display="flex" alignItems="center" justifyContent="center">
                <Icon as={s.icon} color={G.brand} boxSize={4} />
              </Box>
              <Heading size="sm" color={G.dark} fontWeight="700" lineHeight="1.3">{s.title}</Heading>
              <Text fontSize="sm" color={G.muted} lineHeight="1.7">{s.desc}</Text>
            </VStack>
          ))}
        </Grid>

        <Flex justify="center" mt={12}>
          <Link href="/signup" passHref legacyBehavior>
            <Button as="a" size="md" px={8} h="46px" borderRadius="full"
              bg={G.brand} color="white" fontWeight="700"
              rightIcon={<Icon as={FiArrowRight} />}
              _hover={{ bg: G.accent, transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(52,78,65,0.3)' }}
              transition="all 0.2s">
              Démarrer maintenant
            </Button>
          </Link>
        </Flex>
      </Container>
    </Box>
  )
}

/* ══════════════════════════════════════════
   CATEGORIES
══════════════════════════════════════════ */
const CATS = [
  { num: '1', icon: FiZap,     label: 'Émissions directes',          desc: 'Combustion stationnaire, procédés industriels, émissions fugitives', color: G.brand },
  { num: '2', icon: FiCpu,     label: 'Énergie importée',            desc: 'Électricité, vapeur et chaleur achetées à des tiers',               color: '#4A7C59' },
  { num: '3', icon: FiTruck,   label: 'Transports',                  desc: "Navettage des employés, déplacements d'affaires, fret",              color: G.accent },
  { num: '4', icon: FiMonitor, label: 'Numérique & consommables',    desc: 'TIC, papier, cartouches, piles, traitement des eaux usées',          color: '#6A9B70' },
  { num: '5', icon: FiPackage, label: 'Produits vendus',             desc: 'Utilisation électrique/combustible et fin de vie des produits',      color: '#7AB580' },
  { num: '6', icon: FiDroplet, label: 'Autres émissions indirectes', desc: "Investissements, chaîne d'approvisionnement, leasing",               color: '#8FBF96' },
]

function CategoriesSection() {
  return (
    <Box py={{ base: 16, md: 24 }} bg={G.bg}>
      <Container maxW="container.xl">
        <VStack spacing={3} mb={12} textAlign="center">
          <Badge bg={G.soft} color={G.brand} px={3} py={1} borderRadius="full" fontSize="xs" fontWeight="700">
            Périmètre de calcul
          </Badge>
          <Heading fontSize={{ base: '2xl', md: '3xl' }} color={G.dark} fontWeight="800">
            6 catégories d&apos;émissions couvertes
          </Heading>
          <Text color={G.muted} maxW="500px" fontSize="md">
            Conformément à la norme ISO 14064-1 et au GHG Protocol Scope 1, 2 et 3.
          </Text>
        </VStack>

        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={5}>
          {CATS.map((c, i) => (
            <Flex key={i} bg={G.white} borderRadius="16px" p={5} gap={4} align="flex-start"
              border={`1px solid ${G.border}`} boxShadow="0 2px 10px rgba(0,0,0,0.04)"
              _hover={{ boxShadow: '0 6px 22px rgba(0,0,0,0.08)', borderColor: G.soft, transform: 'translateY(-2px)' }}
              transition="all 0.25s">
              <Box w="48px" h="48px" borderRadius="12px" flexShrink={0}
                bg={G.soft} display="flex" alignItems="center" justifyContent="center">
                <Icon as={c.icon} color={c.color} boxSize={5} />
              </Box>
              <Box>
                <HStack spacing={2} mb={1}>
                  <Badge bg={G.soft} color={G.brand} fontSize="10px" fontWeight="800" px={1.5} borderRadius="6px">
                    Cat. {c.num}
                  </Badge>
                  <Heading size="xs" color={G.dark} fontWeight="700">{c.label}</Heading>
                </HStack>
                <Text fontSize="xs" color={G.muted} lineHeight="1.6">{c.desc}</Text>
              </Box>
            </Flex>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  )
}

/* ══════════════════════════════════════════
   TESTIMONIAL
══════════════════════════════════════════ */
function TestimonialSection() {
  return (
    <Box py={{ base: 14, md: 20 }}
      bgGradient={`linear(135deg, ${G.brand} 0%, ${G.dark} 100%)`}
      position="relative" overflow="hidden">
      <Box position="absolute" inset={0} pointerEvents="none" opacity={0.04}
        backgroundImage="linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)"
        backgroundSize="48px 48px" />
      <Container maxW="container.md" position="relative" zIndex={1} textAlign="center">
        <Text fontSize={{ base: '4xl', md: '6xl' }} mb={4} color={G.soft} lineHeight={1}>&ldquo;</Text>
        <Text fontSize={{ base: 'lg', md: 'xl' }} color="white" fontWeight="500" lineHeight="1.8" mb={8} fontStyle="italic">
          Carbone Québec nous a permis de produire notre premier bilan GES en moins d&apos;une semaine.
          L&apos;interface est intuitive, les facteurs d&apos;émission sont à jour, et le rapport PDF
          est directement utilisable pour nos parties prenantes.
        </Text>
        <VStack spacing={1}>
          <Text fontWeight="700" color={G.light} fontSize="sm">Sophie Tremblay</Text>
          <Text color="rgba(255,255,255,0.5)" fontSize="xs">Directrice développement durable · Manufacturier québécois</Text>
        </VStack>
      </Container>
    </Box>
  )
}

/* ══════════════════════════════════════════
   STANDARDS
══════════════════════════════════════════ */
const STANDARDS = [
  { badge: 'ISO 14064-1', desc: 'Quantification des GES au niveau organisationnel' },
  { badge: 'GHG Protocol', desc: 'Corporate Accounting and Reporting Standard' },
  { badge: 'ECCC',         desc: "Facteurs d'émission — Environnement Canada" },
  { badge: 'IPCC AR6',     desc: 'Global Warming Potentials (100 ans)' },
]

function StandardsSection() {
  return (
    <Box py={{ base: 14, md: 20 }} bg={G.white}>
      <Container maxW="container.xl">
        <VStack spacing={3} mb={10} textAlign="center">
          <Badge bg={G.soft} color={G.brand} px={3} py={1} borderRadius="full" fontSize="xs" fontWeight="700">
            Références méthodologiques
          </Badge>
          <Heading fontSize={{ base: 'xl', md: '2xl' }} color={G.dark} fontWeight="800">
            Des calculs basés sur des normes reconnues internationalement
          </Heading>
        </VStack>
        <SimpleGrid columns={{ base: 2, lg: 4 }} spacing={4}>
          {STANDARDS.map((s, i) => (
            <Box key={i} p={5} bg={G.bg} borderRadius="14px"
              border={`1px solid ${G.border}`} textAlign="center"
              _hover={{ borderColor: G.soft, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
              transition="all 0.2s">
              <Badge bg={G.brand} color="white" px={3} py={1} borderRadius="8px"
                fontSize="sm" fontWeight="700" mb={3} display="block">
                {s.badge}
              </Badge>
              <Text fontSize="xs" color={G.muted} lineHeight="1.6">{s.desc}</Text>
            </Box>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  )
}

/* ══════════════════════════════════════════
   FAQ
══════════════════════════════════════════ */
const FAQS = [
  { q: "À qui s'adresse le calculateur ?",
    a: "À toute organisation québécoise souhaitant quantifier ses émissions GES : PME, grandes entreprises, OBNL, institutions publiques. Aucune expertise technique préalable n'est requise." },
  { q: "Quelles données dois-je rassembler ?",
    a: "Vos factures d'énergie (électricité, gaz), les données de transport de vos employés, vos achats de consommables TIC, et tout autre intrant pertinent selon les catégories activées." },
  { q: "Les facteurs d'émission sont-ils à jour ?",
    a: "Oui. Les facteurs sont tirés de sources officielles (ECCC, IPCC AR6, GHG Protocol) et mis à jour régulièrement pour refléter les valeurs nationales et provinciales en vigueur." },
  { q: "Puis-je exporter mon bilan ?",
    a: "Oui. La plateforme génère un rapport de durabilité conforme ISO 14064 exportable en PDF. L'export Excel est également prévu pour les données brutes." },
  { q: "Mes données sont-elles sécurisées ?",
    a: "Absolument. Les données sont hébergées sur une infrastructure chiffrée (Supabase), avec une séparation stricte par organisation et un contrôle d'accès par rôle." },
]

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <Box py={{ base: 14, md: 20 }} bg={G.bg}>
      <Container maxW="container.md">
        <VStack spacing={3} mb={10} textAlign="center">
          <Badge bg={G.soft} color={G.brand} px={3} py={1} borderRadius="full" fontSize="xs" fontWeight="700">
            FAQ
          </Badge>
          <Heading fontSize={{ base: '2xl', md: '3xl' }} color={G.dark} fontWeight="800">
            Questions fréquentes
          </Heading>
        </VStack>

        <VStack spacing={3} align="stretch">
          {FAQS.map((item, i) => (
            <Box key={i} bg={G.white} borderRadius="14px"
              border={`1px solid ${open === i ? G.soft : G.border}`}
              boxShadow={open === i ? '0 4px 20px rgba(0,0,0,0.07)' : '0 1px 6px rgba(0,0,0,0.03)'}
              overflow="hidden" transition="all 0.2s">
              <Flex
                as="button" w="100%" p={5} align="center" justify="space-between"
                cursor="pointer" onClick={() => setOpen(open === i ? null : i)}
                textAlign="left" _hover={{ bg: G.bg }}>
                <Text fontWeight="600" color={G.dark} fontSize="sm" pr={4}>{item.q}</Text>
                <Icon as={open === i ? FiChevronUp : FiChevronDown}
                  color={G.accent} boxSize={4} flexShrink={0} />
              </Flex>
              {open === i && (
                <Box px={5} pb={5}>
                  <Divider mb={4} borderColor={G.border} />
                  <Text fontSize="sm" color={G.muted} lineHeight="1.8">{item.a}</Text>
                </Box>
              )}
            </Box>
          ))}
        </VStack>
      </Container>
    </Box>
  )
}

/* ══════════════════════════════════════════
   FINAL CTA
══════════════════════════════════════════ */
function CTASection() {
  return (
    <Box py={{ base: 16, md: 24 }}
      bgGradient={`linear(135deg, ${G.dark} 0%, ${G.brand} 100%)`}
      position="relative" overflow="hidden">
      <Box position="absolute" inset={0} pointerEvents="none" opacity={0.04}
        backgroundImage="linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)"
        backgroundSize="48px 48px" />
      <Container maxW="container.md" position="relative" zIndex={1} textAlign="center">
        <VStack spacing={6}>
          <Heading fontSize={{ base: '2xl', md: '4xl' }} color="white" fontWeight="800" lineHeight="1.2">
            Prêt à démarrer votre bilan carbone&nbsp;?
          </Heading>
          <Text color="rgba(255,255,255,0.7)" fontSize={{ base: 'md', md: 'lg' }} maxW="480px">
            Créez votre compte en quelques secondes et commencez à saisir vos données dès aujourd&apos;hui.
          </Text>
          <HStack spacing={4} flexWrap="wrap" justify="center" pt={2}>
            <Link href="/signup" passHref legacyBehavior>
              <Button as="a" size="lg" px={10} h="52px" borderRadius="full"
                bg={G.light} color={G.dark} fontWeight="800"
                rightIcon={<Icon as={FiArrowRight} />}
                _hover={{ bg: '#B8CAAA', transform: 'translateY(-2px)', boxShadow: '0 12px 32px rgba(163,177,138,0.4)' }}
                transition="all 0.2s">
                Créer un compte
              </Button>
            </Link>
            <Link href="/login" passHref legacyBehavior>
              <Button as="a" size="lg" px={8} h="52px" borderRadius="full"
                variant="outline" borderColor="rgba(255,255,255,0.35)"
                color="white" fontWeight="600"
                _hover={{ bg: 'rgba(255,255,255,0.08)' }}
                transition="all 0.2s">
                Se connecter
              </Button>
            </Link>
          </HStack>
        </VStack>
      </Container>
    </Box>
  )
}

/* ══════════════════════════════════════════
   FOOTER
══════════════════════════════════════════ */
function Footer() {
  return (
    <Box bg={G.dark} py={10}>
      <Container maxW="container.xl">
        <Flex direction={{ base: 'column', md: 'row' }} align={{ base: 'center', md: 'center' }}
          justify="space-between" gap={6} textAlign={{ base: 'center', md: 'left' }}>
          <VStack align={{ base: 'center', md: 'flex-start' }} spacing={1}>
            <Text fontWeight="800" color="white" fontSize="lg">Carbone Québec</Text>
            <Text fontSize="xs" color="rgba(255,255,255,0.4)">
              Calculateur GES conforme ISO 14064 &amp; GHG Protocol
            </Text>
          </VStack>
          <HStack spacing={6} flexWrap="wrap" justify="center">
            {[
              { label: 'Se connecter',  href: '/login'  },
              { label: "S'inscrire",    href: '/signup' },
            ].map(l => (
              <Link key={l.href} href={l.href}>
                <Text fontSize="sm" color="rgba(255,255,255,0.5)" _hover={{ color: G.light }}
                  transition="color 0.2s" cursor="pointer">
                  {l.label}
                </Text>
              </Link>
            ))}
          </HStack>
        </Flex>
        <Divider mt={8} mb={6} borderColor="rgba(255,255,255,0.08)" />
        <Text textAlign="center" fontSize="xs" color="rgba(255,255,255,0.25)">
          © {new Date().getFullYear()} Carbone Québec. Tous droits réservés.
        </Text>
      </Container>
    </Box>
  )
}

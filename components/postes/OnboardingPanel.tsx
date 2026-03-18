'use client'

import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  IconButton,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import { ArrowBackIcon, CloseIcon } from '@chakra-ui/icons'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type SlideType = 'welcome' | 'scopes' | 'data_entry' | 'ai_assistant'

type Slide = {
  type: SlideType
  headerTitle: string
  image?: string
  primaryLabel: string
  secondaryLabel?: string
}

export default function OnboardingPanel() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  const slides: Slide[] = useMemo(
    () => [
      {
        type: 'welcome',
        headerTitle: 'Bienvenue dans le calculateur Carbone Québec',
        image: '/onboarding/onboarding-1.png',
        primaryLabel: 'Commencer',
        secondaryLabel: "Je connais déjà l'outil",
      },
      {
        type: 'scopes',
        headerTitle: 'Structure du calculateur — 6 catégories ISO 14064',
        primaryLabel: 'Compris !',
      },
      {
        type: 'data_entry',
        headerTitle: 'Saisie des données et calcul automatique',
        image: '/onboarding/onboarding-3.png',
        primaryLabel: 'Compris !',
      },
      {
        type: 'ai_assistant',
        headerTitle: 'Votre assistant GES intégré',
        image: '/onboarding/onboarding-4.png',
        primaryLabel: 'Accéder au calculateur',
      },
    ],
    []
  )

  const s = slides[step]

  const bgPage   = '#F6F6F6'
  const cardBg   = 'white'
  const textMain = '#2B2B2B'
  const borderSoft = '#E9E9E9'
  const green    = '#2F4A3A'
  const muted    = 'rgba(0,0,0,0.60)'

  const close = () => router.push('/chart')
  const prev  = () => setStep((p) => Math.max(p - 1, 0))
  const next  = () => setStep((p) => Math.min(p + 1, slides.length - 1))
  const finish = () => router.push('/chart')

  const onPrimary   = () => { if (step === slides.length - 1) finish(); else next() }
  const onSecondary = () => { if (step === 0) router.push('/chart'); else prev() }

  return (
    <Box minH="100vh" bg={bgPage} display="flex" alignItems="center" justifyContent="center" px={4} py={10}>
      <Container maxW="lg" p={0}>
        <Box
          bg={cardBg}
          borderRadius="18px"
          boxShadow="0 18px 45px rgba(0,0,0,0.10)"
          border={`1px solid ${borderSoft}`}
          overflow="hidden"
        >
          {/* Header */}
          <Box position="relative" px={6} pt={5} pb={3}>
            {step > 0 && (
              <IconButton
                aria-label="Retour"
                icon={<ArrowBackIcon boxSize={4} />}
                size="sm" variant="ghost"
                position="absolute" top="10px" left="10px"
                color={textMain} onClick={prev}
              />
            )}
            <Text textAlign="center" fontWeight="700" color={textMain} fontSize="14px">
              {s.headerTitle}
            </Text>
            <IconButton
              aria-label="Fermer"
              icon={<CloseIcon boxSize={2.5} />}
              size="sm" variant="ghost"
              position="absolute" top="10px" right="10px"
              color={textMain} onClick={close}
            />
          </Box>

          <Box borderTop={`1px solid ${borderSoft}`} />

          {/* Body */}
          <Box px={8} py={7}>

            {/* ── Slide 1: Welcome ── */}
            {s.type === 'welcome' && (
              <VStack spacing={4} textAlign="center">
                <Box w="140px" h="110px" position="relative">
                  {s.image
                    ? <Image src={s.image} alt="Onboarding" fill style={{ objectFit: 'contain' }} priority />
                    : <Box w="100%" h="100%" bg="#F1F1F1" borderRadius="12px" />
                  }
                </Box>

                <Heading fontSize="16px" fontWeight="700" color={textMain} whiteSpace="pre-line" lineHeight="1.3">
                  Bienvenue dans votre espace de calcul{'\n'}des émissions de GES.
                </Heading>

                <Text fontSize="12px" color={muted} whiteSpace="pre-line" lineHeight="1.5" maxW="360px">
                  Cette plateforme vous permet de mesurer, de suivre et de comprendre{'\n'}
                  l'empreinte carbone de votre organisation.{'\n\n'}
                  Conforme à la norme ISO 14064 et au GHG Protocol, le calculateur{'\n'}
                  couvre les Scopes 1, 2 et 3.
                </Text>

                <HStack spacing={3} pt={2}>
                  <Button
                    onClick={onPrimary}
                    bg={green} color="white" _hover={{ bg: '#253B2E' }}
                    borderRadius="999px" h="34px" px={8} fontSize="12px" fontWeight="700"
                  >
                    {s.primaryLabel}
                  </Button>
                  {s.secondaryLabel && (
                    <Button
                      onClick={onSecondary}
                      variant="outline" borderColor="#D7D7D7" color={textMain}
                      _hover={{ bg: 'rgba(0,0,0,0.03)' }}
                      borderRadius="999px" h="34px" px={6} fontSize="12px" fontWeight="600"
                    >
                      {s.secondaryLabel}
                    </Button>
                  )}
                </HStack>
              </VStack>
            )}

            {/* ── Slide 2: Scopes & categories ── */}
            {s.type === 'scopes' && (
              <VStack spacing={5} textAlign="center">
                <Text fontSize="12px" color={muted} maxW="440px" lineHeight="1.5">
                  Le calculateur est structuré en <strong>6 catégories ISO 14064</strong>, réparties{' '}
                  en trois scopes d'émissions reconnus internationalement.
                </Text>

                <SimpleGrid columns={3} spacing={3} w="100%" maxW="520px">
                  <ScopeCard
                    title="Scope 1"
                    subtitle="Émissions directes"
                    detail="Cat. 1 — combustion fixe, véhicules de flotte, réfrigérants"
                    color="#2F4A3A"
                  />
                  <ScopeCard
                    title="Scope 2"
                    subtitle="Énergie importée"
                    detail="Cat. 2 — électricité achetée (location-based & market-based)"
                    color="#588157"
                  />
                  <ScopeCard
                    title="Scope 3"
                    subtitle="Émissions indirectes"
                    detail="Cat. 3 à 6 — navettage, achats, produits vendus, autres"
                    color="#A3B18A"
                  />
                </SimpleGrid>

                <Text fontSize="11px" color="rgba(0,0,0,0.50)" maxW="440px" lineHeight="1.5">
                  Lors de votre première connexion, un assistant vous guidera pour sélectionner{' '}
                  uniquement les sources qui s'appliquent à votre organisation.
                </Text>

                <Button
                  onClick={onPrimary}
                  bg={green} color="white" _hover={{ bg: '#253B2E' }}
                  borderRadius="999px" h="34px" px={10} fontSize="12px" fontWeight="700"
                >
                  {s.primaryLabel}
                </Button>
              </VStack>
            )}

            {/* ── Slide 3: Data entry ── */}
            {s.type === 'data_entry' && (
              <VStack spacing={4} textAlign="center">
                <Box w="170px" h="120px" position="relative" mt={1}>
                  {s.image
                    ? <Image src={s.image} alt="Saisie" fill style={{ objectFit: 'contain' }} priority />
                    : <Box w="100%" h="100%" bg="#F1F1F1" borderRadius="12px" />
                  }
                </Box>

                <Text fontSize="12px" color="rgba(0,0,0,0.75)" maxW="430px" lineHeight="1.5" fontWeight={600}>
                  Saisie simple, calcul automatique.
                </Text>

                <VStack spacing={2} align="start" w="full" maxW="400px">
                  <FeatureRow icon="🧮" text="Chaque valeur saisie est convertie en tCO₂eq à l'aide de facteurs d'émission officiels (ECCC, ADEME)." />
                  <FeatureRow icon="📄" text="Importez vos factures ou documents — les données pertinentes sont extraites automatiquement." />
                  <FeatureRow icon="❓" text="Cliquez sur l'icône (i) de chaque section pour afficher des explications détaillées sur le poste." />
                  <FeatureRow icon="📊" text="Votre bilan se met à jour en temps réel à chaque saisie, visible dans l'onglet Bilan." />
                </VStack>

                <Button
                  onClick={onPrimary}
                  bg={green} color="white" _hover={{ bg: '#253B2E' }}
                  borderRadius="999px" h="34px" px={10} fontSize="12px" fontWeight="700" mt={1}
                >
                  {s.primaryLabel}
                </Button>
              </VStack>
            )}

            {/* ── Slide 4: AI Assistant ── */}
            {s.type === 'ai_assistant' && (
              <VStack spacing={4} textAlign="center">
                <Box w="180px" h="110px" position="relative" mt={1}>
                  {s.image
                    ? <Image src={s.image} alt="Assistant IA" fill style={{ objectFit: 'contain' }} priority />
                    : <Box w="100%" h="100%" bg="#F1F1F1" borderRadius="12px" />
                  }
                </Box>

                <Text fontSize="12px" color="rgba(0,0,0,0.75)" maxW="430px" lineHeight="1.5" fontWeight={600}>
                  Un assistant GES disponible en permanence, en bas à droite de l'écran.
                </Text>

                <VStack spacing={2.5} align="start" w="full" maxW="400px">
                  <ModeRow
                    icon="🧭"
                    label="Guidage"
                    color="#344E41"
                    text="Posez vos questions sur la page en cours : quoi saisir, quelle méthode choisir, comment progresser."
                  />
                  <ModeRow
                    icon="⚡"
                    label="Formulaire"
                    color="#588157"
                    text="L'assistant lit vos saisies en temps réel et détecte les incohérences ou les données manquantes."
                  />
                  <ModeRow
                    icon="📚"
                    label="Savoir"
                    color="#4A7C59"
                    text="Accédez à des explications sur le GHG Protocol, ISO 14064, les PRG, les facteurs ECCC / ADEME et les différences Scope 1/2/3."
                  />
                </VStack>

                <Text fontSize="11px" color="rgba(0,0,0,0.45)" maxW="400px" lineHeight="1.4" mt={1}>
                  L'assistant connaît le contexte de la page active et adapte ses réponses à votre catégorie d'émissions.
                </Text>

                <Button
                  onClick={onPrimary}
                  bg={green} color="white" _hover={{ bg: '#253B2E' }}
                  borderRadius="999px" h="34px" px={10} fontSize="12px" fontWeight="700" mt={1}
                >
                  {s.primaryLabel}
                </Button>
              </VStack>
            )}

            {/* Dots */}
            <HStack spacing={2} pt={6} justify="center" opacity={0.9}>
              {slides.map((_, i) => (
                <Box key={i} w="7px" h="7px" borderRadius="999px" bg={i === step ? green : '#D9D9D9'} />
              ))}
            </HStack>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

/* ── Atoms ── */

function ScopeCard({ title, subtitle, detail, color }: { title: string; subtitle: string; detail: string; color: string }) {
  return (
    <Box borderRadius="12px" border="1px solid #E6E6E6" bg="#FAFAFA" px={3} py={3} textAlign="center">
      <Text fontSize="12px" fontWeight="700" color={color}>{title}</Text>
      <Text fontSize="10px" fontWeight="600" color="#2B2B2B" mt={0.5}>{subtitle}</Text>
      <Text fontSize="9px" color="rgba(0,0,0,0.50)" mt={1} lineHeight="1.3">{detail}</Text>
    </Box>
  )
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <HStack align="start" spacing={2.5}>
      <Text fontSize="13px" flexShrink={0} mt="1px">{icon}</Text>
      <Text fontSize="11px" color="rgba(0,0,0,0.65)" lineHeight="1.45" textAlign="left">{text}</Text>
    </HStack>
  )
}

function ModeRow({ icon, label, color, text }: { icon: string; label: string; color: string; text: string }) {
  return (
    <HStack align="start" spacing={2.5} w="full">
      <Box flexShrink={0} w="22px" h="22px" borderRadius="6px" bg={`${color}18`}
        display="flex" alignItems="center" justifyContent="center" mt="1px">
        <Text fontSize="11px">{icon}</Text>
      </Box>
      <Box textAlign="left">
        <Text fontSize="11px" fontWeight="700" color={color}>{label}</Text>
        <Text fontSize="11px" color="rgba(0,0,0,0.60)" lineHeight="1.4">{text}</Text>
      </Box>
    </HStack>
  )
}

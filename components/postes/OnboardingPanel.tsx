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

type SlideType = 'welcome' | 'scopes' | 'auto_help' | 'progress'

type Slide = {
  type: SlideType
  headerTitle: string
  image?: string
  primaryLabel: string
  secondaryLabel?: string // only used on panel 1
}

export default function OnboardingPanel() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  const slides: Slide[] = useMemo(
    () => [
      // ✅ Panel 1
      {
        type: 'welcome',
        headerTitle: 'Bienvenue dans le calculateur Carbone Québec',
        image: '/onboarding/onboarding-1.png',
        primaryLabel: 'Commencer',
        secondaryLabel: "Je connais déjà l'outil",
      },

      // ✅ Panel 2
      {
        type: 'scopes',
        headerTitle: 'Structure du calculateur',
        primaryLabel: 'Compris !',
      },

      // ✅ Panel 3
      {
        type: 'auto_help',
        headerTitle: 'Calcul automatique et aide intégrée',
        image: '/onboarding/onboarding-3.png',
        primaryLabel: 'Compris !',
      },

      // ✅ Panel 4 (FINAL)
      {
        type: 'progress',
        headerTitle: 'Suivi et progression',
        image: '/onboarding/onboarding-4.png',
        primaryLabel: 'Accéder au calculateur',
      },
    ],
    []
  )

  const s = slides[step]

  // Styles close to screenshots
  const bgPage = '#F6F6F6'
  const cardBg = 'white'
  const textMain = '#2B2B2B'
  const borderSoft = '#E9E9E9'
  const green = '#2F4A3A'

  const close = () => router.push('/dashboard') // ✅ change if needed
  const prev = () => setStep((p) => Math.max(p - 1, 0))
  const next = () => setStep((p) => Math.min(p + 1, slides.length - 1))

  const finish = () => {
    // ✅ final destination
    router.push('/chart') // change to your calculator route
  }

  const onPrimary = () => {
    if (step === slides.length - 1) finish()
    else next()
  }

  const onSecondary = () => {
    // panel 1 secondary = skip
    if (step === 0) router.push('/chart')
    else prev()
  }

  return (
    <Box
      minH="100vh"
      bg={bgPage}
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
      py={10}
    >
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
                size="sm"
                variant="ghost"
                position="absolute"
                top="10px"
                left="10px"
                color={textMain}
                onClick={prev}
              />
            )}

            <Text textAlign="center" fontWeight="700" color={textMain} fontSize="14px">
              {s.headerTitle}
            </Text>

            <IconButton
              aria-label="Fermer"
              icon={<CloseIcon boxSize={2.5} />}
              size="sm"
              variant="ghost"
              position="absolute"
              top="10px"
              right="10px"
              color={textMain}
              onClick={close}
            />
          </Box>

          <Box borderTop={`1px solid ${borderSoft}`} />

          {/* Body */}
          <Box px={8} py={7}>
            {/* Panel 1 */}
            {s.type === 'welcome' && (
              <VStack spacing={4} textAlign="center">
                <Box w="140px" h="110px" position="relative">
                  {s.image ? (
                    <Image src={s.image} alt="Onboarding 1" fill style={{ objectFit: 'contain' }} priority />
                  ) : (
                    <Box w="100%" h="100%" bg="#F1F1F1" borderRadius="12px" />
                  )}
                </Box>

                <Heading fontSize="16px" fontWeight="700" color={textMain} whiteSpace="pre-line" lineHeight="1.3">
                  Bienvenue dans votre espace de calcul{'\n'}des émissions de GES.
                </Heading>

                <Text fontSize="12px" color="rgba(0,0,0,0.65)" whiteSpace="pre-line" lineHeight="1.45" maxW="360px">
                  Cette plateforme vous permet d’évaluer, de suivre et de comprendre{'\n'}
                  l’impact environnemental de vos activités.{'\n\n'}
                  Notre objectif est simple : rendre la gestion carbone simple,{'\n'}
                  transparente et concrète.
                </Text>

                <HStack spacing={3} pt={2}>
                  <Button
                    onClick={onPrimary}
                    bg={green}
                    color="white"
                    _hover={{ bg: '#253B2E' }}
                    borderRadius="999px"
                    h="34px"
                    px={8}
                    fontSize="12px"
                    fontWeight="700"
                  >
                    {s.primaryLabel}
                  </Button>

                  {s.secondaryLabel ? (
                    <Button
                      onClick={onSecondary}
                      variant="outline"
                      borderColor="#D7D7D7"
                      color={textMain}
                      _hover={{ bg: 'rgba(0,0,0,0.03)' }}
                      borderRadius="999px"
                      h="34px"
                      px={6}
                      fontSize="12px"
                      fontWeight="600"
                    >
                      {s.secondaryLabel}
                    </Button>
                  ) : null}
                </HStack>
              </VStack>
            )}

            {/* Panel 2 */}
            {s.type === 'scopes' && (
              <VStack spacing={5} textAlign="center">
                <Text fontSize="12px" color="rgba(0,0,0,0.65)" maxW="420px" lineHeight="1.45">
                  Le calculateur est divisé en trois catégories d’émissions,
                  <br />
                  regroupées selon les scopes reconnus internationalement.
                </Text>

                <SimpleGrid columns={3} spacing={3} w="100%" maxW="520px">
                  <ScopeCard title="Scope 1" subtitle="Émissions directes" />
                  <ScopeCard title="Scope 2" subtitle={'Émissions indirectes\nliées à l’énergie'} />
                  <ScopeCard title="Scope 3" subtitle={'Autres émissions\nindirectes'} />
                </SimpleGrid>

                <Text fontSize="11px" color="rgba(0,0,0,0.55)" maxW="440px" lineHeight="1.45">
                  Chaque catégorie comprend plusieurs postes d’émissions.
                  <br />
                  Vous devez compléter uniquement ceux pertinents à votre organisation.
                </Text>

                <Button
                  onClick={onPrimary}
                  bg={green}
                  color="white"
                  _hover={{ bg: '#253B2E' }}
                  borderRadius="999px"
                  h="34px"
                  px={10}
                  fontSize="12px"
                  fontWeight="700"
                >
                  {s.primaryLabel}
                </Button>
              </VStack>
            )}

            {/* Panel 3 */}
            {s.type === 'auto_help' && (
              <VStack spacing={4} textAlign="center">
                <Box w="170px" h="120px" position="relative" mt={1}>
                  {s.image ? (
                    <Image src={s.image} alt="Onboarding 3" fill style={{ objectFit: 'contain' }} priority />
                  ) : (
                    <Box w="100%" h="100%" bg="#F1F1F1" borderRadius="12px" />
                  )}
                </Box>

                <Text fontSize="12px" color="rgba(0,0,0,0.75)" maxW="430px" lineHeight="1.5" fontWeight={600}>
                  Le calculateur utilise des facteurs officiels de conversion
                  <br />
                  carbone pour estimer vos émissions.
                </Text>

                <Text fontSize="11px" color="rgba(0,0,0,0.60)" maxW="460px" lineHeight="1.45">
                  Cliquez sur le point d’interrogation (i) dans chaque section pour accéder à des explications
                  détaillées ou pour obtenir l’aide liée au poste.
                  <br />
                  <br />
                  Vous pouvez aussi importer des documents (ex : factures) automatiquement des données pertinentes.
                  Cliquez simplement sur « Ajouter un document » au poste associé.
                </Text>

                <Button
                  onClick={onPrimary}
                  bg={green}
                  color="white"
                  _hover={{ bg: '#253B2E' }}
                  borderRadius="999px"
                  h="34px"
                  px={10}
                  fontSize="12px"
                  fontWeight="700"
                  mt={1}
                >
                  {s.primaryLabel}
                </Button>
              </VStack>
            )}

            {/* ✅ Panel 4 (FINAL) */}
            {s.type === 'progress' && (
              <VStack spacing={4} textAlign="center">
                <Box w="180px" h="120px" position="relative" mt={1}>
                  {s.image ? (
                    <Image src={s.image} alt="Onboarding 4" fill style={{ objectFit: 'contain' }} priority />
                  ) : (
                    <Box w="100%" h="100%" bg="#F1F1F1" borderRadius="12px" />
                  )}
                </Box>

                <Text fontSize="12px" color="rgba(0,0,0,0.75)" maxW="430px" lineHeight="1.5" fontWeight={600}>
                  Votre progression se met à jour automatiquement
                  <br />
                  à chaque saisie.
                </Text>

                <Text fontSize="11px" color="rgba(0,0,0,0.60)" maxW="470px" lineHeight="1.45">
                  Vous pouvez suivre vos avancements, voir les sections complétées et connaître celles qu’il reste à
                  remplir. Appuyez sur le bouton « Suivi » afin de voir votre progression.
                  <br />
                  <br />
                  Lorsque tout est terminé, vos résultats globaux s’affichent dans votre bilan prêt à être analysé et
                  exporté. Sélectionnez le bouton « Finir » pour votre disponibilité.
                </Text>

                <Button
                  onClick={onPrimary}
                  bg={green}
                  color="white"
                  _hover={{ bg: '#253B2E' }}
                  borderRadius="999px"
                  h="34px"
                  px={10}
                  fontSize="12px"
                  fontWeight="700"
                  mt={1}
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

function ScopeCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Box borderRadius="12px" border="1px solid #E6E6E6" bg="#FAFAFA" px={3} py={3} textAlign="center">
      <Text fontSize="12px" fontWeight="700" color="#2B2B2B">
        {title}
      </Text>
      <Text fontSize="10px" color="rgba(0,0,0,0.65)" whiteSpace="pre-line" mt={1} lineHeight="1.3">
        {subtitle}
      </Text>
      {/* icon placeholder */}
      <Box mt={2} mx="auto" w="22px" h="16px" borderRadius="4px" bg="rgba(0,0,0,0.12)" />
    </Box>
  )
}

'use client'

import { useState } from 'react'
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Flex,
  Progress,
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'

const slides = [
  {
    title: 'Bienvenue sur le calculateur GES',
    text: 'Cet outil développé par Carbone Québec vous permet de calculer vos émissions de gaz à effet de serre selon les standards reconnus.',
  },
  {
    title: 'Les Postes',
    text: 'Chaque poste correspond à une catégorie d’émissions (électricité, carburants, bâtiments, etc.). Vous pouvez saisir vos données par poste.',
  },
  {
    title: 'Méthodologies',
    text: 'Les calculs utilisent les facteurs d’émissions officiels (IPCC, GHG Protocol). Chaque saisie est automatiquement convertie en équivalent CO₂.',
  },
  {
    title: 'Rapports et Suivi',
    text: 'À la fin, vous obtenez un rapport détaillé : émissions totales, intensité carbone, comparaisons annuelles et recommandations.',
  },
]

export default function OnboardingPanel() {
  const [step, setStep] = useState(0)
  const router = useRouter()

  const next = () => {
    if (step < slides.length - 1) {
      setStep(step + 1)
    } else {
      router.push('/chart') // redirect to calculator
    }
  }

  const prev = () => setStep(step > 0 ? step - 1 : 0)

  return (
    <Box
      w="100%"
      minH="100vh"
      bg="gray.50"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={6}
    >
      <Container
        maxW="lg"
        bg="white"
        rounded="2xl"
        shadow="xl"
        p={10}
        textAlign="center"
      >
        {/* Progress bar */}
        <Progress value={((step + 1) / slides.length) * 100} mb={6} rounded="full" />

        <Heading size="lg" mb={4}>
          {slides[step].title}
        </Heading>
        <Text fontSize="md" color="gray.600" mb={10}>
          {slides[step].text}
        </Text>

        {/* Navigation buttons */}
        <Flex justify="space-between">
          <Button
            onClick={prev}
            disabled={step === 0}
            variant="outline"
            colorScheme="teal"
          >
            Précédent
          </Button>
          
          <Button
            onClick={next}
            colorScheme="teal"
            px={8}
            rounded="full"
            fontWeight="bold"
          >
            {step === slides.length - 1 ? '🚀 Commencer' : 'Suivant'}
          </Button>
        </Flex>
      </Container>
    </Box>
  )
}

'use client';
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Section from "#components/postes/maincomponent"
import type { NextPage } from 'next'
import { Box } from '@chakra-ui/react'
import WelcomeAssistantModal from '#components/WelcomeAssistantModal'
import SourceSelectionModal from '#components/SourceSelectionModal'

function ChartContent() {
  const searchParams = useSearchParams()
  const bilanId = searchParams.get('bilan_id') ?? undefined

  return (
    <Box>
      <SourceSelectionModal />
      <WelcomeAssistantModal />
      <Box data-reveal data-parallax="0.08">
        <Box data-reveal-item>
          <Section bilanId={bilanId} />
        </Box>
      </Box>
    </Box>
  )
}

const Home: NextPage = () => {
  return (
    <Suspense>
      <ChartContent />
    </Suspense>
  )
}

export default Home

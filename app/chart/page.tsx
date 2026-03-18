'use client';
import Section from "#components/postes/maincomponent"
import type { NextPage } from 'next'
import { Box } from '@chakra-ui/react'
import WelcomeAssistantModal from '#components/WelcomeAssistantModal'
import SourceSelectionModal from '#components/SourceSelectionModal'

const Home: NextPage = () => {
  return (
    <Box>
      <SourceSelectionModal />
      <WelcomeAssistantModal />
      <Box data-reveal data-parallax="0.08">
        <Box data-reveal-item>
          <Section/>
        </Box>
      </Box>
    </Box>
  )
}

export default Home

'use client';
import Section from "#components/postes/maincomponent"
import type { NextPage } from 'next'
import {
  Box,
  ButtonGroup,
  Container,
  Flex,
  HStack,
  Heading,
  Icon,
  IconButton,
  SimpleGrid,
  Stack,
  Tag,
  Text,
  VStack,
  Wrap,
  useClipboard,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
  Divider,
  Badge,
  chakra,
            // ✅ add this
} from '@chakra-ui/react'
const Home: NextPage = () => {
  
  return (
    <Box>
 
      <Box data-reveal data-parallax="0.08">
        <Box data-reveal-item>
          <Section/>
        </Box>
      </Box>

      
    </Box>
  )
}


export default Home
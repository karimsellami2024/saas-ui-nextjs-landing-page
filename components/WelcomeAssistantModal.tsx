'use client';

import { useEffect, useState } from 'react';
import {
  Box, Button, Flex, Heading, HStack, Icon, Modal, ModalBody,
  ModalCloseButton, ModalContent, ModalOverlay, Text, VStack,
} from '@chakra-ui/react';
import {
  FiMessageSquare, FiZap, FiEdit3, FiHelpCircle, FiArrowRight,
} from 'react-icons/fi';

const STORAGE_KEY = 'cq_assistant_welcome_seen';

const CAPABILITIES = [
  {
    icon: FiEdit3,
    title: "Aide à la saisie",
    body: "Décrivez vos données en langage naturel — l'assistant comprend et vous guide champ par champ.",
  },
  {
    icon: FiHelpCircle,
    title: "Explication des sources",
    body: "Vous ne savez pas quelle source ou quel facteur utiliser ? Posez la question, l'assistant explique la méthodologie.",
  },
  {
    icon: FiZap,
    title: "Réponses immédiates",
    body: "Questions sur l'ISO 14064, le GHG Protocol, les scopes ou vos données ? L'assistant répond en quelques secondes.",
  },
];

export default function WelcomeAssistantModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Show only once per browser — after that, user has seen it
    if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  }

  return (
    <Modal isOpen={open} onClose={handleClose} size="lg" isCentered motionPreset="slideInBottom">
      <ModalOverlay bg="rgba(0,0,0,0.5)" backdropFilter="blur(6px)" />
      <ModalContent borderRadius="22px" overflow="hidden" mx={4} boxShadow="0 24px 64px rgba(0,0,0,0.18)">

        {/* ── Header ── */}
        <Box
          bgGradient="linear(135deg, #1B2E25 0%, #344E41 60%, #588157 100%)"
          px={7} pt={8} pb={7} position="relative"
        >
          {/* Decorative blob */}
          <Box position="absolute" top="-30px" right="-30px" w="160px" h="160px"
            borderRadius="full" bg="rgba(163,177,138,0.12)" pointerEvents="none" />

          <ModalCloseButton color="rgba(255,255,255,0.5)" top={4} right={4}
            _hover={{ color: 'white', bg: 'rgba(255,255,255,0.1)' }}
            borderRadius="8px" onClick={handleClose} />

          {/* Avatar */}
          <Flex
            w="56px" h="56px" borderRadius="16px"
            bg="rgba(255,255,255,0.12)" border="1px solid rgba(255,255,255,0.2)"
            align="center" justify="center" mb={4}
          >
            <Icon as={FiMessageSquare} color="white" boxSize={6} />
          </Flex>

          <Box
            display="inline-flex" alignItems="center" gap={2}
            px={3} py={1} mb={3}
            bg="rgba(163,177,138,0.2)" border="1px solid rgba(163,177,138,0.3)"
            borderRadius="full"
          >
            <Box w="6px" h="6px" bg="#A3B18A" borderRadius="full"
              sx={{ animation: 'pulse 2s ease infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
            <Text fontSize="11px" fontWeight="700" color="#A3B18A" letterSpacing="wider" textTransform="uppercase">
              Assistant IA · En ligne
            </Text>
          </Box>

          <Heading fontSize="2xl" color="white" fontWeight="800" lineHeight="1.2">
            Bonjour, je suis votre<br />assistant GES
          </Heading>
          <Text mt={2} fontSize="sm" color="rgba(255,255,255,0.65)" lineHeight="1.7" maxW="400px">
            Je suis là pour vous accompagner tout au long de votre saisie et répondre à vos questions sur le calculateur.
          </Text>
        </Box>

        {/* ── Body ── */}
        <ModalBody px={7} py={6} bg="white">
          <Text fontSize="xs" fontWeight="700" color="#6B7A72" textTransform="uppercase"
            letterSpacing="wider" mb={4}>
            Ce que je peux faire pour vous
          </Text>

          <VStack spacing={3} align="stretch" mb={6}>
            {CAPABILITIES.map((c, i) => (
              <HStack key={i} spacing={4} align="flex-start"
                p={4} bg="#F5F6F4" borderRadius="14px"
                border="1px solid #E4E6E1"
                _hover={{ borderColor: '#DDE5E0', bg: '#F0F3F1' }}
                transition="all 0.2s">
                <Box w="36px" h="36px" borderRadius="10px" bg="#DDE5E0"
                  display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                  <Icon as={c.icon} color="#344E41" boxSize={4} />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="700" color="#1E2D26" mb={0.5}>{c.title}</Text>
                  <Text fontSize="xs" color="#6B7A72" lineHeight="1.6">{c.body}</Text>
                </Box>
              </HStack>
            ))}
          </VStack>

          {/* Tip */}
          <Box p={3} bg="#F5F6F4" borderRadius="12px" border="1px solid #E4E6E1" mb={5}>
            <HStack spacing={2}>
              <Text fontSize="sm">💬</Text>
              <Text fontSize="xs" color="#6B7A72" lineHeight="1.6">
                Retrouvez l&apos;assistant en bas à droite de l&apos;écran à tout moment.
                Il connaît la page sur laquelle vous êtes et adapte ses réponses en conséquence.
              </Text>
            </HStack>
          </Box>

          <Button
            w="full" h="46px" borderRadius="full"
            bg="#344E41" color="white" fontWeight="700" fontSize="sm"
            rightIcon={<Icon as={FiArrowRight} />}
            _hover={{ bg: '#588157', transform: 'translateY(-1px)', boxShadow: '0 8px 24px rgba(52,78,65,0.3)' }}
            transition="all 0.2s"
            onClick={handleClose}
          >
            Commencer la saisie
          </Button>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

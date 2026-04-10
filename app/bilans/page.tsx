'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Button, Flex, Grid, Heading, HStack, Icon, Input,
  Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay,
  Spinner, Text, useDisclosure, useToast, VStack, Badge,
} from '@chakra-ui/react';
import { supabase } from '../../lib/supabaseClient';
import { FiPlus, FiCalendar, FiArrowRight, FiClock, FiCheckCircle, FiFileText } from 'react-icons/fi';

const GREEN  = '#344E41';
const GREEN2 = '#588157';
const BG     = '#F5F6F5';
const BORDER = '#E4E4E4';
const MUTED  = '#8F8F8F';
const TEXT   = '#404040';

type Bilan = {
  id: string;
  name: string;
  period_start: string | null;
  period_end: string | null;
  status: string;
  reporting_year: number | null;
  created_at: string;
  locked: boolean;
};

export default function BilansPage() {
  const router = useRouter();
  const toast  = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [userId, setUserId]   = useState<string | null>(null);
  const [bilans, setBilans]   = useState<Bilan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // New bilan form state
  const [newName, setNewName]               = useState('');
  const [newPeriodStart, setNewPeriodStart] = useState('');
  const [newPeriodEnd, setNewPeriodEnd]     = useState('');
  const [newYear, setNewYear]               = useState(String(new Date().getFullYear()));

  // Load user + bilans
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);

      const res  = await fetch(`/api/bilans?user_id=${user.id}`);
      const json = await res.json();
      if (res.ok) setBilans(json.bilans ?? []);
      setLoading(false);
    })();
  }, [router]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({ title: 'Nom requis', status: 'warning', duration: 2000, isClosable: true, position: 'top' });
      return;
    }
    setCreating(true);
    const res = await fetch('/api/bilans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        name: newName,
        period_start: newPeriodStart || null,
        period_end: newPeriodEnd || null,
        reporting_year: newYear ? Number(newYear) : null,
      }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) {
      toast({ title: 'Erreur', description: json.error, status: 'error', duration: 3000, isClosable: true, position: 'top' });
      return;
    }
    router.push(`/chart?bilan_id=${json.bilan.id}`);
  };

  const openBilan = (bilan: Bilan) => {
    router.push(`/chart?bilan_id=${bilan.id}`);
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCreated = (d: string) => {
    return new Date(d).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <Flex minH="100vh" bg={BG} align="center" justify="center">
        <VStack spacing={4}>
          <Spinner color={GREEN} size="xl" thickness="4px" />
          <Text color={MUTED} fontSize="sm" fontFamily="Montserrat">Chargement de vos bilans…</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box minH="100vh" bg={BG} px={{ base: 4, md: 8 }} py={{ base: 8, md: 12 }}>
      <Box maxW="900px" mx="auto">

        {/* Header */}
        <VStack spacing={2} mb={10} textAlign="center">
          <HStack spacing={3} justify="center">
            <Box w="40px" h="40px" bg={GREEN} rounded="xl" display="flex" alignItems="center" justifyContent="center">
              <Icon as={FiFileText} color="white" boxSize={5} />
            </Box>
            <Heading fontFamily="Inter" fontWeight={800} fontSize={{ base: '2xl', md: '3xl' }} color={TEXT}>
              Mes bilans GES
            </Heading>
          </HStack>
          <Text color={MUTED} fontSize="sm" fontFamily="Montserrat" maxW="480px">
            Créez un nouveau bilan pour une nouvelle période, ou reprenez un bilan existant.
          </Text>
        </VStack>

        {/* New bilan CTA */}
        <Box
          bg="white"
          border="2px dashed"
          borderColor={GREEN}
          rounded="2xl"
          p={8}
          mb={8}
          textAlign="center"
          cursor="pointer"
          onClick={onOpen}
          _hover={{ bg: '#F0F4F1', borderColor: GREEN2 }}
          transition="all 0.2s"
        >
          <VStack spacing={3}>
            <Box
              w="52px" h="52px" bg={GREEN} rounded="full"
              display="flex" alignItems="center" justifyContent="center"
              boxShadow="0 4px 14px rgba(52,78,65,0.3)"
            >
              <Icon as={FiPlus} color="white" boxSize={6} />
            </Box>
            <Heading fontFamily="Inter" fontWeight={700} fontSize="lg" color={GREEN}>
              Créer un nouveau bilan
            </Heading>
            <Text fontSize="sm" color={MUTED} fontFamily="Montserrat">
              Démarrez un bilan pour une nouvelle année ou période de référence
            </Text>
          </VStack>
        </Box>

        {/* Previous bilans */}
        {bilans.length > 0 && (
          <Box>
            <Text fontFamily="Montserrat" fontWeight={700} fontSize="xs" color={MUTED}
              textTransform="uppercase" letterSpacing="wider" mb={4}>
              Bilans précédents ({bilans.length})
            </Text>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
              {bilans.map((bilan) => (
                <Box
                  key={bilan.id}
                  bg="white"
                  rounded="xl"
                  border="1.5px solid"
                  borderColor={BORDER}
                  p={5}
                  cursor="pointer"
                  onClick={() => openBilan(bilan)}
                  _hover={{ borderColor: GREEN, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  transition="all 0.2s"
                  position="relative"
                  overflow="hidden"
                >
                  {/* Status indicator stripe */}
                  <Box
                    position="absolute" top={0} left={0}
                    w="4px" h="100%"
                    bg={bilan.status === 'complété' || bilan.locked ? GREEN : GREEN2}
                    rounded="full"
                  />

                  <Box pl={3}>
                    <HStack justify="space-between" mb={2} flexWrap="wrap" gap={2}>
                      <Text fontFamily="Inter" fontWeight={700} fontSize="md" color={TEXT} noOfLines={1}>
                        {bilan.name}
                      </Text>
                      <Badge
                        colorScheme={bilan.status === 'complété' || bilan.locked ? 'green' : 'orange'}
                        rounded="full" px={3} py={0.5} fontSize="10px" fontWeight={600}
                      >
                        {bilan.locked ? 'Verrouillé' : bilan.status === 'complété' ? 'Complété' : 'En cours'}
                      </Badge>
                    </HStack>

                    <VStack align="flex-start" spacing={1} mb={4}>
                      {(bilan.period_start || bilan.period_end) && (
                        <HStack spacing={1.5}>
                          <Icon as={FiCalendar} color={MUTED} boxSize={3.5} />
                          <Text fontSize="12px" color={MUTED} fontFamily="Montserrat">
                            {formatDate(bilan.period_start)} → {formatDate(bilan.period_end)}
                          </Text>
                        </HStack>
                      )}
                      {bilan.reporting_year && (
                        <HStack spacing={1.5}>
                          <Icon as={FiClock} color={MUTED} boxSize={3.5} />
                          <Text fontSize="12px" color={MUTED} fontFamily="Montserrat">
                            Année de référence : {bilan.reporting_year}
                          </Text>
                        </HStack>
                      )}
                      <HStack spacing={1.5}>
                        <Icon as={FiCheckCircle} color={MUTED} boxSize={3.5} />
                        <Text fontSize="12px" color={MUTED} fontFamily="Montserrat">
                          Créé le {formatCreated(bilan.created_at)}
                        </Text>
                      </HStack>
                    </VStack>

                    <HStack justify="flex-end">
                      <Button
                        size="sm"
                        bg={GREEN}
                        color="white"
                        rounded="full"
                        px={5}
                        fontSize="12px"
                        fontWeight={600}
                        fontFamily="Inter"
                        rightIcon={<Icon as={FiArrowRight} boxSize={3.5} />}
                        _hover={{ bg: GREEN2 }}
                        onClick={(e) => { e.stopPropagation(); openBilan(bilan); }}
                      >
                        {bilan.locked ? 'Consulter' : 'Continuer'}
                      </Button>
                    </HStack>
                  </Box>
                </Box>
              ))}
            </Grid>
          </Box>
        )}

        {bilans.length === 0 && (
          <Box textAlign="center" py={8}>
            <Text color={MUTED} fontSize="sm" fontFamily="Montserrat">
              Aucun bilan existant. Créez votre premier bilan ci-dessus.
            </Text>
          </Box>
        )}
      </Box>

      {/* Create bilan modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent rounded="2xl" p={2}>
          <ModalHeader fontFamily="Inter" fontWeight={700} color={TEXT} fontSize="lg">
            Nouveau bilan GES
          </ModalHeader>
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Box>
                <Text mb={1.5} fontSize="12px" color={MUTED} fontWeight={600} fontFamily="Montserrat">
                  Nom du bilan *
                </Text>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ex. Bilan GES 2024"
                  rounded="lg"
                  borderColor={BORDER}
                  fontFamily="Montserrat"
                  fontSize="14px"
                  _focus={{ borderColor: GREEN, boxShadow: `0 0 0 1px ${GREEN}` }}
                />
              </Box>

              <Grid templateColumns="1fr 1fr" gap={3}>
                <Box>
                  <Text mb={1.5} fontSize="12px" color={MUTED} fontWeight={600} fontFamily="Montserrat">
                    Début de période
                  </Text>
                  <Input
                    type="date"
                    value={newPeriodStart}
                    onChange={(e) => setNewPeriodStart(e.target.value)}
                    rounded="lg"
                    borderColor={BORDER}
                    fontFamily="Montserrat"
                    fontSize="13px"
                    _focus={{ borderColor: GREEN, boxShadow: `0 0 0 1px ${GREEN}` }}
                  />
                </Box>
                <Box>
                  <Text mb={1.5} fontSize="12px" color={MUTED} fontWeight={600} fontFamily="Montserrat">
                    Fin de période
                  </Text>
                  <Input
                    type="date"
                    value={newPeriodEnd}
                    onChange={(e) => setNewPeriodEnd(e.target.value)}
                    rounded="lg"
                    borderColor={BORDER}
                    fontFamily="Montserrat"
                    fontSize="13px"
                    _focus={{ borderColor: GREEN, boxShadow: `0 0 0 1px ${GREEN}` }}
                  />
                </Box>
              </Grid>

              <Box>
                <Text mb={1.5} fontSize="12px" color={MUTED} fontWeight={600} fontFamily="Montserrat">
                  Année de référence
                </Text>
                <Input
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  placeholder="2024"
                  rounded="lg"
                  borderColor={BORDER}
                  fontFamily="Montserrat"
                  fontSize="14px"
                  _focus={{ borderColor: GREEN, boxShadow: `0 0 0 1px ${GREEN}` }}
                />
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter gap={3}>
            <Button
              variant="ghost"
              onClick={onClose}
              rounded="full"
              fontFamily="Inter"
              fontSize="13px"
              color={MUTED}
            >
              Annuler
            </Button>
            <Button
              bg={GREEN}
              color="white"
              rounded="full"
              px={8}
              fontFamily="Inter"
              fontWeight={700}
              fontSize="13px"
              _hover={{ bg: GREEN2 }}
              onClick={handleCreate}
              isLoading={creating}
              loadingText="Création…"
            >
              Créer et démarrer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

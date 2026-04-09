'use client';

import { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  Box,
  HStack,
  VStack,
  Spinner,
  Badge,
} from '@chakra-ui/react';

type SourceInfo = {
  source_code: string;
  label: string;
  is_hidden: boolean;
  poste_label: string;
};

type Props = {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
};

const SOURCE_GUIDANCE: Record<string, string> = {
  '1A1': 'Combustion fixe — relevés de factures de gaz naturel, mazout, propane.',
  '1A2': 'Combustion mobile — kilométrage et carburant de la flotte de véhicules.',
  '1A3': 'Véhicules mobiles — données de consommation carburant.',
  '1B1': 'Émissions fugitives — quantités de réfrigérants rechargés/remplacés.',
  '2A1': 'Électricité — factures de consommation électrique (kWh).',
  '2A3': 'Énergie importée — chaleur et froid achetés.',
  '2B1': 'Autres énergies — données de consommation énergétique.',
  '3A1': 'Transport amont — données logistiques fournisseurs (km, mode).',
  '3B1': 'Transport aval — données logistiques clients (km, mode).',
  '3C1': "Navettage — sondage ou données d'accès des employés.",
  '4A1': "Achats de biens & services — données d'achats et consommables.",
  '4B1': "Immobilisations — données d'amortissement des actifs.",
  '4B2': 'Déchets — volumes et filières de traitement.',
  '6A1': "Déplacements d'affaires — billets d'avion, hôtels, voitures de location.",
  '6B1': 'Investissements — données financières liées aux actifs.',
};

export default function UserSourcesPopup({ userId, isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<SourceInfo[]>([]);

  useEffect(() => {
    if (!isOpen || !userId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/source-visibility?user_id=${userId}`);
        const data = await res.json();
        const flat: SourceInfo[] = [];
        Object.entries(data.sources || {}).forEach(([posteId, srcs]: any) => {
          const posteLabel = data.posteLabels?.[posteId] || '';
          const posteHidden = data.posteVisibility?.[posteId] || false;
          srcs.forEach((s: any) => {
            const srcHidden = data.sourceVisibility?.[posteId]?.[s.source_code] || false;
            flat.push({
              source_code: s.source_code,
              label: s.label,
              is_hidden: posteHidden || srcHidden,
              poste_label: posteLabel,
            });
          });
        });
        setSources(flat);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, userId]);

  const enabled = sources.filter(s => !s.is_hidden);
  const hidden = sources.filter(s => s.is_hidden);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered closeOnOverlayClick={false}>
      <ModalOverlay bg="rgba(0,0,0,0.55)" backdropFilter="blur(2px)" />
      <ModalContent borderRadius="18px" mx={4} boxShadow="0 24px 60px rgba(0,0,0,0.18)">
        <ModalHeader borderBottom="1px solid #E9E9E9" pb={3}>
          <Text fontSize="15px" fontWeight="700" color="#2B2B2B">
            Vos sources d'émissions actives
          </Text>
          <Text fontSize="12px" color="rgba(0,0,0,0.50)" fontWeight="400" mt={0.5}>
            Configurées par votre administrateur pour cette session
          </Text>
        </ModalHeader>

        <ModalBody py={5} maxH="60vh" overflowY="auto">
          {loading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <Spinner color="#2F4A3A" />
            </Box>
          ) : (
            <VStack align="stretch" spacing={4}>
              {enabled.length > 0 && (
                <Box>
                  <Text fontSize="12px" fontWeight="700" color="#2F4A3A" mb={2}>
                    Sources actives — données à saisir :
                  </Text>
                  <VStack align="stretch" spacing={2}>
                    {enabled.map(s => (
                      <HStack key={s.source_code} spacing={3} bg="#F3F9F5" p={2.5} rounded="10px" border="1px solid #D4EBD8">
                        <Badge
                          bg="#264a3b"
                          color="white"
                          fontSize="10px"
                          px={2}
                          py={0.5}
                          borderRadius="6px"
                          flexShrink={0}
                        >
                          {s.source_code}
                        </Badge>
                        <Box flex="1">
                          <Text fontSize="12px" fontWeight="600" color="#213A2E">{s.label}</Text>
                          <Text fontSize="11px" color="rgba(0,0,0,0.55)" lineHeight="1.4">
                            {SOURCE_GUIDANCE[s.source_code] ||
                              `Saisir les données pour ce poste (${s.poste_label}).`}
                          </Text>
                        </Box>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}

              {hidden.length > 0 && (
                <Box>
                  <Text fontSize="12px" fontWeight="600" color="rgba(0,0,0,0.40)" mb={2}>
                    Sources désactivées pour votre compte :
                  </Text>
                  <VStack align="stretch" spacing={1}>
                    {hidden.map(s => (
                      <HStack key={s.source_code} spacing={3} bg="#F8F8F8" p={2} rounded="8px" opacity={0.55}>
                        <Badge colorScheme="gray" fontSize="10px" px={2} py={0.5} borderRadius="6px" flexShrink={0}>
                          {s.source_code}
                        </Badge>
                        <Text fontSize="11px" color="rgba(0,0,0,0.45)">{s.label}</Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}

              {sources.length === 0 && (
                <Text fontSize="12px" color="rgba(0,0,0,0.50)" textAlign="center" py={6}>
                  Aucune source configurée. Contactez votre administrateur.
                </Text>
              )}
            </VStack>
          )}
        </ModalBody>

        <ModalFooter borderTop="1px solid #E9E9E9" pt={3}>
          <Button
            bg="#2F4A3A"
            color="white"
            _hover={{ bg: '#253B2E' }}
            borderRadius="999px"
            h="34px"
            px={8}
            fontSize="12px"
            fontWeight="700"
            onClick={onClose}
          >
            Commencer la saisie
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

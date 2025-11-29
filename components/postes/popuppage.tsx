'use client';

import React from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  StackDivider,
} from "@chakra-ui/react";

const COL = {
  textBody: "#213A2E",
  textMuted: "#51645B",
  surface: "#FFFFFF",
  surfaceMuted: "#EAF1EC",
  border: "#E1E7E3",
  pill: "#264a3b",
};

type Notification = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  type: "poste" | "rapport" | "system" | "bilan";
  read?: boolean;
};

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Poste 2 – Données incomplètes",
    description:
      "Certains véhicules n’ont pas de kilométrage pour la période sélectionnée.",
    createdAt: "2025-11-10 14:32",
    type: "poste",
  },
  {
    id: "2",
    title: "Nouveau rapport disponible",
    description:
      "Le bilan GES 2023 a été généré et est prêt à être téléchargé.",
    createdAt: "2025-11-09 09:10",
    type: "rapport",
  },
  {
    id: "3",
    title: "Mise à jour des facteurs d’émission",
    description:
      "Les facteurs d’émission électricité (Québec, Canada) ont été mis à jour selon les dernières publications.",
    createdAt: "2025-11-08 17:48",
    type: "system",
  },
];

function typeToLabel(t: Notification["type"]) {
  switch (t) {
    case "poste":
      return "Postes";
    case "rapport":
      return "Rapport";
    case "bilan":
      return "Bilan";
    case "system":
    default:
      return "Système";
  }
}

export default function NotificationsPage() {
  return (
    <Box
      bg="transparent"
      w="100%"
      maxW="900px"
      mx="auto"
    >
      <VStack align="stretch" spacing={6}>
        {/* Header */}
        <Box>
          <Heading as="h1" size="lg" color={COL.textBody} mb={2}>
            Notifications
          </Heading>
          <Text fontSize="sm" color={COL.textMuted}>
            Restez au courant des mises à jour importantes liées à vos postes,
            rapports et facteurs d’émission.
          </Text>
        </Box>

        {/* Summary card */}
        <Box
          bg={COL.surfaceMuted}
          border="1px solid"
          borderColor={COL.border}
          rounded="2xl"
          p={5}
        >
          <HStack justify="space-between" align="center">
            <Box>
              <Text fontSize="sm" color={COL.textMuted}>
                Notifications non lues
              </Text>
              <Heading as="p" size="md" color={COL.textBody}>
                {MOCK_NOTIFICATIONS.length}
              </Heading>
            </Box>
            <Badge
              variant="subtle"
              bg={COL.pill}
              color="white"
              px={4}
              py={1}
              rounded="full"
              fontSize="xs"
            >
              Centre de notifications
            </Badge>
          </HStack>
        </Box>

        {/* List */}
        <Box
          bg={COL.surface}
          border="1px solid"
          borderColor={COL.border}
          rounded="2xl"
          p={5}
        >
          <VStack
            align="stretch"
            spacing={4}
            divider={<StackDivider borderColor={COL.border} />}
          >
            {MOCK_NOTIFICATIONS.map((n) => (
              <Box key={n.id}>
                <HStack justify="space-between" align="flex-start" mb={1}>
                  <Heading as="h2" size="sm" color={COL.textBody}>
                    {n.title}
                  </Heading>
                  <Badge
                    rounded="full"
                    px={3}
                    py={0.5}
                    fontSize="10px"
                    bg={COL.surfaceMuted}
                    color={COL.textMuted}
                  >
                    {typeToLabel(n.type)}
                  </Badge>
                </HStack>
                <Text fontSize="sm" color={COL.textMuted} mb={1.5}>
                  {n.description}
                </Text>
                <Text fontSize="xs" color="#9CA3AF">
                  {n.createdAt}
                </Text>
              </Box>
            ))}

            {MOCK_NOTIFICATIONS.length === 0 && (
              <Text fontSize="sm" color={COL.textMuted}>
                Aucune notification pour le moment.
              </Text>
            )}
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}

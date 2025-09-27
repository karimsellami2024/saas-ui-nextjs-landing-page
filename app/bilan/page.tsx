"use client";

import React from "react";
import {
  Box,
  Flex,
  Grid,
  GridItem,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  SimpleGrid,
  Divider,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  useColorModeValue,
  Icon,
  Avatar,
} from "@chakra-ui/react";

// Left nav icons (same set you used before)
import {
  FiGrid,
  FiBatteryCharging,
  FiCode,
  FiFileText,
  FiBarChart2,
  FiHelpCircle,
} from "react-icons/fi";

// Content/tiles icons
import {
  CheckCircle,
  PieChart,
  BarChart3,
  FileText as FileTextIcon,
} from "lucide-react";

/** Design tokens */
const COLORS = {
  ink: "#404040",
  primary: "#344E41",
  subtle: "#8F8F8F",
  surface: "#FFFFFF",
  surfaceMuted: "#F5F6F5",
  accent: "#DAD7CD",
};

type ScopeSlice = { label: string; value: number };

const SCOPE_DIRECT: ScopeSlice[] = [
  { label: "Combustions fixes", value: 18 },
  { label: "Réfrigérants", value: 12 },
  { label: "Combustions mobiles", value: 14 },
  { label: "Sols et forêts", value: 3 },
  { label: "Déchets", value: 4 },
  { label: "Biens immobiliers", value: 5 },
  { label: "Autres émissions indirectes", value: 7 },
  { label: "Autres", value: 5 },
];

const SCOPE_PIE = [
  { label: "Émissions directes", value: 62 },
  { label: "Énergie", value: 26 },
  { label: "Indirectes", value: 12 },
];

function ScopeBar({ label, value }: ScopeSlice) {
  const barBg = useColorModeValue(COLORS.surfaceMuted, "gray.700");
  return (
    <VStack align="stretch" spacing={1}>
      <HStack justify="space-between" fontSize="sm">
        <Text color={COLORS.ink}>{label}</Text>
        <Text fontWeight="semibold" color={COLORS.ink}>
          {value} %
        </Text>
      </HStack>
      <Box bg={barBg} rounded="full" h="8px" overflow="hidden">
        <Box bg={COLORS.primary} h="100%" w={`${value}%`} />
      </Box>
    </VStack>
  );
}

function PieLegend() {
  return (
    <VStack spacing={3} align="stretch">
      {SCOPE_PIE.map((s, i) => (
        <HStack key={i} justify="space-between">
          <HStack>
            <Box
              w="10px"
              h="10px"
              rounded="full"
              bg={i === 0 ? COLORS.primary : i === 1 ? COLORS.ink : COLORS.accent}
            />
            <Text color={COLORS.ink} fontSize="sm">
              {s.label}
            </Text>
          </HStack>
          <Text color={COLORS.ink} fontWeight="semibold" fontSize="sm">
            {s.value} %
          </Text>
        </HStack>
      ))}
      <Box mt={2} mx="auto" position="relative">
        {/* donut rings (visual approximation) */}
        <Box
          w="140px"
          h="140px"
          rounded="full"
          border="12px solid"
          borderColor={COLORS.primary}
          position="relative"
        />
        <Box
          w="140px"
          h="140px"
          rounded="full"
          border="12px solid"
          borderColor={COLORS.ink}
          position="absolute"
          top={0}
          left={0}
          transform="rotate(220deg)"
          clipPath="inset(0 50% 0 0)"
        />
        <Box
          w="140px"
          h="140px"
          rounded="full"
          border="12px solid"
          borderColor={COLORS.accent}
          position="absolute"
          top={0}
          left={0}
          transform="rotate(290deg)"
          clipPath="inset(0 75% 0 0)"
        />
        <InnerDonutLabel />
      </Box>
    </VStack>
  );
}

function InnerDonutLabel() {
  const bg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("#E2E8F0", "#2D3748");
  return (
    <Box
      position="absolute"
      top="50%"
      left="50%"
      transform="translate(-50%, -50%)"
      bg={bg}
      rounded="full"
      w="80px"
      h="80px"
      border={`1px solid ${border}`}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Text fontWeight="bold" color={COLORS.ink}>
        60%
      </Text>
    </Box>
  );
}

export default function ClientBilanPage() {
  const cardBg = useColorModeValue(COLORS.surface, "gray.800");
  const mutedBg = useColorModeValue(COLORS.surfaceMuted, "gray.700");
  const borderCol = useColorModeValue("gray.200", "gray.700");

  return (
    <Flex minH="100dvh" bg={useColorModeValue("white", "gray.900")}>
      {/* ==== Left navbar (unchanged structure) ==== */}
      <Box
        as="nav"
        position="sticky"
        top={0}
        h="100vh"
        w={{ base: "72px", md: "142px" }}
        boxShadow="0px 4px 6px 4px rgba(0,0,0,0.25)"
        bg="#FFFFFF"
      >
        <Flex direction="column" h="full" align="center" pt={8} pb={6}>
          {/* Profile */}
          <VStack spacing={3} mb={8}>
            <Avatar name="Carbone Québec" src="/avatar.png" size="lg" />
            <Text fontSize="sm" color="#8F8F8F" textAlign="center">
              Oct 2023 — Août 2024
            </Text>
          </VStack>

          {/* Primary */}
          <VStack spacing={4} w="full" px={4} mb={6}>
            <SidebarBlock>
              <SidebarItem icon={FiGrid} label="Tableau de bord" />
            </SidebarBlock>

            <SidebarBlock>
              <SidebarMini icon={FiBarChart2} label="Directe" />
              <SidebarMini icon={FiBatteryCharging} label="Énergie" />
              <SidebarMini icon={FiCode} label="Indirecte" />
            </SidebarBlock>

            <SidebarBlock>
              <SidebarMini icon={FiBarChart2} label="Bilan" active />
              <SidebarMini icon={FiFileText} label="Rapport" />
            </SidebarBlock>
          </VStack>

          <Box mt="auto" />

          {/* Help button area (bottom) */}
          <VStack spacing={3}>
            <Icon as={FiHelpCircle} boxSize={7} color="#344E41" />
            <Box h="4" />
          </VStack>
        </Flex>
      </Box>

      {/* ==== Main content ==== */}
      <Box flex="1" p={{ base: 4, md: 8 }}>
        {/* Top heading */}
        <HStack justify="space-between" mb={6}>
          <Heading size="lg" color={COLORS.ink}>
            Bilan
          </Heading>
          <Button
            variant="solid"
            colorScheme="green"
            leftIcon={<Icon as={CheckCircle} />}
          >
            Auditer votre bilan
          </Button>
        </HStack>
        {/* Bottom quick tiles */}
{/* Bottom quick tiles */}
<HStack mt={6} spacing={4}>
  {[
    { title: "Résumé du bilan", active: true },
    { title: "Bilan GES" },
    { title: "Bilan énergétique" },
    { title: "Votre progression" },
  ].map((tab) => (
    <Box
      key={tab.title}
      as="button"
      px={4}
      h="32px"
      rounded="16px"
      border="1px solid"
      borderColor={tab.active ? COLORS.primary : "#DAD7CD"}
      bg={tab.active ? COLORS.primary : "white"}
      color={tab.active ? "white" : COLORS.subtle}
      fontWeight={tab.active ? "bold" : "normal"}
      fontSize="sm"
      display="flex"
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      _hover={
        !tab.active
          ? { borderColor: COLORS.primary, color: COLORS.ink }
          : {}
      }
    >
      {tab.title}
    </Box>
  ))}
</HStack>


        <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6}>
          {/* Hero / Résumé */}
          <GridItem>
            <Box bg={mutedBg} rounded="2xl" p={{ base: 5, md: 8 }}>
              <Heading size="md" color={COLORS.ink} mb={1}>
                Voici le résumé de votre bilan
              </Heading>
              <Text color={COLORS.subtle} mb={6}>
                Félicitations ! Vous avez réduit vos émissions de 5 % par
                rapport à l’an dernier. C’est l’équivalent à 200 vols
                Montréal–Toronto évités.
              </Text>

              <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4}>
                {["41,010 t de CO²eq", "41,010 t de CO²eq", "41,010 t de CO²eq"].map(
                  (v, i) => (
                    <Stat
                      key={i}
                      bg={cardBg}
                      rounded="xl"
                      p={4}
                      border="1px solid"
                      borderColor={borderCol}
                      boxShadow="sm"
                    >
                      <StatLabel color={COLORS.subtle} fontWeight="600">
                        {i === 0
                          ? "Total GES"
                          : i === 1
                          ? "Scope énergie"
                          : "Scope indirect"}
                      </StatLabel>
                      <StatNumber color={COLORS.ink} fontSize="xl">
                        {v}
                      </StatNumber>
                      <StatHelpText color={COLORS.subtle}>
                        Période: Oct 2023 – Sept 2024
                      </StatHelpText>
                    </Stat>
                  )
                )}
              </SimpleGrid>
            </Box>
          </GridItem>

          {/* “Le saviez-vous ?” + donut */}
          <GridItem>
            <VStack spacing={6} align="stretch">
              <Box
                bg={cardBg}
                rounded="2xl"
                p={6}
                border="1px solid"
                borderColor={borderCol}
                boxShadow="sm"
              >
                <Heading size="sm" color={COLORS.ink} mb={2}>
                  Le saviez-vous ?
                </Heading>
                <Text color={COLORS.ink} mb={4}>
                  des affirmations écologiques des plus grandes entreprises
                  mondiales sont trompeuses ou infondées.
                </Text>
                <HStack spacing={4} align="flex-start">
                  <PieLegend />
                  <VStack align="stretch" spacing={3} flex="1">
                    <Badge colorScheme="green" alignSelf="start">
                      60 %
                    </Badge>
                    <Text fontSize="sm" color={COLORS.subtle}>
                      Part estimée de vos émissions directement produites par
                      l’entreprise.
                    </Text>
                  </VStack>
                </HStack>
              </Box>

              {/* Progress / Objectif */}
              <Box
                bg={cardBg}
                rounded="2xl"
                p={6}
                border="1px solid"
                borderColor={borderCol}
                boxShadow="sm"
              >
                <Heading size="sm" color={COLORS.ink} mb={2}>
                  Encore quelques pas pour atteindre votre objectif
                </Heading>
                <Text color={COLORS.subtle} mb={3}>
                  Vous êtes à <b>75 %</b> de votre objectif
                </Text>
                <Progress value={75} size="lg" rounded="full" colorScheme="green" />
                <Button mt={4} variant="outline" colorScheme="green">
                  Compenser mes émissions restantes
                </Button>
              </Box>
            </VStack>
          </GridItem>
        </Grid>

        {/* Scopes breakdown (bars) */}
        <Box
          mt={6}
          bg={cardBg}
          rounded="2xl"
          p={{ base: 5, md: 6 }}
          border="1px solid"
          borderColor={borderCol}
          boxShadow="sm"
        >
          <Heading size="sm" color={COLORS.ink} mb={4}>
            Comprendre les scopes d’émissions
          </Heading>
          <Text color={COLORS.subtle} mb={6} fontSize="sm">
            Les émissions de gaz à effet de serre sont classées en trois
            catégories (scopes). Cela permet de mieux identifier l’origine des
            émissions et d’orienter les actions de réduction.
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
            <VStack align="stretch" spacing={4}>
              <Heading size="xs" color={COLORS.ink}>
                Émissions directement produites par l’entreprise (Scope 1)
              </Heading>
              <VStack align="stretch" spacing={3}>
                {SCOPE_DIRECT.map((s) => (
                  <ScopeBar key={s.label} {...s} />
                ))}
              </VStack>
            </VStack>
            <VStack align="stretch" spacing={4}>
              
            </VStack>
          </SimpleGrid>
        </Box>

        
      </Box>
    </Flex>
  );
}

/* ===== Sidebar helpers (same look & feel) ===== */
function SidebarBlock({ children }: { children: React.ReactNode }) {
  return (
    <Box bg="#F5F6F5" borderRadius="16px" p={3} w="full">
      <VStack spacing={4} w="full">
        {children}
      </VStack>
    </Box>
  );
}

function SidebarItem({
  icon,
  label,
  active,
}: {
  icon: any;
  label: string;
  active?: boolean;
}) {
  return (
    <VStack
      spacing={2}
      py={3}
      borderRadius="12px"
      w="full"
      bg={active ? "#EDEDED" : "transparent"}
      color={active ? "#344E41" : "#404040"}
      cursor="pointer"
    >
      <Icon as={icon} boxSize={6} />
      <Text fontWeight="600" fontSize="sm" textAlign="center">
        {label}
      </Text>
      <Divider borderColor={active ? "#344E41" : "#F5F6F5"} w="50%" />
    </VStack>
  );
}

function SidebarMini({
  icon,
  label,
  active,
}: {
  icon: any;
  label: string;
  active?: boolean;
}) {
  return (
    <VStack spacing={2} py={2} w="full" cursor="pointer">
      <Icon as={icon} boxSize={6} color={active ? "#344E41" : "#8F8F8F"} />
      <Text fontSize="sm" color={active ? "#344E41" : "#8F8F8F"} textAlign="center">
        {label}
      </Text>
      <Divider borderColor="#F5F6F5" w="50%" />
    </VStack>
  );
}

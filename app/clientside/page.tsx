"use client";

import React from "react";
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Heading,
  Divider,
  Avatar,
  Icon,
  Button,
  Grid,
  GridItem,
  Image,
} from "@chakra-ui/react";
import {
  FiGrid,
  FiBatteryCharging,
  FiCode,
  FiFileText,
  FiBarChart2,
  FiHelpCircle,
} from "react-icons/fi";

export default function ClientPage() {
  return (
    <Flex minH="100vh" bg="#fff">
      {/* Sidebar */}
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
              <SidebarItem icon={FiGrid} label="Tableau de bord" active />
            </SidebarBlock>

            <SidebarBlock>
              <SidebarMini icon={FiBarChart2} label="Directe" />
              <SidebarMini icon={FiBatteryCharging} label="Énergie" />
              <SidebarMini icon={FiCode} label="Indirecte" />
            </SidebarBlock>

            <SidebarBlock>
              <SidebarMini icon={FiBarChart2} label="Bilan" />
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

      {/* Main */}
      <Box flex="1" px={{ base: 4, md: 8 }} py={{ base: 4, md: 6 }}>
        {/* Top bar */}
        <HStack justify="space-between" align="center" mb={6} spacing={4} wrap="wrap">
          <Heading fontSize="32px" color="#404040" mb={{ base: 2, md: 0 }}>
            Tableau de bord
          </Heading>

          <HStack spacing={3}>
            <Button
              bg="#344E41"
              color="#fff"
              _hover={{ bg: "#2d4438" }}
              borderRadius="16px"
              px={5}
              h="40px"
            >
              Ajouter un équipement
            </Button>
            <Icon as={FiHelpCircle} boxSize={7} color="#344E41" />
          </HStack>
        </HStack>

        {/* Welcome band */}
        <Box
          bg="#F5F6F5"
          borderRadius="16px"
          p={{ base: 4, md: 6 }}
          mb={8}
          border="1px solid #F0F0F0"
        >
          <Text fontWeight="bold" fontSize="32px" color="#404040" mb={2}>
            Rebienvenue Carbone Québec !
          </Text>
          <Text color="#8F8F8F" mb={4}>
            Prêt à passer à l’action ? Commencer dès maintenant !
          </Text>
          <Button variant="outline" borderRadius="16px" borderColor="#404040" color="#404040">
            Ajouter un équipement
          </Button>
        </Box>

        {/* Grid layout: left (2 cols) + right (1 col) */}
        <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6}>
          {/* Left column: three feature cards stacked */}
          <VStack align="stretch" spacing={6}>
            <FeatureCard
              title="Plan de décarbonation"
              subtitle="Définissez vos objectifs et suivez vos réductions d’émissions."
              cta="Configurer"
            />
            <FeatureCard
              title="Conformité carbone"
              subtitle="Mesurez l’impact carbone de chaque produit selon MACF/CBAM."
              cta="Commencer"
            />
            <FeatureCard
              title="Rapport de durabilité"
              subtitle="Générez votre rapport de durabilité, prêt à partager."
              cta="Générer"
            />
          </VStack>

          {/* Right column: two visuals + one action card */}
          <VStack align="stretch" spacing={6}>
            <HeroImageCard
              title="Soumissionnez auprès des grands donneurs d'ordres du Québec"
              caption="Testez la durabilité de votre organisation"
              src="/right-visual-1.jpg"
            />
            <HeroImageCard
              title="Passer à l’action !"
              caption="Découvrez comment passer à l’action dès maintenant"
              src="/right-visual-2.jpg"
            />
            <StatActionCard
              value="63 %"
              text="de vos émissions proviennent d’émissions directement produites par votre entreprise"
              cta="Ajouter un équipement"
            />
          </VStack>
        </Grid>
      </Box>
    </Flex>
  );
}

/* ======= Small pieces (keep simple, Chakra v2 friendly) ======= */

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

function SidebarMini({ icon, label }: { icon: any; label: string }) {
  return (
    <VStack spacing={2} py={2} w="full" cursor="pointer">
      <Icon as={icon} boxSize={6} color="#8F8F8F" />
      <Text fontSize="sm" color="#8F8F8F" textAlign="center">
        {label}
      </Text>
      <Divider borderColor="#F5F6F5" w="50%" />
    </VStack>
  );
}

function FeatureCard({
  title,
  subtitle,
  cta,
}: {
  title: string;
  subtitle: string;
  cta: string;
}) {
  return (
    <Box bg="#FFFFFF" borderRadius="16px" border="1px solid #EDEDED" overflow="hidden">
      <Box p={{ base: 4, md: 6 }}>
        <Text fontSize="24px" fontWeight="700" color="#404040" mb={2}>
          {title}
        </Text>
        <Text color="#404040" fontFamily="Montserrat" mb={4}>
          {subtitle}
        </Text>
        <Button variant="outline" borderRadius="16px" borderColor="#404040" color="#404040">
          {cta}
        </Button>
      </Box>
    </Box>
  );
}

function HeroImageCard({
  title,
  caption,
  src,
}: {
  title: string;
  caption: string;
  src: string;
}) {
  return (
    <Box bg="#FFFFFF" borderRadius="16px" overflow="hidden" border="1px solid #EDEDED">
      <Box position="relative">
        <Image src={src} alt={title} w="100%" h="260px" objectFit="cover" />
        <Box
          position="absolute"
          inset={0}
          bg="linear-gradient(180deg, rgba(0,0,0,0) 40.67%, rgba(0,0,0,0.75) 88.67%)"
        />
        <Box position="absolute" top="5%" left="5%" right="5%">
          <Text
            color="#FFFFFF"
            fontWeight="700"
            fontSize="20px"
            textAlign="center"
            textShadow="0 4px 20px #404040"
          >
            {title}
          </Text>
        </Box>
        <HStack position="absolute" bottom="16px" right="16px" spacing={2}>
          <Text
            color="#FFFFFF"
            fontFamily="Montserrat"
            fontSize="16px"
            textAlign="right"
            textShadow="0 4px 20px #404040"
          >
            {caption}
          </Text>
        </HStack>
      </Box>
    </Box>
  );
}

function StatActionCard({
  value,
  text,
  cta,
}: {
  value: string;
  text: string;
  cta: string;
}) {
  return (
    <Box
      bg="#F5F6F5"
      borderRadius="16px"
      p={{ base: 4, md: 6 }}
      border="1px solid #EDEDED"
      textAlign="center"
    >
      <Text fontSize="32px" fontWeight="700" color="#404040" mb={1}>
        {value}
      </Text>
      <Text color="#404040" fontFamily="Montserrat" maxW="340px" mx="auto" mb={4}>
        {text}
      </Text>
      <Button variant="outline" borderRadius="16px" borderColor="#404040" color="#404040">
        {cta}
      </Button>
    </Box>
  );
}

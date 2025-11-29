"use client";

import React from "react";
import {
  Box, Flex, VStack, HStack, Text, Heading, Button, Grid, Image, Stack, Icon,
} from "@chakra-ui/react";
import { FiFileText } from "react-icons/fi";

/* --- Design tokens --- */
const COL = {
  brand: "#344E41",
  brandSoft: "#DDE5E0",
  pageBg: "#F7F7F6",
  surface: "#FFFFFF",
  border: "#E6E6E3",
  text: "#2D2D2B",
  muted: "#8F8F8F",
  pill: "#F3F4F2",
  shadow: "0 4px 16px rgba(0,0,0,0.08)",
  radius: "20px",
};
export default function DashboardNoNav() {
  return (
    <Box minH="100vh" bg={COL.pageBg}>
      {/* FULL-WIDTH PAGE */}
      <Box w="100%" px={{ base: 4, md: 6 }} py={{ base: 5, md: 8 }}>
        
        {/* Row 1: Welcome + Promo */}
        <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6} mb={6}>

          {/* Welcome band */}
          <Box
            bg={COL.surface}
            border="1px solid"
            borderColor={COL.border}
            borderRadius={COL.radius}
            boxShadow={COL.shadow}
            p={{ base: 4, md: 6 }}
            overflow="hidden"
          >
            <Grid templateColumns={{ base: "1fr", md: "1.4fr 1fr" }} gap={2} alignItems="center">
              <Box>
                <Heading fontSize={{ base: "xl", md: "2xl" }} color={COL.text} mb={2}>
                  Bienvenue Carbone Québec !
                </Heading>

                <Text color={COL.muted} mb={4}>
                  Prêt à passer à l’action ? Commencer dès maintenant !
                </Text>

                <Button
                  variant="outline"
                  borderRadius="full"
                  px={5}
                  h="40px"
                  borderColor="#2E2E2E"
                  color={COL.text}
                >
                  Voir notre progression
                </Button>
              </Box>

              <Box>
                <Image
                  src="/img/illus-progress.png"
                  alt="Progress illustration"
                  w="100%"
                  h={{ base: "160px", md: "180px" }}
                  objectFit="contain"
                />
              </Box>
            </Grid>
          </Box>

          {/* Top-right Promo */}
          <PromoTile
            src="/img/forest.png"
            title="Soumissionnez auprès des grands donneurs d'ordres du Québec"
            subtitle="Testez la durabilité de votre organisation"
            logos={["/img/logos/rio.png", "/img/logos/hydro.png", "/img/logos/iq.png", "/img/logos/desj.png"]}
          />
        </Grid>

        {/* Section title */}
        <Text fontWeight="700" color={COL.text} fontSize="lg" mb={4}>
          Vos outils pour agir :
        </Text>

        {/* Row 2 */}
        <Grid templateColumns={{ base: "1fr", xl: "1.5fr 1fr 1fr" }} gap={6}>

          {/* Column 1 */}
          <VStack align="stretch" spacing={6}>
            <ToolCard
              illu="/img/illus-decarb.png"
              title="Plan de décarbonation"
              subtitle="Définissez vos objectifs et suivez vos réductions d’émissions."
              cta="Fixer mes objectifs"
            />
            <ToolCard
              illu="/img/illus-conformite.png"
              title="Conformité carbone"
              subtitle="Mesurez l’impact carbone de chaque produit selon MACF/CBAM."
              cta="Ajouter des produits"
            />
            <ToolCard
              illu="/img/illus-report.png"
              title="Rapport de durabilité"
              subtitle="Une fois vos données saisies, générez votre rapport de durabilité."
              cta="Générer le rapport"
            />
          </VStack>

          {/* Column 2 */}
          <VStack align="stretch" spacing={6}>
            <DonutStatCard
              valuePct={63}
              titleBtn="Consulter notre bilan"
              caption="de vos émissions proviennent d’émissions directement produites par votre entreprise"
            />
            <ActionPlanCard />
          </VStack>

          {/* Column 3 */}
          <VStack align="stretch" spacing={6}>
            <PromoTile
              src="/img/cta-action.png"
              title="Passer à l’action"
              subtitle="Découvrez comment passer à l’action dès maintenant"
            />
            <PromoTile
              src="/img/class.png"
              title="Apprenez avec nous !"
              subtitle="Consultez nos formations"
            />
          </VStack>

        </Grid>
      </Box>
    </Box>
  );
}

/* =============== Components =============== */

function ToolCard({
  illu, title, subtitle, cta,
}: { illu: string; title: string; subtitle: string; cta: string }) {
  return (
    <Box bg={COL.surface} border="1px solid" borderColor={COL.border} borderRadius={COL.radius} boxShadow={COL.shadow}>
      <Grid templateColumns={{ base: "1fr", md: "1fr 140px" }} alignItems="center">
        <Box p={{ base: 4, md: 5 }}>
          <Heading fontSize="lg" color={COL.text} mb={1}>{title}</Heading>
          <Text color={COL.muted} mb={4}>{subtitle}</Text>
          <Button variant="outline" borderRadius="full" px={5} h="40px" borderColor="#2E2E2E" color={COL.text}>
            {cta}
          </Button>
        </Box>
        <Box display={{ base: "none", md: "block" }} pr={4}>
          <Image src={illu} alt="" w="100%" h="120px" objectFit="contain" />
        </Box>
      </Grid>
    </Box>
  );
}

function PromoTile({
  src, title, subtitle, logos,
}: { src: string; title: string; subtitle: string; logos?: string[] }) {
  return (
    <Box borderRadius={COL.radius} overflow="hidden" position="relative" minH="260px" boxShadow={COL.shadow}>
      <Image src={src} alt={title} w="100%" h="100%" objectFit="cover" />
      <Box position="absolute" inset={0} bgGradient="linear(to-b, rgba(0,0,0,0.35), rgba(0,0,0,0.65))" />
      <Stack position="absolute" top="14px" left="14px" right="14px" spacing={2}>
        <Text color="white" fontWeight="700" fontSize="lg" lineHeight="short">{title}</Text>
        {logos && (
          <HStack spacing={5} flexWrap="wrap">
            {logos.map((l) => <Image key={l} src={l} alt="" h="18px" objectFit="contain" />)}
          </HStack>
        )}
      </Stack>
      <Stack position="absolute" bottom="14px" left="14px" right="14px">
        <HStack justify="space-between" align="center">
          <Text color="white">{subtitle}</Text>
          <Text color="white" fontWeight="700">›</Text>
        </HStack>
      </Stack>
    </Box>
  );
}

function DonutStatCard({
  valuePct, titleBtn, caption,
}: { valuePct: number; titleBtn: string; caption: string }) {
  const radius = 70, stroke = 18;
  const circumference = 2 * Math.PI * radius;
  const progress = (valuePct / 100) * circumference;

  return (
    <Box bg={COL.surface} border="1px solid" borderColor={COL.border} borderRadius={COL.radius} boxShadow={COL.shadow} p={5}>
      <Grid justifyItems="center" gap={4}>
        <Box position="relative" w="180px" h="180px">
          <svg width="180" height="180">
            <circle cx="90" cy="90" r={radius} fill="none" stroke={COL.brandSoft} strokeWidth={stroke} strokeLinecap="round" />
            <circle cx="90" cy="90" r={radius} fill="none" stroke={COL.brand} strokeWidth={stroke}
              strokeLinecap="round" strokeDasharray={`${progress} ${circumference - progress}`} transform="rotate(-90 90 90)" />
          </svg>
          <Flex position="absolute" inset={0} align="center" justify="center" direction="column">
            <Text fontSize="3xl" fontWeight="700" color={COL.text}>{valuePct} %</Text>
          </Flex>
        </Box>
        <Text color={COL.muted} textAlign="center" maxW="320px">{caption}</Text>
        <Button variant="outline" borderRadius="full" px={5} h="40px" borderColor="#2E2E2E" color={COL.text}>
          {titleBtn}
        </Button>
      </Grid>
    </Box>
  );
}

function ActionPlanCard() {
  return (
    <Box bg={COL.surface} border="1px solid" borderColor={COL.border} borderRadius={COL.radius} boxShadow={COL.shadow} p={5} textAlign="center">
      <Heading fontSize="xl" color={COL.text} mb={2}>Plan d’action</Heading>
      <Box mx="auto" my={2} w="64px" h="64px" borderRadius="full" bg={COL.pill} display="grid" placeItems="center">
        <Icon as={FiFileText} boxSize={7} color={COL.brand} />
      </Box>
      <Text color={COL.muted} mb={4}>Un plan d’action clair et des communications ciblées grâce à l’IA.</Text>
      <Button variant="outline" borderRadius="full" px={5} h="40px" borderColor="#2E2E2E" color={COL.text}>
        En apprendre plus
      </Button>
    </Box>
  );
}

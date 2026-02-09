"use client";

import React from "react";
import {
  Box, Flex, VStack, HStack, Text, Heading, Button, Grid, Image, Stack, Icon,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { FiFileText, FiTrendingUp, FiAward, FiTarget } from "react-icons/fi";

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
  shadowHover: "0 8px 24px rgba(0,0,0,0.12)",
  radius: "20px",
  accent: "#588157",
};

/* --- Animations --- */
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideInRight = keyframes`
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;

export default function DashboardEnhanced() {
  return (
    <Box minH="100vh" bg={COL.pageBg}>
      <Box w="100%" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 8 }}>
        
        {/* Row 1: Welcome + Promo */}
        <Grid 
          templateColumns={{ base: "1fr", lg: "2fr 1fr" }} 
          gap={6} 
          mb={8}
          animation={`${fadeInUp} 0.6s ease-out`}
        >
          {/* Welcome band */}
          <Box
            bg={COL.surface}
            border="1px solid"
            borderColor={COL.border}
            borderRadius={COL.radius}
            boxShadow={COL.shadow}
            p={{ base: 5, md: 7 }}
            overflow="hidden"
            position="relative"
            transition="all 0.3s ease"
            _hover={{
              boxShadow: COL.shadowHover,
              transform: "translateY(-4px)",
            }}
          >
            {/* Decorative gradient blob */}
            <Box
              position="absolute"
              top="-50px"
              right="-50px"
              w="200px"
              h="200px"
              bg={COL.brandSoft}
              borderRadius="full"
              filter="blur(60px)"
              opacity={0.5}
              pointerEvents="none"
            />
            
            <Grid templateColumns={{ base: "1fr", md: "1.4fr 1fr" }} gap={4} alignItems="center" position="relative">
              <Box>
                <HStack spacing={2} mb={3}>
                  <Box w="4px" h="24px" bg={COL.brand} borderRadius="full" />
                  <Text fontSize="sm" fontWeight="600" color={COL.accent} textTransform="uppercase" letterSpacing="wide">
                    Tableau de bord
                  </Text>
                </HStack>
                
                <Heading fontSize={{ base: "2xl", md: "3xl" }} color={COL.text} mb={3} lineHeight="shorter">
                  Bienvenue Carbone Québec !
                </Heading>

                <Text color={COL.muted} mb={5} fontSize={{ base: "md", md: "lg" }}>
                  Prêt à passer à l'action ? Commencer dès maintenant !
                </Text>

                <HStack spacing={3}>
                  <Button
                    bg={COL.brand}
                    color="white"
                    borderRadius="full"
                    px={6}
                    h="44px"
                    _hover={{ bg: COL.accent, transform: "translateY(-2px)", boxShadow: "lg" }}
                    transition="all 0.2s"
                    rightIcon={<Icon as={FiTrendingUp} />}
                  >
                    Voir notre progression
                  </Button>
                </HStack>
              </Box>

              <Box animation={`${float} 3s ease-in-out infinite`}>
                <Image
                  src="/img/illus-progress.png"
                  alt="Progress illustration"
                  w="100%"
                  h={{ base: "160px", md: "200px" }}
                  objectFit="contain"
                  filter="drop-shadow(0 4px 12px rgba(0,0,0,0.1))"
                />
              </Box>
            </Grid>
          </Box>

          {/* Top-right Promo */}
          <Box animation={`${slideInRight} 0.8s ease-out`}>
            <PromoTile
              src="/img/forest.png"
              title="Soumissionnez auprès des grands donneurs d'ordres du Québec"
              subtitle="Testez la durabilité de votre organisation"
              logos={["/img/logos/rio.png", "/img/logos/hydro.png", "/img/logos/iq.png", "/img/logos/desj.png"]}
            />
          </Box>
        </Grid>

        {/* Section title with decorative line */}
        <Flex align="center" mb={6} animation={`${fadeInUp} 0.8s ease-out`}>
          <Box flex={1} h="2px" bg={COL.border} mr={4} />
          <HStack spacing={2}>
            <Icon as={FiTarget} color={COL.brand} boxSize={5} />
            <Text fontWeight="700" color={COL.text} fontSize="xl">
              Vos outils pour agir
            </Text>
          </HStack>
          <Box flex={1} h="2px" bg={COL.border} ml={4} />
        </Flex>

        {/* Row 2 */}
        <Grid 
          templateColumns={{ base: "1fr", xl: "1.5fr 1fr 1fr" }} 
          gap={6}
          animation={`${fadeInUp} 1s ease-out`}
        >
          {/* Column 1 */}
          <VStack align="stretch" spacing={6}>
            <ToolCard
              illu="/img/illus-decarb.png"
              title="Plan de décarbonation"
              subtitle="Définissez vos objectifs et suivez vos réductions d'émissions."
              cta="Fixer mes objectifs"
              delay={0}
            />
            <ToolCard
              illu="/img/illus-conformite.png"
              title="Conformité carbone"
              subtitle="Mesurez l'impact carbone de chaque produit selon MACF/CBAM."
              cta="Ajouter des produits"
              delay={0.1}
            />
            <ToolCard
              illu="/img/illus-report.png"
              title="Rapport de durabilité"
              subtitle="Une fois vos données saisies, générez votre rapport de durabilité."
              cta="Générer le rapport"
              delay={0.2}
            />
          </VStack>

          {/* Column 2 */}
          <VStack align="stretch" spacing={6}>
            <DonutStatCard
              valuePct={63}
              titleBtn="Consulter notre bilan"
              caption="de vos émissions proviennent d'émissions directement produites par votre entreprise"
              delay={0.3}
            />
            <ActionPlanCard delay={0.4} />
          </VStack>

          {/* Column 3 */}
          <VStack align="stretch" spacing={6}>
            <PromoTile
              src="/img/cta-action.png"
              title="Passer à l'action"
              subtitle="Découvrez comment passer à l'action dès maintenant"
              delay={0.5}
            />
            <PromoTile
              src="/img/class.png"
              title="Apprenez avec nous !"
              subtitle="Consultez nos formations"
              delay={0.6}
            />
          </VStack>
        </Grid>
      </Box>
    </Box>
  );
}

/* =============== Components =============== */

function ToolCard({
  illu, title, subtitle, cta, delay = 0,
}: { illu: string; title: string; subtitle: string; cta: string; delay?: number }) {
  return (
    <Box 
      bg={COL.surface} 
      border="1px solid" 
      borderColor={COL.border} 
      borderRadius={COL.radius} 
      boxShadow={COL.shadow}
      overflow="hidden"
      position="relative"
      transition="all 0.3s ease"
      animation={`${fadeInUp} 0.6s ease-out ${delay}s both`}
      _hover={{
        boxShadow: COL.shadowHover,
        transform: "translateY(-4px)",
        borderColor: COL.brand,
      }}
    >
      {/* Gradient overlay on hover */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="3px"
        bg={`linear-gradient(90deg, ${COL.brand}, ${COL.accent})`}
        opacity={0}
        transition="opacity 0.3s ease"
        sx={{
          '.chakra-box:hover > &': {
            opacity: 1,
          }
        }}
      />
      
      <Grid templateColumns={{ base: "1fr", md: "1fr 140px" }} alignItems="center">
        <Box p={{ base: 5, md: 6 }}>
          <Heading fontSize="lg" color={COL.text} mb={2} fontWeight="700">
            {title}
          </Heading>
          <Text color={COL.muted} mb={5} fontSize="sm" lineHeight="tall">
            {subtitle}
          </Text>
          <Button 
            variant="outline" 
            borderRadius="full" 
            px={6} 
            h="40px" 
            borderColor={COL.brand}
            color={COL.brand}
            fontWeight="600"
            _hover={{
              bg: COL.brand,
              color: "white",
              transform: "translateX(4px)",
            }}
            transition="all 0.2s"
          >
            {cta} →
          </Button>
        </Box>
        <Box display={{ base: "none", md: "block" }} pr={4}>
          <Image 
            src={illu} 
            alt="" 
            w="100%" 
            h="130px" 
            objectFit="contain"
            transition="transform 0.3s ease"
            _hover={{ transform: "scale(1.1) rotate(2deg)" }}
          />
        </Box>
      </Grid>
    </Box>
  );
}

function PromoTile({
  src, title, subtitle, logos, delay = 0,
}: { src: string; title: string; subtitle: string; logos?: string[]; delay?: number }) {
  return (
    <Box 
      borderRadius={COL.radius} 
      overflow="hidden" 
      position="relative" 
      minH="260px" 
      boxShadow={COL.shadow}
      cursor="pointer"
      transition="all 0.3s ease"
      animation={`${fadeInUp} 0.6s ease-out ${delay}s both`}
      _hover={{
        boxShadow: COL.shadowHover,
        transform: "translateY(-4px) scale(1.02)",
      }}
    >
      <Image 
        src={src} 
        alt={title} 
        w="100%" 
        h="100%" 
        objectFit="cover"
        transition="transform 0.5s ease"
        _hover={{ transform: "scale(1.1)" }}
      />
      <Box 
        position="absolute" 
        inset={0} 
        bgGradient="linear(to-b, rgba(0,0,0,0.4), rgba(0,0,0,0.7))"
        transition="all 0.3s ease"
        _hover={{
          bgGradient: "linear(to-b, rgba(0,0,0,0.5), rgba(0,0,0,0.8))",
        }}
      />
      <Stack position="absolute" top="20px" left="20px" right="20px" spacing={3}>
        <Text 
          color="white" 
          fontWeight="700" 
          fontSize={{ base: "lg", md: "xl" }}
          lineHeight="short"
          textShadow="0 2px 8px rgba(0,0,0,0.3)"
        >
          {title}
        </Text>
        {logos && (
          <HStack spacing={4} flexWrap="wrap">
            {logos.map((l, i) => (
              <Image 
                key={l} 
                src={l} 
                alt="" 
                h="20px" 
                objectFit="contain"
                filter="brightness(0) invert(1)"
                opacity={0.9}
                transition="all 0.2s"
                animation={`${fadeInUp} 0.4s ease-out ${i * 0.1}s both`}
                _hover={{ opacity: 1, transform: "scale(1.1)" }}
              />
            ))}
          </HStack>
        )}
      </Stack>
      <Stack position="absolute" bottom="20px" left="20px" right="20px">
        <HStack 
          justify="space-between" 
          align="center"
          bg="rgba(255,255,255,0.1)"
          backdropFilter="blur(10px)"
          p={3}
          borderRadius="lg"
          transition="all 0.2s"
          _hover={{ bg: "rgba(255,255,255,0.15)" }}
        >
          <Text color="white" fontSize="sm" fontWeight="500">{subtitle}</Text>
          <Box
            bg="white"
            color={COL.brand}
            borderRadius="full"
            w="32px"
            h="32px"
            display="grid"
            placeItems="center"
            fontWeight="700"
            fontSize="lg"
            transition="all 0.2s"
            _hover={{ transform: "translateX(4px)" }}
          >
            →
          </Box>
        </HStack>
      </Stack>
    </Box>
  );
}

function DonutStatCard({
  valuePct, titleBtn, caption, delay = 0,
}: { valuePct: number; titleBtn: string; caption: string; delay?: number }) {
  const radius = 70, stroke = 18;
  const circumference = 2 * Math.PI * radius;
  const progress = (valuePct / 100) * circumference;

  return (
    <Box 
      bg={COL.surface} 
      border="1px solid" 
      borderColor={COL.border} 
      borderRadius={COL.radius} 
      boxShadow={COL.shadow} 
      p={6}
      transition="all 0.3s ease"
      animation={`${fadeInUp} 0.6s ease-out ${delay}s both`}
      _hover={{
        boxShadow: COL.shadowHover,
        transform: "translateY(-4px)",
      }}
    >
      <Grid justifyItems="center" gap={5}>
        <Box position="relative" w="180px" h="180px">
          <svg width="180" height="180">
            <circle 
              cx="90" 
              cy="90" 
              r={radius} 
              fill="none" 
              stroke={COL.brandSoft} 
              strokeWidth={stroke} 
              strokeLinecap="round" 
            />
            <circle 
              cx="90" 
              cy="90" 
              r={radius} 
              fill="none" 
              stroke={COL.brand} 
              strokeWidth={stroke}
              strokeLinecap="round" 
              strokeDasharray={`${progress} ${circumference - progress}`} 
              transform="rotate(-90 90 90)"
              style={{
                transition: 'stroke-dasharray 1s ease-out',
              }}
            />
          </svg>
          <Flex position="absolute" inset={0} align="center" justify="center" direction="column">
            <Text fontSize="4xl" fontWeight="800" color={COL.text} animation={`${pulse} 2s ease-in-out infinite`}>
              {valuePct}%
            </Text>
            <Icon as={FiAward} color={COL.accent} boxSize={6} mt={1} />
          </Flex>
        </Box>
        <Text color={COL.muted} textAlign="center" maxW="320px" fontSize="sm" lineHeight="tall">
          {caption}
        </Text>
        <Button 
          variant="outline" 
          borderRadius="full" 
          px={6} 
          h="44px" 
          borderColor={COL.brand}
          color={COL.brand}
          fontWeight="600"
          _hover={{
            bg: COL.brand,
            color: "white",
            transform: "translateY(-2px)",
            boxShadow: "md",
          }}
          transition="all 0.2s"
        >
          {titleBtn}
        </Button>
      </Grid>
    </Box>
  );
}

function ActionPlanCard({ delay = 0 }: { delay?: number }) {
  return (
    <Box 
      bg={COL.surface} 
      border="1px solid" 
      borderColor={COL.border} 
      borderRadius={COL.radius} 
      boxShadow={COL.shadow} 
      p={6} 
      textAlign="center"
      transition="all 0.3s ease"
      animation={`${fadeInUp} 0.6s ease-out ${delay}s both`}
      _hover={{
        boxShadow: COL.shadowHover,
        transform: "translateY(-4px)",
      }}
    >
      <Heading fontSize="xl" color={COL.text} mb={4} fontWeight="700">
        Plan d'action
      </Heading>
      <Box 
        mx="auto" 
        my={4} 
        w="80px" 
        h="80px" 
        borderRadius="full" 
        bg={COL.pill}
        border="3px solid"
        borderColor={COL.brandSoft}
        display="grid" 
        placeItems="center"
        transition="all 0.3s ease"
        _hover={{
          bg: COL.brand,
          borderColor: COL.brand,
          transform: "rotate(5deg) scale(1.1)",
        }}
      >
        <Icon 
          as={FiFileText} 
          boxSize={8} 
          color={COL.brand}
          transition="color 0.3s"
          sx={{
            '.chakra-box:hover &': {
              color: 'white',
            }
          }}
        />
      </Box>
      <Text color={COL.muted} mb={5} fontSize="sm" lineHeight="tall">
        Un plan d'action clair et des communications ciblées grâce à l'IA.
      </Text>
      <Button 
        variant="outline" 
        borderRadius="full" 
        px={6} 
        h="44px" 
        borderColor={COL.brand}
        color={COL.brand}
        fontWeight="600"
        _hover={{
          bg: COL.brand,
          color: "white",
          transform: "translateY(-2px)",
          boxShadow: "md",
        }}
        transition="all 0.2s"
      >
        En apprendre plus
      </Button>
    </Box>
  );
}

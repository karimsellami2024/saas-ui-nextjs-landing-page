"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Box, Flex, VStack, HStack, Text, Heading, Button, Grid, Icon, Badge, Image,
  Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import {
  FiZap, FiCpu, FiTruck, FiMonitor, FiPackage, FiDroplet,
  FiArrowRight, FiBarChart2, FiCheckCircle, FiList,
  FiEdit3, FiDownload, FiPlayCircle,
} from "react-icons/fi";

/* ─── Design tokens ─── */
const C = {
  brand:     "#344E41",
  accent:    "#588157",
  soft:      "#DDE5E0",
  bg:        "#F5F6F4",
  surface:   "#FFFFFF",
  border:    "#E4E6E1",
  text:      "#1E2D26",
  muted:     "#6B7A72",
  shadow:    "0 4px 20px rgba(0,0,0,0.07)",
  shadowHov: "0 8px 32px rgba(0,0,0,0.12)",
  r:         "18px",
};

/* ─── Animations ─── */
const fadeUp   = keyframes`from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}`;
const fadeIn   = keyframes`from{opacity:0}to{opacity:1}`;
const scaleIn  = keyframes`from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}`;
const drawLine = keyframes`from{stroke-dashoffset:600}to{stroke-dashoffset:0}`;

/* ─── Mock GES data ─── */
const YEARS = ["2022", "2023", "2024"];
const CATEGORIES = [
  { label: "Cat. 1", name: "Émissions directes",                color: "#344E41", values: [42, 38, 31] },
  { label: "Cat. 2", name: "Énergie importée",                  color: "#588157", values: [18, 16, 13] },
  { label: "Cat. 3", name: "Transports",                        color: "#7A9E7E", values: [25, 22, 19] },
  { label: "Cat. 4", name: "Numérique & consommables",          color: "#A3B899", values: [8,  7,  6]  },
  { label: "Cat. 5", name: "Utilisation produits vendus",       color: "#C9D9C5", values: [14, 13, 12] },
  { label: "Cat. 6", name: "Autres émissions indirectes",       color: "#E8F0E5", values: [5,  5,  4]  },
];

const STEPS = [
  {
    num: "01", icon: FiList, title: "Configurez votre entreprise",
    desc: "Renseignez vos sites de production, vos produits/services et vos paramètres dans l'onglet Entreprise.",
    details: [
      { label: "Accédez à l'onglet Entreprise", body: "Dans le menu latéral gauche, cliquez sur « Entreprise » pour ouvrir la page de configuration." },
      { label: "Ajoutez vos sites de production", body: "Renseignez le nom, la description et l'adresse de chaque lieu d'exploitation. Vous pouvez en ajouter autant que nécessaire." },
      { label: "Déclarez vos produits et services", body: "Listez les produits fabriqués ou vendus par votre organisation ainsi que vos services, avec leur quantité et unité." },
      { label: "Enregistrez votre flotte de véhicules", body: "Ajoutez vos véhicules (année, marque, modèle, type de carburant, consommation) pour alimenter les calculs de la Catégorie 1." },
      { label: "Sauvegardez", body: "Cliquez sur « Sauvegarder » en bas de page. Ces informations seront disponibles dans tous vos formulaires de saisie." },
    ],
  },
  {
    num: "02", icon: FiEdit3, title: "Saisissez vos données",
    desc: "Deux façons de saisir vos données : l'assistant guidé (recommandé) ou les formulaires par catégorie. La sauvegarde est automatique.",
    details: [
      { label: "🧭 Option A — Assistant de saisie guidée (recommandé)", body: "Cliquez sur « Saisie guidée » dans le menu de gauche. L'assistant vous présente chaque source active une par une. Glissez-déposez vos factures (PDF, JPG, PNG ou ZIP jusqu'à 100 fichiers) pour les lire automatiquement — les champs sont pré-remplis par IA. Vérifiez les valeurs, puis cliquez sur « Sauvegarder et continuer »." },
      { label: "📂 Option B — Saisie par catégorie (avancée)", body: "Dans le menu de gauche, sélectionnez l'une des 6 catégories d'émissions. Utilisez les onglets pour naviguer entre les sous-sources, ajoutez des lignes et renseignez la quantité, le type, la date et le site." },
      { label: "📄 Importez vos factures en lot", body: "Dans l'assistant de saisie, glissez-déposez un dossier ZIP contenant toutes vos factures de l'année. L'IA extrait automatiquement la consommation (kWh, m³, L), la province et la période, et agrège les totaux." },
      { label: "✅ Calcul GES automatique", body: "Le total en tCO₂e est calculé en temps réel à partir des facteurs d'émission officiels (ECCC, IPCC). Les gaz CO₂, CH₄ et N₂O sont traités séparément selon leur potentiel de réchauffement." },
      { label: "💾 Sauvegarde automatique", body: "Vos données sont enregistrées automatiquement après chaque saisie. Vous pouvez quitter et revenir à tout moment sans perdre votre travail." },
    ],
  },
  {
    num: "03", icon: FiBarChart2, title: "Consultez votre bilan",
    desc: "Le bilan GES se calcule en temps réel. Visualisez vos émissions par catégorie, site ou produit.",
    details: [
      { label: "Accédez à l'onglet Bilan", body: "Cliquez sur « Bilan » dans le menu latéral pour afficher le récapitulatif complet de vos émissions GES." },
      { label: "Vue par catégorie", body: "Les émissions sont réparties selon les 6 catégories ISO 14064 (Scope 1, 2 et 3). Chaque catégorie affiche son total en tCO₂e." },
      { label: "Filtres par site et par produit", body: "Vous pouvez filtrer les résultats par site de production ou par produit/service pour analyser les sources d'émissions les plus importantes." },
      { label: "Évolution temporelle", body: "Si vous avez saisi des données sur plusieurs années, le graphique de tendance montre l'évolution de vos émissions et votre progression vers vos objectifs de réduction." },
    ],
  },
  {
    num: "04", icon: FiDownload, title: "Générez votre rapport",
    desc: "Exportez un rapport de durabilité conforme aux normes ISO 14064 pour vos parties prenantes.",
    details: [
      { label: "Accédez à l'onglet Rapport", body: "Cliquez sur « Rapport » dans le menu de gauche une fois votre saisie complète." },
      { label: "Vérifiez les données incluses", body: "Le rapport reprend l'ensemble des émissions déclarées, les facteurs d'émission utilisés et la méthodologie appliquée (ISO 14064, GHG Protocol)." },
      { label: "Exportez en PDF", body: "Cliquez sur « Télécharger le rapport PDF » pour obtenir un document structuré, prêt à être partagé avec vos parties prenantes, clients ou organismes de certification." },
      { label: "Archivez et partagez", body: "Le rapport inclut la période de déclaration, le périmètre organisationnel et les sources d'émissions détaillées — conforme aux exigences de divulgation ESG." },
    ],
  },
];

const CAT_CARDS = [
  { num: "1", label: "Émissions directes",          icon: FiZap,      color: "#344E41", bg: "#EDF2EE" },
  { num: "2", label: "Énergie importée",             icon: FiCpu,      color: "#4A7C59", bg: "#EEF4EF" },
  { num: "3", label: "Transports",                   icon: FiTruck,    color: "#588157", bg: "#EFF5EF" },
  { num: "4", label: "Numérique & consommables",     icon: FiMonitor,  color: "#6A9B70", bg: "#F0F5F0" },
  { num: "5", label: "Utilisation produits vendus",  icon: FiPackage,  color: "#7AB580", bg: "#F2F7F2" },
  { num: "6", label: "Autres émissions indirectes",  icon: FiDroplet,  color: "#8FBF96", bg: "#F4F8F4" },
];

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function DashboardEnhanced() {
  return (
    <Box minH="100vh" bg={C.bg}>
      <Box w="100%" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 8 }} maxW="1400px" mx="auto">

        {/* ── HERO ── */}
        <HeroSection />

        {/* ── HOW TO USE ── */}
        <Section title="Comment utiliser le calculateur" icon={FiPlayCircle} delay={0.1}>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)", xl: "repeat(4,1fr)" }} gap={5}>
            {STEPS.map((s, i) => <StepCard key={s.num} step={s} delay={0.1 + i * 0.08} />)}
          </Grid>
        </Section>

        {/* ── GES PREVIEW CHART ── */}
        <Section title="Aperçu de vos émissions GES" icon={FiBarChart2} delay={0.2}
          badge="Données illustratives — vos chiffres apparaîtront ici">
          <Grid templateColumns={{ base: "1fr", lg: "3fr 2fr" }} gap={6}>
            <BarChartCard />
            <LineChartCard />
          </Grid>
        </Section>

        {/* ── CATEGORY QUICK-ACCESS ── */}
        <Section title="Catégories d'émissions" icon={FiCheckCircle} delay={0.3}>
          <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(3,1fr)", xl: "repeat(6,1fr)" }} gap={4}>
            {CAT_CARDS.map((c, i) => <CatCard key={c.num} cat={c} delay={0.3 + i * 0.06} />)}
          </Grid>
        </Section>

      </Box>
    </Box>
  );
}

/* ═══════════════ HERO ═══════════════ */
function HeroSection() {
  return (
    <Box
      bg={C.surface}
      border="1px solid"
      borderColor={C.border}
      borderRadius={C.r}
      boxShadow={C.shadow}
      overflow="hidden"
      mb={8}
      position="relative"
      animation={`${scaleIn} 0.5s ease`}
    >
      {/* Decorative gradient blobs */}
      <Box position="absolute" top="-60px" right="-60px" w="260px" h="260px"
        bg={C.soft} borderRadius="full" filter="blur(80px)" opacity={0.6} pointerEvents="none" />
      <Box position="absolute" bottom="-40px" left="-40px" w="200px" h="200px"
        bg="#E8F5E0" borderRadius="full" filter="blur(60px)" opacity={0.5} pointerEvents="none" />

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={0}>
        {/* Left */}
        <Box p={{ base: 7, md: 10 }} position="relative">
          <HStack spacing={2} mb={4}>
            <Box w="4px" h="20px" bg={C.brand} borderRadius="full" />
            <Text fontSize="xs" fontWeight="700" color={C.accent} textTransform="uppercase" letterSpacing="wider">
              Calculateur GES · ISO 14064
            </Text>
          </HStack>

          <Heading fontSize={{ base: "2xl", md: "3xl", lg: "4xl" }} color={C.text}
            lineHeight="shorter" mb={4} fontWeight="800">
            Mesurez et réduisez vos émissions de gaz à effet de serre
          </Heading>

          <Text color={C.muted} fontSize={{ base: "sm", md: "md" }} mb={6} lineHeight="tall" maxW="480px">
            Ce calculateur vous guide pas à pas dans la quantification de votre empreinte carbone selon
            la norme ISO 14064, couvrant les 6 catégories d'émissions directes et indirectes.
          </Text>

          <HStack spacing={3} flexWrap="wrap">
            <Button bg={C.brand} color="white" borderRadius="full" px={7} h="46px"
              _hover={{ bg: C.accent, transform: "translateY(-2px)", boxShadow: "lg" }}
              transition="all 0.2s" rightIcon={<Icon as={FiArrowRight} />}
              fontWeight="700" fontSize="sm">
              Commencer la saisie
            </Button>
            <Button variant="outline" borderRadius="full" px={6} h="46px"
              borderColor={C.brand} color={C.brand}
              _hover={{ bg: C.soft }} transition="all 0.2s" fontSize="sm">
              Voir le bilan
            </Button>
          </HStack>
        </Box>

        {/* Right — forest image */}
        <Box position="relative" overflow="hidden" h={{ base: "160px", md: "260px" }}
          borderLeft={{ md: "1px solid" }} borderColor={C.border}>
          <Image
            src="/img/forest.png"
            alt="Forêt"
            w="100%"
            h="100%"
            objectFit="cover"
            style={{ display: "block" }}
          />
          <Box position="absolute" inset={0}
            bgGradient="linear(to-b, rgba(0,0,0,0.10), rgba(0,0,0,0.38))" />
        </Box>
      </Grid>
    </Box>
  );
}

/* ═══════════════ STEP CARD ═══════════════ */
function StepCard({ step, delay }: { step: typeof STEPS[0]; delay: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Card */}
      <Box
        bg={C.surface} border="1px solid" borderColor={C.border} borderRadius={C.r}
        boxShadow={C.shadow} p={6} position="relative" overflow="hidden"
        animation={`${fadeUp} 0.5s ease ${delay}s both`}
        transition="all 0.25s" cursor="pointer"
        _hover={{ boxShadow: C.shadowHov, transform: "translateY(-4px)", borderColor: C.accent }}
        onClick={() => setOpen(true)}
      >
        <Text position="absolute" top="10px" right="16px" fontSize="5xl" fontWeight="900"
          color={C.soft} lineHeight="1" userSelect="none">{step.num}</Text>
        <Box w="44px" h="44px" bg={C.soft} borderRadius="12px" display="grid" placeItems="center" mb={4}>
          <Icon as={step.icon} color={C.brand} boxSize={5} />
        </Box>
        <Heading fontSize="md" color={C.text} mb={2} fontWeight="700">{step.title}</Heading>
        <Text fontSize="sm" color={C.muted} lineHeight="tall">{step.desc}</Text>
        <HStack mt={4} spacing={1}>
          <Text fontSize="xs" color={C.accent} fontWeight="600">Voir les détails</Text>
          <Icon as={FiArrowRight} color={C.accent} boxSize={3} />
        </HStack>
      </Box>

      {/* Modal */}
      <Modal isOpen={open} onClose={() => setOpen(false)} size="lg" isCentered>
        <ModalOverlay bg="rgba(0,0,0,0.45)" backdropFilter="blur(4px)" />
        <ModalContent borderRadius="20px" overflow="hidden" mx={4}>
          {/* Header */}
          <Box bgGradient={`linear(135deg, #1B2E25 0%, ${C.brand} 100%)`} px={7} pt={7} pb={6}>
            <HStack spacing={3} mb={3}>
              <Box w="40px" h="40px" bg="rgba(255,255,255,0.15)" borderRadius="10px"
                display="grid" placeItems="center" flexShrink={0}>
                <Icon as={step.icon} color="white" boxSize={4} />
              </Box>
              <Badge bg="rgba(255,255,255,0.15)" color={C.soft} fontSize="xs"
                fontWeight="800" px={2} py={1} borderRadius="6px">
                Étape {step.num}
              </Badge>
            </HStack>
            <Heading fontSize="xl" color="white" fontWeight="800" lineHeight="1.2">
              {step.title}
            </Heading>
            <ModalCloseButton color="rgba(255,255,255,0.6)" top={4} right={4}
              _hover={{ color: "white", bg: "rgba(255,255,255,0.1)" }} borderRadius="8px" />
          </Box>

          {/* Body */}
          <ModalBody px={7} py={6}>
            <VStack spacing={4} align="stretch">
              {step.details.map((d, i) => (
                <HStack key={i} align="flex-start" spacing={4}>
                  {/* Step dot */}
                  <Box flexShrink={0} mt="2px">
                    <Box w="24px" h="24px" borderRadius="full" bg={C.soft}
                      display="flex" alignItems="center" justifyContent="center">
                      <Text fontSize="10px" fontWeight="800" color={C.brand}>{i + 1}</Text>
                    </Box>
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="700" color={C.text} mb={0.5}>{d.label}</Text>
                    <Text fontSize="sm" color={C.muted} lineHeight="1.7">{d.body}</Text>
                  </Box>
                </HStack>
              ))}
            </VStack>

            <Button mt={6} w="full" h="44px" bg={C.brand} color="white" borderRadius="full"
              fontWeight="700" _hover={{ bg: C.accent }} onClick={() => setOpen(false)}>
              Compris
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

/* ═══════════════ BAR CHART (SVG) ═══════════════ */
function BarChartCard() {
  const W = 560, H = 260, PAD_L = 48, PAD_B = 40, PAD_T = 20, PAD_R = 20;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const maxVal = 120;
  const nCats  = CATEGORIES.length;
  const nYears = YEARS.length;
  const groupW = chartW / nCats;
  const barW   = (groupW * 0.7) / nYears;
  const gap    = (groupW * 0.3) / (nYears + 1);

  const yLines = [0, 30, 60, 90, 120];

  return (
    <Box bg={C.surface} border="1px solid" borderColor={C.border} borderRadius={C.r}
      boxShadow={C.shadow} p={5} animation={`${fadeIn} 0.6s ease 0.25s both`}>
      <Flex justify="space-between" align="center" mb={4}>
        <VStack align="start" spacing={0}>
          <Text fontWeight="700" color={C.text} fontSize="md">Émissions par catégorie</Text>
          <Text fontSize="xs" color={C.muted}>Tonnes de CO₂e · toutes sources</Text>
        </VStack>
        <HStack spacing={3} flexWrap="wrap">
          {YEARS.map((y, i) => (
            <HStack key={y} spacing={1}>
              <Box w="10px" h="10px" borderRadius="3px" bg={i === 0 ? "#9EC4A0" : i === 1 ? "#588157" : C.brand} />
              <Text fontSize="xs" color={C.muted}>{y}</Text>
            </HStack>
          ))}
        </HStack>
      </Flex>

      <Box overflowX="auto">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 340 }}>
          {/* Y grid lines */}
          {yLines.map(v => {
            const y = PAD_T + chartH - (v / maxVal) * chartH;
            return (
              <g key={v}>
                <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                  stroke={C.border} strokeWidth="1" strokeDasharray={v === 0 ? "0" : "4 4"} />
                <text x={PAD_L - 6} y={y + 4} textAnchor="end" fontSize="10" fill={C.muted}>{v}</text>
              </g>
            );
          })}

          {/* Bars */}
          {CATEGORIES.map((cat, ci) => {
            const groupX = PAD_L + ci * groupW;
            return (
              <g key={cat.label}>
                {YEARS.map((_, yi) => {
                  const val = cat.values[yi];
                  const barH = (val / maxVal) * chartH;
                  const x = groupX + gap + yi * (barW + gap / 2);
                  const y = PAD_T + chartH - barH;
                  const opacity = yi === 0 ? 0.45 : yi === 1 ? 0.7 : 1;
                  return (
                    <rect key={yi} x={x} y={y} width={barW} height={barH}
                      fill={cat.color} opacity={opacity} rx="3" ry="3">
                      <title>{cat.label} {YEARS[yi]}: {val} tCO₂e</title>
                    </rect>
                  );
                })}
                {/* X label */}
                <text x={groupX + groupW / 2} y={H - 8} textAnchor="middle"
                  fontSize="10" fill={C.muted} fontWeight="600">
                  {cat.label}
                </text>
              </g>
            );
          })}

          {/* Y axis */}
          <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + chartH}
            stroke={C.border} strokeWidth="1.5" />
        </svg>
      </Box>

      {/* Category legend */}
      <Grid templateColumns="repeat(3,1fr)" gap={2} mt={2}>
        {CATEGORIES.map(cat => (
          <HStack key={cat.label} spacing={1}>
            <Box w="8px" h="8px" borderRadius="2px" bg={cat.color} flexShrink={0} />
            <Text fontSize="10px" color={C.muted} noOfLines={1}>{cat.name}</Text>
          </HStack>
        ))}
      </Grid>
    </Box>
  );
}

/* ═══════════════ LINE CHART (SVG) ═══════════════ */
function LineChartCard() {
  const totalsByYear = YEARS.map((_, yi) =>
    CATEGORIES.reduce((sum, cat) => sum + cat.values[yi], 0)
  );
  const W = 360, H = 220, PAD_L = 48, PAD_B = 36, PAD_T = 20, PAD_R = 20;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const maxVal = Math.max(...totalsByYear) * 1.2;
  const pts = totalsByYear.map((v, i) => ({
    x: PAD_L + (i / (YEARS.length - 1)) * chartW,
    y: PAD_T + chartH - (v / maxVal) * chartH,
    v,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = `${pathD} L${pts[pts.length-1].x},${PAD_T+chartH} L${pts[0].x},${PAD_T+chartH} Z`;

  const reduction = Math.round(((totalsByYear[0] - totalsByYear[totalsByYear.length - 1]) / totalsByYear[0]) * 100);

  return (
    <Box bg={C.surface} border="1px solid" borderColor={C.border} borderRadius={C.r}
      boxShadow={C.shadow} p={5} animation={`${fadeIn} 0.6s ease 0.35s both`}>
      <Flex justify="space-between" align="center" mb={1}>
        <VStack align="start" spacing={0}>
          <Text fontWeight="700" color={C.text} fontSize="md">Tendance totale GES</Text>
          <Text fontSize="xs" color={C.muted}>Toutes catégories confondues</Text>
        </VStack>
        <Box bg="#E8F5EE" borderRadius="10px" px={3} py={1}>
          <Text fontSize="sm" fontWeight="800" color={C.brand}>−{reduction}%</Text>
          <Text fontSize="9px" color={C.accent} textAlign="center">2022→2024</Text>
        </Box>
      </Flex>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.brand} stopOpacity="0.2" />
            <stop offset="100%" stopColor={C.brand} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaD} fill="url(#areaGrad)" />

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const y = PAD_T + chartH * f;
          const v = Math.round(maxVal * (1 - f));
          return (
            <g key={f}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke={C.border} strokeWidth="1" strokeDasharray={f === 1 ? "0" : "4 3"} />
              {f < 1 && (
                <text x={PAD_L - 6} y={y + 4} textAnchor="end" fontSize="10" fill={C.muted}>{v}</text>
              )}
            </g>
          );
        })}

        {/* Line */}
        <path d={pathD} fill="none" stroke={C.brand} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="600" style={{ animation: `${drawLine} 1.2s ease forwards` }} />

        {/* Points + labels */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill={C.brand} stroke="white" strokeWidth="2" />
            <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="11" fill={C.text} fontWeight="700">
              {p.v}
            </text>
            <text x={p.x} y={H - 6} textAnchor="middle" fontSize="10" fill={C.muted}>
              {YEARS[i]}
            </text>
          </g>
        ))}

        {/* Y axis */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + chartH}
          stroke={C.border} strokeWidth="1.5" />
      </svg>

      <Text fontSize="xs" color={C.muted} textAlign="center" mt={1}>
        Total tCO₂e — données illustratives
      </Text>

      {/* Mini stat row */}
      <HStack justify="space-around" mt={4} pt={4} borderTop="1px solid" borderColor={C.border}>
        {totalsByYear.map((v, i) => (
          <VStack key={i} spacing={0}>
            <Text fontSize="lg" fontWeight="800" color={i === totalsByYear.length - 1 ? C.brand : C.text}>{v}</Text>
            <Text fontSize="10px" color={C.muted}>{YEARS[i]}</Text>
          </VStack>
        ))}
      </HStack>
    </Box>
  );
}

/* ═══════════════ CATEGORY CARD ═══════════════ */
function CatCard({ cat, delay }: { cat: typeof CAT_CARDS[0]; delay: number }) {
  return (
    <Box bg={C.surface} border="1px solid" borderColor={C.border} borderRadius="14px"
      boxShadow={C.shadow} p={4} textAlign="center" cursor="pointer"
      animation={`${fadeUp} 0.5s ease ${delay}s both`}
      transition="all 0.22s"
      _hover={{ boxShadow: C.shadowHov, transform: "translateY(-4px)", borderColor: cat.color }}>
      <Box w="40px" h="40px" bg={cat.bg} borderRadius="10px" display="grid" placeItems="center" mx="auto" mb={2}>
        <Icon as={cat.icon} color={cat.color} boxSize={5} />
      </Box>
      <Text fontSize="xs" fontWeight="800" color={cat.color} mb={1}>Cat. {cat.num}</Text>
      <Text fontSize="11px" color={C.muted} lineHeight="tight">{cat.label}</Text>
    </Box>
  );
}

/* ═══════════════ SECTION WRAPPER ═══════════════ */
function Section({
  title, icon, delay, badge, children,
}: {
  title: string; icon: any; delay: number; badge?: string; children: React.ReactNode;
}) {
  return (
    <Box mb={8} animation={`${fadeUp} 0.5s ease ${delay}s both`}>
      <Flex align="center" mb={5} gap={3} flexWrap="wrap">
        <HStack spacing={2}>
          <Box w="32px" h="32px" bg={C.soft} borderRadius="10px" display="grid" placeItems="center">
            <Icon as={icon} color={C.brand} boxSize={4} />
          </Box>
          <Heading fontSize={{ base: "md", md: "lg" }} color={C.text} fontWeight="700">{title}</Heading>
        </HStack>
        {badge && (
          <Badge bg="#FFF9E6" color="#A07800" borderRadius="8px" px={3} py={1} fontSize="xs" fontWeight="500">
            {badge}
          </Badge>
        )}
        <Box flex={1} h="1px" bg={C.border} display={{ base: "none", md: "block" }} />
      </Flex>
      {children}
    </Box>
  );
}

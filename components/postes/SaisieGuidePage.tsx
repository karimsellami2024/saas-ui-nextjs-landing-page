'use client'

import {
  Box, VStack, HStack, Heading, Text, Button, Icon, Divider,
  Badge, Flex, Grid, GridItem,
} from '@chakra-ui/react'
import {
  FiArrowRight, FiCheckSquare, FiBarChart2, FiUploadCloud,
  FiTruck, FiZap, FiList, FiSettings, FiChevronRight,
} from 'react-icons/fi'

const G = {
  dark:    '#1B2E25',
  brand:   '#264a3b',
  accent:  '#344E41',
  soft:    '#DDE5E0',
  bg:      '#F3F6EF',
  surface: '#FFFFFF',
  border:  '#E1E7E3',
  muted:   '#6B7A72',
}

type Props = {
  onStartWizard: () => void
  onGoToCategory: (cat: string) => void
}

/* ── Small step badge ── */
function StepBadge({ n }: { n: number }) {
  return (
    <Flex
      w="28px" h="28px" rounded="full" bg={G.brand} color="white"
      align="center" justify="center" flexShrink={0}
    >
      <Text fontSize="xs" fontWeight={800}>{n}</Text>
    </Flex>
  )
}

/* ── Section card ── */
function SectionCard({ icon, title, badge, children }: {
  icon: any; title: string; badge?: string; children: React.ReactNode
}) {
  return (
    <Box bg={G.surface} rounded="2xl" border={`1px solid ${G.border}`} overflow="hidden">
      <HStack px={6} py={4} bg={G.bg} borderBottom={`1px solid ${G.border}`} spacing={3}>
        <Flex w="32px" h="32px" rounded="lg" bg={G.brand} align="center" justify="center" flexShrink={0}>
          <Icon as={icon} color="white" boxSize={4} />
        </Flex>
        <Text fontWeight={700} fontSize="md" color={G.dark} flex={1}>{title}</Text>
        {badge && <Badge colorScheme="green" fontSize="10px" px={2}>{badge}</Badge>}
      </HStack>
      <Box px={6} py={5}>{children}</Box>
    </Box>
  )
}

/* ── Nav pill ── */
function NavPill({ label, color = G.brand }: { label: string; color?: string }) {
  return (
    <Box
      display="inline-flex" alignItems="center" px={3} py={1}
      rounded="full" border={`1px solid ${color}`} color={color}
      fontSize="xs" fontWeight={700} bg="white"
    >
      {label}
    </Box>
  )
}

export default function SaisieGuidePage({ onStartWizard, onGoToCategory }: Props) {
  return (
    <Box maxW="860px" mx="auto" pb={12}>

      {/* ── Hero ── */}
      <Box
        bgGradient={`linear(135deg, ${G.dark}, ${G.brand})`}
        rounded="2xl" px={8} py={8} mb={6}
      >
        <HStack spacing={3} mb={3}>
          <Text fontSize="32px">📋</Text>
          <Badge colorScheme="green" fontSize="11px" px={3} py={1} rounded="full">
            Guide de saisie
          </Badge>
        </HStack>
        <Heading size="lg" color="white" fontWeight={800} mb={2}>
          Comment saisir vos données d'émissions ?
        </Heading>
        <Text fontSize="sm" color={G.soft} lineHeight="1.7" maxW="580px">
          Ce guide vous explique les deux méthodes disponibles pour compléter votre inventaire GES,
          comment naviguer dans l'application, et comment utiliser toutes les fonctionnalités de l'assistant de saisie.
        </Text>
      </Box>

      <VStack spacing={5} align="stretch">

        {/* ── Overview ── */}
        <SectionCard icon={FiList} title="Vue d'ensemble — deux méthodes de saisie">
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Box p={4} rounded="xl" bg="#EEF5EE" border="1px solid #C3DFC3">
              <HStack mb={2} spacing={2}>
                <Icon as={FiCheckSquare} color={G.brand} boxSize={4} />
                <Text fontWeight={700} fontSize="sm" color={G.dark}>Option A — Assistant guidé</Text>
                <Badge colorScheme="green" fontSize="9px">Recommandé</Badge>
              </HStack>
              <Text fontSize="xs" color={G.muted} lineHeight="1.6">
                L'assistant vous présente chaque source active <strong>une par une</strong>.
                Importez vos factures pour remplir les champs automatiquement.
                Idéal pour une première saisie ou une saisie rapide.
              </Text>
            </Box>
            <Box p={4} rounded="xl" bg={G.bg} border={`1px solid ${G.border}`}>
              <HStack mb={2} spacing={2}>
                <Icon as={FiBarChart2} color={G.brand} boxSize={4} />
                <Text fontWeight={700} fontSize="sm" color={G.dark}>Option B — Saisie par catégorie</Text>
              </HStack>
              <Text fontSize="xs" color={G.muted} lineHeight="1.6">
                Accédez directement aux catégories (1 à 6) via le menu latéral gauche.
                Permet une saisie ligne par ligne avec plus de détails (site, produit, date…).
                Idéal pour des données complexes ou multi-sites.
              </Text>
            </Box>
          </Grid>
        </SectionCard>

        {/* ── Navigation ── */}
        <SectionCard icon={FiSettings} title="Comment naviguer dans l'application">
          <VStack spacing={4} align="stretch">
            <HStack align="flex-start" spacing={3}>
              <StepBadge n={1} />
              <Box>
                <Text fontSize="sm" fontWeight={700} color={G.dark} mb={1}>Menu latéral gauche</Text>
                <Text fontSize="xs" color={G.muted} lineHeight="1.6">
                  Le menu vertical à gauche contient tous les accès principaux. De haut en bas :
                </Text>
                <VStack mt={2} spacing={1.5} align="flex-start">
                  {[
                    ['Tableau de bord', 'Vue d\'ensemble de vos émissions totales'],
                    ['Émissions directes', 'Catégorie 1 — combustion fixe, véhicules, réfrigérants'],
                    ['Énergie importée', 'Catégorie 2 — électricité consommée'],
                    ['Transports', 'Catégorie 3 — transport amont/aval, navettage'],
                    ['Produits utilisés', 'Catégorie 4'],
                    ['Utilisation produits', 'Catégorie 5'],
                    ['Autres indirects', 'Catégorie 6'],
                    ['Saisie guidée ✦', 'L\'assistant wizard — saisie source par source'],
                    ['Bilan', 'Votre bilan GES complet en graphiques'],
                    ['Rapport', 'Export PDF conforme ISO 14064'],
                  ].map(([label, desc]) => (
                    <HStack key={label} spacing={2} align="flex-start">
                      <Icon as={FiChevronRight} color={G.brand} boxSize={3} mt="3px" flexShrink={0} />
                      <Text fontSize="xs" color={G.dark}>
                        <strong>{label}</strong> — {desc}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            </HStack>

            <Divider borderColor={G.border} />

            <HStack align="flex-start" spacing={3}>
              <StepBadge n={2} />
              <Box>
                <Text fontSize="sm" fontWeight={700} color={G.dark} mb={1}>Sous-onglets de catégorie</Text>
                <Text fontSize="xs" color={G.muted} lineHeight="1.6">
                  En cliquant sur une catégorie (ex. Émissions directes), des onglets apparaissent en haut de la page :
                  <strong> 1.1 Combustions fixes</strong>, <strong>1.2 Combustions mobiles</strong>,
                  <strong> 1.4 Émissions fugitives</strong>, etc.
                  Chaque onglet correspond à une source d'émissions spécifique.
                </Text>
              </Box>
            </HStack>

            <Divider borderColor={G.border} />

            <HStack align="flex-start" spacing={3}>
              <StepBadge n={3} />
              <Box>
                <Text fontSize="sm" fontWeight={700} color={G.dark} mb={1}>Configuration préalable — Onglet Entreprise</Text>
                <Text fontSize="xs" color={G.muted} lineHeight="1.6">
                  Avant de saisir des données, configurez votre entreprise : ajoutez vos sites de production,
                  vos produits/services et activez les sources pertinentes via
                  <strong> Périmètre d'émissions → Reconfigurer les sources</strong>.
                  Les sources non activées seront masquées dans toutes les catégories.
                </Text>
              </Box>
            </HStack>
          </VStack>
        </SectionCard>

        {/* ── Wizard detail ── */}
        <SectionCard icon={FiCheckSquare} title="L'assistant de saisie guidée — fonctionnement détaillé" badge="Recommandé">
          <VStack spacing={5} align="stretch">

            <Text fontSize="xs" color={G.muted} lineHeight="1.7">
              L'assistant se trouve dans le menu latéral gauche sous l'icône <strong>Saisie guidée</strong>.
              Il charge automatiquement toutes vos sources actives et vous les présente une par une.
            </Text>

            {/* Steps */}
            {[
              {
                icon: '🏁',
                title: 'Écran d\'introduction',
                desc: 'L\'assistant liste toutes vos sources actives avec leur code (1A1, 6A1…) et leur scope (1, 2 ou 3). Vous pouvez également y importer votre flotte de véhicules depuis un fichier Excel avant de commencer.',
              },
              {
                icon: '📝',
                title: 'Formulaire par source',
                desc: 'Pour chaque source, un formulaire adapté apparaît. Ex. pour 1A1 (combustion fixe) : choisissez le combustible et entrez la quantité. Pour 6A1 (électricité) : choisissez la province et entrez les kWh. Les champs varient selon la source.',
              },
              {
                icon: '⚡',
                title: 'Calcul GES en temps réel',
                desc: 'Dès que vous entrez une valeur, le résultat en tCO₂e est calculé instantanément en bas du formulaire, en utilisant les facteurs d\'émission officiels ECCC 2022 (CO₂, CH₄, N₂O séparément).',
              },
              {
                icon: '📄',
                title: 'Lecture de factures (IA)',
                desc: 'Dans le panneau de droite, glissez-déposez vos factures PDF, JPG, PNG ou un ZIP contenant jusqu\'à 100 fichiers. L\'IA extrait automatiquement la consommation (kWh, m³, L), le carburant, la province et la période. Les résultats de chaque fichier sont affichés avec son nom. Les fichiers échoués peuvent être relancés individuellement.',
              },
              {
                icon: '💾',
                title: 'Sauvegarde dans la base de données',
                desc: 'Cliquez sur "Sauvegarder et continuer" pour enregistrer. Les données sont sauvegardées dans la même table que les formulaires par catégorie — elles apparaîtront donc aussi dans Émissions directes, Énergie importée, etc.',
              },
              {
                icon: '⏭️',
                title: 'Ignorer une source',
                desc: 'Vous pouvez ignorer une source si vous n\'avez pas les données disponibles. Vous pourrez la compléter plus tard via la catégorie correspondante.',
              },
              {
                icon: '✅',
                title: 'Écran de complétion',
                desc: 'Une fois toutes les sources parcourues, un récapitulatif affiche les sources sauvegardées vs ignorées. Un bouton "Voir mon bilan" vous redirige vers le tableau de bilan GES.',
              },
            ].map((s, i) => (
              <HStack key={i} align="flex-start" spacing={3} p={3} bg={G.bg} rounded="xl">
                <Text fontSize="20px" flexShrink={0}>{s.icon}</Text>
                <Box>
                  <Text fontSize="sm" fontWeight={700} color={G.dark} mb={0.5}>{s.title}</Text>
                  <Text fontSize="xs" color={G.muted} lineHeight="1.6">{s.desc}</Text>
                </Box>
              </HStack>
            ))}
          </VStack>
        </SectionCard>

        {/* ── Catégorie 1 quick access ── */}
        <SectionCard icon={FiBarChart2} title="Accès rapide aux catégories">
          <Text fontSize="xs" color={G.muted} mb={4} lineHeight="1.6">
            Si vous préférez la saisie par catégorie, voici les catégories et leurs contenus principaux :
          </Text>
          <VStack spacing={2} align="stretch">
            {[
              { cat: 'direct',              label: 'Catégorie 1 — Émissions directes',     desc: 'Combustion fixe (1A1), véhicules (2A1/2A3/2B1), réfrigérants (4A1/4B1/4B2)', scope: '1' },
              { cat: 'energie_importee',    label: 'Catégorie 2 — Énergie importée',       desc: 'Électricité réseau (6A1), électricité marché (6B1)', scope: '2' },
              { cat: 'transports',          label: 'Catégorie 3 — Transports',             desc: 'Transport amont/aval, navettage employés, déplacements d\'affaires', scope: '3' },
              { cat: 'produits_utilises',   label: 'Catégorie 4 — Produits utilisés',      desc: 'Biens et matériaux achetés', scope: '3' },
              { cat: 'utilisation_produits',label: 'Catégorie 5 — Utilisation produits',   desc: 'Émissions liées à l\'utilisation de vos produits vendus', scope: '3' },
              { cat: 'autres_indirects',    label: 'Catégorie 6 — Autres indirects',       desc: 'Émissions indirectes non couvertes ailleurs', scope: '3' },
            ].map(({ cat, label, desc, scope }) => (
              <HStack
                key={cat}
                px={4} py={3} rounded="xl" bg={G.bg} border={`1px solid ${G.border}`}
                justify="space-between" cursor="pointer"
                _hover={{ borderColor: G.brand, bg: '#EEF5EE' }}
                transition="all 0.15s"
                onClick={() => onGoToCategory(cat)}
              >
                <HStack spacing={3}>
                  <Badge colorScheme={scope === '1' ? 'purple' : scope === '2' ? 'teal' : 'orange'} fontSize="9px">
                    Scope {scope}
                  </Badge>
                  <Box>
                    <Text fontSize="sm" fontWeight={700} color={G.dark}>{label}</Text>
                    <Text fontSize="xs" color={G.muted}>{desc}</Text>
                  </Box>
                </HStack>
                <Icon as={FiChevronRight} color={G.muted} boxSize={4} flexShrink={0} />
              </HStack>
            ))}
          </VStack>
        </SectionCard>

        {/* ── Fleet import ── */}
        <SectionCard icon={FiTruck} title="Import de flotte de véhicules">
          <Text fontSize="xs" color={G.muted} lineHeight="1.7" mb={3}>
            Si vous avez un fichier Excel listant vos véhicules, vous pouvez l'importer de deux façons :
          </Text>
          <VStack spacing={2} align="stretch">
            <HStack p={3} bg={G.bg} rounded="xl" spacing={3} align="flex-start">
              <Text fontSize="16px">🧭</Text>
              <Text fontSize="xs" color={G.dark} lineHeight="1.6">
                <strong>Via l'assistant guidé</strong> — sur l'écran d'introduction, une zone de dépôt Excel
                apparaît si vous avez des sources véhicules actives. Glissez votre fichier pour importer la flotte
                avant de commencer la saisie.
              </Text>
            </HStack>
            <HStack p={3} bg={G.bg} rounded="xl" spacing={3} align="flex-start">
              <Text fontSize="16px">🏢</Text>
              <Text fontSize="xs" color={G.dark} lineHeight="1.6">
                <strong>Via l'onglet Entreprise</strong> — dans la section "Flotte de véhicules",
                cliquez sur <strong>📥 Importer Excel</strong>. Les colonnes reconnues automatiquement :
                Année, Marque, Modèle, Type de carburant, Consommation L/100km, Distance km, Climatisation.
              </Text>
            </HStack>
          </VStack>
        </SectionCard>

        {/* ── CTA ── */}
        <Box
          bgGradient={`linear(135deg, ${G.dark}, ${G.brand})`}
          rounded="2xl" px={8} py={7}
        >
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={4}>
            <Box>
              <Heading size="md" color="white" mb={1}>Prêt à commencer ?</Heading>
              <Text fontSize="sm" color={G.soft}>
                Lancez l'assistant guidé — il prend en charge toutes vos sources actives automatiquement.
              </Text>
            </Box>
            <HStack spacing={3} flexWrap="wrap">
              <Button
                size="md" bg="white" color={G.brand}
                _hover={{ bg: G.soft }}
                borderRadius="xl" fontWeight={700} px={6}
                rightIcon={<Icon as={FiCheckSquare} />}
                onClick={onStartWizard}
              >
                Lancer l'assistant
              </Button>
              <Button
                size="md" variant="outline" borderColor={G.soft} color="white"
                _hover={{ bg: 'whiteAlpha.100' }}
                borderRadius="xl" fontWeight={600} px={6}
                rightIcon={<Icon as={FiBarChart2} />}
                onClick={() => onGoToCategory('direct')}
              >
                Catégorie 1
              </Button>
            </HStack>
          </HStack>
        </Box>

      </VStack>
    </Box>
  )
}

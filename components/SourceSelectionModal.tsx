'use client';

import React, { useEffect, useState } from 'react';
import {
  Box, Button, Checkbox, Flex, Heading, HStack, IconButton,
  Modal, ModalBody, ModalContent, ModalOverlay,
  Text, VStack, Badge, useToast,
} from '@chakra-ui/react';
import { supabase } from '../lib/supabaseClient';

/* ─── Palette ─── */
const C = {
  dark:   '#1B2E25',
  brand:  '#344E41',
  accent: '#588157',
  light:  '#A3B18A',
  soft:   '#DDE5E0',
  bg:     '#F5F6F4',
  border: '#E4E6E1',
  muted:  '#6B7A72',
  white:  '#FFFFFF',
};

/* ─── Source catalogue ─── */
const CAT1_SOURCES = [
  { code: '1A1', label: 'Combustion fixe',               desc: 'Chaudières, génératrices, chauffage gaz/mazout/propane' },
  { code: '2A1', label: 'Véhicules — factures',          desc: 'Carburant comptabilisé à partir des factures (L ou m³)' },
  { code: '2A3', label: 'Véhicules — coûts essence',     desc: 'Estimation à partir des montants dépensés en dollars' },
  { code: '2B1', label: 'Véhicules — distance',          desc: 'Par la distance (marque, modèle, année connus)' },
  { code: '4A1', label: 'Réfrigérants fixes',            desc: 'Fuites réfrigérants — équipements stationnaires' },
  { code: '4B1', label: 'Réfrigérants véhicules (moy.)', desc: 'Climatisation véhicules — moyenne industrie' },
  { code: '4B2', label: 'Réfrigérants véhicules (data)', desc: 'Climatisation véhicules — données précises du véhicule' },
];
const CAT2_SOURCES = [
  { code: '6A1', label: 'Électricité — Basé sur le réseau',  desc: 'Facteur régional du réseau électrique (ex. Hydro-Québec)' },
  { code: '6B1', label: 'Électricité — Basé sur le marché', desc: 'Contrat d\'énergie renouvelable ou certificat d\'attribut d\'énergie' },
];
const ALL_SOURCES = [...CAT1_SOURCES, ...CAT2_SOURCES];

/* ─── Decision tree ─── */
type StepType = 'yesno' | 'multiselect' | 'recap';

interface Option { code: string; label: string; desc: string }
interface StepDef {
  id:         string;
  question:   string;
  detail:     string;
  icon:       string;
  type:       StepType;
  // yesno
  yesSelect?:  string[];
  yesNext?:    string;
  noDeselect?: string[];
  noNext?:     string;
  // multiselect
  options?:   Option[];
  multiNext?: string;
}

const STEPS: Record<string, StepDef> = {
  combustion_fixe: {
    id: 'combustion_fixe',
    icon: '🔥',
    question: 'Votre organisation utilise-t-elle des combustibles fossiles pour des équipements fixes ?',
    detail: 'Chaudières, génératrices, fours industriels, chauffage au gaz naturel, mazout ou propane dans vos bâtiments.',
    type: 'yesno',
    yesSelect:  ['1A1'],
    yesNext:    'vehicules',
    noDeselect: ['1A1'],
    noNext:     'vehicules',
  },
  vehicules: {
    id: 'vehicules',
    icon: '🚗',
    question: 'Votre organisation possède ou utilise-t-elle des véhicules à moteur thermique ?',
    detail: 'Voitures de service, camionnettes, camions de livraison, machinerie mobile fonctionnant à l\'essence, au diesel ou au propane.',
    type: 'yesno',
    yesNext:    'vehicules_data',
    noDeselect: ['2A1', '2A3', '2B1', '4B1', '4B2'],
    noNext:     'refrigerants_fixes',
  },
  vehicules_data: {
    id: 'vehicules_data',
    icon: '📋',
    question: 'Quels types de données avez-vous pour vos véhicules ?',
    detail: 'Vous pouvez sélectionner plusieurs options — une même entreprise peut avoir différents types de données selon les véhicules.',
    type: 'multiselect',
    options: [
      { code: '2A1', label: 'Factures de carburant',   desc: 'Factures indiquant les litres ou m³ achetés (ex. reçus de plein d\'essence)' },
      { code: '2A3', label: 'Dépenses en dollars',      desc: 'Montants dépensés en carburant sans les quantités précises en volume' },
      { code: '2B1', label: 'Distance parcourue',       desc: 'Marque, modèle, année du véhicule et kilométrage parcouru connus' },
    ],
    multiNext: 'vehicules_refrig',
  },
  vehicules_refrig: {
    id: 'vehicules_refrig',
    icon: '❄️',
    question: 'Vos véhicules sont-ils équipés de systèmes de climatisation ?',
    detail: 'Les systèmes de climatisation contiennent des réfrigérants (HFC) qui peuvent générer des fuites.',
    type: 'yesno',
    yesNext:    'vehicules_refrig_data',
    noDeselect: ['4B1', '4B2'],
    noNext:     'refrigerants_fixes',
  },
  vehicules_refrig_data: {
    id: 'vehicules_refrig_data',
    icon: '🌡️',
    question: 'Pour la climatisation de vos véhicules, quels types de données avez-vous ?',
    detail: 'Vous pouvez sélectionner les deux si certains véhicules ont des données précises et d\'autres non.',
    type: 'multiselect',
    options: [
      { code: '4B2', label: 'Données précises',    desc: 'Marque, modèle, année et type de réfrigérant connus pour chaque véhicule' },
      { code: '4B1', label: 'Moyenne industrie',   desc: 'Données précises indisponibles — on applique un facteur moyen par catégorie de véhicule' },
    ],
    multiNext: 'refrigerants_fixes',
  },
  refrigerants_fixes: {
    id: 'refrigerants_fixes',
    icon: '🏭',
    question: 'Votre organisation utilise-t-elle des équipements de réfrigération ou de climatisation fixes ?',
    detail: 'Chambres froides, réfrigérateurs industriels, climatiseurs centraux, systèmes de refroidissement des bâtiments.',
    type: 'yesno',
    yesSelect:  ['4A1'],
    yesNext:    'propriete',
    noDeselect: ['4A1'],
    noNext:     'propriete',
  },
  propriete: {
    id: 'propriete',
    icon: '🏢',
    question: 'Votre organisation est-elle propriétaire de ses locaux ?',
    detail: 'Si vous êtes locataire, la consommation d\'électricité du bâtiment relève du propriétaire — vos émissions de Scope 2 (Cat. 2) ne s\'appliquent pas à votre périmètre organisationnel.',
    type: 'yesno',
    yesNext:    'electricite',
    noDeselect: ['6A1', '6B1'],
    noNext:     'recap',
  },
  electricite: {
    id: 'electricite',
    icon: '⚡',
    question: 'Votre organisation consomme-t-elle de l\'électricité du réseau public ?',
    detail: 'Factures d\'Hydro-Québec, Hydro One ou tout autre fournisseur d\'électricité du réseau de distribution.',
    type: 'yesno',
    yesSelect:  ['6A1'],
    yesNext:    'renouvelable',
    noDeselect: ['6A1'],
    noNext:     'renouvelable',
  },
  renouvelable: {
    id: 'renouvelable',
    icon: '🌿',
    question: 'Avez-vous un contrat d\'énergie renouvelable ou des certificats d\'attributs d\'énergie ?',
    detail: 'Contrats d\'achat direct d\'énergie verte, certificats d\'attributs d\'énergie (CAE), certificats verts ou ententes d\'achat d\'électricité renouvelable.',
    type: 'yesno',
    yesSelect:  ['6B1'],
    yesNext:    'recap',
    noDeselect: ['6B1'],
    noNext:     'recap',
  },
};

/* Progress: main steps only (not sub-steps) */
const MAIN_STEP_IDS = ['combustion_fixe', 'vehicules', 'refrigerants_fixes', 'propriete', 'electricite', 'renouvelable'];

/* ── Source row — defined outside to keep stable component identity ── */
function SourceRow({
  code, label, desc, isOn, onToggle,
}: { code: string; label: string; desc: string; isOn: boolean; onToggle: () => void }) {
  return (
    <Box
      px={3} py={2.5} borderRadius="lg" border="1.5px solid"
      borderColor={isOn ? C.accent : C.border}
      bg={isOn ? '#EEF5EE' : C.white}
      cursor="pointer"
      onClick={onToggle}
      transition="all 0.15s"
      _hover={{ borderColor: C.accent, bg: '#EEF5EE' }}
      position="relative"
    >
      <HStack align="start" spacing={2.5}>
        <Checkbox
          isChecked={isOn}
          colorScheme="green"
          onChange={onToggle}
          mt={0.5}
          onClick={e => e.stopPropagation()}
        />
        <Box flex={1} minW={0}>
          <HStack spacing={2} flexWrap="wrap">
            <Text fontSize="xs" fontWeight={700} color={isOn ? C.brand : C.muted}>{label}</Text>
            <Badge fontSize="9px" colorScheme={isOn ? 'green' : 'gray'} variant="subtle" borderRadius="sm">{code}</Badge>
          </HStack>
          <Text fontSize="xs" color={C.muted} mt={0.5} lineHeight="1.4">{desc}</Text>
        </Box>
      </HStack>
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════ */
export default function SourceSelectionModal({
  forceOpen = false,
  onClose,
}: {
  forceOpen?: boolean;
  onClose?: () => void;
} = {}) {
  const [show, setShow]             = useState(false);
  const [companyId, setCompanyId]   = useState<string | null>(null);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [stepId, setStepId]         = useState('combustion_fixe');
  const [history, setHistory]       = useState<string[]>([]);
  const [multiTemp, setMultiTemp]   = useState<Set<string>>(new Set());
  const [isRecap, setIsRecap]       = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [answers, setAnswers]       = useState<Record<string, 'yes' | 'no' | string[]>>({});
  const toast = useToast();

  /* ── force-open from parent ── */
  useEffect(() => {
    if (!forceOpen) return;
    setSelected(new Set());
    setStepId('combustion_fixe');
    setHistory([]);
    setMultiTemp(new Set());
    setIsRecap(false);
    setAnswers({});
    setShow(true);
  }, [forceOpen]);

  /* ── auto trigger check ── */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles').select('company_id').eq('id', user.id).single();
      if (!profile?.company_id) return;
      const cid = profile.company_id;
      setCompanyId(cid);

      if (typeof window !== 'undefined' && localStorage.getItem(`cq_scope_configured_${cid}`)) return;

      const res  = await fetch(`/api/source-visibility?user_id=${user.id}`);
      const data = await res.json();
      const sourceVis: Record<string, Record<string, boolean>> = data.sourceVisibility || {};
      const anyHidden = Object.values(sourceVis).some(pv => Object.values(pv).some(v => v === true));
      if (anyHidden) {
        if (typeof window !== 'undefined') localStorage.setItem(`cq_scope_configured_${cid}`, '1');
        return;
      }

      setSelected(new Set());
      setShow(true);
    })();
  }, []);

  /* ── navigation ── */
  const goTo = (next: string) => {
    setHistory(prev => [...prev, stepId]);
    if (next === 'recap') { setIsRecap(true); }
    else { setStepId(next); setMultiTemp(new Set()); }
  };

  const goBack = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setIsRecap(false);
    setStepId(prev);
    // Restore multiselect state from saved answer
    const prevAnswer = answers[prev];
    const prevStep = STEPS[prev];
    if (prevStep?.type === 'multiselect' && Array.isArray(prevAnswer)) {
      setMultiTemp(new Set(prevAnswer));
    } else {
      setMultiTemp(new Set());
    }
  };

  /* ── yes/no handlers ── */
  const handleYes = () => {
    const step = STEPS[stepId];
    if (!step || step.type !== 'yesno') return;
    if (step.yesSelect) {
      setSelected(prev => { const n = new Set(prev); step.yesSelect!.forEach(c => n.add(c)); return n; });
    }
    setAnswers(prev => ({ ...prev, [stepId]: 'yes' }));
    goTo(step.yesNext!);
  };

  const handleNo = () => {
    const step = STEPS[stepId];
    if (!step || step.type !== 'yesno') return;
    if (step.noDeselect) {
      setSelected(prev => { const n = new Set(prev); step.noDeselect!.forEach(c => n.delete(c)); return n; });
    }
    setAnswers(prev => ({ ...prev, [stepId]: 'no' }));
    goTo(step.noNext!);
  };

  /* ── multi-select handler ── */
  const toggleMulti = (code: string) => {
    setMultiTemp(prev => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });
  };

  const handleMultiContinue = () => {
    const step = STEPS[stepId];
    if (!step || step.type !== 'multiselect') return;
    const allCodes = step.options!.map(o => o.code);
    setSelected(prev => {
      const n = new Set(prev);
      allCodes.forEach(c => multiTemp.has(c) ? n.add(c) : n.delete(c));
      return n;
    });
    setAnswers(prev => ({ ...prev, [stepId]: Array.from(multiTemp) }));
    goTo(step.multiNext!);
  };

  /* ── manual toggle (always allowed, in recap especially) ── */
  const toggleSource = (code: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });
  };

  /* ── confirm ── */
  const handleConfirm = async () => {
    if (!companyId) return;
    setConfirming(true);
    try {
      const resp = await fetch('/api/admin/bulk-source-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, visible_sources: Array.from(selected) }),
      });
      if (!resp.ok) throw new Error((await resp.json()).error || 'Erreur serveur');
      if (typeof window !== 'undefined') localStorage.setItem(`cq_scope_configured_${companyId}`, '1');
      toast({ title: 'Configuration sauvegardée ✓', status: 'success', duration: 3000 });
      setShow(false);
      onClose?.();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, status: 'error', duration: 5000 });
    } finally {
      setConfirming(false);
    }
  };

  const handleSkip = () => {
    if (companyId && typeof window !== 'undefined') localStorage.setItem(`cq_scope_configured_${companyId}`, '1');
    setShow(false);
    onClose?.();
  };

  if (!show) return null;

  const step = STEPS[stepId];

  /* progress */
  const mainIdx    = MAIN_STEP_IDS.indexOf(isRecap ? 'recap' : MAIN_STEP_IDS.find(id => history.includes(id) || id === stepId) || stepId);
  const progressPct = isRecap ? 100 : Math.round(((MAIN_STEP_IDS.indexOf(stepId.startsWith('vehicules') && stepId !== 'vehicules' ? 'vehicules' : stepId) + 1) / (MAIN_STEP_IDS.length + 1)) * 100);

  return (
    <Modal isOpen={show} onClose={handleSkip} size="6xl" scrollBehavior="inside" isCentered>
      <ModalOverlay bg="rgba(0,0,0,0.60)" backdropFilter="blur(4px)" />
      <ModalContent borderRadius="2xl" overflow="hidden" maxH="92vh" mx={4} border={`1px solid ${C.border}`}>

        {/* ── Header ── */}
        <Box bgGradient={`linear(135deg, ${C.dark}, ${C.brand})`} px={6} py={5}>
          <HStack justify="space-between" align="start">
            <Box>
              <HStack spacing={2} mb={1}>
                <Text fontSize="20px">🌿</Text>
                <Heading size="md" color={C.white} fontWeight={700}>
                  Identification des sources d'émissions
                </Heading>
              </HStack>
              <Text fontSize="sm" color={C.soft} maxW="520px" lineHeight="1.5">
                Répondez aux questions pour configurer votre périmètre selon{' '}
                <Text as="span" fontWeight={600} color={C.light}>ISO 14064-1</Text>.
              </Text>
            </Box>
            <IconButton
              aria-label="Fermer" icon={<Text fontSize="lg" color={C.soft}>✕</Text>}
              variant="ghost" size="sm" onClick={handleSkip}
              _hover={{ bg: 'rgba(255,255,255,0.1)' }}
            />
          </HStack>

          {/* Progress bar */}
          <Box mt={4}>
            <HStack justify="space-between" mb={1.5}>
              <HStack spacing={3}>
                {MAIN_STEP_IDS.map((id, i) => {
                  const visited = history.some(h => h === id || h.startsWith(id.replace('vehicules', 'vehicules')));
                  const current = stepId === id || (id === 'vehicules' && stepId.startsWith('vehicules'));
                  const done = isRecap || visited;
                  return (
                    <Box key={id}
                      w="8px" h="8px" borderRadius="full"
                      bg={done ? C.light : current ? C.white : 'rgba(255,255,255,0.25)'}
                      transition="all 0.3s"
                    />
                  );
                })}
                {isRecap && <Box w="8px" h="8px" borderRadius="full" bg={C.light} />}
              </HStack>
              <Text fontSize="xs" color={C.soft}>
                {isRecap ? 'Récapitulatif' : `Étape ${Math.min(MAIN_STEP_IDS.indexOf(stepId.startsWith('vehicules') ? 'vehicules' : stepId) + 1, MAIN_STEP_IDS.length)} sur ${MAIN_STEP_IDS.length}`}
              </Text>
            </HStack>
            <Box h="3px" borderRadius="full" bg="rgba(255,255,255,0.2)" overflow="hidden">
              <Box h="100%" borderRadius="full" bg={C.light} w={`${progressPct}%`} transition="width 0.4s" />
            </Box>
          </Box>
        </Box>

        <ModalBody p={0} overflow="hidden">
          <Flex h={{ base: 'auto', md: '520px' }} overflow="hidden" direction={{ base: 'column', md: 'row' }}>

            {/* ── LEFT: Decision tree ── */}
            <Flex
              direction="column"
              w={{ base: '100%', md: '55%' }}
              borderRight={{ md: `1px solid ${C.border}` }}
              bg={C.white}
              overflow="hidden"
            >
              {isRecap ? (
                /* ─ Recap panel ─ */
                <Flex direction="column" flex={1} px={5} py={5} overflowY="auto">
                  <HStack mb={4} spacing={2}>
                    <Text fontSize="xl">✅</Text>
                    <Heading size="sm" color={C.brand}>Récapitulatif — cochez / décochez</Heading>
                  </HStack>
                  <Text fontSize="xs" color={C.muted} mb={4} lineHeight="1.6">
                    Activez ou désactivez chaque méthodologie directement ici ou à droite avant de confirmer.
                  </Text>

                  <Box mb={3}>
                    <HStack mb={2} spacing={2}>
                      <Box w="3px" h="14px" bg={C.brand} borderRadius="full" />
                      <Text fontSize="xs" fontWeight={700} color={C.brand} textTransform="uppercase" letterSpacing="0.06em">
                        Catégorie 1 — Scope 1
                      </Text>
                    </HStack>
                    <VStack spacing={1.5} align="stretch">
                      {CAT1_SOURCES.map(s => <SourceRow key={s.code} {...s} isOn={selected.has(s.code)} onToggle={() => toggleSource(s.code)} />)}
                    </VStack>
                  </Box>

                  <Box>
                    <HStack mb={2} spacing={2}>
                      <Box w="3px" h="14px" bg={C.accent} borderRadius="full" />
                      <Text fontSize="xs" fontWeight={700} color={C.brand} textTransform="uppercase" letterSpacing="0.06em">
                        Catégorie 2 — Scope 2
                      </Text>
                    </HStack>
                    <VStack spacing={1.5} align="stretch">
                      {CAT2_SOURCES.map(s => <SourceRow key={s.code} {...s} isOn={selected.has(s.code)} onToggle={() => toggleSource(s.code)} />)}
                    </VStack>
                  </Box>
                </Flex>
              ) : step ? (
                /* ─ Question panel ─ */
                <Flex direction="column" flex={1} px={6} py={6}>
                  {/* Question */}
                  <Box mb={6}>
                    <Text fontSize="2xl" mb={3}>{step.icon}</Text>
                    <Heading size="sm" color={C.dark} mb={2} lineHeight="1.4">
                      {step.question}
                    </Heading>
                    <Text fontSize="sm" color={C.muted} lineHeight="1.6">
                      {step.detail}
                    </Text>
                  </Box>

                  {/* Answers */}
                  {step.type === 'yesno' && (() => {
                    const prev = answers[stepId];
                    return (
                      <VStack spacing={3} align="stretch" mt="auto">
                        <Button
                          size="lg"
                          bg={prev === 'yes' ? C.dark : C.brand}
                          color={C.white}
                          borderRadius="xl"
                          fontWeight={700}
                          _hover={{ bg: C.accent }}
                          onClick={handleYes}
                          leftIcon={<Text>{prev === 'yes' ? '✅' : '◻️'}</Text>}
                          boxShadow={prev === 'yes' ? `0 0 0 3px ${C.light}` : 'none'}
                        >
                          Oui
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          borderColor={prev === 'no' ? C.brand : C.border}
                          borderWidth={prev === 'no' ? '2px' : '1px'}
                          color={C.brand}
                          bg={prev === 'no' ? C.soft : C.bg}
                          borderRadius="xl"
                          fontWeight={700}
                          _hover={{ bg: C.soft, borderColor: C.accent }}
                          onClick={handleNo}
                          leftIcon={<Text>{prev === 'no' ? '✅' : '◻️'}</Text>}
                          boxShadow={prev === 'no' ? `0 0 0 3px ${C.light}` : 'none'}
                        >
                          Non
                        </Button>
                      </VStack>
                    );
                  })()}

                  {step.type === 'multiselect' && (
                    <Flex direction="column" flex={1} justify="space-between">
                      <VStack spacing={2} align="stretch" mb={4}>
                        {step.options!.map(opt => {
                          const isOn = multiTemp.has(opt.code);
                          return (
                            <Box
                              key={opt.code}
                              px={4} py={3}
                              borderRadius="xl"
                              border="1.5px solid"
                              borderColor={isOn ? C.accent : C.border}
                              bg={isOn ? '#EEF5EE' : C.bg}
                              cursor="pointer"
                              onClick={() => toggleMulti(opt.code)}
                              transition="all 0.15s"
                              _hover={{ borderColor: C.accent }}
                            >
                              <HStack spacing={3} align="start">
                                <Checkbox
                                  isChecked={isOn}
                                  colorScheme="green"
                                  onChange={() => toggleMulti(opt.code)}
                                  mt={0.5}
                                  onClick={e => e.stopPropagation()}
                                />
                                <Box>
                                  <Text fontSize="sm" fontWeight={700} color={C.brand}>{opt.label}</Text>
                                  <Text fontSize="xs" color={C.muted} mt={0.5} lineHeight="1.4">{opt.desc}</Text>
                                </Box>
                              </HStack>
                            </Box>
                          );
                        })}
                      </VStack>
                      <Button
                        size="md"
                        bg={C.brand}
                        color={C.white}
                        borderRadius="xl"
                        fontWeight={700}
                        _hover={{ bg: C.accent }}
                        onClick={handleMultiContinue}
                        isDisabled={multiTemp.size === 0}
                      >
                        Continuer →
                      </Button>
                    </Flex>
                  )}
                </Flex>
              ) : null}

              {/* Back button */}
              {history.length > 0 && (
                <Box px={6} py={3} borderTop={`1px solid ${C.border}`}>
                  <Button
                    size="sm" variant="ghost" color={C.muted}
                    leftIcon={<Text fontSize="xs">←</Text>}
                    onClick={goBack}
                  >
                    Question précédente
                  </Button>
                </Box>
              )}
            </Flex>

            {/* ── RIGHT: Live source list ── */}
            <Flex
              direction="column"
              w={{ base: '100%', md: '45%' }}
              overflowY="auto"
              px={4} py={4}
              gap={4}
              bg={isRecap ? '#F8FBF8' : C.bg}
            >
              {!isRecap && (
                <HStack px={1} spacing={2}>
                  <Box w="8px" h="8px" borderRadius="full" bg={selected.size > 0 ? C.accent : C.border} />
                  <Text fontSize="xs" color={C.muted}>
                    <Text as="span" fontWeight={700} color={C.brand}>{selected.size}</Text>
                    {' '}source{selected.size !== 1 ? 's' : ''} identifiée{selected.size !== 1 ? 's' : ''} jusqu'ici
                  </Text>
                </HStack>
              )}
              {isRecap && (
                <Box px={3} py={2} borderRadius="lg" bg={C.brand}>
                  <Text fontSize="xs" fontWeight={700} color={C.white}>Cochez ou décochez librement</Text>
                </Box>
              )}

              <Box>
                <HStack mb={2.5} spacing={2}>
                  <Box w="3px" h="16px" bg={C.brand} borderRadius="full" />
                  <Heading size="xs" color={C.brand} textTransform="uppercase" letterSpacing="0.06em">Catégorie 1 — Scope 1</Heading>
                  <Badge colorScheme="green" fontSize="9px" variant="subtle">Direct</Badge>
                </HStack>
                <VStack spacing={2} align="stretch">
                  {CAT1_SOURCES.map(s => <SourceRow key={s.code} {...s} isOn={selected.has(s.code)} onToggle={() => toggleSource(s.code)} />)}
                </VStack>
              </Box>

              <Box>
                <HStack mb={2.5} spacing={2}>
                  <Box w="3px" h="16px" bg={C.accent} borderRadius="full" />
                  <Heading size="xs" color={C.brand} textTransform="uppercase" letterSpacing="0.06em">Catégorie 2 — Scope 2</Heading>
                  <Badge colorScheme="teal" fontSize="9px" variant="subtle">Énergie importée</Badge>
                </HStack>
                <VStack spacing={2} align="stretch">
                  {CAT2_SOURCES.map(s => <SourceRow key={s.code} {...s} isOn={selected.has(s.code)} onToggle={() => toggleSource(s.code)} />)}
                </VStack>
              </Box>

              <Box mt="auto" pt={3} borderTop={`1px solid ${C.border}`}>
                <Text fontSize="10px" color={C.muted} lineHeight="1.5">
                  Les sources non sélectionnées seront masquées pour tous les utilisateurs de votre entreprise.
                  Modifiable depuis l'onglet Entreprise.
                </Text>
              </Box>
            </Flex>
          </Flex>

          {/* ── Footer ── */}
          <Flex px={5} py={3.5} borderTop={`1px solid ${C.border}`} bg={C.bg} justify="space-between" align="center">
            <Text fontSize="xs" color={C.muted}>
              {`${selected.size} source${selected.size !== 1 ? 's' : ''} sélectionnée${selected.size !== 1 ? 's' : ''}`}
            </Text>
            <HStack spacing={3}>
              <Button variant="ghost" size="sm" color={C.muted} fontWeight={500} onClick={handleSkip}>
                Configurer plus tard
              </Button>
              <Button
                size="sm" bg={C.accent} color={C.white} fontWeight={700} px={6}
                borderRadius="lg" _hover={{ bg: C.dark }}
                isLoading={confirming} loadingText="Sauvegarde…"
                isDisabled={selected.size === 0}
                onClick={handleConfirm}
              >
                ✓ Sauvegarder
              </Button>
            </HStack>
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

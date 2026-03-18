'use client'
import React, { useState } from "react";
import {
  Box, Button, Input, VStack, HStack, Text, Heading,
  IconButton, Select, Badge, Flex, Grid, GridItem,
} from "@chakra-ui/react";
import { supabase } from "../../../lib/supabaseClient";

/* ─── Palette ─── */
const G = {
  brand:  "#344E41",
  accent: "#588157",
  soft:   "#DDE5E0",
  bg:     "#F5F6F4",
  border: "#E4E6E1",
  muted:  "#6B7A72",
  white:  "#FFFFFF",
  error:  "#E53E3E",
};

/* ─── Types ─── */
interface CompanyInfoFormProps {
  userId: string;
  onComplete: (payload?: { companyName?: string }) => void;
}
type Poste         = { id: string; label: string; num: number; enabled: boolean; company_id: string };
type PosteInsert   = { label: string; num: number; enabled: boolean; company_id: string };
type PostSrcInsert = { poste_id: string; source_code: string; label: string; enabled: boolean };
type Lieu          = { nom: string; description: string; adresse: string };
type ProdItem      = { nom: string; description: string; quantite: string; unite: string };
type SvcItem       = { nom: string; description: string; quantite: string; unite: string };

const emptyLieu: Lieu    = { nom: "", description: "", adresse: "" };
const emptyProd: ProdItem = { nom: "", description: "", quantite: "", unite: "" };
const emptySvc: SvcItem  = { nom: "", description: "", quantite: "", unite: "" };

const STEPS = [
  { num: 1, label: "Entreprise"  },
  { num: 2, label: "Sites"       },
  { num: 3, label: "Produits"    },
  { num: 4, label: "Services"    },
]

/* ══════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════ */
export default function CompanyInfoForm({ userId, onComplete }: CompanyInfoFormProps) {
  const [step,     setStep]     = useState(1);
  const [company,  setCompany]  = useState("");
  const [lieux,    setLieux]    = useState<Lieu[]>([{ ...emptyLieu }]);
  const [products, setProducts] = useState<ProdItem[]>([{ ...emptyProd }]);
  const [services, setServices] = useState<SvcItem[]>([{ ...emptySvc }]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  /* ── helpers ── */
  const updLieu = <K extends keyof Lieu>(i: number, k: K, v: Lieu[K]) =>
    setLieux(p => { const c = [...p]; c[i] = { ...c[i], [k]: v }; return c; });
  const updProd = <K extends keyof ProdItem>(i: number, k: K, v: ProdItem[K]) =>
    setProducts(p => { const c = [...p]; c[i] = { ...c[i], [k]: v }; return c; });
  const updSvc  = <K extends keyof SvcItem>(i: number, k: K, v: SvcItem[K]) =>
    setServices(p => { const c = [...p]; c[i] = { ...c[i], [k]: v }; return c; });

  const removeRow = <T,>(arr: T[], set: (v: T[]) => void, i: number) => {
    if (arr.length > 1) set([...arr.slice(0, i), ...arr.slice(i + 1)]);
  };

  /* ── submit ── */
  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      /* 1) Company */
      const { data: co, error: coErr } = await supabase
        .from("companies")
        .insert([{
          name: company.trim(),
          production_sites: lieux.filter(l => l.nom.trim()),
          products: products.filter(p => p.nom.trim()),
          services: services.filter(s => s.nom.trim()),
        }])
        .select().single();
      if (coErr) throw new Error(coErr.message);

      /* 2) Postes */
      const postesRows: PosteInsert[] = [
        { label: "Catégorie 1 - Émissions directes",                                       num: 1, enabled: true, company_id: co.id },
        { label: "Catégorie 2 - Émissions indirectes de l'énergie importée",               num: 2, enabled: true, company_id: co.id },
        { label: "Catégorie 3 - Émissions indirectes des transports",                      num: 3, enabled: true, company_id: co.id },
        { label: "Catégorie 4 - Émissions indirectes hors énergie et transport",           num: 4, enabled: true, company_id: co.id },
        { label: "Catégorie 5 - Émissions indirectes liées à l'utilisation des produits",  num: 5, enabled: true, company_id: co.id },
        { label: "Catégorie 6 - Autres émissions indirectes",                              num: 6, enabled: true, company_id: co.id },
      ];
      const { data: postesData, error: postesErr } = await supabase.from("postes").insert(postesRows).select();
      if (postesErr) throw new Error(postesErr.message);

      /* 3) Poste IDs */
      const byNum: Record<number, Poste> = {};
      (postesData as Poste[]).forEach(p => { byNum[p.num] = p; });
      const [p1, p2, p3, p4, p5, p6] = [1,2,3,4,5,6].map(n => byNum[n]?.id);
      if (!p1||!p2||!p3||!p4||!p5||!p6) throw new Error("Erreur de création des postes");

      /* 4) Sources */
      const sources: PostSrcInsert[] = [
        /* Cat 1 */ { poste_id: p1, source_code: "1A1",   label: "Quantité de combustible comptabilisé à partir des factures", enabled: true },
                    { poste_id: p1, source_code: "2A1",   label: "Quantité de combustible comptabilisé à partir des factures", enabled: true },
                    { poste_id: p1, source_code: "2B1",   label: "Par la distance parcourue (Marque, modèle, année connus)",   enabled: true },
                    { poste_id: p1, source_code: "2A3",   label: "À partir des coûts d'essence",                               enabled: true },
                    { poste_id: p1, source_code: "4A1",   label: "Quantité rapportée par le frigoriste",                       enabled: true },
                    { poste_id: p1, source_code: "4B1",   label: "Moyenne de l'industrie (climatisation véhicules)",           enabled: true },
                    { poste_id: p1, source_code: "4B2",   label: "Données des véhicules (climatisation véhicules)",            enabled: true },
        /* Cat 2 */ { poste_id: p2, source_code: "6A1",   label: "Quantité d'électricité — Location-based",                   enabled: true },
                    { poste_id: p2, source_code: "6B1",   label: "Quantité d'électricité — Market-based",                     enabled: true },
        /* Cat 3 */ { poste_id: p3, source_code: "3A1",   label: "Navettage des employés",                                    enabled: true },
        /* Cat 4 */ { poste_id: p4, source_code: "4.1A2", label: "Appareils numériques (achetés cette période)",              enabled: true },
                    { poste_id: p4, source_code: "4.1B1", label: "Réseaux et transfert de données",                           enabled: true },
                    { poste_id: p4, source_code: "4.1C1", label: "Salles de serveurs (consommation électrique)",              enabled: true },
                    { poste_id: p4, source_code: "4.1D1", label: "Papier d'imprimante",                                       enabled: true },
                    { poste_id: p4, source_code: "4.1E1", label: "Cartouches d'encre et toner",                               enabled: true },
                    { poste_id: p4, source_code: "4.1E2", label: "Piles et batteries",                                        enabled: true },
                    { poste_id: p4, source_code: "4.3A1", label: "Traitement des eaux usées",                                 enabled: true },
        /* Cat 5 */ { poste_id: p5, source_code: "5.1A1", label: "Produits vendus consommant de l'électricité",              enabled: true },
                    { poste_id: p5, source_code: "5.1B1", label: "Produits vendus consommant des combustibles",               enabled: true },
                    { poste_id: p5, source_code: "5.2A1", label: "Mise en décharge des produits vendus",                     enabled: true },
                    { poste_id: p5, source_code: "5.2B1", label: "Recyclage / incinération des produits vendus",             enabled: true },
        /* Cat 6 — sources à définir */
      ];
      const { error: srcErr } = await supabase.from("poste_sources").insert(sources);
      if (srcErr) throw new Error(srcErr.message);

      /* 5) Visibility */
      await supabase.from("poste_visibility").insert(
        (postesData as Poste[]).map(p => ({ user_id: userId, poste_id: p.id, is_hidden: false }))
      );
      await supabase.from("poste_source_visibility").insert(
        sources.map(s => ({ user_id: userId, poste_id: s.poste_id, source_code: s.source_code, is_hidden: false }))
      );

      /* 6) User profile */
      const { error: profErr } = await supabase.from("user_profiles").upsert(
        [{ id: userId, company_id: co.id, role: "admin" }],
        { onConflict: "id" }
      );
      if (profErr) throw new Error(profErr.message);

      onComplete({ companyName: company.trim() });
    } catch (err: any) {
      setError(err?.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  /* ══════════ RENDER ══════════ */
  return (
    <Box
      w="full" maxW="680px" mx="auto"
      bg={G.white} borderRadius="24px"
      boxShadow="0 20px 60px rgba(0,0,0,0.12)"
      overflow="hidden"
    >
      {/* ── Header ── */}
      <Box bgGradient={`linear(135deg, #1B2E25 0%, ${G.brand} 100%)`} px={8} pt={8} pb={6}>
        <Text fontSize="xs" fontWeight="700" color="rgba(255,255,255,0.55)" letterSpacing="widest" textTransform="uppercase" mb={2}>
          Carbone Québec
        </Text>
        <Heading fontSize="xl" color="white" fontWeight="800" mb={1}>
          Configurez votre organisation
        </Heading>
        <Text fontSize="sm" color="rgba(255,255,255,0.6)">
          Ces informations seront utilisées dans votre bilan GES.
        </Text>

        {/* Step indicator */}
        <HStack spacing={0} mt={5}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.num}>
              <VStack spacing={1} flex="1">
                <Flex
                  w="32px" h="32px" borderRadius="full" align="center" justify="center"
                  bg={step >= s.num ? G.soft : "rgba(255,255,255,0.15)"}
                  color={step >= s.num ? G.brand : "rgba(255,255,255,0.4)"}
                  fontWeight="800" fontSize="xs"
                  transition="all 0.3s"
                >
                  {step > s.num ? "✓" : s.num}
                </Flex>
                <Text fontSize="9px" fontWeight="600"
                  color={step >= s.num ? G.soft : "rgba(255,255,255,0.35)"}
                  textTransform="uppercase" letterSpacing="wider">
                  {s.label}
                </Text>
              </VStack>
              {i < STEPS.length - 1 && (
                <Box flex="1" h="2px" mb={4}
                  bg={step > s.num ? G.soft : "rgba(255,255,255,0.15)"}
                  transition="all 0.3s" />
              )}
            </React.Fragment>
          ))}
        </HStack>
      </Box>

      {/* ── Body ── */}
      <Box px={8} py={7}>
        {error && (
          <Box mb={4} p={3} bg="red.50" borderRadius="10px" border="1px solid" borderColor="red.200">
            <Text color={G.error} fontSize="sm">{error}</Text>
          </Box>
        )}

        {/* ── STEP 1 : Entreprise ── */}
        {step === 1 && (
          <VStack spacing={5} align="stretch">
            <Box>
              <Text fontSize="sm" fontWeight="700" color={G.brand} mb={1}>Nom de l&apos;entreprise *</Text>
              <Input
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="ex : Acme Québec inc."
                size="md" borderRadius="10px"
                borderColor={G.border}
                _focus={{ borderColor: G.accent, boxShadow: `0 0 0 3px rgba(88,129,87,0.15)` }}
              />
            </Box>
          </VStack>
        )}

        {/* ── STEP 2 : Lieux de production ── */}
        {step === 2 && (
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between">
              <Box>
                <Text fontSize="sm" fontWeight="700" color={G.brand}>Sites de production</Text>
                <Text fontSize="xs" color={G.muted}>Ajoutez vos lieux d&apos;exploitation.</Text>
              </Box>
              <Button size="xs" bg={G.brand} color="white" borderRadius="full" px={4}
                _hover={{ bg: G.accent }} onClick={() => setLieux(p => [...p, { ...emptyLieu }])}>
                + Ajouter
              </Button>
            </HStack>

            {lieux.map((lieu, i) => (
              <Box key={i} p={4} bg={G.bg} borderRadius="12px" border={`1px solid ${G.border}`} position="relative">
                <Badge position="absolute" top={3} left={4} bg={G.soft} color={G.brand}
                  fontSize="9px" fontWeight="800" borderRadius="6px">
                  Site {i + 1}
                </Badge>
                {lieux.length > 1 && (
                  <IconButton aria-label="Supprimer" size="xs" variant="ghost"
                    position="absolute" top={2} right={2}
                    icon={<Text fontSize="md" lineHeight={1} color={G.muted}>×</Text>}
                    onClick={() => removeRow(lieux, setLieux, i)} />
                )}
                <Grid templateColumns="1fr 1fr" gap={3} mt={5}>
                  <GridItem colSpan={1}>
                    <Text fontSize="xs" fontWeight="600" color={G.muted} mb={1}>Nom</Text>
                    <Input size="sm" borderRadius="8px" borderColor={G.border} value={lieu.nom}
                      _focus={{ borderColor: G.accent }} placeholder="Bureau principal"
                      onChange={e => updLieu(i, "nom", e.target.value)} />
                  </GridItem>
                  <GridItem colSpan={1}>
                    <Text fontSize="xs" fontWeight="600" color={G.muted} mb={1}>Description</Text>
                    <Input size="sm" borderRadius="8px" borderColor={G.border} value={lieu.description}
                      _focus={{ borderColor: G.accent }} placeholder="Siège social"
                      onChange={e => updLieu(i, "description", e.target.value)} />
                  </GridItem>
                  <GridItem colSpan={2}>
                    <Text fontSize="xs" fontWeight="600" color={G.muted} mb={1}>Adresse</Text>
                    <Input size="sm" borderRadius="8px" borderColor={G.border} value={lieu.adresse}
                      _focus={{ borderColor: G.accent }} placeholder="123 rue Principale, Montréal, QC"
                      onChange={e => updLieu(i, "adresse", e.target.value)} />
                  </GridItem>
                </Grid>
              </Box>
            ))}
          </VStack>
        )}

        {/* ── STEP 3 : Produits ── */}
        {step === 3 && (
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between">
              <Box>
                <Text fontSize="sm" fontWeight="700" color={G.brand}>Produits</Text>
                <Text fontSize="xs" color={G.muted}>Les produits fabriqués ou vendus par votre organisation.</Text>
              </Box>
              <Button size="xs" bg={G.brand} color="white" borderRadius="full" px={4}
                _hover={{ bg: G.accent }} onClick={() => setProducts(p => [...p, { ...emptyProd }])}>
                + Ajouter
              </Button>
            </HStack>

            {products.map((prod, i) => (
              <Box key={i} p={4} bg={G.bg} borderRadius="12px" border={`1px solid ${G.border}`} position="relative">
                <Badge position="absolute" top={3} left={4} bg={G.soft} color={G.brand}
                  fontSize="9px" fontWeight="800" borderRadius="6px">
                  Produit {i + 1}
                </Badge>
                {products.length > 1 && (
                  <IconButton aria-label="Supprimer" size="xs" variant="ghost"
                    position="absolute" top={2} right={2}
                    icon={<Text fontSize="md" lineHeight={1} color={G.muted}>×</Text>}
                    onClick={() => removeRow(products, setProducts, i)} />
                )}
                <Grid templateColumns="1fr 1fr" gap={3} mt={5}>
                  <GridItem colSpan={1}>
                    <Text fontSize="xs" fontWeight="600" color={G.muted} mb={1}>Nom</Text>
                    <Input size="sm" borderRadius="8px" borderColor={G.border} value={prod.nom}
                      _focus={{ borderColor: G.accent }} placeholder="Produit A"
                      onChange={e => updProd(i, "nom", e.target.value)} />
                  </GridItem>
                  <GridItem colSpan={1}>
                    <Text fontSize="xs" fontWeight="600" color={G.muted} mb={1}>Description</Text>
                    <Input size="sm" borderRadius="8px" borderColor={G.border} value={prod.description}
                      _focus={{ borderColor: G.accent }} placeholder="Description courte"
                      onChange={e => updProd(i, "description", e.target.value)} />
                  </GridItem>
                  <GridItem colSpan={1}>
                    <Text fontSize="xs" fontWeight="600" color={G.muted} mb={1}>Quantité</Text>
                    <Input size="sm" borderRadius="8px" borderColor={G.border} value={prod.quantite}
                      _focus={{ borderColor: G.accent }} placeholder="ex : 500"
                      onChange={e => updProd(i, "quantite", e.target.value)} />
                  </GridItem>
                  <GridItem colSpan={1}>
                    <Text fontSize="xs" fontWeight="600" color={G.muted} mb={1}>Unité</Text>
                    <Select size="sm" borderRadius="8px" borderColor={G.border} value={prod.unite}
                      _focus={{ borderColor: G.accent }}
                      onChange={e => updProd(i, "unite", e.target.value)}>
                      <option value="">— Choisir —</option>
                      <option value="kg">kg</option>
                      <option value="lb">lb</option>
                      <option value="t">tonnes</option>
                      <option value="L">litres</option>
                      <option value="m">mètres</option>
                      <option value="ft">pieds</option>
                      <option value="kWh">kWh</option>
                      <option value="unité">unité</option>
                    </Select>
                  </GridItem>
                </Grid>
              </Box>
            ))}
          </VStack>
        )}

        {/* ── STEP 4 : Services ── */}
        {step === 4 && (
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between">
              <Box>
                <Text fontSize="sm" fontWeight="700" color={G.brand}>Services</Text>
                <Text fontSize="xs" color={G.muted}>Les services offerts par votre organisation.</Text>
              </Box>
              <Button size="xs" bg={G.brand} color="white" borderRadius="full" px={4}
                _hover={{ bg: G.accent }} onClick={() => setServices(p => [...p, { ...emptySvc }])}>
                + Ajouter
              </Button>
            </HStack>

            {services.map((svc, i) => (
              <Box key={i} p={4} bg={G.bg} borderRadius="12px" border={`1px solid ${G.border}`} position="relative">
                <Badge position="absolute" top={3} left={4} bg={G.soft} color={G.brand}
                  fontSize="9px" fontWeight="800" borderRadius="6px">
                  Service {i + 1}
                </Badge>
                {services.length > 1 && (
                  <IconButton aria-label="Supprimer" size="xs" variant="ghost"
                    position="absolute" top={2} right={2}
                    icon={<Text fontSize="md" lineHeight={1} color={G.muted}>×</Text>}
                    onClick={() => removeRow(services, setServices, i)} />
                )}
                <Grid templateColumns="1fr 1fr" gap={3} mt={5}>
                  <GridItem colSpan={1}>
                    <Text fontSize="xs" fontWeight="600" color={G.muted} mb={1}>Nom</Text>
                    <Input size="sm" borderRadius="8px" borderColor={G.border} value={svc.nom}
                      _focus={{ borderColor: G.accent }} placeholder="Conseil en durabilité"
                      onChange={e => updSvc(i, "nom", e.target.value)} />
                  </GridItem>
                  <GridItem colSpan={1}>
                    <Text fontSize="xs" fontWeight="600" color={G.muted} mb={1}>Description</Text>
                    <Input size="sm" borderRadius="8px" borderColor={G.border} value={svc.description}
                      _focus={{ borderColor: G.accent }} placeholder="Description courte"
                      onChange={e => updSvc(i, "description", e.target.value)} />
                  </GridItem>
                  <GridItem colSpan={1}>
                    <Text fontSize="xs" fontWeight="600" color={G.muted} mb={1}>Quantité</Text>
                    <Input size="sm" borderRadius="8px" borderColor={G.border} value={svc.quantite}
                      _focus={{ borderColor: G.accent }} placeholder="ex : 200"
                      onChange={e => updSvc(i, "quantite", e.target.value)} />
                  </GridItem>
                  <GridItem colSpan={1}>
                    <Text fontSize="xs" fontWeight="600" color={G.muted} mb={1}>Unité</Text>
                    <Input size="sm" borderRadius="8px" borderColor={G.border} value={svc.unite}
                      _focus={{ borderColor: G.accent }} placeholder="ex : heures, mandats…"
                      onChange={e => updSvc(i, "unite", e.target.value)} />
                  </GridItem>
                </Grid>
              </Box>
            ))}
          </VStack>
        )}

        {/* ── Navigation ── */}
        <HStack justify="space-between" mt={8}>
          {step > 1 ? (
            <Button variant="ghost" color={G.muted} borderRadius="full" px={6}
              _hover={{ bg: G.bg }} onClick={() => setStep(s => s - 1)}>
              ← Précédent
            </Button>
          ) : <Box />}

          {step < 4 ? (
            <Button bg={G.brand} color="white" borderRadius="full" px={8} h="44px"
              fontWeight="700" _hover={{ bg: G.accent }}
              isDisabled={step === 1 && !company.trim()}
              onClick={() => setStep(s => s + 1)}>
              Suivant →
            </Button>
          ) : (
            <Button bg={G.brand} color="white" borderRadius="full" px={8} h="44px"
              fontWeight="700" _hover={{ bg: G.accent }}
              isLoading={loading} loadingText="Création…"
              onClick={handleSubmit}>
              Créer mon organisation
            </Button>
          )}
        </HStack>

        {step === 2 && (
          <Text fontSize="xs" color={G.muted} textAlign="center" mt={4}>
            Vous pouvez passer cette étape et ajouter vos sites plus tard dans l&apos;onglet Entreprise.
          </Text>
        )}
        {(step === 3 || step === 4) && (
          <Text fontSize="xs" color={G.muted} textAlign="center" mt={4}>
            Ces informations peuvent être complétées ou modifiées plus tard.
          </Text>
        )}
      </Box>
    </Box>
  );
}

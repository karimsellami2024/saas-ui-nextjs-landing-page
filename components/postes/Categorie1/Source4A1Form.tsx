import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Spinner,
  Stack,
  HStack,
  VStack,
  Grid,
  GridItem,
  Input,
  Select,
  Button,
  Flex,
  Badge,
  Icon,
  IconButton,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { CheckCircleIcon, ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { FiCalendar, FiFileText, FiMapPin, FiZap } from "react-icons/fi";
import { supabase } from "../../../lib/supabaseClient";
import { usePrefillPosteSource } from "#components/postes/HookForGetDataSource";
import { ReferenceSelect } from '../ReferenceSelect';

export type Source4A1Row = {
  equipment: string;
  description: string;
  date: string;
  months: string;
  site: string;
  product: string;
  reference: string;
  refrigerationType: string;
  refrigerant: string;
  qtyInEquipment: string;
  leakObserved: string;
};

const resultFields = [
  { key: "prob_fuite", label: "Probabilité de fuite" },
  { key: "fuite_estime", label: "Fuite estimée" },
  { key: "fuite_calculee", label: "Fuite calculée" },
  { key: "prp", label: "PRP" },
  { key: "total_co2_gco2e", label: "CO₂ [gCO2e]" },
  { key: "total_ges_ch4_gco2e", label: "CH₄ [gCO2e]" },
  { key: "total_ges_n2o_gco2e", label: "N₂O [gCO2e]" },
  { key: "total_ges_gco2e", label: "Total GES [gCO2e]" },
  { key: "total_ges_tco2e", label: "Total GES [tCO2e]" },
  { key: "energie_kwh", label: "Énergie équivalente [kWh]" },
] as const;

type ResultKey = (typeof resultFields)[number]["key"];
type GesResult = Partial<Record<ResultKey, string | number>>;

export interface Source4A1FormProps {
  rows: Source4A1Row[];
  setRows: (rows: Source4A1Row[]) => void;
  addRow: () => void;
  removeRow: (idx: number) => void;
  updateRow: (idx: number, key: keyof Source4A1Row, value: string) => void;
  highlight?: string;
  tableBg?: string;
  posteSourceId: string | null;
  userId?: string | null;
  bilanId?: string;
  gesResults?: GesResult[];
  setGesResults: (results: GesResult[]) => void;
  /** Called once after all loads complete when the form has no saved data */
  onMountedEmpty?: () => void;
  /** Called once after all loads complete when the form has existing saved data */
  onMountedNotEmpty?: () => void;
}

const REFRIGERATION_TYPE_OPTIONS = [
  "Climatisation commerciale/industrielle",
  "Réfrigération – Commerciale / industriel",
];

const REFRIGERANT_OPTIONS = ["R-134a", "R-448a"];

// Animations (same vibe as your 6A1 form)
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;
const slideIn = keyframes`
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: translateX(0); }
`;
const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
`;

export function Source4A1Form({
  rows = [],
  setRows,
  addRow,
  removeRow,
  updateRow,
  posteSourceId,
  userId: propUserId,
  bilanId,
  gesResults = [],
  setGesResults,
  onMountedEmpty,
  onMountedNotEmpty,
}: Source4A1FormProps) {
  // FIGMA tokens (copy/paste from your SourceAForm)
  const FIGMA = {
    bg: "#F5F6F5",
    green: "#344E41",
    greenLight: "#588157",
    greenSoft: "#DDE5E0",
    border: "#E4E4E4",
    text: "#404040",
    muted: "#8F8F8F",
    inputShadow: "0px 1px 6px 2px rgba(0,0,0,0.05)",
    buttonShadow: "0px 1px 6px 2px rgba(0,0,0,0.25)",
    cardShadow: "0 4px 16px rgba(0,0,0,0.08)",
    hoverShadow: "0 8px 24px rgba(0,0,0,0.12)",
  };

  const [loading, setLoading] = useState(true);

  // Autosave status UI (keeps your logic, just changes display)
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(propUserId ?? null);
  const [submitting, setSubmitting] = useState(false);

  // collapse rows (optional but aligns with your pattern)
  const [collapsed, setCollapsed] = useState(false);

  // ---- Prefill ----
  const { loading: prefillLoading, data: prefillData, results: prefillResults } =
    usePrefillPosteSource((userId ?? "") as string, 4, "4A1", { rows: [] });

  const isPristine = useMemo(() => {
    if (!rows || rows.length === 0) return true;
    if (rows.length !== 1) return false;
    const r = rows[0];
    return (
      !r.equipment &&
      !r.description &&
      !r.date &&
      !r.months &&
      !r.site &&
      !r.product &&
      !r.reference &&
      !r.refrigerationType &&
      !r.refrigerant &&
      !r.qtyInEquipment &&
      !r.leakObserved
    );
  }, [rows]);

  // ---- Load saved from DB (latest submission/poste) ----
  useEffect(() => {
    (async () => {
      setLoading(true);

      let activeUserId = propUserId ?? null;
      if (!activeUserId) {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) {
          setLoading(false);
          return;
        }
        activeUserId = auth.user.id;
      }
      setUserId(activeUserId);

      const { data, error } = await supabase
        .from("submissions")
        .select(
          `
          id,
          postes!postes_submission_id_fkey (
            id, poste_num, data, results
          )
        `
        )
        .eq("user_id", activeUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data && (data as any).postes) {
        const poste = posteSourceId
          ? (data as any).postes.find((p: any) => p.id === posteSourceId)
          : (data as any).postes.find((p: any) => p.poste_num === 4);

        if (poste) {
          setSubmissionId((data as any).id);
          let parsed = poste.data;
          if (typeof parsed === "string") {
            try {
              parsed = JSON.parse(parsed);
            } catch {
              parsed = {};
            }
          }
          if (parsed?.rows && Array.isArray(parsed.rows)) {
            setRows(
              parsed.rows.map((r: any) => ({
                equipment: r.equipment ?? "",
                description: r.description ?? "",
                date: r.date ?? "",
                months: String(r.months ?? ""),
                site: r.site ?? "",
                product: r.product ?? "",
                reference: r.reference ?? "",
                refrigerationType: r.equipmentType ?? r.refrigerationType ?? "",
                refrigerant: r.refrigerantType ?? r.refrigerant ?? "",
                qtyInEquipment: r.qtyInEquipment ?? (r.qty !== undefined ? String(r.qty) : ""),
                leakObserved: r.leakObserved ?? (r.leaks !== undefined ? String(r.leaks) : ""),
              }))
            );
          }
          if (poste.results && Array.isArray(poste.results)) {
            setGesResults(poste.results);
          }
        }
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posteSourceId, propUserId]);

  // ---- Hydrate from prefill (only if pristine & not loading DB) ----
  useEffect(() => {
    if (loading || prefillLoading) return;
    if (!isPristine) return;
    if (!prefillData) return;

    const incoming = (prefillData as any)?.rows;
    if (Array.isArray(incoming) && incoming.length) {
      setRows(
        incoming.map((r: any) => ({
          equipment: r.equipment ?? "",
          description: r.description ?? "",
          date: r.date ?? "",
          months: String(r.months ?? ""),
          site: r.site ?? "",
          product: r.product ?? "",
          reference: r.reference ?? "",
          refrigerationType: r.equipmentType ?? r.refrigerationType ?? "",
          refrigerant: r.refrigerantType ?? r.refrigerant ?? "",
          qtyInEquipment: r.qtyInEquipment ?? (r.qty !== undefined ? String(r.qty) : ""),
          leakObserved: r.leakObserved ?? (r.leaks !== undefined ? String(r.leaks) : ""),
        }))
      );
    }
    if (Array.isArray(prefillResults) && prefillResults.length) {
      setGesResults(prefillResults as GesResult[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, prefillLoading, prefillData, prefillResults, isPristine]);

  // Automation prefill callbacks — fires once after all loads complete
  const mountCallbackFiredRef = useRef(false);
  useEffect(() => {
    if (loading || prefillLoading) return;
    if (mountCallbackFiredRef.current) return;
    mountCallbackFiredRef.current = true;
    if (isPristine) {
      onMountedEmpty?.();
    } else {
      onMountedNotEmpty?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, prefillLoading, isPristine]);

  // ---- Validation (used for manual submit) ----
  const validateData = (rs: Source4A1Row[]) =>
    rs.length > 0 &&
    rs.every(
      (row) =>
        row.equipment &&
        row.date &&
        row.months &&
        row.site &&
        row.refrigerationType &&
        row.refrigerant &&
        row.qtyInEquipment
    );

  // ---- Debounced autosave (draft) ----
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJSONRef = useRef<string>("");

  const makeSanitizedRows = (rs: Source4A1Row[]) =>
    rs.map((row) => ({
      equipment: row.equipment,
      description: row.description,
      date: row.date,
      months: parseFloat(row.months) || 0,
      site: row.site,
      product: row.product,
      reference: row.reference,
      equipmentType: row.refrigerationType,
      refrigerantType: row.refrigerant,
      qty: parseFloat(row.qtyInEquipment) || 0,
      leaks: parseFloat(row.leakObserved) || 0,
    }));

  const saveDraft = async () => {
    if (!userId || !posteSourceId) return;
    const jsonNow = JSON.stringify(rows);
    if (jsonNow === lastSavedJSONRef.current) return;

    setSaving(true);
    setSaveMsg("Enregistrement…");
    setJustSaved(false);

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      source_code: "4A1",
      submission_id: bilanId ?? null,
      poste_num: 4,
      data: { rows: makeSanitizedRows(rows) },
      results: gesResults ?? [],
    };

    try {
      const dbResponse = await fetch("/api/4submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const dbResult = await dbResponse.json();
      if (!dbResponse.ok) {
        setSaveMsg("Erreur d’enregistrement");
        console.error("Autosave DB error:", dbResult?.error || dbResult);
      } else {
        lastSavedJSONRef.current = jsonNow;
        setJustSaved(true);
        setSaveMsg("Enregistré");
        setTimeout(() => setJustSaved(false), 1500);
      }
    } catch (e) {
      console.error("Autosave network error:", e);
      setSaveMsg("Erreur réseau");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 1500);
    }
  };

  useEffect(() => {
    if (!userId || !posteSourceId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void saveDraft();
    }, 1000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, userId, posteSourceId]);

  // ---- Manual submit (compute + save) ----
  const handleSubmit = async () => {
    if (!posteSourceId || !userId) {
      alert("Champs obligatoires manquants (posteSourceId ou userId)");
      return;
    }
    if (!validateData(rows)) {
      alert("Veuillez remplir tous les champs requis.");
      return;
    }

    setSubmitting(true);
    setGesResults([]);

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      source_code: "4A1",
      submission_id: bilanId ?? null,
      poste_num: 4,
      data: { rows: makeSanitizedRows(rows) },
    };

    let results: GesResult[] = [];
    let webhookOk = false;

    try {
      const response = await fetch(
        "https://allposteswebhook-129138384907.us-central1.run.app/submit/4A1",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        alert("Erreur calcul GES (Cloud Run): " + (result.error || ""));
      } else {
        results = Array.isArray(result.results) ? result.results : [];
        webhookOk = true;
      }
    } catch {
      alert("Erreur réseau lors du calcul Cloud Run.");
    }

    try {
      const dbPayload = { ...payload, results };
      const dbResponse = await fetch("/api/4submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbPayload),
      });
      const dbResult = await dbResponse.json();
      if (!dbResponse.ok) {
        alert("Erreur lors de la sauvegarde en base : " + (dbResult.error || ""));
      } else {
        setGesResults(results);
        lastSavedJSONRef.current = JSON.stringify(rows);
        alert(
          webhookOk
            ? "Données 4A1 calculées et sauvegardées avec succès!"
            : "Données 4A1 sauvegardées sans résultat de calcul GES."
        );
      }
    } catch {
      alert("Erreur inattendue lors de la sauvegarde en base.");
    }
    setSubmitting(false);
  };

  // ---- RESULT (only non-empty columns) ----
  const displayColumns = resultFields.filter((f) =>
    (gesResults ?? []).some(
      (res) =>
        res &&
        (res as any)[f.key] !== undefined &&
        (res as any)[f.key] !== "" &&
        (res as any)[f.key] !== "#N/A"
    )
  );

  if (loading || prefillLoading) {
    return (
      <Flex
        minH="400px"
        align="center"
        justify="center"
        bg={FIGMA.bg}
        rounded="2xl"
        direction="column"
        gap={4}
      >
        <Spinner color={FIGMA.green} size="xl" thickness="4px" speed="0.8s" />
        <Text color={FIGMA.muted} fontFamily="Montserrat" fontSize="sm">
          Chargement des données...
        </Text>
      </Flex>
    );
  }

  return (
    <Box bg={FIGMA.bg} p={{ base: 4, md: 6 }} rounded="2xl" animation={`${fadeInUp} 0.6s ease-out`}>
      {/* Header */}
      <Box
        bg="white"
        p={6}
        rounded="xl"
        mb={6}
        boxShadow={FIGMA.cardShadow}
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute"
          top={-10}
          right={-10}
          w="200px"
          h="200px"
          bg={FIGMA.greenSoft}
          borderRadius="full"
          filter="blur(60px)"
          opacity={0.5}
          pointerEvents="none"
        />

        <Flex justify="space-between" align="center" position="relative" flexWrap="wrap" gap={4}>
          <VStack align="flex-start" spacing={2}>
            <HStack spacing={2}>
              <Box w="4px" h="24px" bg={FIGMA.green} borderRadius="full" />
              <Badge
                colorScheme="green"
                fontSize="xs"
                px={3}
                py={1}
                rounded="full"
                textTransform="uppercase"
                letterSpacing="wide"
              >
                Poste 4A1
              </Badge>
            </HStack>

            <Heading
              as="h2"
              fontFamily="Inter"
              fontWeight={700}
              fontSize={{ base: "xl", md: "2xl" }}
              color={FIGMA.text}
            >
              4A1 – Équipement de réfrigération et de climatisation fixe
            </Heading>

            <Text fontSize="sm" fontFamily="Montserrat" color={FIGMA.muted}>
              {rows?.length || 0} ligne(s)
            </Text>
          </VStack>

          <HStack spacing={3} flexWrap="wrap" align="center">
            {/* Autosave status */}
            <Box
              minW="160px"
              bg={saving || justSaved ? "white" : "transparent"}
              px={3}
              py={2}
              rounded="lg"
              transition="all 0.3s"
            >
              {saving && (
                <HStack color={FIGMA.muted} animation={`${pulse} 1.5s ease-in-out infinite`}>
                  <Spinner size="sm" />
                  <Text fontSize="sm" fontFamily="Montserrat" fontWeight={500}>
                    Enregistrement…
                  </Text>
                </HStack>
              )}
              {!saving && justSaved && (
                <HStack color="green.600" animation={`${slideIn} 0.3s ease-out`}>
                  <Icon as={CheckCircleIcon} />
                  <Text fontSize="sm" fontFamily="Montserrat" fontWeight={500}>
                    Enregistré
                  </Text>
                </HStack>
              )}
              {!saving && !justSaved && (
                <Text fontSize="sm" fontFamily="Montserrat" fontWeight={500} color={FIGMA.muted}>
                  {saveMsg ?? "Saisie automatique activée"}
                </Text>
              )}
            </Box>

            <IconButton
              aria-label={collapsed ? "Développer" : "Réduire"}
              icon={collapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
              variant="ghost"
              color={FIGMA.muted}
              size="sm"
              _hover={{ color: FIGMA.green, bg: FIGMA.greenSoft }}
              onClick={() => setCollapsed((v) => !v)}
            />
          </HStack>
        </Flex>
      </Box>

      {/* Main form */}
      <Box bg="white" rounded="xl" p={6} boxShadow={FIGMA.cardShadow}>
        {!collapsed && (
          <Stack spacing={6}>
            {/* Table header (desktop) */}
            <Box
              bg={`linear-gradient(135deg, ${FIGMA.green} 0%, ${FIGMA.greenLight} 100%)`}
              color="white"
              h="50px"
              rounded="xl"
              px={6}
              display={{ base: "none", lg: "flex" }}
              alignItems="center"
              mb={2}
              boxShadow="0 2px 8px rgba(52, 78, 65, 0.2)"
            >
              <Grid
                w="full"
                templateColumns="1.6fr 1.4fr 1.1fr 0.9fr 1.2fr 1.2fr 1.2fr 1.8fr 1.1fr 1.1fr 1.2fr 44px"
                columnGap={6}
                alignItems="center"
              >
                {[
                  { label: "Équipement", icon: FiZap },
                  { label: "Description", icon: FiFileText },
                  { label: "Date", icon: FiCalendar },
                  { label: "Mois", icon: FiCalendar },
                  { label: "Site", icon: FiMapPin },
                  { label: "Produit", icon: FiFileText },
                  { label: "Références", icon: FiFileText },
                  { label: "Type d'équipement", icon: FiZap },
                  { label: "Réfrigérant", icon: FiZap },
                  { label: "Qté [lbs]", icon: FiZap },
                  { label: "Fuites [lbs]", icon: FiZap },
                ].map(({ label, icon }) => (
                  <HStack key={label} justify="center" spacing={2}>
                    <Icon as={icon} boxSize={4} />
                    <Text fontFamily="Montserrat" fontWeight={600} fontSize="14px">
                      {label}
                    </Text>
                  </HStack>
                ))}
                <Box />
              </Grid>
            </Box>

            <Stack spacing={4}>
              {(rows || []).map((row, idx) => (
                <Box
                  key={idx}
                  bg={FIGMA.bg}
                  rounded="xl"
                  p={4}
                  border="2px solid"
                  borderColor={FIGMA.border}
                  transition="all 0.3s"
                  _hover={{ borderColor: FIGMA.green }}
                  animation={`${fadeInUp} 0.35s ease-out ${idx * 0.05}s both`}
                >
                  <Grid
                    templateColumns={{ base: "1fr", lg: "1.6fr 1.4fr 1.1fr 0.9fr 1.2fr 1.2fr 1.2fr 1.8fr 1.1fr 1.1fr 1.2fr 44px" }}
                    columnGap={4}
                    rowGap={3}
                    alignItems="center"
                  >
                    <GridItem>
                      <FigmaInput
                        FIGMA={FIGMA}
                        value={row.equipment}
                        onChange={(v) => updateRow(idx, "equipment", v)}
                        placeholder="Équipement"
                      />
                    </GridItem>
                    <GridItem>
                      <FigmaInput
                        FIGMA={FIGMA}
                        value={row.description}
                        onChange={(v) => updateRow(idx, "description", v)}
                        placeholder="Facultatif"
                      />
                    </GridItem>
                    <GridItem>
                      <FigmaInput
                        FIGMA={FIGMA}
                        type="date"
                        value={row.date}
                        onChange={(v) => updateRow(idx, "date", v)}
                      />
                    </GridItem>
                    <GridItem>
                      <FigmaInput
                        FIGMA={FIGMA}
                        type="number"
                        value={row.months}
                        onChange={(v) => updateRow(idx, "months", v)}
                        placeholder="Mois"
                      />
                    </GridItem>
                    <GridItem>
                      <FigmaInput
                        FIGMA={FIGMA}
                        value={row.site}
                        onChange={(v) => updateRow(idx, "site", v)}
                        placeholder="Site"
                      />
                    </GridItem>
                    <GridItem>
                      <FigmaInput
                        FIGMA={FIGMA}
                        value={row.product}
                        onChange={(v) => updateRow(idx, "product", v)}
                        placeholder="Produit"
                      />
                    </GridItem>
                    <GridItem>
                      <ReferenceSelect userId={userId ?? ""} value={row.reference} onChange={(v) => updateRow(idx, "reference", v)} />
                    </GridItem>

                    <GridItem>
                      <FigmaSelect
                        FIGMA={FIGMA}
                        value={row.refrigerationType}
                        onChange={(v) => updateRow(idx, "refrigerationType", v)}
                        placeholder="(Sélectionner)"
                        options={REFRIGERATION_TYPE_OPTIONS}
                      />
                    </GridItem>

                    <GridItem>
                      <FigmaSelect
                        FIGMA={FIGMA}
                        value={row.refrigerant}
                        onChange={(v) => updateRow(idx, "refrigerant", v)}
                        placeholder="(Sélectionner)"
                        options={REFRIGERANT_OPTIONS}
                      />
                    </GridItem>

                    <GridItem>
                      <FigmaInput
                        FIGMA={FIGMA}
                        type="number"
                        value={row.qtyInEquipment}
                        onChange={(v) => updateRow(idx, "qtyInEquipment", v)}
                        placeholder="Quantité"
                        center
                      />
                    </GridItem>

                    <GridItem>
                      <FigmaInput
                        FIGMA={FIGMA}
                        type="number"
                        value={row.leakObserved}
                        onChange={(v) => updateRow(idx, "leakObserved", v)}
                        placeholder="Fuites"
                        center
                      />
                    </GridItem>

                    <GridItem>
                      <IconButton
                        aria-label="Supprimer"
                        icon={<Text fontWeight="700" fontSize="sm">×</Text>}
                        variant="ghost"
                        color={FIGMA.muted}
                        size="sm"
                        _hover={{ bg: "red.50", color: "red.500" }}
                        onClick={() => removeRow(idx)}
                      />
                    </GridItem>
                  </Grid>
                </Box>
              ))}
            </Stack>

            <HStack pt={2} spacing={4} flexWrap="wrap">
              <Button
                variant="outline"
                borderColor={FIGMA.green}
                color={FIGMA.green}
                rounded="full"
                h="44px"
                px={6}
                onClick={addRow}
                fontFamily="Inter"
                fontWeight={600}
                _hover={{ bg: FIGMA.greenSoft, borderColor: FIGMA.green }}
                transition="all 0.2s"
              >
                Ajouter une ligne
              </Button>
            </HStack>
          </Stack>
        )}
      </Box>

      {/* Results */}
      <Box
        mt={6}
        bg="white"
        rounded="xl"
        p={6}
        boxShadow={FIGMA.cardShadow}
        animation={`${fadeInUp} 0.6s ease-out`}
      >
        <HStack mb={4} spacing={2}>
          <Icon as={FiFileText} color={FIGMA.green} boxSize={5} />
          <Text fontFamily="Inter" fontWeight={700} color={FIGMA.text} fontSize="lg">
            Calculs et résultats
          </Text>
        </HStack>

        {gesResults && gesResults.length > 0 && displayColumns.length > 0 ? (
          <Grid
            templateColumns={{ base: "1fr", md: "repeat(auto-fit, minmax(200px, 1fr))" }}
            gap={6}
          >
            {displayColumns.map((f, idx) => (
              <Box
                key={String(f.key)}
                bg={FIGMA.bg}
                p={4}
                rounded="lg"
                border="2px solid"
                borderColor={FIGMA.border}
                transition="all 0.3s"
                _hover={{ borderColor: FIGMA.green, transform: "translateY(-2px)" }}
                animation={`${fadeInUp} 0.4s ease-out ${idx * 0.05}s both`}
              >
                <Text fontSize="xs" color={FIGMA.muted} fontFamily="Montserrat" mb={2} textTransform="uppercase">
                  {f.label}
                </Text>
                <Text fontSize="2xl" fontWeight={700} color={FIGMA.green} fontFamily="Inter">
                  {formatResultField(gesResults, f.key)}
                </Text>
              </Box>
            ))}
          </Grid>
        ) : (
          <Text color={FIGMA.muted} fontFamily="Montserrat">
            Aucun résultat à afficher.
          </Text>
        )}
      </Box>
    </Box>
  );
}

/* ========= Styled inputs (same as 6A1) ========= */

function FigmaInput({
  FIGMA,
  value,
  onChange,
  placeholder,
  type = "text",
  center,
}: {
  FIGMA: any;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  center?: boolean;
}) {
  return (
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      h="42px"
      rounded="lg"
      bg="white"
      borderColor={FIGMA.border}
      boxShadow={FIGMA.inputShadow}
      fontFamily="Montserrat"
      fontSize="14px"
      color={FIGMA.text}
      textAlign={center ? "center" : "left"}
      _placeholder={{ color: FIGMA.muted }}
      _focus={{
        borderColor: FIGMA.green,
        boxShadow: `0 0 0 1px ${FIGMA.green}`,
      }}
      transition="all 0.2s"
    />
  );
}

function FigmaSelect({
  FIGMA,
  value,
  onChange,
  placeholder,
  options,
}: {
  FIGMA: any;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options: string[];
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      h="42px"
      rounded="lg"
      bg="white"
      borderColor={FIGMA.border}
      boxShadow={FIGMA.inputShadow}
      fontFamily="Montserrat"
      fontSize="14px"
      color={FIGMA.text}
      _focus={{
        borderColor: FIGMA.green,
        boxShadow: `0 0 0 1px ${FIGMA.green}`,
      }}
      transition="all 0.2s"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </Select>
  );
}

function LabeledField({
  label,
  children,
  FIGMA,
}: {
  label: string;
  children: any;
  FIGMA: any;
}) {
  return (
    <Box>
      <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500" fontFamily="Montserrat">
        {label}
      </Text>
      {children}
    </Box>
  );
}

/* ========= Result utils ========= */

function formatResultField(results: GesResult[], key: ResultKey): string {
  const nonEmpty = (results || [])
    .map((r) => (r as any)?.[key])
    .filter((v) => v !== undefined && v !== "" && v !== "#N/A");

  if (!nonEmpty.length) return "-";

  const v0 = nonEmpty[0];
  const n = Number(v0);
  if (!isFinite(n)) return String(v0);

  return n.toLocaleString("fr-CA", { maximumFractionDigits: 3 });
}

// import React, { useEffect, useMemo, useRef, useState } from "react";
// import {
//   Box,
//   Heading,
//   Text,
//   Spinner,
//   Stack,
//   HStack,
//   VStack,
//   Grid,
//   GridItem,
//   Input,
//   Select,
//   Button,
//   useColorModeValue,
// } from "@chakra-ui/react";
// import { supabase } from "../../../lib/supabaseClient";
// import { usePrefillPosteSource } from "#components/postes/HookForGetDataSource";

// export type Source4A1Row = {
//   equipment: string;
//   description: string;
//   date: string;
//   months: string;
//   site: string;
//   product: string;
//   reference: string;
//   refrigerationType: string;
//   refrigerant: string;
//   qtyInEquipment: string;
//   leakObserved: string;
// };

// const resultFields = [
//   { key: "prob_fuite", label: "Probabilité de fuite" },
//   { key: "fuite_estime", label: "Fuite estimée" },
//   { key: "fuite_calculee", label: "Fuite calculée" },
//   { key: "prp", label: "PRP" },
//   { key: "total_co2_gco2e", label: "CO₂ [gCO2e]" },
//   { key: "total_ges_ch4_gco2e", label: "CH₄ [gCO2e]" },
//   { key: "total_ges_n2o_gco2e", label: "N₂O [gCO2e]" },
//   { key: "total_ges_gco2e", label: "Total GES [gCO2e]" },
//   { key: "total_ges_tco2e", label: "Total GES [tCO2e]" },
//   { key: "energie_kwh", label: "Énergie équivalente [kWh]" },
// ] as const;

// type ResultKey = (typeof resultFields)[number]["key"];
// type GesResult = Partial<Record<ResultKey, string | number>>;

// export interface Source4A1FormProps {
//   rows: Source4A1Row[];
//   setRows: (rows: Source4A1Row[]) => void;
//   addRow: () => void;
//   removeRow: (idx: number) => void;
//   updateRow: (idx: number, key: keyof Source4A1Row, value: string) => void;
//   highlight?: string;
//   tableBg?: string;
//   posteSourceId: string | null;
//   userId?: string | null;
//   gesResults?: GesResult[];
//   setGesResults: (results: GesResult[]) => void;
// }

// const REFRIGERATION_TYPE_OPTIONS = [
//   "Climatisation commerciale/industrielle",
//   "Réfrigération – Commerciale / industriel",
// ];

// const REFRIGERANT_OPTIONS = ["R-134a", "R-448a"];

// export function Source4A1Form({
//   rows = [],
//   setRows,
//   addRow,
//   removeRow,
//   updateRow,
//   highlight = "#264a3b",
//   tableBg = "#f3f6ef",
//   posteSourceId,
//   userId: propUserId,
//   gesResults = [],
//   setGesResults,
// }: Source4A1FormProps) {
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [saveMsg, setSaveMsg] = useState<string | null>(null);
//   const [submissionId, setSubmissionId] = useState<string | null>(null);
//   const [userId, setUserId] = useState<string | null>(propUserId ?? null);
//   const [submitting, setSubmitting] = useState(false);

//   const inputBorder = useColorModeValue("#E8ECE7", "#2f3a36");
//   const faintLine = useColorModeValue(
//     "rgba(0,0,0,0.12)",
//     "rgba(255,255,255,0.12)"
//   );

//   // ---- Prefill (like 6B1) ----
//   const {
//     loading: prefillLoading,
//     data: prefillData,
//     results: prefillResults,
//   } = usePrefillPosteSource((userId ?? "") as string, 4, "4A1", { rows: [] });

//   const isPristine = useMemo(() => {
//     if (!rows || rows.length === 0) return true;
//     if (rows.length !== 1) return false;
//     const r = rows[0];
//     return (
//       !r.equipment &&
//       !r.description &&
//       !r.date &&
//       !r.months &&
//       !r.site &&
//       !r.product &&
//       !r.reference &&
//       !r.refrigerationType &&
//       !r.refrigerant &&
//       !r.qtyInEquipment &&
//       !r.leakObserved
//     );
//   }, [rows]);

//   // ---- Load saved from DB (latest submission/poste) ----
//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       let activeUserId = propUserId ?? null;
//       if (!activeUserId) {
//         const { data: auth } = await supabase.auth.getUser();
//         if (!auth?.user) {
//           setLoading(false);
//           return;
//         }
//         activeUserId = auth.user.id;
//       }
//       setUserId(activeUserId);

//       const { data, error } = await supabase
//         .from("submissions")
//         .select(
//           `
//           id,
//           postes!postes_submission_id_fkey (
//             id, poste_num, data, results
//           )
//         `
//         )
//         .eq("user_id", activeUserId)
//         .order("created_at", { ascending: false })
//         .limit(1)
//         .single();

//       if (!error && data && data.postes) {
//         const poste = posteSourceId
//           ? data.postes.find((p: any) => p.id === posteSourceId)
//           : data.postes.find((p: any) => p.poste_num === 4);

//         if (poste) {
//           setSubmissionId(data.id);
//           let parsed = poste.data;
//           if (typeof parsed === "string") {
//             try {
//               parsed = JSON.parse(parsed);
//             } catch {
//               parsed = {};
//             }
//           }
//           if (parsed?.rows && Array.isArray(parsed.rows)) {
//             setRows(
//               parsed.rows.map((r: any) => ({
//                 equipment: r.equipment ?? "",
//                 description: r.description ?? "",
//                 date: r.date ?? "",
//                 months: String(r.months ?? ""),
//                 site: r.site ?? "",
//                 product: r.product ?? "",
//                 reference: r.reference ?? "",
//                 refrigerationType: r.equipmentType ?? r.refrigerationType ?? "",
//                 refrigerant: r.refrigerantType ?? r.refrigerant ?? "",
//                 qtyInEquipment:
//                   r.qtyInEquipment ?? (r.qty !== undefined ? String(r.qty) : ""),
//                 leakObserved:
//                   r.leakObserved ?? (r.leaks !== undefined ? String(r.leaks) : ""),
//               }))
//             );
//           }
//           if (poste.results && Array.isArray(poste.results)) {
//             setGesResults(poste.results);
//           }
//         }
//       }
//       setLoading(false);
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [posteSourceId, propUserId]);

//   // ---- Hydrate from prefill (only if pristine & not loading DB) ----
//   useEffect(() => {
//     if (loading || prefillLoading) return;
//     if (!isPristine) return;
//     if (!prefillData) return;

//     const incoming = (prefillData as any)?.rows;
//     if (Array.isArray(incoming) && incoming.length) {
//       setRows(
//         incoming.map((r: any) => ({
//           equipment: r.equipment ?? "",
//           description: r.description ?? "",
//           date: r.date ?? "",
//           months: String(r.months ?? ""),
//           site: r.site ?? "",
//           product: r.product ?? "",
//           reference: r.reference ?? "",
//           refrigerationType: r.equipmentType ?? r.refrigerationType ?? "",
//           refrigerant: r.refrigerantType ?? r.refrigerant ?? "",
//           qtyInEquipment:
//             r.qtyInEquipment ?? (r.qty !== undefined ? String(r.qty) : ""),
//           leakObserved:
//             r.leakObserved ?? (r.leaks !== undefined ? String(r.leaks) : ""),
//         }))
//       );
//     }
//     if (Array.isArray(prefillResults) && prefillResults.length) {
//       setGesResults(prefillResults as GesResult[]);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [loading, prefillLoading, prefillData, prefillResults, isPristine]);

//   // ---- Validation (used for manual submit) ----
//   const validateData = (rs: Source4A1Row[]) =>
//     rs.length > 0 &&
//     rs.every(
//       (row) =>
//         row.equipment &&
//         row.date &&
//         row.months &&
//         row.site &&
//         row.refrigerationType &&
//         row.refrigerant &&
//         row.qtyInEquipment
//     );

//   // ---- Debounced autosave (draft) ----
//   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
//   const lastSavedJSONRef = useRef<string>("");

//   const makeSanitizedRows = (rs: Source4A1Row[]) =>
//     rs.map((row) => ({
//       equipment: row.equipment,
//       description: row.description,
//       date: row.date,
//       months: parseFloat(row.months) || 0,
//       site: row.site,
//       product: row.product,
//       reference: row.reference,
//       equipmentType: row.refrigerationType,
//       refrigerantType: row.refrigerant,
//       qty: parseFloat(row.qtyInEquipment) || 0,
//       leaks: parseFloat(row.leakObserved) || 0,
//     }));

//   const saveDraft = async () => {
//     if (!userId || !posteSourceId) return;
//     const jsonNow = JSON.stringify(rows);
//     if (jsonNow === lastSavedJSONRef.current) return;

//     setSaving(true);
//     setSaveMsg("Enregistrement…");

//     const payload = {
//       user_id: userId,
//       poste_source_id: posteSourceId,
//       source_code: "4A1",
//       poste_num: 4,
//       data: { rows: makeSanitizedRows(rows) },
//       results: gesResults ?? [],
//     };

//     try {
//       const dbResponse = await fetch("/api/4submit", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });
//       const dbResult = await dbResponse.json();
//       if (!dbResponse.ok) {
//         setSaveMsg("Erreur d’enregistrement");
//         console.error("Autosave DB error:", dbResult?.error || dbResult);
//       } else {
//         lastSavedJSONRef.current = jsonNow;
//         setSaveMsg("Enregistré");
//       }
//     } catch (e) {
//       console.error("Autosave network error:", e);
//       setSaveMsg("Erreur réseau");
//     } finally {
//       setSaving(false);
//       setTimeout(() => setSaveMsg(null), 1500);
//     }
//   };

//   useEffect(() => {
//     if (!userId || !posteSourceId) return;
//     if (debounceRef.current) clearTimeout(debounceRef.current);
//     debounceRef.current = setTimeout(() => {
//       void saveDraft();
//     }, 1000);
//     return () => {
//       if (debounceRef.current) clearTimeout(debounceRef.current);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [rows, userId, posteSourceId]);

//   // ---- Manual submit (compute + save) ----
//   const handleSubmit = async () => {
//     if (!posteSourceId || !userId) {
//       alert("Champs obligatoires manquants (posteSourceId ou userId)");
//       return;
//     }
//     if (!validateData(rows)) {
//       alert("Veuillez remplir tous les champs requis.");
//       return;
//     }
//     setSubmitting(true);
//     setGesResults([]);

//     const payload = {
//       user_id: userId,
//       poste_source_id: posteSourceId,
//       source_code: "4A1",
//       poste_num: 4,
//       data: { rows: makeSanitizedRows(rows) },
//     };

//     let results: GesResult[] = [];
//     let webhookOk = false;

//     try {
//       const response = await fetch(
//         "https://allposteswebhook-129138384907.us-central1.run.app/submit/4A1",
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(payload),
//         }
//       );
//       const result = await response.json();
//       if (!response.ok) {
//         alert("Erreur calcul GES (Cloud Run): " + (result.error || ""));
//       } else {
//         results = Array.isArray(result.results) ? result.results : [];
//         webhookOk = true;
//       }
//     } catch {
//       alert("Erreur réseau lors du calcul Cloud Run.");
//     }

//     try {
//       const dbPayload = { ...payload, results };
//       const dbResponse = await fetch("/api/4submit", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(dbPayload),
//       });
//       const dbResult = await dbResponse.json();
//       if (!dbResponse.ok) {
//         alert(
//           "Erreur lors de la sauvegarde en base : " + (dbResult.error || "")
//         );
//       } else {
//         setGesResults(results);
//         lastSavedJSONRef.current = JSON.stringify(rows);
//         alert(
//           webhookOk
//             ? "Données 4A1 calculées et sauvegardées avec succès!"
//             : "Données 4A1 sauvegardées sans résultat de calcul GES."
//         );
//       }
//     } catch {
//       alert("Erreur inattendue lors de la sauvegarde en base.");
//     }
//     setSubmitting(false);
//   };

//   // ---- RESULT TABLE (show only non-empty columns) ----
//   const displayColumns = resultFields.filter((f) =>
//     (gesResults ?? []).some(
//       (res) =>
//         res &&
//         (res as any)[f.key] !== undefined &&
//         (res as any)[f.key] !== "" &&
//         (res as any)[f.key] !== "#N/A"
//     )
//   );

//   if (loading || prefillLoading) {
//     return (
//       <Box display="flex" alignItems="center" justifyContent="center" minH="300px">
//         <Spinner color={highlight} size="xl" />
//       </Box>
//     );
//   }

//   return (
//     <VStack align="stretch" spacing={3}>
//       {/* Header title + autosave status */}
//       <Heading as="h3" size="md" color={highlight}>
//         4A1 – Équipement de réfrigération et de climatisation fixe
//       </Heading>

//       <Stack direction="row" align="center" spacing={3} mb={1}>
//         {saving && <Spinner size="sm" color={highlight} />}
//         <Text fontSize="sm" color="gray.600">
//           {saveMsg ?? "Saisie automatique activée"}
//         </Text>
//       </Stack>

//       {/* Column header bar */}
//       <Grid
//         templateColumns="1.6fr 1.4fr 1.1fr 0.9fr 1.2fr 1.2fr 1.2fr 1.8fr 1.1fr 1.1fr 1.2fr 96px"
//         bg={highlight}
//         color="white"
//         fontWeight={600}
//         fontSize="sm"
//         alignItems="center"
//         px={4}
//         py={3}
//         rounded="lg"
//       >
//         <GridItem>Liste des équipements</GridItem>
//         <GridItem>Description</GridItem>
//         <GridItem>Date</GridItem>
//         <GridItem>Mois</GridItem>
//         <GridItem>Site</GridItem>
//         <GridItem>Produit</GridItem>
//         <GridItem>Références</GridItem>
//         <GridItem>Type d&apos;équipement</GridItem>
//         <GridItem>Réfrigérant</GridItem>
//         <GridItem>Quantité [lbs]</GridItem>
//         <GridItem>Fuites [lbs]</GridItem>
//         <GridItem textAlign="right">Actions</GridItem>
//       </Grid>

//       {/* Rows */}
//       <VStack
//         spacing={0}
//         bg={tableBg}
//         rounded="xl"
//         border="1px solid"
//         borderColor={inputBorder}
//         overflow="hidden"
//       >
//         {(rows || []).map((row, idx) => (
//           <Box key={idx} bg="transparent" px={{ base: 2, md: 3 }} pt={3}>
//             <Grid
//               templateColumns="1.6fr 1.4fr 1.1fr 0.9fr 1.2fr 1.2fr 1.2fr 1.8fr 1.1fr 1.1fr 1.2fr 96px"
//               gap={3}
//               alignItems="center"
//               px={1}
//             >
//               <GridItem>
//                 <PillInput
//                   placeholder="Équipement"
//                   value={row.equipment}
//                   onChange={(v: string) => updateRow(idx, "equipment", v)}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>
//               <GridItem>
//                 <PillInput
//                   placeholder="Facultatif"
//                   value={row.description}
//                   onChange={(v: string) => updateRow(idx, "description", v)}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>
//               <GridItem>
//                 <PillInput
//                   type="date"
//                   value={row.date}
//                   onChange={(v: string) => updateRow(idx, "date", v)}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>
//               <GridItem>
//                 <PillInput
//                   type="number"
//                   placeholder="Mois"
//                   value={row.months}
//                   onChange={(v: string) => updateRow(idx, "months", v)}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>
//               <GridItem>
//                 <PillInput
//                   placeholder="Site"
//                   value={row.site}
//                   onChange={(v: string) => updateRow(idx, "site", v)}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>
//               <GridItem>
//                 <PillInput
//                   placeholder="Produit"
//                   value={row.product}
//                   onChange={(v: string) => updateRow(idx, "product", v)}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>
//               <GridItem>
//                 <PillInput
//                   placeholder="Références"
//                   value={row.reference}
//                   onChange={(v: string) => updateRow(idx, "reference", v)}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>
//               <GridItem>
//                 <PillSelect
//                   value={row.refrigerationType}
//                   onChange={(v: string) =>
//                     updateRow(idx, "refrigerationType", v)
//                   }
//                   placeholder="(Sélectionner)"
//                   options={REFRIGERATION_TYPE_OPTIONS}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>
//               <GridItem>
//                 <PillSelect
//                   value={row.refrigerant}
//                   onChange={(v: string) => updateRow(idx, "refrigerant", v)}
//                   placeholder="(Sélectionner)"
//                   options={REFRIGERANT_OPTIONS}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>
//               <GridItem>
//                 <PillInput
//                   type="number"
//                   placeholder="Quantité"
//                   value={row.qtyInEquipment}
//                   onChange={(v: string) =>
//                     updateRow(idx, "qtyInEquipment", v)
//                   }
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>
//               <GridItem>
//                 <PillInput
//                   type="number"
//                   placeholder="Fuites"
//                   value={row.leakObserved}
//                   onChange={(v: string) => updateRow(idx, "leakObserved", v)}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>
//               <GridItem>
//                 <HStack spacing={2} justify="flex-end" pr={1}>
//                   <Button
//                     size="xs"
//                     colorScheme="red"
//                     variant="outline"
//                     onClick={() => removeRow(idx)}
//                   >
//                     Suppr.
//                   </Button>
//                 </HStack>
//               </GridItem>
//             </Grid>
//             <Box h="2px" bg={faintLine} mx={2} mt={3} rounded="full" />
//           </Box>
//         ))}

//         {(!rows || rows.length === 0) && (
//           <Box p={4} textAlign="center" color="gray.500">
//             Aucune ligne. Cliquez sur &quot;Ajouter une ligne&quot; pour
//             commencer.
//           </Box>
//         )}
//       </VStack>

//       {/* Footer buttons */}
//       <HStack pt={3} spacing={3}>
//         <Button
//           bg={highlight}
//           color="white"
//           rounded="full"
//           px={6}
//           h="44px"
//           _hover={{ opacity: 0.95 }}
//           onClick={addRow}
//         >
//           Ajouter une ligne
//         </Button>
//         <Button
//           colorScheme="blue"
//           rounded="full"
//           px={6}
//           h="44px"
//           onClick={handleSubmit}
//           isLoading={submitting}
//         >
//           Soumettre
//         </Button>
//       </HStack>

//       {/* Résultats */}
//       <Box mt={4} bg="#e5f2fa" rounded="xl" boxShadow="sm" p={4}>
//         <Text fontWeight="bold" color={highlight} mb={2}>
//           Calculs et résultats
//         </Text>
//         {gesResults && gesResults.length > 0 && displayColumns.length > 0 ? (
//           <Grid
//             templateColumns={`repeat(${displayColumns.length}, minmax(0, 1fr))`}
//             gap={3}
//             fontSize="sm"
//           >
//             {displayColumns.map((f) => (
//               <ResultPill
//                 key={f.key}
//                 label={f.label}
//                 value={formatResultField(gesResults, f.key)}
//               />
//             ))}
//           </Grid>
//         ) : (
//           <Text color="gray.500">Aucun résultat à afficher.</Text>
//         )}
//       </Box>
//     </VStack>
//   );
// }

// /* ========= Small UI helpers ========= */

// function PillInput({
//   value,
//   onChange,
//   placeholder,
//   inputBorder,
//   type = "text",
// }: any) {
//   return (
//     <Input
//       type={type}
//       value={value}
//       onChange={(e) => onChange(e.target.value)}
//       placeholder={placeholder}
//       bg="white"
//       border="1px solid"
//       borderColor={inputBorder}
//       rounded="xl"
//       h="36px"
//       boxShadow="0 2px 4px rgba(0,0,0,0.06)"
//       fontSize="sm"
//     />
//   );
// }

// function PillSelect({
//   value,
//   onChange,
//   placeholder,
//   options,
//   inputBorder,
// }: any) {
//   return (
//     <Select
//       value={value}
//       onChange={(e) => onChange(e.target.value)}
//       placeholder={placeholder}
//       bg="white"
//       border="1px solid"
//       borderColor={inputBorder}
//       rounded="xl"
//       h="36px"
//       boxShadow="0 2px 4px rgba(0,0,0,0.06)"
//       fontSize="sm"
//     >
//       {options.map((opt: string) => (
//         <option key={opt} value={opt}>
//           {opt}
//         </option>
//       ))}
//     </Select>
//   );
// }

// function ResultPill({ label, value }: { label: string; value: string }) {
//   return (
//     <VStack
//       bg="white"
//       border="1px solid"
//       borderColor="#E8ECE7"
//       rounded="xl"
//       p={3}
//       spacing={1}
//       align="stretch"
//     >
//       <Text fontSize="xs" color="gray.600">
//         {label}
//       </Text>
//       <Text fontWeight="bold">{value}</Text>
//     </VStack>
//   );
// }

// /* ========= Result utils ========= */

// function formatResultField(results: GesResult[], key: ResultKey): string {
//   const nonEmpty = results
//     .map((r) => r[key])
//     .filter((v) => v !== undefined && v !== "" && v !== "#N/A");
//   if (!nonEmpty.length) return "-";
//   const n = Number(nonEmpty[0]);
//   if (!isFinite(n)) return String(nonEmpty[0]);
//   return n.toLocaleString("fr-CA", { maximumFractionDigits: 3 });
// }

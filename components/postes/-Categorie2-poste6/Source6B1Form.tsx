import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Input,
  Button,
  Spinner,
  Stack,
  HStack,
  VStack,
  Icon,
  IconButton,
  Grid,
  Select,
  useToast,
  Badge,
  Flex,
  Collapse,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { supabase } from "../../../lib/supabaseClient";
import { usePrefillPosteSource } from "#components/postes/HookForGetDataSource";
import {
  CheckCircleIcon,
  AddIcon,
  CopyIcon,
  DeleteIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@chakra-ui/icons";
import { FiZap, FiMapPin, FiCalendar, FiFileText, FiTrendingUp } from "react-icons/fi";

// --- Types ---
type GesResults = {
  total_co2_gco2e: number | string;
  total_ges_tco2e: number | string;
  energie_equivalente_kwh: number | string;
};

type CompteurDetailRow = {
  date: string;
  site: string;
  product: string;
  consumption: string;
  carbonIntensity: string;
  reference: string;
};

type CompteurGroup = {
  number: string;
  address: string;
  province: string;
  details: CompteurDetailRow[];
};

const resultFields = [
  { key: "total_co2_gco2e", label: "CO₂ [gCO2e]" },
  { key: "total_ges_tco2e", label: "Total GES [tCO2e]" },
  { key: "energie_equivalente_kwh", label: "Énergie équivalente [kWh]" },
];

// Animations
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
`;

// Helpers
const toNum = (x: any, fallback = 0) => {
  if (x === "" || x == null) return fallback;
  const n =
    typeof x === "number"
      ? x
      : Number(String(x).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

type Refs = {
  prpCO2: number;
};

export function Source6B1Form({
  posteId: initialPosteId,
  posteNum = 6,
  posteLabel = "6B1 – Électricité provenant du réseau électrique (Market based)",
  userId: propUserId,
  bilanId,
  onGesChange,
}: {
  posteId: string | null;
  posteNum?: number;
  posteLabel?: string;
  userId?: string | null;
  bilanId?: string;
  onGesChange?: (tco2e: number) => void;
}) {
  const toast = useToast();

  const [provinceOptions, setProvinceOptions] = useState<string[]>([]);
  const [siteOptions, setSiteOptions] = useState<string[]>([]);
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [compteurs, setCompteurs] = useState<CompteurGroup[]>([
    {
      number: "",
      address: "",
      province: "",
      details: [
        {
          date: "",
          site: "",
          product: "",
          consumption: "",
          carbonIntensity: "",
          reference: "",
        },
      ],
    },
  ]);

  const [refs, setRefs] = useState<Refs | null>(null);
  const [gesResults, setGesResults] = useState<GesResults[]>([]);
  const [posteId, setPosteId] = useState<string | null>(initialPosteId || null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(propUserId ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const total = gesResults.reduce((sum, r) => sum + (parseFloat(String(r?.total_ges_tco2e ?? 0)) || 0), 0);
    onGesChange?.(total);
  }, [gesResults, onGesChange]);
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});

  // Autosave
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJSONRef = useRef<string>("");

  // Design tokens
  const FIGMA = {
    bg: "#F5F6F5",
    green: "#344E41",
    greenLight: "#588157",
    greenSoft: "#DDE5E0",
    border: "#E4E4E4",
    text: "#404040",
    muted: "#8F8F8F",
    r: "16px",
    inputR: "15px",
    inputShadow: "0px 1px 6px 2px rgba(0,0,0,0.05)",
    buttonShadow: "0px 1px 6px 2px rgba(0,0,0,0.25)",
    cardShadow: "0 4px 16px rgba(0,0,0,0.08)",
    hoverShadow: "0 8px 24px rgba(0,0,0,0.12)",
  };

  // Province options
  useEffect(() => {
    fetch("/api/provinces")
      .then((res) => res.json())
      .then((data) => setProvinceOptions(data.provinces || []))
      .catch(() => setProvinceOptions([]));
  }, []);

  // Fetch sites and products from company data
  useEffect(() => {
    (async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes?.user;
        if (!user?.id) return;
        const { data: profile } = await supabase
          .from("user_profiles").select("company_id").eq("id", user.id).single();
        if (!profile?.company_id) return;
        const { data: company } = await supabase
          .from("companies").select("production_sites, products").eq("id", profile.company_id).single();
        const sites = ((company?.production_sites as any[]) || [])
          .map((s: any) => s?.nom).filter(Boolean) as string[];
        const prods = ((company?.products as any[]) || [])
          .map((p: any) => p?.nom).filter(Boolean) as string[];
        setSiteOptions(sites);
        setProductOptions(prods);
      } catch {}
    })();
  }, []);

  // Load PRP refs
  useEffect(() => {
    (async () => {
      try {
        const { data: gesRows, error } = await supabase
          .from("gaz_effet_serre")
          .select("formule_chimique, prp_100ans");
        if (error) throw error;

        const map: Record<string, number> = Object.fromEntries(
          (gesRows ?? [])
            .filter((r: any) => r?.formule_chimique && r?.prp_100ans != null)
            .map((r: any) => [
              String(r.formule_chimique).trim().toUpperCase(),
              Number(r.prp_100ans),
            ])
        );

        const prpCO2 = Number.isFinite(map["CO2"]) ? map["CO2"] : 1;
        setRefs({ prpCO2 });
      } catch (e) {
        console.error("6B1 refs load error:", e);
        setRefs({ prpCO2: 1 });
      }
    })();
  }, []);

  // Prefill hook
  const { loading: prefillLoading, data: prefillData, results: prefillResults } =
    usePrefillPosteSource(
      (userId ?? propUserId ?? "") as string,
      6,
      "6B1",
      { counters: [], invoices: [] }
    );

  const isDefaultEmptyForm = (groups: CompteurGroup[]) => {
    if (groups.length !== 1) return false;
    const g = groups[0];
    if (g.number || g.address || g.province) return false;
    if (g.details.length !== 1) return false;
    const d = g.details[0];
    return (
      !d.date &&
      !d.site &&
      !d.product &&
      !d.consumption &&
      !d.carbonIntensity &&
      !d.reference
    );
  };

  const buildGroupsFromCountersInvoices = (
    counters: any[] = [],
    invoices: any[] = []
  ): CompteurGroup[] => {
    const byNumber: Record<string, CompteurGroup> = {};
    (invoices || []).forEach((inv) => {
      const num = inv.number || "";
      if (!byNumber[num]) {
        const counter =
          (counters || []).find((c: any) => c.number === num) || {};
        byNumber[num] = {
          number: num,
          address: counter.address || inv.address || "",
          province: counter.province || inv.province || "",
          details: [],
        };
      }
      byNumber[num].details.push({
        date: inv.date || "",
        site: inv.site || "",
        product: inv.product || "",
        consumption: inv.consumption || "",
        carbonIntensity: inv.carbonIntensity || "",
        reference: inv.reference || "",
      });
    });

    const groups = Object.values(byNumber);
    if (!groups.length && counters.length) {
      return counters.map((c: any) => ({
        number: c.number || "",
        address: c.address || "",
        province: c.province || "",
        details: [
          {
            date: "",
            site: "",
            product: "",
            consumption: "",
            carbonIntensity: "",
            reference: "",
          },
        ],
      }));
    }
    return groups;
  };

  useEffect(() => {
    if (prefillLoading) return;
    if (!prefillData) return;
    if (!isDefaultEmptyForm(compteurs)) return;

    const groups = buildGroupsFromCountersInvoices(
      (prefillData as any)?.counters || [],
      (prefillData as any)?.invoices || []
    );
    if (groups.length) setCompteurs(groups);

    if (Array.isArray(prefillResults) && prefillResults.length) {
      setGesResults(prefillResults as GesResults[]);
    }
  }, [prefillLoading, prefillData, prefillResults]);

  // Load from submissions
  useEffect(() => {
    (async () => {
      setLoading(true);
      let activeUserId = propUserId;
      if (!activeUserId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        activeUserId = user.id;
        setUserId(user.id);
      }

      const { data } = await supabase
        .from("submissions")
        .select(`id, postes!postes_submission_id_fkey (id, poste_num, data, results)`)
        .eq("user_id", activeUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data && (data as any).postes) {
        const poste = posteId
          ? (data as any).postes.find((p: any) => p.id === posteId)
          : (data as any).postes.find((p: any) => p.poste_num === posteNum);

        if (poste) {
          setPosteId(poste.id);
          setSubmissionId((data as any).id);

          let parsedData = poste.data;
          if (typeof parsedData === "string") {
            try {
              parsedData = JSON.parse(parsedData);
            } catch {
              parsedData = {};
            }
          }

          if (parsedData?.counters && parsedData?.invoices) {
            const byNumber: { [num: string]: CompteurGroup } = {};
            parsedData.invoices.forEach((inv: any) => {
              if (!byNumber[inv.number]) {
                const counter =
                  parsedData.counters.find((c: any) => c.number === inv.number) ||
                  {};
                byNumber[inv.number] = {
                  number: inv.number,
                  address: counter.address || "",
                  province: counter.province || "",
                  details: [],
                };
              }
              byNumber[inv.number].details.push({
                date: inv.date || "",
                site: inv.site || "",
                product: inv.product || "",
                consumption: inv.consumption || "",
                carbonIntensity: inv.carbonIntensity || "",
                reference: inv.reference || "",
              });
            });
            const groups = Object.values(byNumber);
            setCompteurs(
              groups.length
                ? groups
                : [
                    {
                      number: "",
                      address: "",
                      province: "",
                      details: [
                        {
                          date: "",
                          site: "",
                          product: "",
                          consumption: "",
                          carbonIntensity: "",
                          reference: "",
                        },
                      ],
                    },
                  ]
            );
          }

          if (Array.isArray(poste.results) && poste.results.length) {
            setGesResults(poste.results || []);
          }
        }
      }

      setLoading(false);
      initializedRef.current = true;
      lastSavedJSONRef.current = JSON.stringify(compteurs);
    })();
  }, [propUserId, initialPosteId, posteNum]);

  // Table logic
  const addCompteur = () =>
    setCompteurs((prev) => [
      ...prev,
      {
        number: "",
        address: "",
        province: "",
        details: [
          {
            date: "",
            site: "",
            product: "",
            consumption: "",
            carbonIntensity: "",
            reference: "",
          },
        ],
      },
    ]);

  const removeCompteur = (gIdx: number) =>
    setCompteurs((prev) => prev.filter((_, idx) => idx !== gIdx));

  type CompteurFieldKey = "number" | "address" | "province";

  const updateCompteurField = (
    gIdx: number,
    key: CompteurFieldKey,
    value: string
  ) => {
    const newList = [...compteurs];
    newList[gIdx][key] = value;
    setCompteurs(newList);
  };

  const addDetailRow = (gIdx: number) => {
    const newList = [...compteurs];
    newList[gIdx].details.push({
      date: "",
      site: "",
      product: "",
      consumption: "",
      carbonIntensity: "",
      reference: "",
    });
    setCompteurs(newList);
  };

  const removeDetailRow = (gIdx: number, dIdx: number) => {
    const newList = [...compteurs];
    newList[gIdx].details.splice(dIdx, 1);
    if (newList[gIdx].details.length === 0) newList.splice(gIdx, 1);
    setCompteurs(newList);
  };

  const updateDetailField = (
    gIdx: number,
    dIdx: number,
    key: keyof CompteurDetailRow,
    value: string
  ) => {
    const newList = [...compteurs];
    newList[gIdx].details[dIdx][key] = value;
    setCompteurs(newList);
  };

  const buildCountersInvoices = useMemo(() => {
    return (groups: CompteurGroup[]) => {
      const counters = groups.map((group) => ({
        number: group.number,
        address: group.address,
        province: group.province,
      }));
      const invoices = groups.flatMap((group) =>
        group.details.map((detail) => ({
          number: group.number,
          address: group.address,
          province: group.province,
          date: detail.date,
          site: detail.site,
          product: detail.product,
          consumption: detail.consumption,
          carbonIntensity: detail.carbonIntensity,
          reference: detail.reference,
        }))
      );
      return { counters, invoices };
    };
  }, []);

  // Local calc
  const computeResults = (groups: CompteurGroup[], rf: Refs | null): GesResults[] => {
    if (!rf) return [];

    const rows: GesResults[] = [];

    for (const g of groups || []) {
      for (const d of g.details || []) {
        const AI_kwh = toNum(d.consumption, 0);
        const AJ_ci = toNum(d.carbonIntensity, 0);
        const PRP_CO2 = toNum(rf.prpCO2, 1);

        const co2_gco2e = AJ_ci * AI_kwh * PRP_CO2;
        const total_ges_gco2e = co2_gco2e;
        const total_ges_tco2e = total_ges_gco2e / 1e6;
        const energie_kwh = AI_kwh;

        rows.push({
          total_co2_gco2e: co2_gco2e,
          total_ges_tco2e: total_ges_tco2e,
          energie_equivalente_kwh: energie_kwh,
        });
      }
    }

    return rows;
  };

  useEffect(() => {
    const res = computeResults(compteurs, refs);
    setGesResults(res);
  }, [compteurs, refs]);

  // Autosave
  const saveDraft = async () => {
    if (!initializedRef.current) return;
    if (!userId || !posteId) return;

    const jsonNow = JSON.stringify(compteurs);
    if (jsonNow === lastSavedJSONRef.current) return;

    setSaving(true);
    setSaveMsg("Enregistrement…");

    const { counters, invoices } = buildCountersInvoices(compteurs);
    const payload = {
      user_id: userId,
      poste_source_id: posteId,
      source_code: "6B1",
      submission_id: bilanId ?? null,
      poste_num: 6,
      data: { counters, invoices },
      results: computeResults(compteurs, refs),
    };

    try {
      const dbResponse = await fetch("/api/4submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const dbResult = await dbResponse.json();
      if (!dbResponse.ok) {
        setSaveMsg("Erreur");
        console.error("Autosave DB error:", dbResult?.error || dbResult);
      } else {
        lastSavedJSONRef.current = jsonNow;
        setSaveMsg("Enregistré");
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
    if (!initializedRef.current) return;
    if (!userId || !posteId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(saveDraft, 1000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [compteurs, userId, posteId]);

  // Submit
  const validateData = (compteurs: CompteurGroup[]) =>
    compteurs.length > 0 &&
    compteurs.every(
      (group) =>
        group.number &&
        group.address &&
        group.province &&
        group.details.every((detail) => detail.date && detail.consumption && detail.carbonIntensity)
    );

  const handleSubmit = async () => {
    if (!userId || !posteId) {
      toast({
        title: "Erreur",
        description: "Champs obligatoires manquants",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    if (!validateData(compteurs)) {
      toast({
        title: "Validation échouée",
        description: "Veuillez remplir tous les champs requis.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    if (!refs) {
      toast({
        title: "Erreur",
        description: "Références PRP non chargées. Réessayez.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);

    const { counters, invoices } = buildCountersInvoices(compteurs);
    const results = computeResults(compteurs, refs);

    try {
      const dbPayload = {
        user_id: userId,
        poste_source_id: posteId,
        source_code: "6B1",
        submission_id: bilanId ?? null,
        poste_num: 6,
        data: { counters, invoices },
        results,
      };

      const dbResponse = await fetch("/api/4submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbPayload),
      });
      const dbResult = await dbResponse.json();

      if (!dbResponse.ok) {
        toast({
          title: "Erreur de sauvegarde",
          description: dbResult.error || "Erreur inconnue",
          status: "error",
          duration: 4000,
          isClosable: true,
        });
      } else {
        setGesResults(results);
        lastSavedJSONRef.current = JSON.stringify(compteurs);
        toast({
          title: "Succès!",
          description: "Données calculées et sauvegardées avec succès!",
          status: "success",
          duration: 4000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur inattendue lors de la sauvegarde.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }

    setLoading(false);
  };

  const displayColumns = resultFields.filter((f) =>
    (gesResults || []).some(
      (res) =>
        res &&
        (res as any)[f.key] !== undefined &&
        (res as any)[f.key] !== "" &&
        (res as any)[f.key] !== "#N/A"
    )
  );

  const toggleGroupExpand = (gIdx: number) => {
    setExpandedGroups((prev) => ({ ...prev, [gIdx]: !prev[gIdx] }));
  };

  if (loading)
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
        {/* Decorative gradient */}
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
                Poste 6B1
              </Badge>
            </HStack>
            <Heading
              as="h2"
              fontFamily="Inter"
              fontWeight={700}
              fontSize={{ base: "xl", md: "2xl" }}
              color={FIGMA.text}
            >
              {posteLabel}
            </Heading>
          </VStack>

          {/* Autosave status */}
          <Box
            minW="160px"
            bg={saving || saveMsg ? "white" : "transparent"}
            px={3}
            py={2}
            rounded="lg"
            transition="all 0.3s"
          >
            {saving && (
              <HStack color={FIGMA.muted} animation={`${pulse} 1.5s ease-in-out infinite`}>
                <Spinner size="sm" />
                <Text fontSize="sm" fontFamily="Montserrat" fontWeight={500}>
                  {saveMsg || "Enregistrement…"}
                </Text>
              </HStack>
            )}
            {!saving && saveMsg && (
              <HStack color="green.600" animation={`${slideIn} 0.3s ease-out`}>
                <Icon as={CheckCircleIcon} />
                <Text fontSize="sm" fontFamily="Montserrat" fontWeight={500}>
                  {saveMsg}
                </Text>
              </HStack>
            )}
          </Box>
        </Flex>
      </Box>

      {/* Table header */}
      <Box
        bg={`linear-gradient(135deg, ${FIGMA.green} 0%, ${FIGMA.greenLight} 100%)`}
        color="white"
        h="50px"
        rounded="xl"
        px={6}
        display={{ base: "none", xl: "flex" }}
        alignItems="center"
        mb={4}
        boxShadow="0 2px 8px rgba(52, 78, 65, 0.2)"
      >
        <Grid
          w="full"
          templateColumns="1.5fr 1.2fr 1.2fr 1fr 1fr 1fr 1.2fr 44px"
          columnGap={4}
          alignItems="center"
        >
          {[
            { label: "Compteur", icon: FiZap },
            { label: "Localisation", icon: FiMapPin },
            { label: "Site", icon: FiMapPin },
            { label: "Produit", icon: FiFileText },
            { label: "Consommation", icon: FiTrendingUp },
            { label: "Intensité carbone", icon: FiTrendingUp },
            { label: "Date", icon: FiCalendar },
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

      {/* Main form */}
      <Box
        bg="white"
        rounded="xl"
        p={6}
        boxShadow={FIGMA.cardShadow}
        transition="all 0.3s"
      >
        <Stack spacing={6}>
          {compteurs.map((group, gIdx) => {
            const isExpanded = expandedGroups[gIdx] ?? true;

            return (
              <Box
                key={`g-${gIdx}`}
                bg={FIGMA.bg}
                rounded="xl"
                p={4}
                border="2px solid"
                borderColor={FIGMA.border}
                transition="all 0.3s"
                _hover={{ borderColor: FIGMA.green }}
                animation={`${fadeInUp} 0.4s ease-out ${gIdx * 0.1}s both`}
              >
                {/* Group header */}
                <Flex justify="space-between" align="center" mb={isExpanded ? 4 : 0}>
                  <HStack spacing={3}>
                    <Box
                      w="40px"
                      h="40px"
                      rounded="lg"
                      bg="white"
                      boxShadow={FIGMA.inputShadow}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text fontFamily="Montserrat" fontSize="lg" fontWeight={700} color={FIGMA.green}>
                        {gIdx + 1}
                      </Text>
                    </Box>
                    <VStack align="flex-start" spacing={0}>
                      <Text fontFamily="Inter" fontWeight={600} color={FIGMA.text} fontSize="sm">
                        {group.number || "Nouveau compteur"}
                      </Text>
                      <Text fontFamily="Montserrat" fontSize="xs" color={FIGMA.muted}>
                        {group.details.length} ligne(s)
                      </Text>
                    </VStack>
                  </HStack>

                  <HStack spacing={2}>
                    <IconButton
                      aria-label="Dupliquer"
                      icon={<CopyIcon />}
                      variant="ghost"
                      color={FIGMA.muted}
                      size="sm"
                      _hover={{ color: FIGMA.green, bg: FIGMA.greenSoft }}
                      onClick={() => {
                        const clone = JSON.parse(JSON.stringify(group)) as CompteurGroup;
                        setCompteurs((prev) => [...prev, clone]);
                      }}
                    />
                    <IconButton
                      aria-label="Supprimer"
                      icon={<DeleteIcon />}
                      variant="ghost"
                      color={FIGMA.muted}
                      size="sm"
                      _hover={{ color: "red.500", bg: "red.50" }}
                      onClick={() => removeCompteur(gIdx)}
                    />
                    <IconButton
                      aria-label={isExpanded ? "Réduire" : "Développer"}
                      icon={isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                      variant="ghost"
                      color={FIGMA.muted}
                      size="sm"
                      onClick={() => toggleGroupExpand(gIdx)}
                    />
                  </HStack>
                </Flex>

                <Collapse in={isExpanded} animateOpacity>
                  <Stack spacing={4}>
                    {group.details.map((row, dIdx) => {
                      const showGroupFields = dIdx === 0;

                      return (
                        <Box
                          key={`r-${gIdx}-${dIdx}`}
                          bg="white"
                          rounded="xl"
                          p={4}
                          border="1px solid"
                          borderColor={FIGMA.border}
                          boxShadow={FIGMA.inputShadow}
                        >
                          {/* Main row */}
                          <Grid
                            templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                            columnGap={4}
                            rowGap={3}
                            alignItems="center"
                          >
                            {/* Compteur number */}
                            <Box display={showGroupFields ? "block" : "none"}>
                              <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">
                                Compteur
                              </Text>
                              <Input
                                value={group.number}
                                onChange={(e) => updateCompteurField(gIdx, "number", e.target.value)}
                                placeholder="Compteur #1"
                                h="42px"
                                rounded="lg"
                                bg="white"
                                borderColor={FIGMA.border}
                                boxShadow={FIGMA.inputShadow}
                                fontFamily="Montserrat"
                                fontSize="14px"
                                color={FIGMA.text}
                                _placeholder={{ color: FIGMA.muted }}
                                _focus={{
                                  borderColor: FIGMA.green,
                                  boxShadow: `0 0 0 1px ${FIGMA.green}`,
                                }}
                                transition="all 0.2s"
                              />
                            </Box>

                            {/* Province */}
                            <Box display={showGroupFields ? "block" : "none"}>
                              <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">
                                Province
                              </Text>
                              <Select
                                value={group.province}
                                onChange={(e) => updateCompteurField(gIdx, "province", e.target.value)}
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
                              >
                                <option value="">Sélectionner…</option>
                                {provinceOptions.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </Select>
                            </Box>

                            {/* Site */}
                            <Box>
                              <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">
                                Site
                              </Text>
                              <Select
                              value={row.site}
                              onChange={(e) => updateDetailField(gIdx, dIdx, "site", e.target.value)}
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
                            >
                              <option value="">Sélectionner…</option>
                              {siteOptions.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                              </Select>
                            </Box>

                            {/* Product */}
                            <Box>
                              <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">
                                Produit / Service
                              </Text>
                              <Select
                              value={row.product}
                              onChange={(e) => updateDetailField(gIdx, dIdx, "product", e.target.value)}
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
                            >
                              <option value="">Sélectionner…</option>
                              {productOptions.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                              </Select>
                            </Box>

                            {/* Consumption */}
                            <Box>
                              <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">
                                Consommation (kWh)
                              </Text>
                              <Input
                                type="number"
                                value={row.consumption}
                                onChange={(e) => updateDetailField(gIdx, dIdx, "consumption", e.target.value)}
                                placeholder="kWh"
                                h="42px"
                                rounded="lg"
                                bg="white"
                                borderColor={FIGMA.border}
                                boxShadow={FIGMA.inputShadow}
                                fontFamily="Montserrat"
                                fontSize="14px"
                                color={FIGMA.text}
                                _placeholder={{ color: FIGMA.muted }}
                                _focus={{
                                  borderColor: FIGMA.green,
                                  boxShadow: `0 0 0 1px ${FIGMA.green}`,
                                }}
                                textAlign="center"
                              />
                            </Box>

                            {/* Carbon Intensity */}
                            <Box>
                              <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">
                                Intensite carbone
                              </Text>
                              <Input
                                type="number"
                                value={row.carbonIntensity}
                                onChange={(e) => updateDetailField(gIdx, dIdx, "carbonIntensity", e.target.value)}
                                placeholder="kgCO2e/MWh"
                                h="42px"
                                rounded="lg"
                                bg="white"
                                borderColor={FIGMA.border}
                                boxShadow={FIGMA.inputShadow}
                                fontFamily="Montserrat"
                                fontSize="14px"
                                color={FIGMA.text}
                                _placeholder={{ color: FIGMA.muted }}
                                _focus={{
                                  borderColor: FIGMA.green,
                                  boxShadow: `0 0 0 1px ${FIGMA.green}`,
                                }}
                                textAlign="center"
                              />
                            </Box>

                            {/* Date */}
                            <Box>
                              <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">
                                Date
                              </Text>
                              <Input
                              type="date"
                              value={row.date}
                              onChange={(e) => updateDetailField(gIdx, dIdx, "date", e.target.value)}
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
                              />
                            </Box>

                            {/* Delete row */}
                            <IconButton
                              aria-label="Supprimer"
                              icon={<DeleteIcon />}
                              variant="ghost"
                              color={FIGMA.muted}
                              size="sm"
                              _hover={{ bg: "red.50", color: "red.500" }}
                              onClick={() => {
                                if (group.details.length > 1) removeDetailRow(gIdx, dIdx);
                                else removeCompteur(gIdx);
                              }}
                            />
                          </Grid>

                          {/* Sub row */}
                          {dIdx === group.details.length - 1 && (
                            <Grid
                              mt={4}
                              templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                              columnGap={4}
                              rowGap={3}
                              alignItems="center"
                            >
                              {/* Reference */}
                              <Box>
                                <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">
                                  Reference
                                </Text>
                                <Input
                                value={row.reference}
                                onChange={(e) => updateDetailField(gIdx, dIdx, "reference", e.target.value)}
                                placeholder="Référence"
                                h="42px"
                                rounded="lg"
                                bg="white"
                                borderColor={FIGMA.border}
                                boxShadow={FIGMA.inputShadow}
                                fontFamily="Montserrat"
                                fontSize="14px"
                                color={FIGMA.text}
                                _placeholder={{ color: FIGMA.muted }}
                                _focus={{
                                  borderColor: FIGMA.green,
                                  boxShadow: `0 0 0 1px ${FIGMA.green}`,
                                }}
                                />
                              </Box>

                              {/* Add row */}
                              <HStack justify="flex-end">
                                <IconButton
                                  aria-label="Ajouter une ligne"
                                  icon={<AddIcon />}
                                  variant="outline"
                                  borderColor={FIGMA.green}
                                  color={FIGMA.green}
                                  size="sm"
                                  _hover={{
                                    bg: FIGMA.green,
                                    color: "white",
                                  }}
                                  onClick={() => addDetailRow(gIdx)}
                                />
                              </HStack>
                            </Grid>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </Collapse>
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* Bottom actions */}
      <HStack mt={6} spacing={4} flexWrap="wrap">
        <Button
          leftIcon={<AddIcon />}
          variant="outline"
          borderColor={FIGMA.green}
          color={FIGMA.green}
          rounded="full"
          h="44px"
          px={6}
          onClick={addCompteur}
          fontFamily="Inter"
          fontWeight={600}
          _hover={{
            bg: FIGMA.greenSoft,
            borderColor: FIGMA.green,
          }}
          transition="all 0.2s"
        >
          Ajouter un compteur
        </Button>
      </HStack>

      {/* Results */}
      {gesResults?.length > 0 && displayColumns.length > 0 && (
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
                animation={`${fadeInUp} 0.4s ease-out ${idx * 0.1}s both`}
              >
                <Text fontSize="xs" color={FIGMA.muted} fontFamily="Montserrat" mb={2} textTransform="uppercase">
                  {f.label}
                </Text>
                <Text fontSize="2xl" fontWeight={700} color={FIGMA.green} fontFamily="Inter">
                  {gesResults.reduce((sum, res) => sum + toNum((res as any)[f.key], 0), 0).toFixed(2)}
                </Text>
              </Box>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
// import { useEffect, useMemo, useRef, useState } from "react";
// import {
//   Box,
//   Heading,
//   Text,
//   Table,
//   Thead,
//   Tbody,
//   Tr,
//   Th,
//   Td,
//   Input,
//   Button,
//   Spinner,
//   Stack,
//   useColorModeValue,
// } from "@chakra-ui/react";
// import { supabase } from "../../../lib/supabaseClient";
// import { usePrefillPosteSource } from "#components/postes/HookForGetDataSource";

// // --- Types ---
// type GesResults = {
//   total_co2_gco2e: number | string;
//   total_ges_tco2e: number | string;
//   energie_equivalente_kwh: number | string;
// };

// type CompteurDetailRow = {
//   date: string;
//   site: string;
//   product: string;
//   consumption: string; // AI181 (kWh)
//   carbonIntensity: string; // AJ181 (kgCO2e/MWh)
//   reference: string;
// };

// type CompteurGroup = {
//   number: string;
//   address: string;
//   province: string;
//   details: CompteurDetailRow[];
// };

// const resultFields = [
//   { key: "total_co2_gco2e", label: "CO₂ [gCO2e]" },
//   { key: "total_ges_tco2e", label: "Total GES [tCO2e]" },
//   { key: "energie_equivalente_kwh", label: "Énergie équivalente [kWh]" },
// ];

// // ---- Helpers (same spirit as 4B2) ----
// const toNum = (x: any, fallback = 0) => {
//   if (x === "" || x == null) return fallback;
//   const n =
//     typeof x === "number"
//       ? x
//       : Number(String(x).replace(",", ".").replace(/\s/g, ""));
//   return Number.isFinite(n) ? n : fallback;
// };

// // ---- Refs ----
// type Refs = {
//   prpCO2: number; // PRP!$J$8
// };

// export function Source6B1Form({
//   posteId: initialPosteId,
//   posteNum = 6,
//   posteLabel = "6B1 – Électricité provenant du réseau électrique (Market based)",
//   userId: propUserId,
// }: {
//   posteId: string | null;
//   posteNum?: number;
//   posteLabel?: string;
//   userId?: string | null;
// }) {
//   const [provinceOptions, setProvinceOptions] = useState<string[]>([]);
//   const [compteurs, setCompteurs] = useState<CompteurGroup[]>([
//     {
//       number: "",
//       address: "",
//       province: "",
//       details: [
//         {
//           date: "",
//           site: "",
//           product: "",
//           consumption: "",
//           carbonIntensity: "",
//           reference: "",
//         },
//       ],
//     },
//   ]);

//   const [refs, setRefs] = useState<Refs | null>(null);
//   const [gesResults, setGesResults] = useState<GesResults[]>([]);
//   const [posteId, setPosteId] = useState<string | null>(initialPosteId || null);
//   const [submissionId, setSubmissionId] = useState<string | null>(null);
//   const [userId, setUserId] = useState<string | null>(propUserId ?? null);
//   const [loading, setLoading] = useState(true);

//   // Autosave UI state
//   const [saving, setSaving] = useState(false);
//   const [saveMsg, setSaveMsg] = useState<string | null>(null);
//   const initializedRef = useRef(false);
//   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
//   const lastSavedJSONRef = useRef<string>("");

//   const olive = "#708238";
//   const oliveBg = useColorModeValue("#f6f8f3", "#202616");

//   // Province options
//   useEffect(() => {
//     fetch("/api/provinces")
//       .then((res) => res.json())
//       .then((data) => setProvinceOptions(data.provinces || []))
//       .catch(() => setProvinceOptions([]));
//   }, []);

//   // ---- Load PRP refs (PRP!$J$8) from DB like 4B2 ----
//   useEffect(() => {
//     (async () => {
//       try {
//         const { data: gesRows, error } = await supabase
//           .from("gaz_effet_serre")
//           .select("formule_chimique, prp_100ans");
//         if (error) throw error;

//         const map: Record<string, number> = Object.fromEntries(
//           (gesRows ?? [])
//             .filter((r: any) => r?.formule_chimique && r?.prp_100ans != null)
//             .map((r: any) => [
//               String(r.formule_chimique).trim().toUpperCase(),
//               Number(r.prp_100ans),
//             ])
//         );

//         // CO2 PRP is usually 1, but we respect DB.
//         const prpCO2 = Number.isFinite(map["CO2"]) ? map["CO2"] : 1;

//         setRefs({ prpCO2 });
//       } catch (e) {
//         console.error("6B1 refs load error:", e);
//         // fallback to 1 so the sheet still works
//         setRefs({ prpCO2: 1 });
//       }
//     })();
//   }, []);

//   // --------------------------
//   // Prefill hook
//   // --------------------------
//   const { loading: prefillLoading, data: prefillData, results: prefillResults } =
//     usePrefillPosteSource(
//       (userId ?? propUserId ?? "") as string,
//       6,
//       "6B1",
//       { counters: [], invoices: [] }
//     );

//   const isDefaultEmptyForm = (groups: CompteurGroup[]) => {
//     if (groups.length !== 1) return false;
//     const g = groups[0];
//     if (g.number || g.address || g.province) return false;
//     if (g.details.length !== 1) return false;
//     const d = g.details[0];
//     return (
//       !d.date &&
//       !d.site &&
//       !d.product &&
//       !d.consumption &&
//       !d.carbonIntensity &&
//       !d.reference
//     );
//   };

//   const buildGroupsFromCountersInvoices = (
//     counters: any[] = [],
//     invoices: any[] = []
//   ): CompteurGroup[] => {
//     const byNumber: Record<string, CompteurGroup> = {};
//     (invoices || []).forEach((inv) => {
//       const num = inv.number || "";
//       if (!byNumber[num]) {
//         const counter =
//           (counters || []).find((c: any) => c.number === num) || {};
//         byNumber[num] = {
//           number: num,
//           address: counter.address || inv.address || "",
//           province: counter.province || inv.province || "",
//           details: [],
//         };
//       }
//       byNumber[num].details.push({
//         date: inv.date || "",
//         site: inv.site || "",
//         product: inv.product || "",
//         consumption: inv.consumption || "",
//         carbonIntensity: inv.carbonIntensity || "",
//         reference: inv.reference || "",
//       });
//     });

//     const groups = Object.values(byNumber);
//     if (!groups.length && counters.length) {
//       return counters.map((c: any) => ({
//         number: c.number || "",
//         address: c.address || "",
//         province: c.province || "",
//         details: [
//           {
//             date: "",
//             site: "",
//             product: "",
//             consumption: "",
//             carbonIntensity: "",
//             reference: "",
//           },
//         ],
//       }));
//     }
//     return groups;
//   };

//   useEffect(() => {
//     if (prefillLoading) return;
//     if (!prefillData) return;
//     if (!isDefaultEmptyForm(compteurs)) return;

//     const groups = buildGroupsFromCountersInvoices(
//       (prefillData as any)?.counters || [],
//       (prefillData as any)?.invoices || []
//     );
//     if (groups.length) setCompteurs(groups);

//     // If backend had results, keep them. Otherwise local compute (once refs are ready)
//     if (Array.isArray(prefillResults) && prefillResults.length) {
//       setGesResults(prefillResults as GesResults[]);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [prefillLoading, prefillData, prefillResults]);

//   // --------------------------
//   // Load-from-submissions (initial)
//   // --------------------------
//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       let activeUserId = propUserId;
//       if (!activeUserId) {
//         const {
//           data: { user },
//         } = await supabase.auth.getUser();
//         if (!user) {
//           setLoading(false);
//           return;
//         }
//         activeUserId = user.id;
//         setUserId(user.id);
//       }

//       const { data } = await supabase
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

//       if (data && (data as any).postes) {
//         const poste = posteId
//           ? (data as any).postes.find((p: any) => p.id === posteId)
//           : (data as any).postes.find((p: any) => p.poste_num === posteNum);

//         if (poste) {
//           setPosteId(poste.id);
//           setSubmissionId((data as any).id);

//           let parsedData = poste.data;
//           if (typeof parsedData === "string") {
//             try {
//               parsedData = JSON.parse(parsedData);
//             } catch {
//               parsedData = {};
//             }
//           }

//           if (parsedData?.counters && parsedData?.invoices) {
//             const byNumber: { [num: string]: CompteurGroup } = {};
//             parsedData.invoices.forEach((inv: any) => {
//               if (!byNumber[inv.number]) {
//                 const counter =
//                   parsedData.counters.find((c: any) => c.number === inv.number) ||
//                   {};
//                 byNumber[inv.number] = {
//                   number: inv.number,
//                   address: counter.address || "",
//                   province: counter.province || "",
//                   details: [],
//                 };
//               }
//               byNumber[inv.number].details.push({
//                 date: inv.date || "",
//                 site: inv.site || "",
//                 product: inv.product || "",
//                 consumption: inv.consumption || "",
//                 carbonIntensity: inv.carbonIntensity || "",
//                 reference: inv.reference || "",
//               });
//             });
//             const groups = Object.values(byNumber);
//             setCompteurs(
//               groups.length
//                 ? groups
//                 : [
//                     {
//                       number: "",
//                       address: "",
//                       province: "",
//                       details: [
//                         {
//                           date: "",
//                           site: "",
//                           product: "",
//                           consumption: "",
//                           carbonIntensity: "",
//                           reference: "",
//                         },
//                       ],
//                     },
//                   ]
//             );
//           }

//           // Results from DB if present
//           if (Array.isArray(poste.results) && poste.results.length) {
//             setGesResults(poste.results || []);
//           }
//         }
//       }

//       setLoading(false);
//       initializedRef.current = true;
//       lastSavedJSONRef.current = JSON.stringify(compteurs);
//     })();
//     // eslint-disable-next-line
//   }, [propUserId, initialPosteId, posteNum]);

//   // --- Table logic ---
//   const addCompteur = () =>
//     setCompteurs((prev) => [
//       ...prev,
//       {
//         number: "",
//         address: "",
//         province: "",
//         details: [
//           {
//             date: "",
//             site: "",
//             product: "",
//             consumption: "",
//             carbonIntensity: "",
//             reference: "",
//           },
//         ],
//       },
//     ]);

//   const removeCompteur = (gIdx: number) =>
//     setCompteurs((prev) => prev.filter((_, idx) => idx !== gIdx));

//   type CompteurFieldKey = "number" | "address" | "province";

//   const updateCompteurField = (
//     gIdx: number,
//     key: CompteurFieldKey,
//     value: string
//   ) => {
//     const newList = [...compteurs];
//     newList[gIdx][key] = value;
//     setCompteurs(newList);
//   };

//   const addDetailRow = (gIdx: number) => {
//     const newList = [...compteurs];
//     newList[gIdx].details.push({
//       date: "",
//       site: "",
//       product: "",
//       consumption: "",
//       carbonIntensity: "",
//       reference: "",
//     });
//     setCompteurs(newList);
//   };

//   const removeDetailRow = (gIdx: number, dIdx: number) => {
//     const newList = [...compteurs];
//     newList[gIdx].details.splice(dIdx, 1);
//     if (newList[gIdx].details.length === 0) newList.splice(gIdx, 1);
//     setCompteurs(newList);
//   };

//   const updateDetailField = (
//     gIdx: number,
//     dIdx: number,
//     key: keyof CompteurDetailRow,
//     value: string
//   ) => {
//     const newList = [...compteurs];
//     newList[gIdx].details[dIdx][key] = value;
//     setCompteurs(newList);
//   };

//   // --- Helpers to build payload ---
//   const buildCountersInvoices = useMemo(() => {
//     return (groups: CompteurGroup[]) => {
//       const counters = groups.map((group) => ({
//         number: group.number,
//         address: group.address,
//         province: group.province,
//       }));
//       const invoices = groups.flatMap((group) =>
//         group.details.map((detail) => ({
//           number: group.number,
//           address: group.address,
//           province: group.province,
//           date: detail.date,
//           site: detail.site,
//           product: detail.product,
//           consumption: detail.consumption,
//           carbonIntensity: detail.carbonIntensity,
//           reference: detail.reference,
//         }))
//       );
//       return { counters, invoices };
//     };
//   }, []);

//   // ---- LOCAL CALC (Excel replica) ----
//   const computeResults = (groups: CompteurGroup[], rf: Refs | null): GesResults[] => {
//     if (!rf) return [];

//     // Return ONE result row per invoice row (like 4B2 returns per input row)
//     const rows: GesResults[] = [];

//     for (const g of groups || []) {
//       for (const d of g.details || []) {
//         const AI_kwh = toNum(d.consumption, 0);            // AI181
//         const AJ_ci = toNum(d.carbonIntensity, 0);         // AJ181 (kgCO2e/MWh)
//         const PRP_CO2 = toNum(rf.prpCO2, 1);               // PRP!$J$8

//         // BF181 (CO2) = AJ181 * AI181 * PRP!$J$8
//         const co2_gco2e = AJ_ci * AI_kwh * PRP_CO2;

//         // BI181 (total GES gCO2e) = SUM(BF:BH) (CH4/N2O are "-" here)
//         const total_ges_gco2e = co2_gco2e;

//         // BJ181 = BI181 / 10^6
//         const total_ges_tco2e = total_ges_gco2e / 1e6;

//         // energy = AI181
//         const energie_kwh = AI_kwh;

//         rows.push({
//           total_co2_gco2e: co2_gco2e,
//           total_ges_tco2e: total_ges_tco2e,
//           energie_equivalente_kwh: energie_kwh,
//         });
//       }
//     }

//     // If no invoice lines, return empty.
//     return rows;
//   };

//   // Recompute whenever inputs/refs change (like 4B2)
//   useEffect(() => {
//     const res = computeResults(compteurs, refs);
//     setGesResults(res);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [compteurs, refs]);

//   // --- AUTOSAVE (per-input, debounced) ---
//   const saveDraft = async () => {
//     if (!initializedRef.current) return;
//     if (!userId || !posteId) return;

//     const jsonNow = JSON.stringify(compteurs);
//     if (jsonNow === lastSavedJSONRef.current) return;

//     setSaving(true);
//     setSaveMsg("Enregistrement…");

//     const { counters, invoices } = buildCountersInvoices(compteurs);
//     const payload = {
//       user_id: userId,
//       poste_source_id: posteId,
//       source_code: "6B1",
//       poste_num: 6,
//       data: { counters, invoices },
//       results: computeResults(compteurs, refs),
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
//     if (!initializedRef.current) return;
//     if (!userId || !posteId) return;
//     if (debounceRef.current) clearTimeout(debounceRef.current);
//     debounceRef.current = setTimeout(saveDraft, 1000);
//     return () => {
//       if (debounceRef.current) clearTimeout(debounceRef.current);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [compteurs, userId, posteId]);

//   // --- Submit Handler (compute + save) ---
//   const validateData = (compteurs: CompteurGroup[]) =>
//     compteurs.length > 0 &&
//     compteurs.every(
//       (group) =>
//         group.number &&
//         group.address &&
//         group.province &&
//         group.details.every((detail) => detail.date && detail.consumption && detail.carbonIntensity)
//     );

//   const handleSubmit = async () => {
//     if (!userId || !posteId) {
//       alert("Champs obligatoires manquants (posteId ou userId)");
//       return;
//     }
//     if (!validateData(compteurs)) {
//       alert("Veuillez remplir tous les champs requis (compteurs et détails).");
//       return;
//     }
//     if (!refs) {
//       alert("Références PRP non chargées (CO2). Réessayez dans quelques secondes.");
//       return;
//     }

//     setLoading(true);

//     const { counters, invoices } = buildCountersInvoices(compteurs);
//     const results = computeResults(compteurs, refs);

//     try {
//       const dbPayload = {
//         user_id: userId,
//         poste_source_id: posteId,
//         source_code: "6B1",
//         poste_num: 6,
//         data: { counters, invoices },
//         results,
//       };

//       const dbResponse = await fetch("/api/4submit", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(dbPayload),
//       });
//       const dbResult = await dbResponse.json();

//       if (!dbResponse.ok) {
//         alert("Erreur lors de la sauvegarde en base : " + (dbResult.error || ""));
//       } else {
//         setGesResults(results);
//         lastSavedJSONRef.current = JSON.stringify(compteurs);
//         alert("Données 6B1 calculées et sauvegardées avec succès!");
//       }
//     } catch (error) {
//       alert("Erreur inattendue lors de la sauvegarde en base.");
//     }

//     setLoading(false);
//   };

//   // Only show result columns with at least one value
//   const displayColumns = resultFields.filter((f) =>
//     (gesResults || []).some(
//       (res) =>
//         res &&
//         (res as any)[f.key] !== undefined &&
//         (res as any)[f.key] !== "" &&
//         (res as any)[f.key] !== "#N/A"
//     )
//   );

//   if (loading)
//     return (
//       <Box display="flex" alignItems="center" justifyContent="center" minH="300px">
//         <Spinner color={olive} size="xl" />
//       </Box>
//     );

//   return (
//     <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
//       <Heading as="h3" size="md" color={olive} mb={2}>
//         {posteLabel}
//       </Heading>

//       <Stack direction="row" align="center" spacing={3} mb={4}>
//         {saving && <Spinner size="sm" color={olive} />}
//         <Text fontSize="sm" color="gray.600">
//           {saveMsg ?? "Saisie automatique activée"}
//         </Text>
//       </Stack>

//       <Table size="sm" variant="simple">
//         <Thead>
//           <Tr>
//             <Th>NUMÉRO</Th>
//             <Th>ADRESSE</Th>
//             <Th>RÉSEAU ÉLECTRIQUE</Th>
//             <Th>DATE</Th>
//             <Th>SITE</Th>
//             <Th>PRODUIT</Th>
//             <Th>CONSOMMATION (kWh)</Th>
//             <Th>INTENSITÉ CARBONE (kgCO2e/MWh)</Th>
//             <Th>RÉFÉRENCES</Th>
//             <Th></Th>
//           </Tr>
//         </Thead>
//         <Tbody>
//           {compteurs.map((group, gIdx) =>
//             group.details.map((row, dIdx) => (
//               <Tr key={gIdx + "-" + dIdx}>
//                 {dIdx === 0 && (
//                   <>
//                     <Td rowSpan={group.details.length}>
//                       <Input value={group.number} onChange={(e) => updateCompteurField(gIdx, "number", e.target.value)} />
//                     </Td>
//                     <Td rowSpan={group.details.length}>
//                       <Input value={group.address} onChange={(e) => updateCompteurField(gIdx, "address", e.target.value)} />
//                     </Td>
//                     <Td rowSpan={group.details.length}>
//                       <select
//                         value={group.province}
//                         onChange={(e) => updateCompteurField(gIdx, "province", e.target.value)}
//                         style={{ width: "100%", padding: "8px", borderRadius: "8px" }}
//                       >
//                         <option value="">Sélectionner...</option>
//                         {provinceOptions.map((p) => (
//                           <option key={p} value={p}>
//                             {p}
//                           </option>
//                         ))}
//                       </select>
//                     </Td>
//                   </>
//                 )}

//                 <Td>
//                   <Input type="date" value={row.date} onChange={(e) => updateDetailField(gIdx, dIdx, "date", e.target.value)} />
//                 </Td>
//                 <Td>
//                   <Input value={row.site} onChange={(e) => updateDetailField(gIdx, dIdx, "site", e.target.value)} />
//                 </Td>
//                 <Td>
//                   <Input value={row.product} onChange={(e) => updateDetailField(gIdx, dIdx, "product", e.target.value)} />
//                 </Td>
//                 <Td>
//                   <Input type="number" value={row.consumption} onChange={(e) => updateDetailField(gIdx, dIdx, "consumption", e.target.value)} />
//                 </Td>
//                 <Td>
//                   <Input type="number" value={row.carbonIntensity} onChange={(e) => updateDetailField(gIdx, dIdx, "carbonIntensity", e.target.value)} />
//                 </Td>
//                 <Td>
//                   <Input value={row.reference} onChange={(e) => updateDetailField(gIdx, dIdx, "reference", e.target.value)} />
//                 </Td>
//                 <Td>
//                   <Stack direction="row" spacing={1}>
//                     <Button size="xs" onClick={() => addDetailRow(gIdx)} colorScheme="blue" title="Ajouter une ligne">
//                       +
//                     </Button>
//                     {group.details.length > 1 && (
//                       <Button size="xs" onClick={() => removeDetailRow(gIdx, dIdx)} colorScheme="red" title="Supprimer la ligne">
//                         -
//                       </Button>
//                     )}
//                     {dIdx === 0 && (
//                       <Button size="xs" onClick={() => removeCompteur(gIdx)} colorScheme="red" title="Supprimer tout ce compteur">
//                         Suppr. compteur
//                       </Button>
//                     )}
//                   </Stack>
//                 </Td>
//               </Tr>
//             ))
//           )}
//         </Tbody>
//       </Table>

//       <Button mt={3} colorScheme="green" onClick={addCompteur}>
//         Ajouter un compteur
//       </Button>
//       <Button mt={3} ml={4} colorScheme="blue" onClick={handleSubmit}>
//         Soumettre
//       </Button>

//       <Box mt={6} bg="#e5f2fa" rounded="xl" boxShadow="md" p={4}>
//         <Text fontWeight="bold" color={olive} mb={2}>
//           Calculs et résultats
//         </Text>

//         {gesResults && gesResults.length > 0 && displayColumns.length > 0 ? (
//           <Table size="sm" variant="simple">
//             <Thead>
//               <Tr>
//                 {displayColumns.map((f) => (
//                   <Th key={f.key}>{f.label}</Th>
//                 ))}
//               </Tr>
//             </Thead>
//             <Tbody>
//               {gesResults.map((result, idx) => (
//                 <Tr key={idx}>
//                   {displayColumns.map((f) => (
//                     <Td fontWeight="bold" key={f.key}>
//                       {(result as any)[f.key] !== undefined && (result as any)[f.key] !== "" && (result as any)[f.key] !== "#N/A"
//                         ? (result as any)[f.key]
//                         : "-"}
//                     </Td>
//                   ))}
//                 </Tr>
//               ))}
//             </Tbody>
//           </Table>
//         ) : (
//           <Text color="gray.500">Aucun résultat à afficher.</Text>
//         )}
//       </Box>
//     </Box>
//   );
// }

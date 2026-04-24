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
  Icon,
  IconButton,
  Grid,
  Select,
  useToast,
  VStack,
  Badge,
  Flex,
  Collapse,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useDropzone } from "react-dropzone";
import { supabase } from "../../../lib/supabaseClient";
import {
  CheckCircleIcon,
  AttachmentIcon,
  AddIcon,
  CopyIcon,
  DeleteIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@chakra-ui/icons";
import { FiZap, FiMapPin, FiCalendar, FiFileText } from "react-icons/fi";

type GesResults = {
  total_co2_gco2e: number | string;
  total_ges_tco2e: number | string;
  energie_equivalente_kwh: number | string;
};

type CompteurDetailRow = {
  date: string;
  consumption: string;
  reference: string;
  periode?: string;
};

type CompteurGroup = {
  number: string;
  address: string;
  province: string;
  details: CompteurDetailRow[];
  site?: string;
  commentaires?: string;
};

const resultFields = [
  { key: "total_co2_gco2e", label: "CO₂ [gCO2e]" },
  { key: "total_ges_tco2e", label: "Total GES [tCO2e]" },
  { key: "energie_equivalente_kwh", label: "Énergie équivalente [kWh]" },
] as const;

/* ── Provincial emission factors (kgCO₂e/kWh) ── */
const PROVINCE_FACTORS: Record<string, number> = {
  "Québec":                    0.002,
  "Ontario":                   0.056,
  "Colombie-Britannique":      0.013,
  "Alberta":                   0.670,
  "Manitoba":                  0.004,
  "Saskatchewan":              0.510,
  "Nouvelle-Écosse":           0.670,
  "Nouveau-Brunswick":         0.300,
  "Île-du-Prince-Édouard":     0.280,
  "Terre-Neuve-et-Labrador":   0.019,
  "Nunavut":                   0.733,
  "Territoires du Nord-Ouest": 0.279,
  "Yukon":                     0.073,
};

function calcRowTco2e(province: string, consumption: string): number {
  const kwh = parseFloat(consumption.replace(/\s/g, "").replace(",", ".")) || 0;
  const factor = PROVINCE_FACTORS[province] ?? 0.002;
  return +(factor * kwh / 1000).toFixed(4); // tCO₂e
}

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


export function SourceAForm({
  posteId: initialPosteId,
  posteNum = 6,
  posteLabel = "6A1 - Électricité provenant du réseau électrique (Location based)",
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
  const [compteurs, setCompteurs] = useState<CompteurGroup[]>([
    { number: "", address: "", province: "", details: [{ date: "", consumption: "", reference: "" }] },
  ]);

  const [gesResults, setGesResults] = useState<GesResults[]>([]);
  const [posteId, setPosteId] = useState<string | null>(initialPosteId || null);
  const [userId, setUserId] = useState<string | null>(propUserId ?? null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const total = (compteurs || []).reduce((sum, g) =>
      sum + (g.details || []).reduce((s, d) => s + calcRowTco2e(g.province, d.consumption), 0), 0);
    onGesChange?.(total);
  }, [compteurs, onGesChange]);
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});

  // Autosave
  const [autoSaving, setAutoSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const lastSavedHashRef = useRef<string>("");
  const debounceTimerRef = useRef<any>(null);

  // Enhanced design tokens
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

  // Drag & drop file upload
  const onDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setUploading(true);

    const formData = new FormData();
    acceptedFiles.forEach((file) => formData.append("file", file));

    try {
      const res = await fetch("/api/upload-bill", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'extraction");

      if (Array.isArray(data) && data.length > 0) {
        const extracted: CompteurGroup[] = data.map((item: any) => {
          const r = item?.result || {};

          let dateVal = r.date || "";
          const months: Record<string, string> = {
            janvier: "01", février: "02", mars: "03", avril: "04",
            mai: "05", juin: "06", juillet: "07", août: "08",
            septembre: "09", octobre: "10", novembre: "11", décembre: "12",
          };
          const frDateMatch = typeof dateVal === "string" ? dateVal.match(/^(\d{1,2}) (\w+) (\d{4})$/i) : null;
          if (frDateMatch) {
            const [, day, month, year] = frDateMatch;
            const mm = months[month.toLowerCase()] || "01";
            dateVal = `${year}-${mm}-${String(day).padStart(2, "0")}`;
          }

          const references = [
            item?.filename,
            r.period ? `Période: ${r.period}` : "",
            r.amount ? `Montant: ${r.amount}` : "",
            r.client_name ? `Client: ${r.client_name}` : "",
          ]
            .filter(Boolean)
            .join(" | ");

          return {
            number: "",
            address: r.address || "",
            province: "",
            site: "",
            commentaires: "",
            details: [
              {
                date: dateVal,
                consumption: r.kwh ? String(r.kwh).replace(/\s/g, "") : "",
                reference: references,
                periode: "",
              },
            ],
          };
        });

        setCompteurs(extracted);
        scheduleAutosave();

        toast({
          title: "Factures importées!",
          description: `${data.length} fichier(s) traité(s) avec succès.`,
          status: "success",
          duration: 4000,
          isClosable: true,
          position: "top-right",
        });
      } else {
        toast({
          title: "Aucune donnée détectée.",
          description: "Impossible de lire les fichiers.",
          status: "warning",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
      }
    } catch (err: any) {
      toast({
        title: "Erreur à l'import.",
        description: err?.message || "Erreur inconnue",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg"],
    },
    multiple: true,
    disabled: uploading,
  });

  useEffect(() => {
    fetch("/api/provinces")
      .then((res) => res.json())
      .then((data) => setProvinceOptions(data.provinces || []))
      .catch(() => setProvinceOptions([]));
  }, []);

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
          .from("companies").select("production_sites").eq("id", profile.company_id).single();
        const sites = ((company?.production_sites as any[]) || [])
          .map((s: any) => s?.nom).filter(Boolean) as string[];
        setSiteOptions(sites);
      } catch {}
    })();
  }, []);

  const isDefaultEmptyForm = (groups: CompteurGroup[]) => {
    if (groups.length !== 1) return false;
    const g = groups[0];
    if (g.number || g.address || g.province) return false;
    if (g.details.length !== 1) return false;
    const d = g.details[0];
    return !d.date && !d.consumption && !d.reference;
  };

  const buildGroupsFromCountersInvoices = (counters: any[] = [], invoices: any[] = []): CompteurGroup[] => {
    const byNumber: Record<string, CompteurGroup> = {};
    (invoices || []).forEach((inv) => {
      const num = inv.number || "";
      if (!byNumber[num]) {
        const counter = (counters || []).find((c: any) => c.number === num) || {};
        byNumber[num] = {
          number: num,
          address: counter.address || inv.address || "",
          province: counter.province || inv.province || "",
          site: inv.site || "",
          commentaires: inv.commentaires || "",
          details: [],
        };
      }
      byNumber[num].details.push({
        date: inv.date || "",
        consumption: inv.consumption || "",
        reference: inv.reference || "",
        periode: inv.periode || "",
      });
    });

    const groups = Object.values(byNumber);

    if (!groups.length && counters.length) {
      return counters.map((c: any) => ({
        number: c.number || "",
        address: c.address || "",
        province: c.province || "",
        site: c.site || "",
        commentaires: c.commentaires || "",
        details: [{ date: "", consumption: "", reference: "", periode: "" }],
      }));
    }

    return groups;
  };

  useEffect(() => {
    (async () => {
      try {
        let activeUserId = propUserId ?? userId;
        if (!activeUserId) {
          const { data } = await supabase.auth.getUser();
          const u = data?.user;
          if (!u?.id) return;
          activeUserId = u.id;
          setUserId(u.id);
        }

        if (!isDefaultEmptyForm(compteurs)) return;

        const qs = new URLSearchParams({
          user_id: String(activeUserId),
          poste_num: String(posteNum),
          source_code: "6A1",
        });

        const res = await fetch(`/api/GetSourceHandler?${qs.toString()}`, { method: "GET" });
        if (!res.ok) return;
        const json = await res.json();

        const savedData = json?.data;
        const savedResults = json?.results;

        if (savedData && (Array.isArray(savedData.counters) || Array.isArray(savedData.invoices))) {
          const groups = buildGroupsFromCountersInvoices(savedData.counters || [], savedData.invoices || []);
          if (groups.length) setCompteurs(groups);
        }
        if (Array.isArray(savedResults) && savedResults.length) setGesResults(savedResults);
      } catch {
        // ignore
      }
    })();
  }, [propUserId, userId, posteNum]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      let activeUserId = propUserId;
      if (!activeUserId) {
        const { data } = await supabase.auth.getUser();
        const u = data?.user;
        if (!u) {
          setLoading(false);
          return;
        }
        activeUserId = u.id;
        setUserId(u.id);
      }

      let filter = { user_id: activeUserId } as any;
      if (posteId) filter = { ...filter, "postes.id": posteId };

      const { data: sub } = await supabase
        .from("submissions")
        .select(`id, postes!postes_submission_id_fkey (id, poste_num, data, results)`)
        .eq("user_id", activeUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (sub && sub.postes) {
        const poste = posteId ? sub.postes.find((p: any) => p.id === posteId) : sub.postes.find((p: any) => p.poste_num === posteNum);

        if (poste) {
          setPosteId(poste.id);

          let parsedData = poste.data;
          if (typeof parsedData === "string") {
            try {
              parsedData = JSON.parse(parsedData);
            } catch {
              parsedData = {};
            }
          }

          if (parsedData?.counters && parsedData?.invoices) {
            const groups = buildGroupsFromCountersInvoices(parsedData.counters || [], parsedData.invoices || []);
            setCompteurs(groups.length ? groups : [{ number: "", address: "", province: "", details: [{ date: "", consumption: "", reference: "" }] }]);
          } else {
            setCompteurs([{ number: "", address: "", province: "", details: [{ date: "", consumption: "", reference: "" }] }]);
          }

          setGesResults(poste.results || []);
        }
      }

      setLoading(false);
    })();
  }, [propUserId, initialPosteId, posteNum]);

  const addCompteur = () => {
    setCompteurs((prev) => [
      ...prev,
      {
        number: "",
        address: "",
        province: "",
        site: "",
        commentaires: "",
        details: [{ date: "", consumption: "", reference: "", periode: "" }],
      },
    ]);
    scheduleAutosave();
  };

  const removeCompteur = (gIdx: number) => {
    setCompteurs((prev) => prev.filter((_, idx) => idx !== gIdx));
    scheduleAutosave();
  };

  type CompteurFieldKey = "number" | "address" | "province";
  const updateCompteurField = (gIdx: number, key: CompteurFieldKey, value: string) => {
    setCompteurs((prev) => {
      const next = [...prev];
      next[gIdx] = { ...next[gIdx], [key]: value };
      return next;
    });
    scheduleAutosave();
  };

  const updateCompteurUIField = (gIdx: number, key: "site" | "commentaires", value: string) => {
    setCompteurs((prev) => {
      const next = [...prev];
      next[gIdx] = { ...next[gIdx], [key]: value };
      return next;
    });
    scheduleAutosave();
  };

  const addDetailRow = (gIdx: number) => {
    setCompteurs((prev) => {
      const next = [...prev];
      const g = next[gIdx];
      const details = [...g.details, { date: "", consumption: "", reference: "", periode: "" }];
      next[gIdx] = { ...g, details };
      return next;
    });
    scheduleAutosave();
  };

  const removeDetailRow = (gIdx: number, dIdx: number) => {
    setCompteurs((prev) => {
      const next = [...prev];
      const g = next[gIdx];
      const details = [...g.details];
      details.splice(dIdx, 1);

      if (details.length === 0) {
        next.splice(gIdx, 1);
      } else {
        next[gIdx] = { ...g, details };
      }
      return next;
    });
    scheduleAutosave();
  };

  const updateDetailField = (
    gIdx: number,
    dIdx: number,
    key: keyof CompteurDetailRow,
    value: string
  ) => {
    setCompteurs((prev) => {
      const next = [...prev];
      const g = next[gIdx];
      const details = [...g.details];
      details[dIdx] = { ...details[dIdx], [key]: value };
      next[gIdx] = { ...g, details };
      return next;
    });
    scheduleAutosave();
  };

  const validateData = (groups: CompteurGroup[]) =>
    groups.length > 0 &&
    groups.every(
      (group) =>
        group.number &&
        group.address &&
        group.province &&
        group.details.every((detail) => detail.date && detail.consumption !== "")
    );

  const buildPayload = (groups: CompteurGroup[]) => {
    const counters = groups.map((group) => ({
      number: group.number,
      address: group.address,
      province: group.province,
      site: group.site,
      commentaires: group.commentaires,
    }));

    const invoices = groups.flatMap((group) =>
      group.details.map((detail) => ({
        number: group.number,
        address: group.address,
        province: group.province,
        site: group.site,
        date: detail.date,
        consumption: detail.consumption,
        reference: detail.reference,
        periode: detail.periode,
      }))
    );

    return { counters, invoices };
  };

  function scheduleAutosave() {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void autosave();
    }, 800);
  }

  const autosave = async () => {
    if (!userId || !posteId) return;

    const base = buildPayload(compteurs);
    const baseHash = JSON.stringify(base);
    if (baseHash === lastSavedHashRef.current) return;

    setAutoSaving(true);
    setJustSaved(false);

    let results: GesResults[] = [];

    try {
      if (validateData(compteurs)) {
        try {
          const resp = await fetch(
            "https://allposteswebhook-129138384907.us-central1.run.app/submit/6A1",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: userId,
                poste_source_id: posteId,
                source_code: "6A1",
                poste_num: 6,
                data: base,
              }),
            }
          );
          const json = await resp.json();
          if (resp.ok && Array.isArray(json.results)) {
            results = json.results as GesResults[];
            setGesResults(results);
          }
        } catch {
          // silent
        }
      }

      const dbPayload = {
        user_id: userId,
        poste_source_id: posteId,
        source_code: "6A1",
        submission_id: bilanId ?? null,
        poste_num: 6,
        data: base,
        results,
      };

      const dbResp = await fetch("/api/4submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbPayload),
      });

      if (dbResp.ok) {
        lastSavedHashRef.current = baseHash;
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1500);
      }
    } finally {
      setAutoSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!userId || !posteId) {
      toast({
        title: "Erreur",
        description: "Champs obligatoires manquants (posteId ou userId)",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    if (!validateData(compteurs)) {
      toast({
        title: "Validation échouée",
        description: "Veuillez remplir tous les champs requis (compteurs et détails).",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setGesResults([]);
    setLoading(true);

    const data = buildPayload(compteurs);
    const payload = {
      user_id: userId,
      poste_source_id: posteId,
      source_code: "6A1",
      submission_id: bilanId ?? null,
      poste_num: 6,
      data,
    };

    let results: GesResults[] = [];
    let webhookOk = false;

    try {
      const response = await fetch(
        "https://allposteswebhook-129138384907.us-central1.run.app/submit/6A1",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        toast({
          title: "Erreur de calcul",
          description: result.error || "Erreur lors du calcul GES",
          status: "error",
          duration: 4000,
          isClosable: true,
        });
      } else {
        results = Array.isArray(result.results) ? result.results : [];
        webhookOk = true;
      }
    } catch {
      toast({
        title: "Erreur réseau",
        description: "Impossible de se connecter au service de calcul.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
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
        toast({
          title: "Erreur de sauvegarde",
          description: dbResult.error || "Erreur lors de la sauvegarde",
          status: "error",
          duration: 4000,
          isClosable: true,
        });
      } else {
        setGesResults(results);
        toast({
          title: "Succès!",
          description: webhookOk
            ? "Données calculées et sauvegardées avec succès!"
            : "Données sauvegardées (calcul en attente).",
          status: "success",
          duration: 4000,
          isClosable: true,
        });
      }
    } catch {
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

  const toggleGroupExpand = (gIdx: number) => {
    setExpandedGroups((prev) => ({ ...prev, [gIdx]: !prev[gIdx] }));
  };

  if (loading) {
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
                Poste 6A1
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

          <HStack spacing={3} flexWrap="wrap">
            {/* Autosave status */}
            <Box
              minW="160px"
              bg={autoSaving || justSaved ? "white" : "transparent"}
              px={3}
              py={2}
              rounded="lg"
              transition="all 0.3s"
            >
              {autoSaving && (
                <HStack color={FIGMA.muted} animation={`${pulse} 1.5s ease-in-out infinite`}>
                  <Spinner size="sm" />
                  <Text fontSize="sm" fontFamily="Montserrat" fontWeight={500}>
                    Enregistrement…
                  </Text>
                </HStack>
              )}
              {!autoSaving && justSaved && (
                <HStack color="green.600" animation={`${slideIn} 0.3s ease-out`}>
                  <Icon as={CheckCircleIcon} />
                  <Text fontSize="sm" fontFamily="Montserrat" fontWeight={500}>
                    Enregistré
                  </Text>
                </HStack>
              )}
            </Box>

            {/* Upload button */}
            <Box
              {...getRootProps()}
              opacity={uploading ? 0.7 : 1}
              transition="all 0.3s"
              position="relative"
            >
              <input {...getInputProps()} />
              <Button
                leftIcon={<AttachmentIcon />}
                bg={isDragActive ? FIGMA.greenLight : FIGMA.green}
                color="white"
                h="44px"
                px={6}
                rounded="full"
                boxShadow={FIGMA.buttonShadow}
                _hover={{
                  bg: FIGMA.greenLight,
                  transform: "translateY(-2px)",
                  boxShadow: FIGMA.hoverShadow,
                }}
                _active={{ transform: "translateY(0)" }}
                isLoading={uploading}
                loadingText="Extraction…"
                fontFamily="Inter"
                fontWeight={600}
                fontSize="15px"
                transition="all 0.2s"
              >
                Ajouter un document
              </Button>
              {isDragActive && (
                <Box
                  position="absolute"
                  inset={0}
                  border="2px dashed"
                  borderColor={FIGMA.green}
                  rounded="full"
                  animation={`${pulse} 1s ease-in-out infinite`}
                />
              )}
            </Box>
          </HStack>
        </Flex>
      </Box>

      {/* Table header */}
      <Box
        bg={`linear-gradient(135deg, ${FIGMA.green} 0%, ${FIGMA.greenLight} 100%)`}
        color="white"
        h="50px"
        rounded="xl"
        px={6}
        display={{ base: "none", lg: "flex" }}
        alignItems="center"
        mb={4}
        boxShadow="0 2px 8px rgba(52, 78, 65, 0.2)"
      >
        <Grid
          w="full"
          templateColumns="2.2fr 1.7fr 1.2fr 1.2fr 1fr 44px"
          columnGap={6}
          alignItems="center"
        >
          {[
            { label: "Compteur électrique", icon: FiZap },
            { label: "Site associé", icon: FiMapPin },
            { label: "Localisation", icon: FiMapPin },
            { label: "Consommation", icon: FiZap },
            { label: "Période", icon: FiCalendar },
          ].map(({ label, icon }) => (
            <HStack key={label} justify="center" spacing={2}>
              <Icon as={icon} boxSize={4} />
              <Text fontFamily="Montserrat" fontWeight={600} fontSize="15px">
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
                        {group.details.length} période(s)
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
                        scheduleAutosave();
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
                            {/* Compteur */}
                            <Box display={showGroupFields ? "block" : "none"}>
                              <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">
                                Compteur
                              </Text>
                              <Input
                                value={group.number}
                                onChange={(e) => updateCompteurField(gIdx, "number", e.target.value)}
                                placeholder="Compteur HQ - Campus #1"
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

                            {/* Site */}
                            <Box display={showGroupFields ? "block" : "none"}>
                              <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">
                                Site
                              </Text>
                              <Select
                                value={group.site ?? ""}
                                onChange={(e) => updateCompteurUIField(gIdx, "site", e.target.value)}
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

                            {/* Consumption */}
                            <Box>
                              <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">
                                Consommation (kWh)
                              </Text>
                              <Input
                                value={row.consumption}
                                onChange={(e) => updateDetailField(gIdx, dIdx, "consumption", e.target.value)}
                                placeholder="35 280 kWh"
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

                            {/* Period */}
                            <Box>
                              <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">
                                Periode
                              </Text>
                              <Select
                              value={row.periode ?? ""}
                              onChange={(e) => updateDetailField(gIdx, dIdx, "periode", e.target.value)}
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
                              {[
                                "Janvier", "Février", "Mars", "Avril",
                                "Mai", "Juin", "Juillet", "Août",
                                "Septembre", "Octobre", "Novembre", "Décembre",
                              ].map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                              </Select>
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
                              {/* Comments */}
                              <Box>
                                <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">
                                  Commentaires <Text as="span" fontWeight={400}>(optionnel)</Text>
                                </Text>
                                <Input
                                  value={group.commentaires ?? ""}
                                  onChange={(e) => updateCompteurUIField(gIdx, "commentaires", e.target.value)}
                                  placeholder="Commentaires (optionnel)"
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

                              {/* Result — live local calc */}
                              {(() => {
                                const liveVal = calcRowTco2e(group.province, row.consumption);
                                const hasVal = liveVal > 0;
                                return (
                                  <Box
                                    bg={hasVal ? FIGMA.greenSoft : "transparent"}
                                    px={4}
                                    py={2}
                                    rounded="lg"
                                    transition="all 0.3s"
                                  >
                                    <Text
                                      textAlign="right"
                                      fontFamily="Montserrat"
                                      fontWeight={600}
                                      fontSize="14px"
                                      color={hasVal ? FIGMA.green : FIGMA.muted}
                                    >
                                      {hasVal ? `${liveVal} t CO²eq` : "—"}
                                    </Text>
                                  </Box>
                                );
                              })()}

                              {/* Add row */}
                              <HStack justify="flex-end">
                                <IconButton
                                  aria-label="Ajouter une période"
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

      {/* Results — live totals across all rows */}
      {(() => {
        const liveTotalTco2e = compteurs.reduce((sum, g) =>
          sum + g.details.reduce((s, d) => s + calcRowTco2e(g.province, d.consumption), 0), 0
        );
        const liveCo2Gco2e = Math.round(liveTotalTco2e * 1_000_000);

        // Always show live calc; webhook results only used if no live data
        const displayCo2 = liveCo2Gco2e > 0 ? liveCo2Gco2e : (gesResults?.[0]?.total_co2_gco2e ?? null);
        const displayTco2e = liveTotalTco2e > 0 ? liveTotalTco2e.toFixed(4) : (gesResults?.[0]?.total_ges_tco2e ?? null);

        if (!displayTco2e && !displayCo2) return null;

        return (
          <Box mt={6} bg="white" rounded="xl" p={6} boxShadow={FIGMA.cardShadow}>
            <HStack mb={4} spacing={2}>
              <Icon as={FiFileText} color={FIGMA.green} boxSize={5} />
              <Text fontFamily="Inter" fontWeight={700} color={FIGMA.text} fontSize="lg">
                Calculs et résultats
              </Text>
            </HStack>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              {displayCo2 !== null && (
                <Box bg={FIGMA.bg} p={4} rounded="lg" border="2px solid" borderColor={FIGMA.border}>
                  <Text fontSize="xs" color={FIGMA.muted} fontFamily="Montserrat" mb={2} textTransform="uppercase">
                    CO₂ [gCO2e]
                  </Text>
                  <Text fontSize="2xl" fontWeight={700} color={FIGMA.green} fontFamily="Inter">
                    {String(displayCo2)}
                  </Text>
                </Box>
              )}
              {displayTco2e !== null && (
                <Box bg={FIGMA.bg} p={4} rounded="lg" border="2px solid" borderColor={FIGMA.border}>
                  <Text fontSize="xs" color={FIGMA.muted} fontFamily="Montserrat" mb={2} textTransform="uppercase">
                    TOTAL GES [tCO2e]
                  </Text>
                  <Text fontSize="2xl" fontWeight={700} color={FIGMA.green} fontFamily="Inter">
                    {String(displayTco2e)}
                  </Text>
                </Box>
              )}
            </Grid>
          </Box>
        );
      })()}
    </Box>
  );
}
// import { useEffect, useMemo, useRef, useState } from "react";
// import {
//   Box,
//   Heading,
//   Text,
//   Input,
//   Button,
//   Spinner,
//   Stack,
//   HStack,
//   Icon,
//   IconButton,
//   Grid,
//   Select,
//   useToast,
// } from "@chakra-ui/react";
// import { useDropzone } from "react-dropzone";
// import { supabase } from "../../../lib/supabaseClient";
// import {
//   CheckCircleIcon,
//   AttachmentIcon,
//   AddIcon,
//   CopyIcon,
//   DeleteIcon,
// } from "@chakra-ui/icons";

// type GesResults = {
//   total_co2_gco2e: number | string;
//   total_ges_tco2e: number | string;
//   energie_equivalente_kwh: number | string;
// };

// type CompteurDetailRow = {
//   date: string;
//   consumption: string;
//   reference: string;
//   // UI-only (optional)
//   periode?: string;
// };

// type CompteurGroup = {
//   number: string;
//   address: string;
//   province: string;
//   details: CompteurDetailRow[];

//   // UI-only (optional)
//   site?: string;
//   commentaires?: string;
// };

// const resultFields = [
//   { key: "total_co2_gco2e", label: "CO₂ [gCO2e]" },
//   { key: "total_ges_tco2e", label: "Total GES [tCO2e]" },
//   { key: "energie_equivalente_kwh", label: "Énergie équivalente [kWh]" },
// ] as const;

// export function SourceAForm({
//   posteId: initialPosteId,
//   posteNum = 6,
//   posteLabel = "6A1 - Électricité provenant du réseau électrique (Location based)",
//   userId: propUserId,
// }: {
//   posteId: string | null;
//   posteNum?: number;
//   posteLabel?: string;
//   userId?: string | null;
// }) {
//   const toast = useToast();

//   const [provinceOptions, setProvinceOptions] = useState<string[]>([]);
//   const [compteurs, setCompteurs] = useState<CompteurGroup[]>([
//     { number: "", address: "", province: "", details: [{ date: "", consumption: "", reference: "" }] },
//   ]);

//   const [gesResults, setGesResults] = useState<GesResults[]>([]);
//   const [posteId, setPosteId] = useState<string | null>(initialPosteId || null);
//   const [submissionId, setSubmissionId] = useState<string | null>(null);
//   const [userId, setUserId] = useState<string | null>(propUserId ?? null);
//   const [loading, setLoading] = useState(true);
//   const [uploading, setUploading] = useState(false);

//   // === AUTOSAVE additions ===
//   const [autoSaving, setAutoSaving] = useState(false);
//   const [justSaved, setJustSaved] = useState(false);
//   const lastSavedHashRef = useRef<string>("");
//   const debounceTimerRef = useRef<any>(null);

//   // --- Figma-ish tokens (from your screenshot / node style) ---
//   const FIGMA = {
//     bg: "#F5F6F5",
//     green: "#344E41",
//     border: "#E4E4E4",
//     text: "#404040",
//     muted: "#8F8F8F",
//     r: "16px",
//     inputR: "15px",
//     inputShadow: "0px 1px 6px 2px rgba(0,0,0,0.05)",
//     buttonShadow: "0px 1px 6px 2px rgba(0,0,0,0.25)",
//   };

//   // =======================
//   // Drag & drop file upload
//   // =======================
//   const onDrop = async (acceptedFiles: File[]) => {
//     if (!acceptedFiles.length) return;
//     setUploading(true);

//     const formData = new FormData();
//     acceptedFiles.forEach((file) => formData.append("file", file));

//     try {
//       const res = await fetch("/api/upload-bill", { method: "POST", body: formData });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Erreur lors de l'extraction");

//       if (Array.isArray(data) && data.length > 0) {
//         const extracted: CompteurGroup[] = data.map((item: any) => {
//           const r = item?.result || {};

//           // French date → yyyy-mm-dd
//           let dateVal = r.date || "";
//           const months: Record<string, string> = {
//             janvier: "01",
//             février: "02",
//             mars: "03",
//             avril: "04",
//             mai: "05",
//             juin: "06",
//             juillet: "07",
//             août: "08",
//             septembre: "09",
//             octobre: "10",
//             novembre: "11",
//             décembre: "12",
//           };
//           const frDateMatch = typeof dateVal === "string" ? dateVal.match(/^(\d{1,2}) (\w+) (\d{4})$/i) : null;
//           if (frDateMatch) {
//             const [, day, month, year] = frDateMatch;
//             const mm = months[month.toLowerCase()] || "01";
//             dateVal = `${year}-${mm}-${String(day).padStart(2, "0")}`;
//           }

//           const references = [
//             item?.filename,
//             r.period ? `Période: ${r.period}` : "",
//             r.amount ? `Montant: ${r.amount}` : "",
//             r.client_name ? `Client: ${r.client_name}` : "",
//           ]
//             .filter(Boolean)
//             .join(" | ");

//           return {
//             number: "",
//             address: r.address || "",
//             province: "",
//             site: "",
//             commentaires: "",
//             details: [
//               {
//                 date: dateVal,
//                 consumption: r.kwh ? String(r.kwh).replace(/\s/g, "") : "",
//                 reference: references,
//                 periode: "",
//               },
//             ],
//           };
//         });

//         setCompteurs(extracted);
//         scheduleAutosave();

//         toast({
//           title: "Factures importées!",
//           description: "Champs auto-remplis à partir des fichiers.",
//           status: "success",
//           duration: 3000,
//           isClosable: true,
//         });
//       } else {
//         toast({
//           title: "Aucune donnée détectée.",
//           description: "Impossible de lire les fichiers.",
//           status: "warning",
//           duration: 3000,
//           isClosable: true,
//         });
//       }
//     } catch (err: any) {
//       toast({
//         title: "Erreur à l'import.",
//         description: err?.message || "Erreur inconnue",
//         status: "error",
//         duration: 3000,
//         isClosable: true,
//       });
//     } finally {
//       setUploading(false);
//     }
//   };

//   const { getRootProps, getInputProps } = useDropzone({
//     onDrop,
//     accept: {
//       "application/pdf": [".pdf"],
//       "image/*": [".png", ".jpg", ".jpeg"],
//     },
//     multiple: true,
//     disabled: uploading,
//   });

//   useEffect(() => {
//     fetch("/api/provinces")
//       .then((res) => res.json())
//       .then((data) => setProvinceOptions(data.provinces || []))
//       .catch(() => setProvinceOptions([]));
//   }, []);

//   // =======================
//   // Prefill logic (unchanged)
//   // =======================
//   const isDefaultEmptyForm = (groups: CompteurGroup[]) => {
//     if (groups.length !== 1) return false;
//     const g = groups[0];
//     if (g.number || g.address || g.province) return false;
//     if (g.details.length !== 1) return false;
//     const d = g.details[0];
//     return !d.date && !d.consumption && !d.reference;
//   };

//   const buildGroupsFromCountersInvoices = (counters: any[] = [], invoices: any[] = []): CompteurGroup[] => {
//     const byNumber: Record<string, CompteurGroup> = {};
//     (invoices || []).forEach((inv) => {
//       const num = inv.number || "";
//       if (!byNumber[num]) {
//         const counter = (counters || []).find((c: any) => c.number === num) || {};
//         byNumber[num] = {
//           number: num,
//           address: counter.address || inv.address || "",
//           province: counter.province || inv.province || "",
//           site: inv.site || "",
//           commentaires: inv.commentaires || "",
//           details: [],
//         };
//       }
//       byNumber[num].details.push({
//         date: inv.date || "",
//         consumption: inv.consumption || "",
//         reference: inv.reference || "",
//         periode: inv.periode || "",
//       });
//     });

//     const groups = Object.values(byNumber);

//     if (!groups.length && counters.length) {
//       return counters.map((c: any) => ({
//         number: c.number || "",
//         address: c.address || "",
//         province: c.province || "",
//         site: c.site || "",
//         commentaires: c.commentaires || "",
//         details: [{ date: "", consumption: "", reference: "", periode: "" }],
//       }));
//     }

//     return groups;
//   };

//   useEffect(() => {
//     (async () => {
//       try {
//         let activeUserId = propUserId ?? userId;
//         if (!activeUserId) {
//           const { data } = await supabase.auth.getUser();
//           const u = data?.user;
//           if (!u?.id) return;
//           activeUserId = u.id;
//           setUserId(u.id);
//         }

//         if (!isDefaultEmptyForm(compteurs)) return;

//         const qs = new URLSearchParams({
//           user_id: String(activeUserId),
//           poste_num: String(posteNum),
//           source_code: "6A1",
//         });

//         const res = await fetch(`/api/GetSourceHandler?${qs.toString()}`, { method: "GET" });
//         if (!res.ok) return;
//         const json = await res.json();

//         const savedData = json?.data;
//         const savedResults = json?.results;

//         if (savedData && (Array.isArray(savedData.counters) || Array.isArray(savedData.invoices))) {
//           const groups = buildGroupsFromCountersInvoices(savedData.counters || [], savedData.invoices || []);
//           if (groups.length) setCompteurs(groups);
//         }
//         if (Array.isArray(savedResults) && savedResults.length) setGesResults(savedResults);
//       } catch {
//         // ignore
//       }
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [propUserId, userId, posteNum]);

//   // ORIGINAL submissions/postes load (unchanged)
//   useEffect(() => {
//     (async () => {
//       setLoading(true);

//       let activeUserId = propUserId;
//       if (!activeUserId) {
//         const { data } = await supabase.auth.getUser();
//         const u = data?.user;
//         if (!u) {
//           setLoading(false);
//           return;
//         }
//         activeUserId = u.id;
//         setUserId(u.id);
//       }

//       let filter = { user_id: activeUserId } as any;
//       if (posteId) filter = { ...filter, "postes.id": posteId };

//       const { data: sub } = await supabase
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

//       if (sub && sub.postes) {
//         const poste = posteId ? sub.postes.find((p: any) => p.id === posteId) : sub.postes.find((p: any) => p.poste_num === posteNum);

//         if (poste) {
//           setPosteId(poste.id);
//           setSubmissionId(sub.id);

//           let parsedData = poste.data;
//           if (typeof parsedData === "string") {
//             try {
//               parsedData = JSON.parse(parsedData);
//             } catch {
//               parsedData = {};
//             }
//           }

//           if (parsedData?.counters && parsedData?.invoices) {
//             const groups = buildGroupsFromCountersInvoices(parsedData.counters || [], parsedData.invoices || []);
//             setCompteurs(groups.length ? groups : [{ number: "", address: "", province: "", details: [{ date: "", consumption: "", reference: "" }] }]);
//           } else {
//             setCompteurs([{ number: "", address: "", province: "", details: [{ date: "", consumption: "", reference: "" }] }]);
//           }

//           setGesResults(poste.results || []);
//         }
//       }

//       setLoading(false);
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [propUserId, initialPosteId, posteNum]);

//   // =======================
//   // Group logic
//   // =======================
//   const addCompteur = () => {
//     setCompteurs((prev) => [
//       ...prev,
//       {
//         number: "",
//         address: "",
//         province: "",
//         site: "",
//         commentaires: "",
//         details: [{ date: "", consumption: "", reference: "", periode: "" }],
//       },
//     ]);
//     scheduleAutosave();
//   };

//   const removeCompteur = (gIdx: number) => {
//     setCompteurs((prev) => prev.filter((_, idx) => idx !== gIdx));
//     scheduleAutosave();
//   };

//   type CompteurFieldKey = "number" | "address" | "province";
//   const updateCompteurField = (gIdx: number, key: CompteurFieldKey, value: string) => {
//     setCompteurs((prev) => {
//       const next = [...prev];
//       next[gIdx] = { ...next[gIdx], [key]: value };
//       return next;
//     });
//     scheduleAutosave();
//   };

//   const updateCompteurUIField = (gIdx: number, key: "site" | "commentaires", value: string) => {
//     setCompteurs((prev) => {
//       const next = [...prev];
//       next[gIdx] = { ...next[gIdx], [key]: value };
//       return next;
//     });
//     scheduleAutosave();
//   };

//   const addDetailRow = (gIdx: number) => {
//     setCompteurs((prev) => {
//       const next = [...prev];
//       const g = next[gIdx];
//       const details = [...g.details, { date: "", consumption: "", reference: "", periode: "" }];
//       next[gIdx] = { ...g, details };
//       return next;
//     });
//     scheduleAutosave();
//   };

//   const removeDetailRow = (gIdx: number, dIdx: number) => {
//     setCompteurs((prev) => {
//       const next = [...prev];
//       const g = next[gIdx];
//       const details = [...g.details];
//       details.splice(dIdx, 1);

//       if (details.length === 0) {
//         next.splice(gIdx, 1);
//       } else {
//         next[gIdx] = { ...g, details };
//       }
//       return next;
//     });
//     scheduleAutosave();
//   };

//   const updateDetailField = (
//     gIdx: number,
//     dIdx: number,
//     key: keyof CompteurDetailRow,
//     value: string
//   ) => {
//     setCompteurs((prev) => {
//       const next = [...prev];
//       const g = next[gIdx];
//       const details = [...g.details];
//       details[dIdx] = { ...details[dIdx], [key]: value };
//       next[gIdx] = { ...g, details };
//       return next;
//     });
//     scheduleAutosave();
//   };

//   const validateData = (groups: CompteurGroup[]) =>
//     groups.length > 0 &&
//     groups.every(
//       (group) =>
//         group.number &&
//         group.address &&
//         group.province &&
//         group.details.every((detail) => detail.date && detail.consumption)
//     );

//   // =======================
//   // Payload building (keeps same API contract)
//   // =======================
//   const buildPayload = (groups: CompteurGroup[]) => {
//     const counters = groups.map((group) => ({
//       number: group.number,
//       address: group.address,
//       province: group.province,
//     }));

//     const invoices = groups.flatMap((group) =>
//       group.details.map((detail) => ({
//         number: group.number,
//         address: group.address,
//         province: group.province,
//         date: detail.date,
//         consumption: detail.consumption,
//         reference: detail.reference,
//       }))
//     );

//     return { counters, invoices };
//   };

//   const payloadHash = useMemo(() => {
//     try {
//       const base = buildPayload(compteurs);
//       return JSON.stringify(base);
//     } catch {
//       return "";
//     }
//   }, [compteurs]);

//   // === AUTOSAVE: debounced scheduler ===
//   function scheduleAutosave() {
//     if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
//     debounceTimerRef.current = setTimeout(() => {
//       void autosave();
//     }, 800);
//   }

//   // === AUTOSAVE: main function ===
//   const autosave = async () => {
//     if (!userId || !posteId) return;

//     const base = buildPayload(compteurs);
//     const baseHash = JSON.stringify(base);
//     if (baseHash === lastSavedHashRef.current) return;

//     setAutoSaving(true);
//     setJustSaved(false);

//     let results: GesResults[] = [];

//     try {
//       // If valid → compute results first
//       if (validateData(compteurs)) {
//         try {
//           const resp = await fetch(
//             "https://allposteswebhook-129138384907.us-central1.run.app/submit/6A1",
//             {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//               body: JSON.stringify({
//                 user_id: userId,
//                 poste_source_id: posteId,
//                 source_code: "6A1",
//                 poste_num: 6,
//                 data: base,
//               }),
//             }
//           );
//           const json = await resp.json();
//           if (resp.ok && Array.isArray(json.results)) {
//             results = json.results as GesResults[];
//             setGesResults(results);
//           }
//         } catch {
//           // silent
//         }
//       }

//       const dbPayload = {
//         user_id: userId,
//         poste_source_id: posteId,
//         source_code: "6A1",
//         poste_num: 6,
//         data: base,
//         results,
//       };

//       const dbResp = await fetch("/api/4submit", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(dbPayload),
//       });

//       if (dbResp.ok) {
//         lastSavedHashRef.current = baseHash;
//         setJustSaved(true);
//         setTimeout(() => setJustSaved(false), 1500);
//       }
//     } finally {
//       setAutoSaving(false);
//     }
//   };

//   // Manual submit (kept)
//   const handleSubmit = async () => {
//     if (!userId || !posteId) {
//       alert("Champs obligatoires manquants (posteId ou userId)");
//       return;
//     }
//     if (!validateData(compteurs)) {
//       alert("Veuillez remplir tous les champs requis (compteurs et détails).");
//       return;
//     }

//     setGesResults([]);
//     setLoading(true);

//     const data = buildPayload(compteurs);
//     const payload = {
//       user_id: userId,
//       poste_source_id: posteId,
//       source_code: "6A1",
//       poste_num: 6,
//       data,
//     };

//     let results: GesResults[] = [];
//     let webhookOk = false;

//     try {
//       const response = await fetch(
//         "https://allposteswebhook-129138384907.us-central1.run.app/submit/6A1",
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
//         alert("Erreur lors de la sauvegarde en base : " + (dbResult.error || ""));
//       } else {
//         setGesResults(results);
//         alert(
//           webhookOk
//             ? "Données 6A1 calculées et sauvegardées avec succès!"
//             : "Données 6A1 sauvegardées sans résultat de calcul GES."
//         );
//       }
//     } catch {
//       alert("Erreur inattendue lors de la sauvegarde en base.");
//     }

//     setLoading(false);
//   };

//   const displayColumns = resultFields.filter((f) =>
//     gesResults.some((res) => res && (res as any)[f.key] !== undefined && (res as any)[f.key] !== "" && (res as any)[f.key] !== "#N/A")
//   );

//   if (loading) {
//     return (
//       <Box display="flex" alignItems="center" justifyContent="center" minH="300px">
//         <Spinner color={FIGMA.green} size="xl" />
//       </Box>
//     );
//   }

//   return (
//     <Box bg={FIGMA.bg} p={6} rounded="2xl">
//       {/* Title + button */}
//       <HStack justify="space-between" align="center" mb={4}>
//         <Heading
//           as="h2"
//           fontFamily="Inter"
//           fontWeight={700}
//           fontSize="24px"
//           lineHeight="29px"
//           color={FIGMA.text}
//         >
//           {posteLabel}
//         </Heading>

//         <HStack spacing={3}>
//           {/* Autosave status */}
//           <HStack spacing={2} minW="160px" justify="flex-end">
//             {autoSaving && (
//               <HStack color={FIGMA.muted}>
//                 <Spinner size="sm" />
//                 <Text fontSize="sm" fontFamily="Montserrat">
//                   Enregistrement…
//                 </Text>
//               </HStack>
//             )}
//             {!autoSaving && justSaved && (
//               <HStack color="green.600">
//                 <Icon as={CheckCircleIcon} />
//                 <Text fontSize="sm" fontFamily="Montserrat">
//                   Enregistré
//                 </Text>
//               </HStack>
//             )}
//           </HStack>

//           {/* Upload button */}
//           <Box {...getRootProps()} opacity={uploading ? 0.7 : 1}>
//             <input {...getInputProps()} />
//             <Button
//               leftIcon={<AttachmentIcon />}
//               bg={FIGMA.green}
//               color="white"
//               h="40px"
//               px={6}
//               rounded={FIGMA.r}
//               boxShadow={FIGMA.buttonShadow}
//               _hover={{ bg: "#2E4339" }}
//               _active={{ transform: "translateY(0.5px)" }}
//               isLoading={uploading}
//               loadingText="Extraction…"
//               fontFamily="Inter"
//               fontWeight={600}
//               fontSize="16px"
//             >
//               Ajouter un document
//             </Button>
//           </Box>
//         </HStack>
//       </HStack>

//       {/* Header pill */}
//       <Box
//         bg={FIGMA.green}
//         color="white"
//         h="45px"
//         rounded={FIGMA.r}
//         px={6}
//         display="flex"
//         alignItems="center"
//         mb={4}
//       >
//         <Grid
//           w="full"
//           templateColumns="2.2fr 1.7fr 1.2fr 1.2fr 1fr 44px"
//           columnGap={6}
//           alignItems="center"
//         >
//           {["Compteur électrique", "Site associé", "Localisation", "Consommation", "Période"].map((label) => (
//             <Text key={label} fontFamily="Montserrat" fontWeight={600} fontSize="16px" textAlign="center">
//               {label}
//             </Text>
//           ))}
//           <Box />
//         </Grid>
//       </Box>

//       {/* Body wrapper */}
//       <Box border="2px solid" borderColor={FIGMA.border} rounded={FIGMA.r} bg="transparent" p={4}>
//         <Stack spacing={4}>
//           {compteurs.map((group, gIdx) => (
//             <Box key={`g-${gIdx}`}>
//               {group.details.map((row, dIdx) => {
//                 const showGroupFields = dIdx === 0;

//                 return (
//                   <Box key={`r-${gIdx}-${dIdx}`} mb={3}>
//                     {/* MAIN ROW */}
//                     <Grid templateColumns="2.2fr 1.7fr 1.2fr 1.2fr 1fr 44px" columnGap={6} alignItems="center">
//                       {/* Compteur */}
//                       <Box visibility={showGroupFields ? "visible" : "hidden"}>
//                         <Input
//                           value={group.number}
//                           onChange={(e) => updateCompteurField(gIdx, "number", e.target.value)}
//                           placeholder="Compteur HQ - Campus #1"
//                           h="39.5px"
//                           rounded={FIGMA.inputR}
//                           bg="white"
//                           borderColor={FIGMA.border}
//                           boxShadow={FIGMA.inputShadow}
//                           fontFamily="Montserrat"
//                           fontSize="15px"
//                           color={FIGMA.text}
//                           _placeholder={{ color: FIGMA.muted }}
//                         />
//                       </Box>

//                       {/* Site associé */}
//                       <Box visibility={showGroupFields ? "visible" : "hidden"}>
//                         <Select
//                           value={group.site ?? ""}
//                           onChange={(e) => updateCompteurUIField(gIdx, "site", e.target.value)}
//                           h="39.5px"
//                           rounded={FIGMA.inputR}
//                           bg="white"
//                           borderColor={FIGMA.border}
//                           boxShadow={FIGMA.inputShadow}
//                           fontFamily="Montserrat"
//                           fontSize="15px"
//                           color={FIGMA.text}
//                         >
//                           <option value="">Sélectionner…</option>
//                           <option value="Usine 1 - Assemblage">Usine 1 - Assemblage…</option>
//                           <option value="Usine 2 - Production">Usine 2 - Production</option>
//                           <option value="Bureau - Admin">Bureau - Admin</option>
//                         </Select>
//                       </Box>

//                       {/* Localisation */}
//                       <Box visibility={showGroupFields ? "visible" : "hidden"}>
//                         <Select
//                           value={group.province}
//                           onChange={(e) => updateCompteurField(gIdx, "province", e.target.value)}
//                           h="39.5px"
//                           rounded={FIGMA.inputR}
//                           bg="white"
//                           borderColor={FIGMA.border}
//                           boxShadow={FIGMA.inputShadow}
//                           fontFamily="Montserrat"
//                           fontSize="15px"
//                           color={FIGMA.text}
//                         >
//                           <option value="">Sélectionner…</option>
//                           {provinceOptions.map((p) => (
//                             <option key={p} value={p}>
//                               {p}
//                             </option>
//                           ))}
//                         </Select>
//                       </Box>

//                       {/* Consommation */}
//                       <Input
//                         value={row.consumption}
//                         onChange={(e) => updateDetailField(gIdx, dIdx, "consumption", e.target.value)}
//                         placeholder="35 280 kWh"
//                         h="39.5px"
//                         rounded={FIGMA.inputR}
//                         bg="white"
//                         borderColor={FIGMA.border}
//                         boxShadow={FIGMA.inputShadow}
//                         fontFamily="Montserrat"
//                         fontSize="15px"
//                         color={FIGMA.text}
//                         _placeholder={{ color: FIGMA.muted }}
//                         textAlign="center"
//                       />

//                       {/* Période */}
//                       <Select
//                         value={row.periode ?? ""}
//                         onChange={(e) => updateDetailField(gIdx, dIdx, "periode", e.target.value)}
//                         h="39.5px"
//                         rounded={FIGMA.inputR}
//                         bg="white"
//                         borderColor={FIGMA.border}
//                         boxShadow={FIGMA.inputShadow}
//                         fontFamily="Montserrat"
//                         fontSize="15px"
//                         color={FIGMA.text}
//                         textAlign="center"
//                       >
//                         <option value="">Sélectionner…</option>
//                         {[
//                           "Janvier",
//                           "Février",
//                           "Mars",
//                           "Avril",
//                           "Mai",
//                           "Juin",
//                           "Juillet",
//                           "Août",
//                           "Septembre",
//                           "Octobre",
//                           "Novembre",
//                           "Décembre",
//                         ].map((m) => (
//                           <option key={m} value={m}>
//                             {m}
//                           </option>
//                         ))}
//                       </Select>

//                       {/* Trash */}
//                       <IconButton
//                         aria-label="Supprimer"
//                         icon={<DeleteIcon />}
//                         variant="ghost"
//                         color={FIGMA.muted}
//                         _hover={{ bg: "transparent", color: "red.500" }}
//                         onClick={() => {
//                           if (group.details.length > 1) removeDetailRow(gIdx, dIdx);
//                           else removeCompteur(gIdx);
//                         }}
//                       />
//                     </Grid>

//                     {/* SUB ROW */}
//                     {dIdx === group.details.length - 1 && (
//                       <Grid mt={4} templateColumns="70px 1.6fr 1.2fr 1fr 120px" columnGap={4} alignItems="center">
//                         {/* Index box */}
//                         <Box
//                           w="53px"
//                           h="41px"
//                           rounded={FIGMA.r}
//                           bg="white"
//                           boxShadow={FIGMA.inputShadow}
//                           display="flex"
//                           alignItems="center"
//                           justifyContent="center"
//                         >
//                           <Text fontFamily="Montserrat" fontSize="20px" color={FIGMA.muted}>
//                             {gIdx + 1}
//                           </Text>
//                         </Box>

//                         {/* Commentaires */}
//                         <Input
//                           value={group.commentaires ?? ""}
//                           onChange={(e) => updateCompteurUIField(gIdx, "commentaires", e.target.value)}
//                           placeholder="Commentaires"
//                           h="39.5px"
//                           rounded={FIGMA.inputR}
//                           bg="white"
//                           borderColor={FIGMA.border}
//                           boxShadow={FIGMA.inputShadow}
//                           fontFamily="Montserrat"
//                           fontSize="15px"
//                           color={FIGMA.text}
//                           _placeholder={{ color: FIGMA.muted }}
//                         />

//                         {/* Référence */}
//                         <Input
//                           value={row.reference}
//                           onChange={(e) => updateDetailField(gIdx, dIdx, "reference", e.target.value)}
//                           placeholder="Référence"
//                           h="39.5px"
//                           rounded={FIGMA.inputR}
//                           bg="white"
//                           borderColor={FIGMA.border}
//                           boxShadow={FIGMA.inputShadow}
//                           fontFamily="Montserrat"
//                           fontSize="15px"
//                           color={FIGMA.text}
//                           _placeholder={{ color: FIGMA.muted }}
//                         />

//                         {/* Result text */}
//                         <Text
//                           textAlign="right"
//                           fontFamily="Montserrat"
//                           fontWeight={500}
//                           fontSize="15px"
//                           color={FIGMA.muted}
//                           pr={2}
//                         >
//                           {gesResults?.[0]?.total_ges_tco2e && gesResults[0].total_ges_tco2e !== "#N/A"
//                             ? `${gesResults[0].total_ges_tco2e} t de CO²eq`
//                             : "—"}
//                         </Text>

//                         {/* Icons */}
//                         <HStack justify="flex-end" spacing={2}>
//                           <IconButton
//                             aria-label="Ajouter une ligne"
//                             icon={<AddIcon />}
//                             variant="ghost"
//                             color={FIGMA.muted}
//                             onClick={() => addDetailRow(gIdx)}
//                           />
//                           <IconButton
//                             aria-label="Dupliquer"
//                             icon={<CopyIcon />}
//                             variant="ghost"
//                             color={FIGMA.muted}
//                             onClick={() => {
//                               const clone = JSON.parse(JSON.stringify(group)) as CompteurGroup;
//                               setCompteurs((prev) => [...prev, clone]);
//                               scheduleAutosave();
//                             }}
//                           />
//                           <IconButton
//                             aria-label="Supprimer le compteur"
//                             icon={<DeleteIcon />}
//                             variant="ghost"
//                             color={FIGMA.muted}
//                             _hover={{ color: "red.500" }}
//                             onClick={() => removeCompteur(gIdx)}
//                           />
//                         </HStack>
//                       </Grid>
//                     )}
//                   </Box>
//                 );
//               })}
//             </Box>
//           ))}
//         </Stack>
//       </Box>

//       {/* Bottom actions */}
//       <HStack mt={5} spacing={3}>
//         <Button
//           variant="outline"
//           borderColor={FIGMA.border}
//           color={FIGMA.text}
//           rounded={FIGMA.r}
//           onClick={addCompteur}
//           fontFamily="Inter"
//           fontWeight={600}
//         >
//           Ajouter un compteur
//         </Button>

//         <Button
//           bg={FIGMA.green}
//           color="white"
//           rounded={FIGMA.r}
//           _hover={{ bg: "#2E4339" }}
//           boxShadow={FIGMA.buttonShadow}
//           onClick={handleSubmit}
//           fontFamily="Inter"
//           fontWeight={600}
//         >
//           Soumettre
//         </Button>
//       </HStack>

//       {/* Results (kept, minimal + clean) */}
//       <Box mt={6} border="2px solid" borderColor={FIGMA.border} rounded={FIGMA.r} p={4} bg="white">
//         <Text fontFamily="Inter" fontWeight={700} color={FIGMA.text} mb={3}>
//           Calculs et résultats
//         </Text>

//         {gesResults?.length ? (
//           <HStack spacing={8} flexWrap="wrap">
//             {displayColumns.map((f) => (
//               <Box key={String(f.key)}>
//                 <Text fontSize="12px" color={FIGMA.muted} fontFamily="Montserrat">
//                   {f.label}
//                 </Text>
//                 <Text fontSize="20px" fontWeight={700} color={FIGMA.text} fontFamily="Inter">
//                   {String((gesResults[0] as any)[f.key] ?? "-")}
//                 </Text>
//               </Box>
//             ))}
//           </HStack>
//         ) : (
//           <Text color={FIGMA.muted} fontFamily="Montserrat">
//             Aucun résultat à afficher.
//           </Text>
//         )}
//       </Box>
//     </Box>
//   );
// }

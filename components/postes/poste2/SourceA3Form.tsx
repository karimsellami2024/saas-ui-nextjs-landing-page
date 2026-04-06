import React, { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  HStack,
  Icon,
  Input,
  Spinner,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { Calendar, Copy, Plus, Trash2 } from "lucide-react";
import VehicleSelect from "#components/vehicleselect/VehicleSelect";
import { usePrefillPosteSource } from "components/postes/HookForGetDataSource";
import { supabase } from "../../../lib/supabaseClient";

export type A3Row = {
  vehicle: string;
  type: string;
  date: string;
  cost: string;
  avgPrice: string;
  estimateQty: string;
  reference: string;
};

type GesResult = {
  total_co2_gco2e?: string | number;
  total_ges_ch4_gco2e?: string | number;
  total_ges_n2o_gco2e?: string | number;
  total_ges_gco2e?: string | number;
  total_ges_tco2e?: string | number;
  total_energie_kwh?: string | number;
};

export interface Source2A3FormProps {
  a3Rows: A3Row[];
  setA3Rows: React.Dispatch<React.SetStateAction<A3Row[]>>;
  addA3Row: () => void;
  removeA3Row: (idx: number) => void;
  updateA3Row: (idx: number, key: keyof A3Row, value: string) => void;
  posteSourceId: string;
  userId: string;
  gesResults?: GesResult[];
  setGesResults: (results: GesResult[]) => void;
  highlight?: string;
  tableBg?: string;
}

const toNum = (x: any, fallback = 0) => {
  if (x === "" || x == null) return fallback;
  const n =
    typeof x === "number"
      ? x
      : Number(String(x).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

const norm = (s: any) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

type MobileEF = {
  co2_g_unite: number;
  ch4_g_unite: number;
  n2o_g_unite: number;
  co2eq_g_unite: number;
  conversion_kwh_unite: number;
  carburant: string;
  unite: string;
  type_vehicule: string;
};

type Refs = {
  byTypeVehicule: Record<string, MobileEF>;
  byCarburant: Record<string, MobileEF>;
  prpCO2: number;
  prpCH4: number;
  prpN2O: number;
};

export function Source2A3Form({
  a3Rows = [],
  setA3Rows,
  addA3Row,
  removeA3Row,
  updateA3Row,
  posteSourceId,
  userId,
  gesResults = [],
  setGesResults,
  highlight = "#245a7c",
  tableBg = "#f3f6ef",
}: Source2A3FormProps) {
  const [loading, setLoading] = useState(false);
  const [refs, setRefs] = useState<Refs | null>(null);

  const inputBorder = useColorModeValue("#E8ECE7", "#2f3a36");

  const {
    loading: prefillLoading,
    error: prefillError,
    data: prefillData,
    results: prefillResults,
  } = usePrefillPosteSource(userId, 2, "2A3", { rows: [] });

  useEffect(() => {
    (async () => {
      try {
        const { data: gesRows, error: gesErr } = await supabase
          .from("gaz_effet_serre")
          .select("formule_chimique, prp_100ans");
        if (gesErr) throw gesErr;

        const prpMap: Record<string, number> = Object.fromEntries(
          (gesRows ?? [])
            .filter((r: any) => r?.formule_chimique && r?.prp_100ans != null)
            .map((r: any) => [
              String(r.formule_chimique).trim().toUpperCase(),
              Number(r.prp_100ans),
            ])
        );

        const prpCO2 = Number.isFinite(prpMap["CO2"]) ? prpMap["CO2"] : 1;
        const prpCH4 = Number.isFinite(prpMap["CH4"]) ? prpMap["CH4"] : 0;
        const prpN2O = Number.isFinite(prpMap["N2O"]) ? prpMap["N2O"] : 0;

        const { data: mobRows, error: mobErr } = await supabase
          .from("equipements_mobiles")
          .select(
            "type_vehicule,carburant,unite,conversion_kwh_unite,co2_g_unite,ch4_g_unite,n2o_g_unite,co2eq_g_unite"
          );
        if (mobErr) throw mobErr;

        const byTypeVehicule: Record<string, MobileEF> = {};
        const byCarburant: Record<string, MobileEF> = {};

        (mobRows ?? []).forEach((r: any) => {
          const tv = String(r?.type_vehicule ?? "").trim();
          const carb = String(r?.carburant ?? "").trim();
          const unit = String(r?.unite ?? "").trim();
          if (!tv && !carb) return;

          const ef: MobileEF = {
            type_vehicule: tv,
            carburant: carb,
            unite: unit,
            conversion_kwh_unite: toNum(r?.conversion_kwh_unite, 0),
            co2_g_unite: toNum(r?.co2_g_unite, 0),
            ch4_g_unite: toNum(r?.ch4_g_unite, 0),
            n2o_g_unite: toNum(r?.n2o_g_unite, 0),
            co2eq_g_unite: toNum(r?.co2eq_g_unite, 0),
          };

          if (tv) byTypeVehicule[norm(tv)] = ef;
          if (carb) {
            byCarburant[norm(carb)] = ef;
            if (unit) byCarburant[norm(`${carb} [${unit}]`)] = ef;
          }
        });

        setRefs({ byTypeVehicule, byCarburant, prpCO2, prpCH4, prpN2O });
      } catch (e) {
        console.error("2A3 refs load error:", e);
        setRefs({
          byTypeVehicule: {},
          byCarburant: {},
          prpCO2: 1,
          prpCH4: 0,
          prpN2O: 0,
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (Array.isArray((prefillData as any)?.rows) && (prefillData as any).rows.length) {
      setA3Rows((prefillData as any).rows as A3Row[]);
    }
    if (prefillResults) {
      const normalized = Array.isArray(prefillResults) ? prefillResults : [prefillResults];
      setGesResults(normalized as GesResult[]);
    }
  }, [prefillData, prefillResults, setA3Rows, setGesResults]);

  const validateData = (rows: A3Row[]) =>
    rows.length > 0 && rows.every((row) => row.vehicle && row.type && row.date && row.estimateQty);

  const computeResults = (rows: A3Row[], rf: Refs | null): GesResult[] => {
    if (!rf) return [];

    return (rows || []).map((row) => {
      const keyRaw = String(row.type ?? "").trim();
      const qty = toNum(row.estimateQty, 0);
      const k = norm(keyRaw);

      const ef =
        rf.byTypeVehicule[k] ||
        rf.byCarburant[k] ||
        (() => {
          const tvKey = Object.keys(rf.byTypeVehicule).find(
            (kk) => kk === k || kk.includes(k) || k.includes(kk)
          );
          if (tvKey) return rf.byTypeVehicule[tvKey];
          const cKey = Object.keys(rf.byCarburant).find(
            (kk) => kk === k || kk.includes(k) || k.includes(kk)
          );
          return cKey ? rf.byCarburant[cKey] : undefined;
        })();

      if (!keyRaw || qty === 0 || !ef) {
        if (keyRaw && qty !== 0 && !ef) {
          console.warn("2A3: lookup failed for type =", keyRaw);
        }
        return {
          total_co2_gco2e: 0,
          total_ges_ch4_gco2e: 0,
          total_ges_n2o_gco2e: 0,
          total_ges_gco2e: 0,
          total_ges_tco2e: 0,
          total_energie_kwh: 0,
        };
      }

      const hasGas =
        (ef.co2_g_unite ?? 0) !== 0 ||
        (ef.ch4_g_unite ?? 0) !== 0 ||
        (ef.n2o_g_unite ?? 0) !== 0;

      const co2 = hasGas ? ef.co2_g_unite * qty * toNum(rf.prpCO2, 1) : 0;
      const ch4 = hasGas ? ef.ch4_g_unite * qty * toNum(rf.prpCH4, 0) : 0;
      const n2o = hasGas ? ef.n2o_g_unite * qty * toNum(rf.prpN2O, 0) : 0;

      const total_g = hasGas ? co2 + ch4 + n2o : ef.co2eq_g_unite * qty;
      const total_t = total_g / 1e6;
      const energy_kwh = ef.conversion_kwh_unite * qty;

      return {
        total_co2_gco2e: hasGas ? co2 : total_g,
        total_ges_ch4_gco2e: hasGas ? ch4 : 0,
        total_ges_n2o_gco2e: hasGas ? n2o : 0,
        total_ges_gco2e: total_g,
        total_ges_tco2e: total_t,
        total_energie_kwh: energy_kwh,
      };
    });
  };

  useEffect(() => {
    const res = computeResults(a3Rows, refs);
    setGesResults(res);
  }, [a3Rows, refs, setGesResults]);

  const handle2A3Submit = async () => {
    if (!posteSourceId || !userId) {
      alert("Missing required fields (posteSourceId or userId)");
      return;
    }
    if (!validateData(a3Rows)) {
      alert("Veuillez remplir tous les champs requis.");
      return;
    }
    if (!refs) {
      alert("References non chargees (equipements_mobiles / PRP). Reessayez.");
      return;
    }

    setLoading(true);

    const sanitizedRows = a3Rows.map((row) => ({
      ...row,
      site: row.cost,
      commentaires: row.avgPrice,
      estimateQty: toNum(row.estimateQty, 0),
    }));

    const results = computeResults(a3Rows, refs);

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      poste_num: 2,
      source_code: "2A3",
      data: { rows: sanitizedRows },
      results,
    };

    try {
      const dbResponse = await fetch("/api/2submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const dbResult = await dbResponse.json();
      if (!dbResponse.ok) {
        alert("Erreur lors de la sauvegarde en base : " + (dbResult.error || ""));
      } else {
        setGesResults(results);
        alert("Donnees 2A3 calculees et sauvegardees avec succes!");
      }
    } catch {
      alert("Erreur inattendue lors de la sauvegarde en base.");
    }

    setLoading(false);
  };

  return (
    <Box bg={tableBg} borderRadius="20px" p={{ base: 4, md: 6 }} border="1px solid" borderColor={inputBorder}>
      <VStack align="stretch" spacing={5}>
        <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={3} wrap="wrap">
          <VStack align="start" spacing={0}>
            <Text fontSize="xl" fontWeight="700" color={highlight}>
              2A3 - Vehicules
            </Text>
            <Text fontSize="sm" color="gray.600">
              Distance parcourue par vehicule avec une mise en page en cartes.
            </Text>
          </VStack>

          <HStack spacing={3}>
            {prefillLoading && (
              <HStack spacing={2} color="gray.500">
                <Spinner size="sm" />
                <Text fontSize="sm">Chargement...</Text>
              </HStack>
            )}
            {prefillError && (
              <Text fontSize="sm" color="red.500">Prechargement: {String(prefillError)}</Text>
            )}
            <Badge colorScheme="blue" variant="subtle">
              2A3
            </Badge>
          </HStack>
        </Flex>

        <VStack spacing={4} align="stretch">
          {(a3Rows || []).map((row, idx) => (
            <Box
              key={idx}
              bg="white"
              border="1px solid"
              borderColor={inputBorder}
              rounded="2xl"
              p={4}
              boxShadow="0 8px 24px rgba(0,0,0,0.06)"
            >
              <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
                <Badge bg="#DDE5E0" color={highlight} borderRadius="8px" px={3} py={1} fontSize="xs">
                  Vehicule {idx + 1}
                </Badge>
                <HStack spacing={1}>
                  <Button
                    size="xs"
                    variant="ghost"
                    color="gray.600"
                    leftIcon={<Copy size={12} />}
                    onClick={() =>
                      setA3Rows((prev) => {
                        const copy = [...prev];
                        copy.splice(idx + 1, 0, { ...row });
                        return copy;
                      })
                    }
                  >
                    Copier
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    color="red.400"
                    leftIcon={<Trash2 size={12} />}
                    onClick={() => removeA3Row(idx)}
                  >
                    Suppr.
                  </Button>
                </HStack>
              </Flex>

              <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={3}>
                <GridItem colSpan={{ base: 1, md: 3 }}>
                  <FieldLabel>Vehicule</FieldLabel>
                  <PillInput
                    placeholder="ex. Camionnette Ford Transit"
                    value={row.vehicle}
                    onChange={(v: string) => updateA3Row(idx, "vehicle", v)}
                    inputBorder={inputBorder}
                  />
                </GridItem>

                <GridItem colSpan={{ base: 1, md: 3 }}>
                  <FieldLabel>Nom du site</FieldLabel>
                  <PillInput
                    placeholder="ex. Site principal Montreal"
                    value={row.cost}
                    onChange={(v: string) => updateA3Row(idx, "cost", v)}
                    inputBorder={inputBorder}
                  />
                </GridItem>

                <GridItem colSpan={{ base: 1, md: 2 }}>
                  <FieldLabel>Type de vehicule</FieldLabel>
                  <PillVehicleSelect
                    value={row.type}
                    onChange={(v: string) => updateA3Row(idx, "type", v)}
                    inputBorder={inputBorder}
                  />
                </GridItem>

                <GridItem>
                  <FieldLabel>Distance</FieldLabel>
                  <PillInput
                    placeholder="0"
                    value={row.estimateQty}
                    onChange={(v: string) => updateA3Row(idx, "estimateQty", v)}
                    inputBorder={inputBorder}
                  />
                </GridItem>

                <GridItem>
                  <FieldLabel>Date</FieldLabel>
                  <PillDate
                    value={row.date}
                    onChange={(v: string) => updateA3Row(idx, "date", v)}
                    inputBorder={inputBorder}
                  />
                </GridItem>

                <GridItem>
                  <FieldLabel>Reference</FieldLabel>
                  <PillInput
                    placeholder="No facture ou note"
                    value={row.reference}
                    onChange={(v: string) => updateA3Row(idx, "reference", v)}
                    inputBorder={inputBorder}
                  />
                </GridItem>

                <GridItem>
                  <FieldLabel>Commentaires</FieldLabel>
                  <PillInput
                    placeholder="Commentaires"
                    value={row.avgPrice}
                    onChange={(v: string) => updateA3Row(idx, "avgPrice", v)}
                    inputBorder={inputBorder}
                  />
                </GridItem>
              </Grid>

              <Flex
                mt={4}
                p={3}
                bg="#EDF4EE"
                borderRadius="12px"
                align={{ base: "start", md: "center" }}
                justify="space-between"
                gap={2}
                direction={{ base: "column", md: "row" }}
              >
                <Text fontSize="sm" color={highlight} fontWeight="600">
                  Resultat estimatif
                </Text>
                <Text fontSize="sm" color={highlight} fontWeight="700">
                  {formatResult(gesResults[idx])} tCO2e
                </Text>
              </Flex>
            </Box>
          ))}

          {(!a3Rows || a3Rows.length === 0) && (
            <Box
              p={6}
              textAlign="center"
              color="gray.500"
              bg="white"
              rounded="2xl"
              border="1px dashed"
              borderColor={inputBorder}
            >
              Aucune ligne. Cliquez sur "Ajouter un vehicule" pour commencer.
            </Box>
          )}
        </VStack>

        <HStack pt={1} spacing={3} wrap="wrap">
          <Button
            leftIcon={<Icon as={Plus} boxSize={4} />}
            bg={highlight}
            color="white"
            rounded="full"
            px={6}
            h="44px"
            _hover={{ opacity: 0.95 }}
            onClick={addA3Row}
          >
            Ajouter un vehicule
          </Button>
          <Button
            colorScheme="blue"
            rounded="full"
            px={6}
            h="44px"
            onClick={handle2A3Submit}
            isLoading={loading}
          >
            Soumettre
          </Button>
        </HStack>

        {Array.isArray(gesResults) && gesResults.length > 0 && (
          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={3}>
            <ResultPill label="CO2 total [gCO2e]" value={sumField(gesResults, "total_co2_gco2e")} />
            <ResultPill label="Total GES [gCO2e]" value={sumField(gesResults, "total_ges_gco2e")} />
            <ResultPill label="Total GES [tCO2e]" value={sumField(gesResults, "total_ges_tco2e")} />
          </Grid>
        )}
      </VStack>
    </Box>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="xs" color="gray.600" mb={1}>
      {children}
    </Text>
  );
}

function PillInput({ value, onChange, placeholder, inputBorder }: any) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      bg="white"
      border="1px solid"
      borderColor={inputBorder}
      rounded="xl"
      h="40px"
      boxShadow="0 2px 4px rgba(0,0,0,0.06)"
      fontSize="sm"
    />
  );
}

function PillDate({ value, onChange, inputBorder }: any) {
  return (
    <HStack
      bg="white"
      border="1px solid"
      borderColor={inputBorder}
      rounded="xl"
      px={3}
      h="40px"
      boxShadow="0 2px 4px rgba(0,0,0,0.06)"
      justify="space-between"
    >
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        variant="unstyled"
        fontSize="sm"
        h="100%"
        p={0}
      />
      <Icon as={Calendar} boxSize={4} color="gray.500" />
    </HStack>
  );
}

function PillVehicleSelect({ value, onChange, inputBorder }: any) {
  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor={inputBorder}
      rounded="xl"
      px={2}
      h="40px"
      boxShadow="0 2px 4px rgba(0,0,0,0.06)"
      display="flex"
      alignItems="center"
    >
      <VehicleSelect value={value} onChange={onChange} />
    </Box>
  );
}

function ResultPill({ label, value }: { label: string; value: string }) {
  return (
    <VStack
      bg="white"
      border="1px solid"
      borderColor="#E8ECE7"
      rounded="xl"
      p={4}
      spacing={1}
      align="stretch"
      textAlign="center"
    >
      <Text fontSize="xs" color="gray.600">
        {label}
      </Text>
      <Text fontWeight="bold" fontSize="lg">
        {value}
      </Text>
    </VStack>
  );
}

function sumField(results: GesResult[], key: keyof GesResult): string {
  const s = results.reduce((acc, r) => acc + (toNumLocal((r as any)[key]) || 0), 0);
  return formatNumber(s);
}

function toNumLocal(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return isFinite(n) ? n : 0;
}

function formatNumber(n: number): string {
  return Number(n).toLocaleString("fr-CA", { maximumFractionDigits: 3 });
}

function formatResult(r?: GesResult): string {
  if (!r) return "0";
  const t = r.total_ges_tco2e ?? r.total_ges_gco2e ?? r.total_co2_gco2e ?? 0;
  const n = toNumLocal(t as any);
  return formatNumber(n);
}

export default Source2A3Form;

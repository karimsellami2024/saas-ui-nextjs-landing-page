'use client';
import React, { useEffect, useRef, useState } from "react";
import {
  Box, Button, Flex, Grid, GridItem, Heading, HStack,
  Icon, Input, Select, Spinner, Text, VStack, Badge,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { CheckCircleIcon } from "@chakra-ui/icons";
import { Plus, Trash2, Copy } from "lucide-react";
import { FiCalendar, FiMapPin, FiFileText, FiDroplet } from "react-icons/fi";
import { supabase } from "../../../lib/supabaseClient";
import { ReferenceSelect } from '../ReferenceSelect';

export type Source5_1B1Row = {
  description: string;
  date: string;
  site: string;
  product: string;
  reference: string;
  fuelType: string;
  qtySold: string;
  litresPerUnitPerYear: string;
  yearsOfUse: string;
};

type GesResult = {
  total_co2_gco2e?: string | number;
  total_ges_gco2e?: string | number;
  total_ges_tco2e?: string | number;
};

export interface Source5_1B1FormProps {
  rows: Source5_1B1Row[];
  setRows: React.Dispatch<React.SetStateAction<Source5_1B1Row[]>>;
  posteSourceId: string | null;
  userId?: string | null;
  gesResults?: GesResult[];
  setGesResults: (r: GesResult[]) => void;
}

const SOURCE_CODE = "5.1B1";
const POSTE_NUM   = 5;

// kg CO₂e per litre of fuel
const FUEL_FACTORS: Record<string, number> = {
  "Essence (gasoline)":            2.289,
  "Diesel":                        2.663,
  "Gaz naturel (m³)":              1.900,
  "Propane":                       1.543,
  "Mazout de chauffage":           2.754,
  "Biocarburant E10":              2.060,
  "Biocarburant B20":              2.130,
};
const FUEL_OPTIONS = Object.keys(FUEL_FACTORS);

const EMPTY_ROW: Source5_1B1Row = {
  description: "", date: "", site: "", product: "", reference: "",
  fuelType: FUEL_OPTIONS[0], qtySold: "", litresPerUnitPerYear: "", yearsOfUse: "1",
};

const fadeInUp = keyframes`from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}`;
const pulse    = keyframes`0%,100%{transform:scale(1)}50%{transform:scale(1.02)}`;
const FIGMA = {
  bg: "#F5F6F5", green: "#344E41", greenLight: "#588157",
  greenSoft: "#DDE5E0", border: "#E4E4E4", muted: "#8F8F8F",
  r: "16px", inputR: "15px",
  inputShadow: "0px 1px 6px 2px rgba(0,0,0,0.05)",
  buttonShadow: "0px 1px 6px 2px rgba(0,0,0,0.25)",
  cardShadow: "0 4px 16px rgba(0,0,0,0.08)",
};

const toNum = (x: any) => { const n = parseFloat(String(x ?? "").replace(",", ".")); return isFinite(n) ? n : 0; };
const calcRow = (row: Source5_1B1Row) => {
  const qty    = toNum(row.qtySold);
  const litres = toNum(row.litresPerUnitPerYear);
  const years  = toNum(row.yearsOfUse) || 1;
  const factor = FUEL_FACTORS[row.fuelType] ?? 2.289; // kg CO₂e/L
  const kgCO2e = qty * litres * years * factor;
  return { co2: kgCO2e * 1000, total: kgCO2e * 1000, tco2e: kgCO2e / 1000 };
};

export function Source5_1B1Form({ rows, setRows, posteSourceId, userId, gesResults = [], setGesResults }: Source5_1B1FormProps) {
  const [loading, setLoading]       = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);
  const [savedOk, setSavedOk]       = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [siteOptions, setSiteOptions]       = useState<string[]>([]);
  const [productOptions, setProductOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    (async () => {
      try {
        const qs = new URLSearchParams({ user_id: userId, poste_num: String(POSTE_NUM), source_code: SOURCE_CODE });
        const res = await fetch(`/api/GetSourceHandler?${qs}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.success && json?.data?.rows?.length) setRows(json.data.rows);
        }
      } catch {} finally { setLoading(false); }
    })();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data: profile } = await supabase
          .from("user_profiles").select("company_id").eq("id", userId).single();
        if (!profile?.company_id) return;
        const { data: company } = await supabase
          .from("companies").select("production_sites, products")
          .eq("id", profile.company_id).single();
        if (!company) return;
        const uniq = (a: string[]) => Array.from(new Set(a));
        setSiteOptions(uniq((company.production_sites as any[] ?? []).map((s: any) => String(s?.nom ?? "")).filter(Boolean)));
        setProductOptions(uniq((company.products as any[] ?? []).map((p: any) => String(p?.nom ?? "")).filter(Boolean)));
      } catch {}
    })();
  }, [userId]);

  const triggerSave = (next: Source5_1B1Row[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!userId) return;
      setAutoSaving(true);
      try {
        await fetch("/api/submit", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, poste_num: POSTE_NUM, source_code: SOURCE_CODE, data: { rows: next } }),
        });
        setSavedOk(true); setTimeout(() => setSavedOk(false), 2500);
        setGesResults(next.map(r => { const c = calcRow(r); return { total_co2_gco2e: c.co2, total_ges_gco2e: c.total, total_ges_tco2e: c.tco2e }; }));
      } finally { setAutoSaving(false); }
    }, 900);
  };

  const updateRow = (idx: number, key: keyof Source5_1B1Row, val: string) => {
    const n = rows.map((r, i) => i === idx ? { ...r, [key]: val } : r); setRows(n); triggerSave(n);
  };
  const addRow    = () => { const n = [...rows, { ...EMPTY_ROW }]; setRows(n); triggerSave(n); };
  const removeRow = (idx: number) => { const n = rows.filter((_, i) => i !== idx); setRows(n); triggerSave(n); };
  const cloneRow  = (idx: number) => { const n = [...rows, { ...rows[idx] }]; setRows(n); triggerSave(n); };

  const totals = rows.reduce((a, r) => { const c = calcRow(r); return { co2: a.co2 + c.co2, total: a.total + c.total, tco2e: a.tco2e + c.tco2e }; }, { co2: 0, total: 0, tco2e: 0 });

  if (loading) return <Flex justify="center" py={10}><Spinner color={FIGMA.green} size="xl" /></Flex>;

  return (
    <Box bg={FIGMA.bg} borderRadius={FIGMA.r} p={{ base: 4, md: 6 }} boxShadow={FIGMA.cardShadow} animation={`${fadeInUp} 0.4s ease`}>
      <Flex justify="space-between" align="center" mb={5}>
        <VStack align="start" spacing={0}>
          <Heading size="md" color={FIGMA.green}>5.1B1 — Produits vendus consommant des combustibles</Heading>
          <Text fontSize="sm" color={FIGMA.muted}>Émissions liées à la combustion de carburant dans les produits vendus</Text>
        </VStack>
        <HStack spacing={2}>
          {autoSaving && <Spinner size="sm" color={FIGMA.green} />}
          {savedOk    && <CheckCircleIcon color="green.400" boxSize={5} />}
          <Badge colorScheme="green" variant="subtle">{SOURCE_CODE}</Badge>
        </HStack>
      </Flex>

      <VStack spacing={4} align="stretch">
        {rows.map((row, idx) => (
          <Box key={idx} bg="white" borderRadius={FIGMA.r} p={4}
            border={`1px solid ${FIGMA.border}`} boxShadow={FIGMA.inputShadow}
            animation={`${fadeInUp} 0.3s ease ${idx * 0.05}s both`}>

            <Flex justify="space-between" align="center" mb={3}>
              <Badge bg={FIGMA.greenSoft} color={FIGMA.green} borderRadius="8px" px={3} py={1} fontSize="xs">Produit {idx + 1}</Badge>
              <HStack spacing={1}>
                <Button size="xs" variant="ghost" color={FIGMA.muted} onClick={() => cloneRow(idx)} leftIcon={<Copy size={12} />}>Copier</Button>
                <Button size="xs" variant="ghost" color="red.400" onClick={() => removeRow(idx)} leftIcon={<Trash2 size={12} />}>Suppr.</Button>
              </HStack>
            </Flex>

            <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap={3}>
              <GridItem colSpan={{ base: 1, md: 3 }}>
                <Text fontSize="xs" color={FIGMA.muted} mb={1}><Icon as={FiFileText} mr={1} />Description du produit vendu</Text>
                <Input size="sm" borderRadius={FIGMA.inputR} value={row.description}
                  onChange={e => updateRow(idx, "description", e.target.value)} placeholder="ex. Chaudière au gaz modèle compact…" />
              </GridItem>

              <GridItem colSpan={{ base: 1, md: 2 }}>
                <Text fontSize="xs" color={FIGMA.muted} mb={1}><Icon as={FiDroplet} mr={1} />Type de combustible</Text>
                <Select size="sm" borderRadius={FIGMA.inputR} value={row.fuelType}
                  onChange={e => updateRow(idx, "fuelType", e.target.value)}>
                  {FUEL_OPTIONS.map(f => <option key={f}>{f}</option>)}
                </Select>
              </GridItem>

              <GridItem>
                <Text fontSize="xs" color={FIGMA.muted} mb={1}>Unités vendues (qté)</Text>
                <Input size="sm" borderRadius={FIGMA.inputR} type="number" min={0}
                  value={row.qtySold} onChange={e => updateRow(idx, "qtySold", e.target.value)} placeholder="0" />
              </GridItem>

              <GridItem>
                <Text fontSize="xs" color={FIGMA.muted} mb={1}>Litres / unité / an</Text>
                <Input size="sm" borderRadius={FIGMA.inputR} type="number" min={0}
                  value={row.litresPerUnitPerYear} onChange={e => updateRow(idx, "litresPerUnitPerYear", e.target.value)} placeholder="0" />
              </GridItem>

              <GridItem>
                <Text fontSize="xs" color={FIGMA.muted} mb={1}>Durée d&apos;utilisation (années)</Text>
                <Input size="sm" borderRadius={FIGMA.inputR} type="number" min={1}
                  value={row.yearsOfUse} onChange={e => updateRow(idx, "yearsOfUse", e.target.value)} placeholder="1" />
              </GridItem>

              <GridItem>
                <Text fontSize="xs" color={FIGMA.muted} mb={1}><Icon as={FiCalendar} mr={1} />Date (facultatif)</Text>
                <Input size="sm" borderRadius={FIGMA.inputR} type="date" value={row.date}
                  onChange={e => updateRow(idx, "date", e.target.value)} />
              </GridItem>

              <GridItem>
                <Text fontSize="xs" color={FIGMA.muted} mb={1}><Icon as={FiMapPin} mr={1} />Site</Text>
                <Select size="sm" borderRadius={FIGMA.inputR} value={row.site}
                  onChange={e => updateRow(idx, "site", e.target.value)} placeholder="Sélectionner…">
                  {(siteOptions.length ? siteOptions : [row.site].filter(Boolean)).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </GridItem>

              <GridItem>
                <Text fontSize="xs" color={FIGMA.muted} mb={1}>Produit / Service</Text>
                <Select size="sm" borderRadius={FIGMA.inputR} value={row.product}
                  onChange={e => updateRow(idx, "product", e.target.value)} placeholder="Sélectionner…">
                  {(productOptions.length ? productOptions : [row.product].filter(Boolean)).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </GridItem>

              <GridItem>
                <Text fontSize="xs" color={FIGMA.muted} mb={1}><Icon as={FiFileText} mr={1} />Référence (facultatif)</Text>
                <ReferenceSelect size="sm" userId={userId ?? ""} value={row.reference} onChange={(v) => updateRow(idx, "reference", v)} />
              </GridItem>
            </Grid>

            {toNum(row.qtySold) > 0 && toNum(row.litresPerUnitPerYear) > 0 && (
              <Flex mt={3} p={2} bg={FIGMA.greenSoft} borderRadius="10px" align="center" justify="space-between">
                <Text fontSize="xs" color={FIGMA.green} fontWeight="600">
                  {FUEL_FACTORS[row.fuelType] ?? 2.289} kg CO₂e/L · {toNum(row.yearsOfUse) || 1} an(s)
                </Text>
                <Text fontSize="xs" color={FIGMA.green} fontWeight="bold">
                  {calcRow(row).tco2e.toFixed(5)} t CO₂e
                </Text>
              </Flex>
            )}
          </Box>
        ))}
      </VStack>

      <Button mt={4} size="sm" leftIcon={<Plus size={14} />}
        bg={FIGMA.green} color="white" borderRadius="12px"
        boxShadow={FIGMA.buttonShadow} _hover={{ bg: FIGMA.greenLight }}
        onClick={addRow} animation={`${pulse} 2s ease infinite`}>
        Ajouter un produit
      </Button>

      {rows.length > 0 && (
        <Grid mt={6} templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap={3}>
          {[
            { label: "CO₂ [gCO₂e]",      val: totals.co2.toFixed(2) },
            { label: "Total GES [gCO₂e]", val: totals.total.toFixed(2) },
            { label: "Total GES [tCO₂e]", val: totals.tco2e.toFixed(5) },
          ].map(card => (
            <GridItem key={card.label}>
              <Box bg="white" borderRadius="12px" p={3} border={`1px solid ${FIGMA.border}`} textAlign="center">
                <Text fontSize="xs" color={FIGMA.muted}>{card.label}</Text>
                <Text fontWeight="bold" color={FIGMA.green} fontSize="lg">{card.val}</Text>
              </Box>
            </GridItem>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default Source5_1B1Form;

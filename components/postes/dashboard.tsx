'use client';

import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Flex, Text, SimpleGrid, HStack, VStack,
  Switch, Table, Thead, Tbody, Tr, Th, Td,
  IconButton, Skeleton, Badge, Spacer,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from "recharts";

/* ─── Design tokens ──────────────────────────────────────────────────────── */
const TOK = {
  bg:        "#F6F7FB",
  surface:   "#FFFFFF",
  border:    "#E5E7EB",
  subtle:    "#6B7280",
  heading:   "#111827",
  primary:   "#264a3b",
  pillBg:    "#EEF2F1",
  rowStripe: "#F2F4F7",
  grayCard:  "#F3F4F6",
};

/* ─── Category → color ──────────────────────────────────────────────────── */
const CAT_COLOR: Record<number, string> = {
  1: "#6E56CF",
  2: "#3BAEAD",
  3: "#57A1F6",
  4: "#F5A524",
  5: "#9CCC65",
  6: "#F87171",
};

const CATEGORY_COLORS: Record<string, string> = {
  "Directes":                 "#6E56CF",
  "Ind. liés à l'énergie":   "#3BAEAD",
  "Ind. liés aux transports": "#57A1F6",
  "Ind. en amont":            "#F5A524",
  "Ind. en aval":             "#9CCC65",
  "Autres indirectes":        "#F87171",
};

const SLICE_COLORS = [
  "#57A1F6","#9CCC65","#F5A524","#6E56CF","#3BAEAD",
  "#F87171","#265B7B","#00C49F","#FFBB28","#FF8042",
];

/* ─── Scope helpers ─────────────────────────────────────────────────────── */
const SCOPE_OF:    Record<number, 1|2|3>  = { 1:1, 2:2, 3:3, 4:3, 5:3, 6:3 };
const SCOPE_COLOR: Record<1|2|3, string>  = { 1:"#6E56CF", 2:"#3BAEAD", 3:"#57A1F6" };
const SCOPE_SHORT: Record<1|2|3, string>  = {
  1: "Émissions directes",
  2: "Énergie importée",
  3: "Émissions indirectes",
};

const ALL_CATS = [
  { num: 1, label: "Cat. 1 — Émissions directes",          scope: 1 as 1|2|3 },
  { num: 2, label: "Cat. 2 — Énergie importée",            scope: 2 as 1|2|3 },
  { num: 3, label: "Cat. 3 — Transports indirects",        scope: 3 as 1|2|3 },
  { num: 4, label: "Cat. 4 — Hors énergie et transport",   scope: 3 as 1|2|3 },
  { num: 5, label: "Cat. 5 — Utilisation des produits",    scope: 3 as 1|2|3 },
  { num: 6, label: "Cat. 6 — Autres émissions indirectes", scope: 3 as 1|2|3 },
];

const CAT_LABEL: Record<number, string> = Object.fromEntries(ALL_CATS.map(c => [c.num, c.label]));

/* ─── Types ─────────────────────────────────────────────────────────────── */
export type PosteResult = {
  poste:     number;
  label:     string;
  tCO2eq:    number;
  co2?:      number;
  ch4?:      number;
  n2o?:      number;
  percent?:  number;
  category?: string;
  color?:    string;
  location?: string;
  site?:     string;
  production_site?: string;
  [key: string]: any;
};

export type EnergyPosteResult = {
  poste:     number;
  label:     string;
  kwh:       number;
  percent?:  number;
  category?: string;
  color?:    string;
  [key: string]: any;
};

type GesSummary = {
  total_tCO2eq?: number | string;
  co2?:  number | string;
  ch4?:  number | string;
  n2o?:  number | string;
  ges?:  number | string;
  [key: string]: any;
};

type EnergySummary = {
  total_kwh?: number | string;
  total_gj?:  number | string;
  [key: string]: any;
};

type EnergyTrendPoint = { year: string | number; kwh: number };

interface GesDashboardProps {
  posteResults?:  PosteResult[];
  summary?:       GesSummary;
  energyResults?: EnergyPosteResult[];
  energySummary?: EnergySummary;
  energyTrend?:   EnergyTrendPoint[];
  isLoading?:     boolean;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */
const fmt = (v: unknown, maxFrac = 2) => {
  if (v === null || v === undefined || v === "-") return "-";
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  return Intl.NumberFormat("fr-CA", { maximumFractionDigits: maxFrac }).format(n);
};

const pct = (value: number, total: number) => total > 0 ? (value / total) * 100 : 0;

const colorOfRow = (row: PosteResult | EnergyPosteResult, i: number) =>
  (row as PosteResult).color ||
  (row.category ? CATEGORY_COLORS[row.category] : undefined) ||
  CAT_COLOR[row.poste] ||
  SLICE_COLORS[i % SLICE_COLORS.length];

/* ─── Atom: NavBtn ──────────────────────────────────────────────────────── */
const NavBtn = ({ ariaLabel, onClick, icon }: { ariaLabel: string; onClick: () => void; icon: React.ReactElement }) => (
  <IconButton
    aria-label={ariaLabel} onClick={onClick} icon={icon}
    size="sm" w="28px" h="28px" minW="28px"
    bg="#F5F6F5" borderRadius="8px"
    _hover={{ bg: "#ECEEEB" }} _active={{ bg: "#E4E7E2" }}
    color="#8F8F8F" border="0"
    sx={{ svg: { width: "18px", height: "18px" } }}
  />
);

/* ═══════════════════════════════════════════════════════════════════════════
   RÉSUMÉ TAB
═══════════════════════════════════════════════════════════════════════════ */
function ResumeTab({ rows, summary }: { rows: PosteResult[]; summary: GesSummary }) {
  const total  = Number(summary.total_tCO2eq || 0);
  const sorted = [...rows].sort((a, b) => b.tCO2eq - a.tCO2eq);

  const scopeTotal = (s: 1|2|3) =>
    rows.filter(r => SCOPE_OF[r.poste] === s).reduce((acc, r) => acc + (Number(r.tCO2eq) || 0), 0);

  const s1 = scopeTotal(1);
  const s2 = scopeTotal(2);
  const s3 = scopeTotal(3);

  const scopePieData = ([1,2,3] as const)
    .map(s => ({ name: SCOPE_SHORT[s], value: s===1?s1:s===2?s2:s3, color: SCOPE_COLOR[s] }))
    .filter(d => d.value > 0);

  return (
    <VStack spacing={5} align="stretch">

      {/* ── Total KPI card ── */}
      <Box bg={TOK.primary} rounded="24px" p={{ base: 5, md: 7 }}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={6}>
          <Box color="white">
            <Text fontSize="11px" fontWeight="700" textTransform="uppercase"
              letterSpacing="wider" opacity={0.65} mb={2}>
              Total des émissions GES — ISO 14064
            </Text>
            <Flex align="baseline" gap={2}>
              <Text fontSize={{ base: "38px", md: "52px" }} fontWeight="900" lineHeight="1">
                {total > 0 ? fmt(total, 3) : "—"}
              </Text>
              <Text fontSize="18px" fontWeight="600" opacity={0.75}>tCO₂e</Text>
            </Flex>
            <Text fontSize="12px" opacity={0.55} mt={1}>
              {rows.filter(r => r.tCO2eq > 0).length} / {ALL_CATS.length} catégories renseignées
            </Text>
          </Box>

          {/* Mini scope donut */}
          <Box w="150px" h="150px" flexShrink={0}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={scopePieData.length ? scopePieData : [{ name:"—", value:1, color:"rgba(255,255,255,0.15)" }]}
                  dataKey="value" cx="50%" cy="50%"
                  innerRadius={48} outerRadius={65} paddingAngle={2}
                >
                  {(scopePieData.length ? scopePieData : [{ color:"rgba(255,255,255,0.15)" }]).map((d,i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any) => [fmt(v,2), "tCO₂e"]}
                  contentStyle={{ borderRadius:10, fontSize:12, border:"none", boxShadow:"0 4px 12px rgba(0,0,0,0.15)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          {/* Scope legend */}
          <VStack align="flex-start" spacing={2} color="white">
            {([1,2,3] as const).map(s => {
              const val = s===1?s1:s===2?s2:s3;
              const p   = pct(val, total);
              return (
                <HStack key={s} spacing={2}>
                  <Box w="8px" h="8px" rounded="full" bg={SCOPE_COLOR[s]} flexShrink={0} />
                  <Text fontSize="12px" opacity={0.80}>Scope {s} — {SCOPE_SHORT[s]}</Text>
                  <Text fontSize="12px" fontWeight="700">{fmt(val,1)} t</Text>
                  <Text fontSize="11px" opacity={0.50}>({fmt(p,0)}%)</Text>
                </HStack>
              );
            })}
          </VStack>
        </Flex>
      </Box>

      {/* ── Scope cards ── */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        {([1,2,3] as const).map(s => {
          const val   = s===1?s1:s===2?s2:s3;
          const p     = pct(val, total);
          const color = SCOPE_COLOR[s];
          const cats  = ALL_CATS.filter(c => c.scope === s);
          const filled = cats.filter(c => (rows.find(r => r.poste===c.num)?.tCO2eq||0) > 0).length;
          const sc = { 1:{bg:"#EEE9FD",txt:"#6E56CF"}, 2:{bg:"#E6F6F6",txt:"#3BAEAD"}, 3:{bg:"#E8F0FE",txt:"#57A1F6"} }[s];
          return (
            <Box key={s} bg={TOK.surface} rounded="20px" border="1px solid" borderColor={TOK.border} p={5}>
              <HStack mb={2} justify="space-between">
                <HStack spacing={2}>
                  <Box w="10px" h="10px" rounded="full" bg={color} />
                  <Text fontSize="11px" fontWeight="700" textTransform="uppercase" letterSpacing="wide" color={TOK.subtle}>
                    Scope {s}
                  </Text>
                </HStack>
                <Badge fontSize="10px" px={2} py={0.5} rounded="full" bg={sc.bg} color={sc.txt} fontWeight="700">
                  {filled}/{cats.length} cat.
                </Badge>
              </HStack>
              <Text fontSize="12px" color={TOK.subtle} mb={1}>{SCOPE_SHORT[s]}</Text>
              <Text fontSize="28px" fontWeight="800" color={TOK.heading} lineHeight="1">
                {total > 0 ? fmt(val, 2) : "—"}
              </Text>
              <Text fontSize="12px" color={TOK.subtle} mb={3}>tCO₂e</Text>
              <Box w="full" h="6px" bg={TOK.border} rounded="full" mb={1.5}>
                <Box w={`${p}%`} h="full" bg={color} rounded="full" />
              </Box>
              <Flex justify="space-between">
                <Text fontSize="11px" color={TOK.subtle}>du total</Text>
                <Text fontSize="11px" color={color} fontWeight="700">{fmt(p,1)}%</Text>
              </Flex>
            </Box>
          );
        })}
      </SimpleGrid>

      {/* ── Répartition par catégorie ── */}
      <Box bg={TOK.surface} rounded="20px" border="1px solid" borderColor={TOK.border} p={5}>
        <Text fontWeight="700" fontSize="14px" color={TOK.heading} mb={4}>
          Répartition par catégorie
        </Text>
        {rows.length === 0 ? (
          <Text color={TOK.subtle} fontSize="13px" textAlign="center" py={6}>
            Aucune donnée saisie pour cette période.
          </Text>
        ) : (
          <VStack spacing={3} align="stretch">
            {sorted.filter(r => r.tCO2eq > 0).map((row, i) => {
              const p     = pct(row.tCO2eq, total);
              const color = colorOfRow(row, i);
              return (
                <Box key={i}>
                  <Flex justify="space-between" mb={1}>
                    <HStack spacing={2}>
                      <Box w="8px" h="8px" rounded="full" bg={color} flexShrink={0} />
                      <Text fontSize="13px" color={TOK.heading}>{row.label}</Text>
                    </HStack>
                    <HStack spacing={4}>
                      <Text fontSize="13px" fontWeight="700" color={TOK.heading}>{fmt(row.tCO2eq,2)} tCO₂e</Text>
                      <Text fontSize="12px" color={TOK.subtle} w="36px" textAlign="right">{fmt(p,1)}%</Text>
                    </HStack>
                  </Flex>
                  <Box w="full" h="5px" bg={TOK.border} rounded="full">
                    <Box w={`${p}%`} h="full" bg={color} rounded="full" />
                  </Box>
                </Box>
              );
            })}
          </VStack>
        )}
      </Box>

      {/* ── Détail par gaz ── */}
      {rows.filter(r => r.tCO2eq > 0).length > 0 && (
        <Box bg={TOK.surface} rounded="20px" border="1px solid" borderColor={TOK.border} overflow="hidden">
          <Box px={5} pt={5} pb={3}>
            <Text fontWeight="700" fontSize="14px" color={TOK.heading}>Détail par gaz à effet de serre (tCO₂e)</Text>
            <Text fontSize="12px" color={TOK.subtle} mt={0.5}>CO₂ · CH₄ · N₂O convertis en équivalent CO₂</Text>
          </Box>
          <Table size="sm" variant="simple">
            <Thead bg={TOK.grayCard}>
              <Tr>
                <Th fontSize="11px" color={TOK.subtle} fontWeight="700">Catégorie</Th>
                <Th isNumeric fontSize="11px" color={TOK.subtle} fontWeight="700">CO₂</Th>
                <Th isNumeric fontSize="11px" color={TOK.subtle} fontWeight="700">CH₄</Th>
                <Th isNumeric fontSize="11px" color={TOK.subtle} fontWeight="700">N₂O</Th>
                <Th isNumeric fontSize="11px" color={TOK.subtle} fontWeight="700">Total tCO₂e</Th>
                <Th isNumeric fontSize="11px" color={TOK.subtle} fontWeight="700">%</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.filter(r => r.tCO2eq > 0).map((r, i) => (
                <Tr key={i} bg={i % 2 ? TOK.rowStripe : TOK.surface}>
                  <Td>
                    <HStack spacing={2}>
                      <Box w="8px" h="8px" rounded="full" bg={colorOfRow(r, i)} />
                      <Text fontSize="13px">{r.label}</Text>
                    </HStack>
                  </Td>
                  <Td isNumeric fontSize="13px">{fmt(r.co2 ?? 0)}</Td>
                  <Td isNumeric fontSize="13px">{fmt(r.ch4 ?? 0)}</Td>
                  <Td isNumeric fontSize="13px">{fmt(r.n2o ?? 0)}</Td>
                  <Td isNumeric fontWeight="700" fontSize="13px">{fmt(r.tCO2eq)}</Td>
                  <Td isNumeric fontSize="12px" color={TOK.subtle}>{fmt(pct(r.tCO2eq, total),1)}%</Td>
                </Tr>
              ))}
              <Tr bg={TOK.grayCard} fontWeight="bold">
                <Td fontSize="13px">Totaux</Td>
                <Td isNumeric fontSize="13px">{fmt(summary.co2 ?? 0)}</Td>
                <Td isNumeric fontSize="13px">{fmt(summary.ch4 ?? 0)}</Td>
                <Td isNumeric fontSize="13px">{fmt(summary.n2o ?? 0)}</Td>
                <Td isNumeric fontSize="13px">{fmt(summary.total_tCO2eq ?? 0)}</Td>
                <Td isNumeric fontSize="12px">100%</Td>
              </Tr>
            </Tbody>
          </Table>
        </Box>
      )}
    </VStack>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROGRESSION TAB
═══════════════════════════════════════════════════════════════════════════ */
function ProgressionTab({ rows, total }: { rows: PosteResult[]; total: number }) {
  const filledCount = ALL_CATS.filter(c => (rows.find(r => r.poste===c.num)?.tCO2eq||0) > 0).length;
  const overall     = (filledCount / ALL_CATS.length) * 100;

  return (
    <VStack spacing={5} align="stretch">

      {/* ── Global card ── */}
      <Box bg={TOK.surface} rounded="20px" border="1px solid" borderColor={TOK.border} p={5}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={4} mb={4}>
          <Box>
            <Flex align="baseline" gap={2} mb={0.5}>
              <Text fontSize="30px" fontWeight="900" color={TOK.heading}>{filledCount}</Text>
              <Text fontSize="15px" fontWeight="500" color={TOK.subtle}>/ {ALL_CATS.length} catégories renseignées</Text>
            </Flex>
            <Text fontSize="12px" color={TOK.subtle}>
              {total > 0 ? `${fmt(total,3)} tCO₂e saisis au total` : "Aucune donnée saisie pour le moment"}
            </Text>
          </Box>
          <Box textAlign="right">
            <Text fontSize="38px" fontWeight="900" color={TOK.primary}>{Math.round(overall)}%</Text>
            <Text fontSize="11px" color={TOK.subtle}>complété</Text>
          </Box>
        </Flex>
        <Box w="full" h="10px" bg={TOK.border} rounded="full">
          <Box w={`${overall}%`} h="full" bg={TOK.primary} rounded="full" />
        </Box>
      </Box>

      {/* ── Per-category rows ── */}
      <Box bg={TOK.surface} rounded="20px" border="1px solid" borderColor={TOK.border} p={5}>
        <Text fontWeight="700" fontSize="14px" color={TOK.heading} mb={4}>Avancement par catégorie</Text>
        <VStack spacing={4} align="stretch">
          {ALL_CATS.map(cat => {
            const row     = rows.find(r => r.poste === cat.num);
            const val     = row?.tCO2eq || 0;
            const p       = pct(val, total);
            const hasData = val > 0;
            const color   = CAT_COLOR[cat.num];
            const sc = {
              1: { bg:"#EEE9FD", txt:"#6E56CF" },
              2: { bg:"#E6F6F6", txt:"#3BAEAD" },
              3: { bg:"#E8F0FE", txt:"#57A1F6" },
            }[cat.scope];
            return (
              <Box key={cat.num}>
                <Flex justify="space-between" align="center" mb={1.5}>
                  <HStack spacing={2}>
                    <Box w="8px" h="8px" rounded="full" bg={hasData ? color : "#D1D5DB"} />
                    <Text fontSize="13px" fontWeight={hasData ? "600" : "400"}
                      color={hasData ? TOK.heading : TOK.subtle}>
                      {cat.label}
                    </Text>
                    <Badge fontSize="9px" px={1.5} py={0.5} rounded="full"
                      bg={sc.bg} color={sc.txt} fontWeight="700">
                      Scope {cat.scope}
                    </Badge>
                  </HStack>
                  <HStack spacing={3}>
                    <Text fontSize="13px" fontWeight="700" color={hasData ? TOK.heading : TOK.subtle}>
                      {fmt(val,2)} tCO₂e
                    </Text>
                    {hasData && <Text fontSize="11px" color={TOK.subtle}>{fmt(p,1)}%</Text>}
                    <Box w="18px" h="18px" rounded="full"
                      bg={hasData ? "#DCFCE7" : TOK.grayCard}
                      display="flex" alignItems="center" justifyContent="center">
                      <Text fontSize="10px" color={hasData ? "#16A34A" : TOK.subtle}>
                        {hasData ? "✓" : "○"}
                      </Text>
                    </Box>
                  </HStack>
                </Flex>
                <Box w="full" h="6px" bg={TOK.border} rounded="full">
                  <Box w={hasData ? `${Math.max(p,1.5)}%` : "0%"} h="full" bg={hasData ? color : "transparent"} rounded="full" />
                </Box>
              </Box>
            );
          })}
        </VStack>
      </Box>

      {/* ── Stacked composition bar ── */}
      {total > 0 && (
        <Box bg={TOK.surface} rounded="20px" border="1px solid" borderColor={TOK.border} p={5}>
          <Text fontWeight="700" fontSize="14px" color={TOK.heading} mb={3}>Composition des émissions</Text>
          <Box w="full" h="28px" rounded="full" overflow="hidden" display="flex">
            {ALL_CATS.map(cat => {
              const val = rows.find(r => r.poste===cat.num)?.tCO2eq || 0;
              const p   = pct(val, total);
              if (p < 0.5) return null;
              return <Box key={cat.num} w={`${p}%`} h="full" bg={CAT_COLOR[cat.num]} title={`${cat.label}: ${fmt(val,2)} tCO₂e`} />;
            })}
          </Box>
          <HStack mt={3} spacing={4} wrap="wrap">
            {ALL_CATS.filter(cat => (rows.find(r => r.poste===cat.num)?.tCO2eq||0) > 0).map(cat => (
              <HStack key={cat.num} spacing={1.5}>
                <Box w="8px" h="8px" rounded="full" bg={CAT_COLOR[cat.num]} />
                <Text fontSize="11px" color={TOK.subtle}>{cat.label.split("—")[1]?.trim()}</Text>
              </HStack>
            ))}
          </HStack>
        </Box>
      )}
    </VStack>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GES DONUT PANEL
═══════════════════════════════════════════════════════════════════════════ */
type ChartMode = "poste" | "lieu" | "croissant";
const MODE_ORDER: ChartMode[] = ["poste", "lieu", "croissant"];
const MODE_TITLE: Record<ChartMode, string> = {
  poste:     "Émissions GES par catégorie [tCO₂e]",
  lieu:      "Émissions GES par lieu de production [tCO₂e]",
  croissant: "Émissions GES — ordre croissant [tCO₂e]",
};

const aggregateByCat = (rows: PosteResult[]) => {
  const acc: Record<string, number> = {};
  rows.forEach(r => { const k = r.category ?? "Autres"; acc[k] = (acc[k]??0) + (Number(r.tCO2eq)||0); });
  return Object.entries(acc).map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] ?? "#D1D5DB" }));
};

const aggregateByLoc = (rows: PosteResult[]) => {
  const acc: Record<string, number> = {};
  rows.forEach(r => {
    const loc = (r.location || r.production_site || r.site || "").trim() || "Non spécifié";
    acc[loc] = (acc[loc]??0) + (Number(r.tCO2eq)||0);
  });
  return Object.entries(acc)
    .map(([name, value], i) => ({ name, value, color: SLICE_COLORS[i % SLICE_COLORS.length] }))
    .sort((a,b) => b.value - a.value);
};

function GesDonutPanel({ data }: { data: PosteResult[] }) {
  const [modeIdx, setModeIdx] = useState(0);
  const mode    = MODE_ORDER[modeIdx];
  const [hovered,   setHovered]   = useState<number | null>(null);
  const [activeLoc, setActiveLoc] = useState<string | null>(null);
  const catAgg = useMemo(() => aggregateByCat(data), [data]);
  const locAgg = useMemo(() => aggregateByLoc(data), [data]);

  return (
    <Box bg={TOK.surface} rounded="24px" border="1px solid" borderColor={TOK.border} p={6}>
      <Flex align="center" gap={3} mb={4}>
        <NavBtn ariaLabel="Précédent" onClick={() => setModeIdx(i => (i-1+MODE_ORDER.length)%MODE_ORDER.length)} icon={<ChevronLeftIcon />} />
        <Text flex="1" fontWeight="800" fontSize="14px" color={TOK.heading} textAlign="center" lineHeight="1.2">
          {MODE_TITLE[mode]}
        </Text>
        <NavBtn ariaLabel="Suivant" onClick={() => setModeIdx(i => (i+1)%MODE_ORDER.length)} icon={<ChevronRightIcon />} />
      </Flex>

      <Flex gap={5} align="center" direction={{ base:"column", md:"row" }}>
        <Box flex="0 0 320px" w={{ base:"100%", md:"320px" }} h="290px">
          <ResponsiveContainer width="100%" height="100%">
            {data.length === 0 ? (
              <Flex w="100%" h="100%" align="center" justify="center">
                <Text color={TOK.subtle} fontSize="13px">Aucune donnée</Text>
              </Flex>
            ) : mode === "croissant" ? (
              <BarChart
                data={[...data].map(r => ({ name: r.label?.split("—")[0]?.trim()||`Cat.${r.poste}`, value: Number(r.tCO2eq)||0 })).sort((a,b)=>a.value-b.value)}
                layout="vertical" margin={{ top:10, right:12, bottom:10, left:10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical />
                <XAxis type="number" tick={{ fontSize:11, fill:TOK.subtle }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize:10, fill:TOK.subtle }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v:any) => [fmt(v), "tCO₂e"]} contentStyle={{ borderRadius:12, fontSize:12, border:`1px solid ${TOK.border}` }} />
                <Bar dataKey="value" radius={[0,6,6,0]}>
                  {data.map((r,i) => <Cell key={i} fill={colorOfRow(r,i)} />)}
                </Bar>
              </BarChart>
            ) : mode === "lieu" ? (
              <PieChart>
                <Pie data={locAgg} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={85} outerRadius={120} paddingAngle={1.5} onMouseLeave={() => setHovered(null)}>
                  {locAgg.map((row,i) => (
                    <Cell key={i} fill={row.color}
                      opacity={activeLoc && row.name!==activeLoc ? 0.35 : hovered===i||hovered===null ? 1 : 0.45}
                      onMouseEnter={() => setHovered(i)} />
                  ))}
                </Pie>
                <Pie data={[{v:1}]} dataKey="v" cx="50%" cy="50%" innerRadius={0} outerRadius={55} fill={TOK.surface} isAnimationActive={false} />
                <Tooltip formatter={(v:any) => [fmt(v), "tCO₂e"]} contentStyle={{ borderRadius:12, fontSize:12, border:`1px solid ${TOK.border}` }} />
              </PieChart>
            ) : (
              <PieChart>
                <Pie data={data} dataKey="tCO2eq" nameKey="label" cx="50%" cy="50%" innerRadius={90} outerRadius={118} paddingAngle={1.5} onMouseLeave={() => setHovered(null)}>
                  {data.map((row,i) => (
                    <Cell key={i} fill={colorOfRow(row,i)} opacity={hovered===i||hovered===null?1:0.45} onMouseEnter={() => setHovered(i)} />
                  ))}
                </Pie>
                <Pie data={catAgg} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={62} outerRadius={86} paddingAngle={1}>
                  {catAgg.map((c,i) => <Cell key={i} fill={c.color} opacity={0.9} />)}
                </Pie>
                <Pie data={[{v:1}]} dataKey="v" cx="50%" cy="50%" innerRadius={0} outerRadius={52} fill={TOK.surface} isAnimationActive={false} />
                <Tooltip contentStyle={{ borderRadius:12, fontSize:12, border:`1px solid ${TOK.border}` }} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </Box>

        <Box flex="1" maxW={{ md:"360px" }}>
          {mode === "poste" ? (
            <Box border="1px solid" borderColor={TOK.border} rounded="16px" overflow="hidden">
              {data.map((row,i) => (
                <Flex key={i} px={3} py={2} align="center"
                  bg={i%2 ? TOK.rowStripe : TOK.surface}
                  onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} cursor="default">
                  <Box w="10px" h="10px" rounded="full" bg={colorOfRow(row,i)} mr={3} />
                  <Text flex="1" fontSize="13px">{row.label}</Text>
                  <Text fontWeight="700" fontSize="13px">{fmt(row.tCO2eq)}</Text>
                </Flex>
              ))}
            </Box>
          ) : mode === "lieu" ? (
            <Flex justify="center" wrap="wrap" gap={2}>
              {locAgg.slice(0,6).map(l => (
                <Box key={l.name} as="button" px={3} h="24px" rounded="full" fontSize="11px"
                  bg={activeLoc===l.name ? TOK.primary : "#F5F6F5"}
                  color={activeLoc===l.name ? "#fff" : "#2F2F2F"} fontWeight={600}
                  _hover={{ bg: activeLoc===l.name ? TOK.primary : "#ECEEEB" }}
                  onClick={() => setActiveLoc(cur => cur===l.name ? null : l.name)}>
                  {l.name}
                </Box>
              ))}
            </Flex>
          ) : (
            <Text color={TOK.subtle} fontSize="12px" textAlign="center">Survolez une barre pour voir le détail.</Text>
          )}
        </Box>
      </Flex>

      {/* Legend */}
      <Box mt={4} p={3} bg={TOK.grayCard} rounded="16px" border="1px solid" borderColor={TOK.border}>
        <Text fontSize="11px" color={TOK.subtle} mb={2} fontWeight="600">Légende des catégories</Text>
        <HStack spacing={2} wrap="wrap">
          {ALL_CATS.map(cat => (
            <HStack key={cat.num} spacing={1.5} bg="#fff" border="1px solid" borderColor={TOK.border} rounded="12px" px={2} py="3px">
              <Box w="7px" h="7px" rounded="full" bg={CAT_COLOR[cat.num]} />
              <Text fontSize="11px">{cat.label.split("—")[1]?.trim()}</Text>
            </HStack>
          ))}
        </HStack>
      </Box>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GES DETAILED TABLE
═══════════════════════════════════════════════════════════════════════════ */
function GesDetailedTable({ rows, summary }: { rows: PosteResult[]; summary?: GesSummary }) {
  return (
    <Box bg={TOK.surface} rounded="24px" border="1px solid" borderColor={TOK.border} overflow="hidden">
      <Table size="sm" variant="simple">
        <Thead bg={TOK.grayCard}>
          <Tr>
            <Th fontSize="11px" color={TOK.subtle} fontWeight="700"></Th>
            <Th fontSize="11px" color={TOK.subtle} fontWeight="700">Poste d'émission</Th>
            <Th isNumeric fontSize="11px" color={TOK.subtle} fontWeight="700">CO₂</Th>
            <Th isNumeric fontSize="11px" color={TOK.subtle} fontWeight="700">CH₄</Th>
            <Th isNumeric fontSize="11px" color={TOK.subtle} fontWeight="700">N₂O</Th>
            <Th isNumeric fontSize="11px" color={TOK.subtle} fontWeight="700">tCO₂e</Th>
            <Th isNumeric fontSize="11px" color={TOK.subtle} fontWeight="700">%</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((r,i) => (
            <Tr key={i} bg={i%2 ? TOK.rowStripe : TOK.surface}>
              <Td w="28px">
                <Flex align="center">
                  <Box w="9px" h="9px" rounded="full" bg={colorOfRow(r,i)} mr={2} />
                  <Text fontSize="11px" color={TOK.subtle}>{r.poste}</Text>
                </Flex>
              </Td>
              <Td><Text fontSize="13px">{r.label}</Text></Td>
              <Td isNumeric fontSize="13px">{fmt(r.co2??0)}</Td>
              <Td isNumeric fontSize="13px">{fmt(r.ch4??0)}</Td>
              <Td isNumeric fontSize="13px">{fmt(r.n2o??0)}</Td>
              <Td isNumeric fontWeight="700" fontSize="13px">{fmt(r.tCO2eq??0)}</Td>
              <Td isNumeric fontSize="12px" color={TOK.subtle}>{fmt(r.percent??0,1)}%</Td>
            </Tr>
          ))}
          <Tr bg={TOK.grayCard} fontWeight="bold">
            <Td colSpan={2} fontSize="13px">Totaux</Td>
            <Td isNumeric fontSize="13px">{fmt(summary?.co2??0)}</Td>
            <Td isNumeric fontSize="13px">{fmt(summary?.ch4??0)}</Td>
            <Td isNumeric fontSize="13px">{fmt(summary?.n2o??0)}</Td>
            <Td isNumeric fontSize="13px">{fmt(summary?.total_tCO2eq??summary?.ges??0)}</Td>
            <Td isNumeric fontSize="12px">100%</Td>
          </Tr>
        </Tbody>
      </Table>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ENERGY DONUT PANEL  (dead arrows removed)
═══════════════════════════════════════════════════════════════════════════ */
function EnergyDonutPanel({ rows, unit, onToggleUnit }: { rows: EnergyPosteResult[]; unit:"kwh"|"gj"; onToggleUnit:()=>void }) {
  const totalKwh  = useMemo(() => rows.reduce((s,r) => s+(Number(r.kwh)||0), 0), [rows]);
  const dispVal   = (kwh: number) => unit==="kwh" ? kwh : kwh*0.0036;
  const unitLabel = unit==="kwh" ? "kWh" : "GJ";

  return (
    <Box bg={TOK.surface} rounded="24px" border="1px solid" borderColor={TOK.border} p={6}>
      <Flex align="center" justify="space-between" mb={4}>
        <Text fontWeight="800" fontSize="14px" color={TOK.heading}>
          Distribution de l'énergie [{unitLabel}]
        </Text>
        <HStack spacing={2}>
          <Text fontSize="12px" color={TOK.subtle}>kWh</Text>
          <Switch size="sm" isChecked={unit==="gj"} onChange={onToggleUnit} colorScheme="green" aria-label="Basculer unité" />
          <Text fontSize="12px" color={TOK.subtle}>GJ</Text>
        </HStack>
      </Flex>

      <Flex gap={5} align="center" direction={{ base:"column", md:"row" }}>
        <Box flex="0 0 320px" w={{ base:"100%", md:"320px" }} h="290px">
          <ResponsiveContainer width="100%" height="100%">
            {rows.length === 0 ? (
              <Flex w="100%" h="100%" align="center" justify="center">
                <Text color={TOK.subtle} fontSize="13px">Aucune donnée énergétique</Text>
              </Flex>
            ) : (
              <PieChart>
                <Pie data={rows} dataKey={d => dispVal(Number(d.kwh)||0)} nameKey="label"
                  cx="50%" cy="50%" innerRadius={90} outerRadius={118} paddingAngle={1.5}>
                  {rows.map((r,i) => <Cell key={i} fill={colorOfRow(r,i)} />)}
                </Pie>
                <Pie data={[{v:1}]} dataKey="v" cx="50%" cy="50%" innerRadius={0} outerRadius={52} fill={TOK.surface} isAnimationActive={false} />
                <Tooltip formatter={(v:any) => [fmt(v,0), unitLabel]} contentStyle={{ borderRadius:12, fontSize:12, border:`1px solid ${TOK.border}` }} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </Box>

        <Box flex="1" maxW={{ md:"440px" }}>
          <Box border="1px solid" borderColor={TOK.border} rounded="16px" overflow="hidden">
            {rows.map((r,i) => {
              const p = r.percent ?? pct(Number(r.kwh)||0, totalKwh);
              return (
                <Flex key={i} px={3} py={2} align="center" bg={i%2 ? TOK.rowStripe : TOK.surface}>
                  <Box w="9px" h="9px" rounded="full" bg={colorOfRow(r,i)} mr={3} />
                  <Text flex="1" fontSize="13px">{r.label}</Text>
                  <Text fontWeight="600" fontSize="13px" w="110px" textAlign="right">
                    {fmt(dispVal(Number(r.kwh)||0), 0)}
                  </Text>
                  <Text fontWeight="700" fontSize="13px" w="48px" textAlign="right">{fmt(p,0)}%</Text>
                </Flex>
              );
            })}
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ENERGY DETAILED TABLE
═══════════════════════════════════════════════════════════════════════════ */
function EnergyDetailedTable({ rows, unit }: { rows: EnergyPosteResult[]; unit:"kwh"|"gj" }) {
  const totalKwh  = useMemo(() => rows.reduce((s,r) => s+(Number(r.kwh)||0), 0), [rows]);
  const dispVal   = (kwh: number) => unit==="kwh" ? kwh : kwh*0.0036;
  const unitLabel = unit==="kwh" ? "kWh" : "GJ";

  return (
    <Box bg={TOK.surface} rounded="24px" border="1px solid" borderColor={TOK.border} overflow="hidden">
      <Table size="sm" variant="simple">
        <Thead bg={TOK.grayCard}>
          <Tr>
            <Th fontSize="11px" color={TOK.subtle} fontWeight="700"></Th>
            <Th fontSize="11px" color={TOK.subtle} fontWeight="700">Poste d'émission</Th>
            <Th isNumeric fontSize="11px" color={TOK.subtle} fontWeight="700">{unitLabel}</Th>
            <Th isNumeric fontSize="11px" color={TOK.subtle} fontWeight="700">%</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((r,i) => {
            const val = Number(r.kwh)||0;
            const p   = r.percent ?? pct(val, totalKwh);
            return (
              <Tr key={i} bg={i%2 ? TOK.rowStripe : TOK.surface}>
                <Td w="28px">
                  <Flex align="center">
                    <Box w="9px" h="9px" rounded="full" bg={colorOfRow(r,i)} mr={2} />
                    <Text fontSize="11px" color={TOK.subtle}>{r.poste}</Text>
                  </Flex>
                </Td>
                <Td><Text fontSize="13px">{r.label}</Text></Td>
                <Td isNumeric fontWeight="600" fontSize="13px">{fmt(dispVal(val),0)}</Td>
                <Td isNumeric fontWeight="700" fontSize="13px">{fmt(p,0)}%</Td>
              </Tr>
            );
          })}
          <Tr bg={TOK.grayCard} fontWeight="bold">
            <Td colSpan={2} fontSize="13px">Totaux</Td>
            <Td isNumeric fontSize="13px">{fmt(unit==="kwh" ? totalKwh : totalKwh*0.0036, 0)}</Td>
            <Td isNumeric fontSize="13px">100%</Td>
          </Tr>
        </Tbody>
      </Table>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ENERGY TREND CARD
═══════════════════════════════════════════════════════════════════════════ */
function EnergyTrendCard({ points, unit }: { points: EnergyTrendPoint[]; unit:"kwh"|"gj" }) {
  const dispVal   = (kwh: number) => unit==="kwh" ? kwh : kwh*0.0036;
  const unitLabel = unit==="kwh" ? "kWh" : "GJ";
  const data = useMemo(() =>
    (points||[]).map(p => ({ year: String(p.year), value: dispVal(Number(p.kwh)||0) })),
    [points, unit]
  );
  return (
    <Box bg={TOK.surface} rounded="24px" border="1px solid" borderColor={TOK.border} p={6}>
      <Text fontWeight="800" fontSize="14px" color={TOK.heading} textAlign="center" mb={4}>
        Évolution des besoins énergétiques [{unitLabel}]
      </Text>
      <Box w="100%" h="180px">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top:10, right:12, bottom:5, left:0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize:12, fill:TOK.subtle }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:12, fill:TOK.subtle }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v:any) => [fmt(v,0), unitLabel]} contentStyle={{ borderRadius:12, fontSize:12, border:`1px solid ${TOK.border}` }} />
            <Line type="monotone" dataKey="value" stroke={TOK.primary} strokeWidth={2} dot={{ r:3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */
export default function GesDashboard({
  posteResults  = [],
  summary       = {},
  energyResults = [],
  energySummary = {},
  energyTrend   = [],
  isLoading     = false,
}: GesDashboardProps) {
  type TabKey = "resume" | "ges" | "energie" | "progression";
  const [activeTab,   setActiveTab]   = useState<TabKey>("resume");
  const [energyUnit,  setEnergyUnit]  = useState<"kwh"|"gj">("kwh");

  useEffect(() => {
    if (activeTab === "energie") setEnergyUnit("kwh");
  }, [activeTab]);

  const gesRows = useMemo<PosteResult[]>(() =>
    (posteResults||[]).map(r => ({
      ...r,
      label: CAT_LABEL[r.poste] || r.label || `Cat. ${r.poste}`,
    })), [posteResults]
  );

  const energyRows = useMemo<EnergyPosteResult[]>(() =>
    (energyResults||[]).map(r => ({
      ...r,
      label: CAT_LABEL[r.poste] || r.label || `Cat. ${r.poste}`,
    })), [energyResults]
  );

  const total = Number(summary.total_tCO2eq || 0);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "resume",      label: "Résumé" },
    { key: "ges",         label: "Bilan GES" },
    { key: "energie",     label: "Bilan énergétique" },
    { key: "progression", label: "Progression" },
  ];

  return (
    <Box bg={TOK.bg} minH="100vh" w="100%" p={{ base:4, md:6 }}>
      {/* Header */}
      <Flex align="center" mb={5} wrap="wrap" gap={3}>
        <Box>
          <Text fontWeight="900" fontSize="26px" color={TOK.heading} lineHeight="1">
            {activeTab === "energie" ? "Bilan énergétique" : "Bilan GES"}
          </Text>
          <Text fontSize="12px" color={TOK.subtle} mt={0.5}>ISO 14064 — GHG Protocol</Text>
        </Box>
        <Spacer />
        <HStack spacing={1} bg={TOK.pillBg} p="4px" rounded="999px">
          {tabs.map(t => (
            <Box key={t.key} as="button"
              px={4} h="34px" rounded="999px" fontSize="13px"
              bg={activeTab===t.key ? TOK.primary : "transparent"}
              color={activeTab===t.key ? "#fff" : "#334155"}
              fontWeight={activeTab===t.key ? 700 : 500}
              onClick={() => setActiveTab(t.key)}
              transition="all 0.15s"
            >
              {t.label}
            </Box>
          ))}
        </HStack>
      </Flex>

      {isLoading ? (
        <SimpleGrid columns={{ base:1, lg:2 }} spacing={5}>
          {[0,1].map(i => (
            <Box key={i} bg={TOK.surface} rounded="24px" border="1px solid" borderColor={TOK.border} p={6}>
              <Skeleton height="20px" mb={4} />
              <Skeleton height="320px" mb={4} />
              <Skeleton height="120px" />
            </Box>
          ))}
        </SimpleGrid>
      ) : activeTab === "resume" ? (
        <ResumeTab rows={gesRows} summary={summary} />
      ) : activeTab === "ges" ? (
        <SimpleGrid columns={{ base:1, lg:2 }} spacing={5}>
          <GesDonutPanel data={gesRows} />
          <GesDetailedTable rows={gesRows} summary={summary} />
        </SimpleGrid>
      ) : activeTab === "energie" ? (
        <>
          <SimpleGrid columns={{ base:1, lg:2 }} spacing={5} mb={5}>
            <EnergyDonutPanel rows={energyRows} unit={energyUnit} onToggleUnit={() => setEnergyUnit(u => u==="kwh"?"gj":"kwh")} />
            <EnergyDetailedTable rows={energyRows} unit={energyUnit} />
          </SimpleGrid>
          {energyTrend && energyTrend.length > 0 ? (
            <EnergyTrendCard points={energyTrend} unit={energyUnit} />
          ) : (
            <Box bg={TOK.surface} rounded="24px" border="1px solid" borderColor={TOK.border} p={6} textAlign="center">
              <Text color={TOK.subtle} fontSize="13px">Aucune donnée d'évolution disponible pour le moment.</Text>
            </Box>
          )}
        </>
      ) : (
        <ProgressionTab rows={gesRows} total={total} />
      )}
    </Box>
  );
}

export { GesDashboard };

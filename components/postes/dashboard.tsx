'use client';

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Flex,
  Text,
  SimpleGrid,
  HStack,
  Switch,
  Spacer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Button,
  Skeleton,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon, InfoIcon } from "@chakra-ui/icons";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

// ===== Design tokens =====
const TOK = {
  bg: "#F6F7FB",
  surface: "#FFFFFF",
  border: "#E5E7EB",
  subtle: "#6B7280",
  heading: "#111827",
  primary: "#264a3b",
  pillBg: "#EEF2F1",
  rowStripe: "#F2F4F7",
  grayCard: "#F3F4F6",
  white: "#FFFFFF",

  // Figma-like nav controls
  navBg: "#F5F6F5",
  navIcon: "#8F8F8F",
};

// ==== Category palette ====
const CATEGORY_COLORS: Record<string, string> = {
  "Directes": "#6E56CF",
  "Ind. liés à l'énergie": "#3BAEAD",
  "Ind. liés aux transports": "#57A1F6",
  "Ind. en amont": "#F5A524",
  "Ind. en aval": "#9CCC65",
  "Autres indirectes": "#F87171",
};

// ==== Fallback slice colors ====
const SLICE_COLORS = [
  "#57A1F6", "#9CCC65", "#F5A524", "#6E56CF", "#3BAEAD",
  "#F87171", "#265B7B", "#00C49F", "#FFBB28", "#FF8042",
];

export type PosteResult = {
  poste: number;
  label: string;
  tCO2eq: number;
  co2?: number;
  ch4?: number;
  n2o?: number;
  percent?: number;
  category?: string;
  color?: string;

  // optional fields for other "formats"
  location?: string;
  site?: string;
  production_site?: string;

  [key: string]: any;
};

export type EnergyPosteResult = {
  poste: number;
  label: string;
  kwh: number; // canonical in kWh
  percent?: number;
  category?: string;
  color?: string;
  [key: string]: any;
};

type GesSummary = {
  total_tCO2eq?: number | string;
  co2?: number | string;
  ch4?: number | string;
  n2o?: number | string;
  ges?: number | string;
  [key: string]: any;
};

type EnergySummary = {
  total_kwh?: number | string;
  total_gj?: number | string;
  [key: string]: any;
};

type EnergyTrendPoint = {
  year: string | number;
  kwh: number;
};

interface GesDashboardProps {
  // GES (from your existing handler)
  posteResults?: PosteResult[];
  summary?: GesSummary;

  // ENERGY (new fields from updated handler)
  energyResults?: EnergyPosteResult[];
  energySummary?: EnergySummary;
  energyTrend?: EnergyTrendPoint[];

  // Optional: if you want to show a skeleton while parent fetches
  isLoading?: boolean;
}

/* =========================
   OFFICIAL POSTE ALIASES
   ========================= */
const POSTE_ALIASES: Record<number, string> = {
  1:  "Combustions fixes",
  2:  "Combustions mobiles",
  3:  "Procédés et élevages d’animaux",
  4:  "Réfrigérants",
  5:  "Sols et forêts",
  6:  "Consommation d’électricités",
  7:  "Consommation autres énergies",
  8:  "Production et distribution d’énergies",
  9:  "Achat de biens et de services",
  10: "Biens immobiliers",
  11: "Génération de déchets",
  12: "Transport et distribution en amont",
  13: "Déplacements d’affaires",
  14: "Location d’actif en amont",
  15: "Investissements",
  16: "Clients et visiteurs",
  17: "Transport et distribution en aval",
  18: "Usages des produits vendus",
  19: "Fin de vie des produits",
  20: "Franchises en aval",
  21: "Location d’actif en aval",
  22: "Navettages des employés",
  23: "Autres sources",
};

// ===== helpers =====
const fmt = (v: unknown, maxFrac = 2) => {
  if (v === null || v === undefined || v === "-") return "-";
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  return Intl.NumberFormat(undefined, { maximumFractionDigits: maxFrac }).format(n);
};

const pickLocation = (r: PosteResult) =>
  (r.location || r.production_site || r.site || "").trim();

const aggregateByCategoryGes = (rows: PosteResult[]) => {
  const acc: Record<string, number> = {};
  rows.forEach(r => {
    const key = r.category ?? "Autres";
    acc[key] = (acc[key] ?? 0) + (Number(r.tCO2eq) || 0);
  });
  return Object.entries(acc).map(([name, value]) => ({
    name,
    value,
    color: CATEGORY_COLORS[name] ?? "#D1D5DB",
  }));
};

const aggregateByLocationGes = (rows: PosteResult[]) => {
  const acc: Record<string, number> = {};
  rows.forEach(r => {
    const loc = pickLocation(r) || "Localisation";
    acc[loc] = (acc[loc] ?? 0) + (Number(r.tCO2eq) || 0);
  });
  const entries = Object.entries(acc).map(([name, value], i) => ({
    name,
    value,
    color: SLICE_COLORS[i % SLICE_COLORS.length],
  }));
  entries.sort((a, b) => b.value - a.value);
  return entries;
};

const computePercent = (value: number, total: number) =>
  total > 0 ? (value / total) * 100 : 0;

type ChartMode = "poste" | "lieu" | "croissant";
const MODE_ORDER: ChartMode[] = ["poste", "lieu", "croissant"];

const MODE_TITLE_GES: Record<ChartMode, string> = {
  poste: "Émissions de GES par poste d’émission [tCO²e]",
  lieu: "Émissions de GES par lieu de production [tCO²e]",
  croissant: "Émissions de GES par poste d’émission en ordre croissant [tCO²e]",
};

const NavBtn = ({
  ariaLabel,
  onClick,
  icon,
}: {
  ariaLabel: string;
  onClick: () => void;
  icon: React.ReactElement;
}) => (
  <IconButton
    aria-label={ariaLabel}
    onClick={onClick}
    icon={icon}
    size="sm"
    w="28px"
    h="28px"
    minW="28px"
    bg={TOK.navBg}
    borderRadius="8px"
    _hover={{ bg: "#ECEEEB" }}
    _active={{ bg: "#E4E7E2" }}
    color={TOK.navIcon}
    border="0"
    sx={{ svg: { width: "18px", height: "18px" } }}
  />
);

/* -------------------------------------------------
   GES Donut / Lieu / Croissant + arrows
   ------------------------------------------------- */
function GesDonutPanel({ data }: { data: PosteResult[] }) {
  const [modeIndex, setModeIndex] = useState(0);
  const mode: ChartMode = MODE_ORDER[modeIndex];
  const hasData = data.length > 0;

  const [hovered, setHovered] = useState<number | null>(null);
  const [activeLoc, setActiveLoc] = useState<string | null>(null);

  const catAgg = useMemo(() => aggregateByCategoryGes(data), [data]);
  const locAgg = useMemo(() => aggregateByLocationGes(data), [data]);

  const colorOfPoste = (row: PosteResult, i: number) =>
    row.color ||
    (row.category ? CATEGORY_COLORS[row.category] : undefined) ||
    SLICE_COLORS[i % SLICE_COLORS.length];

  const goPrev = () => setModeIndex((i) => (i - 1 + MODE_ORDER.length) % MODE_ORDER.length);
  const goNext = () => setModeIndex((i) => (i + 1) % MODE_ORDER.length);

  return (
    <Box bg={TOK.surface} rounded="24px" border="1px solid" borderColor={TOK.border} p={6}>
      <Flex align="center" gap={3} mb={2}>
        <NavBtn ariaLabel="Précédent" onClick={goPrev} icon={<ChevronLeftIcon />} />
        <Box flex="1">
          <Text fontWeight="800" fontSize="16px" color={TOK.heading} textAlign="center" lineHeight="1.2">
            {MODE_TITLE_GES[mode]}
          </Text>
        </Box>
        <NavBtn ariaLabel="Suivant" onClick={goNext} icon={<ChevronRightIcon />} />
      </Flex>

      <Flex gap={6} align="center" direction={{ base: "column", md: "row" }}>
        <Box flex="0 0 360px" w={{ base: "100%", md: "360px" }} h="320px">
          <ResponsiveContainer width="100%" height="100%">
            {!hasData ? (
              <Flex w="100%" h="100%" align="center" justify="center">
                <Text color={TOK.subtle}>Aucune donnée</Text>
              </Flex>
            ) : mode === "croissant" ? (
              <BarChart
                data={[...data]
                  .map((r) => ({
                    name: `Poste ${r.poste}`,
                    value: Number(r.tCO2eq) || 0,
                  }))
                  .sort((a, b) => a.value - b.value)}
                layout="vertical"
                margin={{ top: 10, right: 12, bottom: 10, left: 48 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical />
                <XAxis type="number" tick={{ fontSize: 12, fill: TOK.subtle }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={72}
                  tick={{ fontSize: 12, fill: TOK.subtle }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: any) => [fmt(v), "tCO²e"]}
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${TOK.border}`,
                    boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                  {data.map((r, i) => (
                    <Cell
                      key={`bar-${i}`}
                      fill={r.category ? CATEGORY_COLORS[r.category] : SLICE_COLORS[i % SLICE_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : mode === "lieu" ? (
              <PieChart>
                <Pie
                  data={locAgg}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={85}
                  outerRadius={120}
                  paddingAngle={1.5}
                  onMouseLeave={() => setHovered(null)}
                >
                  {locAgg.map((row, i) => {
                    const dim =
                      activeLoc && row.name !== activeLoc ? 0.35 : hovered === i || hovered === null ? 1 : 0.45;
                    return <Cell key={`l-${i}`} fill={row.color} opacity={dim} onMouseEnter={() => setHovered(i)} />;
                  })}
                </Pie>

                <Pie
                  data={[{ v: 1 }]}
                  dataKey="v"
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={55}
                  fill={TOK.surface}
                  isAnimationActive={false}
                />
                <Tooltip
                  formatter={(v: any) => [fmt(v), "tCO²e"]}
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${TOK.border}`,
                    boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            ) : (
              <PieChart>
                <Pie
                  data={data}
                  dataKey="tCO2eq"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={95}
                  outerRadius={120}
                  paddingAngle={1.5}
                  onMouseLeave={() => setHovered(null)}
                >
                  {data.map((row, i) => (
                    <Cell
                      key={`p-${i}`}
                      fill={colorOfPoste(row, i)}
                      opacity={hovered === i || hovered === null ? 1 : 0.45}
                      onMouseEnter={() => setHovered(i)}
                    />
                  ))}
                </Pie>

                <Pie
                  data={catAgg}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={1}
                >
                  {catAgg.map((c, i) => (
                    <Cell key={`c-${i}`} fill={c.color} opacity={0.9} />
                  ))}
                </Pie>

                <Pie
                  data={[{ v: 1 }]}
                  dataKey="v"
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={55}
                  fill={TOK.surface}
                  isAnimationActive={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${TOK.border}`,
                    boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            )}
          </ResponsiveContainer>
        </Box>

        <Box flex="1" maxW={{ md: "360px" }}>
          {mode === "poste" ? (
            <>
              <Box border="1px solid" borderColor={TOK.border} rounded="16px" overflow="hidden">
                {data.map((row, i) => (
                  <Flex
                    key={i}
                    px={3}
                    py={2}
                    align="center"
                    bg={i % 2 ? TOK.rowStripe : TOK.white}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    cursor="default"
                  >
                    <Box w="10px" h="10px" rounded="full" bg={colorOfPoste(row, i)} mr={3} />
                    <Text flex="1" fontSize="13px">
                      {row.label}
                    </Text>
                    <Text fontWeight="700" fontSize="13px">
                      {fmt(row.tCO2eq)}
                    </Text>
                  </Flex>
                ))}
              </Box>
              <Text mt={3} fontSize="12px" color={TOK.subtle} textAlign="center">
                Appuyez sur une section du graphique pour voir le résultat.
              </Text>
            </>
          ) : mode === "lieu" ? (
            <>
              <Text fontSize="12px" color={TOK.subtle} mb={2} textAlign="center">
                Sélectionnez une localisation
              </Text>
              <Flex justify="center">
                <HStack spacing={2} wrap="wrap">
                  {locAgg.slice(0, 6).map((l) => {
                    const isActive = activeLoc === l.name;
                    return (
                      <Button
                        key={l.name}
                        size="xs"
                        px={3}
                        h="22px"
                        rounded="999px"
                        bg={isActive ? TOK.primary : TOK.navBg}
                        color={isActive ? "#fff" : "#2F2F2F"}
                        fontWeight={600}
                        _hover={{ bg: isActive ? TOK.primary : "#ECEEEB" }}
                        onClick={() => setActiveLoc((cur) => (cur === l.name ? null : l.name))}
                      >
                        {l.name}
                      </Button>
                    );
                  })}
                </HStack>
              </Flex>
              <Text mt={3} fontSize="12px" color={TOK.subtle} textAlign="center">
                Appuyez sur une section du graphique pour voir le résultat.
              </Text>
            </>
          ) : (
            <Text mt={1} fontSize="12px" color={TOK.subtle} textAlign="center">
              Appuyez sur une section du graphique pour voir le résultat.
            </Text>
          )}
        </Box>
      </Flex>

      <Box mt={4} p={3} bg={TOK.grayCard} rounded="16px" border="1px solid" borderColor={TOK.border}>
        <Text fontSize="12px" color={TOK.subtle} mb={2}>
          Catégorie d’émissions
        </Text>
        <HStack spacing={3} wrap="wrap">
          {Object.entries(CATEGORY_COLORS).map(([name, color]) => (
            <HStack
              key={name}
              spacing={2}
              bg="#fff"
              border="1px solid"
              borderColor={TOK.border}
              rounded="12px"
              px={2}
              py="4px"
            >
              <Box w="10px" h="10px" rounded="full" bg={color} />
              <Text fontSize="12px">{name}</Text>
            </HStack>
          ))}
        </HStack>
      </Box>
    </Box>
  );
}

/* -------------------------------------------------
   GES Table
   ------------------------------------------------- */
function GesDetailedTable({
  rows,
  summary,
}: {
  rows: PosteResult[];
  summary?: GesSummary;
}) {
  const head = [
    { key: "index", label: "" },
    { key: "poste", label: "Poste d’émission" },
    { key: "co2", label: "CO² [tCO²e]" },
    { key: "ch4", label: "CH⁴ [tCO²e]" },
    { key: "n2o", label: "N²O [tCO²e]" },
    { key: "tCO2eq", label: "tCO²e" },
  ] as const;

  return (
    <Box bg={TOK.surface} rounded="24px" border="1px solid" borderColor={TOK.border} p={0} overflow="hidden">
      <Table size="sm" variant="simple">
        <Thead bg={TOK.grayCard}>
          <Tr>
            {head.map((h) => (
              <Th key={h.key as string} fontSize="12px" color={TOK.subtle} fontWeight="700">
                {h.label}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((r, i) => (
            <Tr key={i} bg={i % 2 ? TOK.rowStripe : TOK.white}>
              <Td w="28px">
                <Flex align="center">
                  <Box
                    w="10px"
                    h="10px"
                    rounded="full"
                    bg={r.category ? CATEGORY_COLORS[r.category] : SLICE_COLORS[i % SLICE_COLORS.length]}
                    mr={2}
                  />
                  <Text fontSize="12px" color={TOK.subtle}>
                    {r.poste ?? i + 1}
                  </Text>
                </Flex>
              </Td>
              <Td>
                <Text fontSize="14px">{r.label}</Text>
              </Td>
              <Td isNumeric>{fmt(r.co2 ?? 0)}</Td>
              <Td isNumeric>{fmt(r.ch4 ?? 0)}</Td>
              <Td isNumeric>{fmt(r.n2o ?? 0)}</Td>
              <Td isNumeric fontWeight="700">
                {fmt(r.tCO2eq ?? 0)}
              </Td>
            </Tr>
          ))}
          <Tr bg={TOK.grayCard} fontWeight="bold">
            <Td colSpan={2}>Totaux</Td>
            <Td isNumeric>{fmt(summary?.co2 ?? 0)}</Td>
            <Td isNumeric>{fmt(summary?.ch4 ?? 0)}</Td>
            <Td isNumeric>{fmt(summary?.n2o ?? 0)}</Td>
            <Td isNumeric>{fmt(summary?.total_tCO2eq ?? summary?.ges ?? 0)}</Td>
          </Tr>
        </Tbody>
      </Table>
    </Box>
  );
}

/* -------------------------------------------------
   ENERGY Donut panel (Distribution + unit toggle)
   ------------------------------------------------- */
function EnergyDonutPanel({
  rows,
  unit,
  onToggleUnit,
}: {
  rows: EnergyPosteResult[];
  unit: "kwh" | "gj";
  onToggleUnit: () => void;
}) {
  const hasData = rows.length > 0;

  const totalKwh = useMemo(() => rows.reduce((s, r) => s + (Number(r.kwh) || 0), 0), [rows]);

  const displayValue = (kwh: number) => (unit === "kwh" ? kwh : kwh * 0.0036);
  const unitLabel = unit === "kwh" ? "KWh" : "Gigajoule";

  return (
    <Box bg={TOK.surface} rounded="24px" border="1px solid" borderColor={TOK.border} p={6}>
      <Flex align="center" justify="space-between" mb={2}>
        <Flex align="center" gap={3} flex="1">
          <NavBtn ariaLabel="Précédent" onClick={() => {}} icon={<ChevronLeftIcon />} />
          <Box flex="1">
            <Text fontWeight="800" fontSize="16px" color={TOK.heading} textAlign="center" lineHeight="1.2">
              Distribution de l’énergie par poste d’émission [{unitLabel}]
            </Text>
          </Box>
          <NavBtn ariaLabel="Suivant" onClick={() => {}} icon={<ChevronRightIcon />} />
        </Flex>

        <HStack spacing={2} ml={3}>
          <Text fontSize="12px" color={TOK.subtle}>
            {unitLabel}
          </Text>
          <Switch
            size="sm"
            isChecked={unit === "gj"}
            onChange={onToggleUnit}
            colorScheme="green"
            aria-label="Basculer unité énergie"
          />
        </HStack>
      </Flex>

      <Flex gap={6} align="center" direction={{ base: "column", md: "row" }}>
        <Box flex="0 0 360px" w={{ base: "100%", md: "360px" }} h="320px">
          <ResponsiveContainer width="100%" height="100%">
            {!hasData ? (
              <Flex w="100%" h="100%" align="center" justify="center">
                <Text color={TOK.subtle}>Aucune donnée</Text>
              </Flex>
            ) : (
              <PieChart>
                <Pie
                  data={rows}
                  dataKey={(d: any) => displayValue(Number(d.kwh) || 0)}
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={95}
                  outerRadius={120}
                  paddingAngle={1.5}
                >
                  {rows.map((r, i) => (
                    <Cell
                      key={`e-${i}`}
                      fill={r.color || (r.category ? CATEGORY_COLORS[r.category] : SLICE_COLORS[i % SLICE_COLORS.length])}
                    />
                  ))}
                </Pie>
                <Pie
                  data={[{ v: 1 }]}
                  dataKey="v"
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={55}
                  fill={TOK.surface}
                  isAnimationActive={false}
                />
                <Tooltip
                  formatter={(v: any) => [fmt(v, 0), unitLabel]}
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${TOK.border}`,
                    boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            )}
          </ResponsiveContainer>
        </Box>

        <Box flex="1" maxW={{ md: "440px" }}>
          <Box border="1px solid" borderColor={TOK.border} rounded="16px" overflow="hidden">
            {rows.map((r, i) => {
              const p = r.percent ?? computePercent(Number(r.kwh) || 0, totalKwh);
              return (
                <Flex key={i} px={3} py={2} align="center" bg={i % 2 ? TOK.rowStripe : TOK.white}>
                  <Box
                    w="10px"
                    h="10px"
                    rounded="full"
                    bg={r.color || (r.category ? CATEGORY_COLORS[r.category] : SLICE_COLORS[i % SLICE_COLORS.length])}
                    mr={3}
                  />
                  <Text flex="1" fontSize="13px">
                    {r.label}
                  </Text>
                  <Text fontWeight="600" fontSize="13px" w="130px" textAlign="right">
                    {fmt(displayValue(Number(r.kwh) || 0), 0)}
                  </Text>
                  <Text fontWeight="700" fontSize="13px" w="56px" textAlign="right">
                    {fmt(p, 0)} %
                  </Text>
                </Flex>
              );
            })}
          </Box>

          <Text mt={3} fontSize="12px" color={TOK.subtle} textAlign="center">
            Appuyez sur une section du graphique pour voir le résultat.
          </Text>
        </Box>
      </Flex>

      <Box mt={4} p={3} bg={TOK.grayCard} rounded="16px" border="1px solid" borderColor={TOK.border}>
        <Text fontSize="12px" color={TOK.subtle} mb={2}>
          Catégorie d’émissions
        </Text>
        <HStack spacing={3} wrap="wrap">
          {Object.entries(CATEGORY_COLORS).map(([name, color]) => (
            <HStack
              key={name}
              spacing={2}
              bg="#fff"
              border="1px solid"
              borderColor={TOK.border}
              rounded="12px"
              px={2}
              py="4px"
            >
              <Box w="10px" h="10px" rounded="full" bg={color} />
              <Text fontSize="12px">{name}</Text>
            </HStack>
          ))}
        </HStack>
      </Box>
    </Box>
  );
}

/* -------------------------------------------------
   ENERGY Table
   ------------------------------------------------- */
function EnergyDetailedTable({
  rows,
  unit,
}: {
  rows: EnergyPosteResult[];
  unit: "kwh" | "gj";
}) {
  const totalKwh = useMemo(() => rows.reduce((s, r) => s + (Number(r.kwh) || 0), 0), [rows]);
  const display = (kwh: number) => (unit === "kwh" ? kwh : kwh * 0.0036);
  const unitLabel = unit === "kwh" ? "KWh" : "Gigajoule";

  const head = [
    { key: "index", label: "" },
    { key: "poste", label: "Poste d’émission" },
    { key: "value", label: unitLabel },
    { key: "percent", label: "%" },
  ] as const;

  return (
    <Box bg={TOK.surface} rounded="24px" border="1px solid" borderColor={TOK.border} p={0} overflow="hidden">
      <Table size="sm" variant="simple">
        <Thead bg={TOK.grayCard}>
          <Tr>
            {head.map((h) => (
              <Th key={h.key as string} fontSize="12px" color={TOK.subtle} fontWeight="700">
                {h.label}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((r, i) => {
            const val = Number(r.kwh) || 0;
            const p = r.percent ?? computePercent(val, totalKwh);
            return (
              <Tr key={i} bg={i % 2 ? TOK.rowStripe : TOK.white}>
                <Td w="28px">
                  <Flex align="center">
                    <Box
                      w="10px"
                      h="10px"
                      rounded="full"
                      bg={r.color || (r.category ? CATEGORY_COLORS[r.category] : SLICE_COLORS[i % SLICE_COLORS.length])}
                      mr={2}
                    />
                    <Text fontSize="12px" color={TOK.subtle}>
                      {r.poste ?? i + 1}
                    </Text>
                  </Flex>
                </Td>
                <Td>
                  <Text fontSize="14px">{r.label}</Text>
                </Td>
                <Td isNumeric fontWeight="600">
                  {fmt(display(val), 0)}
                </Td>
                <Td isNumeric fontWeight="700">
                  {fmt(p, 0)} %
                </Td>
              </Tr>
            );
          })}
          <Tr bg={TOK.grayCard} fontWeight="bold">
            <Td colSpan={2}>Totaux</Td>
            <Td isNumeric>{fmt(unit === "kwh" ? totalKwh : totalKwh * 0.0036, 0)}</Td>
            <Td isNumeric>100 %</Td>
          </Tr>
        </Tbody>
      </Table>
    </Box>
  );
}

/* -------------------------------------------------
   ENERGY Trend card
   ------------------------------------------------- */
function EnergyTrendCard({
  points,
  unit,
}: {
  points: EnergyTrendPoint[];
  unit: "kwh" | "gj";
}) {
  const display = (kwh: number) => (unit === "kwh" ? kwh : kwh * 0.0036);
  const unitLabel = unit === "kwh" ? "KWh" : "Gigajoule";

  const data = useMemo(
    () =>
      (points || []).map((p) => ({
        year: String(p.year),
        value: display(Number(p.kwh) || 0),
      })),
    [points, unit]
  );

  return (
    <Box bg={TOK.surface} rounded="24px" border="1px solid" borderColor={TOK.border} p={6}>
      <Text fontWeight="800" fontSize="16px" color={TOK.heading} textAlign="center" mb={2}>
        Évolution des besoins énergétiques [{unitLabel}]
      </Text>

      <Box w="100%" h="180px">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 12, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: TOK.subtle }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: TOK.subtle }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v: any) => [fmt(v, 0), unitLabel]}
              contentStyle={{
                borderRadius: 12,
                border: `1px solid ${TOK.border}`,
                boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
                fontSize: 12,
              }}
            />
            <Line type="monotone" dataKey="value" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      {/* year chips like screenshot */}
      <Flex mt={2} justify="space-between" color={TOK.subtle} fontSize="12px" gap={3} wrap="wrap">
        {data.slice(0, 5).map((d) => (
          <Box key={d.year} textAlign="center" minW="92px">
            <Text fontWeight="700" color={TOK.heading}>
              {d.year}
            </Text>
            <Text>{fmt(d.value, 0)}</Text>
            <Text>{unitLabel}</Text>
          </Box>
        ))}
      </Flex>
    </Box>
  );
}

/* ---------------------------------------------
   MAIN DASHBOARD (supports both bilans)
   --------------------------------------------- */
export default function GesDashboard({
  posteResults = [],
  summary = {},
  energyResults = [],
  energySummary = {},
  energyTrend = [],
  isLoading = false,
}: GesDashboardProps) {
  // Tabs
  type TabKey = "resume" | "ges" | "energie" | "progression";
  const [activeTab, setActiveTab] = useState<TabKey>("ges");

  // Energy unit toggle (kWh vs GJ)
  const [energyUnit, setEnergyUnit] = useState<"kwh" | "gj">("kwh");

  // ✅ Inject aliases (GES)
  const gesRows = useMemo<PosteResult[]>(
    () =>
      (posteResults || []).map((r) => {
        const current = (r.label || "").trim();
        const looksLikeGeneric =
          /^poste\s*\d+$/i.test(current) || current === "" || current.toLowerCase().startsWith("poste ");
        const alias = POSTE_ALIASES[r.poste];
        return {
          ...r,
          label: looksLikeGeneric && alias ? alias : alias || current || `Poste ${r.poste}`,
        };
      }),
    [posteResults]
  );

  // ✅ Inject aliases (Energy)
  const energyRows = useMemo<EnergyPosteResult[]>(
    () =>
      (energyResults || []).map((r) => {
        const current = (r.label || "").trim();
        const looksLikeGeneric =
          /^poste\s*\d+$/i.test(current) || current === "" || current.toLowerCase().startsWith("poste ");
        const alias = POSTE_ALIASES[r.poste];
        return {
          ...r,
          label: looksLikeGeneric && alias ? alias : alias || current || `Poste ${r.poste}`,
        };
      }),
    [energyResults]
  );

  // Titles
  const pageTitle = activeTab === "energie" ? "Bilan énergétique" : "Bilan GES";
  const sectionTitle = activeTab === "energie" ? "Voici vos besoins énergétiques" : "Voici vos émissions de GES";

  const topTabs: Array<{ key: TabKey; label: string }> = [
    { key: "resume", label: "Résumé du bilan" },
    { key: "ges", label: "Bilan GES" },
    { key: "energie", label: "Bilan énergétique" },
    { key: "progression", label: "Votre progression" },
  ];

  // When switching to energy, default to kWh (like screenshot)
  useEffect(() => {
    if (activeTab === "energie") setEnergyUnit("kwh");
  }, [activeTab]);

  return (
    <Box bg={TOK.bg} minH="100vh" w="100%" p={{ base: 4, md: 6 }}>
      {/* Header */}
      <Flex align="center" mb={4} wrap="wrap" gap={3}>
        <Text fontWeight="800" fontSize="26px" color={TOK.heading}>
          {pageTitle}
        </Text>

        <Spacer />

        {/* Tabs pill */}
        <HStack spacing={2} bg={TOK.pillBg} p="4px" rounded="999px">
          {topTabs.map((t) => {
            const isActive = activeTab === t.key || (t.key === "ges" && activeTab === "ges");
            return (
              <Box
                key={t.key}
                as="button"
                px={4}
                h="34px"
                rounded="999px"
                bg={isActive ? TOK.primary : "transparent"}
                color={isActive ? "#fff" : "#334155"}
                fontWeight={isActive ? 700 : 500}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </Box>
            );
          })}
        </HStack>

        <Spacer />

        {/* Right-side controls */}
        <HStack spacing={3}>
          <Text fontSize="13px" color={TOK.subtle}>
            Format GHG protocol
          </Text>
          <Switch size="md" colorScheme="green" />
          <IconButton aria-label="Aide" icon={<InfoIcon />} size="sm" variant="ghost" color={TOK.subtle} />
        </HStack>
      </Flex>

      {/* Section title */}
      <Text fontWeight="700" fontSize="18px" color={TOK.heading} mb={3}>
        {sectionTitle}
      </Text>

      {isLoading ? (
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5}>
          <Box bg={TOK.surface} rounded="24px" border="1px solid" borderColor={TOK.border} p={6}>
            <Skeleton height="20px" mb={4} />
            <Skeleton height="320px" mb={4} />
            <Skeleton height="120px" />
          </Box>
          <Box bg={TOK.surface} rounded="24px" border="1px solid" borderColor={TOK.border} p={6}>
            <Skeleton height="20px" mb={4} />
            <Skeleton height="360px" />
          </Box>
        </SimpleGrid>
      ) : activeTab === "energie" ? (
        <>
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5} mb={5}>
            <EnergyDonutPanel
              rows={energyRows}
              unit={energyUnit}
              onToggleUnit={() => setEnergyUnit((u) => (u === "kwh" ? "gj" : "kwh"))}
            />
            <EnergyDetailedTable rows={energyRows} unit={energyUnit} />
          </SimpleGrid>

          {/* Trend (only show when provided) */}
          {energyTrend && energyTrend.length > 0 ? (
            <EnergyTrendCard points={energyTrend} unit={energyUnit} />
          ) : (
            <Box bg={TOK.surface} rounded="24px" border="1px solid" borderColor={TOK.border} p={6}>
              <Text fontWeight="800" fontSize="16px" color={TOK.heading} textAlign="center" mb={2}>
                Évolution des besoins énergétiques [{energyUnit === "kwh" ? "KWh" : "Gigajoule"}]
              </Text>
              <Text color={TOK.subtle} textAlign="center" fontSize="13px">
                Aucune donnée d’évolution disponible.
              </Text>
            </Box>
          )}
        </>
      ) : activeTab === "ges" ? (
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5}>
          <GesDonutPanel data={gesRows} />
          <GesDetailedTable rows={gesRows} summary={summary} />
        </SimpleGrid>
      ) : (
        <Box bg={TOK.surface} rounded="24px" border="1px solid" borderColor={TOK.border} p={6}>
          <Text color={TOK.subtle}>
            Onglet « {topTabs.find((t) => t.key === activeTab)?.label} » — à implémenter.
          </Text>
        </Box>
      )}
    </Box>
  );
}

export { GesDashboard };


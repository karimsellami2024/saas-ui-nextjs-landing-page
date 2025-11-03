'use client';

import React, { useMemo, useState } from "react";
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
} from "@chakra-ui/react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
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
  [key: string]: any;
};

interface GesDashboardProps {
  posteResults?: PosteResult[];
  summary?: {
    total_tCO2eq?: number | string;
    co2?: number | string;
    ch4?: number | string;
    n2o?: number | string;
    ges?: number | string;
    [key: string]: any;
  };
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
const fmt = (v: unknown) => {
  if (v === null || v === undefined || v === "-") return "-";
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  return Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
};

const aggregateByCategory = (rows: PosteResult[]) => {
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

/* -------------------------------------------------
   Donut + legend (uses row.label -> now the alias)
   ------------------------------------------------- */
function DonutPanel({ data }: { data: PosteResult[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const hasData = data.length > 0;
  const catAgg = useMemo(() => aggregateByCategory(data), [data]);

  const colorOf = (row: PosteResult, i: number) =>
    row.color ||
    (row.category ? CATEGORY_COLORS[row.category] : undefined) ||
    SLICE_COLORS[i % SLICE_COLORS.length];

  return (
    <Box bg={TOK.surface} rounded="24px" border="1px solid" borderColor={TOK.border} p={6}>
      <Text fontWeight="800" fontSize="16px" color={TOK.heading} mb={2}>
        Émissions de GES par poste d’émission [tCO²e]
      </Text>

      <Flex gap={6} align="center" direction={{ base: "column", md: "row" }}>
        <Box flex="0 0 360px" w={{ base: "100%", md: "360px" }} h="320px">
          <ResponsiveContainer width="100%" height="100%">
            {hasData ? (
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
                      fill={colorOf(row, i)}
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
                <Tooltip />
              </PieChart>
            ) : (
              <Flex w="100%" h="100%" align="center" justify="center">
                <Text color={TOK.subtle}>Aucune donnée</Text>
              </Flex>
            )}
          </ResponsiveContainer>
        </Box>

        {/* Legend uses the alias via row.label */}
        <Box flex="1" maxW={{ md: "360px" }}>
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
                <Box w="10px" h="10px" rounded="full"
                     bg={row.category ? CATEGORY_COLORS[row.category] : SLICE_COLORS[i % SLICE_COLORS.length]}
                     mr={3}
                />
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
        </Box>
      </Flex>

      {/* Chips */}
      <Box mt={4} p={3} bg={TOK.grayCard} rounded="16px" border="1px solid" borderColor={TOK.border}>
        <Text fontSize="12px" color={TOK.subtle} mb={2}>
          Catégorie d’émissions
        </Text>
        <HStack spacing={3} wrap="wrap">
          {Object.entries(CATEGORY_COLORS).map(([name, color]) => (
            <HStack key={name} spacing={2} bg="#fff" border="1px solid" borderColor={TOK.border}
                    rounded="12px" px={2} py="4px">
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
   Detailed table (shows alias in the label column)
   ------------------------------------------------- */
function DetailedTable({
  rows,
  summary,
}: {
  rows: PosteResult[];
  summary?: GesDashboardProps["summary"];
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
            {head.map(h => (
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
                  <Text fontSize="12px" color={TOK.subtle}>{r.poste ?? i + 1}</Text>
                </Flex>
              </Td>
              <Td>
                {/* Alias already injected into r.label */}
                <Text fontSize="14px">{r.label}</Text>
              </Td>
              <Td isNumeric>{fmt(r.co2 ?? 0)}</Td>
              <Td isNumeric>{fmt(r.ch4 ?? 0)}</Td>
              <Td isNumeric>{fmt(r.n2o ?? 0)}</Td>
              <Td isNumeric fontWeight="700">{fmt(r.tCO2eq ?? 0)}</Td>
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

/* ---------------------------------------------
   SINGLE FULL-SCREEN DASHBOARD (Feuille 1 only)
   --------------------------------------------- */
export default function GesDashboard({ posteResults = [], summary = {} }: GesDashboardProps) {
  // Inject aliases: if the incoming label is missing or looks like "Poste X", replace it
  const dataWithAliases = useMemo<PosteResult[]>(
    () =>
      posteResults.map((r) => {
        const current = (r.label || "").trim();
        const looksLikeGeneric =
          /^poste\s*\d+$/i.test(current) || current === "" || current.toLowerCase().startsWith("poste ");
        const alias = POSTE_ALIASES[r.poste];
        return {
          ...r,
          label: looksLikeGeneric && alias ? alias : (alias || current || `Poste ${r.poste}`),
        };
      }),
    [posteResults]
  );

  return (
    <Box bg={TOK.bg} minH="100vh" w="100%" p={{ base: 4, md: 6 }}>
      {/* Header */}
      <Flex align="center" mb={4} wrap="wrap" gap={3}>
        <Text fontWeight="800" fontSize="26px" color={TOK.heading}>Bilan GES</Text>
        <Spacer />
        <HStack spacing={2} bg={TOK.pillBg} p="4px" rounded="999px">
          {["Résumé du bilan", "Bilan GES", "Bilan énergétique", "Votre progression"].map((t, i) => (
            <Box
              key={t}
              as="button"
              px={4}
              h="34px"
              rounded="999px"
              bg={i === 1 ? TOK.primary : "transparent"}
              color={i === 1 ? "#fff" : "#334155"}
              fontWeight={i === 1 ? 700 : 500}
            >
              {t}
            </Box>
          ))}
        </HStack>
        <Spacer />
        <HStack spacing={3}>
          <Text fontSize="13px" color={TOK.subtle}>Format GHG protocol</Text>
          <Switch size="md" colorScheme="green" />
        </HStack>
      </Flex>

      {/* Section title */}
      <Text fontWeight="700" fontSize="18px" color={TOK.heading} mb={3}>
        Voici vos émissions de GES
      </Text>

      {/* Main grid */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5}>
        <DonutPanel data={dataWithAliases} />
        <DetailedTable rows={dataWithAliases} summary={summary} />
      </SimpleGrid>
    </Box>
  );
}

export { GesDashboard };



// import React, { useState } from "react";
// import {
//   Box,
//   Flex,
//   Text,
//   Stat,
//   StatLabel,
//   StatNumber,
//   SimpleGrid,
//   useColorModeValue,
//   Table,
//   Thead,
//   Tbody,
//   Tr,
//   Th,
//   Td,
//   Tabs,
//   TabList,
//   TabPanels,
//   Tab,
//   TabPanel,
//   IconButton,
// } from "@chakra-ui/react";
// import { AddIcon } from "@chakra-ui/icons";
// import {
//   PieChart,
//   Pie,
//   Cell,
//   ResponsiveContainer,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   Tooltip,
//   CartesianGrid,
//   Sector,
// } from "recharts";
// import Example from "../postes/bardashboard"; // Or your file path

// // ---- COLORS ----
// const COLORS = [
//   "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "red", "pink", "#265B7B", "#319795",
// ];

// export type PosteResult = {
//   poste: number;
//   label: string;
//   tCO2eq: number;
//   co2?: number;
//   ch4?: number;
//   n2o?: number;
//   error?: number;
//   percent?: number;
//   results?: any[];
//   [key: string]: any;
// };
// interface GesDashboardProps {
//   posteResults?: PosteResult[];
//   summary?: {
//     total_tCO2eq?: number | string;
//     co2?: number | string;
//     ch4?: number | string;
//     n2o?: number | string;
//     ges?: number | string;
//     [key: string]: any;
//   };
// }

// // ---- ADVANCED PIECHART FOR FEUILLE 2 ----
// const pieData = [
//   { name: 'Group A', value: 400 },
//   { name: 'Group B', value: 300 },
//   { name: 'Group C', value: 300 },
//   { name: 'Group D', value: 200 },
// ];
// const renderActiveShape = (props: any) => {
//   const RADIAN = Math.PI / 180;
//   const {
//     cx, cy, midAngle, innerRadius, outerRadius,
//     startAngle, endAngle, fill, payload, percent, value,
//   } = props;
//   const sin = Math.sin(-RADIAN * midAngle);
//   const cos = Math.cos(-RADIAN * midAngle);
//   const sx = cx + (outerRadius + 10) * cos;
//   const sy = cy + (outerRadius + 10) * sin;
//   const mx = cx + (outerRadius + 30) * cos;
//   const my = cy + (outerRadius + 30) * sin;
//   const ex = mx + (cos >= 0 ? 1 : -1) * 22;
//   const ey = my;
//   const textAnchor = cos >= 0 ? 'start' : 'end';

//   return (
//     <g>
//       <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
//         {payload.name}
//       </text>
//       <Sector
//         cx={cx}
//         cy={cy}
//         innerRadius={innerRadius}
//         outerRadius={outerRadius}
//         startAngle={startAngle}
//         endAngle={endAngle}
//         fill={fill}
//       />
//       <Sector
//         cx={cx}
//         cy={cy}
//         startAngle={startAngle}
//         endAngle={endAngle}
//         innerRadius={outerRadius + 6}
//         outerRadius={outerRadius + 10}
//         fill={fill}
//       />
//       <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
//       <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
//       <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`PV ${value}`}</text>
//       <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
//         {`(Rate ${(percent * 100).toFixed(2)}%)`}
//       </text>
//     </g>
//   );
// };

// function Feuille2PieChart() {
//   const [activeIndex, setActiveIndex] = useState(0);

//   return (
    
// <Box h="770px" bg="white" rounded="2xl" boxShadow="md" p={4} m={4} overflow="hidden">
//   <Text fontWeight="bold" mb={4}>Exemple: PieChart interactif</Text>
//   <ResponsiveContainer width="100%" height="55%">
//     <PieChart>
//       {/* @ts-ignore */}
//       <Pie
//         // activeIndex={activeIndex}
//         activeShape={renderActiveShape}
//         data={pieData}
//         cx="50%"
//         cy="50%"
//         innerRadius={60}
//         outerRadius={80}
//         fill="#8884d8"
//         dataKey="value"
//         onMouseEnter={(_, index) => setActiveIndex(index)}
//       />
//     </PieChart>
//   </ResponsiveContainer>
//   <Box mt={4} h="300px" overflow="auto">
//     <Example />
//   </Box>
// </Box>




    
//   );
// }

// // ---- GES DASHBOARD CONTENT ----
// function GesDashboardContent({ posteResults = [], summary = {} }: GesDashboardProps) {
//   const sortedResults = [...posteResults].sort((a, b) => (b.tCO2eq || 0) - (a.tCO2eq || 0));
//   return (
//     <Box p={8} bg={useColorModeValue("#f4f7f9", "#181c1f")}>
//       <SimpleGrid columns={5} spacing={4} mb={8}>
//         <Stat>
//           <StatLabel>Total tCO2e</StatLabel>
//           <StatNumber>{summary?.total_tCO2eq ?? "-"}</StatNumber>
//         </Stat>
//         <Stat>
//           <StatLabel>CO₂</StatLabel>
//           <StatNumber>{summary?.co2 ?? "-"}</StatNumber>
//         </Stat>
//         <Stat>
//           <StatLabel>CH₄</StatLabel>
//           <StatNumber>{summary?.ch4 ?? "-"}</StatNumber>
//         </Stat>
//         <Stat>
//           <StatLabel>N₂O</StatLabel>
//           <StatNumber>{summary?.n2o ?? "-"}</StatNumber>
//         </Stat>
//         <Stat>
//           <StatLabel>Total GES</StatLabel>
//           <StatNumber>{summary?.ges ?? "-"}</StatNumber>
//         </Stat>
//       </SimpleGrid>
//       <Flex gap={8} flexWrap="wrap">
//         <Box flex={1} minW="350px" bg="white" p={4} rounded="2xl" boxShadow="md">
//           <Text fontWeight="bold" mb={2}>
//             Émissions de GES par poste d'émission [tCO₂éq]
//           </Text>
//           <ResponsiveContainer width="100%" height={260}>
//             <PieChart>
//               <Pie
//                 data={posteResults}
//                 dataKey="tCO2eq"
//                 nameKey="label"
//                 cx="50%"
//                 cy="50%"
//                 innerRadius={60}
//                 outerRadius={100}
//                 paddingAngle={2}
//                 label
//               >
//                 {posteResults.map((entry, index) => (
//                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                 ))}
//               </Pie>
//             </PieChart>
//           </ResponsiveContainer>
//         </Box>
//         <Box flex={1} minW="350px" bg="white" p={4} rounded="2xl" boxShadow="md">
//           <Text fontWeight="bold" mb={2}>
//             Émissions de GES par poste d'émission <br /> Incluant l'incertitude
//           </Text>
//           <ResponsiveContainer width="100%" height={260}>
//             <BarChart
//               data={posteResults}
//               margin={{ top: 24, right: 24, left: 24, bottom: 24 }}
//             >
//               <XAxis
//                 dataKey="label"
//                 angle={-15}
//                 textAnchor="end"
//                 interval={0}
//                 height={50}
//                 label={{
//                   value: "Poste d'émission",
//                   position: "insideBottom",
//                   offset: -10,
//                 }}
//               />
//               <YAxis
//                 label={{
//                   value: "tCO₂e",
//                   angle: -90,
//                   position: "insideLeft",
//                   offset: 10,
//                 }}
//                 domain={[0, "dataMax + 2"]}
//               />
//               <Tooltip />
//               <Bar dataKey="tCO2eq" fill="#5A9FD5" />
//             </BarChart>
//           </ResponsiveContainer>
//         </Box>
//       </Flex>
//       <Box mt={8} bg="white" p={4} rounded="2xl" boxShadow="md">
//         <Text fontWeight="bold" mb={2}>
//           Émissions de GES par poste d'émission en ordre décroissant [tCO₂éq]
//         </Text>
//         <ResponsiveContainer width="100%" height={300}>
//           <BarChart data={sortedResults}>
//             <XAxis dataKey="label" />
//             <YAxis />
//             <Tooltip />
//             <Bar dataKey="tCO2eq" fill="#265B7B" />
//           </BarChart>
//         </ResponsiveContainer>
//       </Box>
//       <GesSummaryTable posteResults={posteResults} summary={summary} />
//       <Example />
//     </Box>
//   );
// }

// // ---- DYNAMIC SUMMARY TABLE ----
// function GesSummaryTable({
//   posteResults,
//   summary,
// }: { posteResults: PosteResult[], summary: GesDashboardProps["summary"] }) {
//   const staticCols = [
//     { key: "poste", label: "Poste" },
//     { key: "label", label: "Description" },
//     { key: "co2", label: "CO₂" },
//     { key: "ch4", label: "CH₄" },
//     { key: "n2o", label: "N₂O" },
//     { key: "tCO2eq", label: "tCO₂e" },
//     { key: "percent", label: "%" },
//   ];

//   return (
//     <Box mt={10} bg="white" p={4} rounded="2xl" boxShadow="md">
//       <Text fontWeight="bold" mb={2} fontSize="lg">
//         Bilan global (Détaillé)
//       </Text>
//       <Table size="sm" variant="striped">
//         <Thead>
//           <Tr>
//             {staticCols.map((col) => (
//               <Th key={col.key} isNumeric={["co2", "ch4", "n2o", "tCO2eq", "percent"].includes(col.key)}>
//                 {col.label}
//               </Th>
//             ))}
//           </Tr>
//         </Thead>
//         <Tbody>
//           {posteResults.map((row, idx) => (
//             <Tr key={row.poste || idx}>
//               <Td>{row.poste}</Td>
//               <Td>{row.label}</Td>
//               <Td isNumeric>{row.co2 ?? "-"}</Td>
//               <Td isNumeric>{row.ch4 ?? "-"}</Td>
//               <Td isNumeric>{row.n2o ?? "-"}</Td>
//               <Td isNumeric>{row.tCO2eq ?? "-"}</Td>
//               <Td isNumeric>
//                 {row.percent !== undefined ? (
//                   <Box display="flex" alignItems="center">
//                     <Text mr={2}>{row.percent}%</Text>
//                     <Box w={Math.max(row.percent, 5) + "%"} h="8px" bg="teal.400" borderRadius="md" />
//                   </Box>
//                 ) : (
//                   "-"
//                 )}
//               </Td>
//             </Tr>
//           ))}
//           <Tr fontWeight="bold" bg="#f7fafc">
//             <Td colSpan={2}>Totaux</Td>
//             <Td isNumeric>{summary?.co2 ?? "-"}</Td>
//             <Td isNumeric>{summary?.ch4 ?? "-"}</Td>
//             <Td isNumeric>{summary?.n2o ?? "-"}</Td>
//             <Td isNumeric>{summary?.total_tCO2eq ?? "-"}</Td>
//             <Td />
//           </Tr>
//         </Tbody>
//       </Table>
//     </Box>
//   );
// }

// // ---- MAIN MULTI-SHEET DASHBOARD ----
// export function GesDashboard({ posteResults = [], summary = {} }: GesDashboardProps) {
//   const [sheets, setSheets] = useState([{ name: "Feuille 1" }, { name: "Feuille 2" }]);
//   const [tabIndex, setTabIndex] = useState(0);

//   const handleAddSheet = () => {
//     setSheets((prev) => [...prev, { name: `Feuille ${prev.length + 1}` }]);
//     setTabIndex(sheets.length); // Switch to the new tab
//   };

//   return (
//     <Box p={0}>
//       <Tabs index={tabIndex} onChange={setTabIndex} variant="enclosed" isLazy>
//         <Flex align="center">
//           <TabList>
//             {sheets.map((sheet, idx) => (
//               <Tab key={idx} fontWeight="bold" fontSize="md" borderRadius="md" px={5}>
//                 {sheet.name}
//               </Tab>
//             ))}
//             <IconButton
//               icon={<AddIcon />}
//               aria-label="Ajouter une feuille"
//               size="sm"
//               ml={2}
//               variant="outline"
//               onClick={handleAddSheet}
//             />
//           </TabList>
//         </Flex>
//         <TabPanels>
//           {/* Feuille 1: Main Dashboard */}
//           <TabPanel p={0}>
//             <GesDashboardContent posteResults={posteResults} summary={summary} />
//           </TabPanel>
//           {/* Feuille 2: Custom Pie Chart */}
//           <TabPanel p={0}>
//             <Feuille2PieChart />
//           </TabPanel>
//           {/* More sheets: Empty */}
//           {sheets.slice(2).map((_, idx) => (
//             <TabPanel key={idx + 2} p={8}>
//               <Text>Nouvelle feuille vide #{idx + 3}</Text>
//             </TabPanel>
//           ))}
//         </TabPanels>
//       </Tabs>
//     </Box>
//   );
// }

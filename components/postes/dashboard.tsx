import React, { useState } from "react";
import {
  Box,
  Flex,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  SimpleGrid,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  IconButton,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Sector,
} from "recharts";
import Example from "../postes/bardashboard"; // Or your file path

// ---- COLORS ----
const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "red", "pink", "#265B7B", "#319795",
];

export type PosteResult = {
  poste: number;
  label: string;
  tCO2eq: number;
  co2?: number;
  ch4?: number;
  n2o?: number;
  error?: number;
  percent?: number;
  results?: any[];
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

// ---- ADVANCED PIECHART FOR FEUILLE 2 ----
const pieData = [
  { name: 'Group A', value: 400 },
  { name: 'Group B', value: 300 },
  { name: 'Group C', value: 300 },
  { name: 'Group D', value: 200 },
];
const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const {
    cx, cy, midAngle, innerRadius, outerRadius,
    startAngle, endAngle, fill, payload, percent, value,
  } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`PV ${value}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`(Rate ${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

function Feuille2PieChart() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    
<Box h="770px" bg="white" rounded="2xl" boxShadow="md" p={4} m={4} overflow="hidden">
  <Text fontWeight="bold" mb={4}>Exemple: PieChart interactif</Text>
  <ResponsiveContainer width="100%" height="55%">
    <PieChart>
      {/* @ts-ignore */}
      <Pie
        // activeIndex={activeIndex}
        activeShape={renderActiveShape}
        data={pieData}
        cx="50%"
        cy="50%"
        innerRadius={60}
        outerRadius={80}
        fill="#8884d8"
        dataKey="value"
        onMouseEnter={(_, index) => setActiveIndex(index)}
      />
    </PieChart>
  </ResponsiveContainer>
  <Box mt={4} h="300px" overflow="auto">
    <Example />
  </Box>
</Box>




    
  );
}

// ---- GES DASHBOARD CONTENT ----
function GesDashboardContent({ posteResults = [], summary = {} }: GesDashboardProps) {
  const sortedResults = [...posteResults].sort((a, b) => (b.tCO2eq || 0) - (a.tCO2eq || 0));
  return (
    <Box p={8} bg={useColorModeValue("#f4f7f9", "#181c1f")}>
      <SimpleGrid columns={5} spacing={4} mb={8}>
        <Stat>
          <StatLabel>Total tCO2e</StatLabel>
          <StatNumber>{summary?.total_tCO2eq ?? "-"}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>CO₂</StatLabel>
          <StatNumber>{summary?.co2 ?? "-"}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>CH₄</StatLabel>
          <StatNumber>{summary?.ch4 ?? "-"}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>N₂O</StatLabel>
          <StatNumber>{summary?.n2o ?? "-"}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Total GES</StatLabel>
          <StatNumber>{summary?.ges ?? "-"}</StatNumber>
        </Stat>
      </SimpleGrid>
      <Flex gap={8} flexWrap="wrap">
        <Box flex={1} minW="350px" bg="white" p={4} rounded="2xl" boxShadow="md">
          <Text fontWeight="bold" mb={2}>
            Émissions de GES par poste d'émission [tCO₂éq]
          </Text>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={posteResults}
                dataKey="tCO2eq"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                label
              >
                {posteResults.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </Box>
        <Box flex={1} minW="350px" bg="white" p={4} rounded="2xl" boxShadow="md">
          <Text fontWeight="bold" mb={2}>
            Émissions de GES par poste d'émission <br /> Incluant l'incertitude
          </Text>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={posteResults}
              margin={{ top: 24, right: 24, left: 24, bottom: 24 }}
            >
              <XAxis
                dataKey="label"
                angle={-15}
                textAnchor="end"
                interval={0}
                height={50}
                label={{
                  value: "Poste d'émission",
                  position: "insideBottom",
                  offset: -10,
                }}
              />
              <YAxis
                label={{
                  value: "tCO₂e",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                }}
                domain={[0, "dataMax + 2"]}
              />
              <Tooltip />
              <Bar dataKey="tCO2eq" fill="#5A9FD5" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Flex>
      <Box mt={8} bg="white" p={4} rounded="2xl" boxShadow="md">
        <Text fontWeight="bold" mb={2}>
          Émissions de GES par poste d'émission en ordre décroissant [tCO₂éq]
        </Text>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sortedResults}>
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="tCO2eq" fill="#265B7B" />
          </BarChart>
        </ResponsiveContainer>
      </Box>
      <GesSummaryTable posteResults={posteResults} summary={summary} />
      <Example />
    </Box>
  );
}

// ---- DYNAMIC SUMMARY TABLE ----
function GesSummaryTable({
  posteResults,
  summary,
}: { posteResults: PosteResult[], summary: GesDashboardProps["summary"] }) {
  const staticCols = [
    { key: "poste", label: "Poste" },
    { key: "label", label: "Description" },
    { key: "co2", label: "CO₂" },
    { key: "ch4", label: "CH₄" },
    { key: "n2o", label: "N₂O" },
    { key: "tCO2eq", label: "tCO₂e" },
    { key: "percent", label: "%" },
  ];

  return (
    <Box mt={10} bg="white" p={4} rounded="2xl" boxShadow="md">
      <Text fontWeight="bold" mb={2} fontSize="lg">
        Bilan global (Détaillé)
      </Text>
      <Table size="sm" variant="striped">
        <Thead>
          <Tr>
            {staticCols.map((col) => (
              <Th key={col.key} isNumeric={["co2", "ch4", "n2o", "tCO2eq", "percent"].includes(col.key)}>
                {col.label}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {posteResults.map((row, idx) => (
            <Tr key={row.poste || idx}>
              <Td>{row.poste}</Td>
              <Td>{row.label}</Td>
              <Td isNumeric>{row.co2 ?? "-"}</Td>
              <Td isNumeric>{row.ch4 ?? "-"}</Td>
              <Td isNumeric>{row.n2o ?? "-"}</Td>
              <Td isNumeric>{row.tCO2eq ?? "-"}</Td>
              <Td isNumeric>
                {row.percent !== undefined ? (
                  <Box display="flex" alignItems="center">
                    <Text mr={2}>{row.percent}%</Text>
                    <Box w={Math.max(row.percent, 5) + "%"} h="8px" bg="teal.400" borderRadius="md" />
                  </Box>
                ) : (
                  "-"
                )}
              </Td>
            </Tr>
          ))}
          <Tr fontWeight="bold" bg="#f7fafc">
            <Td colSpan={2}>Totaux</Td>
            <Td isNumeric>{summary?.co2 ?? "-"}</Td>
            <Td isNumeric>{summary?.ch4 ?? "-"}</Td>
            <Td isNumeric>{summary?.n2o ?? "-"}</Td>
            <Td isNumeric>{summary?.total_tCO2eq ?? "-"}</Td>
            <Td />
          </Tr>
        </Tbody>
      </Table>
    </Box>
  );
}

// ---- MAIN MULTI-SHEET DASHBOARD ----
export function GesDashboard({ posteResults = [], summary = {} }: GesDashboardProps) {
  const [sheets, setSheets] = useState([{ name: "Feuille 1" }, { name: "Feuille 2" }]);
  const [tabIndex, setTabIndex] = useState(0);

  const handleAddSheet = () => {
    setSheets((prev) => [...prev, { name: `Feuille ${prev.length + 1}` }]);
    setTabIndex(sheets.length); // Switch to the new tab
  };

  return (
    <Box p={0}>
      <Tabs index={tabIndex} onChange={setTabIndex} variant="enclosed" isLazy>
        <Flex align="center">
          <TabList>
            {sheets.map((sheet, idx) => (
              <Tab key={idx} fontWeight="bold" fontSize="md" borderRadius="md" px={5}>
                {sheet.name}
              </Tab>
            ))}
            <IconButton
              icon={<AddIcon />}
              aria-label="Ajouter une feuille"
              size="sm"
              ml={2}
              variant="outline"
              onClick={handleAddSheet}
            />
          </TabList>
        </Flex>
        <TabPanels>
          {/* Feuille 1: Main Dashboard */}
          <TabPanel p={0}>
            <GesDashboardContent posteResults={posteResults} summary={summary} />
          </TabPanel>
          {/* Feuille 2: Custom Pie Chart */}
          <TabPanel p={0}>
            <Feuille2PieChart />
          </TabPanel>
          {/* More sheets: Empty */}
          {sheets.slice(2).map((_, idx) => (
            <TabPanel key={idx + 2} p={8}>
              <Text>Nouvelle feuille vide #{idx + 3}</Text>
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Box>
  );
}


// import React from "react";
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
// } from "@chakra-ui/react";
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
//   Legend,
// } from "recharts";
// import Example  from "../postes/bardashboard"; // or your file path

// // ---- TYPES ----
// export type PosteResult = {
//   poste: number;
//   label: string;
//   tCO2eq: number;
//   co2?: number;
//   ch4?: number;
//   n2o?: number;
//   error?: number;
//   percent?: number;
//   results?: any[]; // This is for future details if needed
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

// // ---- COLORS ----
// const COLORS = [
//   "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "red", "pink", "#265B7B", "#319795",
// ];

// // ---- TRIANGLE BAR (EXCEL STYLE) ----
// const getTrianglePath = (x: number, y: number, width: number, height: number) => {
//   return `M${x},${y + height}
//     C${x + width / 3},${y + height} ${x + width / 2},${y + height / 3}
//     ${x + width / 2},${y}
//     C${x + width / 2},${y + height / 3} ${x + (2 * width) / 3},${y + height} ${x + width},${y + height}
//     Z`;
// };

// const TriangleBar = (props: any) => {
//   const { fill, x, y, width, height } = props;
//   return <path d={getTrianglePath(x, y, width, height)} stroke="none" fill={fill} />;
// };

// // ---- BAR CHART COMPONENT (EXCEL STYLE) ----
// export function PosteBarChart({
//   data,
//   barKey = "tCO2eq",
//   xKey = "label",
//   label = "Émissions de GES par poste d'émission",
// }: {
//   data: PosteResult[];
//   barKey?: string;
//   xKey?: string;
//   label?: string;
// }) {
//   return (
//     <Box
//       bg="#23272E"
//       rounded="2xl"
//       boxShadow="lg"
//       p={6}
//       mt={8}
//       color="white"
//       minW="400px"
//     >
//       <Text fontWeight="bold" mb={2} color="white">
//         {label}
//       </Text>
//       <ResponsiveContainer width="100%" height={320}>
//         <BarChart
//           data={data}
//           margin={{ top: 20, right: 30, left: 20, bottom: 32 }}
//         >
//           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.13)" />
//           <XAxis
//             dataKey={xKey}
//             stroke="#EEE"
//             tick={{ fontSize: 13, fill: "#EEE" }}
//             label={{
//               value: "Poste",
//               position: "insideBottom",
//               fill: "#CCC",
//               dy: 24,
//               fontSize: 14,
//             }}
//           />
//           <YAxis
//             stroke="#EEE"
//             tick={{ fontSize: 13, fill: "#EEE" }}
//             label={{
//               value: "tCO₂e",
//               angle: -90,
//               position: "insideLeft",
//               fill: "#CCC",
//               dx: -32,
//               fontSize: 14,
//             }}
//           />
//           <Tooltip
//             cursor={{ fill: "rgba(255,255,255,0.08)" }}
//             contentStyle={{ background: "#23272E", border: "none", color: "#fff" }}
//             labelStyle={{ color: "#EEE" }}
//           />
//           <Bar
//             dataKey={barKey}
//             shape={<TriangleBar />}
//             label={{ position: "top", fill: "#fff", fontSize: 13 }}
//           >
//             {data.map((entry, index) => (
//               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//             ))}
//           </Bar>
//         </BarChart>
//       </ResponsiveContainer>
//     </Box>
//   );
// }

// // ---- DYNAMIC SUMMARY TABLE ----
// function GesSummaryTable({
//   posteResults,
//   summary,
// }: {
//   posteResults: PosteResult[];
//   summary: any;
// }) {
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

// // ---- MAIN DASHBOARD ----
// export function GesDashboard({ posteResults = [], summary = {} }: GesDashboardProps) {
//   const sortedResults = [...posteResults].sort((a, b) => (b.tCO2eq || 0) - (a.tCO2eq || 0));

//   return (
//     <Box p={8} bg={useColorModeValue("#f4f7f9", "#181c1f")}>
//       {/* SUMMARY */}
//       <SimpleGrid columns={5} spacing={4} mb={8}>
//         <Stat>
//           <StatLabel>Total tCO2e</StatLabel>
//           <StatNumber>{summary.total_tCO2eq ?? "-"}</StatNumber>
//         </Stat>
//         <Stat>
//           <StatLabel>CO₂</StatLabel>
//           <StatNumber>{summary.co2 ?? "-"}</StatNumber>
//         </Stat>
//         <Stat>
//           <StatLabel>CH₄</StatLabel>
//           <StatNumber>{summary.ch4 ?? "-"}</StatNumber>
//         </Stat>
//         <Stat>
//           <StatLabel>N₂O</StatLabel>
//           <StatNumber>{summary.n2o ?? "-"}</StatNumber>
//         </Stat>
//         <Stat>
//           <StatLabel>Total GES</StatLabel>
//           <StatNumber>{summary.ges ?? "-"}</StatNumber>
//         </Stat>
//       </SimpleGrid>

//       <Flex gap={8} flexWrap="wrap">
//         {/* Donut Chart */}
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

//         {/* Standard Bar Chart */}
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

//       {/* Sorted Bar Chart */}
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

//       {/* Detailed Table */}
//       <GesSummaryTable posteResults={posteResults} summary={summary} />

//       {/* Excel-Style Bar Chart */}
      
//       <Example/>
//     </Box>
//   );
// }

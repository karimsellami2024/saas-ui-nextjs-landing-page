'use client';

import { Box, Heading, VStack } from '@chakra-ui/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Sample data
const data = [
  { name: 'Page A', uv: 4000, pv: 2400, amt: 2400 },
  { name: 'Page B', uv: 3000, pv: 1398, amt: 2210 },
  { name: 'Page C', uv: 2000, pv: 9800, amt: 2290 },
  { name: 'Page D', uv: 2780, pv: 3908, amt: 2000 },
  { name: 'Page E', uv: 1890, pv: 4800, amt: 2181 },
  { name: 'Page F', uv: 2390, pv: 3800, amt: 2500 },
  { name: 'Page G', uv: 3490, pv: 4300, amt: 2100 },
];

function ExampleChart() {
  return (
    <Box
      w="100%"
      h="350px"
      bg="white"
      mt={10}
      p={4}
      boxShadow="md"
      borderRadius="md"
      overflow="visible"
      sx={{
        '.recharts-surface': {
          overflow: 'visible',
        },
        '.recharts-wrapper': {
          position: 'relative',
          zIndex: 1,
        },
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          barSize={60}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 'dataMax + 1000']} />
          <Tooltip />
          <Legend />
          <Bar dataKey="pv" fill="#8884d8" background={{ fill: '#eee' }} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default function ChartPage() {
  return (
    <VStack spacing={6} align="stretch" p={5} bg="gray.50" minH="100vh">
      <Heading color="blue.600">Chart Page</Heading>
      <ExampleChart />
    </VStack>
  );
}
"use client";

import React from "react";
import {
  Badge, Box, Flex, HStack, Table, Tbody, Td, Text, Tfoot, Th, Thead, Tr, VStack,
} from "@chakra-ui/react";

const P = {
  brand: "#344E41", accent: "#588157", light: "#A3B18A",
  soft: "#DDE5E0", bg: "#F5F6F4", muted: "#6B7A72", white: "#FFFFFF", dark: "#1B2E25",
};

export interface BillResult {
  file_name:               string;
  provider?:               string;
  bill_date?:              string;
  consumption_value?:      number;
  consumption_unit?:       string;
  province?:               string;
  total_ges_tco2e?:        number;
  total_co2_gco2e?:        number;
  energie_equivalente_kwh?: number;
  status: "done" | "error";
  error?: string;
}

interface BatchResultsPanelProps {
  results: BillResult[];
}

function fmt(v: number | undefined, decimals = 4): string {
  if (v === undefined || v === null || isNaN(v)) return "—";
  return v.toFixed(decimals);
}

export default function BatchResultsPanel({ results }: BatchResultsPanelProps) {
  if (results.length === 0) return null;

  const done    = results.filter(r => r.status === "done");
  const errors  = results.filter(r => r.status === "error");

  const totalTco2e = done.reduce((s, r) => s + (r.total_ges_tco2e ?? 0), 0);
  const totalKwh   = done.reduce((s, r) => s + (r.energie_equivalente_kwh ?? 0), 0);
  const totalCo2g  = done.reduce((s, r) => s + (r.total_co2_gco2e ?? 0), 0);

  return (
    <VStack align="stretch" spacing={4}>
      {/* Summary cards */}
      <Flex gap={3} flexWrap="wrap">
        <Box flex={1} minW="140px" bg={P.white} borderRadius="xl" borderWidth="1px"
          borderColor={P.soft} p={4} textAlign="center">
          <Text fontSize="xs" color={P.muted} mb={1}>Factures traitées</Text>
          <Text fontSize="2xl" fontWeight="bold" color={P.brand}>{done.length}</Text>
          {errors.length > 0 && (
            <Text fontSize="xs" color="red.500">{errors.length} erreur{errors.length > 1 ? "s" : ""}</Text>
          )}
        </Box>
        <Box flex={1} minW="140px" bg={P.white} borderRadius="xl" borderWidth="1px"
          borderColor={P.soft} p={4} textAlign="center">
          <Text fontSize="xs" color={P.muted} mb={1}>Total GES</Text>
          <Text fontSize="2xl" fontWeight="bold" color={P.accent}>{fmt(totalTco2e, 4)}</Text>
          <Text fontSize="xs" color={P.muted}>tCO₂e</Text>
        </Box>
        <Box flex={1} minW="140px" bg={P.white} borderRadius="xl" borderWidth="1px"
          borderColor={P.soft} p={4} textAlign="center">
          <Text fontSize="xs" color={P.muted} mb={1}>CO₂ total</Text>
          <Text fontSize="2xl" fontWeight="bold" color={P.dark}>{fmt(totalCo2g, 0)}</Text>
          <Text fontSize="xs" color={P.muted}>gCO₂e</Text>
        </Box>
        {totalKwh > 0 && (
          <Box flex={1} minW="140px" bg={P.white} borderRadius="xl" borderWidth="1px"
            borderColor={P.soft} p={4} textAlign="center">
            <Text fontSize="xs" color={P.muted} mb={1}>Énergie totale</Text>
            <Text fontSize="2xl" fontWeight="bold" color={P.dark}>{fmt(totalKwh, 0)}</Text>
            <Text fontSize="xs" color={P.muted}>kWh</Text>
          </Box>
        )}
      </Flex>

      {/* Per-bill table */}
      <Box bg={P.white} borderRadius="xl" borderWidth="1px" borderColor={P.soft} overflow="hidden">
        <Box overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead bg={P.bg}>
              <Tr>
                <Th color={P.muted} fontSize="xs">#</Th>
                <Th color={P.muted} fontSize="xs">Fichier</Th>
                <Th color={P.muted} fontSize="xs">Fournisseur</Th>
                <Th color={P.muted} fontSize="xs">Date</Th>
                <Th color={P.muted} fontSize="xs" isNumeric>Consommation</Th>
                <Th color={P.muted} fontSize="xs" isNumeric>GES (tCO₂e)</Th>
                <Th color={P.muted} fontSize="xs" isNumeric>CO₂ (gCO₂e)</Th>
                <Th color={P.muted} fontSize="xs">Statut</Th>
              </Tr>
            </Thead>
            <Tbody>
              {results.map((r, i) => (
                <Tr key={i} _hover={{ bg: P.bg }}>
                  <Td color={P.muted} fontSize="xs">{i + 1}</Td>
                  <Td>
                    <Text fontSize="xs" maxW="150px" noOfLines={1} color={P.dark} title={r.file_name}>
                      {r.file_name}
                    </Text>
                  </Td>
                  <Td>
                    <Text fontSize="xs" color={P.dark}>{r.provider ?? "—"}</Text>
                  </Td>
                  <Td>
                    <Text fontSize="xs" color={P.muted}>{r.bill_date ?? "—"}</Text>
                  </Td>
                  <Td isNumeric>
                    <Text fontSize="xs" color={P.dark}>
                      {r.consumption_value !== undefined
                        ? `${r.consumption_value} ${r.consumption_unit ?? ""}`
                        : "—"}
                    </Text>
                  </Td>
                  <Td isNumeric>
                    <Text fontSize="xs" fontWeight="semibold" color={P.accent}>
                      {r.status === "done" ? fmt(r.total_ges_tco2e, 6) : "—"}
                    </Text>
                  </Td>
                  <Td isNumeric>
                    <Text fontSize="xs" color={P.dark}>
                      {r.status === "done" ? fmt(r.total_co2_gco2e, 0) : "—"}
                    </Text>
                  </Td>
                  <Td>
                    {r.status === "done" ? (
                      <Badge colorScheme="green" borderRadius="full" fontSize="0.6rem">OK</Badge>
                    ) : (
                      <Badge colorScheme="red" borderRadius="full" fontSize="0.6rem" title={r.error}>Erreur</Badge>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
            {done.length > 1 && (
              <Tfoot bg="#EDF5ED">
                <Tr>
                  <Td colSpan={5}>
                    <Text fontSize="xs" fontWeight="bold" color={P.brand}>TOTAL ({done.length} factures)</Text>
                  </Td>
                  <Td isNumeric>
                    <Text fontSize="xs" fontWeight="bold" color={P.accent}>{fmt(totalTco2e, 6)}</Text>
                  </Td>
                  <Td isNumeric>
                    <Text fontSize="xs" fontWeight="bold" color={P.dark}>{fmt(totalCo2g, 0)}</Text>
                  </Td>
                  <Td />
                </Tr>
              </Tfoot>
            )}
          </Table>
        </Box>
      </Box>

      {/* Errors detail */}
      {errors.length > 0 && (
        <Box bg="#FFF5F5" borderRadius="xl" borderWidth="1px" borderColor="red.100" p={3}>
          <Text fontSize="xs" fontWeight="bold" color="red.600" mb={2}>Erreurs de traitement :</Text>
          <VStack align="stretch" spacing={1}>
            {errors.map((r, i) => (
              <HStack key={i} spacing={2}>
                <Text fontSize="xs" color={P.muted}>•</Text>
                <Text fontSize="xs" color={P.dark} fontWeight="medium">{r.file_name}</Text>
                <Text fontSize="xs" color="red.500">{r.error ?? "Erreur inconnue"}</Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  );
}

"use client";

import React from "react";
import {
  Box,
  Text,
  VStack,
  HStack,
  Divider,
  Badge,
} from "@chakra-ui/react";

// Matches my_schema (OpenAI Chat Model1 JSON Schema output)
export interface EmissionResults {
  // Required by schema
  message?:                 string;
  status?:                  "complete" | "partial" | "error";
  total_ges_tco2e?:         number;
  bill_type?:               "electricity" | "natural_gas" | "fuel_oil" | "propane" | "diesel" | "gasoline" | "refrigerant" | "other" | string;
  province?:                string;
  bill_date?:               string;
  // Optional — returned when relevant
  consumption_value?:       number;
  consumption_unit?:        string;
  provider?:                string;
  total_co2_gco2e?:         number;
  energie_equivalente_kwh?: number;
  // Refrigerant-only
  refrigerant_type?:        string;
  charge_kg?:               number;
  gwp?:                     number;
}

interface ResultsPanelProps {
  results: EmissionResults;
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <HStack justify="space-between" w="full" py={1}>
      <Text fontSize="sm" color="#6B7A72">{label}</Text>
      <Text fontSize="sm" fontWeight="semibold" color="#1B2E25">{value}</Text>
    </HStack>
  );
}

const billTypeLabels: Record<string, string> = {
  electricity: "Électricité",
  natural_gas: "Gaz naturel",
  fuel_oil:    "Mazout",
  propane:     "Propane",
  diesel:      "Diesel",
  gasoline:    "Essence",
  refrigerant: "Frigorigène",
  other:       "Autre",
};

export default function ResultsPanel({ results }: ResultsPanelProps) {
  const {
    bill_type,
    consumption_value,
    consumption_unit,
    province,
    bill_date,
    provider,
    total_ges_tco2e,
    total_co2_gco2e,
    energie_equivalente_kwh,
    refrigerant_type,
    charge_kg,
    gwp,
    status,
  } = results;

  const isRefrigerant = bill_type === "refrigerant";

  return (
    <Box
      borderWidth="1px"
      borderColor="#A3B18A"
      borderRadius="xl"
      bg="#F5F6F4"
      p={5}
      w="full"
    >
      <VStack align="stretch" spacing={3}>

        {/* Header */}
        <HStack justify="space-between">
          <Text fontWeight="bold" color="#344E41" fontSize="md">
            Résultats de calcul
          </Text>
          <HStack spacing={2}>
            {bill_type && (
              <Badge colorScheme="green" borderRadius="full" px={3}>
                {billTypeLabels[bill_type] ?? bill_type}
              </Badge>
            )}
            {status === "partial" && (
              <Badge colorScheme="orange" borderRadius="full" px={3}>
                Partiel
              </Badge>
            )}
          </HStack>
        </HStack>

        <Divider borderColor="#DDE5E0" />

        {/* Bill info */}
        <Text fontSize="xs" fontWeight="semibold" color="#6B7A72" textTransform="uppercase" letterSpacing="wide">
          Facture
        </Text>
        {provider  && <Row label="Fournisseur" value={provider} />}
        {bill_date && <Row label="Date"        value={bill_date} />}
        {province  && <Row label="Province"    value={province} />}
        {consumption_value != null && consumption_value !== 0 && (
          <Row label="Consommation" value={`${consumption_value} ${consumption_unit ?? ""}`} />
        )}

        {/* Refrigerant-only section */}
        {isRefrigerant && (
          <>
            <Divider borderColor="#DDE5E0" />
            <Text fontSize="xs" fontWeight="semibold" color="#6B7A72" textTransform="uppercase" letterSpacing="wide">
              Frigorigène
            </Text>
            {refrigerant_type && <Row label="Type"        value={refrigerant_type} />}
            {charge_kg != null && charge_kg !== 0 && <Row label="Charge"       value={`${charge_kg} kg`} />}
            {gwp       != null && gwp       !== 0 && <Row label="GWP (PRG)"    value={gwp.toString()} />}
          </>
        )}

        <Divider borderColor="#DDE5E0" />

        {/* GHG emissions */}
        <Text fontSize="xs" fontWeight="semibold" color="#6B7A72" textTransform="uppercase" letterSpacing="wide">
          Émissions GES
        </Text>
        {total_ges_tco2e != null && total_ges_tco2e !== 0 && (
          <Row label="Total GES" value={`${total_ges_tco2e} tCO₂e`} />
        )}
        {total_co2_gco2e != null && total_co2_gco2e !== 0 && (
          <Row label="CO₂ équivalent" value={`${total_co2_gco2e.toFixed(0)} gCO₂e`} />
        )}
        {energie_equivalente_kwh != null && energie_equivalente_kwh !== 0 && (
          <Row label="Énergie équivalente" value={`${energie_equivalente_kwh.toFixed(0)} kWh`} />
        )}

      </VStack>
    </Box>
  );
}

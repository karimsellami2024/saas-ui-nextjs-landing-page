"use client";

import React from "react";
import { Box, Flex, HStack, Progress, Text, VStack } from "@chakra-ui/react";

const P = {
  brand: "#344E41", accent: "#588157", light: "#A3B18A",
  soft: "#DDE5E0", bg: "#F5F6F4", muted: "#6B7A72", white: "#FFFFFF", dark: "#1B2E25",
};

export interface BillItem {
  name:   string;
  status: "pending" | "processing" | "done" | "error";
  tco2e?: number;
  error?: string;
}

export interface CategoryProgress {
  key:       string;
  icon:      string;
  label:     string;
  status:    "idle" | "extracting" | "processing" | "done" | "error";
  total:     number;
  processed: number;
  ges_total: number;
  bills:     BillItem[];
  error?:    string;
}

interface PipelineProgressProps {
  categories: CategoryProgress[];
  grandTotal: number;
}

function statusColor(s: CategoryProgress["status"]) {
  if (s === "done")       return "green.500";
  if (s === "processing" || s === "extracting") return "orange.400";
  if (s === "error")      return "red.400";
  return P.muted;
}

function statusLabel(s: CategoryProgress["status"], processed: number, total: number) {
  if (s === "idle")        return "En attente…";
  if (s === "extracting")  return "Extraction du ZIP…";
  if (s === "processing")  return `Traitement ${processed}/${total}`;
  if (s === "done")        return `Terminé (${total})`;
  if (s === "error")       return "Erreur";
  return "";
}

function BillRow({ bill }: { bill: BillItem }) {
  const icon = bill.status === "done" ? "✅"
             : bill.status === "processing" ? "⏳"
             : bill.status === "error" ? "❌" : "📄";
  return (
    <HStack spacing={2} py={0.5}>
      <Text fontSize="xs" minW="16px">{icon}</Text>
      <Text fontSize="xs" color={P.dark} flex={1} noOfLines={1} title={bill.name}>
        {bill.name}
      </Text>
      {bill.tco2e != null && (
        <Text fontSize="xs" color={P.accent} fontWeight="semibold" whiteSpace="nowrap">
          {bill.tco2e.toFixed(4)} t
        </Text>
      )}
      {bill.status === "error" && (
        <Text fontSize="xs" color="red.400" noOfLines={1} maxW="80px" title={bill.error}>
          {bill.error}
        </Text>
      )}
    </HStack>
  );
}

function CategoryCard({ cat }: { cat: CategoryProgress }) {
  const pct = cat.total > 0 ? (cat.processed / cat.total) * 100 : 0;
  const isDone = cat.status === "done";
  const isActive = cat.status === "processing" || cat.status === "extracting";

  return (
    <Box
      flex={1} minW={{ base: "100%", md: "calc(25% - 12px)" }}
      bg={P.white} borderRadius="2xl"
      borderWidth="1px"
      borderColor={isDone ? P.accent : isActive ? "orange.200" : P.soft}
      p={4}
      boxShadow={isActive ? "0 0 0 2px #F6AD55" : isDone ? "0 0 0 1px #588157" : "none"}
      transition="all 0.3s"
    >
      <VStack align="stretch" spacing={3}>
        {/* Header */}
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Text fontSize="xl">{cat.icon}</Text>
            <Text fontWeight="bold" color={P.brand} fontSize="sm">{cat.label}</Text>
          </HStack>
          <Text fontSize="xs" color={statusColor(cat.status)} fontWeight="semibold">
            {statusLabel(cat.status, cat.processed, cat.total)}
          </Text>
        </HStack>

        {/* Progress bar */}
        {cat.total > 0 && (
          <Progress
            value={pct} size="sm" borderRadius="full"
            colorScheme={isDone ? "green" : "orange"}
            bg={P.soft}
          />
        )}
        {cat.status === "extracting" && (
          <Progress size="sm" borderRadius="full" colorScheme="orange" isIndeterminate bg={P.soft} />
        )}

        {/* GES total */}
        <Box bg={isDone ? "#EDF5ED" : P.bg} borderRadius="xl" px={3} py={2} textAlign="center">
          <Text fontSize="2xl" fontWeight="bold" color={isDone ? P.accent : P.muted}>
            {cat.ges_total > 0 ? cat.ges_total.toFixed(4) : "—"}
          </Text>
          <Text fontSize="xs" color={P.muted}>tCO₂e</Text>
        </Box>

        {/* Bill list */}
        {cat.bills.length > 0 && (
          <Box maxH="160px" overflowY="auto">
            <VStack align="stretch" spacing={0}>
              {cat.bills.map((b, i) => <BillRow key={i} bill={b} />)}
            </VStack>
          </Box>
        )}

        {cat.status === "idle" && cat.total === 0 && (
          <Text fontSize="xs" color={P.light} textAlign="center">En attente…</Text>
        )}

        {cat.error && (
          <Text fontSize="xs" color="red.400">{cat.error}</Text>
        )}
      </VStack>
    </Box>
  );
}

export default function PipelineProgress({ categories, grandTotal }: PipelineProgressProps) {
  const allDone = categories.every(c => c.status === "done" || c.status === "error");

  return (
    <VStack align="stretch" spacing={6} w="100%">
      {/* Grand total banner */}
      <Box
        bg={allDone ? P.brand : P.dark}
        borderRadius="2xl" px={6} py={4}
        transition="all 0.5s"
      >
        <HStack justify="space-between" align="center">
          <VStack align="start" spacing={0}>
            <Text fontSize="xs" color={P.light} textTransform="uppercase" letterSpacing="wide">
              {allDone ? "Total annuel des émissions GES" : "Total en cours…"}
            </Text>
            <HStack align="baseline" spacing={2}>
              <Text fontSize="4xl" fontWeight="bold" color="white">
                {grandTotal.toFixed(4)}
              </Text>
              <Text fontSize="lg" color={P.light}>tCO₂e</Text>
            </HStack>
          </VStack>
          {allDone && (
            <Text fontSize="4xl">✅</Text>
          )}
          {!allDone && (
            <Box>
              <Text fontSize="3xl" sx={{ animation: "pulse 1.5s infinite" }}>📊</Text>
            </Box>
          )}
        </HStack>
      </Box>

      {/* Category cards */}
      <Flex gap={4} flexWrap="wrap" align="stretch">
        {categories.map(cat => (
          <CategoryCard key={cat.key} cat={cat} />
        ))}
      </Flex>
    </VStack>
  );
}

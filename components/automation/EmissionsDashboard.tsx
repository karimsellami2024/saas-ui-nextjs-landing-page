"use client";

import React, { useMemo, useState } from "react";
import {
  Box, Button, Flex, HStack, Table, Tbody, Td,
  Text, Tfoot, Th, Thead, Tr, VStack,
} from "@chakra-ui/react";
import type { BillItem, CategoryProgress } from "./PipelineProgress";
import CopilotTab from "./CopilotTab";

// ─── Brand palette ─────────────────────────────────────────────────────────────
const P = {
  brand: "#344E41", accent: "#588157", light: "#A3B18A",
  soft: "#DDE5E0", bg: "#F5F6F4", muted: "#6B7A72",
  white: "#FFFFFF", dark: "#1B2E25",
};

// ─── Per-source visual config ──────────────────────────────────────────────────
const SRC_COLOR: Record<string, string> = {
  electricity: "#4299E1",
  fuel:        "#ED8936",
  natural_gas: "#E53E3E",
  refrigerant: "#9B2C2C",
  fleet:       "#48BB78",
};
const SRC_BG: Record<string, string> = {
  electricity: "#EBF8FF",
  fuel:        "#FFFBEB",
  natural_gas: "#FFF5F5",
  refrigerant: "#FFF0F0",
  fleet:       "#F0FFF4",
};

// ─── GHG Protocol scope classification ────────────────────────────────────────
const SCOPE_INFO: Record<string, { scope: 1 | 2 | 3; poste: string; category: string }> = {
  electricity: { scope: 2, poste: "Poste 6", category: "Énergie indirecte" },
  fuel:        { scope: 1, poste: "Poste 2", category: "Transport mobile" },
  natural_gas: { scope: 1, poste: "Poste 1", category: "Énergie fixe — combustion" },
  refrigerant: { scope: 1, poste: "Poste 4", category: "Émissions fugitives" },
  fleet:       { scope: 1, poste: "Poste 2", category: "Transport mobile (flotte)" },
};

// ─── Carbon equivalencies (per 1 tCO₂e) ──────────────────────────────────────
const EQUIVS = [
  { icon: "🚗", label: "km en voiture",        factor: 6000 },
  { icon: "✈️",  label: "vols A/R MTL–Paris",   factor: 1    },
  { icon: "🌳", label: "arbres à planter / an", factor: 45   },
  { icon: "🏠", label: "mois de chauffage QC",  factor: 1.5  },
];

// ─── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",  icon: "📊", label: "Vue d'ensemble"    },
  { id: "detail",    icon: "🔍", label: "Analyse détaillée" },
  { id: "scopes",    icon: "🏭", label: "Scopes GES"        },
  { id: "insights",  icon: "💡", label: "Recommandations"   },
  { id: "copilot",   icon: "🤖", label: "Copilote IA"       },
  { id: "export",    icon: "📤", label: "Exporter"          },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number | null | undefined, dec = 4): string {
  if (v == null || isNaN(v)) return "—";
  return v.toLocaleString("fr-CA", {
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  });
}
function share(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}
function fmtLarge(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)} k`;
  return v.toFixed(0);
}

// ─── Donut chart (pure CSS — conic-gradient) ──────────────────────────────────
function DonutChart({
  categories, grandTotal, size = 180,
}: { categories: CategoryProgress[]; grandTotal: number; size?: number }) {
  const gradient = useMemo(() => {
    let pct = 0;
    const parts: string[] = [];
    for (const cat of categories) {
      if (cat.ges_total <= 0) continue;
      const end = pct + share(cat.ges_total, grandTotal);
      parts.push(`${SRC_COLOR[cat.key] ?? P.accent} ${pct.toFixed(2)}% ${end.toFixed(2)}%`);
      pct = end;
    }
    if (pct < 100) parts.push(`${P.soft} ${pct.toFixed(2)}% 100%`);
    return `conic-gradient(${parts.join(", ")})`;
  }, [categories, grandTotal]);

  const hole = size * 0.58;
  return (
    <Box position="relative" w={`${size}px`} h={`${size}px`} flexShrink={0}>
      <Box w="100%" h="100%" borderRadius="full" style={{ background: gradient }} />
      <Box
        position="absolute" top="50%" left="50%"
        transform="translate(-50%, -50%)"
        w={`${hole}px`} h={`${hole}px`}
        borderRadius="full" bg={P.white}
        display="flex" flexDirection="column"
        alignItems="center" justifyContent="center"
      >
        <Text fontSize="9px" color={P.muted} lineHeight={1}>Total</Text>
        <Text fontSize="sm" fontWeight="bold" color={P.dark} lineHeight={1.3}>
          {fmt(grandTotal, 2)}
        </Text>
        <Text fontSize="9px" color={P.muted}>tCO₂e</Text>
      </Box>
    </Box>
  );
}

// ─── Stacked bar (pure CSS) ────────────────────────────────────────────────────
function StackedBar({
  categories, grandTotal, h = 10,
}: { categories: CategoryProgress[]; grandTotal: number; h?: number }) {
  return (
    <Flex w="100%" h={`${h}px`} borderRadius="full" overflow="hidden">
      {categories.filter(c => c.ges_total > 0).map(cat => (
        <Box
          key={cat.key}
          w={`${share(cat.ges_total, grandTotal)}%`}
          bg={SRC_COLOR[cat.key] ?? P.accent}
          transition="width 1s ease"
          title={`${cat.label}: ${fmt(cat.ges_total)} tCO₂e`}
        />
      ))}
    </Flex>
  );
}

// ─── Scope badge ──────────────────────────────────────────────────────────────
function ScopeBadge({ scope }: { scope: 1 | 2 | 3 }) {
  const STYLE: Record<number, { bg: string; color: string }> = {
    1: { bg: "#FFF5F5", color: "#C53030" },
    2: { bg: "#EBF8FF", color: "#2B6CB0" },
    3: { bg: "#FAF5FF", color: "#6B46C1" },
  };
  const s = STYLE[scope];
  return (
    <Box
      bg={s.bg} color={s.color} px={2} py="1px"
      borderRadius="md" fontSize="10px" fontWeight="bold"
      display="inline-block" letterSpacing="wide"
    >
      SCOPE {scope}
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Vue d'ensemble
// ══════════════════════════════════════════════════════════════════════════════
function OverviewTab({
  categories, grandTotal,
}: { categories: CategoryProgress[]; grandTotal: number }) {
  const billCount = categories.reduce(
    (s, c) => s + c.bills.filter(b => b.status === "done").length, 0
  );
  const kgTotal = grandTotal * 1000;

  return (
    <VStack align="stretch" spacing={6}>

      {/* ── Hero + equivalencies ─────────────────────────────────────────── */}
      <Flex gap={4} flexWrap="wrap">
        <Box
          flex={2} minW="260px" bg={P.brand} borderRadius="2xl"
          px={8} py={6} textAlign="center"
        >
          <Text fontSize="xs" color={P.light} textTransform="uppercase"
            letterSpacing="widest" mb={1}>
            Émissions GES totales — Bilan annuel
          </Text>
          <HStack justify="center" align="baseline" spacing={3} mb={1}>
            <Text fontSize="5xl" fontWeight="extrabold" color="white" lineHeight={1}>
              {fmt(grandTotal, 4)}
            </Text>
            <Text fontSize="2xl" color={P.light}>tCO₂e</Text>
          </HStack>
          <Text fontSize="sm" color={P.light}>
            {fmtLarge(kgTotal)} kgCO₂e · {billCount} factures analysées
          </Text>
        </Box>

        <Flex flex={3} minW="280px" gap={3} flexWrap="wrap">
          {EQUIVS.map(eq => (
            <Box
              key={eq.label} flex={1} minW="110px"
              bg={P.white} borderRadius="xl" p={4} textAlign="center"
              borderWidth="1px" borderColor={P.soft}
            >
              <Text fontSize="2xl" mb={1}>{eq.icon}</Text>
              <Text fontSize="lg" fontWeight="bold" color={P.dark}>
                {(grandTotal * eq.factor).toLocaleString("fr-CA", { maximumFractionDigits: 0 })}
              </Text>
              <Text fontSize="xs" color={P.muted} lineHeight={1.3}>{eq.label}</Text>
            </Box>
          ))}
        </Flex>
      </Flex>

      {/* ── Donut + breakdown bars ───────────────────────────────────────── */}
      <Box bg={P.white} borderRadius="2xl" borderWidth="1px" borderColor={P.soft} p={6}>
        <Text fontSize="sm" fontWeight="semibold" color={P.brand} mb={5}>
          Répartition des émissions par source
        </Text>
        <Flex gap={8} align="center" flexWrap="wrap">
          <DonutChart categories={categories} grandTotal={grandTotal} />

          <VStack align="stretch" flex={1} minW="200px" spacing={4}>
            {categories.map(cat => {
              const pct = share(cat.ges_total, grandTotal);
              return (
                <Box key={cat.key}>
                  <HStack justify="space-between" mb={1}>
                    <HStack spacing={2}>
                      <Box w={3} h={3} borderRadius="sm" flexShrink={0}
                        bg={SRC_COLOR[cat.key] ?? P.accent} />
                      <Text fontSize="sm" color={P.dark}>
                        {cat.icon} {cat.label}
                      </Text>
                    </HStack>
                    <HStack spacing={2}>
                      <Text fontSize="sm" fontWeight="bold" color={P.dark}>
                        {fmt(cat.ges_total, 4)} t
                      </Text>
                      <Box bg={P.bg} px={2} py="1px" borderRadius="full">
                        <Text fontSize="xs" color={P.muted}>{pct.toFixed(1)}%</Text>
                      </Box>
                    </HStack>
                  </HStack>
                  <Box w="100%" bg={P.soft} borderRadius="full" h="6px" overflow="hidden">
                    <Box
                      h="100%" bg={SRC_COLOR[cat.key] ?? P.accent} borderRadius="full"
                      w={`${pct}%`} transition="width 1.2s ease"
                    />
                  </Box>
                </Box>
              );
            })}
            <Box mt={2}>
              <Text fontSize="xs" color={P.muted} mb={1}>Barre empilée globale</Text>
              <StackedBar categories={categories} grandTotal={grandTotal} h={12} />
              <HStack mt={2} flexWrap="wrap" spacing={3}>
                {categories.filter(c => c.ges_total > 0).map(cat => (
                  <HStack key={cat.key} spacing={1}>
                    <Box w={2} h={2} borderRadius="sm" bg={SRC_COLOR[cat.key] ?? P.accent} />
                    <Text fontSize="xs" color={P.muted}>{cat.icon} {cat.label}</Text>
                  </HStack>
                ))}
              </HStack>
            </Box>
          </VStack>
        </Flex>
      </Box>

      {/* ── Scope 1 / 2 / 3 quick cards ─────────────────────────────────── */}
      <Flex gap={4} flexWrap="wrap">
        {([1, 2, 3] as const).map(s => {
          const cats = categories.filter(c => (SCOPE_INFO[c.key]?.scope ?? 1) === s);
          const total = cats.reduce((acc, c) => acc + c.ges_total, 0);
          const SCOPE_STYLE: Record<number, { border: string; bg: string; color: string; desc: string }> = {
            1: { border: "#FC8181", bg: "#FFF5F5", color: "#C53030", desc: "Émissions directes" },
            2: { border: "#63B3ED", bg: "#EBF8FF", color: "#2B6CB0", desc: "Électricité achetée" },
            3: { border: "#B794F4", bg: "#FAF5FF", color: "#6B46C1", desc: "Autres indirects" },
          };
          const ss = SCOPE_STYLE[s];
          return (
            <Box
              key={s} flex={1} minW="160px" bg={ss.bg}
              borderRadius="xl" borderWidth="2px" borderColor={`${ss.border}80`} p={4}
            >
              <HStack justify="space-between" mb={2}>
                <ScopeBadge scope={s} />
                <Text fontSize="xs" color={P.muted}>{ss.desc}</Text>
              </HStack>
              <Text fontSize="3xl" fontWeight="bold" color={P.dark}>{fmt(total, 4)}</Text>
              <Text fontSize="xs" color={P.muted} mb={3}>
                tCO₂e · {share(total, grandTotal).toFixed(1)}%
              </Text>
              {cats.length > 0 && (
                <VStack align="stretch" spacing={0} pt={3}
                  borderTopWidth="1px" borderColor={`${ss.border}40`}>
                  {cats.map(c => (
                    <HStack key={c.key} justify="space-between">
                      <Text fontSize="xs" color={P.muted}>{c.icon} {c.label}</Text>
                      <Text fontSize="xs" fontWeight="semibold" color={ss.color}>
                        {fmt(c.ges_total, 4)} t
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              )}
            </Box>
          );
        })}
      </Flex>

    </VStack>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Analyse détaillée
// ══════════════════════════════════════════════════════════════════════════════
function DetailTab({ categories }: { categories: CategoryProgress[] }) {
  const [openKey, setOpenKey] = useState<string | null>(categories[0]?.key ?? null);
  const grandTotal = categories.reduce((s, c) => s + c.ges_total, 0);

  return (
    <VStack align="stretch" spacing={4}>

      {categories.map(cat => {
        const isOpen    = openKey === cat.key;
        const done      = cat.bills.filter(b => b.status === "done");
        const errors    = cat.bills.filter(b => b.status === "error");
        const avg       = done.length ? done.reduce((s, b) => s + (b.tco2e ?? 0), 0) / done.length : 0;
        const maxBill   = done.reduce((a, b) => (b.tco2e ?? 0) > (a?.tco2e ?? 0) ? b : a, done[0]);
        const maxVal    = maxBill?.tco2e ?? 1;

        return (
          <Box
            key={cat.key} bg={P.white} borderRadius="2xl"
            borderWidth="1px" borderColor={isOpen ? P.accent : P.soft}
            overflow="hidden" transition="all 0.2s"
          >
            {/* ── Accordion header ─────────────────────────────────────── */}
            <Flex
              px={5} py={4} cursor="pointer" align="center"
              justify="space-between"
              bg={isOpen ? (SRC_BG[cat.key] ?? P.bg) : P.white}
              onClick={() => setOpenKey(isOpen ? null : cat.key)}
              _hover={{ bg: SRC_BG[cat.key] ?? P.bg }}
              transition="background 0.2s"
            >
              <HStack spacing={4}>
                <Text fontSize="2xl">{cat.icon}</Text>
                <Box>
                  <HStack spacing={2}>
                    <Text fontWeight="bold" color={P.brand}>{cat.label}</Text>
                    <ScopeBadge scope={SCOPE_INFO[cat.key]?.scope ?? 1} />
                  </HStack>
                  <Text fontSize="xs" color={P.muted}>
                    {done.length} factures traitées
                    {errors.length > 0 && ` · ${errors.length} erreur(s)`}
                    {done.length > 0 && ` · Moy. ${fmt(avg, 6)} tCO₂e/facture`}
                  </Text>
                </Box>
              </HStack>
              <HStack spacing={4}>
                <Box textAlign="right">
                  <Text fontWeight="bold" fontSize="lg"
                    color={SRC_COLOR[cat.key] ?? P.accent}>
                    {fmt(cat.ges_total, 4)} tCO₂e
                  </Text>
                  <Text fontSize="xs" color={P.muted}>
                    {share(cat.ges_total, grandTotal).toFixed(1)}% du total
                  </Text>
                </Box>
                <Text color={P.muted} fontSize="sm">{isOpen ? "▲" : "▼"}</Text>
              </HStack>
            </Flex>

            {/* ── Expanded content ─────────────────────────────────────── */}
            {isOpen && (
              <Box>
                {/* Mini bar chart */}
                {done.length > 0 && (
                  <Box px={5} py={4} borderTopWidth="1px" borderColor={P.soft}>
                    <Text fontSize="xs" color={P.muted} fontWeight="semibold"
                      textTransform="uppercase" letterSpacing="wide" mb={3}>
                      Répartition par facture
                    </Text>
                    <VStack align="stretch" spacing={2}>
                      {done.map((b, i) => {
                        const barW = maxVal > 0 ? ((b.tco2e ?? 0) / maxVal) * 100 : 0;
                        return (
                          <HStack key={i} spacing={2}>
                            <Text fontSize="xs" color={P.muted} w="18px" textAlign="right">
                              {i + 1}
                            </Text>
                            <Text fontSize="xs" color={P.dark} w="180px" noOfLines={1}
                              title={b.name} flexShrink={0}>
                              {b.name}
                            </Text>
                            <Box flex={1} bg={P.soft} borderRadius="full" h="8px" overflow="hidden">
                              <Box
                                h="100%" borderRadius="full"
                                bg={SRC_COLOR[cat.key] ?? P.accent}
                                w={`${barW}%`} transition="width 0.8s ease"
                              />
                            </Box>
                            <Text fontSize="xs" fontWeight="semibold" color={P.dark}
                              w="100px" textAlign="right" flexShrink={0}>
                              {fmt(b.tco2e, 6)} t
                            </Text>
                            <Text fontSize="xs" color={P.muted} w="42px" textAlign="right" flexShrink={0}>
                              {cat.ges_total > 0
                                ? `${share(b.tco2e ?? 0, cat.ges_total).toFixed(1)}%`
                                : "—"}
                            </Text>
                          </HStack>
                        );
                      })}
                    </VStack>
                  </Box>
                )}

                {/* Stats row */}
                {done.length > 1 && (
                  <Flex px={5} py={3} gap={4} flexWrap="wrap"
                    borderTopWidth="1px" borderColor={P.soft} bg={P.bg}>
                    {[
                      { label: "Total",      val: fmt(cat.ges_total, 6) + " t" },
                      { label: "Moyenne",    val: fmt(avg, 6) + " t" },
                      { label: "Maximum",    val: fmt(maxVal, 6) + " t" },
                      { label: "Min",        val: fmt(Math.min(...done.map(b => b.tco2e ?? 0)), 6) + " t" },
                      { label: "En kgCO₂e", val: fmt(cat.ges_total * 1000, 2) + " kg" },
                    ].map(s => (
                      <Box key={s.label} textAlign="center" minW="100px">
                        <Text fontSize="xs" color={P.muted}>{s.label}</Text>
                        <Text fontSize="sm" fontWeight="bold" color={P.dark}>{s.val}</Text>
                      </Box>
                    ))}
                  </Flex>
                )}

                {/* Full bill table */}
                <Box overflowX="auto" borderTopWidth="1px" borderColor={P.soft}>
                  <Table size="sm">
                    <Thead bg={P.bg}>
                      <Tr>
                        <Th color={P.muted} fontSize="xs">#</Th>
                        <Th color={P.muted} fontSize="xs">Fichier</Th>
                        <Th color={P.muted} fontSize="xs" isNumeric>tCO₂e</Th>
                        <Th color={P.muted} fontSize="xs" isNumeric>kgCO₂e</Th>
                        <Th color={P.muted} fontSize="xs">Part source</Th>
                        <Th color={P.muted} fontSize="xs">Statut</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {cat.bills.map((b, i) => (
                        <Tr key={i} _hover={{ bg: P.bg }}>
                          <Td color={P.muted} fontSize="xs">{i + 1}</Td>
                          <Td>
                            <Text fontSize="xs" color={P.dark} maxW="260px"
                              noOfLines={1} title={b.name}>
                              {b.name}
                            </Text>
                          </Td>
                          <Td isNumeric>
                            <Text fontSize="xs" fontWeight="semibold"
                              color={SRC_COLOR[cat.key] ?? P.accent}>
                              {b.tco2e != null ? fmt(b.tco2e, 6) : "—"}
                            </Text>
                          </Td>
                          <Td isNumeric>
                            <Text fontSize="xs" color={P.muted}>
                              {b.tco2e != null ? fmt(b.tco2e * 1000, 3) : "—"}
                            </Text>
                          </Td>
                          <Td>
                            {b.tco2e != null && cat.ges_total > 0 && (
                              <HStack spacing={1}>
                                <Box flex={1} bg={P.soft} borderRadius="full"
                                  h="4px" overflow="hidden" maxW="56px">
                                  <Box h="100%" bg={SRC_COLOR[cat.key] ?? P.accent}
                                    borderRadius="full"
                                    w={`${share(b.tco2e, cat.ges_total)}%`}
                                  />
                                </Box>
                                <Text fontSize="xs" color={P.muted}>
                                  {share(b.tco2e, cat.ges_total).toFixed(1)}%
                                </Text>
                              </HStack>
                            )}
                          </Td>
                          <Td>
                            <Text fontSize="xs">
                              {b.status === "done"       ? "✅"
                               : b.status === "error"    ? `❌ ${b.error ?? ""}`
                               : b.status === "processing" ? "⏳"
                               : "📄"}
                            </Text>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                    {done.length > 1 && (
                      <Tfoot bg={SRC_BG[cat.key] ?? "#EDF5ED"}>
                        <Tr>
                          <Td colSpan={2}>
                            <Text fontSize="xs" fontWeight="bold" color={P.brand}>
                              SOUS-TOTAL {cat.label.toUpperCase()} ({done.length})
                            </Text>
                          </Td>
                          <Td isNumeric>
                            <Text fontSize="xs" fontWeight="bold"
                              color={SRC_COLOR[cat.key] ?? P.accent}>
                              {fmt(cat.ges_total, 6)}
                            </Text>
                          </Td>
                          <Td isNumeric>
                            <Text fontSize="xs" fontWeight="bold" color={P.muted}>
                              {fmt(cat.ges_total * 1000, 3)}
                            </Text>
                          </Td>
                          <Td colSpan={2} />
                        </Tr>
                      </Tfoot>
                    )}
                  </Table>
                </Box>
              </Box>
            )}
          </Box>
        );
      })}

      {/* Grand total */}
      <Box bg={P.brand} borderRadius="2xl" px={6} py={5}>
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <VStack align="start" spacing={0}>
            <Text fontSize="xs" color={P.light} textTransform="uppercase" letterSpacing="wide">
              Grand total — toutes sources confondues
            </Text>
            <Text fontWeight="bold" color="white">
              {categories.reduce((s, c) => s + c.bills.filter(b => b.status === "done").length, 0)} factures
              · {categories.filter(c => c.ges_total > 0).length} source(s) actives
            </Text>
          </VStack>
          <VStack align="end" spacing={0}>
            <HStack align="baseline" spacing={2}>
              <Text fontSize="3xl" fontWeight="extrabold" color="white">
                {fmt(grandTotal, 4)}
              </Text>
              <Text fontSize="lg" color={P.light}>tCO₂e</Text>
            </HStack>
            <Text fontSize="sm" color={P.light}>{fmt(grandTotal * 1000, 2)} kgCO₂e</Text>
          </VStack>
        </Flex>
      </Box>

    </VStack>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Scopes GES
// ══════════════════════════════════════════════════════════════════════════════
function ScopesTab({
  categories, grandTotal,
}: { categories: CategoryProgress[]; grandTotal: number }) {
  const scopeTotals = useMemo(() => {
    const t: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (const cat of categories) {
      const s = SCOPE_INFO[cat.key]?.scope ?? 1;
      t[s] += cat.ges_total;
    }
    return t;
  }, [categories]);

  const SCOPE_CFG = {
    1: {
      icon: "🏭", title: "Scope 1 — Émissions directes",
      desc: "Combustion fixe, combustion mobile, émissions fugitives de réfrigérants",
      color: "#C53030", bg: "#FFF5F5", border: "#FC8181",
    },
    2: {
      icon: "⚡", title: "Scope 2 — Énergie indirecte",
      desc: "Électricité et chaleur achetées à des tiers",
      color: "#2B6CB0", bg: "#EBF8FF", border: "#63B3ED",
    },
    3: {
      icon: "🌐", title: "Scope 3 — Autres indirects",
      desc: "Chaîne de valeur, déplacements professionnels, déchets…",
      color: "#6B46C1", bg: "#FAF5FF", border: "#B794F4",
    },
  } as const;

  return (
    <VStack align="stretch" spacing={6}>

      {/* Scope cards */}
      <Flex gap={4} flexWrap="wrap">
        {([1, 2, 3] as const).map(s => {
          const cfg  = SCOPE_CFG[s];
          const val  = scopeTotals[s];
          const cats = categories.filter(c => (SCOPE_INFO[c.key]?.scope ?? 1) === s);
          return (
            <Box key={s} flex={1} minW="200px" bg={cfg.bg} borderRadius="2xl"
              borderWidth="2px" borderColor={`${cfg.border}80`} p={5}>
              <HStack mb={3} justify="space-between">
                <HStack spacing={2}>
                  <Text fontSize="xl">{cfg.icon}</Text>
                  <ScopeBadge scope={s} />
                </HStack>
                <Text fontSize="xs" color={P.muted}>{share(val, grandTotal).toFixed(1)}%</Text>
              </HStack>
              <Text fontSize="xs" fontWeight="semibold" color={cfg.color} mb={1}>
                {cfg.title}
              </Text>
              <Text fontSize="3xl" fontWeight="bold" color={P.dark}>{fmt(val, 4)}</Text>
              <Text fontSize="xs" color={P.muted} mb={1}>tCO₂e</Text>
              <Text fontSize="xs" color={P.muted} mb={4}>{cfg.desc}</Text>
              {/* Source list */}
              {cats.length > 0 && (
                <VStack align="stretch" spacing={1} pt={3}
                  borderTopWidth="1px" borderColor={`${cfg.border}40`}>
                  <Text fontSize="xs" color={P.muted} fontWeight="semibold" mb={1}>
                    Sources incluses :
                  </Text>
                  {cats.map(c => (
                    <HStack key={c.key} justify="space-between">
                      <Text fontSize="xs" color={P.dark}>{c.icon} {c.label}</Text>
                      <Text fontSize="xs" fontWeight="semibold" color={cfg.color}>
                        {fmt(c.ges_total, 4)} t
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              )}
            </Box>
          );
        })}
      </Flex>

      {/* Stacked scope bar */}
      <Box bg={P.white} borderRadius="2xl" borderWidth="1px" borderColor={P.soft} p={5}>
        <Text fontSize="sm" fontWeight="semibold" color={P.brand} mb={4}>
          Répartition Scope 1 / 2 / 3
        </Text>
        <Flex h="28px" borderRadius="xl" overflow="hidden" mb={4}>
          {([1, 2, 3] as const).map(s => {
            const val = scopeTotals[s];
            const cfg = SCOPE_CFG[s];
            return val > 0 ? (
              <Box
                key={s} w={`${share(val, grandTotal)}%`} bg={cfg.color}
                transition="width 1s ease"
                title={`Scope ${s}: ${fmt(val, 4)} tCO₂e`}
                display="flex" alignItems="center" justifyContent="center"
              >
                {share(val, grandTotal) > 8 && (
                  <Text fontSize="xs" color="white" fontWeight="bold">
                    S{s} {share(val, grandTotal).toFixed(0)}%
                  </Text>
                )}
              </Box>
            ) : null;
          })}
        </Flex>
        <HStack spacing={5} flexWrap="wrap">
          {([1, 2, 3] as const).map(s => (
            <HStack key={s} spacing={2}>
              <Box w={3} h={3} borderRadius="sm" bg={SCOPE_CFG[s].color} />
              <Text fontSize="xs" color={P.muted}>
                Scope {s} — {fmt(scopeTotals[s], 4)} tCO₂e
                ({share(scopeTotals[s], grandTotal).toFixed(1)}%)
              </Text>
            </HStack>
          ))}
        </HStack>
      </Box>

      {/* Classification table */}
      <Box bg={P.white} borderRadius="2xl" borderWidth="1px" borderColor={P.soft} overflow="hidden">
        <Box px={5} py={4} borderBottomWidth="1px" borderColor={P.soft}>
          <Text fontSize="sm" fontWeight="semibold" color={P.brand}>
            Classification des sources — Protocole GES (GHG Protocol)
          </Text>
        </Box>
        <Box overflowX="auto">
          <Table size="sm">
            <Thead bg={P.bg}>
              <Tr>
                <Th color={P.muted} fontSize="xs">Source</Th>
                <Th color={P.muted} fontSize="xs">Poste GES</Th>
                <Th color={P.muted} fontSize="xs">Catégorie</Th>
                <Th color={P.muted} fontSize="xs">Scope</Th>
                <Th color={P.muted} fontSize="xs" isNumeric>tCO₂e</Th>
                <Th color={P.muted} fontSize="xs" isNumeric>kgCO₂e</Th>
                <Th color={P.muted} fontSize="xs" isNumeric>% Total</Th>
              </Tr>
            </Thead>
            <Tbody>
              {categories.map(cat => {
                const info = SCOPE_INFO[cat.key] ?? { scope: 1 as const, poste: "—", category: "—" };
                return (
                  <Tr key={cat.key} _hover={{ bg: P.bg }}>
                    <Td>
                      <HStack spacing={2}>
                        <Box w={2} h={2} borderRadius="sm" flexShrink={0}
                          bg={SRC_COLOR[cat.key] ?? P.accent} />
                        <Text fontSize="xs" color={P.dark}>{cat.icon} {cat.label}</Text>
                      </HStack>
                    </Td>
                    <Td><Text fontSize="xs" color={P.muted}>{info.poste}</Text></Td>
                    <Td><Text fontSize="xs" color={P.muted}>{info.category}</Text></Td>
                    <Td><ScopeBadge scope={info.scope} /></Td>
                    <Td isNumeric>
                      <Text fontSize="xs" fontWeight="semibold"
                        color={SRC_COLOR[cat.key] ?? P.accent}>
                        {fmt(cat.ges_total, 6)}
                      </Text>
                    </Td>
                    <Td isNumeric>
                      <Text fontSize="xs" color={P.muted}>
                        {fmt(cat.ges_total * 1000, 3)}
                      </Text>
                    </Td>
                    <Td isNumeric>
                      <Text fontSize="xs" color={P.muted}>
                        {share(cat.ges_total, grandTotal).toFixed(2)}%
                      </Text>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
            <Tfoot bg="#EDF5ED">
              <Tr>
                <Td colSpan={4}>
                  <Text fontSize="xs" fontWeight="bold" color={P.brand}>GRAND TOTAL</Text>
                </Td>
                <Td isNumeric>
                  <Text fontSize="xs" fontWeight="bold" color={P.accent}>
                    {fmt(grandTotal, 6)}
                  </Text>
                </Td>
                <Td isNumeric>
                  <Text fontSize="xs" fontWeight="bold" color={P.muted}>
                    {fmt(grandTotal * 1000, 3)}
                  </Text>
                </Td>
                <Td isNumeric>
                  <Text fontSize="xs" fontWeight="bold" color={P.muted}>100%</Text>
                </Td>
              </Tr>
            </Tfoot>
          </Table>
        </Box>
      </Box>

      {/* Protocol note */}
      <Box bg="#EBF8FF" borderRadius="xl" px={5} py={4}
        borderLeftWidth={4} borderColor="#63B3ED">
        <Text fontSize="xs" fontWeight="bold" color="#2B6CB0" mb={2}>
          ℹ️ Protocole GES (GHG Protocol Corporate Standard)
        </Text>
        <Text fontSize="xs" color="#2C5282" lineHeight={1.6}>
          <strong>Scope 1</strong> — Émissions directes issues de sources appartenant à ou
          contrôlées par l'organisation (chaudières, véhicules, frigorigènes fugitifs).{" "}
          <strong>Scope 2</strong> — Émissions indirectes associées à la production
          d'électricité achetée et consommée.{" "}
          <strong>Scope 3</strong> — Toutes les autres émissions indirectes dans la
          chaîne de valeur (non incluses dans ce bilan automatisé).
        </Text>
      </Box>

    </VStack>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — Recommandations & Insights
// ══════════════════════════════════════════════════════════════════════════════
function InsightsTab({
  categories, grandTotal,
}: { categories: CategoryProgress[]; grandTotal: number }) {
  const billCount = categories.reduce(
    (s, c) => s + c.bills.filter(b => b.status === "done").length, 0
  );
  const sorted = [...categories].sort((a, b) => b.ges_total - a.ges_total);
  const top    = sorted[0];

  const insights = useMemo(() => {
    type Severity = "high" | "medium" | "low";
    const items: {
      icon: string; title: string; desc: string;
      severity: Severity; saving?: number;
    }[] = [];

    const elec = categories.find(c => c.key === "electricity");
    const fuel = categories.find(c => c.key === "fuel");
    const ng   = categories.find(c => c.key === "natural_gas");
    const ref  = categories.find(c => c.key === "refrigerant");

    if (elec && elec.ges_total > 0) {
      const pct = share(elec.ges_total, grandTotal);
      items.push({
        icon: "⚡",
        title: "Électricité — efficacité énergétique",
        desc: `L'électricité représente ${pct.toFixed(1)}% de vos émissions. `
          + `Au Québec, le facteur d'émission est très bas (~1,7 gCO₂e/kWh grâce à l'hydraulique). `
          + `Priorité : réduire la consommation (LED, variateurs de fréquence, isolation) plutôt que changer de fournisseur.`,
        severity: pct > 60 ? "high" : pct > 30 ? "medium" : "low",
        saving: elec.ges_total * 0.15,
      });
    }

    if (fuel && fuel.ges_total > 0) {
      const pct = share(fuel.ges_total, grandTotal);
      items.push({
        icon: "⛽",
        title: "Carburant — électrification progressive de la flotte",
        desc: `L'électrification de 50% de la flotte pourrait éliminer ~${fmt(fuel.ges_total * 0.5, 4)} tCO₂e/an. `
          + `Au Québec, les subventions provinciales et fédérales couvrent jusqu'à 13 000 $ par véhicule électrique léger. `
          + `Commencer par les véhicules les plus utilisés (km/an les plus élevés).`,
        severity: pct > 25 ? "high" : "medium",
        saving: fuel.ges_total * 0.5,
      });
    }

    if (ng && ng.ges_total > 0) {
      items.push({
        icon: "🔥",
        title: "Gaz naturel — transition pompe à chaleur",
        desc: `Remplacer les chaudières au gaz par des thermopompes électriques réduit ces émissions de 70–85%. `
          + `Avec le tarif Affaires d'Hydro-Québec, le coût d'opération est généralement inférieur malgré l'investissement initial. `
          + `Programme Chauffez vert de Transition énergétique Québec : subvention disponible.`,
        severity: "medium",
        saving: ng.ges_total * 0.75,
      });
    }

    if (ref && ref.ges_total > 0) {
      const pct = share(ref.ges_total, grandTotal);
      items.push({
        icon: "❄️",
        title: "Frigorigènes — réduction des émissions fugitives",
        desc: `Les frigorigènes peuvent avoir un PRG très élevé (ex. R-22 = 1 810, R-410A = 2 088). `
          + `Actions recommandées : (1) inspection et détection des fuites annuelle, (2) transition vers R-32 (PRG 675) `
          + `ou R-290 (propane, PRG 3) lors du remplacement des équipements.`,
        severity: pct > 5 ? "high" : "low",
        saving: ref.ges_total * 0.4,
      });
    }

    const totalSaving = items.reduce((s, i) => s + (i.saving ?? 0), 0);
    if (totalSaving > 0 && grandTotal > 0) {
      items.push({
        icon: "🎯",
        title: `Objectif -30% d'ici 2030 — faisabilité`,
        desc: `La cible de réduction de 30% correspond à ${fmt(grandTotal * 0.3, 4)} tCO₂e à éliminer. `
          + `En combinant toutes les mesures identifiées ci-dessus, une réduction estimée de `
          + `${fmt(totalSaving, 4)} tCO₂e (${share(totalSaving, grandTotal).toFixed(0)}%) est atteignable, `
          + `${totalSaving >= grandTotal * 0.3 ? "ce qui dépasse l'objectif." : "mais des mesures supplémentaires seront nécessaires."}`,
        severity: "low",
        saving: Math.min(totalSaving, grandTotal * 0.3),
      });
    }

    return items;
  }, [categories, grandTotal]);

  const SEV: Record<string, { bg: string; border: string; badge: string; badgeBg: string; label: string }> = {
    high:   { bg: "#FFF5F5", border: "#FC8181", badge: "white", badgeBg: "#E53E3E", label: "🔴 Prioritaire" },
    medium: { bg: "#FFFBEB", border: "#F6AD55", badge: "white", badgeBg: "#DD6B20", label: "🟡 Important"   },
    low:    { bg: "#F0FFF4", border: "#68D391", badge: "white", badgeBg: "#38A169", label: "🟢 Optimisation" },
  };

  return (
    <VStack align="stretch" spacing={5}>

      {/* KPI row */}
      <Flex gap={4} flexWrap="wrap">
        {[
          { icon: "🏆", val: `${top?.icon ?? ""} ${top?.label ?? "—"}`, label: "Principal émetteur" },
          { icon: "📉", val: `${fmt(grandTotal * 0.3, 4)} t`, label: "Objectif -30% (2030)" },
          { icon: "📋", val: `${billCount}`, label: "Factures analysées" },
          { icon: "📊", val: `${fmt(grandTotal / Math.max(billCount, 1), 4)} t`, label: "Moy. / facture" },
        ].map((kpi, i) => (
          <Box key={i} flex={1} minW="130px" bg={P.white} borderRadius="xl" p={4}
            borderWidth="1px" borderColor={P.soft} textAlign="center">
            <Text fontSize="xl" mb={1}>{kpi.icon}</Text>
            <Text fontSize="md" fontWeight="bold" color={P.dark} noOfLines={1}>{kpi.val}</Text>
            <Text fontSize="xs" color={P.muted}>{kpi.label}</Text>
          </Box>
        ))}
      </Flex>

      {/* Insights */}
      {insights.map((ins, i) => {
        const s = SEV[ins.severity];
        return (
          <Box key={i} bg={s.bg} borderRadius="2xl" borderWidth="1px"
            borderColor={s.border} px={5} py={4}>
            <HStack justify="space-between" mb={3} flexWrap="wrap" gap={2}>
              <HStack spacing={3}>
                <Text fontSize="xl">{ins.icon}</Text>
                <Text fontWeight="semibold" color={P.dark}>{ins.title}</Text>
              </HStack>
              <Box bg={s.badgeBg} color={s.badge} px={3} py="2px"
                borderRadius="full" fontSize="xs" fontWeight="bold">
                {s.label}
              </Box>
            </HStack>
            <Text fontSize="sm" color={P.muted} lineHeight={1.7}>{ins.desc}</Text>
            {ins.saving != null && (
              <Box mt={3} display="inline-block" bg="white" borderRadius="lg" px={3} py={2}>
                <Text fontSize="xs" color={P.accent} fontWeight="semibold">
                  💰 Économie potentielle : {fmt(ins.saving, 4)} tCO₂e / an
                  &nbsp;({share(ins.saving, grandTotal).toFixed(1)}% du total)
                </Text>
              </Box>
            )}
          </Box>
        );
      })}

      {/* Benchmark Québec */}
      <Box bg={P.white} borderRadius="2xl" borderWidth="1px" borderColor={P.soft} p={6}>
        <Text fontSize="sm" fontWeight="semibold" color={P.brand} mb={1}>
          📊 Référence — Secteur tertiaire Québec (estimation)
        </Text>
        <Text fontSize="xs" color={P.muted} mb={5}>
          Comparaison indicative basée sur des moyennes sectorielles. Les facteurs varient selon l'industrie.
        </Text>
        <VStack align="stretch" spacing={4}>
          {[
            { label: "Petite entreprise (< 50 emp.)",  val: 50,          highlight: false },
            { label: "Entreprise moyenne (50–250 emp.)", val: 250,        highlight: false },
            { label: "Votre bilan calculé",              val: grandTotal,  highlight: true  },
          ].map((row, i) => (
            <HStack key={i} spacing={3}>
              <Text
                fontSize="xs" w="210px" flexShrink={0}
                color={row.highlight ? P.brand : P.muted}
                fontWeight={row.highlight ? "bold" : "normal"}
              >
                {row.label}
              </Text>
              <Box flex={1} bg={P.soft} borderRadius="full"
                h={row.highlight ? "12px" : "8px"} overflow="hidden">
                <Box
                  h="100%" borderRadius="full"
                  bg={row.highlight ? P.accent : P.light}
                  w={`${Math.min((row.val / 300) * 100, 100)}%`}
                  transition="width 1.2s ease"
                />
              </Box>
              <Text
                fontSize="xs" w="72px" textAlign="right"
                fontWeight={row.highlight ? "bold" : "normal"}
                color={row.highlight ? P.accent : P.muted}
              >
                {row.highlight ? fmt(row.val, 4) : row.val.toFixed(0)} t
              </Text>
            </HStack>
          ))}
        </VStack>
      </Box>

    </VStack>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 5 — Exporter
// ══════════════════════════════════════════════════════════════════════════════
function ExportTab({
  categories, grandTotal,
}: { categories: CategoryProgress[]; grandTotal: number }) {
  const today = new Date().toISOString().slice(0, 10);

  const handleCSV = () => {
    const header = [
      "Catégorie", "Clé", "Scope", "Poste GES", "Catégorie GES",
      "Fichier", "tCO₂e", "kgCO₂e", "% source", "% total", "Statut",
    ].join(";");

    const rows: string[] = [header];
    for (const cat of categories) {
      for (const b of cat.bills) {
        const info = SCOPE_INFO[cat.key] ?? { scope: 1, poste: "—", category: "—" };
        rows.push([
          `"${cat.label}"`, cat.key,
          `Scope ${info.scope}`, info.poste, `"${info.category}"`,
          `"${b.name}"`,
          b.tco2e?.toFixed(8) ?? "",
          b.tco2e != null ? (b.tco2e * 1000).toFixed(5) : "",
          (cat.ges_total > 0 && b.tco2e != null
            ? share(b.tco2e, cat.ges_total).toFixed(4) : ""),
          (grandTotal > 0 && b.tco2e != null
            ? share(b.tco2e, grandTotal).toFixed(4) : ""),
          b.status,
        ].join(";"));
      }
      // Subtotal
      const info = SCOPE_INFO[cat.key] ?? { scope: 1, poste: "—", category: "—" };
      rows.push([
        `"SOUS-TOTAL ${cat.label}"`, cat.key,
        `Scope ${info.scope}`, info.poste, `"${info.category}"`,
        `"— SOUS-TOTAL —"`,
        cat.ges_total.toFixed(8),
        (cat.ges_total * 1000).toFixed(5),
        "100",
        share(cat.ges_total, grandTotal).toFixed(4),
        "subtotal",
      ].join(";"));
    }
    rows.push([
      `"GRAND TOTAL"`, "all", "—", "—", "—", `"— GRAND TOTAL —"`,
      grandTotal.toFixed(8), (grandTotal * 1000).toFixed(5), "—", "100", "total",
    ].join(";"));

    const blob = new Blob(["﻿" + rows.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href = url; a.download = `bilan-ges-${today}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleJSON = () => {
    const payload = {
      generated_at:         new Date().toISOString(),
      grand_total_tco2e:    grandTotal,
      grand_total_kgco2e:   grandTotal * 1000,
      categories: categories.map(cat => ({
        key:               cat.key,
        label:             cat.label,
        scope:             SCOPE_INFO[cat.key]?.scope ?? 1,
        poste:             SCOPE_INFO[cat.key]?.poste ?? "—",
        category_ges:      SCOPE_INFO[cat.key]?.category ?? "—",
        ges_total_tco2e:   cat.ges_total,
        ges_total_kgco2e:  cat.ges_total * 1000,
        share_pct:         share(cat.ges_total, grandTotal),
        bill_count:        cat.bills.filter(b => b.status === "done").length,
        bills: cat.bills.map(b => ({
          name:    b.name,
          status:  b.status,
          tco2e:   b.tco2e ?? null,
          kgco2e:  b.tco2e != null ? b.tco2e * 1000 : null,
          error:   b.error ?? null,
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href = url; a.download = `bilan-ges-${today}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const billCount = categories.reduce(
    (s, c) => s + c.bills.filter(b => b.status === "done").length, 0
  );

  return (
    <VStack align="stretch" spacing={6}>

      {/* Recap table */}
      <Box bg={P.white} borderRadius="2xl" borderWidth="1px" borderColor={P.soft} overflow="hidden">
        <Box px={5} py={4} bg={P.bg} borderBottomWidth="1px" borderColor={P.soft}>
          <HStack justify="space-between">
            <Text fontSize="sm" fontWeight="semibold" color={P.brand}>
              Récapitulatif du bilan GES
            </Text>
            <Text fontSize="xs" color={P.muted}>
              Généré le {new Date().toLocaleDateString("fr-CA", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </Text>
          </HStack>
        </Box>
        <Box overflowX="auto">
          <Table size="sm">
            <Thead bg={P.bg}>
              <Tr>
                <Th color={P.muted} fontSize="xs">Source</Th>
                <Th color={P.muted} fontSize="xs">Scope</Th>
                <Th color={P.muted} fontSize="xs">Poste</Th>
                <Th color={P.muted} fontSize="xs" isNumeric>Factures</Th>
                <Th color={P.muted} fontSize="xs" isNumeric>tCO₂e</Th>
                <Th color={P.muted} fontSize="xs" isNumeric>kgCO₂e</Th>
                <Th color={P.muted} fontSize="xs" isNumeric>%</Th>
              </Tr>
            </Thead>
            <Tbody>
              {categories.map(cat => {
                const info = SCOPE_INFO[cat.key] ?? { scope: 1 as const, poste: "—", category: "—" };
                return (
                  <Tr key={cat.key} _hover={{ bg: P.bg }}>
                    <Td>
                      <HStack spacing={2}>
                        <Box w={2} h={2} borderRadius="sm" flexShrink={0}
                          bg={SRC_COLOR[cat.key] ?? P.accent} />
                        <Text fontSize="xs" color={P.dark}>{cat.icon} {cat.label}</Text>
                      </HStack>
                    </Td>
                    <Td><ScopeBadge scope={info.scope} /></Td>
                    <Td><Text fontSize="xs" color={P.muted}>{info.poste}</Text></Td>
                    <Td isNumeric>
                      <Text fontSize="xs" color={P.muted}>
                        {cat.bills.filter(b => b.status === "done").length}
                      </Text>
                    </Td>
                    <Td isNumeric>
                      <Text fontSize="xs" fontWeight="semibold"
                        color={SRC_COLOR[cat.key] ?? P.accent}>
                        {fmt(cat.ges_total, 6)}
                      </Text>
                    </Td>
                    <Td isNumeric>
                      <Text fontSize="xs" color={P.muted}>
                        {fmt(cat.ges_total * 1000, 3)}
                      </Text>
                    </Td>
                    <Td isNumeric>
                      <Text fontSize="xs" color={P.muted}>
                        {share(cat.ges_total, grandTotal).toFixed(2)}%
                      </Text>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
            <Tfoot bg="#EDF5ED">
              <Tr>
                <Td colSpan={3}>
                  <Text fontSize="xs" fontWeight="bold" color={P.brand}>
                    GRAND TOTAL ({billCount} factures)
                  </Text>
                </Td>
                <Td isNumeric>
                  <Text fontSize="xs" fontWeight="bold" color={P.muted}>{billCount}</Text>
                </Td>
                <Td isNumeric>
                  <Text fontSize="xs" fontWeight="bold" color={P.accent}>
                    {fmt(grandTotal, 6)}
                  </Text>
                </Td>
                <Td isNumeric>
                  <Text fontSize="xs" fontWeight="bold" color={P.muted}>
                    {fmt(grandTotal * 1000, 3)}
                  </Text>
                </Td>
                <Td isNumeric>
                  <Text fontSize="xs" fontWeight="bold" color={P.muted}>100%</Text>
                </Td>
              </Tr>
            </Tfoot>
          </Table>
        </Box>
      </Box>

      {/* Export buttons */}
      <Flex gap={4} flexWrap="wrap">
        <Button
          flex={1} minW="160px" size="lg" borderRadius="xl"
          bg={P.brand} color="white" _hover={{ bg: P.accent }}
          onClick={handleCSV}
        >
          📥 Exporter CSV
        </Button>
        <Button
          flex={1} minW="160px" size="lg" borderRadius="xl"
          variant="outline" borderColor={P.light} color={P.brand}
          _hover={{ bg: P.soft }} onClick={handleJSON}
        >
          📋 Exporter JSON
        </Button>
        <Button
          flex={1} minW="160px" size="lg" borderRadius="xl"
          variant="outline" borderColor={P.light} color={P.muted}
          _hover={{ bg: P.soft }} onClick={() => window.print()}
        >
          🖨️ Imprimer / PDF
        </Button>
      </Flex>

      {/* Info note */}
      <Box bg="#F0FFF4" borderRadius="xl" px={5} py={4}
        borderLeftWidth={4} borderColor={P.accent}>
        <Text fontSize="xs" fontWeight="bold" color={P.brand} mb={1}>
          💡 Conservation des données
        </Text>
        <Text fontSize="xs" color={P.muted} lineHeight={1.6}>
          Ces résultats sont calculés en temps réel et non persistés automatiquement.
          Le CSV (séparateur «&nbsp;;&nbsp;») s'ouvre directement dans Excel ou LibreOffice.
          Le JSON est structuré pour intégration dans vos systèmes internes.
          Pour un PDF propre, utilisez «&nbsp;Imprimer&nbsp;» → «&nbsp;Enregistrer en PDF&nbsp;» via votre navigateur.
        </Text>
      </Box>

    </VStack>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN — EmissionsDashboard
// ══════════════════════════════════════════════════════════════════════════════
interface EmissionsDashboardProps {
  categories:   CategoryProgress[];
  onReset:      () => void;
  userId?:      string | null;
  companyId?:   string | null;
  companyName?: string | null;
}

export default function EmissionsDashboard({
  categories, onReset, userId, companyId, companyName,
}: EmissionsDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const grandTotal = categories.reduce((s, c) => s + c.ges_total, 0);

  return (
    <VStack align="stretch" spacing={0} w="100%">

      {/* ── Sticky tab bar ───────────────────────────────────────────────── */}
      <Box
        bg={P.white} borderRadius="2xl" borderWidth="1px" borderColor={P.soft}
        p={2} mb={6} position="sticky" top={0} zIndex={10}
        boxShadow="0 4px 16px rgba(52,78,65,0.10)"
      >
        <Flex align="center" gap={1} flexWrap="wrap">
          {TABS.map(tab => (
            <Button
              key={tab.id}
              size="sm" borderRadius="xl" fontSize="xs"
              bg={activeTab === tab.id ? P.brand : "transparent"}
              color={activeTab === tab.id ? "white" : P.muted}
              _hover={{
                bg: activeTab === tab.id ? P.accent : P.soft,
                color: activeTab === tab.id ? "white" : P.dark,
              }}
              onClick={() => setActiveTab(tab.id)}
              px={4}
            >
              {tab.icon}&nbsp;{tab.label}
            </Button>
          ))}
          <Box flex={1} />
          <Button
            size="sm" borderRadius="xl" variant="outline"
            borderColor={P.light} color={P.muted}
            _hover={{ bg: P.soft }} onClick={onReset} fontSize="xs"
          >
            🔄 Nouvelle analyse
          </Button>
        </Flex>
      </Box>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <OverviewTab categories={categories} grandTotal={grandTotal} />
      )}
      {activeTab === "detail" && (
        <DetailTab categories={categories} />
      )}
      {activeTab === "scopes" && (
        <ScopesTab categories={categories} grandTotal={grandTotal} />
      )}
      {activeTab === "insights" && (
        <InsightsTab categories={categories} grandTotal={grandTotal} />
      )}
      {activeTab === "copilot" && (
        <CopilotTab
          categories={categories}
          grandTotal={grandTotal}
          userId={userId}
          companyId={companyId}
          companyName={companyName}
        />
      )}
      {activeTab === "export" && (
        <ExportTab categories={categories} grandTotal={grandTotal} />
      )}

    </VStack>
  );
}

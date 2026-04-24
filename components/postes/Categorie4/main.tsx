'use client';

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  HStack,
  Heading,
  Spinner,
  Text,
  Stack,
  useColorModeValue,
} from "@chakra-ui/react";
import { supabase } from "../../../lib/supabaseClient";

/* ===================== IMPORT SOURCE FORMS ===================== */
import Source4_1A2Form, { Source4_1A2Row } from "./Source4_1A2Form";
import Source4_1B1Form, { Source4_1B1Row } from "./Source4_1B1Form";
import Source4_1C1Form, { Source4_1C1Row } from "./Source4_1C1Form";
import Source4_1D1Form, { Source4_1D1Row } from "./Source4_1D1Form";
import Source4_1E1Form, { Source4_1E1Row } from "./Source4_1E1Form";
import Source4_1E2Form, { Source4_1E2Row } from "./Source4_1E2Form";
import Source4_3A1Form, { Source4_3A1Row } from "./Source4_3A1Form";

/* ===================== UI TOKENS ===================== */
const COL = {
  bg: "#f3f5f2",
  greenBar: "#1f3f33",
  border: "rgba(0,0,0,0.08)",
};

const POSTE_LABEL_FALLBACK = "Catégorie 4 - Émissions indirectes hors énergie et transport";

/* ===================== TYPES ===================== */
type SubKey = "p41" | "p43";

type Props = {
  activeSubKey: SubKey | string;
  bilanId?: string;
  onNextSource?: () => void;
  onPrevSource?: () => void;
  onGesChange?: (tco2e: number) => void;
};

export const SUBKEY_TO_SOURCE_CODES: Record<SubKey, string[]> = {
  p41: ["4.1A2", "4.1B1", "4.1C1", "4.1D1", "4.1E1", "4.1E2"],
  p43: ["4.3A1"],
};

export const LABEL_BY_SUBKEY: Record<SubKey, string> = {
  p41: "4.1 – Technologies numériques et consommables",
  p43: "4.3 – Traitement des eaux usées",
};

/* ===================== HELPERS ===================== */
const norm = (s: any) => String(s ?? "").trim().toUpperCase().replace(/\s+/g, "");

const matchesAllowed = (code: string, allowed: string[]) => {
  const c = norm(code);
  return allowed.some((a) => norm(a) === c);
};

/* ===================== COMPONENT ===================== */
export default function Categorie4Main({ activeSubKey, bilanId, onNextSource, onPrevSource, onGesChange }: Props) {
  const pageBg = useColorModeValue(COL.bg, "#222e32");
  const subKey = (activeSubKey as SubKey) || "p41";
  const title = LABEL_BY_SUBKEY[subKey] ?? POSTE_LABEL_FALLBACK;

  /* ---- state ---- */
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [posteId, setPosteId] = useState<string | null>(null);
  const [posteLabel, setPosteLabel] = useState<string>(POSTE_LABEL_FALLBACK);
  const [enabledSources, setEnabledSources] = useState<any[]>([]);
  const [sourceVisibility, setSourceVisibility] = useState<Record<string, boolean>>({});

  /* ---- form rows ---- */
  const [rows4_1A2, setRows4_1A2] = useState<Source4_1A2Row[]>([]);
  const [ges4_1A2, setGes4_1A2] = useState<any[]>([]);

  const [rows4_1B1, setRows4_1B1] = useState<Source4_1B1Row[]>([]);
  const [ges4_1B1, setGes4_1B1] = useState<any[]>([]);

  const [rows4_1C1, setRows4_1C1] = useState<Source4_1C1Row[]>([]);
  const [ges4_1C1, setGes4_1C1] = useState<any[]>([]);

  const [rows4_1D1, setRows4_1D1] = useState<Source4_1D1Row[]>([]);
  const [ges4_1D1, setGes4_1D1] = useState<any[]>([]);

  const [rows4_1E1, setRows4_1E1] = useState<Source4_1E1Row[]>([]);
  const [ges4_1E1, setGes4_1E1] = useState<any[]>([]);

  const [rows4_1E2, setRows4_1E2] = useState<Source4_1E2Row[]>([]);
  const [ges4_1E2, setGes4_1E2] = useState<any[]>([]);

  const [rows4_3A1, setRows4_3A1] = useState<Source4_3A1Row[]>([]);
  const [ges4_3A1, setGes4_3A1] = useState<any[]>([]);

  /* ===================== LIVE TOTAL ===================== */
  const totalTco2e = useMemo(() => {
    const allGes = [...ges4_1A2, ...ges4_1B1, ...ges4_1C1, ...ges4_1D1, ...ges4_1E1, ...ges4_1E2, ...ges4_3A1];
    return allGes.reduce((sum, r) => sum + (parseFloat(String(r?.total_ges_tco2e ?? 0)) || 0), 0);
  }, [ges4_1A2, ges4_1B1, ges4_1C1, ges4_1D1, ges4_1E1, ges4_1E2, ges4_3A1]);

  useEffect(() => { onGesChange?.(totalTco2e); }, [totalTco2e, onGesChange]);

  /* ===================== LOAD USER + POSTE CONFIG ===================== */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setUserId(null); setLoading(false); return; }
      setUserId(user.id);

      const res = await fetch(`/api/source-visibility?user_id=${user.id}`);
      const data = await res.json();

      /* Find poste 4 by num */
      let p4Id: string | null = null;
      if (data?.postes && Array.isArray(data.postes)) {
        const p4 = data.postes.find((p: any) => Number(p?.num) === 4);
        p4Id = p4?.id ?? null;
      }

      /* Fallback: scan posteLabels for "catégorie 4" */
      if (!p4Id && data?.posteLabels) {
        for (const [id, label] of Object.entries(data.posteLabels as Record<string, unknown>)) {
          const s = typeof label === "string" ? label.toLowerCase() : "";
          if (s.includes("catégorie 4") || s.includes("categorie 4") || s.includes("poste 4")) {
            p4Id = id; break;
          }
        }
      }

      /* Fallback 2: scan sources map — find poste whose sources include any "4." code */
      if (!p4Id && data?.sources) {
        for (const [id, srcs] of Object.entries(data.sources as Record<string, any[]>)) {
          if (srcs.some((s: any) => String(s?.source_code ?? "").startsWith("4."))) {
            p4Id = id; break;
          }
        }
      }

      setPosteId(p4Id);
      if (p4Id) {
        setPosteLabel(data.posteLabels?.[p4Id] || POSTE_LABEL_FALLBACK);
        setEnabledSources(data.sources?.[p4Id] || []);
        setSourceVisibility(data.sourceVisibility?.[p4Id] || {});
      } else {
        setPosteLabel(POSTE_LABEL_FALLBACK);
        setEnabledSources([]);
        setSourceVisibility({});
      }
      setLoading(false);
    })();
  }, []);

  /* ===================== FILTER SOURCES BY PILL ===================== */
  const filteredSources = useMemo(() => {
    const allowed = SUBKEY_TO_SOURCE_CODES[subKey as SubKey] ?? [];
    if (allowed.length === 0) return [];
    return (enabledSources || []).filter((s: any) =>
      matchesAllowed(String(s?.source_code ?? ""), allowed)
    );
  }, [enabledSources, subKey]);

  const availableCodes = useMemo(() =>
    (enabledSources || []).map((s: any) => String(s?.source_code ?? "")).filter(Boolean),
    [enabledSources]
  );

  /* ===================== RENDER SOURCE ===================== */
  const renderSource = (source: any) => {
    const code: string = String(source?.source_code ?? "");
    const posteSourceId: string | undefined = source?.id;
    if (!code || !userId || !posteSourceId) return null;

    if (sourceVisibility?.[code]) {
      return (
        <Text key={posteSourceId} color="red.600" textAlign="center" fontWeight="bold" fontSize="lg" mt={6}>
          La source <b>{source?.label ?? code}</b> est masquée pour votre compte.
        </Text>
      );
    }

    const c = norm(code);

    if (c === "4.1A2") return (
      <Box key={posteSourceId} mt={6}>
        <Source4_1A2Form rows={rows4_1A2} setRows={setRows4_1A2} posteSourceId={posteSourceId} userId={userId} gesResults={ges4_1A2} setGesResults={setGes4_1A2}
        bilanId={bilanId} />
      </Box>
    );

    if (c === "4.1B1") return (
      <Box key={posteSourceId} mt={6}>
        <Source4_1B1Form rows={rows4_1B1} setRows={setRows4_1B1} posteSourceId={posteSourceId} userId={userId} gesResults={ges4_1B1} setGesResults={setGes4_1B1}
        bilanId={bilanId} />
      </Box>
    );

    if (c === "4.1C1") return (
      <Box key={posteSourceId} mt={6}>
        <Source4_1C1Form rows={rows4_1C1} setRows={setRows4_1C1} posteSourceId={posteSourceId} userId={userId} gesResults={ges4_1C1} setGesResults={setGes4_1C1}
        bilanId={bilanId} />
      </Box>
    );

    if (c === "4.1D1") return (
      <Box key={posteSourceId} mt={6}>
        <Source4_1D1Form rows={rows4_1D1} setRows={setRows4_1D1} posteSourceId={posteSourceId} userId={userId} gesResults={ges4_1D1} setGesResults={setGes4_1D1}
        bilanId={bilanId} />
      </Box>
    );

    if (c === "4.1E1") return (
      <Box key={posteSourceId} mt={6}>
        <Source4_1E1Form rows={rows4_1E1} setRows={setRows4_1E1} posteSourceId={posteSourceId} userId={userId} gesResults={ges4_1E1} setGesResults={setGes4_1E1}
        bilanId={bilanId} />
      </Box>
    );

    if (c === "4.1E2") return (
      <Box key={posteSourceId} mt={6}>
        <Source4_1E2Form rows={rows4_1E2} setRows={setRows4_1E2} posteSourceId={posteSourceId} userId={userId} gesResults={ges4_1E2} setGesResults={setGes4_1E2}
        bilanId={bilanId} />
      </Box>
    );

    if (c === "4.3A1") return (
      <Box key={posteSourceId} mt={6}>
        <Source4_3A1Form rows={rows4_3A1} setRows={setRows4_3A1} posteSourceId={posteSourceId} userId={userId} gesResults={ges4_3A1} setGesResults={setGes4_3A1}
        bilanId={bilanId} />
      </Box>
    );

    /* Placeholder for forms not yet built */
    return (
      <Box key={posteSourceId} mt={6} bg="white" p={6} rounded="lg" border="1px solid" borderColor="#E1E7E3">
        <Text fontWeight="bold" mb={2} color={COL.greenBar}>Source {code}</Text>
        <Text color="gray.600">Formulaire à venir pour <b>{code}</b>.</Text>
      </Box>
    );
  };

  /* ===================== PAGE RENDER ===================== */
  const allowedForThisPill = SUBKEY_TO_SOURCE_CODES[subKey as SubKey] ?? [];

  return (
    <Box bg={pageBg} minH="100vh" px={{ base: 4, md: 8 }} py={{ base: 6, md: 10 }}>
      <Stack maxW="1200px" mx="auto" spacing={6}>
        <Heading as="h1" size="lg" textAlign="center" color={COL.greenBar}>{posteLabel}</Heading>
        <Heading as="h2" size="md" textAlign="center" color={COL.greenBar} fontWeight="semibold">{title}</Heading>

        {loading ? (
          <Box display="flex" alignItems="center" justifyContent="center" minH="40vh">
            <Spinner color={COL.greenBar} size="xl" />
          </Box>
        ) : !userId ? (
          <Text color="red.600" textAlign="center" fontWeight="bold" fontSize="lg" mt={6}>
            Veuillez vous connecter.
          </Text>
        ) : allowedForThisPill.length === 0 ? (
          <Text color="red.600" textAlign="center" fontWeight="bold" fontSize="lg" mt={6}>
            Aucun source_code défini pour cette sous-catégorie (<b>{String(subKey)}</b>).
          </Text>
        ) : filteredSources.length === 0 ? (
          <Box>
            <Text color="orange.600" textAlign="center" fontWeight="bold" fontSize="lg" mt={6}>
              Aucun mode de saisie n&apos;est activé pour cette sous-catégorie.
            </Text>
            <Text mt={4} textAlign="center" color="gray.600">
              Attendu : <b>{allowedForThisPill.join(" · ")}</b>
            </Text>
            <Text mt={2} textAlign="center" color="gray.600">
              Sources disponibles sur Poste 4 : <b>{availableCodes.length ? availableCodes.join(" · ") : "—"}</b>
            </Text>
          </Box>
        ) : (
          filteredSources.map(renderSource)
        )}

        {!loading && userId && (
          <HStack justify="space-between" mt={6} spacing={4}>
            <Button
              variant="outline"
              borderColor={COL.greenBar}
              color={COL.greenBar}
              _hover={{ bg: "#e8f0ea" }}
              size="md"
              px={6}
              isDisabled={!onPrevSource}
              onClick={onPrevSource}
            >
              ← Source précédente
            </Button>
            <HStack spacing={4}>
              <Button
                variant="outline"
                borderColor={COL.greenBar}
                color={COL.greenBar}
                _hover={{ bg: "#e8f0ea" }}
                size="md"
                px={6}
                isDisabled
              >
                Valider la source
              </Button>
              <Button
                bg={COL.greenBar}
                color="white"
                _hover={{ bg: "#2d5c4a" }}
                size="md"
                px={6}
                isDisabled={!onNextSource}
                onClick={onNextSource}
              >
                Prochaine Source →
              </Button>
            </HStack>
          </HStack>
        )}
      </Stack>
    </Box>
  );
}

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
import Source5_1A1Form, { Source5_1A1Row } from "./Source5_1A1Form";
import Source5_1B1Form, { Source5_1B1Row } from "./Source5_1B1Form";
import Source5_2A1Form, { Source5_2A1Row } from "./Source5_2A1Form";
import Source5_2B1Form, { Source5_2B1Row } from "./Source5_2B1Form";

/* ===================== UI TOKENS ===================== */
const COL = {
  bg: "#f3f5f2",
  greenBar: "#1f3f33",
  border: "rgba(0,0,0,0.08)",
};

const POSTE_LABEL_FALLBACK = "Catégorie 5 - Émissions indirectes liées à l'utilisation des produits vendus";

/* ===================== TYPES ===================== */
type SubKey = "p51" | "p52";

type Props = {
  activeSubKey: SubKey | string;
  bilanId?: string;
  onNextSource?: () => void;
  onPrevSource?: () => void;
  onGesChange?: (tco2e: number) => void;
};

export const SUBKEY_TO_SOURCE_CODES: Record<SubKey, string[]> = {
  p51: ["5.1A1", "5.1B1"],
  p52: ["5.2A1", "5.2B1"],
};

export const LABEL_BY_SUBKEY: Record<SubKey, string> = {
  p51: "5.1 – Utilisation directe des produits vendus",
  p52: "5.2 – Fin de vie des produits vendus",
};

/* ===================== HELPERS ===================== */
const norm = (s: any) => String(s ?? "").trim().toUpperCase().replace(/\s+/g, "");

const matchesAllowed = (code: string, allowed: string[]) => {
  const c = norm(code);
  return allowed.some((a) => norm(a) === c);
};

/* ===================== COMPONENT ===================== */
export default function Categorie5Main({ activeSubKey, bilanId, onNextSource, onPrevSource, onGesChange }: Props) {
  const pageBg = useColorModeValue(COL.bg, "#222e32");
  const subKey = (activeSubKey as SubKey) || "p51";
  const title = LABEL_BY_SUBKEY[subKey] ?? POSTE_LABEL_FALLBACK;

  /* ---- state ---- */
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [posteId, setPosteId] = useState<string | null>(null);
  const [posteLabel, setPosteLabel] = useState<string>(POSTE_LABEL_FALLBACK);
  const [enabledSources, setEnabledSources] = useState<any[]>([]);
  const [sourceVisibility, setSourceVisibility] = useState<Record<string, boolean>>({});

  /* ---- form rows ---- */
  const [rows5_1A1, setRows5_1A1] = useState<Source5_1A1Row[]>([]);
  const [ges5_1A1, setGes5_1A1] = useState<any[]>([]);

  const [rows5_1B1, setRows5_1B1] = useState<Source5_1B1Row[]>([]);
  const [ges5_1B1, setGes5_1B1] = useState<any[]>([]);

  const [rows5_2A1, setRows5_2A1] = useState<Source5_2A1Row[]>([]);
  const [ges5_2A1, setGes5_2A1] = useState<any[]>([]);

  const [rows5_2B1, setRows5_2B1] = useState<Source5_2B1Row[]>([]);
  const [ges5_2B1, setGes5_2B1] = useState<any[]>([]);

  /* ===================== LIVE TOTAL ===================== */
  const totalTco2e = useMemo(() => {
    const allGes = [...ges5_1A1, ...ges5_1B1, ...ges5_2A1, ...ges5_2B1];
    return allGes.reduce((sum, r) => sum + (parseFloat(String(r?.total_ges_tco2e ?? 0)) || 0), 0);
  }, [ges5_1A1, ges5_1B1, ges5_2A1, ges5_2B1]);

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

      /* Find poste 5 by num */
      let p5Id: string | null = null;
      if (data?.postes && Array.isArray(data.postes)) {
        const p5 = data.postes.find((p: any) => Number(p?.num) === 5);
        p5Id = p5?.id ?? null;
      }

      /* Fallback: scan posteLabels for "catégorie 5" */
      if (!p5Id && data?.posteLabels) {
        for (const [id, label] of Object.entries(data.posteLabels as Record<string, unknown>)) {
          const s = typeof label === "string" ? label.toLowerCase() : "";
          if (s.includes("catégorie 5") || s.includes("categorie 5") || s.includes("poste 5")) {
            p5Id = id; break;
          }
        }
      }

      /* Fallback 2: scan sources map for "5." codes */
      if (!p5Id && data?.sources) {
        for (const [id, srcs] of Object.entries(data.sources as Record<string, any[]>)) {
          if (srcs.some((s: any) => String(s?.source_code ?? "").startsWith("5."))) {
            p5Id = id; break;
          }
        }
      }

      setPosteId(p5Id);
      if (p5Id) {
        setPosteLabel(data.posteLabels?.[p5Id] || POSTE_LABEL_FALLBACK);
        setEnabledSources(data.sources?.[p5Id] || []);
        setSourceVisibility(data.sourceVisibility?.[p5Id] || {});
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

    if (c === "5.1A1") return (
      <Box key={posteSourceId} mt={6}>
        <Source5_1A1Form rows={rows5_1A1} setRows={setRows5_1A1} posteSourceId={posteSourceId} userId={userId} gesResults={ges5_1A1} setGesResults={setGes5_1A1} />
      </Box>
    );

    if (c === "5.1B1") return (
      <Box key={posteSourceId} mt={6}>
        <Source5_1B1Form rows={rows5_1B1} setRows={setRows5_1B1} posteSourceId={posteSourceId} userId={userId} gesResults={ges5_1B1} setGesResults={setGes5_1B1} />
      </Box>
    );

    if (c === "5.2A1") return (
      <Box key={posteSourceId} mt={6}>
        <Source5_2A1Form rows={rows5_2A1} setRows={setRows5_2A1} posteSourceId={posteSourceId} userId={userId} gesResults={ges5_2A1} setGesResults={setGes5_2A1} />
      </Box>
    );

    if (c === "5.2B1") return (
      <Box key={posteSourceId} mt={6}>
        <Source5_2B1Form rows={rows5_2B1} setRows={setRows5_2B1} posteSourceId={posteSourceId} userId={userId} gesResults={ges5_2B1} setGesResults={setGes5_2B1} />
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
              Sources disponibles sur Poste 5 : <b>{availableCodes.length ? availableCodes.join(" · ") : "—"}</b>
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

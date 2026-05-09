"use client";

import React, { useCallback, useRef, useState } from "react";
import { Box, Button, Flex, HStack, Input, Select, Text, VStack } from "@chakra-ui/react";

const P = {
  brand: "#344E41", accent: "#588157", light: "#A3B18A",
  soft: "#DDE5E0", bg: "#F5F6F4", muted: "#6B7A72", white: "#FFFFFF", dark: "#1B2E25",
};

const PROVINCES = [
  "Québec","Ontario","Alberta","Colombie-Britannique","Manitoba",
  "Saskatchewan","Nouvelle-Écosse","Nouveau-Brunswick",
  "Île-du-Prince-Édouard","Terre-Neuve-et-Labrador",
  "Nunavut","Territoires du Nord-Ouest","Yukon",
];

export interface UploadedFiles {
  electricity:  File | null;
  fuel:         File | null;
  natural_gas:  File | null;
  refrigerant:  File | null;
  province:     string;
  company_name: string;
}

interface ZoneConfig {
  key: keyof Omit<UploadedFiles, "province" | "company_name">;
  icon: string;
  label: string;
  sublabel: string;
  color: string;
}

const ZONES: ZoneConfig[] = [
  { key: "electricity", icon: "⚡", label: "Factures d'électricité",    sublabel: "ZIP de vos factures PDF annuelles",          color: "#EBF8FF" },
  { key: "fuel",        icon: "⛽", label: "Consommation de carburant", sublabel: "ZIP de vos factures de carburant",           color: "#FFFBEB" },
  { key: "natural_gas", icon: "🔥", label: "Gaz naturel",               sublabel: "ZIP de vos factures de gaz naturel",         color: "#FFF5F5" },
];

const OPTIONAL_ZONES: ZoneConfig[] = [
  { key: "refrigerant", icon: "❄️", label: "Signalétique climatiseurs", sublabel: "ZIP de photos des plaques signalétiques (frigorigènes)", color: "#EFF6FF" },
];

// ── Single drop zone ───────────────────────────────────────────────────────────
function SingleZone({
  config, file, onFile,
}: { config: ZoneConfig; file: File | null; onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const done = !!file;

  const handleFile = useCallback((f: File) => { onFile(f); }, [onFile]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <Box
      border="2px dashed"
      borderColor={done ? P.accent : dragging ? P.accent : P.light}
      borderRadius="2xl"
      bg={done ? "#EDF5ED" : dragging ? "#EDF5ED" : config.color}
      p={6} textAlign="center" cursor="pointer"
      transition="all 0.2s"
      _hover={{ borderColor: P.accent, bg: "#EDF5ED" }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      position="relative"
    >
      <input
        ref={inputRef} type="file" accept=".zip"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      {done && (
        <Box position="absolute" top={3} right={3}
          bg={P.accent} color="white" borderRadius="full"
          w={6} h={6} display="flex" alignItems="center" justifyContent="center"
          fontSize="xs" fontWeight="bold">✓</Box>
      )}
      <Text fontSize="3xl" mb={2}>{config.icon}</Text>
      <Text fontWeight="bold" color={P.brand} fontSize="sm" mb={1}>{config.label}</Text>
      <Text fontSize="xs" color={P.muted} mb={3}>{config.sublabel}</Text>
      {done ? (
        <Box bg="white" borderRadius="lg" px={3} py={1} display="inline-block">
          <Text fontSize="xs" color={P.accent} fontWeight="semibold" noOfLines={1} maxW="160px">
            📦 {file!.name}
          </Text>
        </Box>
      ) : (
        <Text fontSize="xs" color={P.light}>Glisser-déposer ou cliquer</Text>
      )}
    </Box>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
interface UploadZonesProps {
  files:    UploadedFiles;
  onChange: (patch: Partial<UploadedFiles>) => void;
  onStart:  () => void;
}

export default function UploadZones({ files, onChange, onStart }: UploadZonesProps) {
  const allReady   = ZONES.every(z => files[z.key] !== null);
  const readyCount = ZONES.filter(z => files[z.key] !== null).length;

  return (
    <VStack align="stretch" spacing={5} w="100%" maxW="820px">

      {/* Company name + Province */}
      <Flex gap={4} align="flex-end" flexWrap="wrap">
        <Box flex="1" minW="200px">
          <Text fontSize="sm" fontWeight="semibold" color={P.muted} mb={1}>
            Nom de l'entreprise
          </Text>
          <Input
            size="sm" borderRadius="lg" borderColor={P.light}
            placeholder="Ex. : Acme inc."
            value={files.company_name}
            onChange={e => onChange({ company_name: e.target.value })}
            _focus={{ borderColor: P.accent }}
            bg="white"
          />
        </Box>

        <Box>
          <Text fontSize="sm" fontWeight="semibold" color={P.muted} mb={1}>
            Province
          </Text>
          <HStack spacing={2} align="center">
            <Select
              size="sm" maxW="240px" borderRadius="lg" borderColor={P.light}
              value={files.province}
              onChange={e => onChange({ province: e.target.value })}
              _focus={{ borderColor: P.accent }}
            >
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Text fontSize="xs" color={P.light} whiteSpace="nowrap">(facteur d'émission électricité)</Text>
          </HStack>
        </Box>
      </Flex>

      {/* 3 required drop zones */}
      <Flex gap={4} flexWrap="wrap">
        {ZONES.map(zone => (
          <Box key={zone.key} flex="1" minW={{ base: "100%", md: "calc(33% - 12px)" }}>
            <SingleZone
              config={zone}
              file={files[zone.key]}
              onFile={f => onChange({ [zone.key]: f } as Partial<UploadedFiles>)}
            />
          </Box>
        ))}
      </Flex>

      {/* Optional: Refrigerant nameplate */}
      <Box>
        <HStack mb={2} spacing={2}>
          <Text fontSize="xs" fontWeight="semibold" color={P.muted} textTransform="uppercase" letterSpacing="wide">
            Optionnel
          </Text>
          <Box flex={1} h="1px" bg={P.soft} />
        </HStack>
        <Flex gap={4} flexWrap="wrap">
          {OPTIONAL_ZONES.map(zone => (
            <Box key={zone.key} flex="1" minW={{ base: "100%", md: "calc(50% - 8px)" }} maxW={{ md: "calc(50% - 8px)" }}>
              <SingleZone
                config={zone}
                file={files[zone.key]}
                onFile={f => onChange({ [zone.key]: f } as Partial<UploadedFiles>)}
              />
            </Box>
          ))}
        </Flex>
      </Box>

      {/* Fleet auto-load notice */}
      <HStack
        bg="#F0FFF4" borderWidth="1px" borderColor={P.light}
        borderRadius="xl" px={5} py={3} spacing={3}
      >
        <Text fontSize="xl">🚗</Text>
        <VStack align="start" spacing={0}>
          <Text fontSize="sm" fontWeight="semibold" color={P.brand}>
            Flotte de véhicules — chargement automatique
          </Text>
          <Text fontSize="xs" color={P.muted}>
            Les émissions de votre parc automobile sont lues depuis vos données existantes
            (Poste 2 · Source 2A1). Aucun fichier à téléverser.
          </Text>
        </VStack>
        <Text fontSize="2xl" ml="auto">✅</Text>
      </HStack>

      {/* Progress dots */}
      <HStack justify="center" spacing={2}>
        {ZONES.map(z => (
          <Box key={z.key} w={2} h={2} borderRadius="full"
            bg={files[z.key] ? P.accent : P.soft} transition="all 0.3s" />
        ))}
        <Text fontSize="xs" color={P.muted} ml={2}>
          {readyCount} / 3 fichiers requis prêts
        </Text>
      </HStack>

      {/* Launch button */}
      <Button
        size="lg" borderRadius="xl" h={14} fontSize="md" fontWeight="bold"
        bg={allReady ? P.brand : P.soft}
        color={allReady ? "white" : P.muted}
        _hover={allReady ? { bg: P.accent } : {}}
        isDisabled={!allReady}
        onClick={onStart}
        transition="all 0.3s"
        boxShadow={allReady ? "0 4px 20px rgba(52,78,65,0.3)" : "none"}
      >
        {allReady
          ? `🚀 Lancer l'analyse complète${files.refrigerant ? " (+ climatiseurs)" : ""}`
          : `Téléversez les ${3 - readyCount} fichier${3 - readyCount > 1 ? "s" : ""} restant${3 - readyCount > 1 ? "s" : ""}`}
      </Button>
    </VStack>
  );
}
